/* JARVIS universal service intent router.
   Adds flexible text/voice command variations without modifying wake-word or microphone code.
   Existing integrations continue handling commands this router does not recognize. */
(() => {
  "use strict";
  if (window.__JARVIS_UNIVERSAL_SERVICE_ROUTER__) return;
  window.__JARVIS_UNIVERSAL_SERVICE_ROUTER__ = true;

  const clean = value => String(value || "")
    .trim()
    .replace(/^(?:(?:hey|hello|hi|ok|okay)\\s+)?jarvis\\b[,: ]*/i, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\\s+/g, " ")
    .trim();

  // Well-known public web services. Opening a site does not imply account sign-in or API access.
  const sites = {
    "google maps":"https://maps.google.com/", maps:"https://maps.google.com/",
    "google drive":"https://drive.google.com/", drive:"https://drive.google.com/",
    "google calendar":"https://calendar.google.com/", calendar:"https://calendar.google.com/",
    "google translate":"https://translate.google.com/", translate:"https://translate.google.com/",
    "google photos":"https://photos.google.com/", photos:"https://photos.google.com/",
    "google docs":"https://docs.google.com/", docs:"https://docs.google.com/",
    "google sheets":"https://sheets.google.com/", sheets:"https://sheets.google.com/",
    "google slides":"https://slides.google.com/", slides:"https://slides.google.com/",
    "google meet":"https://meet.google.com/", meet:"https://meet.google.com/",
    "google classroom":"https://classroom.google.com/", classroom:"https://classroom.google.com/",
    "google forms":"https://forms.google.com/", forms:"https://forms.google.com/",
    "google news":"https://news.google.com/", "google earth":"https://earth.google.com/web/",
    google:"https://www.google.com/", gmail:"https://mail.google.com/",
    youtube:"https://www.youtube.com/", "youtube music":"https://music.youtube.com/",
    spotify:"https://open.spotify.com/", soundcloud:"https://soundcloud.com/",
    deezer:"https://www.deezer.com/", tidal:"https://tidal.com/", bandcamp:"https://bandcamp.com/",
    "apple music":"https://music.apple.com/", "amazon music":"https://music.amazon.com/",
    github:"https://github.com/", gitlab:"https://gitlab.com/", bitbucket:"https://bitbucket.org/",
    stackoverflow:"https://stackoverflow.com/", "stack overflow":"https://stackoverflow.com/",
    "stackoverflow jobs":"https://stackoverflow.com/jobs", codesandbox:"https://codesandbox.io/",
    codepen:"https://codepen.io/", replit:"https://replit.com/", glitch:"https://glitch.com/",
    vercel:"https://vercel.com/", netlify:"https://www.netlify.com/", render:"https://render.com/",
    "hugging face":"https://huggingface.co/", huggingface:"https://huggingface.co/",
    chatgpt:"https://chatgpt.com/", openai:"https://openai.com/", gemini:"https://gemini.google.com/",
    claude:"https://claude.ai/", perplexity:"https://www.perplexity.ai/",
    copilot:"https://copilot.microsoft.com/", poe:"https://poe.com/",
    "character ai":"https://character.ai/", "character.ai":"https://character.ai/",
    deepseek:"https://chat.deepseek.com/", mistral:"https://chat.mistral.ai/",
    grok:"https://grok.com/", "meta ai":"https://www.meta.ai/",
    wikipedia:"https://www.wikipedia.org/", britannica:"https://www.britannica.com/",
    reddit:"https://www.reddit.com/", quora:"https://www.quora.com/",
    medium:"https://medium.com/", substack:"https://substack.com/", devto:"https://dev.to/",
    "dev.to":"https://dev.to/", producthunt:"https://www.producthunt.com/",
    "product hunt":"https://www.producthunt.com/", hackernews:"https://news.ycombinator.com/",
    "hacker news":"https://news.ycombinator.com/",
    netflix:"https://www.netflix.com/", primevideo:"https://www.primevideo.com/",
    "prime video":"https://www.primevideo.com/", disneyplus:"https://www.disneyplus.com/",
    "disney plus":"https://www.disneyplus.com/", hotstar:"https://www.hotstar.com/",
    jiocinema:"https://www.jiocinema.com/", zee5:"https://www.zee5.com/",
    crunchyroll:"https://www.crunchyroll.com/", twitch:"https://www.twitch.tv/",
    kick:"https://kick.com/", imdb:"https://www.imdb.com/", letterboxd:"https://letterboxd.com/",
    discord:"https://discord.com/app/", slack:"https://slack.com/", telegram:"https://web.telegram.org/",
    whatsapp:"https://web.whatsapp.com/", signal:"https://signal.org/", messenger:"https://www.messenger.com/",
    zoom:"https://zoom.us/", teams:"https://teams.microsoft.com/", "microsoft teams":"https://teams.microsoft.com/",
    "microsoft outlook":"https://outlook.live.com/", outlook:"https://outlook.live.com/",
    yahoo:"https://www.yahoo.com/", "yahoo mail":"https://mail.yahoo.com/",
    protonmail:"https://proton.me/mail", "proton mail":"https://proton.me/mail",
    instagram:"https://www.instagram.com/", facebook:"https://www.facebook.com/",
    tiktok:"https://www.tiktok.com/", snapchat:"https://www.snapchat.com/",
    pinterest:"https://www.pinterest.com/", linkedin:"https://www.linkedin.com/",
    twitter:"https://x.com/", x:"https://x.com/", threads:"https://www.threads.net/",
    mastodon:"https://mastodon.social/", tumblr:"https://www.tumblr.com/",
    behance:"https://www.behance.net/", dribbble:"https://dribbble.com/",
    "artstation":"https://www.artstation.com/", flickr:"https://www.flickr.com/",
    canva:"https://www.canva.com/", figma:"https://www.figma.com/", miro:"https://miro.com/",
    notion:"https://www.notion.so/", trello:"https://trello.com/", asana:"https://asana.com/",
    clickup:"https://clickup.com/", monday:"https://monday.com/", jira:"https://www.atlassian.com/software/jira",
    evernote:"https://evernote.com/", todoist:"https://todoist.com/", calendly:"https://calendly.com/",
    dropbox:"https://www.dropbox.com/", onedrive:"https://onedrive.live.com/",
    "one drive":"https://onedrive.live.com/", "microsoft 365":"https://www.microsoft365.com/",
    office:"https://www.microsoft365.com/", amazon:"https://www.amazon.com/",
    "amazon india":"https://www.amazon.in/", ebay:"https://www.ebay.com/", etsy:"https://www.etsy.com/",
    walmart:"https://www.walmart.com/", flipkart:"https://www.flipkart.com/", meesho:"https://www.meesho.com/",
    myntra:"https://www.myntra.com/", ajio:"https://www.ajio.com/", aliexpress:"https://www.aliexpress.com/",
    booking:"https://www.booking.com/", airbnb:"https://www.airbnb.com/", tripadvisor:"https://www.tripadvisor.com/",
    makemytrip:"https://www.makemytrip.com/", "make my trip":"https://www.makemytrip.com/",
    uber:"https://www.uber.com/", ola:"https://www.olacabs.com/", zomato:"https://www.zomato.com/",
    swiggy:"https://www.swiggy.com/", mapsy:"https://maps.google.com/",
    coursera:"https://www.coursera.org/", udemy:"https://www.udemy.com/", edx:"https://www.edx.org/",
    khanacademy:"https://www.khanacademy.org/", "khan academy":"https://www.khanacademy.org/",
    duolingo:"https://www.duolingo.com/", wolframalpha:"https://www.wolframalpha.com/",
    "wolfram alpha":"https://www.wolframalpha.com/", chess:"https://www.chess.com/",
    lichess:"https://lichess.org/", roblox:"https://www.roblox.com/", minecraft:"https://www.minecraft.net/",
    steam:"https://store.steampowered.com/", epicgames:"https://store.epicgames.com/",
    "epic games":"https://store.epicgames.com/", playstation:"https://www.playstation.com/",
    xbox:"https://www.xbox.com/", nintendo:"https://www.nintendo.com/",
    "weather":"https://weather.com/", accuweather:"https://www.accuweather.com/",
    "yahoo finance":"https://finance.yahoo.com/", tradingview:"https://www.tradingview.com/",
    coinbase:"https://www.coinbase.com/", binance:"https://www.binance.com/",
    "google flights":"https://www.google.com/travel/flights", flights:"https://www.google.com/travel/flights"
  };

  const aliases = {
    "music":"spotify", "play music":"spotify", "video":"youtube", "videos":"youtube",
    "mail":"gmail", "email":"gmail", "search engine":"google", "web search":"google",
    "ai":"chatgpt", "artificial intelligence":"chatgpt", "ai assistant":"chatgpt",
    "code repository":"github", "source code":"github", "social media":"instagram",
    "short videos":"tiktok", "professional network":"linkedin", "video meeting":"zoom",
    "video calls":"zoom", "online shopping":"amazon", "shopping":"amazon",
    "movies":"netflix", "movie streaming":"netflix", "anime":"crunchyroll",
    "design":"canva", "whiteboard":"miro", "notes":"notion", "tasks":"todoist",
    "cloud storage":"drive", "file storage":"dropbox", "maps app":"maps",
    "directions":"maps", "translation":"translate", "learning":"coursera",
    "online courses":"coursera", "programming":"github", "coding":"github"
  };

  function githubIntent(text) {
    const normalized = text.replace(/\\b(?:on|in)\\s+(?:git\\s*hub|github)\\b/gi, "")
      .replace(/\\b(?:please|for me|now|could you|can you|would you)\\b/gi, "").trim();
    const api = window.JARVISGitHubAccess;
    if (api && typeof api.parseCommand === "function") {
      const parsed = api.parseCommand(normalized);
      if (parsed) return parsed;
    }
    let m = normalized.match(/^(?:(?:please )?(?:open|find|search|show|look up|go to|visit|launch)\\s+)?(?:the\\s+)?(.+?)\\s+(?:repository|repositories|repo|repos)$/i);
    if (m) return { url: "https://github.com/search?q=" + encodeURIComponent(m[1].trim()) + "&type=repositories", label: "GitHub repository search for " + m[1].trim() };
    m = normalized.match(/^(?:search|find|look up)\\s+(.+)$/i);
    if (m) return { url: "https://github.com/search?q=" + encodeURIComponent(m[1].trim()), label: "GitHub search for " + m[1].trim() };
    return null;
  }

  const escapeRegex = s => s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const allNames = [...new Set([...Object.keys(sites), ...Object.keys(aliases)])].sort((a,b)=>b.length-a.length);

  function classify(raw) {
    const text = clean(raw);
    if (!text) return null;
    const lower = text.toLowerCase();
    const githubRelated = /\\bgithub\\b|\\b(?:repositories|repository|repos|repo|pull requests|issues|commits|discussions|username|user account)\\b/i.test(text);
    if (githubRelated) {
      const gh = githubIntent(text);
      if (gh) return gh;
      if (/\\b(?:repository|repositories|repo|repos)\\b/i.test(text)) {
        const term = text.replace(/\\b(?:please|can you|could you|would you|search|find|show|open|look up|on github|in github|the|repository|repositories|repo|repos)\\b/gi, "").trim();
        if (term) return { url: "https://github.com/search?q=" + encodeURIComponent(term) + "&type=repositories", label: "GitHub repository search for " + term };
      }
    }

    // Resolve aliases and common names; longest names first to avoid partial matches.
    let found = null;
    for (const name of allNames) {
      const re = new RegExp("(^|\\\\b)" + escapeRegex(name) + "($|\\\\b)", "i");
      if (re.test(lower)) { found = name; break; }
    }
    if (!found) return null;
    const target = aliases[found] || found;
    const url = sites[target] || sites[found];
    if (!url) return null;

    const normalized = lower
      .replace(/^(?:jarvis[,: ]*)?/i, "")
      .replace(/\\b(?:please|for me|right now|now|thanks|thank you|could you|can you|would you|will you|hey|open up|open|launch|start|visit|load|go to|take me to|show me|bring up|navigate to|access|enter|website|web site|site|app|application|platform|service|homepage|home page|the|my)\\b/gi, " ")
      .replace(/\\s+/g, " ").trim();
    const bare = normalized === found || normalized === target || normalized === (target === "maps" ? "google maps" : target);
    const action = /\\b(open|launch|start|visit|load|go to|take me to|show me|bring up|navigate to|access|enter|head to|switch to)\\b/i.test(lower);
    const serviceMention = new RegExp("(^|\\\\b)" + escapeRegex(found) + "($|\\\\b)", "i").test(lower);
    if (bare || (serviceMention && action)) return { url, label: target };

    // Search requests are sent to the selected service when that service supports a public search URL.
    const m = text.match(/^(?:(?:hey )?jarvis[, ]*)?(?:please )?(?:(?:can|could|would) you )?(?:search|find|look up|search for|look for)\\s+(.+?)\\s+(?:on|in|using)\\s+(.+?)$/i);
    if (m) {
      const term = m[1].trim();
      const serviceName = m[2].trim().toLowerCase();
      const searchUrls = {
        youtube: "https://www.youtube.com/results?search_query=",
        spotify: "https://open.spotify.com/search/",
        google: "https://www.google.com/search?q=",
        wikipedia: "https://en.wikipedia.org/w/index.php?search=",
        reddit: "https://www.reddit.com/search/?q=",
        tiktok: "https://www.tiktok.com/search?q=",
        pinterest: "https://www.pinterest.com/search/pins/?q=",
        amazon: "https://www.amazon.com/s?k=",
        "amazon india": "https://www.amazon.in/s?k=",
        github: "https://github.com/search?q=",
        linkedin: "https://www.linkedin.com/search/results/all/?keywords=",
        x: "https://x.com/search?q=",
        twitter: "https://x.com/search?q=",
        instagram: "https://www.instagram.com/explore/search/keyword/?q=",
        bing: "https://www.bing.com/search?q=",
        google: "https://www.google.com/search?q=",
        duckduckgo: "https://duckduckgo.com/?q="
      };
      const canonical = aliases[serviceName] || serviceName;
      if (searchUrls[serviceName] || searchUrls[canonical]) {
        const base = searchUrls[serviceName] || searchUrls[canonical];
        return { url: base + encodeURIComponent(term), label: serviceName + " search for " + term };
      }
    }
    return null;
  }

  function openItem(item) {
    const tab = window.open(item.url, "_blank");
    if (tab) { try { tab.opener = null; } catch (_) {} }
    else {
      let box = document.getElementById("jarvis-service-router-fallback");
      if (!box) {
        box = document.createElement("div");
        box.id = "jarvis-service-router-fallback";
        Object.assign(box.style, { position:"fixed", zIndex:"2147483647", left:"50%", bottom:"90px", transform:"translateX(-50%)", width:"min(90vw,540px)", padding:"14px", border:"1px solid #00d9ff", borderRadius:"12px", background:"rgba(2,12,28,.98)", color:"#d8fbff", font:"14px/1.45 system-ui,sans-serif" });
        document.body.appendChild(box);
      }
      box.replaceChildren();
      const p = document.createElement("p"); p.textContent = "Tap below to open " + item.label + ". Your browser blocked the new tab.";
      const a = document.createElement("a"); a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "OPEN " + item.label.toUpperCase();
      Object.assign(a.style, { display:"inline-block", padding:"10px 14px", border:"1px solid #00d9ff", borderRadius:"8px", color:"#d8fbff", textDecoration:"none", fontWeight:"700" });
      const close = document.createElement("button"); close.type = "button"; close.textContent = "CLOSE"; close.onclick = () => box.remove();
      box.append(p, a, close);
    }
    try {
      if (typeof window.showReply === "function") window.showReply("Opening " + item.label + ".", "reply");
      else if (typeof window.speak === "function") window.speak("Opening " + item.label + ".");
    } catch (_) {}
  }

  function handle(raw) {
    const item = classify(raw);
    if (!item) return false;
    openItem(item);
    return true;
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "commandForm") return;
    const field = document.getElementById("commandInput");
    if (!field || !handle(field.value)) return;
    event.preventDefault(); event.stopImmediatePropagation(); field.value = "";
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.target?.id !== "commandInput") return;
    const field = document.getElementById("commandInput");
    if (!field || !handle(field.value)) return;
    event.preventDefault(); event.stopImmediatePropagation(); field.value = "";
  }, true);

  const wrap = () => {
    if (typeof window.sendCommand !== "function" || window.sendCommand.__jarvisUniversalRouter) return false;
    const original = window.sendCommand.bind(window);
    const wrapped = async command => { if (handle(command)) return; return original(command); };
    wrapped.__jarvisUniversalRouter = true;
    window.sendCommand = wrapped;
    return true;
  };
  if (!wrap()) {
    let attempts = 0;
    const timer = window.setInterval(() => { attempts++; if (wrap() || attempts >= 30) window.clearInterval(timer); }, 100);
  }
  window.JARVISUniversalRouter = { classify };
})();
