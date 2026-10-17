/* JARVIS universal service intent router.
   Normalizes common natural-language variations without changing wake-word or microphone code.
   Existing service integrations remain responsible for actions that need device permissions. */
(() => {
  "use strict";
  if (window.__JARVIS_UNIVERSAL_SERVICE_ROUTER__) return;
  window.__JARVIS_UNIVERSAL_SERVICE_ROUTER__ = true;

  const clean = value => String(value || "")
    .trim()
    .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b[,: ]*/i, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sites = {
    spotify: "https://open.spotify.com/",
    youtube: "https://www.youtube.com/",
    github: "https://github.com/",
    google: "https://www.google.com/",
    gmail: "https://mail.google.com/",
    maps: "https://maps.google.com/",
    "google maps": "https://maps.google.com/",
    wikipedia: "https://www.wikipedia.org/",
    reddit: "https://www.reddit.com/",
    netflix: "https://www.netflix.com/",
    twitch: "https://www.twitch.tv/",
    discord: "https://discord.com/app/",
    whatsapp: "https://web.whatsapp.com/",
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    x: "https://x.com/",
    twitter: "https://x.com/",
    linkedin: "https://www.linkedin.com/",
    amazon: "https://www.amazon.com/",
    chatgpt: "https://chatgpt.com/",
    gemini: "https://gemini.google.com/",
    perplexity: "https://www.perplexity.ai/",
    copilot: "https://copilot.microsoft.com/",
    drive: "https://drive.google.com/",
    "google drive": "https://drive.google.com/",
    calendar: "https://calendar.google.com/",
    "google calendar": "https://calendar.google.com/",
    translate: "https://translate.google.com/",
    "google translate": "https://translate.google.com/",
    outlook: "https://outlook.live.com/",
    notion: "https://www.notion.so/",
    canva: "https://www.canva.com/",
    roblox: "https://www.roblox.com/",
    minecraft: "https://www.minecraft.net/"
  };

  function githubIntent(text) {
    const api = window.JARVISGitHubAccess;
    if (api && typeof api.parseCommand === "function") {
      const parsed = api.parseCommand(text);
      if (parsed) return parsed;
    }
    const t = text.replace(/\b(?:please|on github|in github|on git hub|in git hub)\b/gi, "").trim();
    let m = t.match(/^(?:open|find|search|show|look up|go to|visit)?\s*(?:the\s+)?(.+?)\s+(?:repository|repositories|repo|repos)$/i);
    if (m) return { url: "https://github.com/search?q=" + encodeURIComponent(m[1].trim()) + "&type=repositories", label: "GitHub repository search for " + m[1].trim() };
    m = t.match(/^(?:search|find|look up)\s+(.+)$/i);
    if (m) return { url: "https://github.com/search?q=" + encodeURIComponent(m[1].trim()), label: "GitHub search for " + m[1].trim() };
    return null;
  }

  function classify(raw) {
    const text = clean(raw);
    if (!text) return null;
    const lower = text.toLowerCase();

    // GitHub category/search requests, including short forms such as "search username repository".
    if (/\bgithub\b|\b(?:repositories|repository|repos|repo|pull requests|issues|commits|discussions)\b/i.test(text)) {
      const gh = githubIntent(text);
      if (gh) return gh;
      if (/\b(?:repository|repositories|repo|repos)\b/i.test(text)) {
        const term = text.replace(/\b(?:please|search|find|show|open|look up|on github|in github|the|repository|repositories|repo|repos)\b/gi, "").trim();
        if (term) return { url: "https://github.com/search?q=" + encodeURIComponent(term) + "&type=repositories", label: "GitHub repository search for " + term };
      }
    }

    // Open a service with optional articles/verbs: "Spotify", "open Spotify", "open the Spotify".
    for (const [name, url] of Object.entries(sites).sort((a, b) => b[0].length - a[0].length)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const bare = new RegExp("^" + escaped + "$", "i");
      const open = new RegExp("^(?:(?:please )?(?:open|launch|start|go to|visit|load|show me|take me to)\\s+)(?:the\\s+)?" + escaped + "(?:\\s+(?:website|site|app|application))?$", "i");
      if (bare.test(lower) || open.test(lower)) return { url, label: name };
    }

    // Natural phrasing such as "open the YouTube website".
    const service = Object.keys(sites).sort((a, b) => b.length - a.length).find(name =>
      new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(lower));
    if (service && /\b(open|launch|start|visit|load|go to|take me to)\b/i.test(lower) &&
        /\b(website|site|app|application)\b/i.test(lower)) {
      return { url: sites[service], label: service };
    }

    // Search directly on common services.
    let m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(.+?)\s+(?:on|in)\s+(youtube|spotify|google|wikipedia|reddit)$/i);
    if (m) {
      const term = m[1].trim(), name = m[2].toLowerCase();
      const url = name === "youtube" ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(term)
        : name === "spotify" ? "https://open.spotify.com/search/" + encodeURIComponent(term)
        : name === "google" ? "https://www.google.com/search?q=" + encodeURIComponent(term)
        : name === "wikipedia" ? "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(term)
        : "https://www.reddit.com/search/?q=" + encodeURIComponent(term);
      return { url, label: name + " search for " + term };
    }
    return null;
  }

  function openItem(item) {
    const tab = window.open(item.url, "_blank");
    if (tab) { try { tab.opener = null; } catch (_) {} }
    else {
      let box = document.getElementById("jarvis-service-router-fallback");
      if (!box) {
        box = document.createElement("div");
        box.id = "jarvis-service-router-fallback";
        Object.assign(box.style, { position:"fixed", zIndex:"2147483647", left:"50%", bottom:"90px", transform:"translateX(-50%)", width:"min(90vw,540px)", padding:"14px", border:"1px solid #00d9ff", borderRadius:"12px", background:"rgba(2,12,28,.98)", color:"#d8fbff", font:"14px/1.45 system-ui,sans-serif" });
        document.body.appendChild(box);
      }
      box.replaceChildren();
      const p = document.createElement("p"); p.textContent = "Tap below to open " + item.label + ". Your browser blocked the new tab.";
      const a = document.createElement("a"); a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "OPEN " + item.label.toUpperCase();
      Object.assign(a.style, { display:"inline-block", padding:"10px 14px", border:"1px solid #00d9ff", borderRadius:"8px", color:"#d8fbff", textDecoration:"none", fontWeight:"700" });
      const close = document.createElement("button"); close.type = "button"; close.textContent = "CLOSE"; close.onclick = () => box.remove();
      box.append(p, a, close);
    }
    try {
      if (typeof window.showReply === "function") window.showReply("Opening " + item.label + ".", "reply");
      else if (typeof window.speak === "function") window.speak("Opening " + item.label + ".");
    } catch (_) {}
  }

  function handle(raw) {
    const item = classify(raw);
    if (!item) return false;
    openItem(item);
    return true;
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "commandForm") return;
    const field = document.getElementById("commandInput");
    if (!field || !handle(field.value)) return;
    event.preventDefault(); event.stopImmediatePropagation(); field.value = "";
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.target?.id !== "commandInput") return;
    const field = document.getElementById("commandInput");
    if (!field || !handle(field.value)) return;
    event.preventDefault(); event.stopImmediatePropagation(); field.value = "";
  }, true);

  const wrap = () => {
    if (typeof window.sendCommand !== "function" || window.sendCommand.__jarvisUniversalRouter) return false;
    const original = window.sendCommand.bind(window);
    const wrapped = async command => { if (handle(command)) return; return original(command); };
    wrapped.__jarvisUniversalRouter = true;
    window.sendCommand = wrapped;
    return true;
  };
  if (!wrap()) {
    let attempts = 0;
    const timer = window.setInterval(() => { attempts++; if (wrap() || attempts >= 30) window.clearInterval(timer); }, 100);
  }
  window.JARVISUniversalRouter = { classify };
})();
