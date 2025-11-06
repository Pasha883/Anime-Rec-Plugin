(() => {
  // ========================= ROUTER & WATCHER ==============================
  class InsertWatcher {
    constructor() {
      this.mo = null;
      this.rafId = 0;
      this.active = false;
    }
    start() {
      if (this.active) return;
      this.active = true;
      this.mo = new MutationObserver(() => this.tick());
      this.mo.observe(document.documentElement, { childList: true, subtree: true });
      const loop = () => {
        this.tick();
        if (!this.active) return;
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
      this.tick();
    }
    stop() {
      if (!this.active) return;
      this.active = false;
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
    }
    tick() {
      if (!this.active) return;
      if (document.getElementById("plugin-recs")) {
        return this.stop();
      }
      // ВСТАВЛЯЕМ БЛОК
      if (insertOnce()) {
        // "Пинаем" окно, НО теперь это не так важно, т.к. логика наша
        window.dispatchEvent(new Event('resize')); 
        this.stop();
      }
    }
  }
  const watcher = new InsertWatcher();

  // ========================= SELECTORS & HELPERS ===========================
  const findSectionBodyByTitle = (title) => {
    for (const sb of document.querySelectorAll(".section-body")) {
      const span = sb.querySelector(".section-title__link > span");
      const titleDiv = sb.querySelector(".section-title.size-sm");
      const txt = (span?.textContent || titleDiv?.textContent || "").trim();
      if (txt && txt.includes(title)) return sb;
    }
    return null;
  };
  const findTagsSectionBody = () => {
    for (const sb of document.querySelectorAll(".section-body")) {
      if (sb.querySelector(".eq_er.eq_eh.eq_ew")) return sb;
    }
    return null;
  };
  const findScheduleContainer = () => document.querySelector(".zw_g");
  const findCharactersSectionBody = () => findSectionBodyByTitle("Персонажи");
  const firstSectionBody = () => document.querySelector(".section-body");
  const isAnimeDetailUrl = () => /\/anime\//.test(location.pathname);

  // ========================= FEEDBACK (STUB) ===============================
  async function sendFeedbackToServer({ mediaId, action }) {
    console.log("[stub feedback]", { mediaId, action, ts: Date.now() });
    return { ok: true };
  }

  // ========================= PLACEHOLDER DATA ==============================
  const PLACEHOLDERS = [
    { id: 900001, heading: "Схож по тэгам",      name: "Название аниме",      footer: "TV Сериал · Неизвестно",   up: 4,  down: 2 },
    { id: 900002, heading: "Схож по студии",     name: "Имя тайтла",          footer: "ONA · Неизвестно",         up: 7,  down: 1 },
    { id: 900003, heading: "Схож по жанрам",     name: "Рабочий плейсхолдер", footer: "Фильм · Неизвестно",       up: 23, down: 5 },
    { id: 900004, heading: "Схож по сюжету",     name: "Плейсхолдер 1",       footer: "TV Сериал · Неизвестно",   up: 4,  down: 0 },
    { id: 900005, heading: "Схож по тону",       name: "Плейсхолдер 2",       footer: "OVA · Неизвестно",         up: 9,  down: 2 },
    { id: 900006, heading: "Схож по аудитории",  name: "Плейсхолдер 3",       footer: "TV Сериал · Неизвестно",   up: 15, down: 4 },
    { id: 900007, heading: "Схож по сеттингу",   name: "Плейсхолдер 4",       footer: "ONA · Неизвестно",         up: 11, down: 3 },
    { id: 900008, heading: "Схож по теме",       name: "Плейсхолдер 5",       footer: "Фильм · Неизвестно",       up: 6,  down: 1 }
  ];
  const ratingState = new Map(PLACEHOLDERS.map(x => [x.id, { up: x.up, down: x.down }]));
  const score = (r) => r.up - r.down;

  // ========================= INLINE SVG FROM SITE ==========================
  const PLUS_SVG = `
    <svg class="svg-inline--fa fa-plus" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img"
         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"></path>
    </svg>`;
  const MINUS_SVG = `
    <svg class="svg-inline--fa fa-minus" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="minus" role="img"
         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path fill="currentColor" d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"></path>
    </svg>`;
  
  const CHEVRON_LEFT_SVG = `
    <svg class="svg-inline--fa fa-chevron-left" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-left" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"></path>
    </svg>`;
  const CHEVRON_RIGHT_SVG = `
    <svg class="svg-inline--fa fa-chevron-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path>
    </svg>`;

  async function getEnglishTitle(romajiName) {
    // 1. Пытаемся через AniList GraphQL
    const anilistQuery = `
        query ($search: String!) {
        Media(search: $search, type: ANIME) {
            id
            title { romaji english native userPreferred }
            synonyms
        }
        }`;

    try {
        const alResp = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query: anilistQuery, variables: { search: romajiName } })
        });

        if (alResp.ok) {
        const alJson = await alResp.json();
        const m = alJson.data?.Media;
        if (m) {
            // Если есть англ., возвращаем его; иначе ромадзи
            return {
            source: "AniList",
            id: m.id,
            romaji: m.title.romaji || null,
            english: m.title.english || m.title.romaji || null,
            native: m.title.native || null,
            synonyms: m.synonyms || []
            };
        }
        }
    } catch (err) {
        console.warn("AniList request failed:", err);
    }

    // 2. Если не нашли — пробуем через Jikan (MAL)
    try {
        const jkResp = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(romajiName)}&limit=1`);
        if (jkResp.ok) {
        const jkJson = await jkResp.json();
        const d = jkJson.data?.[0];
        if (d) {
            const eng =
            d.title_english ||
            d.titles?.find(t => t.type === "English")?.title ||
            d.title; // fallback — может быть ромадзи

            return {
            source: "Jikan",
            id: d.mal_id,
            romaji: d.title,
            english: eng,
            native: d.title_japanese || null,
            synonyms: d.titles?.map(t => t.title) || []
            };
        }
        }
    } catch (err) {
        console.warn("Jikan request failed:", err);
    }    
    }

    function fetchViaBg({ url, method = "GET", headers = {}, body = null }) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "FETCH_JSON", url, method, headers, body }, (resp) => resolve(resp));
        });
}

   function addFavoritesRequest(data){
        let amount = data[0].length;

        console.log(amount);        

        // Пример POST c JSON-пейлоадом
        (async () => {
            const url = "https://www.animerecbert.online/api/add_favorite"

            const payload = {
                anime_id: data[0][0],
                anime_name: data[0][1]
            };

            const resp = await fetchViaBg({
                url: url,
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp?.ok) {
                console.warn("BG POST failed:", resp);
            } else {
                console.log("BG POST ok:", resp.json ?? resp.text);
            }
        })();
    }

  function getSearchQueue(animeName){
    let originalString = "https://www.animerecbert.online/api/search_animes?q=" + animeName;
    let encodedString = originalString.replace(/ /g, "%20");
    console.log(encodedString);

    // (async () => {
    //     const url = encodedString;
    //     const resp = await fetchViaBg(url);
    //     if (!resp?.ok) {
    //         console.warn("BG fetch failed:", resp?.error);
    //         return;
    //     }
    //     const data = resp.json ?? resp.text;
    //     console.log("API data:", data);
    //     addFavoritesRequest(data);
    //     })();

    // Пример GET
        (async () => {
            const url = encodedString;
            const resp = await fetchViaBg({ url: url});
            if (!resp?.ok) {
                    console.warn("BG fetch failed:", resp?.error);
                    return;
                }
                const data = resp.json ?? resp.text;
                console.log("API data:", data);
                addFavoritesRequest(data);
        })();
    }

    

    

    
  // ========================= BUILD SECTION =================================
  function makePlaceholderCards(n) {
    const items = [];
    for (let i = 0; i < n; i++) {
      const ph = PLACEHOLDERS[i % PLACEHOLDERS.length];
      const r = ratingState.get(ph.id);
      items.push(`
        <a href="javascript:void(0)" class="card-inline _elevated-2 _rounded-lg" data-media-info-tooltip="enabled" data-media-id="${ph.id}">
          <div class="cover _shadow card-inline__cover _size-default">
            <div class="cover__wrap">
              <img src="" alt="${ph.name}" class="cover__img" loading="lazy" style="background:#2a2a2c; width:100%; height:100%; object-fit:cover;">
            </div>
          </div>
          <div class="card-inline__body _content-between">
            <div>
              <div class="card-inline__heading">${ph.heading}</div>
              <div class="card-inline__name">${ph.name}</div>
            </div>
            <div class="card-inline__footer">${ph.footer}</div>
          </div>
          <div class="card-inline__rating">
            <div class="c9_ea c9_eb" data-media-id="${ph.id}">
              <button class="c9_c2 c9_ef c9_bo c9_eh" data-act="up" title="Хорошая рекомендация" aria-label="Плюс">
                ${PLUS_SVG}
              </button>
              <div class="c9_ec c9_ef" data-tooltip="${r.up} плюса, ${r.down} минуса" data-kind="score">${score(r)}</div>
              <button class="c9_c2 c9_eg c9_bo c9_eh" data-act="down" title="Плохая рекомендация" aria-label="Минус">
                ${MINUS_SVG}
              </button>
            </div>
          </div>
        </a>
      `);
    }
    return items.join("");
  }

  function buildRecsSection() {
    const section = document.createElement("div");
    section.className = "section-body p2_p3";
    section.id = "plugin-recs";
    
    // Мы внедряем <style> тэг, чтобы 1) скрыть скроллбар и 2) принудительно задать flex-layout
    // Это чинит баг "столбика" И баг "исчезновения"
    section.innerHTML = `
      <style>
        #plugin-scroll-content {
          display: flex !important; /* Принудительно ставим flex, чинит "столбик" */
          overflow-x: auto !important; /* Включаем наш скролл */
          scroll-behavior: smooth;
          gap: 16px;
          padding: 0 4px;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE */
        }
        #plugin-scroll-content::-webkit-scrollbar {
          display: none; /* Webkit (Chrome, Safari) */
        }
      </style>
      <div class="media-section-head">
        <div class="section-title size-sm btns">
          <div class="section-title__link">
            <span>Рекомендации от расширения</span>
            <svg class="svg-inline--fa fa-arrow-right fa-sm" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-right" role="img"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor"
                d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"></path></svg>
          </div>
        </div>
      </div>
      <!-- Мы НЕ используем data-scroll-container, чтобы скрипты сайта нас игнорировали -->
      <div class="ej_g ej_ek">
        <!-- Добавляем data-scroll-dir для нашего JS -->
        <div class="ej_bk ej_bp ej_b6 ej_eo" style="display: none;" data-scroll-dir="left"><div class="ej_bo">${CHEVRON_LEFT_SVG}</div></div>
        <div class="ej_bk ej_bq ej_b6 ej_eo" style="" data-scroll-dir="right"><div class="ej_bo">${CHEVRON_RIGHT_SVG}</div></div>
        
        <!-- Мы НЕ используем data-scroll-content. Вместо него наш ID -->
        <!-- Класс ej_az оставляем для стилей, но inline-стили из <style> выше его "победят" -->
        <div class="ej_az" id="plugin-scroll-content">
          ${makePlaceholderCards(8)}
        </div>
      </div>
    `;

    // --- ВОЗВРАЩАЕМ НАШУ ЛОГИКУ СКРОЛЛА ---
    const scrollContent = section.querySelector('#plugin-scroll-content');
    const leftArrow = section.querySelector('[data-scroll-dir="left"]');
    const rightArrow = section.querySelector('[data-scroll-dir="right"]');

    const updateArrows = () => {
        if (!scrollContent || !leftArrow || !rightArrow) return;
        
        const scrollLeft = Math.ceil(scrollContent.scrollLeft); // Округляем для точности
        const scrollWidth = scrollContent.scrollWidth;
        const clientWidth = scrollContent.clientWidth;
        
        // Погрешность в 10px
        const atStart = scrollLeft < 10;
        const atEnd = (scrollWidth - scrollLeft - clientWidth) < 10;

        leftArrow.style.display = atStart ? 'none' : 'block';
        rightArrow.style.display = atEnd ? 'none' : 'block';
    };

    // Добавляем listener на скролл, чтобы обновлять кнопки
    if (scrollContent) {
        scrollContent.addEventListener('scroll', updateArrows, { passive: true });
    }
    
    // Делегируем клики: и для стрелок, и для рейтинга
    section.addEventListener("click", async (e) => {
      
      // 1. ЛОГИКА ДЛЯ СТРЕЛОК
      const arrowBtn = e.target.closest('[data-scroll-dir]');
      if (arrowBtn && scrollContent) {
          const direction = arrowBtn.getAttribute('data-scroll-dir');
          // Скроллим на 80% видимой ширины
          const scrollAmount = scrollContent.clientWidth * 0.8;
          
          scrollContent.scrollBy({
              left: direction === 'left' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
          
          // 'scroll' event сам обновит кнопки, но мы можем 
          // вызвать это с задержкой, чтобы кнопка "назад" появилась сразу
          setTimeout(updateArrows, 100); 
          return;
      }

      // 2. ЛОГИКА ДЛЯ РЕЙТИНГА (старая)
      const ratingBtn = e.target.closest("button.c9_c2");
      if (!ratingBtn) return;

      const wrap = ratingBtn.closest(".c9_ea.c9_eb");
      if (!wrap) return;
      const mediaId = Number(wrap.getAttribute("data-media-id"));
      const act = ratingBtn.getAttribute("data-act");
      const st = ratingState.get(mediaId);
      if (!st) return;
      if (act === "up") st.up += 1;
      if (act === "down") st.down += 1;
      const scoreEl = wrap.querySelector('[data-kind="score"]');
      if (scoreEl) {
        scoreEl.textContent = String(score(st));
        scoreEl.setAttribute("data-tooltip", `${st.up} плюса, ${st.down} минуса`);
      }
      try { await sendFeedbackToServer({ mediaId, action: act }); } catch {}
    });

    // Обновляем стрелки при первой загрузке
    // (нужна задержка, чтобы DOM успел рассчитать clientWidth)
    setTimeout(updateArrows, 100);
    // И на всякий случай после "пинка"
    setTimeout(updateArrows, 300); // `resize` может менять clientWidth

    return section;
  }

  // ========================= INSERTION STRATEGY ============================
  function insertOnce() {
    if (document.getElementById("plugin-recs")) {
      return true;
    }
    const isTargetPage = isAnimeDetailUrl();
    if (!isTargetPage) {
      return false;
    }
    //РАБОТА С API, КАК МИНИМУМ - ТЕСТ
    (async () => {
        const el = document.querySelector('h2.qx_q0, h2[class^="qx_"]');
        const romajiName = el?.textContent.trim();
        if (!romajiName) return;

        const result = await getEnglishTitle(romajiName);
        const english = result.english ?? result.romaji ?? null;
        console.log(english);
        getSearchQueue(english);
        })().catch(console.warn);

    let anchorAfter = findSectionBodyByTitle("Похожее")
                   || findSectionBodyByTitle("Связанное")
                   || findTagsSectionBody();

    let afterNode = anchorAfter || findScheduleContainer();

    const section = buildRecsSection();

    if (afterNode) {
      afterNode.insertAdjacentElement("afterend", section);
      return true;
    }

    const charsSB = findCharactersSectionBody();
    if (charsSB && charsSB.parentElement) {
      charsSB.parentElement.insertBefore(section, charsSB);
      return true;
    }

    const firstSB = firstSectionBody();
    if (firstSB) {
      firstSB.insertAdjacentElement("afterend", section);
      return true;
    }
    return false;
  }

  // ========================= BOOT (NEW RELIABLE LOGIC) =====================
  
  let currentUrl = location.href;

  function handleRouteChange() {
    const old = document.getElementById("plugin-recs");
    if (old && old.parentElement) {
      old.parentElement.removeChild(old);
    }
    watcher.stop();
    if (isAnimeDetailUrl()) {
      watcher.start();
    } else {
      watcher.stop();
    }
  }

  function startUrlCheckLoop() {
    const checkUrl = () => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        handleRouteChange();
      }
      requestAnimationFrame(checkUrl);
    };
    requestAnimationFrame(checkUrl);
  }

  if (isAnimeDetailUrl()) {
    watcher.start();
  }
  startUrlCheckLoop();

})();