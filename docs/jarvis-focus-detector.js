/* JARVIS Focus Detector — LOCAL ONLY.
   No Gemini, OpenRouter, backend calls, API keys, or token usage.
   Detection runs in the browser with TensorFlow.js + COCO-SSD.
   The label dictionary adds human-friendly everyday names without sending camera frames anywhere.
*/
(() => {
  "use strict";
  let modal, video, canvas, ctx, stream, model;
  let running = false, frame = 0, loading = false, previousBoxes = [];

  // COCO-SSD's supported classes, presented with JARVIS-friendly everyday names.
  const LABELS = {
    "person":"PERSON", "bicycle":"BICYCLE", "car":"CAR", "motorcycle":"MOTORCYCLE",
    "airplane":"AIRPLANE", "bus":"BUS", "train":"TRAIN", "truck":"TRUCK", "boat":"BOAT",
    "traffic light":"TRAFFIC LIGHT", "fire hydrant":"FIRE HYDRANT", "stop sign":"STOP SIGN",
    "parking meter":"PARKING METER", "bench":"BENCH", "bird":"BIRD", "cat":"CAT", "dog":"DOG",
    "horse":"HORSE", "sheep":"SHEEP", "cow":"COW", "elephant":"ELEPHANT", "bear":"BEAR",
    "zebra":"ZEBRA", "giraffe":"GIRAFFE", "backpack":"BACKPACK", "umbrella":"UMBRELLA",
    "handbag":"HANDBAG / PURSE", "tie":"TIE", "suitcase":"SUITCASE", "frisbee":"FRISBEE",
    "skis":"SKIS", "snowboard":"SNOWBOARD", "sports ball":"BALL", "kite":"KITE",
    "baseball bat":"BASEBALL BAT", "baseball glove":"BASEBALL GLOVE", "skateboard":"SKATEBOARD",
    "surfboard":"SURFBOARD", "tennis racket":"TENNIS RACKET", "bottle":"BOTTLE",
    "wine glass":"GLASS", "cup":"CUP / MUG", "fork":"FORK", "knife":"KNIFE", "spoon":"SPOON",
    "bowl":"BOWL", "banana":"BANANA", "apple":"APPLE", "sandwich":"SANDWICH", "orange":"ORANGE",
    "broccoli":"BROCCOLI", "carrot":"CARROT", "hot dog":"HOT DOG", "pizza":"PIZZA",
    "donut":"DONUT", "cake":"CAKE", "chair":"CHAIR", "couch":"SOFA / COUCH", "potted plant":"PLANT",
    "bed":"BED", "dining table":"TABLE", "toilet":"TOILET", "tv":"TV / SCREEN",
    "laptop":"LAPTOP", "mouse":"MOUSE", "remote":"REMOTE / CONTROLLER", "keyboard":"KEYBOARD",
    "cell phone":"PHONE", "microwave":"MICROWAVE", "oven":"OVEN", "toaster":"TOASTER",
    "sink":"SINK", "refrigerator":"FRIDGE", "book":"BOOK", "clock":"CLOCK", "vase":"VASE",
    "scissors":"SCISSORS", "teddy bear":"TEDDY BEAR", "hair drier":"HAIR DRYER", "toothbrush":"TOOTHBRUSH"
  };

  // Human-friendly aliases used by the local/manual presentation layer.
  // These do not add network inference; they only rename classes already detected locally.
  const EVERYDAY_ALIASES = {
    "cell phone":["phone","smartphone","mobile"], "laptop":["computer","notebook computer"],
    "tv":["television","monitor","screen"], "mouse":["computer mouse"], "keyboard":["computer keyboard"],
    "remote":["remote control","controller"], "bottle":["water bottle","drink bottle"],
    "cup":["mug","coffee cup"], "handbag":["purse","bag"], "backpack":["school bag"],
    "couch":["sofa"], "dining table":["table","desk-like table"], "potted plant":["house plant"],
    "refrigerator":["fridge"], "hair drier":["hair dryer"], "sports ball":["ball"],
    "book":["textbook","notebook-like book"], "clock":["wall clock","table clock"],
    "scissors":["paper scissors"], "toothbrush":["tooth brush"]
  };

  function build() {
    if (modal) return;
    const style = document.createElement("style");
    style.id = "jarvis-focus-detector-style";
    style.textContent = `
      #jarvis-focus-detector{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(0,5,14,.97);color:#d8fbff;font:14px/1.4 system-ui,sans-serif}
      #jarvis-focus-card{width:min(96vw,900px);max-height:96vh;overflow:auto;padding:14px;box-sizing:border-box;border:1px solid #00eaff;border-radius:15px;background:linear-gradient(145deg,#031b30,#000914);box-shadow:0 0 32px #00eaff2b}
      #jarvis-focus-stage{position:relative;width:100%;background:#000;border-radius:10px;overflow:hidden;line-height:0}
      #jarvis-focus-video{display:block;width:100%;max-height:66vh;object-fit:contain}
      #jarvis-focus-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .jarvis-focus-btn{touch-action:manipulation;cursor:pointer;border:1px solid #00d9ff;border-radius:8px;background:#06263c;color:#d8fbff;font-weight:800;padding:10px 13px;margin:8px 5px 0 0}
      #jarvis-focus-status{color:#8defff;font-size:12px;margin:9px 0 2px;min-height:1.5em}
      #jarvis-focus-card h2{font-size:18px;letter-spacing:2px;margin:2px 0 5px}
    `;
    document.head.appendChild(style);
    modal = document.createElement("div");
    modal.id = "jarvis-focus-detector";
    modal.innerHTML = `<section id="jarvis-focus-card" role="dialog" aria-modal="true" aria-label="JARVIS object detector">
      <h2>JARVIS // FOCUS DETECTOR</h2>
      <p style="font-size:12px;color:#9bcbd8;margin:0 0 10px">LOCAL ZERO-TOKEN MODE • Camera frames stay on this device. No Gemini, OpenRouter, or AI API requests are made.</p>
      <div id="jarvis-focus-stage"><video id="jarvis-focus-video" autoplay playsinline muted></video><canvas id="jarvis-focus-overlay"></canvas></div>
      <div id="jarvis-focus-status" role="status">Ready. Tap START DETECTOR to allow camera access.</div>
      <button class="jarvis-focus-btn" id="jarvis-focus-start" type="button">START DETECTOR</button>
      <button class="jarvis-focus-btn" id="jarvis-focus-close" type="button">CLOSE</button>
    </section>`;
    document.body.appendChild(modal);
    video = modal.querySelector("#jarvis-focus-video");
    canvas = modal.querySelector("#jarvis-focus-overlay");
    ctx = canvas.getContext("2d");
    modal.querySelector("#jarvis-focus-start").addEventListener("click", start);
    modal.querySelector("#jarvis-focus-close").addEventListener("click", close);
  }

  function status(text) {
    const el = document.getElementById("jarvis-focus-status");
    if (el) el.textContent = text;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load local detector library"));
      document.head.appendChild(s);
    });
  }

  async function loadModel() {
    if (model) return model;
    if (loading) {
      while (loading) await new Promise(r => setTimeout(r, 100));
      return model;
    }
    loading = true;
    try {
      if (!window.tf) await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
      if (!window.cocoSsd) await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
      model = await window.cocoSsd.load({base:"mobilenet_v2"});
      return model;
    } finally {
      loading = false;
    }
  }

  function intersectionOverUnion(a,b) {
    const [ax,ay,aw,ah]=a,[bx,by,bw,bh]=b;
    const ix=Math.max(0,Math.min(ax+aw,bx+bw)-Math.max(ax,bx));
    const iy=Math.max(0,Math.min(ay+ah,by+bh)-Math.max(ay,by));
    const inter=ix*iy, union=aw*ah+bw*bh-inter;
    return union>0?inter/union:0;
  }

  function displayLabel(className) {
    return LABELS[className] || String(className || "OBJECT").toUpperCase();
  }

  function drawDetection(p,w) {
    const [x,y,bw,bh]=p.bbox;
    const label=displayLabel(p.class);
    ctx.lineWidth=Math.max(2,w/400);
    ctx.strokeStyle="#00f5ff";
    ctx.shadowColor="#00dfff";
    ctx.shadowBlur=8;
    ctx.strokeRect(x,y,bw,bh);
    ctx.shadowBlur=0;
    ctx.font="bold "+Math.max(13,w/45)+"px system-ui,sans-serif";
    const text=label+" "+Math.round(p.score*100)+"%";
    const th=Math.max(24,w/28),tw=ctx.measureText(text).width+16;
    const ly=Math.max(0,y-th);
    ctx.fillStyle="rgba(0,18,34,.92)";
    ctx.fillRect(x,ly,tw,th);
    ctx.fillStyle="#9ffaff";
    ctx.fillText(text,x+8,ly+th*.69);
  }

  async function start() {
    build();
    modal.style.display="flex";
    status("Requesting camera permission…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera is not supported by this browser.");
      if (stream) stream.getTracks().forEach(t=>t.stop());
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
      video.srcObject=stream;
      await video.play();
      status("Loading local zero-token detector…");
      await loadModel();
      running=true;
      frame=0;
      previousBoxes=[];
      status("DETECTOR ACTIVE • LOCAL ONLY • no AI/API requests");
      detectLoop();
    } catch(e) {
      running=false;
      status("Could not start: "+(e.message||"allow camera access and try again."));
    }
  }

  async function detectLoop() {
    if (!running || !model || !video?.videoWidth) {
      if (running) requestAnimationFrame(detectLoop);
      return;
    }
    if (++frame % 6 === 0) {
      try {
        const predictions=await model.detect(video,25,.60);
        const w=video.videoWidth,h=video.videoHeight;
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        ctx.clearRect(0,0,w,h);

        const tracked=predictions.map(p=>{
          const old=previousBoxes.find(q=>q.class===p.class&&intersectionOverUnion(q.bbox,p.bbox)>=.30);
          return {...p,streak:old?old.streak+1:1};
        });
        previousBoxes=tracked.map(p=>({class:p.class,bbox:p.bbox,streak:p.streak}));

        // Stable multi-frame reporting prevents random guesses from appearing immediately.
        const chosen=tracked.filter(p=>p.streak>=4&&p.score>=.65)
          .sort((a,b)=>b.score-a.score).slice(0,10);
        chosen.forEach(p=>drawDetection(p,w));

        if(chosen.length){
          const names=chosen.map(p=>displayLabel(p.class)).join(", ");
          status("LOCAL DETECTOR • "+chosen.length+" stable object"+(chosen.length===1?"":"s")+" • "+names);
        } else {
          status("LOCAL DETECTOR • hold objects steady for a moment • zero API/token usage");
        }
      } catch(e) {
        status("Detection paused briefly; local detector retrying…");
      }
    }
    if(running) requestAnimationFrame(detectLoop);
  }

  function close() {
    running=false;
    previousBoxes=[];
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=null;
    if(video) video.srcObject=null;
    if(ctx&&canvas) ctx.clearRect(0,0,canvas.width,canvas.height);
    if(modal) modal.style.display="none";
  }

  // Public launcher for JARVIS voice/browser commands.
  window.openJarvisFocusDetector = () => { build(); start(); };
  window.closeJarvisFocusDetector = close;
  window.JARVISFocusDetector = {open:start, close};

  // Voice/text command compatibility. This does not send anything to a server.
  document.addEventListener("submit", e => {
    const form=e.target;
    if(form?.id!=="commandForm") return;
    const input=document.getElementById("commandInput");
    const text=String(input?.value||"").trim().replace(/^hey\s+jarvis[,:]?\s*/i,"").trim();
    if(/^(open|start|launch|show)(?: the)? (?:object )?(?:focus )?detector$|^(?:object )?detector$/i.test(text)){
      e.preventDefault(); e.stopImmediatePropagation();
      start();
      if(input) input.value="";
    }
  }, true);

  window.addEventListener("keydown", e => { if(e.key === "Escape" && modal?.style.display === "flex") close(); });
})();
