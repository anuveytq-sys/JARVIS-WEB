/* JARVIS HAND ROLL FIX — additive compatibility layer.
   Keeps the existing hand tracker, pinch zoom, wake-word and voice systems intact.
   Vision Intelligence is deliberately left at its existing roll sensitivity.
*/
(()=>{'use strict';
if(window.__JARVIS_HAND_ROLL_FIX__)return;
window.__JARVIS_HAND_ROLL_FIX__=true;
const VERSION='hand-roll-fix-20261018a';
const $=(s,r=document)=>r.querySelector(s);
const visible=el=>{if(!el)return false;const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity||1)>.01&&el.getClientRects().length>0};
function env(){
 if(visible($('#terranexus-overlay'))&&($('#terranexus-overlay').classList.contains('open')||document.body.classList.contains('terranexus-active')||getComputedStyle($('#terranexus-overlay')).display!=='none'))return'terra';
 if(visible($('#velve-root')))return'velve';
 if(visible($('#jvi-root'))&&$('#jvi-root').classList.contains('open'))return'vision';
 if(visible($('#neon-nexus'))&&$('#neon-nexus').classList.contains('open'))return'command';
 const b=document.body.className||'';
 if(/gods.?eye|god.?s.?eye/i.test(b)||visible($('#gods-eye-root'))||visible($('#godseye-root')))return'gods';
 return'main';
}
function factor(e){
 if(e==='vision')return 1;
 if(e==='velve'||e==='gods')return .34;
 if(e==='terra')return .55;
 return .65;
}
function softenResults(results,tracker){
 const e=env();
 if(e==='vision')return results;
 const lm=results&&results.multiHandLandmarks&&results.multiHandLandmarks[0];
 if(!lm||!lm[5]||!lm[17]){tracker.__jhrPrev=null;return results;}
 const a=lm[5],b=lm[17],raw=Math.atan2(b.y-a.y,b.x-a.x),prev=tracker.__jhrPrev;
 tracker.__jhrPrev=raw;
 if(prev==null)return results;
 let d=Math.atan2(Math.sin(raw-prev),Math.cos(raw-prev))*factor(e);
 const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,len=Math.hypot(b.x-a.x,b.y-a.y)/2,angle=prev+d,ca=Math.cos(angle),sa=Math.sin(angle);
 const hands=results.multiHandLandmarks.map((hand,i)=>{
   if(i!==0)return hand;
   const copy=hand.map(p=>Object.assign({},p));
   copy[5]=Object.assign({},copy[5],{x:midX-len*ca,y:midY-len*sa});
   copy[17]=Object.assign({},copy[17],{x:midX+len*ca,y:midY+len*sa});
   return copy;
 });
 return Object.assign({},results,{multiHandLandmarks:hands});
}
function centerFix(){
 const e=env();
 if(e==='terra'){
   const c=$('#terranexus-overlay canvas');
   if(c)c.style.removeProperty('rotate');
   return;
 }
 if(e==='main'){
   document.querySelectorAll('.core-stage .jarvis-core-3d,.core-stage .jarvis-core-voice-hit').forEach(el=>{
     const rot=el.style.rotate;
     if(!rot)return;
     const m=el.style.transform.match(/scale\\(([^)]+)\\)/);
     const z=m?m[1]:'1';
     el.style.removeProperty('rotate');
     el.style.transform='translate(-50%,-50%) scale('+z+') rotate('+rot+')';
   });
   return;
 }
 if(e==='command'){
   const core=$('#nn-core');
   if(core&&core.style.rotate){
     const rot=core.style.rotate;
     const base=core.dataset.jhrBase!==undefined?core.dataset.jhrBase:(core.style.transform||'');
     core.dataset.jhrBase=base==='none'?'':base;
     const z=core.style.scale||'1';
     core.style.removeProperty('rotate');
     core.style.removeProperty('scale');
     core.style.transform=(core.dataset.jhrBase?core.dataset.jhrBase+' ':'')+'scale('+z+') rotate('+rot+')';
   }
   const area=$('.nn-core-area');if(area)area.style.removeProperty('rotate');
 }
}
function install(){
 if(!window.Hands||!window.Hands.prototype)return false;
 const proto=window.Hands.prototype;
 if(proto.__jhrPatched)return true;
 const original=proto.onResults;
 if(typeof original!=='function')return false;
 proto.onResults=function(cb){
   return original.call(this,function(results){
     let adjusted=results;
     try{adjusted=softenResults(results,this)}catch(e){console.warn('[JARVIS hand roll fix]',e)}
     const out=cb(adjusted);
     try{centerFix()}catch(e){console.warn('[JARVIS hand roll centering]',e)}
     return out;
   });
 };
 proto.__jhrPatched=true;
 window.__JARVIS_HAND_ROLL_FIX_VERSION__=VERSION;
 return true;
}
(function watch(){if(!install())setTimeout(watch,100);})();
(function frame(){try{if(window.__JARVIS_HAND_GESTURES__)centerFix()}catch(_){}requestAnimationFrame(frame)})();
})();
