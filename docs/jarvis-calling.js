/* JARVIS command-only calling and WhatsApp video-call handoff.
   No injected buttons, panels, styles, or HUD changes.
   Browsers cannot read private contacts or press native call buttons;
   this module opens the appropriate app/dialer and leaves confirmation to the user. */
(function () {
  "use strict";
  if (window.JARVISCalling && window.JARVISCalling.version === "3.4.0") return;

  var PHONE_KEY = "jarvisVoiceCallContacts";
  var WA_KEY = "jarvisOmniWhatsAppContacts";
  var GROUP_KEY = "jarvisWhatsAppGroupLinks";
  var CONTACTS_VERSION = "native-contact-import-1";

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

  function contactsFromPicker(selected) {
    var out = [];
    (Array.isArray(selected) ? selected : []).forEach(function (contact) {
      var names = Array.isArray(contact.name) ? contact.name : [];
      var tels = Array.isArray(contact.tel) ? contact.tel : [];
      var name = String(names[0] || "").trim();
      if (!name) return;
      tels.forEach(function (tel) {
        var number = cleanPhone(tel);
        if (number) out.push({ name: name, tel: number });
      });
    });
    return out;
  }
  function mergeLocalContacts(entries) {
    var phone = store(PHONE_KEY), wa = store(WA_KEY), count = 0;
    entries.forEach(function (entry) {
      var key = normName(entry.name), number = cleanPhone(entry.tel);
      if (!key || !number) return;
      phone[key] = number;
      wa[key] = number;
      count++;
    });
    if (!save(PHONE_KEY, phone) || !save(WA_KEY, wa)) throw new Error("storage");
    try { localStorage.setItem("jarvisNativeContactsVersion", CONTACTS_VERSION); } catch (_) {}
    return count;
  }

  function decodeVCardValue(value) {
    return String(value || "")
      .replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
      .trim();
  }
  function parseContactsFile(text, filename) {
    var source = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var out = [];
    if (/\.vcf$|\.vcard$/i.test(filename || "") || /BEGIN:VCARD/i.test(source)) {
      source = source.replace(/\n[ \t]/g, "");
      source.split(/BEGIN:VCARD/i).slice(1).forEach(function (block) {
        var body = block.split(/END:VCARD/i)[0] || "";
        var name = "";
        var numbers = [];
        body.split("\n").forEach(function (line) {
          var colon = line.indexOf(":");
          if (colon < 0) return;
          var head = line.slice(0, colon).split(";")[0].toUpperCase();
          var value = decodeVCardValue(line.slice(colon + 1));
          if (head === "FN" && value) name = value;
          else if (head === "N" && value && !name) {
            var parts = value.split(";");
            name = [parts[1], parts[0], parts[2], parts[3], parts[4]].filter(Boolean).join(" ").trim();
          }
          if (head === "TEL" && value) numbers.push(value);
        });
        numbers.forEach(function (tel) { if (name && cleanPhone(tel)) out.push({ name: name, tel: tel }); });
      });
      return out;
    }
    // CSV fallback: accepts common Name,Phone / Name,Telephone column headers.
    var rows = [], row = [], cell = "", quoted = false;
    for (var i = 0; i < source.length; i++) {
      var ch = source[i];
      if (ch === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
      else if (ch === "\n" && !quoted) { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return out;
    var headers = rows[0].map(function (v) { return String(v).trim().toLowerCase().replace(/[^a-z]/g, ""); });
    var nameIndex = headers.findIndex(function (v) { return /^(name|fullname|contactname|displayname)$/.test(v); });
    var phoneIndex = headers.findIndex(function (v) { return /^(phone|phonenumber|telephone|tel|mobile|mobilenumber|number)$/.test(v); });
    var start = nameIndex >= 0 && phoneIndex >= 0 ? 1 : 0;
    if (nameIndex < 0) nameIndex = 0;
    if (phoneIndex < 0) phoneIndex = 1;
    rows.slice(start).forEach(function (values) {
      var name = String(values[nameIndex] || "").trim();
      var tel = String(values[phoneIndex] || "").trim();
      if (name && cleanPhone(tel)) out.push({ name: name, tel: tel });
    });
    return out;
  }

  /*
   * Native bridge contract for an Android/iOS JARVIS wrapper:
   * window.JARVISNativeContacts.pickContacts({multiple:true, selectAll:true})
   * resolves to [{name:"Anil", tel:["+91..."]}, ...] or [{name,tel}].
   * The web UI below uses this when present, while ordinary supported browsers
   * use the Contact Picker API. No web page is given hidden address-book access.
   */
  async function nativePickContacts(selectAll) {
    if (window.JARVISNativeContacts && typeof window.JARVISNativeContacts.pickContacts === "function") {
      var result = await window.JARVISNativeContacts.pickContacts({ multiple: true, selectAll: !!selectAll });
      return Array.isArray(result) ? result : (result && Array.isArray(result.contacts) ? result.contacts : []);
    }
    if (navigator.contacts && typeof navigator.contacts.select === "function") {
      return await navigator.contacts.select(["name", "tel"], { multiple: true });
    }
    throw new Error("native-contact-picker-unavailable");
  }

  function installContactSettingsPanel() {
    if (document.getElementById("jarvis-phone-contact-import-v2")) return true;
    var modal = document.getElementById("jarvis-settings-modal");
    if (!modal) return false;
    var card = modal.querySelector("section");
    if (!card) return false;

    var section = document.createElement("div");
    section.id = "jarvis-phone-contact-import-v2";
    section.style.cssText = "margin:14px 0;padding:14px;border:1px solid #287b91;border-radius:10px;background:rgba(0,10,24,.72)";

    var title = document.createElement("h3");
    title.textContent = "PHONE CONTACTS // NATIVE IMPORT";
    title.style.cssText = "margin:0 0 6px;color:#62f5ff;font-size:14px;letter-spacing:1px";
    section.appendChild(title);

    var info = document.createElement("p");
    info.textContent = "Import selected contacts from the phone, save them locally, and use their saved numbers for JARVIS calling. Android/iOS native wrappers can provide Select All; supported browsers use the system Contact Picker.";
    info.style.cssText = "margin:0 0 10px;color:#b6dce7;font-size:12px";
    section.appendChild(info);

    var status = document.createElement("p");
    status.textContent = "Ready — contacts stay on this device/browser unless the native app says otherwise.";
    status.style.cssText = "margin:0 0 10px;color:#9bd6e5;font-size:12px";
    section.appendChild(status);

    var row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
    function makeButton(text) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = "min-height:42px;padding:8px;border:1px solid #00d9ff;border-radius:8px;background:rgba(0,0,0,.35);color:#fff;font:bold 12px system-ui,sans-serif;cursor:pointer;touch-action:manipulation";
      return b;
    }
    var selectButton = makeButton("SELECT FROM PHONE");
    var allButton = makeButton("IMPORT ALL (.VCF / .CSV)");
    row.appendChild(selectButton);
    row.appendChild(allButton);
    section.appendChild(row);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".vcf,.vcard,.csv,text/vcard,text/csv";
    fileInput.multiple = false;
    fileInput.style.display = "none";
    fileInput.setAttribute("aria-label", "Choose a contacts VCF or CSV export");
    section.appendChild(fileInput);

    var saveButton = makeButton("SAVE LOCALLY");
    saveButton.style.marginTop = "8px";
    saveButton.disabled = true;
    section.appendChild(saveButton);

    var pending = [];
    function setBusy(value) {
      selectButton.disabled = value; allButton.disabled = value;
      saveButton.disabled = value || !pending.length;
    }
    async function pick(selectAll) {
      setBusy(true);
      status.style.color = "#b6dce7";
      status.textContent = selectAll ? "Opening the phone contact selector for Select All…" : "Opening the phone contact selector…";
      try {
        var raw = await nativePickContacts(selectAll);
        pending = contactsFromPicker(raw);
        if (!pending.length) {
          status.style.color = "#ffdca8";
          status.textContent = "No contacts with usable phone numbers were selected.";
        } else {
          status.style.color = "#9fffcf";
          status.textContent = pending.length + " contact number(s) selected. Tap SAVE LOCALLY to store them on this device.";
        }
      } catch (err) {
        pending = [];
        status.style.color = "#ffd0d0";
        if (String(err && err.message) === "native-contact-picker-unavailable") {
          status.textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
            ? "iPhone Safari does not expose its native address book to websites. Tap IMPORT ALL (.VCF / .CSV) and choose a contacts export; no contacts are accessed without your selection."
            : "This browser does not support the contact picker. Tap IMPORT ALL (.VCF / .CSV) and choose a contacts export.";
        } else {
          status.textContent = "Contact selection was cancelled or unavailable. No contacts were saved.";
        }
      } finally {
        setBusy(false);
      }
    }
    selectButton.addEventListener("click", function () { pick(false); });
    allButton.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", async function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      setBusy(true);
      status.style.color = "#b6dce7";
      status.textContent = "Reading the contacts file locally…";
      try {
        var text = await file.text();
        pending = parseContactsFile(text, file.name);
        if (!pending.length) {
          status.style.color = "#ffdca8";
          status.textContent = "No valid name + phone-number pairs were found. Export contacts as .VCF, or use a CSV with Name and Phone columns.";
        } else {
          status.style.color = "#9fffcf";
          status.textContent = pending.length + " contact number(s) imported from " + file.name + ". Tap SAVE LOCALLY to store them on this device.";
        }
      } catch (_) {
        pending = [];
        status.style.color = "#ffd0d0";
        status.textContent = "The selected contacts file could not be read. No contacts were saved.";
      } finally {
        fileInput.value = "";
        setBusy(false);
      }
    });
    saveButton.addEventListener("click", function () {
      if (!pending.length) return;
      try {
        var count = mergeLocalContacts(pending);
        pending = [];
        saveButton.disabled = true;
        status.style.color = "#9fffcf";
        status.textContent = count + " contact number(s) saved locally. You can now say call <name> and JARVIS will use the saved number.";
        say("Saved " + count + " contact numbers locally. You can now call a saved contact by name.");
      } catch (_) {
        status.style.color = "#ffd0d0";
        status.textContent = "Could not save contacts locally. No contacts were uploaded by JARVIS.";
      }
    });

    card.appendChild(section);
    return true;
  }

  function watchForSettings() {
    if (installContactSettingsPanel()) return;
    try {
      var observer = new MutationObserver(function () {
        if (installContactSettingsPanel()) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(function () { try { observer.disconnect(); } catch (_) {} }, 15000);
    } catch (_) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchForSettings, { once: true });
  else watchForSettings();

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
    m = c.match(/^(?:whatsapp\s+(?:video\s+)?call|call\s+(?:on\s+)?whatsapp)\s+(?:the\s+)?group\s+(.+)$/i);
    if (m) return openWhatsApp(m[1], /video/i.test(c), true);
    m = c.match(/^(?:whatsapp\s+(?:video\s+)?call|call\s+(?:on\s+)?whatsapp)\s+(.+)$/i);
    if (m) return openWhatsApp(m[1].replace(/^(?:the\s+)?group\s+/i, ""), /video/i.test(c), /^(?:the\s+)?group\b/i.test(m[1]));
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
    version: "3.5.0",
    handleCommand: handleCommand,
    rememberPhone: rememberPhone,
    rememberGroup: rememberGroup,
    callPhone: callPhone,
    openWhatsApp: openWhatsApp,
    importPhoneContacts: async function (selectAll) {
      var raw = await nativePickContacts(!!selectAll);
      var entries = contactsFromPicker(raw);
      return { selected: entries.length, entries: entries };
    },
    saveImportedContacts: function (entries) { return mergeLocalContacts(Array.isArray(entries) ? entries : []); },
    commands: [
      "call Jayant", "phone wife", "dial +91 9876543210",
      "video call Jayant", "WhatsApp video call wife", "video call group family",
      "remember contact Jayant as +91 9876543210",
      "remember WhatsApp group family as https://chat.whatsapp.com/INVITE_CODE"
    ]
  };
})();