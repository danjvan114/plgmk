from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, make_response
from flask_sqlalchemy import SQLAlchemy
from jinja2 import Environment, FileSystemLoader
import os
import hashlib
import urllib

USER_DATA_FOLDER = os.path.join(os.path.dirname(__file__), 'mk', 'userdata')
MARKETS = {'kn': 'KN插件市场', 'k4u': 'K4U插件市场'}

app = Flask(__name__)

market_jinja_envs = {}
market_template_dirs = {}
for market_id in MARKETS:
    template_dir = os.path.join(os.path.dirname(__file__), 'mk', market_id, 'template')
    market_template_dirs[market_id] = template_dir
    market_jinja_envs[market_id] = Environment(loader=FileSystemLoader(template_dir))

ROOT_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), 'template')
root_jinja_env = Environment(loader=FileSystemLoader(ROOT_TEMPLATE_DIR))

def get_current_market():
    return session.get('market', 'kn')

def set_market(market_id):
    if market_id in MARKETS:
        session['market'] = market_id

def get_market_path(market_id=None):
    if market_id is None:
        market_id = get_current_market()
    return os.path.join(os.path.dirname(__file__), 'mk', market_id)

def get_market_db_path(market_id=None):
    if market_id is None:
        market_id = get_current_market()
    return os.path.join(get_market_path(market_id), 'market.db')

def render_market_template(template_name, market_id=None, **kwargs):
    if market_id is None:
        market_id = get_current_market()
    env = market_jinja_envs[market_id]
    template = env.get_template(template_name)
    kwargs['session'] = session
    kwargs['current_market'] = market_id
    kwargs['markets'] = MARKETS
    return template.render(**kwargs)

def render_root_template(template_name, **kwargs):
    template = root_jinja_env.get_template(template_name)
    return template.render(**kwargs)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'plugin-market-secret-key')
app.config['DEBUG'] = False
app.config['ALLOWED_EXTENSIONS'] = {'zip', 'rar', 'py', 'tar', 'gz', 'js'}
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['SQLALCHEMY_BINDS'] = {
    'users': f'sqlite:///{USER_DATA_FOLDER}/users.db'
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    __bind_key__ = 'users'
    username = db.Column(db.String(50), primary_key=True)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='user')
    
    def to_dict(self):
        return {'username': self.username, 'password': self.password, 'role': self.role}

def get_market_db_engine(market_id):
    from sqlalchemy import create_engine, text
    db_path = get_market_db_path(market_id)
    return create_engine(f'sqlite:///{db_path}'), text

def get_market_plugins(market_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM plugin WHERE status = 'active'"))
        plugins = []
        for row in result:
            plugin = {
                'id': row[0], 'name': row[1], 'description': row[2],
                'author': row[3], 'version': row[4], 'download_count': row[5],
                'rating': row[6], 'rating_count': row[7], 'status': row[8],
                'file_path': row[9], 'created_at': row[10], 'updated_at': row[11],
                'tags': row[12], 'images': get_plugin_images(market_id, row[0])
            }
            plugins.append(plugin)
        return plugins

def search_market_plugins(market_id, query):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM plugin WHERE status = 'active' AND (name LIKE :name OR description LIKE :desc)"),
            {'name': f'%{query}%', 'desc': f'%{query}%'}
        )
        plugins = []
        for row in result:
            plugin = {
                'id': row[0], 'name': row[1], 'description': row[2],
                'author': row[3], 'version': row[4], 'download_count': row[5],
                'rating': row[6], 'rating_count': row[7], 'status': row[8],
                'file_path': row[9], 'created_at': row[10], 'updated_at': row[11],
                'tags': row[12], 'images': get_plugin_images(market_id, row[0])
            }
            plugins.append(plugin)
        return plugins

