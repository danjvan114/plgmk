from sqlalchemy import create_engine, text
import os
import json
from datetime import datetime
from .utils import get_market_db_path, get_market_path


def _migrate_market_db(engine):
    """为已存在的 market.db 补充新表/新字段（点赞、投币、浏览量、封面）"""
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS plugin_like (id INTEGER PRIMARY KEY, plugin_id INTEGER NOT NULL, user_id VARCHAR(50) NOT NULL, created_at VARCHAR(20) DEFAULT '2024-01-01')"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS plugin_coin (id INTEGER PRIMARY KEY, plugin_id INTEGER NOT NULL, user_id VARCHAR(50) NOT NULL, created_at VARCHAR(20) DEFAULT '2024-01-01')"))
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(plugin)")).fetchall()]
            for col, ddl in [('like_count', 'INTEGER DEFAULT 0'),
                             ('coin_count', 'INTEGER DEFAULT 0'),
                             ('view_count', 'INTEGER DEFAULT 0'),
                             ('cover_url', "VARCHAR(500) DEFAULT ''")]:
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE plugin ADD COLUMN {col} {ddl}"))
            conn.commit()
    except Exception:
        pass


def _build_plugin(row, market_id, with_images=True):
    """将 plugin 行统一转换为 dict；tags 拆分为列表，补充点赞/投币/浏览量/封面等字段。"""
    if hasattr(row, '_mapping'):
        d = dict(row._mapping)
    elif hasattr(row, 'keys'):
        d = dict(zip(row.keys(), row))
    else:
        d = row
    tags_raw = d.get('tags') or ''
    tag_list = [t.strip() for t in tags_raw.split(',') if t.strip()] if tags_raw else []
    p = {
        'id': d['id'], 'name': d['name'], 'description': d['description'],
        'author': d['author'], 'version': d['version'],
        'download_count': d.get('download_count', 0),
        'downloads': d.get('download_count', 0),
        'rating': d.get('rating', 0), 'rating_count': d.get('rating_count', 0),
        'status': d.get('status', 'active'), 'file_path': d.get('file_path', ''),
        'created_at': d.get('created_at', ''), 'updated_at': d.get('updated_at', ''),
        'tags': tag_list, 'ttmp4_path': d.get('ttmp4_path', ''),
        'like_count': d.get('like_count', 0), 'coin_count': d.get('coin_count', 0),
        'view_count': d.get('view_count', 0), 'cover_url': d.get('cover_url', '')
    }
    if with_images:
        p['images'] = get_plugin_images(market_id, d['id'])
    return p

_engine_cache = {}

def get_market_db_engine(market_id):
    if market_id not in _engine_cache:
        db_path = get_market_db_path(market_id)
        eng = create_engine(
            f'sqlite:///{db_path}',
            connect_args={'timeout': 30, 'check_same_thread': False},
            pool_pre_ping=True,
            pool_recycle=3600
        )
        _migrate_market_db(eng)
        _engine_cache[market_id] = eng
    return _engine_cache[market_id], text

