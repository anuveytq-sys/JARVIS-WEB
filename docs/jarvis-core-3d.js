/* JARVIS CORE 3D — clean central reactor with voice activation. */
(()=>{'use strict';
  const CORE_OVERLAY_ID='jarvis-neon-core-voice-overlay';
  const activateVisual=(el)=>{if(!el)return;el.classList.add('listening');setTimeout(()=>el.classList.remove('listening'),12000)};
  const syncNexusOverlay=(nexusCore,overlay)=>{
    if(!nexusCore||!overlay)return;
    const r=nexusCore.getBoundingClientRect();
    if(!r.width||!r.height){overlay.style.display='none';return;}
    overlay.style.display='block';
    overlay.style.left=`${r.left}px`;
    overlay.style.top=`${r.top}px`;
    overlay.style.width=`${r.width}px`;
    overlay.style.height=`${r.height}px`;
  };
  const boot=()=>{
    const stage=document.querySelector('.core-stage');
    const voice=document.querySelector('#voiceButton');
    if(stage&&!stage.dataset.jarvisCore3d){
      stage.dataset.jarvisCore3d='1';stage.classList.add('jarvis-core-enhanced');
      const reactor=document.createElement('div');reactor.className='jarvis-core-3d';reactor.setAttribute('aria-hidden','true');
      reactor.innerHTML='<span class="reactor-ring r1"></span><span class="reactor-ring r2"></span><span class="reactor-ring r3"></span><span class="reactor-ring r4"></span><span class="core-ray ray-a"></span><span class="core-ray ray-b"></span><span class="core-ray ray-c"></span><span class="core-shell"></span>';stage.appendChild(reactor);
      const hit=document.createElement('label');
      hit.className='jarvis-core-voice-hit';hit.htmlFor='voiceButton';hit.setAttribute('aria-label','Activate JARVIS microphone');hit.title='Click the core to speak a command';hit.setAttribute('role','button');hit.tabIndex=0;
      hit.addEventListener('click',()=>activateVisual(hit));
      hit.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){activateVisual(hit);}});
      stage.appendChild(hit);
    }
    const mainVoice=document.querySelector('#voiceButton');
    if(mainVoice&&!mainVoice.dataset.coreBridge){
      mainVoice.dataset.coreBridge='1';
      mainVoice.addEventListener('click',()=>activateVisual(document.querySelector('.jarvis-core-voice-hit')),{passive:true});
    }
    const nexusCore=document.querySelector('#nn-core');
    if(nexusCore&&!nexusCore.dataset.core3d){
      nexusCore.dataset.core3d='1';
      nexusCore.title='Click the JARVIS core to speak a command';
      let overlay=document.getElementById(CORE_OVERLAY_ID);
      if(!overlay){
        overlay=document.createElement('label');
        overlay.id=CORE_OVERLAY_ID;
        overlay.htmlFor='voiceButton';
        overlay.setAttribute('aria-label','Activate JARVIS microphone');
        overlay.title='Click the JARVIS core to speak a command';
        overlay.setAttribute('role','button');
        overlay.tabIndex=0;
        Object.assign(overlay.style,{position:'fixed',display:'none',zIndex:'2147483646',background:'transparent',cursor:'pointer',touchAction:'manipulation'});
        overlay.addEventListener('click',()=>activateVisual(nexusCore));
        overlay.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){activateVisual(nexusCore);}});
        document.body.appendChild(overlay);
      }
      syncNexusOverlay(nexusCore,overlay);
      const sync=()=>syncNexusOverlay(document.querySelector('#nn-core'),document.getElementById(CORE_OVERLAY_ID));
      window.addEventListener('resize',sync,{passive:true});
      window.addEventListener('scroll',sync,{passive:true});
      setInterval(sync,700);
    }else{
      syncNexusOverlay(nexusCore,document.getElementById(CORE_OVERLAY_ID));
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const wait=setInterval(()=>{boot();if(document.querySelector('.core-stage')&&document.querySelector('#nn-core'))clearInterval(wait)},700);setTimeout(()=>clearInterval(wait),15000);
})();
