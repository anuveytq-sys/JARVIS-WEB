/* JARVIS ENVIRONMENT SHORTCUTS
   Compact, scrollable launcher. Existing environments remain unchanged.
   ULTRON is lazy-loaded only when selected, keeping idle JARVIS lightweight.
   ULTRON command aliases are also wired directly to the main command input/form
   so typed commands work even if another command layer replaces sendCommand.
*/
(() => {
  'use strict';
  const VERSION = 'env-shortcuts-ultron-core24-20261024';
  const PANEL_ID = 'jarvis-environment-shortcuts';
  const environments = [
    { name:'VELVE', subtitle:'GOD’S EYE / GEO CORE', command:'open VELVE environment' },
    { name:'TERRA NEXUS', subtitle:'TERRANEXUS ENVIRONMENT', command:'open Terra Nexus environment' },
    { name:'VISION INTELLIGENCE', subtitle:'VISUAL ANALYSIS ENVIRONMENT', command:'open Vision Intelligence environment' },
    { name:'NEON NEXUS', subtitle:'COMMAND / NEON ENVIRONMENT', command:'open Neon Nexus environment' },
    { name:'ULTRON', subtitle:'PUBLIC INTELLIGENCE MATRIX', command:'open ULTRON environment' }
  ];
  const findVoiceAnalyzer=()=>Array.from(document.querySelectorAll('.panel-title')).find(t=>/VOICE\s+ANALYZER/i.test(t.textContent||''))?.closest('.panel')||null;
  const loadScript=(id,src)=>new Promise((resolve,reject)=>{if(document.getElementById(id)){resolve();return}const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});

  /*
     ULTRON FEED CONTINUITY HOTFIX
     The old manager waited for a new feed before hiding the current one. That
     made every 20-second rotation look like a long "checking live feed" outage.
     This manager keeps the current feed alive while the next feed is prepared
     off-screen, then swaps only after the replacement is already playing.
  */
  const stabilizeUltronFeed=async()=>{
    if(window.__ULTRON_CONTINUOUS_FEED_V2__) return;
    window.__ULTRON_CONTINUOUS_FEED_V2__=true;
    window.__ULTRON_STABLE_WORLD_FEEDS_STOP__?.();

    const FALLBACKS=[
      ['BANTEN HIGHWAY · INDONESIA','https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10003.m3u8'],
      ['BANTEN · INDONESIA','https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10019.m3u8'],
      ['SEOUL CITY · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/edge13/ch16.stream/playlist.m3u8'],
      ['SEOUL ROAD · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/sd1/ch34.stream/playlist.m3u8'],
      ['SEOUL VIEW · SOUTH KOREA','https://topiscctv1.eseoul.go.kr/sd2/ch66.stream/playlist.m3u8'],
      ['CHON BURI · THAILAND','https://camerai1.iticfoundation.org/hls/pty85.m3u8'],
      ['KHON KAEN · THAILAND','https://camerai1.iticfoundation.org/hls/kk12.m3u8'],
      ['BURLEIGH BEACH · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/burleighheadscamera.stream/playlist.m3u8'],
      ['CURRUMBIN BEACH · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/currumbincamera.stream/playlist.m3u8'],
      ['NARROWNECK · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/narrowneckhighcamera.stream/playlist.m3u8'],
      ['SURFERS PARADISE · AUSTRALIA','https://d1nm4r8e5x1rwd.cloudfront.net/cw/surfersparadisecamera.stream/playlist.m3u8'],
      ['MISSISSAUGA · CANADA','https://webvideo.mississauga.ca/BalconyWebcam/LiveWebcam.stream/chunklist_w1473770124.m3u8']
    ];

    let stopped=false;
    let pool=FALLBACKS.slice();
    let current=null;
    let currentVideo=null;
    let currentPlayer=null;
    let next=null;
    let nextPreparing=false;
    let rotateTimer=null;
    let retryTimer=null;
    let observer=null;
    let registryLoaded=false;
    let hlsPromise=null;
    const ROTATE_MS=20000;
    const PROBE_TIMEOUT=2800;
    const STALL_TIMEOUT=3500;

    const panel=()=>document.getElementById('ultron-clean-core')?.querySelector('.uc-worldcam');
    const hideStatus=()=>{
      const p=panel(); if(!p)return;
      const styleId='ultron-continuous-feed-style';
      if(!document.getElementById(styleId)){
        const style=document.createElement('style');
        style.id=styleId;
        style.textContent='#ultron-clean-core .uc-worldcam-place{display:none!important;visibility:hidden!important;opacity:0!important} #ultron-clean-core .uc-worldcam-live{opacity:1!important}';
        document.head.appendChild(style);
      }
      const place=p.querySelector('.uc-worldcam-place');
      if(place){place.textContent='';place.replaceChildren();place.style.setProperty('display','none','important');place.style.setProperty('visibility','hidden','important');}
      const badge=p.querySelector('.uc-worldcam-live');
      if(badge)badge.textContent='LIVE';
    };

    const makeVideo=()=>{
      const v=document.createElement('video');
      v.className='uc-worldcam-frame';
      v.autoplay=true; v.muted=true; v.playsInline=true; v.preload='auto';
      v.setAttribute('playsinline',''); v.setAttribute('muted','');
      v.setAttribute('disablepictureinpicture','');
      v.setAttribute('controlslist','nodownload noplaybackrate nofullscreen');
      return v;
    };

    const nativeHls=v=>!!v.canPlayType?.('application/vnd.apple.mpegurl');

    const ensureHls=()=>{
      if(window.Hls)return Promise.resolve(window.Hls);
      if(hlsPromise)return hlsPromise;
      hlsPromise=new Promise(resolve=>{
        const existing=document.querySelector('script[data-ultron-world-hls]');
        if(existing){existing.addEventListener('load',()=>resolve(window.Hls||null),{once:true});existing.addEventListener('error',()=>resolve(null),{once:true});return;}
        const s=document.createElement('script');
        s.async=true; s.dataset.ultronWorldHls='1';
        s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
        s.onload=()=>resolve(window.Hls||null); s.onerror=()=>resolve(null);
        document.head.appendChild(s);
      });
      return hlsPromise;
    };

    const destroy=(entry)=>{
      if(!entry)return;
      try{entry.video?.pause();}catch(_){ }
      try{entry.player?.destroy();}catch(_){ }
      try{entry.video?.removeAttribute('src');entry.video?.load();}catch(_){ }
    };

    const prepare=async item=>{
      if(stopped||!item)return null;
      const video=makeVideo();
      video.style.cssText='position:fixed;left:-12000px;top:-12000px;width:2px;height:2px;opacity:0;pointer-events:none;visibility:hidden';
      document.body.appendChild(video);
      let h=null, settled=false, timer=null, stall=null;
      const cleanup=()=>{if(timer)clearTimeout(timer);if(stall)clearInterval(stall);};
      return await new Promise(async resolve=>{
        const finish=ok=>{
          if(settled)return;
          settled=true; cleanup();
          if(!ok){try{h?.destroy();}catch(_){ }try{video.pause();video.removeAttribute('src');video.load();}catch(_){ }video.remove();resolve(null);return;}
          resolve({item,video,player:h});
        };
        timer=setTimeout(()=>finish(false),PROBE_TIMEOUT);
        const startWatch=()=>{
          let last=video.currentTime,lastAdvance=Date.now();
          stall=setInterval(()=>{
            if(settled||stopped)return;
            if(!video.paused&&video.readyState>=2&&Number.isFinite(video.currentTime)&&video.currentTime>last+0.08){last=video.currentTime;lastAdvance=Date.now();}
            else if(Date.now()-lastAdvance>STALL_TIMEOUT)finish(false);
          },700);
        };
        video.onplaying=()=>{if(video.readyState>=2){startWatch();finish(true);}};
        video.onerror=()=>finish(false);
        try{
          const H=await ensureHls();
          if(stopped){finish(false);return;}
          if(H?.isSupported?.()){
            h=new H({enableWorker:true,lowLatencyMode:true,maxBufferLength:6,manifestLoadingTimeOut:1800,levelLoadingTimeOut:1800,fragLoadingTimeOut:2200,backBufferLength:12});
            h.on(H.Events.ERROR,(_,data)=>{if(data?.fatal)finish(false);});
            h.on(H.Events.MANIFEST_PARSED,()=>{try{const p=video.play();p?.catch?.(()=>{});}catch(_){ }});
            h.loadSource(item[1]); h.attachMedia(video);
          }else if(nativeHls(video)){
            video.src=item[1]; video.load();
            const p=video.play(); p?.catch?.(()=>{});
          }else finish(false);
        }catch(_){finish(false);}
      });
    };

    const loadRegistry=async()=>{
      try{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),4500);
        const response=await fetch('https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/main/streams.geojson',{cache:'no-store',signal:controller.signal});
        clearTimeout(timeout);
        if(!response.ok)throw new Error('registry '+response.status);
        const data=await response.json();
        const usable=(data.features||[]).map(feature=>{
          const p=feature.properties||{},url=String(p.url||'');
          if(p.status!=='active'||p.url_type!=='hls'||p.source_url_requires!=null)return null;
          if(!/^https:\/\/[^\s]+\.m3u8(?:\?|$)/i.test(url))return null;
          return [String(p.display_name||p.name||'WORLD FEED').toUpperCase(),url];
        }).filter(Boolean);
        if(usable.length){pool=usable.sort(()=>Math.random()-0.5);registryLoaded=true;}
      }catch(_){ }
    };

    const takeBatch=()=>{
      if(!pool.length)pool=FALLBACKS.slice();
      const batch=[];
      while(batch.length<Math.min(4,pool.length)){
        const item=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
        if(!batch.some(x=>x[1]===item[1])&&(!current||item[1]!==current.item[1]))batch.push(item);
      }
      return batch;
    };

    const prepareNext=async()=>{
      if(stopped||next||nextPreparing)return;
      nextPreparing=true;
      const batch=takeBatch();
      let winner=null;
      await Promise.all(batch.map(async item=>{
        const result=await prepare(item);
        if(result&&!winner){winner=result;}
        else if(result)destroy(result);
      }));
      nextPreparing=false;
      if(stopped){destroy(winner);return;}
      if(winner){next=winner;return;}
      retryTimer=setTimeout(()=>{retryTimer=null;prepareNext();},250);
    };

    const switchToNext=()=>{
      if(stopped||!next)return false;
      const p=panel();
      if(!p)return false;
      const old=currentVideo;
      const entry=next; next=null;
      entry.video.style.cssText='';
      entry.video.className='uc-worldcam-frame';
      entry.video.style.visibility='visible';
      if(old&&old.parentNode)old.replaceWith(entry.video);
      else p.querySelector('.uc-worldcam-frame')?.replaceWith(entry.video);
      try{currentPlayer?.destroy();}catch(_){ }
      current=entry; currentVideo=entry.video; currentPlayer=entry.player;
      hideStatus();
      if(old&&old!==entry.video){try{old.pause();old.removeAttribute('src');old.load();}catch(_){ }}
      if(rotateTimer)clearTimeout(rotateTimer);
      rotateTimer=setTimeout(onRotate,ROTATE_MS);
      prepareNext();
      return true;
    };

    const onRotate=()=>{
      if(stopped)return;
      if(switchToNext())return;
      rotateTimer=setTimeout(onRotate,250);
      prepareNext();
    };

    const start=async()=>{
      const p=panel(); if(!p||stopped)return;
      hideStatus();
      await loadRegistry();
      if(stopped)return;
      const batch=takeBatch();
      let winner=null;
      await Promise.all(batch.map(async item=>{
        const result=await prepare(item);
        if(result&&!winner)winner=result;
        else if(result)destroy(result);
      }));
      if(stopped){destroy(winner);return;}
      if(winner){
        const old=p.querySelector('.uc-worldcam-frame');
        winner.video.style.cssText='';winner.video.style.visibility='visible';winner.video.className='uc-worldcam-frame';
        if(old)old.replaceWith(winner.video);else p.appendChild(winner.video);
        try{old?.pause();old?.removeAttribute('src');old?.load();}catch(_){ }
        current=winner;currentVideo=winner.video;currentPlayer=winner.player;hideStatus();
        rotateTimer=setTimeout(onRotate,ROTATE_MS);
        prepareNext();
      }else{
        retryTimer=setTimeout(start,350);
      }
    };

    observer=new MutationObserver(()=>{if(!stopped){hideStatus();if(!panel())return;}});
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    window.__ULTRON_CONTINUOUS_FEED_STOP__=()=>{
      stopped=true;
      if(rotateTimer)clearTimeout(rotateTimer);
      if(retryTimer)clearTimeout(retryTimer);
      observer?.disconnect();
      destroy(current);destroy(next);
      current=null;next=null;currentVideo=null;currentPlayer=null;
      window.__ULTRON_CONTINUOUS_FEED_V2__=false;
    };
    await start();
  };

  const normalize=value=>String(value||'').toLowerCase().replace(/[’'`]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const isUltronOpen=text=>/^(hey jarvis )?(please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release|unleash|deploy|initialize|power up|wake up) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(take me to|go to|enter|enter the) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(i want|i need) (the )?ultron( environment| mode| system)?$/.test(normalize(text));
  const isUltronClose=text=>/^(hey jarvis )?(please )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(stand down|power down|put away|take down) (the )?ultron( environment| mode| system)?$/.test(normalize(text)) || /^(hey jarvis )?(return|go back|take me back) (from|out of) (the )?ultron$/.test(normalize(text)) || /^ultron (close|exit|quit|shutdown|shut down|offline|sleep)$/.test(normalize(text));

  const loadUltronCommands=async()=>{try{await loadScript('jarvis-ultron-commands-loader','./jarvis-ultron-commands.js?v=env-shortcuts-ultron-core24-20261024')}catch(e){console.warn('[JARVIS] ULTRON command bridge unavailable',e)}};
  const loadUltron=async()=>{
    try {
      if (window.ULTRON?.version !== 'ultron-core-rebuild-26') { document.getElementById('jarvis-ultron-core-loader')?.remove(); await loadScript('jarvis-ultron-core-loader','./jarvis-ultron.js?v=ultron-core-rebuild-26'); }
      if(typeof window.ULTRON?.open==='function') window.ULTRON.open();
      await new Promise(resolve=>setTimeout(resolve,80));
      stabilizeUltronFeed();
    } catch(error) {
      console.error('[JARVIS] ULTRON core failed to load',error);
      alert('ULTRON could not load. Check your internet connection and try again.');
    }
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
      if(isUltronOpen(value)) await loadUltron(); else if(typeof window.ULTRON?.close==='function') { window.__ULTRON_CONTINUOUS_FEED_STOP__?.(); window.ULTRON.close(); } else document.getElementById('jarvis-ultron-root')?.remove();
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
