from flask import request, redirect, url_for, session, send_from_directory, jsonify
from .config import app, db, User
from .utils import render_root_template
import os
import re
import sqlite3
import hashlib
from datetime import datetime

# 作品池独立 lib：作品文件无需上传，发布时仅记录第三方直链。
# 每个作品对应一个数据库文件（localcdn/shequ/bcmkn/标题md5.db），记录：
# 文件直链 + 点赞/收藏/评论数量 + 评论区内容 + 点赞/收藏的人列表 + 标题 + 作者 + 简介
# main.db 统一登记每个作品的 db，用于列表/搜索加载。

# 作品文件存储目录
WORKPOOL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'shequ', 'bcmkn')
# 主数据库路径
MAIN_DB_PATH = os.path.join(WORKPOOL_DIR, 'main.db')


def get_main_db():
    """获取主数据库连接"""
    os.makedirs(WORKPOOL_DIR, exist_ok=True)
    conn = sqlite3.connect(MAIN_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()


def get_work_db(db_path):
    """获取作品数据库连接"""
    full_path = os.path.join(WORKPOOL_DIR, db_path)
    if not os.path.exists(full_path):
        return None
    conn = sqlite3.connect(full_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_work_db(db_path):
    """初始化作品数据库（每个作品一个 db）"""
    full_path = os.path.join(WORKPOOL_DIR, db_path)
    conn = sqlite3.connect(full_path)
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


def register_workpool_routes():
    init_main_db()

    @app.route('/workpool')
    def workpool_index():
        """作品池首页：顶栏与插件市场首页一致，下方展示作品内容"""
        search_query = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = 20
        offset = (page - 1) * per_page

        conn = get_main_db()
        cursor = conn.cursor()

        if search_query:
            cursor.execute("""
                SELECT * FROM works WHERE status = 'active' 
                AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)
                ORDER BY created_at DESC LIMIT ? OFFSET ?
            """, (f'%{search_query}%', f'%{search_query}%', f'%{search_query}%', f'%{search_query}%', per_page, offset))
        else:
            cursor.execute("""
                SELECT * FROM works WHERE status = 'active' 
                ORDER BY created_at DESC LIMIT ? OFFSET ?
            """, (per_page, offset))

        works = [dict(row) for row in cursor.fetchall()]

        # 获取总数
        if search_query:
            cursor.execute("""
                SELECT COUNT(*) FROM works WHERE status = 'active' 
                AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)
            """, (f'%{search_query}%', f'%{search_query}%', f'%{search_query}%', f'%{search_query}%'))
        else:
            cursor.execute("SELECT COUNT(*) FROM works WHERE status = 'active'")

        total = cursor.fetchone()[0]
        total_pages = (total + per_page - 1) // per_page

        conn.close()

        return render_root_template('workpool/index.html',
                                    works=works,
                                    search_query=search_query,
                                    page=page,
                                    total_pages=total_pages,
                                    total=total)

    @app.route('/workpool/<int:work_id>')
    def workpool_detail(work_id):
        """作品详情"""
        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM works WHERE id = ?", (work_id,))
        work = cursor.fetchone()
        conn.close()

        if not work:
            return render_root_template('404.html'), 404

        work = dict(work)

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

            # 获取评论
            w_cursor.execute("SELECT * FROM comments ORDER BY created_at DESC LIMIT 50")
            comments = [dict(row) for row in w_cursor.fetchall()]

            # 检查用户是否已点赞/收藏
            user_liked = False
            user_faved = False
            if 'user' in session:
                user_id = session['user']
                w_cursor.execute("SELECT id FROM likes WHERE user_id = ?", (user_id,))
                user_liked = w_cursor.fetchone() is not None
                w_cursor.execute("SELECT id FROM favorites WHERE user_id = ?", (user_id,))
                user_faved = w_cursor.fetchone() is not None

            work_conn.close()
        else:
            comments = []
            user_liked = False
            user_faved = False

        return render_root_template('workpool/detail.html',
                                    work=work,
                                    comments=comments,
                                    user_liked=user_liked,
                                    user_faved=user_faved)

    @app.route('/workpool/like/<int:work_id>', methods=['POST'])
    def workpool_like(work_id):
        """点赞作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT db_path FROM works WHERE id = ?", (work_id,))
        work = cursor.fetchone()
        conn.close()

        if not work:
            return jsonify({'success': False, 'message': '作品不存在'}), 404

        user_id = session['user']
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

            w_cursor.execute("SELECT like_count FROM work_info WHERE id = 1")
            like_count = w_cursor.fetchone()['like_count']
            work_conn.commit()
            work_conn.close()

            # 更新主数据库
            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE works SET like_count = ? WHERE id = ?", (like_count, work_id))
            conn.commit()
            conn.close()

            return jsonify({'success': True, 'action': action, 'like_count': like_count})

        return jsonify({'success': False, 'message': '作品数据库不存在'}), 404

    @app.route('/workpool/fav/<int:work_id>', methods=['POST'])
    def workpool_fav(work_id):
        """收藏作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT db_path FROM works WHERE id = ?", (work_id,))
        work = cursor.fetchone()
        conn.close()

        if not work:
            return jsonify({'success': False, 'message': '作品不存在'}), 404

        user_id = session['user']
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

            w_cursor.execute("SELECT fav_count FROM work_info WHERE id = 1")
            fav_count = w_cursor.fetchone()['fav_count']
            work_conn.commit()
            work_conn.close()

            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE works SET fav_count = ? WHERE id = ?", (fav_count, work_id))
            conn.commit()
            conn.close()

            return jsonify({'success': True, 'action': action, 'fav_count': fav_count})

        return jsonify({'success': False, 'message': '作品数据库不存在'}), 404

    @app.route('/workpool/comment/<int:work_id>', methods=['POST'])
    def workpool_comment(work_id):
        """评论作品"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        data = request.get_json()
        content = sanitize_work_text(data.get('content', ''))

        if not content:
            return jsonify({'success': False, 'message': '评论内容不能为空'}), 400

        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT db_path FROM works WHERE id = ?", (work_id,))
        work = cursor.fetchone()
        conn.close()

        if not work:
            return jsonify({'success': False, 'message': '作品不存在'}), 404

        user_id = session['user']
        work_conn = get_work_db(work['db_path'])

        if work_conn:
            w_cursor = work_conn.cursor()
            w_cursor.execute("INSERT INTO comments (user_id, username, content) VALUES (?, ?, ?)",
                           (user_id, user_id, content))
            w_cursor.execute("UPDATE work_info SET comment_count = comment_count + 1 WHERE id = 1")
            w_cursor.execute("SELECT comment_count FROM work_info WHERE id = 1")
            comment_count = w_cursor.fetchone()['comment_count']
            work_conn.commit()
            work_conn.close()

            conn = get_main_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE works SET comment_count = ? WHERE id = ?", (comment_count, work_id))
            conn.commit()
            conn.close()

            return jsonify({'success': True, 'comment_count': comment_count})

        return jsonify({'success': False, 'message': '作品数据库不存在'}), 404

    @app.route('/workpool/my')
    def workpool_my():
        """我的作品"""
        if 'user' not in session:
            return redirect('/login')

        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM works WHERE author_id = ? OR author = ? ORDER BY created_at DESC",
                      (session['user'], session['user']))
        works = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return render_root_template('workpool/my.html', works=works)

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

        if not title:
            return jsonify({'success': False, 'message': '作品标题不能为空'}), 400
        if not file_url:
            return jsonify({'success': False, 'message': '作品文件链接不能为空'}), 400

        # 生成作品数据库文件名（使用标题的 MD5）
        db_filename = hashlib.md5(title.encode('utf-8')).hexdigest() + '.db'
        db_path = db_filename

        # 检查是否已发布过（防止重复发布同一标题导致 work_info.id 唯一约束冲突）
        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM works WHERE db_path = ?", (db_path,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': '该作品已发布，请勿重复发布'}), 409

        # 初始化作品数据库
        init_work_db(db_path)

        # 写入作品信息到作品数据库
        work_conn = get_work_db(db_path)
        if work_conn:
            w_cursor = work_conn.cursor()
            w_cursor.execute("""
                INSERT INTO work_info (id, title, author, author_id, description, file_url, thumbnail, tags)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            """, (title, session['user'], session['user'], description, file_url, thumbnail, tags))
            work_conn.commit()
            work_conn.close()

        # 写入主数据库
        cursor.execute("""
            INSERT INTO works (db_path, title, author, author_id, description, thumbnail, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (db_path, title, session['user'], session['user'], description, thumbnail, tags))
        conn.commit()
        work_id = cursor.lastrowid
        conn.close()

        return jsonify({'success': True, 'message': '作品发布成功', 'work_id': work_id})

    @app.route('/workpool/delete/<int:work_id>', methods=['POST'])
    def workpool_delete(work_id):
        """擦除作品（仅作者或管理员）：删除索引 + db 文件，第三方网盘文件不动"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        conn = get_main_db()
        cursor = conn.cursor()
        cursor.execute("SELECT author_id, author, db_path FROM works WHERE id = ?", (work_id,))
        work = cursor.fetchone()

        if not work:
            conn.close()
            return jsonify({'success': False, 'message': '作品不存在'}), 404

        author_id = work['author_id'] or work['author']
        db_path = work['db_path']

        # 检查权限
        is_admin = User.query.filter_by(username=session['user'], role='admin').first()
        if author_id != session['user'] and not is_admin:
            conn.close()
            return jsonify({'success': False, 'message': '无权删除此作品'}), 403

        # 删除作品数据库文件
        full_db_path = os.path.join(WORKPOOL_DIR, db_path)
        if os.path.exists(full_db_path):
            os.remove(full_db_path)

        # 从主数据库删除记录
        cursor.execute("DELETE FROM works WHERE id = ?", (work_id,))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': '作品已擦除'})
