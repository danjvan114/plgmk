from flask import request, jsonify, redirect, url_for
import socket
from .config import app
from .utils import render_root_template

def register_mc_routes():
    class RCONConnection:
        def __init__(self, host='127.0.0.1', port=25575, password='123456', timeout=5):
            self.host = host
            self.port = port
            self.password = password
            self.timeout = timeout
            self.socket = None
        
        def connect(self):
            try:
                self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.socket.settimeout(self.timeout)
                self.socket.connect((self.host, self.port))
                return self._authenticate()
            except Exception as e:
                return False
        
        def _authenticate(self):
            try:
                password_packet = self._create_packet(3, self.password)
                self.socket.send(password_packet)
                response = self._read_response()
                if response and response['type'] == 2:
                    return True
                return False
            except Exception as e:
                return False
        
        def _create_packet(self, packet_type, payload):
            payload_bytes = payload.encode('utf-8')
            length = len(payload_bytes) + 10
            packet = bytearray()
            packet.extend(length.to_bytes(4, byteorder='little'))
            packet.extend((0).to_bytes(4, byteorder='little'))
            packet.extend(packet_type.to_bytes(4, byteorder='little'))
            packet.extend(payload_bytes)
            packet.append(0)
            return packet
        
        def _read_response(self):
            try:
                length_data = self.socket.recv(4)
                if len(length_data) < 4:
                    return None
                length = int.from_bytes(length_data, byteorder='little')
                data = self.socket.recv(length)
                if len(data) < length:
                    return None
                
                request_id = int.from_bytes(data[0:4], byteorder='little')
                packet_type = int.from_bytes(data[4:8], byteorder='little')
                payload = data[8:-2].decode('utf-8')
                
                return {
                    'request_id': request_id,
                    'type': packet_type,
                    'payload': payload
                }
            except Exception as e:
                return None
        
        def send_command(self, command):
            if not self.socket:
                if not self.connect():
                    return None
            
            try:
                command_packet = self._create_packet(2, command)
                self.socket.send(command_packet)
                response = self._read_response()
                return response['payload'] if response else None
            except Exception as e:
                return None
        
        def close(self):
            if self.socket:
                try:
                    self.socket.close()
                except:
                    pass
    
    @app.route('/api/mc/whitelist/add', methods=['POST'])
    def mc_whitelist_add():
        data = request.get_json()
        
        if not data or 'username' not in data:
            return jsonify({
                'success': False,
                'message': '缺少用户名参数'
            }), 400
        
        username = data['username'].strip()
        
        if not username:
            return jsonify({
                'success': False,
                'message': '用户名不能为空'
            }), 400
        
        rcon = RCONConnection(host='127.0.0.1', port=25575, password='123456')
        
        try:
            if not rcon.connect():
                return jsonify({
                    'success': False,
                    'message': '无法连接到服务器'
                }), 503
            
            result = rcon.send_command(f'whitelist add {username}')
            
            if result:
                if 'added' in result.lower() or '已添加' in result:
                    return jsonify({
                        'success': True,
                        'message': f'玩家 {username} 已成功添加到白名单',
                        'result': result
                    })
                elif 'already' in result.lower() or '已存在' in result:
                    return jsonify({
                        'success': False,
                        'message': f'玩家 {username} 已在白名单中',
                        'result': result
                    }), 409
                else:
                    return jsonify({
                        'success': True,
                        'message': f'命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'服务器内部错误: {str(e)}'
            }), 500
        finally:
            rcon.close()
    
    @app.route('/api/mc/whitelist/remove', methods=['POST'])
    def mc_whitelist_remove():
        data = request.get_json()
        
        if not data or 'username' not in data:
            return jsonify({
                'success': False,
                'message': '缺少用户名参数'
            }), 400
        
        username = data['username'].strip()
        
        if not username:
            return jsonify({
                'success': False,
                'message': '用户名不能为空'
            }), 400
        
        rcon = RCONConnection(host='127.0.0.1', port=25575, password='123456')
        
        try:
            if not rcon.connect():
                return jsonify({
                    'success': False,
                    'message': '无法连接到服务器'
                }), 503
            
            result = rcon.send_command(f'whitelist remove {username}')
            
            if result:
                if 'removed' in result.lower() or '已移除' in result:
                    return jsonify({
                        'success': True,
                        'message': f'玩家 {username} 已从白名单移除',
                        'result': result
                    })
                elif 'not found' in result.lower() or '不存在' in result:
                    return jsonify({
                        'success': False,
                        'message': f'玩家 {username} 不在白名单中',
                        'result': result
                    }), 404
                else:
                    return jsonify({
                        'success': True,
                        'message': '命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'服务器内部错误: {str(e)}'
            }), 500
        finally:
            rcon.close()
    
    @app.route('/api/mc/whitelist/list', methods=['GET'])
    def mc_whitelist_list():
        rcon = RCONConnection(host='127.0.0.1', port=25575, password='123456')
        
        try:
            if not rcon.connect():
                return jsonify({
                    'success': False,
                    'message': '无法连接到服务器'
                }), 503
            
            result = rcon.send_command('whitelist list')
            
            if result:
                lines = result.strip().split('\n')
                players = []
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('There are') and not line.startswith('白名单中有'):
                        players.append(line.strip())
                
                return jsonify({
                    'success': True,
                    'players': players,
                    'count': len(players),
                    'raw_result': result
                })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'服务器内部错误: {str(e)}'
            }), 500
        finally:
            rcon.close()
    
    @app.route('/api/mc/whitelist/reload', methods=['POST'])
    def mc_whitelist_reload():
        rcon = RCONConnection(host='127.0.0.1', port=25575, password='123456')
        
        try:
            if not rcon.connect():
                return jsonify({
                    'success': False,
                    'message': '无法连接到服务器'
                }), 503
            
            result = rcon.send_command('whitelist reload')
            
            if result:
                if 'reloaded' in result.lower() or '已重载' in result:
                    return jsonify({
                        'success': True,
                        'message': '白名单已重载',
                        'result': result
                    })
                else:
                    return jsonify({
                        'success': True,
                        'message': '命令执行成功',
                        'result': result
                    })
            else:
                return jsonify({
                    'success': False,
                    'message': '未收到服务器响应'
                }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'服务器内部错误: {str(e)}'
            }), 500
        finally:
            rcon.close()
    
    @app.route('/api/mc/server/info', methods=['GET'])
    def mc_server_info():
        rcon = RCONConnection(host='127.0.0.1', port=25575, password='123456')
        
        try:
            if not rcon.connect():
                return jsonify({
                    'success': False,
                    'message': '无法连接到服务器'
                }), 503
            
            version = rcon.send_command('version')
            players = rcon.send_command('list')
            
            return jsonify({
                'success': True,
                'version': version.strip() if version else None,
                'player_list': players.strip() if players else None
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'服务器内部错误: {str(e)}'
            }), 500
        finally:
            rcon.close()
    
    @app.route('/mc/register')
    def mc_register():
        return render_root_template('mcreg.html')
    
    @app.route('/mc')
    def mc_index():
        return redirect('/localcdn/project/mc.html')
    
    @app.route('/api/mc/whitelist/add', methods=['POST'])
    def mc_whitelist_add_public():
        return mc_whitelist_add()
    
    @app.route('/api/mc/whitelist/remove', methods=['POST'])
    def mc_whitelist_remove_public():
        return mc_whitelist_remove()
    
    @app.route('/api/mc/whitelist/list', methods=['GET'])
    def mc_whitelist_list_public():
        return mc_whitelist_list()
    
    @app.route('/api/mc/whitelist/reload', methods=['POST'])
    def mc_whitelist_reload_public():
        return mc_whitelist_reload()
    
    @app.route('/api/mc/server/info', methods=['GET'])
    def mc_server_info_public():
        return mc_server_info()