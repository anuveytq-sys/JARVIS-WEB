/* NEON NEXUS command routing recovery — restores voice/text launch phrases. */
(()=>{
  'use strict';
  const install=()=>{
    if(typeof window.sendCommand!=='function'||window.sendCommand.__neonNexusCommandFix)return;
    const old=window.sendCommand;
    const wrapped=function(q){
      const text=String(q||'').trim();
      if(/^(?:(?:hey\s+)?jarvis\s+)?(?:(?:open|launch|start|activate|enter|show)\s+(?:the\s+)?)?(?:neon\s+nexus|nexus\s+neon|neon\s+command\s+environment|magenta\s+command\s+cent(?:re|er)|command\s+cent(?:re|er)|centre|center|nexus)[.! ]*$/i.test(text)){
        if(window.NEON_NEXUS?.open){window.NEON_NEXUS.open();return;}
      }
      return old.apply(this,arguments);
    };
    wrapped.__neonNexusCommandFix=true;
    wrapped.__neonNexusOriginal=old;
    window.sendCommand=wrapped;
  };
  install();
  window.addEventListener('load',install);
  setTimeout(install,300);
  setTimeout(install,1000);
})();
