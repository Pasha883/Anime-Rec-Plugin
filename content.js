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
                // "Пинаем" сайт, чтобы он пересчитал размеры
                window.dispatchEvent(new Event('resize'));
                watcher.stop?.(); 
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
    if (!/\/anime\//.test(location.pathname)) return false;
    const section = new URLSearchParams(location.search).get('section');
    return !section || section === 'info';
  };
  
  // ========================= INLINE SVG FROM SITE ==========================
  const CHEVRON_LEFT_SVG = `
    <svg class="svg-inline--fa fa-chevron-left" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-left" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"></path>
    </svg>`;
  const CHEVRON_RIGHT_SVG = `
    <svg class="svg-inline--fa fa-chevron-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path>
    </svg>`;
  
  // ========================= API FUNCTIONS =================================
  // (Весь твой API-код остается без изменений)
  
  async function getEnglishTitle(romajiName) {
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
    } catch (err) { console.warn("AniList request failed:", err); }
    try {
        const jkResp = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(romajiName)}&limit=1`);
        if (jkResp.ok) {
        const jkJson = await jkResp.json();
        const d = jkJson.data?.[0];
        if (d) {
            const eng =
            d.title_english ||
            d.titles?.find(t => t.type === "English")?.title ||
            d.title;
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
    } catch (err) { console.warn("Jikan request failed:", err); }    
  }
  
  function fetchViaBg({ url, method = "GET", headers = {}, body = null }) {
      return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "FETCH_JSON", url, method, headers, body }, (resp) => resolve(resp));
      });
  }
  
  async function addFavoritesRequest(data) {
      if (!Array.isArray(data) || !Array.isArray(data[0])) return false;
      const payload = { anime_id: data[0][0], anime_name: data[0][1] };
      const url = "https://www.animerecbert.online/api/add_favorite";
      try {
          const resp = await fetchViaBg({
              url: url,
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify(payload),
          });
          if (!resp?.ok) { console.warn("addFavoritesRequest failed:", resp); return false; }
          console.log("addFavoritesRequest OK:", resp.json ?? resp.text);
          return true;
      } catch (e) { console.warn("addFavoritesRequest error:", e); return false; }
  }
  
  function showError(message = "Не удалось составить рекомендации"){
      const section = document.getElementById("plugin-recs");
      if (!section) { console.warn("showError: no plugin-recs section to update", message); return; }
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
        </div>`;
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
  
  async function getRecomendations() {
      console.log("Getting recommendations...");
      const payload = {
          filters: { show_sequels: false, show_movies: true, show_tv: true, show_ova: false },
          blacklisted_animes: [],
      };
      const resp = await fetchViaBg({
          url: "https://www.animerecbert.online/api/get_recommendations",
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload),
      });
      if (!resp?.ok) { console.warn("getRecomendations failed:", resp); return null; }
      const data = resp.json ?? resp.text;
      console.log("Recommendations:", data);
      return data;
  }
  
  async function getSearchQueue(animeName) {
      const url = "https://www.animerecbert.online/api/search_animes?q=" + encodeURIComponent(animeName);
      const resp = await fetchViaBg({ url });
      if (!resp?.ok) { console.warn("search failed:", resp?.error || resp); return null; }
      const data = resp.json ?? resp.text;
      console.log("Search data:", data);
      const added = await addFavoritesRequest(data);
      if (added) {
          const data = await getRecomendations();
          return data;
      } else {
          console.warn("Skip recommendations: addFavoritesRequest failed (probably not found in DB)");
          showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
          return null;
      }
  }
  
  async function clearFavoriteRequest(){
      const url = "https://www.animerecbert.online/api/clear_favorites";
      const resp = await fetchViaBg({ url: url, method: "POST" });
      if (!resp?.ok){ console.warn("clearFavoriteRequest failed:", resp?.error || resp); return false; }
      console.log("clearFavoriteRequest success");
      return true;
  }
  
  async function makeAnimeLibSearch(romajiName){
      const url = "https://api.cdnlibs.org/api/anime?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&q=" + encodeURIComponent(romajiName);
      console.log("AnimeLib search request");
      const resp = await fetchViaBg({ url });
      if (!resp?.ok) { console.warn("search failed:", resp?.error || resp); return; }
      const data_ = resp.json ?? resp.text;
      let { data, links, meta } = data_;
      if (data.length < 1){ console.log("Аниме не найдено на AnimeLib"); return -1; }
      data = data.filter(item => {
          const { eng_name } = item;
          return romajiName === eng_name; 
      });
      if (data.length < 1) { console.log("No matching anime found after filtering by romajiName."); return -1; }
      const {cover} = data[0];
      return {data, links, meta};
  }

  // ========================= BUILD SECTION =================================
  
  // (buildLoadingSection остается без изменений)
  const LOADING_GIF_SETTINGS = { size: 100, gap: 12, overlap: 0, vPadding: 6 };
  function buildLoadingSection() {
    const section = document.createElement("div");
    section.className = "section-body p2_p3";
    section.id = "plugin-recs";
    const aiGifUrl = chrome.runtime.getURL('ai.gif');
    const size = Math.max(40, LOADING_GIF_SETTINGS.size);
    const gap = LOADING_GIF_SETTINGS.gap;
    const overlap = Math.max(0, LOADING_GIF_SETTINGS.overlap);
    const vPadding = LOADING_GIF_SETTINGS.vPadding;
    const maxOverlap = Math.max(0, size - 8);
    const usedOverlap = Math.min(overlap, maxOverlap);
    const imgGap = usedOverlap > 0 ? 0 : gap;
    const imgsHtml = [0,1,2].map(i => {
      const shiftLeft = i === 0 ? 0 : (usedOverlap > 0 ? -usedOverlap * i : 0);
      const marginLeft = shiftLeft ? `${shiftLeft}px` : (i === 0 ? '0' : `${imgGap}px`);
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
  
  // *** ИСПРАВЛЕНИЕ #1: ВЁРСТКА КАРТОЧКИ (для обрезки текста) ***
  // (Этот код мы уже исправили, он правильный)
  function buildAnimeCard(animeLibJSON){
      const {data, links, meta} = animeLibJSON;        
      
      if (!data || !Array.isArray(data) || data.length === 0){
          console.log("Аниме не найдено на AnimeLib (в buildAnimeCard)");
          return -1;
      }

      const {cover, id, rating ,rus_name, slug_url, status, type} = data[0];
      const { md } = cover;
      const url = `/ru/anime/` + slug_url;

      const card = (`
          <a href="${url}" class="card-inline _elevated-2 _rounded-lg" data-media-info-tooltip="enabled" data-media-id="${id}">
            <div class="cover _shadow card-inline__cover _size-default">
                <div class="cover__wrap">
                <img src="${md}" alt="${rus_name}" class="cover__img" loading="lazy" onload="this.classList.add('_loaded')">
                </div>
            </div>
            <div class="card-inline__body _content-between">
                <div class="card-inline__heading">Оценка: ${rating.average}</div>
                <div class="card-inline__name">${rus_name}</div>
                <div class="card-inline__footer" style="margin-top:auto;">${type.label} · ${status.label}</div>
            </div>
          </a>
      `);
      return card;
  }

  // ========================= INSERTION STRATEGY ============================
  let _plugin_inserting = false;

  // *** ИСПРАВЛЕНИЕ #2: ВЁРСТКА СЕКЦИИ И ЛОГИКА СТРЕЛОК ***
  //
  // Эта функция теперь ВНЕДРЯЕТ <style> ДЛЯ ИСПРАВЛЕНИЯ CSS
  // и содержит СОБСТВЕННЫЙ JS для управления стрелками.
  //
  // Полная замена функции updateSection
async function updateSection(section, cardsHtml) {
  if (!section) return;

  // тот же класс-обёртка, что и у «Похожее»
  section.className = "section-body p7_p8";

  section.innerHTML = `
    <div class="media-section-head">
      <div class="section-title size-sm btns">
        <div class="section-title__link">
          <span>Рекомендации от AI (˶˃ ᵕ ˂˶)</span>
        </div>
      </div>
    </div>

    <!-- ВАЖНО: используем именно cs_* + data-атрибуты, как на сайте -->
    <div class="cs_i cs_ct" data-scroll-container="">
      <div class="cs_cu cs_cx cs_b7 cs_cz" style="display:none" data-scroll-dir="left">
        <div class="cs_cq">${CHEVRON_LEFT_SVG}</div>
      </div>
      <div class="cs_cu cs_c1 cs_b7 cs_cz" style="" data-scroll-dir="right">
        <div class="cs_cq">${CHEVRON_RIGHT_SVG}</div>
      </div>

      <div data-scroll-content="" class="cs_ag" id="plugin-scroll-content">
        ${cardsHtml}
      </div>
    </div>
  `;

  // Локальная логика показа/скрытия стрелок (подстраховка, если сайтный код не сработает)
  const scrollContent = section.querySelector('#plugin-scroll-content');
  const leftArrow = section.querySelector('[data-scroll-dir="left"]');
  const rightArrow = section.querySelector('[data-scroll-dir="right"]');

  if (!scrollContent || !leftArrow || !rightArrow) return;

  const updateArrows = () => {
    const L = Math.ceil(scrollContent.scrollLeft);
    const maxL = scrollContent.scrollWidth - scrollContent.clientWidth;
    leftArrow.style.display  = (L <= 4)       ? 'none'  : '';
    rightArrow.style.display = (maxL - L <= 4)? 'none'  : '';
  };

  // клики по стрелкам
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-dir]');
    if (!btn) return;
    const dx = scrollContent.clientWidth * 0.8;
    scrollContent.scrollBy({ left: btn.dataset.scrollDir === 'left' ? -dx : dx, behavior: 'smooth' });
    setTimeout(updateArrows, 150);
  });

  // следим за скроллом/ресайзом
  scrollContent.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows, { passive: true });

  // первичный расчёт
  setTimeout(updateArrows, 150);
  setTimeout(updateArrows, 300);
}

  async function insertOnce() {
    if (document.getElementById("plugin-recs") || _plugin_inserting) {
      return false;
    }
    _plugin_inserting = true;
    try {
      const isTargetPage = isAnimeDetailUrl();
      if (!isTargetPage) {
        return false;
      }
      
      // 1. Вставляем заглушку
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

      // 2. Получаем рекомендации
      const el = document.querySelector('h2.sa_se, h2[class^="sa_"]');
      const romajiName = el?.textContent.trim();
      if (!romajiName) {
        showError("Не удалось определить название для поиска рекомендаций");
        return true;
      }

      const result = await getEnglishTitle(romajiName);
      const english = result?.english ?? result?.romaji ?? null;
      console.log(english);
      const data = await getSearchQueue(english);
      if (!data) {
        // showError() уже вызвана внутри getSearchQueue
        return true;
      }

      await clearFavoriteRequest();
      const recomendations = await parseRecomendations(data);
      if (!recomendations || recomendations.length === 0) {
        showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
        return true;
      }

      // 3. Собираем карточки
      const cards = [];
      for (let i = 0; i < Math.max(0, recomendations.length); i++) {
        const anime = await makeAnimeLibSearch(recomendations[i]);
        if (!anime) continue; 
        
        // Используем ИСПРАВЛЕННУЮ `buildAnimeCard`
        const card = buildAnimeCard(anime); 
        if (card && card !== -1) cards.push(card);
      }

      if (cards.length === 0) {
        showError("По найденным результатам не удалось собрать карточки рекомендаций");
        return true;
      }

      const cardsHtml = cards.join("");

      // 4. Обновляем секцию, используя ИСПРАВЛЕННУЮ `updateSection`
      const section = document.getElementById("plugin-recs");
      if (section) {
        await updateSection(section, cardsHtml);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('insertOnce error', err);
      showError("Произошла непредвиденная ошибка при загрузке рекомендаций.");
      return false;
    } finally {
      _plugin_inserting = false;
    }
  }

  // ========================= BOOT (NEW RELIABLE LOGIC) =====================
  // (Этот код запуска остается без изменений)
  
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