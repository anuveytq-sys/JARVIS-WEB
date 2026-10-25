/* JARVIS ENVIRONMENT SHORTCUTS
   Compact, scrollable launcher. Existing environments remain unchanged.
   ULTRON is lazy-loaded only when selected, keeping idle JARVIS lightweight.
   ULTRON command aliases are also wired directly to the main command input/form
   so typed commands work even if another command layer replaces sendCommand.
*/
(() => {
  'use strict';
  const VERSION = 'env-shortcuts-ultron-core26-20261025';
  const PANEL_ID = 'jarvis-environment-shortcuts';
  const environments = [
    { name:'VELVE', subtitle:'GOD’S EYE / GEO CORE', command:'open VELVE environment' },
    { name:'TERRA NEXUS', subtitle:'TERRANEXUS ENVIRONMENT', command:'open Terra Nexus environment' },
    { name:'VISION INTELLIGENCE', subtitle:'VISUAL ANALYSIS ENVIRONMENT', command:'open Vision Intelligence environment' },
    { name:'NEON NEXUS', subtitle:'COMMAND / NEON ENVIRONMENT', command:'open Neon Nexus environment' },
    { name:'ULTRON', subtitle:'PUBLIC INTELLIGENCE MATRIX', command:'open ULTRON environment' }
  ];
  const findVoiceAnalyzer=()=>Array.from(document.querySelectorAll('.panel-title')).find(t=>/VOICE\s+ANALYZER/i.test(t.textContent||''))?.closest('.panel')||null;
  const scriptLoads = new Map();
  const loadScript=(id,src)=>{
    if(scriptLoads.has(id)) return scriptLoads.get(id);
    const existing=document.getElementById(id);
    if(existing?.dataset.loaded==='true') return Promise.resolve();
    const promise=new Promise((resolve,reject)=>{
      const script=existing||document.createElement('script');
      script.id=id; script.src=src; script.async=true;
      script.onload=()=>{script.dataset.loaded='true';resolve()};
      script.onerror=()=>{scriptLoads.delete(id);script.remove();reject(new Error('Failed to load '+src))};
      if(!existing) document.head.appendChild(script);
    });
    scriptLoads.set(id,promise);
    return promise;
  };

  const normalize=value=>String(value||'').toLowerCase().replace(/[’'`]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const isUltronOpen=text=>/^(hey jarvis )?(please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release|unleash|deploy|initialize|power up|wake up) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(take me to|go to|enter|enter the) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(i want|i need) (the )?ultron( environment| mode| system)?$/.test(normalize(text));
  const isUltronClose=text=>/^(hey jarvis )?(please )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(stand down|power down|put away|take down) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(return|go back|take me back) (from|out of) (the )?ultron$/.test(normalize(text)) || /^ultron (close|exit|quit|shutdown|shut down|offline|sleep)$/.test(normalize(text));

  const loadUltronCommands=async()=>{try{await loadScript('jarvis-ultron-commands-loader','./jarvis-ultron-commands.js?v=env-shortcuts-ultron-core24-20261024')}catch(e){console.warn('[JARVIS] ULTRON command bridge unavailable',e)}};
  let ultronOpenPromise=null;
  const loadUltron=async()=>{
    if(ultronOpenPromise) return ultronOpenPromise;
    ultronOpenPromise=(async()=>{
    try {
      if (window.ULTRON?.version !== 'ultron-core-rebuild-28') {
        await loadScript('jarvis-ultron-core-loader','./jarvis-ultron.js?v=ultron-core-rebuild-28');
      }
      if(typeof window.ULTRON?.open==='function') window.ULTRON.open();
      else throw new Error('ULTRON core entry point missing');
    } catch(error) {
      console.error('[JARVIS] ULTRON core failed to load',error);
      alert('ULTRON could not load. Check your internet connection and try again.');
    } finally {
      ultronOpenPromise=null;
    }
    })();
    return ultronOpenPromise;
  };

  const installDirectCommandHook=()=>{
    if(document.__jarvisUltronInputHook)return true;
    const input=document.getElementById('commandInput')||document.getElementById('command');
    const form=document.getElementById('commandForm');
    if(!input)return false;
    const intercept=async event=>{
      const value=input.value||'';
      if(!isUltronOpen(value)&&!isUltronClose(value))return;
      event.preventDefault();event.stopImmediatePropagation();
      if(event.stopPropagation)event.stopPropagation();
      if(isUltronOpen(value)) await loadUltron(); else if(typeof window.ULTRON?.close==='function') window.ULTRON.close(); else document.getElementById('jarvis-ultron-root')?.remove();
      input.value='';
    };
    input.addEventListener('keydown',e=>{if(e.key==='Enter')intercept(e)},true);
    if(form)form.addEventListener('submit',intercept,true);
    document.__jarvisUltronInputHook=true;
    return true;
  };

  const buildPanel=()=>{
    if(document.getElementById(PANEL_ID)) return;
    const oldPanel=findVoiceAnalyzer(); if(!oldPanel) return;
    oldPanel.style.display='none'; oldPanel.setAttribute('aria-hidden','true');
    const panel=document.createElement('section'); panel.id=PANEL_ID; panel.className='panel'; panel.setAttribute('aria-label','JARVIS environments');
    panel.innerHTML='<div class="panel-title">ENVIRONMENT SHORTCUTS</div><div class="panel-header-line"></div><div class="jarvis-env-shortcuts-intro">SELECT AN ENVIRONMENT</div><div class="jarvis-env-shortcuts-list" role="list"></div><div class="jarvis-env-shortcuts-hint">VOICE COMMANDS AVAILABLE</div>';
    Object.assign(panel.style,{left:'16px',bottom:'84px',width:'215px',height:'120px',padding:'8px',overflow:'hidden',zIndex:'35'});
    const style=document.createElement('style'); style.id='jarvis-environment-shortcuts-style'; style.textContent=`
      #${PANEL_ID}{background:linear-gradient(145deg,rgba(2,34,64,.78),rgba(0,9,21,.67));border:1px solid rgba(0,205,255,.27);box-shadow:0 0 20px rgba(0,140,255,.08),inset 0 0 16px rgba(0,160,255,.035);backdrop-filter:blur(15px)}
      #${PANEL_ID} .jarvis-env-shortcuts-intro{color:#477e96;font-size:6px;letter-spacing:1px;margin-bottom:4px}
      #${PANEL_ID} .jarvis-env-shortcuts-list{display:flex;flex-direction:column;gap:3px;max-height:70px;overflow-y:auto;overflow-x:hidden;padding-right:2px;scrollbar-width:thin;scrollbar-color:rgba(0,220,255,.55) rgba(0,20,40,.45)}
      #${PANEL_ID} .jarvis-env-shortcuts-list::-webkit-scrollbar{width:3px}#${PANEL_ID} .jarvis-env-shortcuts-list::-webkit-scrollbar-thumb{background:rgba(0,220,255,.55);border-radius:4px}
      #${PANEL_ID} .jarvis-env-shortcut{width:100%;min-height:22px;display:flex;align-items:center;justify-content:space-between;gap:5px;padding:3px 6px;border:1px solid rgba(0,205,255,.22);border-radius:4px;background:linear-gradient(100deg,rgba(0,115,190,.18),rgba(0,15,35,.35));color:#baf7ff;cursor:pointer;text-align:left;font:600 6px/1.1 "Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.7px;transition:background .16s,border-color .16s,box-shadow .16s}
      #${PANEL_ID} .jarvis-env-shortcut:hover,#${PANEL_ID} .jarvis-env-shortcut:focus-visible{background:linear-gradient(100deg,rgba(0,150,230,.30),rgba(0,30,60,.50));border-color:rgba(0,235,255,.60);box-shadow:0 0 8px rgba(0,190,255,.16);outline:none}
      #${PANEL_ID} .jarvis-env-shortcut-name{color:#d8fbff}#${PANEL_ID} .jarvis-env-shortcut-arrow{color:#62f5ff;font-size:9px;flex:0 0 auto}#${PANEL_ID} .jarvis-env-shortcuts-hint{margin-top:3px;color:#477b92;font-size:5px;letter-spacing:.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:800px){#${PANEL_ID}{width:155px!important}}@media(max-width:520px){#${PANEL_ID}{left:12px!important;bottom:72px!important;width:126px!important}}
    `; document.head.appendChild(style);
    const list=panel.querySelector('.jarvis-env-shortcuts-list');
    environments.forEach(env=>{
      const button=document.createElement('button'); button.type='button'; button.className='jarvis-env-shortcut'; button.setAttribute('role','listitem'); button.setAttribute('aria-label',`Open ${env.name}`);
      button.innerHTML=`<span><span class="jarvis-env-shortcut-name">${env.name}</span><br><span style="color:#477e96;font-size:4.5px;letter-spacing:.6px">${env.subtitle}</span></span><span class="jarvis-env-shortcut-arrow">›</span>`;
      button.addEventListener('click',async()=>{button.disabled=true;try{
        if(env.name==='ULTRON') await loadUltron();
        else if(env.name==='VELVE'){window.NEON_NEXUS?.close?.();window.TERRANEXUS?.close?.();if(typeof window.VELVE?.open==='function') await window.VELVE.open();}
        else if(env.name==='TERRA NEXUS'){window.NEON_NEXUS?.close?.();window.VELVE?.exit?.();if(typeof window.TERRANEXUS?.open==='function') await window.TERRANEXUS.open();}
        else if(typeof window.sendCommand==='function') await window.sendCommand(env.command);
      }catch(error){console.error('[JARVIS Environment Shortcuts]',env.name,error)}finally{setTimeout(()=>button.disabled=false,700)}});
      list.appendChild(button);
    });
    oldPanel.parentNode.insertBefore(panel,oldPanel);
  };
  const start=async()=>{await loadUltronCommands();let tries=0;const timer=setInterval(()=>{tries++;installDirectCommandHook();buildPanel();if(document.getElementById(PANEL_ID)||tries>=100)clearInterval(timer)},100)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
