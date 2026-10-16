/* Vision Intelligence UX enhancement layer. Keeps the core VI module intact. */
(()=>{'use strict';
  if(window.__JVI_ENHANCEMENT__)return; window.__JVI_ENHANCEMENT__=true;
  const speak=t=>{try{if(typeof window.speak==='function')window.speak(t);else if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}}catch(_) {}};
  const cleanSpeech=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/[*_#`]/g,'').slice(0,1800);
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
    if(core)core.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();root.querySelector('#jvi-voice')?.click();});
    const close=root.querySelector('#jvi-close');
    if(close)close.addEventListener('click',()=>setTimeout(()=>speak('Vision Intelligence closed.'),20));
    const cmd=root.querySelector('#jvi-command');
    if(cmd)cmd.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){const q=(cmd.value||'').trim().toLowerCase();if(/^(?:close|exit|leave|quit)\s+(?:this\s+)?(?:environment|vision(?:\s+intelligence)?|vi)$/.test(q)||/^(?:close|exit)\s+(?:vision\s+intelligence|vi)$/.test(q)){e.preventDefault();close?.click();}}});

    /* Speak meaningful AI scan results without changing the existing analysis engine. */
    const speechState={last:'',ready:false,timer:0};
    const resultText=()=>{
      const title=root.querySelector('#jvi-profile-title')?.textContent||'';
      const body=root.querySelector('#jvi-profile-text')?.textContent||'';
      const summary=root.querySelector('#jvi-summary')?.textContent||'';
      const combined=cleanSpeech([title,body].filter(Boolean).join('. '));
      return combined.length>=20?combined:cleanSpeech(summary);
    };
    const speakResult=()=>{
      if(!speechState.ready)return;
      clearTimeout(speechState.timer);
      speechState.timer=setTimeout(()=>{
        const text=resultText();
        if(!text||text===speechState.last)return;
        if(/^(no target selected|your analysis appears here|acquire a visual target to begin contextual analysis)\.?$/i.test(text))return;
        speechState.last=text;
        speak('Scan analysis complete. '+text);
      },350);
    };
    new MutationObserver(speakResult).observe(root,{childList:true,subtree:true,characterData:true});
    setTimeout(()=>{speechState.ready=true;speechState.last=resultText();},1200);

    /* Quick Investigation fix: route the four buttons through the same proven image-analysis send path,
       with task-specific prompts. This prevents the buttons from surfacing raw safety metadata instead
       of the requested visual analysis. */
    const quickPrompts={
      'explain how it works':'Analyze the captured image and explain what the identified subject is and how it works. Focus on visible components, purpose, operation, and relationships between parts. Give concrete image-grounded information directly.',
      'inspect visible parts':'Inspect the captured image carefully. List the important visible parts or components, where they are located, what each appears to do, and any visible markings or interfaces. Separate direct observations from reasonable inferences.',
      'discover key facts':'Using the captured image, identify the main subject and give useful, interesting facts directly relevant to what is visible. Include distinguishing features, likely purpose, context, and notable details. Clearly label uncertain points.',
      'check uncertainty':'Review the captured image and explain what can be determined confidently, what remains uncertain, why it is uncertain, and what additional visual detail or angle would improve identification.'
    };
    const installQuickInvestigations=()=>{
      root.querySelectorAll('.jvi-quick button').forEach(btn=>{
        if(btn.__jviQuickFix)return;
        const text=btn.textContent.toLowerCase();
        const key=Object.keys(quickPrompts).find(k=>text.includes(k));
        if(!key)return;
        btn.__jviQuickFix=true;
        btn.setAttribute('data-q',quickPrompts[key]);
        btn.addEventListener('click',e=>{
          e.preventDefault();
          e.stopImmediatePropagation();
          const command=root.querySelector('#jvi-command');
          const send=root.querySelector('#jvi-send');
          if(!command||!send){return;}
          command.value=quickPrompts[key];
          command.dispatchEvent(new Event('input',{bubbles:true}));
          const state=root.querySelector('#jvi-command-state');
          if(state)state.textContent='ANALYZING '+key.toUpperCase();
          send.click();
        },true);
      });
    };
    installQuickInvestigations();
    new MutationObserver(installQuickInvestigations).observe(root,{childList:true,subtree:true});
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
