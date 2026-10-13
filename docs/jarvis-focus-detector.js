/* JARVIS Focus Detector — browser-only, on-device object detection. */
(() => {
  "use strict";
  let modal, video, canvas, ctx, stream, model, running = false, frame = 0, loading = false;
  const ALLOWED = new Set(["person","cell phone","laptop","keyboard","mouse","book","bottle","cup","chair","couch","tv","remote","backpack","handbag","suitcase","umbrella","clock","plant","potted plant","cat","dog","bird","car","bicycle","motorcycle","bus","truck","traffic light","stop sign","banana","apple","orange","sports ball","scissors","toothbrush"]);
  const LABELS = {"cell phone":"PHONE","laptop":"LAPTOP","potted plant":"PLANT","traffic light":"TRAFFIC LIGHT","sports ball":"BALL","person":"PERSON","bottle":"BOTTLE","cup":"CUP","book":"BOOK","chair":"CHAIR","cat":"CAT","dog":"DOG","car":"CAR","bicycle":"BICYCLE","backpack":"BACKPACK","keyboard":"KEYBOARD","mouse":"MOUSE","tv":"SCREEN","bird":"BIRD","apple":"APPLE","banana":"BANANA"};
  function build() {
    if (modal) return;
    const style = document.createElement("style");
    style.textContent = `
      #jarvis-focus-detector{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(0,5,14,.97);color:#d8fbff;font:14px/1.4 system-ui,sans-serif}
      #jarvis-focus-card{width:min(96vw,900px);max-height:96vh;overflow:auto;padding:14px;box-sizing:border-box;border:1px solid #00eaff;border-radius:15px;background:linear-gradient(145deg,#031b30,#000914);box-shadow:0 0 32px #00eaff2b}
      #jarvis-focus-stage{position:relative;width:100%;background:#000;border-radius:10px;overflow:hidden;line-height:0}
      #jarvis-focus-video{display:block;width:100%;max-height:66vh;object-fit:contain}
      #jarvis-focus-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .jarvis-focus-btn{touch-action:manipulation;border:1px solid #00d9ff;border-radius:8px;background:#06263c;color:#d8fbff;font-weight:800;padding:10px 13px;margin:8px 5px 0 0}
      #jarvis-focus-status{color:#8defff;font-size:12px;margin:9px 0 2px;min-height:1.5em}
      #jarvis-focus-card h2{font-size:18px;letter-spacing:2px;margin:2px 0 5px}
    `;
    document.head.appendChild(style);
    modal=document.createElement("div"); modal.id="jarvis-focus-detector";
    modal.innerHTML='<section id="jarvis-focus-card" role="dialog" aria-modal="true" aria-label="JARVIS object detector"><h2>JARVIS // FOCUS DETECTOR</h2><p style="font-size:12px;color:#9bcbd8;margin:0 0 10px">Highlights selected, clearly visible objects only. Detection runs in this browser; camera access requires your permission.</p><div id="jarvis-focus-stage"><video id="jarvis-focus-video" autoplay playsinline muted></video><canvas id="jarvis-focus-overlay"></canvas></div><div id="jarvis-focus-status" role="status">Ready. Tap START DETECTOR to allow camera access.</div><button class="jarvis-focus-btn" id="jarvis-focus-start">START DETECTOR</button><button class="jarvis-focus-btn" id="jarvis-focus-close">CLOSE</button></section>';
    document.body.appendChild(modal);
    video=modal.querySelector("#jarvis-focus-video"); canvas=modal.querySelector("#jarvis-focus-overlay"); ctx=canvas.getContext("2d");
    modal.querySelector("#jarvis-focus-start").addEventListener("click", start);
    modal.querySelector("#jarvis-focus-close").addEventListener("click", close);
  }
  function status(s){const el=document.getElementById("jarvis-focus-status");if(el)el.textContent=s;}
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("Could not load detector library"));document.head.appendChild(s);});}
  async function loadModel(){
    if(model)return model;if(loading) { while(loading) await new Promise(r=>setTimeout(r,100)); if(model)return model; }
    loading=true;
    try {
      if(!window.tf) await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
      if(!window.cocoSsd) await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
      model=await window.cocoSsd.load({base:"lite_mobilenet_v2"});return model;
    } finally {loading=false;}
  }
  async function start(){
    build();modal.style.display="flex";status("Requesting camera permission…");
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera is not supported by this browser.");
      if(stream)stream.getTracks().forEach(t=>t.stop());
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      video.srcObject=stream;await video.play();
      status("Loading focused object detector… (first start may take a moment)");
      await loadModel();running=true;status("DETECTOR ACTIVE • Show one clear object to the camera.");detectLoop();
    }catch(e){running=false;status("Could not start: "+(e.message||"allow camera access and try again."));}
  }
  async function detectLoop(){
    if(!running||!model||!video?.videoWidth)return;
    if(++frame%2===0){
      try{
        const predictions=await model.detect(video,20,0.2);
        const w=video.videoWidth,h=video.videoHeight;
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        ctx.clearRect(0,0,w,h);
        const chosen=predictions.filter(p=>ALLOWED.has(p.class)&&p.score>=0.62)
          .sort((a,b)=>b.score-a.score).slice(0,3);
        for(const p of chosen){
          const [x,y,bw,bh]=p.bbox; const label=LABELS[p.class]||p.class.toUpperCase();
          ctx.lineWidth=Math.max(2,w/400);ctx.strokeStyle="#00f5ff";ctx.shadowColor="#00dfff";ctx.shadowBlur=8;ctx.strokeRect(x,y,bw,bh);ctx.shadowBlur=0;
          ctx.font="bold "+Math.max(13,w/45)+"px system-ui,sans-serif";
          const text=label+" "+Math.round(p.score*100)+"%";const th=Math.max(24,w/28);const tw=ctx.measureText(text).width+16;
          const ly=Math.max(0,y-th);ctx.fillStyle="rgba(0,18,34,.92)";ctx.fillRect(x,ly,tw,th);ctx.fillStyle="#9ffaff";ctx.fillText(text,x+8,ly+th*.69);
        }
        status(chosen.length?("TRACKING "+chosen.length+" FOCUSED OBJECT"+(chosen.length>1?"S":"")+" • "+chosen.map(p=>LABELS[p.class]||p.class.toUpperCase()).join(", ")):"Scanning… keep one supported object clearly in view.");
      }catch(e){status("Detection paused briefly; retrying…");}
    }
    if(running) requestAnimationFrame(detectLoop);
  }
  function close(){running=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(video)video.srcObject=null;if(modal)modal.style.display="none";}
  function open(){build();modal.style.display="flex";if(!stream)start();}
  window.JARVISDetector={open,start,close};
  document.addEventListener("submit",e=>{
    if(e.target?.id!=="commandForm")return;
    const input=document.getElementById("commandInput");
    const command=String(input?.value||"").replace(/^\s*(?:(?:hey|hello|hi|ok|okay)\s+)?jarvis[, ]*/i,"").trim().replace(/[.!?]+$/,"");
    if(/^(?:open|launch|start|show|turn on)(?: the)? (?:object )?detector$/i.test(command)){
      e.preventDefault();e.stopImmediatePropagation();open();
    }else if(/^(?:close|exit|stop|hide)(?: the)? detector$/i.test(command)){
      e.preventDefault();e.stopImmediatePropagation();close();
    }
  },true);
  window.addEventListener("beforeunload",close);
})();