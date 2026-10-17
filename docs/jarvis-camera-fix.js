/* Reliable browser camera controller for JARVIS Web. */
(() => {
  let stream = null;
  let modal = null;
  let video = null;
  let preview = null;
  let status = null;
  let save = null;
  let videoPreview = null;
  let saveVideo = null;
  let recordButton = null;
  let stopRecordButton = null;
  let cameraListening = false;
  let recognition = null;
  let commandRecognition = null;
  let restarting = false;
  let lastActionAt = 0;
  let settingsWasVisible = true;
  let cameraCommandBusy = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recording = false;
  let recordingUrl = "";

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
      #jarvis-camera-fix-video,#jarvis-camera-fix-preview,#jarvis-camera-fix-video-preview { display:block; width:100%; max-height:62vh; object-fit:contain; background:#000; border-radius:10px; }
      #jarvis-camera-fix-preview,#jarvis-camera-fix-video-preview { display:none; margin-top:8px; }
      .jarvis-camera-fix-btn { display:inline-block; border:1px solid #00eaff; border-radius:9px; padding:11px 16px; margin:9px 4px 0; background:#06263c; color:#d8fbff; font-weight:800; font-size:13px; }
      #jarvis-camera-fix-shutter { min-width:150px; font-size:15px; }
      #jarvis-camera-fix-status { min-height:1.5em; margin-top:8px; font-size:12px; }
      #jarvis-camera-fix-record.recording { border-color:#ff5d72; color:#ffd5dc; box-shadow:0 0 14px rgba(255,93,114,.35); }
    `;
    document.head.appendChild(style);
    modal = document.createElement("div");
    modal.id = "jarvis-camera-fix";
    modal.innerHTML = `
      <section id="jarvis-camera-fix-card" role="dialog" aria-modal="true" aria-label="JARVIS Camera">
        <h2 style="margin:3px 0 10px;letter-spacing:2px">JARVIS CAMERA</h2>
        <video id="jarvis-camera-fix-video" autoplay playsinline muted></video>
        <img id="jarvis-camera-fix-preview" alt="Captured photo preview">
        <video id="jarvis-camera-fix-video-preview" controls playsinline></video>
        <div id="jarvis-camera-fix-status" role="status">Camera readying…</div>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-start" type="button">START CAMERA</button>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-shutter" type="button">📸 CLICK PHOTO</button>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-record" type="button">🎥 RECORD VIDEO</button>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-stop-record" type="button" style="display:none">⏹ STOP RECORDING</button>
        <a class="jarvis-camera-fix-btn" id="jarvis-camera-fix-save" style="display:none;text-decoration:none" download="jarvis-photo.jpg">SAVE PHOTO</a>
        <a class="jarvis-camera-fix-btn" id="jarvis-camera-fix-save-video" style="display:none;text-decoration:none" download="jarvis-video.webm">SAVE VIDEO</a>
        <button class="jarvis-camera-fix-btn" id="jarvis-camera-fix-close" type="button">CLOSE</button>
      </section>`;
    document.body.appendChild(modal);
    video = modal.querySelector("#jarvis-camera-fix-video");
    preview = modal.querySelector("#jarvis-camera-fix-preview");
    videoPreview = modal.querySelector("#jarvis-camera-fix-video-preview");
    status = modal.querySelector("#jarvis-camera-fix-status");
    save = modal.querySelector("#jarvis-camera-fix-save");
    saveVideo = modal.querySelector("#jarvis-camera-fix-save-video");
    recordButton = modal.querySelector("#jarvis-camera-fix-record");
    stopRecordButton = modal.querySelector("#jarvis-camera-fix-stop-record");
    modal.querySelector("#jarvis-camera-fix-start").addEventListener("click", startCamera);
    modal.querySelector("#jarvis-camera-fix-shutter").addEventListener("click", capturePhoto);
    recordButton.addEventListener("click", startVideoRecording);
    stopRecordButton.addEventListener("click", stopVideoRecording);
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
      if (recording) stopVideoRecording();
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      status.textContent = "Camera ready. Say “OK Jarvis, click a photo”, “OK Jarvis, record a video”, or “OK Jarvis, close camera”.";
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
    if (recording) stopVideoRecording();
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

  function getRecordingMimeType() {
    if (!window.MediaRecorder) return "";
    const types = [
      "video/mp4",
      "video/mp4;codecs=h264,aac",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return types.find(type => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type)) || "";
  }

  async function startVideoRecording() {
    buildCamera();
    if (modal.style.display !== "flex" || !stream || !video?.videoWidth) {
      await startCamera();
      for (let attempt = 0; attempt < 40 && stream && !video?.videoWidth; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    if (!stream || !video?.videoWidth) {
      status.textContent = "Camera is not ready. Tap START CAMERA first.";
      return false;
    }
    if (!window.MediaRecorder) {
      status.textContent = "Video recording is not supported in this browser.";
      return false;
    }
    if (recording) return true;
    const mimeType = getRecordingMimeType();
    try {
      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunks = [];
      recording = true;
      if (recordingUrl) { URL.revokeObjectURL(recordingUrl); recordingUrl = ""; }
      if (videoPreview) { videoPreview.pause(); videoPreview.removeAttribute("src"); videoPreview.load(); videoPreview.style.display = "none"; }
      saveVideo.style.display = "none";
      recordButton.style.display = "none";
      stopRecordButton.style.display = "inline-block";
      stopRecordButton.classList.add("recording");
      status.textContent = "Recording video… Tap STOP RECORDING or say “OK Jarvis, stop recording”.";
      mediaRecorder.ondataavailable = event => { if (event.data && event.data.size) recordedChunks.push(event.data); };
      mediaRecorder.onerror = () => { recording = false; status.textContent = "Video recording stopped because the browser reported an error."; resetRecordButtons(); };
      mediaRecorder.onstop = finalizeVideoRecording;
      mediaRecorder.start(250);
      return true;
    } catch (_) {
      recording = false;
      resetRecordButtons();
      status.textContent = "This browser could not start video recording.";
      return false;
    }
  }

  function stopVideoRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      recording = false;
      resetRecordButtons();
      return false;
    }
    status.textContent = "Finishing video…";
    try { mediaRecorder.stop(); } catch (_) { finalizeVideoRecording(); }
    return true;
  }

  function finalizeVideoRecording() {
    const type = mediaRecorder?.mimeType || getRecordingMimeType() || "video/webm";
    const blob = new Blob(recordedChunks, { type });
    recording = false;
    resetRecordButtons();
    if (!blob.size) {
      status.textContent = "No video data was captured. Please try recording again.";
      return;
    }
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = URL.createObjectURL(blob);
    videoPreview.src = recordingUrl;
    videoPreview.style.display = "block";
    const extension = /^video\/mp4/i.test(blob.type) ? "mp4" : "webm";
    saveVideo.href = recordingUrl;
    saveVideo.download = "jarvis-video-" + Date.now() + "." + extension;
    saveVideo.style.display = "inline-block";
    status.textContent = "Video recorded. Preview it or tap SAVE VIDEO. The camera stays open until you close it.";
  }

  function resetRecordButtons() {
    if (!recordButton || !stopRecordButton) return;
    recordButton.style.display = "inline-block";
    stopRecordButton.style.display = "none";
    stopRecordButton.classList.remove("recording");
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

  function isVideoStartCommand(value) {
    const text = cleanCommand(value);
    if (!text) return false;
    return /\b(?:record|start)\b.*\b(?:video|recording|clip)\b/i.test(text)
      || /\b(?:video|recording|clip)\b.*\b(?:record|start|capture|take)\b/i.test(text)
      || /\b(?:take|capture)\b.*\b(?:a|the|one)?\s*video\b/i.test(text);
  }

  function isVideoStopCommand(value) {
    const text = cleanCommand(value);
    return /\b(?:stop|finish|end)\b.*\b(?:video|recording|record)\b/i.test(text)
      || /\b(?:stop|finish|end)\s+recording\b/i.test(text);
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
    if (recording) stopVideoRecording();
    stopCameraRecognition();
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    if (recordingUrl) { URL.revokeObjectURL(recordingUrl); recordingUrl = ""; }
    if (videoPreview) { videoPreview.pause(); videoPreview.removeAttribute("src"); videoPreview.load(); videoPreview.style.display = "none"; }
    if (modal) modal.style.display = "none";
    if (status) status.textContent = "Camera closed.";
    resetRecordButtons();
    setSettingsVisible(true);
  }

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

  async function openAndRecordVideo() {
    buildCamera();
    modal.style.display = "flex";
    await startVideoRecording();
    return recording;
  }

  window.jarvisOpenCameraAndCapturePhoto = openAndCapturePhoto;
  window.jarvisOpenCameraAndRecordVideo = openAndRecordVideo;
  window.jarvisStartVideoRecording = startVideoRecording;
  window.jarvisStopVideoRecording = stopVideoRecording;
  window.jarvisCloseCamera = closeCamera;

  function startCameraWakeRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      status.textContent = "Camera ready. Voice control is not supported here — use the buttons.";
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
            const inlineCommand = cleanCommand(transcript);
            if (isCloseCommand(inlineCommand)) { closeCamera(); return; }
            if (isVideoStopCommand(inlineCommand)) { stopVideoRecording(); return; }
            if (isVideoStartCommand(inlineCommand)) { startVideoRecording(); return; }
            if (isPhotoCommand(inlineCommand)) { capturePhoto(); return; }
            startCameraCommandCapture();
            return;
          }
        }
      }
    };

    recognition.onerror = event => {
      if (!cameraListening) return;
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        status.textContent = "Microphone permission is needed for “OK Jarvis” camera voice control. You can still use the buttons.";
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
        if (isVideoStopCommand(transcript)) { stopVideoRecording(); finishCameraCommand(); return; }
        if (isVideoStartCommand(transcript)) { startVideoRecording(); finishCameraCommand(); return; }
        if (isPhotoCommand(transcript)) { capturePhoto(); finishCameraCommand(); return; }
        if (isCloseCommand(transcript)) { closeCamera(); return; }
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
    if (isVideoStartCommand(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAndRecordVideo();
      return;
    }
    if (isVideoStopCommand(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      stopVideoRecording();
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
    if (recording) { try { mediaRecorder?.stop(); } catch (_) {} }
    if (stream) stream.getTracks().forEach(t => t.stop());
  });
})();
