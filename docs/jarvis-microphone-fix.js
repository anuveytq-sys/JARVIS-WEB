/* JARVIS microphone-only recovery patch. Keeps the existing SpeechRecognition system. */
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || SR.prototype.__jarvisMicFixInstalled) return;
  SR.prototype.__jarvisMicFixInstalled = true;

  const originalStart = SR.prototype.start;
  const originalStop = SR.prototype.stop;
  const originalAbort = SR.prototype.abort;

  function installRecovery(recognition) {
    if (!recognition || recognition.__jarvisMicRecoveryInstalled) return;
    recognition.__jarvisMicRecoveryInstalled = true;
    recognition.__jarvisMicShouldRecover = false;

    try { recognition.continuous = true; } catch (_) {}
    try { recognition.interimResults = true; } catch (_) {}
    try { recognition.maxAlternatives = 1; } catch (_) {}
    try { if (!recognition.lang) recognition.lang = 'en-US'; } catch (_) {}

    recognition.addEventListener('start', () => {
      recognition.__jarvisMicShouldRecover = true;
    });

    recognition.addEventListener('end', () => {
      if (!recognition.__jarvisMicShouldRecover) return;
      if (document.hidden) return;
      if (recognition.__jarvisMicRestartTimer) clearTimeout(recognition.__jarvisMicRestartTimer);
      recognition.__jarvisMicRestartTimer = setTimeout(() => {
        if (!recognition.__jarvisMicShouldRecover || document.hidden) return;
        try {
          recognition.start();
        } catch (_) {
          setTimeout(() => {
            if (!recognition.__jarvisMicShouldRecover || document.hidden) return;
            try { recognition.start(); } catch (_) {}
          }, 350);
        }
      }, 180);
    });

    recognition.addEventListener('error', (event) => {
      const code = event && event.error;
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
        recognition.__jarvisMicShouldRecover = false;
        return;
      }
      if (code === 'aborted') return;
      // Mobile browsers can emit transient network/no-speech errors while
      // leaving the microphone session usable. The existing system remains
      // in charge; this patch only lets it recover automatically.
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && recognition.__jarvisMicShouldRecover) {
        try { recognition.start(); } catch (_) {}
      }
    });
  }

  SR.prototype.start = function(...args) {
    installRecovery(this);
    try { this.continuous = true; } catch (_) {}
    try { this.interimResults = true; } catch (_) {}
    try {
      return originalStart.apply(this, args);
    } catch (error) {
      // Some mobile implementations report an already-running recognition
      // object as an InvalidStateError. Keep the current session alive.
      if (error && error.name === 'InvalidStateError') return;
      throw error;
    }
  };

  SR.prototype.stop = function(...args) {
    this.__jarvisMicShouldRecover = false;
    if (this.__jarvisMicRestartTimer) clearTimeout(this.__jarvisMicRestartTimer);
    return originalStop.apply(this, args);
  };

  SR.prototype.abort = function(...args) {
    this.__jarvisMicShouldRecover = false;
    if (this.__jarvisMicRestartTimer) clearTimeout(this.__jarvisMicRestartTimer);
    return originalAbort.apply(this, args);
  };

  // The existing JARVIS wake-word toggle remains the only control. This does
  // not create another microphone, button, UI, command parser, or wake engine.
})();
