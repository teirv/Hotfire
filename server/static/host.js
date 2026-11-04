/* Connects the Hotfire page to this server: saved progress, sign-in, explanations and file saves. */
(function () {
  window.__hotfireHost = true;
  let me = null;
  const whoami = async () => {
    if (me) return me;
    const r = await fetch("/api/me");
    if (r.status === 401) { location.href = "/login"; throw { code: "revoked" }; }
    me = await r.json(); window.__hotfireUser = me; return me;
  };
  const doc = {
    async get() {
      const r = await fetch("/api/progress", { cache: "no-store" });
      if (r.status === 401) { location.href = "/login"; throw { code: "revoked" }; }
      if (!r.ok) throw { code: "unavailable" };
      const b = await r.json();
      return { exists: b.exists, data: () => b.data, metadata: { fromCache: false, hasPendingWrites: false } };
    },
    async set(data) {
      const body = JSON.stringify(data);
      const r = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive: body.length < 60000 });
      if (r.status === 401) { location.href = "/login"; throw { code: "revoked" }; }
      if (!r.ok) throw { code: "unavailable" };
    },
    onSnapshot(next) {
      const poll = () => { if (document.visibilityState === "visible") doc.get().then(next).catch(() => {}); };
      const t = setInterval(poll, 30000);
      window.addEventListener("focus", poll);
      return () => { clearInterval(t); window.removeEventListener("focus", poll); };
    },
  };
  const sample = async (prompt, o = {}) => {
    let r;
    try {
      r = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }), signal: o.signal });
    } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error" }; }
    if (r.status === 501) throw { code: "not_declared" };
    if (r.status === 429) throw { code: "rate_limited" };
    if (!r.ok) throw { code: "upstream_error" };
    const { text } = await r.json();
    if (o.onText) o.onText({ text, delta: text });
    return { text, truncated: false };
  };
  const downloads = {
    async save({ filename, data }) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "text/plain" }));
      a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return { saved: true };
    },
  };
  window.claude = {
    use: async (name) => {
      if (name === "db") return { doc: () => doc };
      if (name === "user") return { id: async () => (await whoami()).id };
      if (name === "sample") return (await whoami()).explain ? sample : null;
      if (name === "downloads") return downloads;
      return null;
    },
  };
})();
