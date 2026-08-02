from flask import request, jsonify, session, send_file
import os
import secrets
import string
import shutil
from datetime import datetime
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64

PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCXua9AWp5lFNGyZa/zXUkzNEfW1SbKUILtaIjo3+y10EUQstdNfDrnDl+BtlEUuGkNn2RTc/SlvmiPMU6tpNNwv7wn2LX1Mh3D1DpOcL3twAXemv7l7k1XAFNyPYua1kn8T3sXkrg5W89mwIGc81jYukdLduPVpnoUrXXAIVlLrQIDAQAB
-----END PUBLIC KEY-----"""

file_manager_password = None

def generate_password():
    global file_manager_password
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(chars) for _ in range(8))
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*" for c in password)
    if not (has_upper and has_lower and has_digit and has_special):
        return generate_password()
    file_manager_password = password
    return password

def encrypt_password_for_frontend(password):
    public_key = serialization.load_pem_public_key(
        PUBLIC_KEY_PEM.encode('utf-8'),
        backend=default_backend()
    )
    encrypted = public_key.encrypt(
        password.encode('utf-8'),
        padding.PKCS1v15()
    )
    return base64.b64encode(encrypted).decode('utf-8')

def register_file_manager_routes(app, localcdn_path):
    generate_password()

    @app.route('/fm/login', methods=['GET'])
    def fm_login_page():
        encrypted = encrypt_password_for_frontend(file_manager_password)
        return send_file(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp', 'fm', 'login.html'))

    @app.route('/api/fm/encrypted-password', methods=['GET'])
    def fm_get_encrypted_password():
        encrypted = encrypt_password_for_frontend(file_manager_password)
        return jsonify({'success': True, 'encrypted_password': encrypted})

    @app.route('/fm', methods=['GET'])
    def fm_page():
        if not session.get('fm_authenticated'):
            return redirect('/fm/login')
        return send_file(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp', 'fm', 'index.html'))

    @app.route('/api/fm/auth', methods=['POST'])
    def fm_auth():
        global file_manager_password
        data = request.get_json()
        password = data.get('password', '')
        if password == file_manager_password:
            session['fm_authenticated'] = True
            return jsonify({'success': True, 'message': '验证成功'})
        return jsonify({'success': False, 'message': '密码错误'})

    @app.route('/api/fm/refresh-password', methods=['POST'])
    def fm_refresh_password():
        new_password = generate_password()
        return jsonify({'success': True, 'message': '密码已刷新'})

    def _validate_path(path):
        """验证路径是否在localcdn目录内，防止路径遍历攻击"""
        full_path = os.path.normpath(os.path.join(localcdn_path, path))
        if not full_path.startswith(os.path.normpath(localcdn_path)):
            return None
        return full_path

    @app.route('/api/fm/logout', methods=['POST'])
    def fm_logout():
        session.pop('fm_authenticated', None)
        return jsonify({'success': True, 'message': '已退出'})

    @app.route('/api/fm/list', methods=['GET'])
    def fm_list():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        path = request.args.get('path', '')
        full_path = _validate_path(path)
        if not full_path or not os.path.exists(full_path):
            return jsonify({'success': False, 'message': '路径不存在或非法'})
        items = []
        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            stat = os.stat(item_path)
            item_rel_path = os.path.join(path, item) if path else item
            items.append({
                'name': item,
                'path': item_rel_path.replace('\\', '/'),
                'is_dir': os.path.isdir(item_path),
                'size': stat.st_size if os.path.isfile(item_path) else 0,
                'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
        items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        return jsonify({'success': True, 'items': items, 'current_path': path.replace('\\', '/')})

    @app.route('/api/fm/upload', methods=['POST'])
    def fm_upload():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        path = request.form.get('path', '')
        file = request.files.get('file')
        if not file:
            return jsonify({'success': False, 'message': '没有文件'})
        full_path = _validate_path(path)
        if not full_path:
            return jsonify({'success': False, 'message': '路径非法'})
        os.makedirs(full_path, exist_ok=True)
        file.save(os.path.join(full_path, file.filename))
        return jsonify({'success': True, 'message': f'文件 {file.filename} 上传成功'})

    @app.route('/api/fm/delete', methods=['POST'])
    def fm_delete():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        data = request.get_json()
        path = data.get('path', '')
        full_path = _validate_path(path)
        if not full_path or not os.path.exists(full_path):
            return jsonify({'success': False, 'message': '文件/文件夹不存在'})
        try:
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            return jsonify({'success': True, 'message': '删除成功'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'删除失败: {str(e)}'})

    @app.route('/api/fm/rename', methods=['POST'])
    def fm_rename():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        data = request.get_json()
        path = data.get('path', '')
        new_name = data.get('new_name', '')
        if not new_name:
            return jsonify({'success': False, 'message': '新名称不能为空'})
        full_path = _validate_path(path)
        if not full_path or not os.path.exists(full_path):
            return jsonify({'success': False, 'message': '文件/文件夹不存在'})
        parent_dir = os.path.dirname(full_path)
        new_path = os.path.join(parent_dir, new_name)
        if not new_path.startswith(os.path.normpath(localcdn_path)):
            return jsonify({'success': False, 'message': '非法路径'})
        if os.path.exists(new_path):
            return jsonify({'success': False, 'message': '目标已存在'})
        try:
            os.rename(full_path, new_path)
            return jsonify({'success': True, 'message': '重命名成功'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'重命名失败: {str(e)}'})

    @app.route('/api/fm/download', methods=['GET'])
    def fm_download():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        path = request.args.get('path', '')
        full_path = _validate_path(path)
        if not full_path or not os.path.exists(full_path) or os.path.isdir(full_path):
            return jsonify({'success': False, 'message': '文件不存在'})
        return send_file(full_path, as_attachment=True)

    @app.route('/api/fm/mkdir', methods=['POST'])
    def fm_mkdir():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        data = request.get_json()
        path = data.get('path', '')
        dir_name = data.get('dir_name', '')
        if not dir_name:
            return jsonify({'success': False, 'message': '文件夹名称不能为空'})
        base_path = _validate_path(path) if path else localcdn_path
        if not base_path:
            return jsonify({'success': False, 'message': '非法路径'})
        full_path = os.path.join(base_path, dir_name)
        if not full_path.startswith(os.path.normpath(localcdn_path)):
            return jsonify({'success': False, 'message': '非法路径'})
        if os.path.exists(full_path):
            return jsonify({'success': False, 'message': '文件夹已存在'})
        try:
            os.makedirs(full_path)
            return jsonify({'success': True, 'message': '创建成功'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'创建失败: {str(e)}'})

    @app.route('/api/fm/search', methods=['GET'])
    def fm_search():
        if not session.get('fm_authenticated'):
            return jsonify({'success': False, 'message': '未授权'})
        keyword = request.args.get('keyword', '').lower()
        if not keyword:
            return jsonify({'success': False, 'message': '搜索关键词不能为空'})
        results = []
        for root, dirs, files in os.walk(localcdn_path):
            for name in files:
                if keyword in name.lower():
                    full_path = os.path.join(root, name)
                    rel_path = os.path.relpath(full_path, localcdn_path)
                    stat = os.stat(full_path)
                    results.append({
                        'name': name,
                        'path': rel_path,
                        'is_dir': False,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    })
            for name in dirs:
                if keyword in name.lower():
                    full_path = os.path.join(root, name)
                    rel_path = os.path.relpath(full_path, localcdn_path)
                    stat = os.stat(full_path)
                    results.append({
                        'name': name,
                        'path': rel_path,
                        'is_dir': True,
                        'size': 0,
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    })
        return jsonify({'success': True, 'results': results})