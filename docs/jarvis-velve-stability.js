/* VELVE stability guard.
   Harden Cesium before the first viewer is created. Protects against invalid
   coordinates, mobile Safari frustum failures, and over-zooming through the globe.
*/
(() => {
  'use strict';
  const VERSION='velve-stability-20261015d';
  let cesiumPatched=false;

  function patchCesium(){
    if(cesiumPatched||!window.Cesium)return;
    const C=window.Cesium;
    if(!C.Viewer||!C.Cartesian3)return;
    cesiumPatched=true;

    const originalFromDegrees=C.Cartesian3.fromDegrees;
    C.Cartesian3.fromDegrees=function(lon,lat,height,ellipsoid,result){
      lon=Number(lon);lat=Number(lat);height=Number(height);
      if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(height))
        return originalFromDegrees(0,0,0,ellipsoid,result);
      lat=Math.max(-89.999999,Math.min(89.999999,lat));
      lon=((lon+180)%360+360)%360-180;
      height=Math.max(-6300000,Math.min(50000000,height));
      return originalFromDegrees(lon,lat,height,ellipsoid,result);
    };

    const OriginalViewer=C.Viewer;
    C.Viewer=function(container,options){
      options=Object.assign({},options||{});
      options.scene3DOnly=true;
      const viewer=new OriginalViewer(container,options);
      try{
        viewer.resolutionScale=Math.min(Number(window.devicePixelRatio)||1,0.9);
        viewer.scene.rethrowRenderErrors=false;
        viewer.scene.renderError.addEventListener(()=>{
          // Cesium can stop rendering after a transient imagery/terrain error.
          // Request a fresh frame rather than leaving the canvas permanently white.
          try{
            if(viewer.isDestroyed())return;
            viewer.scene.globe.show=true;
            viewer.scene.requestRender();
          }catch(_){}
        });
        const controller=viewer.scene.screenSpaceCameraController;
        if(controller){
          // Stop wheel/pinch zoom before the camera crosses the globe surface,
          // where mobile browsers can show a blank/white canvas.
          controller.minimumZoomDistance=120;
          controller.maximumZoomDistance=50000000;
          controller.enableCollisionDetection=true;
        }
        viewer.camera.changed.addEventListener(()=>{
          try{
            if(viewer.isDestroyed())return;
            const p=viewer.camera.positionCartographic;
            if(p&&Number.isFinite(p.height)&&p.height<100){
              const cart=C.Cartographic.clone(p);
              cart.height=120;
              viewer.camera.position= C.Ellipsoid.WGS84.cartographicToCartesian(cart);
              viewer.scene.requestRender();
            }
          }catch(_){}
        });
      }catch(_){}
      return viewer;
    };
    C.Viewer.prototype=OriginalViewer.prototype;
  }

  function watch(){patchCesium();setTimeout(watch,500)}
  watch();
  window.VELVE_STABILITY_VERSION=VERSION;
})();
