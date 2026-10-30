/* ULTRON WORLD FEED V5
   Uses operator-published, direct HLS webcam streams from the maintained
   Live-Environment-Streams registry. A camera is labelled LIVE only after
   the browser reports real video playback and advancing frames.
*/
(() => {
  'use strict';
  if (window.__ULTRON_WORLD_FEED_V5__) return;
  window.__ULTRON_WORLD_FEED_V5__ = true;

  const REGISTRY = 'https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/main/data/';
  const COUNTRIES = ['JP','IT','TH','KR','DE','FR','PT','PL','TR','ID','ES','HR','CZ','RO','NO','IS','NZ','PH','TW','GB','MT','AU','CA','IN'];
  const ALLOWED_SCENES = new Set(['urban','coastal','mountain','harbor','lake','nature','waterway','landmark','marina']);
  const ROTATE_MS = 30000;
  const START_TIMEOUT_MS = 9000;
  const MAX_FEEDS = 180;

  // Small fallback set from public operators already used by the project.
  // Every entry still has to pass the same real-playback test before display.
  const FALLBACK = [
    {name:'BURLEIGH BEACH · AUSTRALIA',url:'https://d1nm4r8e5x1rwd.cloudfront.net/cw/burleighheadscamera.stream/playlist.m3u8'},
    {name:'CURRUMBIN BEACH · AUSTRALIA',url:'https://d1nm4r8e5x1rwd.cloudfront.net/cw/currumbincamera.stream/playlist.m3u8'},
    {name:'NARROWNECK · AUSTRALIA',url:'https://d1nm4r8e5x1rwd.cloudfront.net/cw/narrowneckhighcamera.stream/playlist.m3u8'},
    {name:'SURFERS PARADISE · AUSTRALIA',url:'https://d1nm4r8e5x1rwd.cloudfront.net/cw/surfersparadisecamera.stream/playlist.m3u8'},
    {name:'BOŽÍ DAR · CZECHIA',url:'https://kamery3.wolfnet.cz/bozi_dar.m3u8'},
    {name:'KARLOVY VARY · CZECHIA',url:'https://kamery2.wolfnet.cz/krusna.m3u8'},
    {name:'THE GRÖMITZ COAST · GERMANY',url:'https://osl9.lvstrm.de/hls/stream.m3u8'},
    {name:'TENBY HARBOUR · UNITED KINGDOM',url:'https://s74.ipcamlive.com/streams/4azcyiwhlasoszw6g/stream.m3u8'},
    {name:'ALVOR BEACH · PORTUGAL',url:'https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8'},
    {name:'APÚLIA BEACH · PORTUGAL',url:'https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8'},
    {name:'WHISTLER VILLAGE · CANADA',url:'https://streamer6.brownrice.com/whistlervillagefitz/whistlervillagefitz.stream/main_playlist.m3u8'}
  ];

  let catalog = [];
  let catalogPromise = null;
  let hlsPromise = null;
  let panel = null;
  let video = null;
  let player = null;
  let timers = [];
  let generation = 0;
  let index = -1;
  let observer = null;
  let active = false;
  let currentCam = null;

  const clean = value => String(value || '').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
  const countryName = code => ({
    AU:'AUSTRALIA',CA:'CANADA',CZ:'CZECHIA',DE:'GERMANY',ES:'SPAIN',FR:'FRANCE',
    GB:'UNITED KINGDOM',HR:'CROATIA',ID:'INDONESIA',IN:'INDIA',IS:'ICELAND',
    IT:'ITALY',JP:'JAPAN',KR:'SOUTH KOREA',MT:'MALTA',NO:'NORWAY',NZ:'NEW ZEALAND',
    PH:'PHILIPPINES',PL:'POLAND',PT:'PORTUGAL',RO:'ROMANIA',TH:'THAILAND',
    TR:'TÜRKIYE',TW:'TAIWAN'
  }[code] || code);

  const status = (label, live=false) => {
    if (!panel?.isConnected) return;
    const place = panel.querySelector('.uc-worldcam-place');
    const badge = panel.querySelector('.uc-worldcam-live');
    if (place) place.textContent = label;
    if (badge) badge.textContent = live ? 'LIVE' : 'SEARCHING';
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const loadHls = () => {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsPromise) return hlsPromise;
    hlsPromise = new Promise((resolve,reject) => {
      const existing = document.querySelector('script[data-ultron-hls]');
      if (existing) {
        existing.addEventListener('load',() => window.Hls ? resolve(window.Hls) : reject(new Error('HLS unavailable')),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js';
      script.async = true;
      script.dataset.ultronHls = '1';
      script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS unavailable'));
      script.onerror = reject;
      document.head.appendChild(script);
    }).catch(error => { hlsPromise = null; throw error; });
    return hlsPromise;
  };

  const loadCatalog = () => {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      const buckets = [];
      for (let i=0;i<COUNTRIES.length;i+=4) {
        const batch = await Promise.allSettled(COUNTRIES.slice(i,i+4).map(async code => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(),6500);
          try {
            const response = await fetch(REGISTRY + code + '.json',{signal:controller.signal,cache:'force-cache',credentials:'omit'});
            if (!response.ok) throw new Error('Registry HTTP '+response.status);
            const data = await response.json();
            return (Array.isArray(data?.features) ? data.features : []).flatMap(feature => {
              const p = feature?.properties || {};
              if (p.status !== 'active' || p.url_type !== 'hls' || p.source_url_requires ||
                  !ALLOWED_SCENES.has(String(p.environment || '').toLowerCase()) ||
                  String(p.scene_type || '').toLowerCase() === 'traffic' ||
                  typeof p.url !== 'string' || !/^https:\/\//i.test(p.url) || !/\.m3u8(?:[?#]|$)/i.test(p.url)) return [];
              const place = clean(p.display_name || p.name || countryName(code));
              return [{name:(place + ' · ' + countryName(code)).slice(0,100),url:p.url}];
            });
          } finally { clearTimeout(timeout); }
        }));
        for (const item of batch) if (item.status === 'fulfilled' && item.value.length) buckets.push(item.value);
      }
      const merged = [];
      const seen = new Set();
      // Round-robin countries so one large country cannot dominate the rotation.
      while (buckets.some(bucket => bucket.length) && merged.length < MAX_FEEDS) {
        for (const bucket of buckets) {
          const cam = bucket.shift();
          if (cam && !seen.has(cam.url)) { seen.add(cam.url); merged.push(cam); }
          if (merged.length >= MAX_FEEDS) break;
        }
      }
      for (const cam of FALLBACK) if (!seen.has(cam.url)) { seen.add(cam.url); merged.push(cam); }
      for (let i=merged.length-1;i>0;i--) {
        const j=Math.floor(Math.random()*(i+1));
        [merged[i],merged[j]]=[merged[j],merged[i]];
      }
      catalog = merged;
      return catalog;
    })().finally(() => { catalogPromise = null; });
    return catalogPromise;
  };

  const destroyPlayer = () => {
    if (player) {
      try { player.destroy(); } catch (_) {}
      player = null;
    }
    if (video) {
      video.onplaying = video.onerror = video.onstalled = video.onwaiting = null;
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_) {}
      video.style.visibility = 'visible';
      video.style.opacity = '1';
    }
  };

  const nextCamera = async () => {
    if (!active || !panel?.isConnected || !video?.isConnected) return;
    clearTimers();
    const token = ++generation;
    destroyPlayer();
    if (!catalog.length) {
      status('LOADING VERIFIED PUBLIC CAMERA DIRECTORY');
      try { await loadCatalog(); } catch (_) {}
    }
    if (!active || token !== generation || !panel?.isConnected) return;
    if (!catalog.length) {
      status('PUBLIC CAMERA DIRECTORY UNAVAILABLE');
      later(nextCamera,10000);
      return;
    }
    index = (index + 1) % catalog.length;
    const cam = currentCam = catalog[index];
    status(clean(cam.name));
    let failed = false;
    let liveConfirmed = false;
    let startTimer = null;
    let monitor = null;
    let lastTime = -1;
    let lastAdvance = Date.now();

    const fail = () => {
      if (failed || token !== generation) return;
      failed = true;
      if (startTimer) clearTimeout(startTimer);
      if (monitor) clearInterval(monitor);
      nextCamera();
    };
    const confirm = () => {
      if (failed || liveConfirmed || token !== generation) return;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight || video.paused) return;
      const now = Number(video.currentTime) || 0;
      if (lastTime >= 0 && now > lastTime + 0.15) {
        liveConfirmed = true;
        if (startTimer) clearTimeout(startTimer);
        status(clean(cam.name) + ' · ' + countryName(cam.country || '') .trim(),true);
        later(nextCamera,ROTATE_MS);
        lastAdvance = Date.now();
        monitor = setInterval(() => {
          if (token !== generation || !active || !video?.isConnected) { clearInterval(monitor); return; }
          const t = Number(video.currentTime) || 0;
          if (!video.paused && video.readyState >= 2 && t > lastTime + 0.12) {
            lastTime = t; lastAdvance = Date.now();
          } else if (Date.now()-lastAdvance > 9000) fail();
        },1500);
      } else {
        lastTime = now;
      }
    };

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    video.style.pointerEvents = 'none';
    video.onplaying = confirm;
    video.onerror = fail;
    video.onstalled = () => { if (liveConfirmed) lastAdvance = Date.now()-10000; };
    video.onwaiting = () => { if (liveConfirmed) lastAdvance = Date.now()-10000; };
    startTimer = setTimeout(fail,START_TIMEOUT_MS);

    const tryPlay = () => video.play().catch(() => fail());
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cam.url;
        video.load();
        tryPlay();
      } else {
        const Hls = await loadHls();
        if (token !== generation || !active) return;
        if (!Hls.isSupported()) { fail(); return; }
        const hls = new Hls({
          enableWorker:true,lowLatencyMode:true,
          liveSyncDurationCount:3,maxLiveSyncPlaybackRate:1.25,
          manifestLoadingTimeOut:6000,fragLoadingTimeOut:6000,
          manifestLoadingMaxRetry:1,fragLoadingMaxRetry:1,
          backBufferLength:20
        });
        player = hls;
        hls.on(Hls.Events.ERROR,(_event,data) => { if (data?.fatal) fail(); });
        hls.on(Hls.Events.MEDIA_ATTACHED,() => {
          if (token !== generation || failed) return;
          hls.loadSource(cam.url);
        });
        hls.on(Hls.Events.MANIFEST_PARSED,() => { if (token === generation && !failed) tryPlay(); });
        hls.attachMedia(video);
      }
    } catch (_) { fail(); }
  };

  const attachPanel = found => {
    if (!found?.isConnected || found === panel) return;
    clearTimers();
    generation++;
    destroyPlayer();
    panel = found;
    video = panel.querySelector('.uc-worldcam-frame');
    // Remove the old iframe player completely; the direct video element owns this panel.
    const oldFrame = panel.querySelector('.uc-worldcam-embed');
    if (oldFrame) oldFrame.remove();
    if (!video) return;
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = 'calc(100% - 20px)';
    video.style.objectFit = 'cover';
    video.style.visibility = 'visible';
    active = true;
    status('CONNECTING TO PUBLIC LIVE CAMERAS');
    nextCamera();
  };

  const scan = () => {
    const found = document.querySelector('#ultron-clean-core .uc-worldcam');
    if (found && found !== panel) attachPanel(found);
  };
  const startObserver = () => {
    scan();
    if (observer || !document.body) return;
    observer = new MutationObserver(scan);
    observer.observe(document.body,{childList:true,subtree:true});
  };

  window.addEventListener('pagehide',() => {
    active = false;
    clearTimers();
    generation++;
    destroyPlayer();
    observer?.disconnect();
  },{once:true});

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded',startObserver,{once:true});
})();
