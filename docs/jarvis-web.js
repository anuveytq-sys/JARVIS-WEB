/* JARVIS GitHub Pages web capabilities.
   Loaded by the Pages build after the original HUD script.
   No Gemini key is stored here. */
(() => {
  const API_BASE = (new URLSearchParams(location.search).get("api") || localStorage.getItem("jarvisApiBase") || "").replace(/\/+$/, "");
  const originalFetch = window.fetch.bind(window);

  const say = (text) => ({ ok: true, reply: text });
  const isAny = (text, words) => words.some(w => text.includes(w));

  function openUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function browserStorage() {
    if (!navigator.storage?.estimate) return say("Browser storage information is not available in this browser.");
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const used = (usage / 1024 / 1024).toFixed(1);
    const total = (quota / 1024 / 1024).toFixed(1);
    return say(`This browser is using about ${used} MB of available browser storage, with an estimated quota of ${total} MB.`);
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
          const unit = data?.current_units?.temperature_2m || "°C";
          resolve(say(temp == null ? "I could not get the current temperature." : `The current temperature near you is ${temp}${unit}.`));
        } catch (_) {
          resolve(say("I could not reach the weather service right now."));
        }
      }, () => resolve(say("Location permission is needed to get your local temperature.")), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
  }

  async function camera() {
    if (!navigator.mediaDevices?.getUserMedia) return say("Camera access is not supported by this browser.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.autoplay = true; video.playsInline = true; video.srcObject = stream;
      Object.assign(video.style, { position: "fixed", inset: "12% 12% 22% 12%", width: "76%", height: "66%", objectFit: "cover", zIndex: 9999, border: "1px solid #00eaff", boxShadow: "0 0 35px #008cff", background: "#000" });
      const close = document.createElement("button");
      close.textContent = "CLOSE CAMERA";
      Object.assign(close.style, { position: "fixed", left: "50%", bottom: "7%", transform: "translateX(-50%)", zIndex: 10000, padding: "12px 18px", background: "#03182b", color: "#9cefff", border: "1px solid #00eaff", letterSpacing: "2px" });
      const stop = () => { stream.getTracks().forEach(t => t.stop()); video.remove(); close.remove(); };
      close.onclick = stop;
      document.body.append(video, close);
      return say("Camera opened in the browser. Camera permission was requested.");
    } catch (_) { return say("Camera permission was not granted or the camera is unavailable."); }
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
    if (isAny(text, ["temperature", "how hot", "how cold", "weather" ])) return temperature();

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

  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.endsWith("/api/command") && init?.method === "POST") {
      let body = {};
      try { body = JSON.parse(init.body || "{}"); } catch (_) {}
      const command = String(body.command || "").trim();
      const local = await handleLocal(command);
      if (local) return new Response(JSON.stringify(local), { status: 200, headers: { "Content-Type": "application/json" } });

      if (!API_BASE) {
        return new Response(JSON.stringify({ ok: false, reply: "The JARVIS AI backend is not connected yet. Add the secure backend URL with ?api=... after deploying it." }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
      const target = `${API_BASE}/api/command`;
      return originalFetch(target, init);
    }
    return originalFetch(input, init);
  };
})();
