/* Isolated JARVIS Omni Skills layer. Does not alter the HUD or microphone controller. */
(function () {
"use strict";
if (window.__JARVIS_OMNI_SKILLS__) return;
window.__JARVIS_OMNI_SKILLS__ = true;
var KEY = "jarvisOmniEmailDraftSession";
var WA_CONTACTS_KEY = "jarvisOmniWhatsAppContacts";

function say(s) { try { if (window.speak) window.speak(s); } catch (_) {} }
function norm(s) {
  return String(s || "").trim()
    .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis[\s,:;-]*/i, "")
    .replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
}
function draft() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (_) { return null; } }
function saveDraft(d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (_) { return false; } }
function waContacts() { try { return JSON.parse(localStorage.getItem(WA_CONTACTS_KEY) || "{}"); } catch (_) { return {}; } }
function saveWaContacts(c) { try { localStorage.setItem(WA_CONTACTS_KEY, JSON.stringify(c)); return true; } catch (_) { return false; } }
function cleanPhone(s) { return String(s || "").replace(/[^0-9]/g, ""); }
function normalizePhoneCandidate(s) {
  var p = cleanPhone(s);
  if (p.length === 10 && /^[6-9]/.test(p)) p = "91" + p;
  return p;
}
function waUrl(phone, text) {
  /* Use WhatsApp's official universal link. On iPhone/Android, when the
     native WhatsApp app is installed, wa.me should hand off to that app;
     WhatsApp Web is only the fallback when the app cannot handle the link. */
  var p = new URLSearchParams();
  if (text) p.set("text", text);
  var number = String(phone || "").replace(/[^0-9]/g, "");
  return "https://wa.me/" + number + (p.toString() ? "?" + p.toString() : "");
}
function waMobileUrl(phone, text) {
  return waUrl(phone, text);
}

/* Open immediately when the command arrives. This is important on iPhone:
   a later window.open() after async work can be blocked as a popup. */
function openExternal(url, label, preferredWindow) {
  var w = preferredWindow || null;
  try {
    if (!w) w = window.open(url, "_blank");
    if (w) {
      try { w.opener = null; } catch (_) {}
      if (url) w.location.href = url;
      say("Opening " + label + ".");
      return w;
    }
  } catch (_) {}
  try { window.location.assign(url); say("Opening " + label + "."); } catch (_) { say("I could not open " + label + "."); }
  return null;
}
function reserveTab(label) {
  try {
    var w = window.open("about:blank", "_blank");
    if (w) {
      try { w.document.title = "JARVIS — " + label; } catch (_) {}
      return w;
    }
  } catch (_) {}
  return null;
}
function gmailComposeUrl(d) {
  var p = new URLSearchParams();
  if (d.to) p.set("to", d.to);
  if (d.subject) p.set("su", d.subject);
  if (d.body) p.set("body", d.body);
  return "https://mail.google.com/mail/?view=cm&fs=1" + (p.toString() ? "&" + p.toString() : "");
}
function ai(prompt) {
  return window.fetch("/api/command", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: prompt })
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) {
      if (!r.ok || d.ok === false) throw Error(d.reply || "AI unavailable");
      var s = String(d.reply || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      var a = s.indexOf("{"), b = s.lastIndexOf("}");
      if (a < 0 || b <= a) throw Error("Could not parse the email draft");
      return JSON.parse(s.slice(a, b + 1));
    });
  });
}
function makeDraft(to, instruction, old, reservedWindow) {
  var prompt = old
    ? "Revise this email draft according to the user's instruction. Return ONLY valid JSON with string fields to, subject, body. Preserve the exact recipient unless the user explicitly changes it. Existing draft: " + JSON.stringify(old) + " Instruction: " + instruction
    : "Draft an email from these instructions. Return ONLY valid JSON with string fields to, subject, body. Do not invent or guess an email address. If the recipient is a name such as Ved, keep that exact name in the to field. Recipient: " + to + " Instructions: " + instruction;
  say(old ? "Improving the email draft." : "Preparing your email draft.");
  ai(prompt).then(function (v) {
    var d = { to: String(v.to || to || (old && old.to) || "").trim(), subject: String(v.subject || (old && old.subject) || "").trim(), body: String(v.body || "").trim() };
    if (!d.body) throw Error("The AI returned an empty draft");
    if (!saveDraft(d)) throw Error("Could not save the draft in this browser tab");
    var url = gmailComposeUrl(d);
    if (reservedWindow) {
      try { reservedWindow.location.href = url; say("Gmail draft opened with the recipient, subject, and message filled in. Review it before sending."); return; } catch (_) {}
    }
    openExternal(url, "Gmail draft");
    say("Gmail draft opened with the recipient, subject, and message filled in. Review it before sending.");
  }).catch(function (e) {
    if (reservedWindow) { try { reservedWindow.close(); } catch (_) {} }
    say("I couldn't prepare the email draft. " + String(e.message || "Please try again."));
  });
}
function openDraft() {
  var d = draft();
  if (!d || !d.body) { say("No draft yet. Say draft an email to someone and tell me what to write."); return true; }
  openExternal(gmailComposeUrl(d), "Gmail draft");
  return true;
}

