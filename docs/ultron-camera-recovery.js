/* JARVIS // ULTRON direct public camera player
   Direct-stream mode: no iframe pages, no artificial loading screen, and no
   rotation timer until an actual video frame is playing. Failed streams are
   abandoned quickly. Only operator-published public camera streams are used.
*/
(() => {
  'use strict';
  if (window.JARVIS_ULTRON_CAMERA_RECOVERY) return;

  const CAMERAS = [
    { name: 'SEOUL HAN RIVER · SOUTH KOREA', url: 'https://topiscctv1.eseoul.go.kr/edge13/ch16.stream/playlist.m3u8' },
    { name: 'SEOUL DOWNTOWN · SOUTH KOREA', url: 'https://topiscctv1.eseoul.go.kr/edge6/ch113.stream/playlist.m3u8' },
    { name: 'SEOUL TRAFFIC · SOUTH KOREA', url: 'https://topiscctv1.eseoul.go.kr/sd1/ch34.stream/playlist.m3u8' },
    { name: 'FYLI · GREECE', url: 'https://livecameras.gr:30443/live/fyli1/playlist.m3u8' },
    { name: 'KIFISIA · GREECE', url: 'https://livecameras.gr:30443/live/kifis1/playlist.m3u8' },
    { name: 'TENBY HARBOUR · UNITED KINGDOM', url: 'https://s159.ipcamlive.com/streams/9fsgtp29ruh6zek1f/stream.m3u8' },
    { name: 'KURUCOWY WIERCH · POLAND', url: 'https://hoktastream1.webcamera.pl/skywind_cam_3c5be6/skywind_cam_3c5be6.stream/playlist.m3u8' },
    { name: 'WARSAW CASTLE SQUARE · POLAND', url: 'https://hoktastream2.webcamera.pl/warszawa_cam_5f3b1a/warszawa_cam_5f3b1a.stream/chunks.m3u8' },
    { name: 'DZIWNÓW · POLAND', url: 'https://hoktastream1.webcamera.pl/dziwnowum_cam_a4181f/dziwnowum_cam_a4181f.stream/playlist.m3u8' },
    { name: 'DĘBKI BEACH · POLAND', url: 'https://hoktastream2.webcamera.pl/debki_cam_284a24/debki_cam_284a24.stream/playlist.m3u8' },
    { name: 'ALVOR · PORTUGAL', url: 'https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8' },
    { name: 'APÚLIA · PORTUGAL', url: 'https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8' }
  ];

  const VIEW_MS = 25000;
  const STREAM_FAIL_MS = 4500;
  const PLAY_CONFIRM_MS = 9000;
  const HLS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
  let session = null;
  let index = Math.floor(Math.random() * CAMERAS.length);
  let hlsPromise = null;

  const waitForPanel = (ms = 8000) => new Promise(resolve => {
    const started = Date.now();
    const tick = () => {
      const panel = document.querySelector('#ultron-clean-core .uc-worldcam');
      if (panel) return resolve(panel);
      if (Date.now() - started >= ms) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });

  const loadHls = () => {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsPromise) return hlsPromise;
    hlsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ultron-hls]');
      if (existing) {
        existing.addEventListener('load', () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS unavailable')), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = HLS_URL;
      script.async = true;
      script.dataset.ultronHls = '1';
      script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS unavailable'));
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return hlsPromise;
  };

  const clearTimer = name => {
    if (!session?.[name]) return;
    clearTimeout(session[name]);
    session[name] = null;
  };

  const destroyPlayer = () => {
    if (!session) return;
    try { session.hls?.destroy(); } catch (_) {}
    session.hls = null;
    if (session.failTimer) clearTimeout(session.failTimer);
    if (session.confirmTimer) clearTimeout(session.confirmTimer);
    if (session.viewTimer) clearTimeout(session.viewTimer);
  };

  const stop = () => {
    if (!session) return;
    session.active = false;
    destroyPlayer();
    session = null;
  };

  const setText = (panel, text) => {
    const place = panel.querySelector('.uc-worldcam-place');
    if (place) place.textContent = text;
  };

  const next = panel => {
    if (!session?.active || !panel?.isConnected) return;
    const old = session;
    old.generation++;
    destroyPlayer();
    index = (index + 1) % CAMERAS.length;
    play(panel, CAMERAS[index]);
  };

  const confirmPlaying = (panel, cam, video, generation) => {
    if (!session?.active || session.generation !== generation || !video.isConnected) return false;
    const playing = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused && Number(video.currentTime) > 0;
    if (!playing) return false;

    clearTimer('failTimer');
    clearTimer('confirmTimer');
    video.style.opacity = '1';
    video.style.visibility = 'visible';
    const badge = panel.querySelector('.uc-worldcam-live');
    if (badge) badge.textContent = 'LIVE';
    setText(panel, cam.name + ' · LIVE');
    session.viewTimer = setTimeout(() => next(panel), VIEW_MS);
    return true;
  };

  const play = async (panel, cam) => {
    if (!session?.active || !panel.isConnected) return;
    const generation = ++session.generation;
    clearTimer('failTimer');
    clearTimer('confirmTimer');
    try { session.hls?.destroy(); } catch (_) {}
    session.hls = null;

    const video = panel.querySelector('.uc-worldcam-frame');
    if (!video) return;

    video.pause();
    video.removeAttribute('src');
    video.load();
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    video.style.background = '#050302';

    const badge = panel.querySelector('.uc-worldcam-live');
    if (badge) badge.textContent = 'LIVE';
    // Never display a fake spinner/CONNECTING state. The player itself is the feed.
    setText(panel, cam.name);

    const fail = () => {
      if (!session?.active || session.generation !== generation) return;
      next(panel);
    };

    video.addEventListener('error', fail, { once: true });
    video.addEventListener('playing', () => confirmPlaying(panel, cam, video, generation), { once: true });
    video.addEventListener('loadeddata', () => confirmPlaying(panel, cam, video, generation), { once: true });

    session.failTimer = setTimeout(fail, STREAM_FAIL_MS);
    session.confirmTimer = setTimeout(() => {
      if (!confirmPlaying(panel, cam, video, generation)) fail();
    }, PLAY_CONFIRM_MS);

    try {
      const Hls = await loadHls();
      if (!session?.active || session.generation !== generation) return;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 2,
          maxLiveSyncPlaybackRate: 1.5,
          manifestLoadingTimeOut: 2500,
          fragLoadingTimeOut: 2500,
          manifestLoadingMaxRetry: 0,
          fragLoadingMaxRetry: 0,
          levelLoadingMaxRetry: 0
        });
        session.hls = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!session?.active || session.generation !== generation) return;
          if (data?.fatal) fail();
        });
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          if (!session?.active || session.generation !== generation) return;
          hls.loadSource(cam.url);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cam.url;
      } else {
        fail();
        return;
      }
      video.play().catch(() => {});
    } catch (_) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cam.url;
        video.play().catch(() => {});
      } else {
        fail();
      }
    }
  };

  const attach = async () => {
    stop();
    const panel = await waitForPanel();
    if (!panel) return false;
    const video = panel.querySelector('.uc-worldcam-frame');
    if (!video) return false;
    session = { active: true, panel, hls: null, generation: 0, failTimer: null, confirmTimer: null, viewTimer: null };
    play(panel, CAMERAS[index]);
    return true;
  };

  const recover = () => attach().catch(error => console.warn('[ULTRON] Direct camera player unavailable', error));
  window.JARVIS_ULTRON_CAMERA_RECOVERY = { attach: recover, stop };
})();