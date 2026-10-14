/* VELVE // isolated God's Eye environment
   Stable city navigation + lightweight 3D satellite orbit display.
   Original JARVIS HUD remains untouched.
*/
(() => {
  'use strict';
  const VERSION = 'velve-20261014n';
  const OR_KEY = 'jarvisOpenRouterKey', OR_MODEL = 'jarvisOpenRouterModel';
  const MT_KEY = 'velveMapTilerKey', OW_KEY = 'velveOpenWeatherMapKey';
  const OS_CLIENT_ID_KEY = 'velveOpenSkyClientId', OS_CLIENT_SECRET_KEY = 'velveOpenSkyClientSecret';
  let openSkyToken = '', openSkyTokenExpires = 0;
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
      <div class="velve-panel-tools" id="velve-panel-tools"><button id="velve-show-data">OPEN EARTH INFO</button><button id="velve-show-status">OPEN SYSTEM INFO</button><button id="velve-show-command">COMMAND</button><button id="velve-show-settings">SETTINGS</button></div>
      <div class="velve-help" id="velve-help">DRAG TO ROTATE · SCROLL/PINCH TO ZOOM<br>TRY: “TAKE ME TO TOKYO”</div>
      <div class="velve-panel velve-settings-card" id="velve-settings-card"><h3>VELVE SETTINGS</h3><p>All keys are optional. Public feeds work without keys. OpenRouter enables VELVE AI answers, MapTiler can provide alternate satellite tiles, and OpenWeatherMap can provide weather data. OpenSky provides live aircraft states (not satellite tracking). OpenSky credentials are stored only in this browser, but browser-stored secrets are not fully secure; use only your own credentials and do not share this device/profile.</p><label for="velve-or-key">OpenRouter AI key (optional)</label><input id="velve-or-key" type="password" autocomplete="off" placeholder="OpenRouter API key"><label for="velve-or-model">OpenRouter model</label><input id="velve-or-model" placeholder="Model, e.g. openrouter/free"><label for="velve-maptiler-key">MapTiler satellite tiles key (optional)</label><input id="velve-maptiler-key" type="password" autocomplete="off" placeholder="MapTiler API key — improves imagery options"><label for="velve-openweather-key">OpenWeatherMap key (optional)</label><input id="velve-openweather-key" type="password" autocomplete="off" placeholder="OpenWeatherMap API key — weather provider"><label for="velve-opensky-client-id">OpenSky API client ID (optional)</label><input id="velve-opensky-client-id" type="password" autocomplete="off" placeholder="OpenSky API client ID"><label for="velve-opensky-client-secret">OpenSky API client secret (optional)</label><input id="velve-opensky-client-secret" type="password" autocomplete="off" placeholder="OpenSky API client secret"><button id="velve-save">SAVE LOCALLY</button><button id="velve-clear-keys" type="button">CLEAR OPTIONAL KEYS</button><p id="velve-settings-note" role="status">No key is required for basic globe features.</p></div>
      <div class="velve-panel velve-command" id="velve-command-panel"><button class="velve-panel-x velve-command-x" id="velve-command-hide">×</button><input id="velve-input" placeholder="Ask VELVE or say a navigation command…"><button id="velve-voice">🎙</button><button id="velve-send">SEND</button></div>`;
    document.body.appendChild(root);
    root.insertAdjacentHTML('beforeend', `<div id="velve-location-modal" role="dialog" aria-modal="true" aria-labelledby="velve-location-title" style="display:none;position:absolute;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,.68);padding:20px;box-sizing:border-box"><div style="width:min(360px,100%);box-sizing:border-box;background:#160306;border:1px solid #ff3b3b;border-radius:14px;padding:22px;color:#ffe9e9;font-family:Arial,sans-serif;box-shadow:0 0 28px rgba(255,35,35,.24);text-align:center"><div style="font-size:12px;letter-spacing:3px;color:#ff3b3b;margin-bottom:10px">VELVE LOCATION ACCESS</div><h3 id="velve-location-title" style="margin:0 0 10px;font-size:20px">Allow location access?</h3><p style="font-size:14px;line-height:1.5;color:#e3b5b5;margin:0 0 20px">VELVE first tries your device location. If the browser blocks it, you can still be taken to an approximate area based on your internet connection (not GPS). Network-based location is less accurate and the lookup sends your IP address to the location provider.</p><div style="display:flex;gap:10px"><button id="velve-location-deny" style="flex:1;padding:11px;border:1px solid #65808b;border-radius:8px;background:#2a090d;color:#ffe0e0;font-weight:700">DENY</button><button id="velve-location-allow" style="flex:1;padding:11px;border:0;border-radius:8px;background:#ff3030;color:#210000;font-weight:800">ALLOW</button></div></div></div>`);
    $('#velve-location-deny').onclick=()=>{ $('#velve-location-modal').style.display='none'; setStatus('LOCATION REQUEST CANCELLED'); say('Location access was cancelled.'); };
    $('#velve-location-allow').onclick=async()=>{ $('#velve-location-modal').style.display='none'; await goToMyLocation(); };
    $('#velve-close').onclick=exit;
    $('#velve-settings').onclick=()=>$('#velve-settings-card').classList.toggle('open');
    $('#velve-or-key').value=getORKey(); $('#velve-or-model').value=getORModel(); $('#velve-maptiler-key').value=localGet(MT_KEY); $('#velve-openweather-key').value=localGet(OW_KEY); $('#velve-opensky-client-id').value=localGet(OS_CLIENT_ID_KEY); $('#velve-opensky-client-secret').value=localGet(OS_CLIENT_SECRET_KEY);
    const refreshImagery=()=>{if(!viewer)return;try{viewer.imageryLayers.removeAll();viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({url:localGet(MT_KEY)?'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key='+encodeURIComponent(localGet(MT_KEY)):'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',tilingScheme:new Cesium.WebMercatorTilingScheme(),maximumLevel:19,credit:'Satellite imagery'}));}catch(e){console.warn('[VELVE] imagery update failed',e)}};
    $('#velve-save').onclick=()=>{try{localStorage.setItem(OR_KEY,$('#velve-or-key').value.trim());localStorage.setItem(OR_MODEL,$('#velve-or-model').value.trim()||DEFAULT_OR_MODEL);localStorage.setItem(MT_KEY,$('#velve-maptiler-key').value.trim());localStorage.setItem(OW_KEY,$('#velve-openweather-key').value.trim());localStorage.setItem(OS_CLIENT_ID_KEY,$('#velve-opensky-client-id').value.trim());localStorage.setItem(OS_CLIENT_SECRET_KEY,$('#velve-opensky-client-secret').value.trim());openSkyToken='';openSkyTokenExpires=0}catch(_){}refreshImagery();$('#velve-settings-note').textContent='Settings saved locally. OpenSky credentials are used for authenticated aircraft data; satellites continue using CelesTrak.';setStatus('SETTINGS SAVED LOCALLY')};
    $('#velve-clear-keys').onclick=()=>{try{localStorage.removeItem(OR_KEY);localStorage.removeItem(MT_KEY);localStorage.removeItem(OW_KEY);localStorage.removeItem(OR_MODEL);localStorage.removeItem(OS_CLIENT_ID_KEY);localStorage.removeItem(OS_CLIENT_SECRET_KEY)}catch(_){}openSkyToken='';openSkyTokenExpires=0;$('#velve-or-key').value='';$('#velve-maptiler-key').value='';$('#velve-openweather-key').value='';$('#velve-opensky-client-id').value='';$('#velve-opensky-client-secret').value='';$('#velve-or-model').value=DEFAULT_OR_MODEL;refreshImagery();$('#velve-settings-note').textContent='Optional API keys and OpenSky credentials cleared from this browser.';setStatus('OPTIONAL KEYS CLEARED')};
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
  async function refreshWeather(){try{const ow=localGet(OW_KEY);if(ow){const d=await fetch('https://api.openweathermap.org/data/2.5/weather?lat='+selected.lat+'&lon='+selected.lon+'&appid='+encodeURIComponent(ow)+'&units=metric').then(r=>{if(!r.ok)throw new Error('OpenWeatherMap request failed');return r.json()});$('#v-weather').textContent=Math.round(d.main.temp)+'°C · '+Math.round(d.wind.speed*3.6)+'km/h';return}const d=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+selected.lat+'&longitude='+selected.lon+'&current=temperature_2m,wind_speed_10m&timezone=UTC').then(r=>r.json());$('#v-weather').textContent=Math.round(d.current.temperature_2m)+'°C · '+Math.round(d.current.wind_speed_10m)+'km/h'}catch(_){$('#v-weather').textContent='weather offline'}}
  async function refreshQuakes(){try{const d=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'}).then(r=>r.json());quakeDS.entities.removeAll();(d.features||[]).slice(0,100).forEach(f=>{const c=f.geometry?.coordinates||[],p=f.properties||{},mag=Number(p.mag||0);if(c.length<3)return;quakeDS.entities.add({position:Cesium.Cartesian3.fromDegrees(Number(c[0]),Number(c[1]),Math.max(1000,Math.min(120000,Number(c[2])*1000))),point:{pixelSize:Math.max(4,Math.min(10,mag*2)),color:Cesium.Color.RED.withAlpha(.75)}})});$('#v-quake').textContent=d.metadata?.count??'—'}catch(_){} }
  function addAircraft(x,source,seen){const lon=Number(x.lon??x[5]),lat=Number(x.lat??x[6]);if(!Number.isFinite(lon)||!Number.isFinite(lat))return false;const key=String(x.hex??x.icao24??x[0]??(source+'-'+lon+'-'+lat));if(seen.has(key))return false;seen.add(key);const alt=Math.max(300,Number(x.alt_baro??x.geo_altitude??x.alt_geom??x[7]??x[13]??1000));aircraftDS.entities.add({id:'air-'+key,position:Cesium.Cartesian3.fromDegrees(lon,lat,alt),point:{pixelSize:8,color:Cesium.Color.ORANGE,outlineColor:Cesium.Color.WHITE,outlineWidth:1,disableDepthTestDistance:Number.POSITIVE_INFINITY}});return true}
  async function getOpenSkyToken(){
    const clientId=localGet(OS_CLIENT_ID_KEY),clientSecret=localGet(OS_CLIENT_SECRET_KEY);
    if(!clientId||!clientSecret)return '';
    if(openSkyToken&&Date.now()<openSkyTokenExpires-60000)return openSkyToken;
    const body=new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret});
    const response=await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),cache:'no-store'});
    if(!response.ok)throw new Error('OpenSky authentication HTTP '+response.status);
    const data=await response.json();if(!data.access_token)throw new Error('OpenSky did not return an access token');
    openSkyToken=data.access_token;openSkyTokenExpires=Date.now()+Math.max(60,Number(data.expires_in||1800))*1000;return openSkyToken;
  }
  async function fetchOpenSkyAircraft(){
    const token=await getOpenSkyToken();
    const response=await fetch('https://opensky-network.org/api/states/all',{headers:{'Authorization':'Bearer '+token},cache:'no-store'});
    if(!response.ok)throw new Error('OpenSky states HTTP '+response.status);
    const data=await response.json();return data.states||[];
  }
  async function refreshAircraft(){
    aircraftDS.entities.removeAll();const seen=new Set();let count=0;
    const hasOpenSky=!!(localGet(OS_CLIENT_ID_KEY)&&localGet(OS_CLIENT_SECRET_KEY));
    if(hasOpenSky){
      try{
        const states=await fetchOpenSkyAircraft();
        states.forEach(x=>{if(count<1200&&addAircraft(x,'OpenSky',seen))count++});
        $('#v-air').textContent=count?count+' · OPENSKY':'0 · OPENSKY';
        setStatus('LIVE AIRCRAFT · OPENSKY');
        return;
      }catch(error){console.warn('[VELVE OpenSky]',error);$('#velve-settings-note').textContent='OpenSky could not connect ('+String(error.message||error)+'). Check credentials/network. Falling back to the public aircraft feed.';openSkyToken='';openSkyTokenExpires=0}
    }
    try{
      const d=await fetch('https://api.adsb.lol/v2/all',{cache:'no-store'}).then(r=>r.ok?r.json():null);
      (d?.ac||[]).forEach(x=>{if(count<800&&addAircraft(x,'ADSB.lol',seen))count++});
      $('#v-air').textContent=count?(hasOpenSky?count+' · FALLBACK':count):'offline';
    }catch(_){$('#v-air').textContent='offline'}
  }
  function parseTLE(text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];for(let i=0;i<lines.length-2;i++){if(lines[i+1]?.startsWith('1 ')&&lines[i+2]?.startsWith('2 ')){out.push({name:lines[i].replace(/^0 /,''),l1:lines[i+1],l2:lines[i+2]});i+=2}}return out}
  async function refreshSatellites(){try{if(!window.satellite)return;const groups=['STARLINK','ONEWEB','GPS-OPS','GALILEO','GLONASS','STATIONS'];const packs=await Promise.all(groups.map(g=>fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=TLE`,{cache:'no-store'}).then(r=>r.ok?r.text():'')));const all=packs.flatMap(parseTLE),seen=new Set();satelliteRecs=[];for(const s of all){const key=s.l1.slice(2,7);if(!seen.has(key)){seen.add(key);satelliteRecs.push(s)}if(satelliteRecs.length>=700)break}satelliteDS.entities.removeAll();satelliteSats=satelliteRecs.map(s=>{try{return {s,rec:window.satellite.twoline2satrec(s.l1,s.l2)}}catch(_){return null}}).filter(Boolean);updateSatellites();$('#v-sat').textContent=satelliteSats.length}catch(_){$('#v-sat').textContent='offline'} }
  function updateSatellites(){
    if(!window.satellite||!satelliteSats.length)return;
    const now=new Date(),gst=window.satellite.gstime(now);
    satelliteSats.forEach((item,i)=>{try{const pv=window.satellite.propagate(item.rec,now),pos=pv?.position;if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))return;const gd=window.satellite.eciToGeodetic(pos,gst);if(!gd)return;const lon=window.satellite.degreesLong(gd.longitude),lat=window.satellite.degreesLat(gd.latitude);const realH=Math.max(0,Number(gd.height)*1000);/* Visual-only orbit exaggeration: keep markers visibly separated from Earth. */const h=Math.max(1800000,realH*1.6);if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(h))return;let e=satelliteDS.entities.getById('sat-'+i);if(!e)e=satelliteDS.entities.add({id:'sat-'+i,name:item.s.name,point:{pixelSize:9,color:i%3===0?Cesium.Color.CYAN:i%3===1?Cesium.Color.HOTPINK:Cesium.Color.LIME,outlineColor:Cesium.Color.BLACK,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY}});e.position=Cesium.Cartesian3.fromDegrees(lon,lat,h)}catch(_){} });
  }
  function startSatelliteLoop(){if(satelliteTimer)clearInterval(satelliteTimer);updateSatellites();satelliteTimer=setInterval(()=>{if(root?.classList.contains('velve-on')){updateSatellites();viewer.scene.requestRender()}},1000)}
  function flyToCoordinates(lat,lon,label,altitude){
    const destination=Cesium.Cartesian3.fromDegrees(lon,lat,altitude);
    return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};try{viewer.camera.cancelFlight();viewer.camera.flyTo({destination,orientation:{heading:0,pitch:Cesium.Math.toRadians(-90),roll:0},duration:3.2,maximumHeight:12000000,complete:finish,cancel:finish})}catch(_){try{viewer.camera.setView({destination,orientation:{heading:0,pitch:Cesium.Math.toRadians(-90),roll:0}})}catch(__){}finish()}setTimeout(finish,6000)});
  }
  function showLocationPermissionPopup(){const modal=$('#velve-location-modal');if(!modal)return;modal.style.display='flex';setStatus('WAITING FOR LOCATION CHOICE');say('Would you like to allow VELVE to access your device location? Choose allow or deny on the screen.');}
  async function goToMyLocation(){
    if(flying)return false;
    if(!navigator.geolocation){setStatus('LOCATION NOT SUPPORTED');say('This browser does not support location access.');return false}
    if(!window.isSecureContext){setStatus('HTTPS REQUIRED FOR LOCATION');say('Open JARVIS using its secure HTTPS website to use your location.');return false}
    flying=true;setStatus('REQUESTING YOUR LOCATION PERMISSION');say('Please allow location access in your browser to move VELVE to your location.');
    try{
      const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0}));
      const lat=Number(position.coords.latitude),lon=Number(position.coords.longitude),accuracy=Number(position.coords.accuracy);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('Invalid device coordinates');
      selected={name:'Your Location',country:'',lat,lon};$('#v-focus').textContent='YOUR LOCATION';setStatus('FLYING TO YOUR LOCATION');
      // Device coordinates are used only in this browser session; they are not uploaded or saved.
      // Zoom to house-level scale. The actual house can only be centered reliably when device GPS accuracy and available satellite imagery are sufficiently precise.
      await flyToCoordinates(lat,lon,'Your Location',180);
      await refreshWeather();setStatus('FOCUS: YOUR LOCATION');
      say(Number.isFinite(accuracy)&&accuracy>100?'Showing your reported location. Device location accuracy is about '+Math.round(accuracy)+' meters.':'You are now viewing your location.');return true;
    }catch(error){
      console.warn('[VELVE] device location unavailable',error?.code||error?.message||error);
      // A browser or OS may report permission denied even when the site setting appears enabled.
      // Fall back to explicitly disclosed, approximate IP-based location so navigation can still work.
      try{
        setStatus('DEVICE LOCATION UNAVAILABLE · FINDING APPROXIMATE AREA');
        const network=await fetch('https://ipwho.is/',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Network location service unavailable');return r.json()});
        const lat=Number(network.latitude),lon=Number(network.longitude);
        if(network.success===false||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('No approximate coordinates returned');
        const area=[network.city,network.region,network.country].filter(Boolean).join(', ')||'Approximate Network Area';
        selected={name:area,lat,lon};$('#v-focus').textContent='APPROXIMATE AREA';
        await flyToCoordinates(lat,lon,area,30000);
        await refreshWeather();setStatus('APPROXIMATE NETWORK LOCATION · NOT GPS');
        say('Device GPS was unavailable, so I am showing an approximate area based on your internet connection. This may be inaccurate.');
        return true;
      }catch(fallbackError){
        console.warn('[VELVE] approximate location fallback failed',fallbackError);
        if(error?.code===1){setStatus('LOCATION BLOCKED');say('The browser or device is blocking location. Check the site permission and your device Location Services, or open this page directly in Safari or Chrome and try again. Approximate network location was also unavailable.')}
        else if(error?.code===3){setStatus('LOCATION REQUEST TIMED OUT');say('Your device location timed out, and approximate network location was unavailable. Please try again.')}
        else{setStatus('LOCATION UNAVAILABLE');say('I could not get your device location or approximate network area. Please check your connection and device location settings.')}
        return false;
      }
    }finally{flying=false}
  }
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
  async function handleInput(text){
    text=String(text||'').trim();if(!text)return;$('#velve-input').value='';
    const t=text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    if(/\b(my location|my current location|our location|current location|where am i|where i am|my position|my house|my home|what is my location|whats my location|what's my location)\b/.test(t)||/\b(take me|go|navigate|fly|move)\s+(to|me to)\s+(my location|my current location|my house|my home)\b/.test(t)){showLocationPermissionPopup();return}
    const intent=localIntent(text);if(intent!==undefined){if(intent)await flyTo(intent);return}
    const key=getORKey();
    if(!key){say('I can navigate to places without an API key. To ask VELVE general questions, add your optional OpenRouter key in Settings.');setStatus('NAVIGATION READY · AI KEY OPTIONAL');return}
    setStatus('VELVE AI THINKING');say('Let me check that.');
    try{
      const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-OpenRouter-Title':'JARVIS VELVE'},body:JSON.stringify({model:getORModel(),messages:[{role:'system',content:'You are VELVE, the Earth-observation and geography assistant inside JARVIS. Answer clearly and briefly. You can explain geography, Earth, satellites, weather concepts, and general questions, but do not claim to control or display globe layers unless the user issued a supported navigation command. Live data panels show the app’s public feeds.'},{role:'user',content:text}],temperature:0.4}),signal:AbortSignal.timeout?AbortSignal.timeout(25000):undefined});
      const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||('OpenRouter HTTP '+response.status));
      const answer=String(data?.choices?.[0]?.message?.content||'').trim();if(!answer)throw new Error('No answer returned');
      setStatus('VELVE AI RESPONSE READY');say(answer);
    }catch(error){console.warn('[VELVE AI]',error);setStatus('VELVE AI REQUEST FAILED');say('I could not get an AI answer. Check the OpenRouter key and model in VELVE Settings. Navigation and public globe feeds still work without a key.')}
  }
  function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){say('Voice input is not supported by this browser.');return}const r=new SR();r.lang='en-IN';r.interimResults=false;r.maxAlternatives=5;r.onresult=e=>{const alts=Array.from(e.results[0]||[]).map(x=>String(x.transcript||'').trim()).filter(Boolean);const score=x=>{const t=x.toLowerCase();let n=0;if(/geo\s*core|geocore|geocor|open core|open jor/.test(t))n+=10;if(/take me|navigate|fly to|go to|move to/.test(t))n+=4;if(Object.keys(CITY_ALIASES).some(city=>t.includes(city)))n+=6;if(/where am i|my location|my house|my home/.test(t))n+=5;return n};alts.sort((a,b)=>score(b)-score(a));handleInput(alts[0]||'')};r.onerror=()=>setStatus('VOICE INPUT UNAVAILABLE');try{r.start();setStatus('LISTENING')}catch(e){setStatus('VOICE INPUT UNAVAILABLE')}}
  async function open(){buildUI();root.classList.add('velve-on');document.body.classList.add('velve-active');setStatus('STARTING VELVE');await loadCesium();if(!viewer)initViewer();if(!window.satellite){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/dist/satellite.min.js';document.head.appendChild(s);await new Promise(r=>{s.onload=r;s.onerror=r})}$('#velve-help').classList.add('hidden');await Promise.allSettled([refreshWeather(),refreshQuakes(),refreshAircraft(),refreshSatellites()]);startSatelliteLoop();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(root?.classList.contains('velve-on')){refreshQuakes();refreshAircraft()}},60000);setStatus('LIVE // PUBLIC SOURCES ACTIVE')}
  function exit(){if(refreshTimer)clearInterval(refreshTimer);if(satelliteTimer)clearInterval(satelliteTimer);try{viewer?.camera.cancelFlight()}catch(_){}root.classList.remove('velve-on');document.body.classList.remove('velve-active');say('VELVE environment closed.')}
  function intercept(){if(typeof window.sendCommand!=='function')return;const original=window.sendCommand;if(original.__velveWrapped)return;const wrapped=async function(c){const t=String(c||'').trim();if(/^velve$/i.test(t)||/start\s+(?:the\s+)?velve/i.test(t)){await open();say('VELVE environment online.');return}if(root?.classList.contains('velve-on')&&/^exit\s+velve/i.test(t)){exit();return}return original.apply(this,arguments)};wrapped.__velveWrapped=true;window.sendCommand=wrapped}
  buildUI();intercept();setTimeout(intercept,1000);window.addEventListener('load',intercept);window.VELVE={open,exit,flyTo,version:VERSION};
})();
