/* Reliable browser camera controller for JARVIS Web. */
(() => {
  let stream = null;
  let modal = null;
  let video = null;
  let preview = null;
  let status = null;
  let save = null;

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
    status.textContent = "Allow camera access when your browser asks.";
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported in this browser.");
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      status.textContent = "Camera ready. Say “Hey Jarvis, click a photo” or tap 📸 CLICK PHOTO.";
    } catch (e) {
      status.textContent = "Camera permission is required. Tap START CAMERA and allow access.";
    }
  }

  function capturePhoto() {
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
    status.textContent = "Photo captured! Tap SAVE PHOTO to save it.";
    return true;
  }

  function cleanCommand(value) {
    return String(value || "").replace(/^\s*(?:(?:hey|hello|hi)\s+)?jarvis[, ]*/i, "").replace(/[.!?]+$/, "").trim();
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!form || form.id !== "commandForm") return;
    const input = document.getElementById("commandInput");
    const command = cleanCommand(input?.value);
    if (/^(?:open|launch|start|show|turn on)(?: the)? camera$/i.test(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      buildCamera();
      startCamera();
      return;
    }
    if (/^(?:please\s+)?(?:click|take|capture|snap)(?:\s+(?:a|the))?\s+(?:photo|picture)$/i.test(command) || /^click photo$/i.test(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!modal || modal.style.display !== "flex") startCamera();
      else capturePhoto();
    }
  }, true);

  window.addEventListener("beforeunload", () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  });
})();
