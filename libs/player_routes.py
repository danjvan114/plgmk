from flask import request, jsonify, session
from .database import get_player_engine
from sqlalchemy import text
import hashlib
import mcrcon

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
    
    try:
        engine = get_player_engine()
        
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, username, password FROM player WHERE username = :username"),
                {'username': username}
            )
            row = result.fetchone()
            
            if not row:
                return jsonify({
                    'success': False,
                    'message': '用户不存在，请先注册'
                }), 404
            
            user_id = row[0]
            db_username = row[1]
            db_password = row[2]
            
            if not db_password:
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
            
            if hashed_password == db_password:
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
    
    username = session['player_name']
    
    try:
        import os
        import configparser
        import mcrcon
        
        config = configparser.ConfigParser()
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.ini')
        config.read(config_path)
        
        rcon_host = config.get('minecraft', 'rcon_host', fallback='localhost')
        rcon_port = config.getint('minecraft', 'rcon_port', fallback=25575)
        rcon_password = config.get('minecraft', 'rcon_password', fallback='')
        
        with mcrcon.MCRcon(rcon_host, rcon_password, port=rcon_port) as rcon:
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
        import os
        import configparser
        import mcrcon
        
        config = configparser.ConfigParser()
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.ini')
        config.read(config_path)
        
        rcon_host = config.get('minecraft', 'rcon_host', fallback='localhost')
        rcon_port = config.getint('minecraft', 'rcon_port', fallback=25575)
        rcon_password = config.get('minecraft', 'rcon_password', fallback='')
        
        with mcrcon.MCRcon(rcon_host, rcon_password, port=rcon_port) as rcon:
            rcon.command(f'comfywhitelist remove {username}')
            
            return jsonify({
                'success': True,
                'message': '白名单注销成功'
            })
    except Exception as e:
        print(f"DEBUG remove_player_whitelist: {str(e)}")
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
        import os
        import configparser
        import mcrcon
        
        config = configparser.ConfigParser()
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.ini')
        config.read(config_path)
        
        rcon_host = config.get('minecraft', 'rcon_host', fallback='localhost')
        rcon_port = config.getint('minecraft', 'rcon_port', fallback=25575)
        rcon_password = config.get('minecraft', 'rcon_password', fallback='')
        
        with mcrcon.MCRcon(rcon_host, rcon_password, port=rcon_port) as rcon:
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
        return jsonify({
            'success': False,
            'message': f'注销失败: {str(e)}'
        }), 500