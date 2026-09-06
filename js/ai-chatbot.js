/* =========================================================================
   Koraaz AI Assistant — free, on-page smart chatbot widget
   Self-contained: injects its own CSS + markup + logic. Just include this
   file with a single <script src="js/ai-chatbot.js" defer></script> tag.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- knowledge base ----------------------------- */
  var BRAND = {
    name: 'Koraaz',
    company: 'Korras Enterprises',
    tagline: 'Premium Brass Fitting',
    city: 'Goregaon (W), Mumbai',
    address: '42/336, Ground Floor, Unnat Nagar No.4, M. G. Road, Goregaon (W), Mumbai',
    phone: '+91 90246 55202',
    phoneHref: 'tel:+919024655202',
    waHref: 'https://wa.me/919024655202?text=Hi%2C%20I%27m%20interested%20in%20Koraaz%20brass%20hardware.',
    email: 'korrasenterprises@gmail.com',
    mailHref: 'mailto:korrasenterprises@gmail.com'
  };

  var CATEGORIES = [
    'Brass Tower Bolt', 'Alu T-Bolt', 'Key Hole Covers', 'Duck Hinges', 'SS Hinges',
    'Rod Latch', 'Flare Consil Rod Latch', 'SS Socket', 'SS Pane Lock', 'Brass Pane Lock',
    'Door Stopper', 'L Bat', 'Cam Bolt', 'Flare Knob', 'Folding Bracket', 'Bracket',
    'Orange Wheels Castor', 'Door Eye', 'SS L Bracket', 'Mirror Cap', 'Floor Magnet',
    'Table Chain', 'Rope Wire Chain', 'Mortise Handles'
  ];

  var FINISHES = ['SS', 'AB (Antique Brass)', 'Black', 'PVD Gold', 'PVD Rose Gold', 'CP'];

  /* Intents: each has trigger keywords (incl. common Hinglish variants) and a
     reply generator. Matching is a lightweight keyword-scoring model — no
     external API, no cost, fully instant. */
  var INTENTS = [
    {
      id: 'greeting',
      keywords: ['hi', 'hii', 'hiii', 'hello', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'good afternoon', 'yo'],
      reply: function () {
        return 'Namaste! 👋 I\'m the Koraaz AI Assistant. I can help with products, sizes &amp; finishes, pricing/bulk orders, delivery, or contact details — what would you like to know?';
      },
      chips: ['Browse products', 'Bulk order / pricing', 'Delivery info', 'Contact us']
    },
    {
      id: 'about',
      keywords: ['about', 'koraaz', 'korras', 'who are you', 'kaun ho', 'company', 'kya ho', 'what is this', 'kya hai yeh', 'brand'],
      reply: function () {
        return BRAND.name + ' is the door-hardware label of ' + BRAND.company + ', based in ' + BRAND.city + '. We supply full-brass mortise handles, key hole covers and architectural door hardware in premium finishes like PVD Gold and PVD Rose Gold, with pan-India delivery. Our stock is kept in-house, so lead times stay short even on bulk orders.';
      },
      chips: ['Browse products', 'Contact us']
    },
    {
      id: 'products',
      keywords: ['product', 'products', 'category', 'categories', 'catalogue', 'catalog', 'items', 'range', 'kya milta hai', 'kya kya hai', 'list'],
      reply: function () {
        var picks = CATEGORIES.slice(0, 8).join(', ');
        return 'We stock ' + CATEGORIES.length + '+ categories of brass &amp; SS door hardware — including ' + picks + ' and more. Each is available across multiple sizes and finishes (' + FINISHES.slice(0, 3).join(', ') + '…). You can browse the full catalogue on the Products page.';
      },
      chips: ['Tower bolts', 'Hinges', 'Knobs & handles', 'Locks & keyholes']
    },
    {
      id: 'tower_bolt',
      keywords: ['tower bolt', 'towerbolt', 'aldrop', 'sliding bolt'],
      reply: function () {
        return 'Brass Tower Bolts are available 4" to 48", in styles like Step Xylo, Mataka, Capsule, SQ Tower Bolt and Brass Marble — plus Alu T-Bolt variants (Xylo, Sylo, 10mm, 12mm). Want me to note down a size for a quote?';
      },
      chips: ['Get a quote', 'Contact us']
    },
    {
      id: 'hinges',
      keywords: ['hinge', 'hinges', 'duck hinge', 'ss hinge'],
      reply: function () {
        return 'We carry Duck Hinges (sizes from 3x19x19 up to 4x35x25, half/full) and SS Hinges (4x12, 5x12 in SS or Black). Let me know the door thickness and I can point you to the right size.';
      },
      chips: ['Get a quote', 'Contact us']
    },
    {
      id: 'knob_handle',
      keywords: ['knob', 'handle', 'mortise handle', 'door handle', 'flare knob'],
      reply: function () {
        return 'Our Flare Knob range (Plump, Moon, Bite, Impact, Bumpy, Bonbon, Berlin, Bull) comes in SS/AB/Black, PVD Gold and PVD Rose Gold — plus full-brass mortise handles, our signature line. Which finish are you leaning toward?';
      },
      chips: ['PVD Gold', 'PVD Rose Gold', 'SS / Black']
    },
    {
      id: 'lock_key',
      keywords: ['lock', 'key hole', 'keyhole', 'key', 'pane lock'],
      reply: function () {
        return 'Key Hole Covers come in styles like CY Sq Lock, CY Round, CY Mortise, Star Keyhole and more. We also stock SS &amp; Brass Pane Locks (19mm–75mm) and keys (L Type, PVC, Small).';
      },
      chips: ['Get a quote', 'Contact us']
    },
    {
      id: 'other_hardware',
      keywords: ['door stopper', 'stopper', 'bracket', 'l bat', 'cam bolt', 'folding bracket',
        'door eye', 'mirror cap', 'floor magnet', 'magnet', 'table chain', 'rope wire chain',
        'chain', 'castor', 'wheels', 'socket'],
      reply: function () {
        return 'Yes — we also stock Door Stoppers, L Bat, Cam Bolt, Folding &amp; SS L Brackets, Door Eye viewers, Mirror Caps, Floor Magnets, Table Chains, Rope Wire Chains and Castor Wheels, in matching brass/SS finishes. Tell me which one and I can help you get a quote.';
      },
      chips: ['Get a quote', 'Contact us']
    },
    {
      id: 'pricing',
      keywords: ['price', 'pricing', 'rate', 'cost', 'kitna', 'daam', 'quote', 'quotation', 'bulk', 'wholesale', 'moq', 'minimum order', 'project order'],
      reply: function () {
        return 'For pricing, bulk/project quotes or MOQ, the fastest route is WhatsApp — share the item, finish and quantity and we usually reply within a few hours. Tap below and I\'ll pre-fill the message for you.';
      },
      cta: { label: 'Chat on WhatsApp', href: BRAND.waHref }
    },
    {
      id: 'delivery',
      keywords: ['delivery', 'shipping', 'ship', 'deliver', 'pan india', 'courier', 'dispatch', 'lead time'],
      reply: function () {
        return 'We deliver pan-India from our Goregaon (Mumbai) stock. Since items are stocked (not ordered-in on demand), lead times stay short for both retail quantities and bulk project orders.';
      },
      chips: ['Bulk order / pricing', 'Contact us']
    },
    {
      id: 'contact',
      keywords: ['contact', 'phone', 'number', 'email', 'address', 'location', 'where are you', 'kaha ho', 'mumbai', 'reach'],
      reply: function () {
        return 'You can reach us at ' + BRAND.phone + ' (call or WhatsApp) or ' + BRAND.email + '. We\'re located at ' + BRAND.address + '.';
      },
      cta: { label: 'Chat on WhatsApp', href: BRAND.waHref }
    },
    {
      id: 'cart_wishlist',
      keywords: ['cart', 'wishlist', 'checkout', 'order', 'track order', 'my order'],
      reply: function () {
        return 'You can add items to your Cart or Wishlist right from any product card (the icons on each item). Once you\'re ready, submit your cart and our team will confirm pricing and availability with you directly — we keep it simple, no online payment needed.';
      },
      chips: ['Bulk order / pricing', 'Contact us']
    },
    {
      id: 'thanks',
      keywords: ['thanks', 'thank you', 'thankyou', 'shukriya', 'dhanyawad', 'ty'],
      reply: function () {
        return 'You\'re most welcome! 🙏 Anything else I can help you find?';
      },
      chips: ['Browse products', 'Contact us']
    },
    {
      id: 'bye',
      keywords: ['bye', 'goodbye', 'see you', 'ok bye', 'chalo bye'],
      reply: function () {
        return 'Take care! We\'re here anytime you need help with Koraaz hardware. 👋';
      }
    },
    {
      id: 'human',
      keywords: ['talk to someone', 'human', 'agent', 'representative', 'real person', 'call me'],
      reply: function () {
        return 'Of course — the quickest way to reach our team directly is WhatsApp or a call at ' + BRAND.phone + '.';
      },
      cta: { label: 'Chat on WhatsApp', href: BRAND.waHref }
    }
  ];

  var FALLBACKS = [
    'I want to get you the right answer — could you tell me a bit more, or pick one of the options below?',
    'I\'m not fully sure I caught that. Here are a few things I can help with right away:',
    'Let\'s narrow it down — are you looking for a product, pricing, or our contact details?'
  ];

  var DEFAULT_CHIPS = ['Browse products', 'Bulk order / pricing', 'Delivery info', 'Contact us'];

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* Word-boundary keyword matcher — plain substring search caused false
     positives ("hi" inside "hinges", "yo" inside "your", "list" inside
     "wishlist"). \b...\b matches only whole words/phrases, so this is
     fixed while still supporting multi-word phrases like "tower bolt". */
  function keywordHits(lower, kw) {
    var re = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'i');
    return re.test(lower);
  }

  function scoreIntent(text) {
    var lower = text.toLowerCase();
    var best = null, bestScore = 0;
    INTENTS.forEach(function (intent) {
      var score = 0;
      intent.keywords.forEach(function (kw) {
        if (keywordHits(lower, kw)) score += kw.length; // longer/more-specific phrase wins ties
      });
      if (score > bestScore) { bestScore = score; best = intent; }
    });
    return bestScore > 0 ? best : null;
  }

  function handleUserText(text) {
    var trimmed = text.trim();
    if (!trimmed) return null;
    var intent = scoreIntent(trimmed);
    if (intent) {
      return { text: intent.reply(), chips: intent.chips, cta: intent.cta };
    }
    var msg = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return { text: msg, chips: DEFAULT_CHIPS };
  }

  /* ----------------------------- styles ----------------------------- */
  var css = '\
  .kai-btn{position:fixed; right:32px; bottom:32px; z-index:70; width:52px; height:52px; border-radius:50%;\
    background:radial-gradient(circle at 32% 28%, #e4c987, var(--brass,#C9A24B) 55%, var(--brass-2,#a8843a));\
    border:1px solid rgba(255,255,255,0.35); display:flex; align-items:center; justify-content:center; cursor:pointer;\
    box-shadow:0 10px 26px rgba(201,162,75,.4); transition:transform .3s cubic-bezier(.2,.9,.25,1), box-shadow .3s ease;}\
  .kai-btn:hover{transform:scale(1.08) rotate(-4deg); box-shadow:0 14px 32px rgba(201,162,75,.55);}\
  .kai-btn:active{transform:scale(.92);}\
  .kai-btn svg{width:26px; height:26px; position:relative; z-index:2; color:#18140b;}\
  .kai-ring{position:absolute; inset:-5px; border-radius:50%; border:1.5px dashed rgba(201,162,75,.65); animation:kai-spin 9s linear infinite;}\
  .kai-orbit{position:absolute; inset:-5px; border-radius:50%; pointer-events:none;}\
  .kai-orbit::before{content:\'\'; position:absolute; top:-2px; left:50%; width:6px; height:6px; margin-left:-3px; border-radius:50%; background:#fff; box-shadow:0 0 8px 2px rgba(255,255,255,.85); animation:kai-spin 3.6s linear infinite;}\
  .kai-dot{position:absolute; top:2px; right:2px; width:12px; height:12px; border-radius:50%; background:#3ddc84; border:2px solid var(--ink,#101216); z-index:3; animation:kai-blink 2.4s ease-in-out infinite;}\
  @keyframes kai-spin{from{transform:rotate(0deg);} to{transform:rotate(360deg);}}\
  @keyframes kai-blink{0%,100%{opacity:1;} 50%{opacity:.35;}}\
  @keyframes kai-bob{0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);}}\
  .kai-btn.kai-idle{animation:kai-bob 3.4s ease-in-out infinite;}\
  .kai-teaser{position:fixed; right:92px; bottom:40px; z-index:69; max-width:200px; background:var(--panel,#191c22); color:var(--bone,#EEEBE3);\
    border:1px solid rgba(255,255,255,0.12); border-radius:14px 14px 4px 14px; padding:10px 14px; font-family:Inter,sans-serif; font-size:0.8rem;\
    line-height:1.35; box-shadow:0 12px 30px rgba(0,0,0,.35); opacity:0; transform:translateY(8px) scale(.96); pointer-events:none; transition:all .4s cubic-bezier(.2,.9,.25,1);}\
  .kai-teaser.show{opacity:1; transform:translateY(0) scale(1); pointer-events:auto;}\
  .kai-panel{position:fixed; right:32px; bottom:98px; z-index:75; width:360px; max-width:calc(100vw - 40px); height:520px; max-height:calc(100vh - 140px);\
    background:var(--ink,#101216); border:1px solid rgba(255,255,255,0.1); border-radius:20px; display:flex; flex-direction:column; overflow:hidden;\
    box-shadow:0 24px 60px rgba(0,0,0,.55); opacity:0; transform:translateY(24px) scale(.94); pointer-events:none; transition:all .35s cubic-bezier(.2,.9,.25,1); transform-origin:bottom right;}\
  .kai-panel.open{opacity:1; transform:translateY(0) scale(1); pointer-events:auto;}\
  .kai-head{display:flex; align-items:center; gap:12px; padding:16px 16px; background:linear-gradient(120deg, var(--brass-2,#a8843a), var(--brass,#C9A24B) 60%, var(--brass-2,#a8843a)); background-size:200% 100%; animation:kai-shimmer 6s linear infinite; flex-shrink:0;}\
  @keyframes kai-shimmer{0%{background-position:0% 0;} 100%{background-position:200% 0;}}\
  .kai-head-avatar{width:38px; height:38px; border-radius:50%; background:rgba(16,18,22,.9); display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative;}\
  .kai-head-avatar svg{width:20px; height:20px; color:var(--brass,#C9A24B);}\
  .kai-head-info{flex:1; min-width:0;}\
  .kai-head-info .n{font-family:Inter,sans-serif; font-weight:800; font-size:0.92rem; color:#18140b; letter-spacing:.01em;}\
  .kai-head-info .s{font-family:Inter,sans-serif; font-size:0.72rem; color:#3a2f16; display:flex; align-items:center; gap:5px; margin-top:2px;}\
  .kai-head-info .s i{width:7px; height:7px; border-radius:50%; background:#1f7a3f; display:inline-block; animation:kai-blink 2s ease-in-out infinite;}\
  .kai-close{width:30px; height:30px; border-radius:50%; border:none; background:rgba(16,18,22,.18); color:#18140b; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:background .2s ease;}\
  .kai-close:hover{background:rgba(16,18,22,.32);}\
  .kai-close svg{width:15px; height:15px;}\
  .kai-body{flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:\
    radial-gradient(circle at 15% 8%, rgba(201,162,75,.06), transparent 40%), var(--ink,#101216);}\
  .kai-body::-webkit-scrollbar{width:6px;}\
  .kai-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12); border-radius:3px;}\
  .kai-row{display:flex; gap:8px; align-items:flex-end; max-width:100%;}\
  .kai-row.user{flex-direction:row-reverse;}\
  .kai-avatar-sm{width:24px; height:24px; border-radius:50%; background:var(--panel-2,#21252c); display:flex; align-items:center; justify-content:center; flex-shrink:0;}\
  .kai-avatar-sm svg{width:13px; height:13px; color:var(--brass,#C9A24B);}\
  .kai-bubble{max-width:76%; padding:10px 13px; border-radius:14px; font-family:Inter,sans-serif; font-size:0.84rem; line-height:1.5; word-wrap:break-word; opacity:0; transform:translateY(6px); animation:kai-pop .35s ease forwards;}\
  @keyframes kai-pop{to{opacity:1; transform:translateY(0);}}\
  .kai-row.bot .kai-bubble{background:var(--panel,#191c22); color:var(--bone,#EEEBE3); border:1px solid rgba(255,255,255,.07); border-bottom-left-radius:4px;}\
  .kai-row.user .kai-bubble{background:linear-gradient(135deg, var(--brass,#C9A24B), var(--brass-2,#a8843a)); color:#18140b; font-weight:600; border-bottom-right-radius:4px;}\
  .kai-typing{display:flex; gap:4px; padding:12px 14px; background:var(--panel,#191c22); border:1px solid rgba(255,255,255,.07); border-radius:14px; border-bottom-left-radius:4px; width:fit-content;}\
  .kai-typing span{width:6px; height:6px; border-radius:50%; background:var(--brass,#C9A24B); animation:kai-tbounce 1.2s ease-in-out infinite;}\
  .kai-typing span:nth-child(2){animation-delay:.15s;} .kai-typing span:nth-child(3){animation-delay:.3s;}\
  @keyframes kai-tbounce{0%,60%,100%{transform:translateY(0); opacity:.5;} 30%{transform:translateY(-5px); opacity:1;}}\
  .kai-chips{display:flex; flex-wrap:wrap; gap:7px; margin-top:2px; padding-left:32px;}\
  .kai-chip{border:1px solid rgba(201,162,75,.5); color:var(--brass,#C9A24B); background:rgba(201,162,75,.08); font-family:Inter,sans-serif; font-size:0.72rem; font-weight:600;\
    padding:6px 12px; border-radius:20px; cursor:pointer; transition:all .2s ease; white-space:nowrap;}\
  .kai-chip:hover{background:var(--brass,#C9A24B); color:#18140b;}\
  .kai-cta{display:inline-flex; align-items:center; gap:7px; margin-left:32px; margin-top:2px; background:#25D366; color:#0b3018; font-weight:700; font-size:0.78rem;\
    font-family:Inter,sans-serif; padding:8px 14px; border-radius:20px; text-decoration:none; width:fit-content; transition:transform .2s ease;}\
  .kai-cta:hover{transform:translateY(-2px);}\
  .kai-cta svg{width:14px; height:14px;}\
  .kai-input-row{display:flex; align-items:center; gap:8px; padding:12px; border-top:1px solid rgba(255,255,255,.08); background:var(--panel,#191c22); flex-shrink:0;}\
  .kai-input{flex:1; background:var(--ink,#101216); border:1px solid rgba(255,255,255,.1); border-radius:22px; padding:10px 16px; color:var(--bone,#EEEBE3);\
    font-family:Inter,sans-serif; font-size:0.84rem; outline:none; transition:border-color .2s ease;}\
  .kai-input:focus{border-color:var(--brass,#C9A24B);}\
  .kai-send{width:38px; height:38px; border-radius:50%; border:none; background:var(--brass,#C9A24B); color:#18140b; display:flex; align-items:center; justify-content:center;\
    cursor:pointer; flex-shrink:0; transition:transform .2s ease, background .2s ease;}\
  .kai-send:hover{background:var(--brass-2,#a8843a); transform:scale(1.06);}\
  .kai-send:active{transform:scale(.9);}\
  .kai-send svg{width:16px; height:16px;}\
  .kai-foot{text-align:center; font-family:Inter,sans-serif; font-size:0.64rem; color:var(--mute,#9BA1AA); padding:6px 0 10px; flex-shrink:0; letter-spacing:.03em;}\
  .kai-foot b{color:var(--brass,#C9A24B);}\
  @media(max-width:640px){\
    .kai-btn{right:16px; bottom:76px; width:42px; height:42px;} .kai-btn svg{width:21px; height:21px;}\
    .kai-teaser{right:66px; bottom:82px;}\
    .kai-panel{right:12px; left:12px; width:auto; bottom:126px; height:66vh;}\
  }\
  ';

  var styleTag = document.createElement('style');
  styleTag.setAttribute('data-kai', 'true');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  /* ----------------------------- markup ----------------------------- */
  var ICON_BOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.3" fill="currentColor" stroke="none"/><path d="M9 18h6"/><path d="M2 12h2M20 12h2"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.01 3C9.38 3 4 8.38 4 15.01c0 2.38.7 4.6 1.9 6.47L4 29l7.7-1.85a11.9 11.9 0 0 0 4.31.8h.01c6.63 0 12.01-5.38 12.01-12.01C28.03 8.38 22.65 3.01 16.01 3Z"/></svg>';

  var wrap = document.createElement('div');
  wrap.innerHTML = '\
    <button class="kai-btn kai-idle" id="kaiBtn" aria-label="Open AI Assistant">\
      <span class="kai-ring"></span>\
      <span class="kai-orbit"></span>\
      <span class="kai-dot"></span>\
      ' + ICON_BOT + '\
    </button>\
    <div class="kai-teaser" id="kaiTeaser">Need help? Ask our free AI assistant anything 🤖</div>\
    <div class="kai-panel" id="kaiPanel" role="dialog" aria-label="Koraaz AI Assistant">\
      <div class="kai-head">\
        <div class="kai-head-avatar">' + ICON_BOT + '</div>\
        <div class="kai-head-info">\
          <div class="n">Koraaz AI Assistant</div>\
          <div class="s"><i></i>Online · Instant replies</div>\
        </div>\
        <button class="kai-close" id="kaiClose" aria-label="Close chat">' + ICON_CLOSE + '</button>\
      </div>\
      <div class="kai-body" id="kaiBody"></div>\
      <div class="kai-input-row">\
        <input class="kai-input" id="kaiInput" type="text" placeholder="Ask about products, pricing, delivery…" autocomplete="off" />\
        <button class="kai-send" id="kaiSend" aria-label="Send">' + ICON_SEND + '</button>\
      </div>\
      <div class="kai-foot">Free <b>AI</b> Assistant · Powered by Koraaz</div>\
    </div>\
  ';
  var booted = false;
  function boot() {
    if (booted) return; // guard against double-init (was firing twice: once via the
    booted = true;      // readyState check, once via DOMContentLoaded — each click
    document.body.appendChild(wrap); // then hit two listeners that opened+closed instantly)
    initChatbot();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function initChatbot() {
    var btn = document.getElementById('kaiBtn');
    var panel = document.getElementById('kaiPanel');
    var closeBtn = document.getElementById('kaiClose');
    var body = document.getElementById('kaiBody');
    var input = document.getElementById('kaiInput');
    var sendBtn = document.getElementById('kaiSend');
    var teaser = document.getElementById('kaiTeaser');
    var opened = false;

    function scrollBottom() { body.scrollTop = body.scrollHeight; }

    function addMessage(role, text, opts) {
      opts = opts || {};
      var row = document.createElement('div');
      row.className = 'kai-row ' + role;
      var avatar = role === 'bot' ? '<div class="kai-avatar-sm">' + ICON_BOT + '</div>' : '';
      row.innerHTML = avatar + '<div class="kai-bubble">' + text + '</div>';
      body.appendChild(row);

      if (opts.chips && opts.chips.length) {
        var chipWrap = document.createElement('div');
        chipWrap.className = 'kai-chips';
        opts.chips.forEach(function (c) {
          var chip = document.createElement('button');
          chip.className = 'kai-chip';
          chip.type = 'button';
          chip.textContent = c;
          chip.addEventListener('click', function () { sendUserMessage(c); });
          chipWrap.appendChild(chip);
        });
        body.appendChild(chipWrap);
      }
      if (opts.cta) {
        var a = document.createElement('a');
        a.className = 'kai-cta';
        a.href = opts.cta.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = ICON_WA + '<span>' + opts.cta.label + '</span>';
        body.appendChild(a);
      }
      scrollBottom();
    }

    function showTyping() {
      var row = document.createElement('div');
      row.className = 'kai-row bot';
      row.id = 'kaiTypingRow';
      row.innerHTML = '<div class="kai-avatar-sm">' + ICON_BOT + '</div><div class="kai-typing"><span></span><span></span><span></span></div>';
      body.appendChild(row);
      scrollBottom();
    }
    function hideTyping() {
      var el = document.getElementById('kaiTypingRow');
      if (el) el.remove();
    }

    function botReply(userText) {
      showTyping();
      // Kept short and capped so replies always feel instant, with just enough
      // delay for the typing indicator to read as natural rather than instantaneous-jarring.
      var delay = 280 + Math.min(420, userText.length * 8);
      setTimeout(function () {
        hideTyping();
        var res = handleUserText(userText);
        addMessage('bot', res.text, { chips: res.chips, cta: res.cta });
      }, delay);
    }

    function sendUserMessage(text) {
      if (!text.trim()) return;
      addMessage('user', escapeHtml(text));
      input.value = '';
      botReply(text);
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function openPanel() {
      panel.classList.add('open');
      btn.classList.remove('kai-idle');
      teaser.classList.remove('show');
      opened = true;
      if (!body.childElementCount) {
        showTyping();
        setTimeout(function () {
          hideTyping();
          addMessage('bot', 'Namaste! 👋 I\'m the <b>Koraaz AI Assistant</b> — ask me about products, sizes, finishes, pricing, delivery or anything else. I reply instantly!', { chips: DEFAULT_CHIPS });
        }, 550);
      }
      setTimeout(function () { input.focus(); }, 300);
    }
    function closePanel() {
      panel.classList.remove('open');
    }

    btn.addEventListener('click', function () {
      if (panel.classList.contains('open')) closePanel(); else openPanel();
    });
    closeBtn.addEventListener('click', closePanel);
    sendBtn.addEventListener('click', function () { sendUserMessage(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendUserMessage(input.value); }
    });
    document.addEventListener('click', function (e) {
      if (opened && panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
        closePanel();
      }
    });

    // friendly teaser bubble a few seconds after page load, once per session
    if (!sessionStorage.getItem('kaiTeaserShown')) {
      setTimeout(function () {
        if (!panel.classList.contains('open')) {
          teaser.classList.add('show');
          sessionStorage.setItem('kaiTeaserShown', '1');
          setTimeout(function () { teaser.classList.remove('show'); }, 6000);
        }
      }, 3500);
    }
  }
})();