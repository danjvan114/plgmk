from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from jinja2 import Environment, FileSystemLoader
import os

USER_DATA_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', 'userdata')
MARKETS = {'kn': 'KN插件市场', 'k4u': 'K4U插件市场'}

app = Flask(__name__)

market_jinja_envs = {}
market_template_dirs = {}
for market_id in MARKETS:
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mk', market_id, 'template')
    market_template_dirs[market_id] = template_dir
    market_jinja_envs[market_id] = Environment(loader=FileSystemLoader(template_dir))

ROOT_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'template')
root_jinja_env = Environment(loader=FileSystemLoader(ROOT_TEMPLATE_DIR))

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'plugin-market-secret-key')
app.config['DEBUG'] = False
app.config['ALLOWED_EXTENSIONS'] = {'zip', 'rar', 'py', 'tar', 'gz', 'js'}
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['SQLALCHEMY_BINDS'] = {
    'users': f'sqlite:///{USER_DATA_FOLDER}/users.db'
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    __bind_key__ = 'users'
    username = db.Column(db.String(50), primary_key=True)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='user')
    
    def to_dict(self):
        return {'username': self.username, 'password': self.password, 'role': self.role}