def get_plugin_by_id(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM plugin WHERE id = :id"), {'id': plugin_id})
        row = result.fetchone()
        if row:
            ttmp4_path = row[13] if len(row) > 13 else ''
            ttmp4_url = ''
            if ttmp4_path:
                if ttmp4_path.startswith('http'):
                    ttmp4_url = ttmp4_path
                else:
                    # 读取本地 ttmp4 文件获取 URL
                    try:
                        with open(ttmp4_path, 'r', encoding='utf-8') as f:
                            import json
                            data = json.load(f)
                            if data.get('url'):
                                ttmp4_url = data['url']
                    except Exception:
                        pass
            
            return {
                'id': row[0], 'name': row[1], 'description': row[2],
                'author': row[3], 'version': row[4], 'download_count': row[5],
                'rating': row[6], 'rating_count': row[7], 'status': row[8],
                'file_path': row[9], 'created_at': row[10], 'updated_at': row[11],
                'tags': row[12], 'images': get_plugin_images(market_id, row[0]),
                'ttmp4_path': ttmp4_path,
                'ttmp4_url': ttmp4_url
            }
        return None

def get_plugin_images(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        images = []
        for row in result:
            images.append({'id': row[0], 'image_path': row[2]})
        return images

def add_plugin(market_id, name, description, author, version, file_path, tags, created_at, updated_at):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO plugin (name, description, author, version, download_count, rating, rating_count, status, file_path, created_at, updated_at, tags) VALUES (:name, :desc, :author, :version, 0, 0.0, 0, 'active', :file_path, :created_at, :updated_at, :tags)"),
            {'name': name, 'desc': description, 'author': author, 'version': version, 'file_path': file_path, 'created_at': created_at, 'updated_at': updated_at, 'tags': tags}
        )
        conn.commit()
        result = conn.execute(text("SELECT last_insert_rowid()"))
        return result.fetchone()[0]

def add_plugin_image(market_id, plugin_id, image_path):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO plugin_image (plugin_id, image_path) VALUES (:plugin_id, :image_path)"),
            {'plugin_id': plugin_id, 'image_path': image_path}
        )
        conn.commit()

def add_plugin_ttmp4(market_id, plugin_id, ttmp4_path):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE plugin SET ttmp4_path = :ttmp4_path WHERE id = :plugin_id"),
            {'plugin_id': plugin_id, 'ttmp4_path': ttmp4_path}
        )
        conn.commit()

def update_plugin_download_count(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE plugin SET download_count = download_count + 1 WHERE id = :id"),
            {'id': plugin_id}
        )
        conn.commit()

def add_rating(market_id, plugin_id, user_id, score, created_at):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO rating (plugin_id, user_id, score, created_at) VALUES (:plugin_id, :user_id, :score, :created_at)"),
            {'plugin_id': plugin_id, 'user_id': user_id, 'score': score, 'created_at': created_at}
        )
        conn.execute(
            text("UPDATE plugin SET rating_count = rating_count + 1, rating = (SELECT AVG(score) FROM rating WHERE plugin_id = :id) WHERE id = :id"),
            {'id': plugin_id}
        )
        conn.commit()

