from flask import request, redirect, url_for, session, jsonify
from .config import app, User, db
from .utils import render_market_template, render_root_template, render_user_profile_template
import requests
from datetime import datetime

def register_user_routes():
    @app.route('/auth/redirect')
    def auth_redirect():
        uuid = request.args.get('uuid', '')
        if not uuid:
            return redirect(url_for('login'))
        
        try:
            response = requests.get(f'https://pan1.pgrm.run/api/auth?uuid={uuid}')
            if response.status_code == 200:
                data = response.json()
                if data.get('user_id'):
                    external_id = data['user_id']
                    user = User.query.filter_by(password=external_id).first()
                    if user:
                        session['user'] = user.username
                        session['market'] = 'kn'
                        return redirect(url_for('index'))
                    else:
                        return render_market_template('auth_bind.html', uuid=uuid, error=None)
        except:
            pass
        
        return redirect(url_for('login'))

    @app.route('/auth/bind', methods=['POST'])
    def auth_bind():
        uuid = request.form.get('uuid', '')
        username = request.form.get('username', '').strip()
        
        if not uuid or not username:
            return render_market_template('auth_bind.html', uuid=uuid, error='请填写完整信息')
        
        if User.query.get(username):
            return render_market_template('auth_bind.html', uuid=uuid, error='用户名已存在')
        
        try:
            response = requests.get(f'https://pan1.pgrm.run/api/auth?uuid={uuid}')
            if response.status_code == 200:
                data = response.json()
                if data.get('user_id'):
                    external_id = data['user_id']
                    new_user = User(username=username, password=external_id, role='user', reg_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    db.session.add(new_user)
                    db.session.commit()
                    
                    session['user'] = username
                    session['market'] = 'kn'
                    return redirect(url_for('index'))
        except:
            pass
        
        return render_market_template('auth_bind.html', uuid=uuid, error='绑定失败，请重试')

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
        
        return render_market_template('login.html', error=None, backurl=request.url_root + 'auth/redirect')

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        return redirect(url_for('login'))

    @app.route('/u/<username>')
    def user_profile(username):
        user = User.query.get(username)
        if not user:
            return render_market_template('404.html', message='用户不存在'), 404

        tab = request.args.get('tab', 'works')
        sort = request.args.get('sort', 'new')
        q = request.args.get('q', '').strip()
        page = max(int(request.args.get('page', 1)), 1)
        per_page = 12

        from .workpool import MAIN_DB_PATH, get_main_db
        import sqlite3

        works_list = []
        followers = []
        following = []
        favorites = []
        wall_messages = []
        msg_count = 0
        total_works = 0
        is_following = False
        try:
            conn = get_main_db()
            if tab == 'followers':
                rows = conn.execute(
                    "SELECT user_id FROM follows WHERE follow_user = ? ORDER BY created_at DESC", (user.username,)
                ).fetchall()
                followers = [{'username': r['user_id']} for r in rows]
            elif tab == 'following':
                rows = conn.execute(
                    "SELECT follow_user AS username FROM follows WHERE user_id = ? ORDER BY created_at DESC", (user.username,)
                ).fetchall()
                following = [dict(r) for r in rows]
            elif tab == 'favorites':
                # 收藏列表：扫描各作品 db 的 favorites 表，找出该用户收藏的作品
                from .workpool import WORKPOOL_DIR
                import os as _os
                favs = []
                cursor = conn.execute(
                    "SELECT id, title, author, thumbnail, view_count, db_path, like_count, fav_count, comment_count, coin_count, created_at "
                    "FROM works WHERE status = 'active' AND is_hidden = 0 ORDER BY id DESC LIMIT 100")
                for row in cursor.fetchall():
                    fpath = _os.path.join(WORKPOOL_DIR, row['db_path'])
                    if not _os.path.exists(fpath):
                        continue
                    try:
                        wc = sqlite3.connect(fpath)
                        hit = wc.execute("SELECT id FROM favorites WHERE user_id = ?", (user.username,)).fetchone()
                        wc.close()
                        if hit:
                            favs.append(dict(row))
                    except Exception:
                        pass
                favorites = favs
            else:
                order_sql = {'hot': 'like_count DESC', 'like': 'like_count DESC',
                             'fav': 'fav_count DESC', 'coin': 'coin_count DESC'}.get(sort, 'created_at DESC')
                where_sql = "author = ? AND status = 'active' AND is_hidden = 0"
                params = [user.username]
                if q:
                    where_sql += " AND (title LIKE ? OR tags LIKE ? OR description LIKE ?)"
                    params += [f'%{q}%', f'%{q}%', f'%{q}%']
                total_works = conn.execute(f"SELECT COUNT(*) FROM works WHERE {where_sql}", params).fetchone()[0]
                rows = conn.execute(
                    f"SELECT id, title, author, thumbnail, view_count, like_count, fav_count, comment_count, coin_count, created_at "
                    f"FROM works WHERE {where_sql} ORDER BY {order_sql} LIMIT ? OFFSET ?",
                    params + [per_page, (page - 1) * per_page]
                ).fetchall()
                works_list = [dict(r) for r in rows]
            if 'user' in session:
                row = conn.execute("SELECT id FROM follows WHERE user_id = ? AND follow_user = ?",
                                   (session['user'], user.username)).fetchone()
                is_following = row is not None
            try:
                msg_count = conn.execute(
                    "SELECT COUNT(*) AS c FROM messages WHERE to_user = ? AND is_read = 0",
                    (user.username,)).fetchone()['c']
            except Exception:
                msg_count = 0
            try:
                wrows = conn.execute(
                    "SELECT id, from_user, content, created_at FROM wall_messages WHERE username = ? ORDER BY created_at DESC LIMIT 50",
                    (user.username,)).fetchall()
                wall_messages = [dict(r) for r in wrows]
            except Exception:
                wall_messages = []
            conn.close()
        except Exception:
            pass

        return render_user_profile_template('user_profile.html', profile_user=user, workpool_works=works_list,
                                            tab=tab, sort=sort, q=q, page=page, per_page=per_page,
                                            total_works=total_works, total_pages=(total_works + per_page - 1) // per_page,
                                            followers=followers, following=following, favorites=favorites,
                                            is_following=is_following, msg_count=msg_count, wall_messages=wall_messages)

    @app.route('/user/set_bio', methods=['POST'])
    def user_set_bio():
        if 'user' not in session:
            return redirect(url_for('login'))
        bio = request.form.get('bio', '').strip()[:500]
        user = User.query.get(session['user'])
        if user:
            user.bio = bio
            db.session.commit()
            return redirect(url_for('user_profile', username=user.username))
        return redirect(url_for('login'))

    @app.route('/user/set_banner', methods=['POST'])
    def user_set_banner():
        if 'user' not in session:
            return redirect(url_for('login'))
        banner = request.form.get('banner', '').strip()[:500]
        user = User.query.get(session['user'])
        if user:
            user.banner = banner
            db.session.commit()
            return redirect(url_for('user_profile', username=user.username))
        return redirect(url_for('login'))

    @app.route('/user/set_qq', methods=['POST'])
    def user_set_qq():
        if 'user' not in session:
            return redirect(url_for('login'))
        qq = request.form.get('qq', '').strip()
        user = User.query.get(session['user'])
        if user:
            if qq and not qq.isdigit():
                return render_market_template('change_password.html', users={u.username: u.to_dict() for u in User.query.all()}, qq_error='QQ号仅支持数字')
            user.qq = qq if qq.isdigit() else ''
            db.session.commit()
            return redirect(url_for('user_profile', username=user.username))
        return redirect(url_for('login'))

    @app.route('/u/<username>/wall', methods=['POST'])
    def post_wall_message(username):
        """发布留言到用户主页留言墙"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        if not User.query.get(username):
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        content = request.form.get('content', '').strip()[:1000]
        if not content:
            return jsonify({'success': False, 'message': '留言内容不能为空'}), 400
        try:
            from .workpool import get_main_db, send_message
            conn = get_main_db()
            conn.execute("INSERT INTO wall_messages (username, from_user, content) VALUES (?, ?, ?)",
                         (username, session['user'], content))
            conn.commit()
            conn.close()
            if session['user'] != username:
                send_message(username, 'wall', content, from_user=session['user'])
        except Exception:
            return jsonify({'success': False, 'message': '留言失败，请重试'}), 500
        return jsonify({'success': True, 'message': '留言发布成功'})

    @app.route('/u/<username>/wall/delete/<int:msg_id>', methods=['POST'])
    def delete_wall_message(username, msg_id):
        """删除留言：仅留言作者或墙主或管理员可删"""
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        try:
            from .workpool import get_main_db, is_admin_user
            conn = get_main_db()
            row = conn.execute(
                "SELECT from_user FROM wall_messages WHERE id = ? AND username = ?",
                (msg_id, username)).fetchone()
            if row is None:
                conn.close()
                return jsonify({'success': False, 'message': '留言不存在'}), 404
            if row['from_user'] != session['user'] and session['user'] != username and not is_admin_user(session['user']):
                conn.close()
                return jsonify({'success': False, 'message': '无权限删除'}), 403
            conn.execute("DELETE FROM wall_messages WHERE id = ? AND username = ?", (msg_id, username))
            conn.commit()
            conn.close()
        except Exception:
            return jsonify({'success': False, 'message': '删除失败'}), 500
        return jsonify({'success': True, 'message': '删除成功'})

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