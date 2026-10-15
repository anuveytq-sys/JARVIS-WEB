/* VELVE-only satellite upgrade: ~200 real active satellites, visible orbit separation, click details, and reliable voice button. */
(() => {
  'use strict';
  const VERSION = 'velve-satellites-20261015a';
  let viewer = null;
  let patched = false;
  let loaded = false;
  const sats = [];
  const entities = new Map();

  const css = `
  #velve-satellite-info{position:absolute;right:18px;bottom:116px;width:min(330px,calc(100vw - 36px));z-index:1200;display:none;background:rgba(3,10,18,.94);border:1px solid rgba(0,238,255,.7);border-radius:12px;box-shadow:0 0 28px rgba(0,220,255,.18);padding:14px;color:#dffaff;font-family:Arial,sans-serif;backdrop-filter:blur(10px)}
  #velve-satellite-info.open{display:block}
  #velve-satellite-info .vsi-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  #velve-satellite-info h3{font-size:13px;letter-spacing:2px;margin:0;color:#61f5ff}
  #velve-satellite-info .vsi-x{border:0;background:transparent;color:#bdefff;font-size:23px;line-height:1;cursor:pointer;padding:0 3px}
  #velve-satellite-info .vsi-name{font-size:17px;font-weight:800;margin:0 0 8px;color:#fff}
  #velve-satellite-info .vsi-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px;font-size:11px}
  #velve-satellite-info .vsi-grid span{display:block;color:#7695a3;font-size:9px;letter-spacing:1px;margin-bottom:2px}
  #velve-satellite-info .vsi-grid b{font-size:11px;color:#e9fbff}
  #velve-satellite-info .vsi-source{margin-top:10px;color:#78909b;font-size:9px;line-height:1.4}
  .velve-real-sat{filter:drop-shadow(0 0 5px #00eaff)}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function patchViewer(){
    if(patched || !window.Cesium || !window.Cesium.Viewer) return;
    const C = window.Cesium, OriginalViewer = C.Viewer;
    if(OriginalViewer.__velveWrapped) { patched=true; return; }
    function WrappedViewer(...args){
      const v = new OriginalViewer(...args);
      if(args[0] === 'velve-globe') { viewer = v; window.__VELVE_VIEWER = v; setTimeout(init, 0); }
      return v;
    }
    WrappedViewer.prototype = OriginalViewer.prototype;
    WrappedViewer.__velveWrapped = true;
    C.Viewer = WrappedViewer;
    patched = true;
  }

  function addPanel(){
    if(document.getElementById('velve-satellite-info')) return;
    const el=document.createElement('section'); el.id='velve-satellite-info';
    el.innerHTML='<div class="vsi-head"><h3>SATELLITE // REAL CATALOG DATA</h3><button class="vsi-x" aria-label="Close satellite information">×</button></div><div class="vsi-name" id="vsi-name">—</div><div class="vsi-grid"><div><span>NORAD ID</span><b id="vsi-norad">—</b></div><div><span>COUNTRY / OPERATOR</span><b id="vsi-country">—</b></div><div><span>ORBIT</span><b id="vsi-orbit">—</b></div><div><span>PERIOD</span><b id="vsi-period">—</b></div><div><span>ALTITUDE</span><b id="vsi-alt">—</b></div><div><span>INCLINATION</span><b id="vsi-inc">—</b></div></div><div class="vsi-source">Catalog: CelesTrak active satellite GP data. Marker positions are a visual orbit display and are not claimed as live tracking.</div>';
    document.getElementById('velve-root')?.appendChild(el);
    el.querySelector('.vsi-x').onclick=()=>el.classList.remove('open');
  }

  function removeSatelliteApiKeyOption(){
    const input=document.getElementById('velve-maptiler-key');
    if(input){
      input.value='';
      input.style.display='none';
      const label=input.previousElementSibling;
      if(label && label.tagName==='LABEL') label.style.display='none';
    }
  }

  function voiceFix(){
    const b=document.getElementById('velve-voice');
    if(!b || b.dataset.vsatVoice==='1') return;
    b.dataset.vsatVoice='1';
    b.onclick=(ev)=>{
      ev.preventDefault(); ev.stopImmediatePropagation();
      const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Recognition){
        document.getElementById('velve-input')?.focus();
        const s=document.getElementById('velve-status'); if(s)s.innerHTML='SYSTEM: <b>VOICE NOT SUPPORTED — TYPE COMMAND</b><button class="velve-panel-x velve-status-x" id="velve-status-hide">×</button>';
        return;
      }
      const r=new Recognition(); r.lang=navigator.language||'en-US'; r.interimResults=false; r.continuous=false; r.maxAlternatives=1;
      b.classList.add('listening'); b.textContent='●';
      r.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript?.trim()||''; const input=document.getElementById('velve-input'); if(input)input.value=text; if(text){ if(typeof window.VELVE_HANDLE_INPUT==='function') window.VELVE_HANDLE_INPUT(text); else document.getElementById('velve-send')?.click(); }};
      r.onerror=()=>{}; r.onend=()=>{b.classList.remove('listening');b.textContent='🎙'};
      try{r.start()}catch(_){b.classList.remove('listening');b.textContent='🎙'}
    };
  }

  function toNumber(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
  function orbitalPosition(s, now){
    const inc=toNumber(s.INCLINATION)*Math.PI/180;
    const raan=toNumber(s.RIGHT_ASCENSION_OF_ASCENDING_NODE ?? s.RA_OF_ASC_NODE ?? s.RAAN)*Math.PI/180;
    const arg=toNumber(s.ARG_OF_PERICENTER ?? s.ARG_OF_PERIGEE)*Math.PI/180;
    const ecc=Math.min(.92,Math.max(0,toNumber(s.ECCENTRICITY)));
    const ap=toNumber(s.APOAPSIS ?? s.APOGEE,900), pe=toNumber(s.PERIAPSIS ?? s.PERIGEE,400);
    const semi=(6371+Math.max(100,ap)+6371+Math.max(100,pe))/2;
    const period=toNumber(s.PERIOD,90);
    const phase=(toNumber(s.MEAN_ANOMALY)*Math.PI/180 + (now/60000)*(2*Math.PI/Math.max(1,period)))%(2*Math.PI);
    const radius=semi*(1-ecc*ecc)/(1+ecc*Math.cos(phase));
    const u=phase+arg;
    const x=radius*(Math.cos(raan)*Math.cos(u)-Math.sin(raan)*Math.sin(u)*Math.cos(inc));
    const y=radius*(Math.sin(raan)*Math.cos(u)+Math.cos(raan)*Math.sin(u)*Math.cos(inc));
    const z=radius*(Math.sin(u)*Math.sin(inc));
    return {x,y,z,alt:Math.max(100,radius-6371)};
  }

  function addSatellite(s,i){
    if(!viewer || !window.Cesium) return;
    const C=window.Cesium, id='velve-real-sat-'+i, p=orbitalPosition(s,Date.now());
    const e=viewer.entities.add({id,name:String(s.OBJECT_NAME||s.NAME||'Unknown Satellite'),position:C.Cartesian3.fromRadians(0,0,0),point:{pixelSize:8, color:i%3===0?C.Color.CYAN:i%3===1?C.Color.LIME:C.Color.YELLOW, outlineColor:C.Color.BLACK, outlineWidth:2, disableDepthTestDistance:Number.POSITIVE_INFINITY}});
    e.__velveSat=s; e.__velveSatIndex=i; e.__velveRealSat=true; entities.set(id,e); updateEntity(e,s);
  }

  function updateEntity(e,s){
    const p=orbitalPosition(s,Date.now());
    const C=window.Cesium;
    e.position=C.Cartesian3.fromKilometers(p.x,p.y,p.z);
  }

  function showSatellite(s){
    const panel=document.getElementById('velve-satellite-info'); if(!panel)return;
    const ap=toNumber(s.APOAPSIS ?? s.APOGEE), pe=toNumber(s.PERIAPSIS ?? s.PERIGEE), alt=((ap+pe)/2);
    const name=String(s.OBJECT_NAME||s.NAME||'Unknown Satellite');
    document.getElementById('vsi-name').textContent=name;
    document.getElementById('vsi-norad').textContent=String(s.NORAD_CAT_ID??s.NORAD_ID??'—');
    document.getElementById('vsi-country').textContent=String(s.COUNTRY_CODE||s.OWNER||s.ORIGINATOR||'Catalog');
    document.getElementById('vsi-orbit').textContent=alt>30000?'GEO / HIGH':alt>2000?'MEO':'LEO';
    document.getElementById('vsi-period').textContent=toNumber(s.PERIOD)?toNumber(s.PERIOD).toFixed(1)+' min':'—';
    document.getElementById('vsi-alt').textContent=alt?Math.round(alt)+' km':'—';
    document.getElementById('vsi-inc').textContent=toNumber(s.INCLINATION).toFixed(2)+'°';
    panel.classList.add('open');
  }

  async function loadRealSatellites(){
    if(loaded || !viewer || !window.Cesium) return;
    loaded=true; removeSatelliteApiKeyOption();
    try{
      const url='https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
      const response=await fetch(url,{cache:'no-store'}); if(!response.ok) throw new Error('CelesTrak HTTP '+response.status);
      const data=await response.json(); const list=Array.isArray(data)?data:(data?.data||data?.satellites||[]);
      const chosen=list.filter(s=>s && (s.OBJECT_NAME||s.NAME) && (s.NORAD_CAT_ID!=null)).slice(0,200);
      sats.push(...chosen);
      chosen.forEach(addSatellite);
      const count=document.getElementById('v-sat'); if(count)count.textContent=chosen.length+' REAL';
      const root=document.getElementById('velve-root'); if(root)root.dataset.realSatellites=String(chosen.length);
    }catch(err){console.warn('[VELVE satellites]',err);loaded=false;const count=document.getElementById('v-sat');if(count)count.textContent='satellite feed offline'}
  }

  function installClick(){
    if(!viewer || viewer.__velveSatClick) return;
    viewer.__velveSatClick=true;
    const C=window.Cesium, handler=viewer.screenSpaceEventHandler;
    handler.setInputAction(m=>{
      const picked=viewer.scene.pick(m.position);
      const e=picked?.id;
      if(e?.__velveRealSat) showSatellite(e.__velveSat);
    },C.ScreenSpaceEventType.LEFT_CLICK);
  }

  function tick(){
    if(!viewer || !document.getElementById('velve-root')?.classList.contains('velve-on')) return;
    entities.forEach(e=>updateEntity(e,e.__velveSat));
    viewer.scene.requestRender();
  }

  function init(){
    if(!viewer)return;
    addPanel(); removeSatelliteApiKeyOption(); voiceFix(); installClick();
    if(!loaded) loadRealSatellites();
    if(!window.__VELVE_SAT_TIMER) window.__VELVE_SAT_TIMER=setInterval(tick,3000);
  }

  function watch(){
    patchViewer();
    if(viewer && document.getElementById('velve-root')) init();
    removeSatelliteApiKeyOption(); voiceFix();
    setTimeout(watch,1000);
  }
  window.VELVE_SATELLITE_UPGRADE_VERSION=VERSION;
  watch();
})();
