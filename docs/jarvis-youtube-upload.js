/* JARVIS // YOUTUBE UPLOAD OPERATOR
 * Independent local-file uploader. OAuth access tokens remain memory-only.
 * No AI API key, no server-side secrets, no automatic publishing.
 */
(function () {
  "use strict";
  if (window.JARVISYouTubeUpload && window.JARVISYouTubeUpload.version === "1.0.0") return;

  var CLIENT_KEY = "jarvisYouTubeOAuthClientIdV1";
  var SCOPE = "https://www.googleapis.com/auth/youtube.upload";
  var tokenClient = null, accessToken = "", selectedFile = null, busy = false;
  var section = null, statusEl = null, fileInput = null, titleInput = null;
  var descriptionInput = null, tagsInput = null, privacyInput = null, clientInput = null;
  var connectButton = null, uploadButton = null, disconnectButton = null, progressEl = null;
  var pendingPublicConfirmation = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cleanCommand(s) {
    return String(s || "").trim()
      .replace(/^(?:(?:hey|hello|hi|okay|ok)\s+)?jarvis[\s,:;-]*/i, "")
      .replace(/^(?:please\s+|can you\s+|could you\s+|would you\s+)/i, "")
      .replace(/[.!?]+$/, "").trim();
  }
  function reply(text) {
    try {
      if (typeof window.showReply === "function") window.showReply(text, "reply");
      else if (typeof window.speak === "function") window.speak(text);
    } catch (_) {}
  }
  function setStatus(text, error) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.style.color = error ? "#ffd0d0" : "#baf7ff";
    }
  }
  function style(el, rules) { Object.assign(el.style, rules); return el; }
  function make(tag, text, rules) {
    var el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (rules) style(el, rules);
    return el;
  }
  function btn(text, border) {
    var b = make("button", text, {
      minHeight: "42px", padding: "9px 12px", borderRadius: "8px",
      border: "1px solid " + (border || "#00d9ff"), background: "rgba(0,0,0,.35)",
      color: "#fff", font: "bold 12px system-ui,sans-serif", cursor: "pointer",
      flex: "1 1 130px", touchAction: "manipulation"
    });
    b.type = "button";
    return b;
  }
  function field(labelText, element) {
    var wrap = make("label", null, { display: "block", margin: "9px 0", color: "#62f5ff", fontSize: "12px" });
    wrap.appendChild(document.createTextNode(labelText));
    style(element, {
      display: "block", width: "100%", boxSizing: "border-box", marginTop: "5px",
      padding: "10px", borderRadius: "7px", border: "1px solid #287b91",
      background: "#00101f", color: "#fff", font: "14px system-ui,sans-serif"
    });
    wrap.appendChild(element);
    return wrap;
  }
  function loadGIS() {
    return new Promise(function (resolve, reject) {
      if (window.google && google.accounts && google.accounts.oauth2) { resolve(); return; }
      var existing = document.querySelector('script[data-jarvis-google-identity="1"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", function () { reject(new Error("Google Identity Services could not load.")); }, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true; script.defer = true; script.dataset.jarvisGoogleIdentity = "1";
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Google Identity Services could not load. Check your connection or content blockers.")); };
      document.head.appendChild(script);
    });
  }
  function getClientId() {
    try { return localStorage.getItem(CLIENT_KEY) || ""; } catch (_) { return ""; }
  }
  function getSettingsModal() { return document.getElementById("jarvis-settings-modal"); }
  function openSettingsSection() {
    var modal = getSettingsModal();
    if (modal) modal.style.display = "flex";
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function setBusy(value) {
    busy = value;
    if (uploadButton) uploadButton.disabled = value || !selectedFile || !accessToken;
    if (connectButton) connectButton.disabled = value;
    if (fileInput) fileInput.disabled = value;
  }
  function createSection() {
    if (section && section.isConnected) return;
    var card = document.querySelector("#jarvis-settings-modal section");
    if (!card) return;
    section = make("section", null, {
      margin: "14px 0 0", padding: "14px", border: "1px solid #00d9ff",
      borderRadius: "10px", background: "rgba(0,10,24,.78)", color: "#d8fbff",
      scrollMarginTop: "14px"
    });
    section.id = "jarvis-youtube-upload-settings";
    var heading = make("h3", "YOUTUBE UPLOAD OPERATOR", {
      margin: "0 0 6px", color: "#62f5ff", fontSize: "14px", letterSpacing: "1px"
    });
    var intro = make("p",
      "Upload a video file selected from this device to the YouTube channel you authorize. JARVIS never asks for your Google password. The Google OAuth client ID is not a secret; access tokens are kept in memory and are not saved to storage.",
      { margin: "0 0 8px", color: "#b6dce7", fontSize: "12px" });
    clientInput = make("input");
    clientInput.type = "text";
    clientInput.autocomplete = "off";
    clientInput.spellcheck = false;
    clientInput.placeholder = "Google OAuth Web Client ID (ends with .apps.googleusercontent.com)";
    clientInput.value = getClientId();
    var clientField = field("GOOGLE API / OAUTH SETTINGS", clientInput);
    var help = make("p", "Setup required once: enable YouTube Data API v3 in Google Cloud, create a Web application OAuth client, and add this exact origin to Authorized JavaScript origins: " + location.origin + ". Do not paste a client secret here.", {
      margin: "4px 0 10px", color: "#ffdca8", fontSize: "11px", overflowWrap: "anywhere"
    });
    var controls = make("div", null, { display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0" });
    connectButton = btn("CONNECT YOUTUBE");
    disconnectButton = btn("DISCONNECT", "#527b8a");
    controls.append(connectButton, disconnectButton);

    fileInput = make("input");
    fileInput.type = "file";
    fileInput.accept = "video/*,.mp4,.mov,.webm,.mkv,.avi";
    fileInput.setAttribute("aria-label", "Choose a local video file");
    var fileField = field("VIDEO FILE — OPTION A (CHOOSE FROM THIS DEVICE)", fileInput);

    titleInput = make("input"); titleInput.type = "text"; titleInput.maxLength = 100;
    titleInput.placeholder = "e.g. Herobrine";
    var titleField = field("VIDEO TITLE", titleInput);

    descriptionInput = make("textarea"); descriptionInput.rows = 3;
    descriptionInput.maxLength = 5000; descriptionInput.placeholder = "Optional description";
    var descField = field("DESCRIPTION (OPTIONAL)", descriptionInput);

    tagsInput = make("input"); tagsInput.type = "text"; tagsInput.placeholder = "gaming, Minecraft, Herobrine";
    var tagsField = field("TAGS (comma separated, optional)", tagsInput);

    var categoryInput = make("select");
    [["20","Gaming"],["22","People & Blogs"],["24","Entertainment"],["27","Education"],["28","Science & Technology"],["10","Music"],["23","Comedy"],["26","Howto & Style"]].forEach(function (x) {
      var o = make("option", x[1]); o.value = x[0]; categoryInput.appendChild(o);
    });
    var categoryField = field("CATEGORY", categoryInput);

    privacyInput = make("select");
    [["private","Private — only you"],["unlisted","Unlisted — anyone with link"],["public","Public — visible to everyone"]].forEach(function (x) {
      var o = make("option", x[1]); o.value = x[0]; privacyInput.appendChild(o);
    });
    privacyInput.value = "private";
    var privacyField = field("VISIBILITY", privacyInput);

    var uploadRow = make("div", null, { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" });
    uploadButton = btn("REVIEW & UPLOAD VIDEO");
    uploadButton.disabled = true;
    uploadRow.appendChild(uploadButton);

    progressEl = make("progress", null, { width: "100%", height: "9px", margin: "8px 0", display: "block" });
    progressEl.max = 100; progressEl.value = 0;
    statusEl = make("p", "Not connected. Configure the OAuth client ID, connect your YouTube account, then choose a video.", {
      margin: "8px 0 0", color: "#baf7ff", fontSize: "12px", overflowWrap: "anywhere"
    });
    var note = make("p",
      "Public upload is never automatic: review the title, file, and visibility, then confirm. Google may restrict public uploads for unverified API projects until they pass YouTube's audit. API quotas and Google approval policies apply.",
      { margin: "10px 0 0", color: "#ffdca8", fontSize: "11px" });
    section.append(heading, intro, clientField, help, controls, fileField, titleField, descField, tagsField, categoryField, privacyField, uploadRow, progressEl, statusEl, note);
    var closeButtons = Array.from(card.querySelectorAll("button")).filter(function (b) { return b.textContent.trim().toUpperCase() === "CLOSE"; });
    card.insertBefore(section, closeButtons.length ? closeButtons[0].parentElement : null);

    clientInput.addEventListener("change", function () {
      try { localStorage.setItem(CLIENT_KEY, clientInput.value.trim()); } catch (_) {}
      setStatus("OAuth client ID saved in this browser. No secret is required in this field.");
    });
    clientInput.addEventListener("blur", function () {
      try { localStorage.setItem(CLIENT_KEY, clientInput.value.trim()); } catch (_) {}
    });
    connectButton.addEventListener("click", connect);
    disconnectButton.addEventListener("click", function () {
      accessToken = ""; tokenClient = null;
      setStatus("Disconnected. The in-memory access token was cleared.");
      if (uploadButton) uploadButton.disabled = true;
    });
    fileInput.addEventListener("change", function () {
      selectedFile = fileInput.files && fileInput.files[0] || null;
      progressEl.value = 0;
      if (selectedFile) {
        if (!titleInput.value.trim()) titleInput.value = selectedFile.name.replace(/\.[^.]+$/, "").slice(0, 100);
        setStatus("Selected " + selectedFile.name + " (" + (selectedFile.size / 1048576).toFixed(1) + " MB). Review metadata before upload.");
      } else setStatus("No video selected.");
      uploadButton.disabled = !selectedFile || !accessToken || busy;
    });
    uploadButton.addEventListener("click", function () {
      if (!selectedFile || !accessToken) { setStatus("Connect YouTube and select a video file first.", true); return; }
      if (!titleInput.value.trim()) { setStatus("Enter a title before uploading.", true); titleInput.focus(); return; }
      var privacy = privacyInput.value;
      var message = "Upload " + selectedFile.name + " with title \"" + titleInput.value.trim() + "\" as " + privacy.toUpperCase() + "?";
      if (privacy === "public") message += "\n\nThis will publish the video for everyone to see.";
      if (!window.confirm(message)) { setStatus("Upload cancelled. Nothing was sent to YouTube."); return; }
      uploadSelectedVideo();
    });
  }

  async function connect() {
    var clientId = (clientInput && clientInput.value || "").trim();
    if (!clientId || !/\.apps\.googleusercontent\.com$/.test(clientId)) {
      setStatus("Enter a valid Google OAuth Web Client ID ending in .apps.googleusercontent.com.", true);
      if (clientInput) clientInput.focus();
      return;
    }
    try {
      localStorage.setItem(CLIENT_KEY, clientId);
      setStatus("Loading Google sign-in…");
      await loadGIS();
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: function (response) {
          if (response && response.access_token) {
            accessToken = response.access_token;
            setStatus("Connected to YouTube for this page session. Select a video and review its upload settings.");
            if (uploadButton) uploadButton.disabled = !selectedFile || busy;
          } else {
            setStatus((response && response.error_description) || "Google authorization was not completed.", true);
          }
        },
        error_callback: function (error) {
          setStatus("Google sign-in failed: " + ((error && error.message) || (error && error.type) || "unknown error") + ". Check OAuth origin and consent-screen settings.", true);
        }
      });
      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      setStatus("Could not connect: " + (error.message || "unknown error"), true);
    }
  }

  async function uploadSelectedVideo() {
    if (busy) return;
    busy = true; setBusy(true); progressEl.value = 0;
    try {
      var title = titleInput.value.trim();
      var tags = tagsInput.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 500);
      var metadata = {
        snippet: {
          title: title,
          description: descriptionInput.value.trim(),
          categoryId: categoryInputValue(),
          tags: tags
        },
        status: { privacyStatus: privacyInput.value, selfDeclaredMadeForKids: false }
      };
      setStatus("Starting resumable upload…");
      var start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(selectedFile.size),
          "X-Upload-Content-Type": selectedFile.type || "application/octet-stream"
        },
        body: JSON.stringify(metadata)
      });
      if (!start.ok) throw await apiError(start, "Could not start upload");
      var uploadUrl = start.headers.get("Location");
      if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL.");
      setStatus("Uploading video data… keep this page open until it finishes.");
      var result = await putFileWithProgress(uploadUrl, selectedFile);
      if (!result || !result.id) throw new Error("YouTube did not return a video ID. Check YouTube Studio before retrying to avoid duplicates.");
      progressEl.value = 100;
      var url = "https://www.youtube.com/watch?v=" + encodeURIComponent(result.id);
      setStatus("Upload complete. Video ID: " + result.id + ". Visibility requested: " + privacyInput.value.toUpperCase() + ". Open the video link to verify processing and publication.");
      var link = make("a", "OPEN UPLOADED VIDEO", { display: "inline-block", marginTop: "8px", color: "#62f5ff", fontWeight: "700" });
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      statusEl.appendChild(document.createElement("br")); statusEl.appendChild(link);
      reply("YouTube upload completed. The video link is " + url + ". Verify that processing and visibility are correct in YouTube Studio.");
    } catch (error) {
      setStatus((error && error.message) || "Upload failed. Check connection, OAuth permissions, quota, and YouTube Studio before retrying.", true);
      reply("YouTube upload failed. " + ((error && error.message) || "Check the YouTube Upload Operator in Settings."));
    } finally {
      busy = false; setBusy(false);
      if (uploadButton) uploadButton.disabled = !selectedFile || !accessToken;
    }
  }
  function categoryInputValue() {
    var select = section && section.querySelector("select");
    var selects = section ? section.querySelectorAll("select") : [];
    return selects.length > 1 ? selects[0].value : "20";
  }
  function putFileWithProgress(uploadUrl, file) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable && progressEl) {
          progressEl.value = Math.min(99, Math.round((event.loaded / event.total) * 100));
          setStatus("Uploading video data… " + progressEl.value + "% sent. Keep this page open.");
        }
      };
      xhr.onload = function () {
        var data = {};
        try { data = JSON.parse(xhr.responseText || "{}"); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else {
          var message = data && data.error && data.error.message;
          if (xhr.status === 401) accessToken = "";
          reject(new Error("Video upload failed (HTTP " + xhr.status + "): " +
            (xhr.status === 401 ? "Google authorization expired; reconnect YouTube." :
             xhr.status === 403 ? "Check API enablement, quota, channel permissions, OAuth consent, and API audit restrictions. " + (message || "") :
             (message || "unknown API error"))));
        }
      };
      xhr.onerror = function () { reject(new Error("Video upload network error. Check the connection and YouTube Studio before retrying.")); };
      xhr.onabort = function () { reject(new Error("Video upload was cancelled.")); };
      xhr.send(file);
    });
  }

  async function apiError(response, prefix) {
    var data = await response.json().catch(function () { return {}; });
    var message = data && data.error && data.error.message;
    var status = response.status;
    if (status === 401) { accessToken = ""; return new Error(prefix + ": Google authorization expired. Reconnect YouTube and retry."); }
    if (status === 403) return new Error(prefix + ": YouTube denied the request. Check API enablement, quota, channel permissions, OAuth consent, and whether public uploads require API audit. " + (message || ""));
    return new Error(prefix + " (HTTP " + status + "): " + (message || "unknown API error"));
  }

  function parseUploadCommand(raw) {
    var c = cleanCommand(raw), lower = c.toLowerCase();
    if (!/(youtube|upload.{0,45}video|video.{0,45}upload|publish.{0,35}video|post.{0,35}video|herobrine)/i.test(c)) return false;
    if (/(?:open|show|configure|settings).*(?:youtube|upload)/i.test(c) || /youtube.*(?:settings|upload operator)/i.test(c)) {
      openSettingsSection(); reply("Opening YouTube Upload Operator in Settings. Connect your channel and choose a video file from this device."); return true;
    }
    if (/(?:connect|authorize|sign in|login).*(?:youtube|channel)/i.test(c)) {
      openSettingsSection(); reply("Opening YouTube settings. Tap CONNECT YOUTUBE to authorize the channel using Google's sign-in window."); return true;
    }
    if (/(?:choose|select|pick|browse for).*(?:video|file)/i.test(c) || /select (?:a |the )?video/i.test(c)) {
      openSettingsSection(); if (fileInput) fileInput.click();
      reply("Choose the video file from this device in the file picker. I cannot access local files until you select one."); return true;
    }
    if (/(?:upload|publish|post).*(?:video|youtube)|(?:video|youtube).*(?:upload|publish|post)|\bherobrine\b/i.test(c)) {
      openSettingsSection();
      var titleMatch = c.match(/\btitle\s+(?:as\s+)?["“']?(.+?)["”']?(?=\s+(?:and\s+)?(?:make it|set it|publish it|public(?:ly)?|private|unlisted|description|tags|as public|as private|as unlisted)\b|$)/i);
      if (titleMatch && titleInput) titleInput.value = titleMatch[1].replace(/["“”']/g, "").trim().slice(0, 100);
      else if (/\bherobrine\b/i.test(c) && titleInput && !titleInput.value.trim()) titleInput.value = "Herobrine";
      if (/\bpublic(?:ly)?\b|\bpublish it\b|\bmake it public\b/i.test(c) && privacyInput) privacyInput.value = "public";
      else if (/\bunlisted\b/i.test(c) && privacyInput) privacyInput.value = "unlisted";
      else if (/\bprivate\b/i.test(c) && privacyInput) privacyInput.value = "private";
      var descMatch = c.match(/\bdescription\s+(.+?)(?=\s+\b(?:tags|title|public|private|unlisted)\b|$)/i);
      if (descMatch && descriptionInput) descriptionInput.value = descMatch[1].trim();
      var tagsMatch = c.match(/\btags?\s+(.+?)(?=\s+\b(?:title|description|public|private|unlisted)\b|$)/i);
      if (tagsMatch && tagsInput) tagsInput.value = tagsMatch[1].replace(/\band\b/gi, ",").trim();
      setStatus("Command understood. Review the selected file, title, description, tags, and visibility. Press REVIEW & UPLOAD VIDEO to confirm before any upload.");
      reply("I prepared the YouTube upload settings. Please select a video if you have not already, review the title and visibility in Settings, and press Review and Upload Video to confirm.");
      return true;
    }
    if (/(?:youtube upload status|check upload status|upload progress)/i.test(c)) {
      openSettingsSection();
      reply(busy ? "The YouTube upload is currently in progress. Check its progress bar in Settings." : "No upload is currently running. Check the YouTube Upload Operator status in Settings.");
      return true;
    }
    return false;
  }

  function installCommandBridge() {
    if (window.__jarvisYouTubeCommandBridge) return;
    window.__jarvisYouTubeCommandBridge = true;
    var baseFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = (init && init.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
      if (url.endsWith("/api/command") && method === "POST") {
        var body = {};
        try {
          if (init && init.body) body = JSON.parse(init.body);
          else if (typeof Request !== "undefined" && input instanceof Request) body = await input.clone().json();
        } catch (_) {}
        var command = String(body.command || "");
        if (parseUploadCommand(command)) {
          return new Response(JSON.stringify({ ok: true, reply: "YouTube Upload Operator command prepared. Review and confirm the upload in Settings." }), {
            status: 200, headers: { "Content-Type": "application/json" }
          });
        }
      }
      return baseFetch(input, init);
    };
  }

  function boot() {
    createSection();
    if (!section) {
      var observer = new MutationObserver(function () {
        createSection();
        if (section) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    installCommandBridge();
  }
  window.JARVISYouTubeUpload = {
    version: "1.0.0",
    openSettings: openSettingsSection,
    getStatus: function () { return { connected: !!accessToken, fileSelected: !!selectedFile, uploading: busy }; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();