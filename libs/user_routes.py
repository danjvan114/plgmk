from flask import request, redirect, url_for, session
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
        from .workpool import MAIN_DB_PATH
        works_list = []
        try:
            import sqlite3
            conn = sqlite3.connect(MAIN_DB_PATH)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT id, title, author, like_count, fav_count, comment_count, created_at "
                "FROM works WHERE author = ? ORDER BY id DESC LIMIT 20", (user.username,)
            ).fetchall()
            for row in rows:
                works_list.append({
                    'id': row['id'], 'title': row['title'], 'author': row['author'],
                    'like_count': row['like_count'], 'fav_count': row['fav_count'],
                    'comment_count': row['comment_count'], 'created_at': row['created_at']
                })
            conn.close()
        except Exception:
            pass
        return render_user_profile_template('user_profile.html', profile_user=user, workpool_works=works_list)

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