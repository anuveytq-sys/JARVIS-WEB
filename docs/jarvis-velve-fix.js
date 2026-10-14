/* JARVIS -> VELVE launch compatibility patch.
   Local-only command routing: no AI/API request is made for these launch phrases.
   "GeoCore" is an alternate launch phrase for the existing VELVE environment;
   the VELVE environment itself is not renamed.
*/
(() => {
  'use strict';

  const normalize = (value) => String(value || '')
    .trim().toLowerCase()
    .replace(/[“”]/g, '"').replace(/[’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isGeoCoreLaunch = (value) => {
    const t = normalize(value);
    if (!t) return false;

    // Exact wake/launch forms only. These are handled locally before the
    // normal JARVIS command/AI path, so they do not consume an AI request.
    const name = '(?:geo\\s*core|geocore|geocor|geo\\s+cor)';
    const plain = new RegExp(`^${name}(?:\\s+environment)?$`, 'i');
    const action = new RegExp(`^(?:(?:please\\s+)?(?:open|start|activate|enter|launch|run)\\s+(?:the\\s+)?)${name}(?:\\s+environment)?$`, 'i');
    const jarvis = new RegExp(`^(?:(?:hey|hello)\\s+)?jarvis\\s+(?:(?:please\\s+)?(?:open|start|activate|enter|launch|run)\\s+(?:the\\s+)?)?${name}(?:\\s+environment)?$`, 'i');
    return plain.test(t) || action.test(t) || jarvis.test(t);
  };

  const openGeoCore = async () => {
    if (!window.VELVE || typeof window.VELVE.open !== 'function') return false;
    try {
      await window.VELVE.open();
      if (typeof window.speak === 'function') window.speak('VELVE environment online.');
    } catch (error) {
      console.error('[GeoCore] VELVE launch failed:', error);
    }
    return true;
  };

  // Public local launcher used only by the command wrapper below.
  window.openGeoCore = openGeoCore;

  const install = () => {
    if (typeof window.sendCommand !== 'function' || !window.VELVE?.open) return false;
    if (window.sendCommand.__geoCoreLaunchFix) return true;

    const original = window.sendCommand;
    const wrapped = async function(command) {
      if (isGeoCoreLaunch(command)) {
        await openGeoCore();
        return;
      }
      return original.apply(this, arguments);
    };
    wrapped.__geoCoreLaunchFix = true;
    window.sendCommand = wrapped;
    return true;
  };

  // The original HUD and voice layer can install/replace sendCommand during
  // startup, so keep checking briefly without touching the AI backend.
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (install() || tries > 80) clearInterval(timer);
  }, 100);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
