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
      insertOnce().then(ok => {
            if (ok) {
                window.dispatchEvent(new Event('resize'));
                watcher.stop?.(); // если есть
            }
        });
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
  const isAnimeDetailUrl = () => {
    // Проверяем путь /anime/
    if (!/\/anime\//.test(location.pathname)) return false;
    
    // Получаем параметр section из URL
    const section = new URLSearchParams(location.search).get('section');
    
    // Показываем если:
    // 1. section отсутствует (главная страница аниме)
    // 2. или section=info
    return !section || section === 'info';
  };
  

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

  // Settings for loading GIFs: size in px, gap between images (px), overlap in px, vertical padding for section
  // To adjust overlap of gifs, change `overlap` to a positive number (pixels). If overlap > 0, gifs will shift left and overlap.
  const LOADING_GIF_SETTINGS = {
    size: 100,       // width and height of each gif in px
    gap: 12,         // visible gap when no overlap
    overlap: 0,     // how many pixels subsequent gifs overlap the previous one (0 = no overlap)
    vPadding: 6      // vertical padding (top/bottom) of the section in px
  };

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

   // универсальная обёртка уже есть:
    // function fetchViaBg({ url, method="GET", headers={}, body=null }) { ... }

    // 1) Добавление в избранное — делаем async и возвращаем true/false
    async function addFavoritesRequest(data) {
        // data: [[id, title], ...]; берём первый элемент
        if (!Array.isArray(data) || !Array.isArray(data[0])) return false;

        const payload = {
            anime_id: data[0][0],
            anime_name: data[0][1],
        };

        const url = "https://www.animerecbert.online/api/add_favorite";

        try {
            const resp = await fetchViaBg({
                url: url,
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!resp?.ok) {
                console.warn("addFavoritesRequest failed:", resp);
                return false;
            }

            console.log("addFavoritesRequest OK:", resp.json ?? resp.text);
            return true;
        } catch (e) {
            console.warn("addFavoritesRequest error:", e);
            return false;
        }
    }

    function showError(message = "Не удалось составить рекомендации"){
        // Replace loading placeholder with a friendly error message
        const section = document.getElementById("plugin-recs");
        if (!section) {
            console.warn("showError: no plugin-recs section to update", message);
            return;
        }

        section.innerHTML = `
          <div class="media-section-head">
            <div class="section-title size-sm btns">
              <div class="section-title__link">
                <span>Рекомендации недоступны</span>
              </div>
            </div>
          </div>
          <div class="ej_g ej_ek">
            <div class="ej_az" id="plugin-scroll-content" style="min-height:120px; display:flex;align-items:center;justify-content:center;">
              <div style="text-align:center;color:var(--color-text-secondary);">${message}</div>
            </div>
          </div>
        `;
    }

    async function parseRecomendations(data){
        const {message, recommendations} = data;

        const length = recommendations.length;

        const names = [];

        console.log("Message:", message);

        for (let i = 0; i < length; i++){
            const {id, name, genres, score, image_url, mal_url} = recommendations[i];
            console.log(name);
            names.push(name);
        }

        return names;
    }

    // 2) Рекомендации — тоже async
    async function getRecomendations() {
        console.log("Getting recommendations...");

        const payload = {
            filters: {
            show_sequels: false,
            show_movies: true,
            show_tv: true,
            show_ova: false,
            },
            blacklisted_animes: [],
        };

        const resp = await fetchViaBg({
            url: "https://www.animerecbert.online/api/get_recommendations",
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!resp?.ok) {
            console.warn("getRecomendations failed:", resp);
            return null;
        }

        const data = resp.json ?? resp.text;
        console.log("Recommendations:", data);
        return data;
    }

    // 3) Поиск → добавление → (только при успехе) рекомендации
    async function getSearchQueue(animeName) {
        const url = "https://www.animerecbert.online/api/search_animes?q=" + encodeURIComponent(animeName);

        const resp = await fetchViaBg({ url });
        if (!resp?.ok) {
      console.warn("search failed:", resp?.error || resp);
      // let caller handle UI; return null to indicate failure
      return null;
        }

        const data = resp.json ?? resp.text;
        console.log("Search data:", data);

        const added = await addFavoritesRequest(data);
        if (added) {
            const data = await getRecomendations(); // ← выполнится строго после успешного addFavoritesRequest
            return data;
        } else {
      console.warn("Skip recommendations: addFavoritesRequest failed (probably not found in DB)");
      // Inform user that AI couldn't produce recommendations for this title
      showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
      return null;
        }
    }

    async function clearFavoriteRequest(){
        const url = "https://www.animerecbert.online/api/clear_favorites";

        const resp = await fetchViaBg({ 
            url: url,
            method: "POST" 
        });
        if (!resp?.ok){
            console.warn("clearFavoriteRequest failed:", resp?.error || resp);
            return false;
        }

        console.log("clearFavoriteRequest success");
        return true;
    }

    async function makeAnimeLibSearch(romajiName){
        const url = "https://api.cdnlibs.org/api/anime?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&q=" + encodeURIComponent(romajiName);
        
        console.log("AnimeLib search request");

        const resp = await fetchViaBg({ url });
        if (!resp?.ok) {
            console.warn("search failed:", resp?.error || resp);
            return;
        }

        const data_ = resp.json ?? resp.text;
        console.log("Search data:", data_);

        let { data, links, meta } = data_; // Use 'let' here so we can reassign 'datas' later
        console.log("Build anime card");
        console.log(data);

        if (data.length < 1){
            console.log("Аниме не найдено на AnimeLib");
            return -1;
        }

        // --- FIX APPLIED HERE ---
        // Use filter to create a NEW array that only contains matching items
        data = data.filter(item => {
            // Destructure 'eng_name' from the current item in the array
            const { eng_name } = item;
            // Keep the item only if the English name matches romajiName
            return romajiName === eng_name; 
        });
        // --- END FIX ---


        // If we filtered all items out, handle that case
        if (data.length < 1) {
            console.log("No matching anime found after filtering by romajiName.");
            return -1;
        }


        // Reconstruct the data object with the filtered 'datas' array
        // We can just use the original 'data' object reference here if preferred, 
        // or return the new structure:
        // const resultData = {datas, links, meta};

        // The rest of your code assumes you found at least one match:
        const {cover} = data[0]; // Access the cover of the *first* matching result
        const {default_img, filename, md, thumbnail} = cover;
        console.log(default_img, filename, cover, md);


        // Return the updated data structure
        return {data, links, meta};
    }


    

    

    
  // ========================= BUILD SECTION =================================
  function buildLoadingSection() {
    const section = document.createElement("div");
    section.className = "section-body p2_p3";
    section.id = "plugin-recs";
    
    // Get extension URL for ai.gif
    const aiGifUrl = chrome.runtime.getURL('ai.gif');
    // Use LOADING_GIF_SETTINGS to build layout with optional overlap
    const size = Math.max(40, LOADING_GIF_SETTINGS.size);
    const gap = LOADING_GIF_SETTINGS.gap;
    const overlap = Math.max(0, LOADING_GIF_SETTINGS.overlap);
    const vPadding = LOADING_GIF_SETTINGS.vPadding;

    // clamp overlap so it doesn't exceed size
    const maxOverlap = Math.max(0, size - 8);
    const usedOverlap = Math.min(overlap, maxOverlap);

    // spacing between images when overlap applied becomes negative margin
    const imgGap = usedOverlap > 0 ? 0 : gap;

    // Build three image blocks with left-shift for overlap
    const imgsHtml = [0,1,2].map(i => {
      const shiftLeft = i === 0 ? 0 : (usedOverlap > 0 ? -usedOverlap * i : 0);
      const marginLeft = shiftLeft ? `${shiftLeft}px` : (i === 0 ? '0' : `${imgGap}px`);
      // For negative margin (overlap) we apply margin-left negative
      const ml = shiftLeft ? `${shiftLeft}px` : marginLeft;
      return `<div style="width: ${size}px; height: ${size}px; margin-left: ${ml};">
                <img src="${aiGifUrl}" alt="AI думает..." style="width: 100%; height: 100%; object-fit: contain; display:block;">
              </div>`;
    }).join('');

    section.style.paddingTop = vPadding + 'px';
    section.style.paddingBottom = vPadding + 'px';

    section.innerHTML = `
      <div class="media-section-head">
        <div class="section-title size-sm btns">
          <div class="section-title__link">
            <span>AI готовит Ваши рекомендации</span>
          </div>
        </div>
      </div>
      <div class="ej_g ej_ek">
        <div class="ej_az" id="plugin-scroll-content" style="display: flex; justify-content: center; align-items: center; min-height: ${Math.max(size,120)}px;">
          <div style="text-align: center; display:flex; justify-content:center; align-items:center;">
            <div style="display:flex; align-items:center;">
              ${imgsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
    return section;
  }

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

    function buildAnimeCard(animeLibJSON){
        const {data, links, meta} = animeLibJSON;        
        console.log("Build anime card");
        //console.log(ageRestriction, contentMarking, cover, eng_name, id, model, name, rating, releaseDate, releaseDateString, rus_name, shiki_rate, site, slug, slug_url, status, type);
        

        if (!data || !Array.isArray(data)){
            console.log("Аниме не найдено на AnimeLib");
            return -1;
        }

        const {ageRestriction, contentMarking, cover, eng_name, id, model, name, rating ,releaseDate, releaseDateString, rus_name, shiki_rate, site, slug, slug_url, status, type} = data[0];
        const {default_img, filename, md, thumbnail} = cover;
        console.log(default_img, filename, cover, md);

        const card = (`
                    <a href="javascript:void(0)" class="card-inline _elevated-2 _rounded-lg" data-media-info-tooltip="enabled" data-media-id="${id}">
                <div class="cover _shadow card-inline__cover _size-default">
                    <div class="cover__wrap">
                    <img src="${md}" alt="${rus_name}" class="cover__img" loading="lazy" onload="this.classList.add('_loaded')">
                    </div>
                </div>
                <div class="card-inline__body _content-between">
                    <div>
                    <div class="card-inline__heading">Оценка: ${rating.average}</div>
                    <div class="card-inline__name">${rus_name}</div>
                    </div>
                    <div class="card-inline__footer" style="margin-top:auto;">${type.label} · ${status.label}</div>
                </div>
                <div class="card-inline__rating">
                    <div class="c9_ea c9_eb" data-media-id="${id}">
                    <button class="c9_c2 c9_ef c9_bo c9_eh" data-act="up" title="Хорошая рекомендация" aria-label="Плюс">
                        ${PLUS_SVG}
                    </button>
                    <div class="c9_ec c9_ef" data-tooltip="Вверх плюса, Вниз минуса" data-kind="score">Тест</div>
                    <button class="c9_c2 c9_eg c9_bo c9_eh" data-act="down" title="Плохая рекомендация" aria-label="Минус">
                        ${MINUS_SVG}
                    </button>
                    </div>
                </div>
                </a>
            `);
        return card;
    }

  function buildRecsSection(cards) {
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
            <span>Рекомендации от AI (˶˃ ᵕ ˂˶)</span>
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
          ${cards}
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
  // guard flag to avoid concurrent insertion attempts (race condition)
  let _plugin_inserting = false;

  async function updateSection(section, cardsHtml) {
    if (!section) return;
    
    // Replace content with actual recommendations
    section.innerHTML = `
      <style>
        #plugin-scroll-content {
          display: flex !important;
          overflow-x: auto !important;
          scroll-behavior: smooth;
          gap: 16px;
          padding: 0 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        #plugin-scroll-content::-webkit-scrollbar {
          display: none;
        }
      </style>
      <div class="media-section-head">
        <div class="section-title size-sm btns">
          <div class="section-title__link">
            <span>Рекомендации от AI (˶˃ ᵕ ˂˶)</span>
            <svg class="svg-inline--fa fa-arrow-right fa-sm" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-right" role="img"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor"
                d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"></path></svg>
          </div>
        </div>
      </div>
      <div class="ej_g ej_ek">
        <div class="ej_bk ej_bp ej_b6 ej_eo" style="display: none;" data-scroll-dir="left"><div class="ej_bo">${CHEVRON_LEFT_SVG}</div></div>
        <div class="ej_bk ej_bq ej_b6 ej_eo" style="" data-scroll-dir="right"><div class="ej_bo">${CHEVRON_RIGHT_SVG}</div></div>
        <div class="ej_az" id="plugin-scroll-content">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Restore scroll functionality
    const scrollContent = section.querySelector('#plugin-scroll-content');
    const leftArrow = section.querySelector('[data-scroll-dir="left"]');
    const rightArrow = section.querySelector('[data-scroll-dir="right"]');

    // Re-add scroll listeners and arrow functionality
    if (scrollContent) {
      const updateArrows = () => {
        if (!scrollContent || !leftArrow || !rightArrow) return;
        const scrollLeft = Math.ceil(scrollContent.scrollLeft);
        const scrollWidth = scrollContent.scrollWidth;
        const clientWidth = scrollContent.clientWidth;
        const atStart = scrollLeft < 10;
        const atEnd = (scrollWidth - scrollLeft - clientWidth) < 10;
        leftArrow.style.display = atStart ? 'none' : 'block';
        rightArrow.style.display = atEnd ? 'none' : 'block';
      };

      scrollContent.addEventListener('scroll', updateArrows, { passive: true });
      setTimeout(updateArrows, 100);
      setTimeout(updateArrows, 300);

      // Re-add click handlers for navigation arrows and rating
      section.addEventListener("click", async (e) => {
        // Navigation arrows logic
        const arrowBtn = e.target.closest('[data-scroll-dir]');
        if (arrowBtn && scrollContent) {
          const direction = arrowBtn.getAttribute('data-scroll-dir');
          const scrollAmount = scrollContent.clientWidth * 0.8;
          
          scrollContent.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
          });
          
          setTimeout(updateArrows, 100);
          return;
        }

        // Rating logic
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
    }
  }

  async function insertOnce() {
    // quick guard: if the section already exists or insertion in progress
    if (document.getElementById("plugin-recs") || _plugin_inserting) {
      return false;
    }

    _plugin_inserting = true;
    try {
      const isTargetPage = isAnimeDetailUrl();
      if (!isTargetPage) {
        return false;
      }

      // Insert loading placeholder first
      const loadingSection = buildLoadingSection();
      let anchorAfter = findSectionBodyByTitle("Похожее")
        || findSectionBodyByTitle("Связанное")
        || findTagsSectionBody();
      let afterNode = anchorAfter || findScheduleContainer();

      if (afterNode) {
        afterNode.insertAdjacentElement("afterend", loadingSection);
      } else {
        const charsSB = findCharactersSectionBody();
        if (charsSB && charsSB.parentElement) {
          charsSB.parentElement.insertBefore(loadingSection, charsSB);
        } else {
          const firstSB = firstSectionBody();
          if (firstSB) {
            firstSB.insertAdjacentElement("afterend", loadingSection);
          } else {
            return false;
          }
        }
      }

      // Now fetch recommendations in background
      const el = document.querySelector('h2.qx_q0, h2[class^="qx_"]');
      const romajiName = el?.textContent.trim();
      if (!romajiName) {
        showError("Не удалось определить название для поиска рекомендаций");
        return true; // loading replaced by error -> treat as handled
      }

      const result = await getEnglishTitle(romajiName);
      const english = result?.english ?? result?.romaji ?? null;
      console.log(english);
      const data = await getSearchQueue(english);
      if (!data) {
        // If searchQueue returned null we assume AI couldn't make recommendations or server error.
        showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
        return true;
      }

      await clearFavoriteRequest();
      const recomendations = await parseRecomendations(data);
      if (!recomendations || recomendations.length === 0) {
        showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
        return true;
      }

      const cards = [];

      // build cards, skip failed ones
      for (let i = 0; i < Math.max(0, recomendations.length); i++) {
        const anime = await makeAnimeLibSearch(recomendations[i]);
        const card = buildAnimeCard(anime);
        if (card && card !== -1) cards.push(card);
      }

      if (cards.length === 0) {
        showError("По найденным результатам не удалось собрать карточки рекомендаций");
        return true;
      }

      const cardsHtml = cards.join("");

      // Update the loading section with actual recommendations
      const section = document.getElementById("plugin-recs");
      if (section) {
        await updateSection(section, cardsHtml);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('insertOnce error', err);
      return false;
    } finally {
      _plugin_inserting = false;
    }
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