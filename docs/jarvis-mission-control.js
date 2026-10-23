/* JARVIS MISSION CONTROL v1.0
 * Isolated command-driven long-horizon mission planner.
 * No HUD edits, no extra provider/key, and no external actions are run without a supported tool.
 * Uses the existing OpenRouter key saved by JARVIS, with local persistent checkpoints.
 */
(function () {
  "use strict";
  if (window.JARVISMissionControl && window.JARVISMissionControl.version === "1.0.0") return;

  var STORAGE_KEY = "jarvisMissionControlV1";
  var KEY_SLOT = "jarvisOpenRouterKey";
  var MODEL_SLOT = "jarvisOpenRouterModel";
  var DEFAULT_MODEL = "openrouter/free";
  var busy = false;

  function clean(value) {
    return String(value || "").trim()
      .replace(/^(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis\b[\s,:;-]*/i, "")
      .replace(/^(?:please\s+|can you\s+|could you\s+|would you\s+)/i, "")
      .replace(/[.!?]+$/, "").trim();
  }
  function speak(text) {
    try { if (typeof window.speak === "function") window.speak(String(text)); } catch (_) {}
    try { if (typeof window.setState === "function") window.setState("idle"); } catch (_) {}
  }
  function load() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!Array.isArray(value.history)) value.history = [];
      if (!value.active) value.active = null;
      return value;
    } catch (_) { return { active: null, history: [] }; }
  }
  var store = load();
  function persist() {
    try {
      store.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (_) { return false; }
  }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function key() {
    try { return localStorage.getItem(KEY_SLOT) || sessionStorage.getItem(KEY_SLOT) || ""; }
    catch (_) { try { return sessionStorage.getItem(KEY_SLOT) || ""; } catch (__) { return ""; } }
  }
  function model() {
    try { return localStorage.getItem(MODEL_SLOT) || sessionStorage.getItem(MODEL_SLOT) || DEFAULT_MODEL; }
    catch (_) { return DEFAULT_MODEL; }
  }
  function active() { return store.active; }
  function steps() { return active() && Array.isArray(active().steps) ? active().steps : []; }
  function safeText(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max || 500); }
  function fallbackPlan(goal) {
    var g = safeText(goal, 500);
    return [
      { title: "Define the outcome", action: "Rewrite the goal as a clear, measurable result and list constraints, available resources, and the deadline.", successCriteria: "A specific outcome and constraints are written down.", dependsOn: [] },
      { title: "Gather requirements and evidence", action: "Collect the information, files, permissions, and facts needed. Mark unknowns rather than guessing.", successCriteria: "Required inputs are listed and important unknowns are identified.", dependsOn: [1] },
      { title: "Break the work into deliverables", action: "Turn the goal into small, independently verifiable tasks. Order tasks by dependency and impact.", successCriteria: "Each task has a clear action and a testable completion condition.", dependsOn: [2] },
      { title: "Complete the highest-priority task", action: "Work on the first unblocked task. Use the available JARVIS capabilities or perform the described action yourself; do not claim an external action happened unless verified.", successCriteria: "The task's stated completion condition has evidence.", dependsOn: [3] },
      { title: "Verify and recover", action: "Check the result against the success criteria. If it fails, record the blocker, revise the approach, and retry safely.", successCriteria: "The result is checked and failures have a recovery plan.", dependsOn: [4] },
      { title: "Deliver the result and next steps", action: "Summarize completed work, evidence, unresolved items, and recommended follow-up.", successCriteria: "A concise delivery report is ready.", dependsOn: [5] }
    ];
  }
  function normalizePlan(raw, goal) {
    var list = Array.isArray(raw) ? raw : (raw && (raw.steps || raw.plan));
    if (!Array.isArray(list) || !list.length) throw new Error("The model did not return a usable step list.");
    list = list.slice(0, 12);
    return list.map(function (step, i) {
      var deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
      deps = deps.map(function (n) { return Number(n); }).filter(function (n) { return Number.isInteger(n) && n >= 1 && n <= list.length && n !== i + 1; });
      return {
        id: i + 1,
        title: safeText(step.title || step.name || ("Step " + (i + 1)), 100) || ("Step " + (i + 1)),
        action: safeText(step.action || step.description || step.task || "", 700) || "Define and perform this task, then verify the result.",
        successCriteria: safeText(step.successCriteria || step.doneWhen || step.verification || "", 300) || "Record evidence that the intended result was achieved.",
        dependsOn: deps,
        status: "pending",
        notes: "",
        attempts: 0,
        updatedAt: Date.now()
      };
    }).map(function (step) {
      step.dependsOn = step.dependsOn.filter(function (dep) { return dep < step.id; });
      return step;
    });
  }
  async function askForPlan(goal, previous) {
    var apiKey = key();
    if (!apiKey) throw new Error("No existing OpenRouter key is available in this browser. Add your existing key in JARVIS Settings, then retry.");
    var prompt = [
      "Create a practical long-horizon mission plan for JARVIS.",
      "Return ONLY valid JSON with this shape: {\"steps\":[{\"title\":string,\"action\":string,\"successCriteria\":string,\"dependsOn\":[number]}]}.",
      "Create 5-10 concrete, ordered, small steps. dependsOn uses 1-based step numbers and may be empty.",
      "Each action must be specific and verifiable. Include checkpoints, verification, recovery from likely blockers, and a final delivery report.",
      "Do not claim you can perform actions outside a browser chatbot. Do not invent facts, credentials, or completed work. No app creation or app generation.",
      "Goal: " + safeText(goal, 500),
      previous ? "Current mission state for replanning: " + JSON.stringify(previous).slice(0, 8000) : ""
    ].filter(Boolean).join("\n\n");
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;
    try {
      var response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "HTTP-Referer": location.origin,
          "X-OpenRouter-Title": "JARVIS Web Mission Control"
        },
        body: JSON.stringify({
          model: model(),
          messages: [
            { role: "system", content: "You are a disciplined mission planner. Output valid JSON only. Make plans actionable, safe, realistic, and testable." },
            { role: "user", content: prompt }
          ],
          temperature: 0.25,
          max_tokens: 1800
        }),
        signal: controller ? controller.signal : undefined
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error((data.error && data.error.message) || ("OpenRouter returned HTTP " + response.status));
      var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (Array.isArray(content)) content = content.map(function (part) { return part && part.text || ""; }).join("");
      content = String(content || "").trim().replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
      var parsed;
      try { parsed = JSON.parse(content); }
      catch (_) {
        var start = content.indexOf("{"), end = content.lastIndexOf("}");
        if (start < 0 || end <= start) throw new Error("The model returned an unreadable plan.");
        parsed = JSON.parse(content.slice(start, end + 1));
      }
      return normalizePlan(parsed, goal);
    } finally { if (timeout) clearTimeout(timeout); }
  }
  function nextStep(m) {
    if (!m) return null;
    return m.steps.find(function (s) {
      return s.status === "pending" && s.dependsOn.every(function (dep) {
        var parent = m.steps.find(function (p) { return p.id === dep; });
        return parent && parent.status === "done";
      });
    }) || null;
  }
  function count(m, status) { return m ? m.steps.filter(function (s) { return s.status === status; }).length : 0; }
  function snapshot(m) {
    if (!m) return;
    m.checkpoints = Array.isArray(m.checkpoints) ? m.checkpoints : [];
    m.checkpoints.push({
      at: Date.now(), status: m.status,
      steps: m.steps.map(function (s) { return { id: s.id, status: s.status, notes: s.notes }; })
    });
    if (m.checkpoints.length > 30) m.checkpoints = m.checkpoints.slice(-30);
    m.updatedAt = Date.now();
    persist();
  }
  function statusText(m) {
    if (!m) return "There is no active mission. Say, start mission, followed by your goal.";
    var done = count(m, "done"), blocked = count(m, "blocked"), next = nextStep(m);
    var out = "Mission: " + m.goal + ". Status: " + m.status + ". " + done + " of " + m.steps.length + " steps complete.";
    if (blocked) out += " " + blocked + " step(s) blocked.";
    if (next) out += " Next unblocked step " + next.id + ": " + next.title + ". " + next.action;
    else if (done === m.steps.length) out += " All planned steps are marked complete. Say mission report for the delivery summary.";
    else out += " No step is currently unblocked. Review dependencies or blockers.";
    return out;
  }
  function missionReport() {
    var m = active();
    if (!m) return "There is no active mission to report on.";
    var done = m.steps.filter(function (s) { return s.status === "done"; });
    var blocked = m.steps.filter(function (s) { return s.status === "blocked"; });
    var pending = m.steps.filter(function (s) { return s.status === "pending" || s.status === "in_progress"; });
    var report = "MISSION DELIVERY REPORT. Goal: " + m.goal + ". Status: " + m.status + ". Completed " + done.length + " of " + m.steps.length + " planned steps.";
    if (done.length) report += " Completed: " + done.map(function (s) { return s.id + ", " + s.title + (s.notes ? " (" + s.notes + ")" : ""); }).join("; ") + ".";
    if (blocked.length) report += " Blocked: " + blocked.map(function (s) { return s.id + ", " + s.title + ": " + s.notes; }).join("; ") + ".";
    if (pending.length) report += " Remaining: " + pending.map(function (s) { return s.id + ", " + s.title; }).join("; ") + ".";
    report += " This report reflects the checkpoint state recorded in this browser, not independent proof of external work.";
    return report;
  }
  async function startMission(goal) {
    if (busy) { speak("Mission Control is already processing a request. Please try again in a moment."); return; }
    goal = safeText(goal, 500);
    if (goal.length < 4) { speak("Please give me a clear mission goal, for example: start mission to prepare my science exhibition."); return; }
    busy = true;
    try {
      if (active() && active().status !== "completed" && active().status !== "cancelled") {
        speak("There is already an active mission. Say mission status, finish it, or cancel mission before starting another.");
        return;
      }
      speak("Mission accepted. I am building a checkpointed plan.");
      var plan, warning = "";
      try { plan = await askForPlan(goal, null); }
      catch (error) { plan = normalizePlan(fallbackPlan(goal), goal); warning = " The AI planner was unavailable, so I created a basic offline template. " + String(error.message || error).slice(0, 130); }
      var m = {
        id: id(), goal: goal, status: "active", createdAt: Date.now(), updatedAt: Date.now(),
        steps: plan, checkpoints: [], finalReport: "", plannerModel: key() ? model() : "offline-template"
      };
      store.active = m;
      snapshot(m);
      speak("Mission created with " + m.steps.length + " steps. " + statusText(m) + warning);
    } finally { busy = false; }
  }
  async function replan() {
    var m = active();
    if (!m) { speak("There is no active mission to replan."); return; }
    if (busy) { speak("Mission Control is busy. Please try again shortly."); return; }
    busy = true;
    try {
      var plan = await askForPlan(m.goal, { status: m.status, steps: m.steps });
      var old = m.steps, idMap = {};
      m.steps = plan.map(function (s, i) {
        var prior = old[i];
        if (prior && prior.status === "done") {
          s.status = "done"; s.notes = prior.notes; s.updatedAt = prior.updatedAt;
        } else if (prior && prior.status === "blocked") {
          s.status = "blocked"; s.notes = prior.notes;
        }
        return s;
      });
      m.status = "active";
      snapshot(m);
      speak("Mission replanned with " + m.steps.length + " steps. Completed checkpoints were preserved by position where possible. " + statusText(m));
    } catch (e) { speak("I could not replan with OpenRouter: " + String(e.message || e).slice(0, 180) + ". Your current mission and checkpoints are unchanged."); }
    finally { busy = false; }
  }
  function listHistory() {
    var rows = store.history.slice(-5).reverse();
    if (!rows.length) return "No previous mission history is saved on this device.";
    return "Recent missions: " + rows.map(function (m, i) { return (i + 1) + ". " + m.goal + ", " + m.status + ", " + (m.steps || []).filter(function (s) { return s.status === "done"; }).length + " steps complete."; }).join(" ");
  }
  function handle(raw) {
    var c = clean(raw), m = active(), match;
    if (!c) return false;
    if (/^(?:mission help|mission commands|mission control help|what can you do with missions|mission features)$/i.test(c)) {
      speak("Mission Control commands: start mission to [goal]; mission status; what's next; start next step; complete step 2; mark step 3 done because [evidence]; block step 2 because [reason]; unblock step 2; pause mission; resume mission; checkpoint mission; replan mission; mission report; mission history; cancel mission.");
      return true;
    }
    match = c.match(/^(?:start|create|begin|plan|manage|take charge of)\s+(?:a\s+)?mission(?:\s+(?:to|for|about|called))?\s*[:,-]?\s*(.+)$/i);
    if (!match) match = c.match(/^(?:mission control|mission planner)\s*[:,-]\s*(.+)$/i);
    if (!match) match = c.match(/^(?:plan and track|take me through|organize and track)\s+(.+)$/i);
    if (match) { startMission(match[1]); return true; }
    if (/^(?:mission status|show mission|show active mission|mission checkpoint status|where are we on (?:the )?mission|mission progress)$/i.test(c)) { speak(statusText(m)); return true; }
    if (/^(?:what(?:'s| is) next|next mission step|show next step|start next step|continue mission|resume next step)$/i.test(c)) {
      if (!m) speak(statusText(m));
      else {
        var next = nextStep(m);
        if (!next) speak(statusText(m));
        else {
          next.status = "in_progress"; next.attempts = (next.attempts || 0) + 1; next.updatedAt = Date.now();
          m.status = "active"; snapshot(m);
          speak("Step " + next.id + ": " + next.title + ". Action: " + next.action + " Success check: " + next.successCriteria + " When finished, say complete step " + next.id + " and tell me what evidence you observed. I cannot perform external actions unless a connected JARVIS tool supports them.");
        }
      }
      return true;
    }
    match = c.match(/^(?:complete|finish|mark|verify|set)\s+(?:mission\s+)?(?:step|task)\s*(\d+)\s*(?:as\s+)?(?:done|complete|completed|finished)?(?:\s+(?:because|with|evidence|note)\s+(.+))?$/i);
    if (!match) match = c.match(/^(?:step|task)\s*(\d+)\s+(?:done|complete|completed|finished)(?:\s+(?:because|with|evidence|note)\s+(.+))?$/i);
    if (match) {
      if (!m) { speak(statusText(m)); return true; }
      var number = Number(match[1]), step = m.steps.find(function (s) { return s.id === number; });
      if (!step) { speak("I cannot find step " + number + ". Say mission status to hear the current steps."); return true; }
      var missing = step.dependsOn.filter(function (dep) { var parent = m.steps.find(function (s) { return s.id === dep; }); return !parent || parent.status !== "done"; });
      if (missing.length) { speak("Step " + number + " still depends on step(s) " + missing.join(", ") + ". Complete those first, or replan the mission."); return true; }
      step.status = "done"; step.notes = safeText(match[2] || "Marked complete by user; evidence not independently checked.", 400); step.updatedAt = Date.now();
      if (m.steps.every(function (s) { return s.status === "done"; })) { m.status = "completed"; m.completedAt = Date.now(); m.finalReport = missionReport(); store.history.push(m); store.history = store.history.slice(-20); }
      snapshot(m);
      speak("Checkpoint saved for step " + number + ". " + statusText(m) + (m.status === "completed" ? " " + missionReport() : ""));
      return true;
    }
    match = c.match(/^(?:block|pause|hold)\s+(?:mission\s+)?(?:step|task)\s*(\d+)(?:\s+(?:because|due to|reason)\s+(.+))?$/i);
    if (match) {
      if (!m) { speak(statusText(m)); return true; }
      var blocked = m.steps.find(function (s) { return s.id === Number(match[1]); });
      if (!blocked) { speak("I cannot find that step."); return true; }
      blocked.status = "blocked"; blocked.notes = safeText(match[2] || "Blocked; reason not supplied.", 400); blocked.updatedAt = Date.now(); snapshot(m);
      speak("Step " + blocked.id + " is marked blocked. " + statusText(m) + " Say unblock step " + blocked.id + " or replan mission when ready.");
      return true;
    }
    match = c.match(/^(?:unblock|retry|resume)\s+(?:mission\s+)?(?:step|task)\s*(\d+)$/i);
    if (match) {
      if (!m) { speak(statusText(m)); return true; }
      var retry = m.steps.find(function (s) { return s.id === Number(match[1]); });
      if (!retry) { speak("I cannot find that step."); return true; }
      retry.status = "pending"; retry.notes = ""; retry.updatedAt = Date.now(); m.status = "active"; snapshot(m);
      speak("Step " + retry.id + " is unblocked and ready to retry. " + statusText(m)); return true;
    }
    if (/^(?:pause|hold|suspend) (?:the )?mission$/i.test(c)) {
      if (!m) speak(statusText(m)); else { m.status = "paused"; snapshot(m); speak("Mission paused and checkpoint saved. Say resume mission when you want to continue."); }
      return true;
    }
    if (/^(?:resume|continue|restart) (?:the )?mission$/i.test(c)) {
      if (!m) speak(statusText(m)); else { m.status = "active"; snapshot(m); speak("Mission resumed from its saved checkpoint. " + statusText(m)); }
      return true;
    }
    if (/^(?:checkpoint|save checkpoint|save mission|checkpoint mission)$/i.test(c)) {
      if (!m) speak(statusText(m)); else { snapshot(m); speak("Mission checkpoint saved locally on this device. " + statusText(m)); }
      return true;
    }
    if (/^(?:replan|rebuild plan|reorganize mission|adapt mission|recover mission)$/i.test(c)) { replan(); return true; }
    if (/^(?:mission report|delivery report|final mission report|mission summary|summarize mission)$/i.test(c)) {
      if (!m) speak(statusText(m)); else { m.finalReport = missionReport(); persist(); speak(m.finalReport); }
      return true;
    }
    if (/^(?:mission history|previous missions|past missions|list mission history)$/i.test(c)) { speak(listHistory()); return true; }
    if (/^(?:cancel|abandon|close) (?:the )?mission$/i.test(c)) {
      if (!m) { speak(statusText(m)); return true; }
      m.status = "cancelled"; m.cancelledAt = Date.now(); snapshot(m);
      store.history.push(m); store.history = store.history.slice(-20); persist();
      speak("Mission cancelled. Its checkpoint remains in local history. You can start a new mission."); return true;
    }
    return false;
  }

  function install() {
    if (typeof window.sendCommand !== "function" || window.sendCommand.__jarvisMissionWrapped) return false;
    var original = window.sendCommand;
    var wrapped = function (command) {
      if (handle(command)) return Promise.resolve();
      return original.apply(this, arguments);
    };
    wrapped.__jarvisMissionWrapped = true;
    window.sendCommand = wrapped;
    return true;
  }
  window.JARVISMissionControl = {
    version: "1.0.0",
    handleCommand: handle,
    getState: function () { return JSON.parse(JSON.stringify(store)); },
    getStatus: function () { return statusText(active()); },
    commands: ["start mission to prepare my science exhibition", "mission status", "what's next", "complete step 1 because the outline is ready", "block step 2 because I need more information", "checkpoint mission", "replan mission", "mission report", "mission history"]
  };
  install();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  var retries = 0;
  var timer = setInterval(function () { if (install() || ++retries > 40) clearInterval(timer); }, 250);
  setTimeout(function () { clearInterval(timer); }, 12000);
})();
