/* NEON NEXUS launcher cleanup — remove the floating button; use JARVIS command/voice instead. */
(()=>{
  'use strict';
  const hide=()=>{
    const b=document.getElementById('nn-launcher');
    if(b)b.style.setProperty('display','none','important');
  };
  const install=()=>{
    hide();
    if(window.__NEXUS_LAUNCHER_CLEANUP__)return;
    window.__NEXUS_LAUNCHER_CLEANUP__=true;
    new MutationObserver(hide).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    window.addEventListener('load',hide);
  };
  install();
  setTimeout(install,300);
  setTimeout(hide,1000);
})();
