from flask import session
import os
from .config import MARKETS, market_jinja_envs, root_jinja_env

def get_current_market():
    return session.get('market', 'kn')

def set_market(market_id):
    if market_id in MARKETS:
        session['market'] = market_id

def get_market_path(market_id=None):
    if market_id is None:
        market_id = get_current_market()
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', market_id)

def get_market_db_path(market_id=None):
    if market_id is None:
        market_id = get_current_market()
    return os.path.join(get_market_path(market_id), 'market.db')

def render_market_template(template_name, market_id=None, **kwargs):
    if market_id is None:
        market_id = get_current_market()
    env = market_jinja_envs[market_id]
    template = env.get_template(template_name)
    kwargs['session'] = session
    kwargs['current_market'] = market_id
    kwargs['markets'] = MARKETS
    return template.render(**kwargs)

def render_root_template(template_name, **kwargs):
    template = root_jinja_env.get_template(template_name)
    kwargs['session'] = session
    kwargs['current_market'] = session.get('market', 'kn')
    kwargs['markets'] = MARKETS
    from .config import User
    kwargs['users'] = {u.username: {'role': u.role, 'qq': u.qq or '', 'reg_time': u.reg_time or ''} for u in User.query.all()}
    return template.render(**kwargs)

def render_user_profile_template(template_name, **kwargs):
    """渲染位于 root (template/) 目录下的页面（如 /u/<username> 主页）"""
    template = root_jinja_env.get_template(template_name)
    kwargs['session'] = session
    kwargs['current_market'] = session.get('market', 'kn')
    kwargs['markets'] = MARKETS
    from .config import User
    kwargs['users'] = {u.username: {'role': u.role, 'qq': u.qq or '', 'reg_time': u.reg_time or ''} for u in User.query.all()}
    return template.render(**kwargs)

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def allowed_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'webp'}