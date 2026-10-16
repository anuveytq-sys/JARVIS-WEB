/* TERRANEXUS UI fix: remove accidental "undefined" labels from simulation buttons. */
(()=>{'use strict';
  const cleanUndefined = (root=document) => {
    const nodes = root.querySelectorAll ? root.querySelectorAll('button,[role="button"],a,.terranexus-demo-btn,.terranexus-sim-btn') : [];
    for (const el of nodes) {
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const texts=[];
      let node;
      while((node=walker.nextNode())) texts.push(node);
      for(const textNode of texts){
        const value=String(textNode.nodeValue||'');
        if(/\bundefined\b/i.test(value)){
          const cleaned=value.replace(/\s*\bundefined\b\s*/gi,' ').replace(/\s{2,}/g,' ');
          if(cleaned.trim()) textNode.nodeValue=cleaned;
          else textNode.remove();
        }
      }
    }
  };
  const start = () => {
    cleanUndefined(document);
    const observer = new MutationObserver(mutations => {
      let shouldClean=false;
      for (const mutation of mutations) {
        if(mutation.type==='characterData' && /\bundefined\b/i.test(String(mutation.target.nodeValue||''))){shouldClean=true;break;}
        if(mutation.type==='childList'){
          for(const node of mutation.addedNodes){
            if(node.nodeType===1 || node.nodeType===3){shouldClean=true;break;}
          }
          if(shouldClean)break;
        }
      }
      if(shouldClean) cleanUndefined(document);
    });
    observer.observe(document.documentElement || document, {childList:true,subtree:true,characterData:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
