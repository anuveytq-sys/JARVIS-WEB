/* JARVIS CORE 3D — clean central reactor with voice activation. */
(()=>{'use strict';
  const boot=()=>{
    const stage=document.querySelector('.core-stage');
    if(stage&&!stage.dataset.jarvisCore3d){
      stage.dataset.jarvisCore3d='1';stage.classList.add('jarvis-core-enhanced');
      const reactor=document.createElement('div');reactor.className='jarvis-core-3d';reactor.setAttribute('aria-hidden','true');
      reactor.innerHTML='<span class="reactor-ring r1"></span><span class="reactor-ring r2"></span><span class="reactor-ring r3"></span><span class="reactor-ring r4"></span><span class="core-ray ray-a"></span><span class="core-ray ray-b"></span><span class="core-ray ray-c"></span><span class="core-shell"></span>';stage.appendChild(reactor);
      const hit=document.createElement('button');
      hit.type='button';hit.className='jarvis-core-voice-hit';hit.setAttribute('aria-label','Activate JARVIS microphone');hit.title='Click the core to speak a command';
      hit.innerHTML='';
      hit.addEventListener('click',()=>{const v=document.querySelector('#voiceButton');if(v&&!v.disabled){hit.classList.add('listening');v.click();setTimeout(()=>hit.classList.remove('listening'),12000)}else{document.querySelector('#commandInput')?.focus()}});stage.appendChild(hit);
    }
    const mainVoice=document.querySelector('#voiceButton');
    if(mainVoice&&!mainVoice.dataset.coreBridge){mainVoice.dataset.coreBridge='1';mainVoice.addEventListener('click',()=>{document.querySelector('.jarvis-core-voice-hit')?.classList.add('listening');setTimeout(()=>document.querySelector('.jarvis-core-voice-hit')?.classList.remove('listening'),12000)},{passive:true});}
    const nexusCore=document.querySelector('#nn-core');
    if(nexusCore&&!nexusCore.dataset.core3d){nexusCore.dataset.core3d='1';nexusCore.title='Click the JARVIS core to speak a command';nexusCore.addEventListener('click',()=>{nexusCore.classList.add('listening');setTimeout(()=>nexusCore.classList.remove('listening'),12000)},{passive:true});}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const wait=setInterval(()=>{boot();if(document.querySelector('.core-stage')&&document.querySelector('#nn-core'))clearInterval(wait)},700);setTimeout(()=>clearInterval(wait),15000);
})();
