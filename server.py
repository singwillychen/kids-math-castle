#!/usr/bin/env python3
"""公主與青蛙的數學城堡：選用的小型伺服器（不需安裝任何套件）

放在 NAS 或家裡一台電腦上執行，所有平板、電腦連到同一個網址，
就會共用同一份帳號與練習紀錄（存在 data 資料夾裡的 JSON 檔）。

用法：
    python3 server.py                 # 預設 port 8080，資料存在 ./data
    python3 server.py --port 8888 --data /volume1/homes/me/math-data

注意：沒有帳號密碼保護，只適合在家裡的區域網路使用，不要開放到網際網路。
"""
import argparse
import json
import os
import re
import shutil
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,48}$')
MAX_BODY = 4 * 1024 * 1024
LOCK = threading.Lock()
DATA_DIR = os.path.join(ROOT, 'data')


def read_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, obj):
    # 先寫暫存檔再改名，避免寫到一半斷電時壞檔
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # 只印出存檔相關與錯誤訊息，畫面比較乾淨
        msg = fmt % args
        if '/api/' in msg or fmt.startswith('code'):
            super().log_message('%s', msg)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError('body size')
        return json.loads(self.rfile.read(n).decode('utf-8'))

    def route(self):
        return unquote(urlparse(self.path).path)

    def do_GET(self):
        path = self.route()
        if path == '/api/ping':
            return self.send_json({'app': 'math-castle', 'time': int(time.time() * 1000)})
        if path == '/api/db':
            with LOCK:
                settings = read_json(os.path.join(DATA_DIR, 'settings.json'), {})
                profiles = {}
                for name in os.listdir(os.path.join(DATA_DIR, 'profiles')):
                    if name.endswith('.json'):
                        p = read_json(os.path.join(DATA_DIR, 'profiles', name))
                        if isinstance(p, dict) and p.get('id'):
                            profiles[p['id']] = p
            return self.send_json({'settings': settings, 'profiles': profiles})
        # 不提供資料夾、伺服器程式與隱藏檔
        first = path.strip('/').split('/')[0]
        if first in ('data', 'server.py') or first.startswith('.') or path.startswith('/api/'):
            return self.send_error(404)
        return super().do_GET()

    def do_PUT(self):
        path = self.route()
        try:
            body = self.read_body()
        except ValueError:
            return self.send_json({'error': 'bad request'}, 400)
        if not isinstance(body, dict):
            return self.send_json({'error': 'bad request'}, 400)
        if path == '/api/settings':
            with LOCK:
                write_json(os.path.join(DATA_DIR, 'settings.json'), body)
            return self.send_json({'ok': True})
        m = re.fullmatch(r'/api/profile/([^/]+)', path)
        if m and ID_RE.match(m.group(1)) and body.get('id') == m.group(1):
            with LOCK:
                write_json(os.path.join(DATA_DIR, 'profiles', m.group(1) + '.json'), body)
            return self.send_json({'ok': True})
        return self.send_json({'error': 'not found'}, 404)

    def do_DELETE(self):
        m = re.fullmatch(r'/api/profile/([^/]+)', self.route())
        if not (m and ID_RE.match(m.group(1))):
            return self.send_json({'error': 'not found'}, 404)
        src = os.path.join(DATA_DIR, 'profiles', m.group(1) + '.json')
        with LOCK:
            if os.path.exists(src):
                # 不直接刪掉，搬到 trash 資料夾，萬一誤刪還找得回來
                dst = os.path.join(DATA_DIR, 'trash', f'{m.group(1)}-{int(time.time())}.json')
                shutil.move(src, dst)
        return self.send_json({'ok': True})


def main():
    global DATA_DIR
    ap = argparse.ArgumentParser(description='公主與青蛙的數學城堡伺服器')
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--host', default='0.0.0.0')
    ap.add_argument('--data', default=os.path.join(ROOT, 'data'), help='紀錄存放資料夾')
    args = ap.parse_args()
    DATA_DIR = os.path.abspath(args.data)
    for sub in ('profiles', 'trash'):
        os.makedirs(os.path.join(DATA_DIR, sub), exist_ok=True)
    server = ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=ROOT))
    print(f'數學城堡已啟動：http://<這台機器的 IP>:{args.port}/')
    print(f'紀錄存放位置：{DATA_DIR}')
    print('按 Ctrl+C 停止')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
