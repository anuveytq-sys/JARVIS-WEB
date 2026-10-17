/* Reliable browser camera controller for JARVIS Web. */
(() => {
  let stream = null;
  let modal = null;
  let video = null;
  let preview = null;
  let status = null;
  let save = null;
  let cameraListening = false;
  let recognition = null;
  let commandRecognition = null;
  let restarting = false;
  let lastActionAt = 0;
  let settingsWasVisible = true;
  let cameraCommandBusy = false;

  function setSettingsVisible(visible) {
    const button = document.getElementById("jarvis-settings-trigger");
    if (!button) {
      setTimeout(() => setSettingsVisible(visible), 150);
      return;
    }
    if (visible) {
      button.style.removeProperty("display");
      button.setAttribute("aria-hidden", "false");
      button.disabled = false;
    } else {
      settingsWasVisible = getComputedStyle(button).display !== "none";
      button.style.setProperty("display", "none", "important");
      button.setAttribute("aria-hidden", "true");
      button.disabled = true;
    }
  }

  function buildCamera() {
    if (modal) return;
    const style = document.createElement("style");
    style.textContent = `
      #jarvis-camera-fix { position:fixed; inset:0; z-index:2147483647; display:none; align-items:center; justify-content:center; padding:14px; background:rgba(0,6,16,.96); color:#d8fbff; font-family:system-ui,sans-serif; }
      #jarvis-camera-fix-card { width:min(94vw,520px); max-height:94vh; overflow:auto; text-align:center; padding:14px; border:1px solid #00eaff; border-radius:14px; background:#031321; box-shadow:0 0 30px rgba(0,220,255,.35); }
      #jarvis-camera-fix-video,#jarvis-camera-fix-preview { display:block; width:100%; max-height:62vh; object-fit:contain; background:#000; border-radius:10px; }
      #jarvis-camera-fix-preview { display:none; margin-top:8px; }
      .jarvis-camera-fix-btn { display:inline-block; border:1px solid #00eaff; border-radius:9px; padding:11px 16px; margin:9px 4px 0; background:#06263c; color:#d8fbff; font-weight:800; font-size:13px; }
      #jarvis-camera-fix-shutter { min-width:150px; font-size:15px; }
      #jarvis-camera-fix-status { min-height:1.5em; margin-top:8px; font-size:12px; }
    `;
    document.head.appendChild(style);
    modal = document.createElement("div");
    modal.id = "jarvis-camera-fix";
    modal.innerHTML = `
      <section id="jarvis-camera-fix-card" role="dialog" aria-modal="true" aria-label="JARVIS Camera">
        <h2 style="margin:3px 0 10px;letter-spacing:2px">JARVIS CAMERA</h2>
        <video id="jarvis-camera-fix-video" autoplay playsinline muted></video>
        <img id="jarvis-camera-fix-preview" alt="Captured photo preview">
        <div id="jarvis-camera-fix-status" role="status">Camera readying…</div>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-start" type="button">START CAMERA</button>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-shutter" type="button">📸 CLICK PHOTO</button>
        <a class="jarvis-camera-fix-btn" id="jarvis-camera-fix-save" style="display:none;text-decoration:none" download="jarvis-photo.png">SAVE PHOTO</a>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-close" type="button">CLOSE</button>
      </section>`;
    document.body.appendChild(modal);
    video = modal.querySelector("#jarvis-camera-fix-video");
    preview = modal.querySelector("#jarvis-camera-fix-preview");
    status = modal.querySelector("#jarvis-camera-fix-status");
    save = modal.querySelector("#jarvis-camera-fix-save");
    modal.querySelector("#jarvis-camera-fix-start").addEventListener("click", startCamera);
    modal.querySelector("#jarvis-camera-fix-shutter").addEventListener("click", capturePhoto);
    modal.querySelector("#jarvis-camera-fix-close").addEventListener("click", closeCamera);
  }

  async function startCamera() {
    buildCamera();
    modal.style.display = "flex";
    setSettingsVisible(false);
    status.textContent = "Allow camera access when your browser asks.";
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported in this browser.");
      stopCameraRecognition();
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      status.textContent = "Camera ready. Say “OK Jarvis, click a photo”, “OK Jarvis, take a picture”, or “OK Jarvis, close camera”.";
      startCameraWakeRecognition();
    } catch (e) {
      status.textContent = "Camera permission is required. Tap START CAMERA and allow access.";
    }
  }

  function capturePhoto() {
    const now = Date.now();
    if (now - lastActionAt < 1400) return true;
    lastActionAt = now;
    if (!stream || !video?.videoWidth) {
      status.textContent = "Camera is not ready. Tap START CAMERA first.";
      return false;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", .92);
    preview.src = data;
    preview.style.display = "block";
    save.href = data;
    save.download = "jarvis-photo-" + Date.now() + ".jpg";
    save.style.display = "inline-block";
    status.textContent = "Photo captured. Camera is waiting for “OK Jarvis” before accepting another voice command.";
    return true;
  }

  function normalizeSpeech(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,!?;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanCommand(value) {
    let text = normalizeSpeech(value);
    text = text.replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b\s*[, ]*/i, "");
    text = text.replace(/^\s*(?:ok|okay)\s+jarvis\b\s*[, ]*/i, "");
    text = text.replace(/\bplease\b/g, " ").replace(/\s+/g, " ").trim();
    return text;
  }

  function hasWakeWord(value) {
    return /\b(?:ok|okay|hey|hello|hi)?\s*jarvis\b/i.test(normalizeSpeech(value));
  }

  function isPhotoCommand(value) {
    const text = cleanCommand(value);
    if (!text) return false;
    return /\b(?:click|take|capture|snap)\b.*\b(?:photo|picture|pic|image)\b/i.test(text)
      || /\b(?:photo|picture|pic|image)\b.*\b(?:click|take|capture|snap)\b/i.test(text)
      || /\b(?:take|click|capture|snap)\b.*\b(?:one|a|the)\b.*\b(?:photo|picture|pic|image)\b/i.test(text);
  }

  function isCloseCommand(value) {
    const text = cleanCommand(value);
    return /\b(?:close|exit|stop|hide)\b.*\bcamera\b/i.test(text)
      || /\bcamera\b.*\b(?:close|exit|stop|hide)\b/i.test(text);
  }

  function stopCameraRecognition() {
    cameraListening = false;
    restarting = true;
    cameraCommandBusy = false;
    try { recognition?.abort(); } catch (_) {}
    try { commandRecognition?.abort(); } catch (_) {}
    recognition = null;
    commandRecognition = null;
    setTimeout(() => { restarting = false; }, 250);
  }

  function closeCamera() {
    stopCameraRecognition();
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    if (modal) modal.style.display = "none";
    if (status) status.textContent = "Camera closed.";
    setSettingsVisible(true);
  }

  // Open the camera from a JARVIS command, wait until video frames are ready,
  // and take one photo automatically. The browser still requires a user tap to save.
  async function openAndCapturePhoto() {
    await startCamera();
    if (!stream) return false;
    for (let attempt = 0; attempt < 40 && stream && !video?.videoWidth; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!stream || !video?.videoWidth) {
      if (status) status.textContent = "Camera opened, but the image is not ready yet. Tap CLICK PHOTO to try again.";
      return false;
    }
    return capturePhoto();
  }

  // Allow the main JARVIS command bridge to use this same camera UI/controller.
  window.jarvisOpenCameraAndCapturePhoto = openAndCapturePhoto;
  window.jarvisCloseCamera = closeCamera;

  function startCameraWakeRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      status.textContent = "Camera ready. Voice control is not supported here — use 📸 CLICK PHOTO or CLOSE.";
      return;
    }
    if (cameraListening) return;
    cameraListening = true;
    restarting = false;
    try { recognition?.abort(); } catch (_) {}
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = navigator.language || "en-IN";

    recognition.onresult = event => {
      if (!cameraListening || cameraCommandBusy) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives = [];
        for (let a = 0; a < Math.min(result.length || 1, 3); a++) {
          if (result[a]?.transcript) alternatives.push(result[a].transcript);
        }
        for (const transcript of alternatives) {
          if (hasWakeWord(transcript)) {
            startCameraCommandCapture();
            return;
          }
        }
      }
    };

    recognition.onerror = event => {
      if (!cameraListening) return;
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        status.textContent = "Microphone permission is needed for “OK Jarvis” camera voice control. You can still use 📸 CLICK PHOTO.";
      }
      restartCameraWakeRecognition(600);
    };
    recognition.onend = () => {
      if (cameraListening && !cameraCommandBusy) restartCameraWakeRecognition(250);
    };
    try { recognition.start(); }
    catch (_) { restartCameraWakeRecognition(500); }
  }

  function startCameraCommandCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !cameraListening || cameraCommandBusy) return;
    cameraCommandBusy = true;
    try { recognition?.abort(); } catch (_) {}
    const command = new SR();
    commandRecognition = command;
    command.lang = navigator.language || "en-IN";
    command.continuous = false;
    command.interimResults = true;
    command.maxAlternatives = 5;
    command.onresult = event => {
      const transcripts = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        for (let a = 0; a < Math.min(result.length || 1, 5); a++) {
          if (result[a]?.transcript) transcripts.push(result[a].transcript);
        }
      }
      for (const transcript of transcripts) {
        if (isPhotoCommand(transcript)) {
          capturePhoto();
          finishCameraCommand();
          return;
        }
        if (isCloseCommand(transcript)) {
          closeCamera();
          return;
        }
      }
    };
    command.onerror = () => finishCameraCommand();
    command.onend = () => finishCameraCommand();
    try { command.start(); }
    catch (_) { finishCameraCommand(); }
  }

  function finishCameraCommand() {
    if (!cameraCommandBusy) return;
    cameraCommandBusy = false;
    try { commandRecognition?.abort(); } catch (_) {}
    commandRecognition = null;
    if (cameraListening) restartCameraWakeRecognition(250);
  }

  function restartCameraWakeRecognition(delay = 300) {
    if (!cameraListening || restarting || cameraCommandBusy) return;
    restarting = true;
    setTimeout(() => {
      restarting = false;
      if (cameraListening && !cameraCommandBusy) startCameraWakeRecognition();
    }, delay);
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!form || form.id !== "commandForm") return;
    const input = document.getElementById("commandInput");
    const command = cleanCommand(input?.value);
    if (/^(?:open|launch|start|show|turn on)(?: the)? camera$/i.test(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startCamera();
      return;
    }
    if (isPhotoCommand(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!modal || modal.style.display !== "flex" || !stream) openAndCapturePhoto();
      else capturePhoto();
      return;
    }
    if (isCloseCommand(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCamera();
    }
  }, true);

  window.addEventListener("beforeunload", () => {
    stopCameraRecognition();
    if (stream) stream.getTracks().forEach(t => t.stop());
  });
})();
