/* VELVE satellite interaction upgrade: reliable mobile tap picking, 200-catalog feed with group fallbacks, details panel, no entity tracking. */
(() => {
  'use strict';
  const VERSION = 'velve-sat-interaction-20261015g';
  let viewer = null, patched = false, loaded = false, loading = false, handler = null, lastPickAt = 0, clickInstalled = false;
  const entities = new Map(), catalog = new Map();
  const css = `
#velve-satellite-info{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));width:min(340px,calc(100vw - 28px));max-height:48vh;overflow:auto;z-index:2147483647;pointer-events:auto;display:none;visibility:visible;background:rgba(18,3,7,.97);border:1px solid rgba(255,16,42,.85);border-radius:12px;box-shadow:0 0 28px rgba(255,16,42,.28);padding:14px;color:#ffe9ec;font-family:Arial,sans-serif;backdrop-filter:blur(10px);box-sizing:border-box}
#velve-satellite-info.open{display:block!important}
#velve-satellite-info .vsi-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
#velve-satellite-info h3{font-size:12px;letter-spacing:1.5px;margin:0;color:#ff536b}
#velve-satellite-info .vsi-x{border:1px solid rgba(255,83,107,.55);border-radius:8px;background:#310912;color:#ffe5e9;font-size:25px;line-height:1;cursor:pointer;padding:3px 10px;min-width:42px;min-height:40px;touch-action:manipulation}
#velve-satellite-info .vsi-name{font-size:17px;font-weight:800;margin:0 0 8px;color:#fff;overflow-wrap:anywhere}
#velve-satellite-info .vsi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;font-size:11px}
#velve-satellite-info .vsi-grid span{display:block;color:#c58b94;font-size:9px;letter-spacing:1px;margin-bottom:2px}
#velve-satellite-info .vsi-grid b{font-size:11px;color:#fff0f2;overflow-wrap:anywhere}
#velve-satellite-info .vsi-source{margin-top:10px;color:#d5a0a7;font-size:9px;line-height:1.4}
@media(max-width:600px){#velve-satellite-info{right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));width:calc(100vw - 16px);max-height:42vh;padding:12px}#velve-satellite-info .vsi-grid{gap:6px}}
`;
  if (!document.getElementById('velve-satellite-upgrade-style')) {
    const style=document.createElement('style'); style.id='velve-satellite-upgrade-style'; style.textContent=css; document.head.appendChild(style);
  }
  function patchViewer(){
    if(patched||!window.Cesium||!window.Cesium.Viewer)return;
    const C=window.Cesium, Original=C.Viewer;
    if(Original.__velveSatWrapped){patched=true;return;}
    function WrappedViewer(...args){const v=new Original(...args);if(args[0]==='velve-globe'){viewer=v;window.__VELVE_VIEWER=v;setTimeout(init,0);}return v;}
    WrappedViewer.prototype=Original.prototype; WrappedViewer.__velveSatWrapped=true; C.Viewer=WrappedViewer; patched=true;
  }
  function addPanel(){
    let panel=document.getElementById('velve-satellite-info');
    if(panel)return panel;
    panel=document.createElement('section'); panel.id='velve-satellite-info';
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Satellite information');
    panel.innerHTML='<div class="vsi-head"><h3>SATELLITE // INFORMATION</h3><button type="button" class="vsi-x" aria-label="Close satellite information">×</button></div><div class="vsi-name" id="vsi-name">Select a satellite</div><div class="vsi-grid"><div><span>NORAD ID</span><b id="vsi-norad">—</b></div><div><span>COUNTRY / OPERATOR</span><b id="vsi-country">—</b></div><div><span>ORBIT</span><b id="vsi-orbit">—</b></div><div><span>PERIOD</span><b id="vsi-period">—</b></div><div><span>ALTITUDE</span><b id="vsi-alt">—</b></div><div><span>INCLINATION</span><b id="vsi-inc">—</b></div></div><div class="vsi-source" id="vsi-source">Catalog metadata where available. Orbital markers are a visualization, not certified live tracking.</div>';
    document.body.appendChild(panel);
    const close=panel.querySelector('.vsi-x');
    const hide=ev=>{ev.preventDefault();ev.stopPropagation();panel.classList.remove('open');panel.style.setProperty('display','none','important');};
    close.addEventListener('click',hide); close.addEventListener('pointerup',hide);
    return panel;
  }
  function text(id,value){const e=document.getElementById(id);if(e)e.textContent=String(value??'—');}
  function showSatellite(s, fallbackName, fallbackId){
    const panel=addPanel();
    const name=s?.OBJECT_NAME||s?.NAME||fallbackName||'Satellite';
    const meanMotion=Number(s?.MEAN_MOTION||0), period=Number(s?.PERIOD)||(meanMotion>0?1440/meanMotion:0);
    const ecc=Math.max(0,Math.min(.92,Number(s?.ECCENTRICITY)||0));
    const a=meanMotion>0?Math.cbrt(398600.4418/Math.pow(meanMotion*2*Math.PI/86400,2)):0;
    const altitude=a?Math.max(0,a*(1-ecc)-6378.137):0;
    text('vsi-name',name);
    text('vsi-norad',s?.NORAD_CAT_ID??s?.NORAD_ID??fallbackId??'Catalog marker');
    text('vsi-country',s?.COUNTRY_CODE||s?.OWNER||s?.ORIGINATOR||s?.LAUNCH_SITE||'Not provided');
    text('vsi-orbit',altitude>30000?'GEO / HIGH':altitude>2000?'MEO':altitude?'LEO':'Orbit data unavailable');
    text('vsi-period',period>0?period.toFixed(1)+' min':'Not provided');
    text('vsi-alt',altitude?Math.round(altitude)+' km':'Not provided');
    text('vsi-inc',Number.isFinite(Number(s?.INCLINATION))?Number(s.INCLINATION).toFixed(2)+'°':'Not provided');
    text('vsi-source',s?'Catalog metadata where available. Marker movement is a visual orbital estimate, not certified live tracking.':'This is a satellite marker from VELVE’s existing orbital layer; detailed catalog metadata was not available for this marker.');
    panel.classList.add('open'); panel.style.setProperty('display','block','important'); panel.style.setProperty('visibility','visible','important'); panel.style.setProperty('pointer-events','auto','important');
    return panel;
  }
  function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
  function orbitalPosition(s,now){
    const mu=398600.4418,earth=6378.137,inc=n(s.INCLINATION)*Math.PI/180;
    const raan=n(s.RA_OF_ASC_NODE??s.RIGHT_ASCENSION_OF_ASCENDING_NODE??s.RAAN)*Math.PI/180;
    const arg=n(s.ARG_OF_PERICENTER??s.ARG_OF_PERIGEE)*Math.PI/180,ecc=Math.min(.92,Math.max(0,n(s.ECCENTRICITY)));
    const mm=n(s.MEAN_MOTION,15.2)*2*Math.PI/86400,a=Math.cbrt(mu/(mm*mm));
    const epoch=Date.parse(s.EPOCH),elapsed=(now-(Number.isFinite(epoch)?epoch:now))/1000;
    let M=(n(s.MEAN_ANOMALY)*Math.PI/180+mm*elapsed)%(2*Math.PI);if(M<0)M+=2*Math.PI;
    let E=M;for(let i=0;i<8;i++)E-=(E-ecc*Math.sin(E)-M)/(1-ecc*Math.cos(E));
    const xo=a*(Math.cos(E)-ecc),yo=a*Math.sqrt(1-ecc*ecc)*Math.sin(E),cu=Math.cos(arg),su=Math.sin(arg),cr=Math.cos(raan),sr=Math.sin(raan),ci=Math.cos(inc),si=Math.sin(inc);
    const x0=xo*cu-yo*su,y0=xo*su+yo*cu;
    return{x:cr*x0-sr*y0*ci,y:sr*x0+cr*y0*ci,z:y0*si,altitude:Math.max(0,a*(1-ecc)-earth),period:1440/n(s.MEAN_MOTION,15.2)};
  }
  function addSatellite(s,i){
    if(!viewer||!window.Cesium)return;
    const C=window.Cesium,id='velve-real-sat-'+i,name=String(s.OBJECT_NAME||s.NAME||'Satellite');
    const e=viewer.entities.add({id,name,position:C.Cartesian3.ZERO,point:{pixelSize:window.innerWidth<700?17:12,color:i%3===0?C.Color.CYAN:i%3===1?C.Color.LIME:C.Color.YELLOW,outlineColor:C.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY}});
    e.__velveSat=s;e.__velveRealSat=true;catalog.set(id,s);entities.set(id,e);updateEntity(e,s);
  }
  function updateEntity(e,s){
    const p=orbitalPosition(s,Date.now()),C=window.Cesium,theta=7.2921159e-5*(Date.now()/1000);
    const x=p.x*Math.cos(theta)+p.y*Math.sin(theta),y=-p.x*Math.sin(theta)+p.y*Math.cos(theta);
    e.position=C.Cartesian3.fromElements(x*1000,y*1000,p.z*1000);
  }
  function removeSatelliteApiKeyOption(){
    const input=document.getElementById('velve-maptiler-key');
    if(input){input.value='';input.style.display='none';const label=input.previousElementSibling;if(label&&label.tagName==='LABEL')label.style.display='none';}
  }
  async function getJsonGroup(group){
    const urls=[
      'https://celestrak.org/NORAD/elements/gp.php?GROUP='+encodeURIComponent(group)+'&FORMAT=json',
      'https://celestrak.com/NORAD/elements/gp.php?GROUP='+encodeURIComponent(group)+'&FORMAT=json'
    ];
    for(const url of urls){try{const res=await fetch(url,{cache:'no-store'});if(res.ok){const data=await res.json();if(Array.isArray(data)&&data.length)return data;}}catch(_){}}
    return [];
  }
  async function loadRealSatellites(){
    if(loaded||loading||!viewer||!window.Cesium)return;loading=true;removeSatelliteApiKeyOption();
    try{
      let list=await getJsonGroup('active');
      if(!Array.isArray(list)||list.length<30){
        const groups=await Promise.all(['STARLINK','ONEWEB','GPS-OPS','GALILEO','GLONASS','STATIONS','WEATHER','NOAA'].map(getJsonGroup));
        list=[...(Array.isArray(list)?list:[]),...groups.flat()];
      }
      const seen=new Set(),chosen=[];
      for(const s of list){if(!s)continue;const id=s.NORAD_CAT_ID??s.NORAD_ID,name=s.OBJECT_NAME||s.NAME;if(id==null||!name||seen.has(String(id)))continue;seen.add(String(id));chosen.push(s);if(chosen.length>=200)break;}
      if(!chosen.length)throw new Error('Satellite catalog feeds unavailable');
      // Remove any previous copy from a retry before adding refreshed catalog entities.
      for(const [id,e] of entities){try{viewer.entities.remove(e)}catch(_){}entities.delete(id);catalog.delete(id);}
      chosen.forEach(addSatellite);loaded=true;
      const count=document.getElementById('v-sat');if(count)count.textContent=chosen.length+' CATALOG';
      const root=document.getElementById('velve-root');if(root){root.dataset.realSatellites=String(chosen.length);root.dataset.satelliteFeed='online';}
      const status=document.querySelector('#velve-status b');if(status)status.textContent=chosen.length+' SATELLITES LOADED';
    }catch(err){
      console.warn('[VELVE satellite catalog]',err);loaded=false;
      const count=document.getElementById('v-sat');if(count)count.textContent='catalog unavailable';
      const root=document.getElementById('velve-root');if(root)root.dataset.satelliteFeed='offline';
    }finally{loading=false;}
  }
  function entityFromPick(p){
    let e=p?.id||p?.primitive?.id;
    if(typeof e==='string')e=viewer?.entities?.getById(e);
    if(e&&typeof e==='object'&&e.id&&typeof e.id==='object'&&!e.position)e=e.id;
    return e;
  }
  function isSatelliteEntity(e){
    const id=String(e?.id||'');
    return !!e&&(e.__velveRealSat===true||id.startsWith('velve-real-sat-')||id.startsWith('sat-'));
  }
  function getVisibleSatelliteEntities(){
    const all=new Map();
    for(const e of entities.values())all.set(String(e.id),e);
    try{for(const e of viewer.entities.values||[])if(isSatelliteEntity(e))all.set(String(e.id),e);}catch(_){}
    try{const sources=viewer.dataSources;for(let i=0;i<sources.length;i++){const ds=sources.get(i);for(const e of (ds?.entities?.values||[]))if(isSatelliteEntity(e))all.set(String(e.id),e);}}catch(_){}
    return [...all.values()];
  }
  function canvasPosition(clientX,clientY){
    const canvas=viewer.scene.canvas,rect=canvas.getBoundingClientRect();
    const x=clientX-rect.left,y=clientY-rect.top;
    const sx=canvas.clientWidth?canvas.width/canvas.clientWidth:1,sy=canvas.clientHeight?canvas.height/canvas.clientHeight:1;
    return {css:new window.Cesium.Cartesian2(x,y),buffer:new window.Cesium.Cartesian2(x*sx,y*sy)};
  }
  function nearestSatellite(position){
    const C=window.Cesium,scene=viewer.scene,canvas=scene.canvas;
    const sx=canvas.clientWidth?canvas.width/canvas.clientWidth:1,sy=canvas.clientHeight?canvas.height/canvas.clientHeight:1;
    const positions=[position];if(sx!==1||sy!==1)positions.push(new C.Cartesian2(position.x*sx,position.y*sy));
    for(const pos of positions){
      try{const e=entityFromPick(scene.pick(pos));if(isSatelliteEntity(e))return e;}catch(_){}
      try{for(const p of (scene.drillPick(pos,80)||[])){const e=entityFromPick(p);if(isSatelliteEntity(e))return e;}}catch(_){}
    }
    const radius=window.innerWidth<700?90:42;let best=null,bestDistance=Infinity;
    for(const e of getVisibleSatelliteEntities()){
      try{const world=e.position?.getValue?e.position.getValue(C.JulianDate.now()):e.position;if(!world)continue;
        const screen=scene.cartesianToCanvasCoordinates(world);if(!screen)continue;
        const d=Math.hypot(screen.x-position.x,screen.y-position.y);
        if(d<bestDistance&&d<=radius){best=e;bestDistance=d;}
      }catch(_){}
    }
    return best;
  }
  function pickSatellite(position){
    if(!viewer||!position||!window.Cesium)return false;
    const now=Date.now();if(now-lastPickAt<160)return false;
    const entity=nearestSatellite(position);if(!entity)return false;lastPickAt=now;
    const C=window.Cesium;
    try{viewer.trackedEntity=undefined;viewer.selectedEntity=undefined;viewer.camera.cancelFlight();}catch(_){}
    const id=String(entity.id||''),data=entity.__velveSat||catalog.get(id)||null;
    showSatellite(data,entity.name||data?.OBJECT_NAME||data?.NAME||'Satellite',data?.NORAD_CAT_ID??data?.NORAD_ID??id.replace(/^sat-/,''));
    try{
      const world=entity.position?.getValue?entity.position.getValue(C.JulianDate.now()):entity.position;
      if(world){const radial=C.Cartesian3.normalize(C.Cartesian3.clone(world),new C.Cartesian3());
        const offset=window.innerWidth<700?2200000:1500000;
        const destination=C.Cartesian3.add(world,C.Cartesian3.multiplyByScalar(radial,offset,new C.Cartesian3()),new C.Cartesian3());
        viewer.camera.flyTo({destination,duration:0.55,complete:()=>{try{viewer.trackedEntity=undefined;viewer.selectedEntity=undefined;}catch(_){}}});}
    }catch(_){}
    setTimeout(()=>{try{viewer.trackedEntity=undefined;viewer.selectedEntity=undefined;}catch(_){}},0);
    return true;
  }
  function installClick(){
    if(!viewer||!window.Cesium||clickInstalled)return;
    const C=window.Cesium,canvas=viewer.scene.canvas;
    try{viewer.trackedEntity=undefined;viewer.selectedEntity=undefined;viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);}catch(_){}
    // Preserve Cesium's native LEFT_CLICK handler and add independent touch/mouse picking.
    let down=null,lastTouch=0;
    const onDown=ev=>{if(ev.target!==canvas)return;down={x:ev.clientX,y:ev.clientY,id:ev.pointerId,type:ev.pointerType};};
    const onUp=ev=>{
      if(!down||ev.pointerId!==down.id)return;
      const moved=Math.hypot(ev.clientX-down.x,ev.clientY-down.y);down=null;
      if(moved>(ev.pointerType==='mouse'?12:34))return;
      if(ev.pointerType!=='mouse'){const t=Date.now();if(t-lastTouch<260)return;lastTouch=t;}
      const p=canvasPosition(ev.clientX,ev.clientY);
      if(!pickSatellite(p.css))pickSatellite(p.buffer);
    };
    canvas.addEventListener('pointerdown',onDown,{capture:true,passive:true});
    canvas.addEventListener('pointerup',onUp,{capture:true,passive:true});
    canvas.addEventListener('pointercancel',()=>{down=null;},{capture:true,passive:true});
    canvas.addEventListener('touchend',ev=>{
      if(!ev.changedTouches?.length)return;const t=ev.changedTouches[0],p=canvasPosition(t.clientX,t.clientY);
      if(!pickSatellite(p.css))pickSatellite(p.buffer);
    },{capture:true,passive:true});
    viewer.__velveSatPointerHandler=onUp;clickInstalled=true;
  }
  function voiceFix(){
    const b=document.getElementById('velve-voice');if(!b||b.dataset.vsatVoice==='1')return;b.dataset.vsatVoice='1';
    b.onclick=ev=>{ev.preventDefault();ev.stopImmediatePropagation();const R=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!R){const input=document.getElementById('velve-input');if(input){input.placeholder='Use your keyboard microphone, then press SEND';input.focus();}const status=document.querySelector('#velve-status b');if(status)status.textContent='USE KEYBOARD DICTATION';return;}
      const r=new R();r.lang=navigator.language||'en-US';r.interimResults=false;r.continuous=false;r.maxAlternatives=1;b.classList.add('listening');b.textContent='●';
      r.onresult=e=>{const heard=e.results?.[0]?.[0]?.transcript?.trim()||'';const input=document.getElementById('velve-input');if(input)input.value=heard;if(heard)document.getElementById('velve-send')?.click();};
      r.onerror=()=>{};r.onend=()=>{b.classList.remove('listening');b.textContent='🎙';};try{r.start();}catch(_){b.classList.remove('listening');b.textContent='🎙';}
    };
  }
  function init(){
    viewer=viewer||window.__VELVE_VIEWER||null;if(!viewer||!window.Cesium)return;
    addPanel();removeSatelliteApiKeyOption();voiceFix();installClick();if(!loaded)loadRealSatellites();
    if(!window.__VELVE_SAT_TIMER)window.__VELVE_SAT_TIMER=setInterval(()=>{if(!viewer||!document.getElementById('velve-root')?.classList.contains('velve-on'))return;entities.forEach((e)=>{const s=catalog.get(String(e.id));if(s)updateEntity(e,s);});try{viewer.scene.requestRender();}catch(_){}},1000);
  }
  function watch(){patchViewer();if(!viewer&&window.__VELVE_VIEWER)viewer=window.__VELVE_VIEWER;if(viewer&&document.getElementById('velve-root'))init();removeSatelliteApiKeyOption();voiceFix();setTimeout(watch,1000);}
  window.VELVE_SATELLITE_UPGRADE_VERSION=VERSION;window.VELVE_PICK_SATELLITE=pickSatellite;watch();
})();