"""Hotfire runner: compiles and runs C# and Rust lesson code in a locked-down container.

Only the Hotfire server should be able to reach this. It has no login of its own."""
import glob, json, os, re, resource, shutil, signal, subprocess, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8100"))
SLOTS = int(os.environ.get("RUNNER_SLOTS", "3"))
RUN_SECONDS = 5
COMPILE_SECONDS = 30
MAX_OUTPUT = 64 * 1024
MAX_CODE = 40 * 1024
DOTNET_ROOT = os.environ.get("DOTNET_ROOT") or next((d for d in ("/usr/share/dotnet", "/usr/lib/dotnet") if os.path.isdir(d)), "")
CSC = (sorted(glob.glob(f"{DOTNET_ROOT}/sdk/*/Roslyn/bincore/csc.dll")) or [""])[-1]
REFS = sorted(glob.glob(f"{DOTNET_ROOT}/packs/Microsoft.NETCore.App.Ref/*/ref/net*/*.dll"))
RUNTIME = (sorted(os.listdir(f"{DOTNET_ROOT}/shared/Microsoft.NETCore.App")) or [""])[-1] if DOTNET_ROOT else ""
RUSTC = shutil.which("rustc") or ""
GLOBAL_USINGS = "global using System;\nglobal using System.Collections.Generic;\nglobal using System.Linq;\nglobal using System.Text;\n"
AS_ROOT = os.geteuid() == 0
free = list(range(SLOTS))
lock = threading.Condition()


def take_slot():
    with lock:
        while not free:
            lock.wait()
        return free.pop()


def give_slot(n):
    with lock:
        free.append(n)
        lock.notify()


def limits(uid):
    def apply():
        os.setsid()
        resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
        resource.setrlimit(resource.RLIMIT_FSIZE, (64 * 1024 * 1024, 64 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
        if AS_ROOT:
            os.setgroups([])
            os.setgid(uid)
            os.setuid(uid)
        resource.setrlimit(resource.RLIMIT_NPROC, (256, 256))
    return apply


def sh(cmd, cwd, uid, timeout, stdin=""):
    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": cwd, "TMPDIR": cwd, "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
           "DOTNET_NOLOGO": "1", "DOTNET_EnableWriteXorExecute": "0", "DOTNET_TieredPGO": "0", "DOTNET_gcServer": "0", "DOTNET_GCHeapHardLimit": "0x10000000", "LANG": "C.UTF-8",
           "RUSTUP_HOME": os.environ.get("RUSTUP_HOME", ""), "CARGO_HOME": os.environ.get("CARGO_HOME", "")}
    p = subprocess.Popen(cmd, cwd=cwd, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, preexec_fn=limits(uid))
    try:
        out, err = p.communicate(stdin.encode(), timeout=timeout)
        return p.returncode, out[:MAX_OUTPUT].decode("utf-8", "replace"), err[:MAX_OUTPUT].decode("utf-8", "replace"), False
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)
        out, err = p.communicate()
        return -9, out[:MAX_OUTPUT].decode("utf-8", "replace"), err[:MAX_OUTPUT].decode("utf-8", "replace"), True
    finally:
        if AS_ROOT:
            subprocess.run(["pkill", "-9", "-u", str(uid)], check=False)


def user_line(line, offset, code):
    if line is None:
        return None
    n = line - offset
    return n if 1 <= n <= code.count("\n") + 1 else None


def compile_error(lang, text, offset, code):
    if lang == "csharp":
        m = re.search(r"main\.cs\((\d+),\d+\): error (CS\d+): (.*)", text)
        if m:
            return {"name": "Compile error " + m.group(2), "msg": m.group(3).strip(), "line": user_line(int(m.group(1)), offset, code)}
    else:
        m = re.search(r"error(?:\[(E\d+)\])?: (.*)\n\s*--> main\.rs:(\d+):\d+", text)
        if m:
            return {"name": "Compile error" + (" " + m.group(1) if m.group(1) else ""), "msg": m.group(2).strip(), "line": user_line(int(m.group(3)), offset, code)}
    first = next((l for l in text.splitlines() if "error" in l), text.strip()[:300])
    return {"name": "Compile error", "msg": first.strip(), "line": None}


