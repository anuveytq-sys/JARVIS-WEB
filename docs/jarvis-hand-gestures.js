/* JARVIS HAND GESTURE CONTROL — isolated opt-in local hand tracking.
   Smooth pinch zoom + additive hand-roll rotation for Main HUD, VELVE, TERRANEXUS,
   Command Centre, Vision Intelligence and compatible Gods Eye surfaces.
   No API key. Does not alter wake-word or voice code. */
(()=>{'use strict';
if(window.__JARVIS_HAND_GESTURES__)return;window.__JARVIS_HAND_GESTURES__=true;
const VERSION='hand-gesture-zoom-20261018c',MODEL_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/hands/';
let active=false,starting=false,stream=null,video=null,hands=null,raf=0,frameBusy=false;
let anchorDistance=0,anchorZoom=1,targetZoom=1,currentZoom=1,lastAppliedZoom=1,lastSeen=0,lastEnv='';
let handRollAngle=null,handRotation=0;
const MIN_ZOOM=.72,MAX_ZOOM=2.05,ROLL_DEAD=.010,ROLL_MAX=.16,ROLL_SPEED=1.75;
const $=(s,r=document)=>r.querySelector(s);
const visible=el=>{if(!el)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>.01&&el.getClientRects().length>0;};
const normAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function environment(){
 if(visible($('#terranexus-overlay'))&&($('#terranexus-overlay').classList.contains('open')||document.body.classList.contains('terranexus-active')||getComputedStyle($('#terranexus-overlay')).display!=='none'))return 'terra';
 if(visible($('#velve-root')))return 'velve';
 if(visible($('#jvi-root'))&&$('#jvi-root').classList.contains('open'))return 'vision';
 if(visible($('#neon-nexus'))&&$('#neon-nexus').classList.contains('open'))return 'command';
 const bodyClass=document.body.className||'';
 if(/gods.?eye|god.?s.?eye/i.test(bodyClass)||visible($('#gods-eye-root'))||visible($('#godseye-root')))return 'gods';
 return 'main';
}
function theme(){return ({main:'#00aaff',velve:'#ff303b',terra:'#ffad42',command:'#ff36df',vision:'#168cff',gods:'#00d9ff'})[environment()]||'#00aaff';}
function ensureUI(){
 if($('#jarvis-hand-gesture-toggle'))return;
 const style=document.createElement('style');style.id='jarvis-hand-gesture-style';style.textContent=`
 #jarvis-hand-gesture-toggle{position:fixed;left:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483646;width:38px;height:38px;border:1px solid var(--jg-color,#00aaff);border-radius:50%;background:rgba(0,9,22,.86);color:var(--jg-color,#00aaff);box-shadow:0 0 10px color-mix(in srgb,var(--jg-color,#00aaff) 40%,transparent),inset 0 0 10px rgba(255,255,255,.035);display:grid;place-items:center;font:700 18px/1 system-ui;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:box-shadow .18s,background .18s;touch-action:manipulation;padding:0}
 #jarvis-hand-gesture-toggle:active{filter:brightness(1.25)}
 #jarvis-hand-gesture-toggle[aria-pressed=true]{background:color-mix(in srgb,var(--jg-color,#00aaff) 18%,rgba(0,9,22,.94));box-shadow:0 0 9px var(--jg-color),0 0 22px color-mix(in srgb,var(--jg-color) 38%,transparent)}
 #jarvis-hand-gesture-toggle .jg-icon{color:var(--jg-color,#00aaff);font-size:19px;line-height:1}
 #jarvis-hand-gesture-toggle .jg-dot{position:absolute;right:-1px;top:-1px;width:7px;height:7px;border-radius:50%;background:#667482;border:1px solid #07101b}
 #jarvis-hand-gesture-toggle[aria-pressed=true] .jg-dot{background:#50ff9c;box-shadow:0 0 8px #50ff9c}
 #jarvis-hand-gesture-status{position:fixed;left:58px;top:calc(17px + env(safe-area-inset-top,0px));z-index:2147483645;max-width:min(72vw,290px);padding:7px 10px;border:1px solid var(--jg-color,#00aaff);border-radius:7px;background:rgba(0,8,18,.9);color:#e7faff;font:10px/1.4 system-ui;letter-spacing:.055em;box-shadow:0 0 12px rgba(0,0,0,.3);pointer-events:none;opacity:0;transform:translateY(-3px);transition:opacity .18s,transform .18s}
 #jarvis-hand-gesture-status.show{opacity:1;transform:translateY(0)}
 #jarvis-hand-gesture-video{position:fixed!important;left:-4px!important;top:-4px!important;width:2px!important;height:2px!important;opacity:.001!important;pointer-events:none!important;z-index:-1!important}
 @media(max-width:600px){#jarvis-hand-gesture-toggle{left:8px;top:calc(8px + env(safe-area-inset-top,0px));width:35px;height:35px}#jarvis-hand-gesture-status{left:49px;top:calc(12px + env(safe-area-inset-top,0px))}}
 `;document.head.appendChild(style);
 const b=document.createElement('button');b.id='jarvis-hand-gesture-toggle';b.type='button';b.setAttribute('aria-label','Enable hand gesture zoom and rotation');b.setAttribute('aria-pressed','false');b.title='Hand gesture control · pinch to zoom · roll hand to rotate';b.innerHTML='<svg class="jg-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 11V5.7a1.6 1.6 0 0 1 3.2 0V10"/><path d="M10.7 10V4.9a1.6 1.6 0 0 1 3.2 0V10"/><path d="M13.9 10V6.3a1.6 1.6 0 0 1 3.2 0v7.1l1-1.4a1.7 1.7 0 0 1 2.8 1.9l-3.2 5a4.5 4.5 0 0 1-3.8 2.1h-2.2a4.8 4.8 0 0 1-3.8-1.9L4.6 15a1.7 1.7 0 0 1 2.7-2.1L9 15"/><path d="M10.7 10v3"/></svg><i class="jg-dot"></i>';
 const status=document.createElement('div');status.id='jarvis-hand-gesture-status';status.setAttribute('role','status');status.textContent='Tap to enable hand gestures';
 document.body.append(b,status);b.addEventListener('click',()=>active?stop('Hand gesture control off'):start());
}
function showStatus(message,sticky=false){const el=$('#jarvis-hand-gesture-status');if(!el)return;el.textContent=message;el.classList.add('show');if(!sticky){clearTimeout(showStatus.timer);showStatus.timer=setTimeout(()=>el.classList.remove('show'),2600);}}
function setTheme(){const c=theme(),b=$('#jarvis-hand-gesture-toggle'),s=$('#jarvis-hand-gesture-status');if(b)b.style.setProperty('--jg-color',c);if(s)s.style.setProperty('--jg-color',c);}
function setButton(on){const b=$('#jarvis-hand-gesture-toggle');if(!b)return;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Disable hand gesture control':'Enable hand gesture control');b.querySelector('.jg-icon').style.color=theme();setTheme();}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function scaleElement(el,value){if(!el)return;el.style.transformOrigin='center center';el.style.transition='none';el.style.scale=String(value);}
function rotateCss(el,deg){if(!el)return;el.style.transformOrigin='50% 50%';el.style.setProperty('rotate',deg.toFixed(3)+'deg');}
function rotateEnvironment(delta){
 const e=environment();
 if(e!==lastEnv){lastEnv=e;handRollAngle=null;return;}
 handRotation+=delta*180/Math.PI;if(handRotation>360||handRotation<-360)handRotation%=360;
 if(e==='terra'){
   try{if(typeof window.__TERRANEXUS_HAND_ROTATE==='function'){window.__TERRANEXUS_HAND_ROTATE(delta);return}}catch(_){}
   rotateCss($('#terranexus-overlay canvas'),handRotation);return;
 }
 if(e==='velve'){
   try{const v=window.__VELVE_VIEWER;if(v&&v.camera&&typeof v.camera.rotateRight==='function'){v.camera.rotateRight(-delta*ROLL_SPEED);return}}catch(_){}
   rotateCss($('#velve-globe canvas'),handRotation);return;
 }
 if(e==='vision'){
   rotateCss($('.jvi-core-orb'),handRotation);rotateCss($('.jvi-holo'),handRotation);rotateCss($('.jvi-neural-network'),handRotation);return;
 }
 if(e==='command'){
   rotateCss($('#nn-core'),handRotation);rotateCss($('.nn-core-area'),handRotation);return;
 }
 if(e==='gods'){
   try{const v=window.__GODS_EYE_VIEWER||window.__GODSEYE_VIEWER;if(v&&v.camera&&typeof v.camera.rotateRight==='function'){v.camera.rotateRight(-delta*ROLL_SPEED);return}}catch(_){}
   const g=$('#gods-eye-globe canvas')||$('#gods-eye-root canvas')||$('#godseye-root canvas');rotateCss(g,handRotation);return;
 }
 rotateCss($('.core-stage .jarvis-core-3d'),handRotation);rotateCss($('.core-stage .jarvis-core-voice-hit'),handRotation);
}
function updateHandRoll(lm){
 const a=lm[5],b=lm[17];if(!a||!b)return;
 const angle=Math.atan2(b.y-a.y,b.x-a.x);
 if(handRollAngle===null){handRollAngle=angle;return;}
 let d=normAngle(angle-handRollAngle);handRollAngle=angle;
 if(Math.abs(d)<ROLL_DEAD)return;
 d=Math.max(-ROLL_MAX,Math.min(ROLL_MAX,d));
 rotateEnvironment(d*ROLL_SPEED);
}
function applyVisualZoom(value){
 const e=environment();
 if(e==='velve'){
   const viewer=window.__VELVE_VIEWER;
   if(viewer&&viewer.camera){
     const delta=value/lastAppliedZoom;
     if(Math.abs(delta-1)>.00015){const height=viewer.camera.positionCartographic.height;const amount=Math.max(35,height*Math.min(.055,Math.abs(Math.log(delta))*2.25));if(delta>1)viewer.camera.zoomIn(amount);else viewer.camera.zoomOut(amount);}
   }else{const globe=$('#velve-globe canvas');if(globe)scaleElement(globe,value);}
 }else if(e==='terra'){
   const bridge=window.__TERRANEXUS_HAND_ZOOM;
   if(typeof bridge==='function'){const ratio=value/lastAppliedZoom;if(Math.abs(ratio-1)>.00015)bridge(ratio);}
   else {const c=$('#terranexus-overlay canvas');if(c)scaleElement(c,value);}
 }else if(e==='command'){
   scaleElement($('#nn-core'),value);
   const area=$('.nn-core-area');if(area)area.style.setProperty('--jg-core-zoom',String(value));
 }else if(e==='vision'){
   const orb=$('.jvi-core-orb');if(orb)scaleElement(orb,value);
   const holo=$('.jvi-holo');if(holo)scaleElement(holo,value);
   const neural=$('.jvi-neural-network');if(neural)scaleElement(neural,value);
 }else{
   const stage=$('.core-stage');
   if(stage){
     const reactor=stage.querySelector('.jarvis-core-3d');
     if(reactor){reactor.style.transformOrigin='50% 50%';reactor.style.transform='translate(-50%,-50%) scale('+value+')';}
     const hit=stage.querySelector('.jarvis-core-voice-hit');
     if(hit){hit.style.transformOrigin='50% 50%';hit.style.transform='translate(-50%,-50%) scale('+value+')';}
   }else{
     const core=$('.jarvis-core-3d');if(core){core.style.transformOrigin='50% 50%';core.style.transform='translate(-50%,-50%) scale('+value+')';}
   }
 }
 lastAppliedZoom=value;
}
function animate(){
 if(!active)return;
 const eased=1-Math.exp(-Math.min(50,Math.max(0,performance.now()-(animate.last||performance.now())))/72);
 animate.last=performance.now();
 const before=currentZoom;currentZoom+=(targetZoom-currentZoom)*eased;
 if(Math.abs(targetZoom-currentZoom)<.001)currentZoom=targetZoom;
 if(Math.abs(currentZoom-before)>.00015)applyVisualZoom(currentZoom);
 raf=requestAnimationFrame(animate);
}
function onResults(results){
 if(!active)return;const lm=results.multiHandLandmarks&&results.multiHandLandmarks[0];
 if(!lm){if(Date.now()-lastSeen>1300)anchorDistance=0;handRollAngle=null;return;}
 lastSeen=Date.now();
 updateHandRoll(lm);
 const d=distance(lm[4],lm[8]);
 if(!anchorDistance){anchorDistance=d;anchorZoom=targetZoom;return;}
 const ratio=d/anchorDistance;
 if(ratio>.48&&ratio<2.35){const mapped=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,anchorZoom*Math.pow(ratio,1.18)));targetZoom=targetZoom*.28+mapped*.72;}
 if(targetZoom>=MAX_ZOOM-.015||targetZoom<=MIN_ZOOM+.015){anchorDistance=d;anchorZoom=targetZoom;}
}
function loadScript(src){return new Promise((resolve,reject)=>{if(window.Hands)return resolve();const old=[...document.scripts].find(s=>s.src===src);if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load hand-tracking model. Check your internet connection.'));document.head.appendChild(s);});}
async function start(){
 if(active||starting)return;starting=true;setButton(false);showStatus('Requesting camera permission…',true);
 try{
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Camera needs HTTPS and browser permission.');
   await loadScript(MODEL_BASE+'hands.js');
   if(!window.Hands)throw new Error('Hand-tracking model did not load. Check internet and try again.');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
   video=document.createElement('video');video.id='jarvis-hand-gesture-video';video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');video.srcObject=stream;document.body.appendChild(video);await video.play();
   hands=new window.Hands({locateFile:file=>MODEL_BASE+file});hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.58,minTrackingConfidence:.52});hands.onResults(onResults);
   active=true;anchorDistance=0;anchorZoom=targetZoom=currentZoom=lastAppliedZoom=1;handRollAngle=null;handRotation=0;lastSeen=Date.now();lastEnv=environment();setButton(true);showStatus('HAND TRACKING ONLINE · pinch to zoom · roll hand to rotate',true);
   animate.last=performance.now();raf=requestAnimationFrame(animate);
   const loop=async()=>{if(!active||!video)return;if(!frameBusy&&video.readyState>=2){frameBusy=true;try{await hands.send({image:video});}catch(e){console.warn('[JARVIS gestures]',e);}finally{frameBusy=false;}}if(active)window.__JARVIS_HANDS_INFERENCE_RAF=requestAnimationFrame(loop);};window.__JARVIS_HANDS_INFERENCE_RAF=requestAnimationFrame(loop);
 }catch(e){console.warn('[JARVIS gestures]',e);cleanup(false);setButton(false);showStatus(e&&e.message?e.message:'Camera or hand tracking unavailable.');}
 finally{starting=false;}
}
function cleanup(resetZoom=true){
 active=false;cancelAnimationFrame(raf);cancelAnimationFrame(window.__JARVIS_HANDS_INFERENCE_RAF);raf=0;window.__JARVIS_HANDS_INFERENCE_RAF=0;frameBusy=false;anchorDistance=0;handRollAngle=null;handRotation=0;
 try{if(hands)hands.close();}catch(_){}hands=null;
 if(video){try{video.pause();video.srcObject=null;video.remove();}catch(_){}video=null;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 if(resetZoom){targetZoom=currentZoom=anchorZoom=lastAppliedZoom=1;document.documentElement.style.removeProperty('--jg-core-zoom');document.querySelectorAll('.core-stage').forEach(el=>{const reactor=el.querySelector('.jarvis-core-3d');if(reactor){reactor.style.removeProperty('transform');reactor.style.removeProperty('transform-origin');reactor.style.removeProperty('rotate')}const hit=el.querySelector('.jarvis-core-voice-hit');if(hit){hit.style.removeProperty('transform');hit.style.removeProperty('transform-origin');hit.style.removeProperty('rotate')}});document.querySelectorAll('#nn-core,.nn-core-area,.jvi-core-orb,.jvi-holo,.jvi-neural-network,#velve-globe canvas,#terranexus-overlay canvas,#gods-eye-globe canvas,#gods-eye-root canvas,#godseye-root canvas').forEach(el=>{el.style.removeProperty('scale');el.style.removeProperty('rotate');if(el.style.transition==='none')el.style.removeProperty('transition');if(el.style.transformOrigin==='center center')el.style.removeProperty('transform-origin');});}
}
function stop(message='Hand gesture control off'){cleanup(true);setButton(false);showStatus(message);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('Gesture camera paused while page is hidden. Tap to enable again.');});
const observe=new MutationObserver(()=>{setTheme();const e=environment();if(e!==lastEnv){lastEnv=e;anchorDistance=0;anchorZoom=targetZoom=currentZoom;lastAppliedZoom=currentZoom;handRollAngle=null;handRotation=0;}});observe.observe(document.documentElement,{attributes:true,attributeFilter:['class']});observe.observe(document.body,{attributes:true,attributeFilter:['class']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUI();setTheme();},{once:true});else{ensureUI();setTheme();}
setInterval(()=>{if($('#jarvis-hand-gesture-toggle'))setTheme();},700);
window.JARVISHandGestures={start,stop,get active(){return active;},get zoom(){return currentZoom;},version:VERSION};
})();