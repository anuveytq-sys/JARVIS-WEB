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


  // Optional personal Gemini key: kept in this browser tab's session storage
  // and sent directly to Google, never to the JARVIS backend.
  const USER_KEY_SLOT = "jarvisPersonalGeminiKey";
  const USER_MODEL_SLOT = "jarvisPersonalGeminiModel";
  const AVAILABLE_MODELS_SLOT = "jarvisAvailableGeminiModels";
  const DEFAULT_MODEL = "gemini-3.8-flash";
  const getPersonalKey = () => {
    try { return sessionStorage.getItem(USER_KEY_SLOT) || ""; } catch (_) { return ""; }
  };
  const getPersonalModel = () => {
    try { return sessionStorage.getItem(USER_MODEL_SLOT) || DEFAULT_MODEL; } catch (_) { return DEFAULT_MODEL; }
  };

  function addSettingsUI() {
    if (document.getElementById("jarvis-settings-trigger")) return;
    const responsiveStyle = document.createElement("style");
    responsiveStyle.id = "jarvis-settings-responsive-style";
    responsiveStyle.textContent = `
      #jarvis-settings-trigger { touch-action: manipulation; }
      #jarvis-settings-modal { overflow-y: auto; }
      #jarvis-settings-modal section { max-height: calc(100dvh - 36px); overflow-y: auto; }
      #jarvis-settings-modal input, #jarvis-settings-modal button { font-size: 14px; }
      @media (min-width: 768px) {
        #jarvis-settings-trigger {
          top: 88px !important; right: 28px !important; padding: 11px 16px !important;
          font-size: 13px !important;
        }
        #jarvis-settings-modal { padding: 32px !important; }
        #jarvis-settings-modal section {
          width: min(560px, calc(100vw - 64px)) !important;
          padding: 28px !important; max-height: calc(100dvh - 64px) !important;
        }
        #jarvis-settings-modal input { font-size: 15px !important; }
        #jarvis-settings-modal button { min-height: 44px !important; }
      }
      @media (max-width: 767px) {
        #jarvis-settings-trigger { top: 86px !important; right: 12px !important; }
        #jarvis-settings-modal section { padding: 18px !important; }
      }
    `;
    document.head.appendChild(responsiveStyle);

    const button = document.createElement("button");
    button.id = "jarvis-settings-trigger";
    button.type = "button";
    button.textContent = "⚙ SETTINGS";
    button.setAttribute("aria-label", "JARVIS settings");
    Object.assign(button.style, {
      position: "fixed", top: "86px", right: "16px", zIndex: "2147483647",
      padding: "10px 13px", borderRadius: "9px", border: "1px solid #00d9ff",
      background: "rgba(2,18,37,.96)", color: "#baf7ff", font: "bold 12px system-ui,sans-serif",
      letterSpacing: "1px", boxShadow: "0 0 14px rgba(0,217,255,.22)", cursor: "pointer"
    });

    const modal = document.createElement("div");
    modal.id = "jarvis-settings-modal";
    Object.assign(modal.style, {
      position: "fixed", inset: "0", zIndex: "2147483647", display: "none",
      alignItems: "center", justifyContent: "center", padding: "18px",
      boxSizing: "border-box", background: "rgba(0,4,12,.88)", backdropFilter: "blur(8px)"
    });

    const card = document.createElement("section");
    Object.assign(card.style, {
      width: "min(100%, 480px)", boxSizing: "border-box", padding: "22px",
      border: "1px solid #00d9ff", borderRadius: "14px", color: "#d8fbff",
      background: "linear-gradient(145deg, rgba(2,31,59,.99), rgba(0,8,20,.99))",
      boxShadow: "0 0 30px rgba(0,217,255,.2)", font: "14px/1.5 system-ui,sans-serif"
    });
    const heading = document.createElement("h2");
    heading.textContent = "JARVIS SETTINGS";
    Object.assign(heading.style, { margin: "0 0 8px", color: "#62f5ff", fontSize: "19px", letterSpacing: "2px" });
    const intro = document.createElement("p");
    intro.textContent = "Add your own Gemini API key, discover the compatible Gemini text models available to that key, and choose one. Your key is kept only in this tab's session storage and is sent directly to Google, not to the JARVIS server.";
    Object.assign(intro.style, { margin: "0 0 12px", color: "#b6dce7" });
    const warning = document.createElement("p");
    warning.textContent = "Security: a browser key is not fully secret. Use only your own key, restrict it to the Gemini API where possible, never share this device/session, and check your usage limits. Free usage and limits depend on Google's current terms.";
    Object.assign(warning.style, { margin: "0 0 14px", color: "#ffdca8", fontSize: "12px" });
    const label = document.createElement("label");
    label.textContent = "Gemini API key";
    Object.assign(label.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "Paste your own Gemini API key";
    input.value = getPersonalKey();
    Object.assign(input.style, {
      width: "100%", boxSizing: "border-box", padding: "12px", marginBottom: "12px",
      borderRadius: "8px", border: "1px solid #287b91", background: "#00101f",
      color: "#fff", font: "14px system-ui,sans-serif"
    });
    const modelLabel = document.createElement("label");
    modelLabel.textContent = "Gemini model (compatible text models)";
    Object.assign(modelLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const modelSelect = document.createElement("select");
    modelSelect.id = "jarvis-gemini-model";
    modelSelect.setAttribute("aria-label", "Choose Gemini model");
    Object.assign(modelSelect.style, {
      display: "block", width: "100%", boxSizing: "border-box", padding: "12px",
      marginBottom: "12px", borderRadius: "8px", border: "1px solid #287b91",
      background: "#00101f", color: "#fff", font: "14px system-ui,sans-serif"
    });
    const initialModel = getPersonalModel();
    const initialOption = document.createElement("option");
    initialOption.value = initialModel;
    initialOption.textContent = initialModel + " (current/default — test key to load available models)";
    modelSelect.appendChild(initialOption);
    modelSelect.value = initialModel;
    modelSelect.addEventListener("change", () => {
      try { sessionStorage.setItem(USER_MODEL_SLOT, modelSelect.value); } catch (_) {}
    });
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = getPersonalKey() ? "A personal key is active in this tab." : "No personal key saved in this tab.";
    Object.assign(status.style, { minHeight: "22px", margin: "0 0 12px", color: "#baf7ff", overflowWrap: "anywhere" });
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
    const makeButton = (text, color) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      Object.assign(b.style, {
        flex: "1 1 120px", minHeight: "42px", padding: "10px", borderRadius: "8px",
        border: "1px solid " + color, background: "rgba(0,0,0,.35)", color: "#fff",
        font: "bold 12px system-ui,sans-serif", cursor: "pointer"
      });
      return b;
    };
    const save = makeButton("TEST & SAVE", "#00d9ff");
    const remove = makeButton("REMOVE KEY", "#ff6b6b");
    const close = makeButton("CLOSE", "#527b8a");
    const closeModal = () => { modal.style.display = "none"; };
    close.addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.style.display === "flex") closeModal(); });
    button.addEventListener("click", () => {
      input.value = getPersonalKey();
      status.textContent = getPersonalKey() ? "A personal key is active in this tab." : "No personal key saved in this tab.";
      modal.style.display = "flex";
      input.focus();
    });
    save.addEventListener("click", async () => {
      const key = input.value.trim();
      if (!key) { status.textContent = "Paste your Gemini API key first."; status.style.color = "#ffd0d0"; return; }
      save.disabled = true;
      status.textContent = "Checking which Gemini models your key can access…";
      status.style.color = "#baf7ff";
      try {
        const listResponse = await originalFetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", {
          method: "GET",
          headers: { "x-goog-api-key": key }
        });
        const listData = await listResponse.json().catch(() => ({}));
        if (!listResponse.ok) {
          throw new Error(listData?.error?.message || ("Google model list returned HTTP " + listResponse.status));
        }
        const models = (listData.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map(m => ({ id: String(m.name || "").replace(/^models\//, ""), label: String(m.displayName || m.name || "").trim() }))
          .filter(m => m.id && !/(embedding|aqa|image|tts|audio|transcri|veo|robotics)/i.test(m.id))
          .filter((m, i, all) => all.findIndex(x => x.id === m.id) === i);
        if (!models.length) throw new Error("Google did not list any compatible text-generation models for this key.");
        modelSelect.replaceChildren();
        models.forEach(m => {
          const option = document.createElement("option");
          option.value = m.id;
          option.textContent = m.label && m.label !== m.id ? m.label + " (" + m.id + ")" : m.id;
          modelSelect.appendChild(option);
        });
        const preferred = [modelSelect.value, getPersonalModel(), DEFAULT_MODEL, "gemini-3.6-flash", "gemini-3.5-flash-lite"];
        const chosen = preferred.find(id => models.some(m => m.id === id)) || models[0].id;
        modelSelect.value = chosen;
        status.textContent = models.length + " compatible Gemini text models found. Testing " + chosen + "…";
        const testResponse = await originalFetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(chosen) + ":generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with exactly: JARVIS connection successful." }] }], generationConfig: { maxOutputTokens: 30 } })
        });
        const testData = await testResponse.json().catch(() => ({}));
        if (!testResponse.ok) {
          try { sessionStorage.setItem(AVAILABLE_MODELS_SLOT, JSON.stringify(models.map(m => m.id))); } catch (_) {}
          throw new Error((testData?.error?.message || ("Google returned HTTP " + testResponse.status)) + ". Choose another model from the list and press TEST & SAVE again.");
        }
        sessionStorage.setItem(USER_KEY_SLOT, key);
        sessionStorage.setItem(USER_MODEL_SLOT, chosen);
        sessionStorage.setItem(AVAILABLE_MODELS_SLOT, JSON.stringify(models.map(m => m.id)));
        status.textContent = "Connected! " + models.length + " compatible models found. Selected: " + chosen + ". You can change the model above and press TEST & SAVE.";
        status.style.color = "#9dffcb";
        showReply("Personal Gemini key tested successfully with " + chosen + ". JARVIS will use the selected model in this tab.");
      } catch (error) {
        status.textContent = "Key/model test failed: " + (error?.message || "network error") + ". Check the key, selected model, quota, and browser connection.";
        status.style.color = "#ffd0d0";
      } finally {
        save.disabled = false;
      }
    });
    remove.addEventListener("click", () => {
      try {
        sessionStorage.removeItem(USER_KEY_SLOT);
        sessionStorage.removeItem(USER_MODEL_SLOT);
        sessionStorage.removeItem(AVAILABLE_MODELS_SLOT);
      } catch (_) {}
      input.value = "";
      modelSelect.replaceChildren();
      const resetOption = document.createElement("option");
      resetOption.value = DEFAULT_MODEL;
      resetOption.textContent = DEFAULT_MODEL + " (default — test key to load available models)";
      modelSelect.appendChild(resetOption);
      status.textContent = "Personal key removed from this browser tab.";
      status.style.color = "#baf7ff";
      showReply("Personal Gemini key removed. JARVIS will use its configured backend if available.");
    });
    row.append(save, remove, close);
    card.append(heading, intro, warning, label, input, modelLabel, modelSelect, status, row);
    modal.appendChild(card);
    document.body.append(button, modal);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addSettingsUI, { once: true });
  else addSettingsUI();

  async function askPersonalGemini(command) {
    const key = getPersonalKey();
    if (!key) return null;
    const model = getPersonalModel();
    const response = await originalFetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are JARVIS, a helpful, clear, concise personal AI assistant. Answer the user's question directly. Do not claim to control the phone or access live information unless a tool actually provides it." }] },
        contents: [{ role: "user", parts: [{ text: command }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || ("Google Gemini returned HTTP " + response.status));
    const answer = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    if (!answer) throw new Error("Gemini returned no text. Check safety filters, model access, or quota.");
    return answer;
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
        const personalKey = getPersonalKey();
        if (personalKey) {
          try {
            const answer = await askPersonalGemini(command);
            const result = { ok: true, reply: answer };
            showReply(answer);
            return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
          } catch (error) {
            const result = { ok: false, reply: "Personal Gemini request failed: " + (error?.message || "unknown error") + ". Open ⚙ SETTINGS to check your key or remove it to use the JARVIS server." };
            showReply(result.reply, "error");
            return new Response(JSON.stringify(result), { status: 502, headers: { "Content-Type": "application/json" } });
          }
        }
        if (!API_BASE) {
          const result = { ok: false, reply: "The JARVIS AI backend is not connected. Open ⚙ SETTINGS to add your own Gemini API key, or open the site using the backend URL." };
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
