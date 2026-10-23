/* JARVIS // ULTRON PUBLIC INTELLIGENCE ENVIRONMENT
   Version: ultron-20261023a
   Isolated, lazy-loaded, low-overhead public-data intelligence HUD.

   Safety boundary:
   - Uses public/open data and public-source links only.
   - Does not retrieve passwords, credential dumps, private records, or stolen datasets.
   - Camera results are limited to intentionally public feeds/imagery supplied by public sources.
   - Free/keyless sources are preferred; optional services are shown as source links instead of hard requirements.
*/
(() => {
  'use strict';
  if (window.ULTRON) return;

  const VERSION = 'ultron-20261023a';
  const ID = 'jarvis-ultron-root';
  const CATEGORIES = [
    ['EMAIL','Email intelligence','Holehe · GitHub · XposedOrNot','email'],
    ['USERNAME','Username intelligence','Sherlock-style public profile discovery','username'],
    ['PHONE','Phone intelligence','PhoneInfoga-style public metadata','phone'],
    ['DOMAIN','Domain / DNS','RDAP · WHOIS · DNS · MX · SPF · DMARC','domain'],
    ['IP','IP intelligence','ASN · ISP · hostname · public geodata','ip'],
    ['BREACH STATUS','Exposure status','Known-breach notification only','breach'],
    ['GITHUB','Developer footprint','Public repositories · commits · orgs','github'],
    ['INTERNET EXPOSURE','Public services','Certificates · banners · public endpoints','exposure'],
    ['EARTH','Earth intelligence','NASA · Copernicus · open imagery','earth'],
    ['SATELLITES','Orbital intelligence','CelesTrak · NASA/open orbital data','satellite'],
    ['NEWS / GEO','Global events','GDELT · public geographic reporting','news'],
    ['MAPS','Geospatial intelligence','OpenStreetMap · Nominatim · Overpass','maps'],
    ['PUBLIC CAMERAS','Public imagery','Only intentionally public camera/traffic feeds','cameras'],
    ['AIRCRAFT','Aviation intelligence','Open/public flight information','aircraft'],
    ['SPACE','Space intelligence','NASA · missions · astronomy · launches','space']
  ];

  const SOURCES = {
    email: [
      ['XposedOrNot','https://xposedornot.com/'],
      ['GitHub public search','https://github.com/search?q='],
      ['Google public search','https://www.google.com/search?q=']
    ],
    username: [
      ['Sherlock project','https://github.com/sherlock-project/sherlock'],
      ['GitHub users','https://github.com/search?q='],
      ['DuckDuckGo public search','https://duckduckgo.com/?q=']
    ],
    phone: [
      ['PhoneInfoga project','https://github.com/sundowndev/phoneinfoga'],
      ['Google public search','https://www.google.com/search?q='],
      ['OpenStreetMap search','https://www.openstreetmap.org/search?query=']
    ],
    domain: [
      ['ICANN Lookup / RDAP','https://lookup.icann.org/en/lookup'],
      ['DNSViz','https://dnsviz.net/'],
      ['HackerTarget DNS lookup','https://hackertarget.com/find-dns-host-records/']
    ],
    ip: [
      ['ipinfo','https://ipinfo.io/'],
      ['RIPEstat','https://stat.ripe.net/'],
      ['ARIN RDAP','https://search.arin.net/rdap/']
    ],
    breach: [
      ['XposedOrNot','https://xposedornot.com/'],
      ['Have I Been Pwned','https://haveibeenpwned.com/'],
      ['Mozilla Monitor','https://monitor.mozilla.org/']
    ],
    github: [
      ['GitHub search','https://github.com/search?q='],
      ['GitHub API','https://api.github.com/'],
      ['GitHub public events','https://api.github.com/events']
    ],
    exposure: [
      ['Shodan','https://www.shodan.io/'],
      ['Censys','https://search.censys.io/'],
      ['crt.sh certificates','https://crt.sh/?q=']
    ],
    earth: [
      ['NASA Earthdata','https://www.earthdata.nasa.gov/'],
      ['NASA APIs','https://api.nasa.gov/'],
      ['Copernicus Data Space','https://dataspace.copernicus.eu/']
    ],
    satellite: [
      ['CelesTrak','https://celestrak.org/'],
      ['NASA Space-Track information','https://www.space-track.org/'],
      ['N2YO','https://www.n2yo.com/']
    ],
    news: [
      ['GDELT','https://www.gdeltproject.org/'],
      ['GDELT DOC API','https://api.gdeltproject.org/api/v2/doc/doc?query='],
      ['Wikidata','https://www.wikidata.org/']
    ],
    maps: [
      ['OpenStreetMap','https://www.openstreetmap.org/'],
      ['Nominatim','https://nominatim.openstreetmap.org/'],
      ['Overpass Turbo','https://overpass-turbo.eu/']
    ],
    cameras: [
      ['EarthCam public webcams','https://www.earthcam.com/'],
      ['Windy webcams','https://www.windy.com/-Webcams/webcams'],
      ['OpenStreetMap camera data','https://www.openstreetmap.org/']
    ],
    aircraft: [
      ['OpenSky Network','https://opensky-network.org/'],
      ['ADSB.lol','https://adsb.lol/'],
      ['FlightAware','https://www.flightaware.com/']
    ],
    space: [
      ['NASA','https://www.nasa.gov/'],
      ['NASA Open APIs','https://api.nasa.gov/'],
      ['Space-Track','https://www.space-track.org/']
    ]
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const encode = (v) => encodeURIComponent(String(v || '').trim());
  const open = (url) => { if (!url) return; window.open(url, '_blank', 'noopener,noreferrer'); };

  function build() {
    if (document.getElementById(ID)) return;
    const root = document.createElement('section');
    root.id = ID;
    root.innerHTML = `
      <div class="uz-scanlines"></div>
      <div class="uz-topbar">
        <div class="uz-brand"><span class="uz-dot"></span>ULTRON <small>PUBLIC INTELLIGENCE MATRIX</small></div>
        <button class="uz-close" type="button" aria-label="Close ULTRON">×</button>
      </div>
      <div class="uz-layout">
        <aside class="uz-categories" aria-label="Intelligence categories">
          <div class="uz-section-label">INTELLIGENCE AREAS</div>
          <div class="uz-category-list"></div>
        </aside>
        <main class="uz-core">
          <div class="uz-core-grid"></div>
          <div class="uz-orb"><div class="uz-ring r1"></div><div class="uz-ring r2"></div><div class="uz-ring r3"></div><div class="uz-core-dot"></div><div class="uz-core-text">U</div></div>
          <div class="uz-status">ULTRON STANDBY // PUBLIC-SOURCE MODE</div>
        </main>
        <aside class="uz-data">
          <div class="uz-data-head"><span id="uz-category-name">SELECT A CATEGORY</span><span id="uz-count">0 SOURCES</span></div>
          <div class="uz-target-row"><input id="uz-target" autocomplete="off" placeholder="TARGET / QUERY / EMAIL / USERNAME / DOMAIN / IP"><button id="uz-run" type="button">SCAN</button></div>
          <div id="uz-results" class="uz-results"></div>
          <div class="uz-camera" id="uz-camera"><div class="uz-camera-head">PUBLIC CAMERA / IMAGE FEED</div><div class="uz-camera-empty">NO PUBLIC IMAGE SELECTED</div></div>
        </aside>
      </div>
      <div class="uz-footer"><span>FREE / OPEN SOURCES FIRST</span><span>NO PRIVATE RECORDS</span><span>${VERSION}</span></div>
    `;
    document.body.appendChild(root);
    installStyle();

    const list = root.querySelector('.uz-category-list');
    CATEGORIES.forEach(([name, sub, sources, key], index) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'uz-cat'; b.dataset.key = key;
      b.innerHTML = `<span class="uz-cat-index">${String(index + 1).padStart(2,'0')}</span><span><b>${esc(name)}</b><small>${esc(sub)}</small></span>`;
      b.addEventListener('click', () => select(key, b));
      list.appendChild(b);
    });

    root.querySelector('.uz-close').addEventListener('click', close);
    root.querySelector('#uz-run').addEventListener('click', scan);
    root.querySelector('#uz-target').addEventListener('keydown', e => { if (e.key === 'Enter') scan(); });
    root.querySelector('.uz-core').addEventListener('click', () => root.classList.toggle('uz-active'));
    select('email', list.firstElementChild);
  }

  function installStyle() {
    if (document.getElementById('jarvis-ultron-style')) return;
    const s = document.createElement('style'); s.id = 'jarvis-ultron-style';
    s.textContent = `
      #${ID}{position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 50% 46%,rgba(38,8,8,.9),rgba(3,3,7,.98) 52%,#000 100%);color:#eafcff;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;overflow:hidden;letter-spacing:.5px}
      #${ID} *{box-sizing:border-box} #${ID} button,#${ID} input{font:inherit}
      .uz-scanlines{position:absolute;inset:0;pointer-events:none;opacity:.12;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.08) 4px);mix-blend-mode:screen}
      .uz-topbar{height:46px;border-bottom:1px solid rgba(255,60,35,.35);display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:rgba(10,4,6,.75);backdrop-filter:blur(12px);position:relative;z-index:4}
      .uz-brand{font-size:13px;font-weight:900;letter-spacing:3px;color:#ffdfd8;text-shadow:0 0 14px rgba(255,60,35,.55)} .uz-brand small{font-size:6px;letter-spacing:1.5px;color:#a96b64;margin-left:8px}
      .uz-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff3c24;box-shadow:0 0 12px #ff3c24;margin-right:7px;animation:uzpulse 1.6s infinite}
      .uz-close{border:1px solid rgba(255,80,60,.4);background:rgba(40,7,7,.65);color:#ff9b8f;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:20px;line-height:1}
      .uz-layout{height:calc(100% - 76px);display:grid;grid-template-columns:190px 1fr 300px;gap:10px;padding:10px;position:relative;z-index:2}
      .uz-categories,.uz-data{background:linear-gradient(145deg,rgba(23,8,10,.78),rgba(4,6,10,.75));border:1px solid rgba(255,70,45,.24);box-shadow:inset 0 0 24px rgba(255,45,25,.035),0 0 20px rgba(0,0,0,.3);border-radius:7px;min-height:0;overflow:hidden}
      .uz-section-label,.uz-data-head{height:31px;padding:9px 9px 7px;color:#b66a61;font-size:7px;letter-spacing:1.4px;border-bottom:1px solid rgba(255,70,45,.16)}
      .uz-category-list{height:calc(100% - 31px);overflow-y:auto;padding:5px;scrollbar-width:thin;scrollbar-color:rgba(255,65,45,.5) transparent}
      .uz-cat{width:100%;display:grid;grid-template-columns:22px 1fr;gap:5px;text-align:left;padding:7px 5px;margin-bottom:3px;background:rgba(255,45,25,.025);border:1px solid transparent;color:#ffdcd7;border-radius:4px;cursor:pointer}
      .uz-cat:hover,.uz-cat.active{border-color:rgba(255,65,45,.45);background:linear-gradient(90deg,rgba(255,55,35,.14),rgba(30,5,7,.12));box-shadow:inset 3px 0 rgba(255,60,35,.8)}
      .uz-cat-index{font-size:7px;color:#713c36;padding-top:2px}.uz-cat b{display:block;font-size:7px;letter-spacing:.8px}.uz-cat small{display:block;font-size:5.5px;color:#7f6865;margin-top:2px;line-height:1.3}
      .uz-core{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(255,70,45,.18);border-radius:7px;background:radial-gradient(circle at center,rgba(80,12,8,.16),transparent 42%)}
      .uz-core-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,65,45,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,65,45,.07) 1px,transparent 1px);background-size:42px 42px;transform:perspective(500px) rotateX(55deg) scale(1.5);transform-origin:center bottom;opacity:.32}
      .uz-orb{position:absolute;left:50%;top:48%;width:190px;height:190px;transform:translate(-50%,-50%) perspective(500px) rotateX(12deg);display:grid;place-items:center;filter:drop-shadow(0 0 18px rgba(255,45,20,.32))}
      .uz-ring{position:absolute;border:1px solid rgba(255,70,45,.55);border-radius:50%;inset:0;box-shadow:inset 0 0 16px rgba(255,50,30,.09)} .r1{animation:uzspin 8s linear infinite}.r2{inset:17px;border-style:dashed;animation:uzspin 11s linear infinite reverse}.r3{inset:34px;border-color:rgba(255,170,100,.35);animation:uzspin 5s linear infinite}
      .uz-core-dot{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle,#fff 0 3%,#ff5b38 15%,#8d160d 48%,#120000 70%);box-shadow:0 0 16px #ff3d25,0 0 50px rgba(255,45,20,.55)} .uz-core-text{position:absolute;font-size:28px;font-weight:900;color:#fff;mix-blend-mode:screen;text-shadow:0 0 14px #ff3c24}
      .uz-status{position:absolute;bottom:13%;left:50%;transform:translateX(-50%);font-size:7px;letter-spacing:2px;color:#a9645b;white-space:nowrap}.uz-active .uz-core-dot{animation:uzpulse .7s infinite}
      .uz-data{display:flex;flex-direction:column}.uz-data-head{display:flex;justify-content:space-between}.uz-target-row{display:flex;gap:4px;padding:7px;border-bottom:1px solid rgba(255,70,45,.13)}
      .uz-target-row input{min-width:0;flex:1;background:rgba(0,0,0,.35);border:1px solid rgba(255,70,45,.24);color:#ffe6e1;padding:7px 6px;border-radius:3px;font-size:7px;outline:none}.uz-target-row input:focus{border-color:rgba(255,80,60,.7);box-shadow:0 0 10px rgba(255,50,30,.12)}
      .uz-target-row button{width:48px;border:1px solid rgba(255,70,45,.5);background:rgba(100,15,8,.35);color:#ffb0a5;font-size:7px;font-weight:800;border-radius:3px;cursor:pointer}.uz-results{flex:1;min-height:0;overflow-y:auto;padding:7px;scrollbar-width:thin;scrollbar-color:rgba(255,65,45,.5) transparent}
      .uz-result{padding:8px;margin-bottom:5px;border:1px solid rgba(255,70,45,.16);background:rgba(255,40,20,.035);border-radius:4px}.uz-result-title{font-size:7px;color:#ffd8d1;font-weight:800}.uz-result-note{font-size:6px;color:#8f7470;margin-top:4px;line-height:1.45}.uz-source{display:inline-block;margin:5px 4px 0 0;padding:4px 5px;border:1px solid rgba(255,70,45,.28);color:#e58a7d;background:rgba(90,10,7,.25);font-size:5.5px;border-radius:3px;cursor:pointer}.uz-source:hover{border-color:#ff654d;color:#fff}
      .uz-camera{height:112px;margin:0 7px 7px;border:1px solid rgba(255,70,45,.18);background:#020304;border-radius:4px;overflow:hidden;position:relative}.uz-camera-head{height:20px;padding:6px;font-size:5.5px;letter-spacing:1px;color:#8d5b55;border-bottom:1px solid rgba(255,70,45,.15)}.uz-camera-empty{height:90px;display:grid;place-items:center;color:#4f3b38;font-size:6px;letter-spacing:1px}.uz-camera img{width:100%;height:90px;object-fit:cover;display:block;filter:saturate(.7) contrast(1.1)}
      .uz-footer{height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 12px;color:#553b38;font-size:5.5px;letter-spacing:1.2px;border-top:1px solid rgba(255,70,45,.18);position:relative;z-index:4;background:rgba(4,2,3,.75)}
      @keyframes uzspin{to{transform:rotate(360deg)}} @keyframes uzpulse{50%{opacity:.45;transform:scale(.92)}}
      @media(max-width:900px){.uz-layout{grid-template-columns:145px 1fr 240px}.uz-brand small{display:none}}
      @media(max-width:650px){.uz-layout{grid-template-columns:118px 1fr}.uz-data{position:absolute;right:8px;top:8px;bottom:8px;width:230px;transform:translateX(calc(100% + 12px));transition:transform .2s ease}.uz-layout:focus-within .uz-data{transform:translateX(0)}.uz-orb{width:135px;height:135px}.uz-status{font-size:5.5px}.uz-footer span:nth-child(2){display:none}}
    `;
    document.head.appendChild(s);
  }

  let selected = 'email';
  function select(key, button) {
    selected = key;
    document.querySelectorAll('.uz-cat').forEach(x => x.classList.toggle('active', x === button));
    const meta = CATEGORIES.find(x => x[3] === key);
    const name = document.getElementById('uz-category-name');
    const count = document.getElementById('uz-count');
    if (name) name.textContent = meta ? meta[0] : key.toUpperCase();
    if (count) count.textContent = `${(SOURCES[key] || []).length} SOURCES`;
    renderSources(key, '');
  }

  function renderSources(key, target) {
    const box = document.getElementById('uz-results'); if (!box) return;
    const src = SOURCES[key] || [];
    const q = encode(target);
    box.innerHTML = `<div class="uz-result"><div class="uz-result-title">PUBLIC-SOURCE ROUTES READY</div><div class="uz-result-note">ULTRON uses free/open sources first. A source may require its own limits or account. Results are leads, not proof.</div>${src.map(([n,u]) => `<button class="uz-source" type="button" data-url="${esc(u)}${q && /[?=]$/.test(u) ? q : ''}">${esc(n)}</button>`).join('')}</div>`;
    box.querySelectorAll('.uz-source').forEach(b => b.addEventListener('click', () => open(b.dataset.url)));
  }

  async function scan() {
    const input = document.getElementById('uz-target'); const target = (input?.value || '').trim();
    const box = document.getElementById('uz-results'); if (!box) return;
    box.innerHTML = `<div class="uz-result"><div class="uz-result-title">ULTRON // ANALYZING PUBLIC SOURCES</div><div class="uz-result-note">Normalizing target and preparing category-specific public-source routes…</div></div>`;
    const key = selected;
    if (!target) { renderSources(key, ''); return; }

    if (key === 'github') await githubLookup(target, box);
    else if (key === 'earth' || key === 'space') await nasaLookup(target, box);
    else if (key === 'maps') await mapLookup(target, box);
    else if (key === 'news') await gdeltLookup(target, box);
    else renderSources(key, target);
  }

  async function githubLookup(target, box) {
    try {
      const r = await fetch(`https://api.github.com/search/repositories?q=${encode(target)}&per_page=6`, {headers:{Accept:'application/vnd.github+json'}});
      if (!r.ok) throw new Error('GitHub public API unavailable');
      const j = await r.json();
      box.innerHTML = `<div class="uz-result"><div class="uz-result-title">GITHUB PUBLIC RESULTS: ${j.total_count ?? 0}</div>${(j.items || []).map(x => `<div class="uz-result-note"><b>${esc(x.full_name)}</b> · ${esc(x.description || 'No description')}<br><button class="uz-source" data-url="${esc(x.html_url)}">OPEN</button></div>`).join('')}</div>`;
      box.querySelectorAll('.uz-source').forEach(b=>b.addEventListener('click',()=>open(b.dataset.url)));
    } catch(e) { renderSources('github', target); }
  }

  async function nasaLookup(target, box) {
    const url = `https://images-api.nasa.gov/search?q=${encode(target)}&media_type=image&page_size=6`;
    try {
      const r = await fetch(url); if (!r.ok) throw new Error('NASA unavailable'); const j = await r.json();
      const items = j.collection?.items || [];
      box.innerHTML = `<div class="uz-result"><div class="uz-result-title">NASA PUBLIC IMAGERY: ${items.length}</div>${items.map(x=>{const d=x.data?.[0]||{}; const link=x.links?.[0]?.href||''; return `<div class="uz-result-note"><b>${esc(d.title || 'NASA image')}</b><br>${esc(d.description || '').slice(0,180)}<br><button class="uz-source" data-image="${esc(link)}" data-url="${esc(link)}">VIEW</button></div>`}).join('')}</div>`;
      box.querySelectorAll('.uz-source').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.image) showImage(b.dataset.image,'NASA PUBLIC IMAGE'); open(b.dataset.url); }));
    } catch(e) { renderSources(selected, target); }
  }

  async function mapLookup(target, box) {
    try {
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encode(target)}`,{headers:{Accept:'application/json'}}); if(!r.ok) throw new Error(); const j=await r.json();
      box.innerHTML=`<div class="uz-result"><div class="uz-result-title">OPENSTREETMAP / NOMINATIM: ${j.length}</div>${j.map(x=>`<div class="uz-result-note"><b>${esc(x.display_name)}</b><br>LAT ${esc(x.lat)} · LON ${esc(x.lon)}<br><button class="uz-source" data-url="https://www.openstreetmap.org/?mlat=${esc(x.lat)}&mlon=${esc(x.lon)}#map=16/${esc(x.lat)}/${esc(x.lon)}">MAP</button></div>`).join('')}</div>`;
      box.querySelectorAll('.uz-source').forEach(b=>b.addEventListener('click',()=>open(b.dataset.url)));
    } catch(e){renderSources('maps',target)}
  }

  async function gdeltLookup(target, box) {
    try { const r=await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encode(target)}&mode=ArtList&maxrecords=8&format=json`); if(!r.ok) throw new Error(); const j=await r.json(); const a=j.articles||[]; box.innerHTML=`<div class="uz-result"><div class="uz-result-title">GDELT PUBLIC NEWS: ${a.length}</div>${a.map(x=>`<div class="uz-result-note"><b>${esc(x.title)}</b><br>${esc(x.domain||'')} · ${esc(x.seendate||'')}<br><button class="uz-source" data-url="${esc(x.url)}">OPEN</button></div>`).join('')}</div>`; box.querySelectorAll('.uz-source').forEach(b=>b.addEventListener('click',()=>open(b.dataset.url))); } catch(e){renderSources('news',target)}
  }

  function showImage(url, title) {
    const box=document.getElementById('uz-camera'); if(!box || !url) return;
    box.innerHTML=`<div class="uz-camera-head">${esc(title || 'PUBLIC IMAGE')}</div><img src="${esc(url)}" alt="Public-source image" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'uz-camera-empty',textContent:'IMAGE FEED UNAVAILABLE'}))">`;
  }

  function openEnv(){ build(); const root=document.getElementById(ID); if(root) root.style.display='block'; document.body.dataset.jarvisEnvironment='ULTRON'; }
  function close(){ const root=document.getElementById(ID); if(root){root.remove();} if(document.body.dataset.jarvisEnvironment==='ULTRON') delete document.body.dataset.jarvisEnvironment; }

  window.ULTRON = { version: VERSION, open: openEnv, close, categories: CATEGORIES.map(x=>x[0]) };
})();
