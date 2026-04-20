const STORAGE_KEY = 'radius-free-trial-app-v2';
const HERO_IMAGE = './landing-hero.png';
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
  { id: 3, name: 'Clients', note: '3 to 5 clients or CSV help.' },
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
    city: '',
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
    const raw = storage.getItem(STORAGE_KEY);
    const next = raw ? mergeState(DEFAULT_STATE, JSON.parse(raw)) : clone(DEFAULT_STATE);
    next.view = 'landing';
    next.ui.cityOpen = false;
    next.ui.mlsOpen = false;
    return next;
  } catch {
    const next = clone(DEFAULT_STATE);
    next.view = 'landing';
    next.ui.cityOpen = false;
    next.ui.mlsOpen = false;
    return next;
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
  return h('div', { class: 'onboarding onboarding-focus' },
    h('main', { class: 'trial-focus-shell' },
      h('article', { class: 'stage trial-stage' },
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

function renderStageBody(phase) {
  switch (phase) {
    case 1:
      return renderBasicDetails();
    case 2:
      return renderBusinessDetails();
    case 3:
      return renderClients();
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
        h('div', { class: 'trust-proof-grid trust-proof-grid-dark' },
          trustCard('Faster launch', 'Brokerages can get their first workspace live in one sitting.'),
          trustCard('Built for teams', 'Solo agents and multi-seat teams follow the same clean path.')
        )
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
        button(state.actions.trialStarted ? 'Trial started' : 'Start 7-day free trial', 'btn-primary business-cta', startTrial, { disabled: state.ui.loading }),
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
        h('span', { class: `dropdown-trigger-value ${state.form.city ? 'filled' : ''}` }, state.form.city || 'Select city'),
        h('span', { class: 'dropdown-trigger-icon', 'aria-hidden': 'true' }, chevronSvg())
      ),
      state.ui.cityOpen ? h('div', { class: 'dropdown-menu dropdown-menu-tight' },
        h('div', { class: 'dropdown-option-list' },
          ...options.map((option) => h('button', {
            class: `dropdown-option ${state.form.city === option ? 'selected' : ''}`,
            type: 'button',
            onClick: () => selectCity(option),
          },
            h('span', { class: 'dropdown-option-label' }, option),
            state.form.city === option ? h('span', { class: 'dropdown-option-check' }, 'Selected') : h('span', { class: 'dropdown-option-check' }, 'Choose')
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
              h('span', { class: 'dropdown-option-label' }, option),
              h('span', { class: 'dropdown-option-check' }, selectedOption ? 'Added' : 'Add')
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
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('circle', { cx: '7', cy: '7', r: '4.2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4' }),
    h('path', { d: 'M10.2 10.2L13 13', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' })
  );
}

function chevronSvg() {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.5 6l3.5 4 3.5-4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function lockSvg() {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M4.5 7V5.7a3.5 3.5 0 1 1 7 0V7', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
    h('rect', { x: '3', y: '7', width: '10', height: '7', rx: '1.8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4' }),
    h('path', { d: 'M8 9v1.75', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' })
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

function getMlsOptionsForCity() {
  return MLS_BY_CITY[state.form.city] || MLS_OPTIONS;
}

function selectCity(option) {
  updateState((s) => {
    s.form.city = option;
    s.ui.cityOpen = false;
    s.ui.cityQuery = '';
    const allowed = MLS_BY_CITY[option] || MLS_OPTIONS;
    s.form.mls = getSelectedMls().filter((item) => allowed.includes(item));
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
  return h('div', { class: 'section' },
    h('div', { class: 'section-head' },
      h('div', {}, h('h3', { class: 'section-title' }, 'Mel'))
    ),
    h('div', { class: 'section-body grid-2' },
      infoCard('Prompt', 'Offer sample prompts that are short and concrete.', 'Show me the next best follow-up.'),
      infoCard('Call', 'Make the call outcome visible as soon as it happens.', 'Call summary generated.'),
      infoCard('Rules', 'Prospecting rules belong near the workflow.', 'Follow-up after 2 days.'),
      infoCard('Proof', 'Prefer a believable demo client to an empty assistant.', 'Test client created from user data.')
    ),
    h('div', { class: 'section-foot' },
      button(state.actions.melOpened ? 'Mel opened' : 'Chat with Mel', 'btn-primary', openMel, { disabled: state.ui.loading }),
      button('Skip to paywall', 'btn-secondary', () => setPhase(6))
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
      field('City', 'mobile-city', state.form.city, 'Austin, TX'),
      field('MLS name', 'mobile-mls', state.form.mls, 'Austin Board of Realtors')
    )
  );
}

function renderMobileClients() {
  return h('div', {},
    h('div', { class: 'section-head' }, h('div', {}, h('h3', { class: 'section-title' }, 'My clients'), h('p', { class: 'section-copy' }, 'Add 3 to 5 clients to unlock Mel.'))),
    h('div', { class: 'section-body' },
      h('div', { class: 'empty-shell' },
        h('div', { class: 'note' }, 'Add three contacts. CSV support stays one tap away.'),
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
  if (!state.form.brokerage || !state.form.city || !getSelectedMls().length) {
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
  const sheet = document.getElementById('workflow-sheet');
  if (sheet && typeof sheet.focus === 'function') {
    sheet.focus();
  }
}

async function addClient(kind, overrides = {}) {
  const name = overrides.name || `Client ${state.clients.length + 1}`;
  const source = kind === 'csv' ? 'csv' : 'manual';
  await runAction(kind === 'csv' ? 'csv' : 'client', async () => {
    if (kind === 'csv') await getApi().importCsv({ rows: 3 });
    else await getApi().addClient({ name, source });
  });
  updateState((s) => {
    s.clients.push({ id: cryptoId(), name, source });
    if (source === 'csv') s.actions.csvImported = true;
    s.ui.sheet = null;
    if (s.clients.length >= 3) s.phase = 4;
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
    s.phase = 6;
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
  const isClient = state.ui.sheet === 'client';
  const backdrop = h('div', { class: 'sheet-backdrop open', onClick: closeSheet });
  const sheet = h('div', {
    class: 'sheet open',
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
    h('div', { class: 'sheet-foot' },
      button('Back', 'btn-secondary', closeSheet),
      button(isCsv ? 'Import CSV' : 'Save client', 'btn-primary', () => {
        if (isCsv) addClient('csv', { name: `CSV Client ${state.clients.length + 1}` });
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
  return h('div', { class: 'grid-2' },
    h('div', {}),
    h('div', {},
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'CSV source file'), h('input', { class: 'input', placeholder: 'clients.csv', value: '' })),
      h('label', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'field-label' }, 'Rows detected'), h('input', { class: 'input', value: '3' }))
    )
  );
}

function renderClientSheet() {
  return h('div', { class: 'grid-2' },
    h('div', {},
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Full name'), h('input', { id: 'client-name', class: 'input', placeholder: 'Avery Johnson', value: '' })),
      h('label', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'field-label' }, 'Source'), h('input', { class: 'input', value: 'Manual' }))
    ),
    h('div', {})
  );
}

function closeSheet() {
  updateState((s) => {
    s.ui.sheet = null;
    s.ui.dirtySheet = false;
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
  root.innerHTML = '';
  if (state.view === 'landing') {
    root.append(renderLanding());
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
