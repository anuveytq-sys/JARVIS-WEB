/* JARVIS // ULTRON FLEXIBLE COMMAND BRIDGE
   Adds natural voice/text aliases for opening and closing ULTRON.
   Existing commands are left untouched; the world-feed manager only takes
   over the camera panel so unavailable feeds are skipped before display.
*/
(() => {
  'use strict';
  if (window.__JARVIS_ULTRON_COMMANDS__) return;
  window.__JARVIS_ULTRON_COMMANDS__ = true;

  const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const OPEN_PATTERNS = [
    /^hey jarvis (please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(jarvis )?(please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(release|unleash|deploy|initialize|power up|wake up) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(take me to|go to|enter|enter the) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(i want|i need) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(activate|open|start) ultron intelligence$/,
    /^ultron (open|launch|start|activate|engage|boot|online|wake up)$/
  ];
  const CLOSE_PATTERNS = [
    /^(hey jarvis )?(please )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron$/,
    /^(hey jarvis )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(stand down|power down|put away|take down) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(return|go back|take me back) (from|out of) (the )?ultron$/,
    /^ultron (close|exit|quit|shutdown|shut down|offline|sleep)$/
  ];
  const matches = (patterns, text) => patterns.some(pattern => pattern.test(text));

  /*
     Root world-feed fix:
     - stops the old sequential 20-second retry loop;
     - loads a large maintained registry of actively validated public HLS feeds;
     - tests several candidates in parallel and displays only the first feed that
       actually produces playable media;
     - never exposes CHECKING/CONNECTING/SEARCHING text in the camera panel;
     - rotates the already-playing feed every 20 seconds, with the next feed
       selected in advance so a dead source does not create a long black gap.
  */
  function installStableWorldFeedManager(){
    if(window.__ULTRON_STABLE_WORLD_FEEDS__)return;
    window.__ULTRON_STABLE_WORLD_FEEDS__=true;

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
      ['MISSISSAUGA · CANADA','https://webvideo.mississauga.ca/BalconyWebcam/LiveWebcam.stream/chunklist_w1473770124.m3u8'],
      ['BOZI DAR · CZECHIA','https://kamery3.wolfnet.cz/bozi_dar.m3u8'],
      ['GROMITZ COAST · GERMANY','https://osl9.lvstrm.de/hls/stream.m3u8'],
      ['ISTANBUL · TURKIYE','https://601a55c88ec6d.streamlock.net/hls/506.stream/playlist.m3u8'],
      ['ISTANBUL PANORAMA · TURKIYE','https://601a55c88ec6d.streamlock.net/hls/720.stream/playlist.m3u8'],
      ['SAO PAULO · BRAZIL','https://34.104.32.249.nip.io/SP360-KM110/stream.m3u8'],
      ['ACUNA BRIDGE · MEXICO','https://s78.ipcamlive.com/streams/4e49zoi8ngjmple0u/stream.m3u8'],
      ['TENBY HARBOUR · UNITED KINGDOM','https://s74.ipcamlive.com/streams/4azcyiwhlasoszw6g/stream.m3u8'],
      ['RIVER BURE · UNITED KINGDOM','https://s101.ipcamlive.com/streams/65jrzbexkvsgqd4ci/stream.m3u8'],
      ['CASTEL VOLTURNO · ITALY','https://5e0add8153fcd.streamlock.net:1936/vedetta/castel-volturno.stream/playlist.m3u8'],
      ['FLORENCE · ITALY','https://5e0add8153fcd.streamlock.net:1936/vedetta/via-della-scala.stream/chunklist_w1359048502.m3u8'],
      ['ANDRYCHOW · POLAND','https://hoktastream3.webcamera.pl/andrychow_cam_3aad9b/andrychow_cam_3aad9b.stream/playlist.m3u8'],
      ['BUKOWINA TATRZANSKA · POLAND','https://hoktastream1.webcamera.pl/bukovina_cam_7aa04f/bukovina_cam_7aa04f.stream/playlist.m3u8'],
      ['WARSAW CASTLE · POLAND','https://hoktastream2.webcamera.pl/warszawa_cam_5f3b1a/warszawa_cam_5f3b1a.stream/chunks.m3u8'],
      ['ALVOR BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/alvor/playlist.m3u8'],
      ['APULIA BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/bcapulia/playlist.m3u8'],
      ['CARCAVELOS BEACH · PORTUGAL','https://video-auth1.iol.pt/beachcam/carcavelos/playlist.m3u8'],
      ['COSTA DA CAPARICA · PORTUGAL','https://video-auth1.iol.pt/beachcam/costacaparicacds/playlist.m3u8'],
      ['BRASOV · ROMANIA','https://digilive.rcs-rds.ro/digilivedge/poiana_brasov_desktop.stream/index.m3u8'],
      ['GALATI · ROMANIA','https://digilive.rcs-rds.ro/digiliveedge/galati2_desktop.stream/index.m3u8'],
      ['SINAIA · ROMANIA','https://digilive.rcs-rds.ro/digilivedge/sinaia_desktop.stream/index.m3u8'],
      ['CHACHOENGSAO · THAILAND','https://camera1.iticfoundation.org/hls/10.8.0.24_8554.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP055-KM193/stream.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP055-KM211A/stream.m3u8'],
      ['SAO PAULO HIGHWAY · BRAZIL','https://34.104.32.249.nip.io/SP008-KM095/stream.m3u8'],
      ['WHISTLER VILLAGE · CANADA','https://streamer6.brownrice.com/whistlervillagefitz/whistlervillagefitz.stream/main_playlist.m3u8']
    ];

    let stopped=false, hls=null, timer=null, stallTimer=null, current=null, pool=FALLBACKS.slice();
    const LOAD_TIMEOUT=3200, STALL_TIMEOUT=2600, ROTATE_MS=20000;
    const panel=()=>document.getElementById('ultron-clean-core')?.querySelector('.uc-worldcam');
    const video=()=>panel()?.querySelector('.uc-worldcam-frame');
    const place=()=>panel()?.querySelector('.uc-worldcam-place');
    const badge=()=>panel()?.querySelector('.uc-worldcam-live');
    const clear=()=>{if(timer){clearTimeout(timer);timer=null}if(stallTimer){clearTimeout(stallTimer);stallTimer=null}if(hls){try{hls.destroy()}catch(_){}hls=null}};
    const reset=()=>{const v=video();clear();if(!v)return;v.onplaying=null;v.onerror=null;v.onwaiting=null;v.onstalled=null;try{v.pause();v.removeAttribute('src');v.load()}catch(_){}v.style.visibility='hidden'};
    const silent=()=>{const p=panel();if(!p)return;const x=place();if(x)x.textContent='';const b=badge();if(b){b.textContent='LIVE';b.style.opacity='1'}};
    const fail=(item)=>{if(item)pool=pool.filter(x=>x[1]!==item[1]);setTimeout(()=>{if(!stopped)playNext()},30)};
    const ensureHls=()=>new Promise((resolve,reject)=>{
      if(window.Hls)return resolve(window.Hls);
      const existing=document.querySelector('script[data-ultron-world-hls]');
      if(existing){existing.addEventListener('load',()=>resolve(window.Hls),{once:true});existing.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');s.async=true;s.dataset.ultronWorldHls='1';s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';s.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS unavailable'));s.onerror=reject;document.head.appendChild(s);
    });
    const playNative=(item,v,done)=>{
      let finished=false;
      const finish=ok=>{if(finished)return;finished=true;done(ok)};
      v.onplaying=()=>finish(true);v.onerror=()=>finish(false);v.onstalled=()=>{};
      try{v.src=item[1];v.load();const p=v.play();if(p?.catch)p.catch(()=>{})}catch(_){finish(false)}
      setTimeout(()=>finish(false),LOAD_TIMEOUT);
    };
    const playHls=(item,v,H,done)=>{
      let finished=false;
      const finish=ok=>{if(finished)return;finished=true;done(ok)};
      try{
        const x=new H({enableWorker:true,lowLatencyMode:true,maxBufferLength:5,manifestLoadingTimeOut:2500,levelLoadingTimeOut:2500,fragLoadingTimeOut:2500});
        hls=x;x.on(H.Events.ERROR,(_,d)=>{if(d?.fatal)finish(false)});x.on(H.Events.MANIFEST_PARSED,()=>{try{const p=v.play();if(p?.catch)p.catch(()=>{})}catch(_){} });x.on(H.Events.FRAG_LOADED,()=>{if(!finished){v.style.visibility='visible';finish(true)}});x.loadSource(item[1]);x.attachMedia(v);
      }catch(_){finish(false)}
      setTimeout(()=>finish(false),LOAD_TIMEOUT);
    };
    const probeBatch=(items,done)=>{
      const H=window.Hls;
      const candidates=items.slice(0,5), tests=[];let settled=false, remaining=candidates.length;
      const cleanup=()=>tests.forEach(t=>{try{t.v.pause();t.v.removeAttribute('src');t.v.load()}catch(_){}try{t.h?.destroy()}catch(_){}});
      const win=item=>{if(settled)return;settled=true;cleanup();done(item)};
      candidates.forEach(item=>{
        const tv=document.createElement('video');tv.muted=true;tv.playsInline=true;tv.autoplay=true;tv.preload='auto';tv.style.position='fixed';tv.style.width='1px';tv.style.height='1px';tv.style.opacity='0';tv.style.pointerEvents='none';document.body.appendChild(tv);tests.push({v:tv,h:null});
        if(H&&H.isSupported())playHls(item,tv,H,ok=>{if(ok)win(item);else if(--remaining===0&&!settled){settled=true;cleanup();tests.forEach(t=>t.v.remove());done(null)}});
        else playNative(item,tv,ok=>{if(ok)win(item);else if(--remaining===0&&!settled){settled=true;cleanup();tests.forEach(t=>t.v.remove());done(null)}});
      });
    };
    const commit=(item)=>{
      const v=video();if(!v||!item)return;
      current=item;reset();silent();
      ensureHls().then(H=>{
        if(stopped||!video())return;
        let finished=false;
        const good=()=>{if(finished)return;finished=true;v.style.visibility='visible';current=item;silent();if(timer)clearTimeout(timer);timer=setTimeout(()=>{if(!stopped)playNext()},ROTATE_MS);if(stallTimer)clearTimeout(stallTimer);stallTimer=setTimeout(()=>{if(!v.paused&&v.readyState>=2){playNext()}},STALL_TIMEOUT)};
        const bad=()=>{if(finished)return;finished=true;fail(item)};
        try{hls=new H({enableWorker:true,lowLatencyMode:true,maxBufferLength:6,manifestLoadingTimeOut:2500,levelLoadingTimeOut:2500,fragLoadingTimeOut:2500});hls.on(H.Events.ERROR,(_,d)=>{if(d?.fatal)bad()});hls.on(H.Events.MANIFEST_PARSED,()=>{try{const p=v.play();if(p?.catch)p.catch(()=>{})}catch(_){}});hls.on(H.Events.FRAG_LOADED,()=>{if(!finished)good()});hls.loadSource(item[1]);hls.attachMedia(v);setTimeout(()=>{if(!finished)bad()},LOAD_TIMEOUT)}catch(_){bad()}
      }).catch(()=>playNative(item,v,ok=>ok?(()=>{v.style.visibility='visible';silent();timer=setTimeout(()=>playNext(),ROTATE_MS)})():fail(item)));
    };
    const playNext=()=>{
      if(stopped||!document.getElementById('ultron-clean-core'))return;
      const v=video();if(!v)return;
      clear();v.style.visibility='hidden';silent();
      if(!pool.length)pool=FALLBACKS.slice();
      const batch=[];while(batch.length<Math.min(5,pool.length)){const i=Math.floor(Math.random()*pool.length);const x=pool.splice(i,1)[0];if(!batch.some(y=>y[1]===x[1]))batch.push(x)}
      probeBatch(batch,item=>{if(item)commit(item);else setTimeout(playNext,50)});
    };
    const loadRegistry=async()=>{
      try{
        const controller=new AbortController();const t=setTimeout(()=>controller.abort(),5000);
        const r=await fetch('https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/main/streams.geojson',{cache:'no-store',signal:controller.signal});clearTimeout(t);
        if(!r.ok)return;const data=await r.json();const usable=(data.features||[]).map(f=>{const p=f.properties||{};return [String(p.display_name||p.name||'WORLD FEED · '+(p.country_code||'GLOBAL')).toUpperCase(),p.url]}).filter(x=>x[1]&&/^https:\/\/[^\s]+\.m3u8(?:\?|$)/i.test(x[1]));
        if(usable.length)pool=usable.sort(()=>Math.random()-.5).slice(0,180);
      }catch(_){}
    };
    const start=()=>{
      const root=document.getElementById('ultron-clean-core');if(!root)return;
      stopped=false;
      if(window.__ultronWorldCamTimer){clearInterval(window.__ultronWorldCamTimer);window.__ultronWorldCamTimer=null}
      reset();silent();playNext();loadRegistry();
    };
    const stop=()=>{stopped=true;clear();const v=video();if(v)try{v.pause();v.removeAttribute('src');v.load()}catch(_){} };
    setTimeout(start,180);
    window.addEventListener('pagehide',stop,{once:true});
  }

  async function openUltron(){
    try {
      if (!window.ULTRON) {
        await new Promise((resolve, reject) => {
          const existing = document.getElementById('jarvis-ultron-core-loader');
          if (existing) existing.remove();
          const script = document.createElement('script'); script.id = 'jarvis-ultron-core-loader';
          script.src = './jarvis-ultron.js?v=ultron-core-rebuild-26'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
        });
      }
      window.ULTRON?.open?.();
      setTimeout(installStableWorldFeedManager,250);
      return true;
    } catch (error) { console.error('[JARVIS] ULTRON core failed to load', error); return false; }
  }
  function closeUltron(){ window.ULTRON?.close?.(); document.getElementById('ultron-clean-core')?.remove(); return true; }
  async function handle(command){
    const text=normalize(command);
    if(!text)return false;
    if(matches(OPEN_PATTERNS,text))return openUltron();
    if(matches(CLOSE_PATTERNS,text))return closeUltron();
    return false;
  }
  const install = () => {
    if (typeof window.sendCommand!=='function') return false;
    if (window.sendCommand.__jarvisUltronFlexible) return true;
    const original = window.sendCommand;
    const wrapped = async function(command) { if (await handle(command)) return; return original.apply(this, arguments); };
    wrapped.__jarvisUltronFlexible = true; wrapped.__jarvisUltronOriginal = original; window.sendCommand = wrapped; return true;
  };
  let tries = 0;
  const timer = setInterval(() => { tries += 1; if (install() || tries >= 120) clearInterval(timer); }, 100);
  window.JARVIS_ULTRON_COMMANDS = { version: 'ultron-commands-20261024rootfix', open: openUltron, close: closeUltron, handle, patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length } };
})();
