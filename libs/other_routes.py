from flask import redirect, url_for, send_from_directory
import os
from .config import app, MARKETS
from .utils import set_market, render_root_template, render_market_template

def register_other_routes():
    @app.route('/')
    def root():
        return render_root_template('index.html')

    @app.route('/about')
    def about():
        return render_root_template('about.html')





    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'message': 'Server is running'}

    @app.route('/ping')
    def ping():
        return 'pong'

    @app.route('/static/<path:filename>')
    def root_static_files(filename):
        static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
        return send_from_directory(static_dir, filename)

    @app.route('/localcdn/<path:filename>')
    def local_cdn(filename):
        localcdn_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn')
        if not os.path.exists(localcdn_dir):
            os.makedirs(localcdn_dir)
        return send_from_directory(localcdn_dir, filename)

    @app.route('/app/kn/d')
    def app_kn_detail():
        users = {}
        from .config import User
        users = {u.username: u.to_dict() for u in User.query.all()}
        return render_market_template('app_detail.html', market_id='kn', users=users)

    @app.route('/switch_market/<market_id>')
    def switch_market(market_id):
        if market_id in MARKETS:
            set_market(market_id)
        return redirect(url_for('market_index', market_id=market_id))

    @app.errorhandler(404)
    def page_not_found(e):
        return render_root_template('404.html'), 404