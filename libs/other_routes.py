from flask import redirect, url_for, send_from_directory, request, jsonify
import os
import urllib
from .config import app, MARKETS
from .utils import set_market, render_root_template, render_market_template
from .mc_routes import mc_whitelist_add, mc_whitelist_remove, mc_whitelist_list, mc_whitelist_reload, mc_server_info

def register_other_routes():
    @app.route('/')
    def root():
        return render_root_template('index.html')

    @app.route('/about')
    def about():
        return render_root_template('about.html')

    @app.route('/health')
    def health_check():
        print(f"DEBUG: /health endpoint called")
        return {'status': 'ok', 'message': 'Server is running'}

    @app.route('/api/mc/test', methods=['GET', 'POST'])
    def api_mc_test():
        print(f"DEBUG: /api/mc/test called")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request path: {request.path}")
        return jsonify({
            'success': True,
            'message': 'MC API test endpoint works',
            'method': request.method
        })

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

    @app.route('/po/<path:project_name>')
    def project_cdn(project_name):
        project_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn','project')
        if not os.path.exists(project_dir):
            os.makedirs(project_dir)
        return send_from_directory(project_dir, project_name+'.html')

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
                elif entry.lower().endswith('.md'):
                    tree.append({'name': entry, 'type': 'md', 'path': rel_path})
        except Exception:
            pass
        return tree

    def render_tree_html(items, prefix=''):
        html = ''
        for item in items:
            full_path = f"{prefix}/{item['name']}" if prefix else item['name']
            encoded_path = urllib.parse.quote(full_path)
            file_url = f'/localcdn/doc/ot/{encoded_path}'
            if item['type'] == 'folder':
                html += f'''<li>
                    <div class="folder" onclick="toggleFolder(this)">
                        <span class="toggle-icon">▶</span>
                        <span>{item['name']}</span>
                    </div>
                    <ul class="subtree">
                        {render_tree_html(item['children'], full_path)}
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
            elif item['type'] == 'md':
                html += f'''<li>
                    <div class="file md-file" data-url="{file_url}" onclick="loadMD('{file_url}')">{item['name']}</div>
                </li>'''
        return html

    @app.route('/dev/ot')
    def docs_other():
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', 'ot')
        os.makedirs(doc_dir, exist_ok=True)
        
        p_param = request.args.get('p')
        initial_path = []
        if p_param:
            try:
                path_dict = eval(p_param)
                if isinstance(path_dict, dict):
                    initial_path = [str(v) for v in path_dict.values()]
            except:
                pass
        
        doc_tree = build_doc_tree(doc_dir)
        tree_html = render_tree_html(doc_tree)
        
        return render_root_template('docs_other.html', doc_tree=doc_tree, tree_html=tree_html, initial_path=initial_path)

    @app.route('/localcdn/doc/ot/<path:filepath>')
    def doc_other_file(filepath):
        doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localcdn', 'doc', 'ot')
        os.makedirs(doc_dir, exist_ok=True)
        return send_from_directory(doc_dir, filepath)

    @app.route('/api/mc/whitelist/add', methods=['POST'])
    def api_mc_whitelist_add():
        print(f"DEBUG: API /api/mc/whitelist/add called")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request path: {request.path}")
        print(f"DEBUG: Request content type: {request.content_type}")
        result = mc_whitelist_add()
        print(f"DEBUG: API /api/mc/whitelist/add result: {result}")
        return result

    @app.route('/api/mc/whitelist/remove', methods=['POST'])
    def api_mc_whitelist_remove():
        return mc_whitelist_remove()

    @app.route('/api/mc/whitelist/list', methods=['GET'])
    def api_mc_whitelist_list():
        return mc_whitelist_list()

    @app.route('/api/mc/whitelist/reload', methods=['POST'])
    def api_mc_whitelist_reload():
        return mc_whitelist_reload()

    @app.route('/api/mc/server/info', methods=['GET'])
    def api_mc_server_info():
        return mc_server_info()

    @app.route('/mc/register')
    def mc_register():
        return render_root_template('mcreg.html')

    @app.route('/mc')
    def mc_index():
        return redirect('/localcdn/project/mc.html')

    @app.errorhandler(404)
    def page_not_found(e):
        return render_root_template('404.html'), 404