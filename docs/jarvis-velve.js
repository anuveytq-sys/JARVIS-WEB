/* VELVE // isolated God's Eye environment
   Stable city navigation + lightweight 3D satellite orbit display.
   Original JARVIS HUD remains untouched.
*/
(() => {
  'use strict';
  const VERSION = 'velve-20261014g';
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
      <div class="velve-panel velve-command" id="velve-command-panel"><button class="velve-panel-x velve-command-x" id="velve-command-hide">×</button><input id="velve-input" placeholder="Ask VELVE or say a navigation command…"><button id="velve-voice">🎙</button><button id="velve-send">SEND</button></div>
      <div id="velve-location-modal" role="dialog" aria-modal="true" aria-labelledby="velve-location-title" style="display:none;position:absolute;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,.68);padding:20px;box-sizing:border-box">
        <div style="width:min(360px,100%);box-sizing:border-box;background:#07131d;border:1px solid #29dfff;border-radius:14px;padding:22px;color:#e9fbff;font-family:Arial,sans-serif;box-shadow:0 0 28px rgba(41,223,255,.24);text-align:center">
          <div style="font-size:12px;letter-spacing:3px;color:#29dfff;margin-bottom:10px">VELVE LOCATION ACCESS</div>
          <h3 id="velve-location-title" style="margin:0 0 10px;font-size:20px">Allow location access?</h3>
          <p style="font-size:14px;line-height:1.5;color:#c6dce5;margin:0 0 20px">VELVE wants to use this browser's device location to move the camera to your current area. Your coordinates are used for this navigation only.</p>
          <div style="display:flex;gap:10px"><button id="velve-location-deny" style="flex:1;padding:11px;border:1px solid #65808b;border-radius:8px;background:#12232d;color:#d9e7ed;font-weight:700">DENY</button><button id="velve-location-allow" style="flex:1;padding:11px;border:0;border-radius:8px;background:#29dfff;color:#001018;font-weight:800">ALLOW</button></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    $('#velve-close').onclick=exit;
    $('#velve-location-deny').onclick=()=>{ $('#velve-location-modal').style.display='none'; setStatus('LOCATION REQUEST CANCELLED'); say('Location access was cancelled.'); };
    $('#velve-location-allow').onclick=async()=>{ $('#velve-location-modal').style.display='none'; await goToMyLocation(); };
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
  function parseTLE(text){const lines=String(text||'').split(/\r?\n  async function handleInput(text){text=String(text||'').trim();if(!text)return;$('#velve-input').value='';const t=text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();if(/\b(my location|my current location|our location|current location|where am i|where i am|my position|my house|my home|what is my location|whats my location|what's my location)\b/.test(t)||/\b(take me|go|navigate|fly|move)\s+(to|me to)\s+(my location|my current location|my house|my home)\b/.test(t)){showLocationPermissionPopup();return}const intent=localIntent(text);if(intent!==undefined){if(intent)await flyTo(intent);return}say('Say take me to a city or place, or ask where you are.')}