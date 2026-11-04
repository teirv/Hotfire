"""Hotfire server: invite-only accounts and saved progress for the Hotfire learning app."""
import hashlib, json, os, secrets, sqlite3, time, urllib.error, urllib.request
from functools import wraps
from urllib.parse import urlparse

import click
from flask import Flask, abort, flash, g, jsonify, redirect, render_template, request, send_from_directory, url_for
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE, "data"))
DB_PATH = os.path.join(DATA_DIR, "hotfire.db")
COOKIE = "hotfire_session"
SESSION_DAYS = 30
INVITE_DAYS = 7
MIN_PASSWORD = 10
MAX_FAILS = 5
FAIL_WINDOW = 15 * 60
MAX_DOC = 256 * 1024
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com").rstrip("/")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-5-5")
PUBLIC_URL = os.environ.get("PUBLIC_URL", "https://YOUR-DOMAIN").rstrip("/")
EXPLAIN_LIMIT = int(os.environ.get("EXPLAIN_DAILY_LIMIT", "30"))
DUMMY_HASH = generate_password_hash("not-a-real-password")

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024
if int(os.environ.get("TRUSTED_PROXIES", "1")):
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, pw_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0, disabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invites(code_hash TEXT PRIMARY KEY, label TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_by INTEGER, used_at INTEGER);
CREATE TABLE IF NOT EXISTS progress(user_id INTEGER PRIMARY KEY REFERENCES users(id), doc TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS fails(key TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fails_key ON fails(key);
CREATE TABLE IF NOT EXISTS explain_use(user_id INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(user_id, day));
"""


def db():
    if "db" not in g:
        os.makedirs(DATA_DIR, exist_ok=True)
        g.db = sqlite3.connect(DB_PATH, timeout=10)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
        g.db.executescript(SCHEMA)
    return g.db


@app.teardown_appcontext
def close_db(_):
    conn = g.pop("db", None)
    if conn:
        conn.close()


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def client_ip():
    return request.headers.get("CF-Connecting-IP") or request.remote_addr or "?"


def current_user():
    if "user" not in g:
        g.user = None
        token = request.cookies.get(COOKIE)
        if token:
            row = db().execute(
                "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled=0",
                (sha(token), int(time.time()))).fetchone()
            g.user = row
    return g.user


def login_required(view):
    @wraps(view)
    def wrapped(*a, **k):
        if current_user():
            return view(*a, **k)
        if request.path.startswith("/api/"):
            return jsonify(error="signed_out"), 401
        return redirect(url_for("login"))
    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*a, **k):
        if not current_user() or not current_user()["is_admin"]:
            abort(403)
        return view(*a, **k)
    return wrapped


def start_session(user_id, response):
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + SESSION_DAYS * 86400
    db().execute("DELETE FROM sessions WHERE expires_at<?", (int(time.time()),))
    db().execute("INSERT INTO sessions VALUES(?,?,?)", (sha(token), user_id, expires))
    db().commit()
    response.set_cookie(COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, secure=COOKIE_SECURE, samesite="Lax", path="/")
    return response


def too_many_fails(key, limit=MAX_FAILS):
    db().execute("DELETE FROM fails WHERE at<?", (int(time.time()) - FAIL_WINDOW,))
    db().commit()
    n = db().execute("SELECT COUNT(*) FROM fails WHERE key=?", (key,)).fetchone()[0]
    return n >= limit


def record_fail(key):
    db().execute("INSERT INTO fails VALUES(?,?)", (key, int(time.time())))
    db().commit()


@app.before_request
def block_cross_site():
    """Reject state-changing requests that didn't come from this site."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    source = request.headers.get("Origin") or request.headers.get("Referer")
    if not source or urlparse(source).netloc.lower() != request.host.lower():
        abort(403)


@app.after_request
def security_headers(resp):
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "same-origin"
    if request.path.startswith("/api/") or request.path in ("/login", "/account", "/register"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# ---------- pages ----------
@app.get("/healthz")
def healthz():
    db().execute("SELECT 1")
    return "ok"


@app.get("/")
@login_required
def home():
    return send_from_directory(os.path.join(BASE, "static"), "index.html", max_age=0)


@app.get("/host.js")
def host_js():
    return send_from_directory(os.path.join(BASE, "static"), "host.js", max_age=0)


@app.get("/vendor/<path:name>")
def vendor(name):
    return send_from_directory(os.path.join(BASE, "static", "vendor"), name, max_age=86400)


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user():
        return redirect("/")
    if request.method == "GET":
        return render_template("login.html")
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    key = sha(username.lower() + "|" + client_ip())
    if too_many_fails(key) or too_many_fails("ip|" + client_ip(), 20):
        return render_template("login.html", error="Too many attempts. Wait 15 minutes and try again.", username=username), 429
    user = db().execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    ok = check_password_hash(user["pw_hash"] if user else DUMMY_HASH, password)
    if not user or not ok or user["disabled"]:
        record_fail(key)
        record_fail("ip|" + client_ip())
        return render_template("login.html", error="That username or password isn't right.", username=username), 401
    return start_session(user["id"], redirect("/"))


def find_invite(code):
    if not code:
        return None
    return db().execute("SELECT * FROM invites WHERE code_hash=? AND used_by IS NULL AND expires_at>?", (sha(code), int(time.time()))).fetchone()


@app.route("/register", methods=["GET", "POST"])
def register():
    code = (request.values.get("code") or "").strip()
    if request.method == "GET":
        return render_template("register.html", code=code, valid=bool(find_invite(code)))
    fail_key = "reg|" + client_ip()
    if too_many_fails(fail_key):
        return render_template("register.html", code=code, valid=True, error="Too many attempts. Wait 15 minutes and try again."), 429
    invite = find_invite(code)
    if not invite:
        record_fail(fail_key)
        return render_template("register.html", code=code, valid=False), 400
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    error = None
    if not (3 <= len(username) <= 30) or not username.replace("_", "").replace("-", "").isalnum() or not username.isascii():
        error = "Use 3 to 30 letters, numbers, dashes or underscores for your username."
    elif len(password) < MIN_PASSWORD:
        error = f"Use at least {MIN_PASSWORD} characters for your password."
    elif password != request.form.get("confirm", ""):
        error = "Those passwords don't match."
    elif db().execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        error = "That username is taken."
    if error:
        return render_template("register.html", code=code, valid=True, error=error, username=username), 400
    conn = db()
    is_first = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
    # The invite is claimed in the same step, so one code can never make two accounts.
    conn.execute("BEGIN IMMEDIATE")
    claimed = conn.execute("UPDATE invites SET used_at=? WHERE code_hash=? AND used_by IS NULL AND used_at IS NULL", (int(time.time()), sha(code))).rowcount
    if not claimed:
        conn.rollback()
        return render_template("register.html", code=code, valid=False), 400
    cur = conn.execute("INSERT INTO users(username,pw_hash,is_admin,created_at) VALUES(?,?,?,?)",
                       (username, generate_password_hash(password), 1 if is_first else 0, int(time.time())))
    conn.execute("UPDATE invites SET used_by=? WHERE code_hash=?", (cur.lastrowid, sha(code)))
    conn.commit()
    return start_session(cur.lastrowid, redirect("/"))


@app.post("/logout")
def logout():
    token = request.cookies.get(COOKIE)
    if token:
        db().execute("DELETE FROM sessions WHERE token_hash=?", (sha(token),))
        db().commit()
    resp = redirect(url_for("login"))
    resp.delete_cookie(COOKIE, path="/")
    return resp


def new_invite(label):
    code = secrets.token_urlsafe(16)
    now = int(time.time())
    db().execute("INSERT INTO invites(code_hash,label,created_at,expires_at) VALUES(?,?,?,?)", (sha(code), label, now, now + INVITE_DAYS * 86400))
    db().commit()
    return code


@app.get("/account")
@login_required
def account():
    user = current_user()
    ctx = {"user": user, "new_code": None}
    if user["is_admin"]:
        ctx["users"] = db().execute("SELECT id,username,is_admin,disabled,created_at FROM users ORDER BY id").fetchall()
        ctx["invites"] = db().execute("SELECT rowid,label,expires_at FROM invites WHERE used_by IS NULL AND expires_at>? ORDER BY created_at DESC", (int(time.time()),)).fetchall()
    return render_template("account.html", **ctx)


@app.post("/account/password")
@login_required
def change_password():
    user = current_user()
    new = request.form.get("new", "")
    if not check_password_hash(user["pw_hash"], request.form.get("current", "")):
        flash("Your current password isn't right.")
    elif len(new) < MIN_PASSWORD:
        flash(f"Use at least {MIN_PASSWORD} characters for your new password.")
    else:
        db().execute("UPDATE users SET pw_hash=? WHERE id=?", (generate_password_hash(new), user["id"]))
        db().execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
        db().commit()
        return start_session(user["id"], redirect(url_for("account")))
    return redirect(url_for("account"))


@app.post("/account/invites")
@admin_required
def make_invite():
    label = request.form.get("label", "").strip()[:60] or "Invite"
    code = new_invite(label)
    link = url_for("register", code=code, _external=True)
    user = current_user()
    users = db().execute("SELECT id,username,is_admin,disabled,created_at FROM users ORDER BY id").fetchall()
    invites = db().execute("SELECT rowid,label,expires_at FROM invites WHERE used_by IS NULL AND expires_at>? ORDER BY created_at DESC", (int(time.time()),)).fetchall()
    return render_template("account.html", user=user, users=users, invites=invites, new_link=link)


@app.post("/account/invites/<int:rowid>/revoke")
@admin_required
def revoke_invite(rowid):
    db().execute("DELETE FROM invites WHERE rowid=? AND used_by IS NULL", (rowid,))
    db().commit()
    return redirect(url_for("account"))


@app.post("/account/users/<int:uid>/toggle")
@admin_required
def toggle_user(uid):
    if uid != current_user()["id"]:
        db().execute("UPDATE users SET disabled=1-disabled WHERE id=?", (uid,))
        db().execute("DELETE FROM sessions WHERE user_id=?", (uid,))
        db().commit()
    return redirect(url_for("account"))


# ---------- api ----------
@app.get("/api/me")
@login_required
def me():
    u = current_user()
    return jsonify(id=str(u["id"]), username=u["username"], isAdmin=bool(u["is_admin"]), explain=bool(ANTHROPIC_KEY))


@app.get("/api/progress")
@login_required
def get_progress():
    row = db().execute("SELECT doc FROM progress WHERE user_id=?", (current_user()["id"],)).fetchone()
    return jsonify(exists=bool(row), data=json.loads(row["doc"]) if row else None)


@app.put("/api/progress")
@login_required
def put_progress():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error="invalid"), 400
    doc = json.dumps(body, separators=(",", ":"))
    if len(doc) > MAX_DOC:
        return jsonify(error="too_large"), 413
    db().execute("INSERT INTO progress VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET doc=excluded.doc, updated_at=excluded.updated_at",
                 (current_user()["id"], doc, int(time.time())))
    db().commit()
    return jsonify(ok=True)


@app.post("/api/explain")
@login_required
def explain():
    if not ANTHROPIC_KEY:
        return jsonify(error="not_configured"), 501
    body = request.get_json(silent=True) or {}
    prompt = body.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 12000:
        return jsonify(error="invalid"), 400
    uid, day = current_user()["id"], time.strftime("%Y-%m-%d")
    row = db().execute("SELECT n FROM explain_use WHERE user_id=? AND day=?", (uid, day)).fetchone()
    if row and row["n"] >= EXPLAIN_LIMIT:
        return jsonify(error="rate_limited"), 429
    db().execute("INSERT INTO explain_use VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET n=n+1", (uid, day))
    db().commit()
    req = urllib.request.Request(ANTHROPIC_URL + "/v1/messages",
        data=json.dumps({"model": ANTHROPIC_MODEL, "max_tokens": 220, "messages": [{"role": "user", "content": prompt}]}).encode(),
        headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
        if not text:
            raise ValueError("empty")
        return jsonify(text=text)
    except (urllib.error.URLError, ValueError, TimeoutError):
        return jsonify(error="upstream_error"), 502


# ---------- admin commands ----------
@app.cli.command("invite")
@click.option("--label", default="Command line invite")
def cli_invite(label):
    """Print a one-time invite code."""
    code = new_invite(label)
    click.echo(f"Invite code: {code}")
    click.echo(f"Sign-up page: {PUBLIC_URL}/register?code={code}")
    click.echo(f"This code works once and expires in {INVITE_DAYS} days.")


@app.cli.command("reset-password")
@click.argument("username")
def cli_reset(username):
    """Set a new password for an account."""
    temp = secrets.token_urlsafe(12)
    cur = db().execute("UPDATE users SET pw_hash=? WHERE username=?", (generate_password_hash(temp), username))
    if not cur.rowcount:
        raise click.ClickException("No account with that username.")
    db().execute("DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE username=?)", (username,))
    db().commit()
    click.echo(f"Temporary password for {username}: {temp}")
    click.echo("Change it under Account after signing in.")


@app.template_filter("day")
def day_filter(ts):
    return time.strftime("%b %d, %Y", time.localtime(ts))
