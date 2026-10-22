/* Isolated JARVIS Omni Skills layer. Does not alter the HUD or microphone controller. */
(function () {
"use strict";
if (window.__JARVIS_OMNI_SKILLS__) return;
window.__JARVIS_OMNI_SKILLS__ = true;
var KEY = "jarvisOmniEmailDraftSession";
function say(s) { try { if (window.speak) window.speak(s); } catch (_) {} }
function norm(s) { return String(s || "").trim().replace(/^(hey\s+)?jarvis[\s,:;-]*/i, "").replace(/[.!?]+$/, "").trim(); }
function draft() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (_) { return null; } }
function open(url, label) { var w = null; try { w = window.open(url, "_blank"); if (w) w.opener = null; } catch (_) {} say(w ? "Opening " + label : "Allow pop-ups for JARVIS, then repeat the command."); return !!w; }
function ai(prompt) {
 return window.fetch("/api/command", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:prompt})})
 .then(function(r){return r.json().catch(function(){return {};}).then(function(d){if(!r.ok||d.ok===false)throw Error(d.reply||"AI unavailable");var s=String(d.reply||"");var a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<=a)throw Error("Could not parse the email draft");return JSON.parse(s.slice(a,b+1));});});
}
function makeDraft(to, instruction, old) {
 var prompt = old ? "Revise this email draft per instruction. Return only JSON with string fields to, subject, body. Existing draft: "+JSON.stringify(old)+" Instruction: "+instruction
 : "Draft an email. Return only JSON with string fields to, subject, body. Do not invent an email address. Recipient: "+to+" Instructions: "+instruction;
 say("Preparing your email draft.");
 ai(prompt).then(function(v){var d={to:String(v.to||to||"").trim(),subject:String(v.subject||"").trim(),body:String(v.body||"").trim()};if(!d.body)throw Error("Empty draft");sessionStorage.setItem(KEY,JSON.stringify(d));say("Email draft ready. Say open email draft to review it in Gmail.");}).catch(function(e){say("Email draft failed: "+e.message);});
}
function openDraft() { var d=draft();if(!d||!d.body){say("No draft yet. Say draft email to someone and tell me what to write.");return true;}var p=new URLSearchParams();if(d.to)p.set("to",d.to);if(d.subject)p.set("su",d.subject);p.set("body",d.body);open("https://mail.google.com/mail/?view=cm&fs=1&"+p.toString(),"Gmail draft");say("Review the draft before sending. I cannot directly edit Gmail's page from this website.");return true; }
function vision(action) {
 var root=document.getElementById("jvi-root");
 if(!root||!root.classList.contains("open")){window.fetch("/api/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:"open vision intelligence"})}).catch(function(){});say("Opening Vision Intelligence. Activate the camera or import an image first.");return true;}
 var id=action==="camera"?"jvi-camera":action==="capture"?"jvi-capture":action==="analyze"?"jvi-analyze":"";
 if(id){var b=document.getElementById(id);if(b&&!b.disabled)b.click();else say("Activate the camera or import an image first.");return true;}
 var q={parts:"Describe the visible parts and their apparent functions.",facts:"Give key facts about this target.",uncertainty:"Explain what is uncertain about this image.",explain:"Explain what this is and how it works."}[action];
 var f=document.getElementById("jvi-command"),s=document.getElementById("jvi-send");if(q&&f&&s){f.value=q;s.click();}else say("Select an image first.");return true;
}
function handle(raw) {
 var c=norm(raw), m, old=draft(); if(!c)return false;
 if(/^(open|show|launch)\s+(omni|skills)(\s+mode)?$/i.test(c)){say("Omni Skills active: browser, email, and vision.");return true;}
 if(/^(open|show|launch)\s+(vision intelligence|vision mode)$/i.test(c)){vision("open");return true;}
 if(/^(start|open|activate)\s+(the\s+)?camera$/i.test(c))return vision("camera");
 if(/^(capture|take|snap)(\s+(image|photo|picture|frame))?$/i.test(c))return vision("capture");
 if(/^(analyze|analyse|identify|scan)(\s+(this|the)?\s*(image|photo|picture))?$/i.test(c))return vision("analyze");
 if(/^(inspect|describe)\s+(the\s+)?(visible\s+)?parts$/i.test(c))return vision("parts");
 if(/^(check|explain)\s+(the\s+)?uncertainty$/i.test(c))return vision("uncertainty");
 if(/^(discover|tell me)\s+(key\s+)?facts$/i.test(c))return vision("facts");
 if(/^explain how it works$/i.test(c))return vision("explain");
 if(/^(open|show|review)\s+(my\s+)?email draft$/i.test(c))return openDraft();
 if(old&&/^(modify|improve|rewrite|revise|shorten|expand|make it|update the draft)\b/i.test(c)){makeDraft(old.to,c,old);return true;}
 m=c.match(/^(draft|write|compose|prepare)\s+(an?\s+)?email\s+to\s+(.+?)\s+(about|saying|explaining|with subject)\s+([\s\S]+)$/i);
 if(m){makeDraft(m[3].trim(),m[5].trim(),null);return true;}
 m=c.match(/^(draft|write|compose|prepare)\s+(an?\s+)?email(?:\s+to\s+([^,]+))?(?:\s+about\s+([\s\S]+))?$/i);
 if(m){makeDraft(String(m[3]||"").trim(),String(m[4]||"Create a polite email draft and use placeholders for missing details."),null);return true;}
 if(/^(send|email)\s+(the\s+)?draft$/i.test(c)){say("Say open email draft to review it, then send it yourself.");return true;}
 m=c.match(/^(search|find)\s+youtube\s+for\s+(.+)$/i);if(m){open("https://www.youtube.com/results?search_query="+encodeURIComponent(m[2]),"YouTube search");return true;}
 m=c.match(/^(search|google)\s+(for\s+)?(.+)$/i);if(m){open("https://www.google.com/search?q="+encodeURIComponent(m[3]),"Google search");return true;}
 m=c.match(/^(open|go to|navigate to)\s+(([\w-]+\.)+[a-z]{2,})$/i);if(m){open("https://"+m[2],"website");return true;}
 if(c==="go back"){history.back();return true;}if(c==="go forward"){history.forward();return true;}
 if(c==="scroll down"){window.scrollBy({top:Math.max(400,window.innerHeight*.75),behavior:"smooth"});return true;}
 if(c==="scroll up"){window.scrollBy({top:-Math.max(400,window.innerHeight*.75),behavior:"smooth"});return true;}
 return false;
}
window.JARVISOmni={version:"1.0.0",skills:[{id:"browser",name:"Browser navigation"},{id:"email",name:"AI email drafts"},{id:"vision",name:"Vision actions"},{id:"skills",name:"Extensible skills engine"}],handleCommand:handle,getEmailDraft:draft,getBackgroundStatus:function(){return {pageVisible:document.visibilityState==="visible",note:"Browser tabs may be throttled; websites cannot listen after the page or browser closes."};}};
document.addEventListener("submit",function(e){if(!e.target||e.target.id!=="commandForm")return;var f=document.getElementById("commandInput");if(f&&handle(f.value)){e.preventDefault();e.stopImmediatePropagation();f.value="";}},true);
document.addEventListener("keydown",function(e){if(e.key!=="Enter"||e.shiftKey||!e.target||e.target.id!=="commandInput")return;var f=document.getElementById("commandInput");if(f&&handle(f.value)){e.preventDefault();e.stopImmediatePropagation();f.value="";}},true);
})();