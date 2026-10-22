/* JARVIS Share + Home Screen panel v1.1 — isolated, additive PWA control. */
(function () {
  "use strict";
  if (window.JARVISShareControl && window.JARVISShareControl.version === "1.1.0") return;

  var SITE_URL = "https://anuveytq-sys.github.io/JARVIS-WEB/";
  var styleId = "jarvis-share-control-style";
  var buttonId = "jarvis-share-control";
  var panelId = "jarvis-share-panel";
  var installPrompt = null;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    updateInstallButton();
  });
  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    announce("JARVIS has been installed on this device.");
    updateInstallButton();
  });

  function addStyle() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#" + buttonId + "{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:5px;margin-left:8px;padding:7px 10px;border:1px solid rgba(0,234,255,.65);border-radius:7px;background:linear-gradient(135deg,rgba(0,92,140,.45),rgba(0,20,40,.9));color:#bafaff;font:700 9px/1.1 system-ui,sans-serif;letter-spacing:1.1px;white-space:nowrap;cursor:pointer;box-shadow:0 0 12px rgba(0,210,255,.12);}" +
      "#" + buttonId + ":hover{background:rgba(0,150,200,.38);box-shadow:0 0 16px rgba(0,210,255,.3);}" +
      "#" + buttonId + ":focus-visible{outline:2px solid #8ff7ff;outline-offset:3px;}" +
      "#" + panelId + "{position:fixed;z-index:2147483646;top:70px;right:16px;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 100px);overflow:auto;padding:17px;border:1px solid rgba(0,234,255,.7);border-radius:13px;background:linear-gradient(155deg,rgba(2,29,52,.98),rgba(0,7,19,.98));color:#d8fbff;box-shadow:0 0 26px rgba(0,210,255,.2),inset 0 0 20px rgba(0,130,180,.08);font:13px/1.5 system-ui,-apple-system,sans-serif;}" +
      "#" + panelId + "[hidden]{display:none!important}#" + panelId + " .jsp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;color:#8df8ff;font-weight:800;letter-spacing:1.5px;font-size:12px}#" + panelId + " .jsp-close{border:1px solid rgba(0,234,255,.35);border-radius:6px;background:transparent;color:#d8fbff;padding:3px 9px;font-size:16px;cursor:pointer}#" + panelId + " .jsp-copy{color:#9abfce;margin:0 0 12px}#" + panelId + " .jsp-actions{display:grid;grid-template-columns:1fr;gap:8px}#" + panelId + " .jsp-action{width:100%;padding:10px 12px;border:1px solid rgba(0,234,255,.38);border-radius:7px;background:rgba(0,104,150,.18);color:#d8fbff;text-align:left;font:700 11px/1.35 system-ui,sans-serif;letter-spacing:.45px;cursor:pointer}#" + panelId + " .jsp-action:hover{background:rgba(0,150,200,.32)}#" + panelId + " .jsp-help{margin-top:12px;padding:10px;border-left:2px solid #00dfff;background:rgba(0,140,180,.08);color:#b5dce8;font-size:12px}#" + panelId + " .jsp-help ol{padding-left:20px;margin:6px 0 0}#" + panelId + " .jsp-help li{margin:4px 0}" +
      "@media(max-width:480px){#" + buttonId + "{margin-left:5px;padding:7px 7px;font-size:8px;letter-spacing:.5px}.topbar{left:8px!important;right:8px!important;padding-left:10px!important;padding-right:10px!important}.brand-sub{display:none!important}.brand-name{letter-spacing:3px!important}.system-status{gap:5px!important;font-size:7px!important;letter-spacing:1px!important}#" + panelId + "{top:62px;right:8px;width:calc(100vw - 16px);padding:14px}}";
    document.head.appendChild(style);
  }

  function ensureButton() {
    var header = document.querySelector(".topbar");
    if (!header) return;
    var button = document.getElementById(buttonId);
    if (!button) {
      button = document.createElement("button");
      button.id = buttonId;
      button.type = "button";
      button.setAttribute("aria-label", "Share JARVIS and add it to the Home Screen");
      button.title = "Share JARVIS or add it to your Home Screen";
      button.textContent = "SHARE ↗";
      button.addEventListener("click", function () { togglePanel(); });
      var status = header.querySelector(".system-status");
      if (status) status.appendChild(button);
      else header.appendChild(button);
    }
    ensurePanel();
  }

  function ensurePanel() {
    if (document.getElementById(panelId)) return;
    var panel = document.createElement("section");
    panel.id = panelId;
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Share or install JARVIS");
    panel.setAttribute("aria-modal", "false");
    panel.innerHTML =
      '<div class="jsp-head"><span>JARVIS // QUICK ACCESS</span><button class="jsp-close" type="button" aria-label="Close panel">×</button></div>' +
      '<p class="jsp-copy">Share JARVIS with someone or add it to your device Home Screen for app-style access.</p>' +
      '<div class="jsp-actions">' +
      '<button class="jsp-action" type="button" data-action="install">＋ &nbsp; INSTALL / ADD TO HOME SCREEN</button>' +
      '<button class="jsp-action" type="button" data-action="share">↗ &nbsp; SHARE JARVIS</button>' +
      '<button class="jsp-action" type="button" data-action="copy">▣ &nbsp; COPY JARVIS LINK</button>' +
      '</div><div class="jsp-help" id="jarvis-home-screen-help">Choose “Install / Add to Home Screen” for device-specific steps.</div>';
    document.body.appendChild(panel);
    panel.querySelector(".jsp-close").addEventListener("click", function () { panel.hidden = true; });
    panel.addEventListener("click", function (event) {
      var action = event.target && event.target.getAttribute("data-action");
      if (action === "install") installOrExplain();
      if (action === "share") shareNative();
      if (action === "copy") copyLink();
    });
    updateInstallButton();
  }

  function togglePanel() {
    ensurePanel();
    var panel = document.getElementById(panelId);
    panel.hidden = !panel.hidden;
    if (!panel.hidden) updateInstallButton();
  }

  function updateInstallButton() {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var button = panel.querySelector('[data-action="install"]');
    if (!button) return;
    var standalone = isStandalone();
    button.textContent = standalone ? "✓  JARVIS IS INSTALLED" : "＋  INSTALL / ADD TO HOME SCREEN";
    button.disabled = standalone;
    button.style.opacity = standalone ? ".7" : "1";
  }

  function isStandalone() {
    return !!((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true);
  }

  function installOrExplain() {
    if (isStandalone()) {
      showHelp("JARVIS is already running as an installed Home Screen app.");
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") {
          installPrompt = null;
          showHelp("Installation accepted. Look for the JARVIS icon on your Home Screen or app launcher.");
        } else {
          showHelp("Installation was not completed. You can try again here or use your browser menu.");
        }
        updateInstallButton();
      }).catch(function () {
        showHelp("Open your browser menu and choose Install app or Add to Home Screen.");
      });
      return;
    }
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      showHelp("On iPhone or iPad: <ol><li>Tap the browser's Share button (the square with an upward arrow).</li><li>Scroll the share sheet and tap <b>Add to Home Screen</b>. If you do not see it, scroll down or choose Edit Actions.</li><li>Keep the name JARVIS, then tap <b>Add</b>.</li><li>Return to the Home Screen and open the new JARVIS icon.</li></ol><p>Use Safari for this process. The website cannot press Add for you; iOS requires your confirmation.</p>");
    } else if (/Android/i.test(ua)) {
      showHelp("On Android: <ol><li>Open JARVIS in Chrome.</li><li>Tap the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm, then open the JARVIS icon.</li></ol><p>If the install option is missing, reload the page and check again, or use the browser's Add to Home screen option.</p>");
    } else {
      showHelp("On a computer: use your browser's install icon in the address bar, or open the browser menu and choose <b>Install JARVIS</b> / <b>Create shortcut</b>. On a phone, open JARVIS in Safari (iPhone) or Chrome (Android), then use the browser Share/menu and choose <b>Add to Home Screen</b>.");
    }
  }

  function showHelp(html) {
    ensurePanel();
    var help = document.getElementById("jarvis-home-screen-help");
    if (help) help.innerHTML = html;
    var panel = document.getElementById(panelId);
    if (panel) panel.hidden = false;
  }

  function shareNative() {
    var data = { title: "JARVIS — Advanced Personal AI", text: "Try JARVIS, my advanced personal AI assistant.", url: SITE_URL };
    if (navigator.share) {
      navigator.share(data).catch(function (err) {
        if (err && err.name !== "AbortError") copyLink();
      });
    } else {
      copyLink();
    }
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SITE_URL).then(function () {
        announce("JARVIS link copied. You can now paste and share it.");
      }).catch(fallbackCopy);
      return;
    }
    fallbackCopy();
  }

  function fallbackCopy() {
    var field = document.createElement("textarea");
    field.value = SITE_URL;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    field.remove();
    if (ok) announce("JARVIS link copied. You can now paste and share it.");
    else window.prompt("Copy the JARVIS link:", SITE_URL);
  }

  function announce(message) {
    var note = document.getElementById("jarvis-share-feedback");
    if (!note) {
      note = document.createElement("div");
      note.id = "jarvis-share-feedback";
      note.setAttribute("role", "status");
      note.style.cssText = "position:fixed;z-index:2147483647;left:50%;bottom:86px;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:10px 14px;border:1px solid #00dfff;border-radius:8px;background:rgba(0,12,25,.96);color:#d8fbff;font:12px/1.4 system-ui,sans-serif;box-shadow:0 0 18px rgba(0,210,255,.22);text-align:center;";
      document.body.appendChild(note);
    }
    note.textContent = message;
    note.style.display = "block";
    clearTimeout(note._hideTimer);
    note._hideTimer = setTimeout(function () { note.style.display = "none"; }, 3200);
  }

  function init() {
    addStyle();
    ensureButton();
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("./jarvis-reminders-sw.js", { scope: "./" }).catch(function () {});
    }
  }

  window.JARVISShareControl = { version: "1.1.0", share: shareNative, openPanel: togglePanel };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  var attempts = 0;
  var retry = setInterval(function () {
    ensureButton();
    if (document.getElementById(buttonId) || ++attempts > 30) clearInterval(retry);
  }, 500);
})();