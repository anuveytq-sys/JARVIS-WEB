/* JARVIS Parallel Intelligence Swarm
 * Four independent specialist passes run concurrently through the existing
 * JARVIS provider bridge, followed by a coordinator synthesis.
 */
(() => {
  "use strict";
  if (window.__JARVIS_PARALLEL_SWARM__) return;
  const VERSION = "1.0.0";
  const normalize = value => String(value || "").toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = old;
      }
    }
    return row[b.length];
  }
  function fuzzyHas(text, target) {
    return text.split(" ").some(word => word === target || (target.length >= 5 && word.length >= 4 && distance(word, target) <= 1));
  }
  function parseIntent(command) {
    const clean = normalize(command);
    const explicit = /\b(swarm|parallel intelligence|multiple agents|multi agent|specialist agents|coordinate agents|agent team)\b/.test(clean);
    const fuzzy = fuzzyHas(clean, "swarm") || (fuzzyHas(clean, "parallel") && (fuzzyHas(clean, "agents") || fuzzyHas(clean, "intelligence")));
    if (!explicit && !fuzzy) return null;
    let query = String(command || "").trim();
    for (const marker of ["parallel intelligence", "multiple agents", "specialist agents", "coordinate agents", "multi agent", "agent team", "swarm"]) {
      query = query.replace(new RegExp(marker.replace(/ /g, "\\s+"), "i"), " ");
    }
    query = query.replace(/^\s*(please\s+)?(run|start|activate|use|ask|launch|engage|do)\s*/i, "")
      .replace(/^\s*(on|for|about|to)\s*/i, "").trim();
    return { query: query || String(command || "").trim() };
  }
  async function askJARVIS(prompt) {
    const response = await window.fetch("/api/command", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: prompt })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.reply || ("JARVIS provider returned HTTP " + response.status));
    const answer = String(data.reply || "").trim();
    if (!answer) throw new Error("The selected JARVIS provider returned an empty response.");
    return answer;
  }
  const specialists = [
    { name: "RESEARCH ANALYST", task: "Identify established facts, relevant concepts, and evidence needed. Label uncertainty; never invent citations." },
    { name: "SYSTEMS STRATEGIST", task: "Develop a structured strategy, options, dependencies, and practical next steps. Separate assumptions from facts." },
    { name: "TECHNICAL SPECIALIST", task: "Analyze feasibility, mechanisms, calculations, or implementation details where appropriate. State assumptions and avoid unsupported precision." },
    { name: "CRITICAL REVIEWER", task: "Independently challenge the premise; find gaps, edge cases, risks, contradictions, and alternatives. Do not simply agree." }
  ];
  async function runSwarm(query) {
    const subject = String(query || "").slice(0, 3500);
    const results = await Promise.all(specialists.map(async agent => ({
      agent: agent.name,
      analysis: await askJARVIS([
        "You are one independent specialist in a JARVIS multi-agent analysis.",
        agent.task,
        "Work independently. Do not claim to have consulted other agents or external sources.",
        "User task: " + subject,
        "Return a concise structured analysis with findings, assumptions, and open questions."
      ].join("\n\n"))
    })));
    const synthesis = await askJARVIS([
      "You coordinate JARVIS. Synthesize four independent specialist analyses.",
      "Agreement is not proof. Highlight disagreements and unresolved questions. Never invent evidence or claim web research occurred.",
      "Return: Executive conclusion; strongest findings; disagreements; risks and limitations; recommended next steps; confidence (high/medium/low) with reason.",
      "USER TASK:\n" + subject,
      "SPECIALIST ANALYSES:\n" + results.map(item => "### " + item.agent + "\n" + item.analysis).join("\n\n")
    ].join("\n\n"));
    return { results, synthesis };
  }
  function renderResult(result) {
    let panel = document.getElementById("jarvis-parallel-swarm-results");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "jarvis-parallel-swarm-results";
      Object.assign(panel.style, {
        position: "fixed", left: "50%", bottom: "18px", transform: "translateX(-50%)",
        width: "min(92vw, 760px)", maxHeight: "48vh", overflow: "auto",
        zIndex: "2147483000", padding: "16px", boxSizing: "border-box",
        color: "#c8faff", background: "rgba(1, 10, 24, .97)",
        border: "1px solid rgba(0, 225, 255, .75)", borderRadius: "12px",
        boxShadow: "0 0 28px rgba(0, 190, 255, .22)",
        font: "13px/1.55 system-ui, sans-serif", whiteSpace: "pre-wrap",
        overflowWrap: "anywhere"
      });
      document.body.appendChild(panel);
    }
    panel.textContent = "PARALLEL INTELLIGENCE SWARM // SYNTHESIS\n\n" +
      result.synthesis + "\n\nSPECIALIST CONTRIBUTIONS\n" +
      result.results.map(item => item.agent + "\n" + item.analysis).join("\n\n");
  }

  let busy = false;
  async function handle(command) {
    const intent = parseIntent(command);
    if (!intent) return false;
    if (busy) { window.speak?.("The Parallel Intelligence Swarm is already working. Please wait for its synthesis."); return true; }
    if (intent.query.length < 4) {
      window.speak?.("Parallel Intelligence Swarm ready. Tell me what you want the specialist agents to analyze.");
      return true;
    }
    busy = true;
    window.speak?.("Parallel Intelligence Swarm activated. Four specialist agents are analyzing your task concurrently.");
    try {
      const output = await runSwarm(intent.query);
      const result = { task: intent.query, ...output, completedAt: new Date().toISOString() };
      window.__JARVIS_SWARM_LAST_RESULT__ = result;
      renderResult(result);
      document.dispatchEvent(new CustomEvent("jarvis:swarm-complete", { detail: result }));
      window.speak?.(output.synthesis.slice(0, 1400));
      return true;
    } catch (error) {
      window.speak?.("Parallel Intelligence Swarm could not complete. " + String(error?.message || error));
      return true;
    } finally { busy = false; }
  }
  function attach() {
    const current = window.sendCommand;
    if (typeof current !== "function" || current.__jarvisSwarmHook) return;
    const wrapped = async function(command) {
      if (await handle(command)) return;
      return current.apply(this, arguments);
    };
    wrapped.__jarvisSwarmHook = true;
    wrapped.__jarvisSwarmVersion = VERSION;
    window.sendCommand = wrapped;
  }
  let attempts = 0;
  const wait = () => {
    if (typeof window.sendCommand === "function") attach();
    else if (++attempts < 100) setTimeout(wait, 100);
  };
  wait();
  window.JARVIS_PARALLEL_SWARM = {
    version: VERSION, run: runSwarm, isBusy: () => busy,
    getLastResult: () => window.__JARVIS_SWARM_LAST_RESULT__ || null
  };
})();
