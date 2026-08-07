from flask import redirect, url_for, send_from_directory, request, jsonify, make_response, session
import os
import json
import urllib
import uuid
from .config import app, MARKETS
from .utils import set_market, render_root_template, render_market_template
from .mc_routes import mc_whitelist_add, mc_whitelist_remove, mc_whitelist_list, mc_whitelist_reload, mc_server_info, mc_get_invite_code, mc_store_buy
from .player_routes import register_player, login_player, logout_player, check_player_login, set_player_password, change_player_password, remove_player_whitelist, register_whitelist, delete_player_account
from .device_auth import get_device_uuid, set_device_cookie, check_device_bound, bind_device, unbind_device, verify_device_login, execute_rcon_forcelogin

def register_other_routes():
    @app.route('/')
    def root():
        return render_root_template('index.html')
    @app.route('/app/ccvue')
    def ccvue():
        return render_market_template('catcodeAPP.html')
    
    @app.route('/about')
    def about():
        return render_root_template('about.html')

    @app.route('/health')
    def health_check():
        print(f"DEBUG: /health endpoint called")
        return {'status': 'ok', 'message': 'Server is running'}

    @app.route('/api/mc/test', methods=['GET', 'POST'])
    def api_mc_test():
        print(f"DEBUG: /api/mc/test called")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request path: {request.path}")
        return jsonify({
            'success': True,
            'message': 'MC API test endpoint works',
            'method': request.method
        })

    @app.route('/ping')
    def ping():
        return 'pong'

    @app.route('/static/<path:filename>')
    def root_static_files(filename):
        static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
        return send_from_directory(static_dir, filename)

    @app.route('/localcdn/<path:filename>')
    def local_cdn(filename):
        localcdn_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn')
        if not os.path.exists(localcdn_dir):
            os.makedirs(localcdn_dir)
        return send_from_directory(localcdn_dir, filename)

    @app.route('/po/<path:project_name>')
    def project_cdn(project_name):
        project_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn','project')
        if not os.path.exists(project_dir):
            os.makedirs(project_dir)
        return send_from_directory(project_dir, project_name+'.html')

    @app.route('/app/kn/d')
    def app_kn_detail():
        users = {}
        from .config import User
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('app_detail.html', market_id='kn', users=users)

    @app.route('/switch_market/<market_id>')
    def switch_market(market_id):
        if market_id in MARKETS:
            set_market(market_id)
        return redirect(url_for('market_index', market_id=market_id))

    def build_doc_tree(dir_path, base_path=''):
        tree = []
        try:
            entries = os.listdir(dir_path)
            entries.sort(key=lambda x: (os.path.isdir(os.path.join(dir_path, x)), x.lower()))
            for entry in entries:
                full_path = os.path.join(dir_path, entry)
                rel_path = f"{base_path}/{entry}" if base_path else entry
                if os.path.isdir(full_path):
                    children = build_doc_tree(full_path, rel_path)
                    tree.append({'name': entry, 'type': 'folder', 'children': children})
                elif entry.lower().endswith('.pdf'):
                    tree.append({'name': entry, 'type': 'pdf', 'path': rel_path})
                elif entry.lower().endswith('.js'):
                    tree.append({'name': entry, 'type': 'js', 'path': rel_path})
                elif entry.lower().endswith('.ttmp4'):
                    tree.append({'name': entry, 'type': 'ttmp4', 'path': rel_path})
                elif entry.lower().endswith('.md'):
                    tree.append({'name': entry, 'type': 'md', 'path': rel_path})
        except Exception:
            pass
        return tree

    def render_tree_html(items, prefix=''):
        html = ''
        for item in items:
            full_path = f"{prefix}/{item['name']}" if prefix else item['name']
            encoded_path = urllib.parse.quote(full_path)
            file_url = f'/localcdn/doc/ot/{encoded_path}'
            if item['type'] == 'folder':
                html += f'''<li>
                    <div class="folder" onclick="toggleFolder(this)">
                        <span class="toggle-icon">▶</span>
                        <span>{item['name']}</span>
                    </div>
                    <ul class="subtree">
                        {render_tree_html(item['children'], full_path)}
                    </ul>
                </li>'''
            elif item['type'] == 'pdf':
                html += f'''<li>
                    <div class="file pdf-file" data-url="{file_url}" onclick="loadPDF('{file_url}')">{item['name']}</div>
                </li>'''
            elif item['type'] == 'js':
                html += f'''<li>
                    <div class="file js-file" data-url="{file_url}" onclick="loadJS('{file_url}')">{item['name']}</div>
                </li>'''
            elif item['type'] == 'ttmp4':
                html += f'''<li>
                    <div class="file ttmp4-file" data-url="{file_url}" onclick="loadTTMP4('{file_url}')">{item['name']}</div>
                </li>'''
            elif item['type'] == 'md':
                html += f'''<li>
                    <div class="file md-file" data-url="{file_url}" onclick="loadMD('{file_url}')">{item['name']}</div>
                </li>'''
        return html

    @app.route('/dev/ot')
    def docs_other():
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', 'ot')
        os.makedirs(doc_dir, exist_ok=True)
        
        p_param = request.args.get('p')
        initial_path = []
        if p_param:
            try:
                path_dict = eval(p_param)
                if isinstance(path_dict, dict):
                    initial_path = [str(v) for v in path_dict.values()]
            except:
                pass
        
        doc_tree = build_doc_tree(doc_dir)
        tree_html = render_tree_html(doc_tree)
        
        return render_root_template('docs_other.html', doc_tree=doc_tree, tree_html=tree_html, initial_path=initial_path)

    @app.route('/localcdn/doc/ot/<path:filepath>')
    def doc_other_file(filepath):
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', 'ot')
        os.makedirs(doc_dir, exist_ok=True)
        return send_from_directory(doc_dir, filepath)

    @app.route('/api/mc/whitelist/add', methods=['POST'])
    def api_mc_whitelist_add():
        print(f"DEBUG: API /api/mc/whitelist/add called")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request path: {request.path}")
        print(f"DEBUG: Request content type: {request.content_type}")
        result = mc_whitelist_add()
        print(f"DEBUG: API /api/mc/whitelist/add result: {result}")
        return result

    @app.route('/api/mc/invite_code', methods=['GET'])
    def api_mc_invite_code():
        print(f"DEBUG: API /api/mc/invite_code called")
        return mc_get_invite_code()

    @app.route('/api/mc/whitelist/remove', methods=['POST'])
    def api_mc_whitelist_remove():
        return mc_whitelist_remove()

    @app.route('/api/mc/whitelist/list', methods=['GET'])
    def api_mc_whitelist_list():
        return mc_whitelist_list()

    @app.route('/api/mc/whitelist/reload', methods=['POST'])
    def api_mc_whitelist_reload():
        return mc_whitelist_reload()

    @app.route('/api/mc/server/info', methods=['GET'])
    def api_mc_server_info():
        return mc_server_info()

    @app.route('/api/player/register', methods=['POST'])
    def api_player_register():
        return register_player()

    @app.route('/api/player/login', methods=['POST'])
    def api_player_login():
        return login_player()

    @app.route('/api/player/logout', methods=['POST'])
    def api_player_logout():
        return logout_player()

    @app.route('/api/player/set_password', methods=['POST'])
    def api_player_set_password():
        return set_player_password()

    @app.route('/api/player/check', methods=['GET'])
    def api_player_check():
        return check_player_login()

    @app.route('/api/player/change_password', methods=['POST'])
    def api_player_change_password():
        return change_player_password()

    @app.route('/api/player/remove_whitelist', methods=['POST'])
    def api_player_remove_whitelist():
        return remove_player_whitelist()

    @app.route('/api/player/register_whitelist', methods=['POST'])
    def api_player_register_whitelist():
        return register_whitelist()

    @app.route('/api/player/delete_account', methods=['POST'])
    def api_player_delete_account():
        return delete_player_account()

    @app.route('/api/mc/store/buy', methods=['POST'])
    def api_mc_store_buy():
        return mc_store_buy()

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
            success = execute_rcon_forcelogin(username)
            if success:
                session['player_name'] = username
                return jsonify({
                    'success': True,
                    'status': 'verified',
                    'message': '设备验证成功，已放行'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'RCON执行失败'
                }), 500
        
        return jsonify({
            'success': True,
            'status': 'mismatch',
            'message': '设备不匹配'
        })

    @app.route('/api/device/bind', methods=['POST'])
    def api_device_bind():
        if 'player_name' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        username = session['player_name']
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

    @app.route('/mc/login')
    def mc_login():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'mclogin.html')

    @app.route('/app/mclog')
    def mc_device_login_route():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'device_login.html')

    @app.route('/mc/device_login')
    def mc_device_login():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'device_login.html')

    @app.route('/mc/register')
    def mc_register():
        return render_root_template('mcreg.html')

    @app.route('/app/user')
    def mc_profile():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'profile.html')

    @app.route('/app/mcs')
    def mc_store():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'store.html')

    @app.route('/app/elevator')
    def elevator():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'elevator.html')

    @app.route('/app/elevator/admin')
    def elevator_admin():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'mcst'), 
                                 'elevator_admin.html')

    @app.route('/api/elevator/floors', methods=['GET'])
    def api_elevator_floors():
        floors_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'elevator_floors.json')
        if os.path.exists(floors_file):
            with open(floors_file, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        return jsonify({'floors': []})

    @app.route('/api/elevator/floors', methods=['POST'])
    def api_elevator_floors_save():
        data = request.get_json()
        floors_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'elevator_floors.json')
        os.makedirs(os.path.dirname(floors_file), exist_ok=True)
        with open(floors_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        return jsonify({'success': True})

    @app.route('/mc')
    def mc_index():
        return redirect('/localcdn/project/mc.html')
    
    # Webmap frontend routes
    @app.route('/app/webmap')
    def webmap_index():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'srvmap'), 
                                 'thirdparty-map.html')
    
    @app.route('/app/clientmap')
    def clientmap_index():
        return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              'webapp', 'srvmap'), 
                                 'client-map.html')

    # Minecraft map tile upload and download routes
    import hashlib

    def compute_simple_hash(data):
        """Compute a simple hash that matches the browser implementation"""
        h1 = 5381
        h2 = 52711
        for i, byte in enumerate(data):
            h1 = ((h1 << 5) + h1 + byte) & 0xFFFFFFFF
            h2 = ((h2 << 5) + h2 + data[i ^ 3]) & 0xFFFFFFFF
        return format(h1, '08x') + format(h2, '08x')

    @app.route('/webapp/srvmap/mapdata/1/hashes', methods=['GET'])
    def get_tile_hashes():
        """返回所有已保存瓦片的哈希值，用于上传前对比"""
        try:
            dimension = request.args.get('dimension', 'minecraft_overworld')
            map_type = request.args.get('mapType', 'day')
            zoom = request.args.get('zoom', '0')
            
            base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'webapp', 'srvmap', 'mapdata', '1',
                                 dimension, map_type, zoom)
            
            hashes = {}
            if os.path.exists(base_dir):
                for file in os.listdir(base_dir):
                    if file.endswith('.png') and file.startswith('tile_'):
                        file_path = os.path.join(base_dir, file)
                        with open(file_path, 'rb') as f:
                            file_hash = compute_simple_hash(f.read())
                        parts = file.replace('.png', '').split('_')
                        if len(parts) >= 4:
                            x = parts[1]
                            z = parts[2]
                            hashes[f"{x}_{z}"] = file_hash
            
            return jsonify({'success': True, 'hashes': hashes})
        except Exception as e:
            print(f"Error getting tile hashes: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/webapp/srvmap/mapdata/1/upload', methods=['POST'])
    def upload_map_tile():
        try:
            # Get tile parameters
            x = request.form.get('x')
            z = request.form.get('z')
            dimension = request.form.get('dimension')
            map_type = request.form.get('mapType', 'day')
            zoom = request.form.get('zoom', '0')
            
            if not x or not z or not dimension:
                return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
            
            # Sanitize dimension for Windows paths (replace : with _)
            safe_dimension = dimension.replace(':', '_')
            
            # Get tile file
            if 'tile' not in request.files:
                return jsonify({'success': False, 'error': 'No tile file provided'}), 400
            
            file = request.files['tile']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No selected file'}), 400
            
            # Create directory structure
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'webapp', 'srvmap', 'mapdata', '1', 
                                 safe_dimension, map_type, zoom)
            os.makedirs(save_dir, exist_ok=True)
            
            # Save file
            filename = f'tile_{x}_{z}.png'
            file_path = os.path.join(save_dir, filename)
            file.save(file_path)
            
            print(f"Saved map tile: {safe_dimension}/{map_type}/{zoom}/{x}_{z}.png")
            return jsonify({
                'success': True, 
                'message': 'Tile uploaded successfully',
                'path': f'/webapp/srvmap/mapdata/1/{safe_dimension}/{map_type}/{zoom}/{x}_{z}.png'
            })
            
        except Exception as e:
            print(f"Error uploading tile: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/webapp/srvmap/mapdata/1/list', methods=['GET'])
    def list_saved_tiles():
        try:
            base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'webapp', 'srvmap', 'mapdata', '1')
            os.makedirs(base_dir, exist_ok=True)
            
            tiles = []
            for root, dirs, files in os.walk(base_dir):
                for file in files:
                    if file.endswith('.png') and file.startswith('tile_'):
                        rel_path = os.path.relpath(root, base_dir)
                        parts = rel_path.split(os.sep)
                        if len(parts) >= 3:
                            dimension = parts[0]
                            map_type = parts[1]
                            zoom = parts[2]
                            filename_parts = file.split('_')
                            if len(filename_parts) >= 4:
                                x = filename_parts[1]
                                z = filename_parts[2].replace('.png', '')
                                tiles.append({
                                    'x': x,
                                    'z': z,
                                    'dimension': dimension,
                                    'mapType': map_type,
                                    'zoom': zoom,
                                    'url': f'/webapp/srvmap/mapdata/1/{rel_path}/{file}'
                                })
            
            return jsonify({'success': True, 'tiles': tiles})
        except Exception as e:
            print(f"Error listing tiles: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/webapp/srvmap/mapdata/1/<path:filepath>')
    def serve_map_tile(filepath):
        try:
            base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'webapp', 'srvmap', 'mapdata', '1')
            return send_from_directory(base_dir, filepath)
        except Exception as e:
            return jsonify({'success': False, 'error': 'Tile not found'}), 404

    # Routes and waypoints data storage
    map_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp', 'srvmap', 'mapdata', '1')
    os.makedirs(map_data_dir, exist_ok=True)
    routes_file = os.path.join(map_data_dir, 'routes.json')
    waypoints_file = os.path.join(map_data_dir, 'waypoints.json')

    def load_json_file(filepath, default):
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return default

    def save_json_file(filepath, data):
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Error saving {filepath}: {e}")
            return False

    @app.route('/webapp/srvmap/mapdata/1/routes', methods=['GET'])
    def get_routes():
        routes = load_json_file(routes_file, [])
        return jsonify({'success': True, 'routes': routes})

    @app.route('/webapp/srvmap/mapdata/1/routes', methods=['POST'])
    def save_routes():
        try:
            data = request.json
            if not data or 'routes' not in data:
                return jsonify({'success': False, 'error': 'Invalid data'}), 400
            if save_json_file(routes_file, data['routes']):
                return jsonify({'success': True, 'message': 'Routes saved'})
            return jsonify({'success': False, 'error': 'Failed to save'}), 500
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/webapp/srvmap/mapdata/1/waypoints', methods=['GET'])
    def get_waypoints():
        waypoints = load_json_file(waypoints_file, [])
        return jsonify({'success': True, 'waypoints': waypoints})

    @app.route('/webapp/srvmap/mapdata/1/waypoints', methods=['POST'])
    def save_waypoints():
        try:
            data = request.json
            if not data or 'waypoints' not in data:
                return jsonify({'success': False, 'error': 'Invalid data'}), 400
            if save_json_file(waypoints_file, data['waypoints']):
                return jsonify({'success': True, 'message': 'Waypoints saved'})
            return jsonify({'success': False, 'error': 'Failed to save'}), 500
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.errorhandler(404)
    def page_not_found(e):
        return render_root_template('404.html'), 404