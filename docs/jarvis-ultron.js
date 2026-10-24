/* ULTRON — clean rebuild: orange neural field + interactive 3D core only. */
(() => {
  'use strict';
  const VERSION = 'ultron-core-rebuild-26';
  if (window.ULTRON?.version === VERSION) { window.ULTRON.open(); return; }
  const THREE_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
    'https://unpkg.com/three@0.160.0/build/three.min.js'
  ];
  let renderer, scene, camera, frame, resizeHandler, wheelHandler;
  let root, core, coreGlow, network, particles, ringGroup, active = false;
  let drag = false, lastX = 0, lastY = 0, rotX = 0, rotY = 0, targetX = 0, targetY = 0, zoom = 1;
  const overlayId = 'ultron-clean-core';
  const scopedUiClass = 'jarvis-ultron-focused';
  const loadScript = (url) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url; script.async = true; script.dataset.ultronThree = '1';
    const timer = setTimeout(() => { script.remove(); reject(new Error('Timed out loading Three.js: ' + url)); }, 12000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Failed to load Three.js: ' + url)); };
    document.head.appendChild(script);
  });
  const loadThree = async () => {
    if (window.THREE) return;
    const existing = document.querySelector('script[data-ultron-three]');
    if (existing) {
      await new Promise((resolve, reject) => { existing.addEventListener('load', resolve, {once:true}); existing.addEventListener('error', reject, {once:true}); });
      if (window.THREE) return;
    }
    let lastError;
    for (const url of THREE_URLS) {
      try { await loadScript(url); if (window.THREE) return; } catch (e) { lastError = e; console.warn('[ULTRON] Three.js CDN failed:', url, e); }
    }
    throw lastError || new Error('Three.js could not be loaded');
  };
  function buildOverlay() {
    let el = document.getElementById(overlayId); if (el) el.remove();
    el = document.createElement('section'); el.id = overlayId; el.setAttribute('role','application'); el.setAttribute('aria-label','ULTRON interactive neural core');
    el.innerHTML = '<canvas class="uc-canvas"></canvas><div class="uc-vignette"></div><div class="uc-mark">ULTRON</div><div class="uc-sub">NEURAL CORE</div><aside class="uc-worldcam" role="button" tabindex="0" aria-expanded="false" aria-label="World camera feed. Tap to enlarge or restore size"><div class="uc-worldcam-head"><span class="uc-worldcam-dot"></span><span>WORLD FEED</span><span class="uc-worldcam-live">LIVE</span></div><video class="uc-worldcam-frame" title="Public world camera feed" autoplay muted playsinline disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen"></video><div class="uc-worldcam-place">CONNECTING TO PUBLIC CAM</div></aside><aside class="uc-earth-telemetry" aria-label="Earth and satellite telemetry"><div class="uc-earth-head"><span class="uc-earth-dot"></span><span>EARTH / SATELLITES</span><span class="uc-earth-live">LIVE</span></div><div class="uc-earth-content"><div>ACQUIRING ORBITAL DATA…</div></div></aside><aside class="uc-target-details" aria-label="Target Details Panel"><div class="uc-target-head"><span class="uc-target-dot"></span><span>TARGET DETAILS</span><button type="button" class="uc-target-clear" aria-label="Clear target details" title="Clear results">×</button></div><div class="uc-target-meta">NO SCAN SELECTED</div><div class="uc-target-content" aria-live="polite"><div class="uc-target-empty">SCAN RESULTS WILL APPEAR HERE</div></div></aside><div class="uc-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div><form class="uc-command" autocomplete="off"><input class="uc-command-input" type="text" aria-label="ULTRON command" placeholder="Enter a command…" maxlength="1000"><button class="uc-send" type="submit" aria-label="Send command" title="Send">➤</button><button class="uc-voice" type="button" aria-label="Voice command" title="Voice command">🎙</button><span class="uc-command-status" aria-live="polite"></span></form><button class="uc-exit" type="button" aria-label="Close ULTRON">×</button>'
    const style = document.createElement('style'); style.id='ultron-clean-core-style'; style.textContent=`
      body.${scopedUiClass} #jarvis-wake-word-toggle,body.${scopedUiClass} #jarvis-hand-gesture-toggle,body.${scopedUiClass} #jarvis-hand-gesture-status,body.${scopedUiClass} #jarvis-web-bridge-panel{display:none!important;visibility:hidden!important;pointer-events:none!important}\n      #${overlayId}{position:fixed;inset:0;z-index:2147483000;background:#050302;color:#ff8a32;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;isolation:isolate;touch-action:none}
      #${overlayId} .uc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
      #${overlayId} .uc-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,.24) 66%,#030201 100%)}
      #${overlayId} .uc-mark{position:absolute;top:28px;left:32px;font-size:clamp(18px,2.4vw,30px);font-weight:800;letter-spacing:.34em;color:#ff8b35;text-shadow:0 0 24px #ff5c16}
      #${overlayId} .uc-sub{position:absolute;top:66px;left:34px;font-size:9px;letter-spacing:.38em;color:#b55b28}
      #${overlayId} .uc-hint{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);font-size:9px;letter-spacing:.22em;color:rgba(255,155,83,.62);white-space:nowrap}
      #${overlayId} .uc-command{position:absolute;z-index:5;left:50%;bottom:54px;transform:translateX(-50%);width:min(560px,calc(100% - 32px));height:44px;display:flex;align-items:stretch;gap:7px;padding:4px;border:1px solid rgba(255,125,48,.55);border-radius:12px;background:rgba(15,7,3,.88);box-shadow:0 0 22px rgba(255,86,20,.12);backdrop-filter:blur(12px);touch-action:auto}\n      #${overlayId} .uc-command-input{flex:1;min-width:0;height:100%;padding:0 10px;border:0;outline:0;background:transparent;color:#ffe0c6;font:13px Inter,ui-sans-serif,system-ui,sans-serif;touch-action:auto}\n      #${overlayId} .uc-command-input::placeholder{color:rgba(255,174,121,.56)}\n      #${overlayId} .uc-send,#${overlayId} .uc-voice{flex:0 0 36px;width:36px;height:34px;border:1px solid rgba(255,135,61,.36);border-radius:8px;background:rgba(255,104,28,.13);color:#ffb16e;font-size:17px;cursor:pointer;touch-action:manipulation}\n      #${overlayId} .uc-send:hover,#${overlayId} .uc-voice:hover{background:rgba(255,104,28,.28)}\n      #${overlayId} .uc-voice.is-listening{border-color:#ffb15b;background:rgba(255,70,20,.38);box-shadow:0 0 12px rgba(255,90,20,.35)}\n      #${overlayId} .uc-command-status{position:absolute;left:7px;bottom:calc(100% + 5px);font-size:10px;color:rgba(255,177,110,.9);pointer-events:none}\n      #${overlayId} .uc-exit{position:absolute;top:24px;right:26px;width:42px;height:42px;border:1px solid rgba(255,124,42,.38);border-radius:50%;background:rgba(20,8,2,.45);color:#ff9a50;font-size:25px;cursor:pointer}
      #${overlayId} .uc-worldcam{position:absolute;z-index:4;top:76px;right:26px;width:clamp(116px,15vw,160px);aspect-ratio:1/1;overflow:hidden;border:1px solid rgba(255,133,62,.78);border-radius:7px;background:rgba(8,5,3,.94);box-shadow:0 0 18px rgba(255,92,24,.2);pointer-events:auto}
      #${overlayId} .uc-earth-telemetry{position:absolute;z-index:4;left:26px;bottom:112px;width:clamp(116px,15vw,160px);height:clamp(116px,15vw,160px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,133,62,.65);border-radius:7px;background:rgba(8,5,3,.94);box-shadow:0 0 18px rgba(255,92,24,.14);pointer-events:auto;touch-action:pan-y}
      #${overlayId} .uc-earth-head{height:20px;flex:0 0 20px;display:flex;align-items:center;gap:4px;padding:0 5px;background:rgba(255,105,33,.12);color:#ffb37a;font:700 6px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap}
      #${overlayId} .uc-earth-dot{width:4px;height:4px;flex:0 0 4px;border-radius:50%;background:#ff8a32;box-shadow:0 0 5px #ff572c}
      #${overlayId} .uc-earth-live{margin-left:auto;color:#ff7958;font-size:5px}
      #${overlayId} .uc-earth-content{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:5px;color:#ffd9bf;font:6.5px/1.45 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere;scrollbar-width:thin;scrollbar-color:rgba(255,125,48,.55) rgba(30,10,2,.4);touch-action:pan-y;overscroll-behavior:contain}
      #${overlayId} .uc-earth-content::-webkit-scrollbar{width:3px}#${overlayId} .uc-earth-content::-webkit-scrollbar-thumb{background:rgba(255,125,48,.55);border-radius:4px}
      #${overlayId} .uc-earth-label{color:#ff9b50;font-weight:700}
      #${overlayId} .uc-target-details{position:absolute;z-index:4;right:26px;bottom:112px;width:clamp(116px,15vw,160px);height:clamp(116px,15vw,160px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,133,62,.65);border-radius:7px;background:rgba(8,5,3,.94);box-shadow:0 0 18px rgba(255,92,24,.14);pointer-events:auto;touch-action:pan-y}
      #${overlayId} .uc-target-head{height:20px;flex:0 0 20px;display:flex;align-items:center;gap:5px;padding:0 5px;background:rgba(255,105,33,.12);color:#ffb37a;font:700 6px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;white-space:nowrap}
      #${overlayId} .uc-target-dot{width:4px;height:4px;flex:0 0 4px;border-radius:50%;background:#ff8a32;box-shadow:0 0 5px #ff572c}
      #${overlayId} .uc-target-clear{margin-left:auto;width:16px;height:16px;flex:0 0 16px;padding:0;border:1px solid rgba(255,135,61,.28);border-radius:3px;background:rgba(255,104,28,.12);color:#ffb16e;font:12px/1 sans-serif;cursor:pointer;touch-action:manipulation}
      #${overlayId} .uc-target-meta{padding:4px 5px 3px;border-bottom:1px solid rgba(255,125,48,.18);color:#d88a56;font:600 5.5px/1.35 ui-monospace,SFMono-Regular,monospace;letter-spacing:.04em;overflow-wrap:anywhere}
      #${overlayId} .uc-target-content{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:5px;color:#ffd9bf;font:6.5px/1.45 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere;scrollbar-width:thin;scrollbar-color:rgba(255,125,48,.55) rgba(30,10,2,.4);touch-action:pan-y;overscroll-behavior:contain}
      #${overlayId} .uc-target-content::-webkit-scrollbar{width:3px}#${overlayId} .uc-target-content::-webkit-scrollbar-thumb{background:rgba(255,125,48,.55);border-radius:4px}
      #${overlayId} .uc-target-empty{color:rgba(255,174,121,.62);font:600 6px/1.5 Inter,system-ui,sans-serif;letter-spacing:.06em}
      #${overlayId} .uc-target-entry{padding:0 0 5px;margin:0 0 5px;border-bottom:1px solid rgba(255,125,48,.15)}
      #${overlayId} .uc-target-label{color:#ff9b50;font-weight:700}
      #${overlayId} .uc-target-link{color:#ffc18c;text-decoration:underline;overflow-wrap:anywhere}
      @media(max-width:600px){#${overlayId} .uc-earth-telemetry{left:15px;bottom:94px;width:104px;height:104px}#${overlayId} .uc-earth-head{height:18px;flex-basis:18px;font-size:5px;padding:0 4px}#${overlayId} .uc-earth-content{font-size:5.5px;padding:4px}}
      @media(max-width:600px){#${overlayId} .uc-target-details{right:15px;bottom:94px;width:104px;height:104px}#${overlayId} .uc-target-head{height:18px;flex-basis:18px;font-size:5px;padding:0 4px}#${overlayId} .uc-target-meta{font-size:5px}#${overlayId} .uc-target-content{font-size:6px;padding:4px}}

      #${overlayId} .uc-worldcam{cursor:zoom-in;transform-origin:top right;transition:width .42s cubic-bezier(.2,.8,.2,1),height .42s cubic-bezier(.2,.8,.2,1),top .42s cubic-bezier(.2,.8,.2,1),right .42s cubic-bezier(.2,.8,.2,1),left .42s cubic-bezier(.2,.8,.2,1),transform .42s cubic-bezier(.2,.8,.2,1),box-shadow .42s ease,border-radius .42s ease}
      #${overlayId} .uc-worldcam.is-expanded{top:50%;right:auto;left:50%;width:min(72vw,72vh);height:min(72vw,72vh);aspect-ratio:1/1;transform:translate(-50%,-50%);z-index:30;cursor:zoom-out;box-shadow:0 0 38px rgba(255,92,24,.38);border-radius:12px}
      #${overlayId} .uc-worldcam.is-expanded .uc-worldcam-head{height:30px;font-size:9px;padding:0 10px}
      #${overlayId} .uc-worldcam.is-expanded .uc-worldcam-frame{height:calc(100% - 30px)}
      #${overlayId} .uc-worldcam.is-expanded .uc-worldcam-place{font-size:11px;padding:6px}
      #${overlayId} .uc-worldcam:focus-visible{outline:2px solid #ff9a50;outline-offset:3px}
      @media(max-width:600px){#${overlayId} .uc-worldcam.is-expanded{top:50%;left:50%;right:auto;width:min(88vw,72vh);height:min(88vw,72vh);transform:translate(-50%,-50%)}#${overlayId} .uc-worldcam.is-expanded .uc-worldcam-head{height:24px;font-size:7px}#${overlayId} .uc-worldcam.is-expanded .uc-worldcam-frame{height:calc(100% - 24px)}} 
      @media(prefers-reduced-motion:reduce){#${overlayId} .uc-worldcam{transition:none}}
      #${overlayId} .uc-worldcam-head{height:20px;display:flex;align-items:center;gap:5px;padding:0 6px;color:#ffb37a;font:700 7px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;background:rgba(255,105,33,.12)}
      #${overlayId} .uc-worldcam-dot{width:5px;height:5px;border-radius:50%;background:#ff572c;box-shadow:0 0 7px #ff572c;animation:ucCamPulse 1.2s infinite}
      #${overlayId} .uc-worldcam-live{margin-left:auto;color:#ff7958}
      #${overlayId} .uc-worldcam-frame{display:block;width:100%;height:calc(100% - 20px);border:0;background:#090604;object-fit:cover;pointer-events:none;visibility:hidden}
      #${overlayId} .uc-worldcam-place{position:absolute;left:4px;right:4px;bottom:4px;padding:3px 4px;background:rgba(0,0,0,.72);color:#ffd0ae;font:600 7px/1.3 Inter,system-ui,sans-serif;letter-spacing:.05em;text-align:center;pointer-events:none}
      @keyframes ucCamPulse{50%{opacity:.35}}
      @media(max-width:600px){#${overlayId} .uc-worldcam{top:64px;right:15px;width:104px}#${overlayId} .uc-worldcam-head{height:18px;font-size:6px}#${overlayId} .uc-worldcam-frame{height:calc(100% - 18px)}}
      @media(max-width:600px){#${overlayId} .uc-mark{top:20px;left:18px}#${overlayId} .uc-sub{top:51px;left:20px}#${overlayId} .uc-exit{top:15px;right:15px}#${overlayId} .uc-hint{bottom:108px;font-size:7px;letter-spacing:.14em}#${overlayId} .uc-command{bottom:26px;height:42px;width:calc(100% - 28px)}#${overlayId} .uc-send,#${overlayId} .uc-voice{flex-basis:34px;width:34px;height:32px}}
    `; document.head.appendChild(style); document.body.appendChild(el); el.querySelector('.uc-exit').addEventListener('click',close);
    const form=el.querySelector('.uc-command'), input=el.querySelector('.uc-command-input'), voice=el.querySelector('.uc-voice'), status=el.querySelector('.uc-command-status');
    const worldFrame=el.querySelector('.uc-worldcam-frame'), worldPlace=el.querySelector('.uc-worldcam-place');
    const earthPanel=el.querySelector('.uc-earth-telemetry');
    const earthContent=el.querySelector('.uc-earth-content');
    let earthRefreshTimer=null, earthSatelliteRecords=[], earthSatelliteIndex=0, earthLastCatalogAt=0;
    const earthEscape=value=>String(value??'—').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    const earthSunDistanceAU=now=>{const day=(now-Date.UTC(now.getUTCFullYear(),0,0))/86400000;const g=(357.529+0.98560028*(day-3))%360*Math.PI/180;return 1.00014-0.01671*Math.cos(g)-0.00014*Math.cos(2*g);};
    const earthRenderTelemetry=()=>{
      const now=new Date(),au=earthSunDistanceAU(now),km=au*149597870.7,sats=earthSatelliteRecords,sat=sats.length?sats[earthSatelliteIndex%sats.length]:null;
      const fmt=(n,d=1)=>Number.isFinite(Number(n))?Number(n).toFixed(d):'—';
      const html=['<div><span class="uc-earth-label">UTC</span> '+now.toISOString().slice(11,19)+'</div>','<div><span class="uc-earth-label">SUN RANGE</span> '+fmt(km/1e6,2)+'M km · '+fmt(au,5)+' AU</div>','<div><span class="uc-earth-label">EARTH YEAR</span> 365.256 days</div>','<div><span class="uc-earth-label">EARTH AGE</span> ~4.54B years</div>','<div><span class="uc-earth-label">ATMOS</span> N₂ 78.08% · O₂ 20.95%</div>','<div><span class="uc-earth-label">LAYERS</span> Tropo · Strato · Meso · Thermo · Exo</div>','<div><span class="uc-earth-label">SAT CATALOG</span> '+(sats.length?sats.length.toLocaleString()+' records':'catalog loading')+'</div>',sat?'<div><span class="uc-earth-label">SAT '+(earthSatelliteIndex+1)+'/'+sats.length+'</span> '+earthEscape(sat.name)+'</div><div><span class="uc-earth-label">NORAD</span> '+earthEscape(sat.noradCatId)+' · '+earthEscape(sat.objectType)+'</div><div><span class="uc-earth-label">ORBIT</span> inc '+fmt(sat.inclination,1)+'° · '+fmt(sat.period,1)+' min</div><div><span class="uc-earth-label">ALT</span> '+fmt(sat.perigee,0)+'–'+fmt(sat.apogee,0)+' km</div>':'<div><span class="uc-earth-label">SATELLITES</span> waiting for public catalog…</div>','<div style="color:rgba(255,174,121,.62)">Orbital elements update when the public catalog is reachable.</div>'];
      earthContent.innerHTML=html.join('');if(sats.length)earthSatelliteIndex=(earthSatelliteIndex+1)%sats.length;
    };
    const earthLoadCatalog=async()=>{try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);const response=await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',{signal:controller.signal,cache:'no-store'});clearTimeout(timeout);if(!response.ok)throw new Error('Satellite catalog HTTP '+response.status);const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid satellite catalog');earthSatelliteRecords=data.filter(x=>x&&x.OBJECT_NAME).map(x=>({name:x.OBJECT_NAME,noradCatId:x.NORAD_CAT_ID,objectType:x.OBJECT_TYPE||'ACTIVE',inclination:Number(x.INCLINATION),period:Number(x.PERIOD),perigee:Number(x.PERIGEE),apogee:Number(x.APOGEE)}));earthLastCatalogAt=Date.now();}catch(error){console.warn('[ULTRON] Satellite catalog unavailable; Earth telemetry remains live.',error);}earthRenderTelemetry();};
    earthPanel.addEventListener('pointerdown',e=>e.stopPropagation());earthPanel.addEventListener('click',e=>e.stopPropagation());earthRenderTelemetry();earthLoadCatalog();earthRefreshTimer=setInterval(()=>{earthRenderTelemetry();if(Date.now()-earthLastCatalogAt>10*60*1000)earthLoadCatalog();},3500);
    const targetPanel=el.querySelector('.uc-target-details');
    const targetMeta=el.querySelector('.uc-target-meta');
    const targetContent=el.querySelector('.uc-target-content');
    let activeScanTarget='';
    const scanCategory=value=>{
      const s=String(value||'').toLowerCase();
      if(/e-?mail/.test(s))return 'EMAIL';
      if(/phone|mobile|telephone|\bnumber\b/.test(s))return 'PHONE';
      if(/username|user name|handle/.test(s))return 'USERNAME';
      if(/\bip\b|ip address/.test(s))return 'IP ADDRESS';
      if(/domain|website|url|hostname/.test(s))return 'DOMAIN / WEBSITE';
      if(/hash|malware|threat/.test(s))return 'THREAT INTELLIGENCE';
      if(/location|geo|country|city/.test(s))return 'LOCATION / GEO';
      if(/scan|search|investigat|osint|lookup|recon/.test(s))return 'GENERAL INTELLIGENCE';
      return '';
    };
    const setTargetDetails=(payload,opts={})=>{
      const data=typeof payload==='string'?{text:payload}:payload&&typeof payload==='object'?payload:{text:String(payload??'')};
      if(opts.reset!==false){targetContent.replaceChildren();}
      const category=String(data.category||opts.category||activeScanTarget||'SCAN RESULTS').toUpperCase();
      const target=String(data.target||opts.target||'').slice(0,220);
      targetMeta.textContent=[category,target].filter(Boolean).join(' · ')||'SCAN RESULTS';
      const value=data.results??data.text??data.message??data;
      const items=Array.isArray(value)?value:[value];
      items.forEach(item=>{
        const entry=document.createElement('div');entry.className='uc-target-entry';
        if(item&&typeof item==='object'){
          Object.entries(item).forEach(([key,val])=>{
            if(val===undefined||val===null||typeof val==='object'&& !Array.isArray(val))return;
            const row=document.createElement('div');const label=document.createElement('span');label.className='uc-target-label';label.textContent=String(key)+': ';
            row.append(label,document.createTextNode(Array.isArray(val)?val.join(', '):String(val)));entry.appendChild(row);
          });
          if(!entry.childNodes.length)entry.textContent=JSON.stringify(item,null,2);
        }else entry.textContent=String(item??'');
        targetContent.appendChild(entry);
      });
      if(!targetContent.childNodes.length)targetContent.innerHTML='<div class="uc-target-empty">NO RESULTS RETURNED</div>';
      targetContent.scrollTop=0;
    };
    const resetTargetDetails=(category,target)=>{
      activeScanTarget=category||'';
      setTargetDetails({category:activeScanTarget||'READY',target:target||'',text:activeScanTarget?'Scan started. Waiting for results…':'Scan results will appear here.'});
    };
    targetPanel.addEventListener('pointerdown',e=>e.stopPropagation());
    targetPanel.addEventListener('click',e=>e.stopPropagation());
    targetPanel.querySelector('.uc-target-clear').addEventListener('click',()=>resetTargetDetails('',''));
    window.ULTRON_TARGET_DETAILS={
      set:setTargetDetails,
      reset:resetTargetDetails,
      getTarget:()=>activeScanTarget
    };
    window.addEventListener('jarvis:scan-results',event=>setTargetDetails(event.detail||{}));
    window.addEventListener('ultron:scan-results',event=>setTargetDetails(event.detail||{}));

    const worldCamPanel=el.querySelector('.uc-worldcam');
    const toggleWorldCamSize=()=>{
      const expanded=worldCamPanel.classList.toggle('is-expanded');
      worldCamPanel.setAttribute('aria-expanded',String(expanded));
      worldCamPanel.setAttribute('aria-label',expanded?'World camera feed. Tap to restore original size':'World camera feed. Tap to enlarge');
    };
    worldCamPanel.addEventListener('click',event=>{event.stopPropagation();toggleWorldCamSize();});
    worldCamPanel.addEventListener('keydown',event=>{
      if(event.target!==worldCamPanel)return;
      if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();toggleWorldCamSize();}
    });
    const worldCams=[
      // Prerecorded CBS VOD clip removed: a playing HLS file is not proof of a live camera.
      {name:"Seoul City · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/edge13/ch16.stream/playlist.m3u8"},
      {name:"Seoul Traffic · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/sd1/ch34.stream/playlist.m3u8"},
      {name:"Seoul Road View · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/sd2/ch66.stream/playlist.m3u8"},
      {name:"Chon Buri · THAILAND",url:"https://camerai1.iticfoundation.org/hls/pty85.m3u8"},
      {name:"Khon Kaen · THAILAND",url:"https://camerai1.iticfoundation.org/hls/kk12.m3u8"},

      {name:"BURLEIGH BEACH · AUSTRALIA",url:"https://d1nm4r8e5x1rwd.cloudfront.net/cw/burleighheadscamera.stream/playlist.m3u8"},
      {name:"CURRUMBIN BEACH · AUSTRALIA",url:"https://d1nm4r8e5x1rwd.cloudfront.net/cw/currumbincamera.stream/playlist.m3u8"},
      {name:"NARROWNECK · AUSTRALIA",url:"https://d1nm4r8e5x1rwd.cloudfront.net/cw/narrowneckhighcamera.stream/playlist.m3u8"},
      {name:"SURFERS PARADISE · AUSTRALIA",url:"https://d1nm4r8e5x1rwd.cloudfront.net/cw/surfersparadisecamera.stream/playlist.m3u8"},
      {name:"CELEBRATION SQUARE · CANADA",url:"https://webvideo.mississauga.ca/StageWebcam/LiveStageWebcam.stream-audiodestin/playlist.m3u8"},
      {name:"MISSISSAUGA · CANADA",url:"https://webvideo.mississauga.ca/BalconyWebcam/LiveWebcam.stream/chunklist_w1473770124.m3u8"},
      {name:"BOŽÍ DAR · CZECHIA",url:"https://kamery3.wolfnet.cz/bozi_dar.m3u8"},
      {name:"BOŽÍ DAR PANORAMA · CZECHIA",url:"https://kamery2.wolfnet.cz/bozi_vyhlidka1.m3u8"},
      {name:"HORY · CZECHIA",url:"https://kamery.wolfnet.cz/185.73.102.35-lmk.m3u8"},
      {name:"KARLOVY VARY · CZECHIA",url:"https://kamery2.wolfnet.cz/krusna.m3u8"},
      {name:"KARLOVY VARY PANORAMA · CZECHIA",url:"https://kamery2.wolfnet.cz/panorama.m3u8"},
      {name:"KLÍNOVEC · CZECHIA",url:"https://kamery2.wolfnet.cz/Klinovec_1.m3u8"},
      {name:"THE GRÖMITZ COAST · GERMANY",url:"https://osl9.lvstrm.de/hls/stream.m3u8"},
      {name:"BANGKOK · THAILAND",url:"https://camera1.iticfoundation.org/hls/10.8.0.21_8001.m3u8"},
      {name:"BANGKOK TRANSIT · THAILAND",url:"https://camerai1.iticfoundation.org/hls/charlie-new-tran-10.m3u8"},
      {name:"ISTANBUL · TÜRKİYE",url:"https://601a55c88ec6d.streamlock.net/hls/506.stream/playlist.m3u8"},
      {name:"ISTANBUL PANORAMA · TÜRKİYE",url:"https://601a55c88ec6d.streamlock.net/hls/720.stream/playlist.m3u8"},
      {name:"SEOUL · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/edge6/ch113.stream/playlist.m3u8"},
      {name:"SEOUL CITY VIEW · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/edge6/ch77.stream/playlist.m3u8"},
      {name:"SÃO PAULO · BRAZIL",url:"https://34.104.32.249.nip.io/SP360-KM110/stream.m3u8"},
      {name:"ACUÑA INTERNATIONAL BRIDGE · MEXICO",url:"https://s78.ipcamlive.com/streams/4e49zoi8ngjmple0u/stream.m3u8"},
      {name:"AETOLIA-ACARNANIA · GREECE",url:"https://livecameras.gr:30443/live/asta1/playlist.m3u8"},
      {name:"GREEK COUNTRYSIDE · GREECE",url:"https://livecameras.gr:30443/live/gaval1/playlist.m3u8"},
      {name:"ARCADIA · GREECE",url:"https://livecameras.gr:30443/live/trip1/playlist.m3u8"},
      {name:"ATTICA MOUNTAIN VIEW · GREECE",url:"https://livecameras.gr:30443/live/parn1/playlist.m3u8"},
      {name:"ATTICA · GREECE",url:"https://livecameras.gr:30443/live/dros1/playlist.m3u8"},
      {name:"FYLI · GREECE",url:"https://livecameras.gr:30443/live/fyli1/playlist.m3u8"},
      {name:"KIFISIA · GREECE",url:"https://livecameras.gr:30443/live/kifis1/playlist.m3u8"},
      {name:"TENBY HARBOUR EAST · UNITED KINGDOM",url:"https://s159.ipcamlive.com/streams/9fsgtp29ruh6zek1f/stream.m3u8"},
      {name:"TENBY HARBOUR · UNITED KINGDOM",url:"https://s74.ipcamlive.com/streams/4azcyiwhlasoszw6g/stream.m3u8"},
      {name:"RIVER BURE · UNITED KINGDOM",url:"https://s101.ipcamlive.com/streams/65jrzbexkvsgqd4ci/stream.m3u8"},
      {name:"CASTEL VOLTURNO · ITALY",url:"https://5e0add8153fcd.streamlock.net:1936/vedetta/castel-volturno.stream/playlist.m3u8"},
      {name:"FLORENCE · ITALY",url:"https://5e0add8153fcd.streamlock.net:1936/vedetta/via-della-scala.stream/chunklist_w1359048502.m3u8"},
      {name:"ANDRYCHÓW · POLAND",url:"https://hoktastream3.webcamera.pl/andrychow_cam_3aad9b/andrychow_cam_3aad9b.stream/playlist.m3u8"},
      {name:"BUKOWINA TATRZAŃSKA · POLAND",url:"https://hoktastream1.webcamera.pl/bukovina_cam_7aa04f/bukovina_cam_7aa04f.stream/playlist.m3u8"},
      {name:"KURUCOWY WIERCH · POLAND",url:"https://hoktastream1.webcamera.pl/skywind_cam_3c5be6/skywind_cam_3c5be6.stream/playlist.m3u8"},
      {name:"WARSAW CASTLE SQUARE · POLAND",url:"https://hoktastream2.webcamera.pl/warszawa_cam_5f3b1a/warszawa_cam_5f3b1a.stream/chunks.m3u8"},
      {name:"DZIWNÓW · POLAND",url:"https://hoktastream1.webcamera.pl/dziwnowum_cam_a4181f/dziwnowum_cam_a4181f.stream/playlist.m3u8"},
      {name:"DĘBKI BEACH · POLAND",url:"https://hoktastream2.webcamera.pl/debki_cam_284a24/debki_cam_284a24.stream/playlist.m3u8"},
      {name:"ALVOR · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8"},
      {name:"APÚLIA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8"},
      {name:"ARMAÇÃO DE PÊRA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/armacaodepera/playlist.m3u8"},
      {name:"ARRIFANA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/arrifana/playlist.m3u8"},
      {name:"CARCAVELOS · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/carcavelos/playlist.m3u8"},
      {name:"COSTA DA CAPARICA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/costacaparicacds/playlist.m3u8"},
      {name:"RIVIERA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/riviera/playlist.m3u8"},
      {name:"TARQUINHO · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/bctarquinho/playlist.m3u8"},
      {name:"BRASOV · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/poiana_brasov_desktop.stream/index.m3u8"},
      {name:"GALATI · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/galati2_desktop.stream/index.m3u8"},
      {name:"PRAHOVA · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/azuga_desktop.stream/index.m3u8"},
      {name:"BUSTENI GARA · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/busteni_gara_desktop.stream/index.m3u8"},
      {name:"SINAIA · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/sinaia_desktop.stream/index.m3u8"},
      {name:"RAMNICU VALCEA · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/ramnicu_valcea_desktop.stream/index.m3u8"},
      {name:"FOCSANI · ROMANIA",url:"https://digilive.rcs-rds.ro/digilivedge/focsani_desktop.stream/index.m3u8"},
      {name:"CHACHOENGSAO · THAILAND",url:"https://camera1.iticfoundation.org/hls/10.8.0.24_8554.m3u8"},
      {name:"BANTEN · INDONESIA",url:"https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10019.m3u8"},
      {name:"BANTEN HIGHWAY · INDONESIA",url:"https://info.serbaraja-tollroad.co.id:20443/LiveApp/streams/10003.m3u8"},
      {name:"SEOUL · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/edge6/ch138.stream/playlist.m3u8"},
      {name:"SEOUL · SOUTH KOREA",url:"https://topiscctv1.eseoul.go.kr/edge6/ch101.stream/playlist.m3u8"},
      {name:"SÃO PAULO HIGHWAY · BRAZIL",url:"https://34.104.32.249.nip.io/SP055-KM193/stream.m3u8"},
      {name:"SÃO PAULO HIGHWAY · BRAZIL",url:"https://34.104.32.249.nip.io/SP055-KM211A/stream.m3u8"},
      {name:"SÃO PAULO HIGHWAY · BRAZIL",url:"https://34.104.32.249.nip.io/SP008-KM095/stream.m3u8"},
      // Additional direct public HLS cameras from the maintained Live-Environment-Streams registry.
      // These avoid YouTube embeds/ads; every feed is still runtime-checked and may go offline.
      {name:"ALVOR BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8"},
      {name:"APÚLIA BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8"},
      {name:"ARMAÇÃO DE PÊRA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/armacaodepera/playlist.m3u8"},
      {name:"ARRIFANA BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/arrifana/playlist.m3u8"},
      {name:"CARCAVELOS BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/carcavelos/playlist.m3u8"},
      {name:"COSTA DA CAPARICA · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/costacaparicacds/playlist.m3u8"},
      {name:"RIVIERA BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/riviera/playlist.m3u8"},
      {name:"TARQUINHO BEACH · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/bctarquinho/playlist.m3u8"},
      {name:"WHISTLER VILLAGE · CANADA",url:"https://streamer6.brownrice.com/whistlervillagefitz/whistlervillagefitz.stream/main_playlist.m3u8"}
    ];