def get_user_ratings(market_id, user_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT plugin_id, score FROM rating WHERE user_id = :user_id"), {'user_id': user_id})
        ratings = {}
        for row in result:
            ratings[row[0]] = row[1]
        return ratings

def get_all_plugins(market_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM plugin"))
        plugins = []
        for row in result:
            plugin = {
                'id': row[0], 'name': row[1], 'description': row[2],
                'author': row[3], 'version': row[4], 'download_count': row[5],
                'rating': row[6], 'rating_count': row[7], 'status': row[8],
                'file_path': row[9], 'created_at': row[10], 'updated_at': row[11],
                'tags': row[12], 'images': get_plugin_images(market_id, row[0])
            }
            plugins.append(plugin)
        return plugins

def toggle_plugin_status(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT status FROM plugin WHERE id = :id"), {'id': plugin_id})
        row = result.fetchone()
        if row:
            new_status = 'inactive' if row[0] == 'active' else 'active'
            conn.execute(text("UPDATE plugin SET status = :status WHERE id = :id"), {'status': new_status, 'id': plugin_id})
            conn.commit()
            return new_status
        return None

def delete_plugin(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(text("DELETE FROM rating WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(text("DELETE FROM plugin WHERE id = :id"), {'id': plugin_id})
        conn.commit()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def allowed_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'webp'}

with app.app_context():
    if not os.path.exists(USER_DATA_FOLDER):
        os.makedirs(USER_DATA_FOLDER)
    
    for market_id in MARKETS:
        market_path = get_market_path(market_id)
        uploads_path = os.path.join(market_path, 'uploads')
        if not os.path.exists(uploads_path):
            os.makedirs(uploads_path)
    
    db.create_all()
    
    admin_exists = User.query.filter_by(role='admin').first()
    if not admin_exists:
        import random
        import string
        admin_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        admin = User(username='admin', password=admin_password, role='admin')
        db.session.add(admin)
        db.session.commit()
        print(f"=== 管理员账号已自动创建 ===")
        print(f"用户名: admin")
        print(f"密码: {admin_password}")
        print(f"=============================")
def init_market_database(market_id):
    from sqlalchemy import create_engine, text
    
    db_path = get_market_db_path(market_id)
    engine = create_engine(f'sqlite:///{db_path}')
    
    plugin_table = text("""
    CREATE TABLE IF NOT EXISTS plugin (
        id INTEGER PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        author VARCHAR(50) NOT NULL,
        version VARCHAR(20) NOT NULL,
        download_count INTEGER DEFAULT 0,
        rating FLOAT DEFAULT 0.0,
        rating_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        file_path VARCHAR(255) NOT NULL,
        created_at VARCHAR(20) DEFAULT '2024-01-01',
        updated_at VARCHAR(20) DEFAULT '2024-01-01',
        tags VARCHAR(255) DEFAULT '',
        ttmp4_path VARCHAR(500) DEFAULT ''
    )
    """)
    
    image_table = text("""
    CREATE TABLE IF NOT EXISTS plugin_image (
        id INTEGER PRIMARY KEY,
        plugin_id INTEGER NOT NULL,
        image_path VARCHAR(255) NOT NULL
    )
    """)
    
    rating_table = text("""
    CREATE TABLE IF NOT EXISTS rating (
        id INTEGER PRIMARY KEY,
        plugin_id INTEGER NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        created_at VARCHAR(20) DEFAULT '2024-01-01'
    )
    """)
    
    with engine.connect() as conn:
        conn.execute(plugin_table)
        conn.execute(image_table)
        conn.execute(rating_table)
        conn.commit()

for market_id in MARKETS:
    market_path = get_market_path(market_id)
    upload_folder = os.path.join(market_path, 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    init_market_database(market_id)

@app.route('/')
def root():
    return redirect(url_for('index'))

@app.route('/health')
def health_check():
    return {'status': 'ok', 'message': 'Server is running'}

@app.route('/ping')
def ping():
    return 'pong'

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

@app.route('/static/<path:filename>')
def root_static_files(filename):
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    return send_from_directory(static_dir, filename)

@app.route('/localcdn/<path:filename>')
def local_cdn(filename):
    localcdn_dir = os.path.join(os.path.dirname(__file__), 'localcdn')
    if not os.path.exists(localcdn_dir):
        os.makedirs(localcdn_dir)
    return send_from_directory(localcdn_dir, filename)

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
    
    # 从 GET 或 POST 参数中获取 c 值
    compact_mode = request.args.get('c') == '1' or request.form.get('c') == '1'
    
    if request.method == 'POST':
        score = int(request.form.get('score'))
        from datetime import datetime
        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        # 允许未登录用户评分，使用匿名用户标识
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
        elif file and allowed_file(file.filename):
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
        
        # 处理 TTMP4 文件上传
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
            if file and allowed_file(file.filename):
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
            if image_file and allowed_image_file(image_file.filename):
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
def toggle_plugin_status(plugin_id):
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

@app.route('/op/user')
def admin_users():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user'])
    if not user or user.role != 'admin':
        return redirect(url_for('login'))
    
    users = {u.username: u.to_dict() for u in User.query.all()}
    return render_root_template('admin_users.html', users=users)

@app.route('/op/user/add', methods=['POST'])
def admin_add_user():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user'])
    if not user or user.role != 'admin':
        return redirect(url_for('login'))
    
    username = request.form['username']
    password = request.form['password']
    role = request.form['role']
    
    if not User.query.get(username):
        new_user = User(username=username, password=password, role=role)
        db.session.add(new_user)
        db.session.commit()
    
    return redirect(url_for('admin_users'))

@app.route('/op/user/edit/<username>', methods=['POST'])
def admin_edit_user(username):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user'])
    if not user or user.role != 'admin':
        return redirect(url_for('login'))
    
    edit_user = User.query.get(username)
    if edit_user:
        edit_user.role = request.form['role']
        if request.form['password']:
            edit_user.password = request.form['password']
        db.session.commit()
    
    return redirect(url_for('admin_users'))

@app.route('/op/user/delete/<username>')
def admin_delete_user(username):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user'])
    if not user or user.role != 'admin':
        return redirect(url_for('login'))
    
    delete_user = User.query.get(username)
    if delete_user and delete_user.username != session['user']:
        db.session.delete(delete_user)
        db.session.commit()
    
    return redirect(url_for('admin_users'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.get(username)
        
        if user and user.password == password:
            session['user'] = username
            session['market'] = 'kn'
            return redirect(url_for('index'))
    
    return render_market_template('login.html', error=None)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            return render_root_template('register.html', error='两次输入的密码不一致')
        
        if User.query.get(username):
            return render_root_template('register.html', error='用户名已存在')
        
        new_user = User(username=username, password=password, role='user')
        db.session.add(new_user)
        db.session.commit()
        
        return render_root_template('register.html', success='注册成功！即将跳转到登录页面')
    
    return render_root_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/change_password', methods=['GET', 'POST'])
def change_password():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        old_password = request.form['old_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        user = User.query.get(session['user'])
        if user and user.password == old_password and new_password == confirm_password:
            user.password = new_password
            db.session.commit()
            return redirect(url_for('index'))
    
    users = {u.username: u.to_dict() for u in User.query.all()}
    return render_market_template('change_password.html', users=users)

@app.route('/app/kn/d')
def app_kn_detail():
    users = {u.username: u.to_dict() for u in User.query.all()}
    return render_market_template('app_detail.html', market_id='kn', users=users)

@app.route('/dev/<market_id>')
def developer_center(market_id):
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
    
    user = User.query.get(session['user'])
    is_admin = user and user.role == 'admin'
    
    return render_market_template('developer_center.html', market_id=market_id,
                                  plugins_count=len(user_plugins),
                                  total_downloads=total_downloads,
                                  total_ratings=total_ratings,
                                  avg_rating=avg_rating,
                                  user_plugins=user_plugins,
                                  is_admin=is_admin)

@app.route('/dev/kn')
def developer_center_kn():
    return developer_center('kn')

@app.route('/dev/k4u')
def developer_center_k4u():
    return developer_center('k4u')

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
    except Exception:
        pass
    return tree

def render_tree_html(items, prefix='', market_id=''):
    html = ''
    for item in items:
        full_path = f"{prefix}/{item['name']}" if prefix else item['name']
        encoded_path = urllib.parse.quote(full_path)
        file_url = f'/localcdn/doc/{market_id}/{encoded_path}'
        if item['type'] == 'folder':
            html += f'''<li>
                <div class="folder" onclick="toggleFolder(this)">
                    <span class="toggle-icon">▶</span>
                    <span>{item['name']}</span>
                </div>
                <ul class="subtree">
                    {render_tree_html(item['children'], full_path, market_id)}
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
    return html

@app.route('/dev/kn/docs')
def docs_kn():
    doc_dir = os.path.join(os.path.dirname(__file__), 'localcdn', 'doc', 'kn')
    os.makedirs(doc_dir, exist_ok=True)
    doc_tree = build_doc_tree(doc_dir)
    tree_html = render_tree_html(doc_tree, market_id='kn')
    
    return render_market_template('docs.html', market_id='kn', doc_tree=doc_tree, tree_html=tree_html)

@app.route('/dev/<market_id>/docs')
def docs(market_id):
    if market_id not in MARKETS:
        return render_root_template('404.html'), 404
    
    doc_dir = os.path.join(os.path.dirname(__file__), 'localcdn', 'doc', market_id)
    os.makedirs(doc_dir, exist_ok=True)
    doc_tree = build_doc_tree(doc_dir)
    tree_html = render_tree_html(doc_tree, market_id=market_id)
    
    return render_market_template('docs.html', market_id=market_id, doc_tree=doc_tree, tree_html=tree_html)

@app.route('/switch_market/<market_id>')
def switch_market(market_id):
    if market_id in MARKETS:
        set_market(market_id)
    return redirect(url_for('market_index', market_id=market_id))

@app.errorhandler(404)
def page_not_found(e):
    return render_root_template('404.html'), 404

if __name__ == '__main__':
    try:
        from waitress import serve
        print("Running with Waitress production WSGI server...")
        serve(app, host='0.0.0.0', port=8897)
    except ImportError:
        app.run(host='0.0.0.0', port=8897)