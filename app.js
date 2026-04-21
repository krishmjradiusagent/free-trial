const STORAGE_KEY = 'radius-free-trial-app-v2';
const HERO_IMAGE = './landing-hero.png';
const SIDEBAR_IMAGE = 'file:///Users/radius/Downloads/Side%20bar.png';
const CITY_OPTIONS = ['Austin, TX', 'Houston, TX', 'Dallas, TX', 'Atlanta, GA', 'New York, NY', 'Miami, FL', 'Los Angeles, CA', 'San Antonio, TX'];
const MLS_OPTIONS = ['California Regional MLS', 'Combined L.A./Westside MLS', 'Bay East MLS', 'Houston Association of Realtors', 'Austin Board of Realtors', 'San Antonio Board of Realtors', 'Georgia MLS', 'First Multiple Listing Service (Atlanta)', 'New York MLS', 'OneKey MLS', 'Miami MLS', 'Dallas-Fort Worth Metrotex', 'North Texas Real Estate Information Systems'];
const MLS_BY_CITY = {
  'Austin, TX': ['Austin Board of Realtors', 'Houston Association of Realtors', 'San Antonio Board of Realtors'],
  'Houston, TX': ['Houston Association of Realtors', 'Austin Board of Realtors', 'Dallas-Fort Worth Metrotex'],
  'Dallas, TX': ['Dallas-Fort Worth Metrotex', 'North Texas Real Estate Information Systems', 'Austin Board of Realtors'],
  'Atlanta, GA': ['Georgia MLS', 'First Multiple Listing Service (Atlanta)', 'OneKey MLS'],
  'New York, NY': ['New York MLS', 'OneKey MLS', 'California Regional MLS'],
  'Miami, FL': ['Miami MLS', 'Georgia MLS', 'California Regional MLS'],
  'Los Angeles, CA': ['California Regional MLS', 'Combined L.A./Westside MLS', 'Bay East MLS'],
  'San Antonio, TX': ['San Antonio Board of Realtors', 'Austin Board of Realtors', 'Houston Association of Realtors'],
};

const PHASES = [
  { id: 1, name: 'Basic details', note: 'Login email and identity.' },
  { id: 2, name: 'Business details', note: 'Brokerage, team, MLS.' },
  { id: 3, name: 'Dashboard overview', note: 'Full dashboard shell and activation hub.' },
  { id: 4, name: 'Team + phone + app', note: 'Provision the workspace.' },
  { id: 5, name: 'Activation hub', note: 'Mel and first value.' },
  { id: 6, name: 'Day 7 paywall', note: 'Billing and premium lock.' },
];

const ONBOARDING_STEPS = [
  { id: 1, name: 'Basic details' },
  { id: 2, name: 'Verify code' },
  { id: 3, name: 'Business details' },
];

const DEFAULT_STATE = {
  view: 'landing',
  phase: 1,
  form: {
    name: '',
    email: '',
    phone: '',
    brokerage: '',
    city: [],
    teamMode: 'solo',
    teamSize: '',
    mls: '',
  },
  clients: [],
  invites: ['agent.team@radius.ai'],
  actions: {
    loginSent: false,
    emailOpened: false,
    trialStarted: false,
    csvImported: false,
    phoneReady: false,
    melOpened: false,
    billingComplete: false,
  },
  ui: {
    loading: false,
    message: null,
    messageType: 'success',
    modal: null,
    sheet: null,
    dirtySheet: false,
    selectedClient: null,
    showMobileFlow: false,
    currentPrompt: null,
    authStage: 'details',
    resendIn: 0,
    otpDigits: ['', '', '', ''],
    cityOpen: false,
    cityQuery: '',
    mlsOpen: false,
    mlsQuery: '',
    activationTask: 2,
    activationClientsSaved: false,
    activationRulesReady: false,
    activationCallsReady: false,
    activationSaveSuccess: false,
    activationTestDriveUsed: false,
    callNotesClientId: null,
    csvFileName: '',
    csvError: '',
    chatDraft: '',
    prospectingDraft: '',
    activationDraftClients: [
      { name: '', email: '', phone: '' },
      { name: '', email: '', phone: '' },
      { name: '', email: '', phone: '' },
    ],
  },
};

const MOCK_API = {
  sendLoginEmail: async (payload) => delay({ ok: true, token: `login_${payload.email}` }, 450),
  startTrial: async (payload) => delay({ ok: true, trialId: `trial_${payload.email}` }, 450),
  addClient: async (payload) => delay({ ok: true, client: { id: cryptoId(), name: payload.name, source: payload.source } }, 300),
  importCsv: async (payload) => delay({ ok: true, imported: payload.rows }, 420),
  generatePhone: async () => delay({ ok: true, phone: '+1 (512) 555-0148' }, 380),
  openMel: async () => delay({ ok: true, summary: 'First useful win' }, 300),
  createPayment: async () => delay({ ok: true, payment: 'active' }, 520),
};

const storage = createStorage();
const state = loadState();
const root = document.getElementById('app');

window.RadiusTrialApp = {
  setApi(nextApi) {
    window.RadiusTrialApi = nextApi;
  },
  reset() {
    storage.removeItem(STORAGE_KEY);
    window.location.reload();
  },
};

function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}

function getApi() {
  return window.RadiusTrialApi || MOCK_API;
}

function delay(value, ms) {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), ms));
}

function createStorage() {
  try {
    const probe = '__radius_trial_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    };
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  }
}

function loadState() {
  try {
    const boot = getBootOverrides();
    if (boot.reset) storage.removeItem(STORAGE_KEY);
    const raw = storage.getItem(STORAGE_KEY);
    const next = raw ? mergeState(DEFAULT_STATE, JSON.parse(raw)) : clone(DEFAULT_STATE);
    next.view = boot.view || 'landing';
    next.phase = boot.phase || 1;
    if (next.phase === 3 || next.phase === 5) resetDashboardQuickSteps(next);
    next.ui.cityOpen = false;
    next.ui.mlsOpen = false;
    return next;
  } catch {
    const boot = getBootOverrides();
    const next = clone(DEFAULT_STATE);
    next.view = boot.view || 'landing';
    next.phase = boot.phase || 1;
    if (next.phase === 3 || next.phase === 5) resetDashboardQuickSteps(next);
    next.ui.cityOpen = false;
    next.ui.mlsOpen = false;
    return next;
  }
}

function resetDashboardQuickSteps(next) {
  next.clients = [];
  next.actions.csvImported = false;
  next.actions.melOpened = false;
  next.ui.activationTask = 2;
  next.ui.activationClientsSaved = false;
  next.ui.activationRulesReady = false;
  next.ui.activationCallsReady = false;
  next.ui.activationSaveSuccess = false;
  next.ui.activationTestDriveUsed = false;
  next.ui.callNotesClientId = null;
  next.ui.csvFileName = '';
  next.ui.csvError = '';
  next.ui.chatDraft = '';
  next.ui.prospectingDraft = '';
  next.ui.selectedClient = null;
  next.ui.sheet = null;
  next.ui.dirtySheet = false;
}

function getBootOverrides() {
  try {
    const params = new URLSearchParams(window.location.search);
    const phaseRaw = Number(params.get('phase'));
    const phase = Number.isFinite(phaseRaw) && phaseRaw >= 1 && phaseRaw <= 6 ? phaseRaw : null;
    const view = params.get('view') === 'onboarding' ? 'onboarding' : null;
    const reset = params.get('reset') === '1';
    return { phase, view, reset };
  } catch {
    return { phase: null, view: null, reset: false };
  }
}

function mergeState(base, incoming) {
  const next = incoming || {};
  return {
    ...clone(base),
    ...next,
    form: { ...base.form, ...(next.form || {}) },
    actions: { ...base.actions, ...(next.actions || {}) },
    ui: { ...base.ui, ...(next.ui || {}) },
    clients: Array.isArray(next.clients) ? next.clients : [],
    invites: Array.isArray(next.invites) ? next.invites : [],
  };
}

function persist() {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // file:// and locked-down shells may reject storage.
  }
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function setState(patch) {
  Object.assign(state, patch);
  persist();
  render();
}

function updateState(mutator) {
  mutator(state);
  persist();
  render();
}

function captureFocusState() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  const key = active.getAttribute('data-focus-key');
  if (!key) return null;
  return {
    key,
    start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
    end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
  };
}

function restoreFocusState(snapshot) {
  if (!snapshot) return;
  const next = document.querySelector(`[data-focus-key="${snapshot.key}"]`);
  if (!next || typeof next.focus !== 'function') return;
  next.focus({ preventScroll: true });
  if (typeof next.setSelectionRange === 'function' && snapshot.start != null && snapshot.end != null) {
    next.setSelectionRange(snapshot.start, snapshot.end);
  }
}

function setMessage(message, type = 'success') {
  state.ui.message = message;
  state.ui.messageType = type;
  persist();
  render();
  window.clearTimeout(window.__radiusToastTimer);
  window.__radiusToastTimer = window.setTimeout(() => {
    state.ui.message = null;
    persist();
    render();
  }, 3200);
}

function h(tag, attrs = {}, ...children) {
  const svgTags = new Set(['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g']);
  const el = svgTags.has(tag)
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('data-')) el.setAttribute(key, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach((n) => n && el.append(n.nodeType ? n : document.createTextNode(String(n))));
    else el.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return el;
}

function button(label, className, onClick, attrs = {}) {
  return h('button', { class: `btn ${className}`, type: 'button', onClick, ...attrs }, label);
}

function badge(label, kind = 'default') {
  return h('span', { class: `pill ${kind}` }, h('span', { class: 'dot' }), label);
}

function renderLanding() {
  return h('div', { class: 'landing landing-image-mode' },
    h('button', {
      class: 'landing-canvas',
      type: 'button',
      'aria-label': 'Open free trial onboarding',
      onClick: () => {
        updateState((s) => {
          s.view = 'onboarding';
          s.phase = 1;
          s.ui.message = null;
        });
      },
    },
      h('img', {
        class: 'landing-image',
        src: HERO_IMAGE,
        alt: 'Radius free trial landing page',
      }),
      h('div', { class: 'landing-overlay' },
        h('div', { class: 'landing-hint' },
          h('div', { class: 'eyebrow' }, 'Free trial app'),
          h('strong', {}, 'Click anywhere to start phase 1'),
          h('span', {}, 'This uses the real marketing screen as the entry surface.')
        )
      )
    )
  );
}

function infoCard(label, title, copy) {
  return h('article', { class: 'info-card' },
    h('div', { class: 'label' }, label),
    h('h3', {}, title),
    h('p', {}, copy)
  );
}

function renderOnboarding() {
  const dashboardMode = state.phase === 3 || state.phase === 5;
  return h('div', { class: `onboarding onboarding-focus ${dashboardMode ? 'dashboard-mode' : ''}`.trim() },
    h('main', { class: `trial-focus-shell ${dashboardMode ? 'dashboard-shell' : ''}`.trim() },
      h('article', { class: `stage trial-stage ${dashboardMode ? 'dashboard-stage' : ''}`.trim() },
        h('div', { class: 'screen screen-single' },
          h('div', { class: 'screen-main screen-main-clean' }, renderStageBody(state.phase))
        )
      )
    )
  );
}

function renderPhaseStepper() {
  return h('div', { class: 'phase-stepper' },
    ...PHASES.map((phase) => h('button', {
      class: `phase-dot ${phase.id === state.phase ? 'active' : ''} ${phase.id < state.phase ? 'done' : ''}`,
      type: 'button',
      onClick: () => setPhase(phase.id),
      title: phase.name,
      'aria-label': phase.name,
    },
      h('span', { class: 'phase-dot-index' }, String(phase.id).padStart(2, '0')),
      h('span', { class: 'phase-dot-name' }, phase.name)
    ))
  );
}

