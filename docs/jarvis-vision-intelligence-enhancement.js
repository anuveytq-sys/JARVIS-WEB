/* Vision Intelligence UX enhancement layer. Keeps the core VI module intact. */
(()=>{'use strict';
  if(window.__JVI_ENHANCEMENT__)return; window.__JVI_ENHANCEMENT__=true;
  const speak=t=>{try{if(typeof window.speak==='function')window.speak(t);else if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}}catch(_){}};
  const openVI=()=>{
    try{if(typeof window.sendCommand==='function'){window.sendCommand('open vision intelligence');return true}}catch(_){}
    const root=document.getElementById('jvi-root');
    if(root){root.classList.add('open');document.body.classList.add('jvi-active');return true}
    return false;
  };
  function installVI(){
    const root=document.getElementById('jvi-root'); if(!root||root.__enhanced)return;
    root.__enhanced=true;
    let wasOpen=root.classList.contains('open');
    const announce=()=>{const now=root.classList.contains('open');if(now===wasOpen)return;wasOpen=now;if(now){speak('Vision Intelligence online.')}else{speak('Vision Intelligence closed.')}};
    new MutationObserver(announce).observe(root,{attributes:true,attributeFilter:['class']});
    const core=root.querySelector('.jvi-holo-core');
    if(core)core.addEventListener('click',e=>{e.stopPropagation();root.querySelector('#jvi-voice')?.click();});
    const holo=root.querySelector('.jvi-holo');
    if(holo)holo.addEventListener('click',e=>{if(e.target.closest('.jvi-holo-core'))return;root.querySelector('#jvi-command')?.focus({preventScroll:true});});
    const close=root.querySelector('#jvi-close');
    if(close)close.addEventListener('click',()=>setTimeout(()=>speak('Vision Intelligence closed.'),20));
    const cmd=root.querySelector('#jvi-command');
    if(cmd)cmd.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){const q=(cmd.value||'').trim().toLowerCase();if(/^(?:close|exit|leave|quit)\s+(?:this\s+)?(?:environment|vision(?:\s+intelligence)?|vi)$/.test(q)||/^(?:close|exit)\s+(?:vision\s+intelligence|vi)$/.test(q)){e.preventDefault();close?.click();}}});
  }
  function installNeonShortcut(){
    const box=document.getElementById('nn-environments'); if(!box||box.__viShortcut)return;
    box.__viShortcut=true;
    const ensure=()=>{
      if(box.querySelector('[data-environment="vision"]'))return;
      const item=document.createElement('div');item.className='nn-env';item.dataset.environment='vision';item.setAttribute('role','button');item.tabIndex=0;item.setAttribute('aria-label','Open Vision Intelligence');item.title='Open Vision Intelligence';
      item.innerHTML='<span class="nn-env-icon">◉</span><div><b>VISION INTELLIGENCE</b><small>Reality interface · camera · image analysis</small></div><i class="nn-env-state"></i><em>OPEN ↗</em>';
      box.appendChild(item);
    };
    ensure();
    box.addEventListener('click',e=>{const item=e.target.closest('[data-environment="vision"]');if(item){e.preventDefault();openVI();}});
    box.addEventListener('keydown',e=>{const item=e.target.closest('[data-environment="vision"]');if(item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openVI();}});
    new MutationObserver(ensure).observe(box,{childList:true});
  }
  const boot=()=>{installVI();installNeonShortcut();};
  new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
  boot();
})();
