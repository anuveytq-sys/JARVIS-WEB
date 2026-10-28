(() => {
  'use strict';
  if (window.__JARVIS_BLACKHOLE_4D__) return;
  window.__JARVIS_BLACKHOLE_4D__ = true;

  const STYLE_ID = 'jarvis-blackhole-4d-style';
  const OVERLAY_ID = 'jarvis-blackhole-4d';
  const LAUNCHER_ID = 'jarvis-blackhole-4d-launcher';
  const $ = (s, r = document) => r.querySelector(s);

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${LAUNCHER_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483001;appearance:none;border:1px solid rgba(190,220,255,.62);border-radius:10px;padding:9px 12px;background:linear-gradient(145deg,rgba(5,12,24,.96),rgba(20,28,48,.92));color:#fff;font:700 10px/1.1 system-ui,sans-serif;letter-spacing:.12em;box-shadow:0 0 18px rgba(180,210,255,.18),inset 0 0 16px rgba(255,255,255,.035);cursor:pointer}
    #${LAUNCHER_ID}:hover{border-color:#fff;box-shadow:0 0 22px rgba(255,255,255,.28),inset 0 0 18px rgba(255,255,255,.05)}
    #${OVERLAY_ID}{position:fixed;inset:0;z-index:2147483000;display:none;background:#000;color:#fff;font:12px/1.35 system-ui,Arial,sans-serif;overflow:hidden}
    #${OVERLAY_ID}.open{display:block}
    #${OVERLAY_ID} canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    #${OVERLAY_ID} .bh-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 52%,transparent 35%,rgba(0,0,0,.18) 67%,rgba(0,0,0,.82) 100%)}
    #${OVERLAY_ID} .bh-top{position:absolute;left:18px;right:18px;top:15px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;pointer-events:none}
    #${OVERLAY_ID} .bh-title,#${OVERLAY_ID} .bh-data,#${OVERLAY_ID} .bh-controls{pointer-events:auto;background:linear-gradient(145deg,rgba(2,7,16,.88),rgba(3,8,18,.72));border:1px solid rgba(210,230,255,.32);box-shadow:0 0 24px rgba(255,255,255,.08),inset 0 0 24px rgba(255,255,255,.025);backdrop-filter:blur(10px)}
    #${OVERLAY_ID} .bh-title{padding:12px 15px;border-radius:12px;min-width:230px}
    #${OVERLAY_ID} .bh-title strong{display:block;font-size:16px;letter-spacing:.18em}
    #${OVERLAY_ID} .bh-title span{display:block;margin-top:3px;color:#aeb8c7;font-size:9px;letter-spacing:.16em}
    #${OVERLAY_ID} .bh-data{padding:12px 14px;border-radius:12px;min-width:185px}
    #${OVERLAY_ID} .bh-data b{display:block;margin-bottom:7px;font-size:12px;letter-spacing:.12em}
    #${OVERLAY_ID} .bh-row{display:flex;justify-content:space-between;gap:18px;color:#aeb8c7;font-size:10px;margin-top:4px}.bh-row em{font-style:normal;color:#fff;font-variant-numeric:tabular-nums}
    #${OVERLAY_ID} .bh-controls{position:absolute;left:18px;bottom:18px;width:min(340px,calc(100vw - 36px));padding:14px;border-radius:14px}
    #${OVERLAY_ID} .bh-controls h3{margin:0 0 12px;font-size:12px;letter-spacing:.15em}
    #${OVERLAY_ID} .bh-control{margin:9px 0}.bh-control label{display:flex;justify-content:space-between;gap:10px;color:#c8d1df;font-size:10px;margin-bottom:5px}.bh-control output{color:#fff;font-variant-numeric:tabular-nums}
    #${OVERLAY_ID} input[type=range]{width:100%;accent-color:#fff}
    #${OVERLAY_ID} .bh-actions{display:flex;gap:7px;margin-top:12px;flex-wrap:wrap}
    #${OVERLAY_ID} button{appearance:none;border:1px solid rgba(220,235,255,.35);border-radius:8px;background:#0b1220;color:#fff;padding:8px 10px;font:700 10px system-ui,sans-serif;letter-spacing:.08em;cursor:pointer}
    #${OVERLAY_ID} button.bh-active{background:#fff;color:#000;box-shadow:0 0 18px rgba(255,255,255,.45)}
    #${OVERLAY_ID} .bh-close{position:absolute;right:18px;bottom:18px;padding:10px 14px}
    #${OVERLAY_ID} .bh-note{position:absolute;left:50%;top:15px;transform:translateX(-50%);padding:7px 11px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(0,0,0,.48);color:#c4ccd7;font:9px ui-monospace,monospace;letter-spacing:.12em;pointer-events:none}
    @media(max-width:700px){#${OVERLAY_ID} .bh-data{display:none}#${OVERLAY_ID} .bh-title{min-width:0}#${OVERLAY_ID} .bh-note{display:none}#${OVERLAY_ID} .bh-close{right:18px;bottom:160px}}
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.id = LAUNCHER_ID;
  launcher.type = 'button';
  launcher.textContent = '◉ 4D BLACK HOLE';
  launcher.title = 'Open Black Hole 4D Vision';
  document.body.appendChild(launcher);

  const overlay = document.createElement('section');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-label', 'COSMOSIM Black Hole 4D Vision');
  overlay.innerHTML = `
    <canvas id="bhCanvas"></canvas>
    <div class="bh-vignette"></div>
    <div class="bh-top">
      <div class="bh-title"><strong>BLACK HOLE</strong><span>4D SPACE-TIME FABRIC // VISION MODE</span></div>
      <div class="bh-data"><b>BLACK HOLE // LIVE</b><div class="bh-row"><span>MASS</span><em id="bhMassReadout">10 M☉</em></div><div class="bh-row"><span>CURVATURE</span><em id="bhCurveReadout">1.0×</em></div><div class="bh-row"><span>EVENT HORIZON</span><em id="bhHorizonReadout">29.5 km</em></div></div>
    </div>
    <div class="bh-note">4D VISION // GRID CURVATURE VISUALIZATION</div>
    <div class="bh-controls">
      <h3>SPACE CONTROLS</h3>
      <div class="bh-control"><label><span>Mass</span><output id="bhMassOut">10 M☉</output></label><input id="bhMass" type="range" min="2" max="50" step="0.5" value="10"></div>
      <div class="bh-control"><label><span>Accretion Disk</span><output id="bhDiskOut">1.0</output></label><input id="bhDisk" type="range" min="0" max="2" step="0.05" value="1"></div>
      <div class="bh-control"><label><span>Grid Curvature</span><output id="bhGridOut">1.0</output></label><input id="bhGrid" type="range" min="0.25" max="2" step="0.05" value="1"></div>
      <div class="bh-control"><label><span>Simulation Speed</span><output id="bhSpeedOut">1.0</output></label><input id="bhSpeed" type="range" min="0" max="2" step="0.05" value="1"></div>
      <div class="bh-actions"><button id="bhVision" class="bh-active" type="button">4D VISION: ON</button><button id="bhReset" type="button">↻ RESET</button></div>
    </div>
    <button id="bhClose" class="bh-close" type="button">CLOSE</button>
  `;
  document.body.appendChild(overlay);

  const canvas = $('#bhCanvas', overlay), ctx = canvas.getContext('2d');
  const mass = $('#bhMass', overlay), disk = $('#bhDisk', overlay), grid = $('#bhGrid', overlay), speed = $('#bhSpeed', overlay);
  const massOut = $('#bhMassOut', overlay), diskOut = $('#bhDiskOut', overlay), gridOut = $('#bhGridOut', overlay), speedOut = $('#bhSpeedOut', overlay);
  const massReadout = $('#bhMassReadout', overlay), curveReadout = $('#bhCurveReadout', overlay), horizonReadout = $('#bhHorizonReadout', overlay);
  const visionButton = $('#bhVision', overlay);
  let dpr = 1, w = 0, h = 0, raf = 0, last = performance.now(), t = 0, vision = true;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, innerWidth); h = Math.max(1, innerHeight);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function readState() {
    const m = Number(mass.value), d = Number(disk.value), g = Number(grid.value), s = Number(speed.value);
    massOut.value = m.toFixed(1).replace('.0','') + ' M☉';
    diskOut.value = d.toFixed(2).replace(/0$/,'').replace(/\.0$/,'');
    gridOut.value = g.toFixed(2).replace(/0$/,'').replace(/\.0$/,'');
    speedOut.value = s.toFixed(2).replace(/0$/,'').replace(/\.0$/,'');
    massReadout.textContent = massOut.value;
    curveReadout.textContent = (g * (m / 10)).toFixed(2) + '×';
    horizonReadout.textContent = (2.95 * m).toFixed(1) + ' km';
  }

  function warpPoint(x, y, cx, cy, strength) {
    const dx = x-cx, dy = y-cy, r = Math.hypot(dx,dy);
    const safe = Math.max(26, r);
    const pull = strength * Math.exp(-r / (Math.min(w,h)*0.38)) * (Math.min(w,h)*0.18) / Math.sqrt(safe/24);
    return {x:x-dx/safe*pull, y:y-dy/safe*pull};
  }

  function drawGrid(cx, cy, strength) {
    if (!vision) return;
    const far = Math.max(w,h)*1.25;
    const horizon = Math.min(w,h)*0.055;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    const cols = 34, rows = 26;
    for (let i=-cols;i<=cols;i++) {
      const x = cx + i*(far/cols);
      ctx.beginPath();
      for (let j=-rows;j<=rows;j++) {
        const y = cy + j*(far/rows);
        const p = warpPoint(x,y,cx,cy,strength);
        if (j===-rows) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    for (let j=-rows;j<=rows;j++) {
      const y = cy + j*(far/rows);
      ctx.beginPath();
      for (let i=-cols;i<=cols;i++) {
        const x = cx + i*(far/cols);
        const p = warpPoint(x,y,cx,cy,strength);
        if (i===-cols) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    // Dense inner rings make the four-dimensional curvature read clearly.
    for (let k=1;k<=24;k++) {
      const rr = horizon + k*horizon*1.9;
      ctx.beginPath();
      for (let a=0;a<=Math.PI*2+.04;a+=.035) {
        const x = cx + Math.cos(a)*rr*1.7;
        const y = cy + Math.sin(a)*rr*.68;
        const p = warpPoint(x,y,cx,cy,strength*1.25);
        if(a===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(.08,.38-k*.011)})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStars() {
    ctx.save();
    const seed = 137;
    for(let i=0;i<260;i++){
      const x=(i*97+seed*13)%w, y=(i*193+seed*7)%h;
      const r=.35+((i*31)%9)/14;
      ctx.fillStyle=`rgba(255,255,255,${.18+((i*17)%70)/100})`;
      ctx.fillRect(x,y,r,r);
    }
    ctx.restore();
  }

  function drawBlackHole(cx,cy,m,d) {
    const base = Math.min(w,h)*.075*(.72+.025*m);
    const ring = base*(1.18+.22*d);
    ctx.save();
    // Wide monochrome glow.
    const glow = ctx.createRadialGradient(cx,cy,base*.72,cx,cy,ring*2.2);
    glow.addColorStop(0,'rgba(255,255,255,.96)'); glow.addColorStop(.22,'rgba(255,255,255,.48)'); glow.addColorStop(.58,'rgba(255,255,255,.12)'); glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(cx,cy,ring*2.2,0,Math.PI*2); ctx.fill();
    // Accretion disk / photon ring.
    ctx.translate(cx,cy); ctx.rotate(-.045);
    ctx.scale(1,.34);
    for(let i=0;i<12;i++){
      ctx.beginPath(); ctx.arc(0,0,ring*(.86+i*.035),0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${Math.max(.08,.68-i*.045)*d})`;
      ctx.lineWidth=2+i*.45; ctx.shadowBlur=12; ctx.shadowColor='#fff'; ctx.stroke();
    }
    ctx.shadowBlur=0; ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(0,0,base,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Crisp event-horizon rim in screen space.
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,base,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,.92)'; ctx.lineWidth=Math.max(2,base*.035); ctx.shadowBlur=18; ctx.shadowColor='#fff'; ctx.stroke(); ctx.restore();
  }

  function frame(now) {
    if(!overlay.classList.contains('open')) { raf=0; return; }
    const dt=Math.min(.05,(now-last)/1000); last=now; t+=dt*Number(speed.value);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
    drawStars();
    const cx=w*.5, cy=h*.52;
    const m=Number(mass.value), g=Number(grid.value), d=Number(disk.value);
    const strength=(.62+Math.sqrt(m/10)*.82)*g;
    drawGrid(cx,cy,strength);
    // Subtle moving lensing streaks preserve the sense of an active relativistic field.
    if(vision){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*.025);
      for(let i=0;i<14;i++){
        ctx.beginPath(); ctx.ellipse(0,0,Math.min(w,h)*(.23+i*.018),Math.min(w,h)*(.075+i*.006),i*.19,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,255,255,${.025+i*.004})`; ctx.stroke();
      }
      ctx.restore();
    }
    drawBlackHole(cx,cy,m,d);
    raf=requestAnimationFrame(frame);
  }

  function open() { overlay.classList.add('open'); resize(); readState(); last=performance.now(); if(!raf) raf=requestAnimationFrame(frame); }
  function close() { overlay.classList.remove('open'); if(raf){cancelAnimationFrame(raf);raf=0;} }
  launcher.addEventListener('click',open);
  $('#bhClose',overlay).addEventListener('click',close);
  $('#bhReset',overlay).addEventListener('click',()=>{mass.value=10;disk.value=1;grid.value=1;speed.value=1;vision=true;visionButton.classList.add('bh-active');visionButton.textContent='4D VISION: ON';readState();});
  visionButton.addEventListener('click',()=>{vision=!vision;visionButton.classList.toggle('bh-active',vision);visionButton.textContent='4D VISION: '+(vision?'ON':'OFF');});
  [mass,disk,grid,speed].forEach(el=>el.addEventListener('input',readState));
  window.addEventListener('resize',resize);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close();});
  resize(); readState();
})();
