import os
import sqlite3
from flask import request, redirect, session, jsonify
from .config import app, User, root_jinja_env, market_jinja_envs
from .utils import render_root_template
from datetime import datetime

# 团队数据独立存放到 team.db（不与 users.db 等集中混放）
TEAM_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'shequ', 'team.db')


def get_team_db():
    os.makedirs(os.path.dirname(TEAM_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(TEAM_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_team_db():
    """初始化团队数据库"""
    conn = get_team_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        cover TEXT DEFAULT '',
        qq VARCHAR(20) DEFAULT '',
        bulletin TEXT DEFAULT '',
        created_by VARCHAR(50) DEFAULT '',
        created_at VARCHAR(30) DEFAULT ''
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_member (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        username VARCHAR(50) NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        joined_at VARCHAR(30) DEFAULT ''
    )""")
    conn.commit()
    conn.close()


def user_team(username):
    """返回某个成员所属的团队（单一），None 表示未加入团队"""
    if not username:
        return None
    conn = get_team_db()
    t = conn.execute(
        "SELECT t.* FROM team t JOIN team_member m ON m.team_id = t.id "
        "WHERE m.username = ? ORDER BY t.id LIMIT 1", (username,)).fetchone()
    conn.close()
    return dict(t) if t else None


def user_team_badge(username):
    """返回团队徽标 span HTML（用于模板插入）"""
    t = user_team(username)
    if not t:
        return ''
    return ('<span class="tea-badge" title="隶属团队：%s">'
            '<i class="fa-solid fa-building"></i> %s</span>') % (
        t['name'], t['name'])


def team_members(team_id):
    conn = get_team_db()
    rows = conn.execute(
        "SELECT * FROM team_member WHERE team_id = ? ORDER BY joined_at DESC, id", (team_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def team_member_count(team_id):
    conn = get_team_db()
    r = conn.execute("SELECT COUNT(*) c FROM team_member WHERE team_id = ?", (team_id,)).fetchone()
    conn.close()
    return r['c']


def get_team(team_id):
    conn = get_team_db()
    t = conn.execute("SELECT * FROM team WHERE id = ?", (team_id,)).fetchone()
    conn.close()
    return dict(t) if t else None


def team_member(team_id, username):
    if not username:
        return None
    conn = get_team_db()
    m = conn.execute("SELECT * FROM team_member WHERE team_id = ? AND username = ?",
                     (team_id, username)).fetchone()
    conn.close()
    return dict(m) if m else None


# 注册 jinja 全局，便于模板直接调用
root_jinja_env.globals['user_team'] = user_team
root_jinja_env.globals['user_team_badge'] = user_team_badge
for _env in market_jinja_envs.values():
    _env.globals['user_team'] = user_team
    _env.globals['user_team_badge'] = user_team_badge


def current_user_team():
    return user_team(session.get('user'))


def register_team_routes():

    @app.route('/team')
    def team_index():
        conn = get_team_db()
        teams = conn.execute("SELECT * FROM team ORDER BY created_at DESC, id DESC").fetchall()
        rows = conn.execute(
            "SELECT team_id, COUNT(*) c FROM team_member GROUP BY team_id").fetchall()
        conn.close()
        counts = {r['team_id']: r['c'] for r in rows}
        team_list = []
        for t in teams:
            d = {'id': t['id'], 'name': t['name'], 'description': t['description'],
                 'cover': t['cover'], 'qq': t['qq'], 'bulletin': t['bulletin'],
                 'created_by': t['created_by'], 'created_at': t['created_at'],
                 'member_count': counts.get(t['id'], 0),
                 'avatar_url': ('https://q1.qlogo.cn/g?b=qq&nk=%s&s=100' % t['qq']) if t['qq'] else ''}
            team_list.append(d)
        return render_root_template('team/index.html', teams=team_list,
                                    current_user_team=current_user_team())

    @app.route('/team/create', methods=['POST'])
    def team_create():
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        if current_user_team():
            return jsonify({'success': False, 'message': '你已经加入了其他团队，请先退出当前团队'}), 400
        data = request.form
        name = (data.get('name') or '').strip()
        desc = (data.get('description') or '').strip()
        cover = (data.get('cover') or '').strip()
        qq = (data.get('qq') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': '请输入团队名称'}), 400
        conn = get_team_db()
        if conn.execute("SELECT id FROM team WHERE name = ?", (name,)).fetchone():
            conn.close()
            return jsonify({'success': False, 'message': '团队名称已存在'}), 400
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO team (name, description, cover, qq, bulletin, created_by, created_at) "
                       "VALUES (?, ?, ?, ?, '', ?, ?)",
                       (name, desc, cover, qq, session['user'], now))
        team_id = cursor.lastrowid
        cursor.execute("INSERT INTO team_member (team_id, username, role, joined_at) VALUES (?, ?, 'owner', ?)",
                       (team_id, session['user'], now))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '团队创建成功', 'team_id': team_id})

    @app.route('/team/<int:team_id>')
    def team_detail(team_id):
        t = get_team(team_id)
        if not t:
            return render_root_template('404.html'), 404
        member_rows = []
        for m in team_members(team_id):
            u = User.query.get(m['username'])
            member_rows.append({'username': m['username'], 'role': m['role'],
                                'qq': (u.qq if u else '') or '',
                                'avatar_url': (u.qq_avatar_url if u else ''),
                                'joined_at': m['joined_at']})
        # 团队成员的作品（取最新 30 条，不一次性加载全部）
        from .workpool import get_main_db
        authors = [m['username'] for m in team_members(team_id)]
        works = []
        if authors:
            conn = get_main_db()
            placeholders = ','.join('?' for _ in authors)
            rows = conn.execute(
                "SELECT id, title, author, thumbnail, view_count, like_count, comment_count, created_at "
                "FROM works WHERE author IN (%s) AND status = 'active' AND is_hidden = 0 "
                "ORDER BY created_at DESC LIMIT 30" % placeholders, authors).fetchall()
            for r in rows:
                works.append(dict(r))
            conn.close()
        me = team_member(team_id, session.get('user', ''))
        is_admin = bool(me) and me['role'] in ('owner', 'admin')
        return render_root_template('team/detail.html', team={'id': t['id'], 'name': t['name'],
                                       'description': t['description'], 'cover': t['cover'],
                                       'qq': t['qq'], 'bulletin': t['bulletin'],
                                       'avatar_url': ('https://q1.qlogo.cn/g?b=qq&nk=%s&s=200' % t['qq']) if t['qq'] else '',
                                       'created_by': t['created_by'], 'created_at': t['created_at']},
                                    members=member_rows, works=works, me=me, is_member=bool(me),
                                    is_owner=(bool(me) and me['role'] == 'owner'), is_admin=is_admin)

    @app.route('/team/<int:team_id>/edit', methods=['POST'])
    def team_edit(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        if not get_team(team_id):
            return jsonify({'success': False, 'message': '团队不存在'}), 404
        me = team_member(team_id, session['user'])
        if not me or me['role'] not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        data = request.form
        conn = get_team_db()
        t = conn.execute("SELECT * FROM team WHERE id = ?", (team_id,)).fetchone()
        name = (data.get('name') or '').strip() or t['name']
        conn.execute("UPDATE team SET name = ?, description = ?, cover = ?, qq = ?, bulletin = ? WHERE id = ?",
                     (name, data.get('description', t['description']) or t['description'],
                      data.get('cover', t['cover']) or t['cover'],
                      (data.get('qq') or '').strip() or t['qq'],
                      data.get('bulletin', t['bulletin']), team_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已保存'})

    @app.route('/team/<int:team_id>/delete', methods=['POST'])
    def team_delete(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        if not get_team(team_id):
            return jsonify({'success': False, 'message': '团队不存在'}), 404
        me = team_member(team_id, session['user'])
        if not me or me['role'] != 'owner':
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = get_team_db()
        conn.execute("DELETE FROM team_member WHERE team_id = ?", (team_id,))
        conn.execute("DELETE FROM team WHERE id = ?", (team_id,))
        conn.commit()
        conn.close()
        return redirect('/team')

    @app.route('/team/<int:team_id>/members/add', methods=['POST'])
    def team_member_add(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me or me['role'] not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        username = (request.form.get('username') or '').strip()
        if not username:
            return jsonify({'success': False, 'message': '请输入用户名'}), 400
        user = User.query.get(username)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        if team_member(team_id, username):
            return jsonify({'success': False, 'message': '已在团队中'}), 400
        if user_team(username):
            return jsonify({'success': False, 'message': '该用户已在其他团队中'}), 400
        conn = get_team_db()
        conn.execute("INSERT INTO team_member (team_id, username, role, joined_at) VALUES (?, ?, 'member', ?)",
                     (team_id, username, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已添加成员'})

    @app.route('/team/<int:team_id>/members/remove', methods=['POST'])
    def team_member_remove(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me or me['role'] not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        username = (request.form.get('username') or '').strip()
        if not username:
            return jsonify({'success': False, 'message': '请输入用户名'}), 400
        if me['role'] != 'owner' and session['user'] == username:
            return jsonify({'success': False, 'message': '管理员不能移除自己'}), 400
        conn = get_team_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM team_member WHERE team_id = ? AND username = ?", (team_id, username))
        removed = cursor.rowcount
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已移除成员', 'removed': bool(removed)})

    @app.route('/team/<int:team_id>/leave', methods=['POST'])
    def team_leave(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me:
            return jsonify({'success': False, 'message': '你不在该团队中'}), 400
        if me['role'] == 'owner':
            return jsonify({'success': False, 'message': '团长不能直接退出，请解散团队'}), 400
        conn = get_team_db()
        conn.execute("DELETE FROM team_member WHERE team_id = ? AND username = ?", (team_id, session['user']))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已退出团队'})
