/* JARVIS VoiceCall — isolated calling command module.
   Does not replace the HUD, microphone controller, or existing command engine.
   Phone calls open the device dialer; video-call handoff requires the user to
   confirm/start the call in the selected app. */
(function () {
  "use strict";
  if (window.JARVISCalling) return;

  var CONTACTS_KEY = "jarvisVoiceCallContacts";
  var GROUPS_KEY = "jarvisVoiceCallGroups";

  function say(message) {
    try {
      if (typeof window.speak === "function") window.speak(message);
      else if (typeof window.speechSynthesis !== "undefined") {
        var utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
      }
    } catch (_) {}
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function cleanPhone(value) {
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function normalizePhone(value) {
    var raw = String(value || "").trim();
    var digits = cleanPhone(raw);
    if (digits.length === 10 && /^[6-9]/.test(digits)) digits = "91" + digits;
    if (digits.length < 7 || digits.length > 15) return "";
    return digits;
  }

  function readStore(key) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function openUrl(url, label) {
    try {
      /* Same-tab navigation works more reliably for mobile universal links and
         avoids popup blockers after asynchronous speech recognition. */
      window.location.assign(url);
      say("Opening " + label + ". Follow the on-screen prompts to continue.");
      return true;
    } catch (_) {
      say("I couldn't open " + label + ". Please try the command again.");
      return true;
    }
  }

  function saveContact(name, number) {
    var key = normalizeName(name);
    var phone = normalizePhone(number);
    if (!key || !phone) {
      say("Please provide a contact name and a valid phone number, including the country code when needed.");
      return true;
    }
    var contacts = readStore(CONTACTS_KEY);
    contacts[key] = phone;
    if (!writeStore(CONTACTS_KEY, contacts)) {
      say("I couldn't save that contact in this browser.");
      return true;
    }
    say("Saved " + name + " for phone and WhatsApp video-call commands.");
    return true;
  }

  function saveGroup(name, url) {
    var key = normalizeName(name);
    var value = String(url || "").trim();
    var parsed;
    try { parsed = new URL(value); } catch (_) { parsed = null; }
    if (!key || !parsed || parsed.protocol !== "https:" ||
        !/(^|\.)chat\.whatsapp\.com$|(^|\.)meet\.google\.com$|(^|\.)zoom\.us$/.test(parsed.hostname)) {
      say("Please provide a group name and a valid HTTPS WhatsApp group invite, Google Meet link, or Zoom link.");
      return true;
    }
    var groups = readStore(GROUPS_KEY);
    groups[key] = parsed.href;
    if (!writeStore(GROUPS_KEY, groups)) {
      say("I couldn't save that group link in this browser.");
      return true;
    }
    say("Saved the video-call link for " + name + ".");
    return true;
  }

  function phoneCall(target) {
    var value = String(target || "").trim().replace(/[,.!?]+$/, "");
    var contacts = readStore(CONTACTS_KEY);
    var phone = contacts[normalizeName(value)] || normalizePhone(value);
    if (!phone) {
      say("I don't have a saved phone number for " + value + ". Say remember contact " + value + " as, followed by the phone number.");
      return true;
    }
    /* tel: launches the native dialer; the user confirms the actual call. */
    window.location.href = "tel:+" + phone;
    say("Opening the phone dialer. Review the number and tap Call when ready.");
    return true;
  }

  function videoCall(target, isGroup) {
    var value = String(target || "").trim().replace(/[,.!?]+$/, "");
    if (!value) {
      openUrl("https://meet.google.com/new", "a new Google Meet");
      say("A new Google Meet is opening. Share its invitation with the people you want to call.");
      return true;
    }

    if (isGroup) {
      var groups = readStore(GROUPS_KEY);
      var savedGroup = groups[normalizeName(value)];
      if (savedGroup) return openUrl(savedGroup, "the saved group video-call link");
      openUrl("https://meet.google.com/new", "a new Google Meet");
      say("I couldn't find a saved link for " + value + ". A new Google Meet is opening; invite the group from there, or save its WhatsApp group invite link first.");
      return true;
    }

    var contacts = readStore(CONTACTS_KEY);
    var phone = contacts[normalizeName(value)] || normalizePhone(value);
    if (phone) {
      openUrl("https://wa.me/" + phone, "the WhatsApp chat for " + value);
      say("Opening the WhatsApp chat for " + value + ". Tap the video-call icon in WhatsApp to start the call.");
      return true;
    }

    openUrl("https://meet.google.com/new", "a new Google Meet");
    say("I couldn't find a saved WhatsApp number for " + value + ". A new Google Meet is opening; invite them using Meet, or save their number for WhatsApp video calling.");
    return true;
  }

  function handleCommand(raw) {
    var command = String(raw || "").trim()
      .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis[\s,:;-]*/i, "")
      .replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
    if (!command) return false;
    var match;

    match = command.match(/^(?:remember|save|add|set)\s+(?:a\s+)?contact\s+(.+?)\s+(?:as|with(?:\s+phone)?(?:\s+number)?)\s+(\+?[0-9][0-9\s().-]{5,})$/i);
    if (match) return saveContact(match[1], match[2]);
    match = command.match(/^remember\s+(?:phone\s+)?(.+?)\s+(?:is|at)\s+(\+?[0-9][0-9\s().-]{5,})$/i);
    if (match) return saveContact(match[1], match[2]);

    match = command.match(/^(?:remember|save|add|set)\s+(?:video\s+)?group\s+(.+?)\s+(?:as|with\s+(?:the\s+)?(?:link|url))\s+(https:\/\/\S+)$/i);
    if (match) return saveGroup(match[1], match[2]);

    match = command.match(/^(?:call|phone|dial)\s+(.+)$/i);
    if (match && !/^(?:video|whatsapp|meet)\b/i.test(match[1])) return phoneCall(match[1]);

    if (/^(?:start|create|open)\s+(?:a\s+)?(?:video\s+)?(?:meeting|video\s+meeting|google\s+meet)$/i.test(command) ||
        /^(?:start|create|open)\s+(?:a\s+)?group\s+video\s+call$/i.test(command)) {
      return videoCall("", false);
    }

    match = command.match(/^(?:video\s+call|call\s+on\s+video|start\s+(?:a\s+)?video\s+call\s+(?:with|for)|google\s+meet\s+with)\s+(?:the\s+)?(?:group\s+)?(.+)$/i);
    if (match) {
      var target = match[1].trim();
      var group = /^(?:my\s+)?group\s+/i.test(target) || /\b(group|family group|team group)$/i.test(target);
      target = target.replace(/^(?:my\s+)?group\s+/i, "").trim();
      return videoCall(target, group);
    }

    match = command.match(/^(?:video\s+call|start\s+(?:a\s+)?video\s+call)\s+(?:with\s+)?(everyone|the group|my group)$/i);
    if (match) return videoCall("", true);

    return false;
  }

  window.JARVISCalling = {
    version: "1.0.0",
    handleCommand: handleCommand,
    getContacts: function () { return readStore(CONTACTS_KEY); },
    getGroups: function () { return readStore(GROUPS_KEY); },
    commands: [
      "call Anil",
      "dial +91 9876543210",
      "remember contact Anil as +91 9876543210",
      "video call Anil",
      "video call group Family",
      "remember video group Family as https://chat.whatsapp.com/INVITE_CODE",
      "start a Google Meet",
      "start a group video call"
    ]
  };
})();