/* VELVE-only satellite upgrade: ~200 real active satellites, visible orbit separation, click details, and reliable voice button. */
(() => {
  'use strict';
  const VERSION = 'velve-satellites-20261015c';
  let viewer = null, patched = false, loaded = false;
  const sats = [], entities = new Map();
  const css = `#velve-satellite-info{position:fixed;right:18px;bottom:116px;width:min(330px,calc(100vw - 36px));z-index:2147483000;pointer-events:auto;display:none;background:rgba(3,10,18,.94);border:1px solid rgba(0,238,255,.7);border-radius:12px;box-shadow:0 0 28px rgba(0,220,255,.18);padding:14px;color:#dffaff;font-family:Arial,sans-serif;backdrop-filter:blur(10px)}#velve-satellite-info.open{display:block}#velve-satellite-info .vsi-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}#velve-satellite-info h3{font-size:13px;letter-spacing:2px;margin:0;color:#61f5ff}#velve-satellite-info .vsi-x{border:0;background:transparent;color:#bdefff;font-size:23px;line-height:1;cursor:pointer;padding:0 3px}#velve-satellite-info .vsi-name{font-size:17px;font-weight:800;margin:0 0 8px;color:#fff}#velve-satellite-info .vsi-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px;font-size:11px}#velve-satellite-info .vsi-grid span{display:block;color:#7695a3;font-size:9px;letter-spacing:1px;margin-bottom:2px}#velve-satellite-info .vsi-grid b{font-size:11px;color:#e9fbff}#velve-satellite-info .vsi-source{margin-top:10px;color:#78909b;font-size:9px;line-height:1.4}.velve-real-sat{filter:drop-shadow(0 0 5px #00eaff)}`;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  function patchViewer(){if(patched||!window.Cesium||!window.Cesium.Viewer)return;const C=window.Cesium,O=C.Viewer;if(O.__velveWrapped){patched=true;return}function WrappedViewer(...args){const v=new O(...args);if(args[0]==='velve-globe'){viewer=v;window.__VELVE_VIEWER=v;setTimeout(init,0)}return v}WrappedViewer.prototype=O.prototype;WrappedViewer.__velveWrapped=true;C.Viewer=WrappedViewer;patched=true}
  function addPanel(){if(document.getElementById('velve-satellite-info'))return;const el=document.createElement('section');el.id='velve-satellite-info';el.innerHTML='<div class="vsi-head"><h3>SATELLITE // REAL CATALOG DATA</h3><button class="vsi-x" aria-label="Close satellite information">×</button></div><div class="vsi-name" id="vsi-name">—</div><div class="vsi-grid"><div><span>NORAD ID</span><b id="vsi-norad">—</b></div><div><span>COUNTRY / OPERATOR</span><b id="vsi-country">—</b></div><div><span>ORBIT</span><b id="vsi-orbit">—</b></div><div><span>PERIOD</span><b id="vsi-period">—</b></div><div><span>ALTITUDE</span><b id="vsi-alt">—</b></div><div><span>INCLINATION</span><b id="vsi-inc">—</b></div></div><div class="vsi-source">Catalog: CelesTrak active satellite GP data. Marker positions are a visual orbit display and are not claimed as live tracking.</div>';document.body.appendChild(el);el.querySelector('.vsi-x').onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();el.classList.remove('open')}}
  function removeSatelliteApiKeyOption(){const input=document.getElementById('velve-maptiler-key');if(input){input.value='';input.style.display='none';const label=input.previousElementSibling;if(label&&label.tagName==='LABEL')label.style.display='none'}}
  function voiceFix(){const b=document.getElementById('velve-voice');if(!b||b.dataset.vsatVoice==='1')return;b.dataset.vsatVoice='1';b.onclick=ev=>{ev.preventDefault();ev.stopImmediatePropagation();const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){const input=document.getElementById('velve-input');if(input){input.placeholder='Tap the keyboard mic, dictate a command, then press SEND';input.focus()}const status=document.querySelector('#velve-status b');if(status)status.textContent='USE KEYBOARD DICTATION';try{if(window.speak)window.speak('Voice recognition is not supported by this browser. Tap the microphone on your keyboard, dictate your command, and press Send.')}catch(_){}return}const r=new Recognition();r.lang=navigator.language||'en-US';r.interimResults=false;r.continuous=false;r.maxAlternatives=1;b.classList.add('listening');b.textContent='●';r.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript?.trim()||'';const input=document.getElementById('velve-input');if(input)input.value=text;if(text)document.getElementById('velve-send')?.click()};r.onerror=()=>{};r.onend=()=>{b.classList.remove('listening');b.textContent='🎙'};try{r.start()}catch(_){b.classList.remove('listening');b.textContent='🎙'}}}
  function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
  function orbitalPosition(s,now){
    const mu=398600.4418, earth=6378.137;
    const inc=n(s.INCLINATION)*Math.PI/180;
    const raan=n(s.RA_OF_ASC_NODE??s.RIGHT_ASCENSION_OF_ASCENDING_NODE??s.RAAN)*Math.PI/180;
    const arg=n(s.ARG_OF_PERICENTER??s.ARG_OF_PERIGEE)*Math.PI/180;
    const ecc=Math.min(.92,Math.max(0,n(s.ECCENTRICITY)));
    const mm=n(s.MEAN_MOTION,15.2)*2*Math.PI/86400;
    const a=Math.cbrt(mu/(mm*mm));
    const elapsed=(now-n(Date.parse(s.EPOCH),now))/1000;
    let M=(n(s.MEAN_ANOMALY)*Math.PI/180+mm*elapsed)%(2*Math.PI); if(M<0)M+=2*Math.PI;
    let E=M; for(let i=0;i<7;i++)E-=(E-ecc*Math.sin(E)-M)/(1-ecc*Math.cos(E));
    const xOrb=a*(Math.cos(E)-ecc),yOrb=a*Math.sqrt(1-ecc*ecc)*Math.sin(E);
    const u=arg, cu=Math.cos(u),su=Math.sin(u),cr=Math.cos(raan),sr=Math.sin(raan),ci=Math.cos(inc),si=Math.sin(inc);
    const x=xOrb*cu-yOrb*su, y=xOrb*su+yOrb*cu;
    return{x:(cr*x-sr*y*ci),y:(sr*x+cr*y*ci),z:y*si,altitude:Math.max(0,a*(1-ecc)-earth),period:1440/n(s.MEAN_MOTION,15.2)};
  }
  function addSatellite(s,i){if(!viewer||!window.Cesium)return;const C=window.Cesium,id='velve-real-sat-'+i,e=viewer.entities.add({id,name:String(s.OBJECT_NAME||s.NAME||'Unknown Satellite'),position:C.Cartesian3.ZERO,point:{pixelSize:8,color:i%3===0?C.Color.CYAN:i%3===1?C.Color.LIME:C.Color.YELLOW,outlineColor:C.Color.BLACK,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY}});e.__velveSat=s;e.__velveRealSat=true;entities.set(id,e);updateEntity(e,s)}
  function updateEntity(e,s){const p=orbitalPosition(s,Date.now()),C=window.Cesium;e.position=C.Cartesian3.fromElements(p.x*1000,p.y*1000,p.z*1000)}
  function showSatellite(s){
    const panel=document.getElementById('velve-satellite-info');if(!panel)return;
    const p=orbitalPosition(s,Date.now()),alt=p.altitude;
    document.getElementById('vsi-name').textContent=String(s.OBJECT_NAME||s.NAME||'Unknown Satellite');
    document.getElementById('vsi-norad').textContent=String(s.NORAD_CAT_ID??s.NORAD_ID??'—');
    document.getElementById('vsi-country').textContent=String(s.COUNTRY_CODE||s.OWNER||s.ORIGINATOR||s.LAUNCH_SITE||'Catalog');
    document.getElementById('vsi-orbit').textContent=alt>30000?'GEO / HIGH':alt>2000?'MEO':'LEO';
    document.getElementById('vsi-period').textContent=Number.isFinite(p.period)?p.period.toFixed(1)+' min':'—';
    document.getElementById('vsi-alt').textContent=Math.round(alt)+' km';
    document.getElementById('vsi-inc').textContent=n(s.INCLINATION).toFixed(2)+'°';
    panel.classList.add('open');
  }
  async function loadRealSatellites(){if(loaded||!viewer||!window.Cesium)return;loaded=true;removeSatelliteApiKeyOption();try{const response=await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',{cache:'no-store'});if(!response.ok)throw new Error('CelesTrak HTTP '+response.status);const data=await response.json(),list=Array.isArray(data)?data:(data?.data||data?.satellites||[]),chosen=list.filter(s=>s&&(s.OBJECT_NAME||s.NAME)&&(s.NORAD_CAT_ID!=null)).slice(0,200);sats.push(...chosen);chosen.forEach(addSatellite);const count=document.getElementById('v-sat');if(count)count.textContent=chosen.length+' REAL';const root=document.getElementById('velve-root');if(root)root.dataset.realSatellites=String(chosen.length)}catch(err){console.warn('[VELVE satellites]',err);loaded=false;const count=document.getElementById('v-sat');if(count)count.textContent='satellite feed offline'}}
  function installClick(){
    if(!viewer||viewer.__velveSatClick)return;
    viewer.__velveSatClick=true;const C=window.Cesium;
    try{viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)}catch(_){}
    viewer.screenSpaceEventHandler.setInputAction(m=>{
      const picked=viewer.scene.pick(m.position),e=picked?.id;
      if(!e?.__velveRealSat)return;
      try{viewer.selectedEntity=undefined;viewer.trackedEntity=undefined;viewer.camera.cancelFlight()}catch(_){}
      showSatellite(e.__velveSat);
      const p=orbitalPosition(e.__velveSat,Date.now()),v=C.Cartesian3.fromElements(p.x*1000,p.y*1000,p.z*1000);
      const destination=C.Cartesian3.multiplyByScalar(v,1.12,new C.Cartesian3());
      try{viewer.camera.flyTo({destination,duration:1.1,complete:()=>{try{viewer.trackedEntity=undefined;viewer.selectedEntity=undefined}catch(_){}}})}catch(err){console.warn('[VELVE satellite jump]',err)}
    },C.ScreenSpaceEventType.LEFT_CLICK);
  }
  function tick(){if(!viewer||!document.getElementById('velve-root')?.classList.contains('velve-on'))return;entities.forEach(e=>updateEntity(e,e.__velveSat));try{viewer.scene.requestRender()}catch(_){}}
  function init(){viewer=viewer||window.__VELVE_VIEWER||null;if(!viewer||!window.Cesium)return;addPanel();removeSatelliteApiKeyOption();voiceFix();installClick();if(!loaded)loadRealSatellites();if(!window.__VELVE_SAT_TIMER)window.__VELVE_SAT_TIMER=setInterval(tick,3000)}
  function watch(){patchViewer();if(viewer&&document.getElementById('velve-root'))init();removeSatelliteApiKeyOption();voiceFix();setTimeout(watch,1000)}
  window.VELVE_SATELLITE_UPGRADE_VERSION=VERSION;watch();
})();
