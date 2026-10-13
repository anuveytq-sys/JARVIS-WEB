/* VELVE // isolated God’s Eye environment
   Adds a separate overlay; the original JARVIS HUD is not rewritten.
   Public/no-key sources: Open-Meteo, USGS, CelesTrak, OpenSky (where available).
   Optional user OpenRouter key enables natural-language tool calling/navigation.
*/
(() => {
  'use strict';
  const VERSION='velve-20261013a';
  const OR_KEY='jarvisOpenRouterKey';
  const OR_MODEL='jarvisOpenRouterModel';
  const DEFAULT_OR_MODEL='openrouter/free';
  let root,viewer,aircraftDS,satelliteDS,quakeDS;
  let selected={name:'Earth',lat:20,lon:0};
  let satelliteRecs=[];
  let refreshTimer;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getORKey=()=>{try{return localStorage.getItem(OR_KEY)||''}catch(_){return''}};
  const getORModel=()=>{try{return localStorage.getItem(OR_MODEL)||DEFAULT_OR_MODEL}catch(_){return DEFAULT_OR_MODEL}};
  function buildUI(){
    if($('#velve-root'))return;
    root=document.createElement('div');root.id='velve-root';root.innerHTML=`
      <div id="velve-globe"></div><div class="velve-vignette"></div>
      <div class="velve-top"><div class="velve-title">VELVE<small>GOD'S EYE // EARTH OBSERVATION</small></div>
        <div class="velve-right"><button class="velve-settings" id="velve-settings">⚙</button><button class="velve-close" id="velve-close">EXIT VELVE</button></div></div>
      <section class="velve-panel velve-data"><h3>EARTH STATUS // LIVE</h3>
        <div class="velve-row"><span>UTC</span><b id="v-utc">—</b></div><div class="velve-row"><span>AIRCRAFT</span><b id="v-air">—</b></div>
        <div class="velve-row"><span>SATELLITES</span><b id="v-sat">—</b></div><div class="velve-row"><span>EARTHQUAKES 24H</span><b id="v-quake">—</b></div>
        <div class="velve-row"><span>FOCUS</span><b id="v-focus">GLOBAL</b></div><div class="velve-row"><span>WEATHER</span><b id="v-weather">—</b></div>
        <div class="velve-legend">● aircraft &nbsp; ● satellites &nbsp; ● earthquakes<br>Public sources refresh automatically where permitted.</div></section>
      <div class="velve-panel velve-status" id="velve-status">SYSTEM: <b>INITIALIZING</b><br><br>Data timestamps are shown in UTC.</div>
      <div class="velve-help" id="velve-help">DRAG TO ROTATE · SCROLL/PINCH TO ZOOM<br>TRY: “TAKE ME TO TOKYO”</div>
      <div class="velve-panel velve-settings-card" id="velve-settings-card"><h3>VELVE SETTINGS</h3>
        <p>Optional user key. Never place a shared OpenRouter key in the public repository. The key below stays in this browser's local storage.</p>
        <input id="velve-or-key" type="password" placeholder="OpenRouter API key (optional)" autocomplete="off"><input id="velve-or-model" placeholder="Model, e.g. openrouter/free">
        <button id="velve-save">SAVE LOCALLY</button><button id="velve-clear">CLEAR KEY</button></div>
      <div class="velve-panel velve-command"><input id="velve-input" placeholder="Ask VELVE or say a navigation command…"><button id="velve-voice">🎙</button><button id="velve-send">SEND</button></div>`;
    document.body.appendChild(root);
    $('#velve-close').onclick=exit;
    $('#velve-settings').onclick=()=>$('#velve-settings-card').classList.toggle('open');
    $('#velve-or-key').value=getORKey();$('#velve-or-model').value=getORModel();
    $('#velve-save').onclick=()=>{try{localStorage.setItem(OR_KEY,$('#velve-or-key').value.trim());localStorage.setItem(OR_MODEL,$('#velve-or-model').value.trim()||DEFAULT_OR_MODEL)}catch(_){};setStatus('SETTINGS SAVED LOCALLY')};
    $('#velve-clear').onclick=()=>{try{localStorage.removeItem(OR_KEY)}catch(_){};$('#velve-or-key').value='';setStatus('OPENROUTER KEY CLEARED')};
    $('#velve-send').onclick=()=>handleInput($('#velve-input').value);
    $('#velve-input').addEventListener('keydown',e=>{if(e.key==='Enter')handleInput(e.target.value)});
    $('#velve-voice').onclick=startVoice;
  }
  function setStatus(t){if($('#velve-status'))$('#velve-status').innerHTML=`SYSTEM: <b>${esc(t)}</b><br><br>Data timestamps are shown in UTC.`}
  function say(t){try{if(typeof window.speak==='function')window.speak(t);else speechSynthesis.speak(new SpeechSynthesisUtterance(t))}catch(_){} }
  function loadCesium(){
    return new Promise((resolve,reject)=>{
      if(window.Cesium)return resolve();
      const css=document.createElement('link');css.rel='stylesheet';css.href='https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/Widgets/widgets.css';document.head.appendChild(css);
      const s=document.createElement('script');s.src='https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/Cesium.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }
  function initViewer(){
    viewer=new Cesium.Viewer('velve-globe',{animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,baseLayerPicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:true,terrainProvider:new Cesium.EllipsoidTerrainProvider(),baseLayer:new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',subdomains:['a','b','c','d'],credit:'Map tiles by CARTO; data by OpenStreetMap contributors'}))});
    viewer.scene.globe.enableLighting=true;viewer.scene.globe.baseColor=Cesium.Color.fromCssColorString('#170308');viewer.scene.backgroundColor=Cesium.Color.BLACK;
    viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(0,20,22000000)});
    aircraftDS=new Cesium.CustomDataSource('aircraft');satelliteDS=new Cesium.CustomDataSource('satellites');quakeDS=new Cesium.CustomDataSource('earthquakes');
    viewer.dataSources.add(aircraftDS);viewer.dataSources.add(satelliteDS);viewer.dataSources.add(quakeDS);
  }
  async function refreshWeather(){
    try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=UTC`;const d=await fetch(u).then(r=>r.json());$('#v-weather').textContent=`${Math.round(d.current.temperature_2m)}°C · ${Math.round(d.current.wind_speed_10m)}km/h`;return d}catch(_){$('#v-weather').textContent='unavailable'}}
  async function refreshQuakes(){
    try{const d=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'}).then(r=>r.json());quakeDS.entities.removeAll();(d.features||[]).slice(0,250).forEach(f=>{const [lon,lat,depth]=f.geometry.coordinates,p=f.properties||{},mag=Number(p.mag||0);quakeDS.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(1000,Math.min(120000,depth*1000))),point:{pixelSize:Math.max(4,Math.min(12,mag*2)),color:Cesium.Color.RED.withAlpha(.75),outlineColor:Cesium.Color.WHITE,outlineWidth:1},description:`${esc(p.place||'Earthquake')} · M${mag.toFixed(1)}`});});$('#v-quake').textContent=d.metadata?.count??'—'}catch(_){$('#v-quake').textContent='offline'}}
  async function refreshAircraft(){
    try{const d=await fetch('https://opensky-network.org/api/states/all',{cache:'no-store'}).then(r=>r.json());aircraftDS.entities.removeAll();const states=(d.states||[]).filter(x=>Number.isFinite(x[5])&&Number.isFinite(x[6])).slice(0,700);states.forEach(x=>{const lon=x[5],lat=x[6],alt=Math.max(500,Number(x[7]||x[13]||1000));aircraftDS.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,alt),point:{pixelSize:5,color:Cesium.Color.fromCssColorString('#ffb000'),outlineColor:Cesium.Color.WHITE,outlineWidth:1},properties:{callsign:x[1]||'unknown'},description:`Aircraft ${esc(x[1]||'unknown')}<br>Altitude: ${Math.round(alt)} m`})});$('#v-air').textContent=states.length;return states.length}catch(_){$('#v-air').textContent='offline';return 0}}
  function parseTLE(text){const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];for(let i=0;i<lines.length-2;i++){if(!lines[i].startsWith('1 ')&&lines[i+1]?.startsWith('1 ')&&lines[i+2]?.startsWith('2 ')){out.push({name:lines[i].replace(/^0 /,''),l1:lines[i+1],l2:lines[i+2]});i+=2}}return out}
  async function refreshSatellites(){
    try{if(!window.satellite)return;const urls=['https://celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=TLE','https://celestrak.org/NORAD/elements/gp.php?GROUP=GPS-OPS&FORMAT=TLE'];const packs=await Promise.all(urls.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.text())));satelliteRecs=packs.flatMap(parseTLE).slice(0,180);satelliteDS.entities.removeAll();updateSatellites();$('#v-sat').textContent=satelliteRecs.length}catch(_){$('#v-sat').textContent='offline'}}
  function updateSatellites(){if(!window.satellite)return;const now=new Date();satelliteRecs.forEach((s,i)=>{try{const rec=satellite.twoline2satrec(s.l1,s.l2),pv=satellite.propagate(rec,now);if(!pv?.position)return;const gd=satellite.eciToGeodetic(pv.position,satellite.gstime(now));const lon=satellite.degreesLong(gd.longitude),lat=satellite.degreesLat(gd.latitude),h=Math.max(80000,gd.height*1000);let e=satelliteDS.entities.getById('sat-'+i);if(!e)e=satelliteDS.entities.add({id:'sat-'+i,name:s.name,point:{pixelSize:5,color:i%3===0?Cesium.Color.CYAN:i%3===1?Cesium.Color.LIME:Cesium.Color.MAGENTA,outlineColor:Cesium.Color.WHITE,outlineWidth:1},description:esc(s.name)});e.position=Cesium.Cartesian3.fromDegrees(lon,lat,h)}catch(_){}})}
  function tick(){if(!root||!root.classList.contains('velve-on'))return;$('#v-utc').textContent=new Date().toISOString().slice(11,19)+'Z';updateSatellites();requestAnimationFrame(tick)}
  async function geocode(q){const u='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=1&language=en&format=json';const d=await fetch(u).then(r=>r.json());return d.results?.[0]||null}
  async function flyTo(name){const r=await geocode(name);if(!r){say(`I could not locate ${name}.`);return false}selected={name:r.name,lat:r.latitude,lon:r.longitude};$('#v-focus').textContent=r.name;viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(r.longitude,r.latitude,Math.max(900000,Math.min(6000000,(r.population||1000000)>5000000?1300000:2200000))),duration:2.2});await refreshWeather();setStatus('FOCUS: '+r.name.toUpperCase());say(`Moving to ${r.name}.`);return true}
  function exit(){if(refreshTimer)clearInterval(refreshTimer);root.classList.remove('velve-on');document.body.style.overflow='hidden';say('VELVE environment closed.');}
  async function open(){buildUI();root.classList.add('velve-on');setStatus('STARTING VELVE');await loadCesium();if(!viewer)initViewer();if(!window.satellite){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/dist/satellite.min.js';document.head.appendChild(s);await new Promise(r=>{s.onload=r;s.onerror=r})}$('#velve-help').classList.add('hidden');await Promise.allSettled([refreshWeather(),refreshQuakes(),refreshAircraft(),refreshSatellites()]);if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{refreshQuakes();refreshAircraft();refreshWeather()},60000);tick();setStatus('LIVE // PUBLIC SOURCES ACTIVE');}
  function localIntent(text){const t=text.toLowerCase().replace(/[!?.,]/g,' ');const m=t.match(/(?:go|take me|move|fly|navigate|show|zoom)(?:\s+me)?(?:\s+to|\s+into|\s+at|\s+around)?\s+(.+)/);if(m&&m[1]&&!/^(back|home|global|out)$/.test(m[1].trim()))return m[1].trim();if(/global view|world view|show earth|zoom out|go back/.test(t)){viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(0,20,22000000)});selected={name:'Earth',lat:20,lon:0};$('#v-focus').textContent='GLOBAL';return null}return undefined}
  async function aiCommand(text){const key=getORKey();if(!key)return false;try{const body={model:getORModel(),messages:[{role:'system',content:'You are VELVE, a God’s Eye Earth navigation assistant. Use the navigate_to_location tool when the user asks to go to, show, zoom to, or focus on a real place. Do not claim live data unless returned by a tool. Keep responses concise.'},{role:'user',content:text}],tools:[{type:'function',function:{name:'navigate_to_location',description:'Move the VELVE globe to a real geographic place.',parameters:{type:'object',properties:{location:{type:'string',description:'City, country, landmark, region, or country name'}},required:['location']}}}],tool_choice:'auto'};const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)});if(!r.ok)return false;const d=await r.json(),msg=d.choices?.[0]?.message;if(msg?.tool_calls?.length){for(const c of msg.tool_calls){if(c.function?.name==='navigate_to_location'){const a=JSON.parse(c.function.arguments||'{}');await flyTo(a.location)}}}else if(msg?.content)say(msg.content);return true}catch(_){return false}}
  async function handleInput(text){text=String(text||'').trim();if(!text)return;$('#velve-input').value='';setStatus('PROCESSING');const intent=localIntent(text);if(intent!==undefined){if(intent)await flyTo(intent);return}if(!(await aiCommand(text))){say('VELVE can navigate by place name without AI. Add your own OpenRouter key in settings for natural-language navigation.')}}
  function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){say('Voice input is not supported by this browser.');return}const r=new SR();r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>handleInput(e.results[0][0].transcript);r.onerror=()=>setStatus('VOICE INPUT UNAVAILABLE');r.start();setStatus('LISTENING')}
  async function interceptSendCommand(){if(typeof window.sendCommand!=='function')return;const original=window.sendCommand;if(original.__velveWrapped)return;const wrapped=async function(command){const t=String(command||'').trim();if(/(?:hello\s+)?jarvis[,:]?\s*(?:start|activate|open|enter)\s+(?:the\s+)?velve(?:\s+environment)?/i.test(t)||/^velve$/i.test(t)){await open();say('VELVE environment online.');return}if(root?.classList.contains('velve-on')&&/^(?:exit|close|stop)\s+velve/i.test(t)){exit();return}return original.apply(this,arguments)};wrapped.__velveWrapped=true;window.sendCommand=wrapped}
  buildUI();interceptSendCommand();setTimeout(interceptSendCommand,1000);window.addEventListener('load',interceptSendCommand);window.VELVE={open,exit,flyTo,version:VERSION};
})();