function getStageTitle(phase) {
  return {
    1: 'Send login email first.',
    2: 'Business details set the trial.',
    3: 'Turn emptiness into motion.',
    4: 'Move from setup to usage.',
    5: 'Teach by doing, not touring.',
    6: 'Conversion needs a hard edge.',
  }[phase] || 'Skeleton first. Layout locked.';
}

function getStageCopy(phase) {
  return {
    1: 'Minimal identity capture. Then business profiling to shape the next step.',
    2: 'Ask only what the trial needs and keep the business setup calm.',
    3: 'The clients screen should explain why the list matters immediately.',
    4: 'Invites, phone provisioning, and app download bridge setup to usage.',
    5: 'The activation hub should feel like the first useful screen, not a tour.',
    6: 'The Day 7 paywall should be direct, calm, and unambiguous.',
  }[phase] || 'Build the shell before the logic. The experience should already feel complete.';
}

function getStatusCopy(phase, current) {
  if (phase === 1) return current.actions.loginSent ? 'Login sent' : 'Login email ready';
  if (phase === 2) return current.actions.trialStarted ? 'Trial started' : 'Business setup';
  if (phase === 3) return `${current.clients.length} client${current.clients.length === 1 ? '' : 's'}`;
  if (phase === 4) return current.actions.phoneReady ? 'Provisioned' : 'Provisioning';
  if (phase === 5) return current.actions.melOpened ? 'Aha in reach' : 'Activation hub';
  if (phase === 6) return current.actions.billingComplete ? 'Paid' : 'Billing required';
  return 'Skeleton state';
}

function getGoalCopy(phase) {
  return {
    1: 'Identity step',
    2: 'Trial start',
    3: '3 to 5 clients',
    4: 'First login pending',
    5: 'First value',
    6: 'Transactions locked',
  }[phase] || 'Shell';
}

function renderRail(progress) {
  const list = h('div', { class: 'rail-card' },
    h('h4', {}, 'Progress rail'),
    h('p', { class: 'small' }, 'A calm checklist keeps the user oriented while the flow advances.'),
    h('div', { class: 'progress', style: { marginTop: '12px' } }, h('span', { style: { width: `${progress}%` } })),
    h('div', { class: 'progress-label' }, `${progress}% complete`)
  );

  const checklist = h('div', { class: 'rail-card' },
    h('h4', {}, 'Checklist'),
    h('div', { class: 'checklist' },
      ...railItems().map(({ label, copy, status }) => h('div', { class: `check ${status}` },
        h('span', { class: 'dot' }),
        h('div', {},
          h('strong', {}, label),
          h('span', {}, copy)
        )
      ))
    )
  );

  const rules = h('div', { class: 'rail-card' },
    h('h4', {}, 'Design rules'),
    h('div', { class: 'small' }, 'One primary action per screen. Short copy. #5A5FF2 only as accent and state.')
  );

  return h('div', {}, list, checklist, rules);
}

function railItems() {
  switch (state.phase) {
    case 1:
      return [
        { label: 'Basic details', copy: state.actions.loginSent ? 'Complete.' : 'Login email ready.', status: state.actions.loginSent ? 'done' : 'active' },
        { label: 'Business profile', copy: 'Brokerage and MLS captured.', status: state.actions.loginSent ? 'active' : 'todo' },
        { label: 'Clients', copy: 'Still waiting.', status: 'todo' },
      ];
    case 2:
      return [
        { label: 'Basic details', copy: 'Complete.', status: 'done' },
        { label: 'Business profile', copy: state.actions.trialStarted ? 'Complete.' : 'Trial start in progress.', status: state.actions.trialStarted ? 'done' : 'active' },
        { label: 'Clients', copy: 'Need 3 to 5.', status: 'active' },
      ];
    case 3:
      return [
        { label: 'Setup', copy: 'Done.', status: 'done' },
        { label: 'Clients', copy: `${state.clients.length} added.`, status: state.clients.length >= 3 ? 'done' : 'active' },
        { label: 'Mel', copy: 'Unlocks after threshold.', status: 'todo' },
      ];
    case 4:
      return [
        { label: 'Clients', copy: 'Threshold met.', status: 'done' },
        { label: 'Team and phone', copy: state.actions.phoneReady ? 'Provisioned.' : 'Provisioning in progress.', status: state.actions.phoneReady ? 'done' : 'active' },
        { label: 'App', copy: 'Download and first login.', status: 'todo' },
      ];
    case 5:
      return [
        { label: 'Provisioning', copy: 'Complete.', status: 'done' },
        { label: 'Mel', copy: state.actions.melOpened ? 'Open the assistant.' : 'Activation hub.', status: state.actions.melOpened ? 'done' : 'active' },
        { label: 'Proof', copy: 'Show a believable win.', status: 'todo' },
      ];
    case 6:
      return [
        { label: 'Activation', copy: 'Done.', status: 'done' },
        { label: 'Billing', copy: state.actions.billingComplete ? 'Card added.' : 'Card required.', status: state.actions.billingComplete ? 'done' : 'active' },
        { label: 'Transactions', copy: 'Premium add-on.', status: 'todo' },
      ];
    default:
      return [
        { label: 'Shell', copy: 'Desktop rail and mobile stack.', status: 'active' },
        { label: 'States', copy: 'Loading, empty, success, error.', status: 'todo' },
        { label: 'Accent', copy: '#5A5FF2 only as meaning.', status: 'todo' },
      ];
  }
}

function phaseButton(phase) {
  const active = state.phase === phase.id;
  const el = h('button', {
    class: `phase-btn ${active ? 'active' : ''}`,
    type: 'button',
    'aria-selected': active,
    onClick: () => setPhase(phase.id),
  },
    h('span', { class: 'phase-kicker' }, `Phase ${phase.id}`),
    h('span', { class: 'phase-name' }, phase.name),
    h('span', { class: 'phase-note' }, phase.note)
  );
  return el;
}

function setPhase(phase) {
  updateState((s) => {
    s.phase = phase;
    s.view = 'onboarding';
    s.ui.modal = null;
    s.ui.sheet = null;
  });
}

function setView(view) {
  updateState((s) => {
    s.view = view;
    s.ui.modal = null;
    s.ui.sheet = null;
  });
}

function renderStageBody(phase) {
  switch (phase) {
    case 1:
      return renderBasicDetails();
    case 2:
      return renderBusinessDetails();
    case 3:
      return renderActivationHub();
    case 4:
      return renderTeamPhoneApp();
    case 5:
      return renderActivationHub();
    case 6:
      return renderPaywall();
    default:
      return renderSkeleton();
  }
}

function renderSkeleton() {
  return h('div', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', {}, h('h3', { class: 'section-title' }, 'Skeleton first. Layout locked.'), h('p', { class: 'section-copy' }, 'Build the shell before the logic.')),
      h('span', { class: 'pill primary' }, h('span', { class: 'dot' }), 'Skeleton')
    ),
    h('div', { class: 'section-body' },
      h('div', { class: 'grid-2' },
        infoCard('Loading', 'Reserve space. Avoid jumps.', 'Skeleton rows, not flashy loaders.'),
        infoCard('Empty', 'No dead ends. Empty should move the user.', 'Add clients to unlock Mel.')
      )
    )
  );
}

function renderBasicDetails() {
  return h('div', { class: 'auth-shell' },
    h('aside', { class: 'trust-panel trust-panel-dark' },
      h('div', { class: 'trust-inner trust-inner-dark' },
        h('div', { class: 'trust-label trust-label-dark' }, 'Trusted by modern brokerages'),
        h('h2', { class: 'trust-title trust-title-dark' },
          h('span', { class: 'trust-title-line' }, 'Teams already closing deals '),
          h('span', { class: 'trust-title-line' }, 'on Radius')
        ),
        h('div', { class: 'trust-logo-grid trust-logo-grid-dark' },
          trustLogo('Aspire', 'spire'),
          trustLogo('Dogwood', 'book'),
          trustLogo('Milieu Homes', 'frame'),
          trustLogo('Rise Group', 'arc')
        ),
        renderPhaseOneFeatureRail()
      )
    ),
    h('section', { class: 'auth-panel auth-panel-surface' },
      h('div', { class: 'auth-panel-inner' },
        renderOnboardingStepper(getOnboardingStep()),
        h('div', { class: 'auth-copy' },
          h('h1', { class: 'auth-title auth-title-surface' },
            h('span', { class: 'auth-title-line' }, 'Create your'),
            h('span', { class: 'auth-title-line' }, 'Radius workspace')
          ),
          h('p', { class: 'auth-subtitle auth-subtitle-surface' }, 'Start with your details. We’ll send a secure login email and code, then open straight into your brokerage setup.')
        ),
        state.ui.authStage === 'otp' ? renderAuthCodeState() : renderAuthDetailsState(),
        h('div', { class: 'auth-footnote auth-footnote-surface' }, 'Used only for secure access and workspace setup.')
      )
    )
  );
}

function renderAuthDetailsState() {
  return h('div', { class: 'auth-stack' },
    h('div', { class: 'auth-form-grid auth-form-grid-surface' },
      field('Full name', 'name', state.form.name, 'Samantha Lee', 'light'),
      field('Work email', 'email', state.form.email, 'samantha@radius.ai', 'light'),
      field('Phone number', 'phone', state.form.phone, '(512) 555-0191', 'light')
    ),
    h('div', { class: 'auth-actions' },
      button('Sign up', 'btn-primary auth-primary', sendLoginEmail, { disabled: state.ui.loading })
    )
  );
}

function renderAuthCodeState() {
  return h('div', { class: 'auth-stack' },
    h('div', { class: 'auth-code-card auth-code-card-surface' },
      h('div', { class: 'auth-code-copy' },
        h('strong', {}, `Code sent to ${state.form.email || 'your email'}`),
        h('span', {}, 'Enter the 4-digit code to continue.')
      ),
      h('div', { class: 'otp-grid', role: 'group', 'aria-label': '4 digit code' },
        ...state.ui.otpDigits.map((digit, index) => h('input', {
          class: 'input otp-input',
          value: digit,
          inputmode: 'numeric',
          maxlength: '1',
          autocomplete: index === 0 ? 'one-time-code' : 'off',
          'aria-label': `Digit ${index + 1}`,
          onInput: (event) => setOtpDigit(index, event.target.value),
          onKeydown: (event) => handleOtpKeydown(event, index),
        }))
      ),
      h('div', { class: 'auth-helper-row auth-helper-row-surface' },
        h('span', { class: 'helper-text helper-text-surface' }, state.ui.resendIn > 0 ? 'Resend code in 30s' : 'Resend code available'),
        button('Resend code', 'btn-secondary', sendLoginEmail, { disabled: state.ui.loading || state.ui.resendIn > 0 })
      )
    ),
    h('div', { class: 'auth-actions' },
      button('Verify code', 'btn-primary auth-primary', verifyLoginCode, { disabled: state.ui.loading })
    )
  );
}

function trustLogo(name, mark) {
  return h('div', { class: 'trust-logo' },
    h('div', { class: `trust-logo-mark ${mark}` },
      h('span', { class: 'trust-logo-mark-core' })
    ),
    h('div', { class: 'trust-logo-name' }, name)
  );
}

function trustCard(title, copy) {
  return h('div', { class: 'trust-card' },
    h('strong', {}, title),
    h('span', {}, copy)
  );
}

