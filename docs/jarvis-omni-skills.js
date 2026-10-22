/* JARVIS OMNI SKILLS */
(() => {
  "use strict";
  const norm = value => String(value || "").trim().replace(/^(?:(?:hey|hello|hi)\s+)?jarvis\b[\s,:;-]*/i, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
  window.JARVISOmni = { handleCommand: norm };
})();