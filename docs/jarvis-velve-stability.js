/* VELVE stability/performance guard.
   Keeps the existing VELVE UI/features intact while preventing large satellite
   catalogs from overwhelming Cesium on phones/tablets.
*/
(() => {
  'use strict';
  const VERSION='velve-stability-20261014b';
  let patched=false;
  const patchSatelliteEngine=()=>{
    if(patched||!window.satellite)return;
    const sat=window.satellite;
    if(typeof sat.propagate!=='function')return;
    patched=true;
    const originalPropagate=sat.propagate.bind(sat);
    const originalTLE=typeof sat.twoline2satrec==='function'?sat.twoline2satrec.bind(sat):null;
    const originalGstime=typeof sat.gstime==='function'?sat.gstime.bind(sat):null;
    const originalGeo=typeof sat.eciToGeodetic==='function'?sat.eciToGeodetic.bind(sat):null;
    const tleCache=new Map();
    const propCache=new WeakMap();
    const geoCache=new WeakMap();
    let gstimeSecond=-1,gstimeValue=null;
    if(originalTLE){
      sat.twoline2satrec=(l1,l2)=>{
        const k=String(l1)+'|'+String(l2);
        let r=tleCache.get(k);
        if(!r){r=originalTLE(l1,l2);tleCache.set(k,r)}
        return r;
      };
    }
    sat.propagate=(rec,date)=>{
      if(!rec||!date)return null;
      const ms=Math.floor(new Date(date).getTime()/1000)*1000;
      let c=propCache.get(rec);
      if(c&&c.ms===ms)return c.value;
      let value=null;
      try{
        const v=originalPropagate(rec,new Date(ms));
        const p=v&&v.position;
        if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))value=v;
      }catch(_){value=null}
      propCache.set(rec,{ms,value});
      return value;
    };
    if(originalGstime){
      sat.gstime=date=>{
        const sec=Math.floor(new Date(date).getTime()/1000);
        if(sec!==gstimeSecond){gstimeSecond=sec;gstimeValue=originalGstime(new Date(sec*1000))}
        return gstimeValue;
      };
    }
    if(originalGeo){
      sat.eciToGeodetic=(position,gstime)=>{
        if(!position)return null;
        let c=geoCache.get(position);
        const key=gstimeValue===gstime?'same':gstime;
        if(c&&c.key===key)return c.value;
        let value=null;
        try{value=originalGeo(position,gstime)}catch(_){value=null}
        geoCache.set(position,{key,value});
        return value;
      };
    }
  };
  const patchViewer=()=>{
    try{
      const v=window.VELVE&&window.VELVE.viewer;
      if(!v||!v.scene)return false;
      v.scene.rethrowRenderErrors=false;
      if(!v.__velveStableRenderHandler){
        v.__velveStableRenderHandler=true;
        v.scene.renderError.addEventListener(()=>{
          try{v.useDefaultRenderLoop=true}catch(_){ }
          try{const b=document.querySelector('#velve-status b');if(b)b.textContent='RENDER RECOVERED'}catch(_){ }
        });
      }
      return true;
    }catch(_){return false}
  };
  const watch=()=>{
    patchSatelliteEngine();
    patchViewer();
    setTimeout(watch,1000);
  };
  watch();
  window.VELVE_STABILITY_VERSION=VERSION;
})();
