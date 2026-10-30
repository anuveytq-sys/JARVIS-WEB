/* ULTRON WORLD FEED V3 — curated, globally distributed public live webcams.
   Camera records are sourced from Famelack's maintained public webcam dataset.
   Only publisher-provided YouTube live embeds are used; no private/IP cameras.
*/
(() => {
  'use strict';
  if (window.__ULTRON_WORLD_FEED_V3__) return;
  window.__ULTRON_WORLD_FEED_V3__ = true;

  const DATA_ROOT = 'https://raw.githubusercontent.com/famelack/famelack-data/main/webcams/raw/countries/';
  const COUNTRIES = ['in','jp','kr','sg','au','nz','id','th','ph','tw','ca','us','mx','br','ar','gb','ie','fr','es','pt','it','de','nl','ch','at','pl','za','ke'];
  const REFRESH_CATALOG_MS = 30 * 60 * 1000;
  const VIEW_MS = 55000;
  const LOAD_FAIL_MS = 12000;
  const MAX_CAMERAS = 500;
  let catalog = [];
  let currentIndex = -1;
  let timer = null;
  let failTimer = null;
  let generation = 0;
  let stopped = false;
  let catalogPromise = null;

  const panelSelector = '#ultron-clean-core .uc-worldcam';
  const clean = value => String(value || '').replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  const countryName = code => ({
    in:'INDIA',jp:'JAPAN',kr:'SOUTH KOREA',sg:'SINGAPORE',au:'AUSTRALIA',nz:'NEW ZEALAND',
    id:'INDONESIA',th:'THAILAND',ph:'PHILIPPINES',tw:'TAIWAN',ca:'CANADA',us:'UNITED STATES',
    mx:'MEXICO',br:'BRAZIL',ar:'ARGENTINA',gb:'UNITED KINGDOM',ie:'IRELAND',fr:'FRANCE',
    es:'SPAIN',pt:'PORTUGAL',it:'ITALY',de:'GERMANY',nl:'NETHERLANDS',ch:'SWITZERLAND',
    at:'AUSTRIA',pl:'POLAND',za:'SOUTH AFRICA',ke:'KENYA'
  }[code] || String(code || '').toUpperCase());

  const getPanel = () => document.querySelector(panelSelector);
  const setStatus = (panel, label, live) => {
    const place = panel.querySelector('.uc-worldcam-place');
    const badge = panel.querySelector('.uc-worldcam-live');
    if (place) place.textContent = label;
    if (badge) badge.textContent = live ? 'LIVE' : 'SEARCHING';
  };
  const cancelTimers = () => {
    if (timer) clearTimeout(timer);
    if (failTimer) clearTimeout(failTimer);
    timer = failTimer = null;
  };
  const schedule = (fn, ms) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
  const embedUrl = raw => {
    try {
      const u = new URL(raw);
      if (!/(^|\.)youtube(-nocookie)?\.com$/i.test(u.hostname)) return '';
      const match = u.pathname.match(/\/embed\/([\w-]{6,})/);
      if (!match) return '';
      return 'https://www.youtube-nocookie.com/embed/' + match[1] +
        '?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3';
    } catch (_) { return ''; }
  };

  const loadCatalog = () => {
    if (catalogPromise) return catalogPromise;
    catalogPromise = Promise.allSettled(COUNTRIES.map(async code => {
      const response = await fetch(DATA_ROOT + code + '.json', {
        cache: 'no-cache', credentials: 'omit', mode: 'cors'
      });
      if (!response.ok) throw new Error('catalog ' + code + ' ' + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows)) return [];
      return rows.map(row => {
        const sources = row && row.sources && Array.isArray(row.sources.youtube) ? row.sources.youtube : [];
        const url = sources.map(embedUrl).find(Boolean);
        if (!url || row.isGeoBlocked) return null;
        return {
          id: clean(row.nanoid || url),
          name: clean(row.name) || 'PUBLIC WEBCAM',
          country: countryName(code),
          url
        };
      }).filter(Boolean);
    })).then(results => {
      const merged = [];
      const seen = new Set();
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const cam of result.value) {
          if (seen.has(cam.id)) continue;
          seen.add(cam.id);
          merged.push(cam);
        }
      }
      // Shuffle to distribute locations instead of repeatedly showing one country.
      for (let i = merged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [merged[i], merged[j]] = [merged[j], merged[i]];
      }
      catalog = merged.slice(0, MAX_CAMERAS);
      catalogPromise = null;
      return catalog;
    }).catch(error => {
      catalogPromise = null;
      throw error;
    });
    return catalogPromise;
  };

  const ensureFrame = panel => {
    // The old HLS player is deliberately removed; this controller owns the feed panel.
    const video = panel.querySelector('.uc-worldcam-frame');
    if (video) {
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_) {}
      video.remove();
    }
    let frame = panel.querySelector('.uc-worldcam-embed');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'uc-worldcam-embed';
      frame.title = 'Public live webcam';
      frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.setAttribute('loading', 'eager');
      panel.appendChild(frame);
    }
    frame.style.visibility = 'visible';
    frame.style.pointerEvents = 'none';
    frame.style.zIndex = '1';
    const head = panel.querySelector('.uc-worldcam-head');
    const place = panel.querySelector('.uc-worldcam-place');
    if (head) { head.style.position = 'relative'; head.style.zIndex = '3'; }
    if (place) { place.style.zIndex = '3'; }
    return frame;
  };

  const showNext = async (panel, frame) => {
    if (stopped || !panel.isConnected || !frame.isConnected) return;
    cancelTimers();
    const myGeneration = ++generation;
    if (!catalog.length) {
      setStatus(panel, 'LOADING GLOBAL CAMERA DIRECTORY', false);
      try { await loadCatalog(); } catch (_) {}
    }
    if (stopped || myGeneration !== generation || !panel.isConnected) return;
    if (!catalog.length) {
      setStatus(panel, 'GLOBAL CAMERA DIRECTORY TEMPORARILY UNAVAILABLE', false);
      schedule(() => showNext(panel, frame), 12000);
      return;
    }

    currentIndex = (currentIndex + 1) % catalog.length;
    const cam = catalog[currentIndex];
    let settled = false;
    frame.onload = () => {
      if (stopped || myGeneration !== generation) return;
      settled = true;
      if (failTimer) clearTimeout(failTimer);
      failTimer = null;
      setStatus(panel, cam.name + ' · ' + cam.country + ' · PUBLIC LIVE STREAM', true);
      schedule(() => showNext(panel, frame), VIEW_MS);
    };
    frame.onerror = () => {
      if (stopped || myGeneration !== generation || settled) return;
      schedule(() => showNext(panel, frame), 800);
    };
    setStatus(panel, cam.name + ' · ' + cam.country, false);
    frame.removeAttribute('src');
    // Browser iframe load events can be delayed by YouTube; fail fast and rotate.
    failTimer = setTimeout(() => {
      if (stopped || myGeneration !== generation || settled) return;
      showNext(panel, frame);
    }, LOAD_FAIL_MS);
    frame.src = cam.url;
  };

  const boot = async () => {
    const started = Date.now();
    let panel = getPanel();
    while (!panel && !stopped && Date.now() - started < 20000) {
      await new Promise(resolve => setTimeout(resolve, 250));
      panel = getPanel();
    }
    if (!panel || stopped) return;
    const frame = ensureFrame(panel);
    panel.dataset.worldFeedController = 'v3-global';
    try {
      await loadCatalog();
    } catch (_) {}
    if (stopped || !panel.isConnected) return;
    await showNext(panel, frame);
    // Refresh the maintained camera directory in the background; never block ULTRON.
    const refresh = async () => {
      if (stopped) return;
      catalogPromise = null;
      try { await loadCatalog(); } catch (_) {}
      schedule(refresh, REFRESH_CATALOG_MS);
    };
    setTimeout(refresh, REFRESH_CATALOG_MS);
  };

  window.addEventListener('beforeunload', () => {
    stopped = true;
    cancelTimers();
    generation++;
  }, { once: true });
  boot();
})();
