#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单IPv6反向代理工具
功能：监听IPv6地址，将请求转发到目标服务器
"""

import http.server
import socketserver
import socket
import urllib.request
import urllib.parse
import threading
import sys

class ReverseProxyHandler(http.server.BaseHTTPRequestHandler):
    TARGET_URL = None
    
    def do_GET(self):
        self._proxy_request('GET')
    
    def do_POST(self):
        self._proxy_request('POST')
    
    def do_PUT(self):
        self._proxy_request('PUT')
    
    def do_DELETE(self):
        self._proxy_request('DELETE')
    
    def do_PATCH(self):
        self._proxy_request('PATCH')
    
    def do_HEAD(self):
        self._proxy_request('HEAD')
    
    def do_OPTIONS(self):
        self._proxy_request('OPTIONS')
    
    def _proxy_request(self, method):
        try:
            target_url = self.TARGET_URL
            if not target_url:
                self.send_error(500, '代理目标未配置')
                return
            
            full_url = target_url.rstrip('/') + self.path
            
            headers = {key: value for key, value in self.headers.items() if key.lower() != 'host'}
            
            body = None
            content_length = self.headers.get('Content-Length')
            if content_length:
                body = self.rfile.read(int(content_length))
            
            req = urllib.request.Request(full_url, data=body, method=method, headers=headers)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                
                for header, value in response.getheaders():
                    if header.lower() not in ('transfer-encoding', 'connection'):
                        self.send_header(header, value)
                self.end_headers()
                
                response_data = response.read()
                self.wfile.write(response_data)
                
                print(f"[{method}] {self.path} -> {response.status}")
        
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for header, value in e.headers.items():
                if header.lower() not in ('transfer-encoding', 'connection'):
                    self.send_header(header, value)
            self.end_headers()
            
            error_body = e.read()
            self.wfile.write(error_body)
            
            print(f"[{method}] {self.path} -> {e.code} (ERROR)")
        
        except Exception as e:
            self.send_error(502, f'代理错误: {str(e)}')
            print(f"[{method}] {self.path} -> 502 (EXCEPTION: {str(e)})")
    
    def log_message(self, format, *args):
        pass

def start_proxy(listen_port, target_url, listen_host='::'):
    ReverseProxyHandler.TARGET_URL = target_url
    
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
        address_family = socket.AF_INET6
    
    try:
        server = ReusableTCPServer((listen_host, listen_port), ReverseProxyHandler)
        
        print(f"=" * 50)
        print(f"IPv6 反向代理已启动")
        print(f"监听地址: [{listen_host}]:{listen_port}")
        print(f"转发目标: {target_url}")
        print(f"=" * 50)
        print(f"访问示例: http://[你的IPv6地址]:{listen_port}/api/xxx")
        print(f"按 Ctrl+C 停止代理")
        print(f"=" * 50)
        
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n代理已停止")
        server.shutdown()
    except Exception as e:
        print(f"启动失败: {str(e)}")
        print(f"提示: 如果IPv6不可用，可以尝试使用 -H 0.0.0.0 监听IPv4")
        sys.exit(1)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='简单IPv6反向代理工具')
    parser.add_argument('-p', '--port', type=int, default=80, help='监听端口 (默认: 80)')
    parser.add_argument('-t', '--target', type=str, default='https://knhx.pgrm.run/', help='目标服务器URL (默认: https://knhx.pgrm.run/)')
    parser.add_argument('-H', '--host', type=str, default='::', help='监听地址 (默认: :: 即IPv6)')
    
    args = parser.parse_args()
    
    start_proxy(args.port, args.target, args.host)