def get_market_plugins(market_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT * FROM plugin WHERE status = 'active'"))
        return [_build_plugin(row, market_id) for row in result]

def search_market_plugins(market_id, query):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(
            sql_text("SELECT * FROM plugin WHERE status = 'active' AND (name LIKE :name OR description LIKE :desc)"),
            {'name': f'%{query}%', 'desc': f'%{query}%'}
        )
        return [_build_plugin(row, market_id) for row in result]

def get_plugin_by_id(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT * FROM plugin WHERE id = :id"), {'id': plugin_id})
        row = result.fetchone()
        if row:
            p = _build_plugin(row, market_id)
            ttmp4_path = p.get('ttmp4_path', '')
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
            p['ttmp4_url'] = ttmp4_url
            return p
        return None

def get_plugin_images(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT * FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        images = []
        for row in result:
            images.append({'id': row[0], 'url': row[2], 'image_path': row[2]})
        return images

def delete_plugin_images(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        conn.commit()

def add_plugin(market_id, name, description, author, version, file_path, tags, created_at, updated_at):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("INSERT INTO plugin (name, description, author, version, download_count, rating, rating_count, status, file_path, created_at, updated_at, tags) VALUES (:name, :desc, :author, :version, 0, 0.0, 0, 'active', :file_path, :created_at, :updated_at, :tags)"),
            {'name': name, 'desc': description, 'author': author, 'version': version, 'file_path': file_path, 'created_at': created_at, 'updated_at': updated_at, 'tags': tags}
        )
        conn.commit()
        result = conn.execute(sql_text("SELECT last_insert_rowid()"))
        return result.fetchone()[0]

def add_plugin_image(market_id, plugin_id, image_path):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("INSERT INTO plugin_image (plugin_id, image_path) VALUES (:plugin_id, :image_path)"),
            {'plugin_id': plugin_id, 'image_path': image_path}
        )
        conn.commit()

def add_plugin_ttmp4(market_id, plugin_id, ttmp4_path):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("UPDATE plugin SET ttmp4_path = :ttmp4_path WHERE id = :plugin_id"),
            {'plugin_id': plugin_id, 'ttmp4_path': ttmp4_path}
        )
        conn.commit()

def update_plugin_download_count(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("UPDATE plugin SET download_count = download_count + 1 WHERE id = :id"),
            {'id': plugin_id}
        )
        conn.commit()

def add_rating(market_id, plugin_id, user_id, score, created_at):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("INSERT INTO rating (plugin_id, user_id, score, created_at) VALUES (:plugin_id, :user_id, :score, :created_at)"),
            {'plugin_id': plugin_id, 'user_id': user_id, 'score': score, 'created_at': created_at}
        )
        conn.execute(
            sql_text("UPDATE plugin SET rating_count = rating_count + 1, rating = (SELECT AVG(score) FROM rating WHERE plugin_id = :id) WHERE id = :id"),
            {'id': plugin_id}
        )
        conn.commit()

def update_rating(market_id, plugin_id, user_id, score):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(
            sql_text("UPDATE rating SET score = :score WHERE plugin_id = :plugin_id AND user_id = :user_id"),
            {'score': score, 'plugin_id': plugin_id, 'user_id': user_id}
        )
        conn.execute(
            sql_text("UPDATE plugin SET rating = (SELECT AVG(score) FROM rating WHERE plugin_id = :id) WHERE id = :id"),
            {'id': plugin_id}
        )
        conn.commit()

