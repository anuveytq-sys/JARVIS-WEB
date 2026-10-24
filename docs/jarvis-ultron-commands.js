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

  async function openUltron(){
    try {
      if (!window.ULTRON) {
        await new Promise((resolve, reject) => {
          const existing = document.getElementById('jarvis-ultron-core-loader');
          if (existing) existing.remove();
          const script = document.createElement('script'); script.id = 'jarvis-ultron-core-loader';
          script.src = './jarvis-ultron.js?v=ultron-core-rebuild-16'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
        });
      }
      window.ULTRON?.open?.(); return true;
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
    version: 'ultron-commands-20261024p',
    open: openUltron,
    close: closeUltron,
    handle,
    patterns: { open: OPEN_PATTERNS.length, close: CLOSE_PATTERNS.length }
  };
})();
