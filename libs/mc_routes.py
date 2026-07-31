from flask import request, jsonify, session
import mcrcon
from .invite_code import get_invite_manager
from .database import get_player_engine
from sqlalchemy import text
import hashlib

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
    
    if not data or 'player' not in data or 'commands' not in data:
        return jsonify({
            'success': False,
            'message': '缺少必要参数（玩家名称和命令）'
        }), 400
    
    player = data['player'].strip()
    commands = data['commands']
    
    if not player:
        return jsonify({
            'success': False,
            'message': '玩家名称不能为空'
        }), 400
    
    if not commands or not isinstance(commands, list):
        return jsonify({
            'success': False,
            'message': '命令列表格式错误'
        }), 400
    
    try:
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            results = []
            for cmd in commands:
                cmd = cmd.strip()
                if not cmd:
                    continue
                
                final_cmd = cmd.replace('%player%', player)
                print(f"DEBUG mc_store_buy: Executing: {final_cmd}")
                
                result = rcon.command(final_cmd)
                results.append({
                    'command': final_cmd,
                    'result': result.strip() if result else ''
                })
            
            return jsonify({
                'success': True,
                'message': f'商品已发放给玩家 {player}',
                'results': results
            })
    except Exception as e:
        print(f"DEBUG mc_store_buy: RCON error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'执行命令失败: {str(e)}'
        }), 500

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