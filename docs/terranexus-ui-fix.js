/* TERRANEXUS UI fix: remove accidental "undefined" labels and show simulation equations safely. */
(()=>{'use strict';
  const EQUATIONS={
    atom:'Z = Nₚ  (neutral atom: Nₑ = Z)',water:'2H₂ + O₂ → 2H₂O',methane:'CH₄ + 2O₂ → CO₂ + 2H₂O',co2:'CO₂ + H₂O ⇌ H₂CO₃',engine:'W = ∮ P dV',gears:'ω₁ / ω₂ = N₂ / N₁',motor:'τ = kₜ I',pendulum:'T ≈ 2π√(L/g)',lever:'F₁d₁ = F₂d₂',solar:'F = G M m / r²',combustion:'CH₄ + 2O₂ → CO₂ + 2H₂O',photosynthesis:'6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂',projectile:'y = y₀ + v₀ᵧt − ½gt²',spring:'F = −kx  ·  x(t) = A cos(ωt)',collision:'p₁ + p₂ = p₁′ + p₂′',circuit:'V = IR',ammonia:'NH₃  ·  ∠H–N–H ≈ 107°',benzene:'C₆H₆',magnet:'∇ · B = 0',wave:'v = fλ',optics:'1/f = 1/u + 1/v',greenhouse:'Energy in ≈ Energy out',orbital:'iℏ ∂ψ/∂t = Ĥψ',thermo:'η = 1 − T꜀/Tₕ',electrolysis:'2H₂O(l) → 2H₂(g) + O₂(g)',torque:'τ = r × F',interference:'y = y₁ + y₂',kinetics:'k = A e^(−Eₐ/RT)',stress:'σ = F/A  ·  ε = ΔL/L',orbitalmotion:'F = G M m / r²',hydraulic:'F₁/A₁ = F₂/A₂'
  };
  const cleanUndefined=(root=document)=>{
    const nodes=root.querySelectorAll?root.querySelectorAll('button,[role="button"],a,.terranexus-demo-btn,.terranexus-sim-btn'):[];
    for(const el of nodes){
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),texts=[];let node;
      while((node=walker.nextNode()))texts.push(node);
      for(const textNode of texts){const value=String(textNode.nodeValue||'');if(/\bundefined\b/i.test(value)){const cleaned=value.replace(/\s*\bundefined\b\s*/gi,' ').replace(/\s{2,}/g,' ');if(cleaned.trim())textNode.nodeValue=cleaned;else textNode.remove();}}
    }
  };
  const equationPanel=()=>{
    const inspector=document.querySelector('#terranexus-overlay .tn-inspector');if(!inspector)return null;
    let panel=inspector.querySelector('#tn-equation-inspector');if(panel)return panel;
    panel=document.createElement('div');panel.id='tn-equation-inspector';
    panel.innerHTML='<small class="tn-kicker">SIMULATION EQUATION</small><div class="tn-equation-card"><span class="tn-equation-label">GOVERNING RELATION</span><strong id="tn-inspector-equation"></strong></div>';
    const parts=inspector.querySelector('#tn-parts');if(parts)parts.parentNode.insertBefore(panel,parts);else inspector.appendChild(panel);
    if(!document.getElementById('tn-equation-style')){const style=document.createElement('style');style.id='tn-equation-style';style.textContent='#tn-equation-inspector{margin:18px 0 6px}.tn-equation-card{margin-top:8px;padding:12px 13px;border:1px solid rgba(255,174,93,.34);background:rgba(255,147,55,.07);border-radius:10px;box-shadow:inset 0 0 18px rgba(255,125,35,.05)}.tn-equation-label{display:block;font-size:9px;letter-spacing:.14em;opacity:.62;margin-bottom:6px}.tn-equation-card strong{display:block;font-size:16px;line-height:1.45;letter-spacing:.01em;color:#ffd2a1;overflow-wrap:anywhere}';document.head.appendChild(style);}
    return panel;
  };
  const updateEquation=()=>{const panel=equationPanel();if(!panel)return;const out=panel.querySelector('#tn-inspector-equation');const active=document.querySelector('#terranexus-overlay #tn-demos [data-demo].on');const id=active&&active.dataset.demo;const equation=EQUATIONS[id];panel.style.display=equation?'block':'none';if(out&&equation)out.textContent=equation;};
  const start=()=>{
    cleanUndefined(document);updateEquation();
    document.addEventListener('click',e=>{const target=e.target&&e.target.closest?e.target.closest('#terranexus-overlay #tn-demos [data-demo]'):null;if(target)requestAnimationFrame(updateEquation);},true);
    const observer=new MutationObserver(mutations=>{let shouldClean=false,overlayAdded=false;for(const mutation of mutations){if(mutation.type==='characterData'&&/\bundefined\b/i.test(String(mutation.target.nodeValue||'')))shouldClean=true;if(mutation.type==='childList'){for(const node of mutation.addedNodes){if(node.nodeType===1||node.nodeType===3){shouldClean=true;if(node.nodeType===1&&node.id==='terranexus-overlay')overlayAdded=true;}}}}if(shouldClean)cleanUndefined(document);if(overlayAdded)requestAnimationFrame(updateEquation);});
    observer.observe(document.documentElement||document,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();