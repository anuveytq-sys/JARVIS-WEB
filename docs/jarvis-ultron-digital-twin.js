/* JARVIS ULTRON DIGITAL TWIN
 * Replaces only the inner contents of ULTRON's existing top-left and bottom-right panels.
 * Uses the OpenRouter key/model already stored locally by JARVIS. No new provider or key.
 * The twin is a user-supplied, consent-based simulation; it does not infer private or
 * sensitive traits about real people and does not query breached/private data.
 */
(() => {
  'use strict';
  const VERSION = 'ultron-digital-twin-1.0.0';
  const KEY_SLOT = 'jarvisOpenRouterKey';
  const MODEL_SLOT = 'jarvisOpenRouterModel';
  const DEFAULT_MODEL = 'openrouter/free';
  const ROOT_ID = 'ultron-clean-core';
  const STATE_SLOT = 'jarvisUltronDigitalTwinV1';
  const STYLE_ID = 'ultron-digital-twin-style';

  const getStored = (slot, fallback='') => {
    try { return localStorage.getItem(slot) || sessionStorage.getItem(slot) || fallback; }
    catch (_) { try { return sessionStorage.getItem(slot) || fallback; } catch (__) { return fallback; } }
  };
  const safe = (v, max=4000) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  const escapeHtml = v => safe(v, 10000).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const loadState = () => { try { const x=JSON.parse(localStorage.getItem(STATE_SLOT)||'{}'); return x&&typeof x==='object'?x:{}; } catch (_) { return {}; } };
  const saveState = state => { try { localStorage.setItem(STATE_SLOT, JSON.stringify(state)); } catch (_) {} };
  const state = loadState();
  let appliedRoot = null;
  let busy = false;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID} .uc-dt-launcher{height:100%;display:flex;flex-direction:column;gap:6px;padding:7px;box-sizing:border-box;overflow:hidden}
      #${ROOT_ID} .uc-dt-head{display:flex;align-items:center;gap:5px;min-height:17px;color:#ffb37a;font:800 6px/1 Inter,system-ui,sans-serif;letter-spacing:.12em}
      #${ROOT_ID} .uc-dt-dot{width:4px;height:4px;flex:0 0 4px;border-radius:50%;background:#ff8a32;box-shadow:0 0 6px #ff572c}
      #${ROOT_ID} .uc-dt-status{margin-left:auto;font-size:5px;color:#ff7958}
      #${ROOT_ID} .uc-dt-label{color:#a96f4d;font:600 5px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em}
      #${ROOT_ID} .uc-dt-input,#${ROOT_ID} .uc-dt-question{width:100%;box-sizing:border-box;border:1px solid rgba(255,135,61,.32);border-radius:4px;background:rgba(12,6,3,.86);color:#ffe0c6;outline:none;font:7px/1.35 Inter,system-ui,sans-serif;padding:6px;resize:none;touch-action:auto}
      #${ROOT_ID} .uc-dt-input{height:39px}.uc-dt-question{height:43px}
      #${ROOT_ID} .uc-dt-input:focus,#${ROOT_ID} .uc-dt-question:focus{border-color:#ff9b50;box-shadow:0 0 0 1px rgba(255,110,35,.12)}
      #${ROOT_ID} .uc-dt-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:auto}
      #${ROOT_ID} .uc-dt-btn{min-width:0;height:25px;border:1px solid rgba(255,135,61,.38);border-radius:4px;background:linear-gradient(100deg,rgba(255,104,28,.18),rgba(35,10,2,.55));color:#ffd0ae;font:800 6px/1 Inter,system-ui,sans-serif;letter-spacing:.07em;cursor:pointer;touch-action:manipulation}
      #${ROOT_ID} .uc-dt-btn:hover,#${ROOT_ID} .uc-dt-btn:focus-visible{outline:none;border-color:#ff9b50;background:rgba(255,104,28,.3);box-shadow:0 0 9px rgba(255,92,24,.18)}
      #${ROOT_ID} .uc-dt-btn:disabled{opacity:.5;cursor:wait}
      #${ROOT_ID} .uc-dt-results{height:100%;display:flex;flex-direction:column;overflow:hidden}
      #${ROOT_ID} .uc-dt-results-head{display:flex;align-items:center;gap:5px;min-height:22px;padding:0 7px;background:rgba(255,105,33,.12);color:#ffb37a;font:800 6px/1 Inter,system-ui,sans-serif;letter-spacing:.1em;flex:0 0 22px}
      #${ROOT_ID} .uc-dt-results-status{margin-left:auto;color:#ff7958;font-size:5px}
      #${ROOT_ID} .uc-dt-results-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:7px;color:#ffd9bf;font:6.5px/1.45 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:rgba(255,130,50,.5) rgba(20,7,2,.5)}
      #${ROOT_ID} .uc-dt-card{border:1px solid rgba(255,135,61,.22);border-radius:4px;padding:6px;margin-bottom:5px;background:rgba(255,104,28,.055)}
      #${ROOT_ID} .uc-dt-card-title{color:#ffad70;font:800 6px/1.3 Inter,system-ui,sans-serif;letter-spacing:.08em;margin-bottom:3px}
      #${ROOT_ID} .uc-dt-muted{color:#9f6d4d}.uc-dt-value{color:#ffe1cb}
      #${ROOT_ID} .uc-dt-error{color:#ff8b70}
      #${ROOT_ID} .uc-dt-results-body::-webkit-scrollbar{width:3px}.uc-dt-results-body::-webkit-scrollbar-thumb{background:rgba(255,130,50,.5);border-radius:4px}
      @media(max-width:600px){#${ROOT_ID} .uc-dt-launcher{padding:5px;gap:4px}#${ROOT_ID} .uc-dt-input{height:34px}#${ROOT_ID} .uc-dt-question{height:38px}#${ROOT_ID} .uc-dt-btn{height:22px;font-size:5px}}
    `;
    document.head.appendChild(style);
  }

  function renderResults(panel, payload){
    const body=panel.querySelector('.uc-dt-results-body');
    const status=panel.querySelector('.uc-dt-results-status');
    if(!body)return;
    const twin=payload && payload.twin && typeof payload.twin==='object' ? payload.twin : payload;
    const answer=safe(payload?.answer||'',4000);
    const cards=[];
    const push=(title,value)=>{if(value===undefined||value===null||value==='')return;const text=Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value,null,2):String(value);cards.push('<div class="uc-dt-card"><div class="uc-dt-card-title">'+escapeHtml(title)+'</div><div class="uc-dt-value">'+escapeHtml(text)+'</div></div>');};
    if(twin && typeof twin==='object'){
      push('IDENTITY / ROLE',twin.identity||twin.role||twin.profile);
      push('CURRENT STATE',twin.currentState||twin.state);
      push('CAPABILITIES',twin.capabilities);
      push('GOALS / OBJECTIVES',twin.goals||twin.objectives);
      push('ENVIRONMENT',twin.environment);
      push('SIMULATION',twin.simulation||twin.behavior);
      push('RISKS / LIMITS',twin.risks||twin.limitations);
      push('NEXT ACTIONS',twin.nextActions||twin.recommendations);
    }
    if(answer)push('TWIN RESPONSE',answer);
    if(!cards.length)cards.push('<div class="uc-dt-card"><div class="uc-dt-muted">DIGITAL TWIN READY</div><div class="uc-dt-value">Build a twin from your own description, then ask a question or run a scenario.</div></div>');
    body.innerHTML=cards.join('');
    body.scrollTop=0;
    if(status)status.textContent=payload?.status==='offline'?'LOCAL':'READY';
  }

  async function callOpenRouter(input, question, mode){
    const apiKey=getStored(KEY_SLOT,'');
    const model=getStored(MODEL_SLOT,DEFAULT_MODEL);
    if(!apiKey)throw new Error('No existing OpenRouter key is saved in JARVIS Settings.');
    const controller=typeof AbortController==='function'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),30000):null;
    const system=`You are JARVIS Digital Twin Engine. Build a transparent simulation only from user-provided facts. Never claim access to private databases, leaked data, device sensors, accounts, passwords, or hidden records. Do not identify or profile a real person from an email, phone number, username, image, or other identifier. Do not infer sensitive traits. Treat unknowns as unknown. The twin may represent the user's own workflow, a fictional entity, a machine, a project, or a consented profile. Return ONLY valid JSON: {"twin":{"identity":"","currentState":"","capabilities":[],"goals":[],"environment":"","simulation":"","risks":[],"nextActions":[]},"answer":""}. Make the simulation useful, concrete, and internally consistent.`;
    const user=[
      'MODE: '+mode,
      'TWIN INPUT:\n'+safe(input,5000),
      question?'QUESTION / SCENARIO:\n'+safe(question,2500):'Build the initial digital twin state.'
    ].join('\n\n');
    try{
      const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-OpenRouter-Title':'JARVIS Web ULTRON Digital Twin'},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:.2,max_tokens:1800}),signal:controller?controller.signal:undefined});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error?.message||('OpenRouter returned HTTP '+response.status));
      let content=data?.choices?.[0]?.message?.content;
      if(Array.isArray(content))content=content.map(x=>x?.text||'').join('');
      content=String(content||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
      let parsed;try{parsed=JSON.parse(content);}catch(_){const a=content.indexOf('{'),b=content.lastIndexOf('}');if(a<0||b<=a)throw new Error('OpenRouter returned unreadable JSON.');parsed=JSON.parse(content.slice(a,b+1));}
      return parsed;
    }finally{if(timer)clearTimeout(timer);}
  }

  function apply(){
    const root=document.getElementById(ROOT_ID);
    if(!root)return false;
    if(appliedRoot===root && root.querySelector('.uc-dt-launcher') && root.querySelector('.uc-dt-results'))return true;
    appliedRoot=root;addStyle();
    const left=root.querySelector('.uc-osint-launcher');
    const right=root.querySelector('.uc-target-details');
    if(!left||!right)return false;
    // Keep the existing panel shells, borders, size, position and expand behavior.
    left.setAttribute('aria-label','Digital Twin questions and controls');
    left.innerHTML=`<div class="uc-dt-launcher"><div class="uc-dt-head"><span class="uc-dt-dot"></span><span>DIGITAL TWIN</span><span class="uc-dt-status">AI</span></div><div class="uc-dt-label">TWIN DESCRIPTION</div><textarea class="uc-dt-input" maxlength="5000" placeholder="Describe yourself, a project, machine, or fictional system…"></textarea><div class="uc-dt-label">QUESTION / SCENARIO</div><textarea class="uc-dt-question" maxlength="2500" placeholder="Ask the twin or describe a scenario…"></textarea><div class="uc-dt-actions"><button type="button" class="uc-dt-btn uc-dt-build">BUILD TWIN</button><button type="button" class="uc-dt-btn uc-dt-ask">RUN SCAN</button></div></div>`;
    right.setAttribute('aria-label','Digital Twin results');
    right.innerHTML=`<div class="uc-dt-results"><div class="uc-dt-results-head"><span>DIGITAL TWIN // RESULTS</span><span class="uc-dt-results-status">READY</span></div><div class="uc-dt-results-body"></div></div>`;
    const input=left.querySelector('.uc-dt-input'),question=left.querySelector('.uc-dt-question'),build=left.querySelector('.uc-dt-build'),ask=left.querySelector('.uc-dt-ask');
    if(state.input)input.value=state.input;if(state.question)question.value=state.question;
    if(state.result)renderResults(right,state.result);else renderResults(right,{});
    [left,right].forEach(p=>p.addEventListener('pointerdown',e=>e.stopPropagation(),true));
    [left,right].forEach(p=>p.addEventListener('click',e=>e.stopPropagation(),true));
    const run=async mode=>{
      if(busy)return;
      const twinInput=safe(input.value,5000),q=safe(question.value,2500);
      if(twinInput.length<4){input.focus();input.setCustomValidity('Add a short description first.');input.reportValidity();input.setCustomValidity('');return;}
      busy=true;build.disabled=true;ask.disabled=true;
      const status=right.querySelector('.uc-dt-results-status');if(status)status.textContent='PROCESSING';
      renderResults(right,{twin:{currentState:'Building digital twin with the locally saved OpenRouter configuration…'},status:'working'});
      state.input=twinInput;state.question=q;saveState(state);
      try{
        const result=await callOpenRouter(twinInput,q,mode);
        state.result=result;state.updatedAt=Date.now();saveState(state);renderResults(right,result);
      }catch(error){
        const message=String(error?.message||error);
        renderResults(right,{status:'error',answer:'Digital twin request failed: '+message});
      }finally{busy=false;build.disabled=false;ask.disabled=false;if(status&&right.isConnected)status.textContent='READY';}
    };
    build.addEventListener('click',e=>{e.stopPropagation();run('BUILD');});
    ask.addEventListener('click',e=>{e.stopPropagation();run('SIMULATE');});
    question.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run('SIMULATE');}});
    window.ULTRON_DIGITAL_TWIN={version:VERSION,apply,run:(mode='SIMULATE')=>run(mode),getState:()=>({...state})};
    return true;
  }

  window.JARVIS_ULTRON_DIGITAL_TWIN={version:VERSION,apply};
  let attempts=0;
  const wait=()=>{if(apply()||attempts++>60)return;setTimeout(wait,100);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
