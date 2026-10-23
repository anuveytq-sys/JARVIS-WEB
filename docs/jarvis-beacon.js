/* JARVIS // BEACON PROTOCOL v2.4 bootstrap */
(function(){
'use strict';
var LEGACY='https://raw.githubusercontent.com/anuveytq-sys/JARVIS-WEB/acd22ec49f7a78a97533dc86a73acba47ce17202/docs/jarvis-beacon.js';
var INFERNO='./jarvis-inferno.js?v=inferno-release-20261023-4';
var INFERNO2='./jarvis-inferno-v2.js?v=inferno-release-20261023-3';
var installed=false;
function load(src,attr){if(document.querySelector('script['+attr+']'))return;var s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(attr,'true');s.onerror=function(){console.warn('JARVIS module could not be loaded:',src)};(document.head||document.documentElement).appendChild(s)}
function loadInferno(){load(INFERNO,'data-jarvis-inferno');setTimeout(function(){load(INFERNO2,'data-jarvis-inferno-v2')},50)}
function norm(t){return String(t||'').replace(/[.!?]+$/g,'').replace(/\s+/g,' ').trim()}
function activation(t){var l=norm(t).toLowerCase();return /\b(?:hey\s+jarvis\s+)?(?:release\s+inferno|let\s+inferno\s+come\s+out|open\s+inferno|activate\s+inferno)\b/.test(l)}
function route(t){if(!t)return false;if(activation(t)){loadInferno();if(window.JARVISInferno&&window.JARVISInferno.activateFromText)return window.JARVISInferno.activateFromText(t);if(window.JARVISInferno&&window.JARVISInferno.activate)return window.JARVISInferno.activate();return true}var active=!!(window.JARVISInferno&&window.JARVISInferno.isActive&&window.JARVISInferno.isActive());if(!active)return false;if(window.JARVISInfernoV2&&window.JARVISInfernoV2.execute){window.JARVISInfernoV2.execute(t);return true}if(window.JARVISInferno&&window.JARVISInferno.execute){window.JARVISInferno.execute(t);return true}return false}
function install(){if(installed)return;installed=true;loadInferno();document.addEventListener('jarvis:command',function(e){try{route(e.detail&&e.detail.command||e.detail||'')}catch(_){ }},true);document.addEventListener('jarvis-command',function(e){try{route(e.detail&&e.detail.command||e.detail||'')}catch(_){ }},true);document.addEventListener('submit',function(e){try{var i=e.target&&e.target.querySelector&&e.target.querySelector('input,textarea');if(i)route(i.value)}catch(_){ }},true);document.addEventListener('keydown',function(e){if(e.key!=='Enter'||e.isComposing)return;try{var a=document.activeElement;if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName))route(a.value)}catch(_){ }},true)}
loadInferno();var legacy=document.createElement('script');legacy.src=LEGACY;legacy.async=false;legacy.dataset.jarvisBeaconLegacy='true';legacy.onload=function(){install();loadInferno()};legacy.onerror=install;(document.head||document.documentElement).appendChild(legacy);install();window.addEventListener('load',install,{once:true});
})();
