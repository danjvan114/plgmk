from flask import request, jsonify
import mcrcon

def mc_whitelist_add():
    print(f"DEBUG mc_whitelist_add: Function called")
    data = request.get_json()
    print(f"DEBUG mc_whitelist_add: Received data: {data}")
    
    if not data or 'username' not in data:
        print(f"DEBUG mc_whitelist_add: Missing username parameter")
        return jsonify({
            'success': False,
            'message': '缺少用户名参数'
        }), 400
    
    username = data['username'].strip()
    print(f"DEBUG mc_whitelist_add: Username: {username}")
    
    if not username:
        print(f"DEBUG mc_whitelist_add: Empty username")
        return jsonify({
            'success': False,
            'message': '用户名不能为空'
        }), 400
    
    try:
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