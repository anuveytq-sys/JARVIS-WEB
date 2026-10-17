/* NEON NEXUS — JARVIS's magenta command environment. Shared browser-local memory/tasks; no secrets. */
(()=>{'use strict';
  // PATCH: keep the floating NEXUS launcher exclusive to the main HUD; it must never
  // remain visible over VELVE or TERRANEXUS environments.
  const VERSION='neon-nexus-20261016a';
  const STORE='jarvisSuperpowersV1';
  const $=(s,r=document)=>r.querySelector(s);
  const safeState=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(_){return {}}};
  const speak=text=>{try{if(typeof window.speak==='function')window.speak(text);else if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text))}}catch(_){}};
  const logTask=text=>{try{const s=safeState();s.tasks=Array.isArray(s.tasks)?s.tasks:[];s.tasks.push({id:Date.now(),text:String(text).slice(0,180),done:true,source:'NEON NEXUS',at:new Date().toISOString()});s.tasks=s.tasks.slice(-100);localStorage.setItem(STORE,JSON.stringify(s))}catch(_){}};
  let root,recognition,clockTimer,refreshTimer,lastReply='';
  const telemetry={longTasks:0,longTaskMs:0,jsErrors:0,webglLosses:0,lastAIRequest:null,fps:0,frameMs:0,frameCount:0,frameStart:0,frameLast:0,frameRAF:0,observerReady:false};
  function initTelemetry(){if(telemetry.observerReady)return;telemetry.observerReady=true;try{window.addEventListener('error',()=>telemetry.jsErrors++);window.addEventListener('unhandledrejection',()=>telemetry.jsErrors++);document.addEventListener('webglcontextlost',()=>telemetry.webglLosses++,true);if('PerformanceObserver'in window){const po=new PerformanceObserver(list=>{for(const entry of list.getEntries()){telemetry.longTasks++;telemetry.longTaskMs+=entry.duration||0}});po.observe({type:'longtask',buffered:true})}}catch(_){}}
  function sampleFrames(){if(!root?.classList.contains('open')){telemetry.frameRAF=0;telemetry.frameStart=0;return}const now=performance.now();if(telemetry.frameLast){const delta=now-telemetry.frameLast;if(delta>0&&delta<1000){telemetry.frameMs=delta;telemetry.frameCount++;if(!telemetry.frameStart)telemetry.frameStart=now;if(now-telemetry.frameStart>=1200){telemetry.fps=Math.round(telemetry.frameCount/((now-telemetry.frameStart)/1000));telemetry.frameCount=0;telemetry.frameStart=now}}}telemetry.frameLast=now;telemetry.frameRAF=requestAnimationFrame(sampleFrames)}
  function fmtBytes(n){if(!Number.isFinite(n)||n<0)return 'UNAVAILABLE';const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return n.toFixed(i?1:0)+' '+u[i]}
  function monitorValue(label,value,kind='') {return '<div class="nn-system-metric"><span>'+escapeHTML(label)+'</span><b class="'+kind+'">'+escapeHTML(value)+'</b></div>'}
  function renderMonitor(){const box=$('#nn-monitor');if(!box)return;const mem=performance.memory;const nav=navigator;const env=document.body.classList.contains('velve-active')||document.body.classList.contains('velve-open')?'VELVE':$('#terranexus-overlay')?'TERRANEXUS':document.body.classList.contains('neon-nexus-active')?'NEON NEXUS':'MAIN HUD';const videos=[...document.querySelectorAll('video')];const activeTracks=videos.reduce((n,v)=>n+(v.srcObject&&v.srcObject.getTracks?v.srcObject.getTracks().filter(t=>t.readyState==='live').length:0),0);const speech=voice.listening?'LISTENING':('SpeechRecognition'in window||'webkitSpeechRecognition'in window)?'AVAILABLE / IDLE':'UNSUPPORTED';const resources=performance.getEntriesByType?performance.getEntriesByType('resource'):[];const ai=resources.filter(r=>/generativelanguage|gemini|/api/command|/api/voice|openai|anthropic|/api\//i.test(r.name)).slice(-1)[0];const storage=nav.storage&&nav.storage.estimate?null:null;let storageText='UNAVAILABLE';try{const raw=localStorage.getItem(STORE)||'';storageText=fmtBytes(new Blob([raw]).size)+' USED (NEXUS DATA)'}catch(_){}const timing=ai?Math.round(ai.duration)+' MS':'NO MATCHING REQUEST YET';const fpsText=telemetry.fps?telemetry.fps+' FPS':'MEASURING';const frameText=telemetry.frameMs?telemetry.frameMs.toFixed(1)+' MS':'MEASURING';const rows=[['SYSTEM / ENVIRONMENT',env],['NETWORK CONNECTIVITY',nav.onLine?'ONLINE':'OFFLINE'],['DOCUMENT VISIBILITY',document.visibilityState.toUpperCase()],['FRAME RATE (LIVE)',fpsText],['FRAME TIME (LIVE)',frameText],['LONG TASKS OBSERVED',telemetry.longTasks+' · '+telemetry.longTaskMs.toFixed(0)+' MS TOTAL'],['PAGE JS MEMORY',mem?fmtBytes(mem.usedJSHeapSize)+' / '+fmtBytes(mem.jsHeapSizeLimit):'BROWSER DOES NOT EXPOSE IT'],['NEXUS LOCAL DATA',storageText],['LATEST AI/API RESOURCE',timing],['JAVASCRIPT ERRORS',String(telemetry.jsErrors)],['WEBGL CONTEXT LOSSES',String(telemetry.webglLosses)],['VOICE INPUT',speech],['LIVE MEDIA TRACKS',String(activeTracks)],['DOM ELEMENTS',String(document.getElementsByTagName('*').length)],['RESOURCE ENTRIES',String(resources.length)],['WAKE WORD ENGINE','STATUS NOT EXPOSED BY BROWSER'],['GESTURE PIPELINE','CAMERA TRACKS ABOVE; INTERNAL FPS NOT EXPOSED'],['TIMERS / RAF LOOPS','BROWSER CANNOT ENUMERATE ALL APP TIMERS']];box.innerHTML='<div class="nn-monitor-stamp">LIVE BROWSER TELEMETRY · UPDATED '+new Date().toLocaleTimeString()+'</div>'+rows.map((r,i)=>monitorValue(r[0],r[1],i<3?'nn-monitor-value':'')).join('')+'<div class="nn-system-note">Values come from browser APIs and observable JARVIS page state. “Unavailable” means this browser does not expose that metric; no guessed CPU, whole-device RAM, or fake health percentages are shown. AI/API duration is the latest matching resource timing entry and may be absent when requests are hidden or served outside this page.</div>';const state=$('#nn-monitor-state');if(state)state.textContent=nav.onLine?'LIVE':'OFFLINE'}
  function build(){
    if(root)return;
    const style=document.createElement('link');style.rel='stylesheet';style.href='./jarvis-neon-nexus.css?v='+VERSION;document.head.appendChild(style);
    root=document.createElement('section');root.id='neon-nexus';root.setAttribute('aria-label','NEON NEXUS JARVIS Command Environment');
    root.innerHTML=`
      <div class="nn-grid"></div><canvas class="nn-network" id="nn-network"></canvas><div class="nn-vignette"></div>
      <header class="nn-top"><div class="nn-clock"><small>LOCAL SYSTEM TIME</small><strong id="nn-time">--:--:--</strong><span id="nn-date">INITIALIZING</span></div><div class="nn-brand"><span class="nn-brand-dot"></span><div><b>NEON NEXUS</b><small>JARVIS NEURAL COMMAND ENVIRONMENT</small></div></div><div class="nn-top-actions"><span class="nn-online"><i></i> SYSTEM ONLINE</span><button id="nn-back" title="Return to main JARVIS">↙ JARVIS</button></div></header>
      <section class="nn-panel nn-left nn-panel-env" aria-label="Environment status"><div class="nn-panel-head"><span><i>01</i> ENVIRONMENT STATUS</span><b class="nn-live">LIVE</b></div><div id="nn-environments" class="nn-scroll nn-environments"></div></section>
      <section class="nn-panel nn-left nn-panel-tasks" aria-label="Task stream"><div class="nn-panel-head"><span><i>02</i> TASK STREAM</span><b id="nn-task-count">0 LOGS</b></div><div id="nn-tasks" class="nn-scroll nn-tasks"></div></section>
      <section class="nn-panel nn-left nn-panel-system" aria-label="Multi monitor live system status"><div class="nn-panel-head"><span><i>09</i> MULTI MONITOR</span><b id="nn-monitor-state" class="nn-live">LIVE</b></div><div id="nn-monitor" class="nn-scroll nn-monitor-scroll"><div class="nn-system-note">Collecting live browser and JARVIS telemetry…</div></div></section>
      <main class="nn-core-area"><div class="nn-core-caption"><span>NEURAL LINK ESTABLISHED</span><span id="nn-core-state">CORE STANDBY</span></div><div class="nn-orbit nn-orbit-a"></div><div class="nn-orbit nn-orbit-b"></div><div class="nn-orbit nn-orbit-c"></div><div class="nn-core-shadow"></div><button class="nn-core" id="nn-core" aria-label="Activate JARVIS voice input"><span class="nn-core-inner"></span><span class="nn-core-latitude"></span><span class="nn-core-glint"></span><span class="nn-core-label">J<span>A</span>RVIS</span></button><div class="nn-node nn-node-a" data-node="status"><b>◈</b><span>STATUS</span></div><div class="nn-node nn-node-b" data-node="memory"><b>⌘</b><span>MEMORY</span></div><div class="nn-node nn-node-c" data-node="tasks"><b>⇄</b><span>TASKS</span></div><div class="nn-node nn-node-d" data-node="services"><b>✧</b><span>SERVICES</span></div><div class="nn-core-foot"><span>AI CORE / V.4.8</span><span class="nn-pulse"><i></i> NEURAL ACTIVITY</span><span>LATENCY <b id="nn-latency">24 MS</b></span></div></main>
      <section class="nn-panel nn-right nn-panel-services" aria-label="Services directory"><div class="nn-panel-head"><span><i>04</i> SERVICES</span><b id="nn-services-count">06 MODULES</b></div><div id="nn-services" class="nn-scroll nn-memory-list"></div></section>
      <section class="nn-panel nn-right nn-panel-memory" aria-label="Saved memory"><div class="nn-panel-head"><span><i>05</i> MEMORY</span><b id="nn-memory-count">0 SAVED</b></div><div id="nn-memory" class="nn-scroll nn-memory-list"></div><div class="nn-panel-foot"><span>LOCAL BROWSER MEMORY</span><b>SYNC READY</b></div></section>
      <section class="nn-panel nn-right nn-panel-actions" aria-label="Quick actions"><div class="nn-panel-head"><span><i>06</i> QUICK ACTIONS</span><b>TOOLS</b></div><div class="nn-scroll nn-actions-scroll"><div class="nn-quick-grid"><button data-action="time">◷ TIME</button><button data-action="status">◈ STATUS</button><button data-action="tasks">⇄ TASK LOG</button><button data-action="memory">⌘ MEMORY</button><button data-action="fullscreen">⛶ FULLSCREEN</button><button data-action="calculator">∑ CALCULATOR</button><button data-action="copy">▣ COPY REPLY</button><button data-action="monitor">▤ MULTI MONITOR</button><button data-action="main">↙ MAIN HUD</button></div></div></section>
      <form class="nn-console" id="nn-form"><span class="nn-console-mark">⌘</span><div class="nn-input-wrap"><small>COMMAND / WEB SEARCH</small><input id="nn-input" autocomplete="off" placeholder="Ask JARVIS or search the web…" aria-label="Ask JARVIS or search the web"></div><button type="button" id="nn-voice" aria-label="Speak a command" title="Speak">🎙</button><button type="submit" id="nn-send">EXECUTE ↗</button></form><div class="nn-toast" id="nn-toast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(root);$('#nn-back').onclick=close;$('#nn-environments').addEventListener('click',e=>{const item=e.target.closest('[data-environment]');if(item)openEnvironment(item.dataset.environment)});$('#nn-environments').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-environment]')){e.preventDefault();openEnvironment(e.target.dataset.environment)}});$('#nn-core').onclick=voice;$('#nn-voice').onclick=voice;$('#nn-form').addEventListener('submit',submitCommand);root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));root.querySelectorAll('[data-node]').forEach(n=>n.addEventListener('click',()=>action(n.dataset.node)));startNetwork();render();updateClock();clockTimer=setInterval(updateClock,1000);refreshTimer=setInterval(render,2500);document.addEventListener('keydown',escHandler);
  }
  function updateClock(){const d=new Date(),t=$('#nn-time'),date=$('#nn-date');if(t)t.textContent=d.toLocaleTimeString([],{hour12:false});if(date)date.textContent=d.toLocaleDateString([],{weekday:'short',month:'short',day:'2-digit',year:'numeric'}).toUpperCase()}
  function showToast(msg){const el=$('#nn-toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),3400)}
  function render(){if(!root)return;renderMonitor();const s=safeState(),tasks=Array.isArray(s.tasks)?s.tasks:[],memories=Array.isArray(s.memory)?s.memory:[];const envs=[['JARVIS CORE','Main AI · voice · commands · web search'],['NEON NEXUS','Magenta neural command environment'],['VELVE','Earth globe · location · satellite feeds'],['TERRANEXUS','Interactive 3D science workshop']];const e=$('#nn-environments');if(e)e.innerHTML=envs.map((x,i)=>'<div class="nn-env" data-environment="'+['jarvis','nexus','velve','terranexus'][i]+'" role="button" tabindex="0" aria-label="Open '+x[0]+'" title="Open '+x[0]+'"><span class="nn-env-icon">'+['⌘','✧','◎','⚛'][i]+'</span><div><b>'+x[0]+'</b><small>'+x[1]+'</small></div><i class="nn-env-state"></i><em>OPEN ↗</em></div>').join('');const taskBox=$('#nn-tasks');if(taskBox){const items=tasks.slice().reverse().slice(0,60);taskBox.innerHTML=items.length?items.map(t=>'<div class="nn-task"><i class="'+(t.done?'done':'pending')+'">'+(t.done?'✓':'○')+'</i><span>'+escapeHTML(t.text||'JARVIS activity')+'<small>'+(t.at?new Date(t.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):t.source||'JARVIS LOCAL TASK')+'</small></span></div>').join(''):'<div class="nn-empty">No task history yet.<small>Commands and tasks will appear here as you use JARVIS.</small></div>';$('#nn-task-count').textContent=items.length+' LOGS'}renderMemory('services');renderMemory('memory')}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function renderMemory(mode){const box=mode==='memory'?$('#nn-memory'):$('#nn-services');if(!box)return;const s=safeState(),mem=Array.isArray(s.memory)?s.memory:[];const services=[['JARVIS CORE','Natural-language commands, voice input, spoken replies, calculations, browser tools, local memory, task list, web search, time/date, quick actions.'],['NEON NEXUS','Shared task stream, service directory, command routing, voice dictation, neural 3D interface.'],['VELVE','Interactive Earth globe, city navigation, device-location navigation, satellite and aircraft feeds, earthquake feed, weather panel.'],['TERRANEXUS','Interactive 3D science models, element library, component inspector, built-in demonstrations and optional AI explanations.'],['WEB BRIDGE','Visible replies, configured AI provider routing, browser speech output and status feedback.'],['BROWSER UTILITIES','Fullscreen, clipboard, command history, local storage, quick status and Google web search.']];if(mode==='memory'){const rows=mem.map(m=>'<div class="nn-memory-item"><i>⌘</i><span>'+escapeHTML(m)+'</span></div>');if(!rows.length)rows.push('<div class="nn-memory-item nn-memory-default"><i>✧</i><span>NEURAL CORE INITIALIZED<small>Use “remember that …” in JARVIS and saved notes will appear here. Service directory remains available under SERVICES.</small></span></div>');box.innerHTML=rows.join('');$('#nn-memory-count').textContent=mem.length+' SAVED'}else{box.innerHTML=services.map(x=>'<div class="nn-service"><span class="nn-service-icon">✧</span><div><b>'+escapeHTML(x[0])+'</b><small>'+escapeHTML(x[1])+'</small></div></div>').join('');$('#nn-services-count').textContent=String(services.length).padStart(2,'0')+' MODULES'}}
  function action(kind){if(kind==='main'){close();return}if(kind==='monitor'){renderMonitor();$('#nn-monitor')?.scrollTo({top:0,behavior:'smooth'});showToast('Multi Monitor refreshed with live browser telemetry.');return}if(kind==='time'){showToast(new Date().toLocaleString());speak('The time is '+new Date().toLocaleTimeString());return}if(kind==='status'){showToast('JARVIS CORE, NEON NEXUS, VELVE and TERRANEXUS are installed and ready.');return}if(kind==='tasks'){render();$('#nn-tasks')?.scrollTo({top:0,behavior:'smooth'});showToast('Task stream refreshed.');return}if(kind==='memory'){renderMemory('memory');$('#nn-memory')?.scrollTo({top:0,behavior:'smooth'});showToast('Saved memory panel ready.');return}if(kind==='services'){renderMemory('services');$('#nn-services')?.scrollTo({top:0,behavior:'smooth'});showToast('Services directory ready.');return}if(kind==='fullscreen'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();return}}
  function submitCommand(e){e.preventDefault();const input=$('#nn-input'),q=(input.value||'').trim();if(!q)return;input.value='';if(/^(search|google|look up|web search)\b/i.test(q)){const query=q.replace(/^(search(?: the web)?(?: for)?|google|look up|web search(?: for)?)\s*/i,'').trim();if(query){window.open('https://www.google.com/search?q='+encodeURIComponent(query),'_blank','noopener');showToast('Opening web search for '+query);logTask('Web search: '+query)}return}logTask('Command: '+q);try{if(typeof window.sendCommand==='function'){window.sendCommand(q);showToast('Command sent to JARVIS core.')}else{showToast('Main JARVIS command engine is not ready.');speak('The JARVIS command engine is not ready yet.')}}catch(_){showToast('Could not send command to JARVIS.')}}
  function voice(){
    const pauseWake=window.__jarvisPauseWakeWordForEnvironment;
    const resumeWake=window.__jarvisResumeWakeWordAfterEnvironment;
    const releaseWake=()=>{if(voice.wakeReleaseTimer)clearTimeout(voice.wakeReleaseTimer);voice.wakeReleaseTimer=setTimeout(()=>{try{resumeWake?.()}catch(_){}},450)};
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      showToast('Voice recognition is not supported in this browser. Use your keyboard microphone or type a command.');
      $('#nn-input')?.focus();
      return;
    }
    if(voice.listening&&recognition){
      voice.cancelRequested=true;
      try{recognition.stop()}catch(_){}
      releaseWake();
      showToast('Voice input stopped.');
      return;
    }
    if(recognition){
      try{recognition.onresult=recognition.onerror=recognition.onend=null;recognition.abort()}catch(_){}
      recognition=null;
    }
    try{pauseWake?.()}catch(_){}
    const generation=(voice.generation||0)+1;
    voice.generation=generation;
    voice.listening=true;
    voice.cancelRequested=false;
    voice.heard='';
    voice.finished=false;
    let finalText='';
    try{
      const rec=new SR();
      recognition=rec;
      rec.lang=/^(hi|en)(-|$)/i.test(navigator.language||'')?(navigator.language||'en-IN'):'en-IN';
      rec.continuous=true;
      rec.interimResults=true;
      rec.maxAlternatives=1;
      $('#nn-voice')?.classList.add('listening');
      if($('#nn-core-state'))$('#nn-core-state').textContent='LISTENING';
      showToast('Listening… speak your command.');
      const reset=()=>{
        if(generation!==voice.generation)return;
        voice.listening=false;
        $('#nn-voice')?.classList.remove('listening');
        if($('#nn-core-state'))$('#nn-core-state').textContent='CORE STANDBY';
        recognition=null;
        releaseWake();
      };
      const finish=(text)=>{
        if(generation!==voice.generation||voice.finished)return;
        const heard=String(text||'').trim();
        if(!heard)return;
        voice.finished=true;
        $('#nn-input').value=heard;
        showToast('Heard: '+heard);
        reset();
        submitCommand({preventDefault(){}});
      };
      rec.onstart=()=>{
        if(generation!==voice.generation)return;
        showToast('Listening… speak clearly, then pause.');
      };
      rec.onspeechstart=()=>{
        if(generation===voice.generation)showToast('Speech detected… listening.');
      };
      rec.onresult=e=>{
        if(generation!==voice.generation)return;
        let interim='',heardFinal='';
        for(let i=e.resultIndex||0;i<e.results.length;i++){
          const result=e.results[i],transcript=result&&result[0]?String(result[0].transcript||''):'';
          if(result.isFinal)heardFinal+=transcript;
          else interim+=transcript;
        }
        const heard=(heardFinal||interim).trim();
        if(heard){
          voice.heard=heard;
          $('#nn-input').value=heard;
          if(heardFinal.trim())finalText+=heardFinal;
          showToast((heardFinal.trim()?'Heard: ':'Hearing: ')+heard.slice(0,100));
        }
        if(heardFinal.trim())finish(finalText||heardFinal);
      };
      rec.onerror=e=>{
        if(generation!==voice.generation||voice.finished)return;
        const err=String(e&&e.error||'unknown').toLowerCase();
        const messages={
          'not-allowed':'Microphone access is blocked. Allow microphone access for this site in browser settings.',
          'service-not-allowed':'Microphone access is blocked. Allow microphone access for this site in browser settings.',
          'securityerror':'Microphone access is blocked. Open this site securely and allow microphone access.',
          'no-speech':'No speech detected. Tap the microphone and try again.',
          'audio-capture':'Microphone is busy or unavailable. Check your microphone settings.',
          'network':'Speech service network error. Check your internet connection and try again.',
          'aborted':'Voice input was interrupted. Tap the microphone to retry.'
        };
        showToast(messages[err]||('Voice input unavailable ('+err+'). You can type your command instead.'));
        reset();
      };
      rec.onend=()=>{
        if(generation!==voice.generation||voice.finished)return;
        const heard=finalText||voice.heard;
        const cancelled=voice.cancelRequested;
        reset();
        if(cancelled)return;
        if(heard.trim())finish(heard);
        else showToast('Listening ended without speech. Tap the microphone and speak again.');
      };
      // Start synchronously from this tap for mobile-browser permission compatibility.
      rec.start();
    }catch(err){
      voice.listening=false;
      $('#nn-voice')?.classList.remove('listening');
      if($('#nn-core-state'))$('#nn-core-state').textContent='CORE STANDBY';
      recognition=null;
      releaseWake();
      const name=String(err&&err.name||'').toLowerCase();
      showToast(name==='notallowederror'||name==='securityerror'?'Microphone permission is blocked. Allow access in browser settings.':'Could not start the microphone. Tap to retry or type your command.');
    }
  }
  function escHandler(e){if(e.key==='Escape'&&root?.classList.contains('open'))close()}
  function openEnvironment(name){
    if(name==='nexus'){open();return}
    if(name==='velve'){close();window.TERRANEXUS?.close?.();if(window.VELVE?.open)window.VELVE.open();else showToast('VELVE is not ready yet.');return}
    if(name==='terranexus'){close();window.VELVE?.exit?.();if(window.TERRANEXUS?.open)window.TERRANEXUS.open();else showToast('TERRANEXUS is not ready yet.');return}
    close();window.VELVE?.exit?.();window.TERRANEXUS?.close?.();document.body.classList.remove('velve-active','velve-open','terranexus-active','neon-nexus-active');showToast('Returned to the main JARVIS HUD.');
  }
  function open(){build();root.classList.add('open');document.body.classList.add('neon-nexus-active');syncLauncher();initTelemetry();if(!telemetry.frameRAF)telemetry.frameRAF=requestAnimationFrame(sampleFrames);render();updateClock();showToast('NEON NEXUS online. All command panels connected.');speak('Neon Nexus online. JARVIS command environment ready.')}
  function close(){if(root)root.classList.remove('open');document.body.classList.remove('neon-nexus-active');if(recognition){try{recognition.onresult=recognition.onerror=recognition.onend=null;recognition.abort()}catch(_){}recognition=null}voice.listening=false;voice.cancelRequested=true;$('#nn-voice')?.classList.remove('listening');try{window.__jarvisResumeWakeWordAfterEnvironment?.()}catch(_){}syncLauncher()}
  function startNetwork(){const c=$('#nn-network');if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;let w=0,h=0,pts=[],raf=0;const resize=()=>{w=c.width=window.innerWidth*devicePixelRatio;h=c.height=window.innerHeight*devicePixelRatio;c.style.width='100%';c.style.height='100%';pts=Array.from({length:58},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.24*devicePixelRatio,vy:(Math.random()-.5)*.24*devicePixelRatio,r:Math.random()*1.8+.6}))};resize();window.addEventListener('resize',resize);const draw=()=>{ctx.clearRect(0,0,w,h);for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;for(const q of pts){const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<145*devicePixelRatio){ctx.strokeStyle='rgba(255,36,214,'+(.13*(1-d/(145*devicePixelRatio)))+')';ctx.lineWidth=devicePixelRatio;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}ctx.fillStyle='rgba(255,96,231,.8)';ctx.beginPath();ctx.arc(p.x,p.y,p.r*devicePixelRatio,0,Math.PI*2);ctx.fill()}raf=requestAnimationFrame(draw)};draw();const stop=()=>cancelAnimationFrame(raf);window.addEventListener('pagehide',stop,{once:true})}
  const hideLegacy=()=>{const legacy=$('#jarvis-superpowers');if(legacy)legacy.style.setProperty('display','none','important')};hideLegacy();new MutationObserver(hideLegacy).observe(document.documentElement,{childList:true,subtree:true});
  // Keep the NEXUS launcher on the main HUD only. VELVE uses body.velve-active;
  // TERRANEXUS uses #terranexus-overlay. The observer also catches environment changes
  // made by the existing environment scripts without touching those environments.
  function syncLauncher(){const b=$('#nn-launcher');if(!b)return;const velve=document.body.classList.contains('velve-active')||document.body.classList.contains('velve-open')||document.body.classList.contains('velve-active');const terra=!!$('#terranexus-overlay');const neon=!!root?.classList.contains('open');b.style.setProperty('display',(velve||terra||neon)?'none':'block','important')}
  function launcher(){if($('#nn-launcher')){syncLauncher();return}const b=document.createElement('button');b.id='nn-launcher';b.type='button';b.textContent='✧ NEXUS';b.title='Open NEON NEXUS command environment';b.onclick=open;document.body.appendChild(b);syncLauncher()}
  launcher();window.addEventListener('load',launcher);new MutationObserver(syncLauncher).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='n'){e.preventDefault();open()}});
  window.NEON_NEXUS={open,close,render,version:VERSION};
})();
