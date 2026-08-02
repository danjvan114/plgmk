from flask import request, jsonify, session
from .database import get_player_engine
from sqlalchemy import text
import hashlib
import mcrcon
from datetime import timedelta

def register_player():
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({
            'success': False,
            'message': '缺少用户名'
        }), 400
    
    username = data['username'].strip()
    password = data.get('password', '').strip() if data.get('password') else ''
    
    if not username:
        return jsonify({
            'success': False,
            'message': '用户名不能为空'
        }), 400
    
    if password and len(password) < 6:
        return jsonify({
            'success': False,
            'message': '密码长度不能少于6位'
        }), 400
    
    try:
        engine = get_player_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id FROM player WHERE username = :username"),
                {'username': username}
            )
            if result.fetchone():
                return jsonify({
                    'success': False,
                    'message': '用户名已存在'
                }), 409
            
            hashed_password = hashlib.sha256(password.encode()).hexdigest() if password else ''
            
            conn.execute(
                text("INSERT INTO player (username, password) VALUES (:username, :password)"),
                {'username': username, 'password': hashed_password}
            )
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '注册成功'
            })
    except Exception as e:
        print(f"DEBUG player_register: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'注册失败: {str(e)}'
        }), 500

def login_player():
    try:
        data = request.get_json()
        print(f"DEBUG login_player: received data = {data}")
        
        if not data or 'username' not in data:
            return jsonify({
                'success': False,
                'message': '缺少用户名'
            }), 400
        
        username = data['username'].strip()
        password = data.get('password', '').strip() if data.get('password') else ''
        
        print(f"DEBUG login_player: username = {username}, has_password = {bool(password)}")
        
        if not username:
            return jsonify({
                'success': False,
                'message': '用户名不能为空'
            }), 400
        
        engine = get_player_engine()
        print(f"DEBUG login_player: engine = {engine}")
        
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, username, password FROM player WHERE username = :username"),
                {'username': username}
            )
            row = result.fetchone()
            print(f"DEBUG login_player: row = {row}")
            
            if not row:
                return jsonify({
                    'success': False,
                    'message': '用户不存在，请先注册'
                }), 404
            
            user_id = row[0]
            db_username = row[1]
            db_password = row[2]
            
            print(f"DEBUG login_player: db_password = {db_password}")
            
            if not db_password:
                session.permanent = True
                session['player_id'] = user_id
                session['player_name'] = db_username
                return jsonify({
                    'success': True,
                    'message': '登录成功，请设置密码',
                    'username': db_username,
                    'need_password': True
                })
            
            if not password:
                return jsonify({
                    'success': False,
                    'message': '请输入密码'
                }), 400
            
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            print(f"DEBUG login_player: hashed = {hashed_password}, match = {hashed_password == db_password}")
            
            if hashed_password == db_password:
                session.permanent = True
                session['player_id'] = user_id
                session['player_name'] = db_username
                return jsonify({
                    'success': True,
                    'message': '登录成功',
                    'username': db_username,
                    'need_password': False
                })
            else:
                return jsonify({
                    'success': False,
                    'message': '密码错误'
                }), 401
    except Exception as e:
        print(f"DEBUG player_login: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'登录失败: {str(e)}'
        }), 500

def set_player_password():
    data = request.get_json()
    
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({
            'success': False,
            'message': '缺少用户名或密码'
        }), 400
    
    username = data['username'].strip()
    password = data['password'].strip()
    
    if not username or not password:
        return jsonify({
            'success': False,
            'message': '用户名和密码不能为空'
        }), 400
    
    if len(password) < 6:
        return jsonify({
            'success': False,
            'message': '密码长度不能少于6位'
        }), 400
    
    try:
        engine = get_player_engine()
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE player SET password = :password WHERE username = :username"),
                {'password': hashed_password, 'username': username}
            )
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '密码设置成功'
            })
    except Exception as e:
        print(f"DEBUG set_player_password: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'设置密码失败: {str(e)}'
        }), 500

def logout_player():
    session.pop('player_id', None)
    session.pop('player_name', None)
    return jsonify({
        'success': True,
        'message': '已退出登录'
    })

