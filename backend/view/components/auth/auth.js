(function () {
  'use strict';

  const API = 'backend/view/components/auth/api-auth.php';
  const REQUEST_TIMEOUT_MS = 12000;

  const EYE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  let pendingPremiumSignup = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectModalsIfNeeded();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
    document.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) closeAllModals();
    });
    document.addEventListener('input', e => {
      if (e.target?.id === 'su-pass') renderPasswordRules(e.target.value || '');
    });
  }

  function injectModalsIfNeeded() {
    if (document.getElementById('modal-signup')) return;
    const root = document.getElementById('auth-root');
    if (!root) return;
    root.innerHTML = getModalsHTML();
    renderPasswordRules('');
  }

  async function apiFetch(payload) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      : null;

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });
      const text = await res.text();
      if (!text.trim().startsWith('{')) {
        throw new Error(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180) || 'Server error');
      }
      const data = JSON.parse(text);
      if (!data.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('The server took too long to respond. Check MySQL/XAMPP and try again.');
      }
      throw error;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  function _applyUser(user) {
    user.initial = user.initial || (user.name ? user.name[0].toUpperCase() : 'A');
    window.IBlog = window.IBlog || {};
    IBlog.state = IBlog.state || {};
    if (window.IBlogSession?.replaceUser) {
      IBlogSession.replaceUser(user);
    } else if (window.IBlogSession?.setUser) {
      IBlogSession.setUser(user);
    } else {
      sessionStorage.removeItem('pendingUser');
      localStorage.removeItem('pendingUser');
      IBlog.state.currentUser = user;
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  function _buildPendingPremiumSignup(name, email, password) {
    return {
      name,
      email,
      password,
      pseudo: '',
      bio: '',
      avatar: '',
      cover: '',
      fieldIds: [],
      subjectIds: [],
      interestIds: [],
      fields: [],
      subjects: [],
      onboardingComplete: false,
      initial: name ? name[0].toUpperCase() : 'A',
    };
  }

  function _clearAuthFields() {
    ['su-name', 'su-email', 'su-pass', 'su-pass2', 'si-email', 'si-pass', 'fp-email'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = '';
      el.classList.remove('error', 'valid');
    });
    document.querySelectorAll('.field-err').forEach((err) => {
      if (err?.id?.startsWith('su-') || err?.id?.startsWith('si-') || err?.id?.startsWith('fp-')) {
        err.classList.remove('show');
        err.textContent = '';
      }
    });
    renderPasswordRules('');
  }

  function _abandonPendingSignupView() {
    sessionStorage.removeItem('pendingUser');
    localStorage.removeItem('pendingUser');
    if (window.IBlogSession?.clearUser) {
      IBlogSession.clearUser();
    }
    document.getElementById('dashboard')?.style.setProperty('display', 'none');
    document.getElementById('landing-page')?.style.setProperty('display', 'block');
  }

  function passwordChecks(password = '') {
    return {
      length: password.length >= 10,
      symbol: /[^A-Za-z0-9]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };
  }

  function renderPasswordRules(password) {
    const checks = passwordChecks(password);
    Object.entries(checks).forEach(([rule, ok]) => {
      const row = document.querySelector(`[data-rule="${rule}"]`);
      if (!row) return;
      row.classList.toggle('is-valid', ok);
      const icon = row.querySelector('.password-rule-icon');
      if (icon) icon.textContent = ok ? '✓' : '';
    });
  }

  function showError(id, msg) {
    const input = document.getElementById(id);
    const err = document.getElementById(`${id}-err`);
    if (input) input.classList.add('error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearError(id) {
    const input = document.getElementById(id);
    const err = document.getElementById(`${id}-err`);
    if (input) { input.classList.remove('error'); input.classList.add('valid'); }
    if (err) err.classList.remove('show');
  }

  function resetModalState() {
    ['premium-step-perks', 'premium-step-payment', 'premium-step-success'].forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.style.display = idx === 0 ? 'block' : 'none';
    });
    document.querySelectorAll('.plan-opt').forEach(opt => opt.classList.remove('selected'));
    ['su-name', 'su-email', 'su-pass', 'su-pass2', 'si-email', 'si-pass', 'fp-email', 'pay-name', 'pay-number', 'pay-expiry', 'pay-cvv'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        el.classList.remove('error', 'valid');
      }
    });
    document.querySelectorAll('.field-err').forEach(err => err.classList.remove('show'));
    sessionStorage.removeItem('selectedPlan');
    pendingPremiumSignup = null;
    renderPasswordRules('');
    switchPayTab(null, 'card');
  }

  window.closeAllModals = function () {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    resetModalState();
    if (!window.IBlogSession?.getUser?.() && !sessionStorage.getItem('pendingUser')) {
      document.getElementById('dashboard')?.style.setProperty('display', 'none');
      document.getElementById('landing-page')?.style.setProperty('display', 'block');
    }
  };

  window.showSignup = function () {
    injectModalsIfNeeded();
    closeAllModals();
    _clearAuthFields();
    document.getElementById('modal-signup')?.classList.add('active');
  };

  window.showSignin = function () {
    injectModalsIfNeeded();
    closeAllModals();
    document.getElementById('modal-signin')?.classList.add('active');
  };

  window.showForgotPassword = function () {
    injectModalsIfNeeded();
    closeAllModals();
    const body = document.getElementById('forgot-body');
    const sent = document.getElementById('forgot-sent');
    if (body) body.style.display = 'block';
    if (sent) sent.style.display = 'none';
    document.getElementById('modal-forgot')?.classList.add('active');
  };

  window.showPremium = function () {
    injectModalsIfNeeded();
    const savedUser = window.IBlogSession?.getUser?.() ? JSON.stringify(window.IBlogSession.getUser()) : sessionStorage.getItem('user');
    if (!savedUser) {
      showSignup();
      const premiumOpt = document.querySelector('.plan-opt.premium-plan');
      if (premiumOpt) selectPlan(premiumOpt, 'premium');
      return;
    }
    closeAllModals();
    document.getElementById('modal-premium')?.classList.add('active');
  };

  window.showPerks = function () {
    document.getElementById('premium-step-perks')?.style.setProperty('display', 'block');
    document.getElementById('premium-step-payment')?.style.setProperty('display', 'none');
    document.getElementById('premium-step-success')?.style.setProperty('display', 'none');
  };

  window.showPayment = function () {
    document.getElementById('premium-step-perks')?.style.setProperty('display', 'none');
    document.getElementById('premium-step-payment')?.style.setProperty('display', 'block');
    document.getElementById('premium-step-success')?.style.setProperty('display', 'none');
  };

  window.selectPlan = function (el, plan) {
    document.querySelectorAll('.plan-opt').forEach(opt => opt.classList.remove('selected'));
    el?.classList.add('selected');
    sessionStorage.setItem('selectedPlan', plan);
  };

  window.validateField = function (id) {
    const input = document.getElementById(id);
    if (!input) return;
    const value = input.value.trim();
    if (id === 'su-name') return value.length >= 2 ? clearError(id) : showError(id, 'Name must be at least 2 characters');
    if (['su-email', 'si-email', 'fp-email'].includes(id)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? clearError(id) : showError(id, 'Please enter a valid email');
    if (id === 'su-pass') {
      renderPasswordRules(value);
      return Object.values(passwordChecks(value)).every(Boolean)
        ? clearError(id)
        : showError(id, 'Use at least 10 chars, 1 symbol, 1 capital letter, and 1 number');
    }
    if (id === 'si-pass') return value.length >= 6 ? clearError(id) : showError(id, 'Password must be at least 6 characters');
    if (id === 'su-pass2') return value === (document.getElementById('su-pass')?.value || '') ? clearError(id) : showError(id, 'Passwords do not match');
  };

  window.togglePass = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.innerHTML = isText ? EYE_ICON : EYE_OFF_ICON;
  };

  window.doSignup = function () {
    const name = document.getElementById('su-name')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const password = document.getElementById('su-pass')?.value || '';
    const pass2 = document.getElementById('su-pass2')?.value || '';
    const terms = document.getElementById('su-terms')?.checked;
    const plan = sessionStorage.getItem('selectedPlan');

    let valid = true;
    if (!plan) { IBlog.utils?.toast('Please select a plan first', 'error'); return; }
    if (!name || name.length < 2) { showError('su-name', 'Name must be at least 2 characters'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) { showError('su-email', 'Please enter a valid email'); valid = false; }
    if (!Object.values(passwordChecks(password)).every(Boolean)) { showError('su-pass', 'Use at least 10 chars, 1 symbol, 1 capital letter, and 1 number'); valid = false; }
    if (password !== pass2) { showError('su-pass2', 'Passwords do not match'); valid = false; }
    if (!terms) { IBlog.utils?.toast('Please agree to the terms', 'error'); valid = false; }
    if (!valid) return;

    const btn = document.querySelector('#modal-signup .btn-primary');
    if (btn) { btn.textContent = plan === 'premium' ? 'Preparing payment...' : 'Creating account...'; btn.disabled = true; }

    if (plan === 'premium') {
      pendingPremiumSignup = _buildPendingPremiumSignup(name, email, password);
      document.getElementById('modal-signup')?.classList.remove('active');
      document.getElementById('modal-premium')?.classList.add('active');
      showPayment();
      if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
      return;
    }

    apiFetch({ action: 'signup', name, email, password, plan })
      .then(data => {
        _applyUser(data.user);
        launchOnboarding(data.user);
      })
      .catch(err => {
        IBlog.utils?.toast(err.message.substring(0, 100), 'error');
      })
      .finally(() => {
        if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
      });
  };

  window.doSignin = function () {
    const email = document.getElementById('si-email')?.value.trim();
    const password = document.getElementById('si-pass')?.value || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return showError('si-email', 'Please enter a valid email');
    if (password.length < 6) return showError('si-pass', 'Password must be at least 6 characters');

    const btn = document.querySelector('#modal-signin .btn-primary');
    if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
    apiFetch({ action: 'signin', email, password })
      .then(async (data) => {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        _applyUser(data.user);
        const syncedUser = await window.IBlogSession?.syncFromServer?.({ clearOnFailure: true });
        const nextUser = syncedUser || data.user;
        if (syncedUser) {
          _applyUser(syncedUser);
        }
        if (nextUser?.onboardingComplete === false) {
          launchOnboarding(nextUser);
          return;
        }
        closeAllModals();
        goToDashboard(window._pendingArticleId || null);
      })
      .catch(err => {
        showError('si-pass', err.message);
      })
      .finally(() => {
        if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
      });
  };

  window.doForgotPassword = function () {
    const email = document.getElementById('fp-email')?.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return showError('fp-email', 'Please enter a valid email');
    clearError('fp-email');
    const btn = document.getElementById('fp-btn');
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
    apiFetch({ action: 'forgot_password', email })
      .then(data => {
        document.getElementById('forgot-body')?.style.setProperty('display', 'none');
        document.getElementById('forgot-sent')?.style.setProperty('display', 'block');
        const sentTo = document.getElementById('forgot-sent-email');
        if (sentTo) sentTo.textContent = data.email || email;
      })
      .catch(err => showError('fp-email', err.message))
      .finally(() => {
        if (btn) { btn.textContent = 'Send Reset Link'; btn.disabled = false; }
      });
  };

  let _pendingArticleId = null;
  window.setPendingArticle = function (id) { _pendingArticleId = id; };

  window.demoLogin = function (plan = 'free') {
    IBlog.utils?.toast('Demo accounts have been removed. Please sign in with a real account.', 'info');
    if (plan === 'premium') {
      showPremium();
      return;
    }
    showSignin();
  };

  window.switchPayTab = function (el, tab) {
    document.querySelectorAll('.pay-tab').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    document.getElementById('pay-card')?.style.setProperty('display', tab === 'card' ? 'block' : 'none');
    document.getElementById('pay-d17')?.style.setProperty('display', tab === 'd17' ? 'block' : 'none');
  };

  window.formatCard = function (input) {
    if (!input) return;
    const value = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = value.match(/.{1,4}/g)?.join(' ') || value;
  };

  window.formatExpiry = function (input) {
    if (!input) return;
    let value = input.value.replace(/\D/g, '').substring(0, 4);
    if (value.length >= 3) value = `${value.substring(0, 2)} / ${value.substring(2)}`;
    input.value = value;
  };

  window.doPayment = function () {
    const d17Visible = document.getElementById('pay-d17')?.style.display === 'block';
    if (!d17Visible) {
      const values = ['pay-name', 'pay-number', 'pay-expiry', 'pay-cvv'].map(id => document.getElementById(id)?.value.trim());
      if (values.some(v => !v)) {
        alert('Please fill all payment fields.');
        return;
      }
    }
    processSuccess(d17Visible ? 'd17' : 'card');
  };

  function processSuccess(method = 'card') {
    const currentUser = window.IBlogSession?.getUser?.();
    const signupSeed = pendingPremiumSignup ? { ...pendingPremiumSignup } : null;
    const request = pendingPremiumSignup
      ? {
          action: 'signup_premium',
          name: pendingPremiumSignup.name,
          email: pendingPremiumSignup.email,
          password: pendingPremiumSignup.password,
          method,
          amount: 9,
        }
      : {
          action: 'upgrade_to_premium',
          method,
          amount: 9,
        };
    const fallbackUser = signupSeed
      ? {
          ...signupSeed,
          plan: 'premium',
          isPremium: true,
        }
      : (currentUser || { name: 'New Member', email: '' });

    apiFetch(request)
      .then(data => {
        const updatedUser = signupSeed
          ? {
              ...data.user,
              name: signupSeed.name,
              email: signupSeed.email,
              initial: signupSeed.initial,
              pseudo: signupSeed.pseudo,
              bio: signupSeed.bio,
              avatar: signupSeed.avatar,
              cover: signupSeed.cover,
              fieldIds: [],
              subjectIds: [],
              interestIds: [],
              fields: [],
              subjects: [],
              onboardingComplete: false,
              isPremium: true,
              plan: 'premium',
            }
          : { ...fallbackUser, ...data.user, isPremium: true, plan: 'premium' };
        pendingPremiumSignup = null;
        _applyUser(updatedUser);
        document.getElementById('premium-step-payment')?.style.setProperty('display', 'none');
        document.getElementById('premium-step-success')?.style.setProperty('display', 'block');
        setTimeout(() => {
          if (updatedUser.onboardingComplete === false) launchOnboarding(updatedUser);
          else goToDashboard(_pendingArticleId);
        }, 1200);
      })
      .catch(err => {
        IBlog.utils?.toast(err.message.substring(0, 120), 'error');
      });
  }

  function launchOnboarding(user) {
    _applyUser(user);
    closeAllModals();
    if (window.IBlogOnboarding?.start) {
      IBlogOnboarding.start(user, {
        onComplete: () => {
          goToDashboard(_pendingArticleId);
          _pendingArticleId = null;
        },
        onCancel: () => {
          _pendingArticleId = null;
          _abandonPendingSignupView();
        },
      });
      return;
    }
    goToDashboard(_pendingArticleId);
    _pendingArticleId = null;
  }

  function goToDashboard(pendingId = null) {
    closeAllModals();
    document.getElementById('landing-page')?.style.setProperty('display', 'none');
    document.getElementById('dashboard')?.style.setProperty('display', 'block');
    if (typeof IBlog?.Dashboard?.enter === 'function') {
      IBlog.Dashboard.enter();
      if (pendingId) {
        setTimeout(() => {
          if (typeof window.openArticleFromLanding === 'function') {
            window.openArticleFromLanding(pendingId);
            return;
          }
          IBlog?.Feed?.openReader?.(pendingId);
        }, 250);
      }
      return;
    }
    setTimeout(() => goToDashboard(pendingId), 200);
  }

  function getModalsHTML() {
    return `
    <div class="modal-overlay" id="modal-signup">
      <div class="modal">
        <button class="modal-close" onclick="closeAllModals()">×</button>
        <h2 class="modal-title">Join IBlog</h2>
        <p class="modal-subtitle">Choose your plan, then create a calmer, stronger account.</p>
        <form onsubmit="event.preventDefault(); doSignup()">
          <div class="plan-picker">
            <div class="plan-opt" onclick="selectPlan(this,'free')"><strong>Free</strong><small>Read, write and explore</small></div>
            <div class="plan-opt premium-plan" onclick="selectPlan(this,'premium')"><strong>Premium</strong><small>Map, templates and priority tools</small><div class="plan-price">$9 / mo</div></div>
          </div>
          <div class="field-float"><input type="text" id="su-name" placeholder=" " onblur="validateField('su-name')"><label>Full Name</label><div class="field-err" id="su-name-err"></div></div>
          <div class="field-float"><input type="email" id="su-email" placeholder=" " onblur="validateField('su-email')"><label>Email address</label><div class="field-err" id="su-email-err"></div></div>
          <div class="field-float has-password-rules" style="position:relative"><input type="password" id="su-pass" placeholder=" " onblur="validateField('su-pass')"><label>Password</label><button class="field-eye" type="button" onclick="togglePass('su-pass',this)">${EYE_ICON}</button><div class="field-err" id="su-pass-err"></div></div>
          <div class="password-rules">
            <div class="password-rule" data-rule="length"><span class="password-rule-icon"></span><span>At least 10 characters</span></div>
            <div class="password-rule" data-rule="symbol"><span class="password-rule-icon"></span><span>Contain one symbol</span></div>
            <div class="password-rule" data-rule="uppercase"><span class="password-rule-icon"></span><span>Contain one capital letter</span></div>
            <div class="password-rule" data-rule="number"><span class="password-rule-icon"></span><span>Contain one number</span></div>
          </div>
          <div class="field-float" style="position:relative"><input type="password" id="su-pass2" placeholder=" " onblur="validateField('su-pass2')"><label>Repeat Password</label><button class="field-eye" type="button" onclick="togglePass('su-pass2',this)">${EYE_ICON}</button><div class="field-err" id="su-pass2-err"></div></div>
          <label class="auth-terms"><input type="checkbox" id="su-terms"> I have read and agree to the <a href="#" onclick="event.preventDefault()">terms of service</a></label>
          <button class="btn btn-primary btn-full" type="submit" style="margin-top:14px">Create Account</button>
        </form>
        <div class="modal-switch"><span>Already have an account?</span><a class="auth-arrow-link" onclick="showSignin()">Sign in ${ARROW}</a></div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-signin">
      <div class="modal">
        <button class="modal-close" onclick="closeAllModals()">×</button>
        <h2 class="modal-title">Welcome back</h2>
        <p class="modal-subtitle">Sign in to continue where you left off.</p>
        <form onsubmit="event.preventDefault(); doSignin()">
          <div class="field-float"><input type="email" id="si-email" placeholder=" " onblur="validateField('si-email')"><label>Email address</label><div class="field-err" id="si-email-err"></div></div>
          <div class="field-float" style="position:relative"><input type="password" id="si-pass" placeholder=" " onblur="validateField('si-pass')"><label>Password</label><button class="field-eye" type="button" onclick="togglePass('si-pass',this)">${EYE_ICON}</button><div class="field-err" id="si-pass-err"></div></div>
          <div class="auth-row"><label class="auth-remember"><input type="checkbox" checked> Remember me</label><a class="auth-forgot" onclick="showForgotPassword()">Forgot password?</a></div>
          <button class="btn btn-primary btn-full" type="submit">Sign In</button>
        </form>
        <div class="modal-switch"><span>Don't have an account?</span><a class="auth-arrow-link" onclick="showSignup()">Create one ${ARROW}</a></div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-forgot">
      <div class="modal">
        <button class="modal-close" onclick="closeAllModals()">×</button>
        <div id="forgot-body">
          <h2 class="modal-title">Reset Password</h2>
          <p class="modal-subtitle">Enter your email and we will send you a real reset link.</p>
          <form onsubmit="event.preventDefault(); doForgotPassword()">
            <div class="field-float"><input type="email" id="fp-email" placeholder=" " onblur="validateField('fp-email')"><label>Email address</label><div class="field-err" id="fp-email-err"></div></div>
            <button class="btn btn-primary btn-full" type="submit" id="fp-btn">Send Reset Link</button>
          </form>
        </div>
        <div class="reset-sent" id="forgot-sent" style="display:none">
          <h2 class="modal-title">Check your inbox</h2>
          <p class="modal-subtitle">A reset link was sent to <strong id="forgot-sent-email" style="color:var(--accent)"></strong></p>
          <button class="btn btn-primary btn-full" onclick="showSignin()">Back to Sign In</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-premium">
      <div class="modal modal-center">
        <button class="modal-close" onclick="closeAllModals()">×</button>
        <div id="premium-step-perks">
          <h2 class="modal-title">Upgrade to Premium</h2>
          <p class="modal-subtitle">Unlock the full IBlog experience.</p>
          <ul class="perk-list">
            <li>Article templates with editorial structure</li>
            <li>Global Trend Map with country-level reading context</li>
            <li>Priority tools and richer personalization</li>
            <li>Premium profile badge and advanced insights</li>
          </ul>
          <button class="btn btn-premium btn-full" onclick="showPayment()">Continue — $9/month</button>
        </div>
        <div id="premium-step-payment" style="display:none">
          <h2 class="modal-title" style="margin-bottom:4px">Payment</h2>
          <p class="modal-subtitle" style="margin-bottom:20px">Choose card checkout or D17 wallet confirmation.</p>
          <div class="pay-tabs">
            <button class="pay-tab active" onclick="switchPayTab(this,'card')">Card</button>
            <button class="pay-tab" onclick="switchPayTab(this,'d17')">D17 Wallet</button>
          </div>
          <div id="pay-card">
            <div class="field-float"><input type="text" id="pay-name" placeholder=" "><label>Cardholder Name</label></div>
            <div class="field-float"><input type="text" placeholder=" " maxlength="19" id="pay-number" oninput="formatCard(this)"><label>Card Number</label></div>
            <div class="form-row">
              <div class="field-float"><input type="text" placeholder=" " maxlength="7" id="pay-expiry" oninput="formatExpiry(this)"><label>Expiry MM/YY</label></div>
              <div class="field-float"><input type="text" placeholder=" " maxlength="4" id="pay-cvv"><label>CVV</label></div>
            </div>
            <div class="pay-summary"><span>Total</span><strong id="pay-total">$9.00 / month</strong></div>
            <button class="btn btn-premium btn-full" onclick="doPayment()">Pay $9.00</button>
          </div>
          <div id="pay-d17" style="display:none">
            <div class="pay-wallet-card">
              <strong>Pay with D17</strong>
              <p>We create a payment request tied to your subscription, then you validate it in the D17 ecosystem using your merchant flow.</p>
              <ol class="pay-wallet-steps">
                <li>Tap confirm below to create the payment reference.</li>
                <li>Approve the request in your D17-enabled checkout flow.</li>
                <li>Your Premium access activates as soon as the payment is confirmed.</li>
              </ol>
            </div>
            <div class="pay-summary"><span>Total</span><strong>$9.00 / month</strong></div>
            <button class="btn btn-d17 btn-full" onclick="doPayment()">Continue with D17</button>
          </div>
          <button class="back-btn" onclick="showPerks()">Back</button>
        </div>
        <div id="premium-step-success" style="display:none;text-align:center">
          <h2 class="modal-title">You are Premium</h2>
          <p class="modal-subtitle">Your access is active and the confirmation email is on its way.</p>
        </div>
      </div>
    </div>`;
  }

  window.IBlog = window.IBlog || {};
  IBlog.Auth = {
    showSignup: () => window.showSignup(),
    showSignin: () => window.showSignin(),
    showPremium: () => window.showPremium(),
    demoLogin: plan => window.demoLogin(plan),
  };
})();
