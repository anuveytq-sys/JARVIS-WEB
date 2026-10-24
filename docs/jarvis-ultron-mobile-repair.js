/* ULTRON MOBILE HUD REPAIR — additive, scoped to ULTRON only */
(()=>{'use strict';
const ID='jarvis-ultron-mobile-repair';
const css=`
#jarvis-ultron-root{--uz-red:#ff4026;--uz-orange:#ff8b25}
#jarvis-ultron-root .uz-layout{height:calc(100% - 104px)!important;grid-template-columns:minmax(112px,22%) minmax(0,1fr) minmax(0,32%)!important;gap:7px!important;padding:8px!important;padding-bottom:8px!important}
#jarvis-ultron-root .uz-categories{min-width:0}
#jarvis-ultron-root .uz-category-list{overflow-y:auto!important;overscroll-behavior:contain}
#jarvis-ultron-root .uz-cat{padding:5px 3px!important;grid-template-columns:15px minmax(0,1fr)!important}
#jarvis-ultron-root .uz-cat b{font-size:6px!important}
#jarvis-ultron-root .uz-cat small{font-size:5px!important}
#jarvis-ultron-root .uz-data{display:flex!important;min-width:0;transform:none!important;position:relative!important;inset:auto!important;width:auto!important;height:auto!important;overflow:hidden!important}
#jarvis-ultron-root .uz-results{overflow-y:auto!important;min-height:0!important;overscroll-behavior:contain}
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
#jarvis-ultron-commandbar{position:absolute;z-index:20;left:8px;right:8px;bottom:30px;height:55px;display:flex;align-items:center;gap:5px;padding:6px;border:1px solid rgba(255,74,35,.5);border-radius:8px;background:linear-gradient(100deg,rgba(35,7,5,.98),rgba(8,4,8,.98));box-shadow:0 0 20px rgba(255,45,15,.14);backdrop-filter:blur(12px)}
#jarvis-ultron-commandbar input{flex:1;min-width:0;height:34px;background:#090507;border:1px solid rgba(255,91,46,.35);border-radius:5px;color:#ffe6dc;padding:0 9px;font-size:12px;outline:none}
#jarvis-ultron-commandbar button{height:34px;min-width:36px;padding:0 9px;background:#35100b;border:1px solid #b83a20;border-radius:5px;color:#ffb18a;font-size:11px;font-weight:800}
#jarvis-ultron-commandbar button:active{background:#79220f}
#jarvis-ultron-bridge{position:absolute;z-index:21;left:9px;bottom:91px;max-width:175px;padding:5px 7px;border:1px solid rgba(255,68,35,.55);border-radius:6px;background:rgba(24,5,5,.94);color:#ff9b80;font-size:7px;line-height:1.35;box-shadow:0 0 12px rgba(255,40,20,.12)}
#jarvis-ultron-scan-modal{position:absolute;z-index:30;right:9px;top:54px;width:min(290px,calc(100% - 18px));max-height:55%;overflow:auto;padding:12px;border:1px solid rgba(255,91,45,.65);border-radius:8px;background:rgba(10,4,6,.98);box-shadow:0 0 30px rgba(255,45,20,.2);color:#ffd9ce}
#jarvis-ultron-scan-modal label{display:block;font-size:9px;letter-spacing:1px;color:#ff947b;margin-bottom:7px}
#jarvis-ultron-scan-modal input{width:100%;padding:9px;margin-bottom:8px;background:#030305;border:1px solid rgba(255,80,50,.45);border-radius:4px;color:white;font-size:12px}
#jarvis-ultron-scan-modal button{padding:7px 10px;margin:2px;background:#300d08;border:1px solid #a63720;border-radius:4px;color:#ffb6a0;font-size:10px}
#jarvis-ultron-root .uam-console{left:50%!important;bottom:0!important;top:auto!important;transform:translateX(-50%)!important;width:min(94%,520px)!important;max-height:29%!important}
#jarvis-ultron-root .uam-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;max-height:calc(29vh - 28px)!important;overflow-y:auto!important;overscroll-behavior:contain}
@media(max-width:650px){
#jarvis-ultron-root .uz-topbar{height:42px!important}
#jarvis-ultron-root .uz-layout{height:calc(100% - 125px)!important;grid-template-columns: minmax(100px,31%) minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;gap:6px!important;padding:6px!important}
#jarvis-ultron-root .uz-categories{grid-column:1;grid-row:1}
#jarvis-ultron-root .uz-core{grid-column:2;grid-row:1;min-height:0}
#jarvis-ultron-root .uz-data{position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:34%!important;z-index:8!important;display:flex!important;background:rgba(8,3,5,.97)!important;border-color:rgba(255,65,35,.45)!important}
#jarvis-ultron-root .uz-data-head{height:23px!important;flex:0 0 23px!important;padding:6px!important;font-size:6px!important}
#jarvis-ultron-root .uz-target-row{display:none!important}
#jarvis-ultron-root .uz-results{padding:4px!important}
#jarvis-ultron-root .uz-camera{display:none!important}
#jarvis-ultron-root .uz-orb{top:25%!important;width:min(31vw,145px)!important;height:min(31vw,145px)!important}
#jarvis-ultron-root .uz-core-dot{width:48px!important;height:48px!important}
#jarvis-ultron-root .uz-status{bottom:40%!important;white-space:normal!important;text-align:center!important;font-size:5px!important}
#jarvis-ultron-root .uz-footer{height:23px!important}
#jarvis-ultron-commandbar{bottom:23px;height:48px;left:6px;right:6px;padding:5px}
#jarvis-ultron-commandbar input{height:30px;font-size:11px}
#jarvis-ultron-commandbar button{height:30px;min-width:31px;padding:0 7px}
#jarvis-ultron-bridge{bottom:75px;max-width:135px;font-size:6px}
#jarvis-ultron-root .uam-console{max-height:22%!important;width:94%!important}
#jarvis-ultron-root .uam-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:calc(22vh - 28px)!important}
}
`;
function setup(){const root=document.getElementById('jarvis-ultron-root');if(!root||document.getElementById(ID))return false;
const style=document.createElement('style');style.id=ID;style.textContent=css;document.head.appendChild(style);
const bar=document.createElement('form');bar.id='jarvis-ultron-commandbar';bar.innerHTML='<input id="uz-command" autocomplete="off" placeholder="Ask ULTRON / run public scan…"><button type="button" id="uz-voice" aria-label="Voice input">🎙</button><button type="submit" id="uz-send">SEND</button>';
root.appendChild(bar);
const bridge=document.createElement('div');bridge.id='jarvis-ultron-bridge';bridge.textContent='ULTRON // PUBLIC INTELLIGENCE ACTIVE';root.appendChild(bridge);
const modal=document.createElement('div');modal.id='jarvis-ultron-scan-modal';modal.hidden=true;root.appendChild(modal);
const names={email:'EMAIL ADDRESS',username:'USERNAME',phone:'PHONE NUMBER (PUBLIC METADATA ONLY)',domain:'DOMAIN NAME',ip:'PUBLIC IP ADDRESS',breach:'EMAIL ADDRESS FOR BREACH-STATUS CHECK',github:'GITHUB USER OR REPOSITORY',exposure:'DOMAIN OR PUBLIC IP',earth:'PLACE / EARTH-OBSERVATION QUERY',satellite:'SATELLITE NAME OR NORAD ID',news:'NEWS / EVENT QUERY',maps:'PLACE OR MAP QUERY',cameras:'PUBLIC CAMERA LOCATION',aircraft:'FLIGHT CALLSIGN OR AIRCRAFT QUERY',space:'SPACE / ASTRONOMY QUERY'};
const label=root.querySelector('#uz-category-name');
root.querySelectorAll('.uz-cat').forEach(b=>{b.addEventListener('click',()=>{const key=b.dataset.key;modal.innerHTML='<label>'+ (names[key]||'PUBLIC QUERY') +'</label><input id="uz-modal-target" autocomplete="off" placeholder="Enter '+(names[key]||'public query').toLowerCase()+'"><div><button type="button" id="uz-modal-scan">RUN SCAN</button><button type="button" id="uz-modal-cancel">CANCEL</button></div><p style="font-size:8px;color:#94736a;line-height:1.4">Public and authorized sources only. This checks public-source leads; it does not fetch stolen records, passwords, or private data.</p>';modal.hidden=false;const inp=modal.querySelector('input');inp.value=root.querySelector('#uz-target')?.value||'';inp.focus();modal.querySelector('#uz-modal-cancel').onclick=()=>modal.hidden=true;modal.querySelector('#uz-modal-scan').onclick=()=>{const target=inp.value.trim();if(!target){inp.focus();return}const main=root.querySelector('#uz-target');if(main)main.value=target;modal.hidden=true;const run=root.querySelector('#uz-run');run?.click();};});});
bar.addEventListener('submit',e=>{e.preventDefault();const q=bar.querySelector('input').value.trim();if(!q)return;const target=root.querySelector('#uz-target');if(target)target.value=q;const active=root.querySelector('.uz-cat.active');if(!active){root.querySelector('.uz-cat')?.click();}root.querySelector('#uz-run')?.click();});
bar.querySelector('#uz-voice').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){bridge.textContent='VOICE INPUT UNAVAILABLE — use the text field';return}const rec=new SR();rec.lang='en-IN';rec.onresult=e=>{bar.querySelector('input').value=e.results[0][0].transcript};rec.onerror=()=>{bridge.textContent='VOICE INPUT FAILED — try text input'};rec.start();});
return true;}
let tries=0;const timer=setInterval(()=>{tries++;if(setup()||tries>120)clearInterval(timer)},100);
})();
