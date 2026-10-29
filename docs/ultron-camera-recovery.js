/* JARVIS // ULTRON camera recovery
   Fallback only: if the core HLS player stays black/unplayable, show a
   public operator-backed camera page inside the existing ULTRON panel.
   This never accesses private cameras and is fully cleaned up on close.
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

  const stop = () => {
    if (!session) return;
    session.active = false;
    if (session.timer) clearTimeout(session.timer);
    if (session.watchdog) clearTimeout(session.watchdog);
    session.iframe?.remove();
    session = null;
  };

  const show = (panel, cam) => {
    if (!session?.active || !panel.isConnected) return;
    const frame = panel.querySelector('.uc-worldcam-frame');
    const place = panel.querySelector('.uc-worldcam-place');
    const badge = panel.querySelector('.uc-worldcam-live');
    if (frame) {
      frame.style.visibility = 'hidden';
      frame.style.opacity = '0';
    }
    if (place) place.textContent = cam.name;
    if (badge) {
      badge.textContent = 'LIVE';
      badge.style.opacity = '1';
    }

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
      position: 'absolute',
      zIndex: '2',
      top: '20px',
      left: '0',
      width: '100%',
      height: 'calc(100% - 20px)',
      border: '0',
      background: '#090604',
      opacity: '0',
      transition: 'opacity .25s ease',
      pointerEvents: 'none'
    });
    panel.appendChild(iframe);
    session.iframe = iframe;
    iframe.addEventListener('load', () => {
      if (!session?.active || session.iframe !== iframe) return;
      iframe.style.opacity = '1';
      if (place) place.textContent = cam.name;
    }, { once: true });

    // Keep the existing 20-second ULTRON rhythm.
    session.timer = setTimeout(() => next(panel), 20000);
  };

  const next = panel => {
    if (!session?.active || !panel?.isConnected) return;
    index = (index + 1) % CAMERAS.length;
    show(panel, CAMERAS[index]);
  };

  const attach = async () => {
    stop();
    const panel = await waitForPanel();
    if (!panel) return false;
    const frame = panel.querySelector('.uc-worldcam-frame');
    if (!frame) return false;

    session = { active: true, panel, iframe: null, timer: null, watchdog: null };
    const startedAt = Date.now();
    const check = () => {
      if (!session?.active || !panel.isConnected) return;
      const playable = frame.readyState >= 2 && frame.videoWidth > 0 && frame.videoHeight > 0 && !frame.paused && Number(frame.currentTime) > 0;
      if (playable) {
        // Core HLS playback is working. Do not interfere with it.
        session.active = false;
        if (session.timer) clearTimeout(session.timer);
        session = null;
        return;
      }
      if (Date.now() - startedAt >= 10500) {
        show(panel, CAMERAS[index]);
        return;
      }
      session.watchdog = setTimeout(check, 500);
    };
    session.watchdog = setTimeout(check, 500);
    return true;
  };

  const recover = () => attach().catch(error => console.warn('[ULTRON] Camera recovery unavailable', error));

  window.JARVIS_ULTRON_CAMERA_RECOVERY = { attach: recover, stop };
})();