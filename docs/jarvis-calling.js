/* JARVIS command-only calling and WhatsApp video-call handoff.
   No injected buttons, panels, styles, or HUD changes.
   Browsers cannot read private contacts or press native call buttons;
   this module opens the appropriate app/dialer and leaves confirmation to the user. */
(function () {
  "use strict";
  if (window.JARVISCalling && window.JARVISCalling.version === "3.2.0") return;

  var PHONE_KEY = "jarvisVoiceCallContacts";
  var WA_KEY = "jarvisOmniWhatsAppContacts";
  var GROUP_KEY = "jarvisWhatsAppGroupLinks";

  function say(message) {
    try {
      if (typeof window.speak === "function") window.speak(message);
      else if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
      }
    } catch (_) {}
  }
  function normName(v) { return String(v || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function cleanPhone(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 10 && /^[6-9]/.test(d)) d = "91" + d;
    return d.length >= 7 && d.length <= 15 ? d : "";
  }
  function store(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
    catch (_) { return {}; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  function phoneFor(target) {
    var key = normName(target), a = store(PHONE_KEY), b = store(WA_KEY);
    return cleanPhone(a[key] || b[key] || target);
  }
  function openUrl(url, label) {
    /* Prefer the native WhatsApp app on phones; use universal links as fallback. */
    var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
    var isWaMe = url.indexOf("https://wa.me/") === 0 || url.indexOf("http://wa.me/") === 0;
    var isGroupLink = url.indexOf("https://chat.whatsapp.com/") === 0 || url.indexOf("http://chat.whatsapp.com/") === 0;
    var isWhatsAppWeb = url.indexOf("https://web.whatsapp.com") === 0 || url.indexOf("http://web.whatsapp.com") === 0;
    if (mobile && (isWaMe || isGroupLink || isWhatsAppWeb)) {
      var nativeUrl = url;
      if (isWaMe) {
        var number = url.replace("https://wa.me/", "").replace("http://wa.me/", "").split(/[?#]/)[0];
        nativeUrl = "whatsapp://send?phone=" + encodeURIComponent(number);
      } else if (isWhatsAppWeb) {
        nativeUrl = "whatsapp://";
      }
      var fallbackTimer = window.setTimeout(function () {
        try { if (!document.hidden) window.location.href = url; } catch (_) {}
      }, 1600);
      try {
        document.addEventListener("visibilitychange", function onVisibility() {
          if (document.hidden) {
            window.clearTimeout(fallbackTimer);
            document.removeEventListener("visibilitychange", onVisibility);
          }
        });
        say("Opening the WhatsApp app" + (label ? " for " + label : "") + ".");
        window.location.href = nativeUrl;
        return true;
      } catch (_) { window.clearTimeout(fallbackTimer); }
    }
    if (mobile || url.indexOf("tel:") === 0 || url.indexOf("intent:") === 0) {
      try { say("Opening " + label + "."); window.location.href = url; return true; } catch (_) {}
    }
    try {
      var w = window.open(url, "_blank");
      if (w) { try { w.opener = null; } catch (_) {} say("Opening " + label + "."); return true; }
    } catch (_) {}
    try { say("Opening " + label + "."); window.location.assign(url); return true; }
    catch (_) { say("I couldn't open " + label + " from this browser."); return true; }
  }
  function rememberPhone(name, rawNumber) {
    var key = normName(name), number = cleanPhone(rawNumber);
    if (!key || !number) { say("Please give me a contact name and a valid phone number."); return true; }
    var p = store(PHONE_KEY); p[key] = number;
    if (!save(PHONE_KEY, p)) { say("I couldn't save that contact in this browser."); return true; }
    /* Keep the existing WhatsApp alias map useful to the separate Omni Skills module. */
    var w = store(WA_KEY); if (!w[key]) { w[key] = number; save(WA_KEY, w); }
    say("Saved " + name + ". You can now say call " + name + " or video call " + name + ".");
    return true;
  }
  function rememberGroup(name, url) {
    var key = normName(name), value = String(url || "").trim();
    if (!key || !/^https?:\/\/(chat\.whatsapp\.com\/|wa\.me\/)/i.test(value)) {
      say("Give me a group name and its WhatsApp group invite link, for example remember WhatsApp group family as followed by the invite link.");
      return true;
    }
    var groups = store(GROUP_KEY); groups[key] = value;
    if (!save(GROUP_KEY, groups)) { say("I couldn't save that group link in this browser."); return true; }
    say("Saved the WhatsApp group link for " + name + ". Say video call group " + name + " when you need it.");
    return true;
  }
  function callPhone(target) {
    var name = String(target || "").trim().replace(/[,.!?]+$/, "");
    var number = phoneFor(name);
    if (number) {
      say("Opening the phone dialer for " + name + ". Check the number and tap Call.");
      return openUrl("tel:+" + number, "phone dialer");
    }

    /* Never send Safari to the unsupported contacts:// scheme. Ordinary web
       pages cannot search the iPhone/Android address book by contact name. */
    say("I can't search your private phone contacts by name from this website. Enter " + name + "'s phone number once and I'll open the dialer.");
    var entered = "";
    try {
      if (typeof window.prompt === "function") entered = window.prompt("Phone number for " + name + " (include country code if needed):", "") || "";
    } catch (_) {}
    var enteredNumber = cleanPhone(entered);
    if (enteredNumber) {
      rememberPhone(name, enteredNumber);
      say("Opening the phone dialer for " + name + ". Check the number and tap Call.");
      return openUrl("tel:+" + enteredNumber, "phone dialer");
    }
    say("No number was entered, so I haven't opened an invalid phone link. Save the contact number and say call " + name + " again.");
    return true;
  }
  function openWhatsApp(target, video, group) {
    var name = String(target || "").trim().replace(/[,.!?]+$/, "");
    var key = normName(name);
    if (group) {
      var groups = store(GROUP_KEY), groupUrl = groups[key];
      if (groupUrl) {
        say("Opening the WhatsApp app for group " + name + ". If WhatsApp opens the group, tap its video-call control.");
        return openUrl(groupUrl, "WhatsApp group " + name);
      }
      say("Opening the WhatsApp app. Search for group " + name + " there, then tap its video-call control. A website cannot search your private WhatsApp groups by name.");
      return openUrl("https://web.whatsapp.com/", "WhatsApp");
    }
    var number = phoneFor(name);
    if (number) {
      say(video
        ? "Opening the WhatsApp chat for " + name + ". Tap the video-call button in WhatsApp to start the call."
        : "Opening the WhatsApp chat for " + name + ".");
      return openUrl("https://wa.me/" + number, video ? "WhatsApp video-call contact" : "WhatsApp contact");
    }
    say("Opening the WhatsApp app. Search for " + name + " in WhatsApp, then tap the video-call button. To open the chat directly next time, save their number by saying remember contact " + name + " as followed by their phone number.");
    return openUrl("https://web.whatsapp.com/", "WhatsApp");
  }
  function handleCommand(raw) {
    var c = String(raw || "").trim()
      .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis[\s,:;-]*/i, "")
      .replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
    if (!c) return false;
    var m;

    m = c.match(/^(?:remember|save|add|set)\s+(?:whatsapp\s+)?group\s+(.+?)\s+(?:as|with(?:\s+invite)?(?:\s+link)?)\s+(https?:\/\/\S+)$/i);
    if (m) return rememberGroup(m[1], m[2]);
    m = c.match(/^(?:remember|save|add|set)\s+(?:whatsapp\s+)?(?:contact|phone)\s+(.+?)\s+(?:as|with(?:\s+phone)?(?:\s+number)?)\s+(\+?[0-9][0-9\s().-]{5,})$/i);
    if (m) return rememberPhone(m[1], m[2]);
    m = c.match(/^remember\s+(?:whatsapp\s+)?(.+?)\s+(?:is|at)\s+(\+?[0-9][0-9\s().-]{5,})$/i);
    if (m) return rememberPhone(m[1], m[2]);

    m = c.match(/^(?:whatsapp\\s+(?:video\\s+)?call|call\\s+(?:on\\s+)?whatsapp)\\s+(?:the\\s+)?group\\s+(.+)$/i);
    if (m) return openWhatsApp(m[1], /video/i.test(c), true);
    m = c.match(/^(?:whatsapp\\s+(?:video\\s+)?call|call\\s+(?:on\\s+)?whatsapp)\\s+(.+)$/i);
    if (m) return openWhatsApp(m[1].replace(/^(?:the\\s+)?group\\s+/i, ""), /video/i.test(c), /^(?:the\\s+)?group\\b/i.test(m[1]));
    m = c.match(/^(?:video\s+call|whatsapp\s+video\s+call|start\s+(?:a\s+)?video\s+call\s+(?:on\s+)?whatsapp|call\s+on\s+whatsapp\s+video)\s+(?:the\s+)?group\s+(.+)$/i);
    if (m) return openWhatsApp(m[1], true, true);
    m = c.match(/^(?:video\s+call|whatsapp\s+video\s+call|start\s+(?:a\s+)?video\s+call\s+(?:on\s+)?whatsapp|call\s+on\s+whatsapp\s+video)\s+(.+)$/i);
    if (m) {
      var who = m[1].replace(/^(?:the\s+)?group\s+/i, "");
      return openWhatsApp(who, true, /^(?:the\s+)?group\b/i.test(m[1]));
    }
    m = c.match(/^(?:open|show|launch|go to)\s+whatsapp(?:\s+(?:chat|app))?$/i);
    if (m) return openUrl("https://web.whatsapp.com/", "WhatsApp");
    m = c.match(/^(?:call|phone|dial|make\s+(?:a\s+)?call\s+to|call\s+the\s+contact\s+)\s*(.+)$/i);
    if (m) return callPhone(m[1]);

    return false;
  }

  window.JARVISCalling = {
    version: "3.2.0",
    handleCommand: handleCommand,
    rememberPhone: rememberPhone,
    rememberGroup: rememberGroup,
    callPhone: callPhone,
    openWhatsApp: openWhatsApp,
    commands: [
      "call Jayant", "phone wife", "dial +91 9876543210",
      "video call Jayant", "WhatsApp video call wife", "video call group family",
      "remember contact Jayant as +91 9876543210",
      "remember WhatsApp group family as https://chat.whatsapp.com/INVITE_CODE"
    ]
  };
})();