function renderPhaseOneFeatureRail() {
  return h('div', { class: 'trust-feature-rail' },
    h('div', { class: 'trust-feature-label' }, 'FEATURES'),
    h('div', { class: 'trust-feature-list' },
      trustFeatureCard('AI agents', 'AI prospecting, AI summarize client, Post call notes, CMA report, Property recommendations', aiFeatureSvg(), false, 'trust-feature-icon-infinity'),
      trustFeatureCard('CRM management', 'Auditing keeps every update traceable across the workspace.', crmFeatureSvg()),
      trustFeatureCard('Client communication', 'Radius chats, SMS, and your business number keep every conversation in one place.', chatFeatureSvg())
    )
  );
}

function trustFeatureCard(title, copy, icon, highlighted = false, iconClass = '') {
  return h('div', { class: `trust-feature-card ${highlighted ? 'active' : ''}` },
    h('div', { class: 'trust-feature-head' },
      h('span', { class: `trust-feature-icon ${iconClass}`.trim(), 'aria-hidden': 'true' }, icon),
      h('strong', { class: 'trust-feature-title' }, title)
    ),
    h('span', { class: 'trust-feature-copy' }, copy)
  );
}

function aiFeatureSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      d: 'M5.2 10c0-1.52 1.03-2.6 2.35-2.6 1.13 0 1.84.73 2.91 2.06 1.14 1.44 1.97 2.54 3.42 2.54 1.38 0 2.32-1.08 2.32-2.5S15.26 7 13.88 7c-1.13 0-1.85.72-2.92 2.05C9.82 10.49 9 11.6 7.55 11.6 6.23 11.6 5.2 10.52 5.2 9',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2.05',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    })
  );
}

function crmFeatureSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('rect', { x: '3', y: '4', width: '14', height: '12', rx: '3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
    h('path', { d: 'M6.5 8.2h7M6.5 11.8h5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function chatFeatureSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M5.5 5.5h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H10l-3.2 2.5V14.5h-1.3a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M7 9.8h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function getOnboardingStep() {
  if (state.phase >= 2) return 3;
  if (state.ui.authStage === 'otp') return 2;
  return 1;
}

function renderOnboardingStepper(activeStep) {
  const active = ONBOARDING_STEPS.find((step) => step.id === activeStep) || ONBOARDING_STEPS[0];
  return h('div', { class: 'onboarding-stepper', 'aria-label': `Step ${activeStep} of 3` },
    h('div', { class: 'onboarding-stepper-head' },
      h('span', { class: 'onboarding-stepper-badge' }, `Step ${active.id}`),
      h('span', { class: 'onboarding-stepper-count' }, `${active.id} of 3`)
    ),
    h('div', { class: 'onboarding-stepper-bars' },
      ...ONBOARDING_STEPS.map((step) => h('span', {
        class: `onboarding-stepper-bar ${step.id < activeStep ? 'done' : ''} ${step.id === activeStep ? 'active' : ''}`,
      }))
    ),
    h('div', { class: 'onboarding-stepper-title' }, active.name)
  );
}

function renderBusinessDetails() {
  return h('div', { class: 'business-shell' },
    h('aside', { class: 'business-rail' },
      h('div', { class: 'rail-kicker' }, 'FINISH LINE'),
      h('h3', { class: 'rail-title' }, "You're almost there."),
      h('p', { class: 'rail-copy' }, "Tell us a bit about your business to tailor your workspace. Once complete, you'll jump straight into your dashboard to meet Mel AI."),
      h('div', { class: 'rail-unlocks' },
        unlockItem('Personalized CRM'),
        unlockItem('AI Prospecting'),
        unlockItem('Instant Setup')
      )
    ),
    h('section', { class: 'business-panel' },
      renderOnboardingStepper(3),
      h('h2', { class: 'business-title' }, 'Business details'),
      h('div', { class: 'business-form-stack' },
        h('div', { class: 'business-form-grid' },
          field('BROKERAGE NAME', 'brokerage', state.form.brokerage, 'Radius Realty Group'),
          renderCityDropdown()
        ),
        h('div', { class: 'field team-field' },
          h('span', { class: 'field-label field-label-radius' }, 'WORKSTYLE'),
          segmented([
            ['solo', 'Solo'],
            ['team', 'Team'],
          ], state.form.teamMode, (value) => {
            updateState((s) => {
              s.form.teamMode = value;
            });
          }),
          h('div', { class: `team-size-inline ${state.form.teamMode === 'team' ? 'open' : ''}` },
            h('div', { class: 'team-size-inner' }, field('TEAM SIZE', 'teamSize', state.form.teamSize, '6'))
          )
        ),
        renderMlsDropdown()
      ),
      h('div', { class: 'business-footer' },
        button(state.actions.trialStarted ? 'View Dashboard' : 'Start 7-day free trial', 'btn-primary business-cta', startTrial, { disabled: state.ui.loading }),
        h('div', { class: 'business-footer-note' }, 'Free trial starts after brokerage, city, and MLS are set.')
      ),
      h('div', { class: 'business-trust-badge' },
        h('span', { class: 'business-trust-icon', 'aria-hidden': 'true' }, lockSvg()),
        h('span', { class: 'business-trust-text' }, 'Secure & Encrypted')
      )
    )
  );
}

function unlockItem(text) {
  return h('div', { class: 'unlock-item' }, h('span', { class: 'unlock-check', 'aria-hidden': 'true' }, '✓'), h('span', {}, text));
}

function renderCityDropdown() {
  const selectedCities = getSelectedCities();
  const options = filterOptions(CITY_OPTIONS, state.ui.cityQuery);
  return h('div', { class: 'field dropdown-field' },
    h('span', { class: 'field-label field-label-radius' }, 'CITY'),
    h('div', { class: 'dropdown-shell' },
      h('button', {
        class: 'dropdown-trigger dropdown-trigger-field',
        type: 'button',
        onClick: () => {
          updateState((s) => {
            s.ui.cityOpen = !s.ui.cityOpen;
            s.ui.mlsOpen = false;
            s.ui.cityQuery = '';
          });
        },
      },
        h('span', { class: `dropdown-trigger-value ${selectedCities.length ? 'filled' : ''}` }, formatSelectedCities(selectedCities)),
        h('span', { class: 'dropdown-trigger-icon', 'aria-hidden': 'true' }, chevronSvg())
      ),
      state.ui.cityOpen ? h('div', { class: 'dropdown-menu dropdown-menu-tight' },
        h('div', { class: 'dropdown-option-list' },
          ...options.map((option) => h('button', {
            class: `dropdown-option ${selectedCities.includes(option) ? 'selected' : ''}`,
            type: 'button',
            onClick: () => selectCity(option),
          },
            h('span', { class: 'dropdown-option-leading', 'aria-hidden': 'true' }, checkboxSvg(selectedCities.includes(option))),
            h('span', { class: 'dropdown-option-label' }, option),
            h('span', { class: 'dropdown-option-check', 'aria-hidden': 'true' }, selectedCities.includes(option) ? checkSvg() : null)
          ))
        )
      ) : null
    )
  );
}

function renderMlsDropdown() {
  const selected = getSelectedMls();
  const options = filterOptions(getMlsOptionsForCity(), state.ui.mlsQuery);
  return h('div', { class: 'field dropdown-field mls-field' },
    h('span', { class: 'field-label field-label-radius' }, 'MLS SEARCH'),
    selected.length ? h('div', { class: 'mls-pill-row' },
      ...selected.map((item) => h('button', {
        class: 'mls-pill',
        type: 'button',
        onClick: () => toggleMls(item),
      },
        h('span', { class: 'mls-pill-text' }, item),
        h('span', { class: 'mls-pill-close', 'aria-hidden': 'true' }, '×')
      ))
    ) : null,
    h('div', { class: 'dropdown-shell' },
      h('button', {
        class: 'dropdown-trigger dropdown-trigger-search',
        type: 'button',
        onClick: () => {
          updateState((s) => {
            s.ui.mlsOpen = !s.ui.mlsOpen;
            s.ui.cityOpen = false;
            s.ui.mlsQuery = '';
          });
        },
      },
        h('span', { class: 'field-shell-leading', 'aria-hidden': 'true' }, searchSvg()),
        h('span', { class: `dropdown-trigger-value ${selected.length ? 'filled' : ''}` }, selected.length ? `${selected.length} MLS selected` : 'Search MLS regions'),
        h('span', { class: 'dropdown-trigger-icon', 'aria-hidden': 'true' }, chevronSvg())
      ),
      state.ui.mlsOpen ? h('div', { class: 'dropdown-menu' },
        h('label', { class: 'field-shell field-shell-radius field-shell-inline dropdown-search-row' },
          h('span', { class: 'field-shell-leading', 'aria-hidden': 'true' }, searchSvg()),
          h('input', {
            class: 'input input-inline dropdown-search-input',
            value: state.ui.mlsQuery,
            placeholder: 'Search MLS regions',
            onInput: (event) => updateState((s) => { s.ui.mlsQuery = event.target.value; }),
          })
        ),
        h('div', { class: 'dropdown-option-list' },
          ...options.map((option) => {
            const selectedOption = selected.includes(option);
            return h('button', {
              class: `dropdown-option ${selectedOption ? 'selected' : ''}`,
              type: 'button',
              onClick: () => toggleMls(option),
            },
              h('span', { class: 'dropdown-option-leading', 'aria-hidden': 'true' }, checkboxSvg(selectedOption)),
              h('span', { class: 'dropdown-option-label' }, option),
              h('span', { class: 'dropdown-option-check', 'aria-hidden': 'true' }, selectedOption ? checkSvg() : null)
            );
          }),
          !options.length ? h('div', { class: 'note' }, 'No MLS regions match this city yet.') : null
        )
      ) : null
    )
  );
}

function fieldWithIcon(label, key, value, placeholder, iconNode, hasTrailing = false) {
  return h('label', { class: 'field field-icon-shell' },
    h('span', { class: 'field-label field-label-radius' }, label),
    h('div', { class: 'field-shell field-shell-radius field-shell-inline' },
      iconNode ? h('span', { class: 'field-shell-leading', 'aria-hidden': 'true' }, iconNode) : null,
      h('input', {
        class: 'input input-radius input-inline',
        value,
        placeholder,
        onInput: (event) => updateField(key, event.target.value),
      }),
      hasTrailing ? h('span', { class: 'field-shell-icon field-shell-icon-inline', 'aria-hidden': 'true' }, chevronSvg()) : null
    )
  );
}

function searchSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('circle', { cx: '11', cy: '11', r: '7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
    h('path', { d: 'm20 20-3.5-3.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' })
  );
}

function chevronSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'm6 9 6 6 6-6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function checkSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'm20 6-11 11-5-5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function checkboxSvg(checked = false) {
  return h('span', { class: `checkbox-ui ${checked ? 'checked' : ''}` },
    checked ? h('span', { class: 'checkbox-ui-icon', 'aria-hidden': 'true' }, checkSvg()) : null
  );
}

function lockSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('rect', { x: '4', y: '11', width: '16', height: '10', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
    h('path', { d: 'M8 11V7a4 4 0 0 1 8 0v4', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function filterOptions(options, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return options;
  return options.filter((option) => option.toLowerCase().includes(needle));
}

function getSelectedMls() {
  if (Array.isArray(state.form.mls)) return state.form.mls;
  if (typeof state.form.mls === 'string' && state.form.mls.trim()) {
    return state.form.mls.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function getSelectedCities() {
  if (Array.isArray(state.form.city)) return state.form.city;
  if (typeof state.form.city === 'string' && state.form.city.trim()) {
    return state.form.city.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function formatSelectedCities(selectedCities) {
  if (!selectedCities.length) return 'Select city';
  if (selectedCities.length === 1) return selectedCities[0];
  return `${selectedCities.length} cities selected`;
}

function getMlsOptionsForCity() {
  const selectedCities = getSelectedCities();
  if (!selectedCities.length) return MLS_OPTIONS;
  const next = selectedCities.flatMap((city) => MLS_BY_CITY[city] || []);
  return [...new Set(next)];
}

function selectCity(option) {
  updateState((s) => {
    const selectedCities = Array.isArray(s.form.city)
      ? [...s.form.city]
      : (typeof s.form.city === 'string' && s.form.city.trim()
        ? s.form.city.split(',').map((item) => item.trim()).filter(Boolean)
        : []);
    const nextCities = selectedCities.includes(option)
      ? selectedCities.filter((item) => item !== option)
      : [...selectedCities, option];
    s.form.city = nextCities;
    const allowed = nextCities.length
      ? [...new Set(nextCities.flatMap((city) => MLS_BY_CITY[city] || []))]
      : MLS_OPTIONS;
    const currentMls = Array.isArray(s.form.mls)
      ? [...s.form.mls]
      : (typeof s.form.mls === 'string' && s.form.mls.trim()
        ? s.form.mls.split(',').map((item) => item.trim()).filter(Boolean)
        : []);
    s.form.mls = currentMls.filter((item) => allowed.includes(item));
  });
}

function toggleMls(option) {
  updateState((s) => {
    const selected = Array.isArray(s.form.mls)
      ? [...s.form.mls]
      : (typeof s.form.mls === 'string' && s.form.mls.trim()
        ? s.form.mls.split(',').map((item) => item.trim()).filter(Boolean)
        : []);
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    s.form.mls = next;
  });
}

function renderClients() {
  return h('div', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', {}, h('h3', { class: 'section-title' }, 'My clients')),
      h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
        button(state.ui.sheet === 'csv' ? 'CSV open' : 'Add using CSV', 'btn-secondary', () => openSheet('csv')),
        button('Add client', 'btn-primary', () => openSheet('client'))
      )
    ),
    h('div', { class: 'section-body grid-2' },
      h('div', { class: 'empty-shell' },
        h('div', {},
          h('h3', { class: 'stage-title', style: { marginTop: '0' } }, 'Add clients'),
          h('p', { class: 'stage-copy' }, 'Add 3 to 5 clients to continue.'),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' } },
            button('Add client', 'btn-primary', () => openSheet('client')),
            button('Add using CSV', 'btn-secondary', () => openSheet('csv'))
          )
        ),
        h('div', { class: 'empty-art' },
          h('div', { class: 'ghost' },
            h('div', { class: 'skeleton line', style: { width: '68%' } }),
            h('div', { class: 'skeleton line', style: { width: '88%' } }),
            h('div', { class: 'skeleton block' })
          )
        )
      ),
      h('div', {},
        h('div', { class: 'section' },
          h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Client list'))),
          h('div', { class: 'section-body' }, renderClientList())
        )
      )
    )
  );
}

function renderClientList() {
  if (!state.clients.length) {
    return h('div', { class: 'note' }, 'No clients yet.');
  }
  const list = h('div', { class: 'mobile-checklist' },
    ...state.clients.map((client, index) => h('div', { class: 'mobile-step' },
      h('strong', {}, `${index + 1}. ${client.name}`),
      h('span', {}, client.source === 'csv' ? 'Imported from CSV.' : 'Added manually.')
    ))
  );
  return list;
}

function renderTeamPhoneApp() {
  return h('div', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', {}, h('h3', { class: 'section-title' }, 'Team, phone, and app'))
    ),
    h('div', { class: 'section-body grid-3' },
      h('div', { class: 'feature' },
        h('div', { class: 'icon' }, '✉'),
        h('strong', {}, 'Team invites'),
        h('span', {}, 'Only show this path when the user has a team.')
      ),
      h('div', { class: 'feature' },
        h('div', { class: 'icon' }, '☎'),
        h('strong', {}, 'Phone setup'),
        h('span', {}, state.actions.phoneReady ? 'Number assigned and ready for call tracking.' : 'Provisioning in progress.')
      ),
      h('div', { class: 'feature' },
        h('div', { class: 'icon' }, '⇩'),
        h('strong', {}, 'App download'),
        h('span', {}, 'Move from browser setup into product usage.')
      )
    ),
    h('div', { class: 'section-body grid-2' },
      h('div', { class: 'section' },
        h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Invite team'))),
        h('div', { class: 'section-body' }, field('Invite email', 'invite', state.invites[0] || '', 'agent.team@radius.ai'))
      ),
      h('div', { class: 'section' },
        h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Phone setup'))),
        h('div', { class: 'section-body' }, field('Phone number', 'phoneProvisioned', state.actions.phoneReady ? '+1 (512) 555-0148' : '', '+1 (512) 555-0148'))
      )
    ),
    h('div', { class: 'section-foot' },
      button(state.actions.phoneReady ? 'Phone ready' : 'Generate phone', 'btn-primary', generatePhone, { disabled: state.ui.loading }),
      button('Download app', 'btn-secondary', () => setMessage('App download step is part of the production build.', 'success'))
    )
  );
}

function renderActivationHub() {
  const completedTasks = getActivationCompletedCount();
  const progress = (completedTasks / 5) * 100;
  const activeTask = getOpenActivationTask();
  const planLabel = 'Radius Agent';
  const milestoneStates = [
    { label: 'Context', done: true },
    { label: 'Clients', done: state.ui.activationClientsSaved },
    { label: 'Prospect', done: state.ui.activationRulesReady },
    { label: 'Calls', done: state.ui.activationCallsReady },
    { label: 'Mel', done: state.actions.melOpened },
  ];

  return h('div', { class: 'overview-shell' },
    h('header', { class: 'overview-navbar' },
      h('div', { class: 'overview-brand' },
        h('span', { class: 'overview-brand-mark', 'aria-hidden': 'true' }, '◎'),
        h('span', { class: 'overview-brand-text' }, 'RADIUS', h('sup', {}, '®'))
      ),
      h('div', { class: 'overview-navbar-actions' },
        h('div', { class: 'overview-profile' },
          h('div', { class: 'overview-user-avatar', 'aria-label': 'Vanessa Brown profile' }, 'V'),
          h('div', { class: 'overview-profile-copy' },
            h('strong', {}, 'Vanessa Brown'),
            h('span', {}, planLabel)
          )
        ),
        h('span', { class: 'overview-profile-toggle', 'aria-hidden': 'true' }, chevronSvg())
      )
    ),
    h('aside', { class: 'overview-sidebar', 'aria-label': 'Primary navigation' },
      h('img', {
        class: 'overview-sidebar-image',
        src: SIDEBAR_IMAGE,
        alt: 'Radius sidebar navigation',
      })
    ),
    h('main', { class: 'overview-main' },
      h('div', { class: 'overview-content' },
        h('div', { class: 'overview-copy' },
          h('h1', { class: 'overview-title' }, 'Welcome to Radius, Samantha! ', h('span', { 'aria-hidden': 'true' }, '👋')),
          h('p', { class: 'overview-subtitle' }, 'Complete these quick steps to get your AI assistant up and running.')
        ),
        h('div', { class: 'overview-progress-wrap' },
          h('div', { class: 'overview-trial-pill' }, 'Free trial · Day 5 of 7 · 2 days left'),
          h('div', { class: 'overview-progress-meta' },
            h('span', { class: 'overview-progress-label' }, `${completedTasks} of 5 tasks completed`),
            h('span', { class: 'overview-progress-percent' }, `${Math.round(progress)}%`)
          ),
          h('div', { class: 'overview-progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '5', 'aria-valuenow': String(completedTasks), 'aria-label': `${completedTasks} of 5 tasks completed` },
            h('span', { style: { width: `${progress}%` } })
          ),
          h('div', { class: 'overview-progress-milestones' },
            ...milestoneStates.map((item, index) => h('div', { class: `overview-milestone ${item.done ? 'done' : ''} ${index + 1 === activeTask ? 'current' : ''}`.trim() },
              h('span', { class: 'overview-milestone-dot', 'aria-hidden': 'true' }),
              h('span', { class: 'overview-milestone-label' }, item.label)
            ))
          ),
          h('div', { class: 'overview-progress-note' },
            h('span', { class: 'overview-progress-note-pulse', 'aria-hidden': 'true' }),
            h('span', {}, getActivationMomentumCopy())
          )
        ),
        h('section', { class: 'overview-card' },
          renderChecklistTask({
            id: 1,
            title: 'Set up business context',
            status: 'done',
            expanded: false,
            detail: 'Business profile is saved and ready.',
          }),
        renderChecklistTask({
          id: 2,
          title: 'Add clients',
          status: state.clients.length >= 3 ? 'done' : 'active',
          expanded: activeTask === 2,
          detail: '',
          content: renderActivationClientsTask(),
        }),
          renderChecklistTask({
            id: 3,
            title: 'Setup prospecting rules',
            status: state.ui.activationRulesReady ? 'done' : 'todo',
            expanded: activeTask === 3,
            detail: 'Turn on a starter automation so new leads keep moving without manual nudges.',
            content: renderActivationRulesTask(),
          }),
          renderChecklistTask({
            id: 4,
            title: 'Call clients',
            status: state.ui.activationCallsReady ? 'done' : 'todo',
            expanded: activeTask === 4,
            detail: 'Post-call notes and summary appear here after the first outreach is logged.',
            content: renderActivationCallsTask(),
          }),
          renderChecklistTask({
            id: 5,
            title: 'Chat with Mel AI',
            status: state.actions.melOpened ? 'done' : 'todo',
            expanded: activeTask === 5,
            detail: 'Open a first conversation and ask for your next best follow-up.',
            content: renderActivationMelTask(),
          })
        ),
        h('div', { class: 'overview-incentive-banner' },
          h('div', { class: 'overview-incentive-copy' },
            h('span', { class: 'overview-incentive-icon', 'aria-hidden': 'true' }, paymentSvg()),
            h('div', {},
              h('strong', {}, 'Activate paid plan for transactions'),
              h('p', {}, 'Transactions, Auditing and Collabs need paid subscription. Base plan is $100/mo. Transactions adds $50/mo after activation.')
            )
          ),
          h('button', { class: 'overview-incentive-tag', type: 'button', onClick: () => setPhase(6) }, 'View plans')
        )
      )
    )
  );
}

function renderPaywall() {
  return h('div', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', {}, h('h3', { class: 'section-title' }, 'Choose a plan'))
    ),
    h('div', { class: 'section-body grid-2' },
      h('div', { class: 'section' },
        h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Base subscription'))),
        h('div', { class: 'section-body' },
          h('div', { class: 'hero-title', style: { fontSize: '42px', margin: '0' } }, '$100'),
          h('div', { class: 'section-copy', style: { marginTop: '6px' } }, '/ month'),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' } },
            button(state.actions.billingComplete ? 'Card added' : 'Add card', 'btn-primary', addCard, { disabled: state.ui.loading }),
            button('Remind me later', 'btn-secondary', () => setMessage('You can return to billing from settings.', 'success'))
          )
        )
      ),
      h('div', { class: 'section' },
        h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'My Transactions'))),
        h('div', { class: 'section-body' },
          h('div', { class: 'note', style: { background: 'linear-gradient(180deg, rgba(238,242,255,0.68), rgba(255,255,255,0.98))', borderColor: 'rgba(90,95,242,0.18)' } }, 'Premium add-on: $50 / month'),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' } },
            button('Upgrade', 'btn-primary', () => setMessage('Premium add-on path remains gated for later.', 'success')),
            button('Request help', 'btn-secondary', () => setMessage('Sales assist path captured.', 'success'))
          )
        )
      )
    )
  );
}

function renderProspectingPage() {
  const selected = state.clients.find((client) => client.id === state.ui.selectedClient) || state.clients[0] || null;
  return h('div', { class: 'activation-page prospecting-page' },
    h('div', { class: 'activation-page-head' },
      h('button', { class: 'back-link', type: 'button', onClick: () => setView('onboarding') }, '← Back to Get Started'),
      h('div', { class: 'eyebrow' }, 'Mel Prospecting')
    ),
    h('div', { class: 'prospecting-shell' },
      h('section', { class: 'prospecting-panel' },
        h('div', { class: 'prospecting-panel-head' },
          h('div', {},
            h('h1', { class: 'prospecting-title' }, 'Prospecting Rules'),
            h('p', { class: 'prospecting-copy' }, 'Assign clients, set milestones, and train Mel.'),
          ),
          h('button', { class: 'overview-secondary-button', type: 'button', onClick: () => setView('onboarding') }, 'Close')
        ),
        h('div', { class: 'prospecting-grid' },
          h('div', { class: 'prospecting-card' },
            h('h3', {}, 'Assign to'),
            h('div', { class: 'prospecting-toggle-row' },
              h('button', { class: 'prospecting-toggle active', type: 'button' }, 'Only Me'),
              h('button', { class: 'prospecting-toggle', type: 'button' }, 'All Agents'),
              h('button', { class: 'prospecting-toggle', type: 'button' }, 'Select Agents')
            ),
            h('div', { class: 'prospecting-assignee' },
              h('div', { class: 'prospecting-avatar' }, 'TL'),
              h('div', {},
                h('strong', {}, 'You (Team Leader)'),
                h('span', {}, 'Only your clients will be prospecting.'),
              )
            )
          ),
          h('div', { class: 'prospecting-card' },
            h('h3', {}, 'Select Client'),
            h('div', { class: 'prospecting-select' }, selected ? selected.name : 'No clients yet'),
            h('h3', {}, 'Status'),
            h('div', { class: 'prospecting-select' }, 'Active'),
            h('h3', {}, 'AI Prospecting Instructions'),
            h('textarea', {
              class: 'prospecting-textarea',
              rows: '8',
              placeholder: 'Type your instruction here',
              onInput: (event) => updateState((s) => { s.ui.prospectingDraft = event.target.value; }),
            }, state.ui.prospectingDraft)
          )
        )
      )
    )
  );
}

function renderChatPage() {
  return h('div', { class: 'activation-page chat-page' },
    h('div', { class: 'activation-page-head' },
      h('button', { class: 'back-link', type: 'button', onClick: () => setView('onboarding') }, '← Back to Get Started'),
      h('div', { class: 'eyebrow' }, 'Chat with Mel')
    ),
    h('div', { class: 'chat-shell' },
      h('div', { class: 'chat-panel' },
        h('h1', { class: 'chat-title' }, 'Mel'),
        h('div', { class: 'chat-thread' },
          h('div', { class: 'chat-bubble' }, 'Ask for the next best move.'),
          h('div', { class: 'chat-bubble chat-bubble-user' }, state.ui.chatDraft || 'Type a message and send.')
        ),
        h('div', { class: 'chat-input-shell' },
          h('textarea', {
            class: 'chat-input',
            'data-focus-key': 'chat-page-draft',
            rows: '3',
            placeholder: 'Write to Mel...',
            onInput: (event) => updateState((s) => { s.ui.chatDraft = event.target.value; }),
          }, state.ui.chatDraft),
          h('button', { class: 'overview-primary-button chat-send', type: 'button', onClick: sendChatMessage }, 'Send')
        )
      )
    )
  );
}

function renderMobileShell(phase, progress) {
  const shell = h('div', { class: 'mobile-shell' },
    h('div', { class: 'mobile-head' },
      h('div', {},
        h('strong', {}, 'Radius'),
        h('span', {}, phase === 6 ? 'Billing' : phase === 5 ? 'Activation hub' : phase === 4 ? 'Team + phone' : phase === 3 ? 'My clients' : phase === 2 ? 'Business details' : 'Basic details')
      ),
      h('span', { class: 'pill primary' }, h('span', { class: 'dot' }), `Phase ${phase}`)
    ),
    h('div', { class: 'mobile-body' },
      h('div', { class: 'mobile-summary' },
        badge(`Trial day ${phase} / 7`, 'primary'),
        badge(`${progress}% complete`, progress >= 72 ? 'success' : 'warning')
      ),
      mobilePhaseCard(phase),
      h('div', { class: 'sticky-cta' },
        button(getMobileActionLabel(phase), 'btn-primary', getMobileActionHandler(phase), { disabled: state.ui.loading })
      )
    )
  );
  return shell;
}

function mobilePhaseCard(phase) {
  if (phase === 1) {
    return h('div', { class: 'mobile-card section' }, renderMobileBasic());
  }
  if (phase === 2) return h('div', { class: 'mobile-card section' }, renderMobileBusiness());
  if (phase === 3) return h('div', { class: 'mobile-card section' }, renderMobileClients());
  if (phase === 4) return h('div', { class: 'mobile-card section' }, renderMobileTeam());
  if (phase === 5) return h('div', { class: 'mobile-card section' }, renderMobileActivation());
  if (phase === 6) return h('div', { class: 'mobile-card section' }, renderMobilePaywall());
  return h('div', { class: 'mobile-card section' }, renderSkeleton());
}

function renderMobileBasic() {
  if (state.ui.authStage === 'otp') {
    return h('div', {},
      h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Verify code'), h('p', { class: 'section-copy' }, 'Enter the 4-digit code to continue.'))),
      h('div', { class: 'section-body' },
        h('div', { class: 'otp-grid mobile-otp-grid', role: 'group', 'aria-label': '4 digit code' },
          ...state.ui.otpDigits.map((digit, index) => h('input', {
            class: 'input otp-input',
            value: digit,
            inputmode: 'numeric',
            maxlength: '1',
            autocomplete: index === 0 ? 'one-time-code' : 'off',
            'aria-label': `Digit ${index + 1}`,
            onInput: (event) => setOtpDigit(index, event.target.value),
            onKeydown: (event) => handleOtpKeydown(event, index),
          }))
        ),
        h('div', { class: 'auth-helper-row mobile-helper-row' },
          h('span', { class: 'helper-text' }, state.ui.resendIn > 0 ? `Resend code in ${state.ui.resendIn}s` : 'Resend code available'),
          button('Resend code', 'btn-secondary', sendLoginEmail, { disabled: state.ui.loading || state.ui.resendIn > 0 })
        )
      )
    );
  }
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Basic details'), h('p', { class: 'section-copy' }, 'Stack fields and keep one CTA visible.'))),
    h('div', { class: 'section-body' },
      field('Name', 'mobile-name', state.form.name, 'Samantha Lee'),
      field('Email', 'mobile-email', state.form.email, 'samantha@radius.ai'),
      field('Phone', 'mobile-phone', state.form.phone, '(512) 555-0191')
    )
  );
}

function renderMobileBusiness() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Business details'), h('p', { class: 'section-copy' }, 'Enough context to segment solo vs team and capture MLS.'))),
    h('div', { class: 'section-body' },
      field('Brokerage name', 'mobile-brokerage', state.form.brokerage, 'Radius Realty Group'),
      field('City', 'mobile-city', getSelectedCities().join(', '), 'Austin, TX'),
      field('MLS name', 'mobile-mls', getSelectedMls().join(', '), 'Austin Board of Realtors')
    )
  );
}

