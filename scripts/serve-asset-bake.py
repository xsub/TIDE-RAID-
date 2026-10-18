import http.server
import os
from pathlib import Path

root = Path(os.environ['TIDE_ASSET_SOURCE'])
output = Path(os.environ['TIDE_ASSET_OUTPUT'])

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        names = {'/bake/fir_sapling_medium.png', '/bake/tree_small_02.png'}
        length = int(self.headers.get('Content-Length', '0'))
        if self.path not in names or length < 1 or length > 12000000:
            self.send_error(400)
            return
        output.mkdir(parents=True, exist_ok=True)
        (output / Path(self.path).name).write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.end_headers()

http.server.HTTPServer(('127.0.0.1', 5174), Handler).serve_forever()
