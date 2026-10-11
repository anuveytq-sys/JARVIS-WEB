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

  // Make Gemini 2.5 Flash the default personal-key model before the main
  // bridge reads its session setting. Users can still choose another model
  // from the Settings model list after discovery.
  try {
    if (!sessionStorage.getItem("jarvisPersonalGeminiModel")) {
      sessionStorage.setItem("jarvisPersonalGeminiModel", "gemini-2.5-flash");
    }
  } catch (_) {}

  // Browser-safe app launcher. Native apps cannot be opened reliably on every
  // device, so JARVIS uses the official web version as a universal fallback.
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

  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
  const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const originalFetch = window.fetch.bind(window);

  function launcherReply(name) {
    return new Response(JSON.stringify({ ok: true, reply: `Opening ${name}.` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  window.fetch = async function(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.endsWith("/api/command") && String(init.method || "GET").toUpperCase() === "POST") {
      try {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
        const command = clean(body?.command);
        for (const [name, target, aliases] of apps) {
          const openIntent = /^(open|launch|start|go to|show|take me to|navigate to)\b/.test(command);
          if (openIntent && aliases.some(alias => command === alias || command.includes(" " + alias) || command.includes(alias + " "))) {
            open(target);
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
