/* JARVIS voice-first startup wake phrase.
   Wait for the spoken phrase "Wake up Jarvis" while the normal wake-word
   switch is OFF. Speak the time-aware greeting first, then enable the existing
   wake-word switch so the original "Hey Jarvis, do this" command flow resumes.
   This add-on does not replace or modify the existing command recognizer.
*/
(() => {
  "use strict";
  if (window.__JARVIS_VOICE_STARTUP_WAKE__) return;
  window.__JARVIS_VOICE_STARTUP_WAKE__ = true;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const toggle = () => document.getElementById("jarvis-wake-word-toggle");
  let recognition = null;
  let starting = false;
  let triggered = false;
  let retryTimer = 0;
  let retryFromGesture = false;

  const isWakeOnOrStarting = () => {
    const button = toggle();
    if (!button) return false;
    return /WAKE WORD:\s*ON|STARTING MICROPHONE|WAKE WORD RETRYING|LISTENING FOR COMMAND|COMMAND SENT/i
      .test(String(button.textContent || ""));
  };

  const shouldListenForStartupPhrase = () => {
    const button = toggle();
    if (!button || triggered || isWakeOnOrStarting()) return false;
    return /ENABLE WAKE WORD|WAKE WORD:\s*OFF|TAP TO RETRY WAKE WORD/i
      .test(String(button.textContent || ""));
  };

  function greetingForNow() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning sir, JARVIS systems are online. How may I assist you?";
    if (hour >= 12 && hour < 17) return "Good afternoon sir, JARVIS systems are online. How may I assist you?";
    if (hour >= 17 && hour < 22) return "Good evening sir, JARVIS systems are online. How may I assist you?";
    return "Good night sir, JARVIS systems are online. How may I assist you?";
  }

  function stopRecognition() {
    const old = recognition;
    recognition = null;
    if (old) {
      old.onresult = old.onerror = old.onend = null;
      try { old.stop(); } catch (_) { try { old.abort(); } catch (_) {} }
    }
    starting = false;
  }

  function enableExistingWakeWordAfterGreeting() {
    const button = toggle();
    if (!button || isWakeOnOrStarting()) return;
    // Use the original click handler: do not change its label or replace its
    // SpeechRecognition instance.
    try { button.click(); } catch (error) {
      console.warn("[JARVIS startup wake] could not enable existing wake-word control:", error);
    }
  }

  function speakGreetingThenEnableWakeWord() {
    const greeting = greetingForNow();
    let finished = false;
    let speechObserved = false;
    const startedAt = Date.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(watchSpeech);
      enableExistingWakeWordAfterGreeting();
    };

    const watchSpeech = setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth && (synth.speaking || synth.pending)) speechObserved = true;
      // Wait until speech has actually started and then ended; retain a timeout
      // fallback for browsers that do not fire reliable speech events.
      if (speechObserved && synth && !synth.speaking && !synth.pending && Date.now() - startedAt > 500) {
        finish();
      } else if (Date.now() - startedAt > 15000) {
        finish();
      }
    }, 150);

    try {
      if (typeof window.speak === "function") {
        window.speak(greeting);
        return;
      }
      if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch (error) {
      console.warn("[JARVIS startup wake] greeting speech could not start:", error);
    }
    finish();
  }

  function triggerStartupWake() {
    if (triggered || !shouldListenForStartupPhrase()) return;
    triggered = true;
    clearTimeout(retryTimer);
    stopRecognition();
    speakGreetingThenEnableWakeWord();
  }

  function scheduleRetry(delay = 700) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (shouldListenForStartupPhrase()) startRecognition();
    }, delay);
  }

  function startRecognition() {
    if (starting || triggered || !shouldListenForStartupPhrase()) return;
    if (!Recognition) {
      console.warn("[JARVIS startup wake] SpeechRecognition is not supported in this browser.");
      return;
    }

    starting = true;
    const current = new Recognition();
    recognition = current;
    current.lang = "en-IN";
    current.continuous = true;
    current.interimResults = true;
    current.maxAlternatives = 1;

    current.onstart = () => {
      if (recognition === current) starting = false;
    };

    current.onresult = event => {
      if (recognition !== current || triggered || !shouldListenForStartupPhrase()) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result.isFinal) continue;
        const phrase = Array.from(result)
          .map(item => String(item?.transcript || ""))
          .join(" ")
          .toLowerCase()
          .replace(/[^a-z ]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (/\bwake\s+up\s+jarvis\b/.test(phrase)) {
          triggerStartupWake();
          return;
        }
      }
    };

    current.onerror = event => {
      if (recognition !== current) return;
      starting = false;
      const code = String(event?.error || "unknown");
      if (code === "not-allowed" || code === "service-not-allowed") {
        // Some mobile browsers require a user gesture before speech recognition
        // can start. Retry quietly after the next normal page interaction.
        retryFromGesture = true;
        console.warn("[JARVIS startup wake] microphone permission/user activation is required.");
      } else if (code !== "aborted") {
        scheduleRetry(code === "no-speech" ? 500 : 900);
      }
    };

    current.onend = () => {
      if (recognition !== current) return;
      recognition = null;
      starting = false;
      if (!triggered && shouldListenForStartupPhrase()) scheduleRetry(350);
    };

    try {
      current.start();
    } catch (error) {
      if (recognition === current) recognition = null;
      starting = false;
      retryFromGesture = true;
      console.warn("[JARVIS startup wake] recognition start failed:", error);
    }
  }

  function syncWithExistingWakeWord() {
    if (isWakeOnOrStarting()) {
      clearTimeout(retryTimer);
      stopRecognition();
      return;
    }
    // Each time the user manually turns the normal wake word OFF, re-arm the
    // startup phrase so "Wake up Jarvis" works again without a page refresh.
    if (triggered && shouldListenForStartupPhrase()) triggered = false;
    if (shouldListenForStartupPhrase() && !recognition && !starting && !retryFromGesture) {
      startRecognition();
    }
  }

  function unlockAfterUserInteraction() {
    // Mobile browsers may block speech recognition and speech output until the
    // page receives a real user gesture. Warm the browser's existing TTS engine
    // silently; this does not change JARVIS's configured voice or spoken output.
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        synth.getVoices();
        synth.resume();
        if (!window.__JARVIS_TTS_GESTURE_READY__) {
          const warmup = new SpeechSynthesisUtterance(" ");
          warmup.volume = 0;
          warmup.rate = 1;
          window.__JARVIS_TTS_GESTURE_READY__ = true;
          synth.speak(warmup);
        }
      }
    } catch (_) {}
    retryFromGesture = false;
    if (shouldListenForStartupPhrase() && !recognition && !starting) startRecognition();
  }

  function boot() {
    if (!toggle()) {
      setTimeout(boot, 250);
      return;
    }
    const button = toggle();
    const observer = new MutationObserver(syncWithExistingWakeWord);
    observer.observe(button, { attributes: true, childList: true, characterData: true, subtree: true });
    document.addEventListener("pointerdown", unlockAfterUserInteraction, { passive: true });
    document.addEventListener("touchstart", unlockAfterUserInteraction, { passive: true });
    document.addEventListener("keydown", unlockAfterUserInteraction);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncWithExistingWakeWord();
    });
    startRecognition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
