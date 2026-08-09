from flask import request, redirect, url_for, session
from .config import app, User, db
from .utils import render_market_template, render_root_template
import requests

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
                    new_user = User(username=username, password=external_id, role='user')
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