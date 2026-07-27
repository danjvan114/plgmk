import os
import random
import string
from libs.config import app, db, User, MARKETS, USER_DATA_FOLDER
from libs.utils import get_market_path
from libs.database import init_market_database
from libs.market_routes import register_market_routes
from libs.user_routes import register_user_routes
from libs.developer_routes import register_developer_routes
from libs.other_routes import register_other_routes


with app.app_context():
    if not os.path.exists(USER_DATA_FOLDER):
        os.makedirs(USER_DATA_FOLDER)
    
    for market_id in MARKETS:
        market_path = get_market_path(market_id)
        uploads_path = os.path.join(market_path, 'uploads')
        if not os.path.exists(uploads_path):
            os.makedirs(uploads_path)
    
    db.create_all()
    
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

register_market_routes()
print("DEBUG: market routes registered")
register_user_routes()
print("DEBUG: user routes registered")
register_developer_routes()
print("DEBUG: developer routes registered")
register_other_routes()
print("DEBUG: other routes registered")

print("\n=== All Registered Routes ===")
for rule in app.url_map.iter_rules():
    methods = ','.join(sorted(rule.methods))
    print(f"  {rule.rule} ({methods}) -> {rule.endpoint}")
print("=============================\n")

if __name__ == '__main__':
    try:
        from waitress import serve
        print("Running with Waitress production WSGI server...")
        serve(app, host='0.0.0.0', port=8897)
    except ImportError:
        app.run(host='0.0.0.0', port=8897)