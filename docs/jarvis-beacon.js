/* JARVIS // BEACON PROTOCOL v2.2 bootstrap
 * Existing Beacon bridge plus additive Inferno loader.
 */
(function () {
  "use strict";
  var LEGACY = "https://raw.githubusercontent.com/anuveytq-sys/JARVIS-WEB/acd22ec49f7a78a97533dc86a73acba47ce17202/docs/jarvis-beacon.js";
  var INFERNO = "./jarvis-inferno.js?v=inferno-20261023-1";
  var installed = false;
  function loadInferno(){
    if(window.JARVISInferno || document.querySelector('script[data-jarvis-inferno="true"]')) return;
    var s=document.createElement('script'); s.src=INFERNO; s.async=false; s.dataset.jarvisInferno='true';
    s.onerror=function(){console.warn('JARVIS Inferno module could not be loaded');};
    (document.head||document.documentElement).appendChild(s);
  }
  function norm(t){return String(t||'').replace(/[.!?]+$/g,'').replace(/\s+/g,' ').trim();}
  function activate(t){
    var l=norm(t).toLowerCase();
    if(!/\b(?:hey\s+jarvis\s+)?(?:release\s+inferno|let\s+inferno\s+come\s+out|open\s+inferno|activate\s+inferno)\b/.test(l)) return false;
    loadInferno();
    if(window.JARVISInferno&&window.JARVISInferno.activateFromText) return window.JARVISInferno.activateFromText(t);
    if(window.JARVISInferno&&window.JARVISInferno.activate) return window.JARVISInferno.activate();
    return true;
  }
  function install(){
    if(installed) return; installed=true; loadInferno();
    document.addEventListener('jarvis:command',function(e){try{activate(e.detail&&e.detail.command||e.detail||'');}catch(_){}} ,true);
    document.addEventListener('jarvis-command',function(e){try{activate(e.detail&&e.detail.command||e.detail||'');}catch(_){}} ,true);
    document.addEventListener('submit',function(e){try{var i=e.target&&e.target.querySelector&&e.target.querySelector('input,textarea');if(i)activate(i.value);}catch(_){}} ,true);
    document.addEventListener('keydown',function(e){if(e.key!=='Enter')return;try{var a=document.activeElement;if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName))activate(a.value);}catch(_){}} ,true);
  }
  loadInferno();
  var legacy=document.createElement('script'); legacy.src=LEGACY; legacy.async=false; legacy.dataset.jarvisBeaconLegacy='true'; legacy.onload=install; legacy.onerror=install; (document.head||document.documentElement).appendChild(legacy);
  install();
  window.addEventListener('load',install,{once:true});
})();
