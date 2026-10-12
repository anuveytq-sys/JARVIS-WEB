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
        const command = clean(body?.command);
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
})();
