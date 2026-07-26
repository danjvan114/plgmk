from flask import request, redirect, url_for, session, send_from_directory
from .config import app, MARKETS, User, db
from .utils import set_market, get_market_path, render_market_template, render_root_template
from .database import (
    get_market_plugins, search_market_plugins, get_plugin_by_id,
    update_plugin_download_count, add_rating, add_plugin, add_plugin_image,
    add_plugin_ttmp4, get_all_plugins, toggle_plugin_status, delete_plugin,
    get_plugin_images
)
import os
import hashlib

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

    @app.route('/mk/kn')
    def index():
        return market_index('kn')

    @app.route('/mk/k4u')
    def index_k4u():
        return market_index('k4u')

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

    @app.route('/mk/k4u/plugin/<int:plugin_id>')
    def plugin_detail_k4u(plugin_id):
        return market_plugin_detail('k4u', plugin_id)

    @app.route('/mk/<market_id>/uploads/<path:filepath>')
    def market_uploaded_file(market_id, filepath):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        upload_folder = os.path.join(get_market_path(market_id), 'uploads')
        return send_from_directory(upload_folder, filepath)

    @app.route('/mk/kn/uploads/<path:filepath>')
    def uploaded_file(filepath):
        return market_uploaded_file('kn', filepath)

    @app.route('/mk/k4u/uploads/<path:filepath>')
    def uploaded_file_k4u(filepath):
        return market_uploaded_file('k4u', filepath)

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

    @app.route('/mk/k4u/download/<int:plugin_id>')
    def download_plugin_k4u(plugin_id):
        return market_download_plugin('k4u', plugin_id)

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

    @app.route('/mk/k4u/rate/<int:plugin_id>', methods=['GET', 'POST'])
    def rate_plugin_k4u(plugin_id):
        return market_rate_plugin('k4u', plugin_id)

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
            description = request.form['description']
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

    @app.route('/mk/k4u/upload', methods=['GET', 'POST'])
    def upload_plugin_k4u():
        return market_upload_plugin('k4u')

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
            description = request.form['description']
            version = request.form['version']
            tags = request.form.get('tags', '')
            
            file_path = plugin['file_path']
            if 'file' in request.files:
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

    @app.route('/mk/k4u/update/<int:plugin_id>', methods=['GET', 'POST'])
    def update_plugin_k4u(plugin_id):
        return market_update_plugin('k4u', plugin_id)

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

    @app.route('/mk/k4u/toggle_status/<int:plugin_id>')
    def toggle_plugin_status_k4u(plugin_id):
        return market_toggle_status('k4u', plugin_id)

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

    @app.route('/mk/k4u/developer/stats')
    def developer_stats_k4u():
        return market_developer_stats('k4u')

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

    @app.route('/mk/k4u/admin')
    def admin_panel_k4u():
        return market_admin_panel('k4u')

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

    @app.route('/mk/k4u/admin/delete/<int:plugin_id>')
    def admin_delete_k4u(plugin_id):
        return market_admin_delete('k4u', plugin_id)

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

    @app.route('/mk/k4u/admin/batch_delete', methods=['POST'])
    def admin_batch_delete_k4u():
        return market_admin_batch_delete('k4u')