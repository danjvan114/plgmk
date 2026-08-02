from flask import request, jsonify, session
import mcrcon
from .invite_code import get_invite_manager
from .database import get_player_engine
from sqlalchemy import text
import hashlib
import os

def mc_get_invite_code():
    print(f"DEBUG mc_get_invite_code: Function called")
    try:
        invite_manager = get_invite_manager()
        code_info = invite_manager.get_encrypted_code()
        return jsonify({
            'success': True,
            'encrypted_code': code_info['encrypted_code'],
            'expires_at': code_info['expires_at'],
            'refresh_interval': code_info['refresh_interval']
        })
    except Exception as e:
        print(f"DEBUG mc_get_invite_code: Error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取邀请码失败: {str(e)}'
        }), 500

def mc_whitelist_add():
    print(f"DEBUG mc_whitelist_add: Function called")
    data = request.get_json()
    print(f"DEBUG mc_whitelist_add: Received data: {data}")
    
    if not data or 'username' not in data or 'invite_code' not in data:
        print(f"DEBUG mc_whitelist_add: Missing parameters")
        return jsonify({
            'success': False,
            'message': '缺少必要参数（用户名和邀请码）'
        }), 400
    
    username = data['username'].strip()
    invite_code = data['invite_code'].strip()
    print(f"DEBUG mc_whitelist_add: Username: {username}, Invite code: {invite_code}")
    
    if not username:
        print(f"DEBUG mc_whitelist_add: Empty username")
        return jsonify({
            'success': False,
            'message': '用户名不能为空'
        }), 400
    
    if not invite_code:
        print(f"DEBUG mc_whitelist_add: Empty invite code")
        return jsonify({
            'success': False,
            'message': '邀请码不能为空'
        }), 400
    
    invite_manager = get_invite_manager()
    is_valid, message = invite_manager.verify_code(invite_code)
    if not is_valid:
        print(f"DEBUG mc_whitelist_add: Invalid invite code: {message}")
        return jsonify({
            'success': False,
            'message': message
        }), 403
    
    try:
        try:
            engine = get_player_engine()
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id FROM player WHERE username = :username"),
                    {'username': username}
                )
                if not result.fetchone():
                    conn.execute(
                        text("INSERT INTO player (username, password) VALUES (:username, :password)"),
                        {'username': username, 'password': ''}
                    )
                    conn.commit()
                    print(f"DEBUG mc_whitelist_add: Auto-registered player: {username}")
        except Exception as db_error:
            print(f"DEBUG mc_whitelist_add: DB error (non-fatal): {str(db_error)}")
        
        print(f"DEBUG mc_whitelist_add: Connecting to RCON...")
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            print(f"DEBUG mc_whitelist_add: RCON connected successfully")
            result = rcon.command(f'comfywl add {username}')
            print(f"DEBUG mc_whitelist_add: Command result: {result}")
            
            if result:
                if 'added' in result.lower() or '已添加' in result or 'success' in result.lower():
                    return jsonify({
                        'success': True,
                        'message': f'玩家 {username} 已成功添加到白名单',
                        'result': result
                    })
                elif 'already' in result.lower() or '已存在' in result or 'exists' in result.lower():
                    return jsonify({
                        'success': False,
                        'message': f'玩家 {username} 已在白名单中',
                        'result': result
                    }), 409
                else:
                    return jsonify({
                        'success': True,
                        'message': f'命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
    except Exception as e:
        print(f"DEBUG mc_whitelist_add: RCON error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500

def mc_whitelist_remove():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({
            'success': False,
            'message': '缺少用户名参数'
        }), 400
    
    username = data['username'].strip()
    
    if not username:
        return jsonify({
            'success': False,
            'message': '用户名不能为空'
        }), 400
    
    if username != session['player_name']:
        return jsonify({
            'success': False,
            'message': '只能移除自己的白名单'
        }), 403
    
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            result = rcon.command(f'comfywl remove {username}')
            
            if result:
                if 'removed' in result.lower() or '已移除' in result:
                    return jsonify({
                        'success': True,
                        'message': f'玩家 {username} 已从白名单移除',
                        'result': result
                    })
                elif 'not found' in result.lower() or '不存在' in result:
                    return jsonify({
                        'success': False,
                        'message': f'玩家 {username} 不在白名单中',
                        'result': result
                    }), 404
                else:
                    return jsonify({
                        'success': True,
                        'message': '命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500

def mc_whitelist_list():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            result = rcon.command('comfywl list')
            
            if result:
                lines = result.strip().split('\n')
                players = []
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('There are') and not line.startswith('白名单中有') and not line.startswith('Total'):
                        players.append(line.strip())
                
                return jsonify({
                    'success': True,
                    'players': players,
                    'count': len(players),
                    'raw_result': result
                })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500

def mc_whitelist_reload():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            result = rcon.command('comfywl reload')
            
            if result:
                if 'reloaded' in result.lower() or '已重载' in result:
                    return jsonify({
                        'success': True,
                        'message': '白名单已重载',
                        'result': result
                    })
                else:
                    return jsonify({
                        'success': True,
                        'message': '命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500

def mc_store_buy():
    data = request.get_json()
    
    if not data or 'product_title' not in data:
        return jsonify({
            'success': False,
            'message': '缺少必要参数'
        }), 400
    
    # 从会话中获取玩家名称，防止伪造身份
    player = session.get('player_name')
    if not player:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    product_title = data.get('product_title', '')
    
    # 从商品配置文件读取真实价格和命令，防止客户端伪造
    price = 0
    product_commands = []
    product_exec_type = 'console'
    try:
        import json
        store_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'store', 's.json')
        if os.path.exists(store_path):
            with open(store_path, 'r', encoding='utf-8') as f:
                products = json.load(f)
                for product in products:
                    if product.get('title') == product_title:
                        price = product.get('price', 0)
                        product_commands = product.get('command', '').split('&')
                        product_exec_type = product.get('exec_type', 'console')
                        break
    except Exception as e:
        print(f"DEBUG mc_store_buy: 读取商品配置失败: {str(e)}")
    
    if not product_commands or not product_commands[0]:
        return jsonify({
            'success': False,
            'message': '商品配置错误'
        }), 500
    
    # 使用服务器端的命令和执行方式，忽略客户端传来的
    commands = product_commands
    exec_type = product_exec_type
    
    if price > 0:
        success, balance = mc_check_balance(player)
        if not success:
            return jsonify({
                'success': False,
                'message': '无法获取玩家余额'
            }), 500
        
        if balance < price:
            return jsonify({
                'success': False,
                'message': f'余额不足！当前余额: ${balance:.2f}，需要: ${price:.2f}'
            }), 400
        
        deduct_result = mc_deduct_balance(player, price)
        if not deduct_result:
            return jsonify({
                'success': False,
                'message': '扣款失败'
            }), 500
    
    try:
        results = []
        for cmd in commands:
            cmd = cmd.strip()
            if not cmd:
                continue
            
            final_cmd = cmd.replace('%player%', player)
            print(f"DEBUG mc_store_buy: Executing [{exec_type}]: {final_cmd}")
            
            if exec_type == 'bot':
                success, result = mc_bot_command(final_cmd)
                if success:
                    results.append({
                        'command': final_cmd,
                        'result': result.strip() if result else ''
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': f'机器人执行命令失败: {result}'
                    }), 500
            else:
                with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
                    result = rcon.command(final_cmd)
                    results.append({
                        'command': final_cmd,
                        'result': result.strip() if result else ''
                    })
        
        return jsonify({
            'success': True,
            'message': f'商品已发放给玩家 {player}' + (f'，已扣除 ${price:.2f}' if price > 0 else ''),
            'results': results
        })
    except Exception as e:
        print(f"DEBUG mc_store_buy: Error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'执行命令失败: {str(e)}'
        }), 500

def mc_bot_command(command):
    """通过机器人HTTP API执行命令"""
    try:
        import urllib.request
        import urllib.parse
        
        url = f'http://127.0.0.1:5688/command?cmd={urllib.parse.quote(command)}'
        req = urllib.request.Request(url)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            return True, data
    except Exception as e:
        print(f"DEBUG mc_bot_command: {str(e)}")
        return False, str(e)

def mc_server_info():
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            version = rcon.command('version')
            players = rcon.command('list')
            
            return jsonify({
                'success': True,
                'version': version.strip() if version else None,
                'player_list': players.strip() if players else None
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500

def mc_check_balance(player_name):
    """检查玩家余额"""
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            result = rcon.command(f'/bal {player_name}')
            if result and '$' in result:
                parts = result.split('$')
                if len(parts) >= 2:
                    balance_str = parts[-1].strip().replace(',', '')
                    try:
                        balance = float(balance_str)
                        return True, balance
                    except ValueError:
                        return False, 0
            return False, 0
    except Exception as e:
        print(f"DEBUG mc_check_balance: Error: {str(e)}")
        return False, 0

def mc_deduct_balance(player_name, amount):
    """扣除玩家余额"""
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            result = rcon.command(f'/eco take {player_name} {amount}')
            return result.strip() if result else ''
    except Exception as e:
        print(f"DEBUG mc_deduct_balance: Error: {str(e)}")
        return None