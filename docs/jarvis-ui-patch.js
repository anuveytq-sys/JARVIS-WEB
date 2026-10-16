/* JARVIS web UI compatibility patch. Loaded before the main bridge. */
(() => {
  const style = document.createElement("style");
  style.id = "jarvis-ui-patch-style";
  style.textContent = `
    /* Compact, scrollable answer box: leaves more of the centre core visible. */
    #jarvis-web-bridge-panel {
      position: fixed !important;
      left: 12px !important;
      right: auto !important;
      top: 24% !important;
      bottom: auto !important;
      transform: none !important;
      width: 128px !important;
      min-height: 48px !important;
      max-height: 108px !important;
      padding: 8px 9px !important;
      box-sizing: border-box !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      -webkit-overflow-scrolling: touch !important;
      touch-action: pan-y !important;
      pointer-events: auto !important;
      z-index: 2147483630 !important;
      font-size: 8.5px !important;
      line-height: 1.45 !important;
      border-radius: 8px !important;
    }

    #commandForm.command-area {
      bottom: 34px !important;
      z-index: 2147483640 !important;
      padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    }
    #commandForm.command-area .command-input,
    #commandForm.command-area .btn {
      touch-action: manipulation !important;
    }
    #commandInput {
      position: relative !important;
      z-index: 2147483641 !important;
      -webkit-user-select: text !important;
      user-select: text !important;
    }

    @media (max-width: 767px) {
      #jarvis-web-bridge-panel {
        left: 8px !important;
        right: auto !important;
        top: 16% !important;
        bottom: auto !important;
        transform: none !important;
        width: 112px !important;
        min-height: 44px !important;
        max-height: 96px !important;
        padding: 7px 8px !important;
        font-size: 8px !important;
      }
      #commandForm.command-area {
        bottom: 30px !important;
        width: min(94vw, 650px) !important;
        gap: 5px !important;
      }
      #commandForm.command-area .command-input {
        height: 42px !important;
        font-size: 12px !important;
      }
      #commandForm.command-area .btn {
        height: 42px !important;
        min-width: 48px !important;
        padding: 0 9px !important;
        font-size: 7px !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const FORCED_GEMINI_MODEL = "gemini-2.5-flash";
  try {
    sessionStorage.setItem("jarvisPersonalGeminiModel", FORCED_GEMINI_MODEL);
    sessionStorage.removeItem("jarvisAvailableGeminiModels");
  } catch (_) {}

  const apps = [
    ["youtube", "https://www.youtube.com/", ["youtube", "yt"]],
    ["google", "https://www.google.com/", ["google search", "google"]],
    ["maps", "https://maps.google.com/", ["google maps", "maps"]],
    ["gmail", "https://mail.google.com/", ["gmail", "mail"]],
    ["drive", "https://drive.google.com/", ["google drive", "drive"]],
    ["photos", "https://photos.google.com/", ["google photos", "photos"]],
    ["docs", "https://docs.google.com/", ["google docs", "docs"]],
    ["sheets", "https://sheets.google.com/", ["google sheets", "sheets"]],
    ["slides", "https://slides.google.com/", ["google slides", "slides"]],
    ["calendar", "https://calendar.google.com/", ["google calendar", "calendar"]],
    ["meet", "https://meet.google.com/", ["google meet", "meet"]],
    ["translate", "https://translate.google.com/", ["google translate", "translate"]],
    ["spotify", "https://open.spotify.com/", ["spotify"]],
    ["discord", "https://discord.com/app", ["discord"]],
    ["slack", "https://app.slack.com/client/", ["slack"]],
    ["teams", "https://teams.microsoft.com/", ["microsoft teams", "teams"]],
    ["outlook", "https://outlook.live.com/mail/", ["outlook"]],
    ["onedrive", "https://onedrive.live.com/", ["onedrive"]],
    ["notion", "https://www.notion.so/", ["notion"]],
    ["zoom", "https://zoom.us/join", ["zoom"]]
  ];

  const open = (url, sameTab = false) => {
    if (sameTab) return window.location.assign(url);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(url);
  };
  const clean = (s) => String(s || "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const nativeFetch = window.fetch.bind(window);

  // Browser camera feature: permission-based live preview, shutter button,
  // voice-triggered capture, and a downloadable photo. Camera access requires HTTPS.
  let jarvisCameraStream = null;
  let jarvisCameraModal = null;
  let jarvisCameraVideo = null;
  let jarvisCameraStatus = null;
  let jarvisCameraCaptureButton = null;

  function ensureCameraUI() {
    if (jarvisCameraModal) return;
    const style = document.createElement("style");
    style.textContent = `
      #jarvis-camera-modal { position:fixed; inset:0; z-index:2147483647; display:none;
        align-items:center; justify-content:center; padding:16px; box-sizing:border-box;
        background:rgba(0,8,20,.94); color:#c9fbff; font-family:system-ui,sans-serif; }
      #jarvis-camera-card { width:min(92vw,520px); max-height:92vh; overflow:auto;
        border:1px solid #00dfff; border-radius:14px; padding:14px; box-sizing:border-box;
        background:linear-gradient(145deg,#06182a,#020811); box-shadow:0 0 28px #00aaff55; text-align:center; }
      #jarvis-camera-video { display:block; width:100%; max-height:58vh; object-fit:contain;
        background:#000; border-radius:9px; }
      #jarvis-camera-preview { display:none; width:100%; max-height:58vh; object-fit:contain;
        margin-top:8px; border-radius:9px; }
      .jarvis-camera-btn { border:1px solid #00dfff; border-radius:8px; padding:10px 14px;
        margin:8px 4px 0; background:#06243a; color:#d9fcff; font-weight:700; }
      #jarvis-camera-status { min-height:1.4em; font-size:12px; overflow-wrap:anywhere; }
    `;
    document.head.appendChild(style);
    jarvisCameraModal = document.createElement("div");
    jarvisCameraModal.id = "jarvis-camera-modal";
    jarvisCameraModal.innerHTML = `
      <section id="jarvis-camera-card" role="dialog" aria-modal="true" aria-label="JARVIS Camera">
        <h2 style="margin:4px 0 10px;letter-spacing:2px">JARVIS CAMERA</h2>
        <video id="jarvis-camera-video" autoplay playsinline muted></video>
        <img id="jarvis-camera-preview" alt="Captured photo preview">
        <div id="jarvis-camera-status" role="status">Requesting camera permission…</div>
        <button class="jarvis-camera-btn" id="jarvis-camera-start" type="button">START CAMERA</button>
        <button class="jarvis-camera-btn" id="jarvis-camera-capture" type="button">CLICK PHOTO</button>
        <a class="jarvis-camera-btn" id="jarvis-camera-download" style="display:none;text-decoration:none" href="#" download="jarvis-photo.png">SAVE PHOTO</a>
        <button class="jarvis-camera-btn" id="jarvis-camera-close" type="button">CLOSE CAMERA</button>
      </section>`;
    document.body.appendChild(jarvisCameraModal);
    jarvisCameraVideo = jarvisCameraModal.querySelector("#jarvis-camera-video");
    jarvisCameraStatus = jarvisCameraModal.querySelector("#jarvis-camera-status");
    jarvisCameraCaptureButton = jarvisCameraModal.querySelector("#jarvis-camera-capture");
    jarvisCameraModal.querySelector("#jarvis-camera-start").addEventListener("click", startJarvisCamera);
    jarvisCameraCaptureButton.addEventListener("click", captureJarvisPhoto);
    jarvisCameraModal.querySelector("#jarvis-camera-close").addEventListener("click", closeJarvisCamera);
  }

  async function startJarvisCamera() {
    ensureCameraUI();
    jarvisCameraModal.style.display = "flex";
    jarvisCameraStatus.textContent = "Allow camera access if your browser asks.";
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported here. Open JARVIS over HTTPS in a supported browser.");
      }
      if (jarvisCameraStream) jarvisCameraStream.getTracks().forEach(track => track.stop());
      jarvisCameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: "environment" } }
      });
      jarvisCameraVideo.srcObject = jarvisCameraStream;
      await jarvisCameraVideo.play().catch(() => {});
      jarvisCameraVideo.style.display = "block";
      jarvisCameraModal.querySelector("#jarvis-camera-preview").style.display = "none";
      jarvisCameraStatus.textContent = "Camera ready. Say “Jarvis, click a photo” or tap CLICK PHOTO.";
    } catch (error) {
      jarvisCameraStatus.textContent = "Could not start camera: " +
        (error && error.message ? error.message : "permission denied") +
        ". Tap START CAMERA and allow permission.";
    }
  }

  function captureJarvisPhoto() {
    ensureCameraUI();
    if (!jarvisCameraStream || !jarvisCameraVideo || !jarvisCameraVideo.videoWidth) {
      jarvisCameraStatus.textContent = "Camera is not ready yet. Tap START CAMERA and allow permission first.";
      return false;
    }
    const canvas = document.createElement("canvas");
    canvas.width = jarvisCameraVideo.videoWidth;
    canvas.height = jarvisCameraVideo.videoHeight;
    canvas.getContext("2d").drawImage(jarvisCameraVideo, 0, 0, canvas.width, canvas.height);
    const preview = jarvisCameraModal.querySelector("#jarvis-camera-preview");
    const download = jarvisCameraModal.querySelector("#jarvis-camera-download");
    const dataUrl = canvas.toDataURL("image/png");
    preview.src = dataUrl;
    preview.style.display = "block";
    download.href = dataUrl;
    download.download = "jarvis-photo-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png";
    download.style.display = "inline-block";
    jarvisCameraStatus.textContent = "Photo captured! Tap SAVE PHOTO to save it to your device.";
    return true;
  }

  function closeJarvisCamera() {
    if (jarvisCameraStream) {
      jarvisCameraStream.getTracks().forEach(track => track.stop());
      jarvisCameraStream = null;
    }
    if (jarvisCameraVideo) jarvisCameraVideo.srcObject = null;
    if (jarvisCameraModal) jarvisCameraModal.style.display = "none";
  }

  function launcherReply(name) {
    return new Response(JSON.stringify({ ok: true, reply: `Opening ${name}.` }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  function installGemini25Settings() {
    const modal = document.getElementById("jarvis-settings-modal");
    if (!modal) return false;
    const input = modal.querySelector('input[type="password"]');
    const select = modal.querySelector("#jarvis-gemini-model");
    const status = modal.querySelector('[role="status"]');
    const buttons = Array.from(modal.querySelectorAll("button"));
    const oldSave = buttons.find(b => /TEST\s*&\s*SAVE/i.test(b.textContent || ""));
    if (!input || !status || !oldSave) return false;
    if (oldSave.dataset.gemini25Installed === "1") return true;
    oldSave.dataset.gemini25Installed = "1";

    if (select) {
      select.replaceChildren();
      const option = document.createElement("option");
      option.value = FORCED_GEMINI_MODEL;
      option.textContent = "Gemini 2.5 Flash (gemini-2.5-flash)";
      select.appendChild(option);
      select.value = FORCED_GEMINI_MODEL;
      select.disabled = true;
    }

    const save = oldSave.cloneNode(true);
    save.dataset.gemini25Installed = "1";
    oldSave.replaceWith(save);
    save.addEventListener("click", async () => {
      const key = input.value.trim();
      if (!key) {
        status.textContent = "Paste your Gemini API key first.";
        status.style.color = "#ffd0d0";
        return;
      }
      save.disabled = true;
      status.textContent = "Testing Gemini 2.5 Flash…";
      status.style.color = "#baf7ff";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await nativeFetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + FORCED_GEMINI_MODEL + ":generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Reply with exactly: JARVIS connection successful." }] }],
              generationConfig: { maxOutputTokens: 30 }
            }),
            signal: controller.signal
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const raw = data?.error?.message || ("Google returned HTTP " + response.status);
          if (/no longer available to new users|limited access|actively used/i.test(raw)) {
            throw new Error("Google is restricting Gemini 2.5 Flash for this API project. The model is still active, but this key/project is not currently eligible for 2.5 access.");
          }
          throw new Error(raw);
        }
        const answer = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
        if (!answer) throw new Error("Gemini returned no text.");
        sessionStorage.setItem("jarvisPersonalGeminiKey", key);
        sessionStorage.setItem("jarvisPersonalGeminiModel", FORCED_GEMINI_MODEL);
        sessionStorage.setItem("jarvisAvailableGeminiModels", JSON.stringify([FORCED_GEMINI_MODEL]));
        status.textContent = "Connected successfully to Gemini 2.5 Flash. JARVIS is ready.";
        status.style.color = "#9dffcb";
        const panel = document.getElementById("jarvis-web-bridge-panel");
        if (panel) panel.textContent = "Gemini 2.5 Flash connection successful. JARVIS is ready.";
      } catch (error) {
        const message = error?.name === "AbortError"
          ? "Gemini 2.5 Flash test timed out after 15 seconds. Check your internet connection and try again."
          : (error?.message || "unknown error");
        status.textContent = "Gemini 2.5 Flash test failed: " + message;
        status.style.color = "#ffd0d0";
      } finally {
        clearTimeout(timer);
        save.disabled = false;
      }
    });
    return true;
  }

  const settingsObserver = new MutationObserver(() => {
    if (installGemini25Settings()) settingsObserver.disconnect();
  });
  settingsObserver.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(installGemini25Settings, 0);
  setTimeout(installGemini25Settings, 300);
  setTimeout(installGemini25Settings, 1000);

  window.fetch = async function(input, init = {}) {
    let url = typeof input === "string" ? input : input?.url || "";
    if (/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent(?:\?.*)?$/i.test(url)) {
      url = url.replace(/(\/v1beta\/models\/)[^/]+(:generateContent(?:\?.*)?)$/i, "$1" + FORCED_GEMINI_MODEL + "$2");
      try { sessionStorage.setItem("jarvisPersonalGeminiModel", FORCED_GEMINI_MODEL); } catch (_) {}
      if (typeof input === "string") input = url;
      else input = new Request(url, input);
    }
    if (url.endsWith("/api/command") && String(init.method || "GET").toUpperCase() === "POST") {
      try {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
        const rawCommand = String(body?.command || "").trim();
        const command = clean(rawCommand);
        // Camera commands are handled locally in the browser; no photo is uploaded.
        const spokenCameraCommand = rawCommand.replace(/^\\s*(?:(?:hey|hello|hi)\\s+)?jarvis[, ]*/i, "").trim();
        if (/^(?:open|launch|start|show|turn on)(?: the)? camera[.!?]*$/i.test(spokenCameraCommand)) {
          ensureCameraUI();
          startJarvisCamera();
          return launcherReply("the camera. Allow camera permission, then tap CLICK PHOTO or say “Jarvis, click a photo”.");
        }
        if (/^(?:(?:please )?(?:click|take|capture|snap)(?: a| the)? photo|(?:please )?take (?:a )?picture|capture photo)[.!?]*$/i.test(spokenCameraCommand)) {
          if (captureJarvisPhoto()) return launcherReply("Photo captured. Tap SAVE PHOTO in the camera window to save it.");
          return launcherReply("The camera is not ready. Say “Jarvis, open camera”, allow permission, and try again.");
        }


        // YouTube voice action: extract the requested title/topic and open its
        // YouTube results directly. Universal links may hand off to the YouTube
        // app when the device/browser permits it; otherwise results open in web.
        // A YouTube Data API key is not configured, so this does not guess a video ID.
        const spokenCommand = rawCommand.replace(/^\\s*(?:(?:hey|hello|hi)\\s+)?jarvis[, ]*/i, "").trim();
        const youtubePatterns = [
          /^(?:please\\s+)?(?:open|play|watch|find|show|search(?:\\s+for)?)\\s+(.+?)\\s+(?:video\\s+)?(?:on|in)\\s+youtube[.!?]*$/i,
          /^(?:please\\s+)?(?:open|play|watch|find|show)\\s+(?:the\\s+)?(?:latest|newest|most recent)\\s+(?:video\\s+)?(?:from|by|of)\\s+(.+?)[.!?]*$/i,
          /^(?:please\\s+)?(?:open|play|watch)\\s+(.+?)[.!?]*$/i
        ];
        let youtubeQuery = "";
        const mentionsYouTube = /\\byoutube\\b/i.test(spokenCommand);
        for (const pattern of youtubePatterns) {
          const match = spokenCommand.match(pattern);
          if (match) {
            youtubeQuery = String(match[1] || "").trim();
            break;
          }
        }
        if (youtubeQuery && (mentionsYouTube || /^(?:open|play|watch|find|show|search)\\b/i.test(spokenCommand))) {
          youtubeQuery = youtubeQuery
            .replace(/^(?:the\\s+)?(?:video\\s+)?/i, "")
            .replace(/[.!?]+$/, "").trim();
          // Preserve phrases such as "latest video of MrBeast" as a search
          // unless a simpler title/topic is explicitly spoken.
          if (youtubeQuery && !/^(this|that|the video|a video|video)$/i.test(youtubeQuery)) {
            const youtubeUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(youtubeQuery);
            open(youtubeUrl, true);
            return launcherReply("Opening YouTube results for " + youtubeQuery + ". Select the matching video to play.");
          }
        }
        if (/^(?:open|launch|start|go to)\\s+youtube[.!?]*$/i.test(spokenCommand)) {
          open("https://www.youtube.com/", true);
          return launcherReply("Opening YouTube. Tell me the video title or topic to search for.");
        }

        for (const [name, target, aliases] of apps) {
          const openIntent = /^(open|launch|start|go to|show|take me to|navigate to)\b/.test(command);
          if (openIntent && aliases.some(alias => command === alias || command.includes(" " + alias) || command.includes(alias + " "))) {
            open(target, name === "spotify");
            return launcherReply(name);
          }
        }
        if (/^(open|launch|start|show|go to)\s+(browser|web browser|internet)$/.test(command)) {
          open("https://www.google.com/");
          return launcherReply("your browser");
        }
      } catch (_) {}
    }
    return nativeFetch(input, init);
  };

  // Optional hands-free wake word. This is isolated from the Settings UI and
  // uses the existing command form for normal commands.
  (() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (document.getElementById("jarvis-wake-word-toggle")) return;

    let wakeRecognition = null;
    let commandRecognition = null;
    let wakeEnabled = false;
    let commandInProgress = false;
    let stoppedByUser = false;
    let restartTimer = 0;
    let commandStartTimer = 0;

    const wakeStyle = document.createElement("style");
    wakeStyle.textContent = `
      #jarvis-wake-word-toggle {
        position: fixed; right: 12px; bottom: 84px; z-index: 2147483642;
        border: 1px solid #00d9ff; border-radius: 8px; padding: 8px 10px;
        background: rgba(2,18,37,.96); color: #baf7ff;
        font: 700 10px/1.3 system-ui,sans-serif; letter-spacing: .4px;
        box-shadow: 0 0 12px rgba(0,217,255,.18); touch-action: manipulation;
      }
      body.jarvis-voice-stopped #jarvis-web-bridge-panel { display: none !important; }
      @media (max-width: 767px) {
        #jarvis-wake-word-toggle { right: 8px; bottom: 82px; font-size: 9px; }
      }
    `;
    (document.head || document.documentElement).appendChild(wakeStyle);

    const toggle = document.createElement("button");
    toggle.id = "jarvis-wake-word-toggle";
    toggle.type = "button";
    toggle.textContent = "ENABLE WAKE WORD";
    toggle.setAttribute("aria-label", "Enable JARVIS wake word listening");
    document.body.appendChild(toggle);

    function setStatus(text) {
      toggle.textContent = text;
      toggle.setAttribute("aria-label", text);
    }

    function resetHud() {
      document.body.classList.remove("listening", "thinking");
      const ids = [
        ["coreState", "STANDBY"],
        ["voiceStatus", "READY"],
        ["systemStatus", "SYSTEM ONLINE"]
      ];
      for (const [id, value] of ids) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      }
    }

    function cancelCurrentActivity() {
      stoppedByUser = true;
      commandInProgress = false;
      clearTimeout(restartTimer);
      try { commandRecognition?.abort(); } catch (_) {}
      try { wakeRecognition?.abort(); } catch (_) {}
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      try { window.__jarvisVoiceStop = true; } catch (_) {}
      document.body.classList.add("jarvis-voice-stopped");
      const input = document.getElementById("commandInput");
      if (input) input.value = "";
      resetHud();
      setStatus(wakeEnabled ? "WAKE WORD: ON" : "WAKE WORD: OFF");
      if (wakeEnabled) scheduleWakeRestart(900);
    }

    function scheduleWakeRestart(delay = 700) {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (wakeEnabled && !commandInProgress) startWakeRecognition();
      }, delay);
    }

    function startCommandCapture() {
      if (!Recognition || !wakeEnabled || commandInProgress) return;
      commandInProgress = true;
      stoppedByUser = false;
      clearTimeout(restartTimer);
      clearTimeout(commandStartTimer);
      document.body.classList.remove("jarvis-voice-stopped");
      try { window.__jarvisVoiceStop = false; } catch (_) {}

      // Switch the visible button first. The user can see LISTENING FOR COMMAND
      // before command recognition starts, then speak the requested task.
      document.body.classList.add("listening");
      const core = document.getElementById("coreState");
      const status = document.getElementById("voiceStatus");
      const system = document.getElementById("systemStatus");
      if (core) core.textContent = "LISTENING";
      if (status) status.textContent = "LISTENING";
      if (system) system.textContent = "VOICE ACTIVE";
      setStatus("LISTENING FOR COMMAND");

      // End wake-word recognition before opening command recognition. A short
      // handoff gives the UI time to update and avoids overlapping mic sessions.
      const previousWakeRecognition = wakeRecognition;
      if (previousWakeRecognition) {
        previousWakeRecognition.onresult = null;
        previousWakeRecognition.onerror = null;
        previousWakeRecognition.onend = null;
        try { previousWakeRecognition.abort(); } catch (_) {}
      }
      wakeRecognition = null;

      commandStartTimer = setTimeout(() => {
        commandStartTimer = 0;
        if (!wakeEnabled || !commandInProgress) return;

        commandRecognition = new Recognition();
        commandRecognition.lang = "en-IN";
        commandRecognition.continuous = false;
        commandRecognition.interimResults = false;
        commandRecognition.maxAlternatives = 1;

        commandRecognition.onstart = () => {
          if (!commandInProgress) return;
          document.body.classList.add("listening");
          const coreNow = document.getElementById("coreState");
          const statusNow = document.getElementById("voiceStatus");
          const systemNow = document.getElementById("systemStatus");
          if (coreNow) coreNow.textContent = "LISTENING";
          if (statusNow) statusNow.textContent = "LISTENING";
          if (systemNow) systemNow.textContent = "VOICE ACTIVE";
          setStatus("LISTENING FOR COMMAND");
        };

        commandRecognition.onresult = event => {
          const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
          const normalized = transcript.toLowerCase().replace(/[.!?,]/g, "").trim();
          if (/^(stop|stop jarvis|cancel|cancel task|stop everything)$/.test(normalized)) {
            cancelCurrentActivity();
            return;
          }
          if (!transcript) {
            commandInProgress = false;
            resetHud();
            setStatus("WAKE WORD: ON");
            scheduleWakeRestart();
            return;
          }

          const input = document.getElementById("commandInput");
          const form = document.getElementById("commandForm");
          if (!input || !form) {
            commandInProgress = false;
            setStatus("COMMAND BOX NOT FOUND");
            scheduleWakeRestart();
            return;
          }
          input.value = transcript;
          // Submit through the original JARVIS command handler, preserving existing behavior.
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          commandInProgress = false;
          setStatus("COMMAND SENT");
          scheduleWakeRestart(1200);
        };

        commandRecognition.onerror = event => {
          commandInProgress = false;
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setStatus("MIC PERMISSION NEEDED");
            wakeEnabled = false;
            return;
          }
          resetHud();
          if (wakeEnabled) {
            setStatus("WAKE WORD: ON");
            scheduleWakeRestart(900);
          }
        };
        commandRecognition.onend = () => {
          if (commandInProgress) {
            commandInProgress = false;
            resetHud();
            if (wakeEnabled) setStatus("WAKE WORD: ON");
            scheduleWakeRestart(700);
          }
        };

        try {
          commandRecognition.start();
        } catch (error) {
          commandInProgress = false;
          console.warn("[JARVIS command capture] start failed:", error);
          setStatus(error?.name === "NotAllowedError"
            ? "MIC PERMISSION NEEDED"
            : "TAP TO RETRY WAKE WORD");
          if (wakeEnabled && error?.name !== "NotAllowedError") scheduleWakeRestart(900);
        }
      }, 300);
    }

    function startWakeRecognition() {
      if (!wakeEnabled || commandInProgress) return;
      if (!Recognition) {
        setStatus("VOICE NOT SUPPORTED");
        return;
      }

      // Stop the previous session without letting its onend handler launch
      // another restart. This avoids a rapid abort/restart loop on mobile Safari.
      const previousRecognition = wakeRecognition;
      if (previousRecognition) {
        previousRecognition.onresult = null;
        previousRecognition.onerror = null;
        previousRecognition.onend = null;
        try { previousRecognition.abort(); } catch (_) {}
      }

      const recognition = new Recognition();
      wakeRecognition = recognition;
      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let wakeStartWatchdog = 0;
      recognition.onstart = () => {
        clearTimeout(wakeStartWatchdog);
        if (wakeRecognition === recognition && wakeEnabled && !commandInProgress) {
          setStatus("LISTENING FOR JARVIS");
        }
      };

      // Do not claim the microphone is listening just because start() did not throw.
      // Show recognized words so we can tell whether this browser is returning audio.
      recognition.onresult = event => {
        if (wakeRecognition !== recognition || !wakeEnabled || commandInProgress) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const phrase = String(result[0]?.transcript || "")
            .toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
          if (phrase) setStatus("HEARD: " + phrase.slice(-42).toUpperCase());
          // Accept the original greetings plus the common short wake phrase.
          if (/\b(?:(?:hey|hello|hi)\s+)?jarvis\b/.test(phrase)) {
            clearTimeout(wakeStartWatchdog);
            startCommandCapture();
            return;
          }
        }
      };

      recognition.onerror = event => {
        if (wakeRecognition !== recognition) return;
        const code = String(event?.error || "unknown");
        console.warn("[JARVIS wake word] recognition error:", code);
        if (code === "not-allowed" || code === "service-not-allowed") {
          wakeEnabled = false;
          setStatus("MIC PERMISSION NEEDED");
        } else if (code === "audio-capture") {
          setStatus("MICROPHONE UNAVAILABLE");
        } else if (code === "network") {
          setStatus("SPEECH NETWORK ERROR");
          if (wakeEnabled && !commandInProgress) scheduleWakeRestart(1500);
        } else if (code === "no-speech") {
          setStatus("NO SPEECH DETECTED — RETRYING");
          if (wakeEnabled && !commandInProgress) scheduleWakeRestart(900);
        } else if (wakeEnabled && !commandInProgress && code !== "aborted") {
          setStatus("VOICE ERROR: " + code.toUpperCase());
          scheduleWakeRestart(1200);
        }
      };

      recognition.onend = () => {
        if (wakeRecognition !== recognition) return;
        wakeRecognition = null;
        if (wakeEnabled && !commandInProgress) scheduleWakeRestart(500);
      };

      try {
        setStatus("STARTING SPEECH RECOGNITION");
        recognition.start();
        // Safari can silently fail to begin; show a diagnostic instead of false "ON".
        wakeStartWatchdog = setTimeout(() => {
          if (wakeRecognition === recognition && wakeEnabled && !commandInProgress) {
            setStatus("NO LISTEN EVENT — TRY SAFARI");
          }
        }, 5000);
      } catch (error) {
        console.warn("[JARVIS wake word] start failed:", error);
        setStatus(error?.name === "NotAllowedError"
          ? "MIC PERMISSION NEEDED"
          : "TAP TO RETRY WAKE WORD");
        if (wakeEnabled) scheduleWakeRestart(1200);
      }
    }

    toggle.addEventListener("click", () => {
      if (wakeEnabled) {
        wakeEnabled = false;
        commandInProgress = false;
        clearTimeout(restartTimer);
        clearTimeout(commandStartTimer);
        try {
          if (wakeRecognition) {
            wakeRecognition.onresult = null;
            wakeRecognition.onerror = null;
            wakeRecognition.onend = null;
            wakeRecognition.abort();
          }
        } catch (_) {}
        try {
          if (commandRecognition) {
            commandRecognition.onresult = null;
            commandRecognition.onerror = null;
            commandRecognition.onend = null;
            commandRecognition.abort();
          }
        } catch (_) {}
        wakeRecognition = null;
        commandRecognition = null;
        resetHud();
        setStatus("ENABLE WAKE WORD");
        return;
      }
      if (!Recognition) {
        setStatus("VOICE NOT SUPPORTED — USE SAFARI");
        console.warn("[JARVIS wake word] SpeechRecognition is unavailable in this browser.");
        return;
      }

      wakeEnabled = true;
      commandInProgress = false;
      stoppedByUser = false;
      clearTimeout(restartTimer);
      clearTimeout(commandStartTimer);
      document.body.classList.remove("jarvis-voice-stopped");
      try { window.__jarvisVoiceStop = false; } catch (_) {}

      // Start speech recognition immediately inside the user's tap handler.
      // Awaiting getUserMedia first can lose iOS Safari's transient user activation,
      // leaving SpeechRecognition unable to start even after mic permission succeeds.
      // SpeechRecognition itself requests/uses microphone permission and reports errors.
      setStatus("STARTING MICROPHONE");
      startWakeRecognition();
    });

    // Keep a spoken "stop" effective even if an AI reply was still pending.
    const originalSpeak = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
    if (originalSpeak && !window.speechSynthesis.__jarvisStopGuard) {
      window.speechSynthesis.speak = function(utterance) {
        if (window.__jarvisVoiceStop) return;
        return originalSpeak(utterance);
      };
      window.speechSynthesis.__jarvisStopGuard = true;
    }
  })();


  // Capture camera commands before the original HUD submits them to the AI backend.
  // This ensures "Hey Jarvis, click a photo" reaches the local camera handler.
  document.addEventListener("submit", function(event) {
    const form = event.target;
    if (!form || form.id !== "commandForm") return;
    const input = document.getElementById("commandInput");
    const raw = String(input && input.value || "").trim();
    const command = raw.replace(/^\\s*(?:(?:hey|hello|hi)\\s+)?jarvis[, ]*/i, "").replace(/[.!?]+$/, "").trim();
    if (/^(?:open|launch|start|show|turn on)(?: the)? camera$/i.test(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ensureCameraUI();
      startJarvisCamera();
      return;
    }
    if (/^(?:(?:please )?(?:click|take|capture|snap)(?: a| the)? photo|(?:please )?take (?:a )?picture|capture photo|click photo)$/i.test(command)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!jarvisCameraStream) {
        ensureCameraUI();
        startJarvisCamera();
        if (jarvisCameraStatus) jarvisCameraStatus.textContent = "Camera opened. Allow permission, then say “Hey Jarvis, click a photo” again.";
        return;
      }
      captureJarvisPhoto();
    }
  }, true);


})();
