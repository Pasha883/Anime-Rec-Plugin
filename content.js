(() => {
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
      insertOnce().then(ok => {
            if (ok) {
                window.dispatchEvent(new Event('resize'));
                watcher.stop?.(); 
            }
        });
    }
  }
  const watcher = new InsertWatcher();

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
  
  const CHEVRON_LEFT_SVG = `
    <svg class="svg-inline--fa fa-chevron-left" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-left" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"></path>
    </svg>`;
  const CHEVRON_RIGHT_SVG = `
    <svg class="svg-inline--fa fa-chevron-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path class="" fill="currentColor" d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path>
    </svg>`;
       
  
  function fetchViaBg({ url, method = "GET", headers = {}, body = null }) {
      return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "FETCH_JSON", url, method, headers, body }, (resp) => resolve(resp));
      });
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

  const API_URL = "http://158.160.175.208:8000/api/get_recs_by_single_title";

  async function getRecsBySingleAnime(animeLibId, top_k = 10) {
    console.log("[DEBUG] API_URL =", API_URL);

    const payload = {
      animeLibId: Number(animeLibId),
      top_k: top_k
    };

    const resp = await fetchViaBg({
      url: API_URL,
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp?.ok) {
      console.warn("getRecsBySingleAnime failed:", resp);
      return null;
    }

    const data = resp.json ?? resp.text;
    console.log("getRecsBySingleAnime Recommendations:", data);
    return data.recs || null;
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

  let _plugin_inserting = false;
async function updateSection(section, cardsHtml) {
  if (!section) return;

  // тот же класс-обёртка, что и у «Похожее»
  section.className = "section-body pm_pn";

  section.innerHTML = `
    <div class="media-section-head">
      <div class="section-title size-sm btns">
        <div class="section-title__link">
          <span>Рекомендации от AI (˶˃ ᵕ ˂˶)</span>
        </div>
      </div>
    </div>

    <!-- ВАЖНО: используем именно cs_* + data-атрибуты, как на сайте -->
    <div class="cs_j cs_ct" data-scroll-container="">
      <div class="cs_cu cs_cx cs_b7 cs_cz" style="display:none" data-scroll-dir="left">
        <div class="cs_cq">${CHEVRON_LEFT_SVG}</div>
      </div>
      <div class="cs_cu cs_c1 cs_b7 cs_cz" style="" data-scroll-dir="right">
        <div class="cs_cq">${CHEVRON_RIGHT_SVG}</div>
      </div>

      <div data-scroll-content="" class="cs_am" id="plugin-scroll-content">
        ${cardsHtml}
      </div>
    </div>
  `;

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

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-dir]');
    if (!btn) return;
    const dx = scrollContent.clientWidth * 0.8;
    scrollContent.scrollBy({ left: btn.dataset.scrollDir === 'left' ? -dx : dx, behavior: 'smooth' });
    setTimeout(updateArrows, 150);
  });

  scrollContent.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows, { passive: true });

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

      const url = window.location.href;
      const match = url.match(/\/anime\/(\d+)(?:--|\/)/);
      let id = null;
      if (match) {
        id = match[1];
        console.log(id); // "21371"
      }

      const recomendations = await getRecsBySingleAnime(id, 20);
      if (!recomendations || recomendations.length === 0) {
        showError("AI не смогла составить рекомендаций по данному аниме. Она ещё учится, простите :(");
        return true;
      }

      const cards = [];

      let successCount = 0;
      let i = 0;

      while (i < Math.max(0, recomendations.length) && successCount < 10) {
        const anime = await makeAnimeLibSearch(recomendations[i]);
        if (anime) {
          const card = buildAnimeCard(anime);
          if (card && card !== -1) {
            cards.push(card);
            successCount++;
          }
        }
        i++;
      }

      console.log(`Loaded ${successCount} cards from ${i} attempts`);


      if (cards.length === 0) {
        showError("По найденным результатам не удалось собрать карточки рекомендаций");
        return true;
      }

      const cardsHtml = cards.join("");

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