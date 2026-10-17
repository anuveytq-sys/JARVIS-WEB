/* JARVIS speech stability layer.
   Prevents long browser TTS utterances from being cut off/going silent on mobile Safari/iOS
   and prevents the always-on wake recognizer from competing with speech playback.
   This layer wraps the native SpeechSynthesis API without changing the JARVIS UI. */
(() => {
  "use strict";
  if (window.__JARVIS_SPEECH_STABILITY__) return;
  window.__JARVIS_SPEECH_STABILITY__ = true;

  const synth = window.speechSynthesis;
  const NativeUtterance = window.SpeechSynthesisUtterance;
  if (!synth || !NativeUtterance) return;

  const nativeSpeak = synth.speak.bind(synth);
  const nativeCancel = synth.cancel.bind(synth);
  const nativePause = synth.pause ? synth.pause.bind(synth) : null;
  const nativeResume = synth.resume ? synth.resume.bind(synth) : null;

  let queue = [];
  let active = false;
  let stopped = false;
  let wakePausedByTts = false;
  let resumeTimer = 0;
  let watchdogTimer = 0;
  let generation = 0;

  const compact = value => String(value || "").replace(/\s+/g, " ").trim();

  // Mobile browsers are much more reliable with short utterances than with one
  // large paragraph. Keep chunks comfortably below the common mobile TTS limit.
  function splitSpeech(text, maxChars = 180) {
    const clean = compact(text);
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];

    const sentences = clean.match(/[^.!?;:]+[.!?;:]*(?:\s+|$)/g) || [clean];
    const chunks = [];
    let current = "";

    const push = value => {
      const part = compact(value);
      if (part) chunks.push(part);
    };

    for (const sentence of sentences) {
      const s = compact(sentence);
      if (!s) continue;
      if (!current) {
        if (s.length <= maxChars) current = s;
        else {
          const words = s.split(" ");
          let piece = "";
          for (const word of words) {
            const next = piece ? piece + " " + word : word;
            if (next.length > maxChars && piece) {
              push(piece);
              piece = word;
            } else {
              piece = next;
            }
          }
          push(piece);
        }
      } else if ((current + " " + s).length <= maxChars) {
        current += " " + s;
      } else {
        push(current);
        current = s;
        if (current.length > maxChars) {
          const words = current.split(" ");
          current = "";
          let piece = "";
          for (const word of words) {
            const next = piece ? piece + " " + word : word;
            if (next.length > maxChars && piece) {
              push(piece);
              piece = word;
            } else {
              piece = next;
            }
          }
          current = piece;
        }
      }
    }
    push(current);
    return chunks;
  }

  function pauseWakeForSpeech() {
    // A cancel() immediately before speak() may have queued a wake-word restart.
    // Cancel that restart before pausing the microphone, or iOS can duck TTS again.
    clearTimeout(resumeTimer);
    resumeTimer = 0;
    try {
      if (typeof window.__jarvisPauseWakeWordForEnvironment === "function") {
        window.__jarvisPauseWakeWordForEnvironment();
        wakePausedByTts = true;
      }
    } catch (_) {}
  }

  function resumeWakeAfterSpeech() {
    if (!wakePausedByTts) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      try {
        if (typeof window.__jarvisResumeWakeWordAfterEnvironment === "function") {
          window.__jarvisResumeWakeWordAfterEnvironment();
        }
      } catch (_) {}
      wakePausedByTts = false;
    }, 450);
  }

  function clearWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = 0;
  }

  function finishSpeech(myGeneration) {
    if (myGeneration !== generation) return;
    clearWatchdog();
    active = false;
    queue = [];
    resumeWakeAfterSpeech();
  }

  function speakNext(myGeneration) {
    if (myGeneration !== generation || stopped) return;
    const item = queue.shift();
    if (!item) {
      finishSpeech(myGeneration);
      return;
    }

    active = true;
    const u = new NativeUtterance(item.text);
    u.voice = item.voice || null;
    u.lang = item.lang || "en-US";
    u.rate = Number.isFinite(item.rate) ? item.rate : 0.88;
    u.pitch = Number.isFinite(item.pitch) ? item.pitch : 0.72;
    u.volume = Number.isFinite(item.volume) ? item.volume : 1;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      if (myGeneration !== generation || stopped) return;
      // A tiny handoff between chunks avoids the iOS speech engine occasionally
      // dropping the first word of the next utterance.
      setTimeout(() => speakNext(myGeneration), 35);
    };
    u.onend = settle;
    u.onerror = event => {
      // "interrupted"/"canceled" are expected when the user stops JARVIS.
      if (stopped || myGeneration !== generation || event?.error === "canceled" || event?.error === "interrupted") return;
      settle();
    };
    u.onpause = () => {
      if (stopped || myGeneration !== generation) return;
      // Some mobile Safari builds spontaneously pause long TTS. Resume it
      // shortly after an unexpected pause so speech does not silently stop.
      setTimeout(() => {
        if (!stopped && myGeneration === generation && synth.paused && active) {
          try { nativeResume?.(); } catch (_) {}
        }
      }, 80);
    };

    // Watchdog: if an utterance has been silently stuck, resume it rather than
    // leaving JARVIS muted forever. It is deliberately generous to avoid cutting speech.
    const estimatedMs = Math.max(7000, item.text.length * 145);
    watchdogTimer = setTimeout(() => {
      if (myGeneration !== generation || stopped || settled) return;
      try {
        if (synth.paused) nativeResume?.();
      } catch (_) {}
      setTimeout(() => {
        if (myGeneration !== generation || stopped || settled) return;
        settle();
      }, 5000);
    }, estimatedMs);

    try {
      nativeSpeak(u);
    } catch (_) {
      settle();
    }
  }

  synth.speak = function(stableUtterance) {
    if (!(stableUtterance instanceof NativeUtterance)) {
      return nativeSpeak(stableUtterance);
    }

    const text = compact(stableUtterance.text);
    if (!text) return;

    stopped = false;
    generation += 1;
    const myGeneration = generation;
    clearWatchdog();
    queue = splitSpeech(text).map(chunk => ({
      text: chunk,
      voice: stableUtterance.voice || null,
      lang: stableUtterance.lang || "en-US",
      rate: Number.isFinite(stableUtterance.rate) ? stableUtterance.rate : 0.88,
      pitch: Number.isFinite(stableUtterance.pitch) ? stableUtterance.pitch : 0.72,
      volume: Number.isFinite(stableUtterance.volume) ? stableUtterance.volume : 1
    }));

    // The old implementation calls cancel() immediately before speak(). That
    // is safe here: cancel clears the native queue, while our queue remains intact.
    pauseWakeForSpeech();
    try { nativeResume?.(); } catch (_) {}
    // Let mobile Safari release the microphone/audio-session ducking before TTS.
    setTimeout(() => speakNext(myGeneration), 350);
  };

  synth.cancel = function() {
    stopped = true;
    generation += 1;
    queue = [];
    active = false;
    clearWatchdog();
    clearTimeout(resumeTimer);
    try { nativeCancel(); } catch (_) {}
    resumeWakeAfterSpeech();
  };

  // Expose a small diagnostic flag for environments without changing their UI.
  window.__jarvisSpeechStatus = () => ({
    supported: true,
    active,
    queuedChunks: queue.length,
    stopped,
    wakePausedByTts
  });
})();
