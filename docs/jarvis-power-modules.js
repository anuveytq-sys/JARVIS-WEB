/* JARVIS // ORACLE + GHOST OPERATOR + DIGITAL TWIN
 * Free, local-first add-on. No AI/API keys; no HUD edits.
 * ORACLE is transparent scenario math, not a trained forecasting model.
 * GHOST OPERATOR is consent-based DOM/browser control, not OS-wide control.
 * DIGITAL TWIN is a local dependency/simulation sandbox, not a live production replica.
 */
(function () {
  "use strict";
  if (window.JARVISPowerModules && window.JARVISPowerModules.version === "1.0.0") return;

  var panel = null, pendingAction = null, lastTwin = null;
  var KEY = "jarvisPowerModulesV1";
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function clean(v) { return String(v || "").trim().replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b[\s,:;-]*/i,"").replace(/^(?:please\s+|can you\s+|could you\s+|would you\s+)/i,"").replace(/[.!?]+$/,"").trim(); }
  function say(s) { try { if (typeof window.showReply === "function") window.showReply(String(s), "reply"); else if (typeof window.speak === "function") window.speak(String(s)); } catch (_) {} }
  function ensurePanel() {
    if (panel && document.body.contains(panel)) return panel;
    var style = document.getElementById("jpm-style");
    if (!style) { style = document.createElement("style"); style.id="jpm-style"; style.textContent =
      "#jpm-panel{position:fixed;z-index:2147483002;right:14px;top:88px;width:min(450px,calc(100vw - 28px));max-height:72vh;overflow:hidden;color:#d8fbff;background:linear-gradient(145deg,rgba(2,25,48,.985),rgba(0,7,17,.995));border:1px solid #00d9ff;border-radius:12px;box-shadow:0 0 28px rgba(0,180,255,.22);font:13px/1.45 system-ui,sans-serif}#jpm-panel .jpm-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #15536a;color:#62f5ff;font-weight:800;letter-spacing:1px}#jpm-panel .jpm-body{padding:12px;overflow:auto;max-height:calc(72vh - 44px);overflow-wrap:anywhere}#jpm-panel h3{font-size:12px;color:#62f5ff;margin:9px 0 5px}#jpm-panel p{margin:6px 0}#jpm-panel .jpm-row{padding:8px 0;border-bottom:1px solid rgba(0,217,255,.13)}#jpm-panel .jpm-muted{color:#8ab9c8;font-size:11px}#jpm-panel button,#jpm-panel input,#jpm-panel select{border:1px solid #287b91;border-radius:7px;padding:6px 9px;background:#031626;color:#c9faff;max-width:100%}#jpm-panel button{cursor:pointer;margin:3px}#jpm-panel .jpm-danger{border-color:#e5a54a;color:#ffe0a6}@media(max-width:600px){#jpm-panel{top:72px;right:8px;width:calc(100vw - 16px);max-height:66vh}#jpm-panel .jpm-body{max-height:calc(66vh - 44px)}}";
      document.head.appendChild(style);
    }
    panel=document.createElement("section");panel.id="jpm-panel";
    panel.innerHTML='<div class="jpm-head"><span id="jpm-title">JARVIS // POWER SYSTEMS</span><button id="jpm-close" type="button">CLOSE</button></div><div class="jpm-body" id="jpm-body"></div>';
    document.body.appendChild(panel);
    panel.querySelector("#jpm-close").onclick=function(){panel.style.display="none";};
    return panel;
  }
  function show(title, html, spoken) { var p=ensurePanel(); p.style.display="block";p.querySelector("#jpm-title").textContent="JARVIS // "+title;p.querySelector("#jpm-body").innerHTML=html; if(spoken)say(spoken); }
  function saveTwin(t){try{localStorage.setItem(KEY,JSON.stringify({lastTwin:t,at:Date.now()}));}catch(_){}}
  function number(s, fallback){var n=Number(s);return Number.isFinite(n)?n:fallback;}

  /* ORACLE: user-visible assumptions and transparent scenario comparisons. */
  function oracle(raw) {
    var text=String(raw||"").trim(), lower=text.toLowerCase();
    var scenarios=[
      {name:"Conservative",p:0.25,impact:0.35,cost:0.15,risk:0.12},
      {name:"Balanced",p:0.55,impact:0.65,cost:0.35,risk:0.28},
      {name:"Ambitious",p:0.72,impact:0.95,cost:0.68,risk:0.55}
    ];
    var horizon=(text.match(/(?:in|over|within)\s+(\d+)\s*(days?|weeks?|months?)/i)||[]),goal=text.replace(/^(?:oracle|predict|forecast|analy[sz]e|compare|evaluate|decide|should i|what if|run scenarios?)(?:\s+for)?\s*/i,"").trim()||"the proposed decision";
    var score=function(s){return (s.p*s.impact*100)-(s.cost*22)-(s.risk*30);};
    scenarios.forEach(function(s){s.score=score(s);s.net=(s.p*s.impact)-(s.cost*.22)-(s.risk*.30);});
    scenarios.sort(function(a,b){return b.score-a.score;});
    var best=scenarios[0], duration=horizon.length?horizon[1]+" "+horizon[2]:"an unspecified horizon";
    var rows=scenarios.map(function(s){return "<tr><td>"+esc(s.name)+"</td><td>"+Math.round(s.p*100)+"%*</td><td>"+Math.round(s.impact*100)+"%</td><td>"+Math.round(s.cost*100)+"%</td><td>"+Math.round(s.risk*100)+"%</td><td><b>"+s.score.toFixed(1)+"</b></td></tr>";}).join("");
    var html="<p><b>Decision under review:</b> "+esc(goal)+"</p><p class='jpm-muted'>Horizon: "+esc(duration)+". This is a transparent heuristic scenario model, not an AI prediction or verified probability.</p><div class='jpm-row'><b>Leading scenario:</b> "+esc(best.name)+" (relative score "+best.score.toFixed(1)+"/100)</div><h3>SCENARIO COMPARISON</h3><div style='overflow:auto'><table style='width:100%;border-collapse:collapse;font-size:11px'><thead><tr><th>Case</th><th>Success*</th><th>Impact</th><th>Cost</th><th>Risk</th><th>Score</th></tr></thead><tbody>"+rows+"</tbody></table></div><h3>WHAT TO CHECK NEXT</h3><ul><li>Define a measurable success condition and deadline.</li><li>Replace the illustrative success, impact, cost, and risk values with evidence from your situation.</li><li>Test the conservative case and identify what would invalidate the recommendation.</li><li>For health, legal, financial, or safety-critical decisions, use qualified human advice.</li></ul><p class='jpm-muted'>*All percentages are illustrative assumptions generated locally; they are not measured forecasts. Score = success × impact − cost penalty − risk penalty.</p>";
    show("ORACLE // DECISION INTELLIGENCE",html,"Oracle compared three illustrative scenarios for "+goal+". The balanced case is not a factual prediction; review the assumptions before deciding.");
    return true;
  }

  /* GHOST OPERATOR: visible, bounded browser-page interactions only. */
  function visible(el){if(!el||!el.isConnected)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"&&Number(s.opacity||1)>0;}
  function label(el){return (el.getAttribute("aria-label")||el.innerText||el.textContent||el.getAttribute("title")||el.getAttribute("placeholder")||"").replace(/\s+/g," ").trim().slice(0,140);}
  function findTarget(query){var q=query.toLowerCase(),els=Array.prototype.slice.call(document.querySelectorAll("button,a,input,textarea,select,[role='button'],[role='link'],[contenteditable='true'],[tabindex]"));return els.filter(visible).map(function(el){var l=label(el),id=el.id||"",ph=el.getAttribute("placeholder")||"",al=el.getAttribute("aria-label")||"";var hay=(l+" "+id+" "+ph+" "+al).toLowerCase();var score=hay===q?100:hay.indexOf(q)>=0?50:0;return{el:el,label:l||el.tagName.toLowerCase(),score:score};}).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,8);}
  function ghost(raw){
    var m, c=String(raw||"").trim();
    if(/^(?:ghost operator|computer use|inspect visible controls|scan this page|show page controls)$/i.test(c)){
      var list=Array.prototype.slice.call(document.querySelectorAll("button,a,input,textarea,select,[role='button'],[role='link']")).filter(visible).slice(0,40);
      var html="<p>Local page inspection found "+list.length+" visible controls (maximum 40 shown). Nothing has been clicked.</p><ol>"+list.map(function(el){return "<li>"+esc(label(el)||el.tagName.toLowerCase())+" <span class='jpm-muted'>["+esc(el.tagName.toLowerCase())+"]</span></li>";}).join("")+"</ol><p class='jpm-muted'>This free mode inspects accessible DOM labels in this tab. It does not use a vision model, operate other apps, bypass browser security, or control the operating system.</p>";
      show("GHOST OPERATOR // PAGE INSPECTOR",html,"Ghost Operator inspected visible controls. No action was taken.");return true;
    }
    m=c.match(/^(?:ghost operator\s+)?(?:click|press|activate|select)\s+(?:the\s+)?(.+)$/i);
    if(m){var found=findTarget(m[1]);if(!found.length){show("GHOST OPERATOR","<p>No visible page control matched <b>"+esc(m[1])+"</b>.</p><p>Try “inspect visible controls” to see available labels.</p>","I couldn't find a visible control matching "+m[1]+".");return true;}
      var f=found[0],tag=f.el.tagName.toLowerCase(),type=(f.el.getAttribute("type")||"").toLowerCase(),destructive=/delete|remove|purchase|buy|pay|send|submit|transfer|publish|deploy|erase|cancel|confirm|log ?out/i.test(f.label+" "+m[1]);
      if(destructive||tag==="input"&&type==="submit"||f.el.closest("form")){
        pendingAction={el:f.el,label:f.label};show("GHOST OPERATOR // CONFIRM ACTION","<p>Target found: <b>"+esc(f.label)+"</b></p><p class='jpm-muted'>This action may submit data or change state. Confirm only if you intentionally want the page to perform it.</p><button id='jpm-approve' class='jpm-danger' type='button'>CONFIRM AND ACT</button> <button id='jpm-reject' type='button'>CANCEL</button>","I found "+f.label+". Please confirm before I act.");
        var b=document.getElementById("jpm-body");b.querySelector("#jpm-approve").onclick=function(){var p=pendingAction;pendingAction=null;if(p&&p.el&&p.el.isConnected){p.el.focus();p.el.click();show("GHOST OPERATOR","<p>Action dispatched to <b>"+esc(p.label)+"</b>. Verify the result on the page.</p>","Action dispatched. Please verify the result.");}else show("GHOST OPERATOR","<p>Target is no longer available; no action taken.</p>");};b.querySelector("#jpm-reject").onclick=function(){pendingAction=null;show("GHOST OPERATOR","<p>Action cancelled. Nothing was clicked.</p>");};return true;
      }
      f.el.focus();f.el.click();show("GHOST OPERATOR","<p>Activated visible control: <b>"+esc(f.label)+"</b>.</p><p class='jpm-muted'>Check the page to confirm the expected result.</p>","Activated "+f.label+".");return true;
    }
    m=c.match(/^(?:ghost operator\s+)?(?:type|enter|fill)\s+(.+?)\s+(?:into|in)\s+(?:the\s+)?(.+)$/i);
    if(m){var hits=findTarget(m[2]),target=hits.filter(function(x){return /^(input|textarea)$/.test(x.el.tagName.toLowerCase())||x.el.isContentEditable||x.el.getAttribute("role")==="textbox";})[0];if(!target){show("GHOST OPERATOR","<p>No visible text field matched <b>"+esc(m[2])+"</b>.</p>");return true;}target.el.focus();if(target.el.isContentEditable)target.el.textContent=m[1];else target.el.value=m[1];target.el.dispatchEvent(new Event("input",{bubbles:true}));target.el.dispatchEvent(new Event("change",{bubbles:true}));show("GHOST OPERATOR","<p>Entered text into <b>"+esc(target.label)+"</b>. It has not been submitted.</p>","Text entered. I have not submitted the form.");return true;}
    return false;
  }

  /* DIGITAL TWIN: create a small local dependency graph and run a failure scenario without touching the real system. */
  function twin(raw){
    var c=String(raw||"").trim(),lower=c.toLowerCase(),name=(c.match(/(?:for|of|called|named)\s+(.+)$/i)||[])[1]||"JARVIS Web";
    var comps=[
      {id:"ui",name:"HUD / UI",deps:[],risk:0.08},
      {id:"cmd",name:"Command router",deps:["ui"],risk:0.16},
      {id:"voice",name:"Voice input/output",deps:["cmd"],risk:0.22},
      {id:"mods",name:"Feature modules",deps:["cmd"],risk:0.18},
      {id:"net",name:"Network / external services",deps:["mods"],risk:0.35},
      {id:"store",name:"Local storage",deps:["mods"],risk:0.14},
      {id:"deploy",name:"Hosting / deployment",deps:["ui","cmd"],risk:0.20}
    ];
    var issue=(c.match(/(?:simulate|model|twin|what if|failure|fail|break|disable|outage)\\s+(?:a\\s+)?(.+?)(?:\\s+(?:failure|outage|fails|breaks|down))?$/i)||[])[1]||"";
    if(/^(?:for|of|called|named)\\b/i.test(issue))issue="";
    var target=issue?(comps.find(function(x){return (x.id+" "+x.name).toLowerCase().indexOf(issue.toLowerCase())>=0;})||comps.find(function(x){return (x.id+" "+x.name).toLowerCase().indexOf(lower.indexOf("voice")>=0?"voice":lower.indexOf("ui")>=0?"hud":lower.indexOf("storage")>=0?"storage":"network")>=0;})):null;
    if(/^(?:digital twin|open digital twin|show digital twin|build digital twin|create digital twin|simulate system)$/i.test(c))target=null;
    var impacted={};function mark(id){if(impacted[id])return;impacted[id]=true;comps.forEach(function(x){if(x.deps.indexOf(id)>=0)mark(x.id);});}
    if(target)mark(target.id);
    var rows=comps.map(function(x){var hit=!!impacted[x.id];return "<tr><td>"+esc(x.name)+"</td><td>"+esc(x.deps.map(function(id){return comps.find(function(z){return z.id===id;}).name;}).join(", ")||"Root")+"</td><td>"+Math.round(x.risk*100)+"%</td><td style='color:"+(hit?"#ffcf80":"#8df5c7")+"'>"+(hit?"IMPACTED":"NOMINAL")+"</td></tr>";}).join("");
    var impactCount=Object.keys(impacted).length,html="<p><b>Model:</b> "+esc(name)+"</p><p class='jpm-muted'>Illustrative dependency model generated locally. These are assumptions, not a scan of your server or a verified replica.</p><h3>COMPONENT GRAPH</h3><div style='overflow:auto'><table style='width:100%;border-collapse:collapse;font-size:11px'><thead><tr><th>Component</th><th>Depends on</th><th>Assumed risk</th><th>Scenario</th></tr></thead><tbody>"+rows+"</tbody></table></div>";
    if(target)html+="<div class='jpm-row'><b>Simulated fault:</b> "+esc(target.name)+" unavailable.<br><b>Potentially impacted components:</b> "+impactCount+" of "+comps.length+".<br><b>Suggested resilience check:</b> verify graceful error handling, timeouts, fallback behavior, and recovery after the dependency returns.</div>";
    else html+="<p>Try: “simulate network failure”, “what if voice fails”, or “digital twin for JARVIS Web”.</p>";
    html+="<p class='jpm-muted'>Simulation is read-only: it does not disable services, modify files, change deployments, or affect your real JARVIS.</p>";
    lastTwin={name:name,target:target&&target.id||null,components:comps,impacted:impacted,at:Date.now()};saveTwin(lastTwin);
    show("DIGITAL TWIN // SIMULATION",html,target?"Simulated "+target.name+" failure in the local twin only. The real system was not changed.":"Digital twin sandbox ready.");return true;
  }

  function handle(raw){var c=clean(raw);if(!c)return false;
    if(/\b(?:oracle|predictive decision|decision intelligence|forecast scenarios|compare scenarios|run scenarios|what if analysis|help me decide)\b/i.test(c))return oracle(c);
    if(/^(?:inspect visible controls|scan this page|show page controls|ghost operator|computer use)$/i.test(c)||/^(?:ghost operator\s+)?(?:click|press|activate|select|type|enter|fill)\s+/i.test(c))return ghost(c);
    if(/\b(?:digital twin|simulate (?:a )?(?:network|voice|ui|hud|storage|deployment|system)|what if (?:the )?(?:network|voice|ui|hud|storage|deployment)|simulate .*failure|simulate .*outage)\b/i.test(c))return twin(c);
    return false;
  }
  window.JARVISPowerModules={version:"1.0.0",handleCommand:handle,oracle:oracle,ghostOperator:ghost,digitalTwin:twin};
  function install(){if(typeof window.sendCommand==="function"&&!window.sendCommand.__jpmWrapped){var old=window.sendCommand,wrapped=function(command){if(handle(command))return Promise.resolve();return old.apply(this,arguments);};wrapped.__jpmWrapped=true;window.sendCommand=wrapped;}}
  install();document.addEventListener("DOMContentLoaded",install);var retry=setInterval(function(){install();if(window.sendCommand&&window.sendCommand.__jpmWrapped)clearInterval(retry);},250);setTimeout(function(){clearInterval(retry);},6000);
  window.addEventListener("keydown",function(e){if(e.key==="Escape"&&panel)panel.style.display="none";});
})();