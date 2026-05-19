/* ══════════════════════════════════════════════════════════
   IBlog — Podcast TTS Module (Web Speech API)
   Place in: js/podcast.js
   ══════════════════════════════════════════════════════════ */

IBlog.Podcast = (() => {

  let _utterance = null;
  let _speaking  = false;
  let _paused    = false;
  let _currentId = null;
  let _voicePref = 'female';
  let _voices    = [];

  const PLAY_SVG  = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

  /* ── Load voices async ────────────────────────────────── */
  function _loadVoices() {
    return new Promise(resolve => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) { _voices = v; resolve(_voices); return; }
      window.speechSynthesis.onvoiceschanged = () => {
        _voices = window.speechSynthesis.getVoices();
        resolve(_voices);
      };
      setTimeout(() => {
        _voices = window.speechSynthesis.getVoices() || [];
        resolve(_voices);
      }, 1200);
    });
  }

  /* ── Pick best voice ─────────────────────────────────── */
  function _pickVoice(pref) {
    if (!_voices.length) return null;
    const eng = _voices.filter(v => v.lang && /^en([-_]|$)/i.test(v.lang || ''));
    const pool = eng.length ? eng : _voices;
    const ranked = [...pool].sort((a, b) => _voiceScore(b, pref) - _voiceScore(a, pref));
    return ranked[0] || pool[0] || null;
  }

  function _voiceScore(voice, pref) {
    const name = String(voice?.name || '').toLowerCase();
    const lang = String(voice?.lang || '').toLowerCase();
    let score = /^en([-_]|$)/i.test(lang) ? 40 : 0;

    if (/google|microsoft|natural|neural|premium|enhanced|apple|siri/i.test(name)) {
      score += 30;
    }

    if (pref === 'female') {
      if (/aria|jenny|samantha|ava|emma|victoria|karen|moira|tessa|zira|libby|female/i.test(name)) score += 60;
      if (/david|alex|daniel|mark|james|male/i.test(name)) score -= 20;
    } else if (pref === 'male') {
      if (/david|alex|daniel|mark|james|rishi|male/i.test(name)) score += 60;
      if (/aria|jenny|samantha|ava|emma|victoria|karen|moira|tessa|zira|libby|female/i.test(name)) score -= 20;
    } else {
      if (/aria|jenny|samantha|ava|emma|victoria|karen|moira|tessa|zira|libby/i.test(name)) score += 20;
    }

    if (/compact|espeak|festival/i.test(name)) score -= 40;
    return score;
  }

  /* ── Clean text ──────────────────────────────────────── */
  function _getText(article) {
    const body = (article.body || article.excerpt || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${article.title}. By ${article.author || 'the author'}. ${body}`;
  }

  /* ── Update play buttons ─────────────────────────────── */
  function _updateBtns(id, state) {
    const icon = state === 'playing' ? PAUSE_SVG : PLAY_SVG;
    const cardBtn   = document.getElementById(`pod-play-${id}`);
    const readerBtn = document.getElementById(`reader-play-btn-${id}`);
    if (cardBtn)   cardBtn.innerHTML   = icon;
    if (readerBtn) readerBtn.innerHTML = icon;
    const podLabel = document.getElementById(`pod-label-${id}`);
    if (podLabel) podLabel.textContent = state === 'playing' ? 'Pause Podcast' : 'Listen as Podcast';
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════ */

  async function toggle(id) {
    if (!window.speechSynthesis) {
      IBlog.utils.toast('TTS not supported in this browser'); return;
    }
    /* Pause if currently playing same article */
    if (_speaking && _currentId === id) {
      window.speechSynthesis.pause();
      _speaking = false; _paused = true;
      _updateBtns(id, 'paused'); return;
    }
    /* Resume if paused same article */
    if (_paused && _currentId === id) {
      window.speechSynthesis.resume();
      _speaking = true; _paused = false;
      _updateBtns(id, 'playing'); return;
    }
    /* Start fresh */
    stop();
    const article = (IBlog.state.articles || []).find(a => a.id === id);
    if (!article) return;

    await _loadVoices();

    _utterance       = new SpeechSynthesisUtterance(_getText(article));
    _utterance.rate  = 0.88;
    _utterance.pitch = 1.02;
    _utterance.lang  = 'en-US';
    const voice = _pickVoice(_voicePref);
    if (voice) _utterance.voice = voice;

    _utterance.onstart = () => {
      _speaking = true; _paused = false; _currentId = id;
      _updateBtns(id, 'playing');
      IBlog.utils.toast('Playing article…', 'success');
    };
    _utterance.onend = () => {
      _speaking = false; _paused = false; _currentId = null;
      _updateBtns(id, 'stopped');
    };
    _utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      _speaking = false; _paused = false; _currentId = null;
      _updateBtns(id, 'stopped');
    };

    window.speechSynthesis.speak(_utterance);
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const id = _currentId;
    _speaking = false; _paused = false; _currentId = null; _utterance = null;
    if (id) _updateBtns(id, 'stopped');
  }

  function setVoice(pref, el) {
    _voicePref = pref;
    el?.closest('.podcast-voice-row,.podcast-voice-btns')
      ?.querySelectorAll('.voice-chip,.voice-btn')
      .forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    if (_speaking && _currentId !== null) {
      const id = _currentId; stop();
      setTimeout(() => toggle(id), 200);
    }
    IBlog.utils.toast(`Voice: ${pref}`, 'success');
  }

  return { toggle, stop, setVoice };

})();
