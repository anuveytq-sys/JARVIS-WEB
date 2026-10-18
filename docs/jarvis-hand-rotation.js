/* JARVIS HAND ROTATION — compatibility layer for the existing hand-tracking pipeline.
   It does NOT create another camera/tracker. It gently reduces roll sensitivity in
   the environments that need it and keeps the existing gesture physics untouched.
   Vision Intelligence is intentionally left at full sensitivity. */
(()=>{'use strict';
if(window.__JARVIS_HAND_ROTATION__)return;window.__JARVIS_HAND_ROTATION__=true;
const VERSION='hand-rotation-20261018d';
let installed=false,lastRaw=null,lastAdjusted=null,lastEnv='';
const $=(s,r=document)=>r.querySelector(s);
const visible=el=>{if(!el)return false;const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity||1)>.01&&el.getClientRects().length>0};
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
function env(){
 if(visible($('#terranexus-overlay'))&&($('#terranexus-overlay').classList.contains('open')||document.body.classList.contains('terranexus-active')||getComputedStyle($('#terranexus-overlay')).display!=='none'))return'terra';
 if(visible($('#velve-root')))return'velve';
 if(visible($('#jvi-root'))&&$('#jvi-root').classList.contains('open'))return'vision';
 if(visible($('#neon-nexus'))&&$('#neon-nexus').classList.contains('open'))return'command';
 const b=document.body.className||'';
 if(/gods.?eye|god.?s.?eye/i.test(b)||visible($('#gods-eye-root'))||visible($('#godseye-root')))return'gods';
 return'main';
}
function factor(e){return e==='vision'?1:e==='velve'||e==='gods'?.22:e==='command'||e==='main'?.34:.30}
function reset(){lastRaw=null;lastAdjusted=null;lastEnv=env()}
function softenLandmarks(r){
 const e=env();
 if(e!==lastEnv)reset();
 const lm=r&&r.multiHandLandmarks&&r.multiHandLandmarks[0];
 if(!lm||!lm[5]||!lm[17]){lastRaw=null;lastAdjusted=null;return r}
 const a=lm[5],b=lm[17],raw=Math.atan2(b.y-a.y,b.x-a.x);
 if(lastRaw===null){lastRaw=raw;lastAdjusted=raw;lastEnv=e;return r}
 const d=norm(raw-lastRaw);lastRaw=raw;
 const adjusted=lastAdjusted+norm(d)*factor(e);lastAdjusted=adjusted;
 const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,len=Math.hypot(b.x-a.x,b.y-a.y)/2;
 const ca=Math.cos(adjusted),sa=Math.sin(adjusted);
 const out=Object.assign({},r,{multiHandLandmarks:r.multiHandLandmarks.map((hand,i)=>{
   if(i!==0)return hand;
   const copy=hand.map(p=>Object.assign({},p));
   copy[5]=Object.assign({},copy[5],{x:midX-len*ca,y:midY-len*sa});
   copy[17]=Object.assign({},copy[17],{x:midX+len*ca,y:midY+len*sa});
   return copy;
 })});
 return out;
}
function fixMainCore(){
 const e=env();
 if(e==='main'){
   const z=Math.max(.72,Math.min(2.05,Number(window.JARVISHandGestures?.zoom)||1));
   const r=$('.core-stage .jarvis-core-3d'),h=$('.core-stage .jarvis-core-voice-hit');
   const deg=Number(document.documentElement.style.getPropertyValue('--jarvis-hand-rotation').replace('deg',''))||0;
   [r,h].forEach(el=>{if(!el)return;el.style.removeProperty('rotate');el.style.transformOrigin='50% 50%';el.style.transform='translate(-50%,-50%) scale('+z+') rotate('+deg+'deg)';});
 }
 if(e==='command'){
   const core=$('#nn-core');if(core){const deg=Number(core.dataset.jarvisRollDeg)||0;core.style.removeProperty('rotate');const base=core.dataset.jarvisRollBase||getComputedStyle(core).transform;core.dataset.jarvisRollBase=base;core.style.transform=(base==='none'?'':base+' ')+'rotate('+deg+'deg)';}
   const area=$('.nn-core-area');if(area)area.style.removeProperty('rotate');
 }
 if(e==='terra'){
   /* Never rotate the workshop/canvas itself. Only use an explicitly exposed
      simulation target/bridge; otherwise leave the workshop stationary. */
   const c=$('#terranexus-overlay canvas');if(c){c.style.removeProperty('rotate');c.style.removeProperty('--jarvis-hand-rotation');}
 }
}
function install(){
 if(installed||!window.Hands?.prototype)return false;
 const proto=window.Hands.prototype,original=proto.onResults;
 if(typeof original!=='function')return false;
 proto.onResults=function(cb){return original.call(this,function(r){
   const e=env();
   let rr=r;
   try{rr=softenLandmarks(r)}catch(err){console.warn('[JARVIS hand rotation]',err)}
   const out=cb(rr);
   try{fixMainCore()}catch(err){console.warn('[JARVIS hand rotation correction]',err)}
   return out;
 })};
 installed=true;window.__JARVIS_HAND_ROTATION_VERSION__=VERSION;return true;
}
function watch(){if(install())return;setTimeout(watch,150)}
function boot(){reset();watch()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.JARVISHandRotation={version:VERSION,reset};
})();