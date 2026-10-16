/* TERRANEXUS UI fix: remove accidental "undefined" labels from simulation buttons. */
(()=>{'use strict';
  const cleanUndefined = (root=document) => {
    const nodes = root.querySelectorAll ? root.querySelectorAll('button,[role="button"],a,.terranexus-demo-btn,.terranexus-sim-btn') : [];
    for (const el of nodes) {
      const text = String(el.textContent || '');
      if (!/\bundefined\b/i.test(text)) continue;
      const cleaned = text.replace(/\s*\bundefined\b\s*/gi,' ').replace(/\s{2,}/g,' ').trim();
      if (cleaned !== text.trim()) el.textContent = cleaned;
      if (!cleaned) el.remove();
    }
  };
  const start = () => {
    cleanUndefined(document);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) cleanUndefined(node);
        }
      }
    });
    observer.observe(document.documentElement || document, {childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
