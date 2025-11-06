chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "FETCH_JSON") return;

  (async () => {
    try {
      const opts = {
        method: msg.method || "GET",
        headers: msg.headers || {},
        body: msg.body ?? undefined, // строка JSON, FormData или null
        credentials: "include",
        // credentials/mode обычно не нужны для BG-запросов
      };

      console.log("[BG FETCH]", msg.url);
      console.log("Options:", opts);

      const r = await fetch(msg.url, opts);

      // залогируем заголовки и статус
      const headers = {};
      r.headers.forEach((v,k) => headers[k] = v);
      console.log("[BG] STATUS:", r.status, r.statusText, headers);

      const text = await r.text(); // читаем как текст
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch {}

      console.log("[BG] BODY:", parsed ?? text);

      sendResponse({
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        json: parsed,      // если это был JSON
        text: parsed ? null : text // иначе сырой текст
      });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();

  return true; // асинхронный ответ
});