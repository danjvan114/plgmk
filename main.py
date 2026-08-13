import os
import random
import string
from libs.config import app, db, User, MARKETS, USER_DATA_FOLDER
from libs.utils import get_market_path
from libs.database import init_market_database, init_player_database
from libs.market_routes import register_market_routes
from libs.user_routes import register_user_routes
from libs.developer_routes import register_developer_routes
from libs.other_routes import register_other_routes
from libs.file_manager import register_file_manager_routes
from libs.workpool import register_workpool_routes
from libs.team_routes import register_team_routes, init_team_db
import os


with app.app_context():
    if not os.path.exists(USER_DATA_FOLDER):
        os.makedirs(USER_DATA_FOLDER)
    
    for market_id in MARKETS:
        market_path = get_market_path(market_id)
        uploads_path = os.path.join(market_path, 'uploads')
        if not os.path.exists(uploads_path):
            os.makedirs(uploads_path)
    
    db.create_all()
    
    # 迁移：为旧版 users.db 补充 qq / reg_time 列
    from sqlalchemy import inspect as sa_inspect, text as sa_text
    try:
        from sqlalchemy import create_engine
        users_engine = create_engine(app.config['SQLALCHEMY_BINDS']['users'])
        inspector = sa_inspect(users_engine)
        user_cols = [c['name'] for c in inspector.get_columns('user')]
        with users_engine.connect() as conn:
            if 'qq' not in user_cols:
                conn.execute(sa_text("ALTER TABLE user ADD COLUMN qq VARCHAR(20) DEFAULT ''"))
            if 'reg_time' not in user_cols:
                conn.execute(sa_text("ALTER TABLE user ADD COLUMN reg_time VARCHAR(20) DEFAULT ''"))
            if 'bio' not in user_cols:
                conn.execute(sa_text("ALTER TABLE user ADD COLUMN bio VARCHAR(500) DEFAULT ''"))
            if 'banner' not in user_cols:
                conn.execute(sa_text("ALTER TABLE user ADD COLUMN banner VARCHAR(500) DEFAULT ''"))
            conn.commit()
        users_engine.dispose()
    except Exception as e:
        print('user table migration skipped:', e)
    
    # 回填注册时间
    from datetime import datetime
    for u in User.query.all():
        if not u.reg_time:
            u.reg_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.session.commit()
    
    admin_exists = User.query.filter_by(role='admin').first()
    if not admin_exists:
        admin_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        admin = User(username='admin', password=admin_password, role='admin')
        db.session.add(admin)
        db.session.commit()
        print(f"=== 管理员账号已自动创建 ===")
        print(f"用户名: admin")
        print(f"密码: {admin_password}")
        print(f"=============================")

for market_id in MARKETS:
    market_path = get_market_path(market_id)
    upload_folder = os.path.join(market_path, 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    init_market_database(market_id)

init_player_database()
init_team_db()
print("DEBUG: player database initialized")

register_market_routes()
print("DEBUG: market routes registered")
register_user_routes()
print("DEBUG: user routes registered")
register_developer_routes()
print("DEBUG: developer routes registered")
register_other_routes()
print("DEBUG: other routes registered")
register_workpool_routes()
print("DEBUG: workpool routes registered")
register_team_routes()
print("DEBUG: team routes registered")

LOCALCDN_PATH = os.path.join(os.path.dirname(__file__), 'localcdn')
register_file_manager_routes(app, LOCALCDN_PATH)
print("DEBUG: file manager routes registered")

print("\n=== All Registered Routes ===")
for rule in app.url_map.iter_rules():
    methods = ','.join(sorted(rule.methods))
    print(f"  {rule.rule} ({methods}) -> {rule.endpoint}")
print("=============================\n")

if __name__ == '__main__':
    try:
        from waitress import serve
        print("Running with Waitress production WSGI server...")
        # 尝试双栈模式（IPv6 + IPv4）
        
        
        
        print("Falling back to IPv4 only...")
        serve(app, host='0.0.0.0', port=8897, threads=16)
    except ImportError:
        # 开发模式双栈尝试
        try:
            print("Attempting dual-stack mode (development)...")
            app.run(host='::', port=8897)
        except OSError:
            print("Dual-stack failed, falling back to IPv4...")
            app.run(host='0.0.0.0', port=8897)