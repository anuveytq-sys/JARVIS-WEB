/* ULTRON ENHANCEMENT // PUBLIC INTELLIGENCE ONLY
   Adds a richer 3D HUD and additional public-data intelligence routes.
   Deliberately excludes private/stolen records, credential dumps, password data,
   private-camera discovery, or instructions for obtaining non-public data.
*/
(() => {
  'use strict';
  const VERSION='ultron-enhancement-20261024a';
  const EXTRA=[
    ['COMPANY','Public company footprint','OpenCorporates · Wikidata','https://opencorporates.com/companies?q=','https://www.wikidata.org/w/index.php?search='],
    ['CERTIFICATES','TLS / certificate history','crt.sh · Certificate Transparency','https://crt.sh/?q=','https://search.censys.io/'],
    ['ARCHIVES','Web history','Internet Archive · Wayback','https://web.archive.org/web/*/','https://arquivo.pt/wayback/cdx?url='],
    ['IMAGE FORENSICS','Image metadata / provenance','ExifTool · Content Credentials','https://exif.tools/','https://contentcredentials.org/'],
    ['REVERSE IMAGE','Public image origin','Google Images · TinEye · Bing Visual Search','https://images.google.com/','https://tineye.com/'],
    ['GEOVISUAL','Public geolocation research','OpenStreetMap · GeoHints · SunCalc','https://www.openstreetmap.org/search?query=','https://geohints.com/'],
    ['DOCUMENTS','Public documents','Internet Archive · Wikidata','https://archive.org/search?query=','https://www.wikidata.org/w/index.php?search='],
    ['MARITIME','Public vessel information','MarineTraffic · VesselFinder','https://www.marinetraffic.com/','https://www.vesselfinder.com/'],
    ['WEATHER','Weather / hazards','NOAA · Open-Meteo','https://www.noaa.gov/','https://open-meteo.com/'],
    ['EARTH OBSERVATION','Open Earth imagery','NASA Worldview · USGS · Copernicus','https://worldview.earthdata.nasa.gov/','https://earthexplorer.usgs.gov/'],
    ['AVIATION','Public aircraft data','OpenSky · ADSB.lol','https://opensky-network.org/','https://adsb.lol/'],
    ['SATELLITE TRACKING','Public orbital data','CelesTrak · N2YO','https://celestrak.org/','https://www.n2yo.com/'],
    ['PUBLIC INFRASTRUCTURE','Open map infrastructure','OSM · Overpass Turbo','https://www.openstreetmap.org/','https://overpass-turbo.eu/'],
    ['NEWS MONITOR','Public news intelligence','GDELT · Wikidata','https://www.gdeltproject.org/','https://www.wikidata.org/'],
    ['SECURITY EXPOSURE','Authorized exposure checks','OpenOSINT · OsintNET','https://openosint.tech/','https://www.osintnet.com/'],
    ['PUBLIC CAMERA FEEDS','Intentionally public imagery','EarthCam · Windy webcams','https://www.earthcam.com/','https://www.windy.com/-Webcams/webcams'],
    ['RESEARCH','Open research sources','Crossref · OpenAlex','https://search.crossref.org/','https://openalex.org/'],
    ['PUBLIC DATASETS','Open data discovery','Data.gov · EU Open Data','https://www.data.gov/','https://data.europa.eu/']
  ];
  const cssId='jarvis-ultron-enhancement-style', panelId='ultron-advanced-matrix';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q=v=>encodeURIComponent(String(v||'').trim());
  const open=u=>window.open(u,'_blank','noopener,noreferrer');
  function install(){
    if(document.getElementById(cssId))return;
    const s=document.createElement('style');s.id=cssId;s.textContent=`
      #jarvis-ultron-root::after{content:"";position:absolute;inset:46px 0 30px;pointer-events:none;background:radial-gradient(ellipse at center,transparent 0 35%,rgba(255,30,12,.025) 58%,rgba(0,0,0,.5) 100%);z-index:1}
      #jarvis-ultron-root .uz-orb{transform:translate(-50%,-50%) perspective(700px) rotateX(18deg) rotateY(-8deg);transform-style:preserve-3d}
      #jarvis-ultron-root .uz-ring{box-shadow:0 0 14px rgba(255,55,30,.12),inset 0 0 15px rgba(255,50,25,.08)}
      #jarvis-ultron-root .uz-ring.r2{border-width:2px;opacity:.65}#jarvis-ultron-root .uz-ring.r3{border-style:dotted;opacity:.8}
      #jarvis-ultron-root .uz-core-dot{width:48px;height:48px;transform:translateZ(22px);box-shadow:0 0 22px #ff3d25,0 0 80px rgba(255,45,20,.45)}
      #jarvis-ultron-root .uz-core-text{transform:translateZ(34px);font-size:32px}
      #${panelId}{position:absolute;inset:10px 10px 10px 10px;z-index:7;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
      #${panelId}.visible{pointer-events:auto}
      #${panelId} .uam-console{width:min(760px,78%);max-height:38%;border:1px solid rgba(255,70,45,.32);background:linear-gradient(145deg,rgba(25,5,7,.91),rgba(3,4,8,.94));box-shadow:0 0 50px rgba(255,30,15,.10),inset 0 0 35px rgba(255,40,20,.035);backdrop-filter:blur(14px);border-radius:7px;overflow:hidden}
      #${panelId} .uam-head{height:28px;padding:8px 10px;font-size:6px;letter-spacing:1.5px;color:#d68177;border-bottom:1px solid rgba(255,70,45,.18);display:flex;justify-content:space-between}
      #${panelId} .uam-grid{padding:7px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;overflow:auto;max-height:calc(38vh - 28px);scrollbar-width:thin;scrollbar-color:rgba(255,70,45,.5) transparent}
      #${panelId} .uam-card{min-height:44px;text-align:left;border:1px solid rgba(255,70,45,.18);background:linear-gradient(135deg,rgba(110,20,10,.18),rgba(5,5,9,.35));color:#f3d5d0;border-radius:4px;padding:6px;cursor:pointer;transition:.15s transform,.15s border-color,.15s box-shadow;position:relative;overflow:hidden}
      #${panelId} .uam-card::before{content:"";position:absolute;inset:-30px;transform:rotate(25deg);background:linear-gradient(90deg,transparent,rgba(255,100,70,.08),transparent);animation:uamscan 4s linear infinite}
      #${panelId} .uam-card:hover{transform:translateY(-2px) scale(1.01);border-color:rgba(255,90,65,.65);box-shadow:0 0 16px rgba(255,45,25,.13)}
      #${panelId} b{position:relative;display:block;font-size:6px;letter-spacing:.8px}#${panelId} small{position:relative;display:block;font-size:5px;color:#8b6a65;line-height:1.3;margin-top:3px}
      #${panelId} .uam-detail{position:absolute;right:0;top:0;width:min(330px,42%);height:100%;transform:translateX(105%);transition:transform .18s ease;background:rgba(4,4,8,.97);border-left:1px solid rgba(255,70,45,.25);padding:10px;overflow:auto;box-shadow:-20px 0 45px rgba(0,0,0,.4)}
      #${panelId}.detail-open .uam-detail{transform:translateX(0)}
      #${panelId} .uam-detail h3{font-size:8px;color:#ffb2a7;margin:0 0 7px}.uam-link{display:block;width:100%;margin:4px 0;padding:7px;border:1px solid rgba(255,70,45,.2);background:rgba(80,12,8,.18);color:#e7aaa0;text-align:left;border-radius:3px;cursor:pointer;font-size:6px}
      #${panelId} .uam-close{position:absolute;right:7px;top:5px;border:0;background:none;color:#a86c64;font-size:15px;cursor:pointer}
      @keyframes uamscan{0%{left:-120%}100%{left:120%}}
      @media(max-width:800px){#${panelId} .uam-console{width:96%;max-height:45%}#${panelId} .uam-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:calc(45vh - 28px)}}
    `;document.head.appendChild(s);
  }
  function build(){
    if(!window.ULTRON||!document.getElementById('jarvis-ultron-root'))return false;
    install();
    if(document.getElementById(panelId))return true;
    const root=document.getElementById('jarvis-ultron-root');
    const p=document.createElement('div');p.id=panelId;
    p.innerHTML=`<div class="uam-console"><div class="uam-head"><span>ULTRON // ADVANCED PUBLIC INTELLIGENCE MATRIX</span><span>${VERSION}</span></div><div class="uam-grid"></div></div><div class="uam-detail"><button class="uam-close">×</button><h3>PUBLIC-SOURCE ROUTES</h3><div class="uam-detail-body"></div></div>`;
    root.querySelector('.uz-core').appendChild(p);
    const grid=p.querySelector('.uam-grid');
    EXTRA.forEach((x,i)=>{const b=document.createElement('button');b.className='uam-card';b.type='button';b.innerHTML=`<b>${String(i+1).padStart(2,'0')} · ${esc(x[0])}</b><small>${esc(x[1])}</small>`;b.addEventListener('click',()=>showDetail(x));grid.appendChild(b)});
    p.querySelector('.uam-close').addEventListener('click',()=>p.classList.remove('detail-open'));
    return true;
  }
  function showDetail(x){
    const p=document.getElementById(panelId);if(!p)return;
    p.querySelector('.uam-detail-body').innerHTML=`<div style="font-size:6px;color:#80615c;margin-bottom:8px">${esc(x[1])}<br>${esc(x[2])}</div><input id="uam-query" placeholder="Optional public query" style="width:100%;padding:7px;background:#050609;border:1px solid rgba(255,70,45,.25);color:#f0d8d3;font-size:6px;border-radius:3px;outline:none"><button class="uam-link" id="uam-a">OPEN SOURCE A</button><button class="uam-link" id="uam-b">OPEN SOURCE B</button><div style="font-size:5px;color:#634944;line-height:1.4;margin-top:8px">ULTRON routes to public/open sources. It does not retrieve private records, stolen datasets, passwords, or confidential surveillance.</div>`;
    const input=p.querySelector('#uam-query');p.querySelector('#uam-a').onclick=()=>open(x[3]+q(input.value));p.querySelector('#uam-b').onclick=()=>open(x[4]+q(input.value));p.classList.add('detail-open');
  }
  function start(){let n=0;const t=setInterval(()=>{n++;if(build()||n>100)clearInterval(t)},100)}
  window.ULTRON_ENHANCEMENT={version:VERSION,start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
