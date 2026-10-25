/* JARVIS GitHub Pages browser bridge.
   Displays replies on-screen as well as using the original HUD speech.
   No API keys or secrets are stored in this file. */
(() => {
  let API_BASE = (new URLSearchParams(location.search).get("api") || localStorage.getItem("jarvisApiBase") || "").replace(/\/+$/, "");
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
      // Speak every final result shown in the panel using the selected JARVIS voice.
      // Processing/status updates are intentionally silent.
      if (state !== "processing" && String(message || "").trim()) {
        applyJarvisVoice(message);
      }
    } catch (_) {}
  }


  // Optional personal Gemini key: kept in this browser tab's session storage
  // and sent directly to Google, never to the JARVIS backend.
  const USER_KEY_SLOT = "jarvisPersonalGeminiKey";
  const USER_MODEL_SLOT = "jarvisPersonalGeminiModel";
  const AVAILABLE_MODELS_SLOT = "jarvisAvailableGeminiModels";
  const DEFAULT_MODEL = "gemini-3.8-flash";
  const OPENROUTER_KEY_SLOT = "jarvisOpenRouterKey";
  const OPENROUTER_MODEL_SLOT = "jarvisOpenRouterModel";
  const AI_PROVIDER_SLOT = "jarvisAIProvider";
  const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
  const VOICE_NAME_SLOT = "jarvisVoiceName";
  const VOICE_RATE_SLOT = "jarvisVoiceRate";
  const VOICE_PITCH_SLOT = "jarvisVoicePitch";
  // Match the original main HUD voice defaults (rate/pitch 0.95). Older bridge
  // defaults (0.88/0.72) made replies sound slower and less present.
  // Migrate only those legacy defaults; leave other user-selected settings alone.
  try {
    if (sessionStorage.getItem("jarvisVoiceDefaultsVersion") !== "main-hud-095") {
      if (!sessionStorage.getItem(VOICE_RATE_SLOT) || sessionStorage.getItem(VOICE_RATE_SLOT) === "0.88") {
        sessionStorage.setItem(VOICE_RATE_SLOT, "0.95");
      }
      if (!sessionStorage.getItem(VOICE_PITCH_SLOT) || sessionStorage.getItem(VOICE_PITCH_SLOT) === "0.72") {
        sessionStorage.setItem(VOICE_PITCH_SLOT, "0.95");
      }
      const savedVoice = sessionStorage.getItem(VOICE_NAME_SLOT) || "";
      if (/\|0\.60\|0\.84$/.test(savedVoice)) sessionStorage.setItem(VOICE_NAME_SLOT, "auto-male");
      sessionStorage.setItem("jarvisVoiceDefaultsVersion", "main-hud-095");
    }
  } catch (_) {}
  const getVoiceName = () => { try { return sessionStorage.getItem(VOICE_NAME_SLOT) || "auto-male"; } catch (_) { return "auto-male"; } };
  const getVoiceRate = () => { try { return Number(sessionStorage.getItem(VOICE_RATE_SLOT) || 0.95); } catch (_) { return 0.95; } };
  const getVoicePitch = () => { try { return Number(sessionStorage.getItem(VOICE_PITCH_SLOT) || 0.95); } catch (_) { return 0.95; } };
  const feminineVoiceHints = /female|woman|samantha|victoria|karen|susan|zira|hazel|sara(h)?|aria|jenny|libby|natasha|moira|tessa|fiona|ava|allison|joanna|kendra|kimberly|salli|ivy|emma|olivia|serena|monica|luciana|kate|amelie|helena|linda|mary|lisa|nicole|catherine|veena|priya|lekha/i;
  const masculineVoiceHints = /david|daniel|mark|guy|eric|roger|alex|fred|tom|male|microsoft.*(david|guy|mark|ryan)|google.*(uk english male|us english)|aaron|arthur|bruce|george|james|lee|liam|matthew|michael|oliver|paul|rishi|ryan|thomas/i;
  function getEnglishVoices() {
    if (!("speechSynthesis" in window)) return [];
    const voices = window.speechSynthesis.getVoices().filter(v => /^en([_-]|$)/i.test(v.lang));
    const likelyMasculine = voices.filter(v => masculineVoiceHints.test(v.name) && !feminineVoiceHints.test(v.name));
    const notExplicitlyFeminine = voices.filter(v => !feminineVoiceHints.test(v.name));
    return likelyMasculine.length ? likelyMasculine : notExplicitlyFeminine;
  }
  function getBaseJarvisVoice(preference = getVoiceName()) {
    const voices = getEnglishVoices();
    if (preference && preference.startsWith("profile|")) {
      const baseName = preference.split("|")[1];
      return voices.find(v => v.name === baseName) || voices[0];
    }
    if (preference && preference !== "auto-male") return voices.find(v => v.name === preference) || voices[0];
    return voices.find(v => masculineVoiceHints.test(v.name)) || voices.find(v => /en[-_]?(US|GB|AU|IN)/i.test(v.lang)) || voices[0];
  }
  function findJarvisVoice(preference = getVoiceName()) {
    return getBaseJarvisVoice(preference);
  }
  function getSelectedVoiceProfile() {
    const selected = getVoiceName();
    if (!selected.startsWith("profile|")) return null;
    const parts = selected.split("|");
    return { pitch: Number(parts[2]), rate: Number(parts[3]) };
  }
  let lastSpokenText = "";
  let lastSpokenAt = 0;
  function applyJarvisVoice(text) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
    const spokenText = String(text || "").trim();
    if (!spokenText) return false;
    // The original HUD also calls speak() after receiving the same response.
    // Deduplicate that second call so iOS does not cancel speech just as it starts.
    const now = Date.now();
    if (spokenText === lastSpokenText && now - lastSpokenAt < 2500) return true;
    lastSpokenText = spokenText;
    lastSpokenAt = now;
    if (window.__jarvisVoiceStop) return false;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = findJarvisVoice();
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang || "en-US"; }
    else utterance.lang = "en-US";
    const profile = getSelectedVoiceProfile();
    utterance.rate = Math.min(1.15, Math.max(0.65, profile ? profile.rate : getVoiceRate()));
    utterance.pitch = Math.min(1.2, Math.max(0.5, profile ? profile.pitch : getVoicePitch()));
    utterance.volume = 1;
    // Retry once voices finish loading; some mobile browsers initially return none.
    if (!voice && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (!window.__jarvisVoiceStop) window.speechSynthesis.speak(utterance);
      };
      window.speechSynthesis.cancel();
      return true;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }
  // The original HUD's sendCommand() calls speak(reply). Replace its browser
  // speech function so all AI replies use the chosen JARVIS voice consistently.
  const installJarvisVoice = () => {
    if (typeof window.speak === "function" && !window.speak.__jarvisVoiceOverride) {
      const voiceSpeak = function(text) { applyJarvisVoice(text); };
      voiceSpeak.__jarvisVoiceOverride = true;
      window.speak = voiceSpeak;
    }
  };
  installJarvisVoice();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      installJarvisVoice();
      window.dispatchEvent(new CustomEvent("jarvis-voices-updated"));
    };
  }
  const getOpenRouterKey = () => {
    try {
      const saved = localStorage.getItem(OPENROUTER_KEY_SLOT);
      if (saved) return saved;
      const oldSessionKey = sessionStorage.getItem(OPENROUTER_KEY_SLOT);
      if (oldSessionKey) { localStorage.setItem(OPENROUTER_KEY_SLOT, oldSessionKey); return oldSessionKey; }
      return "";
    } catch (_) { try { return sessionStorage.getItem(OPENROUTER_KEY_SLOT) || ""; } catch (_) { return ""; } }
  };
  const getOpenRouterModel = () => {
    try { return localStorage.getItem(OPENROUTER_MODEL_SLOT) || sessionStorage.getItem(OPENROUTER_MODEL_SLOT) || DEFAULT_OPENROUTER_MODEL; } catch (_) { return DEFAULT_OPENROUTER_MODEL; }
  };
  const getAIProvider = () => {
    try { return sessionStorage.getItem(AI_PROVIDER_SLOT) || "auto"; } catch (_) { return "auto"; }
  };
  const getPersonalKey = () => {
    try { return sessionStorage.getItem(USER_KEY_SLOT) || ""; } catch (_) { return ""; }
  };
  const getPersonalModel = () => {
    try { return sessionStorage.getItem(USER_MODEL_SLOT) || DEFAULT_MODEL; } catch (_) { return DEFAULT_MODEL; }
  };

  function addSettingsUI() {
    const existingButton = document.getElementById("jarvis-settings-trigger");
    const placeSettingsButton = button => {
      const statusBar = document.querySelector(".system-status");
      const statusText = document.getElementById("systemStatus");
      if (statusBar) {
        // Keep the button beside SYSTEM ONLINE in the original HUD top bar.
        if (statusText && statusText.parentElement === statusBar) {
          statusText.insertAdjacentElement("afterend", button);
        } else {
          statusBar.appendChild(button);
        }
      } else {
        document.body.appendChild(button);
      }
      Object.assign(button.style, {
        position: "relative", top: "-3px", right: "auto", left: "auto",
        zIndex: "2147483647", width: "30px", height: "30px", minWidth: "30px",
        padding: "0", margin: "0 0 0 5px", borderRadius: "8px",
        border: "1px solid #00d9ff", background: "rgba(2,18,37,.96)",
        color: "#baf7ff", font: "bold 19px system-ui,sans-serif",
        letterSpacing: "0", display: "inline-flex", alignItems: "center",
        justifyContent: "center", boxSizing: "border-box",
        boxShadow: "0 0 14px rgba(0,217,255,.22)", cursor: "pointer",
        flex: "0 0 auto", verticalAlign: "middle"
      });
    };
    if (existingButton) {
      // Preserve the existing click handler and settings behavior.
      existingButton.textContent = "⚙";
      existingButton.title = "Settings";
      existingButton.setAttribute("aria-label", "JARVIS settings");
      placeSettingsButton(existingButton);
      return;
    }
    const responsiveStyle = document.createElement("style");
    responsiveStyle.id = "jarvis-settings-responsive-style";
    responsiveStyle.textContent = `
      #jarvis-settings-trigger {
        position: relative !important; top: -3px !important; right: auto !important;
        left: auto !important; width: 30px !important; height: 30px !important;
        min-width: 30px !important; padding: 0 !important; margin: 0 0 0 5px !important;
        font-size: 19px !important; touch-action: manipulation;
      }
      #jarvis-settings-modal { overflow-y: auto; }
      #jarvis-settings-modal section { max-height: calc(100dvh - 36px); overflow-y: auto; }
      #jarvis-settings-modal input, #jarvis-settings-modal button { font-size: 14px; }
      @media (min-width: 768px) {
        #jarvis-settings-modal { padding: 32px !important; }
        #jarvis-settings-modal section {
          width: min(560px, calc(100vw - 64px)) !important;
          padding: 28px !important; max-height: calc(100dvh - 64px) !important;
        }
        #jarvis-settings-modal input { font-size: 15px !important; }
        #jarvis-settings-modal button { min-height: 44px !important; }
      }
      @media (max-width: 767px) {
        #jarvis-settings-trigger {
          width: 26px !important; height: 26px !important; min-width: 26px !important;
          margin-left: 4px !important; font-size: 17px !important;
        }
        #jarvis-settings-modal section { padding: 18px !important; }
      }
    `;
    document.head.appendChild(responsiveStyle);

    const button = document.createElement("button");
    button.id = "jarvis-settings-trigger";
    button.type = "button";
    button.textContent = "⚙";
    button.title = "Settings";
    button.setAttribute("aria-label", "JARVIS settings");
    placeSettingsButton(button);

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
    intro.textContent = "Choose AUTO, OpenRouter, personal Gemini, or the hosted JARVIS backend. Your OpenRouter key is saved in this browser on this device and sent directly to OpenRouter, not to the JARVIS server.";
    Object.assign(intro.style, { margin: "0 0 12px", color: "#b6dce7" });
    const warning = document.createElement("p");
    warning.textContent = "Security: keys used in a browser are not fully secret and can be exposed to someone using this device or inspecting browser traffic. Use only your own keys, set a strict usage/credit limit in the provider dashboard, do not share this browser session, and remove keys when finished.";
    Object.assign(warning.style, { margin: "0 0 14px", color: "#ffdca8", fontSize: "12px" });
    const voiceSection = document.createElement("div");
    Object.assign(voiceSection.style, {
      margin: "4px 0 14px", padding: "14px", border: "1px solid #287b91",
      borderRadius: "10px", background: "rgba(0,10,24,.72)"
    });
    const voiceHeading = document.createElement("h3");
    voiceHeading.textContent = "VOICE SYSTEM // JARVIS";
    Object.assign(voiceHeading.style, { margin: "0 0 6px", color: "#62f5ff", fontSize: "14px", letterSpacing: "1px" });
    const voiceInfo = document.createElement("p");
    voiceInfo.textContent = "Choose from 25 JARVIS deep-voice profiles. These use your device's best available English voice with different lower-pitch/speed settings; the underlying natural voice still depends on your device.";
    Object.assign(voiceInfo.style, { margin: "0 0 10px", color: "#b6dce7", fontSize: "12px" });
    const voiceLabel = document.createElement("label");
    voiceLabel.textContent = "Voice";
    Object.assign(voiceLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const voiceSelect = document.createElement("select");
    voiceSelect.id = "jarvis-voice-select";
    Object.assign(voiceSelect.style, {
      display: "block", width: "100%", boxSizing: "border-box", padding: "12px",
      marginBottom: "12px", borderRadius: "8px", border: "1px solid #287b91",
      background: "#00101f", color: "#fff", font: "14px system-ui,sans-serif"
    });
    const populateVoices = () => {
      const prior = getVoiceName();
      voiceSelect.replaceChildren();
      const auto = document.createElement("option");
      auto.value = "auto-male";
      auto.textContent = "AUTO — lower-pitched English voice when available";
      voiceSelect.appendChild(auto);
      const baseVoices = getEnglishVoices();
      const base = baseVoices.find(v => masculineVoiceHints.test(v.name)) || baseVoices[0];
      if (base) {
        // Clearly named presets appear first, so the cinematic profile is easy
        // to find rather than hidden among numbered pitch variations.
        [
          ["cinematic-deep", "CINEMATIC JARVIS — Deep Male Style", 0.58, 0.84],
          ["calm-command", "JARVIS — Calm Command", 0.68, 0.90],
          ["crisp-assistant", "JARVIS — Clear & Professional", 0.82, 0.96]
        ].forEach(([id, label, pitch, rate]) => {
          const option = document.createElement("option");
          option.value = "profile|" + base.name + "|" + pitch + "|" + rate;
          option.textContent = label + " (" + base.name + ")";
          option.dataset.jarvisPreset = id;
          voiceSelect.appendChild(option);
        });
        const profiles = [
          [0.50,0.78],[0.50,0.84],[0.50,0.90],[0.50,0.96],[0.55,0.78],
          [0.55,0.84],[0.55,0.90],[0.55,0.96],[0.60,0.78],[0.60,0.84],
          [0.60,0.90],[0.60,0.96],[0.65,0.78],[0.65,0.84],[0.65,0.90],
          [0.65,0.96],[0.70,0.78],[0.70,0.84],[0.70,0.90],[0.70,0.96],
          [0.75,0.78],[0.75,0.84],[0.75,0.90],[0.80,0.84],[0.80,0.90]
        ];
        const group = document.createElement("optgroup");
        group.label = "MORE JARVIS VOICE PROFILES";
        profiles.forEach(([pitch, rate], i) => {
          const option = document.createElement("option");
          option.value = "profile|" + base.name + "|" + pitch + "|" + rate;
          option.textContent = "JARVIS Deep " + String(i + 1).padStart(2, "0") + " — " + base.name + " (depth " + pitch.toFixed(2) + ")";
          group.appendChild(option);
        });
        voiceSelect.appendChild(group);
      }
      baseVoices.forEach(v => {
        const option = document.createElement("option");
        option.value = v.name;
        option.textContent = v.name + " (" + v.lang + ")" + (v.default ? " — device default" : "");
        voiceSelect.appendChild(option);
      });
      voiceSelect.value = Array.from(voiceSelect.options).some(o => o.value === prior) ? prior : (base ? "profile|" + base.name + "|0.60|0.84" : "auto-male");
    };
    voiceSelect.value = getVoiceName();
    voiceSelect.addEventListener("change", () => {
      try { sessionStorage.setItem(VOICE_NAME_SLOT, voiceSelect.value); } catch (_) {}
      voiceStatus.textContent = "Voice preference saved for this tab.";
    });
    const rateLabel = document.createElement("label");
    rateLabel.textContent = "Speaking speed";
    Object.assign(rateLabel.style, { display: "block", marginBottom: "4px", color: "#62f5ff" });
    const rateInput = document.createElement("input");
    rateInput.type = "range"; rateInput.min = "0.65"; rateInput.max = "1.05"; rateInput.step = "0.05"; rateInput.value = String(getVoiceRate());
    rateInput.style.width = "100%";
    const pitchLabel = document.createElement("label");
    pitchLabel.textContent = "Voice depth (lower = deeper)";
    Object.assign(pitchLabel.style, { display: "block", margin: "8px 0 4px", color: "#62f5ff" });
    const pitchInput = document.createElement("input");
    pitchInput.type = "range"; pitchInput.min = "0.5"; pitchInput.max = "1"; pitchInput.step = "0.05"; pitchInput.value = String(getVoicePitch());
    pitchInput.style.width = "100%";
    const voiceStatus = document.createElement("p");
    voiceStatus.setAttribute("role", "status");
    voiceStatus.textContent = ("speechSynthesis" in window) ? "Browser speech is available. Test the selected voice below." : "This browser does not support speech synthesis.";
    Object.assign(voiceStatus.style, { margin: "8px 0 10px", color: "#baf7ff", fontSize: "12px" });
    const voiceButtonRow = document.createElement("div");
    Object.assign(voiceButtonRow.style, { display: "flex", gap: "8px", flexWrap: "wrap" });
    const voiceTest = makeVoiceButton("TEST JARVIS VOICE");
    const voiceStop = makeVoiceButton("STOP SPEAKING");
    function makeVoiceButton(text) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = text;
      Object.assign(b.style, {
        flex: "1 1 130px", minHeight: "42px", padding: "10px", borderRadius: "8px",
        border: "1px solid #00d9ff", background: "rgba(0,0,0,.35)", color: "#fff",
        font: "bold 12px system-ui,sans-serif", cursor: "pointer"
      });
      return b;
    }
    const saveVoiceSliders = () => {
      if (voiceSelect.value.startsWith("profile|")) voiceSelect.value = "auto-male";
      try { sessionStorage.setItem(VOICE_RATE_SLOT, rateInput.value); sessionStorage.setItem(VOICE_PITCH_SLOT, pitchInput.value); } catch (_) {}
      voiceStatus.textContent = "Voice settings saved for this tab.";
    };
    rateInput.addEventListener("input", saveVoiceSliders);
    pitchInput.addEventListener("input", saveVoiceSliders);
    voiceTest.addEventListener("click", () => {
      if (!applyJarvisVoice("Hello. I am JARVIS. Voice systems online. How may I assist you?")) {
        voiceStatus.textContent = "Speech is unavailable in this browser. Try Safari or Chrome with sound enabled.";
      } else {
        const selected = findJarvisVoice();
        voiceStatus.textContent = "Speaking with " + (selected ? selected.name : "the device default voice") + ". If it does not sound deep enough, select another available voice.";
      }
    });
    voiceStop.addEventListener("click", () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      voiceStatus.textContent = "Speech stopped.";
    });
    voiceButtonRow.append(voiceTest, voiceStop);
    voiceSection.append(voiceHeading, voiceInfo, voiceLabel, voiceSelect, rateLabel, rateInput, pitchLabel, pitchInput, voiceStatus, voiceButtonRow);
    window.addEventListener("jarvis-voices-updated", populateVoices);
    if ("speechSynthesis" in window) setTimeout(populateVoices, 250);

    const providerLabel = document.createElement("label");
    providerLabel.textContent = "AI provider";
    Object.assign(providerLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const providerSelect = document.createElement("select");
    providerSelect.id = "jarvis-ai-provider";
    [
      ["auto", "AUTO — OpenRouter first, then Gemini, then backend"],
      ["openrouter", "OpenRouter"],
      ["gemini", "Personal Gemini"],
      ["backend", "Hosted JARVIS backend (Gemini)"],
      ["bharatcode", "BharatCode — Build League model"]
    ].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      providerSelect.appendChild(option);
    });
    providerSelect.value = getAIProvider();
    Object.assign(providerSelect.style, {
      display: "block", width: "100%", boxSizing: "border-box", padding: "12px",
      marginBottom: "14px", borderRadius: "8px", border: "1px solid #287b91",
      background: "#00101f", color: "#fff", font: "14px system-ui,sans-serif"
    });
    providerSelect.addEventListener("change", () => {
      try { sessionStorage.setItem(AI_PROVIDER_SLOT, providerSelect.value); } catch (_) {}
      status.textContent = "Selected AI provider: " + providerSelect.options[providerSelect.selectedIndex].textContent + ".";
    });

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
    const openRouterSection = document.createElement("div");
    Object.assign(openRouterSection.style, {
      margin: "4px 0 14px", padding: "14px", border: "1px solid #287b91",
      borderRadius: "10px", background: "rgba(0,10,24,.72)"
    });
    const openRouterHeading = document.createElement("h3");
    openRouterHeading.textContent = "SECOND AI // OPENROUTER";
    Object.assign(openRouterHeading.style, { margin: "0 0 6px", color: "#62f5ff", fontSize: "14px", letterSpacing: "1px" });
    const openRouterInfo = document.createElement("p");
    openRouterInfo.textContent = "Use OpenRouter to ask questions with models from different providers. The default model router is openrouter/free; you can enter another model ID from OpenRouter's model catalog.";
    Object.assign(openRouterInfo.style, { margin: "0 0 10px", color: "#b6dce7", fontSize: "12px" });
    const openRouterKeyLabel = document.createElement("label");
    openRouterKeyLabel.textContent = "OpenRouter API key";
    Object.assign(openRouterKeyLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const openRouterKeyInput = document.createElement("input");
    openRouterKeyInput.type = "password";
    openRouterKeyInput.autocomplete = "off";
    openRouterKeyInput.spellcheck = false;
    openRouterKeyInput.placeholder = "Paste your OpenRouter key (sk-or-...)";
    openRouterKeyInput.value = getOpenRouterKey();
    Object.assign(openRouterKeyInput.style, {
      width: "100%", boxSizing: "border-box", padding: "12px", marginBottom: "10px",
      borderRadius: "8px", border: "1px solid #287b91", background: "#00101f",
      color: "#fff", font: "14px system-ui,sans-serif"
    });
    const openRouterModelLabel = document.createElement("label");
    openRouterModelLabel.textContent = "OpenRouter model ID";
    Object.assign(openRouterModelLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const openRouterModelInput = document.createElement("input");
    openRouterModelInput.type = "text";
    openRouterModelInput.autocomplete = "off";
    openRouterModelInput.spellcheck = false;
    openRouterModelInput.value = getOpenRouterModel();
    openRouterModelInput.placeholder = "openrouter/free";
    Object.assign(openRouterModelInput.style, {
      width: "100%", boxSizing: "border-box", padding: "12px", marginBottom: "10px",
      borderRadius: "8px", border: "1px solid #287b91", background: "#00101f",
      color: "#fff", font: "14px system-ui,sans-serif"
    });
    const openRouterStatus = document.createElement("p");
    openRouterStatus.id = "jarvis-openrouter-status";
    openRouterStatus.setAttribute("role", "status");
    openRouterStatus.textContent = getOpenRouterKey() ? "An OpenRouter key is saved on this device in this browser." : "No OpenRouter key saved in this browser.";
    Object.assign(openRouterStatus.style, { margin: "0 0 10px", color: "#baf7ff", fontSize: "12px", overflowWrap: "anywhere" });
    const openRouterButtons = document.createElement("div");
    Object.assign(openRouterButtons.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
    const makeOpenRouterButton = (text, color) => {
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
    const openRouterTest = makeOpenRouterButton("TEST OPENROUTER", "#00d9ff");
    const openRouterRemove = makeOpenRouterButton("REMOVE OPENROUTER KEY", "#ff6b6b");
    openRouterTest.addEventListener("click", async () => {
      const key = openRouterKeyInput.value.trim();
      const model = openRouterModelInput.value.trim() || DEFAULT_OPENROUTER_MODEL;
      if (!key) {
        openRouterStatus.textContent = "Paste your OpenRouter API key first.";
        openRouterStatus.style.color = "#ffd0d0";
        return;
      }
      openRouterTest.disabled = true;
      openRouterStatus.textContent = "Testing OpenRouter connection…";
      openRouterStatus.style.color = "#baf7ff";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await originalFetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "HTTP-Referer": location.origin,
            "X-OpenRouter-Title": "JARVIS Web"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are JARVIS, a helpful personal AI assistant." },
              { role: "user", content: "Reply with exactly: JARVIS OpenRouter connection successful." }
            ],
            max_tokens: 40
          }),
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message || ("OpenRouter returned HTTP " + response.status));
        const answer = data?.choices?.[0]?.message?.content;
        if (!answer) throw new Error("OpenRouter returned no text. Check the model ID and account limits.");
        localStorage.setItem(OPENROUTER_KEY_SLOT, key);
        localStorage.setItem(OPENROUTER_MODEL_SLOT, model);
        sessionStorage.setItem(OPENROUTER_KEY_SLOT, key);
        sessionStorage.setItem(OPENROUTER_MODEL_SLOT, model);
        sessionStorage.setItem(AI_PROVIDER_SLOT, "openrouter");
        providerSelect.value = "openrouter";
        openRouterStatus.textContent = "Connected! Model: " + model + ". OpenRouter is selected as JARVIS's AI provider.";
        openRouterStatus.style.color = "#9dffcb";
        showReply("OpenRouter connection successful. JARVIS is now using " + model + ".");
      } catch (error) {
        const message = error?.name === "AbortError" ? "Request timed out after 20 seconds." : (error?.message || "network error");
        openRouterStatus.textContent = "OpenRouter test failed: " + message + " Check the key, model ID, available credits/free-model limits, and connection.";
        openRouterStatus.style.color = "#ffd0d0";
      } finally {
        clearTimeout(timer);
        openRouterTest.disabled = false;
      }
    });
    openRouterRemove.addEventListener("click", () => {
      try { localStorage.removeItem(OPENROUTER_KEY_SLOT); localStorage.removeItem(OPENROUTER_MODEL_SLOT); sessionStorage.removeItem(OPENROUTER_KEY_SLOT); sessionStorage.removeItem(OPENROUTER_MODEL_SLOT); } catch (_) {}
      openRouterKeyInput.value = "";
      openRouterModelInput.value = DEFAULT_OPENROUTER_MODEL;
      openRouterStatus.textContent = "OpenRouter key removed from this browser.";
      openRouterStatus.style.color = "#baf7ff";
      if (providerSelect.value === "openrouter") {
        providerSelect.value = getPersonalKey() ? "gemini" : "backend";
        try { sessionStorage.setItem(AI_PROVIDER_SLOT, providerSelect.value); } catch (_) {}
      }
      showReply("OpenRouter key removed from this browser.");
    });
    openRouterButtons.append(openRouterTest, openRouterRemove);
    openRouterSection.append(openRouterHeading, openRouterInfo, openRouterKeyLabel, openRouterKeyInput, openRouterModelLabel, openRouterModelInput, openRouterStatus, openRouterButtons);

    const bharatCodeSection = document.createElement("div");
    Object.assign(bharatCodeSection.style, {
      margin: "4px 0 14px", padding: "14px", border: "1px solid #287b91",
      borderRadius: "10px", background: "rgba(0,10,24,.72)"
    });
    const bharatCodeHeading = document.createElement("h3");
    bharatCodeHeading.textContent = "BHARATCODE // BUILD LEAGUE";
    Object.assign(bharatCodeHeading.style, { margin: "0 0 6px", color: "#62f5ff", fontSize: "14px", letterSpacing: "1px" });
    const bharatCodeInfo = document.createElement("p");
    bharatCodeInfo.textContent = "Uses BharatCode Qwen 3.8 27B through the hosted JARVIS backend. The API key stays in the backend's private environment settings; do not paste it into this browser.";
    Object.assign(bharatCodeInfo.style, { margin: "0 0 10px", color: "#b6dce7", fontSize: "12px" });
    const bharatCodeBaseLabel = document.createElement("label");
    bharatCodeBaseLabel.textContent = "Hosted JARVIS backend URL";
    Object.assign(bharatCodeBaseLabel.style, { display: "block", marginBottom: "6px", color: "#62f5ff" });
    const bharatCodeBaseInput = document.createElement("input");
    bharatCodeBaseInput.type = "url";
    bharatCodeBaseInput.autocomplete = "url";
    bharatCodeBaseInput.spellcheck = false;
    bharatCodeBaseInput.placeholder = "https://your-jarvis-backend.example";
    bharatCodeBaseInput.value = API_BASE;
    Object.assign(bharatCodeBaseInput.style, {
      width: "100%", boxSizing: "border-box", padding: "12px", marginBottom: "10px",
      borderRadius: "8px", border: "1px solid #287b91", background: "#00101f",
      color: "#fff", font: "14px system-ui,sans-serif"
    });
    const bharatCodeStatus = document.createElement("p");
    bharatCodeStatus.setAttribute("role", "status");
    bharatCodeStatus.textContent = API_BASE
      ? "Backend URL is set. Test the BharatCode connection before using it."
      : "Enter the deployed JARVIS backend URL. The BharatCode key must be configured on that server.";
    Object.assign(bharatCodeStatus.style, { margin: "0 0 10px", color: "#baf7ff", fontSize: "12px", overflowWrap: "anywhere" });
    const bharatCodeButtons = document.createElement("div");
    Object.assign(bharatCodeButtons.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
    const bharatCodeTest = document.createElement("button");
    bharatCodeTest.type = "button";
    bharatCodeTest.textContent = "SAVE & TEST BHARATCODE";
    Object.assign(bharatCodeTest.style, {
      flex: "1 1 180px", minHeight: "42px", padding: "10px", borderRadius: "8px",
      border: "1px solid #00d9ff", background: "rgba(0,0,0,.35)", color: "#fff",
      font: "bold 12px system-ui,sans-serif", cursor: "pointer"
    });
    bharatCodeTest.addEventListener("click", async () => {
      const base = bharatCodeBaseInput.value.trim().replace(/\/+$/, "");
      if (!/^https:\/\//i.test(base)) {
        bharatCodeStatus.textContent = "Enter a valid HTTPS backend URL.";
        bharatCodeStatus.style.color = "#ffd0d0";
        return;
      }
      bharatCodeTest.disabled = true;
      bharatCodeStatus.textContent = "Saving the backend URL and testing BharatCode…";
      bharatCodeStatus.style.color = "#baf7ff";
      try {
        const response = await originalFetch(base + "/api/bharatcode/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "Reply with exactly: JARVIS BharatCode connection successful." })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok || !data?.reply) {
          throw new Error(data?.reply || ("Backend returned HTTP " + response.status));
        }
        API_BASE = base;
        localStorage.setItem("jarvisApiBase", base);
        sessionStorage.setItem(AI_PROVIDER_SLOT, "bharatcode");
        providerSelect.value = "bharatcode";
        bharatCodeStatus.textContent = "Connected successfully. BharatCode replied: " + String(data.reply).slice(0, 180);
        bharatCodeStatus.style.color = "#9dffcb";
        showReply("BharatCode connection successful. JARVIS is now using BharatCode Qwen 3.8 27B.");
      } catch (error) {
        bharatCodeStatus.textContent = "Connection test failed: " + (error?.message || "network error") + ". Confirm the backend is deployed, BHARATCODE_API_KEY is configured privately, and the URL is correct.";
        bharatCodeStatus.style.color = "#ffd0d0";
      } finally {
        bharatCodeTest.disabled = false;
      }
    });
    bharatCodeButtons.append(bharatCodeTest);
    bharatCodeSection.append(bharatCodeHeading, bharatCodeInfo, bharatCodeBaseLabel, bharatCodeBaseInput, bharatCodeButtons, bharatCodeStatus);

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

    // Contact import is opt-in and remains local to this browser. Browser APIs
    // only expose contacts after a user gesture and may not exist on iOS Safari.
    const contactsSection = document.createElement("div");
    Object.assign(contactsSection.style, {
      margin: "14px 0", padding: "14px", border: "1px solid #287b91",
      borderRadius: "10px", background: "rgba(0,10,24,.72)"
    });
    const contactsHeading = document.createElement("h3");
    contactsHeading.textContent = "PHONE CONTACTS // JARVIS";
    Object.assign(contactsHeading.style, { margin: "0 0 6px", color: "#62f5ff", fontSize: "14px", letterSpacing: "1px" });
    const contactsInfo = document.createElement("p");
    contactsInfo.textContent = "Import contacts so JARVIS can match saved names to phone numbers for calling and WhatsApp. Contacts are saved only in this browser on this device; nothing is uploaded. Your browser decides whether it can share contacts.";
    Object.assign(contactsInfo.style, { margin: "0 0 10px", color: "#b6dce7", fontSize: "12px" });
    const contactsStatus = document.createElement("p");
    contactsStatus.setAttribute("role", "status");
    contactsStatus.textContent = "No import performed yet.";
    Object.assign(contactsStatus.style, { margin: "0 0 10px", color: "#baf7ff", fontSize: "12px", overflowWrap: "anywhere" });
    const contactsButtons = document.createElement("div");
    Object.assign(contactsButtons.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
    const makeContactsButton = (text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      Object.assign(b.style, {
        flex: "1 1 150px", minHeight: "42px", padding: "10px", borderRadius: "8px",
        border: "1px solid #00d9ff", background: "rgba(0,0,0,.35)", color: "#fff",
        font: "bold 12px system-ui,sans-serif", cursor: "pointer"
      });
      return b;
    };
    const importPhoneContacts = makeContactsButton("SELECT PHONE CONTACTS");
    const importContactFile = makeContactsButton("IMPORT .VCF / .CSV");
    const contactsFile = document.createElement("input");
    contactsFile.type = "file";
    contactsFile.accept = ".vcf,.vcard,.csv,text/vcard,text/csv";
    contactsFile.hidden = true;
    const contactCount = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("jarvisVoiceCallContacts") || "{}");
        return saved && typeof saved === "object" ? Object.keys(saved).length : 0;
      } catch (_) { return 0; }
    };
    function saveImportedContacts(entries) {
      const phones = JSON.parse(localStorage.getItem("jarvisVoiceCallContacts") || "{}");
      const whatsapp = JSON.parse(localStorage.getItem("jarvisOmniWhatsAppContacts") || "{}");
      let added = 0, skipped = 0;
      entries.forEach(entry => {
        const name = String(entry.name || "").trim().replace(/\s+/g, " ");
        const number = String(entry.tel || "").replace(/[^\d+]/g, "");
        const digits = number.replace(/\D/g, "");
        if (!name || digits.length < 7 || digits.length > 15) { skipped++; return; }
        const key = name.toLowerCase();
        // Keep an existing explicit mapping unless the imported contact has a valid number.
        phones[key] = digits.length === 10 && /^[6-9]/.test(digits) ? "91" + digits : digits;
        whatsapp[key] = phones[key];
        added++;
      });
      try {
        localStorage.setItem("jarvisVoiceCallContacts", JSON.stringify(phones));
        localStorage.setItem("jarvisOmniWhatsAppContacts", JSON.stringify(whatsapp));
        contactsStatus.style.color = "#9dffcb";
        contactsStatus.textContent = "Import complete: " + added + " contact number(s) saved; " + skipped + " skipped. JARVIS now has " + contactCount() + " saved phone contacts in this browser.";
        if (typeof window.speak === "function") window.speak("Contact import complete. Saved " + added + " contacts for JARVIS.");
      } catch (error) {
        contactsStatus.style.color = "#ffd0d0";
        contactsStatus.textContent = "Could not save contacts. Browser storage may be full or unavailable. No contacts were uploaded.";
      }
    }
    importPhoneContacts.addEventListener("click", async () => {
      if (!navigator.contacts || typeof navigator.contacts.select !== "function") {
        contactsStatus.style.color = "#ffdca8";
        contactsStatus.textContent = "This browser does not provide the phone contact picker. On iPhone/Safari, export your contacts as a .VCF file and use IMPORT .VCF / .CSV below. JARVIS cannot silently read the phone address book.";
        return;
      }
      importPhoneContacts.disabled = true;
      contactsStatus.textContent = "Opening the system contact picker… choose the contacts you want to save.";
      try {
        const selected = await navigator.contacts.select(["name", "tel"], { multiple: true });
        const entries = [];
        selected.forEach(contact => {
          const names = Array.isArray(contact.name) ? contact.name : [];
          const tels = Array.isArray(contact.tel) ? contact.tel : [];
          if (names[0] && tels.length) tels.forEach(tel => entries.push({ name: names[0], tel }));
        });
        if (!entries.length) {
          contactsStatus.textContent = "No contacts with both a name and phone number were selected.";
          return;
        }
        saveImportedContacts(entries);
      } catch (error) {
        contactsStatus.style.color = "#ffdca8";
        contactsStatus.textContent = error && error.name === "AbortError" ? "Contact selection cancelled. Nothing was changed." : "The contact picker could not complete. Try importing a .VCF or .CSV contacts file.";
      } finally { importPhoneContacts.disabled = false; }
    });
    importContactFile.addEventListener("click", () => contactsFile.click());
    contactsFile.addEventListener("change", async () => {
      const f = contactsFile.files && contactsFile.files[0];
      if (!f) return;
      try {
        const raw = await f.text();
        const entries = [];
        if (/\.vcf$|\.vcard$/i.test(f.name) || /BEGIN:VCARD/i.test(raw)) {
          raw.replace(/\r/g, "").split(/END:VCARD/i).forEach(cardText => {
            if (!/BEGIN:VCARD/i.test(cardText)) return;
            const lines = cardText.replace(/\n[ \t]/g, "").split("\n");
            let name = "";
            const tels = [];
            lines.forEach(line => {
              const colon = line.indexOf(":");
              if (colon < 0) return;
              const field = line.slice(0, colon).split(";")[0].toUpperCase();
              const value = line.slice(colon + 1).trim().replace(/\\([,;\\])/g, "$1");
              if (field === "FN") name = value;
              else if (field === "N" && !name) name = value.split(";").filter(Boolean).reverse().join(" ").trim();
              else if (field === "TEL" && value) tels.push(value);
            });
            tels.forEach(tel => entries.push({ name, tel }));
          });
        } else {
          const lines = raw.split(/\r?\n/).filter(Boolean);
          const parseCsv = line => {
            const out = []; let value = "", quoted = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; }
              else if (ch === '"') quoted = !quoted;
              else if (ch === "," && !quoted) { out.push(value.trim()); value = ""; }
              else value += ch;
            }
            out.push(value.trim()); return out;
          };
          const headers = parseCsv(lines.shift()).map(x => x.toLowerCase());
          const ni = headers.findIndex(x => /^(name|full name|display name)$/.test(x));
          const ti = headers.findIndex(x => /^(phone|phone number|mobile|mobile phone|tel|telephone)$/.test(x));
          if (ni < 0 || ti < 0) throw new Error("CSV needs Name and Phone Number columns.");
          lines.forEach(line => { const cells = parseCsv(line); if (cells[ni] && cells[ti]) entries.push({ name: cells[ni], tel: cells[ti] }); });
        }
        if (!entries.length) throw new Error("No contacts with names and valid phone numbers were found in that file.");
        saveImportedContacts(entries);
      } catch (error) {
        contactsStatus.style.color = "#ffd0d0";
        contactsStatus.textContent = "Import failed: " + (error.message || "could not read the contacts file") + ". Use a standard .VCF file or CSV with Name and Phone Number columns.";
      } finally { contactsFile.value = ""; }
    });
    contactsButtons.append(importPhoneContacts, importContactFile);
    contactsSection.append(contactsHeading, contactsInfo, contactsButtons, contactsFile, contactsStatus);
    contactsStatus.textContent = contactCount() + " phone contact(s) currently saved in this browser.";

    card.append(heading, intro, warning, voiceSection, providerLabel, providerSelect, label, input, modelLabel, modelSelect, openRouterSection, bharatCodeSection, contactsSection, status, row);
    modal.appendChild(card);
    document.body.append(modal);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addSettingsUI, { once: true });
  else addSettingsUI();

  async function askOpenRouter(command) {
    const key = getOpenRouterKey();
    if (!key) throw new Error("No OpenRouter key is saved. Open SETTINGS and add your key.");
    const model = getOpenRouterModel();
    const response = await originalFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": location.origin,
        "X-OpenRouter-Title": "JARVIS Web"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are JARVIS, a helpful, clear, concise personal AI assistant. Answer directly. Do not claim to control the phone or access live information unless a tool actually provides it." },
          { role: "user", content: command }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || ("OpenRouter returned HTTP " + response.status));
    const content = data?.choices?.[0]?.message?.content;
    const answer = Array.isArray(content) ? content.map(part => part?.text || "").join("").trim() : String(content || "").trim();
    if (!answer) throw new Error("OpenRouter returned no text. Check the model ID and account limits.");
    return answer;
  }

  async function askPersonalGemini(command) {
    const key = getPersonalKey();
    if (!key) return null;
    const model = getPersonalModel();
    const response = await originalFetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are JARVIS, a helpful, clear, concise personal AI assistant. Answer the user's question directly. Interpret ambiguous requests in a reasonable, benign, lawful, educational way; do not label ordinary safe tasks as unsafe. If a request genuinely raises a safety concern, briefly explain the concern and offer a safe alternative. Do not bypass safety rules. Do not claim to control the phone or access live information unless a tool actually provides it." }] },
        contents: [{ role: "user", parts: [{ text: command }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
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
    if (!navigator.mediaDevices?.getUserMedia) {
      return say("Camera access is not supported in this browser. Try opening JARVIS in Safari over HTTPS.");
    }
    if (typeof window.jarvisOpenCameraAndCapturePhoto === "function") {
      try {
        const captured = await window.jarvisOpenCameraAndCapturePhoto();
        return say(captured
          ? "Photo captured. Tap SAVE PHOTO to save it to your device, or say “OK Jarvis, close the camera”."
          : "I opened the camera, but the photo is not ready yet. You can tap CLICK PHOTO to try again.");
      } catch (_) {
        return say("I could not open the camera. Check camera permission and try again.");
      }
    }
    return say("The JARVIS camera controller has not loaded yet. Please refresh the page and try again.");
  }

  function getInstallStoreTarget(appName) {
    const ua = navigator.userAgent || "";
    const term = encodeURIComponent(String(appName || "").trim());
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return { name: "Apple App Store", url: "https://apps.apple.com/in/search?term=" + term };
    }
    if (/Android/i.test(ua)) {
      return { name: "Google Play Store", url: "https://play.google.com/store/search?q=" + term + "&c=apps" };
    }
    if (/Windows NT/i.test(ua)) {
      return { name: "Microsoft Store", url: "https://apps.microsoft.com/search?query=" + term };
    }
    if (/Macintosh|Mac OS X/i.test(ua)) {
      return { name: "Apple App Store", url: "https://apps.apple.com/mac/search?term=" + term };
    }
    return { name: "Flathub app catalog", url: "https://flathub.org/apps/search?q=" + term };
  }

  function handleInstallCommand(command) {
    const raw = String(command || "").trim();
    // Accept natural spoken/typed variations while keeping the app name intact.
    const cleaned = raw
      .replace(/^\s*(?:(?:hey|hello|hi|ok|okay)\s+)?(?:jarvis[, :]?\s*)?(?:please\s+)?/i, "")
      .replace(/[.!?]+$/, "")
      .trim();
    const match = cleaned.match(/^(?:find\s+and\s+install|search\s+for\s+and\s+install|install|download|get)\s+(?:(?:the|this|that)\s+)?(?:(?:app|application)\s+)?(.+?)$/i);
    if (!match) return null;

    const appName = match[1]
      .replace(/\s+(?:on|for)\s+(?:my\s+)?(?:android\s+phone|windows\s+(?:pc|computer|laptop)|mac(?:book)?\s+(?:laptop|computer)|mobile|phone|device|laptop|computer|pc|desktop|iphone|ipad|ipod|android|windows|mac(?:book)?)$/i, "")
      .replace(/\s+(?:application|app)$/i, "")
      .replace(/^(?:named|called)\s+/i, "")
      .trim();

    if (!appName || /^(?:app|application|this app|that app|it|the app|an app|any app)$/i.test(appName)) {
      return say("Tell me the app name, for example: install Spotify on my iPhone.");
    }

    const ua = navigator.userAgent || "";
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    const isAppleMobile = /iPhone|iPad|iPod/i.test(ua) ||
      (/Mac/i.test(platform) && Number(navigator.maxTouchPoints || 0) > 1);
    const term = encodeURIComponent(appName);
    let target;

    if (isAppleMobile) {
      target = {
        name: "Apple App Store",
        appUrl: "itms-apps://itunes.apple.com/in/search?term=" + term + "&entity=software",
        url: "https://apps.apple.com/in/search?term=" + term
      };
    } else if (/Android/i.test(ua)) {
      target = {
        name: "Google Play Store",
        appUrl: "market://search?q=" + term + "&c=apps",
        url: "https://play.google.com/store/search?q=" + term + "&c=apps"
      };
    } else if (/Windows NT|Windows/i.test(ua + " " + platform)) {
      target = {
        name: "Microsoft Store",
        appUrl: "ms-windows-store://search/?query=" + term,
        url: "https://apps.microsoft.com/search?query=" + term
      };
    } else if (/Macintosh|Mac OS X|macOS/i.test(ua + " " + platform)) {
      target = {
        name: "Apple App Store",
        appUrl: "macappstore://itunes.apple.com/search?term=" + term,
        url: "https://apps.apple.com/us/search?term=" + term
      };
    } else {
      target = { name: "Flathub app catalog", url: "https://flathub.org/apps/search?q=" + term };
    }

    // Prefer the device's native store app, then fall back to its official web search
    // if the browser cannot hand off to the native store. Installation confirmation
    // must remain with the device owner; websites cannot safely auto-press Install/Get.
    try {
      window.location.href = target.appUrl || target.url;
      window.setTimeout(() => {
        if (document.visibilityState !== "hidden") window.location.href = target.url;
      }, 900);
    } catch (_) {
      return say("Open " + target.name + " and search for " + appName + " to install the correct app.");
    }
    return say("Opening " + target.name + " search for " + appName + ". Check the app and publisher, then confirm installation in the store.");
  }

  async function handleLocal(command) {
    const text = command.toLowerCase().trim();
    const installResult = handleInstallCommand(command);
    if (installResult) return installResult;
    // Isolated platform search handoff; leaves the existing wake-word and voice paths untouched.
    if (typeof window.jarvisHandlePlatformSearch === "function") {
      const platformSearch = window.jarvisHandlePlatformSearch(command);
      if (platformSearch) return platformSearch;
    }
    if (isAny(text, ["what time", "current time", "tell me the time", "time now", "time"])) {
      return say(`The current time is ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}.`);
    }
    if (isAny(text, ["what date", "today's date", "todays date", "current date", "date today"])) {
      return say(`Today is ${new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);
    }
    if (isAny(text, ["storage", "disk space", "how much storage", "browser storage"])) return browserStorage();
    if (isAny(text, ["temperature", "how hot", "how cold", "weather"])) return temperature();
    // Open named apps/sites first. Generic app names must NEVER fall through to YouTube.
    // A web page cannot force-launch every native app on every device, so web versions are reliable fallbacks.
    const appRoutes = [
      { names: ["chatgpt", "chat gpt", "openai"], url: "https://chatgpt.com/", label: "ChatGPT" },
      { names: ["chrome", "google chrome"], url: "https://www.google.com/chrome/", label: "Chrome" },
      { names: ["google gemini", "gemini"], url: "https://gemini.google.com/", label: "Google Gemini" },
      { names: ["claude"], url: "https://claude.ai/", label: "Claude" },
      { names: ["copilot", "microsoft copilot"], url: "https://copilot.microsoft.com/", label: "Microsoft Copilot" },
      { names: ["whatsapp", "whats app"], url: "https://web.whatsapp.com/", label: "WhatsApp" },
      { names: ["instagram"], url: "https://www.instagram.com/", label: "Instagram" },
      { names: ["facebook"], url: "https://www.facebook.com/", label: "Facebook" },
      { names: ["messenger"], url: "https://www.messenger.com/", label: "Messenger" },
      { names: ["spotify"], url: "https://open.spotify.com/", label: "Spotify" },
      { names: ["discord"], url: "https://discord.com/app", label: "Discord" },
      { names: ["netflix"], url: "https://www.netflix.com/", label: "Netflix" },
      { names: ["reddit"], url: "https://www.reddit.com/", label: "Reddit" },
      { names: ["twitter", "x"], url: "https://x.com/", label: "X" },
      { names: ["tiktok", "tik tok"], url: "https://www.tiktok.com/", label: "TikTok" },
      { names: ["telegram"], url: "https://web.telegram.org/", label: "Telegram" },
      { names: ["github", "git hub"], url: "https://github.com/", label: "GitHub" },
      { names: ["notion"], url: "https://www.notion.so/", label: "Notion" },
      { names: ["zoom"], url: "https://app.zoom.us/", label: "Zoom" },
      { names: ["google meet", "meet"], url: "https://meet.google.com/", label: "Google Meet" },
      { names: ["amazon"], url: "https://www.amazon.in/", label: "Amazon" },
      { names: ["google classroom", "classroom"], url: "https://classroom.google.com/", label: "Google Classroom" },
      { names: ["google docs", "docs"], url: "https://docs.google.com/", label: "Google Docs" },
      { names: ["google sheets", "sheets"], url: "https://sheets.google.com/", label: "Google Sheets" },
      { names: ["google slides", "slides"], url: "https://slides.google.com/", label: "Google Slides" }
    ];
    const cleanedCommand = text
      .replace(/^\s*(hey|hello|ok|okay)\s+jarvis[,:]?\s*/i, "")
      .replace(/^\s*jarvis[,:]?\s*/i, "")
      .replace(/^\s*(please\s+)?(open|launch|start|go to)\s+/i, "")
      .replace(/[.!?]+$/g, "").trim();
    const appRoute = appRoutes.find(route => route.names.some(name => name.toLowerCase() === cleanedCommand));
    if (appRoute) {
      // Android Chrome can be targeted with an intent URL. Other apps use their dependable web versions.
      if (appRoute.label === "Chrome" && /Android/i.test(navigator.userAgent)) {
        openUrl("intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;end");
        return say("Trying to open the Chrome app.");
      }
      if (appRoute.label === "Chrome" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        openUrl("googlechrome://navigate?url=https%3A%2F%2Fwww.google.com%2F");
        return say("Trying to open the Chrome app. If it is not installed, open Chrome from the App Store.");
      }
      openUrl(appRoute.url);
      return say("Opening " + appRoute.label + ".");
    }

    // Music commands use public music-site search URLs: no API key or extra permission is needed.
    // The service itself may require a tap to start playback because browsers restrict autoplay.
    const musicIntent = /\b(play|listen to|put on)\b/i.test(text);
    const explicitYouTubeMusic = /\bon\s+youtube\s+music\b/i.test(text);
    const explicitSpotifyMusic = /\bon\s+spotify\b/i.test(text);
    const explicitAppleMusic = /\bon\s+apple\s+music\b/i.test(text);
    const explicitAmazonMusic = /\bon\s+amazon\s+music\b/i.test(text);
    const explicitPlainYouTube = /\bon\s+youtube\b/i.test(text) && !explicitYouTubeMusic;
    if (musicIntent && !explicitPlainYouTube) {
      let songQuery = text
        .replace(/^\s*(hey|hello|ok|okay)?\s*jarvis[, :]?\s*/i, "")
        .replace(/^\s*(please\s+)?(play|listen\s+to|put\s+on)\s+/i, "")
        .replace(/\s+\bon\s+(youtube\s+music|youtube|spotify|apple\s+music|amazon\s+music)\b.*$/i, "")
        .replace(/\s+\b(song|track|music)\s*$/i, "")
        .replace(/[.,!?]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!songQuery) return say("Tell me the song name, for example: play Tere Liye.");
      let musicUrl;
      let musicService;
      if (explicitSpotifyMusic) {
        musicService = "Spotify";
        musicUrl = "https://open.spotify.com/search/" + encodeURIComponent(songQuery);
      } else if (explicitAppleMusic) {
        musicService = "Apple Music";
        musicUrl = "https://music.apple.com/search?term=" + encodeURIComponent(songQuery);
      } else if (explicitAmazonMusic) {
        musicService = "Amazon Music";
        musicUrl = "https://music.amazon.in/search/" + encodeURIComponent(songQuery);
      } else {
        musicService = "YouTube Music";
        musicUrl = "https://music.youtube.com/search?q=" + encodeURIComponent(songQuery);
      }
      const musicTab = window.open(musicUrl, "_blank");
      if (musicTab) {
        try { musicTab.opener = null; } catch (_) {}
      } else {
        // If the browser blocks a new tab, still complete the user's request in this tab.
        window.location.assign(musicUrl);
      }
      return say("Searching " + musicService + " for " + songQuery + ". Select the matching result to start playback.");
    }

    // Search YouTube for a channel/video ONLY when the request explicitly says "on YouTube".
    const explicitYouTube = /\bon\s+youtube\b/i.test(text);
    const youtubeHome = /^(?:(?:hey|hello|ok|okay)\s+)?jarvis[, ]*\s*(?:open\s+)?youtube[.! ]*$/i.test(text)
      || /^(?:open\s+)?youtube[.! ]*$/i.test(text);
    const channelIntent = /\b(channel|youtuber|creator)\b/i.test(text);
    const videoIntent = /\b(play|watch|video|trailer|song|clip)\b/i.test(text);
    const hasOpenIntent = /\b(open|play|watch|show|find|search)\b/i.test(text);
    if (youtubeHome) {
      openUrl("https://www.youtube.com/");
      return say("Opening YouTube.");
    }
    if (explicitYouTube && hasOpenIntent) {
      let query = text
        .replace(/\b(hey|hello|ok|okay|jarvis)\b/gi, " ")
        .replace(/\b(open|play|watch|show|find|search|for|me|please|the|a|an|on|youtube|channel|youtuber|creator|video|trailer|song|clip)\b/gi, " ")
        .replace(/[.,!?]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!query) { openUrl("https://www.youtube.com/"); return say("Opening YouTube."); }
      const searchUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query + (channelIntent ? " channel" : ""));
      openUrl(searchUrl);
      return say(channelIntent ? "Searching YouTube for the " + query + " channel." : (videoIntent ? "Finding the YouTube video " + query + "." : "Searching YouTube for " + query + "."));
    }
    // Do not send arbitrary names (e.g. Chrome, ChatGPT, Google) to YouTube.
    if (hasOpenIntent && /\b(open|launch|start|go to)\s+youtube\b/i.test(text)) {
      openUrl("https://www.youtube.com/");
      return say("Opening YouTube.");
    }
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
    const photoIntent = /\b(?:click|take|capture|snap)\b.*\b(?:photo|picture|pic|image)\b/i.test(text)
      || /\b(?:photo|picture|pic|image)\b.*\b(?:click|take|capture|snap)\b/i.test(text);
    if (/\b(?:close|exit|stop|hide)\b.*\bcamera\b/i.test(text)
      || /\bcamera\b.*\b(?:close|exit|stop|hide)\b/i.test(text)) {
      if (typeof window.jarvisCloseCamera === "function") window.jarvisCloseCamera();
      return say("Camera closed.");
    }
    if (photoIntent || /^(?:(?:hey|hello|ok|okay)\s+)?jarvis[, ]*\s*(?:(?:open|launch|start|show|turn on)(?: the)?\s+)?camera[.! ]*$/i.test(text)
      || /\b(?:open|launch|start|show|turn on)(?: the)?\s+camera\b/i.test(text)
      || /^camera$/i.test(text.trim())) return camera();
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
      showReply("JARVIS is processing: " + (command || "(empty command)"), "processing");
      try {
        const local = await handleLocal(command);
        if (local) {
          showReply(local.reply);
          return new Response(JSON.stringify(local), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const provider = getAIProvider();
        const personalKey = getPersonalKey();
        const openRouterKey = getOpenRouterKey();
        const useOpenRouter = provider === "openrouter" || (provider === "auto" && !!openRouterKey);
        const useGemini = provider === "gemini" || (provider === "auto" && !openRouterKey && !!personalKey);
        if (useOpenRouter) {
          try {
            const answer = await askOpenRouter(command);
            const result = { ok: true, reply: answer, provider: "openrouter", model: getOpenRouterModel() };
            showReply(answer);
            return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
          } catch (error) {
            const result = { ok: false, reply: "OpenRouter request failed: " + (error?.message || "unknown error") + ". Open ⚙ SETTINGS to check the key/model or choose another AI provider." };
            showReply(result.reply, "error");
            return new Response(JSON.stringify(result), { status: 502, headers: { "Content-Type": "application/json" } });
          }
        }
        if (useGemini) {
          if (!personalKey) {
            const result = { ok: false, reply: "No personal Gemini key is saved. Open ⚙ SETTINGS and choose AUTO, OpenRouter, or Hosted JARVIS backend." };
            showReply(result.reply, "error");
            return new Response(JSON.stringify(result), { status: 503, headers: { "Content-Type": "application/json" } });
          }
          try {
            const answer = await askPersonalGemini(command);
            const result = { ok: true, reply: answer, provider: "gemini", model: getPersonalModel() };
            showReply(answer);
            return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
          } catch (error) {
            const result = { ok: false, reply: "Personal Gemini request failed: " + (error?.message || "unknown error") + ". Open ⚙ SETTINGS to check your key or select another AI provider." };
            showReply(result.reply, "error");
            return new Response(JSON.stringify(result), { status: 502, headers: { "Content-Type": "application/json" } });
          }
        }
        if (!API_BASE) {
          const result = { ok: false, reply: "The JARVIS AI backend is not connected. Open ⚙ SETTINGS to add an OpenRouter or Gemini key, or open the site using the backend URL." };
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
