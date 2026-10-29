/* JARVIS // ULTRON camera recovery
   Readiness-first public camera fallback. A camera gets the full 20–30s
   viewing window only after its page has loaded; failed candidates are
   skipped quickly so the panel does not sit black or rotate before playback.
*/
(() => {
  'use strict';
  if (window.JARVIS_ULTRON_CAMERA_RECOVERY) return;

  const CAMERAS = [
    { name: 'SEOUL · SOUTH KOREA', url: 'https://opencctv.org/cameras/south-korea/seoul/hannam-bridge-south-end-seoul-122041' },
    { name: 'CHANGWON · SOUTH KOREA', url: 'https://opencctv.org/cameras/south-korea/gyeongsangnam-do/changwon/changwon-nc-park-sports-complex-122159' },
    { name: 'CHIANG MAI · THAILAND', url: 'https://opencctv.org/cameras/thailand/chiang-mai/chiang-mai-hang-dong-highway-146354' },
    { name: 'NEW YORK · USA', url: 'https://opencctv.org/cameras/united-states/new-york/new-york-city/times-square-south-4k-127051' },
    { name: 'CHICAGO · USA', url: 'https://opencctv.org/cameras/united-states/illinois/chicago/chicago-cam-126887' },
    { name: 'BALTIMORE · USA', url: 'https://opencctv.org/cameras/united-states/maryland/baltimore/inner-harbor-cam-126947' },
    { name: 'LAFAYETTE · USA', url: 'https://opencctv.org/cameras/united-states/colorado/lafayette/us-36-mp-04190-eb-17-w-of-mccaslin-blvd-93999' },
    { name: 'ALBISSOLA MARINA · ITALY', url: 'https://www.opencctv.org/cameras/italy/albissola-marina/lido-spa-resort-albissola-marina-216431' },
    { name: 'STINTINO · ITALY', url: 'https://opencctv.org/cameras/italy/sardegna/roccaruja-stintino-sassari-120970' },
    { name: 'CARCAVELOS · PORTUGAL', url: 'https://opencctv.org/cameras/portugal/carcavelos-calhau/carcavelos-calhau-390582' },
    { name: 'TWEED HEADS · AUSTRALIA', url: 'https://opencctv.org/cameras/australia/new-south-wales/tweed-heads/tweed-heads-coastal-bar-143759' },
    { name: 'KRAKOW · POLAND', url: 'https://app.qoe.agh.edu.pl/public/kamery/en.html?lang=en' }
  ];

  const VIEW_MS = 25000;
  const LOAD_FAIL_MS = 5000;
  const FIRST_FRAME_GRACE_MS = 8000;
  let session = null;
  let index = Math.floor(Math.random() * CAMERAS.length);

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

  const clearTimers = () => {
    if (!session) return;
    if (session.viewTimer) clearTimeout(session.viewTimer);
    if (session.failTimer) clearTimeout(session.failTimer);
    if (session.frameTimer) clearTimeout(session.frameTimer);
  };

  const stop = () => {
    if (!session) return;
    session.active = false;
    clearTimers();
    session.iframe?.remove();
    session = null;
  };

  const setStatus = (panel, text) => {
    const place = panel.querySelector('.uc-worldcam-place');
    if (place) place.textContent = text;
  };

  const next = panel => {
    if (!session?.active || !panel?.isConnected) return;
    clearTimers();
    session.iframe?.remove();
    session.iframe = null;
    index = (index + 1) % CAMERAS.length;
    show(panel, CAMERAS[index]);
  };

  const markReady = (panel, cam, iframe) => {
    if (!session?.active || session.iframe !== iframe) return;
    clearTimeout(session.failTimer);
    clearTimeout(session.frameTimer);
    iframe.style.opacity = '1';
    const frame = panel.querySelector('.uc-worldcam-frame');
    if (frame) {
      frame.style.visibility = 'hidden';
      frame.style.opacity = '0';
    }
    setStatus(panel, cam.name + ' · LIVE');
    // The 25-second window begins only after the candidate has loaded.
    session.viewTimer = setTimeout(() => next(panel), VIEW_MS);
  };

  const show = (panel, cam) => {
    if (!session?.active || !panel.isConnected) return;
    clearTimers();
    const frame = panel.querySelector('.uc-worldcam-frame');
    const badge = panel.querySelector('.uc-worldcam-live');
    if (frame) {
      frame.pause?.();
      frame.removeAttribute('src');
      frame.style.visibility = 'hidden';
      frame.style.opacity = '0';
    }
    if (badge) badge.textContent = 'SEARCHING';
    setStatus(panel, cam.name + ' · CONNECTING…');

    session.iframe?.remove();
    const iframe = document.createElement('iframe');
    iframe.className = 'uc-worldcam-recovery-frame';
    iframe.title = cam.name + ' public live camera';
    iframe.src = cam.url;
    iframe.loading = 'eager';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('allowfullscreen', '');
    Object.assign(iframe.style, {
      position: 'absolute', zIndex: '2', top: '20px', left: '0',
      width: '100%', height: 'calc(100% - 20px)', border: '0',
      background: '#090604', opacity: '0', transition: 'opacity .2s ease',
      pointerEvents: 'none'
    });
    panel.appendChild(iframe);
    session.iframe = iframe;

    let loaded = false;
    iframe.addEventListener('load', () => {
      if (!session?.active || session.iframe !== iframe) return;
      loaded = true;
      // A framed public camera page has loaded. Give it a short grace period
      // for its own player to render, then keep the successful page visible.
      session.frameTimer = setTimeout(() => markReady(panel, cam, iframe), FIRST_FRAME_GRACE_MS);
    }, { once: true });

    // Never wait a full rotation for a dead/blocked candidate.
    session.failTimer = setTimeout(() => {
      if (!session?.active || session.iframe !== iframe || loaded) return;
      next(panel);
    }, LOAD_FAIL_MS);
  };

  const attach = async () => {
    stop();
    const panel = await waitForPanel();
    if (!panel) return false;
    const frame = panel.querySelector('.uc-worldcam-frame');
    if (!frame) return false;

    session = { active: true, panel, iframe: null, viewTimer: null, failTimer: null, frameTimer: null };

    // First try the core HLS player. It remains untouched if it actually plays.
    const startedAt = Date.now();
    const checkCore = () => {
      if (!session?.active || !panel.isConnected) return;
      const playable = frame.readyState >= 2 && frame.videoWidth > 0 && frame.videoHeight > 0 && !frame.paused && Number(frame.currentTime) > 0;
      if (playable) {
        clearTimers();
        session.active = false;
        session = null;
        return;
      }
      if (Date.now() - startedAt >= 5000) {
        if (panel.isConnected && session?.active) show(panel, CAMERAS[index]);
        return;
      }
      session.frameTimer = setTimeout(checkCore, 250);
    };
    session.frameTimer = setTimeout(checkCore, 250);
    return true;
  };

  const recover = () => attach().catch(error => console.warn('[ULTRON] Camera recovery unavailable', error));
  window.JARVIS_ULTRON_CAMERA_RECOVERY = { attach: recover, stop };
})();