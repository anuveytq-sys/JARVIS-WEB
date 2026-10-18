/* JARVIS HAND ROTATION — additive layer for the existing hand-tracking pipeline.
   Reuses the already-running MediaPipe Hands instance; no second camera, recognizer,
   wake-word engine, or voice system. Rotation is deliberately separate from zoom. */
(()=>{'use strict';
if(window.__JARVIS_HAND_ROTATION__)return;window.__JARVIS_HAND_ROTATION__=true;
const VERSION='hand-rotation-20261018a';
let installed=false,lastAngle=null,rotation=0,lastEnv='',lastTime=0;
const SPEED=1.65,DEAD=.012,MAX_STEP=.18;
const $=(s,r=document)=>r.querySelector(s);
const visible=el=>{if(!el)return false;const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity||1)>.01&&el.getClientRects().length>0};
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
function env(){
 if(visible($('#terranexus-overlay'))&&($('#terranexus-overlay').classList.contains('open')||document.body.classList.contains('terranexus-active')))return'terra';
 if(visible($('#velve-root')))return'velve';
 if(visible($('#jvi-root'))&&$('#jvi-root').classList.contains('open'))return'vision';
 if(visible($('#neon-nexus'))&&$('#neon-nexus').classList.contains('open'))return'command';
 const b=document.body.className||'';
 if(/gods.?eye|god.?s.?eye/i.test(b)||visible($('#gods-eye-root'))||visible($('#godseye-root')))return'gods';
 return'main';
}
function reset(){lastAngle=null;lastTime=0;lastEnv=env()}
function rotateCss(el,deg,base=''){
 if(!el)return;
 el.style.setProperty('--jarvis-hand-rotation',deg.toFixed(3)+'deg');
 el.style.transformOrigin='50% 50%';
 el.style.setProperty('rotate',deg.toFixed(3)+'deg');
}
function rotateEnvironment(delta){
 const e=env();
 if(e!==lastEnv){lastEnv=e;reset();return}
 rotation+=delta*180/Math.PI;
 if(rotation>360||rotation<-360)rotation%=360;
 if(e==='terra'){try{if(typeof window.__TERRANEXUS_HAND_ROTATE==='function'){window.__TERRANEXUS_HAND_ROTATE(delta);return}}catch(_){}const c=$('#terranexus-overlay canvas');if(c)rotateCss(c,rotation);return}
 if(e==='velve'){
   try{const v=window.__VELVE_VIEWER;if(v&&v.camera&&typeof v.camera.rotateRight==='function'){v.camera.rotateRight(-delta*SPEED);return}}catch(_){}
   const g=$('#velve-globe canvas');if(g)rotateCss(g,rotation);return;
 }
 if(e==='vision'){
   rotateCss($('.jvi-core-orb'),rotation);rotateCss($('.jvi-holo'),rotation);rotateCss($('.jvi-neural-network'),rotation);return;
 }
 if(e==='command'){
   rotateCss($('#nn-core'),rotation);const area=$('.nn-core-area');if(area)rotateCss(area,rotation);return;
 }
 if(e==='gods'){
   try{const v=window.__GODS_EYE_VIEWER||window.__GODSEYE_VIEWER;if(v?.camera?.rotateRight){v.camera.rotateRight(-delta*SPEED);return}}catch(_){}
   const g=$('#gods-eye-globe canvas,#gods-eye-root canvas,#godseye-root canvas')[0];if(g)rotateCss(g,rotation);return;
 }
 const reactor=$('.core-stage .jarvis-core-3d'),hit=$('.core-stage .jarvis-core-voice-hit');
 rotateCss(reactor,rotation);rotateCss(hit,rotation);
}
function results(r){
 if(!window.JARVISHandGestures?.active)return;
 const lm=r&&r.multiHandLandmarks&&r.multiHandLandmarks[0];if(!lm){lastAngle=null;return;}
 const a=lm[5],b=lm[17];if(!a||!b)return;
 const angle=Math.atan2(b.y-a.y,b.x-a.x);
 if(lastAngle===null){lastAngle=angle;lastTime=performance.now();lastEnv=env();return;}
 const now=performance.now(),dt=Math.max(1,now-lastTime);lastTime=now;
 let d=norm(angle-lastAngle);lastAngle=angle;
 if(Math.abs(d)<DEAD)return;
 d=Math.max(-MAX_STEP,Math.min(MAX_STEP,d));
 const scaled=d*Math.min(1.8,dt/16.67)*SPEED;
 rotateEnvironment(scaled);
}
function install(){
 if(installed||!window.Hands||!window.Hands.prototype)return false;
 const proto=window.Hands.prototype,original=proto.onResults;if(typeof original!=='function')return false;
 proto.onResults=function(cb){return original.call(this,function(r){try{results(r)}catch(e){console.warn('[JARVIS hand rotation]',e)}return cb(r)})};
 installed=true;window.__JARVIS_HAND_ROTATION_VERSION__=VERSION;return true;
}
function watch(){if(install())return;setTimeout(watch,150)}
function boot(){reset();watch()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.JARVISHandRotation={version:VERSION,reset};
})();