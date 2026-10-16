/* VELVE voice fix: start speech recognition directly from the user gesture for mobile Safari/browser compatibility. */
(() => {
  'use strict';
  const VERSION = 'velve-voice-fix-20261016c';
  const state = window.__VELVE_VOICE_FIX || (window.__VELVE_VOICE_FIX = {
    installed: false, recognition: null, listening: false, cancelRequested: false,
    finished: false, heard: '', generation: 0
  });

  const button = () => document.getElementById('velve-voice');
  const input = () => document.getElementById('velve-input');
  const send = () => document.getElementById('velve-send');
  const status = () => document.querySelector('#velve-status b');
  const setStatus = text => { const el = status(); if (el) el.textContent = text; };
  const setButton = listening => {
    const b = button();
    if (!b) return;
    b.classList.toggle('listening', !!listening);
    b.setAttribute('aria-pressed', listening ? 'true' : 'false');
    b.textContent = listening ? '●' : '🎙';
    b.title = listening ? 'Listening… tap to stop' : 'Voice input';
  };

  function finish(text, generation) {
    if (generation !== state.generation || state.finished) return;
    state.finished = true;
    state.listening = false;
    state.recognition = null;
    setButton(false);
    // Recognition may report onend after this final result; release the shared mic now.
    try { window.__jarvisResumeWakeWordAfterEnvironment?.(); } catch (_) {}
    const heard = String(text || '').trim();
    if (!heard) {
      if (!state.cancelRequested) setStatus('NO SPEECH HEARD — TAP 🎙 AND SPEAK');
      return;
    }
    const field = input();
    if (!field) { setStatus('COMMAND FIELD UNAVAILABLE'); return; }
    field.value = heard;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus('VOICE COMMAND RECEIVED');
    const sendButton = send();
    if (sendButton) window.setTimeout(() => {
      if (generation === state.generation) sendButton.click();
    }, 120);
  }

  function stopByUser() {
    state.cancelRequested = true;
    state.listening = false;
    setButton(false);
    try { state.recognition?.stop(); } catch (_) {}
    state.recognition = null;
    setStatus('VOICE STOPPED');
  }

  function startVoice() {
    if (state.listening) { stopByUser(); return; }
    // Release any previous mobile-browser session before creating the next one.
    const previous = state.recognition;
    if (previous) {
      try { previous.onresult = previous.onerror = previous.onend = null; previous.abort(); } catch (_) {}
      state.recognition = null;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      const field = input();
      if (field) {
        field.placeholder = 'Browser speech recognition unavailable — use your keyboard microphone';
        field.focus();
      }
      setStatus('USE KEYBOARD MICROPHONE');
      return;
    }

    // IMPORTANT: do not await getUserMedia here. On iOS Safari that can lose the
    // original tap/user-activation before recognition.start(), causing an abort.
    const generation = ++state.generation;
    pauseWake();
    state.cancelRequested = false;
    state.finished = false;
    state.heard = '';
    let gotFinal = false;
    let wakePaused = false;
    const pauseWake = () => { if(wakePaused)return; wakePaused=true; try{window.__jarvisPauseWakeWordForEnvironment?.()}catch(_){} };
    const resumeWake = () => { if(!wakePaused)return; wakePaused=false; try{window.__jarvisResumeWakeWordAfterEnvironment?.()}catch(_){} };
    const recognition = new Recognition();
    state.recognition = recognition;
    state.listening = true;
    setButton(true);
    setStatus('STARTING MICROPHONE…');

    try {
      recognition.lang = /^(hi|en)(-|$)/i.test(navigator.language || '') ? navigator.language : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (generation !== state.generation) return;
        setStatus('LISTENING — SPEAK NOW');
        setButton(true);
      };
      recognition.onresult = event => {
        if (generation !== state.generation) return;
        let interim = '';
        let finalText = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result && result[0] ? String(result[0].transcript || '') : '';
          if (result.isFinal) finalText += transcript;
          else interim += transcript;
        }
        const text = (finalText || interim).trim();
        if (text) {
          state.heard = text;
          const field = input();
          if (field) field.value = text;
          setStatus((finalText ? 'HEARD: ' : 'HEARING: ') + text.slice(0, 48));
        }
        if (finalText.trim()) {
          gotFinal = true;
          finish(finalText, generation);
        }
      };
      recognition.onerror = event => {
        if (generation !== state.generation || state.finished) return;
        const error = String(event && event.error || '').toLowerCase();
        if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'securityerror') {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('MICROPHONE BLOCKED — ALLOW IT IN BROWSER SETTINGS');
        } else if (error === 'no-speech') {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('NO SPEECH HEARD — TAP 🎙 AND SPEAK');
        } else if (error === 'audio-capture') {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('MICROPHONE BUSY OR UNAVAILABLE');
        } else if (error === 'network') {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('SPEECH SERVICE NETWORK ERROR — CHECK INTERNET');
        } else if (error === 'aborted' && state.cancelRequested) {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('VOICE STOPPED');
        } else if (error === 'aborted') {
          // Some mobile browsers emit an unsolicited abort while starting.
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('VOICE INTERRUPTED — TAP 🎙 TO RETRY');
        } else {
          state.listening = false; state.recognition = null; setButton(false);
          setStatus('VOICE ERROR: ' + (error || 'UNKNOWN') + ' — TAP TO RETRY');
        }
        resumeWake();
      };
      recognition.onspeechstart = () => {
        if (generation === state.generation) setStatus('SPEECH DETECTED — LISTENING');
      };
      recognition.onend = () => {
        if (generation !== state.generation) return;
        if (state.finished) return;
        state.listening = false;
        state.recognition = null;
        setButton(false);
        if (state.cancelRequested) { setStatus('VOICE STOPPED'); return; }
        if (state.heard) finish(state.heard, generation);
        else if (!gotFinal) setStatus('LISTENING ENDED — NO SPEECH; TAP 🎙 TO RETRY');
        resumeWake();
      };

      // Must be called synchronously during the actual button tap/click.
      recognition.start();
    } catch (err) {
      if (generation !== state.generation) return;
      state.listening = false;
      state.recognition = null;
      setButton(false);
      const name = String(err && err.name || '').toLowerCase();
      setStatus(name === 'notallowederror' || name === 'securityerror'
        ? 'MICROPHONE BLOCKED — ALLOW IT IN BROWSER SETTINGS'
        : 'VOICE START FAILED — TAP 🎙 TO RETRY');
      resumeWake();
    }
  }

  function install() {
    const b = button();
    if (!b) return false;
    if (b.dataset.velveVoiceFix === VERSION) return true;
    b.dataset.velveVoiceFix = VERSION;
    state.installed = true;
    // Capture the tap before older VELVE handlers can cancel or replace it.
    b.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      startVoice();
    }, true);
    b.style.touchAction = 'manipulation';
    b.setAttribute('type', 'button');
    return true;
  }

  function watch() {
    install();
    window.setTimeout(watch, 500);
  }

  window.VELVE_VOICE_FIX_VERSION = VERSION;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true });
  else watch();
})();
