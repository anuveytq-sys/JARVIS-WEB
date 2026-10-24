/* ULTRON — clean rebuild: orange neural field + interactive 3D core only. */
(() => {
  'use strict';
  const VERSION = 'ultron-core-rebuild-1';
  if (window.ULTRON?.version === VERSION) { window.ULTRON.open(); return; }
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js';
  let renderer, scene, camera, frame, resizeHandler, pointerHandler, wheelHandler;
  let root, core, coreGlow, network, particles, ringGroup, active = false;
  let drag = false, lastX = 0, lastY = 0, rotX = 0, rotY = 0, targetX = 0, targetY = 0, zoom = 1;
  const overlayId = 'ultron-clean-core';
  const loadThree = () => new Promise((resolve, reject) => {
    if (window.THREE) return resolve();
    let script = document.querySelector('script[data-ultron-three]');
    if (script) { script.addEventListener('load', resolve, { once: true }); script.addEventListener('error', reject, { once: true }); return; }
    script = document.createElement('script'); script.src = THREE_URL; script.async = true; script.dataset.ultronThree = '1';
    script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
  });
  function buildOverlay() {
    let el = document.getElementById(overlayId);
    if (el) el.remove();
    el = document.createElement('section'); el.id = overlayId;
    el.setAttribute('role', 'application'); el.setAttribute('aria-label', 'ULTRON interactive neural core');
    el.innerHTML = '<canvas class="uc-canvas"></canvas><div class="uc-vignette"></div><div class="uc-mark">ULTRON</div><div class="uc-sub">NEURAL CORE</div><div class="uc-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div><button class="uc-exit" type="button" aria-label="Close ULTRON">×</button>';
    const style = document.createElement('style'); style.id = 'ultron-clean-core-style';
    style.textContent = `
      #${overlayId}{position:fixed;inset:0;z-index:2147483000;background:#050302;color:#ff8a32;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;isolation:isolate;touch-action:none}
      #${overlayId} .uc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
      #${overlayId} .uc-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,.24) 66%,#030201 100%)}
      #${overlayId} .uc-mark{position:absolute;top:28px;left:32px;font-size:clamp(18px,2.4vw,30px);font-weight:800;letter-spacing:.34em;color:#ff8b35;text-shadow:0 0 24px #ff5c16}
      #${overlayId} .uc-sub{position:absolute;top:66px;left:34px;font-size:9px;letter-spacing:.38em;color:#b55b28}
      #${overlayId} .uc-hint{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);font-size:9px;letter-spacing:.22em;color:rgba(255,155,83,.62);white-space:nowrap}
      #${overlayId} .uc-exit{position:absolute;top:24px;right:26px;width:42px;height:42px;border:1px solid rgba(255,124,42,.38);border-radius:50%;background:rgba(20,8,2,.45);color:#ff9a50;font-size:25px;cursor:pointer;transition:background .2s,box-shadow .2s}
      #${overlayId} .uc-exit:hover{background:rgba(255,102,20,.16);box-shadow:0 0 24px rgba(255,100,20,.25)}
      @media(max-width:600px){#${overlayId} .uc-mark{top:20px;left:18px}#${overlayId} .uc-sub{top:51px;left:20px}#${overlayId} .uc-exit{top:15px;right:15px}#${overlayId} .uc-hint{bottom:18px;font-size:7px;letter-spacing:.14em}}
      @media(prefers-reduced-motion:reduce){#${overlayId} *{transition:none!important}}
    `;
    document.head.appendChild(style); document.body.appendChild(el);
    el.querySelector('.uc-exit').addEventListener('click', close);
    return el;
  }
  function makeScene(el) {
    const T = window.THREE, canvas = el.querySelector('canvas');
    scene = new T.Scene(); scene.background = new T.Color(0x050302);
    camera = new T.PerspectiveCamera(42, innerWidth / innerHeight, .1, 1000); camera.position.set(0, 0, 11);
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8)); renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    root = new T.Group(); scene.add(root);
    scene.add(new T.AmbientLight(0xff6824, 1.5));
    const light = new T.PointLight(0xff6b1a, 180, 40); light.position.set(3, 2, 5); scene.add(light);
    const innerLight = new T.PointLight(0xffa04b, 90, 25); innerLight.position.set(-3, -1, 2); scene.add(innerLight);
    // Dense spherical neural mesh: deterministic nodes and short links, optimized for real-time WebGL.
    const N = innerWidth < 650 ? 1150 : 2400, positions = new Float32Array(N * 3), sizes = new Float32Array(N);
    const golden = Math.PI * (3 - Math.sqrt(5)), nodes = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, radius = Math.sqrt(1 - y * y), theta = golden * i;
      const p = new T.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius).multiplyScalar(2.15 + Math.sin(i * 12.989) * .055);
      nodes.push(p); positions[i*3]=p.x; positions[i*3+1]=p.y; positions[i*3+2]=p.z; sizes[i] = .025 + ((i*37)%11)/500;
    }
    const links = [];
    for (let i = 0; i < N; i++) {
      const candidates = [];
      for (let j = Math.max(0, i-10); j < Math.min(N, i+11); j++) {
        if (i === j) continue;
        const d = nodes[i].distanceTo(nodes[j]); if (d < .52) candidates.push([d,j]);
      }
      candidates.sort((a,b)=>a[0]-b[0]);
      for (const [,j] of candidates.slice(0, 5)) if (j > i) { links.push(nodes[i].x,nodes[i].y,nodes[i].z,nodes[j].x,nodes[j].y,nodes[j].z); }
    }
    const lineGeo = new T.BufferGeometry(); lineGeo.setAttribute('position', new T.Float32BufferAttribute(links, 3));
    network = new T.LineSegments(lineGeo, new T.LineBasicMaterial({ color: 0xff641b, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false }));
    root.add(network);
    const pointGeo = new T.BufferGeometry(); pointGeo.setAttribute('position', new T.Float32BufferAttribute(positions,3));
    particles = new T.Points(pointGeo, new T.PointsMaterial({ color: 0xffa15a, size: .035, transparent:true, opacity:.9, blending:T.AdditiveBlending, depthWrite:false, sizeAttenuation:true }));
    root.add(particles);
    // Central glass-like core with layered emissive shells and a luminous nucleus.
    core = new T.Mesh(new T.IcosahedronGeometry(.82, 5), new T.MeshPhysicalMaterial({ color:0x8d2d0a, emissive:0xff4d0a, emissiveIntensity:1.5, roughness:.19, metalness:.35, clearcoat:1, clearcoatRoughness:.12, transmission:.08, transparent:true, opacity:.92 }));
    root.add(core);
    coreGlow = new T.Mesh(new T.SphereGeometry(.58, 48, 48), new T.MeshBasicMaterial({ color:0xff7b22, transparent:true, opacity:.18, blending:T.AdditiveBlending, depthWrite:false })); root.add(coreGlow);
    const nucleus = new T.Mesh(new T.IcosahedronGeometry(.36, 4), new T.MeshStandardMaterial({ color:0xffad55, emissive:0xff4c08, emissiveIntensity:3.2, roughness:.2, metalness:.25 })); root.add(nucleus);
    ringGroup = new T.Group(); root.add(ringGroup);
    for (let i=0;i<4;i++) {
      const ring = new T.Mesh(new T.TorusGeometry(1.18 + i*.18, .006 + (i%2)*.003, 6, 220), new T.MeshBasicMaterial({color:i%2?0xff4d13:0xffa04b,transparent:true,opacity:.52,blending:T.AdditiveBlending,depthWrite:false}));
      ring.rotation.set(.7+i*.52, .3+i*.8, .2+i*.42); ringGroup.add(ring);
    }
    const halo = new T.Mesh(new T.SphereGeometry(2.5,32,24), new T.MeshBasicMaterial({color:0xff5a16,wireframe:true,transparent:true,opacity:.035,blending:T.AdditiveBlending,depthWrite:false})); root.add(halo);
  }
  function cleanup() {
    active = false; cancelAnimationFrame(frame);
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    const el = document.getElementById(overlayId); if (el) el.remove();
    const style = document.getElementById('ultron-clean-core-style'); if (style) style.remove();
    if (renderer) { renderer.dispose(); renderer = null; }
    scene = camera = root = core = coreGlow = network = particles = ringGroup = null;
  }
  function close(){ cleanup(); }
  function open() {
    if (active) return;
    active = true;
    loadThree().then(() => {
      if (!active) return;
      const el = buildOverlay(); makeScene(el);
      const canvas = el.querySelector('canvas');
      canvas.addEventListener('pointerdown', e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});
      canvas.addEventListener('pointermove', e=>{if(!drag)return;targetY+=(e.clientX-lastX)*.006;targetX+=(e.clientY-lastY)*.006;targetX=Math.max(-1.3,Math.min(1.3,targetX));lastX=e.clientX;lastY=e.clientY});
      const stopDrag=()=>{drag=false}; canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('pointerleave',stopDrag);
      wheelHandler=e=>{e.preventDefault();zoom=Math.max(.68,Math.min(1.7,zoom+(e.deltaY>0?.06:-.06)))};
      canvas.addEventListener('wheel',wheelHandler,{passive:false});
      resizeHandler=()=>{if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8))};
      window.addEventListener('resize',resizeHandler);
      let t=0;
      const animate=()=>{if(!active||!renderer)return;frame=requestAnimationFrame(animate);t+=.004;rotX+=(targetX-rotX)*.045;rotY+=(targetY-rotY)*.045;root.rotation.x=rotX+Math.sin(t*.3)*.035;root.rotation.y=rotY+t*.11;root.rotation.z=Math.sin(t*.22)*.04;core.rotation.x=t*.18;core.rotation.y=-t*.23;coreGlow.scale.setScalar(1+Math.sin(t*2.1)*.055);ringGroup.rotation.y=-t*.12;ringGroup.rotation.x=Math.sin(t*.4)*.12;camera.position.z+=(11/zoom-camera.position.z)*.08;renderer.render(scene,camera)};
      animate();
    }).catch(error => { active=false; console.error('[ULTRON] WebGL core could not start',error); alert('ULTRON core could not load. Check your internet connection and WebGL support.'); });
  }
  window.ULTRON = { version: VERSION, open, close };
})();