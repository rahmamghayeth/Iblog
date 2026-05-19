/* ══════════════════════════════════════════════════════════
   IBlog — Feed  v3
   Web Speech API TTS · full sync feed ↔ reader
   ══════════════════════════════════════════════════════════ */

IBlog.Feed = (() => {

  /* ── SVG icons ── */
  const I = {
    heart:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    heartFill:    `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    save:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    saveFill:     `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    love:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    insight:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>`,
    helpful:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    share:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    play:         `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause:        `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    send:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    close:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  /* ══════════════════════════════════════════════════════
     TTS — Web Speech API
     ══════════════════════════════════════════════════════ */
  let _utterance = null;
  let _speaking  = false;
  let _ttsId     = null;
  let _voicePref = 'default'; /* 'default' | 'female' | 'male' */
  let _readerArticle = null;

  function _getVoices(gender) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    if (gender === 'female') {
      return voices.find(v => /female|zira|samantha|victoria|karen|moira|tessa/i.test(v.name))
          || voices.find(v => v.name.toLowerCase().includes('f'))
          || voices[0];
    }
    if (gender === 'male') {
      return voices.find(v => /male|david|alex|daniel|rishi|jorge/i.test(v.name))
          || voices[1] || voices[0];
    }
    return voices[0];
  }

  function _getText(article) {
    return `${article.title}. By ${article.author||'the author'}. ${(article.body||article.excerpt||'').replace(/<[^>]*>/g,'')}`;
  }

  function _resolveArticle(ref) {
    if (ref && typeof ref === 'object') return ref;
    const fromState = (IBlog.state.articles || []).find(article => String(article?.id) === String(ref));
    if (fromState) return fromState;
    if (_readerArticle && String(_readerArticle.id) === String(ref)) return _readerArticle;
    return null;
  }

  function _startTTS(id, playBtnId) {
    const article = _resolveArticle(id);
    if (!article) return;
    if (!window.speechSynthesis) {
      IBlog.utils.toast('Text-to-speech not supported in this browser');
      return;
    }

    stopTTS();
    _ttsId     = id;
    _speaking  = true;

    _utterance = new SpeechSynthesisUtterance(_getText(article));
    _utterance.rate  = 0.95;
    _utterance.pitch = 1;
    _utterance.lang  = 'en-US';

    const voice = _getVoices(_voicePref === 'default' ? null : _voicePref);
    if (voice) _utterance.voice = voice;

    _utterance.onend = () => {
      _speaking = false;
      _updatePlayBtn(playBtnId, false);
    };
    _utterance.onerror = () => {
      _speaking = false;
      _updatePlayBtn(playBtnId, false);
    };

    window.speechSynthesis.speak(_utterance);
    _updatePlayBtn(playBtnId, true);
    IBlog.utils.toast('Playing…', 'success');
  }

  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    _speaking = false;
    _ttsId    = null;
  }

  function toggleTTS(id, btn) {
    if (_speaking && _ttsId === id) {
      stopTTS();
      _updatePlayBtn(btn.id, false);
    } else {
      _startTTS(id, btn.id);
    }
  }

  function _updatePlayBtn(btnId, playing) {
    const btn = typeof btnId === 'string'
      ? document.getElementById(btnId)
      : btnId;
    if (!btn) return;
    btn.innerHTML = playing ? I.pause : I.play;
  }

  function setCardVoice(gender, el, id) {
    _voicePref = gender;
    el.closest('.podcast-voice-row')?.querySelectorAll('.voice-chip')
      .forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    /* Restart if playing */
    if (_speaking && _ttsId === id) {
      stopTTS();
      const playBtn = document.getElementById(`pod-play-${id}`);
      _startTTS(id, `pod-play-${id}`);
    }
  }

  function setReaderVoice(id, gender, el) {
    _voicePref = gender;
    el.closest('.podcast-voice-btns')?.querySelectorAll('.voice-btn')
      .forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (_speaking && _ttsId === id) {
      stopTTS();
      _startTTS(id, `reader-play-btn-${id}`);
    }
  }

  /* ══════════════════════════════════════════════════════
     build
     ══════════════════════════════════════════════════════ */
  function _filter(tab) {
    const all = IBlog.state.articles||[];
    if (tab==='following') {
      const followingIds = Array.isArray(IBlog.state?.currentUser?.followingIds)
        ? IBlog.state.currentUser.followingIds.map((value) => String(value))
        : [];
      if (!followingIds.length) return [];
      return all.filter((article) => {
        const authorId = article?.authorId ?? article?.userId ?? null;
        return authorId !== null && followingIds.includes(String(authorId));
      });
    }
    if (tab==='trending')  return [...all].sort((a,b)=>(b.likes||0)-(a.likes||0));
    if (tab==='latest')    return [...all].sort((a,b)=>b.id-a.id);
    return all;
  }

  function build(tab='foryou', containerId='feed-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    _filter(tab).forEach((article,i) => {
      container.appendChild(IBlog.ArticleCard.render(article,i));
    });
  }

  /* ══════════════════════════════════════════════════════
     openReader
     ══════════════════════════════════════════════════════ */
  function openReader(ref) {
    const article = _resolveArticle(ref);
    if (!article) return;
    const id = article.id;
    _readerArticle = article;
    window.IBlogTracker?.log('view_article', {
      entityType: 'article',
      entityId: id,
      title: article.title || '',
      category: article.cat || article.category || '',
      value: 1,
    });
    const overlay = document.getElementById('article-reader-overlay');
    const content = document.getElementById('article-reader-content');
    if (!overlay||!content) return;

    const idx     = Math.max(0, IBlog.state.articles.indexOf(article));
    const color   = IBlog.ArticleCard ? IBlog.ArticleCard.avatarColor(idx) : '#b8960c';
    const initial = (article.author||'A')[0].toUpperCase();
    const hasCover = !!(article.cover||article.img);
    const comments = article.comments||[];
    content.innerHTML = `
      <div class="article-reader">
        <div class="reader-progress-bar">
          <div class="reader-progress-fill" id="reader-progress-fill"></div>
        </div>

        <button class="reader-close" onclick="IBlog.Feed.closeReader()">${I.close}</button>

        ${hasCover ? `
        <div class="reader-cover" style="background-image:url('${article.cover||article.img}')">
          <div class="reader-cover-overlay"></div>
          <div class="reader-cover-meta">
            <div class="reader-cat-badge">${article.cat||article.category||'General'}</div>
            <div class="reader-cover-title">${article.title}</div>
            <div class="reader-cover-byline">
              <span>${article.author||''}</span><span>·</span>
              <span>${article.date||''}</span><span>·</span>
              <span>${article.readTime||'5 min'} read</span>
            </div>
          </div>
        </div>` : `
        <div class="reader-header-no-cover">
          <div class="reader-cat-badge">${article.cat||article.category||'General'}</div>
          <div class="reader-cover-title">${article.title}</div>
        </div>`}

        <div class="reader-body">

          <!-- Author + actions -->
          <div class="reader-author-row">
            <div class="reader-author-avatar" style="background:${color}">${initial}</div>
            <div class="reader-author-info">
              <strong>${article.author||'Anonymous'}</strong>
              <small>${article.date||''} · ${article.readTime||'5 min'} read</small>
            </div>
            <div class="reader-actions">
              <button class="reader-action-btn ${article._liked?'active-like':''}"
                      id="reader-like-btn-${id}"
                      onclick="IBlog.Feed.readerLike(${id})">
                ${article._liked ? I.heartFill : I.heart}
                <span id="reader-like-count-${id}">${article.likes||0}</span>
              </button>
              <button class="reader-action-btn ${article._bookmarked?'active-save':''}"
                      id="reader-save-btn-${id}"
                      onclick="IBlog.Feed.readerSave(${id})">
                ${article._bookmarked ? I.saveFill : I.save}
                <span id="reader-save-label-${id}">${article._bookmarked?'Saved':'Save'}</span>
              </button>
              <button class="reader-action-btn" onclick="IBlog.Feed.readerShare(${id})">
                ${I.share} Share
              </button>
            </div>
          </div>

          <!-- Podcast -->
          <div class="reader-podcast">
            <button class="podcast-icon-btn" id="reader-play-btn-${id}"
                    onclick="IBlog.Feed.toggleTTS(${id}, this)">
              ${I.play}
            </button>
            <div class="podcast-info">
              <strong>${article.title}</strong>
              <small>Web Speech API · ${article.readTime||'5 min'} · Real browser TTS</small>
              <div class="podcast-progress" id="podcast-bar-${id}">
                <div class="podcast-progress-fill" id="podcast-fill-${id}" style="width:0%"></div>
              </div>
            </div>
            <div class="podcast-voice-btns">
              <button class="voice-btn active" onclick="IBlog.Feed.setReaderVoice(${id},'default',this)">Default</button>
              <button class="voice-btn" onclick="IBlog.Feed.setReaderVoice(${id},'female',this)">Female</button>
              <button class="voice-btn" onclick="IBlog.Feed.setReaderVoice(${id},'male',this)">Male</button>
            </div>
          </div>

          <!-- Text -->
          <div class="reader-text">
            ${(article.body||article.excerpt||'')
              .split('\n\n').filter(p=>p.trim())
              .map(p=>`<p>${p.trim()}</p>`).join('')}
          </div>

          <!-- Tags -->
          ${(article.tags||[]).length ? `
          <div class="reader-tags">
            ${article.tags.map(t=>`<span class="reader-tag" onclick="IBlog.Views.searchTopic('${t}')">${t}</span>`).join('')}
          </div>` : ''}

          <!-- Comments -->
          <div class="reader-comments">
            <div class="reader-comments-title">
              Comments <span id="reader-comment-count-${id}">(${comments.length})</span>
            </div>
            <div class="reader-comment-input-row">
              <textarea class="reader-comment-input"
                        id="reader-comment-input-${id}"
                        placeholder="Share your thoughts…" rows="2"
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();IBlog.Feed.postReaderComment(${id});}">
              </textarea>
              <button class="reader-comment-send" onclick="IBlog.Feed.postReaderComment(${id})">
                ${I.send}
              </button>
            </div>
            <div class="reader-comment-list" id="reader-comment-list-${id}">
              ${comments.map(c=>_readerCommentHTML(c)).join('')}
            </div>
          </div>

        </div>
      </div>`;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    /* Reading progress */
    overlay.onscroll = () => {
      const max = overlay.scrollHeight - overlay.clientHeight;
      const pct = max > 0 ? (overlay.scrollTop/max)*100 : 0;
      const bar = document.getElementById('reader-progress-fill');
      if (bar) bar.style.width = pct + '%';
    };
  }

  /* ── Close ───────────────────────────────────────────── */
  function closeReader() {
    const overlay = document.getElementById('article-reader-overlay');
    if (overlay) { overlay.classList.remove('open'); overlay.onscroll = null; }
    document.body.style.overflow = '';
    _readerArticle = null;
    stopTTS();
  }

  /* ══════════════════════════════════════════════════════
     READER ACTIONS — synced with feed cards
     ══════════════════════════════════════════════════════ */
  async function readerLike(id) {
    const article = _resolveArticle(id);
    if (!article) return;
    const nextLiked = !article._liked;

    if (/^\d+$/.test(String(id)) && !article._landingPreview) {
      try {
        const currentUser = window.IBlogSession?.getUser?.() || null;
        const response = await fetch('backend/view/components/article/api-articles.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            action: 'like_toggle',
            articleId: Number(id),
            liked: nextLiked,
            ...(currentUser?.email ? { authorEmail: currentUser.email } : {}),
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Could not update like.');
        }
        article._liked = !!payload.liked;
        article.liked = !!payload.liked;
        article.likes = Number(payload.likesCount || 0);
      } catch (error) {
        IBlog.utils.toast(error?.message || 'Could not update like.', 'error');
        return;
      }
    } else {
      article._liked = nextLiked;
      article.liked = nextLiked;
      article.likes  = Math.max(0,(article.likes||0)+(article._liked?1:-1));
    }

    /* Update reader button */
    const btn = document.getElementById(`reader-like-btn-${id}`);
    if (btn) {
      btn.className = `reader-action-btn ${article._liked?'active-like':''}`;
      btn.innerHTML = (article._liked?I.heartFill:I.heart)
        + `<span id="reader-like-count-${id}">${article.likes}</span>`;
    }
    /* Sync feed card */
    const fc = document.getElementById(`like-count-${id}`);
    if (fc) fc.textContent = article.likes;
    const fb = document.getElementById(`like-btn-${id}`);
    if (fb) {
      fb.className = `interact-btn ${article._liked?'active-like':''}`;
      fb.innerHTML = (article._liked ? I.heartFill : I.heart)
        + `<span id="like-count-${id}">${article.likes}</span>`;
    }
    if (article._liked) {
      window.IBlogTracker?.log('like_article', {
        entityType: 'article',
        entityId: id,
        title: article.title || '',
        category: article.cat || article.category || '',
        value: 1,
      });
    }
    IBlog.utils.toast(article._liked?'Liked!':'Like removed');
  }

  function readerSave(id) {
    const article = _resolveArticle(id);
    if (article) {
      window.IBlogTracker?.log('save_article', {
        entityType: 'article',
        entityId: id,
        title: article.title || '',
        category: article.cat || article.category || '',
        value: 1,
      });
    }
    if (article?._landingPreview) {
      article._bookmarked = !article._bookmarked;
      const btn = document.getElementById(`reader-save-btn-${id}`);
      if (btn) {
        btn.className = `reader-action-btn ${article._bookmarked ? 'active-save' : ''}`;
        btn.innerHTML = (article._bookmarked ? I.saveFill : I.save)
          + `<span id="reader-save-label-${id}">${article._bookmarked ? 'Saved' : 'Save'}</span>`;
      }
      IBlog.utils.toast(article._bookmarked ? 'Saved' : 'Save');
      return;
    }
    /* Delegate to ArticleCard so both are always in sync */
    IBlog.ArticleCard.toggleBookmark(id);
  }

  function readerShare(id) {
    const a = _resolveArticle(id);
    const title = a ? a.title : 'IBlog Article';
    if (navigator.share) navigator.share({title, url:window.location.href});
    else navigator.clipboard.writeText(window.location.href)
      .then(()=>IBlog.utils.toast('Link copied!','success'));
  }

  /* ══════════════════════════════════════════════════════
     READER COMMENTS — synced with feed card
     ══════════════════════════════════════════════════════ */
  function postReaderComment(id) {
    const input   = document.getElementById(`reader-comment-input-${id}`);
    const list    = document.getElementById(`reader-comment-list-${id}`);
    const counter = document.getElementById(`reader-comment-count-${id}`);
    if (!input||!list) return;
    const text = input.value.trim();
    if (!text) return;
    const user    = IBlog.state.currentUser||{name:'You'};
    const comment = {author:user.name, text};

    const article = _resolveArticle(id);
    if (article) {
      article.comments = article.comments||[];
      article.comments.push(comment);
      if (counter) counter.textContent = `(${article.comments.length})`;
      /* Sync feed card count */
      const fc = document.getElementById(`comment-count-${id}`);
      if (fc) fc.textContent = article.comments.length;
      /* Sync feed card comment list */
      const fl = document.getElementById(`comment-list-${id}`);
      if (fl) { fl.insertAdjacentHTML('beforeend', IBlog.ArticleCard._commentHTML(comment)); fl.scrollTop=fl.scrollHeight; }
      window.IBlogTracker?.log('comment_article', {
        entityType: 'article',
        entityId: id,
        title: article.title || '',
        category: article.cat || article.category || '',
        value: 1,
      });
    }
    list.insertAdjacentHTML('beforeend', _readerCommentHTML(comment));
    list.scrollTop = list.scrollHeight;
    input.value = '';
    IBlog.utils.toast('Comment posted!','success');
  }

  function _readerCommentHTML(c) {
    return `<div class="reader-comment-item">
      <div class="reader-comment-bubble"><strong>${c.author||'User'}</strong><p>${c.text}</p></div>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════
     COMPOSE
     ══════════════════════════════════════════════════════ */
  function expandCompose() {
    const tools = document.getElementById('composeTools');
    if (tools) tools.style.display = 'flex';
  }

  function publishPost() {
    const input = document.getElementById('composeInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { IBlog.utils.toast('Write something first!'); return; }
    const user = IBlog.state.currentUser||{name:'You'};
    IBlog.state.articles.unshift({
      id:Date.now(), author:user.name, cat:'General',
      title:text.length>80?text.slice(0,80)+'…':text,
      excerpt:text, body:text, readTime:'1 min',
      likes:0, comments:[], quality:50, tags:[],
      date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    });
    window.IBlogTracker?.log('publish_article', {
      entityType: 'article',
      entityId: IBlog.state.articles[0]?.id || null,
      title: IBlog.state.articles[0]?.title || '',
      category: 'General',
      value: 1,
    });
    input.value = '';
    const tools = document.getElementById('composeTools');
    if (tools) tools.style.display = 'none';
    build('foryou');
    IBlog.utils.toast('Post published!','success');
  }

  return {
    build, openReader, closeReader,
    readerLike, readerSave, readerShare,
    postReaderComment,
    toggleTTS, stopTTS, setCardVoice, setReaderVoice,
    expandCompose, publishPost,
  };

})();
