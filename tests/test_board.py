"""Leaderboard safety checks. Run from the repo root: python3 tests/test_board.py"""
import datetime, json, os, sys, tempfile
sys.path.insert(0, "server")
os.environ.update(DATA_DIR=tempfile.mkdtemp(), SECRET_KEY="test")
import app as hf

today = datetime.date.today()
iso = lambda n: (today + datetime.timedelta(days=n)).isoformat()
s = hf.board_stats
assert s({"xp": 10, "days": {iso(0): 5, iso(-1): 5}, "done": {"a": {}, "fix:a:1": {}}}) == {"xp": 10, "week": 10, "streak": 2, "lessons": 1}
assert s({"days": {iso(1): 5}})["week"] == 5, "one day of time-zone slack"
assert s({"days": {iso(30): 9999}}) == hf.EMPTY_STATS, "far-future dates don't count"
assert s({"days": {iso(0): 5, iso(30): 9999}})["streak"] == 1, "future days can't hide a real streak"
assert s({"days": [1, 2], "done": [1]}) == hf.EMPTY_STATS, "wrong shapes"
assert s({"xp": float("inf"), "days": {iso(0): float("inf")}}) == hf.EMPTY_STATS, "Infinity"
assert s({"xp": float("nan"), "days": {iso(0): -50}}) == hf.EMPTY_STATS, "NaN and negatives"
assert s({"xp": True, "days": {iso(0): "x", "bad": 3, 5: 1}})["xp"] == 0, "wrong value types"

with hf.app.app_context():
    conn = hf.db()
    for i, name in enumerate(["good", "broken", "listy"], 1):
        conn.execute("INSERT INTO users(id,username,pw_hash,created_at) VALUES(?,?,?,0)", (i, name, "x"))
    conn.execute("INSERT INTO progress VALUES(1,?,0)", (json.dumps({"xp": 7}),))
    conn.execute("INSERT INTO progress VALUES(2,'{not json',0)")
    conn.execute("INSERT INTO progress VALUES(3,'[1,2]',0)")
    conn.execute("INSERT INTO sessions VALUES(?,1,?)", (hf.sha("tok"), 4102444800))
    conn.commit()
c = hf.app.test_client()
c.set_cookie(hf.COOKIE, "tok")
r = c.get("/api/leaderboard")
assert r.status_code == 200 and {x["username"]: x["xp"] for x in r.json["rows"]} == {"good": 7, "broken": 0, "listy": 0}, "damaged saves don't break the board"
H = {"Origin": "http://localhost", "Content-Type": "application/json"}
assert c.put("/api/progress", data='{"xp": Infinity}', headers=H).status_code in (400,), "Infinity refused"
assert c.put("/api/progress", data='{"xp": 8}', headers=H).status_code == 200
print("All leaderboard checks passed")
