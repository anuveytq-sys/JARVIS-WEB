/* ULTRON WORLD FEED V2 — isolated, fail-fast live camera images. */
(() => {
  'use strict';
  if (window.__ULTRON_WORLD_FEED_V2__) return;
  window.__ULTRON_WORLD_FEED_V2__ = true;

  const API = 'https://api.data.gov.sg/v1/transport/traffic-images';
  const REFRESH_MS = 20000;
  const FAIL_MS = 7000;
  let stopped = false;
  let timer = null;
  let token = 0;

  const findPanel = () => document.querySelector('#ultron-clean-core .uc-worldcam');

  const stopOldPlayers = (panel) => {
    const video = panel.querySelector('.uc-worldcam-frame');
    const embed = panel.querySelector('.uc-worldcam-embed');
    try { video?.pause?.(); } catch (_) {}
    try { video?.removeAttribute('src'); video?.load?.(); } catch (_) {}
    try { embed?.removeAttribute('src'); } catch (_) {}
    video?.remove();
    embed?.remove();
  };

  const setStatus = (panel, text, live) => {
    const place = panel.querySelector('.uc-worldcam-place');
    const badge = panel.querySelector('.uc-worldcam-live');
    if (place) place.textContent = text;
    if (badge) badge.textContent = live ? 'LIVE' : 'OFFLINE';
  };

  const schedule = (fn, ms) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };

  const chooseCamera = (cameras) => {
    const usable = cameras.filter(c => c && typeof c.image === 'string' && /^https?:\/\//i.test(c.image));
    if (!usable.length) return null;
    const last = Number(sessionStorage.getItem('ultronWorldCameraId') || 0);
    const candidates = usable.filter(c => Number(c.camera_id) !== last);
    const pool = candidates.length ? candidates : usable;
    const cam = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem('ultronWorldCameraId', String(cam.camera_id)); } catch (_) {}
    return cam;
  };

  const load = async (panel, img) => {
    if (stopped || !panel?.isConnected || !img?.isConnected) return;
    const myToken = ++token;
    setStatus(panel, 'SINGAPORE · LIVE CAMERA', false);
    img.style.visibility = 'hidden';
    img.style.opacity = '0';

    let failTimer = null;
    const fail = () => {
      if (myToken !== token || stopped) return;
      if (failTimer) clearTimeout(failTimer);
      img.onload = img.onerror = null;
      img.removeAttribute('src');
      setStatus(panel, 'WORLD CAMERA · TEMPORARILY UNAVAILABLE', false);
      schedule(() => load(panel, img), 5000);
    };

    try {
      const response = await fetch(API + '?date_time=' + encodeURIComponent(new Date().toISOString()), {
        cache: 'no-store',
        credentials: 'omit'
      });
      if (!response.ok) throw new Error('camera api ' + response.status);
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const cameras = items.flatMap(item => Array.isArray(item?.cameras) ? item.cameras : []);
      const cam = chooseCamera(cameras);
      if (!cam) throw new Error('no live camera image');

      const label = 'SINGAPORE · CAMERA ' + String(cam.camera_id);
      img.onload = () => {
        if (myToken !== token || stopped) return;
        if (failTimer) clearTimeout(failTimer);
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        setStatus(panel, label + ' · LIVE', true);
        schedule(() => load(panel, img), REFRESH_MS);
      };
      img.onerror = fail;
      img.src = String(cam.image) + (String(cam.image).includes('?') ? '&' : '?') + 'ultron=' + Date.now();
      failTimer = setTimeout(fail, FAIL_MS);
    } catch (_) {
      fail();
    }
  };

  const attach = () => {
    const panel = findPanel();
    if (!panel) return false;
    stopped = false;
    stopOldPlayers(panel);

    let img = panel.querySelector('.uc-worldcam-live-image-v2');
    if (!img) {
      img = document.createElement('img');
      img.className = 'uc-worldcam-live-image-v2';
      img.alt = 'Live public traffic camera';
      img.decoding = 'async';
      img.loading = 'eager';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;background:#121212;visibility:hidden;opacity:0;transition:opacity .18s ease;z-index:1;';
      panel.appendChild(img);
    }

    panel.dataset.worldFeedController = 'v2';
    load(panel, img);
    return true;
  };

  const boot = () => {
    if (stopped) return;
    if (attach()) return;
    schedule(boot, 500);
  };

  window.addEventListener('beforeunload', () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  }, { once: true });

  boot();
})();
