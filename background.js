chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "FETCH_JSON") {
    (async () => {
      try {
        const r = await fetch(msg.url, { method: "GET" });
        const text = await r.text(); // страхуемся от bad JSON
        try { sendResponse({ ok: true, json: JSON.parse(text) }); }
        catch { sendResponse({ ok: true, text }); }
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // оставляем канал открытым (async)
  }
});
