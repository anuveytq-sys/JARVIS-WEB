/* JARVIS ENVIRONMENT SHORTCUTS
   Replaces the bottom-left VOICE ANALYZER panel with a compact,
   scrollable blue/transparent environment launcher.
   Existing environment command routing is reused through sendCommand().
   No existing environment, voice, or command behavior is changed.
*/
(() => {
  'use strict';

  const VERSION = 'env-shortcuts-20261018a';
  const PANEL_ID = 'jarvis-environment-shortcuts';

  const environments = [
    {
      name: 'VELVE',
      subtitle: 'GOD’S EYE / GEO CORE',
      command: 'open VELVE environment'
    },
    {
      name: 'TERRA NEXUS',
      subtitle: 'TERRANEXUS ENVIRONMENT',
      command: 'open Terra Nexus environment'
    },
    {
      name: 'VISION INTELLIGENCE',
      subtitle: 'VISUAL ANALYSIS ENVIRONMENT',
      command: 'open Vision Intelligence environment'
    },
    {
      name: 'NEON NEXUS',
      subtitle: 'COMMAND / NEON ENVIRONMENT',
      command: 'open Neon Nexus environment'
    }
  ];

  const findVoiceAnalyzer = () => {
    const titles = Array.from(document.querySelectorAll('.panel-title'));
    return titles.find((title) => /VOICE\s+ANALYZER/i.test(title.textContent || ''))?.closest('.panel') || null;
  };

  const buildPanel = () => {
    if (document.getElementById(PANEL_ID)) return;

    const oldPanel = findVoiceAnalyzer();
    if (!oldPanel) return;

    oldPanel.style.display = 'none';
    oldPanel.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'panel';
    panel.setAttribute('aria-label', 'JARVIS environments');
    panel.innerHTML = `
      <div class="panel-title">ENVIRONMENT SHORTCUTS</div>
      <div class="panel-header-line"></div>
      <div class="jarvis-env-shortcuts-intro">SELECT AN ENVIRONMENT TO TELEPORT</div>
      <div class="jarvis-env-shortcuts-list" role="list"></div>
      <div class="jarvis-env-shortcuts-hint">VOICE COMMANDS REMAIN AVAILABLE</div>
    `;

    Object.assign(panel.style, {
      left: '16px',
      bottom: '84px',
      width: '215px',
      height: '198px',
      padding: '12px',
      overflow: 'hidden',
      zIndex: '35'
    });

    const style = document.createElement('style');
    style.id = 'jarvis-environment-shortcuts-style';
    style.textContent = `
      #${PANEL_ID} {
        background: linear-gradient(145deg, rgba(2,34,64,.78), rgba(0,9,21,.67));
        border: 1px solid rgba(0,205,255,.27);
        box-shadow: 0 0 25px rgba(0,140,255,.08), inset 0 0 20px rgba(0,160,255,.035);
        backdrop-filter: blur(15px);
      }
      #${PANEL_ID} .jarvis-env-shortcuts-intro {
        color: #477e96;
        font-size: 7px;
        letter-spacing: 1.4px;
        margin-bottom: 8px;
      }
      #${PANEL_ID} .jarvis-env-shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 126px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 3px;
        scrollbar-width: thin;
        scrollbar-color: rgba(0,220,255,.55) rgba(0,20,40,.45);
      }
      #${PANEL_ID} .jarvis-env-shortcuts-list::-webkit-scrollbar { width: 4px; }
      #${PANEL_ID} .jarvis-env-shortcuts-list::-webkit-scrollbar-track { background: rgba(0,20,40,.45); }
      #${PANEL_ID} .jarvis-env-shortcuts-list::-webkit-scrollbar-thumb { background: rgba(0,220,255,.55); border-radius: 4px; }
      #${PANEL_ID} .jarvis-env-shortcut {
        width: 100%;
        min-height: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid rgba(0,205,255,.22);
        border-radius: 5px;
        background: linear-gradient(100deg, rgba(0,115,190,.18), rgba(0,15,35,.35));
        color: #baf7ff;
        cursor: pointer;
        text-align: left;
        font: 600 7px/1.2 "Segoe UI", Roboto, Arial, sans-serif;
        letter-spacing: 1px;
        transition: background .16s ease, border-color .16s ease, box-shadow .16s ease;
      }
      #${PANEL_ID} .jarvis-env-shortcut:hover,
      #${PANEL_ID} .jarvis-env-shortcut:focus-visible {
        background: linear-gradient(100deg, rgba(0,150,230,.30), rgba(0,30,60,.50));
        border-color: rgba(0,235,255,.60);
        box-shadow: 0 0 10px rgba(0,190,255,.16), inset 0 0 10px rgba(0,180,255,.06);
        outline: none;
      }
      #${PANEL_ID} .jarvis-env-shortcut-name { color: #d8fbff; }
      #${PANEL_ID} .jarvis-env-shortcut-arrow { color: #62f5ff; font-size: 11px; flex: 0 0 auto; }
      #${PANEL_ID} .jarvis-env-shortcuts-hint {
        margin-top: 7px;
        color: #477b92;
        font-size: 6px;
        letter-spacing: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @media (max-width: 520px) {
        #${PANEL_ID} { left: 12px !important; bottom: 72px !important; width: 215px !important; }
      }
    `;
    document.head.appendChild(style);

    const list = panel.querySelector('.jarvis-env-shortcuts-list');
    environments.forEach((env) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jarvis-env-shortcut';
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', `Open ${env.name}`);
      button.innerHTML = `<span><span class="jarvis-env-shortcut-name">${env.name}</span><br><span style="color:#477e96;font-size:5.5px;letter-spacing:.8px">${env.subtitle}</span></span><span class="jarvis-env-shortcut-arrow">›</span>`;
      button.addEventListener('click', async () => {
        try {
          if (typeof window.sendCommand === 'function') {
            await window.sendCommand(env.command);
          } else {
            button.disabled = true;
            setTimeout(() => { button.disabled = false; }, 700);
          }
        } catch (error) {
          console.error('[JARVIS Environment Shortcuts]', env.name, error);
        }
      });
      list.appendChild(button);
    });

    oldPanel.parentNode.insertBefore(panel, oldPanel);
  };

  const start = () => {
    if (document.getElementById(PANEL_ID)) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      buildPanel();
      if (document.getElementById(PANEL_ID) || tries >= 100) clearInterval(timer);
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
