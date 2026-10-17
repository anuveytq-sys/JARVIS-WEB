/* JARVIS passive clap/snap greeting.
   This add-on stays visually silent until a clap/snap-like impulse is detected.
   It does not replace the existing wake-word, voice, volume, or command logic.
   On the first detected clap/snap, it enables the existing wake-word button,
   speaks the time-aware greeting through the existing JARVIS voice, then hands
   microphone control back to the original wake-word recognizer.
*/
(() => {
  "use strict";
  if (window.__JARVIS_CLAP_SNAP_WAKE__) return;
  window.__JARVIS_CLAP_SNAP_WAKE__ = true;

  const toggle = () => document.getElementById("jarvis-wake-word-toggle");
  let detectorStream = null;
  let audioContext = null;
  let analyser = null;
  let detectorSource = null;
  let detectorFrame = 0;
  let baseline = 0.015;
  let previousRms = 0.015;
  let armed = false;
  let starting = false;
  let triggered = false;
  let lastImpulseAt = 0;
  let impulseFrames = 0;
  let calibrationUntil = 0;

  const CALIBRATION_MS = 650;
  const COOLDOWN_MS = 1200;
  const WAKE_ON_RE = /WAKE WORD:\s*ON/i;

  function wakeIsOn() {
    const button = toggle();
    return !!button && WAKE_ON_RE.test(button.textContent || "");
  }

  function wakeAppearsEnabled() {
    const button = toggle();
    if (!button) return false;
    const label = String(button.textContent || "");
    return WAKE_ON_RE.test(label) || /STARTING MICROPHONE|WAKE WORD RETRYING|LISTENING FOR COMMAND/i.test(label);
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

  function speakGreetingThenResumeWake() {
    const greeting = greetingForNow();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      // This resumes the existing recognizer only; no custom command capture
      // or replacement wake-word behavior is installed by this add-on.
      try { window.__jarvisResumeWakeWordAfterEnvironment?.(); } catch (_) {}
    };

    try { window.__jarvisPauseWakeWordForEnvironment?.(); } catch (_) {}

    const waitForSpeech = (startedAt) => {
      if (finished) return;
      if (!window.speechSynthesis?.speaking && Date.now() - startedAt > 600) {
        finish();
        return;
      }
      if (Date.now() - startedAt > 10000) {
        finish();
        return;
      }
      setTimeout(() => waitForSpeech(startedAt), 120);
    };

    try {
      if (typeof window.speak === "function") {
        window.speak(greeting);
        setTimeout(() => waitForSpeech(Date.now()), 250);
        return;
      }
      if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
        setTimeout(() => waitForSpeech(Date.now()), 250);
        return;
      }
    } catch (error) {
      console.warn("[JARVIS clap/snap greeting] speech could not start:", error);
    }
    finish();
  }

  function trigger() {
    if (triggered || !armed) return;
    triggered = true;
    stopDetector();

    // Use the actual existing toggle click handler to enable wake-word listening.
    // Never edit the button label directly or substitute a new wake recognizer.
    const button = toggle();
    if (button && !wakeAppearsEnabled()) {
      try { button.click(); } catch (_) {}
    }

    // Give the existing click handler a moment to start, then pause it only while
    // the greeting plays. The original wake-word listener is resumed afterwards.
    setTimeout(speakGreetingThenResumeWake, 100);
  }

  function detectLoop() {
    if (!analyser || !armed || triggered) return;
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
      const value = Math.abs(centered / 128);
      sum += value * value;
      if (value > peak) peak = value;
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

    if (now < calibrationUntil) {
      baseline = baseline * 0.92 + rms * 0.08;
      previousRms = rms;
      detectorFrame = requestAnimationFrame(detectLoop);
      return;
    }

    baseline = baseline * 0.985 + rms * 0.015;
    const onsetRatio = rms / Math.max(previousRms, 0.012);
    const baselineRatio = rms / Math.max(baseline, 0.012);

    // Clap/snap acoustic signature: abrupt attack, strong crest, and broad
    // high-frequency energy. Lower absolute thresholds support quieter snaps;
    // the combined shape tests are stricter than loudness alone.
    let highBandEnergy = 0;
    let allBandEnergy = 0;
    const highBandStart = Math.floor(freqData.length * 0.35);
    for (let i = 1; i < freqData.length; i++) {
      const energy = (freqData[i] / 255) ** 2;
      allBandEnergy += energy;
      if (i >= highBandStart) highBandEnergy += energy;
    }
    const highBandRatio = allBandEnergy ? highBandEnergy / allBandEnergy : 0;
    const crestFactor = peak / Math.max(rms, 0.008);
    const sharpOnset = onsetRatio > 2.35 && baselineRatio > 3.2;
    const transientLevel = rms > 0.032 && peak > 0.27;
    const broadbandTransient = zeroCrossRate > 0.075 &&
      spectralCentroid > 0.22 && highBandRatio > 0.20;
    const impulse = sharpOnset && transientLevel && broadbandTransient && crestFactor > 2.0;

    if (impulse) {
      if (now - lastImpulseAt <= COOLDOWN_MS) impulseFrames++;
      else impulseFrames = 1;
      lastImpulseAt = now;
    } else if (now - lastImpulseAt > 110) {
      impulseFrames = 0;
    }

    // A sharp transient must be visible in more than one analysis frame.
    // This rejects sustained vowels/room noise while still allowing snaps.
    if (impulseFrames >= 2) {
      trigger();
      return;
    }

    previousRms = rms;
    detectorFrame = requestAnimationFrame(detectLoop);
  }

  function armIfAudioIsRunning() {
    if (triggered || armed || !audioContext || audioContext.state !== "running" || !analyser) return;
    baseline = 0.012;
    previousRms = 0.012;
    impulseFrames = 0;
    lastImpulseAt = 0;
    calibrationUntil = Date.now() + CALIBRATION_MS;
    armed = true;
    detectorFrame = requestAnimationFrame(detectLoop);
  }

  async function startDetector(fromGesture = false) {
    if (triggered || armed || starting) {
      if (fromGesture && audioContext && audioContext.state !== "running") {
        try { await audioContext.resume(); } catch (_) {}
        armIfAudioIsRunning();
      }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || (!window.AudioContext && !window.webkitAudioContext)) {
      console.warn("[JARVIS clap/snap greeting] microphone audio detection is not supported in this browser.");
      return;
    }
    starting = true;
    try {
      if (!detectorStream) {
        detectorStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false
        });
      }
      if (triggered) { stopDetector(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) {
        audioContext = new Ctx();
        detectorSource = audioContext.createMediaStreamSource(detectorStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;
        detectorSource.connect(analyser);
      }
      // iOS Safari often suspends Web Audio until a real user gesture.
      // A gesture listener below resumes it without changing JARVIS's UI.
      if (fromGesture && audioContext.state !== "running") {
        try { await audioContext.resume(); } catch (_) {}
      }
      armIfAudioIsRunning();
      if (!armed) {
        console.info("[JARVIS clap/snap greeting] audio is waiting for a browser gesture to activate the microphone detector.");
      }
    } catch (error) {
      console.warn("[JARVIS clap/snap greeting] microphone permission/detector unavailable:", error);
    } finally {
      starting = false;
    }
  }

  function unlockDetectorFromGesture() {
    if (triggered) return;
    // The first normal tap/key interaction silently unlocks audio on browsers
    // that forbid autoplay audio processing. It does not enable the wake word.
    startDetector(true);
    if (audioContext && audioContext.state !== "running") {
      audioContext.resume().then(armIfAudioIsRunning).catch(() => {});
    } else {
      armIfAudioIsRunning();
    }
  }

  function boot() {
    // Wait for the existing UI patch to create the real wake-word button.
    // The screen and all JARVIS controls remain unchanged while listening.
    if (!toggle()) {
      setTimeout(boot, 250);
      return;
    }
    document.addEventListener("pointerdown", unlockDetectorFromGesture, { passive: true });
    document.addEventListener("touchstart", unlockDetectorFromGesture, { passive: true });
    document.addEventListener("keydown", unlockDetectorFromGesture);
    startDetector(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();