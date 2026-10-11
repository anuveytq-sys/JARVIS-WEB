/* JARVIS web compatibility/UI patch. Loaded before the main bridge. */
(() => {
  // Keep the diagnostics/reply bridge above the main command controls.
  const style = document.createElement("style");
  style.id = "jarvis-ui-patch-style";
  style.textContent = `
    #jarvis-web-bridge-panel {
      bottom: 96px !important;
      max-height: min(22vh, 150px) !important;
      overflow-y: auto !important;
    }
    @media (max-width: 767px) {
      #jarvis-web-bridge-panel {
        bottom: 88px !important;
        width: min(90vw, 620px) !important;
        max-height: 20vh !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  // HARD FORCE Gemini 2.5 Flash. This is intentionally not just a default:
  // even if an older session has another model saved, reset it to 2.5 Flash.
  const FORCED_GEMINI_MODEL = "gemini-2.5-flash";
  try {
    sessionStorage.setItem("jarvisPersonalGeminiModel", FORCED_GEMINI_MODEL);
  } catch (_) {}

  // Browser-safe app launcher. Native apps cannot be opened reliably on every
  // device, so JARVIS uses official web versions as the universal fallback.
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
    if (sameTab) {
      window.location.assign(url);
      return;
    }
    // Try a normal new tab first. If the browser blocks the popup, fall back
    // to the same tab so the command still works.
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(url);
  };
  const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const originalFetch = window.fetch.bind(window);

  function launcherReply(name) {
    return new Response(JSON.stringify({ ok: true, reply: `Opening ${name}.` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  window.fetch = async function(input, init = {}) {
    let url = typeof input === "string" ? input : input?.url || "";

    // Force every Gemini generateContent request made by this page to 2.5 Flash.
    // This catches old saved model settings and any model selected in Settings.
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
            // Spotify commonly gets popup-blocked when the command comes from
            // voice recognition, so deliberately use a same-tab navigation.
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
    return originalFetch(input, init);
  };
})();
