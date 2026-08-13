from flask import request, redirect, url_for, session, jsonify
from .config import app, db, User, root_jinja_env, market_jinja_envs
from .utils import render_root_template
from datetime import datetime


class Team(db.Model):
    __bind_key__ = 'users'
    __tablename__ = 'team'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(1000), default='')
    cover = db.Column(db.String(500), default='')
    qq = db.Column(db.String(20), default='')          # QQ 号 -> 图标调用 qlogo API
    bulletin = db.Column(db.Text, default='')           # 告示牌
    created_by = db.Column(db.String(50), default='')
    created_at = db.Column(db.String(30), default='')


class TeamMember(db.Model):
    __bind_key__ = 'users'
    __tablename__ = 'team_member'
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default='member')   # owner / admin / member
    joined_at = db.Column(db.String(30), default='')


def user_team(username):
    """返回某个成员所属的团队（单一），None 表示未加入团队"""
    if not username:
        return None
    return Team.query.join(TeamMember, TeamMember.team_id == Team.id).filter(
        TeamMember.username == username).first()


def user_team_badge(username):
    """返回团队徽标 span HTML（用于模板插入）"""
    t = user_team(username)
    if not t:
        return ''
    return ('<span class="tea-badge" title="隶属团队：%s">'
            '<i class="fa-solid fa-building"></i> %s</span>') % (
        t.name, t.name)


