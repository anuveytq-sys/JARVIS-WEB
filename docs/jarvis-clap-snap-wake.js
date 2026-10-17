/* JARVIS clap/snap wake assist.
   Isolated add-on: it does not replace the existing wake-word, voice, volume,
   or speech-recognition implementation. It only reacts while WAKE WORD: ON.
   A dedicated acoustic feature gate is used so ordinary speech/commands are
   ignored; only short, sharp clap/snap-like events can trigger the greeting.
*/
(() => {
  "use strict";
  if (window.__JARVIS_CLAP_SNAP_WAKE__) return;
  window.__JARVIS_CLAP_SNAP_WAKE__ = true;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const toggle = () => document.getElementById("jarvis-wake-word-toggle");
  let detectorStream = null;
  let audioContext = null;
  let analyser = null;
  let detectorSource = null;
  let detectorFrame = 0;
  let baseline = 0.018;
  let previousRms = 0.018;
  let armed = false;
  let busy = false;
  let lastTrigger = 0;
  let ignoreUntil = 0;
  let commandRecognition = null;
  let impulseFrames = 0;
  let lastImpulseAt = 0;

  const WAKE_ON_RE = /WAKE WORD:\s*ON/i;
  const COOLDOWN_MS = 3000;
  const REARM_SILENCE_MS = 1800;
  const CALIBRATION_MS = 1000;
  const FRAME_MS = 1000 * 1024 / 44100;

  function wakeIsOn() {
    const button = toggle();
    return !!button && WAKE_ON_RE.test(button.textContent || "");
  }

  function setWakeStatus(text) {
    const button = toggle();
    if (button) {
      button.textContent = text;
      button.setAttribute("aria-label", text);
    }
  }

  function greetingForNow() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning sir, JARVIS systems are online. How may I assist you?";
    if (hour >= 12 && hour < 17) return "Good afternoon sir, JARVIS systems are online. How may I assist you?";
    if (hour >= 17 && hour < 22) return "Good evening sir, JARVIS systems are online. How may I assist you?";
    return "Good night sir, JARVIS systems are online. How may I assist you?";
  }

  function stopDetector() {
    if (detectorFrame) cancelAnimationFrame(detectorFrame);
    detectorFrame = 0;
    try { detectorSource?.disconnect(); } catch (_) {}
    detectorSource = null;
    try { analyser?.disconnect(); } catch (_) {}
    analyser = null;
    if (detectorStream) {
      detectorStream.getTracks().forEach(track => track.stop());
      detectorStream = null;
    }
    if (audioContext) {
      try { audioContext.close(); } catch (_) {}
      audioContext = null;
    }
    armed = false;
    impulseFrames = 0;
    lastImpulseAt = 0;
  }

  function finishCommandCapture() {
    busy = false;
    // Never immediately re-arm against the tail of the user's command or
    // JARVIS audio. Give the microphone a clean quiet window first.
    ignoreUntil = Date.now() + REARM_SILENCE_MS;
    previousRms = 0.018;
    impulseFrames = 0;
    try { window.__jarvisResumeWakeWordAfterEnvironment?.(); } catch (_) {}
    if (wakeIsOn()) setTimeout(() => {
      if (wakeIsOn() && !busy) startDetector();
    }, REARM_SILENCE_MS);
  }

  function submitTranscript(transcript) {
    const text = String(transcript || "").trim();
    if (!text) return false;
    const input = document.getElementById("commandInput");
    const form = document.getElementById("commandForm");
    if (!input || !form) return false;
    input.value = text;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return true;
  }

  function listenForMainCommand() {
    if (!Recognition || !wakeIsOn()) {
      finishCommandCapture();
      return;
    }
    setWakeStatus("LISTENING FOR COMMAND");
    document.body.classList.add("listening");
    const core = document.getElementById("coreState");
    const status = document.getElementById("voiceStatus");
    const system = document.getElementById("systemStatus");
    if (core) core.textContent = "LISTENING";
    if (status) status.textContent = "LISTENING";
    if (system) system.textContent = "VOICE ACTIVE";

    commandRecognition = new Recognition();
    commandRecognition.lang = "en-IN";
    commandRecognition.continuous = false;
    commandRecognition.interimResults = false;
    commandRecognition.maxAlternatives = 1;

    let gotResult = false;
    commandRecognition.onresult = event => {
      if (gotResult) return;
      gotResult = true;
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (transcript) submitTranscript(transcript);
    };
    commandRecognition.onerror = () => finishCommandCapture();
    commandRecognition.onend = () => finishCommandCapture();
    try {
      commandRecognition.start();
    } catch (_) {
      finishCommandCapture();
    }
  }

  function speakGreetingThenListen() {
    const greeting = greetingForNow();
    setWakeStatus("JARVIS ONLINE");
    document.body.classList.remove("jarvis-voice-stopped");
    try { window.__jarvisVoiceStop = false; } catch (_) {}

    // Use the existing JARVIS speech entry point when available so the user's
    // selected voice/rate/pitch/volume remain untouched.
    if (typeof window.speak === "function") {
      let completed = false;
      const continueListening = () => {
        if (completed) return;
        completed = true;
        listenForMainCommand();
      };
      try {
        window.speak(greeting);
        const startedAt = Date.now();
        const wait = () => {
          if (completed) return;
          if (!window.speechSynthesis?.speaking && Date.now() - startedAt > 500) return continueListening();
          if (Date.now() - startedAt > 9000) return continueListening();
          setTimeout(wait, 120);
        };
        setTimeout(wait, 250);
        return;
      } catch (_) {}
    }

    if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.onend = listenForMainCommand;
      utterance.onerror = listenForMainCommand;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      listenForMainCommand();
    }
  }

  function trigger() {
    if (busy || !wakeIsOn() || Date.now() < ignoreUntil) return;
    const now = Date.now();
    if (now - lastTrigger < COOLDOWN_MS) return;
    lastTrigger = now;
    busy = true;
    stopDetector();
    try { window.__jarvisPauseWakeWordForEnvironment?.(); } catch (_) {}
    speakGreetingThenListen();
  }

  function detectLoop() {
    if (!analyser || !armed || !wakeIsOn() || busy) return;

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    let sum = 0;
    let peak = 0;
    let crossings = 0;
    let previous = timeData[0] - 128;
    for (let i = 0; i < timeData.length; i++) {
      const centered = timeData[i] - 128;
      const v = Math.abs(centered / 128);
      sum += v * v;
      if (v > peak) peak = v;
      if ((centered >= 0) !== (previous >= 0)) crossings++;
      previous = centered;
    }

    const rms = Math.sqrt(sum / timeData.length);
    const zeroCrossRate = crossings / timeData.length;
    let weightedEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < freqData.length; i++) {
      const energy = freqData[i] / 255;
      totalEnergy += energy;
      weightedEnergy += i * energy;
    }
    const spectralCentroid = totalEnergy ? weightedEnergy / totalEnergy / freqData.length : 0;
    const now = Date.now();

    if (now < ignoreUntil) {
      previousRms = rms;
      detectorFrame = requestAnimationFrame(detectLoop);
      return;
    }

    baseline = baseline * 0.985 + rms * 0.015;
    const onsetRatio = rms / Math.max(previousRms, 0.012);
    const baselineRatio = rms / Math.max(baseline, 0.012);

    // A clap/snap is treated as a short impulsive event: fast onset, high peak,
    // broadband/high-frequency content and only a very short run of frames.
    // Ordinary speech is sustained and voiced, so it must not satisfy this gate.
    const sharpOnset = onsetRatio > 1.8 && baselineRatio > 5.0;
    const loudTransient = rms > 0.105 && peak > 0.55;
    const broadbandTransient = zeroCrossRate > 0.105 && spectralCentroid > 0.18 && peak > 0.58;
    const impulse = sharpOnset && loudTransient && broadbandTransient;

    if (impulse) {
      if (now - lastImpulseAt <= FRAME_MS * 3.2) impulseFrames++;
      else impulseFrames = 1;
      lastImpulseAt = now;
    } else if (now - lastImpulseAt > FRAME_MS * 4.5) {
      impulseFrames = 0;
    }

    // Require a compact impulse sequence rather than one noisy microphone frame.
    // This makes normal spoken words much less likely to activate the greeting.
    if (impulseFrames >= 2 && now >= ignoreUntil) {
      impulseFrames = 0;
      trigger();
      return;
    }

    previousRms = rms;
    detectorFrame = requestAnimationFrame(detectLoop);
  }

  async function startDetector() {
    if (armed || busy || !wakeIsOn() || Date.now() < ignoreUntil) return;
    if (!navigator.mediaDevices?.getUserMedia || (!window.AudioContext && !window.webkitAudioContext)) return;
    try {
      detectorStream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false
      }, video: false });
      if (!wakeIsOn() || busy) { stopDetector(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctx();
      detectorSource = audioContext.createMediaStreamSource(detectorStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.04;
      detectorSource.connect(analyser);
      baseline = 0.018;
      previousRms = 0.018;
      impulseFrames = 0;
      lastImpulseAt = 0;
      armed = true;
      detectorFrame = requestAnimationFrame(detectLoop);
    } catch (error) {
      console.warn("[JARVIS clap/snap wake] microphone detector unavailable:", error);
      stopDetector();
    }
  }

  function monitorWakeToggle() {
    const on = wakeIsOn();
    if (on && !armed && !busy && Date.now() >= ignoreUntil) startDetector();
    if (!on && (armed || busy)) {
      try { commandRecognition?.abort(); } catch (_) {}
      commandRecognition = null;
      busy = false;
      stopDetector();
    }
    setTimeout(monitorWakeToggle, 300);
  }

  const boot = () => {
    if (toggle()) monitorWakeToggle();
    else setTimeout(boot, 250);
  };
  boot();
})();
