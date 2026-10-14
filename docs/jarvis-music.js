/* JARVIS music launcher
   Understands commands such as:
   "play Saahiba on YouTube"
   "play Saahiba on YouTube Music"
   "play Saahiba on Spotify"
   "play Saahiba on Apple Music"

   The browser cannot read or click another service's cross-origin search results,
   so this launcher opens the requested service directly to its search results.
   If the service's app is installed, its universal/app link may hand off to the app.
*/
(() => {
  "use strict";

  if (window.__jarvisMusicLauncherInstalled) return;
  window.__jarvisMusicLauncherInstalled = true;

  const PLATFORMS = [
    { key: "youtube-music", label: "YouTube Music", patterns: /(?:youtube\s*music|yt\s*music)/i,
      web: q => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
      app: q => `youtube-music://search?q=${encodeURIComponent(q)}` },
    { key: "youtube", label: "YouTube", patterns: /youtube/i,
      web: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      app: q => `youtube://results?search_query=${encodeURIComponent(q)}` },
    { key: "spotify", label: "Spotify", patterns: /spotify/i,
      web: q => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
      app: q => `spotify:search:${encodeURIComponent(q)}` },
    { key: "apple-music", label: "Apple Music", patterns: /apple\s*music/i,
      web: q => `https://music.apple.com/us/search?term=${encodeURIComponent(q)}`,
      app: null }
  ];

  function cleanCommand(value) {
    return String(value || "")
      .trim()
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[!?.,;:]+$/g, "")
      .trim();
  }

  function parseMusicCommand(command) {
    const text = cleanCommand(command);
    if (!/^play\b/i.test(text)) return null;

    const afterPlay = text.replace(/^play\s+/i, "").trim();
    if (!afterPlay) return null;

    // Prefer the longest platform phrase first, so "YouTube Music" is not
    // accidentally treated as plain YouTube.
    const platform = PLATFORMS.find(p => p.patterns.test(afterPlay));
    if (!platform) return null;

    let query = afterPlay.replace(platform.patterns, "").trim();
    query = query
      .replace(/^(?:on|from|using|in)\s+/i, "")
      .replace(/\s+(?:on|from|using|in)\s*$/i, "")
      .trim();

    // A few natural-language forms are common in voice recognition.
    query = query.replace(/^the\s+/i, "").trim();
    if (!query) return null;

    return { query, platform };
  }

  function speak(message) {
    try {
      if (typeof window.applyJarvisVoice === "function") {
        window.applyJarvisVoice(message);
        return;
      }
      if (typeof window.speak === "function") {
        window.speak(message);
      }
    } catch (_) {}
  }

  function showStatus(message) {
    try {
      if (typeof window.showReply === "function") {
        window.showReply(message);
      }
    } catch (_) {}
  }

  function openPlatform(platform, query) {
    const webUrl = platform.web(query);
    let handedOff = false;

    // Try the native app scheme first where one is available. On browsers that
    // refuse custom schemes, fall back to the official web search page shortly.
    if (platform.app) {
      try {
        const started = Date.now();
        window.location.href = platform.app(query);
        handedOff = true;
        // If the app did not take over, the page remains available through the
        // official web URL. A new tab is used only as a fallback.
        window.setTimeout(() => {
          if (document.visibilityState === "visible" && Date.now() - started >= 700) {
            try { window.open(webUrl, "_blank", "noopener"); } catch (_) { window.location.href = webUrl; }
          }
        }, 900);
      } catch (_) {}
    }

    if (!handedOff) {
      try { window.open(webUrl, "_blank", "noopener"); }
      catch (_) { window.location.href = webUrl; }
    }

    return webUrl;
  }

  function handleMusicCommand(command) {
    const parsed = parseMusicCommand(command);
    if (!parsed) return false;

    const { query, platform } = parsed;
    const display = `Opening ${platform.label} for “${query}”…`;
    showStatus(display);
    speak(`Opening ${platform.label} search for ${query}.`);
    openPlatform(platform, query);
    return true;
  }

  window.jarvisPlayMusic = handleMusicCommand;
  window.jarvisParseMusicCommand = parseMusicCommand;

  // Wrap the original JARVIS command function so music commands are handled
  // locally before the AI backend receives them.
  const install = () => {
    if (typeof window.sendCommand !== "function") return false;
    if (window.sendCommand.__jarvisMusicWrapped) return true;

    const original = window.sendCommand;
    const wrapped = async function(command) {
      if (handleMusicCommand(command)) return;
      return original.apply(this, arguments);
    };
    wrapped.__jarvisMusicWrapped = true;
    wrapped.__jarvisMusicOriginal = original;
    window.sendCommand = wrapped;
    return true;
  };

  if (!install()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 40) window.clearInterval(timer);
    }, 250);
  }
})();