let worldIndex=Math.floor(Math.random()*worldCams.length), worldHls=null, worldCamTimer=null, worldCamWatchdog=null, worldCamStarted=false, worldCamLoading=false, worldAttempt=0;
    let worldBlackCheckTimer=null, worldPlaybackMonitor=null, worldRetryTimer=null, worldActiveCam=null;
    const worldFailedCams=new Set();
    const worldLiveBadge=el.querySelector('.uc-worldcam-live');
    const destroyWorldHls=()=>{if(worldHls){try{worldHls.destroy()}catch(_){}worldHls=null;}};
    const clearWorldTimers=()=>{
      if(worldCamWatchdog){clearTimeout(worldCamWatchdog);worldCamWatchdog=null;}
      if(worldBlackCheckTimer){clearInterval(worldBlackCheckTimer);worldBlackCheckTimer=null;}
      if(worldPlaybackMonitor){clearInterval(worldPlaybackMonitor);worldPlaybackMonitor=null;}
      if(worldRetryTimer){clearTimeout(worldRetryTimer);worldRetryTimer=null;}
    };
    const resetWorldVideo=()=>{
      worldFrame.onplaying=null;worldFrame.onerror=null;worldFrame.onwaiting=null;worldFrame.onstalled=null;
      destroyWorldHls();
      try{worldFrame.pause();worldFrame.removeAttribute('src');worldFrame.load()}catch(_){}
      worldFrame.style.visibility='hidden';
    };
    const failWorldCam=(reason)=>{
      if(!worldCamLoading&&!worldCamStarted)return;
      const failed=worldActiveCam;
      worldCamLoading=false;worldCamStarted=false;
      clearWorldTimers();
      if(failed)worldFailedCams.add(failed.url);
      resetWorldVideo();
      worldLiveBadge.textContent='RECONNECTING';
      worldLiveBadge.style.opacity='.8';
      worldPlace.textContent='SEARCHING FOR LIVE FEED';
      worldRetryTimer=setTimeout(()=>{if(active&&worldFrame.isConnected)nextWorldCam()},250);
    };
    const markWorldCamLive=(cam)=>{
      if(!worldCamLoading||!worldFrame.isConnected)return;
      worldCamStarted=true;worldCamLoading=false;
      if(worldCamWatchdog){clearTimeout(worldCamWatchdog);worldCamWatchdog=null;}
      if(worldBlackCheckTimer){clearInterval(worldBlackCheckTimer);worldBlackCheckTimer=null;}
      worldFrame.style.visibility='visible';
      worldPlace.textContent=cam.name;
      worldLiveBadge.textContent='LIVE';
      worldLiveBadge.style.opacity='1';
      let lastTime=Number(worldFrame.currentTime)||0;
      let lastAdvanceAt=Date.now();
      if(worldPlaybackMonitor)clearInterval(worldPlaybackMonitor);
      worldPlaybackMonitor=setInterval(()=>{
        if(!active||!worldFrame.isConnected){if(worldPlaybackMonitor)clearInterval(worldPlaybackMonitor);worldPlaybackMonitor=null;return;}
        const nowTime=Number(worldFrame.currentTime)||0;
        if(!worldFrame.paused&&worldFrame.readyState>=2&&nowTime>lastTime+0.12){lastTime=nowTime;lastAdvanceAt=Date.now();}
        else if(Date.now()-lastAdvanceAt>9000)failWorldCam('playback stalled');
      },1500);
    };
    const startWorldCam=()=>{
      if(!active||!worldFrame?.isConnected||worldCamLoading||worldCamStarted)return;
      clearWorldTimers();resetWorldVideo();
      let cam=null;
      for(let checked=0;checked<worldCams.length;checked++){
        const candidate=worldCams[worldIndex%worldCams.length];worldIndex=(worldIndex+1)%worldCams.length;
        if(!worldFailedCams.has(candidate.url)){cam=candidate;break;}
      }
      if(!cam){worldFailedCams.clear();cam=worldCams[worldIndex%worldCams.length];worldIndex=(worldIndex+1)%worldCams.length;}
      if(!cam)return;
      worldActiveCam=cam;worldCamLoading=true;worldCamStarted=false;worldAttempt++;
      worldPlace.textContent='CHECKING LIVE FEED';worldLiveBadge.textContent='CONNECTING';worldLiveBadge.style.opacity='.75';
      let worldBrightSamples=0, worldCheckedSamples=0, lastCrossOriginTime=-1, crossOriginAdvancingSamples=0;
      const clearBlackCheck=()=>{if(worldBlackCheckTimer){clearInterval(worldBlackCheckTimer);worldBlackCheckTimer=null;}};
      worldFrame.onplaying=()=>{
        if(!worldCamLoading)return;
        clearBlackCheck();worldBrightSamples=0;worldCheckedSamples=0;
        const probe=document.createElement('canvas');probe.width=24;probe.height=14;
        const ctx=probe.getContext('2d',{willReadFrequently:true});
        if(!ctx){markWorldCamLive(cam);return;}
        worldBlackCheckTimer=setInterval(()=>{
          if(!worldCamLoading||!worldFrame.isConnected){clearBlackCheck();return;}
          if(worldFrame.readyState<2||!worldFrame.videoWidth||!worldFrame.videoHeight)return;
          try{
            ctx.drawImage(worldFrame,0,0,probe.width,probe.height);
            const pixels=ctx.getImageData(0,0,probe.width,probe.height).data;
            let sum=0,bright=0;
            for(let i=0;i<pixels.length;i+=4){const l=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];sum+=l;if(l>24)bright++;}
            worldCheckedSamples++;
            if(sum/(pixels.length/4)>16&&bright/(pixels.length/4)>.12)worldBrightSamples++;
            if(worldBrightSamples>=1)markWorldCamLive(cam);
            else if(worldCheckedSamples>=4)failWorldCam('black frames');
          }catch(_){
            const now=Number(worldFrame.currentTime)||0;
            if(worldFrame.readyState>=2&&worldFrame.videoWidth>0&&worldFrame.videoHeight>0&&now>lastCrossOriginTime+0.08){crossOriginAdvancingSamples++;lastCrossOriginTime=now;}
            worldCheckedSamples++;
            if(crossOriginAdvancingSamples>=3)markWorldCamLive(cam);
            else if(worldCheckedSamples>=8&&crossOriginAdvancingSamples===0)failWorldCam('no advancing frames');
          }
        },600);
      };
      worldFrame.onerror=()=>failWorldCam('media error');
      worldFrame.onwaiting=()=>{if(worldCamStarted)worldPlace.textContent=cam.name+' · BUFFERING';};
      worldFrame.onstalled=()=>{if(worldCamStarted)setTimeout(()=>{if(worldCamStarted&&worldFrame.readyState<2)failWorldCam('stalled stream')},5000);};
      worldCamWatchdog=setTimeout(()=>{if(!worldCamStarted)failWorldCam('live check timed out')},8000);
      const tryNative=()=>{
        if(!worldCamLoading)return;
        destroyWorldHls();
        try{worldFrame.src=cam.url;worldFrame.load();const p=worldFrame.play();if(p&&p.catch)p.catch(()=>{})}catch(_){}
      };
      const tryHls=()=>{
        if(!worldCamLoading)return;
        if(window.Hls&&window.Hls.isSupported()){
          worldHls=new window.Hls({enableWorker:true,lowLatencyMode:true,maxBufferLength:8,manifestLoadingTimeOut:6000,levelLoadingTimeOut:6000});
          worldHls.on(window.Hls.Events.ERROR,(_,data)=>{
            if(!data?.fatal)return;
            destroyWorldHls();
            failWorldCam('HLS '+(data.type===window.Hls.ErrorTypes.NETWORK_ERROR?'network error':'stream error'));
          });
          worldHls.on(window.Hls.Events.MANIFEST_PARSED,()=>{try{const p=worldFrame.play();if(p&&p.catch)p.catch(()=>{})}catch(_){}});
          worldHls.loadSource(cam.url);worldHls.attachMedia(worldFrame);
        }else if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();
        else failWorldCam('HLS unsupported');
      };
      // Prefer hls.js where Media Source Extensions are available; canPlayType() can
      // return a misleading "maybe" on browsers that cannot actually play this HLS stream.
      if(window.Hls&&window.Hls.isSupported())tryHls();
      else if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();
      else{
        const loader=document.createElement('script');loader.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';loader.async=true;
        loader.onload=()=>{if(window.Hls&&window.Hls.isSupported())tryHls();else if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();else failWorldCam('HLS playback unsupported')};
        loader.onerror=()=>{if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();else failWorldCam('player library unavailable')};
        document.head.appendChild(loader);
      }
    };
    const nextWorldCam=()=>{clearWorldTimers();worldCamLoading=false;worldCamStarted=false;resetWorldVideo();startWorldCam();};
    startWorldCam();
    worldCamTimer=setInterval(()=>{if(active&&worldFrame.isConnected)nextWorldCam()},20000);
    window.__ultronWorldCamTimer=worldCamTimer;
    el.querySelector('.uc-exit').addEventListener('click',()=>{
      if(worldCamTimer)clearInterval(worldCamTimer);
      clearWorldTimers();destroyWorldHls();resetWorldVideo();window.__ultronWorldCamTimer=null;
    });
    const setStatus=message=>{status.textContent=message||'';};
    form.addEventListener('pointerdown',e=>e.stopPropagation());
    form.addEventListener('click',e=>e.stopPropagation());
    form.addEventListener('submit',async e=>{
      e.preventDefault(); e.stopPropagation();
      const command=input.value.trim(); if(!command)return;
      const detectedCategory=scanCategory(command);
      if(detectedCategory){
        const target=command.replace(/^(hey jarvis[, ]*)?(please )?(scan|search|investigate|lookup|look up|check|find|recon|osint)\s+/i,'').trim();
        resetTargetDetails(detectedCategory,target);
      }
      if(typeof window.sendCommand!=='function'){setStatus('Command service is not ready yet.');return;}
      setStatus('Sending…'); voice.disabled=true;
      try{const commandResult=await window.sendCommand(command);if(detectedCategory&&commandResult!==undefined&&commandResult!==null&&commandResult!==false&&commandResult!==''){setTargetDetails({category:detectedCategory,target:command.replace(/^(hey jarvis[, ]*)?(please )?(scan|search|investigate|lookup|look up|check|find|recon|osint)\\s+/i,'').trim(),results:commandResult});}input.value='';setStatus('Command sent.');}
      catch(error){console.error('[ULTRON] command failed',error);setStatus('Command could not be sent.');}
      finally{voice.disabled=false;setTimeout(()=>{if(status.textContent==='Command sent.')setStatus('');},2200);}
    });
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){voice.disabled=true;voice.title='Voice input is not supported in this browser';voice.setAttribute('aria-label','Voice input not supported');}
    else voice.addEventListener('click',()=>{
      if(voice.classList.contains('is-listening'))return;
      const recognition=new Recognition();recognition.lang=navigator.language||'en-US';recognition.interimResults=false;recognition.maxAlternatives=1;
      voice.classList.add('is-listening');setStatus('Listening…');
      recognition.onresult=event=>{const transcript=event.results?.[0]?.[0]?.transcript?.trim();if(transcript){input.value=transcript;setStatus('Recognized. Sending…');form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}else setStatus('No speech detected.');};
      recognition.onerror=event=>setStatus(event.error==='not-allowed'?'Microphone permission denied.':'Voice input failed. Try again.');
      recognition.onend=()=>{voice.classList.remove('is-listening');setTimeout(()=>{if(status.textContent==='Listening…')setStatus('');},1800);};
      try{recognition.start();}catch(error){voice.classList.remove('is-listening');setStatus('Could not start microphone.');}
    });
    return el;
  }
  function makeScene(el) {
    const T=window.THREE, canvas=el.querySelector('canvas');
    if (!T || !T.WebGLRenderer) throw new Error('Three.js WebGLRenderer unavailable');
    scene=new T.Scene(); scene.background=new T.Color(0x050302);
    camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,1000); camera.position.set(0,0,11);
    try { renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
    catch(e) { throw new Error('WebGL is unavailable on this device/browser'); }
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.35;
    root=new T.Group(); scene.add(root); scene.add(new T.AmbientLight(0xff6824,1.5));
    const light=new T.PointLight(0xff6b1a,180,40); light.position.set(3,2,5); scene.add(light); const innerLight=new T.PointLight(0xffa04b,90,25); innerLight.position.set(-3,-1,2); scene.add(innerLight);
    const N=innerWidth<650?1150:2400, positions=new Float32Array(N*3), golden=Math.PI*(3-Math.sqrt(5)), nodes=[];
    for(let i=0;i<N;i++){const y=1-(i/(N-1))*2,radius=Math.sqrt(1-y*y),theta=golden*i,p=new T.Vector3(Math.cos(theta)*radius,y,Math.sin(theta)*radius).multiplyScalar(2.01+Math.sin(i*12.989)*.052);nodes.push(p);positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;}
    const links=[]; for(let i=0;i<N;i++){const candidates=[];for(let j=Math.max(0,i-10);j<Math.min(N,i+11);j++){if(i===j)continue;const d=nodes[i].distanceTo(nodes[j]);if(d<.52)candidates.push([d,j]);}candidates.sort((a,b)=>a[0]-b[0]);for(const [,j] of candidates.slice(0,5))if(j>i)links.push(nodes[i].x,nodes[i].y,nodes[i].z,nodes[j].x,nodes[j].y,nodes[j].z);}
    const lineGeo=new T.BufferGeometry();lineGeo.setAttribute('position',new T.Float32BufferAttribute(links,3));network=new T.LineSegments(lineGeo,new T.LineBasicMaterial({color:0xff641b,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));root.add(network);
    const pointGeo=new T.BufferGeometry();pointGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));particles=new T.Points(pointGeo,new T.PointsMaterial({color:0xffa15a,size:.0328,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));root.add(particles);
    const coreGeo=new T.IcosahedronGeometry(.765,6);
    const corePos=coreGeo.attributes.position;
    for(let i=0;i<corePos.count;i++){
      const x=corePos.getX(i),y=corePos.getY(i),z=corePos.getZ(i);
      const n=1+.035*Math.sin(x*19+y*13)*Math.sin(z*17-y*11)+.018*Math.sin(x*37+z*23);
      corePos.setXYZ(i,x*n,y*n,z*n);
    }
    coreGeo.computeVertexNormals();
    core=new T.Mesh(coreGeo,new T.MeshPhysicalMaterial({color:0x541706,emissive:0xff3c08,emissiveIntensity:1.8,roughness:.24,metalness:.52,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.96}));root.add(core);
    coreGlow=new T.Mesh(new T.SphereGeometry(.672,64,48),new T.MeshBasicMaterial({color:0xff5b12,transparent:true,opacity:.11,blending:T.AdditiveBlending,depthWrite:false,side:T.BackSide}));root.add(coreGlow);
    const plasmaShell=new T.Mesh(new T.SphereGeometry(.597,64,48),new T.MeshPhysicalMaterial({color:0xff681c,emissive:0xff3d05,emissiveIntensity:2.6,roughness:.12,metalness:.18,transparent:true,opacity:.28,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));root.add(plasmaShell);
    const nucleusGeo=new T.IcosahedronGeometry(.363,5);
    const nucleusPos=nucleusGeo.attributes.position;
    for(let i=0;i<nucleusPos.count;i++){const x=nucleusPos.getX(i),y=nucleusPos.getY(i),z=nucleusPos.getZ(i);const n=1+.075*Math.sin(x*27+z*18)*Math.cos(y*24-x*11);nucleusPos.setXYZ(i,x*n,y*n,z*n);}
    nucleusGeo.computeVertexNormals();
    const nucleus=new T.Mesh(nucleusGeo,new T.MeshStandardMaterial({color:0xffa64b,emissive:0xff4b08,emissiveIntensity:4.2,roughness:.16,metalness:.32}));root.add(nucleus);
    const corona=new T.Group();root.add(corona);
    for(let i=0;i<3;i++){const arc=new T.Mesh(new T.TorusGeometry((.73+i*.085)*.93,(.012-i*.002)*.93,8,180,Math.PI*1.42),new T.MeshBasicMaterial({color:i===1?0xffb15b:0xff4b0b,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false}));arc.rotation.set(.7+i*.9,.35+i*.5,.2+i*.7);corona.add(arc);}
    const coreLight=new T.PointLight(0xff4b0c,38,9);root.add(coreLight);
    ringGroup=new T.Group();root.add(ringGroup);for(let i=0;i<4;i++){const ring=new T.Mesh(new T.TorusGeometry((1.18+i*.18)*.93,(.006+(i%2)*.003)*.93,6,220),new T.MeshBasicMaterial({color:i%2?0xff4d13:0xffa04b,transparent:true,opacity:.52,blending:T.AdditiveBlending,depthWrite:false}));ring.rotation.set(.7+i*.52,.3+i*.8,.2+i*.42);ringGroup.add(ring);}
    const halo=new T.Mesh(new T.SphereGeometry(2.5,32,24),new T.MeshBasicMaterial({color:0xff5a16,wireframe:true,transparent:true,opacity:.035,blending:T.AdditiveBlending,depthWrite:false}));root.add(halo);
  }
  function cleanup(){if(earthRefreshTimer)clearInterval(earthRefreshTimer);earthRefreshTimer=null;if(window.ULTRON_TARGET_DETAILS)delete window.ULTRON_TARGET_DETAILS;active=false;if(window.__ultronWorldCamTimer){clearInterval(window.__ultronWorldCamTimer);window.__ultronWorldCamTimer=null;}document.body.classList.remove(scopedUiClass);cancelAnimationFrame(frame);if(resizeHandler)window.removeEventListener('resize',resizeHandler);const el=document.getElementById(overlayId);if(el)el.remove();const style=document.getElementById('ultron-clean-core-style');if(style)style.remove();if(renderer){renderer.dispose();renderer=null;}scene=camera=root=core=coreGlow=network=particles=ringGroup=null;}
  function close(){cleanup();}
  function open(){if(active)return;active=true;document.body.classList.add(scopedUiClass);loadThree().then(()=>{if(!active)return;const el=buildOverlay();makeScene(el);const canvas=el.querySelector('canvas');canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;targetY+=(e.clientX-lastX)*.006;targetX+=(e.clientY-lastY)*.006;targetX=Math.max(-1.3,Math.min(1.3,targetX));lastX=e.clientX;lastY=e.clientY});const stopDrag=()=>{drag=false};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);wheelHandler=e=>{e.preventDefault();zoom=Math.max(.68,Math.min(1.7,zoom+(e.deltaY>0?.06:-.06)))};canvas.addEventListener('wheel',wheelHandler,{passive:false});resizeHandler=()=>{if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8))};window.addEventListener('resize',resizeHandler);let t=0;const animate=()=>{if(!active||!renderer)return;frame=requestAnimationFrame(animate);t+=.004;rotX+=(targetX-rotX)*.045;rotY+=(targetY-rotY)*.045;root.rotation.x=rotX+Math.sin(t*.3)*.035;root.rotation.y=rotY+t*.11;root.rotation.z=Math.sin(t*.22)*.04;core.rotation.x=t*.18;core.rotation.y=-t*.23;coreGlow.scale.setScalar(1+Math.sin(t*2.1)*.055);ringGroup.rotation.y=-t*.12;ringGroup.rotation.x=Math.sin(t*.4)*.12;camera.position.z+=(11/zoom-camera.position.z)*.08;renderer.render(scene,camera)};animate();}).catch(error=>{active=false;document.body.classList.remove(scopedUiClass);console.error('[ULTRON] core startup failed',error);alert('ULTRON core could not load. Please check your connection, then reload JARVIS. If the problem continues, WebGL may be unavailable in this browser.');});}
  window.ULTRON={version:VERSION,open,close};
})();