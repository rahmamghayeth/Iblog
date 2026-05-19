// backend/view/components/testimonial/testimonial.js

(function () {
  'use strict';

  // ── Derive this component's base path from its own <script src> ──────────────
  // Works regardless of which page loads this script.
  const _scriptEl  = document.querySelector('script[src*="testimonial/testimonial.js"]');
  const _base      = _scriptEl
    ? _scriptEl.src.replace(location.origin, '').replace(/testimonial\.js([?#].*)?$/, '')
    : 'backend/view/components/testimonial/';

  // ── Inject CSS once ──────────────────────────────────────────────────────────
  function injectStyles() {
    const id = 'testimonial-css';
    if (document.getElementById(id)) return;
    const link  = document.createElement('link');
    link.id     = id;
    link.rel    = 'stylesheet';
    link.href   = _base + 'testimonial.css';   // ← was bare 'testimonial.css'
    document.head.appendChild(link);
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  const TESTIMONIALS = [
    {
      name:    'Sophia Marlowe',
      role:    'Science Writer',
      avatar:  'SM',
      color:   '#6c63ff',
      text:    'IBlog transformed how I share research. The editor is clean, the audience is engaged, and Premium templates save me hours every week.',
      stars:   5,
      plan:    'Premium',
    },
    {
      name:    'Luca Ferretti',
      role:    'Tech Entrepreneur',
      avatar:  'LF',
      color:   '#f59e0b',
      text:    'The Global Trend Map alone is worth the upgrade. I can see exactly what topics are heating up in any country before I write.',
      stars:   5,
      plan:    'Premium',
    },
    {
      name:    'Aisha Kamara',
      role:    'Neuroscience PhD',
      avatar:  'AK',
      color:   '#10b981',
      text:    'I have tried every blogging platform. IBlog is the only one built for people who care about ideas, not just clicks.',
      stars:   5,
      plan:    'Free',
    },
    {
      name:    'James Whitfield',
      role:    'Geopolitics Analyst',
      avatar:  'JW',
      color:   '#ef4444',
      text:    'Publishing long-form analysis used to mean fighting a clunky editor. Here it just flows. My readers noticed the difference immediately.',
      stars:   5,
      plan:    'Premium',
    },
    {
      name:    'Yuki Tanaka',
      role:    'Climate Researcher',
      avatar:  'YT',
      color:   '#3b82f6',
      text:    'The community here actually reads. My article on ocean acidification reached 12 000 people in a week — on a free plan.',
      stars:   5,
      plan:    'Free',
    },
    {
      name:    'Elena Vasquez',
      role:    'Economist',
      avatar:  'EV',
      color:   '#8b5cf6',
      text:    'Priority feed visibility made a real difference. My subscriber count doubled in the first month after upgrading.',
      stars:   5,
      plan:    'Premium',
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  function stars(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function render() {
    const root = document.getElementById('testimonial-root');
    if (!root) return;

    root.innerHTML = `
      <section class="testimonial-section" id="testimonials">
        <div class="testimonial-header">
          <h2 class="testimonial-title">Loved by writers &amp; thinkers worldwide</h2>
          <p class="testimonial-sub">Join thousands sharing knowledge on IBlog</p>
        </div>
        <div class="testimonial-grid">
          ${TESTIMONIALS.map(t => `
            <div class="testimonial-card">
              <div class="testimonial-stars">${stars(t.stars)}</div>
              <p class="testimonial-text">"${t.text}"</p>
              <div class="testimonial-author">
                <div class="testimonial-identity">
                  <strong class="testimonial-name">${t.name}</strong>
                  <span class="testimonial-role">${t.role}</span>
                </div>
                <span class="testimonial-plan ${t.plan === 'Premium' ? 'plan-premium' : 'plan-free'}">
                  ${t.plan === 'Premium' ? '⭐ ' : ''}${t.plan}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>`;
  }

  // ── Mount ─────────────────────────────────────────────────────────────────────
  function mount() {
    injectStyles();
    render();
  }

  function autoMount() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  autoMount();

  window.IBlogTestimonial = { mount, render };
})();