def runtime_error(lang, text, offset, code):
    if lang == "csharp":
        m = re.search(r"Unhandled exception\. (?:[\w.]+\.)?(\w+): (.*)", text)
        if m:
            return {"name": m.group(1), "msg": m.group(2).strip(), "line": None}
    else:
        m = re.search(r"panicked at main\.rs:(\d+):\d+:\n(.*)", text)
        if m:
            return {"name": "Panic", "msg": m.group(2).strip(), "line": user_line(int(m.group(1)), offset, code)}
    lines = [l for l in text.strip().splitlines() if l.strip() and not l.startswith("note:") and not l.lstrip().startswith("at ")]
    return {"name": "Error", "msg": (lines or ["The program stopped with an error."])[-1][:300], "line": None}


def run(lang, code, stdin, prefix, suffix):
    src = prefix + ("\n" if prefix else "") + code + ("\n" + suffix if suffix else "")
    offset = prefix.count("\n") + 1 if prefix else 0
    slot = take_slot()
    uid = 20000 + slot
    work = tempfile.mkdtemp(prefix="run")
    try:
        if AS_ROOT:
            os.chown(work, uid, uid)
        os.chmod(work, 0o700)
        if lang == "csharp":
            with open(f"{work}/main.cs", "w") as f:
                f.write(src)
            with open(f"{work}/usings.cs", "w") as f:
                f.write(GLOBAL_USINGS)
            with open(f"{work}/main.runtimeconfig.json", "w") as f:
                json.dump({"runtimeOptions": {"tfm": "net8.0", "framework": {"name": "Microsoft.NETCore.App", "version": RUNTIME}}}, f)
            if AS_ROOT:
                for name in os.listdir(work):
                    os.chown(f"{work}/{name}", uid, uid)
            cmd = ["dotnet", CSC, "-nologo", "-langversion:latest", "-nullable:disable", "-nowarn:CS8321,CS0168,CS0219,CS1998",
                   "-out:main.dll", "-target:exe"] + ["-r:" + r for r in REFS] + ["usings.cs", "main.cs"]
            rc, out, err, slow = sh(cmd, work, uid, COMPILE_SECONDS)
            if slow:
                return {"out": "", "error": {"name": "Compile error", "msg": "Compiling took too long.", "line": None}}
            if rc != 0:
                return {"out": "", "error": compile_error(lang, out + err, offset, code)}
            run_cmd = ["dotnet", "main.dll"]
        else:
            with open(f"{work}/main.rs", "w") as f:
                f.write(src)
            if AS_ROOT:
                os.chown(f"{work}/main.rs", uid, uid)
            rc, out, err, slow = sh([RUSTC, "--edition", "2021", "-C", "debuginfo=0", "-A", "dead_code", "-A", "unused", "main.rs", "-o", "main"], work, uid, COMPILE_SECONDS)
            if slow:
                return {"out": "", "error": {"name": "Compile error", "msg": "Compiling took too long.", "line": None}}
            if rc != 0:
                return {"out": "", "error": compile_error(lang, err, offset, code)}
            run_cmd = ["./main"]
        rc, out, err, slow = sh(run_cmd, work, uid, RUN_SECONDS, stdin)
        if slow:
            return {"out": out, "timedOut": True}
        if rc != 0:
            return {"out": out, "error": runtime_error(lang, err, offset, code)}
        return {"out": out}
    finally:
        shutil.rmtree(work, ignore_errors=True)
        give_slot(slot)


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/healthz":
            return self.reply(200, {"csharp": bool(CSC and REFS and RUNTIME), "rust": bool(RUSTC)})
        self.reply(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/run":
            return self.reply(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 4 * MAX_CODE:
                return self.reply(413, {"error": "too_large"})
            body = json.loads(self.rfile.read(size))
            lang, code = body.get("lang"), body.get("code")
            stdin, prefix, suffix = body.get("stdin") or "", body.get("prefix") or "", body.get("suffix") or ""
            if lang not in ("csharp", "rust") or not all(isinstance(x, str) for x in (code, stdin, prefix, suffix)):
                return self.reply(400, {"error": "invalid"})
            if len(code) + len(prefix) + len(suffix) > MAX_CODE:
                return self.reply(413, {"error": "too_large"})
            self.reply(200, run(lang, code, stdin, prefix, suffix))
        except (ValueError, KeyError):
            self.reply(400, {"error": "invalid"})

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"Hotfire runner on port {PORT}. C#: {bool(CSC and REFS)} Rust: {bool(RUSTC)}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
