from flask import request, jsonify, session, make_response
from .database import get_player_engine
from sqlalchemy import text
import uuid

def get_device_uuid():
    return request.cookies.get('device_uuid')

def set_device_cookie(response, device_uuid):
    response.set_cookie('device_uuid', device_uuid, max_age=60*60*24*365, httponly=True)

def check_device_bound(username):
    engine = get_player_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT device_uuid FROM player_device WHERE username = :username"),
            {'username': username}
        )
        row = result.fetchone()
        return row[0] if row else None

def bind_device(username, device_uuid):
    engine = get_player_engine()
    with engine.connect() as conn:
        existing = conn.execute(
            text("SELECT id FROM player_device WHERE username = :username"),
            {'username': username}
        )
        if existing.fetchone():
            conn.execute(
                text("UPDATE player_device SET device_uuid = :uuid WHERE username = :username"),
                {'uuid': device_uuid, 'username': username}
            )
        else:
            conn.execute(
                text("INSERT INTO player_device (username, device_uuid) VALUES (:username, :uuid)"),
                {'username': username, 'uuid': device_uuid}
            )
        conn.commit()

def unbind_device(username):
    engine = get_player_engine()
    with engine.connect() as conn:
        conn.execute(
            text("DELETE FROM player_device WHERE username = :username"),
            {'username': username}
        )
        conn.commit()

def verify_device_login(username, device_uuid):
    if not device_uuid:
        return False
    
    engine = get_player_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT device_uuid FROM player_device WHERE username = :username"),
            {'username': username}
        )
        row = result.fetchone()
        return row and row[0] == device_uuid

def register_device_routes(app):
    @app.route('/api/device/check', methods=['POST'])
    def api_device_check():
        data = request.get_json()
        if not data or 'username' not in data:
            return jsonify({'success': False, 'message': '缺少用户名'}), 400
        
        username = data['username'].strip()
        device_uuid = get_device_uuid()
        
        bound_uuid = check_device_bound(username)
        
        if not bound_uuid:
            return jsonify({
                'success': True,
                'status': 'unbound',
                'message': '该账号未绑定设备'
            })
        
        if device_uuid and bound_uuid == device_uuid:
            session['player_name'] = username
            return jsonify({
                'success': True,
                'status': 'verified',
                'message': '设备验证成功，已放行'
            })
        
        return jsonify({
            'success': True,
            'status': 'mismatch',
            'message': '设备不匹配'
        })

    @app.route('/api/device/bind', methods=['POST'])
    def api_device_bind():
        data = request.get_json()
        if not data or 'username' not in data:
            return jsonify({'success': False, 'message': '缺少用户名'}), 400
        
        username = data['username'].strip()
        device_uuid = get_device_uuid()
        
        if not device_uuid:
            device_uuid = str(uuid.uuid4())
        
        bind_device(username, device_uuid)
        
        response = make_response(jsonify({
            'success': True,
            'message': '设备绑定成功'
        }))
        set_device_cookie(response, device_uuid)
        return response

    @app.route('/api/device/unbind', methods=['POST'])
    def api_device_unbind():
        if 'player_name' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        username = session['player_name']
        unbind_device(username)
        
        response = make_response(jsonify({
            'success': True,
            'message': '设备已解绑'
        }))
        response.delete_cookie('device_uuid')
        return response

    @app.route('/api/device/status', methods=['GET'])
    def api_device_status():
        if 'player_name' not in session:
            return jsonify({'success': False, 'message': '未登录'}), 401
        
        username = session['player_name']
        device_uuid = get_device_uuid()
        bound_uuid = check_device_bound(username)
        
        return jsonify({
            'success': True,
            'bound': bool(bound_uuid),
            'matched': bool(bound_uuid and device_uuid and bound_uuid == device_uuid)
        })