/* JARVIS HAND GESTURE CONTROL — isolated opt-in module.
   Uses browser camera + MediaPipe Hands; no API key, no visible camera preview.
   Does not touch wake-word or voice recognition code. */
(()=>{'use strict';
if(window.__JARVIS_HAND_GESTURES__)return;window.__JARVIS_HAND_GESTURES__=true;
const VERSION='hand-gesture-zoom-20261017a';
const MODEL_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/hands/';
let active=false,starting=false,stream=null,video=null,hands=null,raf=0,lastDistance=null,lastZoom=1,lastSeen=0,lastStep=0,frameBusy=false;
const state={zoom:1,mode:'off',message:'Tap to enable hand gestures'};
const $=(s,r=document)=>r.querySelector(s);
function environment(){
 if(document.querySelector('#terranexus-overlay:not([hidden])'))return 'terra';
 if(document.querySelector('#velve-overlay:not([hidden]),#velve-root:not([hidden]),.velve-overlay:not([hidden]),body.velve-active'))return 'velve';
 if(document.querySelector('#jarvis-vision-intelligence,.jvi-overlay,.jvi-shell'))return 'vision';
 if(document.querySelector('#nn-overlay,#neon-nexus-overlay,.nn-overlay'))return 'command';
 return 'main';
}
function theme(){
 const e=environment();
 return e==='velve'?'#6dff9b':e==='terra'?'#bd83ff':e==='vision'?'#ffb45f':e==='command'?'#ff4bd8':'#00eaff';
}
function ensureUI(){
 if($('#jarvis-hand-gesture-toggle'))return;
 const style=document.createElement('style');style.id='jarvis-hand-gesture-style';style.textContent=`
 #jarvis-hand-gesture-toggle{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147483646;width:40px;height:40px;border:1px solid var(--jg-color,#00eaff);border-radius:50%;background:rgba(0,9,22,.84);color:var(--jg-color,#00eaff);box-shadow:0 0 10px color-mix(in srgb,var(--jg-color,#00eaff) 35%,transparent),inset 0 0 10px rgba(255,255,255,.035);display:grid;place-items:center;font:700 17px/1 system-ui;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:box-shadow .2s,transform .2s,background .2s;touch-action:manipulation}
 #jarvis-hand-gesture-toggle:active{transform:scale(.94)}
 #jarvis-hand-gesture-toggle[aria-pressed=true]{background:color-mix(in srgb,var(--jg-color,#00eaff) 16%,rgba(0,9,22,.92));box-shadow:0 0 8px var(--jg-color),0 0 24px color-mix(in srgb,var(--jg-color) 35%,transparent)}
 #jarvis-hand-gesture-toggle .jg-dot{position:absolute;right:0;top:0;width:8px;height:8px;border-radius:50%;background:#697887;border:1px solid #07101b}
 #jarvis-hand-gesture-toggle[aria-pressed=true] .jg-dot{background:#50ff9c;box-shadow:0 0 8px #50ff9c}
 #jarvis-hand-gesture-status{position:fixed;right:62px;bottom:calc(21px + env(safe-area-inset-bottom,0px));z-index:2147483645;max-width:min(70vw,270px);padding:7px 10px;border:1px solid var(--jg-color,#00eaff);border-radius:7px;background:rgba(0,8,18,.88);color:#dffaff;font:10px/1.35 system-ui;letter-spacing:.06em;box-shadow:0 0 12px rgba(0,0,0,.3);pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
 #jarvis-hand-gesture-status.show{opacity:1;transform:translateY(0)}
 #jarvis-hand-gesture-video{position:fixed!important;left:-4px!important;top:-4px!important;width:2px!important;height:2px!important;opacity:.001!important;pointer-events:none!important;z-index:-1!important}
 .core-stage{scale:var(--jarvis-hand-zoom,1)}
 #nn-core{scale:var(--jarvis-hand-zoom,1)}
 #terranexus-overlay .tn-center canvas{transform:scale(var(--jarvis-hand-zoom,1));transform-origin:center;transition:transform .08s linear}
 #jarvis-vision-intelligence .jvi-cam-box video,#jarvis-vision-intelligence .jvi-cam-box canvas,.jvi-cam-box video,.jvi-cam-box canvas{transform:scale(var(--jarvis-hand-zoom,1));transform-origin:center;transition:transform .08s linear}
 @media(max-width:600px){#jarvis-hand-gesture-toggle{right:9px;bottom:calc(9px + env(safe-area-inset-bottom,0px));width:36px;height:36px}#jarvis-hand-gesture-status{right:52px;bottom:calc(16px + env(safe-area-inset-bottom,0px))}}
 `;
 document.head.appendChild(style);
 const b=document.createElement('button');b.id='jarvis-hand-gesture-toggle';b.type='button';b.setAttribute('aria-label','Enable hand gesture zoom');b.setAttribute('aria-pressed','false');b.title='Hand gesture zoom · no API key required';b.innerHTML='<span aria-hidden="true">✋</span><i class="jg-dot"></i>';
 const status=document.createElement('div');status.id='jarvis-hand-gesture-status';status.setAttribute('role','status');status.textContent=state.message;
 document.body.append(b,status);
 b.addEventListener('click',()=>active?stop('Hand gesture control off'):start());
}
function showStatus(message,sticky=false){
 const el=$('#jarvis-hand-gesture-status');if(!el)return;el.textContent=message;el.classList.add('show');if(!sticky){clearTimeout(showStatus.timer);showStatus.timer=setTimeout(()=>el.classList.remove('show'),2300);}
}
function setTheme(){const c=theme();const b=$('#jarvis-hand-gesture-toggle'),s=$('#jarvis-hand-gesture-status');if(b)b.style.setProperty('--jg-color',c);if(s)s.style.setProperty('--jg-color',c);if(b){b.title=active?'Hand gesture zoom is on · pinch apart to zoom in':'Hand gesture zoom · no API key required';}}
function setButton(on){const b=$('#jarvis-hand-gesture-toggle');if(!b)return;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Disable hand gesture zoom':'Enable hand gesture zoom');b.innerHTML=(on?'<span aria-hidden="true">🤏</span>':'<span aria-hidden="true">✋</span>')+'<i class="jg-dot"></i>';setTheme();}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function currentTarget(){
 const e=environment();
 if(e==='velve')return $('#velve-overlay canvas, #velve-root canvas, .velve-overlay canvas, #velve-globe canvas, canvas.cesium-widget');
 if(e==='terra')return $('#terranexus-overlay canvas');
 if(e==='vision')return $('.jvi-cam-box video, .jvi-cam-box canvas');
 if(e==='command')return $('#nn-core');
 return $('.core-stage')||$('.jarvis-core-3d');
}
function applyZoom(next,delta){
 next=Math.max(.72,Math.min(1.85,next));if(Math.abs(next-lastZoom)<.003)return;lastZoom=next;state.zoom=next;
 const e=environment();
 if(e==='velve'){
   const target=currentTarget();if(target){const rect=target.getBoundingClientRect();target.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,deltaY:delta<0?-100:100,deltaMode:0}));}
   else document.documentElement.style.setProperty('--jarvis-hand-zoom',String(next));
 }else{
   const target=currentTarget();
   if(target){target.style.setProperty('--jarvis-hand-zoom',String(next));target.style.scale=String(next);}
   document.documentElement.style.setProperty('--jarvis-hand-zoom',String(next));
 }
 const b=$('#jarvis-hand-gesture-toggle');if(b)b.style.boxShadow='0 0 9px '+theme()+',0 0 24px '+theme()+'66';
}
function onResults(results){
 if(!active)return;
 const lm=results.multiHandLandmarks&&results.multiHandLandmarks[0];
 if(!lm){if(Date.now()-lastSeen>1800)lastDistance=null;return;}
 lastSeen=Date.now();
 const d=distance(lm[4],lm[8]);
 if(lastDistance!==null){
   const change=d-lastDistance;
   if(Math.abs(change)>.012&&Date.now()-lastStep>85){
     // Thumb/index spread apart zooms in; pinching together zooms out.
     applyZoom(lastZoom+(change>0?1:-1)*Math.min(.055,Math.abs(change)*.72),change>0?-1:1);
     lastStep=Date.now();
   }
 }
 lastDistance=d;
}
function loadScript(src){
 return new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){if(window.Hands)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load hand-tracking model'));document.head.appendChild(s);});
}
async function start(){
 if(active||starting)return;starting=true;setButton(false);showStatus('Requesting camera permission…',true);
 try{
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Camera needs HTTPS and browser permission.');
   await loadScript(MODEL_BASE+'hands.js');
   if(!window.Hands)throw new Error('Hand-tracking model did not load. Check internet and try again.');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
   video=document.createElement('video');video.id='jarvis-hand-gesture-video';video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');video.srcObject=stream;document.body.appendChild(video);await video.play();
   hands=new window.Hands({locateFile:file=>MODEL_BASE+file});hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.62,minTrackingConfidence:.58});hands.onResults(onResults);
   active=true;lastDistance=null;lastSeen=Date.now();setButton(true);showStatus('HAND TRACKING ONLINE · pinch apart to zoom in',true);
   const loop=async()=>{if(!active||!video)return;if(!frameBusy&&video.readyState>=2){frameBusy=true;try{await hands.send({image:video});}catch(e){console.warn('[JARVIS gestures]',e);}finally{frameBusy=false;}}if(active)raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);
 }catch(e){console.warn('[JARVIS gestures]',e);cleanup(false);setButton(false);showStatus(e&&e.message?e.message:'Camera or hand tracking unavailable.');}
 finally{starting=false;}
}
function cleanup(resetZoom=true){
 active=false;cancelAnimationFrame(raf);raf=0;lastDistance=null;frameBusy=false;
 try{if(hands){hands.close();}}catch(_){}hands=null;
 if(video){try{video.pause();video.srcObject=null;video.remove();}catch(_){}video=null;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 if(resetZoom){lastZoom=1;state.zoom=1;document.documentElement.style.removeProperty('--jarvis-hand-zoom');document.querySelectorAll('[style*="--jarvis-hand-zoom"]').forEach(el=>el.style.removeProperty('--jarvis-hand-zoom'));document.querySelectorAll('.core-stage,#nn-core,#terranexus-overlay canvas,.jvi-cam-box video,.jvi-cam-box canvas').forEach(el=>el.style.removeProperty('scale'));}
}
function stop(message='Hand gesture control off'){cleanup(true);setButton(false);showStatus(message);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('Gesture camera paused while page is hidden. Tap to enable again.');});
const observe=new MutationObserver(()=>setTheme());observe.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUI();setTheme();},{once:true});else{ensureUI();setTheme();}
setInterval(()=>{if($('#jarvis-hand-gesture-toggle'))setTheme();},1600);
window.JARVISHandGestures={start,stop,get active(){return active;},version:VERSION};
})();