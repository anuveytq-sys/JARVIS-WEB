/* JARVIS // ULTRON FLEXIBLE COMMAND BRIDGE
   Adds natural voice/text aliases for opening and closing ULTRON.
   Existing commands are left untouched; only recognized ULTRON phrases are intercepted.
*/
(() => {
  'use strict';
  if (window.__JARVIS_ULTRON_COMMANDS__) return;
  window.__JARVIS_ULTRON_COMMANDS__ = true;

  const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const OPEN_PATTERNS = [
    /^hey jarvis (please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron$/,
    /^(jarvis )?(please )?(open|launch|start|activate|engage|enable|boot|bring up|show|display|summon|release) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(release|unleash|deploy|initialize|power up|wake up) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(take me to|go to|enter|enter the) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(i want|i need) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(activate|open|start) ultron intelligence$/,
    /^ultron (open|launch|start|activate|engage|boot|online|wake up)$/
  ];

  const CLOSE_PATTERNS = [
    /^(hey jarvis )?(please )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron$/,
    /^(hey jarvis )?(close|exit|quit|dismiss|hide|shut|deactivate|disable|stop|terminate|end|leave) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(stand down|power down|put away|take down) (the )?ultron( environment| mode| system)?$/,
    /^(hey jarvis )?(return|go back|take me back) (from|out of) (the )?ultron$/,
    /^ultron (close|exit|quit|shutdown|shut down|offline|sleep)$/
  ];

  const matches = (patterns, text) => patterns.some(pattern => pattern.test(text));

  function installFastWorldFeedFailover(){
    if(window.__ULTRON_FAST_WORLD_FEED_FAILOVER__)return;
    window.__ULTRON_FAST_WORLD_FEED_FAILOVER__=true;
    let observer=null, poll=null, watchdog=null, stallTimer=null, lastVideo=null, lastState='', lastTime=-1, lastAdvanceAt=0;
    const MAX_CHECK_MS=2800;
    const MAX_STALL_MS=2400;
    const clearWatchdog=()=>{if(watchdog){clearTimeout(watchdog);watchdog=null;}};
    const clearStall=()=>{if(stallTimer){clearTimeout(stallTimer);stallTimer=null;}};
    const resetVideoState=(video)=>{
      clearWatchdog();clearStall();lastVideo=video||null;lastState='';lastTime=Number(video?.currentTime)||0;lastAdvanceAt=Date.now();
    };
    const stop=()=>{
      clearWatchdog();clearStall();
      if(poll){clearInterval(poll);poll=null;}
      if(observer){observer.disconnect();observer=null;}
      resetVideoState(null);
    };
    const invokeCoreError=(video)=>{
      if(!video||!video.isConnected)return false;
      let invoked=false;
      // Call the core's existing handler directly first. This avoids relying on
      // browser dispatch behavior when an HLS player has already replaced media state.
      try{
        if(typeof video.onerror==='function'){
          video.onerror(new Event('error'));
          invoked=true;
        }
      }catch(_){}
      // Also dispatch the normal DOM media error path for handlers registered with addEventListener.
      try{video.dispatchEvent(new Event('error'));invoked=true;}catch(_){}
      return invoked;
    };
    const forceNext=(video)=>{
      if(!video||!video.isConnected)return;
      invokeCoreError(video);
      lastState='';
      lastTime=Number(video.currentTime)||0;
      lastAdvanceAt=Date.now();
      clearWatchdog();clearStall();
    };
    const arm=(video)=>{
      if(!video||!video.isConnected)return;
      if(video===lastVideo&&lastState==='armed')return;
      clearWatchdog();clearStall();lastVideo=video;lastState='armed';lastTime=Number(video.currentTime)||0;lastAdvanceAt=Date.now();
      watchdog=setTimeout(()=>{
        watchdog=null;
        if(!video.isConnected||video.style.visibility==='visible')return;
        const panel=video.closest('.uc-worldcam');
        const status=panel?.querySelector('.uc-worldcam-place')?.textContent||'';
        if(/CHECKING LIVE FEED|SEARCHING FOR LIVE FEED|CONNECTING TO PUBLIC CAM|RECONNECTING/i.test(status)||video.readyState<2){
          forceNext(video);
        }
        lastState='';
      },MAX_CHECK_MS);
    };
    const armStall=(video,delay=MAX_STALL_MS)=>{
      if(!video||!video.isConnected)return;
      clearStall();
      stallTimer=setTimeout(()=>{
        stallTimer=null;
        if(!video.isConnected)return;
        const panel=video.closest('.uc-worldcam');
        const status=panel?.querySelector('.uc-worldcam-place')?.textContent||'';
        const now=Number(video.currentTime)||0;
        const advancing=video.readyState>=2&&now>lastTime+0.08;
        if(video.style.visibility==='visible'&&!/CHECKING LIVE FEED|SEARCHING FOR LIVE FEED|CONNECTING TO PUBLIC CAM|RECONNECTING/i.test(status)&&!advancing){
          forceNext(video);
        }
      },delay);
    };
    const monitor=()=>{
      const panel=document.getElementById('ultron-clean-core')?.querySelector('.uc-worldcam');
      const video=panel?.querySelector('.uc-worldcam-frame');
      if(!video){stop();return;}
      if(video!==lastVideo){resetVideoState(video);}
      const status=panel.querySelector('.uc-worldcam-place')?.textContent||'';
      const checking=/CHECKING LIVE FEED|SEARCHING FOR LIVE FEED|CONNECTING TO PUBLIC CAM|RECONNECTING/i.test(status);
      const now=Number(video.currentTime)||0;
      if(video.readyState>=2&&now>lastTime+0.08){lastTime=now;lastAdvanceAt=Date.now();clearStall();}
      if(video.style.visibility==='visible'&&!checking){
        clearWatchdog();
        lastState='live';
        if(video.paused||video.readyState<2||Date.now()-lastAdvanceAt>MAX_STALL_MS)armStall(video,0);
        return;
      }
      if(checking)arm(video);
      else if(lastState==='armed'){clearWatchdog();lastState='';}
    };
    poll=setInterval(monitor,250);
    monitor();
    observer=new MutationObserver(monitor);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src']});
    window.addEventListener('pagehide',stop,{once:true});
  }

  async function openUltron(){
    try {
      if (!window.ULTRON) {
        await new Promise((resolve, reject) => {
          const existing = document.getElementById('jarvis-ultron-core-loader');
          if (existing) existing.remove();
          const script = document.createElement('script'); script.id = 'jarvis-ultron-core-loader';
          script.src = './jarvis-ultron.js?v=ultron-core-rebuild-26'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
        });
      }
      window.ULTRON?.open?.();
      setTimeout(installFastWorldFeedFailover,120);
      return true;
    } catch (error) { console.error('[JARVIS] ULTRON core failed to load', error); return false; }
  }
  function closeUltron(){ window.ULTRON?.close?.(); document.getElementById('ultron-clean-core')?.remove(); return true; }
  async function handle(command){
    const text=normalize(command);
    if(!text)return false;
    if(matches(OPEN_PATTERNS,text))return openUltron();
    if(matches(CLOSE_PATTERNS,text))return closeUltron();
    return false;
  }

  const install = () => {
    if (typeof window.sendCommand!=='function') return false;
    if (window.sendCommand.__jarvisUltronFlexible) return true;
    const original = window.sendCommand;
    const wrapped = async function(command) {
      if (await handle(command)) return;
      return original.apply(this, arguments);
    };
    wrapped.__jarvisUltronFlexible = true;
    wrapped.__jarvisUltronOriginal = original;
    window.sendCommand = wrapped;
    return true;
  };

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (install() || tries >= 120) clearInterval(timer);
  }, 100);

  window.JARVIS_ULTRON_COMMANDS = {
    version: 'ultron-commands-20261024v',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();
