/* JARVIS Share Control v1.0 — isolated, additive UI enhancement. */
(function () {
  "use strict";
  if (window.JARVISShareControl) return;

  var SITE_URL = "https://anuveytq-sys.github.io/JARVIS-WEB/";
  var styleId = "jarvis-share-control-style";
  var buttonId = "jarvis-share-control";

  function addStyle() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#" + buttonId + "{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:5px;margin-left:8px;padding:7px 10px;border:1px solid rgba(0,234,255,.65);border-radius:7px;background:linear-gradient(135deg,rgba(0,92,140,.45),rgba(0,20,40,.9));color:#bafaff;font:700 9px/1.1 system-ui,sans-serif;letter-spacing:1.1px;white-space:nowrap;cursor:pointer;box-shadow:0 0 12px rgba(0,210,255,.12);}" +
      "#" + buttonId + ":hover{background:rgba(0,150,200,.38);box-shadow:0 0 16px rgba(0,210,255,.3);}" +
      "#" + buttonId + ":focus-visible{outline:2px solid #8ff7ff;outline-offset:3px;}" +
      "@media(max-width:480px){#" + buttonId + "{margin-left:5px;padding:7px 7px;font-size:8px;letter-spacing:.5px}.topbar{left:8px!important;right:8px!important;padding-left:10px!important;padding-right:10px!important}.brand-sub{display:none!important}.brand-name{letter-spacing:3px!important}.system-status{gap:5px!important;font-size:7px!important;letter-spacing:1px!important;}}";
    document.head.appendChild(style);
  }

  function ensureButton() {
    if (document.getElementById(buttonId)) return;
    var header = document.querySelector(".topbar");
    if (!header) return;
    var status = header.querySelector(".system-status");
    var button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.setAttribute("aria-label", "Share JARVIS");
    button.title = "Share JARVIS with someone";
    button.textContent = "SHARE ↗";
    button.addEventListener("click", share);
    if (status) status.appendChild(button);
    else header.appendChild(button);
  }

  function share() {
    var shareData = {
      title: "JARVIS — Advanced Personal AI",
      text: "Try JARVIS, my advanced personal AI assistant.",
      url: SITE_URL
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function (err) {
        if (err && err.name !== "AbortError") copyLink();
      });
      return;
    }
    copyLink();
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SITE_URL).then(function () {
        announce("JARVIS link copied. You can now paste and share it.");
      }).catch(function () {
        fallbackCopy();
      });
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
  }

  window.JARVISShareControl = { version: "1.0.0", share: share };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  var attempts = 0;
  var retry = setInterval(function () {
    ensureButton();
    if (document.getElementById(buttonId) || ++attempts > 20) clearInterval(retry);
  }, 500);
})();