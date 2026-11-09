#!/usr/bin/env python3
"""Tiny static server with no caching, so edited .glb files show up on reload. Usage: serve.py [port]"""
import http.server, socketserver, sys, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.json': 'application/json'}
    def log_message(self, *a): pass
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', port), H) as s:
    print(f'LOTUS on http://localhost:{port}  (Ctrl+C to stop)'); s.serve_forever()
