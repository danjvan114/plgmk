from flask import request, redirect, url_for, session, send_from_directory, jsonify
from .config import app, MARKETS, User, db
from .utils import set_market, get_market_path, render_market_template, render_root_template
from .database import (
    get_market_plugins, search_market_plugins, get_plugin_by_id,
    update_plugin_download_count, add_rating, add_plugin, add_plugin_image,
    add_plugin_ttmp4, get_all_plugins, toggle_plugin_status, delete_plugin,
    get_plugin_images, update_plugin_info
)
import os
import hashlib
import re

def sanitize_description(text):
    """移除描述中的 JavaScript 代码，防止 XSS 攻击"""
    if not text:
        return text
    # 移除 <script> 标签及其内容
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    # 移除 javascript: 协议
    text = re.sub(r'javascript\s*:', '', text, flags=re.IGNORECASE)
    # 移除 onxxx 事件处理器（如 onclick, onerror, onload 等）
    text = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bon\w+\s*=\s*[^\s>]+', '', text, flags=re.IGNORECASE)
    return text

def register_market_routes():
    @app.route('/mk/<market_id>')
    def market_index(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if request.path != f'/mk/{market_id}':
            return render_root_template('404.html'), 404
        
        set_market(market_id)
        
        search_query = request.args.get('search', '')
        compact_mode = request.args.get('c') == '1'
        
        if search_query:
            plugins = search_market_plugins(market_id, search_query)
        else:
            plugins = get_market_plugins(market_id)
        
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('index.html', market_id=market_id, 
                                      plugins=plugins, search_query=search_query, users=users,
                                      compact_mode=compact_mode)
    @app.route('/kn/about')
    def knabout():
        return render_market_template('aboutgr.html', market_id='kn')
    @app.route('/mk/kn')
    def index():
        return market_index('kn')

    @app.route('/mk/<market_id>/plugin/<int:plugin_id>')
    def market_plugin_detail(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        set_market(market_id)
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        compact_mode = request.args.get('c') == '1'
        users = {u.username: u.to_dict() for u in User.query.all()}
        is_owner = session.get('user') == plugin['author']
        return render_market_template('plugin_detail.html', market_id=market_id, 
                                      plugin=plugin, users=users, is_owner=is_owner,
                                      compact_mode=compact_mode)

    @app.route('/mk/kn/plugin/<int:plugin_id>')
    def plugin_detail(plugin_id):
        return market_plugin_detail('kn', plugin_id)

    @app.route('/mk/<market_id>/uploads/<path:filepath>')
    def market_uploaded_file(market_id, filepath):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        upload_folder = os.path.join(get_market_path(market_id), 'uploads')
        return send_from_directory(upload_folder, filepath)

    @app.route('/mk/kn/uploads/<path:filepath>')
    def uploaded_file(filepath):
        return market_uploaded_file('kn', filepath)

    @app.route('/mk/<market_id>/download/<int:plugin_id>')
    def market_download_plugin(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        set_market(market_id)
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        update_plugin_download_count(market_id, plugin_id)
        
        file_path = plugin['file_path']
        if file_path.startswith('http://') or file_path.startswith('https://'):
            return redirect(file_path)
        
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        return send_from_directory(directory, filename, as_attachment=True)

    @app.route('/mk/kn/download/<int:plugin_id>')
    def download_plugin(plugin_id):
        return market_download_plugin('kn', plugin_id)

    @app.route('/mk/<market_id>/rate/<int:plugin_id>', methods=['GET', 'POST'])
    def market_rate_plugin(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        set_market(market_id)
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        compact_mode = request.args.get('c') == '1' or request.form.get('c') == '1'
        
        if request.method == 'POST':
            score = int(request.form.get('score'))
            from datetime import datetime
            created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            user_id = session.get('user', 'anonymous_' + str(hash(request.remote_addr)))
            add_rating(market_id, plugin_id, user_id, score, created_at)
            if compact_mode:
                return redirect(url_for('market_plugin_detail', market_id=market_id, plugin_id=plugin_id, c='1'))
            return redirect(url_for('market_plugin_detail', market_id=market_id, plugin_id=plugin_id))
        
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('rate.html', market_id=market_id, 
                                      plugin=plugin, users=users, compact_mode=compact_mode)

    @app.route('/mk/kn/rate/<int:plugin_id>', methods=['GET', 'POST'])
    def rate_plugin(plugin_id):
        return market_rate_plugin('kn', plugin_id)

    @app.route('/mk/<market_id>/upload', methods=['GET', 'POST'])
    def market_upload_plugin(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        upload_folder = os.path.join(get_market_path(market_id), 'uploads')
        
        if request.method == 'POST':
            name = request.form['name']
            description = sanitize_description(request.form['description'])
            version = request.form['version']
            tags = request.form.get('tags', '')
            external_url = request.form.get('external_url', '').strip()
            
            from datetime import datetime
            created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            file = request.files['file']
            if external_url:
                file_path = external_url
                plugin_id = add_plugin(market_id, name, description, session['user'], version, file_path, tags, created_at, created_at)
            elif file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']:
                plugin_folder = f"{name.replace('/', '_').replace('\\', '_')[:50]}"
                plugin_folder_path = os.path.join(upload_folder, plugin_folder)
                if not os.path.exists(plugin_folder_path):
                    os.makedirs(plugin_folder_path)
                
                file_content = file.read()
                file_hash = hashlib.md5(file_content).hexdigest()
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = f"{file_hash}.{ext}"
                file_path = os.path.join(plugin_folder_path, filename)
                
                with open(file_path, 'wb') as f:
                    f.write(file_content)
                
                plugin_id = add_plugin(market_id, name, description, session['user'], version, file_path, tags, created_at, created_at)
            else:
                users = {u.username: u.to_dict() for u in User.query.all()}
                return render_market_template('upload.html', market_id=market_id, users=users, max_images=5, error='请上传插件文件或提供下载链接')
            
            ttmp4_file = request.files.get('ttmp4_file')
            ttmp4_url = request.form.get('ttmp4_url', '').strip()
            
            if ttmp4_file and ttmp4_file.filename.endswith('.ttmp4'):
                plugin_folder = f"{name.replace('/', '_').replace('\\', '_')[:50]}"
                plugin_folder_path = os.path.join(upload_folder, plugin_folder)
                if not os.path.exists(plugin_folder_path):
                    os.makedirs(plugin_folder_path)
                
                ttmp4_content = ttmp4_file.read()
                ttmp4_hash = hashlib.md5(ttmp4_content).hexdigest()
                ttmp4_filename = f"{ttmp4_hash}.ttmp4"
                ttmp4_path = os.path.join(plugin_folder_path, ttmp4_filename)
                
                with open(ttmp4_path, 'wb') as f:
                    f.write(ttmp4_content)
                
                add_plugin_ttmp4(market_id, plugin_id, ttmp4_path)
            elif ttmp4_url:
                add_plugin_ttmp4(market_id, plugin_id, ttmp4_url)
            
            return redirect(url_for('market_plugin_detail', market_id=market_id, plugin_id=plugin_id))
        
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('upload.html', market_id=market_id, users=users, max_images=5)

    @app.route('/mk/kn/upload', methods=['GET', 'POST'])
    def upload_plugin():
        return market_upload_plugin('kn')

    @app.route('/mk/<market_id>/update/<int:plugin_id>', methods=['GET', 'POST'])
    def market_update_plugin(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        upload_folder = os.path.join(get_market_path(market_id), 'uploads')
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        if session['user'] != plugin['author']:
            return redirect(url_for('market_index', market_id=market_id))
        
        if request.method == 'POST':
            name = request.form['name']
            description = sanitize_description(request.form['description'])
            version = request.form['version']
            tags = request.form.get('tags', '')
            external_url = request.form.get('external_url', '').strip()
            
            file_path = None
            if external_url:
                # 使用外部链接
                file_path = external_url
            elif 'file' in request.files:
                file = request.files['file']
                if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']:
                    file_content = file.read()
                    file_hash = hashlib.md5(file_content).hexdigest()
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    filename = f"{file_hash}.{ext}"
                    
                    plugin_folder_path = os.path.dirname(plugin['file_path'])
                    file_path = os.path.join(plugin_folder_path, filename)
                    
                    with open(file_path, 'wb') as f:
                        f.write(file_content)
            
            # 更新数据库（保留旧文件）
            update_plugin_info(market_id, plugin_id, name, description, version, tags, file_path)
            
            images = request.files.getlist('images')
            max_images = 5
            existing_images = get_plugin_images(market_id, plugin_id)
            existing_count = len(existing_images)
            
            for i, image_file in enumerate(images):
                if existing_count + i >= max_images:
                    break
                if image_file and '.' in image_file.filename and image_file.filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'webp'}:
                    img_content = image_file.read()
                    img_hash = hashlib.md5(img_content).hexdigest()
                    img_ext = image_file.filename.rsplit('.', 1)[1].lower()
                    img_filename = f"{img_hash}.{img_ext}"
                    
                    plugin_folder_path = os.path.dirname(plugin['file_path'])
                    img_path = os.path.join(plugin_folder_path, img_filename)
                    
                    with open(img_path, 'wb') as f:
                        f.write(img_content)
                    
                    add_plugin_image(market_id, plugin_id, img_path)
            
            return redirect(url_for('market_plugin_detail', market_id=market_id, plugin_id=plugin_id))
        
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('update.html', market_id=market_id, 
                                      plugin=plugin, users=users, max_images=5)

    @app.route('/mk/kn/update/<int:plugin_id>', methods=['GET', 'POST'])
    def update_plugin(plugin_id):
        return market_update_plugin('kn', plugin_id)

    @app.route('/mk/<market_id>/toggle_status/<int:plugin_id>')
    def market_toggle_status(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        if session['user'] != plugin['author']:
            return redirect(url_for('market_index', market_id=market_id))
        
        toggle_plugin_status(market_id, plugin_id)
        
        return redirect(url_for('market_plugin_detail', market_id=market_id, plugin_id=plugin_id))

    @app.route('/mk/kn/toggle_status/<int:plugin_id>')
    def toggle_plugin_status_route(plugin_id):
        return market_toggle_status('kn', plugin_id)

    @app.route('/mk/<market_id>/delete/<int:plugin_id>')
    def market_delete_plugin(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        plugin = get_plugin_by_id(market_id, plugin_id)
        if not plugin:
            return render_root_template('404.html'), 404
        
        if session['user'] != plugin['author']:
            return redirect(url_for('market_index', market_id=market_id))
        
        # 删除插件文件
        file_path = plugin['file_path']
        if file_path and not file_path.startswith('http://') and not file_path.startswith('https://'):
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass
        
        # 删除插件图片
        images = get_plugin_images(market_id, plugin_id)
        for img in images:
            try:
                if os.path.exists(img['image_path']):
                    os.remove(img['image_path'])
            except:
                pass
        
        # 从数据库永久删除
        delete_plugin(market_id, plugin_id)
        
        return redirect(url_for('market_index', market_id=market_id))

    @app.route('/mk/kn/delete/<int:plugin_id>')
    def delete_plugin_route(plugin_id):
        return market_delete_plugin('kn', plugin_id)

    @app.route('/mk/<market_id>/developer/stats')
    def market_developer_stats(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        all_plugins = get_all_plugins(market_id)
        user_plugins = [p for p in all_plugins if p['author'] == session['user']]
        total_downloads = sum(p['download_count'] for p in user_plugins)
        total_ratings = sum(p['rating_count'] for p in user_plugins)
        avg_rating = sum(p['rating'] * p['rating_count'] for p in user_plugins) / total_ratings if total_ratings > 0 else 0
        
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('developer_stats.html', market_id=market_id, 
                                      plugins=user_plugins,
                                      total_downloads=total_downloads, avg_rating=avg_rating, users=users)

    @app.route('/mk/kn/developer/stats')
    def developer_stats():
        return market_developer_stats('kn')

    @app.route('/mk/<market_id>/admin')
    def market_admin_panel(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        user = User.query.get(session['user'])
        if not user or user.role != 'admin':
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        plugins = get_all_plugins(market_id)
        return render_market_template('admin.html', market_id=market_id, plugins=plugins)

    @app.route('/mk/kn/admin')
    def admin_panel():
        return market_admin_panel('kn')

    @app.route('/mk/<market_id>/admin/delete/<int:plugin_id>')
    def market_admin_delete(market_id, plugin_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        user = User.query.get(session['user'])
        if not user or user.role != 'admin':
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        delete_plugin(market_id, plugin_id)
        
        return redirect(url_for('market_admin_panel', market_id=market_id))

    @app.route('/mk/kn/admin/delete/<int:plugin_id>')
    def admin_delete(plugin_id):
        return market_admin_delete('kn', plugin_id)

    @app.route('/mk/<market_id>/admin/batch_delete', methods=['POST'])
    def market_admin_batch_delete(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        user = User.query.get(session['user'])
        if not user or user.role != 'admin':
            return redirect(url_for('login'))
        
        plugin_ids = request.form.getlist('plugin_ids')
        if plugin_ids:
            set_market(market_id)
            for plugin_id in plugin_ids:
                try:
                    delete_plugin(market_id, int(plugin_id))
                except:
                    pass
        
        return redirect(url_for('market_admin_panel', market_id=market_id))

    @app.route('/mk/kn/admin/batch_delete', methods=['POST'])
    def admin_batch_delete():
        return market_admin_batch_delete('kn')

    @app.route('/app/api/knmk', methods=['GET'])
    def api_knmk():
        set_market('kn')
        page = request.args.get('page', 1, type=int)
        per_page = 20
        
        all_plugins = get_market_plugins('kn')
        total = len(all_plugins)
        start = (page - 1) * per_page
        end = start + per_page
        page_plugins = all_plugins[start:end]
        
        result = []
        for p in page_plugins:
            tags = []
            if p.get('tags'):
                tags = [t.strip() for t in p['tags'].split(',') if t.strip()]
            
            result.append({
                'id': p['id'],
                'name': p['name'],
                'author': p['author'],
                'download_url': f'/mk/kn/download/{p["id"]}',
                'tags': tags,
                'rating': p['rating']
            })
        
        return jsonify({
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page,
            'plugins': result
        })

    @app.route('/app/api/knmk/dt', methods=['GET'])
    def api_knmk_dt():
        plugin_id = request.args.get('id', type=int)
        if not plugin_id:
            return '缺少插件ID', 400
        
        set_market('kn')
        plugin = get_plugin_by_id('kn', plugin_id)
        if not plugin:
            return '插件不存在', 404
        
        return plugin.get('description', '')