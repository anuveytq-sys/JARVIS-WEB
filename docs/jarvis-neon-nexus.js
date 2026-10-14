/* NEON NEXUS — JARVIS's magenta command environment. Shared browser-local memory/tasks; no secrets. */
(() => {
  'use strict';
  if (window.__NEON_NEXUS_INSTALLED__) return;
  window.__NEON_NEXUS_INSTALLED__ = true;
  const STORE = 'jarvisSuperpowersV1';
  const $ = (s, r=document) => r.querySelector(s);
  const safeState = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (_) { return {}; } };
  const speak = text => { try { if (typeof window.speak === 'function') window.speak(text); else if ('speechSynthesis' in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } } catch (_) {} };
  const logTask = text => {
    try {
      const s = safeState(); s.tasks = Array.isArray(s.tasks) ? s.tasks : [];
      s.tasks.push({id:Date.now(), text:String(text).slice(0,180), done:true, source:'NEON NEXUS', at:new Date().toISOString()});
      s.tasks = s.tasks.slice(-100); localStorage.setItem(STORE, JSON.stringify(s));
    } catch (_) {}
  };
  let root, recognition, clockTimer, refreshTimer, lastReply = '';
  function build() {
    if (root) return;
    const style = document.createElement('link'); style.rel='stylesheet'; style.href='./jarvis-neon-nexus.css?v=neon-nexus-20261014a'; document.head.appendChild(style);
    root = document.createElement('section'); root.id='neon-nexus'; root.setAttribute('aria-label','NEON NEXUS JARVIS Command Environment');
    root.innerHTML = `
      <div class="nn-grid"></div><canvas class="nn-network" id="nn-network"></canvas><div class="nn-vignette"></div>
      <header class="nn-top">
        <div class="nn-clock"><small>LOCAL SYSTEM TIME</small><strong id="nn-time">--:--:--</strong><span id="nn-date">INITIALIZING</span></div>
        <div class="nn-brand"><span class="nn-brand-dot"></span><div><b>NEON NEXUS</b><small>JARVIS NEURAL COMMAND ENVIRONMENT</small></div></div>
        <div class="nn-top-actions"><span class="nn-online"><i></i> SYSTEM ONLINE</span><button id="nn-back" title="Return to main JARVIS">↙ JARVIS</button></div>
      </header>
      <aside class="nn-panel nn-left">
        <div class="nn-panel-head"><span><i>01</i> ENVIRONMENT STATUS</span><b class="nn-live">LIVE</b></div>
        <div id="nn-environments" class="nn-environments"></div>
        <div class="nn-panel-foot"><span>NETWORK INTEGRITY</span><b>OPTIMAL <em>98.7%</em></b></div>
        <div class="nn-meter"><span></span></div>
        <div class="nn-panel-head nn-subhead"><span><i>02</i> TASK STREAM</span><b id="nn-task-count">0 LOGS</b></div>
        <div id="nn-tasks" class="nn-scroll nn-tasks" aria-label="Completed and pending tasks"></div>
      </aside>
      <main class="nn-core-area">
        <div class="nn-core-caption"><span>NEURAL LINK ESTABLISHED</span><span id="nn-core-state">CORE STANDBY</span></div>
        <div class="nn-orbit nn-orbit-a"></div><div class="nn-orbit nn-orbit-b"></div><div class="nn-orbit nn-orbit-c"></div>
        <div class="nn-core-shadow"></div>
        <button class="nn-core" id="nn-core" aria-label="Activate JARVIS voice input">
          <span class="nn-core-inner"></span><span class="nn-core-latitude"></span><span class="nn-core-glint"></span><span class="nn-core-label">J<span>A</span>RVIS</span>
        </button>
        <div class="nn-node nn-node-a" data-node="status"><b>◈</b><span>STATUS</span></div>
        <div class="nn-node nn-node-b" data-node="memory"><b>⌘</b><span>MEMORY</span></div>
        <div class="nn-node nn-node-c" data-node="tasks"><b>⇄</b><span>TASKS</span></div>
        <div class="nn-node nn-node-d" data-node="services"><b>✧</b><span>SERVICES</span></div>
        <div class="nn-core-foot"><span>AI CORE / V.4.8</span><span class="nn-pulse"><i></i> NEURAL ACTIVITY</span><span>LATENCY <b id="nn-latency">24 MS</b></span></div>
      </main>
      <aside class="nn-panel nn-right">
        <div class="nn-panel-head"><span><i>03</i> MEMORY & SERVICES</span><b id="nn-memory-count">ACTIVE</b></div>
        <div class="nn-memory-tabs"><button class="active" data-memory-tab="services">SERVICES</button><button data-memory-tab="memory">MEMORY</button></div>
        <div id="nn-memory" class="nn-scroll nn-memory-list"></div>
        <div class="nn-panel-foot"><span>LOCAL BROWSER MEMORY</span><b>SYNC READY</b></div>
        <div class="nn-panel-head nn-subhead"><span><i>04</i> QUICK ACTIONS</span><b>TOOLS</b></div>
        <div class="nn-quick-grid">
          <button data-action="time">◷ TIME</button><button data-action="status">◈ STATUS</button>
          <button data-action="tasks">⇄ TASK LOG</button><button data-action="memory">⌘ MEMORY</button>
          <button data-action="fullscreen">⛶ FULLSCREEN</button><button data-action="main">↙ MAIN HUD</button>
        </div>
        <div class="nn-note">Your services and saved memories are stored in this browser. External AI features may require your own configured connection.</div>
      </aside>
      <form class="nn-console" id="nn-form">
        <span class="nn-console-mark">⌘</span><div class="nn-input-wrap"><small>COMMAND / WEB SEARCH</small><input id="nn-input" autocomplete="off" placeholder="Ask JARVIS or search the web…" aria-label="Ask JARVIS or search the web"></div>
        <button type="button" id="nn-voice" aria-label="Speak a command" title="Speak">🎙</button><button type="submit" id="nn-send">EXECUTE ↗</button>
      </form>
      <div class="nn-toast" id="nn-toast" role="status" aria-live="polite"></div>
    `;
    document.body.appendChild(root);
    $('#nn-back').onclick=close;
    $('#nn-core').onclick=voice;
    $('#nn-voice').onclick=voice;
    $('#nn-form').addEventListener('submit', submitCommand);
    root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));
    root.querySelectorAll('[data-node]').forEach(n=>n.addEventListener('click',()=>action(n.dataset.node)));
    root.querySelectorAll('[data-memory-tab]').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('[data-memory-tab]').forEach(x=>x.classList.toggle('active',x===b));renderMemory(b.dataset.memoryTab)}));
    startNetwork(); render(); updateClock(); clockTimer=setInterval(updateClock,1000); refreshTimer=setInterval(render,2500);
    document.addEventListener('keydown', escHandler);
  }
  function updateClock(){const d=new Date();const t=$('#nn-time'),date=$('#nn-date');if(t)t.textContent=d.toLocaleTimeString([], {hour12:false});if(date)date.textContent=d.toLocaleDateString([], {weekday:'short',month:'short',day:'2-digit',year:'numeric'}).toUpperCase()}
  function showToast(msg){const el=$('#nn-toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),3400)}
  function render(){
    if(!root)return;
    const s=safeState(), tasks=Array.isArray(s.tasks)?s.tasks:[], memories=Array.isArray(s.memory)?s.memory:[];
    const envs=[['JARVIS CORE','Main AI · voice · commands · web search'],['NEON NEXUS','Magenta neural command environment'],['VELVE','Earth globe · location · satellite feeds'],['TERRANEXUS','Interactive 3D science workshop']];
    const e=$('#nn-environments'); if(e)e.innerHTML=envs.map((x,i)=>'<div class="nn-env"><span class="nn-env-icon">'+['⌘','✧','◎','⚛'][i]+'</span><div><b>'+x[0]+'</b><small>'+x[1]+'</small></div><i class="nn-env-state"></i><em>READY</em></div>').join('');
    const taskBox=$('#nn-tasks');if(taskBox){const items=tasks.slice().reverse().slice(0,60);taskBox.innerHTML=items.length?items.map(t=>'<div class="nn-task"><i class="'+(t.done?'done':'pending')+'">'+(t.done?'✓':'○')+'</i><span>'+escapeHTML(t.text||'JARVIS activity')+'<small>'+(t.at?new Date(t.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):t.source||'JARVIS LOCAL TASK')+'</small></span></div>').join(''):'<div class="nn-empty">No task history yet.<small>Commands and tasks will appear here as you use JARVIS.</small></div>';$ ('#nn-task-count').textContent=items.length+' LOGS';}
    renderMemory(root.querySelector('[data-memory-tab].active')?.dataset.memoryTab||'services');
  }
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function renderMemory(mode){
    const box=$('#nn-memory');if(!box)return;const s=safeState(),mem=Array.isArray(s.memory)?s.memory:[];
    const services=[
      ['JARVIS CORE','Natural-language commands, voice input, spoken replies, calculations, browser tools, local memory, task list, web search, time/date, quick actions.'],
      ['NEON NEXUS','Shared task stream, service directory, command routing, voice dictation, neural 3D interface.'],
      ['VELVE','Interactive Earth globe, city navigation, device-location navigation, satellite and aircraft feeds, earthquake feed, weather panel.'],
      ['TERRANEXUS','Interactive 3D science models, element library, component inspector, built-in demonstrations and optional AI explanations.'],
      ['WEB BRIDGE','Visible replies, configured AI provider routing, browser speech output and status feedback.'],
      ['BROWSER UTILITIES','Fullscreen, clipboard, command history, local storage, quick status and Google web search.']
    ];
    if(mode==='memory'){
      const rows=mem.map(m=>'<div class="nn-memory-item"><i>⌘</i><span>'+escapeHTML(m)+'</span></div>');
      if(!rows.length)rows.push('<div class="nn-memory-item nn-memory-default"><i>✧</i><span>NEURAL CORE INITIALIZED<small>Use “remember that …” in JARVIS and saved notes will appear here. Service directory remains available under SERVICES.</small></span></div>');
      box.innerHTML=rows.join('');
      $('#nn-memory-count').textContent=mem.length+' SAVED';
    } else {
      box.innerHTML=services.map(x=>'<div class="nn-service"><span class="nn-service-icon">✧</span><div><b>'+escapeHTML(x[0])+'</b><small>'+escapeHTML(x[1])+'</small></div></div>').join('');
      $('#nn-memory-count').textContent=services.length+' MODULES';
    }
  }
  function action(kind){
    if(kind==='main'){close();return}
    if(kind==='time'){showToast(new Date().toLocaleString());speak('The time is '+new Date().toLocaleTimeString());return}
    if(kind==='status'){showToast('JARVIS CORE, NEON NEXUS, VELVE and TERRANEXUS are installed and ready.');return}
    if(kind==='tasks'){render();$('#nn-tasks')?.scrollTo({top:0,behavior:'smooth'});showToast('Task stream refreshed.');return}
    if(kind==='memory'){root.querySelectorAll('[data-memory-tab]').forEach(b=>b.classList.toggle('active',b.dataset.memoryTab==='memory'));renderMemory('memory');return}
    if(kind==='services'){root.querySelectorAll('[data-memory-tab]').forEach(b=>b.classList.toggle('active',b.dataset.memoryTab==='services'));renderMemory('services');return}
    if(kind==='fullscreen'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();return}
  }
  function submitCommand(e){
    e.preventDefault();const input=$('#nn-input'),q=(input.value||'').trim();if(!q)return;input.value='';
    if(/^(search|google|look up|web search)\b/i.test(q)){const query=q.replace(/^(search(?: the web)?(?: for)?|google|look up|web search(?: for)?)\s*/i,'').trim();if(query){window.open('https://www.google.com/search?q='+encodeURIComponent(query),'_blank','noopener');showToast('Opening web search for '+query);logTask('Web search: '+query)}return}
    logTask('Command: '+q);
    try{if(typeof window.sendCommand==='function'){window.sendCommand(q);showToast('Command sent to JARVIS core.')}else{showToast('Main JARVIS command engine is not ready.');speak('The JARVIS command engine is not ready yet.')}}catch(_){showToast('Could not send command to JARVIS.')}
  }
  function voice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){showToast('Speech recognition is not supported in this browser. Try keyboard dictation.');$('#nn-input')?.focus();return}
    try{if(recognition){recognition.abort();recognition=null}
      recognition=new SR();recognition.lang=navigator.language||'en-US';recognition.interimResults=false;recognition.maxAlternatives=1;
      $('#nn-voice')?.classList.add('listening');$('#nn-core-state').textContent='LISTENING';
      recognition.onresult=e=>{const heard=e.results?.[0]?.[0]?.transcript||'';$('#nn-input').value=heard;showToast('Heard: '+heard);if(heard)submitCommand({preventDefault(){}})};
      recognition.onerror=()=>showToast('Voice input failed. Check microphone permission or type your command.');
      recognition.onend=()=>{$('#nn-voice')?.classList.remove('listening');if($('#nn-core-state'))$('#nn-core-state').textContent='CORE STANDBY';recognition=null};
      recognition.start();showToast('Listening… speak your command.');
    }catch(_){showToast('Could not start microphone. Check browser permission.')}
  }
  function escHandler(e){if(e.key==='Escape'&&root?.classList.contains('open'))close()}
  function open(){build();root.classList.add('open');document.body.classList.add('neon-nexus-active');render();updateClock();showToast('NEON NEXUS online. All command panels connected.');speak('Neon Nexus online. JARVIS command environment ready.')}
  function close(){if(root)root.classList.remove('open');document.body.classList.remove('neon-nexus-active');if(recognition){try{recognition.abort()}catch(_){}recognition=null}}
  function startNetwork(){
    const c=$('#nn-network');if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;let w=0,h=0,pts=[],raf=0;
    const resize=()=>{w=c.width=window.innerWidth*devicePixelRatio;h=c.height=window.innerHeight*devicePixelRatio;c.style.width='100%';c.style.height='100%';pts=Array.from({length:58},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.24*devicePixelRatio,vy:(Math.random()-.5)*.24*devicePixelRatio,r:Math.random()*1.8+0.6}))};
    resize();window.addEventListener('resize',resize);
    const draw=()=>{ctx.clearRect(0,0,w,h);for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;for(const q of pts){const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<145*devicePixelRatio){ctx.strokeStyle='rgba(255,36,214,'+(0.13*(1-d/(145*devicePixelRatio)))+')';ctx.lineWidth=devicePixelRatio;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}ctx.fillStyle='rgba(255,96,231,.8)';ctx.beginPath();ctx.arc(p.x,p.y,p.r*devicePixelRatio,0,Math.PI*2);ctx.fill()}raf=requestAnimationFrame(draw)};
    draw();const stop=()=>cancelAnimationFrame(raf);window.addEventListener('pagehide',stop,{once:true});
  }
  // Hide the old floating Command Center on the main HUD; its features are now surfaced here.
  const hideLegacy=()=>{const legacy=$('#jarvis-superpowers');if(legacy)legacy.style.setProperty('display','none','important')};
  hideLegacy();new MutationObserver(hideLegacy).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='n'){e.preventDefault();open()}});
  window.NEON_NEXUS={open,close,render,version:'neon-nexus-20261014a'};
  // Add a small launcher so users can enter the new environment from the original HUD.
  function launcher(){if($('#nn-launcher'))return;const b=document.createElement('button');b.id='nn-launcher';b.type='button';b.textContent='✧ NEXUS';b.title='Open NEON NEXUS command environment';b.onclick=open;document.body.appendChild(b)}
  launcher();window.addEventListener('load',launcher);
  // Intercept the command entry so the new environment is launched naturally by voice/text.
  const hook=()=>{if(typeof window.sendCommand!=='function'||window.sendCommand.__neonNexusWrapped)return;const old=window.sendCommand;const wrapped=function(q){if(/^(?:(?:hey\s+)?jarvis\s+)?(?:(?:open|launch|start|activate|enter|show)\s+(?:the\s+)?)?(?:neon nexus|neon command environment|magenta command centre|magenta command center)[.! ]*$/i.test(String(q||'').trim())){open();return}if(document.body.classList.contains('neon-nexus-active')&&/^(?:back to jarvis|return to jarvis|close neon nexus|exit neon nexus)$/i.test(String(q||'').trim())){close();return}return old.apply(this,arguments)};wrapped.__neonNexusWrapped=true;window.sendCommand=wrapped};
  hook();setTimeout(hook,900);window.addEventListener('load',hook);
})();