/* JARVIS PhoneCall — isolated phone dialer and contact intelligence.
   The browser opens the native dialer; the user confirms the call.
   Reuses the existing WhatsApp contact map without modifying that feature. */
(function () {
  "use strict";
  if (window.JARVISCalling) return;

  var CONTACTS_KEY = "jarvisVoiceCallContacts";
  var WHATSAPP_KEY = "jarvisOmniWhatsAppContacts";
  var panel = null;

  function say(message) {
    try {
      if (typeof window.speak === "function") window.speak(message);
      else if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
      }
    } catch (_) {}
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function normalizePhone(value) {
    var raw = String(value || "").trim();
    var digits = raw.replace(/\D/g, "");
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

  function allContacts() {
    var merged = {};
    var whatsapp = readStore(WHATSAPP_KEY);
    var phone = readStore(CONTACTS_KEY);
    Object.keys(whatsapp).forEach(function (key) { merged[key] = normalizePhone(whatsapp[key]) || ""; });
    Object.keys(phone).forEach(function (key) { merged[key] = normalizePhone(phone[key]) || merged[key] || ""; });
    Object.keys(merged).forEach(function (key) { if (!merged[key]) delete merged[key]; });
    return merged;
  }

  function findPhone(nameOrNumber) {
    var key = normalizeName(nameOrNumber);
    var contacts = allContacts();
    return contacts[key] || normalizePhone(nameOrNumber);
  }

  function renderContacts() {
    if (!panel) return;
    var list = panel.querySelector("[data-call-contact-list]");
    if (!list) return;
    var contacts = allContacts();
    var names = Object.keys(contacts).sort();
    list.innerHTML = "";
    if (!names.length) {
      var empty = document.createElement("p");
      empty.className = "jvc-empty";
      empty.textContent = "No saved contacts yet. Add a name and number below, or save one by voice command.";
      list.appendChild(empty);
      return;
    }
    names.forEach(function (name) {
      var row = document.createElement("div");
      row.className = "jvc-contact";
      var details = document.createElement("div");
      details.className = "jvc-contact-details";
      var title = document.createElement("strong");
      title.textContent = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var number = document.createElement("span");
      number.textContent = "+" + contacts[name];
      details.appendChild(title);
      details.appendChild(number);
      var call = document.createElement("button");
      call.type = "button";
      call.className = "jvc-action";
      call.textContent = "CALL";
      call.addEventListener("click", function () { phoneCall(name); });
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "jvc-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + name);
      remove.addEventListener("click", function () {
        var saved = readStore(CONTACTS_KEY);
        delete saved[name];
        if (!writeStore(CONTACTS_KEY, saved)) { say("I couldn't update contacts in this browser."); return; }
        renderContacts();
        say("Removed the JARVIS calling alias. Your original WhatsApp contact is unchanged.");
      });
      row.appendChild(details);
      row.appendChild(call);
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  function openPanel() {
    if (!panel) buildPanel();
    panel.hidden = false;
    renderContacts();
    var name = panel.querySelector("[data-call-name]");
    if (name) name.focus();
  }

  function buildPanel() {
    var style = document.createElement("style");
    style.id = "jarvis-phone-call-styles";
    style.textContent = `
      #jvc-launcher{position:fixed;right:16px;bottom:92px;z-index:99990;background:#071923;color:#65f4ff;border:1px solid #24cfe8;border-radius:10px;padding:10px 14px;font:700 12px/1.2 Arial,sans-serif;letter-spacing:1px;box-shadow:0 0 18px #00d9ff35;cursor:pointer}
      #jvc-panel{position:fixed;right:14px;bottom:145px;z-index:99999;width:min(360px,calc(100vw - 28px));max-height:min(72vh,620px);overflow:auto;box-sizing:border-box;background:rgba(3,15,25,.98);color:#dffcff;border:1px solid #20cde8;border-radius:14px;padding:16px;box-shadow:0 0 28px #00d9ff30;font:14px/1.4 Arial,sans-serif}
      #jvc-panel[hidden]{display:none!important}#jvc-panel *{box-sizing:border-box}#jvc-panel h2{margin:0;color:#62efff;font-size:17px;letter-spacing:1px}#jvc-panel .jvc-sub{font-size:12px;color:#9bbdc7;margin:5px 0 13px}
      #jvc-panel .jvc-close{float:right;background:transparent;color:#b9f8ff;border:1px solid #285968;border-radius:7px;padding:3px 8px;cursor:pointer}
      #jvc-panel .jvc-fields{display:grid;grid-template-columns:1fr;gap:8px}#jvc-panel input{width:100%;min-height:39px;padding:9px 10px;border:1px solid #285968;border-radius:7px;background:#071923;color:#efffff;font-size:14px}
      #jvc-panel button{font-size:12px}#jvc-panel .jvc-primary{width:100%;margin-top:8px;background:#07313c;color:#79f6ff;border:1px solid #20cde8;border-radius:7px;padding:10px;font-weight:700;cursor:pointer}
      #jvc-panel .jvc-contact-list{display:grid;gap:7px;margin-top:12px}#jvc-panel .jvc-contact{display:flex;align-items:center;gap:7px;border:1px solid #1b4351;border-radius:8px;padding:8px}
      #jvc-panel .jvc-contact-details{min-width:0;flex:1;display:grid;gap:2px}#jvc-panel .jvc-contact-details strong{overflow-wrap:anywhere;color:#e6fcff}#jvc-panel .jvc-contact-details span{font-size:12px;color:#93b9c2}
      #jvc-panel .jvc-action{border:1px solid #20cde8;background:#07313c;color:#78f6ff;border-radius:6px;padding:8px;cursor:pointer}#jvc-panel .jvc-remove{border:1px solid #6b3940;background:#24131a;color:#ffb9c0;border-radius:6px;padding:5px 9px;cursor:pointer}
      #jvc-panel .jvc-empty{font-size:12px;color:#a9c4cb}#jvc-panel .jvc-note{font-size:11px;color:#8eabb4;margin:12px 0 0}
      @media(max-width:520px){#jvc-launcher{right:10px;bottom:82px;padding:9px 10px}#jvc-panel{right:8px;bottom:132px;width:calc(100vw - 16px)}}
    `;
    document.head.appendChild(style);

    var launcher = document.createElement("button");
    launcher.id = "jvc-launcher";
    launcher.type = "button";
    launcher.textContent = "☎ PHONE CALLS";
    launcher.setAttribute("aria-controls", "jvc-panel");
    launcher.setAttribute("aria-expanded", "false");
    launcher.addEventListener("click", function () {
      openPanel();
      launcher.setAttribute("aria-expanded", "true");
    });
    document.body.appendChild(launcher);

    panel = document.createElement("section");
    panel.id = "jvc-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "JARVIS phone calling and contacts");
    panel.innerHTML = '<button type="button" class="jvc-close" data-call-close aria-label="Close phone panel">CLOSE</button>' +
      '<h2>JARVIS // PHONE CALLS</h2><p class="jvc-sub">Voice, text, and one-tap dialer handoff</p>' +
      '<form data-call-form><div class="jvc-fields"><input data-call-name maxlength="80" autocomplete="off" placeholder="Contact name (e.g. Anil)" aria-label="Contact name" required>' +
      '<input data-call-number inputmode="tel" autocomplete="tel" maxlength="24" placeholder="Phone number with country code" aria-label="Phone number" required></div>' +
      '<button class="jvc-primary" type="submit">SAVE CONTACT</button></form>' +
      '<div class="jvc-contact-list" data-call-contact-list></div>' +
      '<p class="jvc-note">Contacts stay in this browser. JARVIS opens your device dialer; you review and confirm the call. Existing WhatsApp aliases are read-only and remain unchanged.</p>';
    panel.querySelector("[data-call-close]").addEventListener("click", function () {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    });
    panel.querySelector("[data-call-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = panel.querySelector("[data-call-name]").value.trim();
      var number = panel.querySelector("[data-call-number]").value.trim();
      saveContact(name, number);
    });
    document.body.appendChild(panel);
  }

  function saveContact(name, number) {
    var key = normalizeName(name);
    var phone = normalizePhone(number);
    if (!key || !phone) {
      say("Please enter a contact name and a valid phone number, including country code when needed.");
      return false;
    }
    var contacts = readStore(CONTACTS_KEY);
    contacts[key] = phone;
    if (!writeStore(CONTACTS_KEY, contacts)) {
      say("I couldn't save that contact in this browser.");
      return false;
    }
    renderContacts();
    var nameField = panel && panel.querySelector("[data-call-name]");
    var numberField = panel && panel.querySelector("[data-call-number]");
    if (nameField) nameField.value = "";
    if (numberField) numberField.value = "";
    say("Saved " + name + " for phone calling.");
    return true;
  }

  function phoneCall(target) {
    var value = String(target || "").trim().replace(/[,.!?]+$/, "");
    var phone = findPhone(value);
    if (!phone) {
      say("I don't have a saved number for " + value + ". Open Phone Calls to add it, or say remember contact " + value + " as followed by the number.");
      openPanel();
      return true;
    }
    say("Opening the phone dialer. Review the number and tap Call when ready.");
    window.location.href = "tel:+" + phone;
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

    match = command.match(/^(?:call|phone|dial)\s+(.+)$/i);
    if (match) return phoneCall(match[1]);

    match = command.match(/^(?:open|show|manage)\s+(?:the\s+)?(?:phone\s+calls?|calling\s+contacts?|calling\s+panel)$/i);
    if (match) { openPanel(); return true; }

    return false;
  }

  window.JARVISCalling = {
    version: "2.0.0",
    handleCommand: handleCommand,
    openPanel: openPanel,
    getContacts: allContacts,
    saveContact: saveContact,
    phoneCall: phoneCall,
    commands: [
      "call Anil",
      "phone Mom",
      "dial +91 9876543210",
      "remember contact Anil as +91 9876543210",
      "open phone calls"
    ]
  };

  document.addEventListener("DOMContentLoaded", function () {
    buildPanel();
  });
  if (document.readyState !== "loading") buildPanel();

  document.addEventListener("submit", function (event) {
    if (!event.target || event.target.id !== "commandForm") return;
    var input = document.getElementById("commandInput");
    if (input && handleCommand(input.value)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = "";
    }
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || !event.target || event.target.id !== "commandInput") return;
    var input = document.getElementById("commandInput");
    if (input && handleCommand(input.value)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = "";
    }
  }, true);
})();