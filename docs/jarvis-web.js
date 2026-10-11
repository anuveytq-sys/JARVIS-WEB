/* JARVIS GitHub Pages browser bridge.
   Displays replies on-screen as well as using the original HUD speech.
   No API keys or secrets are stored in this file. */
(() => {
  const API_BASE = (new URLSearchParams(location.search).get("api") || localStorage.getItem("jarvisApiBase") || "").replace(/\/+$/, "");
  const originalFetch = window.fetch.bind(window);

  // Visible diagnostics and replies: useful on mobile where speech may be silent.
  let panel;
  function showReply(message, state = "reply") {
    try {
      if (!panel) {
        panel = document.createElement("div");
        panel.id = "jarvis-web-bridge-panel";
        Object.assign(panel.style, {
          position: "fixed", left: "50%", bottom: "18px", transform: "translateX(-50%)",
          width: "min(88vw, 620px)", boxSizing: "border-box", padding: "12px 16px",
          zIndex: "2147483647", background: "rgba(2, 12, 28, 0.96)",
          color: "#baf7ff", border: "1px solid #00d9ff", borderRadius: "10px",
          boxShadow: "0 0 18px rgba(0,217,255,.28)", font: "14px/1.45 system-ui, sans-serif",
          whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "block"
        });
        document.body.appendChild(panel);
      }
      panel.textContent = message;
      panel.style.borderColor = state === "error" ? "#ff6b6b" : "#00d9ff";
      panel.style.color = state === "error" ? "#ffd0d0" : "#baf7ff";
    } catch (_) {}
  }

  const say = (text) => ({ ok: true, reply: text });
  const isAny = (text, words) => words.some(w => text.includes(w));

  function openUrl(url) { window.open(url, "_blank", "noopener,noreferrer"); }

  async function browserStorage() {
    if (!navigator.storage?.estimate) return say("Browser storage information is not available in this browser.");
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return say(`This browser is using about ${(usage / 1048576).toFixed(1)} MB, with an estimated browser-storage quota of ${(quota / 1048576).toFixed(1)} MB.`);
  }

  async function temperature() {
    if (!navigator.geolocation) return say("Location access is not available, so I cannot get your local temperature.");
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m&timezone=auto`;
          const r = await originalFetch(url);
          const data = await r.json();
          const temp = data?.current?.temperature_2m;
          resolve(say(temp == null ? "I could not get the current temperature." : `The current temperature near you is ${temp}${data?.current_units?.temperature_2m || "°C"}.`));
        } catch (_) { resolve(say("I could not reach the weather service right now.")); }
      }, () => resolve(say("Location permission is needed to get your local temperature.")), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
  }

  async function camera() {
    if (!navigator.mediaDevices?.getUserMedia) return say("Camera access is not supported in this browser. Try opening JARVIS in Safari over HTTPS.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      const overlay = document.createElement("div");
      overlay.id = "jarvis-camera-overlay";
      Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "2147483646",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "14px", padding: "18px", boxSizing: "border-box",
        background: "rgba(0,0,0,.94)"
      });
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      Object.assign(video.style, {
        display: "block", width: "min(94vw, 900px)", maxHeight: "72vh",
        objectFit: "contain", background: "#000", border: "2px solid #00eaff",
        borderRadius: "12px"
      });
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "✕  CLOSE CAMERA";
      close.setAttribute("aria-label", "Close camera and stop camera stream");
      Object.assign(close.style, {
        position: "relative", zIndex: "2147483647", display: "block",
        padding: "15px 24px", minHeight: "52px", borderRadius: "10px",
        background: "#b91c1c", color: "#fff", border: "2px solid #fff",
        font: "bold 16px system-ui, sans-serif", cursor: "pointer",
        boxShadow: "0 0 18px rgba(255,0,0,.45)"
      });
      const hint = document.createElement("div");
      hint.textContent = "Your camera is active. Press CLOSE CAMERA to turn it off.";
      Object.assign(hint.style, { color: "#fff", font: "14px system-ui, sans-serif", textAlign: "center" });
      const stop = () => {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
      };
      const onKeyDown = event => { if (event.key === "Escape") stop(); };
      close.addEventListener("click", stop);
      overlay.addEventListener("click", event => { if (event.target === overlay) stop(); });
      document.addEventListener("keydown", onKeyDown);
      overlay.append(video, close, hint);
      document.body.appendChild(overlay);
      return say("Camera opened. Use the red CLOSE CAMERA button to turn it off.");
    } catch (_) {
      return say("Camera permission was not granted or the camera is unavailable.");
    }
  }

  async function handleLocal(command) {
    const text = command.toLowerCase().trim();
    if (isAny(text, ["what time", "current time", "tell me the time", "time now", "time"])) {
      return say(`The current time is ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}.`);
    }
    if (isAny(text, ["what date", "today's date", "todays date", "current date", "date today"])) {
      return say(`Today is ${new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);
    }
    if (isAny(text, ["storage", "disk space", "how much storage", "browser storage"])) return browserStorage();
    if (isAny(text, ["temperature", "how hot", "how cold", "weather"])) return temperature();
    if (isAny(text, ["open youtube", "youtube"])) { openUrl("https://www.youtube.com/"); return say("Opening YouTube."); }
    if (isAny(text, ["open google maps", "google maps", "open maps"])) { openUrl("https://maps.google.com/"); return say("Opening Google Maps."); }
    if (text === "open google" || text === "google" || text.includes("search google")) { openUrl("https://www.google.com/"); return say("Opening Google."); }
    if (isAny(text, ["open gmail", "gmail"])) { openUrl("https://mail.google.com/"); return say("Opening Gmail."); }
    if (isAny(text, ["open google drive", "google drive", "drive"])) { openUrl("https://drive.google.com/"); return say("Opening Google Drive."); }
    if (isAny(text, ["open google photos", "google photos", "photos"])) { openUrl("https://photos.google.com/"); return say("Opening Google Photos."); }
    if (isAny(text, ["open settings", "settings"])) { openUrl("https://support.google.com/accounts/"); return say("I cannot open the phone's system Settings from a normal web page, so I opened Google account settings instead."); }
    if (isAny(text, ["open file manager", "file manager", "files", "open files"])) {
      const input = document.createElement("input"); input.type = "file"; input.multiple = true; input.click();
      return say("Opening the browser file picker. A website cannot access your device's full file manager without permission.");
    }
    if (isAny(text, ["open camera", "camera", "take a photo"])) return camera();
    return null;
  }

  showReply("JARVIS web bridge loaded. Type “What time is it?” into the command box to test.", "reply");

  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = (init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.endsWith("/api/command") && method === "POST") {
      let body = {};
      try {
        if (init?.body) body = JSON.parse(init.body);
        else if (typeof Request !== "undefined" && input instanceof Request) body = await input.clone().json();
      } catch (_) {}
      const command = String(body.command || "").trim();
      showReply("JARVIS is processing: " + (command || "(empty command)"));
      try {
        const local = await handleLocal(command);
        if (local) {
          showReply(local.reply);
          return new Response(JSON.stringify(local), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (!API_BASE) {
          const result = { ok: false, reply: "The JARVIS AI backend is not connected. Open the site using the backend URL." };
          showReply(result.reply, "error");
          return new Response(JSON.stringify(result), { status: 503, headers: { "Content-Type": "application/json" } });
        }
        const response = await originalFetch(API_BASE + "/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command })
        });
        let data;
        try { data = await response.clone().json(); }
        catch (_) { data = { reply: "The AI server returned an unreadable response (HTTP " + response.status + ")." }; }
        showReply(data.reply || ("AI server responded with HTTP " + response.status), response.ok ? "reply" : "error");
        return response;
      } catch (error) {
        const result = { ok: false, reply: "JARVIS connection failed: " + (error?.message || "unknown network error") };
        showReply(result.reply, "error");
        return new Response(JSON.stringify(result), { status: 502, headers: { "Content-Type": "application/json" } });
      }
    }
    return originalFetch(input, init);
  };
})();
