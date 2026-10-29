/* JARVIS // ULTRON FLEXIBLE COMMAND BRIDGE
   Natural ULTRON aliases. Camera playback remains owned by the ULTRON core,
   with a lifecycle-safe public-camera fallback only when the core stays black.
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

  async function loadCameraRecovery() {
    if (window.JARVIS_ULTRON_CAMERA_RECOVERY) return true;
    const existing = document.getElementById('jarvis-ultron-camera-recovery-loader');
    if (existing) {
      await new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
      return !!window.JARVIS_ULTRON_CAMERA_RECOVERY;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'jarvis-ultron-camera-recovery-loader';
      script.src = './ultron-camera-recovery.js?v=20261029-camera-recovery-1';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return !!window.JARVIS_ULTRON_CAMERA_RECOVERY;
  }

  async function openUltron() {
    try {
      if (!window.ULTRON || typeof window.ULTRON.open !== 'function') {
        const existing = document.getElementById('jarvis-ultron-core-loader');
        if (existing) existing.remove();
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'jarvis-ultron-core-loader';
          script.src = './jarvis-ultron.js?v=ultron-core-rebuild-42';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if (typeof window.ULTRON?.open !== 'function') throw new Error('ULTRON core entry point missing');
      await window.ULTRON.open();
      try {
        await loadCameraRecovery();
        window.JARVIS_ULTRON_CAMERA_RECOVERY?.attach?.();
      } catch (cameraError) {
        console.warn('[JARVIS] ULTRON camera recovery did not initialize', cameraError);
      }
      return true;
    } catch (error) {
      console.error('[JARVIS] ULTRON core failed to load', error);
      return false;
    }
  }

  function closeUltron() {
    try { window.JARVIS_ULTRON_CAMERA_RECOVERY?.stop?.(); } catch (error) { console.warn('[JARVIS] ULTRON camera recovery stop failed', error); }
    try { window.ULTRON?.close?.(); } catch (error) { console.warn('[JARVIS] ULTRON close failed', error); }
    document.getElementById('ultron-clean-core')?.remove();
    document.body.classList.remove('jarvis-ultron-focused');
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
    version: 'ultron-commands-camera-recovery-20261029-v5',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();