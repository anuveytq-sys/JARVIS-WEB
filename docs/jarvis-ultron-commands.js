/* JARVIS // ULTRON FLEXIBLE COMMAND BRIDGE
   Natural ULTRON aliases + isolated public world-camera manager.
   The manager owns only the camera video/status pipeline; all other ULTRON UI
   and command behavior remains untouched.
*/
(() => {
  'use strict';
  if (window.__JARVIS_ULTRON_COMMANDS__) return;
  window.__JARVIS_ULTRON_COMMANDS__ = true;

  const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const OPEN_PATTERNS = [
    /^hey jarvis (please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(jarvis )?(please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(release|unleash|deploy|initialize|power up|wake up) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(take me to|go to|enter|enter the) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(i want|i need) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(activate|open|start) ultron intelligence$/,
    /^ultron (open|launch|start|activate|engage|boot|online|wake up)$/
  ];

  const CLOSE_PATTERNS = [
    /^(hey jarvis )?(please )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron$/,
    /^(hey jarvis )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(stand down|power down|put away|take down) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(return|go back|take me back) (from|out of) (the )?ultron$/,
    /^ultron (close|exit|quit|shutdown|shut down|offline|sleep)$/
  ];
  const matches = (patterns, text) => patterns.some(pattern => pattern.test(text));

  function installStableWorldFeedManager() {
    if (window.__ULTRON_STABLE_WORLD_FEEDS__) return;
    window.__ULTRON_STABLE_WORLD_FEEDS__ = true;

    const FALLBACKS = [
      ['BANTEN HIGHWAY · INDONESIA','https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10003.m3u8'],
      ['BANTEN · INDONESIA','https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10019.m3u8'],
      ['SEOUL CITY · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/edge13/ch16.stream/playlist.m3u8'],
      ['SEOUL ROAD · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/sd1/ch34.stream/playlist.m3u8'],
      ['SEOUL VIEW · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/sd2/ch66.stream/playlist.m3u8'],
      ['SEOUL CITY VIEW · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/edge6/ch77.stream/playlist.m3u8'],
      ['SEOUL ROAD VIEW · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/edge6/ch113.stream/playlist.m3u8'],
      ['CHON BURI · THAILAND','https://camerai1.iticfoundation.org/hls/pty85.m3u8'],
      ['KHON KAEN · THAILAND','https://camerai1.iticfoundation.org/hls/kk12.m3u8'],
      ['BANGKOK · THAILAND','https://camera1.iticfoundation.org/hls/10.8.0.21_8001.m3u8'],
      ['BANGKOK TRANSIT · THAILAND','https://camerai1.iticfoundation.org/hls/charlie-new-tran-10.m3u8'],
      ['CHACHOENGSAO · THAILAND','https://camera1.iticfoundation.org/hls/10.8.0.24_8554.m3u8'],
      ['BURLEIGH BEACH · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/burleighheadscamera.stream/playlist.m3u8'],
      ['CURRUMBIN BEACH · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/currumbincamera.stream/playlist.m3u8'],
      ['NARROWNECK · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/narrowneckhighcamera.stream/playlist.m3u8'],
      ['SURFERS PARADISE · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/surfersparadisecamera.stream/playlist.m3u8'],
      ['MISSISSAUGA · CANADA','https://webvideo.mississauga.ca/BalconyWebcam/LiveWebcam.stream/chunklist_w1473770124.m3u8'],
      ['WHISTLER VILLAGE · CANADA','https://streamer6.brownrice.com/whistlervillagefitz/whistlervillagefitz.stream/main_playlist.m3u8'],
      ['BOZI DAR · CZECHIA','https://kamery3.wolfnet.cz/bozi_dar.m3u8'],
      ['BOZI DAR PANORAMA · CZECHIA','https://kamery2.wolfnet.cz/bozi_vyhlidka1.m3u8'],
      ['KARLOVY VARY · CZECHIA','https://kamery2.wolfnet.cz/krusna.m3u8'],
      ['KLINOVEC · CZECHIA','https://kamery2.wolfnet.cz/Klinovec_1.m3u8'],
      ['GROMITZ COAST · GERMANY','https://osl9.lvstrm.de/hls/stream.m3u8'],
      ['ISTANBUL · TURKIYE','https://601a55c88ec6d.streamlock.net/hls/506.stream/playlist.m3u8'],
      ['ISTANBUL PANORAMA · TURKIYE','https://601a55c88ec6d.streamlock.net/hls/720.stream/playlist.m3u8'],
      ['SAO PAULO · BRAZIL','https://34.104.32.249.nip.io/SP360-KM110/stream.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP055-KM193/stream.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP055-KM211A/stream.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP008-KM095/stream.m3u8'],
      ['ACUNA BRIDGE · MEXICO','https://s78.ipcamlive.com/streams/4e49zoi8ngjmple0u/stream.m3u8'],
      ['TENBY HARBOUR · UNITED KINGDOM','https://s74.ipcamlive.com/streams/4azcyiwhlasoszw6g/stream.m3u8'],
      ['RIVER BURE · UNITED KINGDOM','https://s101.ipcamlive.com/streams/65jrzbexkvsgqd4ci/stream.m3u8'],
      ['CASTEL VOLTURNO · ITALY','https://5e0add8153fcd.streamlock.net:1936/vedetta/castel-volturno.stream/playlist.m3u8'],
      ['FLORENCE · ITALY','https://5e0add8153fcd.streamlock.net:1936/vedetta/via-della-scala.stream/chunklist_w1359048502.m3u8'],
      ['ANDRYCHOW · POLAND','https://hoktastream3.webcamera.pl/andrychow_cam_3aad9b/andrychow_cam_3aad9b.stream/playlist.m3u8'],
      ['BUKOWINA TATRZANSKA · POLAND','https://hoktastream1.webcamera.pl/bukovina_cam_7aa04f/bukovina_cam_7aa04f.stream/playlist.m3u8'],
      ['WARSAW CASTLE · POLAND','https://hoktastream2.webcamera.pl/warszawa_cam_5f3b1a/warszawa_cam_5f3b1a.stream/chunks.m3u8'],
      ['ALVOR BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8'],
      ['APULIA BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8'],
      ['ARMACAO DE PERA · PORTUGAL','https://video-auth1.iol.pt/beachcam/armacaodepera/playlist.m3u8'],
      ['ARRIFANA · PORTUGAL','https://video-auth1.iol.pt/beachcam/arrifana/playlist.m3u8'],
      ['CARCAVELOS BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/carcavelos/playlist.m3u8'],
      ['COSTA DA CAPARICA · PORTUGAL','https://video-auth1.iol.pt/beachcam/costacaparicacds/playlist.m3u8'],
      ['BRASOV · ROMANIA','https://digilive.rcs-rds.ro/digilivedge/poiana_brasov_desktop.stream/index.m3u8'],
      ['SINAIA · ROMANIA','https://digilive.rcs-rds.ro/digilivedge/sinaia_desktop.stream/index.m3u8']
    ];

    let stopped = false;
    let player = null;
    let current = null;
    let currentTimer = null;
    let probeTimer = null;
    let observer = null;
    let readyPoll = null;
    let pool = FALLBACKS.slice();

    const LOAD_TIMEOUT = 3500;
    const STALL_TIMEOUT = 3500;
    const ROTATE_MS = 20000;
    const STATUS_WORDS = /^(checking live feed|connecting(?: to public cam)?|searching for live feed|reconnecting|loading live feed|buffering|connecting)$/i;

    const getPanel = () => document.getElementById('ultron-clean-core')?.querySelector('.uc-worldcam');
    const getVideo = () => getPanel()?.querySelector('.uc-worldcam-frame');
    const getPlace = () => getPanel()?.querySelector('.uc-worldcam-place');
    const getBadge = () => getPanel()?.querySelector('.uc-worldcam-live');

    const clearTimer = key => {
      if (key === 'current' && currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
      if (key === 'probe' && probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
    };

    const destroyPlayer = () => {
      if (player) { try { player.destroy(); } catch (_) {} player = null; }
    };

    const silenceStatus = () => {
      const panel = getPanel();
      if (!panel) return;
      const place = getPlace();
      if (place) {
        place.textContent = '';
        place.replaceChildren();
        place.style.setProperty('display', 'none', 'important');
        place.style.setProperty('visibility', 'hidden', 'important');
        place.setAttribute('aria-hidden', 'true');
      }
      const panelStyle = document.getElementById('ultron-stable-world-feed-style');
      if (!panelStyle) {
        const style = document.createElement('style');
        style.id = 'ultron-stable-world-feed-style';
        style.textContent = '#ultron-clean-core .uc-worldcam-place{display:none!important;visibility:hidden!important;opacity:0!important} #ultron-clean-core .uc-worldcam-frame{background:transparent!important}';
        document.head.appendChild(style);
      }
      const badge = getBadge();
      if (badge) { badge.textContent = 'LIVE'; badge.style.opacity = '1'; }
      panel.querySelectorAll('*').forEach(node => {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        if (STATUS_WORDS.test(text)) {
          node.textContent = '';
          node.style.display = 'none';
          node.setAttribute('aria-hidden', 'true');
        }
      });
    };

    const isolateVideo = () => {
      const panel = getPanel();
      const old = panel?.querySelector('.uc-worldcam-frame');
      if (!old || old.dataset.ultronStableOwned === '1') return old;
      const fresh = document.createElement('video');
      fresh.className = old.className;
      fresh.title = old.title;
      fresh.autoplay = true;
      fresh.muted = true;
      fresh.playsInline = true;
      fresh.setAttribute('playsinline', '');
      fresh.setAttribute('muted', '');
      fresh.setAttribute('disablepictureinpicture', '');
      fresh.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen');
      fresh.dataset.ultronStableOwned = '1';
      fresh.style.visibility = 'hidden';
      old.replaceWith(fresh);
      try { old.pause(); old.removeAttribute('src'); old.load(); } catch (_) {}
      return fresh;
    };

    const watchDom = () => {
      if (observer) observer.disconnect();
      observer = new MutationObserver(() => {
        if (stopped) return;
        if (getPanel()) { isolateVideo(); silenceStatus(); }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    };

    const fail = url => {
      pool = pool.filter(item => item[1] !== url);
      setTimeout(() => { if (!stopped) startCycle(); }, 40);
    };

    const nativePlayable = video => !!video.canPlayType?.('application/vnd.apple.mpegurl');

    const playCandidate = (item, done) => {
      const test = document.createElement('video');
      test.muted = true;
      test.autoplay = true;
      test.playsInline = true;
      test.preload = 'auto';
      test.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;opacity:0;pointer-events:none';
      document.body.appendChild(test);

      let h = null;
      let settled = false;
      const timeout = setTimeout(() => finish(false), LOAD_TIMEOUT);
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { test.pause(); test.removeAttribute('src'); test.load(); } catch (_) {}
        try { h?.destroy(); } catch (_) {}
        test.remove();
        done(ok ? item : null);
      };

      const startNative = () => {
        test.onerror = () => finish(false);
        test.onplaying = () => finish(true);
        try {
          test.src = item[1];
          test.load();
          const p = test.play();
          if (p?.catch) p.catch(() => {});
        } catch (_) { finish(false); }
      };

      const startHls = H => {
        try {
          h = new H({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 5, manifestLoadingTimeOut: 2200, levelLoadingTimeOut: 2200, fragLoadingTimeOut: 2200, backBufferLength: 15 });
          h.on(H.Events.ERROR, (_, data) => { if (data?.fatal) finish(false); });
          h.on(H.Events.MANIFEST_PARSED, () => { try { const p = test.play(); if (p?.catch) p.catch(() => {}); } catch (_) {} });
          h.on(H.Events.FRAG_LOADED, () => finish(true));
          h.loadSource(item[1]);
          h.attachMedia(test);
        } catch (_) { finish(false); }
      };

      if (window.Hls?.isSupported?.()) startHls(window.Hls);
      else if (nativePlayable(test)) startNative();
      else finish(false);
    };

    const probeBatch = (items, done) => {
      let settled = false;
      let remaining = items.length;
      items.forEach(item => playCandidate(item, result => {
        if (result && !settled) { settled = true; done(result); }
        else if (!result) { remaining -= 1; if (remaining <= 0 && !settled) { settled = true; done(null); } }
      }));
    };

    const chooseBatch = () => {
      if (!pool.length) pool = FALLBACKS.slice();
      const batch = [];
      while (batch.length < Math.min(6, pool.length)) {
        const i = Math.floor(Math.random() * pool.length);
        const item = pool.splice(i, 1)[0];
        if (!batch.some(x => x[1] === item[1])) batch.push(item);
      }
      return batch;
    };

    const loadToVisible = item => {
      const video = isolateVideo();
      if (!video || !item || stopped) return false;
      destroyPlayer();
      video.style.visibility = 'hidden';
      silenceStatus();

      let settled = false;
      let stallWatch = null;
      const finishGood = () => {
        if (settled || stopped) return;
        settled = true;
        if (stallWatch) clearInterval(stallWatch);
        video.dataset.ultronStableVisible = '1';
        video.style.visibility = 'visible';
        silenceStatus();
        current = item;
        clearTimer('current');
        currentTimer = setTimeout(() => { if (!stopped) startCycle(); }, ROTATE_MS);
        clearTimer('probe');
      };
      const finishBad = () => {
        if (settled) return;
        settled = true;
        if (stallWatch) clearInterval(stallWatch);
        fail(item[1]);
      };

      const attach = H => {
        if (stopped) return;
        if (H?.isSupported?.()) {
          try {
            player = new H({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 6, manifestLoadingTimeOut: 2200, levelLoadingTimeOut: 2200, fragLoadingTimeOut: 2200, backBufferLength: 15 });
            player.on(H.Events.ERROR, (_, data) => { if (data?.fatal) finishBad(); });
            player.on(H.Events.MANIFEST_PARSED, () => { try { const p = video.play(); if (p?.catch) p.catch(() => {}); } catch (_) {} });
            player.on(H.Events.FRAG_LOADED, () => finishGood());
            player.loadSource(item[1]);
            player.attachMedia(video);
          } catch (_) { finishBad(); return; }
        } else if (nativePlayable(video)) {
          video.onerror = finishBad;
          video.onplaying = finishGood;
          try {
            video.src = item[1];
            video.load();
            const p = video.play();
            if (p?.catch) p.catch(() => {});
          } catch (_) { finishBad(); return; }
        } else { finishBad(); return; }

        const start = Date.now();
        const watch = () => {
          if (settled || stopped) return;
          if (!video.paused && video.readyState >= 2 && Number.isFinite(video.currentTime)) {
            if (!stallWatch) {
              let last = video.currentTime;
              let lastAdvance = Date.now();
              stallWatch = setInterval(() => {
                if (settled || stopped) return;
                const now = video.currentTime;
                if (!video.paused && video.readyState >= 2 && now > last + 0.08) { last = now; lastAdvance = Date.now(); }
                else if (Date.now() - lastAdvance > STALL_TIMEOUT) finishBad();
              }, 700);
            }
          }
          if (!settled && Date.now() - start > LOAD_TIMEOUT) finishBad();
          else if (!settled) setTimeout(watch, 250);
        };
        watch();
      };

      if (window.Hls?.isSupported?.()) attach(window.Hls);
      else {
        const existing = document.querySelector('script[data-ultron-world-hls]');
        if (existing && window.Hls) attach(window.Hls);
        else if (existing) existing.addEventListener('load', () => attach(window.Hls), { once: true });
        else {
          const script = document.createElement('script');
          script.async = true;
          script.dataset.ultronWorldHls = '1';
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
          script.onload = () => attach(window.Hls);
          script.onerror = () => { if (nativePlayable(video)) attach(null); else finishBad(); };
          document.head.appendChild(script);
        }
      }
      return true;
    };

    const startCycle = () => {
      if (stopped) return;
      const panel = getPanel();
      if (!panel) return;
      clearTimer('probe');
      const batch = chooseBatch();
      probeTimer = setTimeout(() => {
        probeBatch(batch, item => { if (stopped) return; if (item) loadToVisible(item); else startCycle(); });
      }, 0);
    };

    const loadRegistry = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/main/streams.geojson', { cache: 'no-store', signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return;
        const data = await response.json();
        const usable = (data.features || []).map(feature => {
          const p = feature.properties || {};
          const url = String(p.url || '');
          if (p.status !== 'active' || p.url_type !== 'hls' || p.source_url_requires != null) return null;
          if (!/^https:\/\/[^\s]+\.m3u8(?:\?|$)/i.test(url)) return null;
          return [String(p.display_name || p.name || 'WORLD FEED').toUpperCase(), url];
        }).filter(Boolean);
        if (usable.length) pool = usable.sort(() => Math.random() - 0.5).slice(0, 1000);
      } catch (_) {}
    };

    const waitForUltron = () => {
      if (stopped) return;
      const panel = getPanel();
      if (!panel) { readyPoll = setTimeout(waitForUltron, 50); return; }
      const oldVideo = isolateVideo();
      if (!oldVideo) { readyPoll = setTimeout(waitForUltron, 50); return; }
      if (window.__ultronWorldCamTimer) { clearInterval(window.__ultronWorldCamTimer); window.__ultronWorldCamTimer = null; }
      silenceStatus();
      startCycle();
      loadRegistry();
    };

    const stop = () => {
      stopped = true;
      if (readyPoll) clearTimeout(readyPoll);
      clearTimer('current');
      clearTimer('probe');
      destroyPlayer();
      if (observer) observer.disconnect();
      observer = null;
      const v = getVideo();
      if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} }
    };

    window.__ULTRON_STABLE_WORLD_FEEDS_STOP__ = stop;
    watchDom();
    readyPoll = setTimeout(waitForUltron, 0);
  }

  async function openUltron() {
    try {
      installStableWorldFeedManager();
      if (!window.ULTRON) {
        await new Promise((resolve, reject) => {
          const existing = document.getElementById('jarvis-ultron-core-loader');
          if (existing) existing.remove();
          const script = document.createElement('script');
          script.id = 'jarvis-ultron-core-loader';
          script.src = './jarvis-ultron.js?v=ultron-core-rebuild-41';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      window.ULTRON?.open?.();
      return true;
    } catch (error) {
      console.error('[JARVIS] ULTRON core failed to load', error);
      return false;
    }
  }

  function closeUltron() {
    window.__ULTRON_STABLE_WORLD_FEEDS_STOP__?.();
    window.__ULTRON_STABLE_WORLD_FEEDS_STOP__ = null;
    window.ULTRON?.close?.();
    document.getElementById('ultron-clean-core')?.remove();
    return true;
  }

  async function handle(command) {
    const text = normalize(command);
    if (!text) return false;
    if (matches(OPEN_PATTERNS, text)) return openUltron();
    if (matches(CLOSE_PATTERNS, text)) return closeUltron();
    return false;
  }

  const install = () => {
    if (typeof window.sendCommand !== 'function') return false;
    if (window.sendCommand.__jarvisUltronFlexible) return true;
    const original = window.sendCommand;
    const wrapped = async function(command) {
      if (await handle(command)) return;
      return original.apply(this, arguments);
    };
    wrapped.__jarvisUltronFlexible = true;
    wrapped.__jarvisUltronOriginal = original;
    window.sendCommand = wrapped;
    return true;
  };

  let tries = 0;
  const installTimer = setInterval(() => {
    tries += 1;
    if (install() || tries >= 120) clearInterval(installTimer);
  }, 100);

  window.JARVIS_ULTRON_COMMANDS = {
    version: 'ultron-commands-camera-restored-20261029-v3',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();
