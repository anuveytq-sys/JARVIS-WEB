/* ULTRON — clean rebuild: orange neural field + interactive 3D core only. */
(() => {
  'use strict';
  const VERSION = 'ultron-core-rebuild-11';
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
    el.innerHTML = '<canvas class="uc-canvas"></canvas><div class="uc-vignette"></div><div class="uc-mark">ULTRON</div><div class="uc-sub">NEURAL CORE</div><aside class="uc-worldcam" aria-label="Rotating public world camera feed"><div class="uc-worldcam-head"><span class="uc-worldcam-dot"></span><span>WORLD FEED</span><span class="uc-worldcam-live">LIVE</span></div><video class="uc-worldcam-frame" title="Public world camera feed" autoplay muted playsinline disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen"></video><div class="uc-worldcam-place">CONNECTING TO PUBLIC CAM</div></aside><div class="uc-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div><form class="uc-command" autocomplete="off"><input class="uc-command-input" type="text" aria-label="ULTRON command" placeholder="Enter a command…" maxlength="1000"><button class="uc-send" type="submit" aria-label="Send command" title="Send">➤</button><button class="uc-voice" type="button" aria-label="Voice command" title="Voice command">🎙</button><span class="uc-command-status" aria-live="polite"></span></form><button class="uc-exit" type="button" aria-label="Close ULTRON">×</button>'
    const style = document.createElement('style'); style.id='ultron-clean-core-style'; style.textContent=`
      body.${scopedUiClass} #jarvis-wake-word-toggle,body.${scopedUiClass} #jarvis-hand-gesture-toggle,body.${scopedUiClass} #jarvis-hand-gesture-status,body.${scopedUiClass} #jarvis-web-bridge-panel{display:none!important;visibility:hidden!important;pointer-events:none!important}\n      #${overlayId}{position:fixed;inset:0;z-index:2147483000;background:#050302;color:#ff8a32;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;isolation:isolate;touch-action:none}
      #${overlayId} .uc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
      #${overlayId} .uc-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,.24) 66%,#030201 100%)}
      #${overlayId} .uc-mark{position:absolute;top:28px;left:32px;font-size:clamp(18px,2.4vw,30px);font-weight:800;letter-spacing:.34em;color:#ff8b35;text-shadow:0 0 24px #ff5c16}
      #${overlayId} .uc-sub{position:absolute;top:66px;left:34px;font-size:9px;letter-spacing:.38em;color:#b55b28}
      #${overlayId} .uc-hint{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);font-size:9px;letter-spacing:.22em;color:rgba(255,155,83,.62);white-space:nowrap}
      #${overlayId} .uc-command{position:absolute;z-index:5;left:50%;bottom:54px;transform:translateX(-50%);width:min(560px,calc(100% - 32px));height:44px;display:flex;align-items:stretch;gap:7px;padding:4px;border:1px solid rgba(255,125,48,.55);border-radius:12px;background:rgba(15,7,3,.88);box-shadow:0 0 22px rgba(255,86,20,.12);backdrop-filter:blur(12px);touch-action:auto}\n      #${overlayId} .uc-command-input{flex:1;min-width:0;height:100%;padding:0 10px;border:0;outline:0;background:transparent;color:#ffe0c6;font:13px Inter,ui-sans-serif,system-ui,sans-serif;touch-action:auto}\n      #${overlayId} .uc-command-input::placeholder{color:rgba(255,174,121,.56)}\n      #${overlayId} .uc-send,#${overlayId} .uc-voice{flex:0 0 36px;width:36px;height:34px;border:1px solid rgba(255,135,61,.36);border-radius:8px;background:rgba(255,104,28,.13);color:#ffb16e;font-size:17px;cursor:pointer;touch-action:manipulation}\n      #${overlayId} .uc-send:hover,#${overlayId} .uc-voice:hover{background:rgba(255,104,28,.28)}\n      #${overlayId} .uc-voice.is-listening{border-color:#ffb15b;background:rgba(255,70,20,.38);box-shadow:0 0 12px rgba(255,90,20,.35)}\n      #${overlayId} .uc-command-status{position:absolute;left:7px;bottom:calc(100% + 5px);font-size:10px;color:rgba(255,177,110,.9);pointer-events:none}\n      #${overlayId} .uc-exit{position:absolute;top:24px;right:26px;width:42px;height:42px;border:1px solid rgba(255,124,42,.38);border-radius:50%;background:rgba(20,8,2,.45);color:#ff9a50;font-size:25px;cursor:pointer}
      #${overlayId} .uc-worldcam{position:absolute;z-index:4;top:76px;right:26px;width:clamp(116px,15vw,160px);aspect-ratio:1/1;overflow:hidden;border:1px solid rgba(255,133,62,.78);border-radius:7px;background:rgba(8,5,3,.94);box-shadow:0 0 18px rgba(255,92,24,.2);pointer-events:auto}
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
    const worldCams=[
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
      {name:"ILLES BALEARS · SPAIN",url:"https://str2.eivotv.es/canal_y/index.m3u8"},
      {name:"ILLES BALEARS COAST · SPAIN",url:"https://str2.eivotv.es/canal_r/index.m3u8"},
      {name:"ILLES BALEARS VIEW · SPAIN",url:"https://str2.eivotv.es/canal_ai/index.m3u8"},
      {name:"ILLES BALEARS HARBOUR · SPAIN",url:"https://str2.eivotv.es/canal_o/index.m3u8"},
      {name:"COASTAL VIEW · SPAIN",url:"https://str4.strei.es/canal_s/index.m3u8"},
      {name:"ISLAND PANORAMA · SPAIN",url:"https://str2.eivotv.es/canal_p/index.m3u8"},
      {name:"ISLAND COAST · SPAIN",url:"https://str4.strei.es/canal_ao/index.m3u8"},
      {name:"ISLAND VIEW · SPAIN",url:"https://str2.eivotv.es/canal_ah/index.m3u8"},
      {name:"AETOLIA-ACARNANIA · GREECE",url:"https://livecameras.gr:30443/live/asta1/playlist.m3u8"},
      {name:"GREEK COUNTRYSIDE · GREECE",url:"https://livecameras.gr:30443/live/gaval1/playlist.m3u8"},
      {name:"ARCADIA · GREECE",url:"https://livecameras.gr:30443/live/trip1/playlist.m3u8"},
      {name:"ATTICA MOUNTAIN VIEW · GREECE",url:"https://livecameras.gr:30443/live/parn1/playlist.m3u8"},
      {name:"ATTICA · GREECE",url:"https://livecameras.gr:30443/live/dros1/playlist.m3u8"},
      {name:"FYLI · GREECE",url:"https://livecameras.gr:30443/live/fyli1/playlist.m3u8"},
      {name:"KIFISIA · GREECE",url:"https://livecameras.gr:30443/live/kifis1/playlist.m3u8"},
      {name:"CINDERFORD · UNITED KINGDOM",url:"https://s159.ipcamlive.com/streams/9fsgtp29ruh6zek1f/stream.m3u8"},
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
      {name:"TARQUINHO · PORTUGAL",url:"https://video-auth1.iol.pt/beachcam/bctarquinho/playlist.m3u8"}
    ];
    let worldIndex=0, worldHls=null, worldCamTimer=null, worldCamWatchdog=null, worldCamStarted=false, worldCamLoading=false, worldAttempt=0;
    const destroyWorldHls=()=>{if(worldHls){try{worldHls.destroy()}catch(_){}worldHls=null;}};
    const failWorldCam=()=>{
      if(!worldCamLoading)return;
      worldCamLoading=false;
      if(worldCamWatchdog)clearTimeout(worldCamWatchdog);
      worldFrame.onplaying=null;worldFrame.onerror=null;
      destroyWorldHls();
      try{worldFrame.pause();worldFrame.removeAttribute('src');worldFrame.load()}catch(_){}
      worldFrame.style.visibility='hidden';
      worldPlace.textContent='SEARCHING LIVE FEED';
      // Retry the next candidate without exposing a broken player or an error page.
      setTimeout(()=>{if(active&&worldFrame.isConnected)nextWorldCam()},180);
    };
    const startWorldCam=()=>{
      if(!active||!worldFrame?.isConnected||worldCamLoading)return;
      worldCamLoading=true;worldCamStarted=false;worldAttempt++;
      if(worldCamWatchdog)clearTimeout(worldCamWatchdog);
      destroyWorldHls();
      try{worldFrame.pause();worldFrame.removeAttribute('src');worldFrame.load()}catch(_){}
      const cam=worldCams[worldIndex%worldCams.length];worldIndex=(worldIndex+1)%worldCams.length;
      worldPlace.textContent=cam.name;worldFrame.style.visibility='hidden';
      worldFrame.onplaying=()=>{
        if(!worldCamLoading)return;
        worldCamStarted=true;worldCamLoading=false;
        if(worldCamWatchdog)clearTimeout(worldCamWatchdog);
        worldFrame.style.visibility='visible';worldPlace.textContent=cam.name;
      };
      worldFrame.onerror=failWorldCam;
      worldCamWatchdog=setTimeout(()=>{if(!worldCamStarted)failWorldCam()},8500);
      const tryNative=()=>{
        if(!worldCamLoading)return;
        destroyWorldHls();
        try{worldFrame.src=cam.url;worldFrame.load();const p=worldFrame.play();if(p&&p.catch)p.catch(()=>{})}catch(_){}
      };
      const tryHls=()=>{
        if(!worldCamLoading)return;
        if(window.Hls&&window.Hls.isSupported()){
          worldHls=new window.Hls({enableWorker:true,lowLatencyMode:true,maxBufferLength:8,manifestLoadingTimeOut:5000,levelLoadingTimeOut:5000});
          worldHls.on(window.Hls.Events.ERROR,(_,data)=>{
            if(!data?.fatal)return;
            if(worldHls){destroyWorldHls();tryNative()}
          });
          worldHls.on(window.Hls.Events.MANIFEST_PARSED,()=>{try{const p=worldFrame.play();if(p&&p.catch)p.catch(()=>{})}catch(_){}});
          worldHls.loadSource(cam.url);worldHls.attachMedia(worldFrame);
        }else if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();
        else failWorldCam();
      };
      // Prefer hls.js where supported; native HLS is the fallback for Safari/iOS.
      if(window.Hls)tryHls();
      else{
        const loader=document.createElement('script');loader.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';loader.async=true;
        loader.onload=tryHls;loader.onerror=()=>{if(worldFrame.canPlayType('application/vnd.apple.mpegurl'))tryNative();else failWorldCam()};
        document.head.appendChild(loader);
      }
    };
    const nextWorldCam=()=>startWorldCam();
    startWorldCam();
    worldCamTimer=setInterval(()=>{if(!worldCamLoading)startWorldCam()},20000);
    window.__ultronWorldCamTimer=worldCamTimer;
    el.querySelector('.uc-exit').addEventListener('click',()=>{if(worldCamTimer)clearInterval(worldCamTimer);if(worldCamWatchdog)clearTimeout(worldCamWatchdog);destroyWorldHls();worldFrame.onplaying=null;worldFrame.onerror=null;window.__ultronWorldCamTimer=null;});
    const setStatus=message=>{status.textContent=message||'';};
    form.addEventListener('pointerdown',e=>e.stopPropagation());
    form.addEventListener('click',e=>e.stopPropagation());
    form.addEventListener('submit',async e=>{
      e.preventDefault(); e.stopPropagation();
      const command=input.value.trim(); if(!command)return;
      if(typeof window.sendCommand!=='function'){setStatus('Command service is not ready yet.');return;}
      setStatus('Sending…'); voice.disabled=true;
      try{await window.sendCommand(command);input.value='';setStatus('Command sent.');}
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
  function cleanup(){active=false;if(window.__ultronWorldCamTimer){clearInterval(window.__ultronWorldCamTimer);window.__ultronWorldCamTimer=null;}document.body.classList.remove(scopedUiClass);cancelAnimationFrame(frame);if(resizeHandler)window.removeEventListener('resize',resizeHandler);const el=document.getElementById(overlayId);if(el)el.remove();const style=document.getElementById('ultron-clean-core-style');if(style)style.remove();if(renderer){renderer.dispose();renderer=null;}scene=camera=root=core=coreGlow=network=particles=ringGroup=null;}
  function close(){cleanup();}
  function open(){if(active)return;active=true;document.body.classList.add(scopedUiClass);loadThree().then(()=>{if(!active)return;const el=buildOverlay();makeScene(el);const canvas=el.querySelector('canvas');canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;targetY+=(e.clientX-lastX)*.006;targetX+=(e.clientY-lastY)*.006;targetX=Math.max(-1.3,Math.min(1.3,targetX));lastX=e.clientX;lastY=e.clientY});const stopDrag=()=>{drag=false};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);wheelHandler=e=>{e.preventDefault();zoom=Math.max(.68,Math.min(1.7,zoom+(e.deltaY>0?.06:-.06)))};canvas.addEventListener('wheel',wheelHandler,{passive:false});resizeHandler=()=>{if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8))};window.addEventListener('resize',resizeHandler);let t=0;const animate=()=>{if(!active||!renderer)return;frame=requestAnimationFrame(animate);t+=.004;rotX+=(targetX-rotX)*.045;rotY+=(targetY-rotY)*.045;root.rotation.x=rotX+Math.sin(t*.3)*.035;root.rotation.y=rotY+t*.11;root.rotation.z=Math.sin(t*.22)*.04;core.rotation.x=t*.18;core.rotation.y=-t*.23;coreGlow.scale.setScalar(1+Math.sin(t*2.1)*.055);ringGroup.rotation.y=-t*.12;ringGroup.rotation.x=Math.sin(t*.4)*.12;camera.position.z+=(11/zoom-camera.position.z)*.08;renderer.render(scene,camera)};animate();}).catch(error=>{active=false;document.body.classList.remove(scopedUiClass);console.error('[ULTRON] core startup failed',error);alert('ULTRON core could not load. Please check your connection, then reload JARVIS. If the problem continues, WebGL may be unavailable in this browser.');});}
  window.ULTRON={version:VERSION,open,close};
})();