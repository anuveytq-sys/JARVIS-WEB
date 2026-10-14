/* NEON NEXUS launcher isolation patch — keeps the NEXUS button out of VELVE/TERRANEXUS. */
(()=>{
  'use strict';
  const sync=()=>{
    const b=document.getElementById('nn-launcher');
    if(!b)return;
    const velve=document.body.classList.contains('velve-active')||document.body.classList.contains('velve-open');
    const terra=!!document.getElementById('terranexus-overlay');
    const neon=!!document.getElementById('neon-nexus')?.classList.contains('open');
    b.style.setProperty('display',(velve||terra||neon)?'none':'block','important');
  };
  const install=()=>{
    sync();
    if(window.__NEXUS_LAUNCHER_ISOLATION__)return;
    window.__NEXUS_LAUNCHER_ISOLATION__=true;
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    window.addEventListener('load',sync);
  };
  install();
  setTimeout(install,300);
})();
