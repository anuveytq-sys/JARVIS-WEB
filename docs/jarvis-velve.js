/* VELVE // isolated God's Eye environment
   Stable city navigation + lightweight 3D satellite orbit display.
   Original JARVIS HUD remains untouched.
*/
(() => {
  'use strict';
  const VERSION = 'velve-20261014e';
  const OR_KEY = 'jarvisOpenRouterKey', OR_MODEL = 'jarvisOpenRouterModel';
  const MT_KEY = 'velveMapTilerKey';
  const DEFAULT_OR_MODEL = 'openrouter/free';
  const $ = s => document.querySelector(s);
  const localGet = k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
  const getORKey = () => localGet(OR_KEY);
  const getORModel = () => localGet(OR_MODEL) || DEFAULT_OR_MODEL;

  let root, viewer, aircraftDS, satelliteDS, quakeDS, refreshTimer, satelliteTimer;
  let selected = { name: 'Earth', lat: 20, lon: 0 };
  let satelliteRecs = [];
  let satelliteSats = [];
  let flying = false;

  const CITY_ALIASES = {
    tokyo:{name:'Tokyo',country:'Japan',lat:35.6762,lon:139.6503},'tokyo city':{name:'Tokyo',country:'Japan',lat:35.6762,lon:139.6503},
    delhi:{name:'New Delhi',country:'India',lat:28.6139,lon:77.209},'new delhi':{name:'New Delhi',country:'India',lat:28.6139,lon:77.209},
    mumbai:{name:'Mumbai',country:'India',lat:19.076,lon:72.8777},varanasi:{name:'Varanasi',country:'India',lat:25.3176,lon:82.9739},
    london:{name:'London',country:'United Kingdom',lat:51.5074,lon:-0.1278},paris:{name:'Paris',country:'France',lat:48.8566,lon:2.3522},
    'new york':{name:'New York City',country:'United States',lat:40.7128,lon:-74.006},'new york city':{name:'New York City',country:'United States',lat:40.7128,lon:-74.006},
    singapore:{name:'Singapore',country:'Singapore',lat:1.3521,lon:103.8198},dubai:{name:'Dubai',country:'United Arab Emirates',lat:25.2048,lon:55.2708},
    seoul:{name:'Seoul',country:'South Korea',lat:37.5665,lon:126.978},beijing:{name:'Beijing',country:'China',lat:39.9042,lon:116.4074},
    moscow:{name:'Moscow',country:'Russia',lat:55.7558,lon:37.6173},sydney:{name:'Sydney',country:'Australia',lat:-33.8688,lon:151.2093},
    toronto:{name:'Toronto',country:'Canada',lat:43.6532,lon:-79.3832},'los angeles':{name:'Los Angeles',country:'United States',lat:34.0522,lon:-118.2437},
    chicago:{name:'Chicago',country:'United States',lat:41.8781,lon:-87.6298},'san francisco':{name:'San Francisco',country:'United States',lat:37.7749,lon:-122.4194},
    berlin:{name:'Berlin',country:'Germany',lat:52.52,lon:13.405},rome:{name:'Rome',country:'Italy',lat:41.9028,lon:12.4964},
    madrid:{name:'Madrid',country:'Spain',lat:40.4168,lon:-3.7038},istanbul:{name:'Istanbul',country:'Türkiye',lat:41.0082,lon:28.9784},
    bangkok:{name:'Bangkok',country:'Thailand',lat:13.7563,lon:100.5018},jakarta:{name:'Jakarta',country:'Indonesia',lat:-6.2088,lon:106.8456},
    cairo:{name:'Cairo',country:'Egypt',lat:30.0444,lon:31.2357},'cape town':{name:'Cape Town',country:'South Africa',lat:-33.9249,lon:18.4241},
    'mexico city':{name:'Mexico City',country:'Mexico',lat:19.4326,lon:-99.1332},'sao paulo':{name:'São Paulo',country:'Brazil',lat:-23.5505,lon:-46.6333},
    'buenos aires':{name:'Buenos Aires',country:'Argentina',lat:-34.6037,lon:-58.3816}
  };

  function buildUI(){
    if($('#velve-root')) return;
    root=document.createElement('div'); root.id='velve-root';
    root.innerHTML=`<div id="velve-globe"></div><div class="velve-vignette"></div>
      <div class="velve-top"><div class="velve-title">VELVE<small>GOD'S EYE // EARTH OBSERVATION</small></div><div class="velve-right"><button class="velve-settings" id="velve-settings">⚙</button><button class="velve-close" id="velve-close">EXIT VELVE</button></div></div>
      <section class="velve-panel velve-data" id="velve-data-panel"><div class="velve-panel-head"><h3>EARTH STATUS // LIVE</h3><button class="velve-panel-x" id="velve-data-hide">×</button></div>
      <div class="velve-row"><span>UTC</span><b id="v-utc">—</b></div><div class="velve-row"><span>AIRCRAFT</span><b id="v-air">—</b></div><div class="velve-row"><span>SATELLITES</span><b id="v-sat">—</b></div><div class="velve-row"><span>EARTHQUAKES 24H</span><b id="v-quake">—</b></div><div class="velve-row"><span>FOCUS</span><b id="v-focus">GLOBAL</b></div><div class="velve-row"><span>WEATHER</span><b id="v-weather">—</b></div></section>
      <div class="velve-panel velve-status" id="velve-status">SYSTEM: <b>INITIALIZING</b><br><br>Data timestamps are shown in UTC.<button class="velve-panel-x velve-status-x" id="velve-status-hide">×</button></div>
      <div class="velve-panel-tools" id="velve-panel-tools"><button id="velve-show-data">EARTH DETAILS</button><button id="velve-show-status">SYSTEM STATUS</button><button id="velve-show-command">COMMAND</button><button id="velve-show-settings">SETTINGS</button></div>
      <div class="velve-help" id="velve-help">DRAG TO ROTATE · SCROLL/PINCH TO ZOOM<br>TRY: “TAKE ME TO TOKYO”</div>
      <div class="velve-panel velve-settings-card" id="velve-settings-card"><h3>VELVE SETTINGS</h3><p>Public sources work without keys.</p><input id="velve-or-key" type="password" placeholder="OpenRouter API key (optional)"><input id="velve-or-model" placeholder="Model, e.g. openrouter/free"><button id="velve-save">SAVE LOCALLY</button></div>
      <div class="velve-panel velve-command" id="velve-command-panel"><button class="velve-panel-x velve-command-x" id="velve-command-hide">×</button><input id="velve-input" placeholder="Ask VELVE or say a navigation command…"><button id="velve-voice">🎙</button><button id="velve-send">SEND</button></div>`;
    document.body.appendChild(root);
    $('#velve-close').onclick=exit;
    $('#velve-settings').onclick=()=>$('#velve-settings-card').classList.toggle('open');
    $('#velve-save').onclick=()=>{try{localStorage.setItem(OR_KEY,$('#velve-or-key').value.trim());localStorage.setItem(OR_MODEL,$('#velve-or-model').value.trim()||DEFAULT_OR_MODEL)}catch(_){}setStatus('SETTINGS SAVED LOCALLY')};
    $('#velve-or-key').value=getORKey(); $('#velve-or-model').value=getORModel();
    $('#velve-command-hide').onclick=()=>$('#velve-command-panel').classList.add('panel-hidden'); $('#velve-show-command').onclick=()=>$('#velve-command-panel').classList.remove('panel-hidden');
    $('#velve-data-hide').onclick=()=>$('#velve-data-panel').classList.add('panel-hidden'); $('#velve-status-hide').onclick=()=>$('#velve-status').classList.add('panel-hidden');
    $('#velve-show-data').onclick=()=>$('#velve-data-panel').classList.remove('panel-hidden'); $('#velve-show-status').onclick=()=>$('#velve-status').classList.remove('panel-hidden'); $('#velve-show-settings').onclick=()=>$('#velve-settings-card').classList.toggle('open');
    $('#velve-send').onclick=()=>handleInput($('#velve-input').value); $('#velve-input').addEventListener('keydown',e=>{if(e.key==='Enter')handleInput(e.target.value)}); $('#velve-voice').onclick=startVoice;
  }

  function setStatus(t){const b=$('#velve-status b');if(b)b.textContent=String(t)}
  function say(t){try{if(typeof window.speak==='function')window.speak(t);else if('speechSynthesis' in window)speechSynthesis.speak(new SpeechSynthesisUtterance(t))}catch(_){} }
  function loadCesium(){return new Promise((resolve,reject)=>{if(window.Cesium)return resolve();const css=document.createElement('link');css.rel='stylesheet';css.href='https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/Widgets/widgets.css';document.head.appendChild(css);const s=document.createElement('script');s.src='https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/Cesium.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  function initViewer(){
    viewer=new Cesium.Viewer('velve-globe',{animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,baseLayerPicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:true,terrainProvider:new Cesium.EllipsoidTerrainProvider(),baseLayer:new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({url:localGet(MT_KEY)?'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key='+encodeURIComponent(localGet(MT_KEY)):'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',tilingScheme:new Cesium.WebMercatorTilingScheme(),maximumLevel:19,credit:'Public satellite imagery'}))});
    viewer.clock.shouldAnimate=true; viewer.clock.currentTime=Cesium.JulianDate.now(); viewer.scene.globe.enableLighting=true; viewer.scene.globe.showGroundAtmosphere=true; viewer.scene.globe.maximumScreenSpaceError=2; viewer.scene.backgroundColor=Cesium.Color.BLACK;
    viewer.scene.rethrowRenderErrors=false; viewer.scene.renderError.addEventListener(()=>setStatus('RENDER RECOVERED'));
    viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(0,20,22000000)});
    aircraftDS=new Cesium.CustomDataSource('aircraft'); satelliteDS=new Cesium.CustomDataSource('satellites'); quakeDS=new Cesium.CustomDataSource('earthquakes'); viewer.dataSources.add(aircraftDS);viewer.dataSources.add(satelliteDS);viewer.dataSources.add(quakeDS);
  }
  async function refreshWeather(){try{const d=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lon}&current=temperature_2m,wind_speed_10m&timezone=UTC`).then(r=>r.json());$('#v-weather').textContent=`${Math.round(d.current.temperature_2m)}°C · ${Math.round(d.current.wind_speed_10m)}km/h`}catch(_){} }
  async function refreshQuakes(){try{const d=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'}).then(r=>r.json());quakeDS.entities.removeAll();(d.features||[]).slice(0,100).forEach(f=>{const c=f.geometry?.coordinates||[],p=f.properties||{},mag=Number(p.mag||0);if(c.length<3)return;quakeDS.entities.add({position:Cesium.Cartesian3.fromDegrees(Number(c[0]),Number(c[1]),Math.max(1000,Math.min(120000,Number(c[2])*1000))),point:{pixelSize:Math.max(4,Math.min(10,mag*2)),color:Cesium.Color.RED.withAlpha(.75)}})});$('#v-quake').textContent=d.metadata?.count??'—'}catch(_){} }
  function addAircraft(x,source,seen){const lon=Number(x.lon??x[5]),lat=Number(x.lat??x[6]);if(!Number.isFinite(lon)||!Number.isFinite(lat))return false;const key=String(x.hex??x.icao24??x[0]??(source+'-'+lon+'-'+lat));if(seen.has(key))return false;seen.add(key);const alt=Math.max(300,Number(x.alt_baro??x.geo_altitude??x.alt_geom??x[7]??x[13]??1000));aircraftDS.entities.add({id:'air-'+key,position:Cesium.Cartesian3.fromDegrees(lon,lat,alt),point:{pixelSize:8,color:Cesium.Color.ORANGE,outlineColor:Cesium.Color.WHITE,outlineWidth:1,disableDepthTestDistance:Number.POSITIVE_INFINITY}});return true}
  async function refreshAircraft(){try{aircraftDS.entities.removeAll();const d=await fetch('https://api.adsb.lol/v2/all',{cache:'no-store'}).then(r=>r.ok?r.json():null);const seen=new Set();let count=0;(d?.ac||[]).forEach(x=>{if(count<800&&addAircraft(x,'ADSB.lol',seen))count++});$('#v-air').textContent=count||'offline'}catch(_){$('#v-air').textContent='offline'} }
  function parseTLE(text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];for(let i=0;i<lines.length-2;i++){if(lines[i+1]?.startsWith('1 ')&&lines[i+2]?.startsWith('2 ')){out.push({name:lines[i].replace(/^0 /,''),l1:lines[i+1],l2:lines[i+2]});i+=2}}return out}
  async function refreshSatellites(){try{if(!window.satellite)return;const groups=['STARLINK','ONEWEB','GPS-OPS','GALILEO','GLONASS','STATIONS'];const packs=await Promise.all(groups.map(g=>fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=TLE`,{cache:'no-store'}).then(r=>r.ok?r.text():'')));const all=packs.flatMap(parseTLE),seen=new Set();satelliteRecs=[];for(const s of all){const key=s.l1.slice(2,7);if(!seen.has(key)){seen.add(key);satelliteRecs.push(s)}if(satelliteRecs.length>=700)break}satelliteDS.entities.removeAll();satelliteSats=satelliteRecs.map(s=>{try{return {s,rec:window.satellite.twoline2satrec(s.l1,s.l2)}}catch(_){return null}}).filter(Boolean);updateSatellites();$('#v-sat').textContent=satelliteSats.length}catch(_){$('#v-sat').textContent='offline'} }
  function updateSatellites(){
    if(!window.satellite||!satelliteSats.length)return;
    const now=new Date(),gst=window.satellite.gstime(now);
    satelliteSats.forEach((item,i)=>{try{const pv=window.satellite.propagate(item.rec,now),pos=pv?.position;if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))return;const gd=window.satellite.eciToGeodetic(pos,gst);if(!gd)return;const lon=window.satellite.degreesLong(gd.longitude),lat=window.satellite.degreesLat(gd.latitude);const realH=Math.max(0,Number(gd.height)*1000);/* Visual-only orbit exaggeration: keep markers visibly separated from Earth. */const h=Math.max(1800000,realH*1.6);if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(h))return;let e=satelliteDS.entities.getById('sat-'+i);if(!e)e=satelliteDS.entities.add({id:'sat-'+i,name:item.s.name,point:{pixelSize:9,color:i%3===0?Cesium.Color.CYAN:i%3===1?Cesium.Color.HOTPINK:Cesium.Color.LIME,outlineColor:Cesium.Color.BLACK,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY}});e.position=Cesium.Cartesian3.fromDegrees(lon,lat,h)}catch(_){} });
  }
  function startSatelliteLoop(){if(satelliteTimer)clearInterval(satelliteTimer);updateSatellites();satelliteTimer=setInterval(()=>{if(root?.classList.contains('velve-on')){updateSatellites();viewer.scene.requestRender()}},1000)}
  async function geocode(q){const raw=String(q||'').trim(),key=raw.toLowerCase().replace(/\\s+/g,' ');if(CITY_ALIASES[key]){const a=CITY_ALIASES[key];return {name:a.name,country:a.country,latitude:a.lat,longitude:a.lon,feature_code:'PPLC'}}const name=raw.replace(/\\s+city$/i,'');const d=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`).then(r=>{if(!r.ok)throw new Error('Geocoding service unavailable');return r.json()});const rs=d.results||[];if(!rs.length)return null;const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\\s+/g,' ').trim();const exact=rs.filter(r=>norm(r.name)===norm(name));const candidates=exact.length?exact:rs;const city=candidates.find(r=>['PPLC','PPLA','PPLA2','PPLA3','PPLA4'].includes(r.feature_code));const r=city||candidates.sort((a,b)=>(Number(b.population)||0)-(Number(a.population)||0))[0];if(!r||!Number.isFinite(Number(r.latitude))||!Number.isFinite(Number(r.longitude)))return null;return r}
  async function flyTo(name){
    if(flying)return false; flying=true; setStatus('LOCATING '+String(name).toUpperCase());
    try{const r=await geocode(name);if(!r){say(`I could not locate ${name}. Try the city name and country.`);setStatus('LOCATION NOT FOUND');return false}
      const lat=Number(r.latitude??r.lat),lon=Number(r.longitude??r.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){say('I could not verify that city location.');setStatus('INVALID CITY COORDINATES');return false}
      selected={name:r.name||String(name),country:r.country||'',lat,lon};$('#v-focus').textContent=selected.name+(selected.country?', '+selected.country:'');
      // City-level overview: top-down and centered on the verified city coordinates.
      const altitude=450000;const destination=Cesium.Cartesian3.fromDegrees(lon,lat,altitude);
      await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};try{viewer.camera.cancelFlight();viewer.camera.flyTo({destination,orientation:{heading:0,pitch:Cesium.Math.toRadians(-90),roll:0},duration:2.8,maximumHeight:12000000,complete:finish,cancel:finish})}catch(_){try{viewer.camera.setView({destination,orientation:{heading:0,pitch:Cesium.Math.toRadians(-90),roll:0}})}catch(__){}finish()}setTimeout(finish,5000)});
      await refreshWeather();setStatus('FOCUS: '+selected.name.toUpperCase());say(`Moving to ${selected.name}${selected.country?', '+selected.country:''}.`);return true
    }catch(error){console.error('[VELVE] city navigation failed',error);setStatus('CITY SEARCH TEMPORARILY UNAVAILABLE');say('City navigation is temporarily unavailable. Please try again.');return false}
    finally{flying=false}
  }
  function localIntent(text){const t=String(text||'').toLowerCase().replace(/[!?.,]/g,' ').replace(/\s+/g,' ').trim();const m=t.match(/(?:go|take me|move|fly|navigate|show|zoom)(?:\s+me)?(?:\s+to|\s+into|\s+at|\s+around)?\s+(.+)/);if(m&&m[1]&&!/^(back|home|global|out)$/.test(m[1].trim()))return m[1].trim();if(/global view|world view|show earth|zoom out|go back/.test(t)){try{viewer.camera.cancelFlight();viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(0,20,22000000)})}catch(_){}selected={name:'Earth',lat:20,lon:0};$('#v-focus').textContent='GLOBAL';return null}return undefined}
  async function handleInput(text){text=String(text||'').trim();if(!text)return;$('#velve-input').value='';const intent=localIntent(text);if(intent!==undefined){if(intent)await flyTo(intent);return}say('Say take me to a city or place.')}
  function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){say('Voice input is not supported by this browser.');return}const r=new SR();r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>handleInput(e.results[0][0].transcript);r.onerror=()=>setStatus('VOICE INPUT UNAVAILABLE');r.start();setStatus('LISTENING')}
  async function open(){buildUI();root.classList.add('velve-on');document.body.classList.add('velve-active');setStatus('STARTING VELVE');await loadCesium();if(!viewer)initViewer();if(!window.satellite){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/dist/satellite.min.js';document.head.appendChild(s);await new Promise(r=>{s.onload=r;s.onerror=r})}$('#velve-help').classList.add('hidden');await Promise.allSettled([refreshWeather(),refreshQuakes(),refreshAircraft(),refreshSatellites()]);startSatelliteLoop();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(root?.classList.contains('velve-on')){refreshQuakes();refreshAircraft()}},60000);setStatus('LIVE // PUBLIC SOURCES ACTIVE')}
  function exit(){if(refreshTimer)clearInterval(refreshTimer);if(satelliteTimer)clearInterval(satelliteTimer);try{viewer?.camera.cancelFlight()}catch(_){}root.classList.remove('velve-on');document.body.classList.remove('velve-active');say('VELVE environment closed.')}
  function intercept(){if(typeof window.sendCommand!=='function')return;const original=window.sendCommand;if(original.__velveWrapped)return;const wrapped=async function(c){const t=String(c||'').trim();if(/^velve$/i.test(t)||/start\s+(?:the\s+)?velve/i.test(t)){await open();say('VELVE environment online.');return}if(root?.classList.contains('velve-on')&&/^exit\s+velve/i.test(t)){exit();return}return original.apply(this,arguments)};wrapped.__velveWrapped=true;window.sendCommand=wrapped}
  buildUI();intercept();setTimeout(intercept,1000);window.addEventListener('load',intercept);window.VELVE={open,exit,flyTo,version:VERSION};
})();
