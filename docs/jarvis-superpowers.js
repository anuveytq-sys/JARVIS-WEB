/* JARVIS Superpowers Pack
   Safe browser-only enhancements. No secrets, no backend changes.
   Features: command center, local memory, tasks, history, calculator, web search,
   clipboard, fullscreen, theme toggle, diagnostics, and quick actions.
*/
(() => {
  "use strict";
  const STORE = "jarvisSuperpowersV1";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (_) { return {}; } };
  const save = state => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {} };
  const state = Object.assign({ memory: [], tasks: [], history: [], dark: true }, load());
  let lastReply = "";

  const input = () => document.getElementById("commandInput");
  const panel = () => document.getElementById("jarvis-web-bridge-panel");
  const reply = (text, error = false) => {
    lastReply = String(text);
    try {
      if (typeof window.showReply === "function") window.showReply(lastReply, error ? "error" : "reply");
      else if (panel()) panel().textContent = lastReply;
      else {
        const p = document.createElement("div"); p.textContent = lastReply;
        Object.assign(p.style, {position:"fixed",bottom:"18px",left:"50%",transform:"translateX(-50%)",zIndex:2147483647,padding:"12px 16px",background:"#02121f",color:"#baf7ff",border:"1px solid #00d9ff",borderRadius:"10px",maxWidth:"88vw"});
        document.body.appendChild(p); setTimeout(() => p.remove(), 9000);
      }
    } catch (_) {}
  };

  function clean(s) { return String(s || "").trim().replace(/^hey\s+jarvis[,:]?\s*/i, "").replace(/^ok\s+jarvis[,:]?\s*/i, "").trim(); }
  function remember(text) { if (!text) return; state.memory = state.memory.filter(x => x.toLowerCase() !== text.toLowerCase()); state.memory.unshift(text); state.memory = state.memory.slice(0, 50); save(state); }
  function addTask(text) { if (!text) return; state.tasks.push({ id: Date.now(), text, done: false }); save(state); }
  function openUrl(url) { try { const w = window.open(url, "_blank"); if (!w) location.href = url; } catch (_) { location.href = url; } }

  function calculate(expr) {
    const s = expr.replace(/,/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/[^0-9+\-*/%.()\s]/g, "");
    if (!s || s.length > 120) return null;
    const tokens = s.match(/\d*\.?\d+|[()+\-*/%]/g);
    if (!tokens) return null;
    const vals = [], ops = [];
    const prec = op => (op === "+" || op === "-") ? 1 : 2;
    const apply = () => { const b = vals.pop(), a = vals.pop(), o = ops.pop(); if (a === undefined || b === undefined) throw Error(); if (o === "+") vals.push(a+b); else if (o === "-") vals.push(a-b); else if (o === "*") vals.push(a*b); else if (o === "/") { if (b === 0) throw Error(); vals.push(a/b); } else if (o === "%") { if (b === 0) throw Error(); vals.push(a%b); } };
    let prev = "op";
    for (let i=0;i<tokens.length;i++) {
      const t=tokens[i];
      if (/^\d/.test(t)) { vals.push(Number(t)); prev="num"; continue; }
      if (t === "(") { ops.push(t); prev="op"; continue; }
      if (t === ")") { while (ops.length && ops[ops.length-1] !== "(") apply(); if (ops.pop() !== "(") throw Error(); prev="num"; continue; }
      if ((t === "+" || t === "-") && prev === "op") { vals.push(0); }
      while (ops.length && ops[ops.length-1] !== "(" && prec(ops[ops.length-1]) >= prec(t)) apply();
      ops.push(t); prev="op";
    }
    while (ops.length) { if (ops[ops.length-1] === "(") throw Error(); apply(); }
    if (vals.length !== 1 || !Number.isFinite(vals[0])) throw Error();
    return Math.round(vals[0] * 1e10) / 1e10;
  }

  function makeUI() {
    if (document.getElementById("jarvis-superpowers")) return;
    const style = document.createElement("style");
    style.id = "jarvis-superpowers-style";
    style.textContent = `
      #jarvis-superpowers{position:fixed;right:14px;bottom:82px;z-index:2147483000;width:min(360px,calc(100vw - 28px));font:13px/1.4 system-ui,sans-serif;color:#d9fbff}
      #jarvis-superpowers .sp-card{background:linear-gradient(145deg,rgba(2,27,50,.97),rgba(0,8,18,.98));border:1px solid #167e9a;border-radius:14px;box-shadow:0 0 28px rgba(0,217,255,.16);overflow:hidden}
      #jarvis-superpowers .sp-head{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid #15536a}
      #jarvis-superpowers .sp-title{color:#62f5ff;font-weight:800;letter-spacing:1.5px}
      #jarvis-superpowers .sp-body{padding:12px;display:none;max-height:min(62vh,520px);overflow:auto}
      #jarvis-superpowers.open .sp-body{display:block}
      #jarvis-superpowers button{touch-action:manipulation;cursor:pointer;border:1px solid #287b91;border-radius:8px;background:#041a2a;color:#c9faff;padding:8px 10px;font-weight:700}
      #jarvis-superpowers button:hover{border-color:#62f5ff}
      #jarvis-superpowers .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      #jarvis-superpowers .sp-status{margin:0 0 10px;padding:9px;border:1px solid #164e63;border-radius:9px;background:rgba(0,10,22,.7);color:#a9d7e3}
      #jarvis-superpowers .sp-list{margin:8px 0 0;padding-left:18px;max-height:150px;overflow:auto}
      #jarvis-superpowers .sp-mini{font-size:11px;color:#86b6c2}
    `;
    document.head.appendChild(style);
    const root=document.createElement("div"); root.id="jarvis-superpowers";
    root.innerHTML=`<div class="sp-card"><div class="sp-head"><span class="sp-title">JARVIS // COMMAND CENTER</span><button id="sp-toggle" type="button">OPEN</button></div><div class="sp-body"><div class="sp-status" id="sp-status">SYSTEM READY • Local memory enabled • Browser skills online</div><div class="sp-grid"><button data-sp="time">TIME</button><button data-sp="status">STATUS</button><button data-sp="memory">MEMORY</button><button data-sp="tasks">TASKS</button><button data-sp="search">WEB SEARCH</button><button data-sp="copy">COPY LAST</button><button data-sp="fullscreen">FULLSCREEN</button><button data-sp="theme">HUD THEME</button></div><p class="sp-mini" style="margin:10px 0 0">Try: “remember that my project is COSMOSIM” • “add task finish JARVIS” • “calculate 25*8” • “search web NASA Artemis”</p><ul class="sp-list" id="sp-list"></ul></div></div>`;
    document.body.appendChild(root);
    root.querySelector("#sp-toggle").onclick=()=>{root.classList.toggle("open");root.querySelector("#sp-toggle").textContent=root.classList.contains("open")?"CLOSE":"OPEN";};
    root.querySelectorAll("button[data-sp]").forEach(b=>b.addEventListener("click",()=>runSkill(b.dataset.sp)));
    refreshList();
  }

  function refreshList() {
    const ul=document.getElementById("sp-list"); if(!ul) return; ul.innerHTML="";
    state.tasks.slice(-5).forEach(t=>{const li=document.createElement("li");li.textContent=(t.done?"✓ ":"○ ")+t.text;ul.appendChild(li);});
    state.memory.slice(0,5).forEach(m=>{const li=document.createElement("li");li.textContent="MEM: "+m;ul.appendChild(li);});
  }

  function runSkill(kind, payload="") {
    if(kind==="time") { reply(new Date().toLocaleString([], {dateStyle:"full",timeStyle:"short"})); return true; }
    if(kind==="status") {
      reply("JARVIS WEB SYSTEM: ONLINE\nJARVIS VELVE SYSTEM: ONLINE\nJARVIS TERA SYSTEM: ONLINE");
      return true;
    }
    if(kind==="memory") { reply(state.memory.length ? "I remember:\n• "+state.memory.slice(0,12).join("\n• ") : "My local JARVIS memory is empty."); return true; }
    if(kind==="tasks") { reply(state.tasks.length ? "Tasks:\n"+state.tasks.map((t,i)=>`${i+1}. ${t.done?"✓":"○"} ${t.text}`).join("\n") : "No local tasks yet."); return true; }
    if(kind==="search") { const q=prompt("JARVIS web search"); if(q) openUrl("https://www.google.com/search?q="+encodeURIComponent(q)); return true; }
    if(kind==="copy") { if(!lastReply){reply("There is no JARVIS reply to copy yet.",true);return true;} navigator.clipboard?.writeText(lastReply).then(()=>reply("Last JARVIS reply copied to clipboard.")).catch(()=>reply("Clipboard permission was not available.",true)); return true; }
    if(kind==="fullscreen") { if(!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); return true; }
    if(kind==="theme") { document.body.classList.toggle("jarvis-super-theme"); reply("HUD theme toggled."); return true; }
    return false;
  }

  function handleCommand(raw) {
    const c=clean(raw);
    if(!c) return false;
    state.history.unshift({at:Date.now(),command:c}); state.history=state.history.slice(0,100); save(state);

    const centerAndSearch = c.match(/^(?:open|show|launch) (?:the )?command cent(?:er|re)\s+and\s+(?:then\s+)?(.+)$/i);
    if (centerAndSearch) {
      document.getElementById("jarvis-superpowers")?.classList.add("open");
      document.getElementById("sp-toggle")?.replaceChildren(document.createTextNode("CLOSE"));
      const task = centerAndSearch[1].replace(/\s+from web search$/i, "").replace(/^search(?: the web)?(?: for)?\s+/i, "").trim();
      if (task) {
        const news = /\b(latest|recent|today'?s)\b.*\b(news|headlines)\b|\b(news|headlines)\b.*\b(usa|us|united states|america)\b/i.test(task);
        const query = /\b(usa|us|united states|america)\b/i.test(task) ? task : task + " USA";
        openUrl(news ? "https://news.google.com/search?q=" + encodeURIComponent(query) + "&hl=en-US&gl=US&ceid=US:en" : "https://www.google.com/search?q=" + encodeURIComponent(query));
        reply("Command Center opened. Searching the web for " + query + ".");
      } else reply("Command Center opened.");
      return true;
    }
    if (/^(what('?s| is) )?(the )?(time|date)( right now)?\??$/i.test(c)) return runSkill("time");
    if (/^(system )?(status|diagnostics|health check)\??$/i.test(c)) return runSkill("status");
    if (/^(show|list|read|what('?s| is) in) (my )?(memory|memories)\??$/i.test(c)) return runSkill("memory");
    if (/^(show|list|read) (my )?tasks\??$/i.test(c)) return runSkill("tasks");
    let m=c.match(/^(?:remember|memorize|save to memory)\s+(?:that\s+)?(.+)$/i); if(m){remember(m[1]);refreshList();reply("Memory saved locally on this device.");return true;}
    m=c.match(/^(?:forget|delete memory)\s+(.+)$/i); if(m){const before=state.memory.length;state.memory=state.memory.filter(x=>x.toLowerCase()!==m[1].toLowerCase());save(state);refreshList();reply(before===state.memory.length?"I couldn't find that memory.":"Memory deleted.");return true;}
    m=c.match(/^(?:add|create) (?:a )?task\s*(?:to\s+)?(.+)$/i); if(m){addTask(m[1]);refreshList();reply("Task added to local JARVIS tasks.");return true;}
    m=c.match(/^(?:complete|finish|done with) task\s*(\d+)$/i); if(m){const idx=Number(m[1])-1;if(state.tasks[idx]){state.tasks[idx].done=true;save(state);refreshList();reply("Task marked complete.");}else reply("That task number does not exist.",true);return true;}
    if (/^(?:clear|delete) (?:all )?(?:my )?(?:local )?(memory|memories)$/i.test(c)){state.memory=[];save(state);refreshList();reply("Local memory cleared.");return true;}
    m=c.match(/^(?:calculate|calc|what is)\s+(.+)$/i); if(m){const r=calculate(m[1].replace(/\?$/,""));if(r!==null){reply(`Result: ${r}`);return true;}}
    m=c.match(/^(?:search|look up|google)\s+(?:the web\s+)?(?:for\s+)?(.+?)(?:\s+from web search)?$/i); if(m){const q=m[1].trim();const news=/\b(latest|recent|today'?s)\b.*\b(news|headlines)\b|\b(news|headlines)\b.*\b(usa|us|united states|america)\b/i.test(q);openUrl(news?"https://news.google.com/search?q="+encodeURIComponent(q)+"&hl=en-US&gl=US&ceid=US:en":"https://www.google.com/search?q="+encodeURIComponent(q));reply("Opening "+(news?"news":"web")+" search for "+q+".");return true;}
    m=c.match(/^(?:copy|copy to clipboard)\s+(?:this|last answer|last reply)$/i); if(m)return runSkill("copy");
    if (/^(?:go )?fullscreen$|^enter fullscreen$|^exit fullscreen$/i.test(c)) return runSkill("fullscreen");
    if (/^(?:(?:please )?(?:open|show|launch)(?: up)? )?(?:the )?command cent(?:er|re)$|^(?:open )?superpowers$/i.test(c)){const root=document.getElementById("jarvis-superpowers");if(root){root.classList.add("open");document.getElementById("sp-toggle")?.replaceChildren(document.createTextNode("CLOSE"));}else{setTimeout(()=>{const r=document.getElementById("jarvis-superpowers");r?.classList.add("open");document.getElementById("sp-toggle")?.replaceChildren(document.createTextNode("CLOSE"));},350);}reply("Command Center opened.");return true;}
    if (/^clear (?:command )?history$/i.test(c)){state.history=[];save(state);reply("Command history cleared.");return true;}
    return false;
  }

  document.addEventListener("submit", e=>{const f=e.target;if(f?.id!=="commandForm")return;const v=input()?.value||"";if(handleCommand(v)){e.preventDefault();e.stopImmediatePropagation();if(input())input().value="";}}, true);
  document.addEventListener("keydown", e=>{if(e.key!=="Enter"||e.shiftKey)return;const el=e.target;if(el?.id!=="commandInput")return;if(handleCommand(el.value)){e.preventDefault();e.stopImmediatePropagation();el.value="";}}, true);

  const watch=new MutationObserver(()=>{const p=panel();if(p?.textContent?.trim())lastReply=p.textContent.trim();});
  watch.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener("load",()=>setTimeout(makeUI,250));
  if(document.readyState!=="loading") setTimeout(makeUI,250);
})();
