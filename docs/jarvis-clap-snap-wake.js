/* JARVIS clap/snap wake assist.
   Isolated add-on: it does not replace the existing wake-word, voice, volume,
   or speech-recognition implementation. It only reacts while WAKE WORD: ON.
   On a detected clap/snap it pauses the existing recognizer, speaks the
   time-aware greeting through the existing JARVIS voice entry point, then
   captures one main command and returns control to the original wake system.
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
  let armed = false;
  let busy = false;
  let lastTrigger = 0;
  let commandRecognition = null;

  const WAKE_ON_RE = /WAKE WORD:\s*ON/i;
  const COOLDOWN_MS = 2600;

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
  }

  function finishCommandCapture() {
    busy = false;
    try { window.__jarvisResumeWakeWordAfterEnvironment?.(); } catch (_) {}
    if (wakeIsOn()) startDetector();
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
    if (busy || !wakeIsOn()) return;
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
    analyser.getByteTimeDomainData(timeData);
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
    baseline = baseline * 0.985 + rms * 0.015;

    // Require a strong, sharp, broadband transient. This deliberately raises
    // the trigger threshold so ordinary speech does not activate the greeting.
    const loudTransient = rms > Math.max(0.11, baseline * 4.5) && peak > 0.52;
    const broadbandTransient = zeroCrossRate > 0.10 && peak > 0.58;
    if (loudTransient && broadbandTransient) trigger();
    detectorFrame = requestAnimationFrame(detectLoop);
  }

  async function startDetector() {
    if (armed || busy || !wakeIsOn()) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      detectorStream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false
      }, video: false });
      if (!wakeIsOn()) { stopDetector(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctx();
      detectorSource = audioContext.createMediaStreamSource(detectorStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.04;
      detectorSource.connect(analyser);
      baseline = 0.018;
      armed = true;
      detectorFrame = requestAnimationFrame(detectLoop);
    } catch (error) {
      console.warn("[JARVIS clap/snap wake] microphone detector unavailable:", error);
      stopDetector();
    }
  }

  function monitorWakeToggle() {
    const on = wakeIsOn();
    if (on && !armed && !busy) startDetector();
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
