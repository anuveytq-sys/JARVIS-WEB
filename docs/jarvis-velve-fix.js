/* VELVE launch compatibility patch.
   Keeps the original JARVIS code untouched. Handles wake-word systems that
   strip "Jarvis" before calling sendCommand, and handles common variants.
*/
(() => {
  'use strict';
  const isVelveStart = (value) => {
    const t = String(value || '').trim().toLowerCase()
      .replace(/[“”]/g, '"').replace(/[’]/g, "'")
      .replace(/[!?.,]+$/g, '');
    return /^(?:(?:hey|hello)\s+)?jarvis[,:]?\s*(?:please\s+)?(?:start|activate|open|enter|launch)\s+(?:the\s+)?velve(?:\s+environment)?$/i.test(t)
      || /^(?:start|activate|open|enter|launch)\s+(?:the\s+)?velve(?:\s+environment)?$/i.test(t)
      || /^velve(?:\s+environment)?$/i.test(t);
  };

  const install = () => {
    if (typeof window.sendCommand !== 'function' || !window.VELVE?.open) return false;
    if (window.sendCommand.__velveLaunchFix) return true;
    const original = window.sendCommand;
    const wrapped = async function(command) {
      if (isVelveStart(command)) {
        try {
          await window.VELVE.open();
          if (typeof window.speak === 'function') window.speak('VELVE environment online.');
        } catch (error) {
          console.error('[VELVE] launch failed:', error);
        }
        return;
      }
      return original.apply(this, arguments);
    };
    wrapped.__velveLaunchFix = true;
    window.sendCommand = wrapped;
    return true;
  };

  // The original HUD can install/replace its command function during startup,
  // so retry briefly instead of depending on script-load order.
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (install() || tries > 40) clearInterval(timer);
  }, 100);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
