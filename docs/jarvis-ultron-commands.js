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

  function showReservedNotice(){
    let note=document.getElementById('jarvis-ultron-placeholder');
    if(!note){note=document.createElement('div');note.id='jarvis-ultron-placeholder';note.textContent='ULTRON IS OFFLINE — ENVIRONMENT RESERVED FOR REBUILD';Object.assign(note.style,{position:'fixed',left:'50%',top:'18%',transform:'translateX(-50%)',zIndex:'99999',maxWidth:'80vw',padding:'10px 14px',background:'rgba(12,8,6,.96)',border:'1px solid #ff7a28',borderRadius:'6px',color:'#ffb36b',font:'600 10px/1.5 monospace',letterSpacing:'1px',textAlign:'center',boxShadow:'0 0 18px rgba(255,100,20,.25)'});document.body.appendChild(note);}
    note.style.display='block';clearTimeout(note.__hideTimer);note.__hideTimer=setTimeout(()=>{note.style.display='none'},2800);return true;
  }
  async function openUltron(){return showReservedNotice();}
  function closeUltron(){const note=document.getElementById('jarvis-ultron-placeholder');if(note)note.style.display='none';return true;}
  async function handle(command){
    const text=normalize(command);
    if(!text)return false;
    if(matches(OPEN_PATTERNS,text))return openUltron();
    if(matches(CLOSE_PATTERNS,text))return closeUltron();
    return false;
  }

  const install = () => {
    if (typeof window.sendCommand !== 'function') return false;
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
    version: 'ultron-commands-20261024a',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();
