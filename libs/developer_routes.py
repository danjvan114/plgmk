from flask import request, redirect, url_for, session, send_from_directory
import os
import urllib
from .config import app, MARKETS, User
from .utils import set_market, render_market_template, render_root_template
from .database import get_all_plugins

def register_developer_routes():
    @app.route('/dev/<market_id>')
    def developer_center(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        if 'user' not in session:
            return redirect(url_for('login'))
        
        set_market(market_id)
        
        all_plugins = get_all_plugins(market_id)
        user_plugins = [p for p in all_plugins if p['author'] == session['user']]
        total_downloads = sum(p['download_count'] for p in user_plugins)
        total_ratings = sum(p['rating_count'] for p in user_plugins)
        avg_rating = sum(p['rating'] * p['rating_count'] for p in user_plugins) / total_ratings if total_ratings > 0 else 0
        
        user = User.query.get(session['user'])
        is_admin = user and user.role == 'admin'
        
        return render_market_template('developer_center.html', market_id=market_id,
                                      plugins_count=len(user_plugins),
                                      total_downloads=total_downloads,
                                      total_ratings=total_ratings,
                                      avg_rating=avg_rating,
                                      user_plugins=user_plugins,
                                      is_admin=is_admin)

    @app.route('/dev/kn')
    def developer_center_kn():
        return developer_center('kn')

    def build_doc_tree(dir_path, base_path=''):
        tree = []
        try:
            entries = os.listdir(dir_path)
            entries.sort(key=lambda x: (os.path.isdir(os.path.join(dir_path, x)), x.lower()))
            for entry in entries:
                full_path = os.path.join(dir_path, entry)
                rel_path = f"{base_path}/{entry}" if base_path else entry
                if os.path.isdir(full_path):
                    children = build_doc_tree(full_path, rel_path)
                    tree.append({'name': entry, 'type': 'folder', 'children': children})
                elif entry.lower().endswith('.pdf'):
                    tree.append({'name': entry, 'type': 'pdf', 'path': rel_path})
                elif entry.lower().endswith('.js'):
                    tree.append({'name': entry, 'type': 'js', 'path': rel_path})
                elif entry.lower().endswith('.ttmp4'):
                    tree.append({'name': entry, 'type': 'ttmp4', 'path': rel_path})
        except Exception:
            pass
        return tree

    def render_tree_html(items, prefix='', market_id=''):
        html = ''
        for item in items:
            full_path = f"{prefix}/{item['name']}" if prefix else item['name']
            encoded_path = urllib.parse.quote(full_path)
            file_url = f'/localcdn/doc/{market_id}/{encoded_path}'
            if item['type'] == 'folder':
                html += f'''<li>
                    <div class="folder" onclick="toggleFolder(this)">
                        <span class="toggle-icon">▶</span>
                        <span>{item['name']}</span>
                    </div>
                    <ul class="subtree">
                        {render_tree_html(item['children'], full_path, market_id)}
                    </ul>
                </li>'''
            elif item['type'] == 'pdf':
                html += f'''<li>
                    <div class="file pdf-file" data-url="{file_url}" onclick="loadPDF('{file_url}')">{item['name']}</div>
                </li>'''
            elif item['type'] == 'js':
                html += f'''<li>
                    <div class="file js-file" data-url="{file_url}" onclick="loadJS('{file_url}')">{item['name']}</div>
                </li>'''
            elif item['type'] == 'ttmp4':
                html += f'''<li>
                    <div class="file ttmp4-file" data-url="{file_url}" onclick="loadTTMP4('{file_url}')">{item['name']}</div>
                </li>'''
        return html

    @app.route('/dev/kn/docs')
    def docs_kn():
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', 'kn')
        os.makedirs(doc_dir, exist_ok=True)
        doc_tree = build_doc_tree(doc_dir)
        tree_html = render_tree_html(doc_tree, market_id='kn')
        
        return render_market_template('docs.html', market_id='kn', doc_tree=doc_tree, tree_html=tree_html)

    @app.route('/dev/<market_id>/docs')
    def docs(market_id):
        if market_id not in MARKETS:
            return render_root_template('404.html'), 404
        
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', market_id)
        os.makedirs(doc_dir, exist_ok=True)
        doc_tree = build_doc_tree(doc_dir)
        tree_html = render_tree_html(doc_tree, market_id=market_id)
        
        return render_market_template('docs.html', market_id=market_id, doc_tree=doc_tree, tree_html=tree_html)