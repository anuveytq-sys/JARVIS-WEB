/* VELVE stability guard.
   Loaded before VELVE so it can harden Cesium before the first viewer is created.
   Fixes the common Cesium "Invalid array length" failure caused by non-finite
   coordinates and fragile camera/frustum states, especially on mobile Safari.
*/
(() => {
  'use strict';
  const VERSION='velve-stability-20261014c';
  let cesiumPatched=false;

  function patchCesium(){
    if(cesiumPatched||!window.Cesium)return;
    const C=window.Cesium;
    if(!C.Viewer||!C.Cartesian3)return;
    cesiumPatched=true;

    // Prevent NaN/Infinity coordinates from entering Cesium's geometry pipeline.
    const originalFromDegrees=C.Cartesian3.fromDegrees;
    C.Cartesian3.fromDegrees=function(lon,lat,height,ellipsoid,result){
      lon=Number(lon);lat=Number(lat);height=Number(height);
      if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(height))return originalFromDegrees(0,0,0,ellipsoid,result);
      lat=Math.max(-89.999999,Math.min(89.999999,lat));
      lon=((lon+180)%360+360)%360-180;
      height=Math.max(-6300000,Math.min(50000000,height));
      return originalFromDegrees(lon,lat,height,ellipsoid,result);
    };

    const OriginalViewer=C.Viewer;
    C.Viewer=function(container,options){
      options=Object.assign({},options||{});
      // This avoids a known class of Cesium frustum-array failures in some devices.
      options.scene3DOnly=true;
      const viewer=new OriginalViewer(container,options);
      try{
        viewer.resolutionScale=Math.min(Number(window.devicePixelRatio)||1,0.9);
        viewer.scene.rethrowRenderErrors=false;
        viewer.scene.renderError.addEventListener(()=>{
          try{viewer.scene.requestRender()}catch(_){ }
        });
      }catch(_){ }
      return viewer;
    };
    C.Viewer.prototype=OriginalViewer.prototype;
  }

  function watch(){patchCesium();setTimeout(watch,500)}
  watch();
  window.VELVE_STABILITY_VERSION=VERSION;
})();
