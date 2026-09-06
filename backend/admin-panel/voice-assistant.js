/* ==========================================================================
   KORRAZ VOICE CONCIERGE — per-field edition (English + Hindi)
   Lets an admin fill any single field of the product form by speaking,
   in English or Hindi, instead of (or in addition to) typing. Every field
   gets its own small mic button right inside the field — no floating
   button, no popup modal. Uses the browser's built-in Web Speech API
   (Chrome / Edge) — no server or API key needed.

   Usage (see product-form.html):
     KorrazVoice.initFieldVoice(form);              // wires up the standard fields
     KorrazVoice.attachFieldMic(someInput, { type: 'text' });
     KorrazVoice.triggerMic(form.title);             // programmatically start listening
     KorrazVoice.mountLanguageToggle(containerEl);   // English / Hindi switch, shared by all mics

   `type` controls how the spoken words are turned into the field's value:
     'text'          -> spoken words, as-is (default)
     'slug'          -> lowercased, spaces turned into hyphens
     'price'         -> "two thousand five hundred" / "दो हज़ार पांच सौ" / "₹2500" -> 2500
     'select-yesno'  -> "live / show / yes / हां / दिखाओ" -> true, "hidden / hide / no / नहीं" -> false
   ========================================================================== */
(function () {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LANG_STORAGE_KEY = 'korrazVoiceLang';

  /* ---------- shared voice language, used by every mic button on the page ---------- */
  let currentLang = 'en-IN';
  try {
    const saved = window.localStorage && window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en-IN' || saved === 'hi-IN') currentLang = saved;
  } catch (_) {}

  function setLanguage(lang) {
    currentLang = lang;
    try { window.localStorage && window.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (_) {}
  }
  function getLanguage() { return currentLang; }

  /* ---------- spoken-number understanding — English + Hindi (Devanagari) ---------- */
  const EN_NUM_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const EN_SCALE_WORDS = { hundred: 100, thousand: 1000, lakh: 100000, lac: 100000 };

  // Common spoken Hindi number words (Devanagari). Covers the everyday spoken
  // patterns used for prices ("दो हज़ार पांच सौ", "पचास हज़ार", etc.)
  const HI_NUM_WORDS = {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
    'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16,
    'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'तीस': 30, 'चालीस': 40,
    'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  };
  const HI_SCALE_WORDS = { 'सौ': 100, 'हज़ार': 1000, 'हजार': 1000, 'लाख': 100000 };

  // Devanagari digit characters ०-९ -> 0-9
  const HI_DIGITS = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };

  function normalizeDevanagariDigits(text) {
    return text.replace(/[०-९]/g, (d) => HI_DIGITS[d] || d);
  }

  function wordsToNumber(rawText) {
    const text = normalizeDevanagariDigits(rawText);
    const words = text
      .toLowerCase()
      .replace(/[,،]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    let total = 0, current = 0, found = false;
    for (let w of words) {
      const enNum = EN_NUM_WORDS[w];
      const enScale = EN_SCALE_WORDS[w];
      const hiNum = HI_NUM_WORDS[w];
      const hiScale = HI_SCALE_WORDS[w];
      if (enNum !== undefined || hiNum !== undefined) {
        current += (enNum !== undefined ? enNum : hiNum);
        found = true;
      } else if (enScale !== undefined || hiScale !== undefined) {
        const mult = enScale !== undefined ? enScale : hiScale;
        current = (current || 1) * mult;
        if (mult >= 1000) { total += current; current = 0; }
        found = true;
      } else if (/^\d+$/.test(w)) {
        current += parseInt(w, 10);
        found = true;
      }
    }
    total += current;
    return found ? total : null;
  }

  function extractPrice(segment) {
    if (!segment) return null;
    let cleaned = normalizeDevanagariDigits(segment)
      .replace(/\b(rupees?|rs\.?|inr)\b/gi, '')
      .replace(/रुपय[ेा]|रुपए/g, '')
      .trim();
    const digitMatch = cleaned.match(/[\d][\d,]*/);
    if (digitMatch) {
      const n = parseInt(digitMatch[0].replace(/,/g, ''), 10);
      if (!isNaN(n)) return n;
    }
    return wordsToNumber(cleaned);
  }

  function toSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  function toYesNo(text) {
    const t = text.toLowerCase();
    const isNo = /\b(hidden|hide|not\s+live|no|inactive|off)\b/.test(t) || /नहीं|मत दिखाओ|छुपा|हाइड/.test(t);
    const isYes = /\b(live|show|shown|yes|active|visible|on)\b/.test(t) || /हां|हाँ|दिखाओ|लाइव/.test(t);
    if (isNo) return false;
    if (isYes) return true;
    return null;
  }

  /* ---------- mic icon ---------- */
  const MIC_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/></svg>';

  /* ---------- wraps a field with a small mic button and wires up recognition ---------- */
  const micRegistry = new WeakMap(); // input/select -> { button, trigger }

  function wrapWithMic(field) {
    if (field.closest('.field-with-mic')) return field.parentElement; // already wrapped
    const wrap = document.createElement('div');
    wrap.className = 'field-with-mic';
    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);
    return wrap;
  }

  function attachFieldMic(field, options) {
    if (!field || micRegistry.has(field)) return micRegistry.get(field) && micRegistry.get(field).button;
    options = options || {};
    const type = options.type || 'text';

    const wrap = wrapWithMic(field);
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'field-mic-btn';
    micBtn.setAttribute('aria-label', 'Speak this field');
    micBtn.title = 'Tap to speak this field';
    micBtn.innerHTML = MIC_ICON;
    wrap.appendChild(micBtn);

    if (!SpeechRecognitionImpl) {
      micBtn.disabled = true;
      micBtn.title = 'Voice input needs Chrome or Edge';
      micRegistry.set(field, { button: micBtn, trigger: function () {} });
      return micBtn;
    }

    let recognition = null;
    let listening = false;

    function flash(msg, isError) {
      const prevTitle = 'Tap to speak this field';
      micBtn.title = msg;
      if (isError) micBtn.classList.add('error');
      setTimeout(() => {
        micBtn.classList.remove('error');
        micBtn.title = prevTitle;
      }, 1800);
    }

    function applyTranscript(rawText) {
      const text = (rawText || '').trim();
      if (!text) { flash("Didn't catch that — try again", true); return; }

      if (type === 'price') {
        const val = extractPrice(text);
        if (val == null) { flash("Couldn't hear a number — try again", true); return; }
        field.value = val;
      } else if (type === 'slug') {
        field.value = toSlug(text);
      } else if (type === 'select-yesno') {
        const val = toYesNo(text);
        if (val == null) { flash('Say "live" or "hidden"', true); return; }
        field.value = String(val);
      } else {
        field.value = text.replace(/[.।]$/, '');
      }

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof options.onResult === 'function') options.onResult(field.value, field);
    }

    function stopListening() {
      if (recognition && listening) {
        try { recognition.abort(); } catch (_) {} // abort, don't wait for a graceful stop round-trip
      }
    }

    function startListening() {
      if (listening) return;
      let finalText = '';
      let interimText = '';
      let applied = false;
      let silenceTimer = null;
      // safe to preview raw words straight into these input types while still speaking
      const livePreview = (type === 'text' || type === 'slug');
      const originalValue = field.value;

      recognition = new SpeechRecognitionImpl();
      recognition.lang = currentLang; // shared EN/HI toggle, read fresh on every tap
      recognition.continuous = true;  // we decide when the admin is done, not the browser
      recognition.interimResults = true; // stream partial words in as the admin talks

      function scheduleFinish(delay) {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(finishUp, delay);
      }

      function finishUp() {
        if (applied) return;
        applied = true;
        clearTimeout(silenceTimer);
        stopListening();
        applyTranscript((finalText + interimText).trim());
      }

      recognition.onresult = (e) => {
        interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += chunk;
          else interimText += chunk;
        }
        const heardSoFar = (finalText + interimText).trim();

        if (livePreview) {
          // words land in the field itself, live, the instant they're heard
          field.value = heardSoFar || originalValue;
        } else if (heardSoFar) {
          // price / select fields can't preview raw words in the field —
          // show them on the button instead, so it never looks stuck
          micBtn.title = heardSoFar;
        }

        // a short pause after the last word = admin is done — apply right away
        // instead of waiting for the recognizer's own (slower) end-of-speech signal
        scheduleFinish(500);
      };
      recognition.onspeechend = () => {
        // the browser itself thinks speech has stopped — wrap up almost immediately
        scheduleFinish(120);
      };
      recognition.onerror = (e) => {
        listening = false;
        micBtn.classList.remove('listening');
        clearTimeout(silenceTimer);
        if (!applied) {
          flash(
            e.error === 'not-allowed' ? 'Microphone access denied'
            : e.error === 'no-speech' ? 'No speech detected'
            : e.error === 'language-not-supported' ? 'Try switching EN/HI'
            : 'Something went wrong',
            true
          );
        }
      };
      recognition.onend = () => {
        listening = false;
        micBtn.classList.remove('listening');
        clearTimeout(silenceTimer);
        if (!applied) {
          const heard = (finalText + interimText).trim();
          if (heard) { applied = true; applyTranscript(heard); }
          else flash("Didn't catch that — try again", true);
        }
      };

      // hard safety cap so a mic never listens forever if nothing fires
      scheduleFinish(9000);

      try {
        recognition.start();
        listening = true;
        micBtn.classList.add('listening');
        micBtn.title = 'Listening… tap to stop';
      } catch (err) {
        flash('Could not start microphone', true);
      }
    }

    micBtn.addEventListener('click', () => {
      if (listening) stopListening();
      else startListening();
    });

    micRegistry.set(field, { button: micBtn, trigger: startListening });
    return micBtn;
  }

  /* ---------- wires up the standard product-form fields by [name] ---------- */
  function initFieldVoice(form, fieldTypes) {
    const map = Object.assign(
      {
        title: 'text',
        slug: 'slug',
        code: 'text',
        category: 'text',
        subText: 'text',
        price: 'price',
        isActive: 'select-yesno',
      },
      fieldTypes || {}
    );
    Object.keys(map).forEach((name) => {
      const el = form.querySelector('[name="' + name + '"]');
      if (el) attachFieldMic(el, { type: map[name] });
    });
  }

  /* ---------- programmatically start listening on a given field ---------- */
  function triggerMic(field) {
    const entry = field && micRegistry.get(field);
    if (entry) entry.trigger();
  }

  /* ---------- small English / Hindi switch shared by every mic on the page ---------- */
  function mountLanguageToggle(container) {
    if (!container) return;
    container.innerHTML = '';
    container.className = (container.className ? container.className + ' ' : '') + 'voice-lang-toggle';

    const label = document.createElement('span');
    label.className = 'voice-lang-label';
    label.textContent = 'Voice language:';
    container.appendChild(label);

    const options = [
      { code: 'en-IN', label: 'English' },
      { code: 'hi-IN', label: 'हिंदी' },
    ];

    const buttons = options.map((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'voice-lang-btn';
      btn.textContent = opt.label;
      if (opt.code === currentLang) btn.classList.add('active');
      btn.addEventListener('click', () => {
        setLanguage(opt.code);
        buttons.forEach((b, i) => b.classList.toggle('active', options[i].code === opt.code));
      });
      container.appendChild(btn);
      return btn;
    });
  }

  window.KorrazVoice = {
    attachFieldMic,
    initFieldVoice,
    triggerMic,
    setLanguage,
    getLanguage,
    mountLanguageToggle,
  };
})();