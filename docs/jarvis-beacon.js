/* JARVIS // BEACON PROTOCOL v2.1 bootstrap
 * Keeps the proven Beacon implementation from commit acd22ec49f7a78a97533dc86a73acba47ce17202,
 * then adds a web-app command bridge so compound commands such as
 * "close Jarvis and open YouTube" trigger Beacon before the main command flow navigates.
 * This is additive: the original Beacon UI/commands remain unchanged.
 */
(function () {
  "use strict";

  var LEGACY = "https://raw.githubusercontent.com/anuveytq-sys/JARVIS-WEB/acd22ec49f7a78a97533dc86a73acba47ce17202/docs/jarvis-beacon.js";
  var bridgeInstalled = false;

  function loadLegacy() {
    if (window.JARVISBeacon && window.JARVISBeacon.version === "2.0.0") {
      installBridge();
      return;
    }
    if (document.querySelector('script[data-jarvis-beacon-legacy="true"]')) return;
    var s = document.createElement("script");
    s.src = LEGACY;
    s.async = false;
    s.dataset.jarvisBeaconLegacy = "true";
    s.onload = installBridge;
    s.onerror = function () {
      // Do not disturb the rest of JARVIS if the pinned compatibility source is unavailable.
      console.warn("JARVIS Beacon legacy core could not be loaded");
    };
    (document.head || document.documentElement).appendChild(s);
  }

  function normalize(text) {
    return String(text || "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCompoundExternal(text) {
    var c = normalize(text).toLowerCase();
    return /\b(?:close|shut|hide|minimize|exit|leave)\s+(?:the\s+)?jarvis\b[\s\S]*\b(?:and\s+)?(?:open|launch|go\s+to|switch\s+to|visit)\b/i.test(c);
  }

  function extractExternalTarget(text) {
    var c = normalize(text);
    var m = c.match(/\b(?:and\s+)?(?:open|launch|go\s+to|switch\s+to|visit)\s+(.+)$/i);
    return m ? normalize(m[1]) : "";
  }

  function triggerBeaconForCompound(text) {
    if (!isCompoundExternal(text)) return false;
    var target = extractExternalTarget(text);
    if (!target) return false;

    try {
      if (window.JARVISBeacon && typeof window.JARVISBeacon.handleCommand === "function") {
        // Let the existing Beacon parser perform the actual external navigation.
        // This preserves its existing YouTube/Google/ChatGPT/Claude/Grok/site handling.
        var command = "open " + target;
        if (window.JARVISBeacon.handleCommand(command)) return true;
      }
      if (window.JARVISBeacon && typeof window.JARVISBeacon.enterBeaconMode === "function") {
        window.JARVISBeacon.enterBeaconMode();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function extractCommandFromPayload(payload) {
    var candidates = [];
    function walk(value, depth) {
      if (depth > 5 || value == null) return;
      if (typeof value === "string") {
        candidates.push(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(function (v) { walk(v, depth + 1); });
        return;
      }
      if (typeof value === "object") {
        Object.keys(value).forEach(function (key) {
          var k = key.toLowerCase();
          if (/command|transcript|prompt|query|text|message|input|utterance|speech/.test(k)) walk(value[key], depth + 1);
          else if (depth < 2) walk(value[key], depth + 1);
        });
      }
    }
    try { walk(JSON.parse(payload), 0); } catch (_) {}
    return candidates.find(isCompoundExternal) || "";
  }

  function installFetchBridge() {
    if (window.__JARVIS_BEACON_FETCH_BRIDGE__) return;
    var originalFetch = window.fetch;
    if (typeof originalFetch !== "function") return;
    window.__JARVIS_BEACON_FETCH_BRIDGE__ = true;

    window.fetch = function (input, init) {
      var url = "";
      try { url = typeof input === "string" ? input : (input && input.url) || ""; } catch (_) {}
      var interesting = /\/api\/(?:command|voice)(?:[/?#]|$)/i.test(url);
      if (!interesting) return originalFetch.apply(this, arguments);

      var request = null;
      try { request = input instanceof Request ? input.clone() : new Request(input, init); } catch (_) {}

      if (!request || !request.body) return originalFetch.apply(this, arguments);

      return request.text().then(function (body) {
        var command = extractCommandFromPayload(body);
        if (command) {
          // Main JARVIS can continue its normal request/navigation path; Beacon is
          // activated first so the contracted HUD is already visible on iPhone.
          triggerBeaconForCompound(command);
        }
        return originalFetch.apply(window, arguments);
      }).catch(function () {
        return originalFetch.apply(window, arguments);
      });
    };
  }

  function installCommandEventBridge() {
    if (window.__JARVIS_BEACON_COMMAND_EVENTS__) return;
    window.__JARVIS_BEACON_COMMAND_EVENTS__ = true;

    // Covers web-app UIs that submit a command through a normal form/input rather
    // than the fetch bridge. It only reacts to the explicit compound external form.
    document.addEventListener("submit", function (event) {
      try {
        var form = event.target;
        if (!form || !form.querySelector) return;
        var input = form.querySelector("input,textarea");
        if (input && triggerBeaconForCompound(input.value)) return;
      } catch (_) {}
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.isComposing) return;
      try {
        var active = document.activeElement;
        if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) triggerBeaconForCompound(active.value);
      } catch (_) {}
    }, true);
  }

  function installBridge() {
    if (bridgeInstalled) return;
    bridgeInstalled = true;
    installFetchBridge();
    installCommandEventBridge();

    if (window.JARVISBeacon) {
      var original = window.JARVISBeacon.handleCommand;
      if (typeof original === "function" && !window.JARVISBeacon.__compoundFix) {
        var wrapped = function (raw) {
          if (isCompoundExternal(raw)) {
            var target = extractExternalTarget(raw);
            if (target) return original.call(window.JARVISBeacon, "open " + target);
          }
          return original.call(window.JARVISBeacon, raw);
        };
        Object.keys(window.JARVISBeacon).forEach(function (key) {
          // Keep all existing public methods/properties intact.
          if (key !== "handleCommand") wrapped[key] = window.JARVISBeacon[key];
        });
        wrapped.handleCommand = wrapped;
        wrapped.__compoundFix = true;
        window.JARVISBeacon.handleCommand = wrapped;
      }
      window.JARVISBeacon.version = "2.1.0";
    }
  }

  loadLegacy();
  // The bridge must be installed immediately as well, because jarvis-web.js is
  // loaded later in the Pages build and captures the current fetch function.
  installFetchBridge();
  installCommandEventBridge();
  window.addEventListener("load", installBridge, { once: true });
})();