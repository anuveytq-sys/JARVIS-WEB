/* JARVIS GitHub command access.
   Universal public GitHub search/navigation. Does not alter microphone or wake-word code.
   Private repository access/actions still require explicit GitHub authentication and permissions. */
(() => {
  "use strict";
  if (window.__JARVIS_GITHUB_ACCESS_V1__) return;
  window.__JARVIS_GITHUB_ACCESS_V1__ = true;

  const input = () => document.getElementById("commandInput");

  function clean(value) {
    return String(value || "")
      .trim()
      .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b[,: ]*/i, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchUrl(query, type) {
    const params = new URLSearchParams();
    params.set("q", query);
    if (type) params.set("type", type);
    return "https://github.com/search?" + params.toString();
  }

  function directUrl(kind, value) {
    const safe = String(value || "").trim().replace(/^@/, "");
    if (!safe) return null;
    if (kind === "repository") {
      if (/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(safe)) return "https://github.com/" + safe;
      return searchUrl(safe, "repositories");
    }
    if (kind === "user" || kind === "account" || kind === "profile") {
      if (/^[a-z0-9-]+$/i.test(safe)) return "https://github.com/" + safe;
      return searchUrl(safe, "users");
    }
    return null;
  }

  function parseCommand(raw) {
    const text = clean(raw);
    if (!text) return null;
    let m;

    // Explicit owner/repository paths.
    m = text.match(/^(?:please\s+)?(?:open|go to|visit)\s+(?:the\s+)?(?:github\s+)?(?:repository|repo)\s+([a-z0-9-]+\/[a-z0-9._-]+)$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "repository " + m[1] };

    // Repository search is global unless the user explicitly supplies a qualifier.
    m = text.match(/^(?:please\s+)?(?:open|find|show|look up|go to|search)\s+(?:the\s+)?(.+?)\s+(?:github\s+)?(?:repository|repo|repositories|repos)$/i);
    if (m) {
      const term = m[1].trim();
      const value = directUrl("repository", term);
      if (value && /^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(term)) return { url: value, label: "repository " + term };
      return { url: searchUrl(term, "repositories"), label: "global GitHub repository search for " + term };
    }
    m = text.match(/^(?:please\s+)?(?:open|search|find|look up)\s+(?:github\s+)?(?:repositories|repos)\s+(?:for|named|called)\s+(.+)$/i);
    if (m) return { url: searchUrl(m[1], "repositories"), label: "global GitHub repository search for " + m[1] };

    // Users, accounts, profiles: search all GitHub users unless explicitly asking for a known handle.
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(?:github\s+)?(?:users|accounts|profiles)\s+(?:for|named|called)\s+(.+)$/i);
    if (m) return { url: searchUrl(m[1], "users"), label: "GitHub user search for " + m[1] };
    m = text.match(/^(?:please\s+)?(?:open|go to|visit)\s+(?:the\s+)?github\s+(?:user|account|profile)\s+([a-z0-9-]+)$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "GitHub profile " + m[1] };
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+([a-z0-9-]+)\s+(?:github\s+)?(?:user|username|account|profile)(?:\s+on\s+github)?$/i);
    if (m) return { url: searchUrl(m[1], "users"), label: "GitHub user search for " + m[1] };
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(?:github\s+)?(?:user|username|account|profile)\s+(.+)$/i);
    if (m) return { url: searchUrl(m[1], "users"), label: "GitHub user search for " + m[1] };

    // Search any supported GitHub category. Pull requests are issues with is:pr.
    m = text.match(/^(?:please\s+)?(?:search|find|look up|open)\s+(?:github\s+)?(code|issues?|pull requests?|prs|commits?|discussions?|packages?|wikis|topics|users|repositories|repos)\s+(?:for|about|named|called)\s+(.+)$/i);
    if (m) {
      const rawKind = m[1].toLowerCase();
      const query = m[2].trim();
      let type = "repositories";
      let finalQuery = query;
      let labelKind = rawKind;
      if (rawKind === "code") type = "code";
      else if (rawKind === "issue" || rawKind === "issues") type = "issues";
      else if (/^(pull requests?|prs)$/.test(rawKind)) { type = "issues"; finalQuery = "is:pr " + query; labelKind = "pull requests"; }
      else if (/^commits?$/.test(rawKind)) type = "commits";
      else if (/^discussions?$/.test(rawKind)) type = "discussions";
      else if (/^packages?$/.test(rawKind)) type = "packages";
      else if (rawKind === "wikis") type = "wikis";
      else if (rawKind === "topics") { type = "repositories"; finalQuery = "topic:" + query; }
      else if (/^(users)$/.test(rawKind)) type = "users";
      return { url: searchUrl(finalQuery, type), label: "global GitHub " + labelKind + " search for " + query };
    }

    // Flexible phrasing: "find <term> in GitHub issues", "search GitHub for <term> in code".
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(.+?)\s+(?:in|on)\s+github\s+(repositories|repos|code|issues?|pull requests?|prs|users|accounts|commits?|discussions?|packages?|wikis)$/i);
    if (m) {
      const term = m[1].trim(), kind = m[2].toLowerCase();
      const type = /^(repositories|repos)$/.test(kind) ? "repositories"
        : kind === "code" ? "code"
        : /^(users|accounts)$/.test(kind) ? "users"
        : /^commits?$/.test(kind) ? "commits"
        : /^discussions?$/.test(kind) ? "discussions"
        : /^packages?$/.test(kind) ? "packages"
        : /^wikis$/.test(kind) ? "wikis" : "issues";
      const query = /^(pull requests?|prs)$/.test(kind) ? "is:pr " + term : term;
      return { url: searchUrl(query, type), label: "global GitHub " + kind + " search for " + term };
    }

    // Generic global search, preserving the user's terms and GitHub qualifiers.
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(?:on\s+)?github\s+(?:for\s+)?(.+)$/i);
    if (m) return { url: searchUrl(m[1], ""), label: "global GitHub search for " + m[1] };

    // Common direct navigation requests.
    m = text.match(/^(?:please\s+)?(?:open|go to|visit)\s+(?:the\s+)?(?:github\s+)?(?:user|account|profile)\s+([a-z0-9-]+)$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "GitHub profile " + m[1] };
    m = text.match(/^(?:please\s+)?(?:open|launch|go to|visit)\s+github$/i);
    if (m) return { url: "https://github.com/", label: "GitHub" };

    // Broad natural-language fallback only when GitHub is explicitly named.
    if (/\bgithub\b/i.test(text) && /\b(search|find|look up|open)\b/i.test(text)) {
      const term = text.replace(/\b(?:please|github|search|find|look up|open)\b/gi, "").trim();
      if (term) return { url: searchUrl(term, ""), label: "global GitHub search for " + term };
    }
    return null;
  }

  function showReply(message, error = false) {
    try {
      if (typeof window.showReply === "function") window.showReply(message, error ? "error" : "reply");
      else if (typeof window.speak === "function") window.speak(message);
    } catch (_) {}
  }

  function openResult(item) {
    const tab = window.open(item.url, "_blank");
    if (tab) {
      try { tab.opener = null; } catch (_) {}
      showReply("Opening " + item.label + " on GitHub.");
      return;
    }
    let box = document.getElementById("jarvis-github-access-fallback");
    if (!box) {
      box = document.createElement("div");
      box.id = "jarvis-github-access-fallback";
      Object.assign(box.style, {
        position: "fixed", zIndex: "2147483647", left: "50%", bottom: "90px",
        transform: "translateX(-50%)", width: "min(90vw,560px)", padding: "14px",
        border: "1px solid #00d9ff", borderRadius: "12px", background: "rgba(2,12,28,.98)",
        color: "#d8fbff", font: "14px/1.45 system-ui,sans-serif",
        boxShadow: "0 0 20px rgba(0,217,255,.3)"
      });
      document.body.appendChild(box);
    }
    box.replaceChildren();
    const p = document.createElement("p");
    p.textContent = "Tap below to open " + item.label + ". Your browser blocked the new tab.";
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "OPEN ON GITHUB";
    Object.assign(link.style, {
      display: "inline-block", marginTop: "8px", padding: "10px 14px",
      border: "1px solid #00d9ff", borderRadius: "8px", color: "#d8fbff",
      textDecoration: "none", fontWeight: "700"
    });
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "CLOSE";
    Object.assign(close.style, {
      marginLeft: "8px", padding: "10px 14px", border: "1px solid #527b8a",
      borderRadius: "8px", background: "transparent", color: "#d8fbff"
    });
    close.addEventListener("click", () => box.remove());
    box.append(p, link, close);
    showReply("I found the GitHub page. Please tap the on-screen link if the browser blocks opening a new tab.");
  }

  function handle(raw) {
    const item = parseCommand(raw);
    if (!item) return false;
    openResult(item);
    return true;
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "commandForm") return;
    const field = input();
    if (!field || !handle(field.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    field.value = "";
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.target?.id !== "commandInput") return;
    const field = input();
    if (!field || !handle(field.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    field.value = "";
  }, true);

  // Intercept only GitHub-specific phrases; every other voice command follows the original path.
  const wrapSendCommand = () => {
    if (typeof window.sendCommand !== "function" || window.sendCommand.__jarvisGithubWrapped) return false;
    const original = window.sendCommand.bind(window);
    const wrapped = async function(command) {
      if (handle(command)) return;
      return original(command);
    };
    wrapped.__jarvisGithubWrapped = true;
    window.sendCommand = wrapped;
    return true;
  };
  if (!wrapSendCommand()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (wrapSendCommand() || attempts >= 20) window.clearInterval(timer);
    }, 100);
  }

  window.JARVISGitHubAccess = { parseCommand };
})();