function renderMobileClients() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'My clients'), h('p', { class: 'section-copy' }, 'Add 3 to 5 clients to unlock Mel.'))),
    h('div', { class: 'section-body' },
      h('div', { class: 'empty-shell' },
        h('div', { class: 'note' }, 'Add first client. CSV support stays one tap away.'),
        h('div', { style: { marginTop: '12px', display: 'grid', gap: '10px' } }, ...state.clients.map((client) => h('div', { class: 'mobile-step' }, h('strong', {}, client.name), h('span', {}, client.source === 'csv' ? 'Imported from CSV.' : 'Added manually.'))))
      )
    )
  );
}

function renderMobileTeam() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Team + phone + app'), h('p', { class: 'section-copy' }, 'Invite, provision, and download in a tight stack.'))),
    h('div', { class: 'section-body' },
      h('div', { class: 'mobile-step', style: { marginBottom: '10px' } }, h('strong', {}, 'Invite team'), h('span', {}, 'Optional when the user has a team.')),
      h('div', { class: 'mobile-step', style: { marginBottom: '10px' } }, h('strong', {}, 'Phone setup'), h('span', {}, state.actions.phoneReady ? 'Provisioned.' : 'Provisioning in progress.')),
      h('div', { class: 'mobile-step' }, h('strong', {}, 'App download'), h('span', {}, 'Move from browser setup into product usage.'))
    )
  );
}

function renderMobileActivation() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Activation hub'), h('p', { class: 'section-copy' }, 'One place to start. No long product tour.'))),
    h('div', { class: 'section-body' },
      h('div', { class: 'mobile-step', style: { marginBottom: '10px' } }, h('strong', {}, 'Chat with Mel'), h('span', {}, 'Ask for the next best follow-up.')),
      h('div', { class: 'mobile-step' }, h('strong', {}, 'First useful win'), h('span', {}, 'Aim for utility in under five minutes.'))
    )
  );
}

function renderMobilePaywall() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Day 7 paywall'), h('p', { class: 'section-copy' }, 'Billing and premium lock.'))),
    h('div', { class: 'section-body' },
      h('div', { class: 'mobile-step', style: { marginBottom: '10px' } }, h('strong', {}, '$100 / month'), h('span', {}, 'Continue the trial seamlessly into paid use.')),
      h('div', { class: 'mobile-step' }, h('strong', {}, 'My Transactions'), h('span', {}, 'Locked premium add-on.'))
    )
  );
}

function getMobileActionLabel(phase) {
  if (phase === 1) {
    if (!state.actions.loginSent) return 'Send login email & code';
    return 'Verify code';
  }
  if (phase === 2) return state.actions.trialStarted ? 'Continue' : 'Start free trial';
  if (phase === 3) return 'Add client';
  if (phase === 4) return state.actions.phoneReady ? 'Continue' : 'Generate phone';
  if (phase === 5) return state.actions.melOpened ? 'Continue' : 'Chat with Mel';
  if (phase === 6) return state.actions.billingComplete ? 'Billing complete' : 'Add card';
  return 'Continue';
}

function getMobileActionHandler(phase) {
  if (phase === 1) {
    if (!state.actions.loginSent) return sendLoginEmail;
    return verifyLoginCode;
  }
  if (phase === 2) {
    return state.actions.trialStarted ? function () { setPhase(3); } : startTrial;
  }
  if (phase === 3) {
    return function () { openSheet('client'); };
  }
  if (phase === 4) {
    return state.actions.phoneReady ? function () { setPhase(5); } : generatePhone;
  }
  if (phase === 5) {
    return state.actions.melOpened ? function () { setPhase(6); } : openMel;
  }
  if (phase === 6) {
    return state.actions.billingComplete ? closeModal : addCard;
  }
  return function () { setPhase(1); };
}

function field(label, key, value, placeholder, tone = 'light') {
  return h('label', { class: `field ${tone === 'dark' ? 'field-dark' : ''}` },
    h('span', { class: 'field-label field-label-radius' }, label),
    h('input', {
      class: 'input input-radius',
      value,
      placeholder,
      onInput: (event) => updateField(key, event.target.value),
    })
  );
}

function segmented(options, value, onChange) {
  return h('div', { class: 'segmented' },
    ...options.map(([optionValue, optionLabel]) => h('button', {
      class: `toggle-btn ${value === optionValue ? 'active' : ''}`,
      type: 'button',
      onClick: () => onChange(optionValue),
    }, optionLabel))
  );
}

function updateField(key, value) {
  state.form[key] = value;
  persist();
}

