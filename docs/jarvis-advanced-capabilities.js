/* JARVIS Advanced Capabilities v1
 * Reality Simulator, Universal Workflow Operator, Knowledge Singularity,
 * Predictive Intelligence Radar. Uses the existing command box and provider.
 */
(() => {
"use strict";
if(window.__JARVIS_ADVANCED_CAPABILITIES__)return;
window.__JARVIS_ADVANCED_CAPABILITIES__=true;
const KEYS={knowledge:"jarvis.knowledge.v1",radar:"jarvis.radar.github.v1",seen:"jarvis.radar.seen.v1"};
const norm=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s=./:-]/g," ").replace(/\s+/g," ").trim();
function dist(a,b){const r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const o=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=o;}}return r[b.length];}
function has(t,w){return t.includes(w)||(w.length>=5&&t.split(" ").some(x=>x.length>=4&&dist(x,w)<=1));}
function get(k,d){try{return JSON.parse(localStorage.getItem(k)||"null")??d}catch(_){return d}}
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}
function panel(title,body,kind){let p=document.getElementById("jarvis-capability-results");if(!p){p=document.createElement("section");p.id="jarvis-capability-results";Object.assign(p.style,{position:"fixed",left:"50%",bottom:"18px",transform:"translateX(-50%)",width:"min(93vw,780px)",maxHeight:"52vh",overflow:"auto",zIndex:"2147483000",padding:"16px",boxSizing:"border-box",color:"#c8faff",background:"rgba(1,10,24,.97)",border:"1px solid rgba(0,225,255,.72)",borderRadius:"12px",boxShadow:"0 0 28px rgba(0,190,255,.22)",font:"13px/1.55 system-ui,sans-serif",whiteSpace:"pre-wrap",overflowWrap:"anywhere"});document.body.appendChild(p)}p.dataset.capability=kind||"general";p.textContent=title+"\n\n"+body;}
async function ask(prompt){const r=await window.fetch("/api/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:prompt})});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw Error(d.reply||("AI provider error "+r.status));if(!String(d.reply||"").trim())throw Error("Selected AI provider returned an empty response.");return String(d.reply).trim();}

// REALITY SIMULATOR: transparent equation models, explicit defaults and validation.
const models={
pendulum:{a:["pendulum","simple pendulum"],f:"T = 2π√(L/g)",p:{length:1,g:9.81}},
projectile:{a:["projectile","trajectory","throwing motion"],f:"T = 2v sin(θ)/g; R = v² sin(2θ)/g",p:{speed:20,angle:45,g:9.81}},
gear:{a:["gear ratio","gears","gearbox"],f:"ω₂ = ω₁ × N₁/N₂",p:{inputRpm:120,driverTeeth:12,drivenTeeth:36}},
circuit:{a:["ohms law","ohm s law","electric circuit","resistor circuit","current","voltage"],f:"I = V/R; P = VI",p:{voltage:12,resistance:6}},
spring:{a:["spring","hookes law","spring force"],f:"F = kx; E = ½kx²",p:{stiffness:100,displacement:.1}},
hydraulic:{a:["hydraulic press","pascals principle","hydraulic system"],f:"F₂ = F₁ × A₂/A₁",p:{inputForce:100,inputArea:.01,outputArea:.1}},
torque:{a:["torque","moment of force"],f:"τ = rF sin(θ)",p:{force:20,arm:.5,angle:90}},
wave:{a:["wave speed","transverse wave","wave motion"],f:"v = fλ",p:{frequency:5,wavelength:2}},
stress:{a:["stress strain","material stress"],f:"σ = F/A",p:{force:1000,area:.0001}}
};
function number(t,aliases,def){for(const a of aliases){const m=t.match(new RegExp("(?:^|\\s)"+a.replace(/[.*+?^{}()|[\]\\]/g,"\\$&")+"\\s*(?:=|:|is|of)?\\s*(-?\\d+(?:\\.\\d+)?)","i"));if(m)return Number(m[1]);}return def;}
function simulate(cmd){const t=norm(cmd),id=Object.keys(models).find(k=>models[k].a.some(a=>has(t,a)));if(!id)return null;const p={...models[id].p};if(id==="pendulum"){p.length=number(t,["length","l"],p.length);p.g=number(t,["gravity","g"],p.g)}
if(id==="projectile"){p.speed=number(t,["speed","velocity"],p.speed);p.angle=number(t,["angle","degrees"],p.angle);p.g=number(t,["gravity","g"],p.g)}
if(id==="gear"){p.inputRpm=number(t,["rpm","input rpm"],p.inputRpm);p.driverTeeth=number(t,["driver teeth","input teeth"],p.driverTeeth);p.drivenTeeth=number(t,["driven teeth","output teeth"],p.drivenTeeth)}
if(id==="circuit"){p.voltage=number(t,["voltage","volts","v"],p.voltage);p.resistance=number(t,["resistance","ohms","r"],p.resistance)}
if(id==="spring"){p.stiffness=number(t,["stiffness","spring constant","k"],p.stiffness);p.displacement=number(t,["displacement","extension","x"],p.displacement)}
if(id==="hydraulic"){p.inputForce=number(t,["input force","force"],p.inputForce);p.inputArea=number(t,["input area"],p.inputArea);p.outputArea=number(t,["output area"],p.outputArea)}
if(id==="torque"){p.force=number(t,["force"],p.force);p.arm=number(t,["arm","radius","distance"],p.arm);p.angle=number(t,["angle","degrees"],p.angle)}
if(id==="wave"){p.frequency=number(t,["frequency","freq"],p.frequency);p.wavelength=number(t,["wavelength","lambda"],p.wavelength)}
if(id==="stress"){p.force=number(t,["force"],p.force);p.area=number(t,["area"],p.area)}
const f=n=>Number.isFinite(n)?Number(n.toFixed(5)).toString():"undefined";let out=[];
if(id==="pendulum"){if(p.length<=0||p.g<=0)throw Error("Pendulum length and gravity must be positive.");out=["Period: "+f(2*Math.PI*Math.sqrt(p.length/p.g))+" s","Frequency: "+f(1/(2*Math.PI*Math.sqrt(p.length/p.g)))+" Hz"]}
if(id==="projectile"){if(p.speed<0||p.g<=0)throw Error("Speed must be non-negative and gravity positive.");const a=p.angle*Math.PI/180;out=["Flight time (same launch and landing height): "+f(2*p.speed*Math.sin(a)/p.g)+" s","Horizontal range: "+f(p.speed*p.speed*Math.sin(2*a)/p.g)+" m","Maximum rise: "+f(Math.pow(p.speed*Math.sin(a),2)/(2*p.g))+" m"]}
if(id==="gear"){if(p.driverTeeth<=0||p.drivenTeeth<=0)throw Error("Gear tooth counts must be positive.");out=["Output speed: "+f(p.inputRpm*p.driverTeeth/p.drivenTeeth)+" rpm","Ideal speed ratio: "+f(p.driverTeeth/p.drivenTeeth),"Direction: opposite for directly meshed external gears"]}
if(id==="circuit"){if(p.resistance<=0)throw Error("Resistance must be positive.");out=["Current: "+f(p.voltage/p.resistance)+" A","Power: "+f(p.voltage*p.voltage/p.resistance)+" W"]}
if(id==="spring"){if(p.stiffness<0)throw Error("Spring stiffness cannot be negative.");out=["Restoring-force magnitude: "+f(p.stiffness*Math.abs(p.displacement))+" N","Stored elastic energy: "+f(.5*p.stiffness*p.displacement*p.displacement)+" J"]}
if(id==="hydraulic"){if(p.inputArea<=0||p.outputArea<=0)throw Error("Piston areas must be positive.");out=["Ideal output force: "+f(p.inputForce*p.outputArea/p.inputArea)+" N","Ideal mechanical advantage: "+f(p.outputArea/p.inputArea),"Assumption: incompressible fluid and negligible losses"]}
if(id==="torque")out=["Torque magnitude: "+f(p.arm*p.force*Math.sin(p.angle*Math.PI/180))+" N·m"];
if(id==="wave"){if(p.frequency<0||p.wavelength<0)throw Error("Frequency and wavelength cannot be negative.");out=["Wave speed: "+f(p.frequency*p.wavelength)+" m/s"]}
if(id==="stress"){if(p.area<=0)throw Error("Cross-sectional area must be positive.");out=["Average normal stress: "+f(p.force/p.area)+" Pa"]}
return{id,formula:models[id].f,p,out};}
async function runSimulation(cmd){const r=simulate(cmd);if(!r)return false;panel("REALITY SIMULATOR // "+r.id.toUpperCase(),"Governing relation: "+r.formula+"\n\nINPUT PARAMETERS\n"+Object.entries(r.p).map(([k,v])=>k+" = "+v).join("\n")+"\n\nCOMPUTED OUTPUT\n"+r.out.join("\n")+"\n\nEducational equation model. Defaults are explicitly shown. Idealizations and omitted real-world effects can change actual outcomes.","simulation");const map={pendulum:"pendulum",projectile:"projectile",gear:"gears",circuit:"circuit",spring:"spring",hydraulic:"hydraulic",torque:"torque",wave:"wave",stress:"stress"};try{window.TERRANEXUS?.open?.();window.TERRANEXUS?.show?.(map[r.id]);}catch(_){}window.speak?.("Simulation complete. "+r.out.join(". "));return true;}

// UNIVERSAL WORKFLOW OPERATOR: creates validated plans, does not fake external actions.
async function workflow(cmd){const result=await ask("You are JARVIS Universal Workflow Operator. Turn this goal into an ordered execution plan. Return: objective, prerequisites, numbered steps, required tools/integrations/permissions, validation after each step, rollback/recovery plan, and final approval checkpoint. Explicitly distinguish actions supported by connected tools from actions needing user intervention or missing integrations. Do not claim to execute anything. Never ask for passwords or secret keys in chat. Publishing, messaging, payments, destructive changes and account changes require explicit confirmation and authorized integrations.\nUSER GOAL:\n"+String(cmd).slice(0,3500));panel("UNIVERSAL WORKFLOW OPERATOR // PLAN READY",result+"\n\nSTATE: PLAN ONLY. No external app, account, repository, or device action has been performed.","workflow");window.speak?.("Workflow plan prepared. No external actions have been executed.");return true;}

// KNOWLEDGE SINGULARITY: private browser-local index and ranked keyword retrieval.
function knowledge(cmd){const raw=String(cmd||"").trim(),t=norm(raw),items=get(KEYS.knowledge,[]);
const add=raw.match(/(?:remember|save|store|index|learn this|note this|add (?:a )?note|save note|add to (?:my )?knowledge(?: base)?)(?:\s+(?:that|this|note|fact|information))?\s*[:,-]?\s*(.+)$/i);
const search=raw.match(/(?:search|find|look up|retrieve|recall)(?:\s+(?:my|the))?\s+(?:knowledge|notes|note|memory|index)(?:\s+(?:for|about))?\s+(.+)$/i);
if(add){const value=add[1].trim();if(value.length<4){window.speak?.("Please include the information to save.");return true;}items.unshift({id:Date.now().toString(36),text:value,createdAt:new Date().toISOString()});const next=items.slice(0,250);if(!put(KEYS.knowledge,next))throw Error("Browser-local storage is unavailable or full.");panel("KNOWLEDGE SINGULARITY // INDEXED","Saved to this browser's local index.\n\n"+value+"\n\nEntries: "+next.length+"\nScope: this browser/device only; not synced or uploaded.","knowledge");window.speak?.("Added to your local knowledge index.");return true;}
if(search){const words=norm(search[1]).split(" ").filter(w=>w.length>2);const hits=items.map(x=>({x,score:words.reduce((n,w)=>n+(norm(x.text).includes(w)?1:0),0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,8);panel("KNOWLEDGE SINGULARITY // RETRIEVAL","Query: "+search[1]+"\nMatches: "+hits.length+"\n\n"+(hits.length?hits.map((x,i)=>(i+1)+". "+x.x.text+"\nSaved: "+x.x.createdAt).join("\n\n"):"No matching local notes found.")+"\n\nScope: browser-local keyword retrieval; no private files or external accounts were searched.","knowledge");return true;}
if(/\b(show|list|view)\b.*\b(knowledge|saved notes|index)\b/.test(t)){panel("KNOWLEDGE SINGULARITY // INDEX STATUS","Entries: "+items.length+"\nStorage: browser-local\nMaximum retained entries: 250\n\n"+items.slice(0,15).map((x,i)=>(i+1)+". "+x.text).join("\n"),"knowledge");return true;}
return false;}

// PREDICTIVE RADAR: public GitHub repository commits; polls only while page is open.
const timers=new Map();
function watches(){return get(KEYS.radar,[]);}
async function checkRepo(repo,silent){if(!/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(repo))throw Error("Use a public GitHub repository in owner/repo format.");const r=await window.fetch("https://api.github.com/repos/"+repo+"/commits?per_page=1",{headers:{Accept:"application/vnd.github+json"}});if(!r.ok)throw Error("GitHub returned HTTP "+r.status+" for "+repo);const a=await r.json(),c=a?.[0];if(!c?.sha)throw Error("No public commit data returned.");const seen=get(KEYS.seen,{}),old=seen[repo];seen[repo]={sha:c.sha,checkedAt:new Date().toISOString(),message:String(c.commit?.message||"").split("\n")[0],url:c.html_url};put(KEYS.seen,seen);if(old&&old.sha!==c.sha&&!silent){const msg="New public commit detected: "+repo+"\n"+seen[repo].message+"\n"+c.html_url;panel("PREDICTIVE INTELLIGENCE RADAR // CHANGE DETECTED",msg,"radar");try{if("Notification"in window&&Notification.permission==="granted")new Notification("JARVIS Radar: "+repo,{body:seen[repo].message});}catch(_){}}return{repo,sha:c.sha,message:seen[repo].message,url:c.html_url};}
async function radar(cmd){const raw=String(cmd||"").trim(),t=norm(raw),add=raw.match(/(?:watch|monitor|track|keep an eye on)(?:\s+(?:the )?(?:github )?(?:repository|repo))?\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i),remove=raw.match(/(?:stop watching|unwatch|remove radar watch for)\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i);
if(add){const repo=add[1],list=watches().filter(x=>x!==repo);list.push(repo);put(KEYS.radar,list.slice(-10));const first=await checkRepo(repo,true);if(!timers.has(repo))timers.set(repo,setInterval(()=>checkRepo(repo,false).catch(()=>{}),900000));panel("PREDICTIVE INTELLIGENCE RADAR // WATCH ACTIVE","Repository: "+repo+"\nLatest commit: "+first.message+"\nSHA: "+first.sha.slice(0,12)+"\n\nPoll interval: 15 minutes while this page is open.\nStorage: browser-local. Monitoring pauses when the browser/page closes; this is not a cloud background service.","radar");window.speak?.("Radar watch activated for "+repo+".");return true;}
if(remove){const repo=remove[1];put(KEYS.radar,watches().filter(x=>x!==repo));if(timers.has(repo)){clearInterval(timers.get(repo));timers.delete(repo);}panel("PREDICTIVE INTELLIGENCE RADAR // WATCH REMOVED",repo+" removed from local watch list.","radar");return true;}
if(/\b(check|scan|refresh|run)\b.*\b(radar|watchlist|watched repos)\b|\b(show|list)\b.*\b(radar|watchlist)\b/.test(t)){const result=await Promise.all(watches().map(repo=>checkRepo(repo,false).catch(e=>({repo,error:e.message}))));panel("PREDICTIVE INTELLIGENCE RADAR // STATUS",result.length?result.map(x=>x.repo+"\n"+(x.error?"Error: "+x.error:"Latest: "+x.message+"\nSHA: "+x.sha.slice(0,12)+"\n"+x.url)).join("\n\n"):"No repositories watched. Try: Watch GitHub repo owner/repository.","radar");return true;}
return false;}

function any(t,terms){return terms.some(term=>has(t,term));}
function classify(cmd){const t=norm(cmd);
if(any(t,["swarm","parallel intelligence","multiple agents","multi agent","team of agents","agent team"])&&any(t,["analyze","review","compare","investigate","research","evaluate","solve","assess"]))return"swarm";
if(any(t,["workflow","automate","automation","orchestrate","sequence","work flow"])&&any(t,["plan","create","build","organize","run","design","prepare","manage","make"]))return"workflow";
if(any(t,["knowledge","notes","note","knowledge base","knowledge index","remember","recall","saved note"])&&any(t,["remember","save","store","index","add","note","search","find","look up","retrieve","recall","show","list","view"]))return"knowledge";
if(any(t,["radar","watchlist","predictive","monitor","track","watch"])&&any(t,["watch","monitor","track","keep an eye","check","scan","refresh","show","list","stop","unwatch"]))return"radar";
if(any(t,["simulation","simulate","simulator","calculate","compute","model"])&&Object.values(models).some(m=>m.a.some(a=>has(t,a))))return"simulation";
return null;}
async function handle(cmd){const k=classify(cmd);if(!k)return false;try{if(k==="simulation")return await runSimulation(cmd);if(k==="workflow")return await workflow(cmd);if(k==="knowledge")return knowledge(cmd);if(k==="radar")return await radar(cmd);return false;}catch(e){panel("JARVIS CAPABILITY // REQUEST FAILED",String(e?.message||e)+"\nNo action was taken.","error");window.speak?.("Capability failed. "+String(e?.message||e));return true;}}
function attach(){const original=window.sendCommand;if(typeof original!=="function"||original.__jarvisAdvancedCapabilities)return;const wrapped=async function(cmd){if(await handle(cmd))return;return original.apply(this,arguments);};wrapped.__jarvisAdvancedCapabilities=true;window.sendCommand=wrapped;}
let tries=0;const wait=()=>{if(typeof window.sendCommand==="function")attach();else if(++tries<150)setTimeout(wait,100);};wait();
for(const repo of watches()){checkRepo(repo,true).catch(()=>{});timers.set(repo,setInterval(()=>checkRepo(repo,false).catch(()=>{}),900000));}
window.JARVIS_ADVANCED_CAPABILITIES={version:"1.0.0",simulate,checkRepo,workflow,knowledge,radar,listKnowledge:()=>get(KEYS.knowledge,[]),listRadar:watches};
})();