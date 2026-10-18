/* JARVIS HAND ROLL — independent, opt-in roll controller.
   VELVE and Vision Intelligence keep their existing roll systems untouched.
   Other environments get their own centered roll target. */
(()=>{'use strict';
if(window.__JARVIS_HAND_ROLL_FIX__)return;
window.__JARVIS_HAND_ROLL_FIX__=true;
const VERSION='hand-roll-fix-20261018f';
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
const pressed=()=>$('#jarvis-hand-gesture-toggle')?.getAttribute('aria-pressed')==='true';
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
let rawPrev=null,filtered=0,angle=0,lastEnv='',terraScene=null,terraTarget=null,terraRendererPatched=false;
const factors={main:.22,command:.20,gods:.15,terra:.18};
function reset(){rawPrev=null;filtered=0;angle=0;lastEnv=env();}
function neutralize(results,tracker){
 const e=env();
 if(e==='velve'||e==='vision')return results;
 const lm=results?.multiHandLandmarks?.[0];
 if(!lm?.[5]||!lm?.[17])return results;
 const a=lm[5],b=lm[17],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,len=Math.hypot(b.x-a.x,b.y-a.y)/2;
 const current=Math.atan2(b.y-a.y,b.x-a.x);if(tracker.__jhrNeutralAngle==null)tracker.__jhrNeutralAngle=current;const base=tracker.__jhrNeutralAngle;
 const copy=results.multiHandLandmarks.map((hand,i)=>{
   if(i!==0)return hand;
   const h=hand.map(p=>Object.assign({},p));
   h[5]=Object.assign({},h[5],{x:mx-len*Math.cos(base),y:my-len*Math.sin(base)});
   h[17]=Object.assign({},h[17],{x:mx+len*Math.cos(base),y:my+len*Math.sin(base)});
   return h;
 });
 return Object.assign({},results,{multiHandLandmarks:copy});
}
function mainRotate(){
 const first=$('.core-stage .jarvis-core-3d');
 const m=first?.style.transform?.match(/scale\\(([^)]+)\\)/);const z=Math.max(.72,Math.min(2.05,Number(m?.[1])||1));
 document.querySelectorAll('.core-stage .jarvis-core-3d,.core-stage .jarvis-core-voice-hit').forEach(el=>{
   el.style.removeProperty('rotate');el.style.transformOrigin='50% 50%';
   el.style.transform='translate(-50%,-50%) scale('+z+') rotate('+angle.toFixed(3)+'deg)';
 });
}
function commandRotate(){
 const core=$('#nn-core');if(core){
   const base=core.dataset.jhrIndependentBase??getComputedStyle(core).transform;
   if(!core.dataset.jhrIndependentBase)core.dataset.jhrIndependentBase=base==='none'?'':base;
   const z=core.style.scale||'1';
   core.style.removeProperty('rotate');core.style.removeProperty('scale');
   core.style.transform=(core.dataset.jhrIndependentBase?core.dataset.jhrIndependentBase+' ':'')+'scale('+z+') rotate('+angle.toFixed(3)+'deg)';
 }
 const area=$('.nn-core-area');if(area)area.style.removeProperty('rotate');
}
function terraPatch(){
 if(terraRendererPatched||!window.THREE?.WebGLRenderer?.prototype)return;
 const p=window.THREE.WebGLRenderer.prototype,r=p.render;if(typeof r!=='function')return;
 p.render=function(scene,camera){
   if(scene&&camera){terraScene=scene;if(!terraTarget){
     let best=null,bestCount=-1;
     for(const child of scene.children||[]){
       if(child?.isLight||child?.isCamera)continue;
       let count=0;child.traverse?.(o=>{if(o.isMesh||o.isLine||o.isPoints)count++;});
       if(count>bestCount){best=child;bestCount=count;}
     }
     if(best&&bestCount>0)terraTarget=best;
   }}
   return r.apply(this,arguments);
 };
 terraRendererPatched=true;
}
function terraRotate(delta){
 if(typeof window.__TERRANEXUS_HAND_ROTATE==='function'){try{window.__TERRANEXUS_HAND_ROTATE(delta);return true}catch(_){} }
 terraPatch();
 if(terraTarget&&terraTarget.rotation){terraTarget.rotation.y+=delta;return true;}
 return false;
}
function directRotate(delta){
 const e=env();
 if(e==='velve'||e==='vision')return;
 if(e==='terra'){terraRotate(delta);return;}
 angle=norm(angle+delta*180/Math.PI);
 if(e==='main')mainRotate();
 else if(e==='command')commandRotate();
 else if(e==='gods'){
   try{const v=window.__GODS_EYE_VIEWER||window.__GODSEYE_VIEWER;if(v?.camera&&typeof v.camera.rotateRight==='function'){v.camera.rotateRight(-delta*.75);return}}catch(_){}
   const g=$('#gods-eye-globe canvas')||$('#gods-eye-root canvas')||$('#godseye-root canvas');if(g){g.style.transformOrigin='50% 50%';g.style.rotate=angle.toFixed(3)+'deg';}
 }
}
function process(results,tracker){
 const e=env();
 if(e!==lastEnv){reset();lastEnv=e;return results;}
 if(!pressed()||e==='velve'||e==='vision'){rawPrev=null;if(tracker)tracker.__jhrNeutralAngle=null;return results;}
 const lm=results?.multiHandLandmarks?.[0];
 if(!lm?.[5]||!lm?.[17]){rawPrev=null;if(tracker)tracker.__jhrNeutralAngle=null;return results;}
 const raw=Math.atan2(lm[17].y-lm[5].y,lm[17].x-lm[5].x);
 if(rawPrev==null){rawPrev=raw;return results;}
 const d=norm(raw-rawPrev);rawPrev=raw;
 if(Math.abs(d)<.008)return neutralize(results,tracker);
 const clamped=Math.max(-.10,Math.min(.10,d));
 filtered=filtered*.78+clamped*.22;
 const scaled=filtered*factors[e];
 if(Math.abs(scaled)<.00035)return neutralize(results,tracker);
 directRotate(scaled);
 return neutralize(results,tracker);
}
function install(){
 if(!window.Hands?.prototype)return false;
 const proto=window.Hands.prototype;
 if(proto.__jhrIndependentPatched)return true;
 const original=proto.onResults;if(typeof original!=='function')return false;
 proto.onResults=function(cb){return original.call(this,function(results){
   let adjusted=results;try{adjusted=process(results,this)}catch(e){console.warn('[JARVIS independent hand roll]',e)}
   return cb(adjusted);
 })};
 proto.__jhrIndependentPatched=true;window.__JARVIS_HAND_ROLL_FIX_VERSION__=VERSION;return true;
}
function watch(){if(!install())setTimeout(watch,100);}
function frame(){if(env()==='terra')terraPatch();requestAnimationFrame(frame);}
reset();watch();frame();
})();
