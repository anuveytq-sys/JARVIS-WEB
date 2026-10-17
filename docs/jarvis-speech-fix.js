/* JARVIS speech stability layer.
   Prevents long browser TTS utterances from being cut off/going silent on mobile Safari/iOS
   and prevents the always-on wake recognizer from competing with speech playback. */
(() => {
  "use strict";
  if (window.__JARVIS_SPEECH_STABILITY__) return;
  window.__JARVIS_SPEECH_STABILITY__ = true;

  const synth = window.speechSynthesis;
  const NativeUtterance = window.SpeechSynthesisUtterance;
  if (!synth || !NativeUtterance) return;

  const nativeSpeak = synth.speak.bind(synth);
  const nativeCancel = synth.cancel.bind(synth);
  const nativeResume = synth.resume ? synth.resume.bind(synth) : null;

  let queue = [];
  let active = false;
  let stopped = false;
  let wakePausedByTts = false;
  let resumeTimer = 0;
  let watchdogTimer = 0;
  let generation = 0;
  let startTimer = 0;

  const compact = value => String(value || "").replace(/\s+/g, " ").trim();

  // Keep mobile utterances long enough to sound natural, while remaining well
  // below the range where iOS speech synthesis commonly becomes unreliable.
  function splitSpeech(text, maxChars = 420) {
    const clean = compact(text);
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];

    const sentences = clean.match(/[^.!?;:]+[.!?;:]*(?:\s+|$)/g) || [clean];
    const chunks = [];
    let current = "";
    const push = value => { const part = compact(value); if (part) chunks.push(part); };

    for (const sentence of sentences) {
      const s = compact(sentence);
      if (!s) continue;
      if (!current) {
        if (s.length <= maxChars) current = s;
        else {
          let piece = "";
          for (const word of s.split(" ")) {
            const next = piece ? piece + " " + word : word;
            if (next.length > maxChars && piece) { push(piece); piece = word; }
            else piece = next;
          }
          push(piece);
        }
      } else if ((current + " " + s).length <= maxChars) {
        current += " " + s;
      } else {
        push(current);
        current = s;
        if (current.length > maxChars) {
          let piece = "";
          for (const word of current.split(" ")) {
            const next = piece ? piece + " " + word : word;
            if (next.length > maxChars && piece) { push(piece); piece = word; }
            else piece = next;
          }
          current = piece;
        }
      }
    }
    push(current);
    return chunks;
  }

  function pauseWakeForSpeech() {
    // IMPORTANT: cancel() may have scheduled wake-word restart. A new speech
    // request immediately after cancel must cancel that restart, otherwise the
    // microphone turns back on while JARVIS is speaking and iOS can duck the
    // speech volume dramatically. This is the main mobile-volume fix.
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
      resumeTimer = 0;
    }, 650);
  }

  function clearWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = 0;
  }

  function finishSpeech(myGeneration) {
    if (myGeneration !== generation) return;
    clearWatchdog();
    clearTimeout(startTimer);
    active = false;
    queue = [];
    resumeWakeAfterSpeech();
  }

  function speakNext(myGeneration) {
    if (myGeneration !== generation || stopped) return;
    const item = queue.shift();
    if (!item) { finishSpeech(myGeneration); return; }

    active = true;
    const u = new NativeUtterance(item.text);
    u.voice = item.voice || null;
    u.lang = item.lang || "en-US";
    u.rate = Number.isFinite(item.rate) ? item.rate : 0.88;
    u.pitch = Number.isFinite(item.pitch) ? item.pitch : 0.72;
    // Web Speech volume is normalized to 0..1; 1 is the maximum. Keep it
    // explicitly at max for every chunk instead of inheriting a quiet value.
    u.volume = 1;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      if (myGeneration !== generation || stopped) return;
      setTimeout(() => speakNext(myGeneration), 55);
    };
    u.onend = settle;
    u.onerror = event => {
      if (stopped || myGeneration !== generation || event?.error === "canceled" || event?.error === "interrupted") return;
      settle();
    };
    u.onpause = () => {
      if (stopped || myGeneration !== generation) return;
      setTimeout(() => {
        if (!stopped && myGeneration === generation && synth.paused && active) {
          try { nativeResume?.(); } catch (_) {}
        }
      }, 80);
    };

    const estimatedMs = Math.max(10000, item.text.length * 145);
    watchdogTimer = setTimeout(() => {
      if (myGeneration !== generation || stopped || settled) return;
      try { if (synth.paused) nativeResume?.(); } catch (_) {}
      setTimeout(() => {
        if (myGeneration !== generation || stopped || settled) return;
        settle();
      }, 5000);
    }, estimatedMs);

    try { nativeSpeak(u); } catch (_) { settle(); }
  }

  synth.speak = function(stableUtterance) {
    if (!(stableUtterance instanceof NativeUtterance)) return nativeSpeak(stableUtterance);
    const text = compact(stableUtterance.text);
    if (!text) return;

    stopped = false;
    generation += 1;
    const myGeneration = generation;
    clearWatchdog();
    clearTimeout(startTimer);
    queue = splitSpeech(text, 420).map(chunk => ({
      text: chunk,
      voice: stableUtterance.voice || null,
      lang: stableUtterance.lang || "en-US",
      rate: Number.isFinite(stableUtterance.rate) ? Math.min(1.1, Math.max(0.65, stableUtterance.rate)) : 0.88,
      pitch: Number.isFinite(stableUtterance.pitch) ? Math.min(1.2, Math.max(0.5, stableUtterance.pitch)) : 0.72
    }));

    pauseWakeForSpeech();
    try { nativeResume?.(); } catch (_) {}

    // Give iOS a short moment to release the microphone/audio-session ducking
    // before starting TTS. The settings voice test does not have the wake mic
    // active, which is why it can sound normal while command replies are quiet.
    startTimer = setTimeout(() => {
      if (myGeneration !== generation || stopped) return;
      try { nativeResume?.(); } catch (_) {}
      speakNext(myGeneration);
    }, 300);
  };

  synth.cancel = function() {
    stopped = true;
    generation += 1;
    queue = [];
    active = false;
    clearWatchdog();
    clearTimeout(startTimer);
    clearTimeout(resumeTimer);
    try { nativeCancel(); } catch (_) {}
    resumeWakeAfterSpeech();
  };

  window.__jarvisSpeechStatus = () => ({
    supported: true,
    active,
    queuedChunks: queue.length,
    stopped,
    wakePausedByTts,
    chunkTargetCharacters: 420,
    volume: 1
  });
})();
