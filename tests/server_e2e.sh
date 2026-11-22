#!/usr/bin/env bash
# Server end-to-end test: real Flask app, two accounts, invites, progress, leaderboard,
# and a mock Claude API for explanations. Run from the repo root: bash tests/server_e2e.sh
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DATA=$(mktemp -d)
export DATA_DIR=$DATA COOKIE_SECURE=false SECRET_KEY=test TRUSTED_PROXIES=0
export ANTHROPIC_API_KEY=k ANTHROPIC_BASE_URL=http://127.0.0.1:8097 EXPLAIN_DAILY_LIMIT=2
cd "$ROOT/server"
python3 - <<'P' &
import http.server, json
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(s):
        n = int(s.headers['content-length']); s.rfile.read(n); assert s.headers['x-api-key'] == 'k'
        o = json.dumps({"content": [{"type": "text", "text": "Mock tutor note."}]}).encode()
        s.send_response(200); s.send_header('content-length', str(len(o))); s.end_headers(); s.wfile.write(o)
    def log_message(*a): pass
http.server.HTTPServer(('127.0.0.1', 8097), H).serve_forever()
P
M=$!
gunicorn --bind 127.0.0.1:8096 --workers 2 --threads 4 app:app >/dev/null 2>&1 &
G=$!
sleep 2
CODE=$(flask --app app invite --label me | head -1 | awk '{print $3}')
CODE2=$(flask --app app invite --label friend | head -1 | awk '{print $3}')
export CODE CODE2
cd "$ROOT" && NODE_PATH=${NODE_PATH:-$(npm root -g)} node tests/server_e2e.js
kill $G $M; rm -rf "$DATA"
