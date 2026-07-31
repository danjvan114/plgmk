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