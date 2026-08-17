import os
import sqlite3
from flask import request, redirect, session, jsonify
from .config import app, User, root_jinja_env, market_jinja_envs
from .utils import render_root_template
from datetime import datetime

# 团队数据独立存放到 team.db（不与 users.db 等集中混放）
TEAM_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'shequ', 'team.db')

TEAMS_PER_PAGE = 12
MEMBERS_PER_PAGE = 20
WORKS_PER_PAGE = 24
POSTS_PER_PAGE = 10
INVITES_PER_PAGE = 10
MY_WORKS_MAX = 50


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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_invite (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        from_user VARCHAR(50) DEFAULT '',
        username VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at VARCHAR(30) DEFAULT ''
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_work (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        work_id INTEGER NOT NULL,
        added_by VARCHAR(50) DEFAULT '',
        created_at VARCHAR(30) DEFAULT ''
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_post (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        author VARCHAR(50) NOT NULL,
        title VARCHAR(200) DEFAULT '',
        content TEXT DEFAULT '',
        is_pin INTEGER DEFAULT 0,
        created_at VARCHAR(30) DEFAULT ''
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


def _fragment(name, **ctx):
    """渲染 team 分页片段（独立 Jinja 环境，无 Flask 全局，需显式传参）"""
    return root_jinja_env.get_template('team/' + name).render(**ctx)


def register_team_routes():

    @app.route('/team')
    def team_index():
        page = max(request.args.get('page', 1, type=int), 1)
        conn = get_team_db()
        total = conn.execute("SELECT COUNT(*) c FROM team").fetchone()['c']
        rows = conn.execute("SELECT team_id, COUNT(*) c FROM team_member GROUP BY team_id").fetchall()
        counts = {r['team_id']: r['c'] for r in rows}
        teams = conn.execute(
            "SELECT * FROM team ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            (TEAMS_PER_PAGE + 1, (page - 1) * TEAMS_PER_PAGE)).fetchall()
        has_more = len(teams) > TEAMS_PER_PAGE
        team_list = []
        for t in teams[:TEAMS_PER_PAGE]:
            d = {'id': t['id'], 'name': t['name'], 'description': t['description'],
                 'cover': t['cover'], 'qq': t['qq'], 'bulletin': t['bulletin'],
                 'created_by': t['created_by'], 'created_at': t['created_at'],
                 'member_count': counts.get(t['id'], 0),
                 'avatar_url': ('https://q.qlogo.cn/headimg_dl?dst_uin=%s&spec=640&img_type=jpg' % t['qq']) if t['qq'] else ''}
            team_list.append(d)
        # 收到的待处理邀请（分页）
        invites, inv_has_more = [], False
        if session.get('user'):
            rows = conn.execute(
                "SELECT i.id, i.team_id, i.from_user, i.created_at, t.name AS team_name "
                "FROM team_invite i JOIN team t ON t.id = i.team_id "
                "WHERE i.username = ? AND i.status = 'pending' "
                "ORDER BY i.created_at DESC, i.id DESC LIMIT ?",
                (session['user'], INVITES_PER_PAGE + 1)).fetchall()
            inv_has_more = len(rows) > INVITES_PER_PAGE
            invites = [dict(r) for r in rows[:INVITES_PER_PAGE]]
        conn.close()
        total_pages = max((total + TEAMS_PER_PAGE - 1) // TEAMS_PER_PAGE, 1)
        return render_root_template('team/index.html', teams=team_list, my_team=current_user_team(),
                                    invites=invites, inv_has_more=inv_has_more,
                                    page=page, total_pages=total_pages, has_more=has_more)

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
        me = team_member(team_id, session.get('user', ''))
        is_member = bool(me)
        is_admin = bool(me) and me['role'] in ('owner', 'admin')
        is_owner = bool(me) and me['role'] == 'owner'
        me_username = session.get('user', '')
        role_name = {'owner': '团长', 'admin': '管理员', 'member': '成员'}
        conn = get_team_db()
        # 成员（分页）
        members_total = conn.execute("SELECT COUNT(*) c FROM team_member WHERE team_id = ?",
                                     (team_id,)).fetchone()['c']
        members_db = conn.execute(
            "SELECT * FROM team_member WHERE team_id = ? ORDER BY joined_at DESC, id LIMIT ?",
            (team_id, MEMBERS_PER_PAGE + 1)).fetchall()
        m_has_more = len(members_db) > MEMBERS_PER_PAGE
        cnt_rows = conn.execute(
            "SELECT added_by, COUNT(*) c FROM team_work WHERE team_id = ? GROUP BY added_by",
            (team_id,)).fetchall()
        cnt_map = {r['added_by']: r['c'] for r in cnt_rows}
        member_rows = []
        for m in members_db[:MEMBERS_PER_PAGE]:
            u = User.query.get(m['username'])
            member_rows.append({'username': m['username'], 'role': m['role'],
                                'role_name': role_name.get(m['role'], m['role']),
                                'work_count': cnt_map.get(m['username'], 0),
                                'qq': (u.qq if u else '') or '',
                                'avatar': (u.avatar if u else '') or '',
                                'avatar_url': (u.avatar_url if u else ''),
                                'joined_at': m['joined_at']})
        members_html = _fragment('_members.html', members=member_rows,
                                 is_admin=is_admin, created_by=t['created_by'])
        # 共有作品（分页）
        works_total = conn.execute("SELECT COUNT(*) c FROM team_work WHERE team_id = ?",
                                   (team_id,)).fetchone()['c']
        tws = conn.execute(
            "SELECT * FROM team_work WHERE team_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
            (team_id, WORKS_PER_PAGE + 1)).fetchall()
        w_has_more = len(tws) > WORKS_PER_PAGE
        works = []
        if tws:
            from .workpool import get_main_db
            wconn = get_main_db()
            wids = [tw['work_id'] for tw in tws[:WORKS_PER_PAGE]]
            ph = ','.join('?' for _ in wids)
            rows = wconn.execute(
                "SELECT id, title, author, thumbnail, view_count, like_count, comment_count, created_at "
                "FROM works WHERE id IN (%s) AND status = 'active' AND is_hidden = 0" % ph, wids).fetchall()
            wconn.close()
            workmap = {r['id']: dict(r) for r in rows}
            works = [dict(workmap[wid]) for wid in wids if wid in workmap]
        works_html = _fragment('_works.html', works=works, is_admin=is_admin, me_username=me_username)
        # 团队帖子（分页）
        posts_total = conn.execute("SELECT COUNT(*) c FROM team_post WHERE team_id = ?",
                                   (team_id,)).fetchone()['c']
        posts = conn.execute(
            "SELECT * FROM team_post WHERE team_id = ? ORDER BY is_pin DESC, created_at DESC, id DESC LIMIT ?",
            (team_id, POSTS_PER_PAGE + 1)).fetchall()
        p_has_more = len(posts) > POSTS_PER_PAGE
        posts_html = _fragment('_posts.html', posts=[dict(p) for p in posts[:POSTS_PER_PAGE]],
                               is_admin=is_admin, me_username=me_username)
        # 已发邀请（分页）
        invites = conn.execute(
            "SELECT * FROM team_invite WHERE team_id = ? AND status = 'pending' "
            "ORDER BY created_at DESC, id DESC LIMIT ?",
            (team_id, INVITES_PER_PAGE + 1)).fetchall()
        i_has_more = len(invites) > INVITES_PER_PAGE
        invites_html = _fragment('_invites_sent.html', invites=[dict(v) for v in invites[:INVITES_PER_PAGE]])
        conn.close()
        # 我的可添加作品（封顶，不无限拉取）
        my_works = []
        if is_member:
            from .workpool import get_main_db
            mconn = get_main_db()
            rows = mconn.execute(
                "SELECT id, title, author, thumbnail FROM works "
                "WHERE author = ? AND status = 'active' AND is_hidden = 0 "
                "ORDER BY created_at DESC LIMIT ?", (session['user'], MY_WORKS_MAX)).fetchall()
            mconn.close()
            added_ids = {tw['work_id'] for tw in tws[:WORKS_PER_PAGE]}
            my_works = [dict(r) for r in rows if r['id'] not in added_ids]
        return render_root_template('team/detail.html', team={'id': t['id'], 'name': t['name'],
                                       'description': t['description'], 'cover': t['cover'],
                                       'qq': t['qq'], 'bulletin': t['bulletin'],
                                       'avatar_url': ('https://q.qlogo.cn/headimg_dl?dst_uin=%s&spec=640&img_type=jpg' % t['qq']) if t['qq'] else '',
                                       'created_by': t['created_by'], 'created_at': t['created_at']},
                                    members_html=members_html, m_has_more=m_has_more, members_total=members_total,
                                    works_html=works_html, w_has_more=w_has_more, works_total=works_total,
                                    posts_html=posts_html, p_has_more=p_has_more, posts_total=posts_total,
                                    invites_html=invites_html, i_has_more=i_has_more,
                                    my_works=my_works, me=me, me_username=me_username,
                                    is_member=is_member, is_owner=is_owner, is_admin=is_admin)

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

    @app.route('/team/<int:team_id>/invite', methods=['POST'])
    def team_invite(team_id):
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
            return jsonify({'success': False, 'message': '该用户已在团队中'}), 400
        if user_team(username):
            return jsonify({'success': False, 'message': '该用户已在其他团队中'}), 400
        conn = get_team_db()
        if conn.execute("SELECT id FROM team_invite WHERE team_id = ? AND username = ? AND status = 'pending'",
                        (team_id, username)).fetchone():
            conn.close()
            return jsonify({'success': False, 'message': '已发送过邀请，等待对方处理'}), 400
        conn.execute("INSERT INTO team_invite (team_id, from_user, username, status, created_at) "
                     "VALUES (?, ?, ?, 'pending', ?)",
                     (team_id, session['user'], username, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '邀请已发送'})

    @app.route('/team/<int:team_id>/invite/cancel/<int:invite_id>', methods=['POST'])
    def team_invite_cancel(team_id, invite_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        conn = get_team_db()
        inv = conn.execute("SELECT * FROM team_invite WHERE id = ? AND team_id = ?",
                           (invite_id, team_id)).fetchone()
        if not inv:
            conn.close()
            return jsonify({'success': False, 'message': '邀请不存在'}), 404
        if not (me and me['role'] in ('owner', 'admin')) and inv['from_user'] != session['user']:
            conn.close()
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn.execute("DELETE FROM team_invite WHERE id = ?", (invite_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已撤销邀请'})

    @app.route('/team/invite/accept/<int:invite_id>', methods=['POST'])
    def team_invite_accept(invite_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = get_team_db()
        inv = conn.execute("SELECT * FROM team_invite WHERE id = ?", (invite_id,)).fetchone()
        if not inv:
            conn.close()
            return jsonify({'success': False, 'message': '邀请不存在'}), 404
        if inv['username'] != session['user']:
            conn.close()
            return jsonify({'success': False, 'message': '无权操作'}), 403
        if inv['status'] != 'pending':
            conn.close()
            return jsonify({'success': False, 'message': '邀请已失效'}), 400
        if user_team(session['user']):
            conn.close()
            return jsonify({'success': False, 'message': '你已加入其他团队，请先退出'}), 400
        if team_member(inv['team_id'], session['user']):
            conn.execute("DELETE FROM team_invite WHERE id = ?", (invite_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': '你已在该团队中'})
        conn.execute("INSERT INTO team_member (team_id, username, role, joined_at) VALUES (?, ?, 'member', ?)",
                     (inv['team_id'], session['user'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.execute("DELETE FROM team_invite WHERE id = ?", (invite_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已加入团队'})

    @app.route('/team/invite/reject/<int:invite_id>', methods=['POST'])
    def team_invite_reject(invite_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        conn = get_team_db()
        inv = conn.execute("SELECT id, username FROM team_invite WHERE id = ?", (invite_id,)).fetchone()
        if not inv:
            conn.close()
            return jsonify({'success': False, 'message': '邀请不存在'}), 404
        if inv['username'] != session['user']:
            conn.close()
            return jsonify({'success': False, 'message': '无权操作'}), 403
        conn.execute("DELETE FROM team_invite WHERE id = ?", (invite_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已拒绝邀请'})

    @app.route('/team/<int:team_id>/works/add', methods=['POST'])
    def team_work_add(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me:
            return jsonify({'success': False, 'message': '请先加入团队'}), 403
        try:
            work_id = int(request.form.get('work_id') or 0)
        except ValueError:
            return jsonify({'success': False, 'message': '参数错误'}), 400
        if work_id <= 0:
            return jsonify({'success': False, 'message': '请选择作品'}), 400
        from .workpool import get_main_db
        conn = get_main_db()
        w = conn.execute("SELECT id, author FROM works WHERE id = ? AND status = 'active' AND is_hidden = 0",
                         (work_id,)).fetchone()
        conn.close()
        if not w:
            return jsonify({'success': False, 'message': '作品不存在'}), 404
        if w['author'] != session['user']:
            return jsonify({'success': False, 'message': '只能添加自己名下的作品'}), 403
        tconn = get_team_db()
        if tconn.execute("SELECT id FROM team_work WHERE team_id = ? AND work_id = ?",
                         (team_id, work_id)).fetchone():
            tconn.close()
            return jsonify({'success': False, 'message': '该作品已在共有列表中'}), 400
        tconn.execute("INSERT INTO team_work (team_id, work_id, added_by, created_at) VALUES (?, ?, ?, ?)",
                      (team_id, work_id, session['user'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        tconn.commit()
        tconn.close()
        return jsonify({'success': True, 'message': '已添加到共有作品'})

    @app.route('/team/<int:team_id>/works/remove/<int:work_id>', methods=['POST'])
    def team_work_remove(team_id, work_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        conn = get_team_db()
        tw = conn.execute("SELECT * FROM team_work WHERE team_id = ? AND work_id = ?",
                          (team_id, work_id)).fetchone()
        if not tw:
            conn.close()
            return jsonify({'success': False, 'message': '作品不在共有列表中'}), 404
        if not (me and me['role'] in ('owner', 'admin')) and tw['added_by'] != session['user']:
            conn.close()
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn.execute("DELETE FROM team_work WHERE id = ?", (tw['id'],))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已移除'})

    @app.route('/team/<int:team_id>/posts/add', methods=['POST'])
    def team_post_add(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me:
            return jsonify({'success': False, 'message': '请先加入团队'}), 403
        title = (request.form.get('title') or '').strip()
        content = (request.form.get('content') or '').strip()
        if not title and not content:
            return jsonify({'success': False, 'message': '标题和内容不能都为空'}), 400
        pin = 1 if (me['role'] in ('owner', 'admin') and request.form.get('pin')) else 0
        conn = get_team_db()
        conn.execute("INSERT INTO team_post (team_id, author, title, content, is_pin, created_at) "
                     "VALUES (?, ?, ?, ?, ?, ?)",
                     (team_id, session['user'], title, content, pin,
                      datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已发布'})

    @app.route('/team/<int:team_id>/posts/delete/<int:post_id>', methods=['POST'])
    def team_post_delete(team_id, post_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        conn = get_team_db()
        p = conn.execute("SELECT * FROM team_post WHERE id = ? AND team_id = ?",
                         (post_id, team_id)).fetchone()
        if not p:
            conn.close()
            return jsonify({'success': False, 'message': '帖子不存在'}), 404
        if not (me and me['role'] in ('owner', 'admin')) and p['author'] != session['user']:
            conn.close()
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn.execute("DELETE FROM team_post WHERE id = ?", (post_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已删除'})

    @app.route('/team/<int:team_id>/posts/pin/<int:post_id>', methods=['POST'])
    def team_post_pin(team_id, post_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = team_member(team_id, session['user'])
        if not me or me['role'] not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        conn = get_team_db()
        p = conn.execute("SELECT id, is_pin FROM team_post WHERE id = ? AND team_id = ?",
                         (post_id, team_id)).fetchone()
        if not p:
            conn.close()
            return jsonify({'success': False, 'message': '帖子不存在'}), 404
        conn.execute("UPDATE team_post SET is_pin = ? WHERE id = ?", (0 if p['is_pin'] else 1, post_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '已取消置顶' if p['is_pin'] else '已置顶'})

    @app.route('/team/invites/ajax')
    def team_invites_ajax():
        """我收到的邀请分页"""
        if 'user' not in session:
            return jsonify({'html': '', 'has_more': False})
        page = max(request.args.get('page', 1, type=int), 1)
        conn = get_team_db()
        rows = conn.execute(
            "SELECT i.id, i.team_id, i.from_user, i.created_at, t.name AS team_name "
            "FROM team_invite i JOIN team t ON t.id = i.team_id "
            "WHERE i.username = ? AND i.status = 'pending' "
            "ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?",
            (session['user'], INVITES_PER_PAGE + 1, (page - 1) * INVITES_PER_PAGE)).fetchall()
        conn.close()
        has_more = len(rows) > INVITES_PER_PAGE
        html = _fragment('_invites_received.html', invites=[dict(r) for r in rows[:INVITES_PER_PAGE]])
        return jsonify({'html': html, 'has_more': has_more})

    @app.route('/team/<int:team_id>/members/ajax')
    def team_members_ajax(team_id):
        """团队详情：成员分页"""
        if 'user' not in session:
            return jsonify({'html': '', 'has_more': False}), 401
        page = max(request.args.get('page', 1, type=int), 1)
        t = get_team(team_id)
        if not t:
            return jsonify({'html': '', 'has_more': False}), 404
        me = team_member(team_id, session['user'])
        is_admin = bool(me) and me['role'] in ('owner', 'admin')
        role_name = {'owner': '团长', 'admin': '管理员', 'member': '成员'}
        conn = get_team_db()
        rows = conn.execute(
            "SELECT * FROM team_member WHERE team_id = ? ORDER BY joined_at DESC, id LIMIT ? OFFSET ?",
            (team_id, MEMBERS_PER_PAGE + 1, (page - 1) * MEMBERS_PER_PAGE)).fetchall()
        has_more = len(rows) > MEMBERS_PER_PAGE
        cnt_rows = conn.execute(
            "SELECT added_by, COUNT(*) c FROM team_work WHERE team_id = ? GROUP BY added_by",
            (team_id,)).fetchall()
        cnt_map = {r['added_by']: r['c'] for r in cnt_rows}
        conn.close()
        member_rows = []
        for m in rows[:MEMBERS_PER_PAGE]:
            u = User.query.get(m['username'])
            member_rows.append({'username': m['username'], 'role': m['role'],
                                'role_name': role_name.get(m['role'], m['role']),
                                'work_count': cnt_map.get(m['username'], 0),
                                'qq': (u.qq if u else '') or '',
                                'avatar': (u.avatar if u else '') or '',
                                'avatar_url': (u.avatar_url if u else ''),
                                'joined_at': m['joined_at']})
        html = _fragment('_members.html', members=member_rows, is_admin=is_admin,
                         created_by=t['created_by'])
        return jsonify({'html': html, 'has_more': has_more})

    @app.route('/team/<int:team_id>/works/ajax')
    def team_works_ajax(team_id):
        """团队详情：共有作品分页"""
        if 'user' not in session:
            return jsonify({'html': '', 'has_more': False}), 401
        page = max(request.args.get('page', 1, type=int), 1)
        me = team_member(team_id, session['user'])
        is_admin = bool(me) and me['role'] in ('owner', 'admin')
        conn = get_team_db()
        tws = conn.execute(
            "SELECT * FROM team_work WHERE team_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            (team_id, WORKS_PER_PAGE + 1, (page - 1) * WORKS_PER_PAGE)).fetchall()
        conn.close()
        has_more = len(tws) > WORKS_PER_PAGE
        works = []
        if tws:
            from .workpool import get_main_db
            wconn = get_main_db()
            wids = [tw['work_id'] for tw in tws[:WORKS_PER_PAGE]]
            ph = ','.join('?' for _ in wids)
            rows = wconn.execute(
                "SELECT id, title, author, thumbnail, view_count, like_count, comment_count, created_at "
                "FROM works WHERE id IN (%s) AND status = 'active' AND is_hidden = 0" % ph, wids).fetchall()
            wconn.close()
            workmap = {r['id']: dict(r) for r in rows}
            works = [dict(workmap[wid]) for wid in wids if wid in workmap]
        html = _fragment('_works.html', works=works, is_admin=is_admin,
                         me_username=session['user'])
        return jsonify({'html': html, 'has_more': has_more})

    @app.route('/team/<int:team_id>/posts/ajax')
    def team_posts_ajax(team_id):
        """团队详情：帖子分页"""
        if 'user' not in session:
            return jsonify({'html': '', 'has_more': False}), 401
        page = max(request.args.get('page', 1, type=int), 1)
        me = team_member(team_id, session['user'])
        is_admin = bool(me) and me['role'] in ('owner', 'admin')
        conn = get_team_db()
        rows = conn.execute(
            "SELECT * FROM team_post WHERE team_id = ? ORDER BY is_pin DESC, created_at DESC, id DESC LIMIT ? OFFSET ?",
            (team_id, POSTS_PER_PAGE + 1, (page - 1) * POSTS_PER_PAGE)).fetchall()
        conn.close()
        has_more = len(rows) > POSTS_PER_PAGE
        html = _fragment('_posts.html', posts=[dict(r) for r in rows[:POSTS_PER_PAGE]],
                         is_admin=is_admin, me_username=session['user'])
        return jsonify({'html': html, 'has_more': has_more})

    @app.route('/team/<int:team_id>/invites/ajax')
    def team_invites_sent_ajax(team_id):
        """团队详情：已发邀请分页（管理员）"""
        if 'user' not in session:
            return jsonify({'html': '', 'has_more': False}), 401
        page = max(request.args.get('page', 1, type=int), 1)
        me = team_member(team_id, session['user'])
        if not me or me['role'] not in ('owner', 'admin'):
            return jsonify({'html': '', 'has_more': False}), 403
        conn = get_team_db()
        rows = conn.execute(
            "SELECT * FROM team_invite WHERE team_id = ? AND status = 'pending' "
            "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            (team_id, INVITES_PER_PAGE + 1, (page - 1) * INVITES_PER_PAGE)).fetchall()
        conn.close()
        has_more = len(rows) > INVITES_PER_PAGE
        html = _fragment('_invites_sent.html', invites=[dict(r) for r in rows[:INVITES_PER_PAGE]])
        return jsonify({'html': html, 'has_more': has_more})