def member_users(team_id):
    return User.query.join(TeamMember, TeamMember.username == User.username).filter(
        TeamMember.team_id == team_id).all()


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
        teams = Team.query.order_by(Team.created_at.desc(), Team.id.desc()).all()
        # 统计成员数
        rows = db.session.execute(
            "SELECT team_id, COUNT(*) c FROM team_member GROUP BY team_id"
        ).fetchall()
        counts = {r[0]: r[1] for r in rows}
        team_list = []
        for t in teams:
            d = {'id': t.id, 'name': t.name, 'description': t.description, 'cover': t.cover,
                 'qq': t.qq, 'bulletin': t.bulletin, 'created_by': t.created_by,
                 'created_at': t.created_at, 'member_count': counts.get(t.id, 0),
                 'avatar_url': ('https://q1.qlogo.cn/g?b=qq&nk=%s&s=100' % t.qq) if t.qq else ''}
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
        if Team.query.filter_by(name=name).first():
            return jsonify({'success': False, 'message': '团队名称已存在'}), 400
        t = Team(name=name, description=desc, cover=cover, qq=qq,
                 created_by=session['user'], created_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        db.session.add(t)
        db.session.commit()
        m = TeamMember(team_id=t.id, username=session['user'], role='owner',
                       joined_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        db.session.add(m)
        db.session.commit()
        return jsonify({'success': True, 'message': '团队创建成功', 'team_id': t.id})

    @app.route('/team/<int:team_id>')
    def team_detail(team_id):
        t = Team.query.get(team_id)
        if not t:
            return render_root_template('404.html'), 404
        members = member_users(team_id)
        member_rows = []
        for u in members:
            m = TeamMember.query.filter_by(team_id=team_id, username=u.username).first()
            member_rows.append({'username': u.username, 'role': (m.role if m else 'member'),
                                'qq': u.qq or '', 'avatar_url': (u.qq_avatar_url or ''),
                                'joined_at': (m.joined_at if m else '')})
        # 团队成员的作品（取最新 30 条，不一次性加载全部）
        authors = [m.username for m in members]
        works = []
        if authors:
            from .workpool import get_main_db
            conn = get_main_db()
            placeholders = ','.join('?' for _ in authors)
            rows = conn.execute(
                "SELECT id, title, author, thumbnail, view_count, like_count, comment_count, created_at "
                "FROM works WHERE author IN (%s) AND status = 'active' AND is_hidden = 0 "
                "ORDER BY created_at DESC LIMIT 30" % placeholders, authors).fetchall()
            for r in rows:
                works.append(dict(r))
            conn.close()
        me = TeamMember.query.filter_by(team_id=team_id, username=session.get('user', '')).first() if session.get('user') else None
        is_admin = me and me.role in ('owner', 'admin')
        return render_root_template('team/detail.html', team={'id': t.id, 'name': t.name, 'description': t.description,
                                       'cover': t.cover, 'qq': t.qq, 'bulletin': t.bulletin,
                                       'avatar_url': ('https://q1.qlogo.cn/g?b=qq&nk=%s&s=200' % t.qq) if t.qq else '',
                                       'created_by': t.created_by, 'created_at': t.created_at},
                                    members=member_rows, works=works, me=me, is_member=bool(me),
                                    is_owner=(me and me.role == 'owner'), is_admin=is_admin)

    @app.route('/team/<int:team_id>/edit', methods=['POST'])
    def team_edit(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        t = Team.query.get(team_id)
        if not t:
            return jsonify({'success': False, 'message': '团队不存在'}), 404
        me = TeamMember.query.filter_by(team_id=team_id, username=session['user']).first()
        if not me or me.role not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        data = request.form
        t.name = (data.get('name') or t.name).strip() or t.name
        t.description = data.get('description', t.description) or t.description
        t.cover = data.get('cover', t.cover) or t.cover
        t.qq = (data.get('qq') or '').strip() or t.qq
        t.bulletin = data.get('bulletin', t.bulletin)
        db.session.commit()
        return jsonify({'success': True, 'message': '已保存'})

    @app.route('/team/<int:team_id>/delete', methods=['POST'])
    def team_delete(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        t = Team.query.get(team_id)
        if not t:
            return jsonify({'success': False, 'message': '团队不存在'}), 404
        me = TeamMember.query.filter_by(team_id=team_id, username=session['user']).first()
        if not me or me.role != 'owner':
            return jsonify({'success': False, 'message': '无权限'}), 403
        TeamMember.query.filter_by(team_id=team_id).delete()
        db.session.delete(t)
        db.session.commit()
        return redirect('/team')

    @app.route('/team/<int:team_id>/members/add', methods=['POST'])
    def team_member_add(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = TeamMember.query.filter_by(team_id=team_id, username=session['user']).first()
        if not me or me.role not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        username = (request.form.get('username') or '').strip()
        if not username:
            return jsonify({'success': False, 'message': '请输入用户名'}), 400
        user = User.query.get(username)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        if TeamMember.query.filter_by(team_id=team_id, username=username).first():
            return jsonify({'success': False, 'message': '已在团队中'}), 400
        if user_team(username):
            return jsonify({'success': False, 'message': '该用户已在其他团队中'}), 400
        db.session.add(TeamMember(team_id=team_id, username=username, role='member',
                                  joined_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        db.session.commit()
        return jsonify({'success': True, 'message': '已添加成员'})

    @app.route('/team/<int:team_id>/members/remove', methods=['POST'])
    def team_member_remove(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = TeamMember.query.filter_by(team_id=team_id, username=session['user']).first()
        if not me or me.role not in ('owner', 'admin'):
            return jsonify({'success': False, 'message': '无权限'}), 403
        username = (request.form.get('username') or '').strip()
        if not username:
            return jsonify({'success': False, 'message': '请输入用户名'}), 400
        if me.role != 'owner' and session['user'] == username:
            return jsonify({'success': False, 'message': '管理员不能移除自己'}), 400
        deleted = TeamMember.query.filter_by(team_id=team_id, username=username).delete()
        db.session.commit()
        return jsonify({'success': True, 'message': '已移除成员', 'removed': bool(deleted)})

    @app.route('/team/<int:team_id>/leave', methods=['POST'])
    def team_leave(team_id):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        me = TeamMember.query.filter_by(team_id=team_id, username=session['user']).first()
        if not me:
            return jsonify({'success': False, 'message': '你不在该团队中'}), 400
        if me.role == 'owner':
            return jsonify({'success': False, 'message': '团长不能直接退出，请解散团队'}), 400
        db.session.delete(me)
        db.session.commit()
        return jsonify({'success': True, 'message': '已退出团队'})
