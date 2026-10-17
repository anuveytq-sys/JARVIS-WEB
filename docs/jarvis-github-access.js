/* JARVIS GitHub command access.
   Isolated browser-side navigation/search layer.
   Does not alter wake-word, microphone, speech recognition, or voice settings.
   Authenticated/private results depend on the user's existing GitHub sign-in. */
(() => {
  "use strict";
  if (window.__JARVIS_GITHUB_ACCESS_V1__) return;
  window.__JARVIS_GITHUB_ACCESS_V1__ = true;

  const USERNAME = "anuveytq-sys";
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

  function parseCommand(raw) {
    const text = clean(raw);
    if (!text) return null;
    let m;

    // Direct repository path: "open repository owner/name".
    m = text.match(/^(?:please\s+)?(?:open|go to|visit)\s+(?:the\s+)?(?:github\s+)?(?:repository|repo)\s+([a-z0-9-]+\/[a-z0-9._-]+)$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "repository " + m[1] };

    // Natural example: "open userscanner repository".
    // Search GitHub's Repositories tab, prioritizing the user's own account.
    m = text.match(/^(?:please\s+)?(?:open|find|show|look up|go to)\s+(?:the\s+)?(.+?)\s+(?:github\s+)?(?:repository|repo)$/i);
    if (m) {
      const name = m[1].replace(/^github\s+/i, "").trim();
      if (!name || /^(?:my|a|the)$/i.test(name)) return null;
      const query = /\buser:[a-z0-9-]+\b/i.test(name) ? name : name + " user:" + USERNAME;
      return { url: searchUrl(query, "repositories"), label: "GitHub repository search for " + name };
    }

    // "open GitHub repository userscanner" / "search repositories for userscanner".
    m = text.match(/^(?:please\s+)?(?:open|search|find|look up)\s+(?:github\s+)?(?:repositories|repos)\s+(?:for|named|called)\s+(.+)$/i);
    if (m) return { url: searchUrl(m[1], "repositories"), label: "GitHub repository search for " + m[1] };

    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+(.+?)\s+(?:in|on)\s+github\s+repositories$/i);
    if (m) return { url: searchUrl(m[1], "repositories"), label: "GitHub repository search for " + m[1] };

    // "search GitHub user anuveytq-sys" or "search anuveytq-sys username on GitHub".
    m = text.match(/^(?:please\s+)?(?:open|search|find|look up)\s+(?:the\s+)?(?:github\s+)?(?:user|username|profile)\s+([a-z0-9-]+)$/i);
    if (!m) m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+([a-z0-9-]+)\s+(?:github\s+)?(?:user|username|profile)(?:\s+on\s+github)?$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "GitHub profile " + m[1] };

    m = text.match(/^(?:please\s+)?(?:open|go to|visit)\s+(?:the\s+)?github\s+(?:profile|user)\s+([a-z0-9-]+)$/i);
    if (m) return { url: "https://github.com/" + m[1], label: "GitHub profile " + m[1] };

    // Search GitHub code, issues, or pull requests.
    m = text.match(/^(?:please\s+)?(?:search|find)\s+github\s+(code|issues?|pull requests?|prs)\s+(?:for|about)\s+(.+)$/i);
    if (m) {
      const kind = /^code$/i.test(m[1]) ? "code" : /^issues?$/i.test(m[1]) ? "issues" : "pullrequests";
      return { url: searchUrl(m[2], kind), label: "GitHub " + kind + " search for " + m[2] };
    }

    // General GitHub search.
    m = text.match(/^(?:please\s+)?(?:search|find|look up)\s+github\s+(?:for\s+)?(.+)$/i);
    if (m) return { url: searchUrl(m[1], ""), label: "GitHub search for " + m[1] };

    if (/^(?:open|launch|go to)\s+github$/i.test(text)) {
      return { url: "https://github.com/", label: "GitHub" };
    }
    return null;
  }

  function showReply(message, error = false) {
    try {
      if (typeof window.showReply === "function") {
        window.showReply(message, error ? "error" : "reply");
      } else if (typeof window.speak === "function") {
        window.speak(message);
      }
    } catch (_) {}
  }

  function openResult(item) {
    const tab = window.open(item.url, "_blank", "noopener,noreferrer");
    if (tab) {
      showReply("Opening " + item.label + " on GitHub.");
      return;
    }
    // Speech-triggered popups may be blocked by the browser; show a safe tap-to-open link.
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

  // Catch text submissions before other command handlers. The original voice
  // recognition and wake-word pipeline are left untouched.
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

  // Voice commands already flow through sendCommand(). Intercept only the
  // GitHub-specific phrases and pass every other command to the original.
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