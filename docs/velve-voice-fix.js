/* VELVE voice fix: isolated microphone/speech-recognition handler for the VELVE/God's Eye environment. */
(() => {
  'use strict';
  const VERSION = 'velve-voice-fix-20261016a';
  const state = window.__VELVE_VOICE_FIX || (window.__VELVE_VOICE_FIX = {
    installed: false,
    recognition: null,
    listening: false,
    permissionStream: null
  });

  const button = () => document.getElementById('velve-voice');
  const input = () => document.getElementById('velve-input');
  const send = () => document.getElementById('velve-send');
  const status = () => document.querySelector('#velve-status b');
  const setStatus = (text) => {
    const el = status();
    if (el) el.textContent = text;
  };
  const setButton = (listening) => {
    const b = button();
    if (!b) return;
    b.classList.toggle('listening', !!listening);
    b.setAttribute('aria-pressed', listening ? 'true' : 'false');
    b.textContent = listening ? '●' : '🎙';
    b.title = listening ? 'Listening… tap to stop' : 'Voice input';
  };

  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      const name = String(err?.name || '').toLowerCase();
      if (name === 'notallowederror' || name === 'securityerror') {
        setStatus('ALLOW MICROPHONE');
      } else {
        setStatus('MICROPHONE UNAVAILABLE');
      }
      return false;
    }
  }

  function finish(heard) {
    state.listening = false;
    state.recognition = null;
    setButton(false);
    if (!heard) {
      setStatus('READY FOR VOICE');
      return;
    }
    const field = input();
    if (!field) return;
    field.value = heard;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus('VOICE COMMAND RECEIVED');
    const sendButton = send();
    if (sendButton) requestAnimationFrame(() => sendButton.click());
  }

  async function startVoice() {
    if (state.listening) {
      try { state.recognition?.stop(); } catch (_) {}
      return;
    }

    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
      const field = input();
      if (field) {
        field.placeholder = 'Voice input is not supported by this browser — use the keyboard microphone';
        field.focus({ preventScroll: true });
      }
      setStatus('BROWSER VOICE NOT SUPPORTED');
      return;
    }

    const allowed = await requestMicrophonePermission();
    if (!allowed) return;

    const recognition = new R();
    state.recognition = recognition;
    state.listening = true;
    let heard = '';
    let gotResult = false;

    recognition.lang = /^(hi|en)-/i.test(navigator.language || '') ? navigator.language : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setButton(true);
      setStatus('LISTENING — SPEAK NOW');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || '';
      }
      transcript = transcript.trim();
      if (transcript) {
        heard = transcript;
        gotResult = true;
        const field = input();
        if (field) field.value = transcript;
        setStatus('HEARING: ' + transcript.slice(0, 48));
      }
      const last = event.results[event.results.length - 1];
      if (last?.isFinal) finish(heard);
    };

    recognition.onerror = (event) => {
      const error = String(event?.error || '').toLowerCase();
      if (error === 'not-allowed' || error === 'service-not-allowed') setStatus('ALLOW MICROPHONE');
      else if (error === 'no-speech') setStatus('NO SPEECH HEARD — TRY AGAIN');
      else if (error === 'audio-capture') setStatus('MICROPHONE UNAVAILABLE');
      else if (error === 'network') setStatus('VOICE NETWORK ERROR');
      else if (error === 'aborted') setStatus('VOICE STOPPED');
      else setStatus('VOICE ERROR — TRY AGAIN');
      state.listening = false;
      state.recognition = null;
      setButton(false);
    };

    recognition.onend = () => {
      if (!state.listening) return;
      state.listening = false;
      state.recognition = null;
      setButton(false);
      if (!gotResult) setStatus('NO SPEECH HEARD — TRY AGAIN');
      else if (heard) finish(heard);
    };

    try {
      recognition.start();
    } catch (err) {
      state.listening = false;
      state.recognition = null;
      setButton(false);
      setStatus('VOICE START FAILED — TRY AGAIN');
    }
  }

  function install() {
    const b = button();
    if (!b) return false;
    if (b.dataset.velveVoiceFix === VERSION) return true;
    b.dataset.velveVoiceFix = VERSION;
    state.installed = true;
    b.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      startVoice();
    };
    b.addEventListener('pointerdown', () => { b.style.touchAction = 'manipulation'; }, { passive: true });
    return true;
  }

  function watch() {
    install();
    if (!document.getElementById('velve-root') || !document.body) {
      setTimeout(watch, 400);
      return;
    }
    setTimeout(watch, 1200);
  }

  window.VELVE_VOICE_FIX_VERSION = VERSION;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true });
  else watch();
})();
