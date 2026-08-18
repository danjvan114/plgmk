from flask import request, redirect, url_for, session, send_from_directory, jsonify
from .config import app, db, User
from .utils import render_root_template
import os
import re
import sqlite3
import hashlib
from datetime import datetime

try:
    import markdown as _md
except ImportError:
    _md = None

# 作品池独立 lib：作品文件无需上传，发布时仅记录第三方直链。
# 每个作品对应一个数据库文件（localcdn/shequ/bcmkn/标题md5.db），记录：
# 文件直链 + 点赞/收藏/评论数量 + 评论区内容 + 点赞/收藏的人列表 + 标题 + 作者 + 简介
# main.db 统一登记每个作品的 db，用于列表/搜索加载。

# 作品文件存储目录
WORKPOOL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'shequ', 'bcmkn')
# 主数据库路径
MAIN_DB_PATH = os.path.join(WORKPOOL_DIR, 'main.db')
# 论坛数据库路径
FORUM_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'shequ', 'forum.db')


def get_forum_db():
    os.makedirs(os.path.dirname(FORUM_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(FORUM_DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def init_forum_db():
    """初始化论坛数据库：分区 + 帖子 + 跟帖（评论同逻辑：置顶/删除/举报/二级回复）"""
    conn = get_forum_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '',
        sort INTEGER DEFAULT 0,
        admin_only INTEGER DEFAULT 0
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forum_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        is_pinned INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT 0,
        user_id VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        is_pinned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS post_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type VARCHAR(10) NOT NULL,
        target_id INTEGER NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    try:
        cursor.execute("ALTER TABLE forums ADD COLUMN admin_only INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    cursor.execute("SELECT COUNT(*) FROM forums")
    if cursor.fetchone()[0] == 0:
        default_forums = [('公告区', '官方公告与站务通知', 0),
                          ('综合讨论', '闲聊与日常', 1),
                          ('作品展示', '展示你的作品，获得反馈', 2),
                          ('技术交流', '编程、教程与求助', 3)]
        cursor.executemany("INSERT INTO forums (name, description, sort) VALUES (?, ?, ?)", default_forums)
    conn.commit()
    conn.close()


def send_message(to_user, msg_type, content, from_user='', work_id=0):
    """写入站内消息"""
    conn = None
    try:
        conn = get_main_db()
        conn.execute(
            "INSERT INTO messages (to_user, from_user, msg_type, content, work_id) VALUES (?, ?, ?, ?, ?)",
            (to_user, msg_type, from_user, content, work_id))
        conn.commit()
    except Exception as e:
        import logging
        logging.error(f"Failed to send message: {e}")
    finally:
        if conn:
            conn.close()


def is_admin_user(username):
    try:
        user = User.query.get(username)
        return bool(user and user.role == 'admin')
    except Exception:
        return False


def get_main_db():
    """获取主数据库连接"""
    os.makedirs(WORKPOOL_DIR, exist_ok=True)
    conn = sqlite3.connect(MAIN_DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def safe_db_operation(func):
    """数据库操作安全装饰器，自动处理连接关闭"""
    def wrapper(*args, **kwargs):
        conn = None
        try:
            conn = get_main_db()
            result = func(conn, *args, **kwargs)
            return result
        except Exception as e:
            import logging
            logging.error(f"Database operation failed in {func.__name__}: {e}")
            return None
        finally:
            if conn:
                conn.close()
    return wrapper


def migrate_main_db(conn):
    """为旧版 main.db 补充新字段/新表"""
    cursor = conn.cursor()
    cols = {r[1] for r in cursor.execute("PRAGMA table_info(works)").fetchall()}
    if 'coin_count' not in cols:
        cursor.execute("ALTER TABLE works ADD COLUMN coin_count INTEGER DEFAULT 0")
    if 'view_count' not in cols:
        cursor.execute("ALTER TABLE works ADD COLUMN view_count INTEGER DEFAULT 0")
    if 'is_hidden' not in cols:
        cursor.execute("ALTER TABLE works ADD COLUMN is_hidden INTEGER DEFAULT 0")
    if 'signature' not in cols:
        cursor.execute("ALTER TABLE works ADD COLUMN signature VARCHAR(200) DEFAULT ''")
    if 'file_type' not in cols:
        cursor.execute("ALTER TABLE works ADD COLUMN file_type VARCHAR(20) DEFAULT 'player'")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        follow_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, follow_user)
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_id INTEGER NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_user VARCHAR(100) NOT NULL,
        from_user VARCHAR(100) DEFAULT '',
        msg_type VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        work_id INTEGER DEFAULT 0,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wall_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) NOT NULL,
        from_user VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()


def migrate_work_db(conn):
    """为作品 db 补充新字段/新表(评论置顶/删除/回复、投币)"""
    cursor = conn.cursor()
    try:
        cols = {r[1] for r in cursor.execute("PRAGMA table_info(comments)").fetchall()}
        if 'parent_id' not in cols:
            cursor.execute("ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT 0")
        if 'is_pinned' not in cols:
            cursor.execute("ALTER TABLE comments ADD COLUMN is_pinned INTEGER DEFAULT 0")
        if 'is_deleted' not in cols:
            cursor.execute("ALTER TABLE comments ADD COLUMN is_deleted INTEGER DEFAULT 0")
        if 'target_work' not in cols:
            cursor.execute("ALTER TABLE comments ADD COLUMN target_work INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        cols = {r[1] for r in cursor.execute("PRAGMA table_info(work_info)").fetchall()}
        if 'coin_count' not in cols:
            cursor.execute("ALTER TABLE work_info ADD COLUMN coin_count INTEGER DEFAULT 0")
        if 'file_type' not in cols:
            cursor.execute("ALTER TABLE work_info ADD COLUMN file_type VARCHAR(20) DEFAULT 'player'")
    except Exception:
        pass
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()


def init_main_db():
    """初始化主数据库（登记每个作品对应的 db）"""
    conn = get_main_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        db_path VARCHAR(500) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_id VARCHAR(100),
        description TEXT,
        thumbnail VARCHAR(500),
        tags VARCHAR(500),
        like_count INTEGER DEFAULT 0,
        fav_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        coin_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        signature VARCHAR(200) DEFAULT '',
        file_type VARCHAR(20) DEFAULT 'player',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        follow_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, follow_user)
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_id INTEGER NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_user VARCHAR(100) NOT NULL,
        from_user VARCHAR(100) DEFAULT '',
        msg_type VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        work_id INTEGER DEFAULT 0,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wall_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) NOT NULL,
        from_user VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()


def get_work_db(db_path):
    """获取作品数据库连接"""
    full_path = os.path.join(WORKPOOL_DIR, db_path)
    if not os.path.exists(full_path):
        return None
    conn = sqlite3.connect(full_path, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def init_work_db(db_path):
    """初始化作品数据库（每个作品一个 db）"""
    full_path = os.path.join(WORKPOOL_DIR, db_path)
    conn = sqlite3.connect(full_path, timeout=30)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS work_info (
        id INTEGER PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_id VARCHAR(100),
        description TEXT,
        file_url VARCHAR(500),
        thumbnail VARCHAR(500),
        tags VARCHAR(500),
        like_count INTEGER DEFAULT 0,
        fav_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        coin_count INTEGER DEFAULT 0,
        file_type VARCHAR(20) DEFAULT 'player',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()


def sanitize_work_text(text):
    """清理作品文本字段，防止 XSS"""
    if not text:
        return text
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'javascript\s*:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bon\w+\s*=', '', text, flags=re.IGNORECASE)
    return text.strip()


def sanitize_md_html(raw_html):
    """论坛 markdown 渲染后的 HTML 消毒：去 script/iframe 与事件属性"""
    if not raw_html:
        return ''
    raw_html = re.sub(r'<\s*script[^>]*>.*?<\s*/\s*script\s*>', '', raw_html, flags=re.IGNORECASE | re.DOTALL)
    raw_html = re.sub(r'<\s*iframe[^>]*>.*?<\s*/\s*iframe\s*>', '', raw_html, flags=re.IGNORECASE | re.DOTALL)
    raw_html = re.sub(r'<\s*script[^>]*/?\s*>', '', raw_html, flags=re.IGNORECASE)
    raw_html = re.sub(r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', '', raw_html, flags=re.IGNORECASE)
    raw_html = re.sub(r'javascript\s*:', '', raw_html, flags=re.IGNORECASE)
    return raw_html


def render_markdown_safe(text):
    """markdown -> 消毒 HTML（无依赖时退化为纯文本转义）"""
    text = (text or '').strip()
    if not text:
        return ''
    if _md is not None:
        return sanitize_md_html(_md.markdown(text, extensions=['fenced_code']))
    return sanitize_work_text(text).replace('\n', '<br>')


def register_workpool_routes():
    init_main_db()
    init_forum_db()
    conn = None
    try:
        conn = get_main_db()
        migrate_main_db(conn)
    except Exception:
        pass
    finally:
        if conn:
            conn.close()
    try:
        for f in os.listdir(WORKPOOL_DIR):
            if f.endswith('.db') and f != 'main.db':
                wc = get_work_db(f)
                if wc:
                    try:
                        migrate_work_db(wc)
                    finally:
                        wc.close()
    except Exception:
        pass

    @app.route('/workpool')
    def workpool_index():
        """作品池首页：搜索 + 排序(最新/最热/最多赞/最多藏/最多币) + 标签筛选"""
        search_query = request.args.get('search', '')
        sort = request.args.get('sort', 'new')
        tag = request.args.get('tag', '')
        page = int(request.args.get('page', 1))
        per_page = 20
        offset = (page - 1) * per_page

        order_map = {
            'hot': 'like_count DESC',
            'like': 'like_count DESC',
            'fav': 'fav_count DESC',
            'coin': 'coin_count DESC',
            'comment': 'comment_count DESC',
        }
        order_sql = order_map.get(sort, 'created_at DESC')

        conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()

            where_sql = "status = 'active' AND is_hidden = 0"
            params = []
            if search_query:
                where_sql += " AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)"
                params += [f'%{search_query}%'] * 4
            if tag:
                where_sql += " AND (tags LIKE ? OR title LIKE ?)"
                params += [f'%{tag}%', f'%{tag}%']

            cursor.execute(f"SELECT * FROM works WHERE {where_sql} ORDER BY {order_sql} LIMIT ? OFFSET ?", params + [per_page, offset])
            works = [dict(row) for row in cursor.fetchall()]

            cursor.execute(f"SELECT COUNT(*) FROM works WHERE {where_sql}", params)
            total = cursor.fetchone()[0]
            total_pages = (total + per_page - 1) // per_page

            cursor.execute("SELECT DISTINCT tags FROM works WHERE status='active' AND is_hidden = 0 AND tags != '' ORDER BY id DESC LIMIT 30")
            all_tags = []
            for row in cursor.fetchall():
                for t in (row[0] or '').split(','):
                    t = t.strip()
                    if t and t not in all_tags:
                        all_tags.append(t)

            return render_root_template('workpool/index.html',
                                        works=works,
                                        search_query=search_query,
                                        sort=sort,
                                        tag=tag,
                                        all_tags=all_tags[:15],
                                        page=page,
                                        total_pages=total_pages,
                                        total=total)
        finally:
            if conn:
                conn.close()

    @app.route('/workpool/<int:work_id>')
    def workpool_detail(work_id):
        """作品详情"""
        conn = None
        work_conn = None
        fconn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()
            if work:
                cursor.execute("UPDATE works SET view_count = view_count + 1 WHERE id = ?", (work_id,))
                conn.commit()

            if not work:
                return render_root_template('404.html'), 404

            work = dict(work)

            user_follows_author = False
            # 获取作品数据库中的详细信息
            work_conn = get_work_db(work['db_path'])
            if work_conn:
                w_cursor = work_conn.cursor()
                w_cursor.execute("SELECT * FROM work_info WHERE id = 1")
                work_info = w_cursor.fetchone()
                if work_info:
                    work['file_url'] = work_info['file_url']
                    work['like_count'] = work_info['like_count']
                    work['fav_count'] = work_info['fav_count']
                    work['comment_count'] = work_info['comment_count']
                    work['file_type'] = work_info['file_type'] if 'file_type' in work_info.keys() else 'player'
                    work['coin_count'] = work_info['coin_count'] if 'coin_count' in work_info.keys() else 0

                # 获取评论（置顶在前，分页加载），仅加载当前页主评论的二级回复
                c_page = max(int(request.args.get('page', 1)), 1)
                c_per_page = 20
                c_offset = (c_page - 1) * c_per_page
                c_total = w_cursor.execute("SELECT COUNT(*) FROM comments WHERE parent_id = 0 AND is_deleted = 0").fetchone()[0]
                w_cursor.execute(
                    "SELECT * FROM comments WHERE parent_id = 0 AND is_deleted = 0 ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?",
                    (c_per_page, c_offset))
                comments = [dict(row) for row in w_cursor.fetchall()]
                comment_rows = []
                if comments:
                    ids = ",".join("?" for _ in comments)
                    w_cursor.execute(
                        f"SELECT * FROM comments WHERE parent_id IN ({ids}) AND is_deleted = 0 ORDER BY created_at ASC",
                        [c['id'] for c in comments])
                    comment_rows = [dict(row) for row in w_cursor.fetchall()]
                replies_map = {}
                for c in comment_rows:
                    replies_map.setdefault(c.get('parent_id'), []).append(c)

                # 检查用户是否已点赞/收藏/投币/关注作者
                user_liked = False
                user_faved = False
                user_coined = False
                if 'user' in session:
                    user_id = session['user']
                    w_cursor.execute("SELECT id FROM likes WHERE user_id = ?", (user_id,))
                    user_liked = w_cursor.fetchone() is not None
                    w_cursor.execute("SELECT id FROM favorites WHERE user_id = ?", (user_id,))
                    user_faved = w_cursor.fetchone() is not None
                    w_cursor.execute("SELECT id FROM coins WHERE user_id = ?", (user_id,))
                    user_coined = w_cursor.fetchone() is not None
            else:
                comments = []
                replies_map = {}
                user_liked = False
                user_faved = False
                user_coined = False
                c_page = 1
                c_per_page = 20
                c_total = 0

            if 'user' in session and session['user'] != work['author']:
                fconn = get_main_db()
                row = fconn.execute("SELECT id FROM follows WHERE user_id = ? AND follow_user = ?",
                                    (session['user'], work['author'])).fetchone()
                user_follows_author = row is not None

            return render_root_template('workpool/detail.html',
                                        work=work,
                                        comments=comments,
                                        replies_map=replies_map,
                                        user_liked=user_liked,
                                        user_faved=user_faved,
                                        user_coined=user_coined,
                                        user_follows_author=user_follows_author,
                                        c_page=c_page,
                                        c_per_page=c_per_page,
                                        total_comments=c_total,
                                        total_comment_pages=(c_total + c_per_page - 1) // c_per_page or 1)
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()
            if fconn:
                fconn.close()

    @app.route('/workpool/like/<int:work_id>', methods=['POST'])
    def workpool_like(work_id):
        """点赞作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT db_path, author, title FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()

            if not work:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            user_id = session['user']
            work_author = work['author'] or ''
            work_title = work['title'] or ''
            work_conn = get_work_db(work['db_path'])

            if work_conn:
                w_cursor = work_conn.cursor()
                # 检查是否已点赞
                w_cursor.execute("SELECT id FROM likes WHERE user_id = ?", (user_id,))
                existing = w_cursor.fetchone()

                if existing:
                    # 取消点赞
                    w_cursor.execute("DELETE FROM likes WHERE id = ?", (existing['id'],))
                    w_cursor.execute("UPDATE work_info SET like_count = like_count - 1 WHERE id = 1")
                    action = 'unliked'
                else:
                    # 点赞
                    w_cursor.execute("INSERT INTO likes (user_id) VALUES (?)", (user_id,))
                    w_cursor.execute("UPDATE work_info SET like_count = like_count + 1 WHERE id = 1")
                    action = 'liked'
                    if user_id != work_author:
                        send_message(work_author, 'like', f'用户 {user_id} 点赞了你的作品《{work_title}》', user_id, work_id)

                w_cursor.execute("SELECT like_count FROM work_info WHERE id = 1")
                like_count = w_cursor.fetchone()['like_count']
                work_conn.commit()

                # 更新主数据库
                cursor.execute("UPDATE works SET like_count = ? WHERE id = ?", (like_count, work_id))
                conn.commit()

                return jsonify({'success': True, 'action': action, 'like_count': like_count})

            return jsonify({'success': False, 'message': '作品数据库不存在'}), 404
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/fav/<int:work_id>', methods=['POST'])
    def workpool_fav(work_id):
        """收藏作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT db_path, author, title FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()

            if not work:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            user_id = session['user']
            work_author = work['author'] or ''
            work_title = work['title'] or ''
            work_conn = get_work_db(work['db_path'])

            if work_conn:
                w_cursor = work_conn.cursor()
                w_cursor.execute("SELECT id FROM favorites WHERE user_id = ?", (user_id,))
                existing = w_cursor.fetchone()

                if existing:
                    w_cursor.execute("DELETE FROM favorites WHERE id = ?", (existing['id'],))
                    w_cursor.execute("UPDATE work_info SET fav_count = fav_count - 1 WHERE id = 1")
                    action = 'unfaved'
                else:
                    w_cursor.execute("INSERT INTO favorites (user_id) VALUES (?)", (user_id,))
                    w_cursor.execute("UPDATE work_info SET fav_count = fav_count + 1 WHERE id = 1")
                    action = 'faved'
                    if user_id != work_author:
                        send_message(work_author, 'fav', f'用户 {user_id} 收藏了你的作品《{work_title}》', user_id, work_id)

                w_cursor.execute("SELECT fav_count FROM work_info WHERE id = 1")
                fav_count = w_cursor.fetchone()['fav_count']
                work_conn.commit()

                cursor.execute("UPDATE works SET fav_count = ? WHERE id = ?", (fav_count, work_id))
                conn.commit()

                return jsonify({'success': True, 'action': action, 'fav_count': fav_count})

            return jsonify({'success': False, 'message': '作品数据库不存在'}), 404
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/comment/<int:work_id>', methods=['POST'])
    def workpool_comment(work_id):
        """评论作品（支持 parent_id 二级回复）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        data = request.get_json() or {}
        content = sanitize_work_text(data.get('content', ''))
        parent_id = int(data.get('parent_id') or 0)

        if not content:
            return jsonify({'success': False, 'message': '评论内容不能为空'}), 400

        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT db_path, author, title FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()

            if not work:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            user_id = session['user']
            work_conn = get_work_db(work['db_path'])

            if work_conn:
                w_cursor = work_conn.cursor()
                if parent_id:
                    w_cursor.execute("SELECT user_id FROM comments WHERE id = ?", (parent_id,))
                    target = w_cursor.fetchone()
                    if not target:
                        return jsonify({'success': False, 'message': '回复的评论不存在'}), 404
                    root_parent = parent_id
                else:
                    target = None
                    root_parent = 0
                w_cursor.execute("INSERT INTO comments (user_id, username, content, parent_id) VALUES (?, ?, ?, ?)",
                               (user_id, user_id, content, root_parent))
                w_cursor.execute("UPDATE work_info SET comment_count = comment_count + 1 WHERE id = 1")
                w_cursor.execute("SELECT comment_count FROM work_info WHERE id = 1")
                comment_count = w_cursor.fetchone()['comment_count']
                w_cursor.execute("SELECT last_insert_rowid() AS cid")
                comment_id = w_cursor.fetchone()['cid']
                work_conn.commit()

                cursor.execute("UPDATE works SET comment_count = ? WHERE id = ?", (comment_count, work_id))
                conn.commit()

                if parent_id and target and target['user_id'] != user_id and target['user_id'] != work['author']:
                    send_message(target['user_id'], 'reply', f'用户 {user_id} 回复了你在《{work["title"]}》的评论', user_id, work_id)
                elif not parent_id and work['author'] != user_id:
                    send_message(work['author'], 'comment', f'用户 {user_id} 评论了你的作品《{work["title"]}》', user_id, work_id)

                return jsonify({'success': True, 'comment_count': comment_count, 'comment_id': comment_id})

            return jsonify({'success': False, 'message': '作品数据库不存在'}), 404
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/my')
    def workpool_my():
        """我的作品"""
        if 'user' not in session:
            return redirect('/login')

        conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM works WHERE author_id = ? OR author = ? ORDER BY created_at DESC",
                          (session['user'], session['user']))
            works = [dict(row) for row in cursor.fetchall()]

            return render_root_template('workpool/my.html', works=works)
        finally:
            if conn:
                conn.close()

    @app.route('/workpool/publish', methods=['GET'])
    def workpool_publish_page():
        """发布作品页面（第三方服务通过 ?f=文件直链 调用，无需入口）"""
        if 'user' not in session:
            return redirect('/login')

        file_url = request.args.get('f', '')
        if not file_url:
            return render_root_template('404.html'), 404

        return render_root_template('workpool/publish.html', file_url=file_url)

    @app.route('/workpool/publish', methods=['POST'])
    def workpool_publish():
        """发布作品（API）：仅记录第三方直链，不接收文件上传"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        data = request.get_json()
        title = sanitize_work_text(data.get('title', ''))
        description = sanitize_work_text(data.get('description', ''))
        tags = sanitize_work_text(data.get('tags', ''))
        thumbnail = sanitize_work_text(data.get('thumbnail', ''))
        file_url = sanitize_work_text(data.get('file_url', ''))
        file_type = (data.get('file_type') or 'player').strip().lower()
        if file_type not in ('player', 'img', 'html', 'redirect'):
            file_type = 'player'

        if not title:
            return jsonify({'success': False, 'message': '作品标题不能为空'}), 400
        if not file_url:
            return jsonify({'success': False, 'message': '作品文件链接不能为空'}), 400

        db_filename = hashlib.md5(title.encode('utf-8')).hexdigest() + '.db'
        db_path = db_filename

        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM works WHERE db_path = ?", (db_path,))
            if cursor.fetchone():
                return jsonify({'success': False, 'message': '该作品已发布，请勿重复发布'}), 409

            full_db_path = os.path.join(WORKPOOL_DIR, db_path)
            if os.path.exists(full_db_path):
                orphan_has_data = False
                orphan_conn = None
                try:
                    orphan_conn = sqlite3.connect(full_db_path, timeout=30)
                    orphan_row = orphan_conn.execute("SELECT id FROM work_info WHERE id = 1").fetchone()
                    orphan_has_data = orphan_row is not None
                except Exception:
                    orphan_has_data = False
                finally:
                    if orphan_conn is not None:
                        try:
                            orphan_conn.close()
                        except Exception:
                            pass
                if orphan_has_data:
                    return jsonify({'success': False, 'message': '该作品已发布，请勿重复发布'}), 409
                os.remove(full_db_path)

            init_work_db(db_path)

            work_conn = get_work_db(db_path)
            if work_conn:
                w_cursor = work_conn.cursor()
                w_cursor.execute("""
                    INSERT INTO work_info (id, title, author, author_id, description, file_url, thumbnail, tags, file_type)
                    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (title, session['user'], session['user'], description, file_url, thumbnail, tags, file_type))
                work_conn.commit()

            cursor.execute("""
                INSERT INTO works (db_path, title, author, author_id, description, thumbnail, tags, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (db_path, title, session['user'], session['user'], description, thumbnail, tags, file_type))
            conn.commit()
            work_id = cursor.lastrowid

            return jsonify({'success': True, 'message': '作品发布成功', 'work_id': work_id})
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/delete/<int:work_id>', methods=['POST'])
    def workpool_delete(work_id):
        """擦除作品（仅作者或管理员）：删除索引 + db 文件，第三方网盘文件不动"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT author_id, author, db_path FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()

            if not work:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            author_id = work['author_id'] or work['author']
            db_path = work['db_path']

            is_admin = User.query.filter_by(username=session['user'], role='admin').first()
            if author_id != session['user'] and not is_admin:
                return jsonify({'success': False, 'message': '无权删除此作品'}), 403

            full_db_path = os.path.join(WORKPOOL_DIR, db_path)
            if os.path.exists(full_db_path):
                os.remove(full_db_path)

            cursor.execute("DELETE FROM works WHERE id = ?", (work_id,))
            conn.commit()

            return jsonify({'success': True, 'message': '作品已擦除'})
        finally:
            if conn:
                conn.close()

    # ---------- 关注用户 ----------
    @app.route('/workpool/follow/<username>', methods=['POST'])
    def workpool_follow(username):
        """关注/取消关注用户"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        username = sanitize_work_text(username)
        if not username or username == session['user']:
            return jsonify({'success': False, 'message': '不能关注自己'}), 400
        if not User.query.get(username):
            return jsonify({'success': False, 'message': '用户不存在'}), 404

        conn = None
        try:
            conn = get_main_db()
            row = conn.execute("SELECT id FROM follows WHERE user_id = ? AND follow_user = ?",
                               (session['user'], username)).fetchone()
            if row:
                conn.execute("DELETE FROM follows WHERE id = ?", (row['id'],))
                action = 'unfollowed'
            else:
                conn.execute("INSERT INTO follows (user_id, follow_user) VALUES (?, ?)", (session['user'], username))
                action = 'followed'
                send_message(username, 'follow', f'用户 {session["user"]} 关注了你', session['user'])
            conn.commit()
            return jsonify({'success': True, 'action': action})
        finally:
            if conn:
                conn.close()

    # ---------- 投币（土特产） ----------
    @app.route('/workpool/coin/<int:work_id>', methods=['POST'])
    def workpool_coin(work_id):
        """投币：每人每作品限投 1 个，不可撤回"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT db_path, author, title FROM works WHERE id = ?", (work_id,))
            work = cursor.fetchone()

            if not work:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            user_id = session['user']
            work_conn = get_work_db(work['db_path'])
            if not work_conn:
                return jsonify({'success': False, 'message': '作品数据库不存在'}), 404

            w_cursor = work_conn.cursor()
            w_cursor.execute("SELECT id FROM coins WHERE user_id = ?", (user_id,))
            if w_cursor.fetchone():
                return jsonify({'success': False, 'message': '你已经投过币了'}), 400

            w_cursor.execute("INSERT INTO coins (user_id) VALUES (?)", (user_id,))
            w_cursor.execute("UPDATE work_info SET coin_count = coin_count + 1 WHERE id = 1")
            w_cursor.execute("SELECT coin_count FROM work_info WHERE id = 1")
            coin_count = w_cursor.fetchone()['coin_count']
            work_conn.commit()

            conn.execute("UPDATE works SET coin_count = ? WHERE id = ?", (coin_count, work_id))
            conn.commit()

            if user_id != work['author']:
                send_message(work['author'], 'coin', f'用户 {user_id} 给你的作品《{work["title"]}》投了 1 个土特产！', user_id, work_id)

            return jsonify({'success': True, 'coin_count': coin_count})
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    # ---------- 作品举报 ----------
    @app.route('/workpool/report/<int:work_id>', methods=['POST'])
    def workpool_report(work_id):
        """举报作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        data = request.get_json() or {}
        reason = sanitize_work_text(data.get('reason', '')) or '无理由'
        conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM works WHERE id = ?", (work_id,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'message': '作品不存在'}), 404
            cursor.execute("INSERT INTO reports (work_id, user_id, reason) VALUES (?, ?, ?)",
                           (work_id, session['user'], reason))
            conn.commit()
            return jsonify({'success': True, 'message': '举报已提交，管理员会尽快处理'})
        finally:
            if conn:
                conn.close()

    # ---------- 作品随机抽查（审核） ----------
    @app.route('/workpool/review', methods=['GET'])
    def workpool_review_page():
        """审核工作台：列出 pending 举报与随机抽查作品（仅管理员）"""
        if not is_admin_user(session.get('user', '')):
            return redirect('/login')
        conn = None
        try:
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50")
            reports = [dict(row) for row in cursor.fetchall()]
            cursor.execute("""SELECT * FROM works ORDER BY RANDOM() LIMIT 10""")
            samples = [dict(row) for row in cursor.fetchall()]
            cursor.execute("SELECT COUNT(*) AS c FROM works")
            total_works = cursor.fetchone()['c']
            return render_root_template('workpool/review.html', reports=reports, samples=samples, total_works=total_works)
        finally:
            if conn:
                conn.close()

    @app.route('/workpool/review/hide/<int:work_id>', methods=['POST'])
    def workpool_review_hide(work_id):
        """隐藏违规作品（仅管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = None
        try:
            conn = get_main_db()
            conn.execute("UPDATE works SET is_hidden = 1, status = 'hidden' WHERE id = ?", (work_id,))
            conn.commit()
            conn.execute("UPDATE reports SET status = 'resolved' WHERE work_id = ? AND status = 'pending'", (work_id,))
            conn.commit()
            return jsonify({'success': True, 'message': '作品已隐藏'})
        finally:
            if conn:
                conn.close()

    @app.route('/workpool/review/show/<int:work_id>', methods=['POST'])
    def workpool_review_show(work_id):
        """恢复隐藏作品（仅管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = None
        try:
            conn = get_main_db()
            conn.execute("UPDATE works SET is_hidden = 0, status = 'active' WHERE id = ?", (work_id,))
            conn.commit()
            return jsonify({'success': True, 'message': '作品已恢复'})
        finally:
            if conn:
                conn.close()

    # ---------- 评论管理 ----------
    @app.route('/workpool/comment/delete/<int:work_id>/<int:comment_id>', methods=['POST'])
    def workpool_comment_delete(work_id, comment_id):
        """删除评论（本人 / 作者 / 管理员）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            row = conn.execute("SELECT db_path, author FROM works WHERE id = ?", (work_id,)).fetchone()
            if not row:
                return jsonify({'success': False, 'message': '作品不存在'}), 404

            work_conn = get_work_db(row['db_path'])
            if not work_conn:
                return jsonify({'success': False, 'message': '作品数据库不存在'}), 404
            c = work_conn.execute("SELECT user_id FROM comments WHERE id = ?", (comment_id,)).fetchone()
            if not c:
                return jsonify({'success': False, 'message': '评论不存在'}), 404

            allowed = (c['user_id'] == session['user'] or row['author'] == session['user']
                       or is_admin_user(session['user']))
            if not allowed:
                return jsonify({'success': False, 'message': '无权删除此评论'}), 403

            work_conn.execute("UPDATE comments SET is_deleted = 1 WHERE id = ?", (comment_id,))
            work_conn.execute("UPDATE work_info SET comment_count = comment_count - 1 WHERE id = 1")
            work_conn.commit()
            return jsonify({'success': True, 'message': '评论已删除'})
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/comment/pin/<int:work_id>/<int:comment_id>', methods=['POST'])
    def workpool_comment_pin(work_id, comment_id):
        """置顶/取消置顶评论（作品作者 / 管理员）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            row = conn.execute("SELECT db_path, author FROM works WHERE id = ?", (work_id,)).fetchone()
            if not row:
                return jsonify({'success': False, 'message': '作品不存在'}), 404
            if row['author'] != session['user'] and not is_admin_user(session['user']):
                return jsonify({'success': False, 'message': '无权操作'}), 403

            work_conn = get_work_db(row['db_path'])
            if not work_conn:
                return jsonify({'success': False, 'message': '作品数据库不存在'}), 404
            c = work_conn.execute("SELECT is_pinned FROM comments WHERE id = ?", (comment_id,)).fetchone()
            if not c:
                return jsonify({'success': False, 'message': '评论不存在'}), 404
            new_pin = 0 if c['is_pinned'] else 1
            work_conn.execute("UPDATE comments SET is_pinned = ? WHERE id = ?", (new_pin, comment_id))
            work_conn.commit()
            return jsonify({'success': True, 'is_pinned': new_pin})
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    @app.route('/workpool/comment/report/<int:work_id>/<int:comment_id>', methods=['POST'])
    def workpool_comment_report(work_id, comment_id):
        """举报评论"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        data = request.get_json() or {}
        reason = sanitize_work_text(data.get('reason', '')) or '无理由'
        conn = None
        try:
            conn = get_main_db()
            conn.execute("INSERT INTO reports (work_id, user_id, reason) VALUES (?, ?, ?)",
                         (work_id, session['user'], f'[评论#{comment_id}] ' + reason))
            conn.commit()
            return jsonify({'success': True, 'message': '举报已提交'})
        finally:
            if conn:
                conn.close()

    # ---------- 作品更新通道 ----------
    @app.route('/workpool/update/<int:work_id>', methods=['POST'])
    def workpool_update(work_id):
        """更新作品：替换文件直链/简介/标签/缩略图，不改变作品 ID 与数据"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        work_conn = None
        try:
            conn = get_main_db()
            row = conn.execute("SELECT db_path, author, author_id FROM works WHERE id = ?", (work_id,)).fetchone()
            if not row:
                return jsonify({'success': False, 'message': '作品不存在'}), 404
            if row['author'] != session['user'] and row['author_id'] != session['user'] and not is_admin_user(session['user']):
                return jsonify({'success': False, 'message': '无权更新此作品'}), 403

            data = request.get_json() or {}
            work_conn = get_work_db(row['db_path'])
            if not work_conn:
                return jsonify({'success': False, 'message': '作品数据库不存在'}), 404

            fields = []
            params = []
            if data.get('file_url'):
                fields.append('file_url = ?')
                params.append(sanitize_work_text(data['file_url']))
            if data.get('description') is not None:
                fields.append('description = ?')
                params.append(sanitize_work_text(data['description']))
            if data.get('tags') is not None:
                fields.append('tags = ?')
                params.append(sanitize_work_text(data['tags']))
            if data.get('thumbnail') is not None:
                fields.append('thumbnail = ?')
                params.append(sanitize_work_text(data['thumbnail']))
            if data.get('file_type'):
                ft = (data['file_type'] or 'player').strip().lower()
                if ft in ('player', 'img', 'html', 'redirect'):
                    fields.append('file_type = ?')
                    params.append(ft)
            if fields:
                params.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                work_conn.execute(f"UPDATE work_info SET {', '.join(fields)}, updated_at = ? WHERE id = 1", params)
                work_conn.commit()
            return jsonify({'success': True, 'message': '作品已更新'})
        finally:
            if conn:
                conn.close()
            if work_conn:
                work_conn.close()

    # ---------- 站内消息中心 ----------
    @app.route('/messages')
    def messages_page():
        """消息中心：通知 / 公告 / 官方私信"""
        if 'user' not in session:
            return redirect('/login')
        conn = None
        try:
            conn = get_main_db()
            msgs = [dict(r) for r in conn.execute(
                "SELECT * FROM messages WHERE to_user = ? ORDER BY is_read ASC, created_at DESC LIMIT 100",
                (session['user'],)).fetchall()]
            announcements = [dict(r) for r in conn.execute(
                "SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20").fetchall()]
            return render_root_template('messages.html', msgs=msgs, announcements=announcements)
        finally:
            if conn:
                conn.close()

    @app.route('/messages/unread')
    def messages_unread_count():
        """未读消息数量（顶栏角标）"""
        if 'user' not in session:
            return jsonify({'count': 0})
        conn = None
        try:
            conn = get_main_db()
            c = conn.execute("SELECT COUNT(*) AS c FROM messages WHERE to_user = ? AND is_read = 0",
                             (session['user'],)).fetchone()
            return jsonify({'count': c['c']})
        finally:
            if conn:
                conn.close()

    @app.route('/messages/read/<int:msg_id>', methods=['POST'])
    def messages_read(msg_id):
        if 'user' not in session:
            return jsonify({'success': False}), 401
        conn = None
        try:
            conn = get_main_db()
            conn.execute("UPDATE messages SET is_read = 1 WHERE id = ? AND to_user = ?", (msg_id, session['user']))
            conn.commit()
            return jsonify({'success': True})
        finally:
            if conn:
                conn.close()

    @app.route('/messages/read_all', methods=['POST'])
    def messages_read_all():
        if 'user' not in session:
            return jsonify({'success': False}), 401
        conn = None
        try:
            conn = get_main_db()
            conn.execute("UPDATE messages SET is_read = 1 WHERE to_user = ?", (session['user'],))
            conn.commit()
            return jsonify({'success': True})
        finally:
            if conn:
                conn.close()

    @app.route('/messages/announce', methods=['POST'])
    def messages_announce():
        """发布全局公告（仅管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        data = request.get_json() or {}
        title = sanitize_work_text(data.get('title', ''))
        content = sanitize_work_text(data.get('content', ''))
        if not title or not content:
            return jsonify({'success': False, 'message': '标题和内容不能为空'}), 400
        conn = None
        try:
            conn = get_main_db()
            conn.execute("INSERT INTO announcements (title, content) VALUES (?, ?)", (title, content))
            conn.commit()
            return jsonify({'success': True, 'message': '公告已发布'})
        finally:
            if conn:
                conn.close()

    @app.route('/messages/private', methods=['POST'])
    def messages_private():
        """官方特邀私信（仅管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        data = request.get_json() or {}
        to_user = sanitize_work_text(data.get('to_user', ''))
        content = sanitize_work_text(data.get('content', ''))
        if not to_user or not content:
            return jsonify({'success': False, 'message': '收件人和内容不能为空'}), 400
        send_message(to_user, 'official', content, '官方')
        return jsonify({'success': True, 'message': '私信已发送'})

    # ---------- 论坛 ----------
    @app.route('/forum')
    def forum_index():
        """论坛首页：分区 + 帖子列表（支持 tab 筛选、搜索、分页）"""
        conn = None
        try:
            conn = get_forum_db()
            forums = [dict(r) for r in conn.execute("SELECT * FROM forums ORDER BY sort ASC").fetchall()]
            tab = request.args.get('tab', 'new')
            q = request.args.get('q', '').strip()
            page = max(int(request.args.get('page', 1)), 1)
            per_page = 20
            offset = (page - 1) * per_page
            like = f'%{q}%'
            base, qparams = "status = 'active'", []
            order = 'is_pinned DESC, updated_at DESC'
            if tab == 'pin':
                base += ' AND is_pinned = 1'
                order = 'is_pinned DESC, view_count DESC'
            elif tab == 'help':
                base += " AND (title LIKE ? OR content LIKE ?)"
                qparams += [like, like]
            if q and tab != 'help':
                base += " AND (title LIKE ? OR content LIKE ?)"
                qparams += [like, like]
            total_posts = conn.execute(f"SELECT COUNT(*) FROM posts WHERE {base}", qparams).fetchone()[0]
            rows = conn.execute(
                f"SELECT * FROM posts WHERE {base} ORDER BY {order} LIMIT ? OFFSET ?",
                qparams + [per_page, offset]).fetchall()
            posts = []
            for r in rows:
                d = dict(r)
                txt = re.sub(r'(!?\[[^\]]*\]\([^)]*\))|([#>`*\-]\s?)|(\n+)', '', d.get('content') or '').strip()
                d['preview'] = (txt[:120] + '…') if len(txt) > 120 else txt
                posts.append(d)
            total_pages = (total_posts + per_page - 1) // per_page or 1
            return render_root_template('forum/index.html', forums=forums, posts=posts,
                                        tab=tab, q=q, page=page, per_page=per_page,
                                        total_posts=total_posts, total_pages=total_pages)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/<int:forum_id>')
    @app.route('/forum/<int:forum_id>/page/<int:page>')
    def forum_section(forum_id, page=1):
        """分区帖子列表（分页）"""
        per_page = 20
        page = max(int(page), 1)
        offset = (page - 1) * per_page
        conn = None
        try:
            conn = get_forum_db()
            forum = conn.execute("SELECT * FROM forums WHERE id = ?", (forum_id,)).fetchone()
            if not forum:
                return render_root_template('404.html'), 404
            total = conn.execute("SELECT COUNT(*) FROM posts WHERE forum_id = ? AND status = 'active'", (forum_id,)).fetchone()[0]
            rows = conn.execute(
                "SELECT * FROM posts WHERE forum_id = ? AND status = 'active' ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?",
                (forum_id, per_page, offset)).fetchall()
            posts = [dict(r) for r in rows]
            total_pages = (total + per_page - 1) // per_page or 1
            return render_root_template('forum/section.html', forum=dict(forum), posts=posts,
                                        page=page, per_page=per_page, total_posts=total, total_pages=total_pages)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/post/<int:post_id>')
    def forum_post(post_id):
        """帖子详情 + 跟帖"""
        conn = None
        try:
            conn = get_forum_db()
            post = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
            if not post:
                return render_root_template('404.html'), 404
            post = dict(post)
            post['content_html'] = render_markdown_safe(post['content'])
            conn.execute("UPDATE posts SET view_count = view_count + 1 WHERE id = ?", (post_id,))
            conn.commit()
            r_page = max(int(request.args.get('page', 1)), 1)
            r_per_page = 20
            r_offset = (r_page - 1) * r_per_page
            r_total = conn.execute(
                "SELECT COUNT(*) FROM responses WHERE post_id = ? AND parent_id = 0 AND status = 'active'",
                (post_id,)).fetchone()[0]
            top = [dict(r) for r in conn.execute(
                "SELECT * FROM responses WHERE post_id = ? AND parent_id = 0 AND status = 'active' ORDER BY is_pinned DESC, created_at ASC LIMIT ? OFFSET ?",
                (post_id, r_per_page, r_offset)).fetchall()]
            replies_map = {}
            if top:
                ids = ",".join("?" for _ in top)
                children = conn.execute(
                    f"SELECT * FROM responses WHERE post_id = ? AND parent_id IN ({ids}) AND status = 'active' ORDER BY created_at ASC",
                    [post_id] + [t['id'] for t in top]).fetchall()
                for r in children:
                    replies_map.setdefault(dict(r).get('parent_id'), []).append(dict(r))
            forum = conn.execute("SELECT * FROM forums WHERE id = ?", (post['forum_id'],)).fetchone()
            r_total_pages = (r_total + r_per_page - 1) // r_per_page or 1
            return render_root_template('forum/post.html', post=post, forum=dict(forum) if forum else None,
                                         top_responses=top, replies_map=replies_map,
                                         page=r_page, per_page=r_per_page,
                                         total_replies=r_total, total_reply_pages=r_total_pages)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/new', methods=['GET', 'POST'])
    def forum_new():
        """发帖（Markdown）"""
        if 'user' not in session:
            return redirect('/login')
        conn = None
        try:
            conn = get_forum_db()
            if is_admin_user(session.get('user', '')):
                forums = [dict(r) for r in conn.execute("SELECT * FROM forums ORDER BY sort ASC").fetchall()]
            else:
                forums = [dict(r) for r in conn.execute("SELECT * FROM forums WHERE admin_only = 0 ORDER BY sort ASC").fetchall()]
            if request.method == 'POST':
                data = request.get_json() or {}
                forum_id = int(data.get('forum_id') or 0)
                title = sanitize_work_text(data.get('title', ''))
                content = (data.get('content') or '').strip()
                if not forum_id or not title or not content:
                    return jsonify({'success': False, 'message': '请填写完整信息'}), 400
                if len(title) > 80:
                    return jsonify({'success': False, 'message': '标题过长'}), 400
                forum = conn.execute("SELECT admin_only FROM forums WHERE id = ?", (forum_id,)).fetchone()
                if not forum:
                    return jsonify({'success': False, 'message': '目标板块不存在'}), 404
                if forum['admin_only'] and not is_admin_user(session['user']):
                    return jsonify({'success': False, 'message': '本板块仅管理员发帖'}), 403
                conn.execute(
                    "INSERT INTO posts (forum_id, title, content, author, author_id) VALUES (?, ?, ?, ?, ?)",
                    (forum_id, title, content, session['user'], session['user']))
                conn.commit()
                pid = conn.execute("SELECT last_insert_rowid() AS pid").fetchone()['pid']
                return jsonify({'success': True, 'message': '发布成功', 'post_id': pid})
            return render_root_template('forum/new.html', forums=forums)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/post/delete/<int:post_id>', methods=['POST'])
    def forum_post_delete(post_id):
        """删帖（作者 / 管理员）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        try:
            conn = get_forum_db()
            post = conn.execute("SELECT author FROM posts WHERE id = ?", (post_id,)).fetchone()
            if not post:
                return jsonify({'success': False, 'message': '帖子不存在'}), 404
            if post['author'] != session['user'] and not is_admin_user(session['user']):
                return jsonify({'success': False, 'message': '无权删除'}), 403
            conn.execute("UPDATE posts SET status = 'deleted' WHERE id = ?", (post_id,))
            conn.commit()
            return jsonify({'success': True, 'message': '帖子已删除'})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/post/pin/<int:post_id>', methods=['POST'])
    def forum_post_pin(post_id):
        """置顶/取消置顶（管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = None
        try:
            conn = get_forum_db()
            p = conn.execute("SELECT is_pinned FROM posts WHERE id = ?", (post_id,)).fetchone()
            if not p:
                return jsonify({'success': False, 'message': '帖子不存在'}), 404
            new_pin = 0 if p['is_pinned'] else 1
            conn.execute("UPDATE posts SET is_pinned = ? WHERE id = ?", (new_pin, post_id))
            conn.commit()
            return jsonify({'success': True, 'is_pinned': new_pin})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/post/review/<int:post_id>', methods=['POST'])
    def forum_post_review(post_id):
        """审核帖子：通过 / 屏蔽（管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        data = request.get_json() or {}
        action = data.get('action', 'reject')
        conn = None
        try:
            conn = get_forum_db()
            post = conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
            if not post:
                return jsonify({'success': False, 'message': '帖子不存在'}), 404
            if action == 'approve':
                conn.execute("UPDATE posts SET status = 'active' WHERE id = ?", (post_id,))
            else:
                conn.execute("UPDATE posts SET status = 'blocked' WHERE id = ?", (post_id,))
            conn.commit()
            return jsonify({'success': True, 'message': '处理完成'})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/post/report/<int:post_id>', methods=['POST'])
    def forum_post_report(post_id):
        """举报帖子"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        data = request.get_json() or {}
        reason = sanitize_work_text(data.get('reason', '')) or '无理由'
        conn = None
        try:
            conn = get_forum_db()
            conn.execute("INSERT INTO post_reports (target_type, target_id, user_id, reason) VALUES ('post', ?, ?, ?)",
                         (post_id, session['user'], reason))
            conn.commit()
            return jsonify({'success': True, 'message': '举报已提交'})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/reply/<int:post_id>', methods=['POST'])
    def forum_reply(post_id):
        """跟帖（支持 parent_id 二级回复）"""
        # 支持特权API调用（AI助手）
        is_api_call = False
        api_username = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            api_key = auth_header[7:]
            # 检查是否是长期token（用户名:密码格式）
            from .config import User
            if ':' in api_key:
                username, password = api_key.split(':', 1)
                user = User.query.filter_by(username=username).first()
                if user and user.password == password:
                    is_api_call = True
                    api_username = username
            # 也支持API Key方式
            elif api_key == app.config.get('AI_ASSISTANT_API_KEY', '137e33a723df4028beddc06850b8cb1a.IowCYALy5ZDsFR4T'):
                is_api_call = True
                api_username = request.form.get('api_username') or (request.get_json() or {}).get('api_username', 'AI助手')
        
        if not is_api_call and 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        username = api_username if is_api_call else session['user']
        data = request.get_json() or {}
        content = sanitize_work_text(data.get('content', ''))
        parent_id = int(data.get('parent_id') or 0)
        if not content:
            return jsonify({'success': False, 'message': '内容不能为空'}), 400
        conn = None
        try:
            conn = get_forum_db()
            post = conn.execute("SELECT id, author FROM posts WHERE id = ? AND status = 'active'", (post_id,)).fetchone()
            if not post:
                return jsonify({'success': False, 'message': '帖子不存在或未通过审核'}), 404
            if parent_id:
                target = conn.execute("SELECT user_id FROM responses WHERE id = ?", (parent_id,)).fetchone()
                if not target:
                    return jsonify({'success': False, 'message': '回复的楼层不存在'}), 404
            else:
                target = None
            conn.execute("INSERT INTO responses (post_id, parent_id, user_id, username, content) VALUES (?, ?, ?, ?, ?)",
                         (post_id, parent_id, username, username, content))
            conn.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", (post_id,))
            conn.commit()  # 提交回复 + 评论计数（forum.db）
            if parent_id and target and target['user_id'] != username:
                try:
                    mconn = get_main_db()
                    mconn.execute("INSERT INTO messages (to_user, from_user, msg_type, content, work_id) VALUES (?, ?, 'reply', ?, 0)",
                                  (target['user_id'], username, '用户 %s 回复了你在《%s 的帖子》里的跟帖' % (username, post['author'])))
                    mconn.commit()
                    mconn.close()
                except Exception:
                    pass
            elif not parent_id and post['author'] != username:
                try:
                    mconn = get_main_db()
                    mconn.execute("INSERT INTO messages (to_user, from_user, msg_type, content, work_id) VALUES (?, ?, 'reply', ?, 0)",
                                  (post['author'], username, '用户 %s 回复了你的帖子' % username))
                    mconn.commit()
                    mconn.close()
                except Exception:
                    pass
            return jsonify({'success': True, 'message': '回复成功'})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/reply/delete/<int:reply_id>', methods=['POST'])
    def forum_reply_delete(reply_id):
        """删除跟帖（本人 / 帖主 / 管理员）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        try:
            conn = get_forum_db()
            r = conn.execute("SELECT * FROM responses WHERE id = ?", (reply_id,)).fetchone()
            if not r:
                return jsonify({'success': False, 'message': '楼层不存在'}), 404
            post = conn.execute("SELECT author FROM posts WHERE id = ?", (r['post_id'],)).fetchone()
            allowed = (r['user_id'] == session['user'] or (post and post['author'] == session['user'])
                       or is_admin_user(session['user']))
            if not allowed:
                return jsonify({'success': False, 'message': '无权删除'}), 403
            conn.execute("UPDATE responses SET status = 'deleted' WHERE id = ?", (reply_id,))
            conn.commit()
            return jsonify({'success': True, 'message': '楼层已删除'})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/reply/pin/<int:reply_id>', methods=['POST'])
    def forum_reply_pin(reply_id):
        """置顶跟帖（管理员 / 帖主）"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = None
        try:
            conn = get_forum_db()
            r = conn.execute("SELECT post_id, user_id FROM responses WHERE id = ?", (reply_id,)).fetchone()
            if not r:
                return jsonify({'success': False, 'message': '楼层不存在'}), 404
            post = conn.execute("SELECT author FROM posts WHERE id = ?", (r['post_id'],)).fetchone()
            if not is_admin_user(session['user']) and not (post and post['author'] == session['user']):
                return jsonify({'success': False, 'message': '无权限'}), 403
            p = conn.execute("SELECT is_pinned FROM responses WHERE id = ?", (reply_id,)).fetchone()
            new_pin = 0 if p['is_pinned'] else 1
            conn.execute("UPDATE responses SET is_pinned = ? WHERE id = ?", (new_pin, reply_id))
            conn.commit()
            return jsonify({'success': True, 'is_pinned': new_pin})
        finally:
            if conn:
                conn.close()

    @app.route('/forum/review')
    def forum_review():
        """论坛审核工作台（管理员随机抽查 + 举报列表）"""
        if not is_admin_user(session.get('user', '')):
            return redirect('/login')
        conn = None
        try:
            conn = get_forum_db()
            reports = [dict(r) for r in conn.execute(
                "SELECT * FROM post_reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50").fetchall()]
            pending = [dict(r) for r in conn.execute(
                "SELECT * FROM posts WHERE status IN ('pending', 'blocked') ORDER BY created_at DESC LIMIT 30").fetchall()]
            samples = [dict(r) for r in conn.execute("SELECT * FROM posts ORDER BY RANDOM() LIMIT 10").fetchall()]
            return render_root_template('forum/review.html', reports=reports, pending=pending, samples=samples)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/admin/boards', methods=['GET', 'POST'])
    def forum_admin_boards():
        """版块管理：列表 + 新增（管理员）"""
        if not is_admin_user(session.get('user', '')):
            return redirect('/login')
        conn = None
        try:
            conn = get_forum_db()
            per_page = 50
            page = max(int(request.args.get('page', 1)), 1)
            offset = (page - 1) * per_page

            def fetch_boards():
                return [dict(r) for r in conn.execute("SELECT * FROM forums ORDER BY sort ASC, id ASC LIMIT ? OFFSET ?", (per_page, offset)).fetchall()]
            def total_count():
                return conn.execute("SELECT COUNT(*) FROM forums").fetchone()[0]

            if request.method == 'POST':
                name = (request.form.get('name') or '').strip()
                desc = (request.form.get('description') or '').strip()
                try:
                    sort = int(request.form.get('sort') or 0)
                except ValueError:
                    sort = 0
                admin_only = 1 if request.form.get('admin_only') else 0
                if not name:
                    boards = fetch_boards()
                    return render_root_template('forum/admin_boards.html', boards=boards, page=page, total_pages=max((total_count() + per_page - 1) // per_page, 1), error='请输入版块名称')
                conn.execute("INSERT INTO forums (name, description, sort, admin_only) VALUES (?, ?, ?, ?)",
                             (name, desc, sort, admin_only))
                conn.commit()
                return redirect('/forum/admin/boards')
            boards = fetch_boards()
            total = total_count()
            total_pages = (total + per_page - 1) // per_page or 1
            return render_root_template('forum/admin_boards.html', boards=boards, page=page, total_pages=total_pages)
        finally:
            if conn:
                conn.close()

    @app.route('/forum/admin/boards/edit/<int:board_id>', methods=['POST'])
    def forum_admin_board_edit(board_id):
        """编辑版块（管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = None
        try:
            conn = get_forum_db()
            forum = conn.execute("SELECT id FROM forums WHERE id = ?", (board_id,)).fetchone()
            if not forum:
                return jsonify({'success': False, 'message': '版块不存在'}), 404
            name = (request.form.get('name') or '').strip()
            desc = request.form.get('description') or ''
            try:
                sort = int(request.form.get('sort') or 0)
            except ValueError:
                sort = 0
            admin_only = 1 if request.form.get('admin_only') else 0
            conn.execute("UPDATE forums SET name = ?, description = ?, sort = ?, admin_only = ? WHERE id = ?",
                         (name, desc, sort, admin_only, board_id))
            conn.commit()
            return redirect('/forum/admin/boards')
        finally:
            if conn:
                conn.close()

    @app.route('/forum/admin/boards/delete/<int:board_id>', methods=['POST'])
    def forum_admin_board_delete(board_id):
        """删除版块：有帖子时禁止（管理员）"""
        if not is_admin_user(session.get('user', '')):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = None
        try:
            conn = get_forum_db()
            forum = conn.execute("SELECT id FROM forums WHERE id = ?", (board_id,)).fetchone()
            if not forum:
                return jsonify({'success': False, 'message': '版块不存在'}), 404
            cnt = conn.execute("SELECT COUNT(*) FROM posts WHERE forum_id = ?", (board_id,)).fetchone()[0]
            if cnt:
                return jsonify({'success': False, 'message': '该版块下面还有帖子，无法删除'}), 400
            conn.execute("DELETE FROM forums WHERE id = ?", (board_id,))
            conn.commit()
            return redirect('/forum/admin/boards')
        finally:
            if conn:
                conn.close()

    @app.route('/api/header')
    def api_header():
        """站头数据：提供给全局 mkh.js 统一渲染导航。"""
        from .config import MARKETS
        current_market = session.get('market', 'kn')
        username = session.get('user')
        user_info = None
        unread = 0
        if username:
            u = User.query.get(username)
            if u:
                user_info = {'username': username, 'role': u.role or 'user', 'qq': (u.qq or ''),
                             'reg_time': (u.reg_time or ''), 'is_admin': bool(u.role == 'admin')}
                conn = None
                try:
                    conn = get_main_db()
                    unread = conn.execute(
                        "SELECT COUNT(*) FROM messages WHERE to_user = ? AND is_read = 0",
                        (username,)).fetchone()[0]
                except Exception:
                    unread = 0
                finally:
                    if conn:
                        conn.close()
        return jsonify({'markets': MARKETS, 'current_market': current_market,
                        'user': user_info, 'unread_count': unread})