def get_user_ratings(market_id, user_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT plugin_id, score FROM rating WHERE user_id = :user_id"), {'user_id': user_id})
        ratings = {}
        for row in result:
            ratings[row[0]] = row[1]
        return ratings

def get_all_plugins(market_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT * FROM plugin"))
        return [_build_plugin(row, market_id) for row in result]

def toggle_plugin_like(market_id, plugin_id, user_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        r = conn.execute(sql_text("SELECT id FROM plugin_like WHERE plugin_id = :pid AND user_id = :uid"),
                         {'pid': plugin_id, 'uid': user_id}).fetchone()
        if r:
            conn.execute(sql_text("DELETE FROM plugin_like WHERE plugin_id = :pid AND user_id = :uid"),
                         {'pid': plugin_id, 'uid': user_id})
            liked = 0
        else:
            conn.execute(sql_text("INSERT INTO plugin_like (plugin_id, user_id, created_at) VALUES (:pid, :uid, :t)"),
                         {'pid': plugin_id, 'uid': user_id, 't': datetime.now().strftime('%Y-%m-%d %H:%M:%S')})
            liked = 1
        cnt = conn.execute(sql_text("SELECT COUNT(*) FROM plugin_like WHERE plugin_id = :pid"), {'pid': plugin_id}).fetchone()[0]
        conn.execute(sql_text("UPDATE plugin SET like_count = :c WHERE id = :pid"), {'c': cnt, 'pid': plugin_id})
        conn.commit()
        return liked, cnt

def add_plugin_coin(market_id, plugin_id, user_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(sql_text("INSERT INTO plugin_coin (plugin_id, user_id, created_at) VALUES (:pid, :uid, :t)"),
                     {'pid': plugin_id, 'uid': user_id, 't': datetime.now().strftime('%Y-%m-%d %H:%M:%S')})
        cnt = conn.execute(sql_text("SELECT COUNT(*) FROM plugin_coin WHERE plugin_id = :pid"), {'pid': plugin_id}).fetchone()[0]
        conn.execute(sql_text("UPDATE plugin SET coin_count = :c WHERE id = :pid"), {'c': cnt, 'pid': plugin_id})
        conn.commit()
        return cnt

def get_user_plugin_like(market_id, plugin_id, user_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        r = conn.execute(sql_text("SELECT id FROM plugin_like WHERE plugin_id = :pid AND user_id = :uid"),
                         {'pid': plugin_id, 'uid': user_id}).fetchone()
        return bool(r)

def increment_plugin_view(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(sql_text("UPDATE plugin SET view_count = view_count + 1 WHERE id = :pid"), {'pid': plugin_id})
        conn.commit()

def toggle_plugin_status(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        result = conn.execute(sql_text("SELECT status FROM plugin WHERE id = :id"), {'id': plugin_id})
        row = result.fetchone()
        if row:
            new_status = 'inactive' if row[0] == 'active' else 'active'
            conn.execute(sql_text("UPDATE plugin SET status = :status WHERE id = :id"), {'status': new_status, 'id': plugin_id})
            conn.commit()
            return new_status
        return None

def update_plugin_info(market_id, plugin_id, name, description, version, tags, file_path=None):
    engine, sql_text = get_market_db_engine(market_id)
    from datetime import datetime
    updated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with engine.connect() as conn:
        if file_path:
            conn.execute(
                sql_text("UPDATE plugin SET name = :name, description = :desc, version = :version, tags = :tags, file_path = :file_path, updated_at = :updated_at WHERE id = :id"),
                {'name': name, 'desc': description, 'version': version, 'tags': tags, 'file_path': file_path, 'updated_at': updated_at, 'id': plugin_id}
            )
        else:
            conn.execute(
                sql_text("UPDATE plugin SET name = :name, description = :desc, version = :version, tags = :tags, updated_at = :updated_at WHERE id = :id"),
                {'name': name, 'desc': description, 'version': version, 'tags': tags, 'updated_at': updated_at, 'id': plugin_id}
            )
        conn.commit()

def delete_plugin(market_id, plugin_id):
    engine, sql_text = get_market_db_engine(market_id)
    with engine.connect() as conn:
        conn.execute(sql_text("DELETE FROM plugin_image WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(sql_text("DELETE FROM rating WHERE plugin_id = :id"), {'id': plugin_id})
        conn.execute(sql_text("DELETE FROM plugin WHERE id = :id"), {'id': plugin_id})
        conn.commit()

def init_market_database(market_id):
    db_path = get_market_db_path(market_id)
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'timeout': 30, 'check_same_thread': False},
        pool_pre_ping=True,
        pool_recycle=3600
    )
    
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
        ttmp4_path VARCHAR(500) DEFAULT '',
        like_count INTEGER DEFAULT 0,
        coin_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        cover_url VARCHAR(500) DEFAULT ''
    )
    """)
    
    image_table = text("""
    CREATE TABLE IF NOT EXISTS plugin_image (
        id INTEGER PRIMARY KEY,
        plugin_id INTEGER NOT NULL,
        image_path VARCHAR(500) NOT NULL
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

    like_table = text("""
    CREATE TABLE IF NOT EXISTS plugin_like (
        id INTEGER PRIMARY KEY,
        plugin_id INTEGER NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        created_at VARCHAR(20) DEFAULT '2024-01-01'
    )
    """)

    coin_table = text("""
    CREATE TABLE IF NOT EXISTS plugin_coin (
        id INTEGER PRIMARY KEY,
        plugin_id INTEGER NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        created_at VARCHAR(20) DEFAULT '2024-01-01'
    )
    """)
    
    with engine.connect() as conn:
        conn.execute(plugin_table)
        conn.execute(image_table)
        conn.execute(rating_table)
        conn.execute(like_table)
        conn.execute(coin_table)
        conn.commit()

def init_player_database():
    userdata_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
    os.makedirs(userdata_dir, exist_ok=True)
    db_path = os.path.join(userdata_dir, 'players.db')
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'timeout': 30, 'check_same_thread': False},
        pool_pre_ping=True,
        pool_recycle=3600
    )
    
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
    return create_engine(
        f'sqlite:///{db_path}',
        connect_args={'timeout': 30, 'check_same_thread': False},
        pool_pre_ping=True,
        pool_recycle=3600
    )

def init_auth_callback_database():
    userdata_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
    os.makedirs(userdata_dir, exist_ok=True)
    db_path = os.path.join(userdata_dir, 'auth_callback.db')
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'timeout': 30, 'check_same_thread': False},
        pool_pre_ping=True,
        pool_recycle=3600
    )
    
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