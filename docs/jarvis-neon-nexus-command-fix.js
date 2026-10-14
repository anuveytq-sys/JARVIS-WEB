/* NEON NEXUS command-routing recovery — restores all launch phrases reliably. */
(()=>{
  'use strict';
  const isNexusCommand=value=>{
    const q=String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const words=q.split(/\s+/).filter(Boolean);
    const nexus=words.includes('nexus');
    const neon=words.includes('neon');
    const action=['open','launch','start','activate','enter','show'].some(w=>words.includes(w));
    const center=words.includes('centre')||words.includes('center')||q.includes('command centre')||q.includes('command center');
    return nexus && (action||neon||center);
  };
  const openNexus=()=>{
    if(window.NEON_NEXUS?.open){window.NEON_NEXUS.open();return true;}
    const b=document.getElementById('nn-launcher');
    if(b){b.style.display='block';b.click();return true;}
    return false;
  };
  const install=()=>{
    if(typeof window.sendCommand!=='function')return false;
    if(window.sendCommand.__neonNexusCommandFix)return true;
    const old=window.sendCommand;
    const wrapped=function(q){
      if(isNexusCommand(q)&&openNexus())return;
      return old.apply(this,arguments);
    };
    wrapped.__neonNexusCommandFix=true;
    wrapped.__neonNexusOriginal=old;
    window.sendCommand=wrapped;
    return true;
  };
  const timer=setInterval(()=>{if(install())clearInterval(timer)},250);
  install();
  window.addEventListener('load',install);
})();