function getActivationCompletedCount() {
  let count = 1;
  if (state.clients.length >= 3) count += 1;
  if (state.ui.activationRulesReady) count += 1;
  if (state.ui.activationCallsReady) count += 1;
  if (state.actions.melOpened) count += 1;
  return count;
}

function getOpenActivationTask() {
  const requested = state.ui.activationTask || 0;
  if (requested && !isActivationTaskDone(requested)) return requested;
  if (state.clients.length < 3) return 2;
  if (!state.ui.activationRulesReady) return 3;
  if (!state.ui.activationCallsReady) return 4;
  if (!state.actions.melOpened) return 5;
  return 0;
}

function getActivationMomentumCopy() {
  if (state.clients.length < 3) return 'Next unlock: add clients to activate prospecting rules.';
  if (!state.ui.activationRulesReady) return 'Clients are ready. Turn on prospecting to unlock outreach.';
  if (!state.ui.activationCallsReady) return 'Prospecting is live. Log one call to unlock the Mel summary.';
  if (!state.actions.melOpened) return 'Call summary is ready. Open Mel to review the next best move.';
  return 'Activation done. Review paid plan to unlock transactions.';
}

function isActivationTaskDone(id) {
  if (id === 1) return true;
  if (id === 2) return state.clients.length >= 3;
  if (id === 3) return !!state.ui.activationRulesReady;
  if (id === 4) return !!state.ui.activationCallsReady;
  if (id === 5) return !!state.actions.melOpened;
  return false;
}

function renderChecklistTask({ id, title, status, expanded, detail, content = null }) {
  const locked = status === 'done';
  const icon = status === 'done'
    ? h('span', { class: 'overview-task-status done', 'aria-hidden': 'true' }, checkSvg())
    : h('span', { class: `overview-task-status ${status === 'active' ? 'active' : ''}`, 'aria-hidden': 'true' }, String(id));

  return h('div', { class: `overview-task ${expanded ? 'expanded' : ''} ${locked ? 'locked' : ''}`.trim() },
    h('button', {
      class: `overview-task-header ${locked ? 'locked' : ''}`.trim(),
      type: 'button',
      'aria-expanded': expanded ? 'true' : 'false',
      disabled: locked,
      onClick: () => toggleActivationTask(id),
    },
      h('div', { class: 'overview-task-title-wrap' },
        icon,
        h('span', { class: 'overview-task-title' }, title)
      ),
      locked
        ? h('span', { class: 'overview-task-badge' }, 'Done')
        : h('span', { class: `overview-task-toggle ${expanded ? 'open' : ''}`, 'aria-hidden': 'true' }, chevronSvg())
    ),
    expanded ? h('div', { class: 'overview-task-body' },
      detail ? h('p', { class: 'overview-task-copy' }, detail) : null,
      content
    ) : null
  );
}

function renderActivationClientsTask() {
  const count = state.clients.length;
  const testClient = state.clients.find((client) => client.source === 'test');
  const hasTestClient = !!testClient;
  return h('div', { class: 'overview-form-stack' },
    h('div', { class: `overview-test-drive-card ${hasTestClient ? 'used' : ''}`.trim() },
      h('div', { class: 'overview-test-drive-copy-wrap' },
        h('div', { class: 'overview-test-drive-copy' },
          h('strong', {}, 'Add yourself as test client'),
          h('p', {}, 'Use your own details to preview Mel\'s first outreach.')
        ),
      ),
      h('button', {
        class: `overview-primary-button overview-test-drive-button ${hasTestClient ? 'danger' : ''}`.trim(),
        type: 'button',
        onClick: hasTestClient ? (() => deleteClient(testClient.id)) : addTestClient,
      }, hasTestClient ? 'Remove test client' : 'Add test client')
    ),
    h('div', { class: 'overview-client-actions overview-client-actions-spread' },
      h('div', { class: 'overview-client-actions-left' },
        h('button', {
          class: 'overview-secondary-button',
          type: 'button',
          onClick: () => openSheet('client'),
        }, 'Add client'),
        h('button', {
          class: 'overview-secondary-button',
          type: 'button',
          onClick: () => openSheet('csv'),
        }, 'Upload CSV')
      ),
      h('span', { class: 'overview-client-pill' }, count >= 3 ? '3 clients ready' : '3 clients to complete')
    ),
    count ? renderClientTable() : renderClientEmptyState()
  );
}

function renderClientEmptyState() {
  return h('div', { class: 'overview-empty-state' },
    h('div', { class: 'overview-empty-header' },
      h('div', { class: 'overview-empty-icon', 'aria-hidden': 'true' }, usersOutlineSvg()),
      h('strong', {}, 'No clients added yet')
    ),
    h('div', { class: 'overview-empty-actions' },
      h('button', { class: 'overview-primary-button', type: 'button', onClick: () => openSheet('client') }, 'Add client'),
      h('button', { class: 'overview-secondary-button', type: 'button', onClick: () => openSheet('csv') }, 'Upload CSV')
    )
  );
}

function renderClientTable() {
  const realClientCount = state.clients.filter((client) => client.source !== 'test').length;
  return h('div', { class: 'overview-table-wrap' },
    h('table', { class: 'overview-table' },
      h('thead', {},
        h('tr', {},
          h('th', {}, 'Client Name'),
          h('th', {}, 'Contact Info'),
          h('th', {}, 'Status'),
          h('th', {}, 'Actions')
        )
      ),
      h('tbody', {},
        ...state.clients.map((client) => {
          const isTest = client.source === 'test';
          const disableTest = isTest && realClientCount >= 3;
          return h('tr', { class: `overview-table-row ${isTest ? 'test' : ''} ${disableTest ? 'muted' : ''}`.trim() },
            h('td', {},
              h('div', { class: 'overview-table-name' },
                h('div', { class: 'overview-client-avatar' }, (client.name || 'C').slice(0, 1).toUpperCase()),
                h('div', {},
                  h('strong', {}, client.name),
                  h('span', {}, isTest ? 'AI generated' : 'Manual client')
                )
              )
            ),
            h('td', {},
              h('div', { class: 'overview-table-contact' },
                h('span', {}, client.email || 'No email'),
                h('span', {}, client.phone || 'No phone')
              )
            ),
            h('td', {},
              isTest
                ? h('span', { class: 'overview-table-badge test' }, '✨ Mel AI Test Client')
                : h('span', { class: 'overview-table-badge' }, 'Active')
            ),
            h('td', {},
              h('div', { class: 'overview-table-actions' },
                h('button', {
                  class: 'overview-icon-button',
                  type: 'button',
                  title: disableTest ? 'Delete test client' : 'Delete client',
                  onClick: () => deleteClient(client.id),
                }, trashSvg())
              )
            )
          );
        })
      )
    )
  );
}

function renderActivationMelTask() {
  return h('div', { class: 'overview-inline-panel' },
    h('div', { class: 'overview-chat-box' },
      h('textarea', {
        class: 'overview-chat-input',
        'data-focus-key': 'activation-chat-draft',
        rows: '3',
        placeholder: 'Ask Mel for next step...',
        onInput: (event) => updateState((s) => { s.ui.chatDraft = event.target.value; }),
      }, state.ui.chatDraft),
      h('button', {
        class: 'overview-primary-button overview-chat-send',
        type: 'button',
        onClick: sendChatMessage,
      },
        h('span', { 'aria-hidden': 'true' }, sendSvg()),
        'Send'
      )
    )
  );
}

function renderActivationRulesTask() {
  return h('div', { class: 'overview-inline-panel' },
    h('div', { class: 'overview-table-wrap' },
      h('table', { class: 'overview-table' },
        h('thead', {},
          h('tr', {},
            h('th', {}, 'Client'),
            h('th', {}, 'Client Type'),
            h('th', {}, 'Action')
          )
        ),
        h('tbody', {},
          ...state.clients.map((client) => {
            const isTest = client.source === 'test';
            const clientType = Array.isArray(client.clientTypes) && client.clientTypes.length
              ? client.clientTypes.join(', ')
              : client.clientType || 'Contact';
            return h('tr', { class: isTest ? 'overview-table-row test' : '' },
              h('td', {},
                h('div', { class: 'overview-table-name' },
                  h('div', { class: 'overview-client-avatar' }, (client.name || 'C').slice(0, 1).toUpperCase()),
                  h('div', {},
                    h('strong', {}, client.name),
                    h('span', {}, isTest ? 'Test client' : 'Real client')
                  )
                )
              ),
              h('td', {},
                h('span', { class: `overview-table-badge ${isTest ? 'test' : ''}`.trim() }, clientType)
              ),
              h('td', {},
                h('div', { class: 'overview-prospecting-actions' },
                  h('button', {
                    class: 'overview-secondary-button overview-setup-button',
                    type: 'button',
                    onClick: () => openProspectingPage(client),
                  }, 'Add rule')
                )
              )
            );
          })
        )
      )
    )
  );
}

function renderActivationCallsTask() {
  return h('div', { class: 'overview-inline-panel' },
    h('div', { class: 'overview-call-table-wrap' },
      h('table', { class: 'overview-table overview-call-table' },
        h('thead', {},
          h('tr', {},
            h('th', {}, 'Client Name'),
            h('th', {}, 'Call Duration'),
            h('th', {}, 'Notes'),
            h('th', {}, 'Action')
          )
        ),
        h('tbody', {},
          ...state.clients.map((client) => h('tr', {},
            h('td', {}, client.name),
            h('td', {}, client.callDuration || '—'),
            h('td', {},
              client.notes
                ? h('button', {
                  class: 'overview-call-note-link',
                  type: 'button',
                  onClick: () => updateState((s) => { s.ui.callNotesClientId = client.id; }),
                },
                h('span', { class: 'overview-call-note-icon', 'aria-hidden': 'true' }, documentTextSvg())
                )
                : client.callDuration
                  ? h('button', {
                    class: 'overview-call-note-link overview-call-note-summarize',
                    type: 'button',
                    onClick: () => updateState((s) => { s.ui.callNotesClientId = client.id; }),
                  },
                  h('span', { class: 'overview-call-note-icon', 'aria-hidden': 'true' }, documentTextSvg()),
                  h('span', {}, 'Summarize call')
                  )
                  : h('span', { class: 'overview-call-note-empty' }, 'No notes yet.')
            ),
            h('td', {},
              h('button', {
                class: 'overview-icon-button overview-simulate-button',
                type: 'button',
                title: 'Simulate call',
                'aria-label': 'Simulate call',
                onClick: () => simulateCall(client.id),
              }, phoneGlyphSvg())
            )
          ))
        )
      )
    ),
  );
}

function overviewInput(index, key, label, value, placeholder) {
  return h('label', { class: 'overview-input-field' },
    h('span', { class: 'sr-only' }, `${label} ${index + 1}`),
    h('input', {
      class: 'input overview-input',
      value,
      placeholder,
      onInput: (event) => updateActivationDraft(index, key, event.target.value),
    })
  );
}

function getActivationDraftClients() {
  const drafts = Array.isArray(state.ui.activationDraftClients) ? state.ui.activationDraftClients : [];
  if (drafts.length === 3) return drafts;
  return [
    drafts[0] || { name: '', email: '', phone: '' },
    drafts[1] || { name: '', email: '', phone: '' },
    drafts[2] || { name: '', email: '', phone: '' },
  ];
}

function updateActivationDraft(index, key, value) {
  const drafts = getActivationDraftClients();
  drafts[index] = { ...drafts[index], [key]: value };
  updateState((s) => {
    s.ui.activationDraftClients = drafts;
  });
}

function toggleActivationTask(id) {
  if (isActivationTaskDone(id)) return;
  updateState((s) => {
    s.ui.activationTask = s.ui.activationTask === id ? 0 : id;
  });
}

