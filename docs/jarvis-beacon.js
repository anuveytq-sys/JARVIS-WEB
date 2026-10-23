/* JARVIS // BEACON PROTOCOL
 * Independent cross-device browser companion. Does not patch or replace JARVIS Main.
 * Browser security/OS limits still apply: no universal overlay over other apps and no
 * guaranteed background microphone on iOS/mobile browsers.
 */
(function () {
  "use strict";
  if (window.JARVISBeacon && window.JARVISBeacon.version === "1.0.0") return;

  var root = null, statusNode = null, inputNode = null, recognition = null;
  var listening = false, wantListening = false, restartTimer = 0;
  var STORAGE_KEY = "jarvisBeaconPreferencesV1";
  var prefs = { autoListen: false, minimized: true };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); } catch (_) {}
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (_) {} }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }
  function clean(v) {
    return String(v || "").trim()
      .replace(/^(?:(?:hey|hello|hi|okay|ok)s+)?jarvis[s,:;-]*/i, "")
      .replace(/^(?:pleases+|can yous+|could yous+|would yous+)/i, "")
      .replace(/[.!?]+$/, "").replace(/s+/g, " ").trim();
  }
  function speak(message) {
    try {
      if (typeof window.speak === "function") window.speak(message);
      else if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
      }
    } catch (_) {}
  }
  function status(message, error) {
    if (statusNode) {
      statusNode.textContent = message;
      statusNode.style.color = error ? "#ffb6b6" : "#9cefff";
    }
  }
  function sayStatus(message, error) { status(message, error); if (message) speak(message); }
  function ensureStyle() {
    if (document.getElementById("jarvis-beacon-style")) return;
    var style = document.createElement("style");
    style.id = "jarvis-beacon-style";
    style.textContent = `
      #jarvis-beacon{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;color:#d9fbff;font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box;max-width:calc(100vw - 24px);touch-action:manipulation}
      #jarvis-beacon *{box-sizing:border-box}
      #jarvis-beacon .jb-orb{width:54px;height:54px;border-radius:50%;border:1px solid #43edff;background:radial-gradient(circle at 35% 30%,#d8ffff 0,#00cce8 18%,#064b8e 48%,#020b20 75%);box-shadow:0 0 12px #00d9ff,0 0 32px #007cff80,inset 0 0 12px #00eaff80;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;letter-spacing:1px;cursor:pointer}
      #jarvis-beacon .jb-orb:after{content:"";position:absolute;width:64px;height:64px;border:1px solid #00cfff70;border-radius:50%;pointer-events:none;animation:jbPulse 3s ease-out infinite}
      #jarvis-beacon .jb-card{width:min(340px,calc(100vw - 24px));margin-bottom:9px;border:1px solid #00d9ff99;border-radius:14px;background:linear-gradient(145deg,#061b31f5,#020713f7);box-shadow:0 8px 35px #000a,0 0 24px #008cff2b;backdrop-filter:blur(16px);overflow:hidden}
      #jarvis-beacon .jb-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #00d9ff35;gap:8px}
      #jarvis-beacon .jb-title{font-weight:800;letter-spacing:2px;color:#74f2ff;font-size:11px}
      #jarvis-beacon .jb-sub{font-size:10px;color:#6da2b9;margin-top:2px}
      #jarvis-beacon button,#jarvis-beacon input{font:inherit}
      #jarvis-beacon button{border:1px solid #00cce877;background:#06243b;color:#c9faff;border-radius:8px;padding:7px 9px;cursor:pointer}
      #jarvis-beacon button:focus-visible,#jarvis-beacon input:focus-visible{outline:2px solid #fff;outline-offset:2px}
      #jarvis-beacon .jb-body{padding:11px}
      #jarvis-beacon .jb-inputrow{display:flex;gap:6px}
      #jarvis-beacon input{min-width:0;width:100%;background:#010b18;border:1px solid #00bddd66;border-radius:8px;padding:10px;color:#e6fcff}
      #jarvis-beacon .jb-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
      #jarvis-beacon .jb-status{font-size:11px;min-height:30px;color:#9cefff;margin-top:8px;overflow-wrap:anywhere}
      #jarvis-beacon .jb-hint{font-size:10px;color:#7199ad;margin-top:7px}
      #jarvis-beacon[hidden],#jarvis-beacon .jb-card[hidden],#jarvis-beacon .jb-orb[hidden]{display:none!important}
      @keyframes jbPulse{0%{transform:scale(.9);opacity:.8}100%{transform:scale(1.35);opacity:0}}
      @media(prefers-reduced-motion:reduce){#jarvis-beacon .jb-orb:after{animation:none}}
    `;
    document.head.appendChild(style);
  }
  function render() {
    if (root && document.body.contains(root)) {
      root.querySelector(".jb-card").hidden = !!prefs.minimized;
      root.querySelector(".jb-orb").hidden = !prefs.minimized;
      return;
    }
    ensureStyle();
    root = document.createElement("aside");
    root.id = "jarvis-beacon";
    root.setAttribute("aria-label", "JARVIS Beacon command panel");
    root.innerHTML = `
      <section class="jb-card" ${prefs.minimized ? "hidden" : ""}>
        <header class="jb-head"><div><div class="jb-title">JARVIS // BEACON</div><div class="jb-sub">QUICK COMMAND • MAIN HUD INDEPENDENT</div></div><button type="button" data-action="minimize" aria-label="Minimize Beacon">—</button></header>
        <div class="jb-body">
          <form class="jb-inputrow" data-form><input type="text" data-input autocomplete="off" placeholder="Say or type a command…" aria-label="Beacon command"><button type="submit">GO</button></form>
          <div class="jb-actions"><button type="button" data-action="listen">🎙 Listen</button><button type="button" data-action="stop">■ Stop</button><button type="button" data-action="main">Main JARVIS</button></div>
          <div class="jb-status" role="status" aria-live="polite" data-status>Beacon ready. Tap Listen and allow microphone access.</div>
          <div class="jb-hint">Try: “open YouTube and search MrBeast”, “ask ChatGPT about black holes”, “search Google for NASA”.</div>
        </div>
      </section>
      <button class="jb-orb" type="button" data-action="expand" aria-label="Open JARVIS Beacon" ${prefs.minimized ? "" : "hidden"}>J</button>
    `;
    document.body.appendChild(root);
    statusNode = root.querySelector("[data-status]");
    inputNode = root.querySelector("[data-input]");
    root.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var action = button.getAttribute("data-action");
      if (action === "minimize") { prefs.minimized = true; persist(); render(); }
      if (action === "expand") { prefs.minimized = false; persist(); render(); if (inputNode) inputNode.focus(); }
      if (action === "listen") startListening(true);
      if (action === "stop") stopListening(true);
      if (action === "main") restoreMain();
    });
    root.querySelector("[data-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      var command = inputNode.value;
      inputNode.value = "";
      handleCommand(command);
    });
  }
  function restoreMain() {
    prefs.minimized = true; persist(); stopListening(false);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) { window.scrollTo(0, 0); }
    var main = document.querySelector(".app, main, #app, #root");
    if (main && main.scrollIntoView) main.scrollIntoView({ behavior: "smooth", block: "start" });
    sayStatus("Main JARVIS is in this tab. Beacon has been minimized.");
    render();
  }
  function openExternal(url, label) {
    var w = null;
    try { w = window.open(url, "_blank", "noopener,noreferrer"); } catch (_) {}
    if (w) {
      sayStatus("Opening " + label + ". Beacon stays available in the JARVIS tab, but browsers do not float it over the other tab or app.");
      return true;
    }
    // Don't replace the JARVIS tab silently: provide a visible link the user can tap.
    statusNode.innerHTML = "";
    var msg = document.createElement("span");
    msg.textContent = "Popup blocked. Tap to open " + label + ": ";
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Open " + label;
    a.style.cssText = "color:#74f2ff;text-decoration:underline";
    statusNode.appendChild(msg); statusNode.appendChild(a);
    speak("Your browser blocked a new tab. Tap the open link for " + label + ".");
    return true;
  }
  function searchUrl(provider, query) {
    var q = encodeURIComponent(query);
    if (provider === "youtube") return "https://www.youtube.com/results?search_query=" + q;
    if (provider === "google") return "https://www.google.com/search?q=" + q;
    if (provider === "chatgpt") return "https://chatgpt.com/?q=" + q;
    if (provider === "claude") return "https://claude.ai/new?q=" + q;
    if (provider === "grok") return "https://x.com/i/grok?query=" + q;
    if (provider === "bing") return "https://www.bing.com/search?q=" + q;
    if (provider === "duckduckgo") return "https://duckduckgo.com/?q=" + q;
    return "https://www.google.com/search?q=" + q;
  }
  function handleCommand(raw) {
    var c = clean(raw);
    if (!c) return false;
    if (/^(?:go back to |return to |show |open )?(?:the )?(?:main )?jarvis(?: main| website| hud)?$/i.test(c) || /^(?:restore|return to) (?:the )?main jarvis$/i.test(c)) {
      restoreMain(); return true;
    }
    if (/^(?:stop|mute|stop listening|beacon stop)$/i.test(c)) { stopListening(true); return true; }
    if (/^(?:start|begin|resume) listening$/i.test(c)) { startListening(true); return true; }
    var m;
    // Reuse the existing, separately loaded contact/call handler rather than replacing it.
    if (/^(?:call|phone|dial|video call|voice call|make (?:a )?(?:video )?call to|whatsapp video call|whatsapp call)\b/i.test(c) && window.JARVISCalling && typeof window.JARVISCalling.handleCommand === "function") {
      try { if (window.JARVISCalling.handleCommand(c)) { sayStatus("Handing the call request to JARVIS Calling. Confirm the call in the phone or messaging app."); return true; } } catch (_) {}
    }
    m = c.match(/^(?:open|launch|go to|switch to)\s+(?:youtube\s+(?:and\s+)?search\s+(.+)|search\s+(.+)\s+on\s+youtube)$/i);
    if (m) return openExternal(searchUrl("youtube", (m[1] || m[2]).replace(/\s+on\s+youtube$/i, "")), "YouTube search");
    m = c.match(/^open\s+youtube\s+search\s+(.+)$/i);
    if (m) return openExternal(searchUrl("youtube", m[1].replace(/\s+on\s+youtube$/i, "")), "YouTube search");
    m = c.match(/^(?:open|launch|go to)\s+(?:youtube|yt)(?:\s+app)?(?:\s+and\s+search\s+(.+))?$/i);
    if (m) return openExternal(m[1] ? searchUrl("youtube", m[1]) : "https://www.youtube.com/", "YouTube");
    m = c.match(/^(?:search\s+google\s+(?:for|about)\s+|google\s+(?:search\s+)?(?:for|about)\s+|search\s+(?:google\s+)?for\s+)(.+)$/i);
    if (m) return openExternal(searchUrl("google", m[1]), "Google search");
    m = c.match(/^(?:ask\s+)?chatgpt\s+(?:about|to explain|to tell me about|what is|who is)\s+(.+)$/i);
    if (m) return openExternal(searchUrl("chatgpt", m[1]), "ChatGPT");
    m = c.match(/^(?:ask\s+)?claude\s+(?:about|to explain|to tell me about|what is|who is)\s+(.+)$/i);
    if (m) return openExternal(searchUrl("claude", m[1]), "Claude");
    m = c.match(/^(?:ask\s+)?grok\s+(?:about|to explain|to tell me about|what is|who is)\s+(.+)$/i);
    if (m) return openExternal(searchUrl("grok", m[1]), "Grok");
    m = c.match(/^(?:ask\s+)?(chatgpt|claude|grok)\s+(.+)$/i);
    if (m) return openExternal(searchUrl(m[1].toLowerCase(), m[2]), m[1]);
    m = c.match(/^(?:search|look up|find)\s+(?:google\s+)?(?:for\s+)?(.+)$/i);
    if (m) return openExternal(searchUrl("google", m[1]), "Google search");
    m = c.match(/^(?:go back to|return to|switch back to)\s+(.+)$/i);
    if (m) {
      var returnTarget = m[1].trim();
      if (/^(?:main )?jarvis(?: main| website| hud)?$/i.test(returnTarget)) { restoreMain(); return true; }
      return handleCommand("open " + returnTarget);
    }
    m = c.match(/^(?:open|launch|go to|switch to|visit)\s+(.+)$/i);
    if (m) {
      var target = m[1].trim();
      var known = {
        "whatsapp":"https://web.whatsapp.com/", "whatsapp web":"https://web.whatsapp.com/",
        "chatgpt":"https://chatgpt.com/", "claude":"https://claude.ai/",
        "grok":"https://x.com/i/grok", "google":"https://www.google.com/",
        "gmail":"https://mail.google.com/", "maps":"https://maps.google.com/",
        "google maps":"https://maps.google.com/", "github":"https://github.com/",
        "instagram":"https://www.instagram.com/", "facebook":"https://www.facebook.com/",
        "discord":"https://discord.com/app", "telegram":"https://web.telegram.org/",
        "spotify":"https://open.spotify.com/", "youtube":"https://www.youtube.com/",
        "netflix":"https://www.netflix.com/", "amazon":"https://www.amazon.in/"
      };
      var key = target.toLowerCase().replace(/\s+app$/, "");
      if (known[key]) return openExternal(known[key], target);
      if (/^(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(target)) {
        var url = /^https?:\/\//i.test(target) ? target : "https://" + target;
        return openExternal(url, target);
      }
      return openExternal(searchUrl("google", target), "web search for " + target);
    }
    sayStatus("I couldn't safely match that command. Try “open YouTube and search MrBeast”, “ask ChatGPT about black holes”, or “call Jayanth”.");
    return false;
  }
  function stopListening(announce) {
    wantListening = false; listening = false;
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = 0; }
    try { if (recognition) recognition.stop(); } catch (_) {}
    if (announce) sayStatus("Beacon microphone stopped.");
    else status("Microphone stopped.");
  }
  function startListening(userInitiated) {
    var Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      sayStatus("Voice recognition is not supported in this browser. Use the command box, or try a supported Chromium browser.");
      return false;
    }
    if (listening) { status("Beacon is listening. Say a command after “Hey Jarvis”."); return true; }
    wantListening = true;
    try {
      recognition = new Speech();
      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = function () { listening = true; status("Listening when this page is active. Say a command; use Stop to pause."); };
      recognition.onresult = function (event) {
        var result = event.results && event.results[event.results.length - 1];
        if (!result || !result[0]) return;
        var transcript = String(result[0].transcript || "").trim();
        if (!transcript) return;
        status("Heard: " + transcript);
        handleCommand(transcript);
      };
      recognition.onerror = function (event) {
        listening = false;
        if (event && (event.error === "not-allowed" || event.error === "service-not-allowed")) {
          wantListening = false;
          status("Microphone permission was denied. Enable it in browser settings and tap Listen again.", true);
        } else if (event && event.error === "no-speech") {
          status("Still ready. If listening stopped, tap Listen again.");
        } else {
          status("Voice service paused (" + (event && event.error || "unavailable") + "). Use the command box or tap Listen again.", true);
        }
      };
      recognition.onend = function () {
        listening = false;
        if (wantListening && !document.hidden) restartTimer = window.setTimeout(function () {
          restartTimer = 0;
          if (!wantListening || document.hidden) return;
          try { recognition.start(); } catch (_) {}
        }, 700);
        else if (wantListening) status("Beacon is paused while this tab is hidden. Return to this tab and tap Listen.");
      };
      recognition.start();
      if (userInitiated) status("Requesting microphone access…");
      return true;
    } catch (_) {
      listening = false; wantListening = false;
      sayStatus("Couldn't start the microphone. Check browser permissions and try again.");
      return false;
    }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = 0; }
      if (listening) { try { recognition.stop(); } catch (_) {} }
      listening = false;
    } else if (wantListening) {
      status("Page active again. Tap Listen to resume microphone access.");
    }
  });
  window.JARVISBeacon = {
    version: "1.0.0",
    handleCommand: handleCommand,
    startListening: function () { return startListening(true); },
    stopListening: function () { stopListening(true); },
    restoreMain: restoreMain,
    commands: ["open YouTube and search MrBeast", "ask ChatGPT about black holes", "ask Claude about NASA", "ask Grok about wormholes", "search Google about NASA", "call Jayanth", "video call Jayanth", "open WhatsApp"]
  };
  function init() {
    render();
    status("Beacon ready. Tap Listen and allow microphone access.");
    // Do not request microphone automatically; browser permission must be user-initiated.
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();