def check_player_login():
    if 'player_name' in session:
        return jsonify({
            'success': True,
            'logged_in': True,
            'username': session['player_name']
        })
    else:
        return jsonify({
            'success': False,
            'logged_in': False,
            'message': '未登录'
        }), 401

def register_whitelist():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    data = request.get_json()
    if not data or 'invite_code' not in data:
        return jsonify({
            'success': False,
            'message': '缺少邀请码'
        }), 400
    
    invite_code = data['invite_code'].strip()
    if not invite_code:
        return jsonify({
            'success': False,
            'message': '邀请码不能为空'
        }), 400
    
    from .invite_code import get_invite_manager
    invite_manager = get_invite_manager()
    is_valid, message = invite_manager.verify_code(invite_code)
    if not is_valid:
        return jsonify({
            'success': False,
            'message': message
        }), 403
    
    username = session['player_name']
    
    try:
        import mcrcon
        
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            response = rcon.command(f'comfywhitelist list')
            
            if username.lower() in response.lower():
                return jsonify({
                    'success': True,
                    'message': '已在白名单中'
                })
            
            rcon.command(f'comfywhitelist add {username}')
            
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
            
            return jsonify({
                'success': True,
                'message': '白名单注册成功'
            })
    except Exception as e:
        print(f"DEBUG register_whitelist: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'注册失败: {str(e)}'
        }), 500

def change_player_password():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    data = request.get_json()
    if not data or 'new_password' not in data:
        return jsonify({
            'success': False,
            'message': '缺少新密码'
        }), 400
    
    old_password = data.get('old_password', '').strip() if data.get('old_password') else ''
    new_password = data['new_password'].strip()
    
    if not new_password:
        return jsonify({
            'success': False,
            'message': '新密码不能为空'
        }), 400
    
    if len(new_password) < 6:
        return jsonify({
            'success': False,
            'message': '密码长度不能少于6位'
        }), 400
    
    try:
        engine = get_player_engine()
        username = session['player_name']
        
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT password FROM player WHERE username = :username"),
                {'username': username}
            )
            row = result.fetchone()
            
            if not row:
                return jsonify({
                    'success': False,
                    'message': '用户不存在'
                }), 404
            
            db_password = row[0]
            
            if db_password:
                if not old_password:
                    return jsonify({
                        'success': False,
                        'message': '请输入当前密码'
                    }), 400
                
                hashed_old = hashlib.sha256(old_password.encode()).hexdigest()
                if hashed_old != db_password:
                    return jsonify({
                        'success': False,
                        'message': '当前密码错误'
                    }), 401
            
            hashed_new = hashlib.sha256(new_password.encode()).hexdigest()
            conn.execute(
                text("UPDATE player SET password = :password WHERE username = :username"),
                {'password': hashed_new, 'username': username}
            )
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '密码修改成功'
            })
    except Exception as e:
        print(f"DEBUG change_player_password: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'修改密码失败: {str(e)}'
        }), 500

def remove_player_whitelist():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    username = session['player_name']
    
    try:
        import mcrcon
        
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            rcon.command(f'comfywhitelist remove {username}')
            
            return jsonify({
                'success': True,
                'message': '白名单注销成功'
            })
    except Exception as e:
        print(f"DEBUG remove_player_whitelist: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'注销失败: {str(e)}'
        }), 500

def delete_player_account():
    if 'player_name' not in session:
        return jsonify({
            'success': False,
            'message': '请先登录'
        }), 401
    
    username = session['player_name']
    
    try:
        import mcrcon
        
        with mcrcon.MCRcon('127.0.0.1', '123456', port=25575, timeout=5) as rcon:
            rcon.command(f'comfywhitelist remove {username}')
        
        engine = get_player_engine()
        with engine.connect() as conn:
            conn.execute(
                text("DELETE FROM player WHERE username = :username"),
                {'username': username}
            )
            conn.commit()
        
        session.pop('player_id', None)
        session.pop('player_name', None)
        
        return jsonify({
            'success': True,
            'message': '账户已完全注销'
        })
    except Exception as e:
        print(f"DEBUG delete_player_account: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'注销失败: {str(e)}'
        }), 500