function rememberWhatsAppContact(name, phone) {
  var n = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  var p = normalizePhoneCandidate(phone);
  if (!n || !p) { say("I need the WhatsApp contact name and phone number to remember it."); return true; }
  var c = waContacts(); c[n] = p; saveWaContacts(c);
  say("Saved WhatsApp contact " + name + ". I can now open that contact directly when you message them.");
  return true;
}
function sendWhatsAppDraft(recipient, message) {
  var r = String(recipient || "").trim().replace(/[,.!?]+$/, "");
  var text = String(message || "").trim();
  if (!r || !text) { say("I need both the WhatsApp contact and the message."); return true; }
  var contacts = waContacts();
  var key = r.toLowerCase().replace(/\s+/g, " ");
  var phone = contacts[key] || normalizePhoneCandidate(r);
  var reserved = reserveTab("WhatsApp message");
  if (phone) {
    var url = waUrl(phone, text);
    if (reserved) {
      try { reserved.location.href = url; say("WhatsApp opened for " + r + " with your message prepared. Review it and press Send yourself."); return true; } catch (_) {}
    }
    openExternal(url, "WhatsApp message");
    say("WhatsApp opened for " + r + " with your message prepared. Review it and press Send yourself.");
    return true;
  }
  /* A website cannot inspect a user's private WhatsApp contacts by name.
     Without a saved number, WhatsApp can still open its chat picker with the
     message prefilled; the user selects the intended contact before sending. */
  var pickerUrl = waUrl("", text);
  if (reserved) {
    try { reserved.location.href = pickerUrl; say("WhatsApp opened with your message prepared. Select " + r + " in WhatsApp, review it, and press Send yourself."); return true; } catch (_) {}
  }
  openExternal(pickerUrl, "WhatsApp message");
  say("WhatsApp opened with your message prepared. Select " + r + " in WhatsApp, review it, and press Send yourself.");
  return true;
}
function vision(action) {
  var root = document.getElementById("jvi-root");
  if (!root || !root.classList.contains("open")) {
    window.fetch("/api/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: "open vision intelligence" }) }).catch(function () {});
    say("Opening Vision Intelligence. Activate the camera or import an image first.");
    return true;
  }
  var id = action === "camera" ? "jvi-camera" : action === "capture" ? "jvi-capture" : action === "analyze" ? "jvi-analyze" : "";
  if (id) { var b = document.getElementById(id); if (b && !b.disabled) b.click(); else say("Activate the camera or import an image first."); return true; }
  var q = { parts: "Describe the visible parts and their apparent functions.", facts: "Give key facts about this target.", uncertainty: "Explain what is uncertain about this image.", explain: "Explain what this is and how it works." }[action];
  var f = document.getElementById("jvi-command"), s = document.getElementById("jvi-send");
  if (q && f && s) { f.value = q; s.click(); } else say("Select an image first.");
  return true;
}
function handle(raw) {
  var c = norm(raw), m, old = draft();
  if (!c) return false;

  if (/^(open|show|launch)\s+(omni|skills)(\s+mode)?$/i.test(c)) { say("Omni Skills active: browser, email, WhatsApp, and vision."); return true; }

  /* Optional one-time contact alias: "remember WhatsApp Anil as +91...".
     This keeps name-based commands independent of the HUD and avoids trying
     to read private WhatsApp contacts. */
  m = c.match(/^(?:remember|save|set)\s+(?:whatsapp\s+)?contact\s+(.+?)\s+(?:as|with(?:\s+phone)?(?:\s+number)?)\s+(\+?[0-9][0-9\s().-]{8,})$/i);
  if (m) return rememberWhatsAppContact(m[1], m[2]);
  m = c.match(/^remember\s+(?:that\s+)?(?:whatsapp\s+)?(.+?)\s*(?:is|at)\s*(\+?[0-9][0-9\s().-]{8,})$/i);
  if (m) return rememberWhatsAppContact(m[1], m[2]);

  /* Elastic WhatsApp message forms. The final message can be introduced by
     "that", "saying", "and say", "to say", or simply follow the recipient. */
  m = c.match(/^(?:message|whatsapp|text|send\s+(?:a\s+)?whatsapp\s+message\s+to|send\s+(?:a\s+)?message\s+to)\s+(.+?)\s+(?:that|saying|say|with the message|and\s+(?:say|write|tell them))\s+([\s\S]+)$/i);
  if (m) return sendWhatsAppDraft(m[1], m[2]);
  m = c.match(/^(?:message|whatsapp|text)\s+(.+?)\s+(?:and\s+)?(?:say|write|tell them)\s+([\s\S]+)$/i);
  if (m) return sendWhatsAppDraft(m[1], m[2]);
  m = c.match(/^(?:message|whatsapp|text)\s+(.+?)\s+([\s\S]+)$/i);
  if (m) {
    var possibleRecipient = m[1].trim();
    var possibleMessage = m[2].trim();
    if (!/^(me|myself|everyone)$/i.test(possibleRecipient)) return sendWhatsAppDraft(possibleRecipient, possibleMessage);
  }

  if (/^(open|show|launch)\s+(vision intelligence|vision mode)$/i.test(c)) return vision("open");
  if (/^(start|open|activate)\s+(the\s+)?camera$/i.test(c)) return vision("camera");
  if (/^(capture|take|snap)(\s+(image|photo|picture|frame))?$/i.test(c)) return vision("capture");
  if (/^(analyze|analyse|identify|scan)(\s+(this|the)?\s*(image|photo|picture))?$/i.test(c)) return vision("analyze");
  if (/^(inspect|describe)\s+(the\s+)?(visible\s+)?parts$/i.test(c)) return vision("parts");
  if (/^(check|explain)\s+(the\s+)?uncertainty$/i.test(c)) return vision("uncertainty");
  if (/^(discover|tell me)\s+(the\s+)?(key\s+)?facts$/i.test(c)) return vision("facts");
  if (/^explain how it works$/i.test(c)) return vision("explain");

  if (/^(open|show|review)\s+(my\s+)?email\s+draft$/i.test(c)) return openDraft();
  if (old && /^(modify|improve|rewrite|revise|shorten|expand|make it|update the draft)\b/i.test(c)) { makeDraft(old.to, c, old, null); return true; }
  m = c.match(/^(draft|write|compose|prepare)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:and\s+)?(?:write|say|saying|about|explaining|with the message|with subject)\s+([\s\S]+)$/i);
  if (m) { var reserved = reserveTab("Gmail draft"); makeDraft(m[2].trim().replace(/[,.]+$/, ""), m[3].trim(), null, reserved); return true; }
  m = c.match(/^(draft|write|compose|prepare)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about|saying|explaining|with subject)\s+([\s\S]+)$/i);
  if (m) { var reserved2 = reserveTab("Gmail draft"); makeDraft(m[2].trim().replace(/[,.]+$/, ""), m[3].trim(), null, reserved2); return true; }
  m = c.match(/^(draft|write|compose|prepare)\s+(?:an?\s+)?email(?:\s+to\s+([^,]+))?(?:\s+(?:and\s+)?(?:write|say|about|saying|explaining)\s+([\s\S]+))?$/i);
  if (m) { var reserved3 = reserveTab("Gmail draft"); makeDraft(String(m[2] || "").trim(), String(m[3] || "Create a polite email draft and use placeholders for missing details."), null, reserved3); return true; }
  if (/^(send|email)\s+(the\s+)?draft$/i.test(c)) { say("Say open email draft to review it, then send it yourself."); return true; }

  m = c.match(/^(open|launch|start|go to|navigate to)\s+(youtube|gmail|mail|google|maps|drive|photos|docs|sheets|slides|calendar|meet|spotify|discord|slack|teams|outlook|onedrive|notion|zoom)$/i);
  if (m) {
    var apps = { youtube:"https://www.youtube.com/", gmail:"https://mail.google.com/", mail:"https://mail.google.com/", google:"https://www.google.com/", maps:"https://maps.google.com/", drive:"https://drive.google.com/", photos:"https://photos.google.com/", docs:"https://docs.google.com/", sheets:"https://sheets.google.com/", slides:"https://slides.google.com/", calendar:"https://calendar.google.com/", meet:"https://meet.google.com/", spotify:"https://open.spotify.com/", discord:"https://discord.com/app", slack:"https://app.slack.com/client/", teams:"https://teams.microsoft.com/", outlook:"https://outlook.live.com/mail/", onedrive:"https://onedrive.live.com/", notion:"https://www.notion.so/", zoom:"https://zoom.us/join" };
    var label = m[2].toLowerCase(); openExternal(apps[label], label === "mail" ? "Gmail" : label); return true;
  }
  m = c.match(/^(search|find)\s+youtube\s+for\s+(.+)$/i); if (m) { openExternal("https://www.youtube.com/results?search_query=" + encodeURIComponent(m[2]), "YouTube search"); return true; }
  m = c.match(/^(search|google)\s+(for\s+)?(.+)$/i); if (m) { openExternal("https://www.google.com/search?q=" + encodeURIComponent(m[3]), "Google search"); return true; }
  m = c.match(/^(open|go to|navigate to)\s+(([\w-]+\.)+[a-z]{2,})$/i); if (m) { openExternal("https://" + m[2], m[2]); return true; }
  if (c === "go back" || c === "previous page") { history.back(); say("Going back."); return true; }
  if (c === "go forward" || c === "next page") { history.forward(); say("Going forward."); return true; }
  if (c === "scroll down" || c === "page down") { window.scrollBy({ top: Math.max(400, window.innerHeight * .75), behavior: "smooth" }); say("Scrolling down."); return true; }
  if (c === "scroll up" || c === "page up") { window.scrollBy({ top: -Math.max(400, window.innerHeight * .75), behavior: "smooth" }); say("Scrolling up."); return true; }
  return false;
}

window.JARVISOmni = {
  version: "1.2.1",
  skills: [{ id:"browser", name:"Browser navigation" }, { id:"email", name:"AI email drafts" }, { id:"whatsapp", name:"WhatsApp message handoff" }, { id:"vision", name:"Vision actions" }, { id:"skills", name:"Extensible skills engine" }],
  handleCommand: handle,
  getEmailDraft: draft,
  getWhatsAppContacts: waContacts,
  getBackgroundStatus: function () { return { pageVisible: document.visibilityState === "visible", note: "Browser tabs may be throttled; websites cannot listen after the page or browser closes." }; }
};

document.addEventListener("submit", function (e) {
  if (!e.target || e.target.id !== "commandForm") return;
  var f = document.getElementById("commandInput");
  if (f && handle(f.value)) { e.preventDefault(); e.stopImmediatePropagation(); f.value = ""; }
}, true);
document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" || e.shiftKey || !e.target || e.target.id !== "commandInput") return;
  var f = document.getElementById("commandInput");
  if (f && handle(f.value)) { e.preventDefault(); e.stopImmediatePropagation(); f.value = ""; }
}, true);
})();