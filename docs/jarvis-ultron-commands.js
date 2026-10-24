/* JARVIS // ULTRON FLEXIBLE COMMAND BRIDGE
   Adds natural voice/text aliases for opening and closing ULTRON.
   Existing commands are left untouched; only recognized ULTRON phrases are intercepted.
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

  async function ensureUltron() {
    if (typeof window.ULTRON?.open === 'function') return true;
    const existing = document.getElementById('jarvis-ultron-command-loader');
    if (existing) {
      await new Promise(resolve => {
        const done = () => resolve();
        existing.addEventListener('load', done, {once:true});
        existing.addEventListener('error', done, {once:true});
      });
      return typeof window.ULTRON?.open === 'function';
    }
    return await new Promise(resolve => {
      const script = document.createElement('script');
      script.id = 'jarvis-ultron-command-loader';
      script.src = 'https://raw.githubusercontent.com/anuveytq-sys/JARVIS-WEB/main/docs/jarvis-ultron.js';
      script.async = true;
      script.onload = () => resolve(typeof window.ULTRON?.open === 'function');
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function openUltron() {
    const ready = await ensureUltron();
    if (!ready) return false;
    window.ULTRON.open();
    try {
      if (typeof window.ULTRON_ENHANCEMENT?.start === 'function') window.ULTRON_ENHANCEMENT.start();
      else {
        const id = 'jarvis-ultron-command-enhancement-loader';
        if (!document.getElementById(id)) {
          const s = document.createElement('script');
          s.id = id;
          s.src = 'https://raw.githubusercontent.com/anuveytq-sys/JARVIS-WEB/main/docs/jarvis-ultron-enhancement.js';
          s.async = true;
          s.onload = () => window.ULTRON_ENHANCEMENT?.start?.();
          document.head.appendChild(s);
        }
      }
    } catch (_) {}
    return true;
  }

  function closeUltron() {
    if (typeof window.ULTRON?.close === 'function') window.ULTRON.close();
    else document.getElementById('jarvis-ultron-root')?.remove();
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
  const timer = setInterval(() => {
    tries += 1;
    if (install() || tries >= 120) clearInterval(timer);
  }, 100);

  window.JARVIS_ULTRON_COMMANDS = {
    version: 'ultron-commands-20261024a',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();
