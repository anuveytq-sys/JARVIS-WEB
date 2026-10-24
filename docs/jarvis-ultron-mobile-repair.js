/* ULTRON MOBILE HUD REPAIR — additive, scoped to ULTRON only */
(()=>{'use strict';
const ID='jarvis-ultron-mobile-repair';
const css=`
#jarvis-ultron-root{--uz-red:#ff4026;--uz-orange:#ff8b25}
#jarvis-ultron-root .uz-layout{height:calc(100% - 75px)!important;grid-template-columns:minmax(100px,24%) minmax(0,1fr)!important;gap:6px!important;padding:7px!important}
#jarvis-ultron-root .uz-categories{min-width:0}
#jarvis-ultron-root .uz-category-list{overflow-y:auto!important;overscroll-behavior:contain}
#jarvis-ultron-root .uz-cat{padding:5px 3px!important;grid-template-columns:15px minmax(0,1fr)!important}
#jarvis-ultron-root .uz-cat b{font-size:6px!important;line-height:1.2!important}
#jarvis-ultron-root .uz-cat small{font-size:5px!important}
#jarvis-ultron-root .uz-data{display:flex!important;min-width:0;transform:none!important;position:absolute!important;right:7px!important;left:auto!important;bottom:72px!important;top:auto!important;width:min(43%,250px)!important;height:23%!important;max-height:160px!important;overflow:hidden!important;z-index:15!important}
#jarvis-ultron-root .uz-results{overflow-y:auto!important;min-height:0!important;overscroll-behavior:contain;flex:1 1 auto!important}
#jarvis-ultron-root .uz-camera{flex:0 0 70px!important;height:70px!important}
#jarvis-ultron-root .uz-camera-empty{height:48px!important}
#jarvis-ultron-root .uz-orb{width:min( min(34vw,210px), 210px)!important;height:min( min(34vw,210px), 210px)!important;top:35%!important;filter:drop-shadow(0 0 28px rgba(255,82,20,.7))!important}
#jarvis-ultron-root .uz-core-dot{width:56px!important;height:56px!important;background:radial-gradient(circle at 34% 28%,#fff9cf 0%,#ffd06b 8%,#ff8b24 23%,#c62c0b 47%,#401007 67%,#080204 78%)!important;box-shadow:inset -8px -9px 18px #1c0303,inset 5px 5px 13px #fff0a2,0 0 22px #ff6a1c,0 0 55px #e4380c,0 0 100px #9e220b!important;transform:translateZ(22px)!important}
#jarvis-ultron-root .uz-core-text{font-size:0!important}
#jarvis-ultron-root .uz-core-text:after{content:"";position:absolute;width:86px;height:86px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(255,172,74,.8);border-radius:50%;box-shadow:0 0 15px #ff5a1c,inset 0 0 14px #ff7b1c}
#jarvis-ultron-root .uz-ring.r1{inset:-7px;border-width:2px;border-color:rgba(255,110,35,.8);transform:rotateX(64deg) rotateZ(12deg)!important}
#jarvis-ultron-root .uz-ring.r2{inset:8px;border-style:dashed;border-width:3px;transform:rotateY(65deg) rotateZ(25deg)!important}
#jarvis-ultron-root .uz-ring.r3{inset:-15px;border-style:dotted;transform:rotateX(68deg) rotateZ(-24deg)!important}
#jarvis-ultron-root .uz-footer{height:25px!important}
#jarvis-ultron-commandbar{position:absolute;z-index:20;left:32%;right:6px;bottom:22px;height:46px;display:flex;align-items:center;gap:5px;padding:6px;border:1px solid rgba(255,74,35,.5);border-radius:8px;background:linear-gradient(100deg,rgba(35,7,5,.98),rgba(8,4,8,.98));box-shadow:0 0 20px rgba(255,45,15,.14);backdrop-filter:blur(12px)}
#jarvis-ultron-commandbar input{flex:1;min-width:0;height:34px;background:#090507;border:1px solid rgba(255,91,46,.35);border-radius:5px;color:#ffe6dc;padding:0 9px;font-size:12px;outline:none}
#jarvis-ultron-commandbar button{height:34px;min-width:36px;padding:0 9px;background:#35100b;border:1px solid #b83a20;border-radius:5px;color:#ffb18a;font-size:11px;font-weight:800}
#jarvis-ultron-commandbar button:active{background:#79220f}
#jarvis-ultron-root #jarvis-ultron-bridge{display:none!important}
#jarvis-ultron-scan-modal{position:absolute;z-index:30;right:9px;top:54px;width:min(290px,calc(100% - 18px));max-height:55%;overflow:auto;padding:12px;border:1px solid rgba(255,91,45,.65);border-radius:8px;background:rgba(10,4,6,.98);box-shadow:0 0 30px rgba(255,45,20,.2);color:#ffd9ce}
#jarvis-ultron-scan-modal label{display:block;font-size:9px;letter-spacing:1px;color:#ff947b;margin-bottom:7px}
#jarvis-ultron-scan-modal input{width:100%;padding:9px;margin-bottom:8px;background:#030305;border:1px solid rgba(255,80,50,.45);border-radius:4px;color:white;font-size:12px}
#jarvis-ultron-scan-modal button{padding:7px 10px;margin:2px;background:#300d08;border:1px solid #a63720;border-radius:4px;color:#ffb6a0;font-size:10px}
#jarvis-ultron-root .uam-console{left:auto!important;right:7px!important;bottom:72px!important;top:auto!important;transform:none!important;width:min(43%,250px)!important;max-height:23%!important;z-index:16!important}
#jarvis-ultron-root .uam-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;max-height:calc(29vh - 28px)!important;overflow-y:auto!important;overscroll-behavior:contain}
@media(max-width:650px){
#jarvis-ultron-root .uz-topbar{height:42px!important}
#jarvis-ultron-root .uz-layout{height:calc(100% - 68px)!important;grid-template-columns:minmax(100px,34%) minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;gap:5px!important;padding:6px!important}
#jarvis-ultron-root .uz-categories{grid-column:1;grid-row:1}
#jarvis-ultron-root .uz-core{grid-column:2;grid-row:1;min-height:0}
#jarvis-ultron-root .uz-data{position:absolute!important;left:auto!important;right:6px!important;bottom:78px!important;top:auto!important;width:44%!important;height:21%!important;min-height:82px!important;max-height:145px!important;z-index:15!important;display:flex!important;flex-direction:column!important;background:rgba(8,3,5,.97)!important;border-color:rgba(255,65,35,.45)!important}
#jarvis-ultron-root .uz-data-head{height:23px!important;flex:0 0 23px!important;padding:6px!important;font-size:6px!important}
#jarvis-ultron-root .uz-target-row{display:none!important}
#jarvis-ultron-root .uz-results{padding:4px!important;flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important}
#jarvis-ultron-root .uz-camera{display:block!important;flex:0 0 43px!important;height:43px!important;min-height:43px!important;overflow:hidden!important}
#jarvis-ultron-root .uz-orb{top:25%!important;width:min(34vw,155px)!important;height:min(34vw,155px)!important;filter:drop-shadow(0 0 28px rgba(255,82,20,.7))!important}
#jarvis-ultron-root .uz-core-dot{width:56px!important;height:56px!important;background:radial-gradient(circle at 34% 28%,#fff9cf 0%,#ffd06b 8%,#ff8b24 23%,#c62c0b 47%,#401007 67%,#080204 78%)!important;box-shadow:inset -8px -9px 18px #1c0303,inset 5px 5px 13px #fff0a2,0 0 22px #ff6a1c,0 0 55px #e4380c,0 0 100px #9e220b!important}
#jarvis-ultron-root .uz-status{bottom:40%!important;white-space:normal!important;text-align:center!important;font-size:5px!important}
#jarvis-ultron-root .uz-footer{height:23px!important}
#jarvis-ultron-commandbar{left:32%;right:6px;bottom:22px;height:44px;padding:4px}
#jarvis-ultron-commandbar input{height:30px;font-size:11px}
#jarvis-ultron-commandbar button{height:30px;min-width:31px;padding:0 7px}
#jarvis-ultron-root #jarvis-ultron-bridge{display:none!important}
#jarvis-ultron-root .uam-console{right:6px!important;left:auto!important;bottom:78px!important;max-height:21%!important;width:44%!important;transform:none!important}
#jarvis-ultron-root .uam-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:calc(22vh - 28px)!important}
}`;
function setup(){const root=document.getElementById('jarvis-ultron-root');if(!root||document.getElementById(ID))return false;
const style=document.createElement('style');style.id=ID;style.textContent=css;document.head.appendChild(style);
const bar=document.createElement('form');bar.id='jarvis-ultron-commandbar';bar.innerHTML='<input id="uz-command" autocomplete="off" placeholder="Ask ULTRON / run public scan…"><button type="button" id="uz-voice" aria-label="Voice input">🎙</button><button type="submit" id="uz-send">SEND</button>';
root.appendChild(bar);
const bridge=document.createElement('div');bridge.id='jarvis-ultron-bridge';bridge.textContent='ULTRON // PUBLIC INTELLIGENCE ACTIVE';root.appendChild(bridge);
const modal=document.createElement('div');modal.id='jarvis-ultron-scan-modal';modal.hidden=true;root.appendChild(modal);
const names={email:'EMAIL ADDRESS',username:'PUBLIC USERNAME',phone:'PHONE NUMBER (PUBLIC METADATA ONLY)',domain:'DOMAIN NAME',ip:'PUBLIC IP ADDRESS',breach:'EMAIL ADDRESS FOR BREACH-STATUS CHECK',github:'GITHUB USER OR REPOSITORY',exposure:'DOMAIN OR PUBLIC IP'};
const needsInput=new Set(['email','username','phone','domain','ip','breach','github','exposure']);
const say=(msg)=>{if(!('speechSynthesis'in window))return;try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.rate=1.02;u.pitch=.92;window.speechSynthesis.speak(u)}catch(_){}};
const setResults=(title,items)=>{const box=root.querySelector('#uz-results');if(!box)return;box.innerHTML='<div class="uz-result"><div class="uz-result-title">'+title+'</div>'+items.map(x=>'<div class="uz-result-note">'+x+'</div>').join('')+'</div>';};
const escHtml=x=>String(x||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const autoScan=async key=>{
 const box=root.querySelector('#uz-results');if(!box)return;
 const titles={earth:'EARTH OBSERVATION',satellite:'SATELLITE TRACKING',news:'GLOBAL NEWS MONITOR',maps:'PUBLIC MAP DATA',cameras:'PUBLIC CAMERA FEEDS',aircraft:'PUBLIC AVIATION DATA',space:'SPACE / ASTRONOMY'};
 const safeLinks={
 satellite:[['CelesTrak active satellites','https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON'],['N2YO live tracking','https://www.n2yo.com/']],
 aircraft:[['ADSB.lol live aircraft map','https://globe.adsb.fi/'],['OpenSky live map','https://opensky-network.org/']],
 cameras:[['EarthCam public webcams','https://www.earthcam.com/'],['Windy public webcam map','https://www.windy.com/-Webcams/webcams'],['SkylineWebcams public cameras','https://www.skylinewebcams.com/']],
 earth:[['NASA Worldview','https://worldview.earthdata.nasa.gov/'],['USGS EarthExplorer','https://earthexplorer.usgs.gov/'],['Copernicus browser','https://browser.dataspace.copernicus.eu/']],
 news:[['GDELT live news search','https://www.gdeltproject.org/'],['Google News world','https://news.google.com/'],['Wikidata events','https://www.wikidata.org/']],
 maps:[['OpenStreetMap','https://www.openstreetmap.org/'],['OpenStreetMap public map data','https://overpass-turbo.eu/']],
 space:[['NASA image search','https://images.nasa.gov/'],['NASA missions','https://www.nasa.gov/missions/'],['NASA APIs','https://api.nasa.gov/']]
 };
 if(key==='news'){
  try{const r=await fetch('https://api.gdeltproject.org/api/v2/doc/doc?query=world&mode=ArtList&maxrecords=8&format=json');if(!r.ok)throw 0;const j=await r.json();const arr=j.articles||[];if(arr.length){setResults('GLOBAL NEWS // '+arr.length+' PUBLIC RESULTS',arr.map(x=>'<b>'+escHtml(x.title)+'</b><br>'+escHtml(x.domain||'')+' · '+escHtml(x.seendate||'')+'<br><button class="uz-source" data-url="'+escHtml(x.url)+'">OPEN ARTICLE</button>'));box.querySelectorAll('.uz-source').forEach(x=>x.onclick=()=>window.open(x.dataset.url,'_blank','noopener,noreferrer'));say('ULTRON found '+arr.length+' public news results.');return;}}catch(_){}
 }
 if(key==='satellite'){
  try{const r=await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON');if(!r.ok)throw 0;const j=await r.json();const arr=j.slice(0,8);if(arr.length){setResults('ACTIVE SATELLITES // SAMPLE '+arr.length,arr.map(x=>'<b>'+escHtml(x.NAME)+'</b><br>NORAD ID '+escHtml(x.NORAD_CAT_ID)+' · '+escHtml(x.ORBITAL_PERIOD?Math.round(x.ORBITAL_PERIOD)+' min':'orbital data') ));say('ULTRON retrieved public orbital data for '+arr.length+' active satellites.');return;}}catch(_){}
 }
 const links=safeLinks[key]||[];
 setResults((titles[key]||'PUBLIC INTELLIGENCE')+' // PUBLIC SOURCES',links.map(([n,u])=>'<b>'+escHtml(n)+'</b><br><button class="uz-source" data-url="'+escHtml(u)+'">OPEN LIVE SOURCE</button>'));
 box.querySelectorAll('.uz-source').forEach(x=>x.onclick=()=>window.open(x.dataset.url,'_blank','noopener,noreferrer'));
 if(key==='cameras'){const cam=root.querySelector('#uz-camera');if(cam)cam.innerHTML='<div class="uz-camera-head">PUBLIC WEBCAM FEEDS</div><div class="uz-camera-empty">Choose a public provider below to view its available live cameras.</div><button class="uz-source" data-url="https://www.earthcam.com/">EARTHCAM</button><button class="uz-source" data-url="https://www.windy.com/-Webcams/webcams">WINDY WEBCAMS</button><button class="uz-source" data-url="https://www.skylinewebcams.com/">SKYLINE WEBCAMS</button>';cam.querySelectorAll('.uz-source').forEach(x=>x.onclick=()=>window.open(x.dataset.url,'_blank','noopener,noreferrer'));}
 say('ULTRON public '+(titles[key]||key)+' scan is ready. Results are shown in the intelligence panel.');
};
const hideWake=()=>{document.querySelectorAll('button,[role="button"]').forEach(el=>{if(el.closest('#jarvis-ultron-root'))return;const t=(el.innerText||el.textContent||'').trim().toLowerCase();if(t.includes('enable wake word')||t==='wake word'){if(!el.hasAttribute('data-uz-old-display'))el.setAttribute('data-uz-old-display',el.style.display||'__default__');el.style.setProperty('display','none','important');}});};
hideWake();
const wakeObs=new MutationObserver(()=>{if(document.getElementById('jarvis-ultron-root'))hideWake();else{document.querySelectorAll('[data-uz-old-display]').forEach(el=>{const old=el.getAttribute('data-uz-old-display');if(old==='__default__')el.style.removeProperty('display');else el.style.display=old;el.removeAttribute('data-uz-old-display');});wakeObs.disconnect();}});
wakeObs.observe(document.body,{childList:true,subtree:true});
const label=root.querySelector('#uz-category-name');
root.querySelectorAll('.uz-cat').forEach(btn=>{btn.addEventListener('click',()=>{const key=btn.dataset.key;if(!needsInput.has(key)){modal.hidden=true;autoScan(key);return;}modal.innerHTML='<label>'+ (names[key]||'PUBLIC QUERY') +'</label><input id="uz-modal-target" autocomplete="off" placeholder="Enter '+(names[key]||'public query').toLowerCase()+'"><div><button type="button" id="uz-modal-scan">RUN SCAN</button><button type="button" id="uz-modal-cancel">CANCEL</button></div><p style="font-size:8px;color:#94736a;line-height:1.4">Public and authorized sources only. No stolen records or passwords.</p>';modal.hidden=false;const inp=modal.querySelector('input');inp.value=root.querySelector('#uz-target')?.value||'';inp.focus();modal.querySelector('#uz-modal-cancel').onclick=()=>modal.hidden=true;modal.querySelector('#uz-modal-scan').onclick=()=>{const target=inp.value.trim();if(!target){inp.focus();return;}modal.hidden=true;const main=root.querySelector('#uz-target');if(main)main.value=target;const box=root.querySelector('#uz-results');if(window.ULTRON_INTEL&&typeof window.ULTRON_INTEL.run==='function'){window.ULTRON_INTEL.run(key,target);}else{setResults('PUBLIC SCAN SOURCES', [['email','username','phone','domain','ip','breach','github','exposure'].includes(key)?'Use the public-source modules below for '+escHtml(target):'Public-source query ready']);}say('ULTRON scan started for '+key+'.');};});});
bar.addEventListener('submit',e=>{e.preventDefault();const q=bar.querySelector('input').value.trim();if(!q)return;const target=root.querySelector('#uz-target');if(target)target.value=q;const active=root.querySelector('.uz-cat.active');if(active&&needsInput.has(active.dataset.key)){if(window.ULTRON_INTEL)window.ULTRON_INTEL.run(active.dataset.key,q);else root.querySelector('#uz-run')?.click();}else autoScan(active?.dataset.key||'news');say('ULTRON is processing your query.');});
bar.querySelector('#uz-voice').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){say('Voice input is unavailable. Please type your query.');return;}const rec=new SR();rec.lang='en-IN';rec.onresult=e=>{bar.querySelector('input').value=e.results[0][0].transcript};rec.onerror=()=>say('Voice input failed. Please try again.');rec.start();});
return true;}
let tries=0;const timer=setInterval(()=>{tries++;if(setup()||tries>120)clearInterval(timer)},100);
})();
