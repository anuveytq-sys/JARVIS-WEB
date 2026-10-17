/* Isolated platform search handoff for JARVIS Web.
   Opens supported platforms with the user's query in a URL when available.
   Normal web security prevents this page from typing/clicking inside unrelated sites. */
(() => {
  "use strict";

  const platforms = [
    { names: ["chatgpt", "chat gpt"], label: "ChatGPT", base: "https://chatgpt.com/", param: "q", kind: "ai" },
    { names: ["claude"], label: "Claude", base: "https://claude.ai/new", param: "q", kind: "ai" },
    { names: ["grok"], label: "Grok", base: "https://grok.com/", param: "q", kind: "ai" },
    { names: ["perplexity"], label: "Perplexity", base: "https://www.perplexity.ai/search", param: "q", kind: "search" },
    { names: ["gemini", "google gemini"], label: "Google Gemini", base: "https://gemini.google.com/app", param: "q", kind: "ai" },
    { names: ["google", "google search"], label: "Google", base: "https://www.google.com/search", param: "q", kind: "search" },
    { names: ["bing", "microsoft bing"], label: "Bing", base: "https://www.bing.com/search", param: "q", kind: "search" },
    { names: ["duckduckgo", "duck duck go"], label: "DuckDuckGo", base: "https://duckduckgo.com/", param: "q", kind: "search" },
    { names: ["brave search", "brave"], label: "Brave Search", base: "https://search.brave.com/search", param: "q", kind: "search" },
    { names: ["youtube", "you tube"], label: "YouTube", base: "https://www.youtube.com/results", param: "search_query", kind: "search" },
    { names: ["youtube music"], label: "YouTube Music", base: "https://music.youtube.com/search", param: "q", kind: "search" },
    { names: ["wikipedia", "wiki"], label: "Wikipedia", base: "https://en.wikipedia.org/w/index.php", param: "search", kind: "search" },
    { names: ["github", "git hub"], label: "GitHub", base: "https://github.com/search", param: "q", kind: "search" },
    { names: ["stackoverflow", "stack overflow"], label: "Stack Overflow", base: "https://stackoverflow.com/search", param: "q", kind: "search" },
    { names: ["reddit"], label: "Reddit", base: "https://www.reddit.com/search/", param: "q", kind: "search" },
    { names: ["amazon"], label: "Amazon", base: "https://www.amazon.com/s", param: "k", kind: "search" },
    { names: ["facebook"], label: "Facebook", base: "https://www.facebook.com/search/top/", param: "q", kind: "search" },
    { names: ["instagram"], label: "Instagram", base: "https://www.instagram.com/", param: "", kind: "home" },
    { names: ["x", "twitter"], label: "X", base: "https://x.com/search", param: "q", kind: "search" },
    { names: ["tiktok", "tik tok"], label: "TikTok", base: "https://www.tiktok.com/search", param: "q", kind: "search" },
    { names: ["linkedin", "linked in"], label: "LinkedIn", base: "https://www.linkedin.com/search/results/all/", param: "keywords", kind: "search" },
    { names: ["pinterest"], label: "Pinterest", base: "https://www.pinterest.com/search/pins/", param: "q", kind: "search" },
    { names: ["medium"], label: "Medium", base: "https://medium.com/search", param: "q", kind: "search" },
    { names: ["arxiv", "arxiv.org"], label: "arXiv", base: "https://arxiv.org/search/", param: "query", kind: "search" }
  ].sort((a, b) => Math.max(...b.names.map(n => n.length)) - Math.max(...a.names.map(n => n.length)));

  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const platformPattern = platforms.flatMap(p => p.names.map(name => ({ ...p, name })))
    .map(p => ({ ...p, regex: new RegExp("(?<![\\w])" + escapeRegExp(p.name) + "(?![\\w])", "i") }));

  function clean(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b[,: ]*/i, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findPlatform(text) {
    for (const item of platformPattern) {
      if (item.regex.test(text)) return { ...item, match: item.name };
    }
    return null;
  }

  function buildUrl(platform, query) {
    if (platform.kind === "home" || !query) return platform.base;
    const separator = platform.base.includes("?") ? "&" : "?";
    return platform.base + separator + encodeURIComponent(platform.param) + "=" + encodeURIComponent(query);
  }

  function showFallback(url, platform, query) {
    let box = document.getElementById("jarvis-platform-search-fallback");
    if (!box) {
      box = document.createElement("div");
      box.id = "jarvis-platform-search-fallback";
      Object.assign(box.style, {
        position: "fixed", zIndex: "2147483647", left: "50%", bottom: "90px",
        transform: "translateX(-50%)", width: "min(90vw,560px)", padding: "14px",
        border: "1px solid #00eaff", borderRadius: "12px", background: "rgba(2,12,28,.98)",
        color: "#d8fbff", font: "14px/1.45 system-ui,sans-serif", boxShadow: "0 0 20px rgba(0,220,255,.3)"
      });
      document.body.appendChild(box);
    }
    box.replaceChildren();
    const text = document.createElement("p");
    text.textContent = "Your browser blocked a new tab. Tap below to open " + platform.label + (query ? " for: " + query : "") + ".";
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "OPEN " + platform.label.toUpperCase();
    Object.assign(link.style, { display: "inline-block", marginTop: "10px", padding: "10px 14px", border: "1px solid #00eaff", borderRadius: "8px", color: "#d8fbff", textDecoration: "none", fontWeight: "700" });
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "CLOSE";
    Object.assign(close.style, { marginLeft: "8px", padding: "10px 14px", border: "1px solid #527b8a", borderRadius: "8px", background: "transparent", color: "#d8fbff" });
    close.addEventListener("click", () => box.remove());
    box.append(text, link, close);
  }

  function openPlatform(platform, query) {
    const url = buildUrl(platform, query);
    const tab = window.open(url, "_blank");
    if (!tab) {
      showFallback(url, platform, query);
      return false;
    }
    try { tab.opener = null; } catch (_) {}
    return true;
  }

  function parseCommand(rawCommand) {
    let text = clean(rawCommand);
    if (!text) return null;

    // Also accept: "open ChatGPT, search NASA".
    text = text.replace(/^open\s+(.+?)\s*[,;:]\s*(?:then\s+)?/, "search $1 about ");

    const intent = /^(?:please\s+)?(?:search|look up|find|ask|query)\b/i.exec(text);
    if (!intent) return null;

    const platform = findPlatform(text);
    if (!platform) return null;
    const platformName = platform.name;

    let query = "";
    const escapedName = escapeRegExp(platformName);
    const leadingPlatform = new RegExp("^(?:please\\s+)?(?:search|look up|find|ask|query)\\s+(?:" + escapedName + ")\\s*(?:(?:about|for|regarding|to)\\s+|[:,-]\\s*)?(.*)$", "i");
    const leadingMatch = text.match(leadingPlatform);

    if (leadingMatch) {
      query = leadingMatch[1] || "";
    } else {
      const trailingPlatform = new RegExp("^(?:please\\s+)?(?:search|look up|find|ask|query)\\s+(.+?)\\s+(?:on|in|using|with)\\s+" + escapedName + "\\s*$", "i");
      const trailingMatch = text.match(trailingPlatform);
      if (trailingMatch) {
        query = trailingMatch[1] || "";
      } else {
        // "Search ChatGPT about black holes" and "Ask Claude to explain wormholes".
        const platformIndex = text.search(platform.regex);
        if (platformIndex >= 0) {
          const before = text.slice(0, platformIndex).trim();
          const after = text.slice(platformIndex + platform.match.length).trim();
          if (/^(?:please\\s+)?(?:search|look up|find|ask|query)$/.test(before)) {
            query = after.replace(/^(?:about|for|regarding|to explain|to search|to find)\s+/i, "");
          } else {
            return null;
          }
        }
      }
    }

    query = query
      .replace(/^(?:about|for|regarding|to explain|to search|to find)\s+/i, "")
      .replace(/\b(?:on|in|using|with)\s+$/i, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\\s+/g, " ")
      .trim();

    if (!query) return null;
    return { platform, query };
  }

  window.jarvisHandlePlatformSearch = function(command) {
    const parsed = parseCommand(command);
    if (!parsed) return null;
    const { platform, query } = parsed;
    const opened = openPlatform(platform, query);
    const message = opened
      ? (platform.kind === "ai"
        ? "Opening " + platform.label + " with your prompt: " + query + ". Some platforms may require you to press Send."
        : "Searching " + platform.label + " for " + query + ".")
      : "I prepared the " + platform.label + " search for " + query + ". Tap the OPEN button because your browser blocked the new tab.";
    return { ok: true, reply: message };
  };
})();