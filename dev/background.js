chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "FETCH_JSON") return;

  (async () => {
    try {
      const opts = {
        method: msg.method || "GET",
        headers: msg.headers || {},
        body: msg.body ?? undefined, 
        credentials: "omit", 
      };

      console.log("[BG FETCH]", msg.url);
      console.log("Options:", opts);

      const r = await fetch(msg.url, opts);

      const headers = {};
      r.headers.forEach((v,k) => headers[k] = v);
      console.log("[BG] STATUS:", r.status, r.statusText, headers);

      const text = await r.text(); 
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch {}

      console.log("[BG] BODY:", parsed ?? text);

      sendResponse({
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        json: parsed,      
        text: parsed ? null : text 
      });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();

  return true; 
});