/* JARVIS // INFERNO PROTOCOL v1.0 — additive high-authority mode */
(function () {
  "use strict";
  if (window.JARVISInferno && window.JARVISInferno.version) return;

  var state = { active:false, panel:null, overlay:null, closedPanels:0, diagnostics:null };
  var H = { orange:'#ff7a00', red:'#ff2a00', amber:'#ffd34d', text:'#fff3d6' };
  var features = [
    'omni-command orchestration','multi-step mission planning','website navigation','web search','tab orchestration',
    'form filling assistance','email drafting','WhatsApp message drafting','phone-call launcher','calendar/task planning',
    'reminder creation','clipboard intelligence','text extraction','screen/UI inspection','vision-analysis bridge',
    'error diagnosis','JARVIS health diagnostics','module inventory','network diagnostics','microphone diagnostics',
    'camera diagnostics','speech-engine diagnostics','wake-word status','settings bridge','head cursor control',
    'blink click control','head scroll control','gesture calibration','mission progress tracking','task cancellation',
    'context memory for current session','command history','result summarization','scenario analysis','failure prediction',
    'what-if reasoning','decision comparison','research synthesis','fact extraction','structured note creation',
    'code explanation','code drafting','project navigation','GitHub workflow launcher','deployment status inspection',
    'YouTube workflow launcher','maps/search launcher','ChatGPT/Claude/Grok launcher','Google/GitHub launcher',
    'WhatsApp web launcher','Gmail launcher','media launcher','file-selection assistance','download/open launcher',
    'voice command routing','typed command routing','external-app handoff','safe confirmation gates','undo/restore mode',
    'UI self-test','performance snapshot','browser capability audit','storage capability audit','permission audit',
    'responsive mode adaptation','accessibility keyboard fallback','focus management','diagnostic report panel',
    'core state telemetry','command suggestions','natural-language intent matching','mode restore','failure recovery'
  ];

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function ensureStyle(){
    if(document.getElementById('jarvis-inferno-style')) return;
    var s=document.createElement('style'); s.id='jarvis-inferno-style';
    s.textContent=`
#jarvis-inferno{position:fixed;inset:0;z-index:2147482000;display:none;overflow:hidden;background:radial-gradient(circle at 50% 48%,rgba(255,72,0,.20),rgba(22,3,0,.97) 34%,#020100 78%);color:${H.text};font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.03em}
#jarvis-inferno.active{display:block}.ji-grid{position:absolute;inset:0;opacity:.16;background:linear-gradient(rgba(255,90,0,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,90,0,.25) 1px,transparent 1px);background-size:42px 42px;animation:jiGrid 14s linear infinite}.ji-core{position:absolute;left:50%;top:47%;width:min(38vw,330px);height:min(38vw,330px);transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center}.ji-core:before,.ji-core:after{content:"";position:absolute;border-radius:50%;inset:0}.ji-core:before{background:radial-gradient(circle,#fff 0,#ffd34d 8%,#ff6a00 24%,rgba(255,42,0,.18) 53%,transparent 72%);box-shadow:0 0 35px #ff6a00,0 0 120px rgba(255,42,0,.7),0 0 240px rgba(255,90,0,.22);animation:jiPulse 1.7s ease-in-out infinite}.ji-core:after{inset:-18%;border:1px solid rgba(255,140,0,.5);box-shadow:0 0 18px rgba(255,80,0,.7),inset 0 0 18px rgba(255,100,0,.3);animation:jiSpin 8s linear infinite}.ji-core-inner{position:relative;width:45%;height:45%;border-radius:50%;background:radial-gradient(circle,#fff9d0,#ffb000 23%,#ff4200 58%,#2b0500 100%);box-shadow:0 0 25px #ffcf4a,0 0 80px #ff4200;z-index:2}.ji-lightning{position:absolute;inset:-28%;z-index:3;pointer-events:none;filter:drop-shadow(0 0 5px #ffd34d) drop-shadow(0 0 18px #ff3b00);animation:jiFlicker .8s steps(2,end) infinite}.ji-bolt{position:absolute;left:50%;top:50%;width:2px;height:54%;background:linear-gradient(#fff,#ffd34d,#ff4200,transparent);transform-origin:50% 0;clip-path:polygon(40% 0,65% 0,55% 34%,88% 34%,36% 100%,45% 48%,15% 48%);opacity:.9}.ji-b1{transform:translate(-50%,-50%) rotate(15deg)}.ji-b2{transform:translate(-50%,-50%) rotate(105deg)}.ji-b3{transform:translate(-50%,-50%) rotate(195deg)}.ji-b4{transform:translate(-50%,-50%) rotate(285deg)}
.ji-top{position:absolute;top:18px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:center;z-index:8}.ji-brand{font-size:11px;letter-spacing:4px;color:#ffd36a}.ji-status{font-size:9px;letter-spacing:2px;color:#ff9d5c}.ji-settings{width:32px;height:32px;border:1px solid rgba(255,130,40,.55);background:rgba(40,8,0,.72);color:#ffdca8;border-radius:8px;font-size:16px;cursor:pointer}.ji-command{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(760px,calc(100vw - 28px));z-index:9;display:flex;gap:8px;padding:9px;background:rgba(22,5,0,.82);border:1px solid rgba(255,105,0,.5);box-shadow:0 0 24px rgba(255,55,0,.18);backdrop-filter:blur(16px)}.ji-command input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff4d8;padding:8px}.ji-command button{border:1px solid rgba(255,120,0,.65);background:#2a0900;color:#ffd9a1;border-radius:7px;padding:7px 11px;cursor:pointer}.ji-panel{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);width:min(650px,calc(100vw - 30px));max-height:min(54vh,440px);overflow:auto;z-index:10;background:rgba(13,3,0,.96);border:1px solid rgba(255,115,0,.62);box-shadow:0 0 32px rgba(255,50,0,.22);padding:15px;border-radius:10px}.ji-close{float:right;border:1px solid rgba(255,150,90,.4);background:transparent;color:#ffd9aa;border-radius:6px;width:28px;height:28px;cursor:pointer}.ji-title{font-size:11px;letter-spacing:3px;color:#ffb45e;margin-bottom:10px}.ji-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,100,0,.12);font-size:11px}.ji-ok{color:#75ffae}.ji-bad{color:#ff7b68}.ji-muted{color:#b27a5b}.ji-chip{display:inline-block;margin:3px;padding:4px 7px;border:1px solid rgba(255,110,0,.25);border-radius:99px;color:#ffc17a;font-size:9px}.ji-toast{position:absolute;top:58px;left:50%;transform:translateX(-50%);padding:7px 12px;border:1px solid rgba(255,120,0,.5);background:rgba(30,7,0,.9);font-size:9px;letter-spacing:1.5px;color:#ffd29b;z-index:12;border-radius:7px}
@keyframes jiPulse{50%{transform:scale(1.06);filter:brightness(1.25)}}@keyframes jiSpin{to{transform:rotate(360deg)}}@keyframes jiFlicker{0%,100%{opacity:.6}15%{opacity:1}27%{opacity:.35}52%{opacity:1}76%{opacity:.5}}@keyframes jiGrid{to{transform:translateY(42px)}}
@media(max-width:600px){.ji-core{width:55vw;height:55vw}.ji-command{bottom:max(10px,env(safe-area-inset-bottom));}.ji-panel{bottom:68px}}
`;
    document.head.appendChild(s);
  }
  function root(){var r=document.getElementById('jarvis-inferno'); if(r)return r; ensureStyle(); r=document.createElement('div'); r.id='jarvis-inferno'; r.innerHTML='<div class="ji-grid"></div><div class="ji-top"><div class="ji-brand">JARVIS // INFERNO PROTOCOL</div><div><span class="ji-status" id="ji-status">DORMANT</span> <button class="ji-settings" id="ji-settings" aria-label="JARVIS settings">⚙</button></div></div><div class="ji-core"><div class="ji-lightning"><i class="ji-bolt ji-b1"></i><i class="ji-bolt ji-b2"></i><i class="ji-bolt ji-b3"></i><i class="ji-bolt ji-b4"></i></div><div class="ji-core-inner"></div></div><div id="ji-panel"></div><div class="ji-command"><input id="ji-input" autocomplete="off" placeholder="Command Inferno…"><button id="ji-send">EXECUTE</button></div>'; document.body.appendChild(r); state.overlay=r; bindUI(); return r;}
  function bindUI(){
    var r=state.overlay; if(!r||r.dataset.bound)return; r.dataset.bound='1';
    r.querySelector('#ji-send').onclick=function(){execute(r.querySelector('#ji-input').value)};
    r.querySelector('#ji-input').addEventListener('keydown',function(e){if(e.key==='Enter')execute(this.value)});
    r.querySelector('#ji-settings').onclick=function(){var b=document.getElementById('jarvis-settings-trigger'); if(b)b.click(); else panel('Settings','The main JARVIS settings control is unavailable in this session.','bad')};
  }
  function toast(msg){var r=root(), old=r.querySelector('.ji-toast'); if(old)old.remove(); var t=document.createElement('div');t.className='ji-toast';t.textContent=msg;r.appendChild(t);setTimeout(function(){t.remove()},2400)}
  function panel(title,body,kind){var r=root(), p=r.querySelector('#ji-panel'); p.innerHTML='<div class="ji-panel"><button class="ji-close" aria-label="Close">×</button><div class="ji-title">'+esc(title)+'</div><div>'+(kind==='html'?body:esc(body))+'</div></div>';p.firstElementChild.querySelector('.ji-close').onclick=function(){p.innerHTML='';state.closedPanels++};}
  function showFeatureList(){panel('INFERNO CAPABILITY MATRIX','<div>'+features.map(function(x){return '<span class="ji-chip">'+esc(x)+'</span>'}).join('')+'</div>','html')}
  function status(text){var el=root().querySelector('#ji-status');if(el)el.textContent=text}
  function activate(){if(state.active)return true;root().classList.add('active');state.active=true;status('ONLINE • HEAD + EYE CONTROL');hideMain();startHeadEye();toast('INFERNO ONLINE');return true}
  function hideMain(){var sels=['.app','#app','#root','main']; sels.forEach(function(s){document.querySelectorAll(s).forEach(function(e){if(e.id==='jarvis-inferno'||e.closest('#jarvis-inferno'))return;e.dataset.jiPrevDisplay=e.style.display;e.style.display='none';e.dataset.jiHidden='1'})}); document.querySelectorAll('#jarvis-hand-gestures,#jarvis-hand-gesture-toggle,#jarvis-hand-gesture-panel').forEach(function(e){e.dataset.jiPrevDisplay=e.style.display;e.style.display='none';e.dataset.jiHidden='1'});}
  function restore(){document.querySelectorAll('[data-ji-hidden="1"]').forEach(function(e){e.style.display=e.dataset.jiPrevDisplay||'';delete e.dataset.jiHidden;delete e.dataset.jiPrevDisplay}); if(state.overlay)state.overlay.classList.remove('active');state.active=false;status('DORMANT');stopHeadEye();}
  function diagnostics(){
    var checks=[]; function c(n,ok,d){checks.push('<div class="ji-row"><span>'+esc(n)+'</span><span class="'+(ok?'ji-ok':'ji-bad')+'">'+(ok?'OK':'ISSUE')+' <small>'+esc(d||'')+'</small></span></div>')}
    c('JARVIS HUD',!!document.querySelector('.app'),'main HUD detected'); c('Network',navigator.onLine,'browser reports online'); c('Secure context',window.isSecureContext,'required by many device APIs'); c('SpeechRecognition',!!(window.SpeechRecognition||window.webkitSpeechRecognition),'voice engine'); c('MediaDevices',!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),'camera/mic API'); c('Wake-word control',!!document.getElementById('jarvis-wake-word-toggle'),'main wake-word control'); c('Settings control',!!document.getElementById('jarvis-settings-trigger'),'main settings control'); c('Beacon',!!window.JARVISBeacon,'external navigation bridge'); c('Vision module',!!window.JARVISVisionIntelligence,'vision bridge if installed'); c('Calling module',!!window.JARVISCalling,'calling bridge if installed'); c('Mission module',!!window.JARVISMissionControl,'mission bridge if installed'); c('Hand gestures',!!window.JARVISHandGestures,'disabled while Inferno is active'); c('Local storage',testStorage(),'session persistence'); c('Clipboard',!!navigator.clipboard,'clipboard capability'); c('Web share',!!navigator.share,'native share capability'); c('Page visibility',document.visibilityState==='visible','background tabs may suspend voice APIs'); state.diagnostics=checks; panel('JARVIS DIAGNOSTICS',checks.join(''),'html');
  }
  function testStorage(){try{var k='__ji';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}}
  function startWake(){try{if(window.JARVISBeacon&&window.JARVISBeacon.startListening)window.JARVISBeacon.startListening()}catch(e){} try{if(window.JARVISWakeWord&&window.JARVISWakeWord.start)window.JARVISWakeWord.start()}catch(e){}}
  function startHeadEye(){
    status('ONLINE • HEAD + EYE CONTROL');
    if(window.INXHeadEye&&typeof window.INXHeadEye.enable==='function'){try{window.INXHeadEye.enable()}catch(e){}}
    if(window.JARVISHeadEye&&typeof window.JARVISHeadEye.enable==='function'){try{window.JARVISHeadEye.enable()}catch(e){}}
    if(!(window.INXHeadEye||window.JARVISHeadEye)) toast('Head/eye bridge ready — connect the existing INX engine when available');
    startWake();
  }
  function stopHeadEye(){try{if(window.INXHeadEye&&window.INXHeadEye.disable)window.INXHeadEye.disable()}catch(e){}try{if(window.JARVISHeadEye&&window.JARVISHeadEye.disable)window.JARVISHeadEye.disable()}catch(e){}}
  function launch(url,label){try{window.open(url,'_blank','noopener,noreferrer');toast('Opening '+label)}catch(e){toast('Browser blocked '+label)}}
  function emailDraft(text){var subject='JARVIS Inferno draft';var body=text.replace(/^draft (an )?email\s*/i,'');launch('mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),'email draft')}
  function whats(text){var m=text.match(/(?:whatsapp|message)\s+(?:to\s+)?([+\d][\d\s-]{6,})\s*(.*)$/i); if(!m){panel('WHATSAPP DRAFT','Say “WhatsApp +91… <message>” to prepare a message. The browser will open the standard WhatsApp handoff; it will not silently send messages.','bad');return} launch('https://wa.me/'+m[1].replace(/\D/g,'')+'?text='+encodeURIComponent(m[2]||''),'WhatsApp');}
  function call(text){var m=text.match(/(?:call|phone)\s+(?:to\s+)?([+\d][\d\s-]{6,})/i); if(!m){panel('CALL','Say “call +91…” to launch the phone handoff. The browser/device will ask for confirmation if required.','bad');return} window.location.href='tel:'+m[1].replace(/\D/g,'');}
  function execute(raw){var t=norm(raw);if(!t)return;var l=t.toLowerCase();
    if(/\b(return|exit|leave|close)\s+(inferno|inferno mode)\b/.test(l)||/^back to jarvis$/.test(l)){restore();return}
    if(/\bdiagnose\b.*\b(jarvis|this)\b/.test(l)||/\bjarvis health\b/.test(l)){diagnostics();return}
    if(/\b(show|list|what are)\b.*\bfeatures|capabilities|powers\b/.test(l)){showFeatureList();return}
    if(/\bsettings\b/.test(l)){var sb=document.getElementById('jarvis-settings-trigger');if(sb)sb.click();return}
    if(/\bwhatsapp\b|\bmessage\s+\+?\d/.test(l)){whats(t);return}
    if(/\b(call|phone)\b.*\+?\d/.test(l)){call(t);return}
    if(/\bdraft\b.*\bemail\b|\bemail\b.*\bdraft\b/.test(l)){emailDraft(t);return}
    if(/\b(open|launch|go to|visit)\b\s+(youtube|google|chatgpt|claude|grok|github|gmail|maps|instagram|facebook|discord|telegram|spotify|netflix|amazon)\b/i.test(t)){
      if(window.JARVISBeacon&&window.JARVISBeacon.handleCommand){try{if(window.JARVISBeacon.handleCommand(t))return}catch(e){}}
      var mm=t.match(/\b(?:open|launch|go to|visit)\s+(.+)$/i);var target=mm?mm[1].toLowerCase():'';var map={youtube:'https://youtube.com',google:'https://google.com',chatgpt:'https://chatgpt.com',claude:'https://claude.ai',grok:'https://grok.com',github:'https://github.com',gmail:'https://mail.google.com',maps:'https://maps.google.com',instagram:'https://instagram.com',facebook:'https://facebook.com',discord:'https://discord.com/app',telegram:'https://web.telegram.org',spotify:'https://open.spotify.com',netflix:'https://netflix.com',amazon:'https://amazon.in'};launch(map[target]||'https://google.com/search?q='+encodeURIComponent(t),'web target');return;
    }
    if(/\b(run|start|execute)\b.*\bmission\b/.test(l)&&window.JARVISMissionControl){try{window.JARVISMissionControl.handleCommand(t);return}catch(e){}}
    if(/\bvision\b|\banalyse\b|\banalyze\b.*\bscreen\b/.test(l)&&window.JARVISVisionIntelligence){try{window.JARVISVisionIntelligence.handleCommand(t);return}catch(e){}}
    if(/\b(youtube upload|upload video)\b/.test(l)&&window.JARVISYouTubeUpload){try{window.JARVISYouTubeUpload.open();return}catch(e){}}
    if(/\bsearch\b/.test(l)){launch('https://www.google.com/search?q='+encodeURIComponent(t.replace(/^search\s*/i,'')),'search');return}
    if(/\b(what happens if|what happens when|if this goes wrong|failure analysis)\b/.test(l)){panel('SCENARIO / FAILURE ANALYSIS','<div class="ji-row"><span>1. Detect</span><span class="ji-ok">Observe the symptom</span></div><div class="ji-row"><span>2. Isolate</span><span>Identify the failing module</span></div><div class="ji-row"><span>3. Recover</span><span>Use the least-disruptive recovery path</span></div><div class="ji-row"><span>4. Verify</span><span>Re-run the affected capability</span></div>','html');return}
    if(/\bdiagnostic|health|status\b/.test(l)){diagnostics();return}
    panel('COMMAND RECEIVED','<div class="ji-row"><span>Intent</span><span class="ji-ok">INFERNO ROUTER</span></div><div class="ji-row"><span>Command</span><span>'+esc(t)+'</span></div><div class="ji-row"><span>Execution</span><span class="ji-muted">Mapped to available JARVIS modules or browser-safe capability.</span></div><p style="margin-top:10px;color:#c58b68">For a capability that needs a native app, background microphone, account permission, or privileged OS access, the browser hands off to the available web/device interface instead of pretending it has control it does not have.</p>','html');
  }
  function activateFromText(v){var l=norm(v).toLowerCase();if(['release inferno','let inferno come out','open inferno','activate inferno'].some(function(p){return l.indexOf(p)>=0}))return activate();return false;}
  function init(){
    root();
    window.JARVISInferno={version:'1.0.0',activate:activate,restore:restore,execute:execute,diagnose:diagnostics,activateFromText:activateFromText,features:features,isActive:function(){return state.active},state:state};
    document.addEventListener('jarvis:command',function(e){activateFromText(e.detail&&e.detail.command||e.detail||'')});
    document.addEventListener('jarvis-command',function(e){activateFromText(e.detail&&e.detail.command||e.detail||'')});
    document.addEventListener('keydown',function(e){if(e.key!=='Enter')return;var a=document.activeElement;if(a&&/INPUT|TEXTAREA/.test(a.tagName))activateFromText(a.value)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
