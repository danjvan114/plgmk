from sqlalchemy import create_engine, text
import os
import json
from .utils import get_market_db_path, get_market_path

def get_market_db_engine(market_id):
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
                    try:
                        with open(ttmp4_path, 'r', encoding='utf-8') as f:
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

def update_rating(market_id, plugin_id, user_id, score):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE rating SET score = :score WHERE plugin_id = :plugin_id AND user_id = :user_id"),
            {'score': score, 'plugin_id': plugin_id, 'user_id': user_id}
        )
        conn.execute(
            text("UPDATE plugin SET rating = (SELECT AVG(score) FROM rating WHERE plugin_id = :id) WHERE id = :id"),
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

def update_plugin_info(market_id, plugin_id, name, description, version, tags, file_path=None):
    engine, text = get_market_db_engine(market_id)
    from datetime import datetime
    updated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with engine.connect() as conn:
        if file_path:
            conn.execute(
                text("UPDATE plugin SET name = :name, description = :desc, version = :version, tags = :tags, file_path = :file_path, updated_at = :updated_at WHERE id = :id"),
                {'name': name, 'desc': description, 'version': version, 'tags': tags, 'file_path': file_path, 'updated_at': updated_at, 'id': plugin_id}
            )
        else:
            conn.execute(
                text("UPDATE plugin SET name = :name, description = :desc, version = :version, tags = :tags, updated_at = :updated_at WHERE id = :id"),
                {'name': name, 'desc': description, 'version': version, 'tags': tags, 'updated_at': updated_at, 'id': plugin_id}
            )
        conn.commit()

def delete_plugin(market_id, plugin_id):
    engine, text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(text("DELETE FROM rating WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(text("DELETE FROM plugin WHERE id = :id"), {'id': plugin_id})
        conn.commit()

def init_market_database(market_id):
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

def init_player_database():
    userdata_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
    os.makedirs(userdata_dir, exist_ok=True)
    db_path = os.path.join(userdata_dir, 'players.db')
    engine = create_engine(f'sqlite:///{db_path}')
    
    player_table = text("""
    CREATE TABLE IF NOT EXISTS player (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    device_table = text("""
    CREATE TABLE IF NOT EXISTS player_device (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        device_uuid VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    with engine.connect() as conn:
        conn.execute(player_table)
        conn.execute(device_table)
        conn.commit()
    
    return engine

def get_player_engine():
    userdata_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
    db_path = os.path.join(userdata_dir, 'players.db')
    return create_engine(f'sqlite:///{db_path}')

def init_auth_callback_database():
    userdata_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
    os.makedirs(userdata_dir, exist_ok=True)
    db_path = os.path.join(userdata_dir, 'auth_callback.db')
    engine = create_engine(f'sqlite:///{db_path}')
    
    auth_table = text("""
    CREATE TABLE IF NOT EXISTS auth_callback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid VARCHAR(100) NOT NULL UNIQUE,
        backurl TEXT NOT NULL,
        user_id VARCHAR(50) DEFAULT '',
        secret_key VARCHAR(100) DEFAULT '',
        confirmed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    with engine.connect() as conn:
        conn.execute(auth_table)
        conn.commit()
    
    return engine

def create_auth_callback(uuid, backurl):
    engine = init_auth_callback_database()
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO auth_callback (uuid, backurl) VALUES (:uuid, :backurl)"),
            {'uuid': uuid, 'backurl': backurl}
        )
        conn.commit()

def get_auth_callback(uuid):
    engine = init_auth_callback_database()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM auth_callback WHERE uuid = :uuid"),
            {'uuid': uuid}
        )
        row = result.fetchone()
        if row:
            return {
                'id': row[0], 'uuid': row[1], 'backurl': row[2],
                'user_id': row[3], 'secret_key': row[4],
                'confirmed': row[5], 'created_at': row[6]
            }
        return None

def update_auth_callback(uuid, user_id, secret_key, confirmed):
    engine = init_auth_callback_database()
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE auth_callback SET user_id = :user_id, secret_key = :secret_key, confirmed = :confirmed WHERE uuid = :uuid"),
            {'uuid': uuid, 'user_id': user_id, 'secret_key': secret_key, 'confirmed': confirmed}
        )
        conn.commit()