function syncActivationState(nextState) {
  const totalClients = nextState.clients.length;
  const complete = totalClients >= 3;
  nextState.ui.activationClientsSaved = complete;
  if (!complete) {
    nextState.ui.activationRulesReady = false;
    nextState.ui.activationCallsReady = false;
    nextState.actions.melOpened = false;
    nextState.ui.activationTask = 2;
    return;
  }
  if (!nextState.ui.activationRulesReady) nextState.ui.activationTask = 3;
  else if (!nextState.ui.activationCallsReady) nextState.ui.activationTask = 4;
  else if (!nextState.actions.melOpened) nextState.ui.activationTask = 5;
}

function addTestClient() {
  const fullName = (state.form.name || 'Samantha Lee').trim() || 'Samantha Lee';
  const email = (state.form.email || 'samantha@radius.ai').trim();
  const phone = (state.form.phone || '(512) 555-0191').trim();
  updateState((s) => {
    const exists = s.clients.some((client) => client.name === fullName && client.source === 'test');
    if (!exists) {
      s.clients.unshift({ id: cryptoId(), name: fullName, email, phone, source: 'test', callDuration: '', notes: '' });
    }
    s.ui.activationTestDriveUsed = true;
    syncActivationState(s);
  });
  // Clicking this auto-fills Phase 1 details into Row 1 and triggers an immediate mock SMS from Mel.
  setMessage('Test client added. Mock SMS from Mel sent to your number.', 'success');
}

function completeProspectingRules() {
  updateState((s) => {
    s.ui.activationRulesReady = true;
    s.ui.activationTask = 4;
  });
  setMessage('Starter prospecting rule added.', 'success');
}

function completeClientCalls() {
  updateState((s) => {
    s.ui.activationCallsReady = true;
    s.ui.activationTask = 5;
  });
  setMessage('Post-call notes added. Mel is ready next.', 'success');
}

function deleteClient(clientId) {
  updateState((s) => {
    s.clients = s.clients.filter((client) => client.id !== clientId);
    if (s.ui.callNotesClientId === clientId) s.ui.callNotesClientId = null;
    syncActivationState(s);
  });
}

function simulateCall(clientId) {
  updateState((s) => {
    const client = s.clients.find((entry) => entry.id === clientId);
    if (!client) return;
    client.callDuration = '02:14';
    client.notes = '';
    s.ui.callNotesClientId = client.id;
  });
}

function openProspectingPage(client) {
  updateState((s) => {
    s.view = 'prospecting';
    s.ui.chatDraft = '';
    s.ui.selectedClient = client ? client.id : null;
  });
}

function sendChatMessage() {
  updateState((s) => {
    s.view = 'chat';
    s.actions.melOpened = true;
  });
}

function trophySvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M6.2 3.5h7.6v2.1c0 2.2-1.7 4-3.8 4s-3.8-1.8-3.8-4V3.5Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M6.2 4.7H4.8a1.8 1.8 0 0 0 0 3.6h1.8M13.8 4.7h1.4a1.8 1.8 0 1 1 0 3.6h-1.8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M8.2 10.6h3.6v2.1a2 2 0 0 1-2 2h-.1a1.9 1.9 0 0 1-1.5-.7 2 2 0 0 1-.5-1.3v-2.1Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M7 16.5h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round' })
  );
}

function sidebarButton(label, icon, active = false) {
  return h('button', {
    class: `overview-sidebar-button ${active ? 'active' : ''}`,
    type: 'button',
    'aria-label': label,
  }, icon);
}

function overviewBrandSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M10 2.8c-3.6 0-6.5 2.9-6.5 6.5v2.2c0 .8-.3 1.5-.8 2.1l-.2.2h3.1v-4.1l4.4-3.6 4.4 3.6v4.1h3.1l-.2-.2c-.5-.6-.8-1.3-.8-2.1V9.3c0-3.6-2.9-6.5-6.5-6.5Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M7.9 16.1h4.2', fill: 'none', stroke: '#3685f7', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function homeSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M3.5 9.4 10 4l6.5 5.4v7.1a.9.9 0 0 1-.9.9h-3.8v-4.7H8.2v4.7H4.4a.9.9 0 0 1-.9-.9Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function usersOutlineSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('circle', { cx: '9', cy: '7', r: '4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
    h('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function sparkSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'm12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' })
  );
}

function phoneGlyphSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.72c.12.84.34 1.66.65 2.44a2 2 0 0 1-.45 2.11L8.2 10.8a16 16 0 0 0 5 5l1.53-2.1a2 2 0 0 1 2.11-.45c.78.31 1.6.53 2.44.65A2 2 0 0 1 22 16.92Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function chatBubbleSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M21 15a2 2 0 0 1-2 2H8l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M8 10h8M8 14h5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function briefcaseOutlineSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    h('rect', { x: '3', y: '7', width: '18', height: '13', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
    h('path', { d: 'M3 12h18', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function cogOutlineSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm6 3.5-.9-.3a5.8 5.8 0 0 0-.5-1.2l.4-.9a.8.8 0 0 0-.2-.9l-1.1-1.1a.8.8 0 0 0-.9-.2l-.9.4a5.8 5.8 0 0 0-1.2-.5l-.3-.9a.8.8 0 0 0-.8-.5H9.4a.8.8 0 0 0-.8.5l-.3.9a5.8 5.8 0 0 0-1.2.5l-.9-.4a.8.8 0 0 0-.9.2L4.2 6.7a.8.8 0 0 0-.2.9l.4.9c-.2.4-.4.8-.5 1.2l-.9.3a.8.8 0 0 0-.5.8v1.4c0 .4.2.7.5.8l.9.3c.1.4.3.8.5 1.2l-.4.9a.8.8 0 0 0 .2.9l1.1 1.1a.8.8 0 0 0 .9.2l.9-.4c.4.2.8.4 1.2.5l.3.9c.1.3.4.5.8.5h1.2c.4 0 .7-.2.8-.5l.3-.9c.4-.1.8-.3 1.2-.5l.9.4a.8.8 0 0 0 .9-.2l1.1-1.1a.8.8 0 0 0 .2-.9l-.4-.9c.2-.4.4-.8.5-1.2l.9-.3a.8.8 0 0 0 .5-.8v-1.4a.8.8 0 0 0-.5-.8Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' })
  );
}

function bellOutlineSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M6 8.2a4 4 0 0 1 8 0v2.1c0 .7.2 1.3.6 1.8l.8 1.1H4.6l.8-1.1c.4-.5.6-1.1.6-1.8Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M8.2 14.8a1.9 1.9 0 0 0 3.6 0', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round' })
  );
}

function documentTextSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M14 2v5h5M9 13h6M9 17h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function chartBoardSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.5 4.5h11v11h-11zM7 13.5V10m3 3.5V7.8m3 5.7V9.4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function storefrontSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4 7.2h12l-1-2.7H5L4 7.2Zm1 1.3h10v7H5v-7Zm2 2.2h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function collectionSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.5 6h11m-11 4h11m-11 4h11', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
  );
}

function giftSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.2 8.2h11.6v7.3H4.2zm0 0h11.6V5.9H4.2zm5.8 0v7.3m-3.4-9c0-1 1.2-1.8 2.1-.8L10 7.2m3.3-.7c.9-1-.2-2.2-1.1-1.2L10 7.2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function rssSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('circle', { cx: '6.1', cy: '13.9', r: '1.2', fill: 'currentColor' }),
    h('path', { d: 'M5 9.5a5.5 5.5 0 0 1 5.5 5.5M5 5a10 10 0 0 1 10 10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
  );
}

function megaphoneSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.5 9.4h2.7l5.3-2.8v6.8l-5.3-2.8H4.5zm2.7 4.2.7 2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function lifebuoySvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('circle', { cx: '10', cy: '10', r: '5.8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }),
    h('circle', { cx: '10', cy: '10', r: '2.3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }),
    h('path', { d: 'M7.4 7.4 5.6 5.6m6.8 1.8 1.8-1.8m-6.8 7-1.8 1.8m6.8-1.8 1.8 1.8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' })
  );
}

function uploadSvg() {
  return h('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M10 12.8V5.4M7.2 8.2 10 5.4l2.8 2.8M4.4 14.2v.6c0 .7.5 1.2 1.2 1.2h8.8c.7 0 1.2-.5 1.2-1.2v-.6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function trashSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M3 6h18', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    h('path', { d: 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    h('path', { d: 'M19 6l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M10 11v5M14 11v5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function sendSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'm22 2-7 20-4-9-9-4z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M22 2 11 13', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' })
  );
}

function paymentSvg() {
  return h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('rect', { x: '3', y: '5', width: '18', height: '14', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
    h('path', { d: 'M3 10h18', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    h('circle', { cx: '7', cy: '15', r: '1', fill: 'currentColor' })
  );
}

async function sendLoginEmail() {
  if (!state.form.name || !state.form.email || !state.form.phone) {
    setMessage('Name, email, and phone are required before sending the login email.', 'error');
    return;
  }
  await runAction('login', async () => getApi().sendLoginEmail(state.form));
  updateState((s) => {
    s.actions.loginSent = true;
    s.actions.emailOpened = false;
    s.ui.authStage = 'otp';
    s.ui.otpDigits = ['', '', '', ''];
    s.ui.resendIn = 30;
  });
  startResendCountdown();
  setMessage('Login email and code sent. Enter the code to continue.', 'success');
}

function openEmailLink() {
  verifyLoginCode();
}

async function verifyLoginCode() {
  if (!state.actions.loginSent) {
    setMessage('Send the login email first.', 'error');
    return;
  }
  if (state.ui.otpDigits.join('').length !== 4) {
    setMessage('Enter the 4-digit code to continue.', 'error');
    return;
  }
  await runAction('verify', async () => delay({ ok: true }, 220));
  updateState((s) => {
    s.actions.emailOpened = true;
    s.phase = 2;
    s.ui.authStage = 'details';
    s.ui.resendIn = 0;
  });
  window.clearTimeout(window.__radiusResendTimer);
  window.__radiusResendTimer = null;
  setMessage('Code verified. Continue with business details.', 'success');
}

function startResendCountdown() {
  window.clearTimeout(window.__radiusResendTimer);
  window.__radiusResendTimer = window.setTimeout(() => {
    updateState((s) => { s.ui.resendIn = 0; });
    window.__radiusResendTimer = null;
  }, 30000);
}

function setOtpDigit(index, value) {
  const digit = String(value || '').replace(/\D/g, '').slice(-1);
  updateState((s) => {
    s.ui.otpDigits[index] = digit;
  });
  if (digit && index < 3) {
    const inputs = document.querySelectorAll('.otp-input');
    const next = inputs[index + 1];
    if (next && typeof next.focus === 'function') next.focus();
  }
}

function handleOtpKeydown(event, index) {
  if (event.key === 'Backspace' && !event.target.value && index > 0) {
    const prev = event.target.parentElement && event.target.parentElement.children[index - 1];
    if (prev && typeof prev.focus === 'function') prev.focus();
  }
}

async function startTrial() {
  if (!state.form.brokerage || !getSelectedCities().length || !getSelectedMls().length) {
    setMessage('Complete the business details before starting the trial.', 'error');
    return;
  }
  await runAction('trial', async () => getApi().startTrial(state.form));
  updateState((s) => {
    s.actions.trialStarted = true;
    s.phase = 3;
  });
  setMessage('Trial started. Add clients next.', 'success');
}

function openSheet(kind) {
  updateState((s) => {
    s.ui.sheet = kind;
    s.ui.dirtySheet = false;
  });
  window.requestAnimationFrame(() => {
    const sheet = document.getElementById('workflow-sheet');
    if (sheet && typeof sheet.focus === 'function') {
      sheet.focus();
    }
  });
}

async function addClient(kind, overrides = {}) {
  const name = overrides.name || `Client ${state.clients.length + 1}`;
  const source = kind === 'csv' ? 'csv' : 'manual';
  await runAction(kind === 'csv' ? 'csv' : 'client', async () => {
    if (kind === 'csv') await getApi().importCsv({ rows: 3 });
    else await getApi().addClient({ name, source });
  });
  updateState((s) => {
    s.clients.push({
      id: cryptoId(),
      name,
      source,
      email: overrides.email || `client${s.clients.length + 1}@radius.com`,
      phone: overrides.phone || '(512) 555-0184',
      callDuration: '',
      notes: '',
    });
    if (source === 'csv') s.actions.csvImported = true;
    syncActivationState(s);
    s.ui.sheet = null;
    s.ui.csvFileName = '';
    s.ui.csvError = '';
  });
  setMessage(kind === 'csv' ? 'CSV imported. Add a few more if needed.' : 'Client added.', 'success');
}

async function generatePhone() {
  await runAction('phone', async () => getApi().generatePhone(state.clients));
  updateState((s) => {
    s.actions.phoneReady = true;
    s.phase = 5;
  });
  setMessage('Phone number provisioned.', 'success');
}

async function openMel() {
  await runAction('mel', async () => getApi().openMel({ clients: state.clients }));
  updateState((s) => {
    s.actions.melOpened = true;
    s.view = 'chat';
    s.ui.activationTask = 0;
  });
  setMessage('Mel is open. First value is visible.', 'success');
}

async function addCard() {
  await runAction('billing', async () => getApi().createPayment(state.form));
  updateState((s) => {
    s.actions.billingComplete = true;
    s.ui.modal = 'paid';
  });
  setMessage('Card added. Trial continues into paid use.', 'success');
}

async function runAction(type, work) {
  if (state.ui.loading) return;
  updateState((s) => {
    s.ui.loading = true;
    s.ui.message = null;
  });
  try {
    return await work();
  } catch (error) {
    console.error(error);
    setMessage('Action failed. Try again or route to support.', 'error');
  } finally {
    updateState((s) => {
      s.ui.loading = false;
    });
  }
}

function renderSheet() {
  if (!state.ui.sheet) return;
  const isCsv = state.ui.sheet === 'csv';
  const backdrop = h('div', { class: 'sheet-backdrop open', onClick: closeSheet });
  const sheet = h('div', {
    class: 'sheet open sheet-right',
    role: 'dialog',
    'aria-modal': 'true',
    id: 'workflow-sheet',
    tabindex: '0',
    onKeydown: (event) => {
      if (event.key === 'Escape') closeSheet();
    },
  },
    h('div', { class: 'sheet-head' },
      h('div', { class: 'stage-kicker' }, isCsv ? 'CSV support' : 'Add client'),
      h('h3', { class: 'stage-title', style: { marginBottom: '0' } }, isCsv ? 'Import clients using CSV' : 'Add a client'),
      h('p', { class: 'stage-copy' }, isCsv ? 'White-glove cleanup path. If the CSV is messy, route to support.' : 'Use the fastest path to add people into the trial.')
    ),
    h('div', { class: 'sheet-body' },
      isCsv ? renderCsvSheet() : renderClientSheet()
    ),
    h('div', { class: 'sheet-foot add-client-sheet-foot' },
      button('Back', 'btn-secondary', closeSheet),
      button(isCsv ? 'Import CSV' : 'Save client', 'btn-primary', () => {
        if (isCsv) {
          if (!state.ui.csvFileName) {
            updateState((s) => { s.ui.csvError = 'Upload a CSV file first.'; });
            return;
          }
          addClient('csv', { name: `CSV Client ${state.clients.length + 1}` });
        }
        else {
          const input = document.getElementById('client-name');
          const name = input && typeof input.value === 'string' && input.value.trim()
            ? input.value.trim()
            : `Client ${state.clients.length + 1}`;
          addClient('manual', { name });
        }
      })
    )
  );
  return { backdrop, sheet };
}

function renderCsvSheet() {
  return h('div', { class: 'add-client-sheet-stack' },
    h('div', { class: `csv-upload-box ${state.ui.csvError ? 'error' : state.ui.csvFileName ? 'uploaded' : ''}`.trim() },
      h('strong', {}, state.ui.csvFileName ? 'CSV ready to import' : 'Upload client CSV'),
      h('p', {}, state.ui.csvFileName ? `File selected: ${state.ui.csvFileName}` : 'Empty, uploaded, and error states are supported here. Use a .csv export from your contacts list.'),
      h('label', { class: 'overview-primary-button add-client-upload-button' },
        uploadSvg(),
        h('span', {}, state.ui.csvFileName ? 'Replace file' : 'Browse files'),
        h('input', {
          type: 'file',
          accept: '.csv',
          class: 'sr-only',
          onChange: (event) => {
            const file = event.target.files && event.target.files[0];
            updateState((s) => {
              s.ui.csvFileName = file ? file.name : '';
              s.ui.csvError = '';
            });
          },
        })
      ),
      state.ui.csvFileName ? h('div', { class: 'csv-upload-meta' }, 'Estimated rows: 3') : null,
      state.ui.csvError ? h('div', { class: 'csv-upload-error' }, state.ui.csvError) : null
    )
  );
}

function renderClientSheet() {
  return h('div', { class: 'add-client-sheet-stack' },
    addClientSelectField('On whose behalf of*', 'Select agent'),
    h('div', { class: 'add-client-upload-card' },
      h('span', { class: 'field-label field-label-radius' }, 'Profile Picture'),
      h('div', { class: 'add-client-upload-box' },
        h('strong', {}, 'Browse files to upload'),
        h('p', {}, 'PNG, JPG, GIF up to 5MB'),
        h('label', { class: 'overview-primary-button add-client-upload-button' },
          uploadSvg(),
          h('span', {}, 'Browse Files'),
          h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif', class: 'sr-only' })
        )
      )
    ),
    addClientInputField('Full Name*', 'client-name', 'Enter full name'),
    h('div', { class: 'add-client-group' },
      h('div', { class: 'add-client-group-copy' },
        h('span', { class: 'field-label field-label-radius' }, 'Contact Information*'),
        h('p', {}, 'Provide either a phone number or an email address.')
      ),
      addClientInputField('Phone Number', 'client-phone', 'Enter phone number'),
      addClientInputField('Email Address', 'client-email', 'Enter email address'),
    ),
    addClientInputField('Address*', 'client-address', 'Enter address', searchSvg()),
    addClientSelectField('Client Type*', 'Select'),
    addClientSelectField('Status*', 'Select'),
    addClientSelectField('Client Source*', 'Select')
  );
}

function addClientInputField(label, id, placeholder, trailing = null) {
  return h('label', { class: 'add-client-field' },
    h('span', { class: 'field-label field-label-radius' }, label),
    h('div', { class: 'add-client-input-shell' },
      h('input', { id, class: 'input add-client-input', placeholder, value: '' }),
      trailing ? h('span', { class: 'add-client-input-trailing', 'aria-hidden': 'true' }, trailing) : null
    )
  );
}

function addClientSelectField(label, placeholder) {
  return h('label', { class: 'add-client-field' },
    h('span', { class: 'field-label field-label-radius' }, label),
    h('button', { class: 'add-client-select', type: 'button' },
      h('span', {}, placeholder),
      h('span', { class: 'add-client-input-trailing', 'aria-hidden': 'true' }, chevronSvg())
    )
  );
}

function closeSheet() {
  updateState((s) => {
    s.ui.sheet = null;
    s.ui.dirtySheet = false;
    s.ui.csvError = '';
  });
}

function renderModal() {
  if (!state.ui.modal) return;
  const backdrop = h('div', { class: 'modal-backdrop open', onClick: closeModal });
  const modal = h('div', {
    class: 'modal open',
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '0',
    onKeydown: (event) => {
      if (event.key === 'Escape') closeModal();
    },
  },
    h('div', { class: 'modal-left' },
      h('div', { class: 'eyebrow' }, 'Day 7 paywall'),
      h('h3', { class: 'hero-title', style: { fontSize: '32px', marginTop: '10px' } }, 'Payment complete.'),
      h('p', { class: 'hero-copy', style: { color: 'var(--muted)', fontSize: '15px' } }, 'The app should now transition to the paid state and keep transactions locked behind the premium boundary.')
    ),
    h('div', { class: 'modal-right' },
      h('div', { class: 'section' },
        h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'Success'))),
        h('div', { class: 'section-body' },
          h('div', { class: 'note' }, 'Card added. Premium boundary remains clear.'),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' } },
            button('Go to onboarding', 'btn-primary', closeModal),
            button('Back to landing', 'btn-secondary', () => {
              closeModal();
              updateState((s) => { s.view = 'landing'; s.phase = 1; });
            })
          )
        )
      )
    )
  );
  return { backdrop, modal };
}

function closeModal() {
  updateState((s) => {
    s.ui.modal = null;
  });
}

function renderToast() {
  if (!state.ui.message) return null;
  return h('div', {
    class: 'toast ' + (state.ui.messageType === 'error' ? 'error' : 'success'),
    role: 'status',
    'aria-live': 'polite',
  },
    h('div', {}, state.ui.message),
    button('Dismiss', 'btn-secondary', () => {
      updateState((s) => { s.ui.message = null; });
    })
  );
}

function render() {
  const focusSnapshot = captureFocusState();
  root.innerHTML = '';
  if (state.view === 'landing') {
    root.append(renderLanding());
  } else if (state.view === 'prospecting') {
    root.append(renderProspectingPage());
  } else if (state.view === 'chat') {
    root.append(renderChatPage());
  } else {
    root.append(renderOnboarding());
  }

  const sheet = renderSheet();
  const modal = renderModal();
  const sheetLayer = getLayer('sheet-layer');
  const modalLayer = getLayer('modal-layer');
  const toastRegion = getLayer('toast-region');

  sheetLayer.replaceChildren();
  modalLayer.replaceChildren();
  toastRegion.replaceChildren();

  if (sheet) {
    sheetLayer.append(sheet.backdrop, sheet.sheet);
  }
  if (modal) {
    modalLayer.append(modal.backdrop, modal.modal);
  }
  const toast = renderToast();
  if (toast) {
    toastRegion.append(toast);
  }
  restoreFocusState(focusSnapshot);
}

function getLayer(id) {
  let region = document.getElementById(id);
  if (!region) {
    region = h('div', { id, class: id === 'toast-region' ? 'toast-region' : '' });
    document.body.append(region);
  }
  return region;
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSheet();
    closeModal();
    updateState((s) => {
      s.ui.cityOpen = false;
      s.ui.mlsOpen = false;
    });
  }
});

document.addEventListener('pointerdown', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('.dropdown-shell')) return;
  if (!state.ui.cityOpen && !state.ui.mlsOpen) return;
  updateState((s) => {
    s.ui.cityOpen = false;
    s.ui.mlsOpen = false;
  });
});

boot();

function boot() {
  try {
    render();
  } catch (error) {
    console.error(error);
    renderBootError(error);
  }
}

function renderBootError(error) {
  if (!root) return;
  root.innerHTML = '';
  root.append(
    h('div', { class: 'app' },
      h('div', { class: 'section', style: { maxWidth: '720px', margin: '64px auto' } },
        h('div', { class: 'section-head' },
          h('div', {},
            h('h2', { class: 'section-title' }, 'App boot failed'),
            h('p', { class: 'section-copy' }, 'The runtime hit a browser compatibility error before the trial app could render.')
          )
        ),
        h('div', { class: 'section-body' },
          h('div', { class: 'note' }, `Error: ${error && error.message ? error.message : 'Unknown runtime error'}`)
        )
      )
    )
  );
}
