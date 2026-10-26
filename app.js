/* Business Bay Team app */
(function () {
  'use strict';

  const CONFIG = window.APP_CONFIG || {};
  // The folder the app is served from, e.g. "/" or "/DXBAIPI/" on GitHub Pages.
  const BASE = location.pathname.replace(/[^/]*$/, '') || '/';
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  /* ---------------- Storage ---------------- */
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------------- State ---------------- */
  const state = {
    token: LS.get('bb_token'),
    user: LS.get('bb_user'),
    canPublish: LS.get('bb_pub') || [],
    posts: LS.get('bb_posts') || [],
    lastLoad: 0,
    loadingFeed: false,
    offline: false,
    lists: LS.get('bb_lists'),
    filter: { cat: 'All', prop: 'All', q: '' },
    route: { name: 'feed', params: {} },
    myPosts: null,
    staff: null,
    adminTab: 'pending',
    staffQuery: '',
    mineFilter: { status: 'All', q: '' },
    shareCache: {},
    installEvt: null,
    signupProperty: '',
    pendingStatus: null,
    categories: LS.get('bb_cats') || null,
    settings: LS.get('bb_settings') || { heroImage: '', logo: '', logoTone: 'dark', fonts: {} },
    adminSection: 'team',
    adminCats: null,
    photoBusy: false,
    collections: LS.get('bb_colls') || [],
    birthdaysToday: LS.get('bb_bd_today') || [],
    birthdaysMonth: LS.get('bb_bd_month') || [],
    myBirthday: false,
    adminColls: null,
    bdayList: null,
    bdayQuery: '',
    bdayImport: null,
    lndMonth: '',
    lndDay: '',
    deepLinkPost: new URLSearchParams(location.search).get('post'),
    deepLinkBirthday: new URLSearchParams(location.search).get('birthday') === '1',
    theme: LS.get('bb_theme') || null,
    popups: [],
    popupList: null,
    openedAt: Date.now(),
    deepLinkAccess: new URLSearchParams(location.search).get('access') === '1',
    deepLinkReport: new URLSearchParams(location.search).get('report'),
    myBdayInfo: LS.get('bb_my_bday') || null
  };

  const REFRESH_MS = 5 * 60 * 1000;
  const DEFAULT_CATS = [
    { id: 'HR', label: 'HR', type: 'update', ack: true, active: true, color: 'blue', roles: ['HR'] },
    { id: 'F&B Offer', label: 'F&B Offers', type: 'offer', ack: false, active: true, color: 'gold', roles: ['Marketing'] },
    { id: 'Notice', label: 'Notices', type: 'update', ack: true, active: true, color: 'red', roles: ['HR', 'Marketing'] },
    { id: 'Monthly Update', label: 'Monthly Update', type: 'monthly', ack: false, active: true, color: 'navy', roles: ['Marketing'] }
  ];
  const TYPE_INFO = {
    update: { name: 'Update', desc: 'Title and message, e.g. HR updates, notices' },
    offer: { name: 'Offer', desc: 'Price, timing, location, inclusions and image' },
    monthly: { name: 'Newsletter', desc: 'Monthly update card with a PDF and this month’s offers' },
    people: { name: 'People', desc: 'A colleague with photo: awards, new joiners, promotions' },
    training: { name: 'Training', desc: 'Learning & Development: date, time, venue and presenter' }
  };
  const COLORS = { blue: '#1C4E9B', gold: '#A87B3D', red: '#9B2C2C', green: '#1E6B45', purple: '#5B3C88', navy: '#13294B', grey: '#6B717E', teal: '#1F6F72', orange: '#B65417', pink: '#A8325E', burgundy: '#6E1F3A' };
  const COLOR_NAMES = {};
  const GROUPS = { hr: 'HR tab', marketing: 'Offers tab', general: 'Home only' };
  const ANIMS = { none: 'None', sparkle: 'Sparkle', confetti: 'Confetti', snow: 'Snow', lights: 'Lights', fireworks: 'Fireworks', bubbles: 'Bubbles', hearts: 'Hearts', petals: 'Petals' };
  const FESTIVE_RED = '#B3202A';
  const colorHex = (c) => COLORS[c] || (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : COLORS.grey);
  // DXBAI = Embassy Suites by Hilton Dubai Business Bay, DXBPI = Hilton Garden Inn Dubai Business Bay
  const HOTELS = ['DXBAI', 'DXBPI'];
  const PROP_LABEL = { DXBAI: 'DXBAI · Embassy Suites', DXBPI: 'DXBPI · Hilton Garden Inn', Cluster: 'Cluster' };
  const postProp = (v) => (HOTELS.indexOf(v) >= 0 ? v : 'Cluster');
  const APP_NAME = CONFIG.appName || 'Business Bay Team';
  const MAIN = '#13294B'; // Hilton navy
  const DARK_BAR = '#0F131A'; // status bar in dark mode

  /* ---------------- Icons ---------------- */
  const sv = (d, w) => `<svg width="${w || 22}" height="${w || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5 7.5 12l7 7"/></svg>',
    home: sv('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    tag: sv('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    edit: sv('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
    shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    bell: sv('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>', 20),
    search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', 18),
    pin: sv('<path d="M12 17v5"/><path d="M9 10.8V4h6v6.8l3 3.2H6z"/>', 18),
    check: sv('<path d="M5 12l5 5L20 7"/>', 20),
    plus: sv('<path d="M12 5v14M5 12h14"/>', 26),
    file: sv('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', 20),
    image: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>', 26),
    cal: sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', 16),
    share: sv('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>', 22),
    addHome: sv('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>', 22),
    refresh: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', 20),
    inbox: sv('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>', 40),
    logout: sv('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>', 20),
    eye: sv('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>', 18),
    users: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.7c1.8.7 3 2.5 3.5 5.3"/>'),
    chevron: sv('<path d="M9 6l6 6-6 6"/>', 18),
    heart: sv('<path d="M12 20s-7-4.6-9.2-8.3C1.2 8.9 2.6 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.4 0 4.8 3.4 3.2 6.2C19 15.4 12 20 12 20z"/>', 20),
    cake: sv('<path d="M4 21h16v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c1.5 1 3 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0"/><path d="M12 11V8"/><path d="M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z"/>', 22),
    award: sv('<circle cx="12" cy="9" r="5"/><path d="M8.5 13.2L7 21l5-2.5 5 2.5-1.5-7.8"/>', 16),
    sparkles: sv('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>', 20),
    qr: sv('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>', 20),
    star: sv('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>', 22),
    trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 16),
    clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 16),
    mapPin: sv('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 16),
    left: sv('<path d="M15 18l-6-6 6-6"/>', 18),
    right: sv('<path d="M9 6l6 6-6 6"/>', 18),
    gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>', 20)
  };

  /* ---------------- Seasonal theme ---------------- */
  const THEMES = {
    default: { name: 'Classic', primary: '#13294B', accent: '#B48A4E', background: '#F4EFE7', animation: 'none', greeting: '' },
    ramadan: { name: 'Ramadan', primary: '#17423B', accent: '#C9A227', background: '#F2EEE2', animation: 'lights', greeting: 'Ramadan Kareem' },
    eid: { name: 'Eid', primary: '#0F4C5C', accent: '#C49A3A', background: '#F1F0E8', animation: 'sparkle', greeting: 'Eid Mubarak' },
    nationalday: { name: 'UAE National Day', primary: '#0B5D33', accent: '#C8102E', background: '#F4F1EC', animation: 'fireworks', greeting: 'Happy UAE National Day' },
    festive: { name: 'Festive season', primary: '#7E1A1E', accent: '#B48A4E', background: '#F6EFE6', animation: 'snow', greeting: 'Season’s greetings' },
    diwali: { name: 'Diwali', primary: '#4E1C63', accent: '#D98A1C', background: '#F8F0E3', animation: 'sparkle', greeting: 'Happy Diwali' },
    summer: { name: 'Summer', primary: '#0B4F6C', accent: '#D9732B', background: '#F1F4F3', animation: 'none', greeting: '' },
    custom: { name: 'Custom', primary: '#13294B', accent: '#B48A4E', background: '#F4EFE7', animation: 'none', greeting: '' }
  };
  /** The theme to show: the preset filled in with any custom choices. Null when the classic look applies. */
  function activeTheme(t) {
    t = t || state.theme;
    if (!t || !t.live || !THEMES[t.preset] || t.preset === 'default') return null;
    const base = THEMES[t.preset];
    const pick = (k) => (t[k] !== undefined && t[k] !== null && t[k] !== '' ? t[k] : base[k]);
    return { preset: t.preset, primary: pick('primary'), accent: pick('accent'), background: pick('background'),
      animation: t.animation || base.animation, greeting: t.greeting !== undefined ? t.greeting : base.greeting };
  }
  /* Appearance (Profile › Appearance): light, dark, or automatic (follows the phone's setting). Saved on this phone. */
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const appearance = () => LS.get('bb_appearance') || 'auto';
  const isDark = () => appearance() === 'dark' || (appearance() === 'auto' && !!(darkQuery && darkQuery.matches));
  function applyAppearance() {
    document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
    applyTheme();
  }
  if (darkQuery) {
    const onScheme = () => { if (appearance() === 'auto') { applyAppearance(); } };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onScheme); else if (darkQuery.addListener) darkQuery.addListener(onScheme);
  }

  function applyTheme() {
    const root = document.documentElement.style;
    const t = activeTheme();
    const dark = document.documentElement.dataset.theme === 'dark';
    const vars = ['--navy', '--ink', '--navy-2', '--gold', '--gold-text', '--gold-light', '--gold-bg', '--cream'];
    vars.forEach((v) => root.removeProperty(v));
    if (!t) { setThemeColor(dark ? DARK_BAR : MAIN); return; }
    root.setProperty('--navy', t.primary);
    root.setProperty('--navy-2', `color-mix(in srgb, ${t.primary} 85%, #fff)`);
    root.setProperty('--gold', t.accent);
    if (!dark) {
      // In dark mode the season keeps its main and accent colours; text and backgrounds stay dark-mode colours.
      root.setProperty('--ink', t.primary);
      root.setProperty('--gold-text', `color-mix(in srgb, ${t.accent} 72%, #000)`);
      root.setProperty('--gold-light', `color-mix(in srgb, ${t.accent} 45%, #fff)`);
      root.setProperty('--gold-bg', `color-mix(in srgb, ${t.accent} 16%, #fff)`);
      root.setProperty('--cream', t.background);
    }
    setThemeColor(dark ? DARK_BAR : t.primary);
  }
  function setThemeColor(c) { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', c); }
  function setTheme(t) {
    if (!t) return;
    state.theme = t; LS.set('bb_theme', t); applyTheme();
  }
  function seasonBanner() {
    const t = activeTheme();
    if (!t || (!t.greeting && t.animation === 'none')) return '';
    return `<div class="season" ${t.animation !== 'none' ? `data-fx="${esc(t.animation)}"` : ''}>
      <span class="season-in">${I.sparkles}<b>${esc(t.greeting || THEMES[t.preset].name)}</b></span></div>`;
  }

  /* Solid versions of the bottom-bar icons, used for the active tab. */
  const svf = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IF = {
    feed: svf('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    hr: svf('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5z"/><circle cx="16.5" cy="8" r="3" /><path d="M17 14.6c2 .5 3.6 2.3 4.4 5.4H17.6c-.3-2-1.2-3.8-2.5-5z"/>'),
    today: svf('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'),
    offers: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12l-8 8-9-9V3h8z" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="1.8" fill="#fff"/></svg>`,
    profile: svf('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6z"/>')
  };

  /* ---------------- Categories & settings ---------------- */
  function normCat(c) {
    if (!c.group) c.group = { HR: 'hr', 'F&B Offer': 'marketing', 'Monthly Update': 'marketing' }[c.id] || (c.type === 'people' || c.type === 'training' ? 'hr' : 'general');
    if (!Array.isArray(c.subcategories)) c.subcategories = [];
    return c;
  }
  function cats() { return (state.categories && state.categories.length ? state.categories : DEFAULT_CATS).map(normCat); }
  function catOf(id) {
    const c = cats().find((x) => x.id === id) || (state.adminCats || []).find((x) => x.id === id) || {
      id, label: id, color: 'grey', ack: true,
      type: id === 'F&B Offer' ? 'offer' : id === 'Monthly Update' ? 'monthly' : 'update'
    };
    return normCat(c);
  }
  function setCategories(list) {
    if (Array.isArray(list) && list.length) { state.categories = list; LS.set('bb_cats', list); }
  }
  async function loadSettings() {
    try {
      const j = await api('appSettings');
      setSettings({ heroImage: j.heroImage || '' }, j.brand);
      setCategories(j.categories);
      setTheme(j.theme);
      if (state.route.name === 'login' && state.renderedLogin !== loginKey()) render();
    } catch (e) { /* keep cached settings */ }
  }

  /* ---------------- Hotel logo and fonts (Admin › App setup) ---------------- */
  /** Stores the sign-in image plus the brand settings (logo, logo tone, uploaded fonts). */
  function setSettings(base, brand) {
    const s = Object.assign({}, state.settings || {}, base || {});
    if (brand) {
      s.logo = safeUrl(brand.logo);
      s.logoTone = brand.logoTone === 'light' ? 'light' : 'dark';
      s.reportLogo = safeUrl(brand.reportLogo);
      s.hotels = brand.hotels || {};
      s.outletLogos = brand.outletLogos || {};
      s.fonts = brand.fonts || {};
    }
    state.settings = s;
    LS.set('bb_settings', s);
    if (brand) Fonts.apply(s.fonts);
  }
  const loginKey = () => [safeUrl(state.settings.heroImage), safeUrl(state.settings.logo), state.settings.logoTone].join('|');
  /** The logo as an <img>. onDark: shown on a dark surface (a dark logo shows white there). */
  function logoImg(cls, onDark) {
    const url = safeUrl(state.settings && state.settings.logo);
    if (!url) return '';
    const tone = state.settings.logoTone === 'light' ? 'tone-light' : 'tone-dark';
    return `<img class="${cls || ''} ${onDark ? 'on-dark-logo' : 'on-light-logo'} ${tone}" src="${esc(url)}" alt="${esc(APP_NAME)}">`;
  }

  /**
   * Fonts an Admin uploads load as "AppHeading" (headlines) and "AppBody" (body text), in place of Hilton Serif and Hilton Sans.
   * They come from the backend once, then are kept on the device (Cache Storage), so later opens are instant and work offline.
   */
  const FONT_SLOTS = {
    heading: { family: 'AppHeading', weight: '400', label: 'Headlines · Regular', hint: 'Hilton Serif' },
    headingBold: { family: 'AppHeading', weight: '600 900', label: 'Headlines · Bold', hint: 'Hilton Serif' },
    body: { family: 'AppBody', weight: '400', label: 'Body text · Regular', hint: 'Hilton Sans' },
    bodyBold: { family: 'AppBody', weight: '600 900', label: 'Body text · Bold', hint: 'Hilton Sans' }
  };
  const Fonts = {
    faces: {},
    queue: Promise.resolve(),
    CACHE: 'fonts-bb',
    apply(fonts) {
      this.queue = this.queue.then(() => this.run(fonts || {})).catch(() => {});
      return this.queue;
    },
    async run(fonts) {
      if (!('FontFace' in window) || !document.fonts) return;
      let changed = false;
      for (const slot of Object.keys(FONT_SLOTS)) {
        const meta = fonts[slot];
        const cur = this.faces[slot];
        if (cur && (!meta || cur.fileId !== meta.id)) {
          try { document.fonts.delete(cur); } catch (e) { /* ignore */ }
          delete this.faces[slot];
          changed = true;
        }
        if (meta && meta.id && !this.faces[slot]) {
          try {
            const buf = await this.bytes(slot, meta.id);
            const ff = new FontFace(FONT_SLOTS[slot].family, buf, { weight: FONT_SLOTS[slot].weight, style: 'normal', display: 'swap' });
            await ff.load();
            ff.fileId = meta.id;
            document.fonts.add(ff);
            this.faces[slot] = ff;
            changed = true;
          } catch (e) { /* keep the built-in font */ }
        }
      }
      this.tidy(fonts);
      if (changed) Share.current = null;
    },
    async bytes(slot, id) {
      const key = 'font-file/' + encodeURIComponent(id);
      let cache = null;
      try { cache = await caches.open(this.CACHE); } catch (e) { cache = null; }
      if (cache) {
        try { const hit = await cache.match(key); if (hit) return await hit.arrayBuffer(); } catch (e) { /* fetch again */ }
      }
      const j = await api('getFont', { slot });
      if (j.id !== id) throw new Error('Font changed');
      const bin = atob(j.data);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      if (cache) { try { await cache.put(key, new Response(buf.slice(), { headers: { 'Content-Type': j.mimeType || 'font/woff2' } })); } catch (e) { /* storage full */ } }
      return buf.buffer;
    },
    async tidy(fonts) {
      try {
        const keep = Object.keys(fonts).map((k) => fonts[k] && 'font-file/' + encodeURIComponent(fonts[k].id)).filter(Boolean);
        const cache = await caches.open(this.CACHE);
        (await cache.keys()).forEach((req) => { if (!keep.some((k) => req.url.endsWith(k))) cache.delete(req); });
      } catch (e) { /* ignore */ }
    }
  };

  function avatarHtml(u, size) {
    const sz = size || 44;
    const img = safeUrl(u && u.photo);
    return `<div class="avatar" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz / 3.1)}px">${img ? `<img src="${esc(img)}" alt="">` : esc(initials(u && u.name))}</div>`;
  }

  /* ---------------- Helpers ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '');
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
  const isPublisher = () => state.canPublish && state.canPublish.length > 0;
  const isAdmin = () => state.user && state.user.role === 'Admin';
  const canCollect = () => state.user && (state.user.role === 'Admin' || state.user.role === 'Marketing');
  /** Awards (Employee of the Month) and Promotions get confetti. */
  const celebrates = (c) => c.type === 'people' && ((c.subcategories && c.subcategories.length > 0) || /month|promot|award/i.test(c.label + ' ' + c.id));
  const isAward = (c) => c.type === 'people' && c.subcategories && c.subcategories.length > 0;
  const canEditPost = (p) => !!state.user && (isAdmin() || (isPublisher() && !!p.postedById && p.postedById === state.user.employeeId));
  const editBtn = (p, cls) => canEditPost(p) ? `<button class="icon-btn ${cls || ''}" type="button" data-act="editPost" data-id="${esc(p.id)}" aria-label="Edit post">${I.edit}</button>` : '';
  const canPopups = () => state.user && ['Admin', 'HR', 'Marketing'].indexOf(state.user.role) >= 0;
  const canApprove = () => state.user && (state.user.role === 'Admin' || state.user.role === 'HR');
  const canBirthdays = () => state.user && (state.user.role === 'Admin' || state.user.role === 'HR');
  /** Search people by first name, last name or Employee ID (leading zeros ignored). Every word typed must match. */
  function personMatches(q, p) {
    const words = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const parts = String(p.name || '').toLowerCase().split(/[\s-]+/);
    const id = String(p.employeeId || '').toLowerCase().replace(/^0+(?=.)/, '');
    const dept = String(p.department || '').toLowerCase();
    return words.every((w) => {
      const wid = w.replace(/^0+(?=.)/, '');
      return parts.some((x) => x.startsWith(w)) || id.indexOf(wid) >= 0 || dept.startsWith(w);
    });
  }
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /** Every date in the app reads DD/MM/YY (Dubai time). */
  const dmy = (dt) => dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Dubai' });
  const dmyIso = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1].slice(2) : ''; };
  const wdIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' }); };
  const hm = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
  function fmtDate(iso) { return iso ? dmyIso(iso) : ''; }
  function fmtStamp(ts) { return ts ? dmy(new Date(ts)) + ', ' + hm(ts) : ''; }
  function ago(ts) {
    if (!ts) return '';
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 7 * 86400) return Math.floor(s / 86400) + 'd ago';
    return dmy(new Date(ts));
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
  }
  function money(v) {
    if (v === '' || v == null) return '';
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('en-US');
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  /* ---------------- API ---------------- */
  async function api(action, data) {
    const payload = Object.assign({ action }, data || {});
    if (state.token) payload.token = state.token;
    if (!CONFIG.apiUrl) throw new Error('The app is not connected yet: paste the Apps Script link into config.js (apiUrl).');
    let res;
    try {
      res = await fetch(CONFIG.apiUrl, { method: 'POST', body: JSON.stringify(payload) });
    } catch (e) {
      throw new Error('No connection. Check your internet and try again.');
    }
    let j;
    try {
      j = await res.json();
    } catch (e) {
      throw new Error('The server is not responding properly. Please try again in a moment.');
    }
    if (!j.ok) {
      if (j.error === 'SESSION_EXPIRED' || j.error === 'ACCESS_REMOVED') {
        signOut(j.error === 'ACCESS_REMOVED' ? 'Your access to the app has ended. Please contact HR or your Admin if this is a mistake.' : 'Please sign in again.');
        const err = new Error('handled');
        err.handled = true;
        throw err;
      }
      throw new Error(j.error || 'Something went wrong.');
    }
    return j;
  }
  function showError(e) {
    if (e && e.handled) return;
    toast((e && e.message) || 'Something went wrong.');
  }

  function saveSession(j) {
    state.token = j.token || state.token;
    state.user = j.user || state.user;
    state.canPublish = j.canPublish || [];
    LS.set('bb_token', state.token);
    LS.set('bb_user', state.user);
    LS.set('bb_pub', state.canPublish);
  }

  /** A short name for this phone or computer, shown when someone is already signed in elsewhere. */
  function deviceLabel() {
    const ua = navigator.userAgent;
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad'
      : /Android/.test(ua) ? ((/;\s*([^;)]+?)\s+Build\//.exec(ua) || [])[1] || 'Android phone')
      : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows computer' : 'computer';
    return os;
  }

  /** Signs out on the server first, so this person can sign in on another device. */
  async function signOutOnServer() {
    if (!state.token) return true;
    try {
      const res = await fetch(CONFIG.apiUrl, { method: 'POST', body: JSON.stringify({ action: 'logout', token: state.token }), keepalive: true });
      await res.json();
      return true;
    } catch (e) { return false; }
  }

  function signOut(message) {
    Push.untag();
    ['bb_token', 'bb_user', 'bb_pub', 'bb_posts'].forEach(LS.del);
    Object.assign(state, { token: null, user: null, canPublish: [], posts: [], myPosts: null, staff: null });
    go('login', {}, true);
    if (message) toast(message);
  }

  /** Text the sheet turned into a date (e.g. "07 December") shows as "7 December" again. */
  function fixDates(p) {
    ['days', 'subtitle', 'position', 'serves'].forEach((k) => {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(p[k] || ''))) p[k] = dmy(new Date(p[k]));
    });
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(p.timing || ''))) p.timing = new Date(p.timing).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
    return p;
  }

  async function loadFeed(silent) {
    if (!state.token || state.loadingFeed) return;
    state.loadingFeed = true;
    if (!silent) refreshFeedArea();
    try {
      const j = await api('feed');
      state.posts = (j.posts || []).map(fixDates);
      state.offline = false;
      state.lastLoad = Date.now();
      saveSession(j);
      setCategories(j.categories);
      setTheme(j.theme);
      if (j.brand) setSettings({ heroImage: j.heroImage !== undefined ? j.heroImage || '' : state.settings.heroImage }, j.brand);
      state.popups = j.popups || [];
      state.collections = j.collections || [];
      state.birthdaysToday = j.birthdaysToday || [];
      state.birthdaysMonth = j.birthdaysMonth || [];
      state.myBirthday = !!j.myBirthday;
      if (j.myBirthdayInfo) { state.myBdayInfo = j.myBirthdayInfo; LS.set('bb_my_bday', j.myBirthdayInfo); }
      LS.set('bb_posts', state.posts);
      LS.set('bb_colls', state.collections);
      LS.set('bb_bd_today', state.birthdaysToday);
      LS.set('bb_bd_month', state.birthdaysMonth);
      Push.tag();
      Preload.images(state.posts);
      maybeCelebrate();
      schedulePopups();
      state.farewell = j.farewell || null;
      state.quote = j.quote || null;
      maybeFarewell();
    } catch (e) {
      if (!e.handled) {
        state.offline = true;
        if (!silent) showError(e);
      }
    } finally {
      state.loadingFeed = false;
    }
    if (state.deepLinkPost && state.posts.some((p) => p.id === state.deepLinkPost)) {
      const id = state.deepLinkPost;
      state.deepLinkPost = null;
      history.replaceState(null, '', location.pathname);
      go('post', { id });
      return;
    }
    if (['feed', 'offers', 'post', 'hr', 'today', 'section', 'collection', 'search'].indexOf(state.route.name) >= 0) render();
  }

  async function getLists() {
    if (state.lists) return state.lists;
    try {
      const j = await api('lists');
      state.lists = { departments: j.departments || [], outlets: j.outlets || [] };
      LS.set('bb_lists', state.lists);
    } catch (e) {
      state.lists = { departments: [], outlets: [] };
    }
    return state.lists;
  }

  /* ---------------- Image preloading ---------------- */
  /** After the feed loads, fetch every post image and photo in the background (the service worker keeps them),
   *  so opening a post shows its picture straight away. */
  const Preload = {
    done: new Set(),
    keep: [],
    images(posts) {
      const urls = [];
      (posts || []).forEach((p) => {
        [p.image, p.personPhoto].concat((p.attendees || []).map((a) => a.photo)).forEach((u) => { if (safeUrl(u) && !this.done.has(u)) urls.push(u); });
      });
      (state.birthdaysToday || []).concat(state.birthdaysMonth || []).forEach((b) => { if (safeUrl(b.photo) && !this.done.has(b.photo)) urls.push(b.photo); });
      if (state.user && safeUrl(state.user.photo)) urls.push(state.user.photo);
      const queue = urls.filter((u, i) => urls.indexOf(u) === i);
      const next = () => {
        const batch = queue.splice(0, 4);
        if (!batch.length) return;
        Promise.all(batch.map((u) => new Promise((res) => {
          this.done.add(u);
          const im = new Image();
          im.referrerPolicy = 'no-referrer';
          im.decoding = 'async';
          im.onload = im.onerror = () => res();
          im.src = u;
          this.keep.push(im);
          if (im.decode) im.decode().catch(() => {});
        }))).then(() => (window.requestIdleCallback ? requestIdleCallback(next, { timeout: 800 }) : setTimeout(next, 60)));
      };
      next();
      if (this.keep.length > 300) this.keep = this.keep.slice(-200);
    }
  };

  /* ---------------- Push (OneSignal) ---------------- */
  const Push = {
    started: false,
    ready: false,
    init() {
      if (!CONFIG.oneSignalAppId || this.started) return;
      this.started = true;
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      const s = document.createElement('script');
      s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      s.defer = true;
      document.head.appendChild(s);
      window.OneSignalDeferred.push(async (OS) => {
        try {
          await OS.init({
            appId: CONFIG.oneSignalAppId,
            serviceWorkerPath: BASE.replace(/^\//, '') + 'sw.js',
            serviceWorkerParam: { scope: BASE },
            notifyButton: { enable: false },
            promptOptions: { slidedown: { prompts: [] } }
          });
          this.ready = true;
          this.optedIn = !!OS.User.PushSubscription.optedIn;
          OS.Notifications.addEventListener('permissionChange', () => { this.tag(); render(); });
          OS.User.PushSubscription.addEventListener('change', (ev) => {
            this.optedIn = !!(ev && ev.current && ev.current.optedIn);
            if (state.route.name === 'profile') render();
          });
          this.tag();
          if (state.route.name === 'profile') render();
        } catch (e) { /* push unavailable on this browser */ }
      });
    },
    tag() {
      if (!this.ready || !state.user) return;
      const u = state.user;
      window.OneSignalDeferred.push(async (OS) => {
        try {
          await OS.login(String(u.employeeId));
          await OS.User.addTags({ property: HOTELS.indexOf(u.property) >= 0 ? u.property : 'ALL', approved: '1' });
        } catch (e) { /* ignore */ }
      });
    },
    untag() {
      if (!this.ready) return;
      window.OneSignalDeferred.push(async (OS) => {
        try {
          await OS.User.removeTags(['property', 'approved']);
          await OS.logout();
        } catch (e) { /* ignore */ }
      });
    },
    optedIn: false,
    permission() {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission;
    },
    isOn() { return this.permission() === 'granted' && this.optedIn; },
    setOn(on) {
      if (!CONFIG.oneSignalAppId) { toast('Notifications are not set up yet.'); render(); return; }
      if (isIOS() && !isStandalone()) { toast('First add the app to your Home Screen, then open it from there.'); go('install'); return; }
      if (on && this.permission() === 'denied') { toast('Notifications are blocked for this app. Turn them on in your phone settings.'); render(); return; }
      if (this.permission() === 'unsupported') { toast('This browser does not support notifications. Please use Chrome or Safari.'); render(); return; }
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OS) => {
        try {
          if (on) {
            if (Notification.permission !== 'granted') await OS.Notifications.requestPermission();
            if (Notification.permission === 'granted') {
              await OS.User.PushSubscription.optIn();
              this.tag();
              toast('Notifications are on.');
            }
          } else {
            await OS.User.PushSubscription.optOut();
            toast('Notifications are off.');
          }
          if (on) LS.del('bb_push_off'); else LS.set('bb_push_off', true);
          this.optedIn = !!OS.User.PushSubscription.optedIn;
        } catch (e) { toast('Could not change notifications. Please try again.'); }
        render();
      });
    },
    enable() {
      if (!CONFIG.oneSignalAppId) { toast('Notifications are not switched on yet. Your Admin will turn them on soon.'); return; }
      if (isIOS() && !isStandalone()) { go('install'); return; }
      if (this.permission() === 'denied') { toast('Notifications are blocked. Turn them on in your phone settings for this app.'); return; }
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OS) => {
        try {
          await OS.Notifications.requestPermission();
          this.tag();
        } catch (e) { /* ignore */ }
        render();
      });
    }
  };

  /* ---------------- Router ---------------- */
  function go(name, params, replace) {
    state.route = { name, params: params || {} };
    const st = { name, params: state.route.params };
    if (replace) history.replaceState(st, ''); else history.pushState(st, '');
    render({ dir: replace ? 'fade' : 'forward', top: true });
  }
  window.addEventListener('popstate', (e) => {
    const st = e.state || { name: state.token ? 'feed' : 'login', params: {} };
    state.route = { name: st.name, params: st.params || {} };
    render({ dir: 'back' });
  });
  function back(fallback) {
    if (history.state && history.length > 1) history.back();
    else go(fallback || 'feed', {}, true);
  }

  /* ---------------- Render ---------------- */
  const PUBLIC = ['login', 'signup', 'pending'];
  /*
   * Screen transitions. Moving to a new screen animates the whole screen in one smooth, GPU-friendly move
   * (slide forward, slide back, or a soft cross-fade between the bottom-bar tabs); the bar itself stays put.
   * Refreshing the same screen with new data never animates. Uses the browser's View Transitions where available
   * (iPhone iOS 18+, Android Chrome), otherwise a single screen-level slide.
   */
  const TABS = ['feed', 'hr', 'today', 'offers', 'profile'];
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function screenName() {
    let name = state.route.name;
    if (!state.token && PUBLIC.indexOf(name) < 0) name = 'login';
    if (state.token && PUBLIC.indexOf(name) >= 0) name = 'today';
    return name;
  }
  function paint(top) {
    const name = screenName();
    const view = VIEWS[name] || VIEWS.feed;
    if (name !== 'checkin') Scanner.stop();
    if (name !== 'checkinHost') Host.stop();
    FX.stop();
    app.innerHTML = view(state.route.params);
    if (top) window.scrollTo(0, 0);
    afterPaint();
    FX.start(app);
    const auto = app.querySelector('[data-autofocus]');
    if (auto && !('ontouchstart' in window)) auto.focus();
  }
  function render(opts) {
    opts = opts || {};
    const name = screenName();
    const key = name + '|' + JSON.stringify(state.route.params || {});
    const changed = key !== state.lastScreen;
    const prev = state.lastName;
    state.lastScreen = key;
    state.lastName = name;
    Transit.finish();
    if (!changed || !prev || reduceMotion()) { paint(opts.top); return; }
    let dir = opts.dir || 'fade';
    if (TABS.indexOf(name) >= 0 && TABS.indexOf(prev) >= 0) dir = 'tab';
    Transit.run(dir, () => paint(opts.top));
  }

  /*
   * Screen transitions without blank frames: the old screen is kept as a still copy on top of (or under) the new one,
   * and the two move together, so something is always on screen. Works the same on every phone and browser.
   */
  const Transit = {
    snap: null, timer: 0, holder: null, scr: null,
    finish() {
      clearTimeout(this.timer);
      if (this.snap) { this.snap.remove(); this.snap = null; }
      // Put the bottom bar and + button back into the screen they belong to.
      if (this.holder) {
        if (this.scr && this.scr.isConnected) [...this.holder.children].forEach((n) => this.scr.appendChild(n));
        this.holder.remove();
        this.holder = null;
      }
      const s = app.querySelector('.screen.tr-in');
      if (s) s.className = s.className.replace(/\btr-in(-\w+)?\b/g, '').trim();
      document.documentElement.classList.remove('in-transit');
    },
    run(dir, paintNew) {
      const y = window.scrollY;
      const rect = app.getBoundingClientRect();
      const snap = document.createElement('div');
      snap.className = 'tr-snap tr-out-' + dir;
      const oldScr = app.querySelector('.screen');
      if (oldScr && oldScr.classList.contains('coll-page')) snap.style.background = oldScr.style.getPropertyValue('--bg');
      snap.setAttribute('aria-hidden', 'true');
      snap.style.left = rect.left + 'px';
      snap.style.width = rect.width + 'px';
      const inner = document.createElement('div');
      inner.className = 'tr-inner';
      inner.style.marginTop = -y + 'px';
      inner.innerHTML = app.innerHTML;
      inner.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      // Keep the sticky top bar where it was on screen.
      const tb = inner.querySelector('.topbar.tb');
      if (tb && y > 12) { tb.style.position = 'relative'; tb.style.top = (y - 12) + 'px'; }
      inner.querySelectorAll('canvas, .hap-ov, input, select, textarea').forEach((n) => { if (n.tagName === 'CANVAS' || n.classList.contains('hap-ov')) n.remove(); else n.setAttribute('tabindex', '-1'); });
      snap.appendChild(inner);
      document.documentElement.classList.add('in-transit');
      document.body.appendChild(snap);
      this.snap = snap;
      paintNew();
      const scr = app.querySelector('.screen');
      if (scr) {
        // The bottom bar and + button stay perfectly still while the screen moves (moved out of the moving layer).
        const fixed = [...scr.children].filter((n) => n.matches('.nav, .fab, .nav-blur'));
        if (fixed.length) {
          const holder = document.createElement('div');
          holder.className = 'tr-fixed';
          fixed.forEach((n) => holder.appendChild(n));
          document.body.appendChild(holder);
          this.holder = holder;
        }
        this.scr = scr;
        scr.classList.add('tr-in', 'tr-in-' + dir);
      }
      this.timer = setTimeout(() => this.finish(), dir === 'tab' || dir === 'fade' ? 340 : 460);
    }
  };

  function nav(active) {
    const map = { quotes: 'today', leavers: 'profile', me: 'profile', popups: 'profile', myposts: 'profile', admin: 'profile', adminTeam: 'profile', adminSetup: 'profile', setupSection: 'profile', appearance: 'profile', attendees: 'hr', birthdays: 'hr', collections: 'offers' };
    active = map[active] || active;
    const items = [['feed', 'Home', I.home], ['hr', 'HR', I.users], ['today', 'Today', I.star], ['offers', 'Offers', I.tag], ['profile', 'Profile', I.user]];
    const pending = canApprove() && state.staff ? state.staff.filter((s) => s.status === 'Pending').length : 0;
    return `<div class="nav-blur" aria-hidden="true"></div><nav class="nav" aria-label="Main"><span class="nav-lens" aria-hidden="true"></span>
      <div class="nav-brand" aria-hidden="true">${safeUrl(state.settings.logo) ? logoImg('nav-logo', false) : `<span class="monogram">${esc(CONFIG.monogram || 'BB')}</span><b>${esc(CONFIG.appShortName || CONFIG.appName)}</b>`}</div>
      ${items.map(([k, label, ic]) => `
      <button type="button" class="${k === 'today' ? 'nav-today' : ''}" data-act="nav" data-to="${k}" ${active === k ? 'aria-current="page"' : ''}><span class="ic">${active === k && IF[k] ? IF[k] : ic}</span><span class="lb">${k === 'today' ? '<span class="lb-m">Today</span><span class="lb-d">Today’s Special</span>' : label}</span>${k === 'profile' && pending ? `<span class="badge">${pending}</span>` : ''}</button>`).join('')}</nav>`;
  }

  function catTag(c, text) {
    return `<span class="tag" style="--c:${esc(colorHex(c.color))}" data-c>${esc(text || c.label)}</span>`;
  }
  function tagFor(p, onDark) {
    const c = catOf(p.category);
    if (onDark) return `<span class="tag tag-monthly">${esc(c.label)} · ${esc(postProp(p.property))}</span>`;
    return catTag(c, c.label + ' · ' + postProp(p.property));
  }

  /* ---------------- Festive animations ---------------- */
  const FX = (() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stops = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const PAL = {
      confetti: ['#E8577E', '#F2B640', '#4C8DDB', '#3FB58A', '#9B6BD6', '#FF8A3D'],
      sparkle: ['#FFE7A3', '#FFFFFF', '#F7D27A'],
      lights: ['#FFD27A', '#FFB36B', '#FFF1C2', '#FF9DB0'],
      fireworks: ['#FFD54F', '#FF6E6E', '#7FD3FF', '#B9F6CA', '#FFFFFF'],
      bubbles: ['#CFE8FF', '#E6F4FF', '#BFE3F2', '#FFFFFF'],
      hearts: ['#FF6E8E', '#FF9DB0', '#F26D8B', '#FFC2D1', '#E8577E'],
      petals: ['#FFC9D6', '#FAD7A0', '#F8BBD0', '#FDE2B8', '#F6A5C0']
    };
    function make(type, w, h, opts) {
      const n = { confetti: opts.burst ? (opts.once ? 70 : 160) : opts.soft ? 14 : 40, sparkle: 26, snow: 60, lights: 18, fireworks: 0, bubbles: 28, hearts: 20, petals: 36 }[type] || 0;
      const ps = [];
      for (let i = 0; i < n; i++) ps.push(spawn(type, w, h, opts, true));
      return ps;
    }
    function spawn(type, w, h, opts, initial) {
      const c = PAL[type] ? PAL[type][Math.floor(Math.random() * PAL[type].length)] : '#fff';
      if (type === 'confetti' && opts.soft) return { x: rnd(0, w), y: initial ? rnd(-h, h) : rnd(-40, -8), vx: rnd(-0.35, 0.35), vy: rnd(0.45, 1.05), r: rnd(0, 6.28), vr: rnd(-0.08, 0.08), w: rnd(3.5, 6), h: rnd(6, 9), c, a: rnd(0.55, 0.85) };
      if (type === 'confetti') return { x: opts.burst && initial ? w / 2 + rnd(-40, 40) : rnd(0, w), y: opts.burst && initial ? h * 0.35 : rnd(-h, 0), vx: opts.burst && initial ? rnd(-9, 9) : rnd(-0.6, 0.6), vy: opts.burst && initial ? rnd(-14, -4) : rnd(1, 2.4), r: rnd(0, 6.28), vr: rnd(-0.2, 0.2), w: rnd(5, 9), h: rnd(8, 14), c };
      if (type === 'snow') return { x: rnd(0, w), y: initial ? rnd(0, h) : -6, r: rnd(1.2, 3.4), vy: rnd(0.4, 1.3), ph: rnd(0, 6.28), c: '#fff' };
      if (type === 'sparkle') return { x: rnd(0, w), y: rnd(0, h), s: rnd(3, 8), ph: rnd(0, 6.28), sp: rnd(0.03, 0.07), c };
      if (type === 'lights') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 20, r: rnd(10, 26), vy: rnd(0.15, 0.45), ph: rnd(0, 6.28), c };
      if (type === 'bubbles') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 20, r: rnd(5, 16), vy: rnd(0.5, 1.4), ph: rnd(0, 6.28), sw: rnd(0.6, 1.4), c };
      if (type === 'hearts') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 16, s: rnd(9, 18), vy: rnd(0.5, 1.1), ph: rnd(0, 6.28), sw: rnd(0.5, 1.2), c, a: rnd(0.7, 1) };
      if (type === 'petals') return { x: rnd(0, w), y: initial ? rnd(-h, h) : rnd(-30, -6), s: rnd(6, 11), vy: rnd(0.6, 1.5), vx: rnd(-0.3, 0.3), r: rnd(0, 6.28), vr: rnd(-0.05, 0.05), ph: rnd(0, 6.28), c };
      return null;
    }
    function heart(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.35);
      ctx.bezierCurveTo(x + s, y - s * 0.6, x + s * 1.1, y + s * 0.3, x, y + s);
      ctx.bezierCurveTo(x - s * 1.1, y + s * 0.3, x - s, y - s * 0.6, x, y + s * 0.35);
      ctx.fill();
    }
    function star(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    }
    /** Runs one animation on a canvas; returns a stop function. */
    function run(canvas, type, opts) {
      opts = opts || {};
      const ctx = canvas.getContext('2d');
      let w = 0, h = 0, raf = 0, ps = [], bursts = [], t = 0, alive = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      function size() {
        const r = canvas.getBoundingClientRect();
        w = r.width; h = r.height;
        canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      size();
      ps = make(type, w, h, opts);
      function frame() {
        if (!alive) return;
        t++;
        ctx.clearRect(0, 0, w, h);
        if (type === 'confetti') {
          ps.forEach((p, i) => {
            p.vy += opts.burst ? 0.25 : 0; if (opts.burst) { p.vx *= 0.985; p.vy = Math.min(p.vy, 4); }
            p.x += p.vx; p.y += p.vy; p.r += p.vr;
            if (p.y > h + 20) { if (opts.soft) ps[i] = spawn(type, w, h, { soft: true }, false); else if (!opts.burst || (!opts.once && t < 260)) ps[i] = spawn(type, w, h, {}, false); }
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = p.a || 1;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2); ctx.restore();
          });
        } else if (type === 'snow') {
          ps.forEach((p, i) => {
            p.y += p.vy; p.x += Math.sin(t / 40 + p.ph) * 0.4;
            if (p.y > h + 5) ps[i] = spawn(type, w, h, {}, false);
            ctx.globalAlpha = 0.85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
          });
          ctx.globalAlpha = 1;
        } else if (type === 'sparkle') {
          ps.forEach((p, i) => {
            p.ph += p.sp; const a = Math.max(0, Math.sin(p.ph));
            if (p.ph > 6.28) { ps[i] = spawn(type, w, h, {}, true); ps[i].ph = 0; }
            ctx.globalAlpha = a; ctx.fillStyle = p.c; star(ctx, p.x, p.y, p.s * (0.6 + a * 0.6));
          });
          ctx.globalAlpha = 1;
        } else if (type === 'lights') {
          ps.forEach((p, i) => {
            p.y -= p.vy; p.ph += 0.02;
            if (p.y < -30) ps[i] = spawn(type, w, h, {}, false);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = 0.35 + Math.sin(p.ph) * 0.2; ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
          });
          ctx.globalAlpha = 1;
        } else if (type === 'bubbles') {
          ps.forEach((p, i) => {
            p.y -= p.vy; p.x += Math.sin(t / 36 + p.ph) * p.sw;
            if (p.y < -20) ps[i] = spawn(type, w, h, {}, false);
            ctx.globalAlpha = 0.5; ctx.strokeStyle = p.c; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.stroke();
            ctx.globalAlpha = 0.18; ctx.fillStyle = p.c; ctx.fill();
            ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, Math.max(1, p.r * 0.18), 0, 6.28); ctx.fill();
          });
          ctx.globalAlpha = 1;
        } else if (type === 'hearts') {
          ps.forEach((p, i) => {
            p.y -= p.vy; p.x += Math.sin(t / 34 + p.ph) * p.sw;
            if (p.y < -24) ps[i] = spawn(type, w, h, {}, false);
            ctx.globalAlpha = p.a; ctx.fillStyle = p.c; heart(ctx, p.x, p.y, p.s);
          });
          ctx.globalAlpha = 1;
        } else if (type === 'petals') {
          ps.forEach((p, i) => {
            p.y += p.vy; p.x += p.vx + Math.sin(t / 40 + p.ph) * 0.5; p.r += p.vr;
            if (p.y > h + 20) ps[i] = spawn(type, w, h, {}, false);
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = 0.85; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.28); ctx.fill(); ctx.restore();
          });
          ctx.globalAlpha = 1;
        } else if (type === 'fireworks') {
          if (t % 55 === 1) {
            const cx = rnd(w * 0.15, w * 0.85), cy = rnd(h * 0.15, h * 0.55), c = PAL.fireworks[Math.floor(Math.random() * 5)];
            for (let k = 0; k < 36; k++) { const a = k / 36 * 6.28, sp = rnd(1.2, 3.2); bursts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c }); }
          }
          bursts = bursts.filter((b) => b.life > 0);
          bursts.forEach((b) => {
            b.x += b.vx; b.y += b.vy; b.vy += 0.03; b.vx *= 0.985; b.life -= 0.014;
            ctx.globalAlpha = Math.max(0, b.life); ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, 6.28); ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        if (reduce) return; // one still frame
        raf = requestAnimationFrame(frame);
      }
      if (reduce && type === 'confetti' && opts.burst) { ps.forEach((p) => { p.y = rnd(0, h); p.x = rnd(0, w); }); }
      frame();
      const onResize = () => size();
      window.addEventListener('resize', onResize);
      return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
    }
    /** Adds an animation layer to every [data-fx] element on screen. */
    function start(root) {
      root.querySelectorAll('[data-fx]').forEach((el) => {
        const type = el.getAttribute('data-fx');
        if (!type || type === 'none') return;
        // confetti-soft: a few slow, light pieces (award tiles). confetti-celebrate: one burst, then the soft fall.
        const layers = type === 'confetti-soft' ? [['confetti', { soft: true }]]
          : type === 'confetti-celebrate' ? [['confetti', { soft: true }], ['confetti', { burst: true, once: true }]]
          : [[type, {}]];
        layers.forEach(([t, o]) => {
          const cv = document.createElement('canvas');
          cv.className = el.hasAttribute('data-fx-full') ? 'fx-layer fx-full' : 'fx-layer';
          cv.setAttribute('aria-hidden', 'true');
          el.appendChild(cv);
          stops.push(run(cv, t, o));
        });
      });
    }
    function stop() { stops.forEach((f) => f()); stops = []; }
    return { start, stop, run };
  })();

  /* ---------------- Views ---------------- */
  const VIEWS = {};

  VIEWS.login = () => {
    if (!state.settingsLoaded) { state.settingsLoaded = true; setTimeout(loadSettings, 0); }
    state.renderedLogin = loginKey();
    const logo = safeUrl(state.settings.logo);
    return `
    <div class="screen">
      ${safeUrl(state.settings.heroImage) ? `
      <div class="hero-photo ${logo ? 'has-logo' : ''}"><img src="${esc(state.settings.heroImage)}" alt="">${logo ? `<div class="hero-photo-logo">${logoImg('', true)}</div>` : ''}</div>` : logo ? `
      <div class="hero">
        ${logoImg('hero-logo', true)}
      </div>` : `
      <div class="hero">
        <div class="monogram" aria-hidden="true">${esc(CONFIG.monogram || 'BB')}</div>
        <h1>${esc(CONFIG.appName)}</h1>
        <p>${esc(CONFIG.subtitle || '')}</p>
      </div>`}
      <form class="card auth-card" data-form="login" novalidate>
        <div class="stack" style="gap:4px">
          <h2 style="font-size:24px">Welcome back</h2>
          <p class="muted small">Sign in with your Employee ID and PIN.</p>
        </div>
        <div class="field">
          <label for="l-id">Employee ID</label>
          <input class="input" id="l-id" name="employeeId" autocomplete="username" autocapitalize="characters" required data-autofocus value="${esc(LS.get('bb_last_id') || '')}">
        </div>
        <div class="field">
          <label for="l-pin">4-digit PIN</label>
          <input class="input pin-input" id="l-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="current-password" required>
        </div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn" type="submit">Sign in</button>
        <p class="small muted center">Forgot your PIN? Ask your Admin to reset it.</p>
      </form>
      <div class="auth-foot">
        <p class="muted small">New to the team?</p>
        <button class="btn btn-outline" type="button" data-act="nav" data-to="signup">Create an account</button>
      </div>
    </div>`;
  };

  VIEWS.signup = () => {
    const lists = state.lists || { departments: [] };
    if (!state.lists) getLists().then(() => { if (state.route.name === 'signup') render(); });
    const p = state.signupProperty;
    return `
    <div class="screen"><div class="page">
      <div class="row">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
      </div>
      <div class="stack" style="gap:6px">
        <h1 class="title-lg">Join the team app</h1>
        <p class="muted small">Your account goes to the Admin for approval before you can see updates.</p>
      </div>
      <form class="card" data-form="signup" novalidate>
        <div class="field">
          <label for="s-id">Employee ID</label>
          <input class="input" id="s-id" name="employeeId" autocapitalize="characters" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="s-name">Full name</label>
          <input class="input" id="s-name" name="name" autocomplete="name" placeholder="As on your staff ID" required>
        </div>
        <div class="field">
          <label for="s-dept">Department</label>
          <select class="select" id="s-dept" name="department" required>
            <option value="">Select department</option>
            ${lists.departments.map((d) => `<option>${esc(d)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="s-pos">Job title</label>
          <input class="input" id="s-pos" name="position" maxlength="80" autocomplete="organization-title" placeholder="e.g. Guest Service Agent">
        </div>
        <div class="field">
          <span class="label" id="s-prop-l">Property</span>
          <div class="grid-2" role="group" aria-labelledby="s-prop-l">
            <button type="button" class="choice" data-act="signupProp" data-v="DXBAI" aria-pressed="${p === 'DXBAI'}">DXBAI<br><span style="font-weight:500;font-size:12px">Embassy Suites</span></button>
            <button type="button" class="choice" data-act="signupProp" data-v="DXBPI" aria-pressed="${p === 'DXBPI'}">DXBPI<br><span style="font-weight:500;font-size:12px">Hilton Garden Inn</span></button>
            <button type="button" class="choice" data-act="signupProp" data-v="Cluster" aria-pressed="${p === 'Cluster'}" style="grid-column:1 / -1">Cluster<br><span style="font-weight:500;font-size:12px">I work across both hotels</span></button>
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="s-pin">Create PIN</label>
            <input class="input pin-input" id="s-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="s-pin2">Confirm PIN</label>
            <input class="input pin-input" id="s-pin2" name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" required>
          </div>
        </div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn" type="submit">Request access</button>
      </form>
    </div></div>`;
  };

  VIEWS.pending = () => {
    const s = state.pendingStatus || 'Pending';
    const copy = {
      Pending: ['Request received', 'Thank you. Your Admin will review your request. Once approved, sign in with your Employee ID and PIN.'],
      Declined: ['Access not approved', 'Your request was not approved. Please speak to your manager or HR if you think this is a mistake.'],
      Blocked: ['Access paused', 'Your access to the team app has been paused. Please contact your Admin.'],
      Left: ['Thank you', 'Your access to the team app ended on your last working day. Thank you for everything you did here, and all the very best for the future.']
    }[s] || ['Request received', 'Your Admin will review your request.'];
    return `
    <div class="screen"><div class="page" style="justify-content:center;text-align:center;gap:18px">
      <div class="monogram" style="margin:0 auto;color:var(--gold-text);border-color:var(--gold)" aria-hidden="true">${s === 'Pending' ? I.check : s === 'Left' ? I.sparkles : '!'}</div>
      <span class="eyebrow">${s === 'Pending' ? 'Awaiting approval' : s === 'Left' ? 'Farewell' : 'Access'}</span>
      <h1 class="title-lg">${esc(copy[0])}</h1>
      <p class="muted">${esc(copy[1])}</p>
      <div class="spacer"></div>
      <button class="btn" type="button" data-act="nav" data-to="login">Back to sign in</button>
    </div></div>`;
  };

  VIEWS.install = () => {
    const ios = isIOS();
    return `
    <div class="screen"><div class="page">
      <div class="stack" style="gap:8px">
        <span class="eyebrow">One last step</span>
        <h1 class="title-lg">Add the app to your Home Screen</h1>
        <p class="muted small">${ios ? 'On iPhone, alerts only work once the app is on your Home Screen. It takes 20 seconds.' : 'Install the app so it opens full screen and can send you alerts.'}</p>
      </div>
      ${ios ? `
      <div class="stack">
        <div class="step"><div class="num">1</div><div class="spacer"><b>Tap the Share button</b><p class="small muted">At the bottom of Safari</p></div><div class="ic">${I.share}</div></div>
        <div class="step"><div class="num">2</div><div class="spacer"><b>Choose “Add to Home Screen”</b><p class="small muted">Scroll down the menu if needed</p></div><div class="ic" style="color:var(--navy)">${I.addHome}</div></div>
        <div class="step"><div class="num">3</div><div class="spacer"><b>Open it from the new icon</b><p class="small muted">Then allow notifications</p></div><div class="ic" style="background:var(--navy);color:var(--gold-light);font-family:var(--serif)">${esc(CONFIG.monogram || 'BB')}</div></div>
      </div>
      <div class="banner">${I.bell}<p>Already opened it from the Home Screen? Turn on alerts from your Profile.</p></div>` : `
      ${state.installEvt ? `<button class="btn" type="button" data-act="installApp">${I.addHome} Install app</button>` : `
      <div class="stack">
        <div class="step"><div class="num">1</div><div class="spacer"><b>Open Chrome’s menu</b><p class="small muted">The ⋮ button at the top right</p></div></div>
        <div class="step"><div class="num">2</div><div class="spacer"><b>Tap “Install app” or “Add to Home screen”</b><p class="small muted">On Samsung Internet: menu ☰ › Add page to › Home screen</p></div><div class="ic" style="color:var(--navy)">${I.addHome}</div></div>
        <div class="step"><div class="num">3</div><div class="spacer"><b>Open it from the new icon</b><p class="small muted">Then turn on notifications in your Profile</p></div><div class="ic" style="background:var(--navy);color:var(--gold-light);font-family:var(--serif)">${esc(CONFIG.monogram || 'BB')}</div></div>
      </div>`}
      <div class="banner">${I.shield}<p>If Android shows “Unsafe app blocked”, tap <b>More details</b> then <b>Install anyway</b>. The app is safe: Android shows this for new company apps that are not in the Play Store.</p></div>`}
      <div class="spacer"></div>
      <button class="btn ${ios ? '' : 'btn-outline'}" type="button" data-act="installDone">${ios ? 'Done' : 'Continue'}</button>
    </div></div>`;
  };

  function filteredPosts(forceCat) {
    const f = state.filter;
    const cat = forceCat || f.cat;
    const q = f.q.trim().toLowerCase();
    return state.posts.filter((p) => {
      if (p.collectionOnly && !q) return false;
      if (forceCat) { if (catOf(p.category).type !== 'offer') return false; }
      else if (cat !== 'All' && p.category !== cat) return false;
      if (f.prop !== 'All' && postProp(p.property) !== f.prop && postProp(p.property) !== 'Cluster') return false;
      if (q) {
        const hay = [p.title, p.message, p.outlet, p.location, p.timing, (p.inclusions || []).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function postCard(p) {
    const cat = catOf(p.category);
    if (cat.type === 'offer') {
      const img = safeUrl(p.image);
      const sub = [p.timing, p.location].filter(Boolean).join(' · ');
      return `<button type="button" class="ocard" data-act="open" data-id="${esc(p.id)}">
        <div class="thumb">${img ? `<img src="${esc(img)}" alt="">` : esc(p.outlet || 'Offer')}</div>
        <div class="body">
          ${tagFor(p)}
          <span class="t">${esc(p.title)}</span>
          ${p.outlet ? `<span class="s">${esc(p.outlet)}</span>` : ''}
          ${sub ? `<span class="s">${esc(sub)}</span>` : ''}
          ${p.price !== '' && p.price != null ? `<span class="price">AED ${esc(money(p.price))}</span>` : ''}
        </div>
      </button>`;
    }
    if (cat.type === 'monthly') {
      return `<button type="button" class="mcard" data-act="open" data-id="${esc(p.id)}">
        <span class="tag tag-monthly">${esc(tileDate(p))}</span>
        <span class="t">${esc(p.title)}</span>
        ${p.message ? `<span class="m">${esc(p.message)}</span>` : ''}
        <span class="more">Open this month’s update →</span>
      </button>`;
    }
    const alert = p.priority === 'Urgent';
    const needsAck = cat.ack && !p.acknowledged;
    return `<button type="button" class="pcard ${alert ? 'alert' : ''}" data-act="open" data-id="${esc(p.id)}">
      <div class="head">${tagFor(p)}<span class="small muted">${p.pinned ? `<span class="sr-only">Pinned. </span>${I.pin}` : esc(ago(p.created))}</span></div>
      <span class="t">${esc(p.title)}</span>
      ${p.message ? `<span class="m">${esc(p.message)}</span>` : ''}
      ${cat.ack && p.acknowledged ? `<span class="acked">${I.check} Acknowledged</span>` : (needsAck ? `<span class="needs">Please acknowledge</span>` : '')}
    </button>`;
  }

  function feedList(forceCat) {
    if (state.loadingFeed && !state.posts.length) return '<div class="spinner" aria-label="Loading"></div>';
    const list = filteredPosts(forceCat);
    if (!list.length) {
      const filtered = state.filter.q || (forceCat ? false : state.filter.cat !== 'All') || state.filter.prop !== 'All';
      return `<div class="empty">${I.inbox}<b>${filtered ? 'Nothing matches' : 'No updates yet'}</b><span class="small">${filtered ? 'Try another filter or search.' : 'New HR updates, offers and notices will appear here.'}</span></div>`;
    }
    return list.map(postCard).join('');
  }

  function refreshFeedArea() {
    const el = document.getElementById('feed-list');
    if (el) el.innerHTML = feedList(state.route.name === 'offers' ? 'F&B Offer' : null);
  }

  function propFilter() {
    const u = state.user || {};
    if (HOTELS.indexOf(u.property) >= 0) return '';
    return `<div class="seg" role="group" aria-label="Hotel">${['All', 'DXBAI', 'DXBPI'].map((v) => `
      <button type="button" data-act="setProp" data-v="${v}" aria-pressed="${state.filter.prop === v}">${v === 'All' ? 'All' : v}</button>`).join('')}</div>`;
  }

  function pushBanner() {
    if (!CONFIG.oneSignalAppId || Push.isOn() || LS.get('bb_push_off')) return '';
    if (Push.permission() === 'denied' || Push.permission() === 'unsupported') return '';
    if (isIOS() && !isStandalone()) return '';
    const later = LS.get('bb_push_later');
    if (later && Date.now() - later < 3 * 864e5) return '';
    return `<div class="banner" style="align-items:center">${I.bell}<div class="spacer"><b>Turn on notifications</b><p class="small" style="color:#D9CFBE">Get an alert when HR, offers or notices are posted.</p></div>
      <div class="stack" style="gap:6px"><button class="btn btn-sm" style="background:var(--gold);color:#fff" type="button" data-act="pushOnBanner">Turn on</button><button class="link-btn" style="color:#D9CFBE;min-height:32px" type="button" data-act="pushLater">Later</button></div></div>`;
  }

  /* ---------------- Sections: horizontal rows ---------------- */
  /** Posts for the main pages. Posts set to show only inside their special collection are left out (inside: true keeps them). */
  function visiblePosts(inside) {
    const f = state.filter;
    return state.posts.filter((p) => !(f.prop !== 'All' && postProp(p.property) !== f.prop && postProp(p.property) !== 'Cluster') && (inside || !p.collectionOnly));
  }

  function hcard(p) {
    const c = catOf(p.category);
    const color = colorHex(c.color);
    const img = safeUrl(p.image);
    if (c.type === 'people') {
      return `<button type="button" class="hc hc-person" data-act="open" data-id="${esc(p.id)}" style="--c:${esc(color)}" ${celebrates(c) ? 'data-fx="confetti-soft"' : ''}>
        <span class="ph">${img ? `<img src="${esc(img)}" alt="">` : `<span class="ini">${esc(initials(p.personName || p.title))}</span>`}</span>
        ${isAward(c) && p.subtitle ? `<span class="ribbon">${I.award}${esc(p.subtitle)}</span>` : ''}
        <span class="nm">${esc(p.personName || p.title)}</span>
        ${p.position ? `<span class="ps">${esc(p.position)}</span>` : ''}
      </button>`;
    }
    if (c.type === 'offer') {
      return `<button type="button" class="hc hc-offer" data-act="open" data-id="${esc(p.id)}">
        <span class="im">${img ? `<img src="${esc(img)}" alt="">` : `<span class="ph-t">${esc(p.outlet || 'Offer')}</span>`}
          ${p.price !== '' && p.price != null ? `<span class="pr">AED ${esc(money(p.price))}</span>` : ''}</span>
        <span class="bd">
          ${p.outlet ? `<span class="ol">${esc(p.outlet)}</span>` : ''}
          <span class="t">${esc(p.title)}</span>
          ${(p.days || p.timing) ? `<span class="s">${esc([p.days, p.timing].filter(Boolean).join(' · '))}</span>` : ''}
        </span>
      </button>`;
    }
    if (c.type === 'monthly') return newsletterCard(p, true);
    if (c.type === 'training') return trainingCard(p, true);
    const needsAck = c.ack && !p.acknowledged;
    return `<button type="button" class="hc hc-text ${p.priority === 'Urgent' ? 'alert' : ''}" data-act="open" data-id="${esc(p.id)}" style="--c:${esc(color)}">
      ${img ? `<span class="tim"><img src="${esc(img)}" alt=""></span>` : ''}
      <span class="head">${catTag(c, postProp(p.property))}<span class="small muted">${esc(ago(p.created))}</span></span>
      <span class="t">${esc(p.title)}</span>
      ${p.message && !img ? `<span class="m">${esc(p.message)}</span>` : ''}
      ${c.ack ? (p.acknowledged ? `<span class="acked">${I.check} Acknowledged</span>` : `<span class="needs">Please acknowledge</span>`) : ''}
    </button>`;
  }

  /** e.g. "Thu, Dec 14": the day the post goes live (Show from), or the day it was posted. */
  function tileDate(p) {
    let d;
    if (p.start) return wdIso(p.start) + ', ' + dmyIso(p.start);
    d = new Date(p.created || Date.now());
    return d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Dubai' }) + ', ' + dmy(d);
  }

  function newsletterCard(p, compact) {
    const special = p.style === 'Special' || p.style === 'Festive';
    const bg = special ? colorHex(p.themeColor || (p.style === 'Festive' ? FESTIVE_RED : 'navy')) : COLORS.navy;
    const fx = special && p.animation && p.animation !== 'none' ? p.animation : '';
    return `<button type="button" class="${compact ? 'hc hc-news' : 'mcard'}" data-act="open" data-id="${esc(p.id)}" style="background:${esc(bg)}" ${fx ? `data-fx="${esc(fx)}"` : ''}>
      <span class="tag tag-monthly">${esc(tileDate(p))}</span>
      <span class="t">${esc(p.title)}</span>
      ${p.message ? `<span class="m">${esc(p.message)}</span>` : ''}
      <span class="more">Open →</span>
    </button>`;
  }

  /** One titled section with a swipeable row of cards. */
  function sectionRow(c, posts, opts) {
    if (!posts.length) return '';
    const color = colorHex(c.color);
    return `<section class="sec" style="--c:${esc(color)}" aria-label="${esc(c.label)}">
      <div class="sec-h"><h2><span class="dot"></span>${esc(c.label)}</h2>
        ${posts.length > 1 && !(opts && opts.noMore) ? `<button type="button" class="link-btn" data-act="nav" data-to="section" data-id="${esc(c.id)}" ${opts && opts.coll ? `data-coll="${esc(opts.coll)}"` : ''}>See all (${posts.length})</button>` : ''}</div>
      <div class="hrow ${opts && opts.onDark ? 'on-dark' : ''}">${posts.map(hcard).join('')}</div>
    </section>`;
  }

  function sectionsFor(groups, posts, opts) {
    const list = posts || visiblePosts();
    const skip = (opts && opts.skipTypes) || [];
    return cats().filter((c) => c.active !== false && groups.indexOf(c.group) >= 0 && skip.indexOf(c.type) < 0)
      .map((c) => sectionRow(c, c.type === 'training' ? upcomingTraining(list.filter((p) => p.category === c.id), 45) : list.filter((p) => p.category === c.id)))
      .join('');
  }

  /* ---------------- Learning & Development ---------------- */
  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function upcomingTraining(list, days) {
    const today = todayIso();
    const last = days ? isoPlus(days) : '9999';
    return list.filter((p) => p.eventDate && p.eventDate >= today && p.eventDate <= last)
      .sort((a, b) => (a.eventDate + a.timing).localeCompare(b.eventDate + b.timing));
  }
  function isoPlus(days) {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtClock(hm) {
    const [h, m] = hm.split(':').map(Number);
    return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? ' am' : ' pm');
  }
  /** Training time is stored as 10:00–12:30 (24-hour); shows as 10 am – 12:30 pm. */
  function fmtTiming(t) {
    const m = /^(\d{2}:\d{2})(?:\s*[–-]\s*(\d{2}:\d{2}))?$/.exec(String(t || '').trim());
    if (!m) return String(t || '');
    return fmtClock(m[1]) + (m[2] ? ' – ' + fmtClock(m[2]) : '');
  }
  function dayParts(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return { d, mon: MONTHS[m - 1], wd: dt.toLocaleDateString('en-GB', { weekday: 'short' }), long: dt.toLocaleDateString('en-GB', { weekday: 'long' }) + ', ' + dmyIso(iso) };
  }
  function presenterHtml(p, size) {
    if (!p.personName) return '';
    return `<span class="presenter">${avatarHtml({ name: p.personName, photo: p.personPhoto }, size || 26)}<span>${esc(p.personName)}</span></span>`;
  }
  /** Training card: a vertical tile in rows (compact) or a full-width list item. */
  function trainingCard(p, compact) {
    const c = catOf(p.category);
    const dp = p.eventDate ? dayParts(p.eventDate) : null;
    const isToday = p.eventDate === todayIso();
    const meta = [fmtTiming(p.timing), p.location].filter(Boolean).join(' · ');
    return `<button type="button" class="${compact ? 'hc hc-train' : 'tcard'} ${isToday ? 'is-today' : ''}" data-act="open" data-id="${esc(p.id)}" style="--c:${esc(colorHex(c.color))}">
      <span class="tdate">${dp ? `<small>${esc(dp.wd)}</small><b>${dp.d}</b><small>${esc(dp.mon)}</small>` : ''}</span>
      <span class="tbody">
        ${isToday ? '<span class="today-pill">Today</span>' : ''}
        <span class="t">${esc(p.title)}</span>
        ${meta ? `<span class="s">${esc(meta)}</span>` : ''}
        ${presenterHtml(p, 24)}
        ${p.attendees && p.attendees.length ? `<span class="s">${p.attending ? 'You and ' + (p.attendees.length - 1) + ' more attending' : p.attendees.length + ' attending'}</span>` : ''}
      </span>
    </button>`;
  }

  function lndSection(c) {
    const all = visiblePosts().filter((p) => p.category === c.id && p.eventDate);
    const ym = state.lndMonth || todayIso().slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const inMonth = all.filter((p) => p.eventDate.slice(0, 7) === ym)
      .sort((a, b) => (a.eventDate + a.timing).localeCompare(b.eventDate + b.timing));
    const byDay = {};
    inMonth.forEach((p) => { byDay[p.eventDate] = (byDay[p.eventDate] || 0) + 1; });
    const days = new Date(y, m, 0).getDate();
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const today = todayIso();
    const sel = state.lndDay && state.lndDay.slice(0, 7) === ym ? state.lndDay : '';
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span></span>');
    for (let d = 1; d <= days; d++) {
      const iso = ym + '-' + String(d).padStart(2, '0');
      const n = byDay[iso] || 0;
      const cls = [iso === today ? 'is-today' : '', n ? 'has' : '', iso === sel ? 'sel' : '', iso < today ? 'past' : ''].join(' ');
      cells.push(n ? `<button type="button" class="${cls}" data-act="lndDay" data-v="${iso}" aria-pressed="${iso === sel}" aria-label="${esc(dayParts(iso).long)}: ${n} training${n > 1 ? 's' : ''}">${d}<i></i></button>`
        : `<span class="${cls}">${d}</span>`);
    }
    const shown = sel ? inMonth.filter((p) => p.eventDate === sel) : inMonth;
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return `<section class="sec lnd" style="--c:${esc(colorHex(c.color))}" aria-label="${esc(c.label)}">
      <div class="sec-h"><h2><span class="dot"></span>${esc(c.label)}</h2></div>
      <div class="lnd-wrap">
        <div class="card lnd-cal">
          <div class="lnd-head">
            <button class="icon-btn" type="button" data-act="lndMonth" data-v="-1" aria-label="Previous month">${I.left}</button>
            <b>${esc(monthName)}</b>
            <button class="icon-btn" type="button" data-act="lndMonth" data-v="1" aria-label="Next month">${I.right}</button>
          </div>
          <div class="lnd-grid" role="group" aria-label="${esc(monthName)} training days">
            ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span class="wd">${x}</span>`).join('')}
            ${cells.join('')}
          </div>
          <p class="small muted">${inMonth.length ? `${inMonth.length} session${inMonth.length > 1 ? 's' : ''} this month${sel ? ` · showing ${esc(dayParts(sel).long)} <button class="link-btn" type="button" data-act="lndDay" data-v="">Show all</button>` : ''}` : 'No sessions planned this month yet.'}</p>
        </div>
        <div class="list lnd-list">${shown.map((p) => trainingCard(p, false)).join('')}</div>
      </div>
    </section>`;
  }

  /* ---------------- Today's Special ---------------- */
  /** Does an offer run today, going by its Days text (e.g. Every Wednesday, Mon–Thu, Weekends, Daily)? */
  function offerRunsToday(p) {
    const t = String(p.days || '').toLowerCase();
    const today = new Date().getDay();
    if (!t || /daily|every ?day|all week|7 days/.test(t)) return true;
    const found = [];
    (t.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g) || []).forEach((w) => {
      const i = WEEKDAYS.findIndex((d) => d.startsWith(w.replace(/s$/, '')) || d === w.replace(/s$/, ''));
      if (i >= 0) found.push(i);
    });
    const range = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:-|–|to|till|until)\s*(sun|mon|tue|wed|thu|fri|sat)/.exec(t);
    if (range) {
      const a = WEEKDAYS.findIndex((d) => d.startsWith(range[1])), b = WEEKDAYS.findIndex((d) => d.startsWith(range[2]));
      for (let i = a; ; i = (i + 1) % 7) { found.push(i); if (i === b) break; }
    }
    if (found.length) return found.indexOf(today) >= 0;
    if (/weekend/.test(t)) return today === 0 || today === 6;
    if (/weekday/.test(t)) return today >= 1 && today <= 5;
    return true;
  }
  /** Whether a post shows in Today's Special on this day (yyyy-mm-dd), from its "How often" choice. */
  function specialToday(p, iso) {
    const r = p.specialRepeat || '';
    const [y, m, d] = iso.split('-').map(Number);
    if (r === 'off') return false;
    if (r === 'date') return p.specialDate === iso;
    if (r === 'daily') return true;
    if (r.startsWith('weekly:')) return r.slice(7).split(',').map(Number).indexOf(new Date(y, m - 1, d).getDay()) >= 0;
    if (r.startsWith('monthly:')) { const last = new Date(y, m, 0).getDate(); return d === Math.min(Number(r.slice(8)), last); }
    // Posts saved before "How often" existed.
    return p.specialDate === iso || (catOf(p.category).type === 'offer' && p.todaySpecial && offerRunsToday(p));
  }
  /** Weekdays (0 = Sunday) named in an offer's Date text, e.g. "Every Wednesday"; [] if none. */
  function daysFromText(t) {
    t = String(t || '').toLowerCase();
    const found = [];
    (t.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g) || []).forEach((w) => {
      const i = WEEKDAYS.findIndex((x) => x.startsWith(w.slice(0, 3)));
      if (i >= 0 && found.indexOf(i) < 0) found.push(i);
    });
    if (!found.length && /weekend/.test(t)) return [0, 6];
    if (!found.length && /weekday/.test(t)) return [1, 2, 3, 4, 5];
    return found;
  }
  function todayItems() {
    const today = todayIso();
    const posts = visiblePosts(true);
    const training = posts.filter((p) => catOf(p.category).type === 'training' && p.eventDate === today)
      .sort((a, b) => String(a.timing).localeCompare(String(b.timing)));
    // Only what is happening today: training today, birthdays, and posts set to show in Today's Special today.
    const offers = posts.filter((p) => catOf(p.category).type === 'offer' && specialToday(p, today));
    const fresh = posts.filter((p) => ['offer', 'training'].indexOf(catOf(p.category).type) < 0 && specialToday(p, today));
    const birthdays = state.birthdaysToday || [];
    return { training, offers, fresh, birthdays, count: training.length + offers.length + fresh.length + birthdays.length };
  }

  function collectionTiles(list) {
    const colls = (list || state.collections).filter((c) => state.posts.some((p) => p.collection === c.id) || canCollect());
    if (!colls.length) return '';
    return colls.map((c) => `
      <button type="button" class="coll-tile" data-act="nav" data-to="collection" data-id="${esc(c.id)}" style="--bg:${esc(colorHex(c.color))}" ${c.animation !== 'none' ? `data-fx="${esc(c.animation)}"` : ''}>
        <span class="ct">
          <span class="ey">${I.sparkles} Special</span>
          <span class="nm">${esc(c.name)}</span>
          <span class="ct-c">${state.posts.filter((p) => p.collection === c.id).length} inside · tap to explore</span>
        </span>
      </button>`).join('');
  }

  /* ---------------- Birthdays ---------------- */
  const BALLOONS = `<svg class="balloons" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M30 70 Q32 95 26 118" stroke="#C9A46A" stroke-width="1.4" fill="none"/>
    <path d="M62 58 Q60 90 66 118" stroke="#C9A46A" stroke-width="1.4" fill="none"/>
    <path d="M94 72 Q92 96 98 118" stroke="#C9A46A" stroke-width="1.4" fill="none"/>
    <ellipse cx="30" cy="48" rx="17" ry="21" fill="#E8577E"/><path d="M27 69l3-4 3 4z" fill="#E8577E"/>
    <ellipse cx="62" cy="34" rx="19" ry="23" fill="#F2B640"/><path d="M59 57l3-4 3 4z" fill="#F2B640"/>
    <ellipse cx="94" cy="50" rx="16" ry="20" fill="#4C8DDB"/><path d="M91 70l3-4 3 4z" fill="#4C8DDB"/>
    <ellipse cx="24" cy="40" rx="4" ry="7" fill="#fff" opacity=".35"/><ellipse cx="56" cy="25" rx="4.5" ry="8" fill="#fff" opacity=".35"/><ellipse cx="89" cy="42" rx="4" ry="7" fill="#fff" opacity=".35"/>
  </svg>`;

  function wishedToday(id) {
    try { const w = LS.get('bb_wished') || {}; return (w[todayIso()] || []).indexOf(id) >= 0; } catch (e) { return false; }
  }
  /** A small "Wish" button for a colleague whose birthday is today (no custom message). */
  function wishBtn(b) {
    if (!b || b.isMe || !b.employeeId) return '';
    const done = wishedToday(b.employeeId);
    return `<button type="button" class="wish-btn${done ? ' done' : ''}" data-act="wishBday" data-id="${esc(b.employeeId)}" ${done ? 'disabled' : ''} aria-label="Wish ${esc(firstName(b.name))} a happy birthday">${done ? I.check + ' Wished' : I.heart + ' Wish'}</button>`;
  }
  function birthdayTiles() {
    const list = state.birthdaysToday || [];
    if (!list.length) return '';
    const tile = (b) => `
      <div class="bday ${b.isMe ? 'me' : ''}" data-fx="confetti" role="group" aria-label="Birthday">
        ${BALLOONS}
        <div class="bd-in">
          <span class="ey">${I.cake} ${b.isMe ? 'Happy birthday to you' : 'Birthday today'}</span>
          <div class="row" style="gap:14px;align-items:center">
            <span class="bd-ph">${safeUrl(b.photo) ? `<img src="${esc(b.photo)}" alt="">` : esc(initials(b.name))}</span>
            <div class="stack" style="gap:2px;min-width:0">
              <span class="bd-nm">${esc(b.isMe ? 'Happy birthday, ' + firstName(b.name) + '!' : b.name)}</span>
              <span class="bd-sub">${esc(b.position || b.department || '')}</span>
            </div>
          </div>
          <p class="bd-note">${b.isMe ? 'Wishing you a wonderful year ahead from all of us at DXBAI &amp; DXBPI.' : `Don’t forget to wish <b>${esc(firstName(b.name))}</b> a happy birthday today!`}</p>
          ${wishBtn(b)}
        </div>
      </div>`;
    return list.length === 1 ? tile(list[0]) : `<div class="hrow bday-row">${list.map(tile).join('')}</div>`;
  }

  function birthdayCalendar() {
    const list = state.birthdaysMonth || [];
    const today = new Date().getDate();
    const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
    return `<section class="sec" style="--c:#C2416B">
      <div class="sec-h"><h2><span class="dot"></span>Birthdays in ${esc(monthName)}</h2>
        ${canBirthdays() ? `<button type="button" class="link-btn" data-act="nav" data-to="birthdays">Manage</button>` : ''}</div>
      ${list.length ? `<div class="hrow">${list.map((b) => `
        <div class="hc hc-bd ${b.day === today ? 'today' : b.day < today ? 'past' : ''}">
          <span class="d"><b>${b.day}</b><small>${esc(monthName.slice(0, 3))}</small></span>
          <span class="avatar" style="width:52px;height:52px">${safeUrl(b.photo) ? `<img src="${esc(b.photo)}" alt="">` : esc(initials(b.name))}</span>
          <span class="nm">${esc(b.name)}</span>
          <span class="ps">${esc(b.position || b.department || '')}</span>
          ${b.day === today ? wishBtn(Object.assign({}, b, { isMe: state.user && b.employeeId === state.user.employeeId })) : ''}
        </div>`).join('')}</div>` : `<p class="small muted">No birthdays listed for ${esc(monthName)} yet.${canBirthdays() ? ' Upload the list from Manage.' : ''}</p>`}
    </section>`;
  }

  function maybeCelebrate() {
    if (!state.myBirthday || !state.user) return;
    const key = 'bb_bday_shown';
    const today = todayIso();
    if (LS.get(key) === today && !state.deepLinkBirthday) return;
    LS.set(key, today);
    state.deepLinkBirthday = false;
    celebrate();
  }

  function celebrate() {
    if (document.querySelector('.celebrate')) return;
    const el = document.createElement('div');
    el.className = 'celebrate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Happy birthday');
    el.innerHTML = `<canvas aria-hidden="true"></canvas>
      <div class="cel-card">
        ${BALLOONS}
        <span class="cel-ey">${I.cake} ${esc(dmy(new Date()))}</span>
        <h2>Happy birthday,<br>${esc(firstName(state.user.name))}!</h2>
        <p>Wishing you a wonderful year ahead, from all of us at DXBAI &amp; DXBPI.</p>
        <button class="btn" type="button" data-close>Thank you</button>
      </div>`;
    document.body.appendChild(el);
    const stop = FX.run(el.querySelector('canvas'), 'confetti', { full: true, burst: true });
    Sound.play('confetti');
    const close = () => { stop(); el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.querySelector('[data-close]').addEventListener('click', close);
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    setTimeout(() => el.querySelector('[data-close]').focus(), 50);
  }

  /* ---------------- Home / HR / Offers ---------------- */
  function feedHeader(title, eyebrow) {
    const u = state.user || {};
    const showBellDot = !!CONFIG.oneSignalAppId && Push.ready && !Push.isOn() && !(isIOS() && !isStandalone());
    return `<div class="topbar">
        <div class="greet"><span class="small muted">${eyebrow || greeting()}</span><h1>${esc(title || firstName(u.name))}</h1></div>
        <div class="row" style="gap:8px">
          <button class="icon-btn" type="button" data-act="nav" data-to="search" aria-label="Search">${I.search}</button>
          <button class="icon-btn avatar-btn" type="button" data-act="nav" data-to="profile" aria-label="Your profile">${avatarHtml(u, 40)}${showBellDot ? '<span class="dot" style="top:0;right:0"></span>' : ''}</button>
        </div>
      </div>
      ${state.offline ? '<div class="offline">You’re offline. Showing the last updates you loaded.</div>' : ''}
      ${title === 'Today’s Special' || !title ? seasonBanner() : ''}`;
  }

  function emptyState(text) {
    return `<div class="empty">${I.inbox}<b>Nothing here yet</b><span class="small">${esc(text)}</span></div>`;
  }

  function fab(groups) {
    const can = state.canPublish.some((id) => groups.indexOf(catOf(id).group) >= 0);
    return can ? `<button class="fab" type="button" data-act="compose" data-groups="${esc(groups.join(','))}" aria-label="New post">${I.plus}</button>` : '';
  }

  VIEWS.feed = () => {
    if (!state.lastLoad && !state.loadingFeed) setTimeout(() => loadFeed(), 0);
    const posts = visiblePosts();
    const pinned = posts.filter((p) => p.pinned || p.priority === 'Urgent').filter((p) => catOf(p.category).type === 'update');
    const rest = posts.filter((p) => pinned.indexOf(p) < 0);
    const body = sectionsFor(['general', 'hr', 'marketing'], rest);
    return `
    <div class="screen"><div class="page with-nav">
      ${feedHeader()}
      ${pushBanner()}
      ${propFilter()}
      ${pinned.length ? `<div class="list">${pinned.map(postCard).join('')}</div>` : ''}
      ${collectionTiles()}
      ${state.loadingFeed && !state.posts.length ? '<div class="spinner"></div>' : (body || (!pinned.length ? emptyState('New HR updates, offers and notices will appear here.') : ''))}
    </div>${nav('feed')}${fab(['general', 'hr', 'marketing'])}</div>`;
  };

  VIEWS.hr = () => {
    if (!state.lastLoad && !state.loadingFeed) setTimeout(() => loadFeed(), 0);
    const body = sectionsFor(['hr'], null, { skipTypes: ['training'] });
    const lnd = cats().filter((c) => c.active !== false && c.type === 'training').map(lndSection).join('');
    return `
    <div class="screen"><div class="page with-nav">
      ${feedHeader('HR', 'People &amp; updates')}
      ${propFilter()}
      ${birthdayTiles()}
      ${body}
      ${lnd}
      ${birthdayCalendar()}
    </div>${nav('hr')}${fab(['hr'])}</div>`;
  };

  /* ---------- Quote of the day (Today page) ---------- */
  // Used on days without a quote set in the app: one a day, in turn.
  const DAILY_QUOTES = [
    'Every guest remembers how we made them feel. Make today memorable.',
    'Small details, done with care, are what people talk about.',
    'A warm welcome costs nothing and is worth everything.',
    'Great service is a team sport. Pass the ball well today.',
    'Smile first. It sets the tone for everything that follows.',
    'Do the right thing, even when no one is watching.',
    'Today is a fresh start. Make the most of it.',
    'Listen twice as much as you speak; that is where great service begins.',
    'Be the reason someone’s day gets better.',
    'Progress, not perfection. One good step at a time.',
    'Our guests feel how we treat each other. Lead with kindness.',
    'Ask, listen, act. Simple steps, big difference.',
    'Pride in the small tasks builds a great hotel.',
    'Every problem is a chance to turn a guest into a fan.',
    'Teamwork turns a busy shift into a good shift.',
    'Learn something new today, then share it with a colleague.',
    'Hospitality is making people feel at home, away from home.',
    'Energy is contagious. Bring your best to every shift.',
    'Own the moment. If you see it, solve it.',
    'Thank a colleague today. It matters more than you think.',
    'Consistency builds trust, one stay at a time.',
    'A calm voice and a kind word solve more than you’d expect.',
    'Make it personal. Use the guest’s name, remember their preference.',
    'Your attitude is the first thing a guest checks in to.',
    'Ordinary moments become special when someone cares.',
    'Be curious, be helpful, be you.',
    'Growth begins at the edge of your comfort zone.',
    'Celebrate the small wins today; they add up.',
    'Clear communication makes every handover easier.',
    'Treat every request as if it were the only one today.',
    'Good service is seen. Great service is felt.',
    'Help a colleague without being asked.',
    'Every shift is a chance to create a story worth telling.',
    'Stay positive, work hard, make it happen.',
    'Respect is the foundation of every great team.',
    'Anticipate the need before the guest has to ask.',
    'Excellence is not an act, it is a habit we practise daily.',
    'Your work matters, even when it goes unseen.',
    'When in doubt, choose kindness.',
    'Take care of yourself, so you can take care of others.',
    'Be proud of where you work and show it.',
    'Mistakes are lessons. Learn, fix, move on.',
    'Ideas grow when they’re shared. Speak up today.',
    'The best teams lift each other up.',
    'Give every guest a reason to come back.',
    'Today, aim to exceed one expectation.',
    'Patience turns a difficult moment into a good memory.',
    'Your welcome is the first chapter of their stay.',
    'Small improvements every day lead to big results.',
    'Be present. The person in front of you deserves your attention.',
    'Positive words create positive days.',
    'Together we’re stronger than any challenge.',
    'Hospitality starts with the heart.',
    'Leave every space a little better than you found it.',
    'Be generous with praise and specific with thanks.',
    'Do what you do so well that people want to see it again.',
    'Every role in the hotel is part of the guest’s story.',
    'Start strong, stay focused, finish proud.',
    'Make someone feel seen today.',
    'Great things happen when we care a little more.'
  ];
  function quoteToday() {
    if (state.quote && state.quote.text) return state.quote;
    const d = new Date(todayIso() + 'T00:00:00Z');
    const n = Math.floor(d.getTime() / 864e5);
    return { text: DAILY_QUOTES[n % DAILY_QUOTES.length], author: '' };
  }
  function quoteBar() {
    const q = quoteToday();
    const edit = canPopups();
    return `<${edit ? 'button type="button" data-act="nav" data-to="quotes"' : 'div'} class="quote-bar">
      <span class="qb-mark" aria-hidden="true">“</span>
      <span class="qb-tx"><span class="qb-q">${esc(q.text)}</span>${q.author ? `<span class="qb-a">${esc(q.author)}</span>` : ''}</span>
      ${edit ? `<span class="qb-ed" aria-label="Set quotes">${I.edit}</span>` : ''}
    </${edit ? 'button' : 'div'}>`;
  }
  async function loadQuotes() {
    try { state.quoteList = (await api('quotes')).quotes || []; }
    catch (e) { showError(e); state.quoteList = state.quoteList || []; }
    if (state.route.name === 'quotes') render();
  }
  VIEWS.quotes = () => {
    if (!state.quoteList) setTimeout(loadQuotes, 0);
    const list = state.quoteList || [];
    const today = todayIso();
    // Suggest the first day from today that has no quote yet.
    let next = today;
    for (let i = 0; i < 400; i++) {
      const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i);
      const k = d.toISOString().slice(0, 10);
      if (!list.some((q) => q.date === k)) { next = k; break; }
    }
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Today’s Special</span><h1>Quote of the day</h1></div><span style="width:44px"></span></div>
      <p class="small muted">One short quote a day, shown at the top of Today’s Special. On days without one, the app shows one of its own.</p>
      <form class="card" data-form="quote" novalidate>
        <div class="field"><label for="q-d">Date</label><input class="input" id="q-d" name="date" type="date" min="${today}" value="${next}" required></div>
        <div class="field"><label for="q-t">Quote</label><textarea class="textarea" id="q-t" name="text" maxlength="240" required placeholder="e.g. Every guest remembers how we made them feel."></textarea></div>
        <div class="field"><label for="q-a">Said by (optional)</label><input class="input" id="q-a" name="author" maxlength="60" placeholder="Leave empty if not known"></div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn" type="submit">Save quote</button>
      </form>
      ${state.quoteList === null || state.quoteList === undefined ? '<div class="spinner"></div>' : `
      <span class="section-title">Coming up · ${list.filter((q) => q.date >= today).length}</span>
      <div class="set-group">${list.filter((q) => q.date >= today).map((q) => `
        <div class="set-row" style="cursor:default"><span class="set-tx"><b>${esc(q.date === today ? 'Today' : dayParts(q.date).long)}</b><span>“${esc(q.text)}”${q.author ? ' · ' + esc(q.author) : ''}</span></span>
          <button class="icon-btn" type="button" data-act="deleteQuote" data-v="${esc(q.date)}" aria-label="Delete quote">${I.trash}</button></div>`).join('') || '<p class="small muted center" style="padding:16px">No quotes set yet. The app shows its own until you add one.</p>'}</div>`}
    </div>${nav('quotes')}</div>`;
  };

  VIEWS.today = () => {
    if (!state.lastLoad && !state.loadingFeed) setTimeout(() => loadFeed(), 0);
    const t = todayItems();
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long' }) + ', ' + dmy(new Date());
    const block = (title, color, html) => html ? `<section class="sec" style="--c:${color}"><div class="sec-h"><h2><span class="dot"></span>${title}</h2></div>${html}</section>` : '';
    return `
    <div class="screen"><div class="page with-nav">
      ${feedHeader('Today’s Special', esc(date))}
      ${quoteBar()}
      ${propFilter()}
      ${t.count ? `
        ${birthdayTiles()}
        ${block('Training today', COLORS.teal, t.training.length ? `<div class="list">${t.training.map((p) => trainingCard(p, false)).join('')}</div>` : '')}
        ${block('Today’s offers', COLORS.gold, t.offers.length ? `<div class="hrow">${t.offers.map(hcard).join('')}</div>` : '')}
        ${block('Also today', COLORS.navy, t.fresh.length ? `<div class="hrow">${t.fresh.map(hcard).join('')}</div>` : '')}`
      : (state.loadingFeed && !state.posts.length ? '<div class="spinner"></div>' : `<div class="empty">${I.star}<b>A quiet day so far</b><span class="small">Today’s birthdays, training, and anything set to show in Today’s Special today will appear here.</span></div>`)}
    </div>${nav('today')}</div>`;
  };

  VIEWS.offers = () => {
    if (!state.lastLoad && !state.loadingFeed) setTimeout(() => loadFeed(), 0);
    const posts = visiblePosts();
    const body = sectionsFor(['marketing'], posts);
    return `
    <div class="screen"><div class="page with-nav">
      ${feedHeader('Offers', 'Marketing &amp; F&amp;B')}
      ${propFilter()}
      ${collectionTiles()}
      ${canCollect() ? `<button class="btn btn-sm btn-ghost" style="border:1px dashed var(--gold);color:var(--gold-text)" type="button" data-act="nav" data-to="collections">${I.sparkles} Special collections</button>` : ''}
      ${body || emptyState('Offers, promotions and newsletters will appear here.')}
    </div>${nav('offers')}${fab(['marketing'])}</div>`;
  };

  /** All posts of one category, as a list. */
  VIEWS.section = ({ id, coll }) => {
    const c = catOf(id);
    // From inside a special collection: only that collection's posts in this category.
    const cl = coll ? (state.collections.find((x) => x.id === coll) || (state.adminColls || []).find((x) => x.id === coll)) : null;
    const list = coll ? visiblePosts(true).filter((p) => p.category === id && p.collection === coll) : visiblePosts().filter((p) => p.category === id);
    const grid = c.type === 'people';
    return `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        ${cl ? `<div class="greet spacer"><span class="eyebrow">${esc(cl.name)}</span><h1>${esc(c.label)}</h1></div>` : `<h1 style="flex:1">${esc(c.label)}</h1>`}<span style="width:44px"></span></div>
      ${grid ? `<div class="pgrid">${list.map(hcard).join('')}</div>` : `<div class="list">${list.map(postCard).join('') || emptyState('Nothing posted yet.')}</div>`}
    </div></div>`;
  };

  /** The old full list with category chips and search. */
  VIEWS.search = () => `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">All updates</h1><span style="width:44px"></span></div>
      ${propFilter()}
      <div class="chips" role="group" aria-label="Category">${[{ id: 'All', label: 'All' }].concat(cats().filter((c) => c.active !== false)).map((c) => `
        <button type="button" class="chip" data-act="setCat" data-v="${esc(c.id)}" aria-pressed="${state.filter.cat === c.id}">${esc(c.label)}</button>`).join('')}</div>
      <div class="search">${I.search}<label class="sr-only" for="q">Search updates</label><input class="input" id="q" type="search" placeholder="Search names, offers and updates" value="${esc(state.filter.q)}" data-input="search" data-autofocus></div>
      <div class="list" id="feed-list">${feedList()}</div>
    </div></div>`;

  /** A special collection, e.g. Festive Season: full colour page with its own animation. */
  VIEWS.collection = ({ id }) => {
    const c = state.collections.find((x) => x.id === id) || (state.adminColls || []).find((x) => x.id === id);
    if (!c) return `<div class="screen"><div class="page"><div class="row"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button></div>${emptyState('This collection has ended.')}</div></div>`;
    const bg = colorHex(c.color);
    const posts = visiblePosts(true).filter((p) => p.collection === id);
    const rows = cats().filter((k) => k.active !== false).map((k) => sectionRow(k, posts.filter((p) => p.category === k.id), { onDark: true, coll: id })).join('');
    const h = heroTop({ image: c.banner }, canCollect() ? `<button class="icon-btn" type="button" data-act="nav" data-to="collectionEdit" data-id="${esc(c.id)}" aria-label="Edit collection">${I.edit}</button>` : '', 'fade');
    return `
    <div class="screen coll-page" style="--bg:${esc(bg)};background-color:${esc(bg)}" ${c.animation !== 'none' ? `data-fx="${esc(c.animation)}" data-fx-full` : ''}>
      ${h.top}
      <div class="page">
        ${h.bar}
        <div class="stack" style="gap:6px">
          <span class="ey">${I.sparkles} Special collection</span>
          <h1 class="title-lg">${esc(c.name)}</h1>
          ${c.end ? `<span class="small" style="opacity:.85">Until ${esc(fmtDate(c.end))}</span>` : ''}
        </div>
        ${(() => {
          const auto = rows || `<p style="opacity:.9">Nothing added yet. When posting an offer, notice or newsletter, choose “${esc(c.name)}” under Special collection.</p>`;
          const bl = c.blocks || [];
          if (!bl.length) return auto;
          return Blocks.render(bl, { auto }) + (bl.some((b) => b.type === 'auto') ? '' : auto);
        })()}
      </div>
    </div>`;
  };

  VIEWS.post = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || (state.myPosts || []).find((x) => x.id === id);
    if (!p) {
      if (state.loadingFeed || !state.lastLoad) {
        if (!state.loadingFeed) setTimeout(() => loadFeed(), 0);
        return '<div class="screen"><div class="page"><div class="spinner"></div></div></div>';
      }
      return `<div class="screen"><div class="page"><div class="row"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button></div>
        <div class="empty">${I.inbox}<b>This post is no longer available</b><span class="small">It may have expired or been removed.</span></div></div></div>`;
    }
    const t = catOf(p.category).type;
    if (t === 'offer') return offerDetail(p);
    if (t === 'people') return personDetail(p);
    if (t === 'training') return trainingDetail(p);
    if (t === 'monthly' && (p.style === 'Special' || p.style === 'Festive')) return specialNewsletter(p);
    return textDetail(p);
  };

  function attachments(p) {
    const items = [];
    if (safeUrl(p.menu)) items.push([catOf(p.category).type === 'monthly' ? 'Full newsletter' : 'Menu', p.menu]);
    if (safeUrl(p.attachment)) items.push(['Attachment', p.attachment]);
    return items.map(([label, url]) => `
      <a class="file-link" href="${esc(url)}" target="_blank" rel="noopener">
        <span class="ic">${I.file}</span>
        <span class="stack" style="gap:0"><b style="font-size:14px">${esc(label)}</b><span class="small muted">Tap to open</span></span>
      </a>`).join('');
  }

  /** The offer's date line: the Days text (e.g. 24 December, Every Wednesday), or its date range. */
  function offerDate(p) {
    if (p.days) return p.days;
    if (p.start && p.end) return p.start === p.end ? fmtDate(p.start) : fmtDate(p.start) + ' – ' + fmtDate(p.end);
    if (p.end) return 'Until ' + fmtDate(p.end);
    return '';
  }

  function offerDetail(p) {
    const img = safeUrl(p.image);
    const hasPrice = p.price !== '' && p.price != null;
    return `
    <div class="screen">
      <div class="detail-hero">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}">` : esc(p.outlet || 'Offer')}
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        ${editBtn(p, 'hero-edit')}
        ${hasPrice ? `<div class="price-badge"><small>AED</small><b>${esc(money(p.price))}</b></div>` : ''}
      </div>
      <div class="page" style="padding-top:22px">
        <div class="stack" style="gap:6px;${hasPrice ? 'padding-right:96px' : ''}">
          ${p.outlet ? `<span class="eyebrow">${esc(p.outlet)}</span>` : ''}
          <h1 class="title-lg">${esc(p.title)}</h1>
        </div>
        ${(offerDate(p) || p.timing) ? `<div class="grid-2">
          ${offerDate(p) ? `<div class="fact"><span>${I.cal} Date</span><b>${esc(offerDate(p))}</b></div>` : ''}
          ${p.timing ? `<div class="fact"><span>${I.clock} Time</span><b>${esc(p.timing)}</b></div>` : ''}
        </div>` : ''}
        ${(p.inclusions && p.inclusions.length) || p.serves ? `<div class="card">
          ${p.inclusions && p.inclusions.length ? `<span class="section-title" style="margin:0">Includes</span><ul class="inclusions">${p.inclusions.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
          ${p.serves ? `<span class="small muted" style="${p.inclusions && p.inclusions.length ? 'border-top:1px solid #EEE7DA;padding-top:10px' : ''}">${esc(p.serves)}</span>` : ''}
        </div>` : ''}
        ${p.message ? `<div class="prose${p.plainText ? ' plain' : ''}">${esc(p.message)}</div>` : ''}
        ${Blocks.render(p.blocks)}
        ${attachments(p)}
        ${p.terms ? `<details class="terms"><summary>Terms &amp; Conditions</summary><div class="terms-body">${esc(p.terms)}</div></details>` : ''}
        <div class="spacer"></div>
        <div class="sticky-actions"><button class="btn" type="button" data-act="nav" data-to="share" data-id="${esc(p.id)}">${I.share} Share with guest</button></div>
      </div>
    </div>`;
  }

  function personDetail(p) {
    const c = catOf(p.category);
    const color = colorHex(c.color);
    const img = safeUrl(p.image);
    return `
    <div class="screen celebrate-screen" ${celebrates(c) ? 'data-fx="confetti-celebrate" data-fx-full' : ''}><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><span class="row" style="gap:8px">${editBtn(p)}</span></div>
      <div class="person-hero plain-hero" style="--c:${esc(color)}">
        <span class="ph">${img ? `<img src="${esc(img)}" alt="${esc(p.personName || p.title)}">` : `<span class="ini">${esc(initials(p.personName || p.title))}</span>`}</span>
        ${isAward(c) && p.subtitle ? `<span class="ribbon">${I.award}${esc(p.subtitle)}</span>` : ''}
        <h1 class="title-lg">${esc(p.personName || p.title)}</h1>
        ${(p.position || p.department) ? `<span class="pos">${esc(p.position || p.department)}</span>` : ''}
        <span class="small muted">${esc(PROP_LABEL[postProp(p.property)] || '')}</span>
      </div>
      ${p.message ? `<div class="prose center${p.plainText ? ' plain' : ''}">${esc(p.message)}</div>` : ''}
      ${attachments(p)}
      <p class="small muted center">${p.postedBy ? `Shared by ${esc(p.postedBy)} · ` : ''}${esc(fmtStamp(p.created))}</p>
      <div class="spacer"></div>
      <div class="sticky-actions"><button class="btn" type="button" data-act="nav" data-to="achievement" data-id="${esc(p.id)}">${I.share} Share this achievement</button></div>
    </div></div>`;
  }

  function trainingDetail(p) {
    const c = catOf(p.category);
    const dp = p.eventDate ? dayParts(p.eventDate) : null;
    const h = heroTop(p, editBtn(p));
    return `
    <div class="screen">${h.top}<div class="page narrow">
      ${h.bar}
      <div class="stack" style="gap:8px">
        ${p.eventDate === todayIso() ? '<span class="today-pill" style="align-self:flex-start">Today</span>' : ''}
        <h1 class="title-lg">${esc(p.title)}</h1>
      </div>
      <div class="grid-2">
        <div class="fact"><span>${I.cal} Date</span><b>${esc(dp ? dp.long : '')}</b></div>
        <div class="fact"><span>${I.clock} Time</span><b>${esc(fmtTiming(p.timing) || 'To be confirmed')}</b></div>
        <div class="fact"><span>${I.mapPin} Venue</span><b>${esc(p.location || 'To be confirmed')}</b></div>
        ${p.personName ? `<div class="fact"><span>Presenter</span>${presenterHtml(p, 30)}</div>` : ''}
      </div>
      ${p.message ? `<div class="prose${p.plainText ? ' plain' : ''}">${esc(p.message)}</div>` : ''}
      ${attachments(p)}
      ${checkinBlock(p)}
      ${attendeesBlock(p)}
      <p class="small muted center">${p.postedBy ? `Shared by ${esc(p.postedBy)} · ` : ''}${esc(fmtStamp(p.created))}</p>
      <div class="spacer"></div>
      ${trainingActions(p)}
    </div></div>`;
  }

  /* ---------------- Leavers (HR and Admin) ---------------- */
  async function loadLeavers() {
    try { state.leavers = (await api('leavers')).staff || []; }
    catch (e) { showError(e); state.leavers = state.leavers || []; }
    if (state.route.name === 'leavers') render();
  }
  const longDate = (iso) => iso ? dayParts(iso).long : '';

  VIEWS.leavers = () => {
    if (!state.leavers) { setTimeout(loadLeavers, 0); }
    const all = state.leavers || [];
    const q = (state.leaverQuery || '').trim().toLowerCase();
    const today = todayIso();
    const leaving = all.filter((x) => x.status === 'Approved' && x.lastDay).sort((a, b) => a.lastDay.localeCompare(b.lastDay));
    const left = all.filter((x) => x.status === 'Left').sort((a, b) => (b.lastDay || '').localeCompare(a.lastDay || ''));
    const found = q ? all.filter((x) => x.status === 'Approved' && !x.lastDay && (x.name + ' ' + x.employeeId + ' ' + x.department).toLowerCase().indexOf(q) >= 0).slice(0, 25) : [];
    const person = (x, mode) => `<details class="person leaver" ${state.leaverOpen === x.employeeId ? 'open' : ''}>
      <summary class="who" style="cursor:pointer;list-style:none">${avatarHtml(x)}
        <div class="spacer"><div class="n">${esc(x.name)}</div><div class="d">ID ${esc(x.employeeId)} · ${esc([x.department, x.property].filter(Boolean).join(' · '))}</div></div>
        ${mode === 'leaving' ? `<span class="tag ${x.lastDay === today ? 'tag-red' : 'tag-fb'}">${x.lastDay === today ? 'Today' : esc(fmtDate(x.lastDay))}</span>` : mode === 'left' ? '<span class="tag tag-muted">Left</span>' : ''}</summary>
      ${mode === 'left' ? `<p class="small muted">Access ended on ${esc(longDate(x.lastDay))} at 6:00 pm.</p>
        <button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="clearLastDay" data-id="${esc(x.employeeId)}">Give access back</button>` : `
      <form class="stack" data-form="lastDay" data-id="${esc(x.employeeId)}" novalidate style="gap:10px">
        <div class="field"><label for="ld-${esc(x.employeeId)}">Last working day</label>
          <input class="input" id="ld-${esc(x.employeeId)}" name="date" type="date" min="${today}" value="${esc(x.lastDay || '')}"></div>
        <p class="hint" style="margin-top:-4px">Their access ends at 6:00 pm on this day. On the day, they see a thank-you message when they open the app.</p>
        <div class="error-box" id="form-error" hidden></div>
        <div class="grid-2">
          <button class="btn btn-sm" type="submit">${x.lastDay ? 'Change date' : 'Save'}</button>
          ${x.lastDay ? `<button class="btn btn-sm btn-danger" type="button" data-act="clearLastDay" data-id="${esc(x.employeeId)}">Remove date</button>` : ''}
        </div>
      </form>`}
    </details>`;
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">HR</span><h1>Leavers</h1></div></div>
      <p class="muted small">Set the last working day for a colleague who has resigned. Their access to the app ends at 6:00 pm that day, and they see a thank-you message when they open the app on their last day.</p>
      <div class="search">${I.search}<label class="sr-only" for="lq">Find a colleague</label><input class="input" id="lq" type="search" placeholder="Find by first name, last name or Employee ID" value="${esc(state.leaverQuery || '')}" data-input="leaverSearch"></div>
      ${!state.leavers ? '<div class="spinner"></div>' : `
      ${q ? `<div class="list">${found.map((x) => person(x, 'find')).join('') || '<p class="small muted center">No one found with access to the app.</p>'}</div>` : ''}
      <span class="section-title">Leaving · ${leaving.length}</span>
      <div class="list">${leaving.map((x) => person(x, 'leaving')).join('') || '<p class="small muted">No one has a last working day set. Search above to add one.</p>'}</div>
      ${left.length ? `<span class="section-title">Left · ${left.length}</span><div class="list">${left.slice(0, 30).map((x) => person(x, 'left')).join('')}</div>` : ''}`}
    </div>${nav('leavers')}</div>`;
  };

  /* ---------------- Training check-in ---------------- */
  const checkinOpen = (p) => p.checkinOpens && Date.now() >= p.checkinOpens && Date.now() <= p.checkinCloses;
  const clock = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });

  /** Check-in status for me, and the trainer's tools (code screen and report). */
  function checkinBlock(p) {
    const now = Date.now();
    let mine = '';
    if (p.checkedInAt) mine = `<div class="checkin-done">${I.check}<span><b>You checked in at ${esc(clock(p.checkedInAt))}</b><br><span class="small">Your attendance is recorded.</span></span></div>`;
    else if (p.checkinOpens && now < p.checkinOpens) mine = `<p class="small muted row" style="gap:6px">${I.clock} Check-in opens at ${esc(clock(p.checkinOpens))}${p.eventDate !== todayIso() ? ' on ' + esc(dayParts(p.eventDate).long) : ''}. Scan the trainer’s QR code or type their code.</p>`;
    else if (p.checkinCloses && now > p.checkinCloses) mine = `<p class="small muted">Check-in for this session has closed.</p>`;
    const tools = p.canRunCheckin ? `<div class="card checkin-tools">
        <span class="section-title" style="margin:0">For the trainer${p.checkedInCount ? ' · ' + p.checkedInCount + ' checked in' : ''}</span>
        <p class="hint" style="margin-top:-6px">Show the check-in code at the training room. It changes every 30 seconds, so only people in the room can check in.</p>
        <div class="grid-2">
          <button class="btn btn-sm" type="button" data-act="nav" data-to="checkinHost" data-id="${esc(p.id)}">${I.qr} Show check-in code</button>
          <button class="btn btn-sm btn-outline" type="button" data-act="nav" data-to="trainingReport" data-id="${esc(p.id)}">Attendance report</button>
        </div>
      </div>` : '';
    return mine + tools;
  }

  /** Bottom button: Check in during the session, otherwise Attend. */
  function trainingActions(p) {
    if (checkinOpen(p) && !p.checkedInAt) {
      return `<div class="sticky-actions"><button class="btn" type="button" data-act="nav" data-to="checkin" data-id="${esc(p.id)}">${I.qr} Check in now</button></div>`;
    }
    if (p.checkedInAt || (p.eventDate && p.eventDate < todayIso()) || (p.checkinCloses && Date.now() > p.checkinCloses)) return '';
    return `<div class="sticky-actions">${p.attending
      ? `<button class="btn btn-attending" type="button" data-act="attend" data-id="${esc(p.id)}" data-v="0">${I.check} You’re attending · tap to cancel</button>`
      : `<button class="btn" type="button" data-act="attend" data-id="${esc(p.id)}" data-v="1">${sv('<path d="M12 5v14M5 12h14"/>', 20)} Attend</button>`}</div>`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the scanner. Check your connection.'));
      document.head.appendChild(s);
    });
  }

  /** Attendee: scan the trainer's QR code with the camera, or type the 6-digit code. */
  const Scanner = {
    stream: null, raf: 0, busy: false,
    stop() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    },
    async start(postId) {
      const video = document.getElementById('scan-video');
      const msg = document.getElementById('scan-msg');
      if (!video) return;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = this.stream;
        await video.play();
      } catch (e) {
        if (msg) msg.textContent = 'The camera isn’t available. Type the 6-digit code instead.';
        document.getElementById('scan-box').classList.add('off');
        return;
      }
      let detector = null;
      if ('BarcodeDetector' in window) { try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; } }
      if (!detector) { try { await loadScript('vendor/jsQR.min.js'); } catch (e) { if (msg) msg.textContent = e.message; return; } }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const tick = async () => {
        if (!this.stream || state.route.name !== 'checkin') return;
        if (video.readyState >= 2 && !this.busy) {
          let text = '';
          try {
            if (detector) {
              const codes = await detector.detect(video);
              text = codes && codes[0] ? codes[0].rawValue : '';
            } else {
              const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * (w / video.videoWidth));
              canvas.width = w; canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const r = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
              text = r ? r.data : '';
            }
          } catch (e) { text = ''; }
          const m = /^DXBAIPI-CHECKIN:([^:]+):(\d{6})$/.exec(text || '');
          if (m) {
            if (m[1] !== postId) { if (msg) msg.textContent = 'This QR code is for a different training.'; }
            else { this.busy = true; await submitCheckin(postId, m[2], 'qr'); this.busy = false; return; }
          }
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  };

  async function submitCheckin(postId, code, method) {
    const msg = document.getElementById('scan-msg');
    if (msg) msg.textContent = 'Checking you in…';
    try {
      const j = await api('checkIn', { postId, code, method });
      Scanner.stop();
      const p = state.posts.find((x) => x.id === postId);
      if (p) { p.checkedInAt = j.checkedIn; p.checkedInCount = (p.checkedInCount || 0) + (j.already ? 0 : 1); LS.set('bb_posts', state.posts); }
      try { Haptics.tap(true); } catch (e) { /* no haptics */ }
      toast(j.already ? 'You were already checked in.' : 'Checked in. Enjoy the training!');
      go('post', { id: postId }, true);
    } catch (e) {
      if (msg) msg.textContent = e.message || 'Could not check in.';
      if (method === 'qr') { Scanner.busy = false; setTimeout(() => Scanner.start(postId), 1500); }
    }
  }

  VIEWS.checkin = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || {};
    setTimeout(() => Scanner.start(id), 50);
    return `
    <div class="screen"><div class="page narrow">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">Check in</h1><span style="width:44px"></span></div>
      <div class="stack" style="gap:4px"><b>${esc(p.title || 'Training')}</b><span class="small muted">${esc([fmtTiming(p.timing), p.location].filter(Boolean).join(' · '))}</span></div>
      <div class="scan-box" id="scan-box">
        <video id="scan-video" playsinline muted autoplay></video>
        <span class="scan-frame" aria-hidden="true"></span>
      </div>
      <p class="small center" id="scan-msg" role="status">Point your camera at the QR code on the trainer’s screen.</p>
      <form class="card" data-form="checkinCode" data-id="${esc(id)}" novalidate>
        <div class="field"><label for="ck-code">Or type the 6-digit code</label>
          <input class="input code-input" id="ck-code" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn" type="submit">Check in</button>
      </form>
    </div></div>`;
  };

  /** Trainer: full-screen QR and code that refresh every 30 seconds, with a live count. */
  const Host = {
    timer: 0, tick: 0, data: null, wake: null,
    stop() { clearTimeout(this.timer); clearInterval(this.tick); this.timer = 0; this.data = null; if (this.wake) { try { this.wake.release(); } catch (e) { /* ignore */ } this.wake = null; } },
    async run(postId) {
      this.stop();
      try { if ('wakeLock' in navigator) this.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* screen may dim */ }
      try { await loadScript('vendor/qrcode.min.js'); } catch (e) { /* the code still shows */ }
      const load = async () => {
        if (state.route.name !== 'checkinHost') { this.stop(); return; }
        try {
          const j = await api('checkinCode', { postId });
          this.data = Object.assign({ at: Date.now() }, j);
          this.paint();
          this.timer = setTimeout(load, j.open ? Math.max(2, Math.min(j.validFor, 10)) * 1000 : 30000);
        } catch (e) { showError(e); this.timer = setTimeout(load, 10000); }
      };
      load();
      this.tick = setInterval(() => this.paintTime(), 1000);
    },
    paint() {
      const box = document.getElementById('host-box');
      if (!box || !this.data) return;
      const d = this.data;
      if (!d.open) {
        box.innerHTML = `<div class="host-closed">${I.clock}<b>${Date.now() < d.opens ? 'Check-in opens at ' + esc(clock(d.opens)) : 'Check-in has closed'}</b>
          <span class="small">${Date.now() < d.opens ? 'Keep this screen open: the code appears by itself.' : d.count + ' checked in. See the attendance report.'}</span></div>`;
      } else {
        let qr = '';
        if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(d.qr); q.make(); qr = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }); }
        box.innerHTML = `<div class="host-qr">${qr}</div>
          <div class="host-code" aria-label="Check-in code">${esc(d.code.slice(0, 3))} ${esc(d.code.slice(3))}</div>
          <div class="host-bar"><span id="host-bar-fill"></span></div>
          <span class="small muted" id="host-time"></span>`;
        this.paintTime();
      }
      const c = document.getElementById('host-count');
      if (c) c.textContent = d.count;
    },
    paintTime() {
      const d = this.data;
      if (!d || !d.open) return;
      const left = Math.max(0, d.validFor - Math.round((Date.now() - d.at) / 1000));
      const t = document.getElementById('host-time'); if (t) t.textContent = 'New code in ' + left + ' s · check-in closes at ' + clock(d.closes);
      const f = document.getElementById('host-bar-fill'); if (f) f.style.width = (left / 30 * 100) + '%';
    }
  };

  VIEWS.checkinHost = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || {};
    setTimeout(() => Host.run(id), 30);
    return `
    <div class="screen host-screen"><div class="page narrow">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Training check-in</span><h1>${esc(p.title || 'Training')}</h1></div></div>
      <div class="host-box" id="host-box"><div class="spinner"></div></div>
      <div class="host-count-card"><span class="hc-n" id="host-count">${p.checkedInCount || 0}</span><span>checked in</span>
        <button class="btn btn-sm btn-outline" type="button" data-act="nav" data-to="trainingReport" data-id="${esc(id)}">See who</button></div>
      <p class="hint center">Colleagues open this training in the app and tap “Check in now”, then scan the QR code or type the code. A screenshot stops working within a minute.</p>
    </div></div>`;
  };

  async function loadReport(id) {
    try { state.report = Object.assign({ postId: id }, await api('attendanceReport', { postId: id })); }
    catch (e) { showError(e); if (!state.report || state.report.postId !== id) state.report = { postId: id, rows: [], error: true }; }
    if (state.route.name === 'trainingReport') render();
  }
  /*
   * Attendance sheet as a PDF (A4), made on the phone with jsPDF (vendor/jspdf.umd.min.js, MIT licence).
   * Top: logo, training name, date, time, venue, presenter. Then one row per attendee with photo.
   * Bottom: a line for the trainer to sign, with their name.
   */
  const ReportPdf = {
    /** A picture as a small JPEG (round for people), or '' if it cannot be loaded. */
    async image(url, round, maxPx) {
      url = safeUrl(url);
      if (!url) return null;
      let src = '';
      try {
        if (/\/d\/[\w-]{10,}/.test(url)) {
          const j = await api('getImage', { url });
          if (j && j.data) src = 'data:' + (j.mimeType || 'image/jpeg') + ';base64,' + j.data;
        }
      } catch (e) { /* try the picture directly */ }
      if (!src) src = url;
      return new Promise((res) => {
        const img = new Image();
        if (!/^data:/.test(src)) img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const n = maxPx || 160;
            const sc = round ? 1 : Math.min(1, n / Math.max(img.naturalWidth, img.naturalHeight));
            const w = round ? n : Math.max(1, Math.round(img.naturalWidth * sc)), h = round ? n : Math.max(1, Math.round(img.naturalHeight * sc));
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const x = c.getContext('2d');
            if (round) {
              x.fillStyle = '#ffffff'; x.fillRect(0, 0, n, n);
              x.save(); x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); x.clip();
              const s = Math.max(n / img.naturalWidth, n / img.naturalHeight);
              x.drawImage(img, (n - img.naturalWidth * s) / 2, (n - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
              x.restore();
              res({ data: c.toDataURL('image/jpeg', 0.85), w: n, h: n, fmt: 'JPEG' });
            } else {
              x.drawImage(img, 0, 0, w, h);
              res({ data: c.toDataURL('image/png'), w, h, fmt: 'PNG' });
            }
          } catch (e) { res(null); }
        };
        img.onerror = () => res(null);
        img.src = src;
      });
    },
    async build(r, progress) {
      await loadScript('vendor/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, H = 297, M = 14, CW = W - M * 2;
      const NAVY = [19, 41, 75], GOLD = [126, 95, 46], MUTED = [90, 98, 115], LINE = [227, 219, 205], ZEBRA = [248, 245, 240];
      const inn = r.rows.filter((x) => x.checkedIn);
      const longDay = r.date ? dayParts(r.date).long : '—';

      // Pictures: the logo and each attendee's photo (4 at a time).
      const own = safeUrl(state.settings.reportLogo);
      const darkLogo = !own && state.settings.logoTone === 'light';
      const logo = await this.image(own || state.settings.logo, false, 800);
      const photos = {};
      let done = 0;
      const queue = inn.slice();
      const worker = async () => {
        while (queue.length) {
          const x = queue.shift();
          photos[x.employeeId] = await this.image(x.photo, true, 120);
          done++; if (progress) progress(done, inn.length);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);

      const txt = (t, x, y, o) => { o = o || {}; doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 10); doc.setTextColor.apply(doc, o.color || NAVY); doc.text(String(t == null ? '' : t), x, y, o.align ? { align: o.align } : undefined); };
      const fit = (t, w, size) => { doc.setFontSize(size); return doc.splitTextToSize(String(t || '—'), w).slice(0, 2); };

      // Header
      let y = M;
      if (darkLogo) { doc.setFillColor.apply(doc, NAVY); doc.rect(0, 0, W, 34, 'F'); }
      if (logo) {
        const maxH = 20, maxW = 110, s = Math.min(maxW / logo.w, maxH / logo.h);
        doc.addImage(logo.data, logo.fmt, M, 8, logo.w * s, logo.h * s);
      } else {
        txt('Embassy Suites by Hilton Dubai Business Bay', M, 16, { size: 11, bold: true });
        txt('Hilton Garden Inn Dubai Business Bay', M, 22, { size: 11, bold: true });
      }
      txt('ATTENDANCE SHEET', W - M, 16, { size: 9, bold: true, align: 'right', color: darkLogo ? [232, 211, 174] : GOLD });
      txt(r.date ? longDay : '', W - M, 22, { size: 9, align: 'right', color: darkLogo ? [255, 255, 255] : MUTED });
      y = 46;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor.apply(doc, NAVY);
      const tl = doc.splitTextToSize(r.title || 'Training', CW);
      doc.text(tl, M, y); y += tl.length * 7.5 + 3;

      // Details
      const facts = [['Date', longDay], ['Time', fmtTiming(r.timing) || '—'], ['Venue', r.location || '—'], ['Presenter', r.presenter || '—']];
      doc.setDrawColor.apply(doc, LINE); doc.setFillColor(251, 248, 243);
      doc.roundedRect(M, y, CW, 24, 3, 3, 'FD');
      facts.forEach((f, i) => {
        const cx = M + 5 + (i % 2) * (CW / 2), cy = y + 8 + Math.floor(i / 2) * 10;
        txt(f[0].toUpperCase(), cx, cy - 2.5, { size: 7, bold: true, color: GOLD });
        txt(doc.splitTextToSize(f[1], CW / 2 - 10)[0], cx, cy + 2, { size: 10 });
      });
      y += 31;
      txt(`Attendees: ${inn.length}`, M, y, { size: 9, bold: true, color: MUTED });
      y += 5;

      // Attendee table
      const cols = [['#', 8], ['Photo', 15], ['Name', 38], ['Department', 33], ['Position', 37], ['Hotel', 19], ['Check-in time', 32]];
      const head = () => {
        doc.setFillColor.apply(doc, NAVY); doc.rect(M, y, CW, 8, 'F');
        let x = M;
        cols.forEach(([h, w]) => { txt(h, x + 2, y + 5.4, { size: 8, bold: true, color: [255, 255, 255] }); x += w; });
        y += 8;
      };
      const ROW = 14;
      head();
      inn.forEach((a, i) => {
        if (y + ROW > H - 22) { doc.addPage(); y = M; head(); }
        if (i % 2) { doc.setFillColor.apply(doc, ZEBRA); doc.rect(M, y, CW, ROW, 'F'); }
        doc.setDrawColor.apply(doc, LINE); doc.line(M, y + ROW, M + CW, y + ROW);
        let x = M;
        const mid = y + ROW / 2;
        txt(String(i + 1), x + 2, mid + 1.2, { size: 9, color: MUTED }); x += cols[0][1];
        const ph = photos[a.employeeId];
        if (ph) doc.addImage(ph.data, 'JPEG', x + 1.5, y + 2, 10, 10);
        else {
          doc.setFillColor(31, 58, 99); doc.circle(x + 6.5, mid, 5, 'F');
          txt(initials(a.name), x + 6.5, mid + 1.3, { size: 8, bold: true, color: [232, 211, 174], align: 'center' });
        }
        x += cols[1][1];
        [[a.name, cols[2][1], true], [a.department, cols[3][1]], [a.position, cols[4][1]], [a.property, cols[5][1], true], [a.checkedIn ? clock(a.checkedIn) : '—', cols[6][1]]]
          .forEach(([v, w, b]) => {
            const lines = fit(v, w - 3, 9);
            doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setTextColor.apply(doc, NAVY);
            doc.text(lines, x + 2, mid + 1.2 - (lines.length - 1) * 1.9);
            x += w;
          });
        y += ROW;
      });
      if (!inn.length) { txt('No one checked in.', M + 2, y + 7, { size: 9, color: MUTED }); y += 12; }

      // Trainer signature
      if (y + 40 > H - 16) { doc.addPage(); y = M; }
      y = Math.max(y + 16, H - 58);
      doc.setDrawColor.apply(doc, NAVY); doc.setLineWidth(0.3);
      doc.line(M, y + 16, M + 80, y + 16);
      doc.line(W - M - 60, y + 16, W - M, y + 16);
      txt('Trainer’s signature', M, y + 21, { size: 8, bold: true, color: GOLD });
      txt('Date', W - M - 60, y + 21, { size: 8, bold: true, color: GOLD });
      txt('Name: ' + (r.presenter || '______________________'), M, y + 27, { size: 10 });

      // Footer on every page
      const pages = doc.getNumberOfPages();
      const stamp = fmtStamp(Date.now());
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        txt('Generated on ' + stamp, M, H - 8, { size: 7, color: MUTED });
        txt('Page ' + i + ' of ' + pages, W - M, H - 8, { size: 7, color: MUTED, align: 'right' });
      }
      return doc;
    }
  };

  /** Trainer, HR, Admin: who signed up and who checked in, with a CSV download. */
  VIEWS.trainingReport = ({ id }) => {
    const r = state.report && state.report.postId === id ? state.report : null;
    if (!r) {
      setTimeout(() => loadReport(id), 0);
      return `<div class="screen"><div class="page"><div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">Attendance report</h1></div><div class="spinner"></div></div></div>`;
    }
    const inn = r.rows.filter((x) => x.checkedIn);
    const out = r.rows.filter((x) => !x.checkedIn);
    const row = (x) => `<div class="set-row" style="cursor:default">${avatarHtml(x, 38)}<span class="set-tx"><b>${esc(x.name)}</b><span>${esc([x.employeeId, x.department].filter(Boolean).join(' · '))}</span></span>
      <span class="set-val">${x.checkedIn ? esc(clock(x.checkedIn)) + (x.method ? `<br><small>${esc(x.method)}</small>` : '') : 'Signed up'}</span></div>`;
    return `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Attendance report</span><h1>${esc(r.title || 'Training')}</h1></div></div>
      <p class="small muted">${esc([r.date ? dayParts(r.date).long : '', fmtTiming(r.timing), r.location, r.presenter ? 'with ' + r.presenter : ''].filter(Boolean).join(' · '))}</p>
      <div class="grid-2">
        <div class="fact"><span>Checked in</span><b style="font-size:24px">${inn.length}</b></div>
        <div class="fact"><span>Signed up, not checked in</span><b style="font-size:24px">${out.length}</b></div>
      </div>
      <button class="btn" type="button" data-act="downloadReportPdf" data-id="${esc(id)}">${I.file} Attendance sheet (PDF)</button>
      <button class="btn btn-outline" type="button" data-act="downloadReport" data-id="${esc(id)}" style="margin-top:-6px">Spreadsheet (CSV for Excel)</button>
      <span class="section-title">Checked in · ${inn.length}</span>
      <div class="set-group">${inn.map(row).join('') || '<p class="small muted center" style="padding:16px">No one has checked in yet.</p>'}</div>
      ${out.length ? `<span class="section-title">Signed up, not checked in · ${out.length}</span><div class="set-group">${out.map(row).join('')}</div>` : ''}
    </div></div>`;
  };

  /** Profile pictures of who is attending, with "See all" for the full list. */
  function attendeesBlock(p) {
    const list = p.attendees || [];
    if (!list.length) return `<div class="card attend-card"><span class="section-title" style="margin:0">Who’s attending</span><p class="small muted">No one yet. Be the first to tap Attend.</p></div>`;
    const shown = list.slice(0, 8);
    return `<div class="card attend-card">
      <div class="row" style="justify-content:space-between"><span class="section-title" style="margin:0">Who’s attending · ${list.length}</span>
        <button class="link-btn" type="button" data-act="nav" data-to="attendees" data-id="${esc(p.id)}">See all</button></div>
      <button type="button" class="face-stack" data-act="nav" data-to="attendees" data-id="${esc(p.id)}" aria-label="See everyone attending">
        ${shown.map((a) => avatarHtml(a, 42)).join('')}${list.length > shown.length ? `<span class="face-more">+${list.length - shown.length}</span>` : ''}
      </button>
    </div>`;
  }

  VIEWS.attendees = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || {};
    const list = p.attendees || [];
    return `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Attending · ${list.length}</span><h1>${esc(p.title || 'Training')}</h1></div></div>
      <div class="set-group">${list.map((a) => `<div class="set-row" style="cursor:default">${avatarHtml(a, 40)}<span class="set-tx"><b>${esc(a.name)}</b><span>${esc(a.department || '')}</span></span></div>`).join('') || '<p class="small muted center" style="padding:16px">No one yet.</p>'}</div>
    </div></div>`;
  };

  /** A post image runs full width from the top of the screen, with Back and Edit on top of it. Without an image: a normal top bar. */
  function heroTop(p, right, cls) {
    const img = safeUrl(p.image);
    const back = `<button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>`;
    if (!img) return { top: '', bar: `<div class="topbar">${back}<span class="row" style="gap:8px">${right}</span></div>` };
    return { top: `<div class="full-hero ${cls || ''}"><img src="${esc(img)}" alt=""><div class="fh-bar">${back}<span class="row" style="gap:8px">${right}</span></div></div>`, bar: '' };
  }

  /** The posts a newsletter includes, grouped by their category. */
  function includedSections(p, onDark) {
    const list = (p.includes || []).map((id) => state.posts.find((x) => x.id === id)).filter(Boolean);
    if (!list.length) return '';
    return cats().filter((c) => c.active !== false)
      .map((c) => sectionRow(c, list.filter((x) => x.category === c.id), { onDark, noMore: true })).join('');
  }

  /** Special and festive newsletters open as a full page in their own colour. */
  function specialNewsletter(p) {
    const bg = colorHex(p.themeColor || (p.style === 'Festive' ? FESTIVE_RED : 'navy'));
    const h = heroTop(p, editBtn(p), 'fade');
    return `
    <div class="screen coll-page" style="--bg:${esc(bg)};background-color:${esc(bg)}" ${p.animation && p.animation !== 'none' ? `data-fx="${esc(p.animation)}" data-fx-full` : ''}>
      ${h.top}
      <div class="page">
        ${h.bar}
        <h1 class="title-lg" style="font-size:34px">${esc(p.title)}</h1>
        ${p.message ? `<div class="prose on-dark${p.plainText ? ' plain' : ''}">${esc(p.message)}</div>` : ''}
        ${p.blocks && p.blocks.length ? Blocks.render(p.blocks) : includedSections(p, true)}
        ${attachments(p)}
        ${shareNlBtn(p)}
        <p class="small center" style="opacity:.8">${p.postedBy ? `Shared by ${esc(p.postedBy)} · ` : ''}${esc(fmtStamp(p.created))}</p>
      </div>
    </div>`;
  }

  /** Newsletters that Admin or Marketing allowed to be shared get a "Share with guests" button. */
  function shareNlBtn(p) {
    return p.shareable ? `<button class="btn share-nl" type="button" data-act="nav" data-to="share" data-id="${esc(p.id)}">${I.share} Share with guests</button>` : '';
  }
  function textDetail(p) {
    const cat = catOf(p.category);
    const monthly = cat.type === 'monthly';
    const needsAck = cat.ack;
    const h = heroTop(p, `${monthly ? '' : tagFor(p)}${editBtn(p)}`);
    return `
    <div class="screen">${h.top}<div class="page">
      ${h.bar}
      <div class="stack" style="gap:8px">
        ${p.priority === 'Urgent' ? '<span class="tag tag-notice">Urgent</span>' : ''}
        <h1 class="title-lg">${esc(p.title)}</h1>
        <span class="small muted">${p.postedBy ? `Posted by ${esc(p.postedBy)} · ` : ''}${esc(fmtStamp(p.created))}</span>
      </div>
      ${p.message ? `<div class="prose${p.plainText ? ' plain' : ''}">${esc(p.message)}</div>` : ''}
      ${attachments(p)}
      ${p.end ? `<p class="small muted row" style="gap:6px">${I.cal}Until ${esc(fmtDate(p.end))}</p>` : ''}
      ${monthly ? (p.blocks && p.blocks.length ? Blocks.render(p.blocks) : includedSections(p, false)) : ''}
      ${monthly ? shareNlBtn(p) : ''}
      <div class="spacer"></div>
      ${needsAck ? `<div class="sticky-actions">${p.acknowledged
        ? `<div class="acked-box">${I.check} You acknowledged this</div>`
        : `<button class="btn" type="button" data-act="ack" data-id="${esc(p.id)}">${I.check} Got it, acknowledge</button>
           <span class="small muted center">The sender can see who has acknowledged.</span>`}</div>` : ''}
    </div></div>`;
  }

  const dm = (day, month) => String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0');
  const bdText = (b) => b ? dm(b.day, b.month) : '';
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function myBirthdayCard() {
    const info = state.myBdayInfo || {};
    const hr = info.hr, self = info.self;
    const cur = self || hr || {};
    const same = hr && self && hr.day === self.day && hr.month === self.month;
    const status = hr && self && !same ? `<div class="offline">HR has <b>${esc(bdText(hr))}</b> on file. They’ll check the date you added (${esc(bdText(self))}).</div>`
      : hr ? `<span class="small" style="color:var(--ok);font-weight:700;display:inline-flex;gap:4px;align-items:center">${I.check} Confirmed by HR: ${esc(bdText(hr))}</span>`
      : self ? `<span class="small muted">Saved. HR will confirm it.</span>` : '';
    const days = [];
    for (let d = 1; d <= 31; d++) days.push(d);
    return `<form class="card" data-form="myBirthday" novalidate>
      <span class="section-title" style="margin:0">${I.cake} Your birthday</span>
      <p class="hint" style="margin-top:-6px">Day and month only, never the year. Colleagues see it on the day in HR and Today’s Special.</p>
      <div class="grid-2">
        <div class="field"><label for="mb-d">Day</label><select class="select" id="mb-d" name="day"><option value="">Day</option>${days.map((d) => `<option ${cur.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label for="mb-m">Month</label><select class="select" id="mb-m" name="month"><option value="">Month</option>${MONTHS_LONG.map((m, i) => `<option value="${i + 1}" ${cur.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      </div>
      ${status}
      <div class="error-box" id="form-error" hidden></div>
      <div class="row">
        <button class="btn btn-sm btn-outline" type="submit" style="flex:1">${self || hr ? 'Update birthday' : 'Save birthday'}</button>
        ${self ? `<button class="link-btn" type="button" data-act="removeMyBday" style="color:var(--notice)">Remove</button>` : ''}
      </div>
    </form>`;
  }

  /** Settings-style row with a coloured icon tile. */
  function setRow(o) {
    const inner = `<span class="set-ic" style="background:${o.color}">${o.icon}</span>
      <span class="set-tx"><b>${o.title}</b>${o.sub ? `<span>${o.sub}</span>` : ''}</span>
      ${o.badge ? `<span class="tag tag-red">${o.badge}</span>` : ''}${o.right || I.chevron}`;
    return o.tag === 'label' ? `<label class="set-row">${inner}</label>`
      : `<button type="button" class="set-row ${o.danger ? 'danger' : ''}" ${o.attrs || ''}>${inner}</button>`;
  }

  function profileTools() {
    const rows = [];
    const pending = canApprove() && state.staff ? state.staff.filter((x) => x.status === 'Pending').length : 0;
    if (isPublisher()) rows.push({ attrs: 'data-act="nav" data-to="myposts"', icon: I.edit, color: '#E8833A', title: 'My posts', sub: 'Edit, hide and read reports' });
    if (canPopups()) rows.push({ attrs: 'data-act="nav" data-to="popups"', icon: I.sparkles, color: '#1F8A8A', title: 'Pop-ups', sub: 'Messages that pop up when the app opens' });
    if (canPopups()) rows.push({ attrs: 'data-act="nav" data-to="quotes"', icon: sv('<path d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6"/>', 18), color: '#B48A4E', title: 'Quote of the day', sub: 'A short quote on Today’s Special' });
    if (canBirthdays()) rows.push({ attrs: 'data-act="nav" data-to="birthdays"', icon: I.cake, color: '#D9487A', title: 'Birthdays', sub: 'Upload and manage the birthday list' });
    if (canCollect()) rows.push({ attrs: 'data-act="nav" data-to="collections"', icon: I.star, color: '#7A4BC2', title: 'Special collections', sub: 'Festive and seasonal sections' });
    if (canApprove()) rows.push({ attrs: 'data-act="nav" data-to="leavers"', icon: sv('<path d="M15 4h4v16h-4"/><path d="M10 8l4 4-4 4"/><path d="M14 12H4"/>', 18), color: '#B65417', title: 'Leavers', sub: 'Last working day for colleagues who resigned' });
    if (canApprove() && !isAdmin()) rows.push({ attrs: 'data-act="nav" data-to="adminTeam"', icon: I.shield, color: '#2E9E5B', title: 'Access requests', sub: 'Approve new colleagues', badge: pending ? pending + ' new' : '' });
    if (isAdmin()) {
      rows.push({ attrs: 'data-act="nav" data-to="adminTeam"', icon: I.shield, color: '#2E9E5B', title: 'Team access', sub: 'Approvals, roles and PIN resets', badge: pending ? pending + ' new' : '' });
      rows.push({ attrs: 'data-act="nav" data-to="adminSetup"', icon: I.gear, color: '#6B717E', title: 'App setup', sub: 'Logo, fonts, theme, sign-in image, lists and categories' });
    }
    if (!rows.length) return '';
    if (canApprove() && state.staff === null) setTimeout(() => { if (state.staff === null) loadStaff(); }, 0);
    return `<div class="set-group">${rows.map(setRow).join('')}</div>`;
  }

  VIEWS.profile = () => {
    const u = state.user || {};
    const perm = Push.permission();
    const needsHome = isIOS() && !isStandalone();
    const pushHint = !CONFIG.oneSignalAppId ? 'Not set up yet'
      : perm === 'unsupported' ? 'Not supported in this browser'
      : needsHome ? 'Add the app to your Home Screen first'
      : perm === 'denied' ? 'Blocked: turn on in phone settings'
      : Push.isOn() ? 'On' : 'Off';
    const pushDisabled = !CONFIG.oneSignalAppId || perm === 'unsupported' || perm === 'denied';
    const info = state.myBdayInfo || {};
    const bd = info.hr || info.self;
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><div class="greet"><h1>Profile</h1></div></div>
      <div class="set-group">
        <button type="button" class="me-row" data-act="nav" data-to="me">
          ${avatarHtml(u, 64)}
          <span class="set-tx"><b style="font-size:19px">${esc(u.name)}</b><span>${esc([u.department, PROP_LABEL[u.property] || u.property].filter(Boolean).join(' · '))}</span><span>Photo, birthday, PIN and details</span></span>
          ${I.chevron}
        </button>
      </div>
      <div class="set-group">
        ${setRow({ tag: 'label', icon: I.bell, color: '#E5484D', title: 'Notifications', sub: pushHint,
          right: `<span class="switch"><input type="checkbox" role="switch" aria-label="Notifications" data-change="pushToggle" ${Push.isOn() ? 'checked' : ''} ${pushDisabled ? 'disabled' : ''}><span></span></span>` })}
        ${setRow({ attrs: 'data-act="nav" data-to="me"', icon: I.cake, color: '#D9487A', title: 'Birthday', right: `<span class="set-val">${bd ? esc(bdText(bd)) : 'Add'}</span>${I.chevron}` })}
        ${setRow({ tag: 'label', icon: sv('<path d="M7 4v16M12 7v10M17 4v16M3 9v6M21 9v6"/>', 18), color: '#7A4BC2', title: 'Haptic feedback', sub: 'A light tick when you tap',
          right: `<span class="switch"><input type="checkbox" role="switch" aria-label="Haptic feedback" data-change="haptics" ${Haptics.on() ? 'checked' : ''}><span></span></span>` })}
        ${setRow({ tag: 'label', icon: sv('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>', 18), color: '#E07A2E', title: 'Sounds', sub: 'With pop-ups and celebrations',
          right: `<span class="switch"><input type="checkbox" role="switch" aria-label="Sounds" data-change="sounds" ${Sound.on() ? 'checked' : ''}><span></span></span>` })}
        ${setRow({ attrs: 'data-act="nav" data-to="appearance"', icon: sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', 18), color: '#3B3F4A', title: 'Appearance', right: `<span class="set-val">${{ light: 'Light', dark: 'Dark', auto: 'Automatic' }[appearance()]}</span>${I.chevron}` })}
        ${!isStandalone() ? setRow({ attrs: 'data-act="addHome"', icon: I.addHome, color: '#2F6FDB', title: 'Add to Home Screen' }) : ''}
      </div>
      ${profileTools()}
      <div class="set-group">
        ${setRow({ attrs: 'data-act="signOut"', icon: I.logout, color: '#9B2C2C', title: 'Sign out', danger: true, right: ' ' })}
      </div>
      <p class="small muted center">${esc(CONFIG.appName)} · version ${esc(CONFIG.appVersion || '1.0.0')}</p>
    </div>${nav('profile')}</div>`;
  };

  /** Appearance: Light, Dark or Automatic (matches the phone). */
  VIEWS.appearance = () => {
    const cur = appearance();
    const opt = (k, title, sub, prev) => `<button type="button" class="look-opt" data-act="setAppearance" data-v="${k}" aria-pressed="${cur === k}">
        <span class="look-prev look-${prev}"><i></i><i></i><i></i></span>
        <b>${title}</b><span class="small muted">${sub}</span>
        <span class="look-tick">${I.check}</span></button>`;
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">Appearance</h1><span style="width:44px"></span></div>
      <div class="set-intro small-intro"><span class="set-intro-ic" style="background:#3B3F4A">${sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', 18)}</span><h2>Appearance</h2><p>Choose a light or dark look, or let the app follow your phone’s setting, for example dark at night.</p></div>
      <div class="look-grid">
        ${opt('light', 'Light', 'Always light', 'light')}
        ${opt('dark', 'Dark', 'Easier at night', 'dark')}
        ${opt('auto', 'Automatic', 'Matches your phone', 'auto')}
      </div>
      <p class="hint">Saved on this phone only.</p>
    </div>${nav('appearance')}</div>`;
  };

  /** My profile: photo, details, birthday and PIN. */
  VIEWS.me = () => {
    const u = state.user || {};
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">My profile</h1><span style="width:44px"></span></div>
      <div class="me-hero">
        <label class="photo-edit" aria-label="Change profile photo">
          ${avatarHtml(u, 104)}
          <span class="cam" aria-hidden="true">${state.photoBusy ? '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin:0;border-color:rgba(255,255,255,.4);border-top-color:#fff"></span>' : sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 16)}</span>
          <input type="file" accept="image/*" data-change="photo" ${state.photoBusy ? 'disabled' : ''}>
        </label>
        <h2 style="font-size:24px">${esc(u.name)}</h2>
        ${safeUrl(u.photo) ? `<button class="link-btn" type="button" data-act="removePhoto" style="min-height:32px">Remove photo</button>` : `<span class="small" style="color:var(--gold-text);font-weight:600">Tap the photo to add yours</span>`}
      </div>
      <div class="card" style="gap:0;padding:6px 16px">
        <div class="kv"><span>Employee ID</span><b>${esc(u.employeeId)}</b></div>
        <div class="kv"><span>Department</span><b>${esc(u.department || '—')}</b></div>
        <div class="kv"><span>Property</span><b>${esc(PROP_LABEL[u.property] || u.property || '—')}</b></div>
        <div class="kv"><span>Role</span><b>${esc(u.role)}</b></div>
      </div>
      <form class="card" data-form="myPosition" novalidate>
        <div class="field"><label for="m-pos">Job title</label>
          <div class="row" style="gap:8px"><input class="input" id="m-pos" name="position" maxlength="80" value="${esc(u.position || '')}" placeholder="e.g. Guest Service Agent" style="flex:1">
          <button class="btn btn-sm" type="submit" style="width:auto;padding:0 18px">Save</button></div>
          <span class="hint" style="margin:0">Shown on training attendance sheets.</span></div>
        <div class="error-box" id="form-error" hidden></div>
      </form>
      <p class="hint" style="margin-top:-8px">To change your name, department or hotel, please ask HR or your Admin.</p>
      ${myBirthdayCard()}
      <form class="card" data-form="changePin" novalidate>
        <span class="section-title" style="margin:0">Change PIN</span>
        <div class="grid-2">
          <div class="field"><label for="p-old">Current PIN</label><input class="input pin-input" id="p-old" name="oldPin" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password"></div>
          <div class="field"><label for="p-new">New PIN</label><input class="input pin-input" id="p-new" name="newPin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></div>
        </div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn btn-outline" type="submit">Update PIN</button>
      </form>
    </div>${nav('me')}</div>`;
  };

  /* ---------- Pop-ups (Admin, HR, Marketing) ---------- */
  async function loadPopups() {
    try { state.popupList = (await api('popups')).popups || []; }
    catch (e) { showError(e); state.popupList = state.popupList || []; }
    if (['popups', 'popupEdit'].indexOf(state.route.name) >= 0) render();
  }
  const FREQ = { once: 'Once per person', daily: 'Once a day', always: 'Every time the app opens' };

  VIEWS.popups = () => {
    if (!state.popupList) setTimeout(loadPopups, 0);
    const list = state.popupList || [];
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Messages</span><h1>Pop-ups</h1></div></div>
      <p class="muted small">A full-screen message that pops up when colleagues open the app, like the birthday wish. Choose the animation, when it appears and how often.</p>
      <button class="btn" type="button" data-act="nav" data-to="popupEdit" data-id="">${sv('<path d="M12 5v14M5 12h14"/>', 20)} New pop-up</button>
      ${!state.popupList ? '<div class="spinner"></div>' : `<div class="list">${list.map((x) => `
        <button type="button" class="pcard" data-act="nav" data-to="popupEdit" data-id="${esc(x.id)}" style="flex-direction:row;align-items:center;gap:14px">
          <span class="avatar" style="background:${esc(colorHex(x.color))};color:#fff">${I.sparkles}</span>
          <span class="spacer stack" style="gap:2px"><span class="t">${esc(x.title)}</span>
            <span class="m">${x.delay ? x.delay + ' sec after opening' : 'As the app opens'} · ${esc(FREQ[x.frequency])}${x.end ? ' · until ' + esc(fmtDate(x.end)) : ''}</span></span>
          <span class="tag ${x.live ? 'tag-ok' : 'tag-muted'}">${x.live ? 'Live' : x.active ? 'Scheduled' : 'Off'}</span>
        </button>`).join('') || '<p class="small muted center">No pop-ups yet.</p>'}</div>`}
    </div>${nav('popups')}</div>`;
  };

  VIEWS.popupEdit = ({ id }) => {
    if (!state.popupList) { setTimeout(loadPopups, 0); return '<div class="screen"><div class="page"><div class="spinner"></div></div></div>'; }
    const x = id ? state.popupList.find((p) => p.id === id) : { title: '', message: '', image: '', buttonText: '', buttonLink: '', color: '#13294B', animation: 'confetti', delay: 5, frequency: 'once', property: 'Cluster', start: '', end: '', active: true };
    if (!x) return '<div class="screen"><div class="page"><p>Pop-up not found.</p></div></div>';
    const link = x.buttonLink || '';
    const linkType = !link ? 'none' : /^post:/.test(link) ? 'post' : 'web';
    const postsList = state.posts.slice(0, 60);
    return `
    <div class="screen"><form class="page narrow" data-form="popup" data-id="${esc(id || '')}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${id ? 'Edit pop-up' : 'New pop-up'}</h1>
        <button class="link-btn" type="button" data-act="previewPopup">Preview</button>
      </div>
      ${imageField('image', safeUrl(x.image), { label: 'Image (optional)' })}
      <div class="card">
        <div class="field"><label for="pp-t">Title</label><input class="input" id="pp-t" name="title" maxlength="80" value="${esc(x.title)}" placeholder="e.g. Welcome to our new team app!"></div>
        <div class="field"><label for="pp-m">Message</label><textarea class="textarea" id="pp-m" name="message" maxlength="600" placeholder="A short message">${esc(x.message)}</textarea></div>
        <div class="field"><span class="label">Background colour</span>${colorPicker('color', x.color, ['navy', 'red', 'burgundy', 'green', 'teal', 'purple', 'gold', 'orange', 'pink'])}</div>
        <div class="field"><span class="label">Animation</span>${animPicker('animation', x.animation)}</div>
      </div>
      <div class="card">
        <span class="label">Button (optional)</span>
        <div class="field"><label for="pp-bt">Button text</label><input class="input" id="pp-bt" name="buttonText" maxlength="30" value="${esc(x.buttonText)}" placeholder="e.g. See the offer"></div>
        <div class="field"><span class="label" id="pp-lt">Button opens</span>
          <div class="seg" role="group" aria-labelledby="pp-lt">${[['none', 'Nothing'], ['post', 'A post'], ['web', 'A web link']].map(([k, l]) => `
            <button type="button" data-act="popupLink" data-v="${k}" aria-pressed="${linkType === k}">${l}</button>`).join('')}</div></div>
        <div class="field" id="pp-post" ${linkType === 'post' ? '' : 'hidden'}><label for="pp-ps">Post</label>
          <select class="select" id="pp-ps" name="linkPost"><option value="">Choose a post</option>${postsList.map((p) => `<option value="${esc(p.id)}" ${link === 'post:' + p.id ? 'selected' : ''}>${esc(catOf(p.category).label)}: ${esc(p.title)}</option>`).join('')}</select></div>
        <div class="field" id="pp-web" ${linkType === 'web' ? '' : 'hidden'}><label for="pp-w">Web link</label><input class="input" id="pp-w" name="linkWeb" inputmode="url" placeholder="https://" value="${esc(linkType === 'web' ? link : '')}"></div>
        <input type="hidden" name="linkType" value="${linkType}">
      </div>
      <div class="card" style="gap:12px">
        <div class="field"><label for="pp-d">When to show it</label>
          <select class="select" id="pp-d" name="delay">${[[0, 'As soon as the app opens'], [3, '3 seconds after opening'], [5, '5 seconds after opening'], [10, '10 seconds after opening'], [30, '30 seconds after opening'], [60, '1 minute after opening']].map(([v, l]) => `<option value="${v}" ${Number(x.delay) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="pp-f">How often</label>
          <select class="select" id="pp-f" name="frequency">${Object.keys(FREQ).map((k) => `<option value="${k}" ${x.frequency === k ? 'selected' : ''}>${FREQ[k]}</option>`).join('')}</select></div>
        <div class="field"><span class="label" id="pp-pl">Who sees it</span>
          <div class="seg" role="group" aria-labelledby="pp-pl">${['Cluster', 'DXBAI', 'DXBPI'].map((v) => `
            <button type="button" data-act="formSeg" data-name="property" data-v="${v}" aria-pressed="${postProp(x.property) === v}">${v === 'Cluster' ? 'Everyone' : v}</button>`).join('')}</div>
          <input type="hidden" name="property" value="${esc(postProp(x.property))}"></div>
        <div class="grid-2">
          <div class="field"><label for="pp-s">Show from</label><input class="input" id="pp-s" name="start" type="date" value="${esc(x.start || '')}"></div>
          <div class="field"><label for="pp-e">Until</label><input class="input" id="pp-e" name="end" type="date" value="${esc(x.end || '')}"></div>
        </div>
        <label class="switch-row" style="border:0"><span><b style="font-size:14px">Turned on</b><br><span class="small muted">Turn off to stop showing it</span></span>
          <span class="switch"><input type="checkbox" role="switch" name="active" ${x.active ? 'checked' : ''}><span></span></span></label>
      </div>
      ${id ? `<button class="btn btn-danger" type="button" data-act="deletePopup" data-id="${esc(id)}">${I.trash} Delete pop-up</button>` : ''}
      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions"><button class="btn" type="submit">${id ? 'Save pop-up' : 'Create pop-up'}</button></div>
    </form></div>`;
  };

  function popupFromForm(form) {
    const f = Object.fromEntries(new FormData(form));
    const link = f.linkType === 'post' && f.linkPost ? 'post:' + f.linkPost : f.linkType === 'web' ? (f.linkWeb || '').trim() : '';
    return { id: form.dataset.id || undefined, title: (f.title || '').trim(), message: (f.message || '').trim(), image: f.image || '', buttonText: (f.buttonText || '').trim(),
      buttonLink: link, color: f.color || '#13294B', animation: f.animation || 'none', delay: Number(f.delay) || 0, frequency: f.frequency || 'once',
      property: f.property || 'Cluster', start: f.start || '', end: f.end || '', active: !!f.active };
  }

  /** Shows a pop-up full screen with its animation. */
  function showPopup(x, preview) {
    if (document.querySelector('.celebrate')) return false;
    const el = document.createElement('div');
    el.className = 'celebrate';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', x.title);
    const bg = colorHex(x.color);
    const hasBtn = x.buttonText && (x.buttonLink || preview);
    el.innerHTML = `<canvas aria-hidden="true"></canvas>
      <div class="cel-card pop-card" style="--pc:${esc(bg)}">
        ${safeUrl(x.image) ? `<img src="${esc(x.image)}" alt="" class="pop-img">` : ''}
        <div class="pop-body">
          <h2>${esc(x.title)}</h2>
          ${x.message ? `<p>${esc(x.message)}</p>` : ''}
          ${hasBtn ? `<button class="btn pop-cta" type="button" data-go>${esc(x.buttonText)}</button>` : ''}
          <button class="btn ${hasBtn ? 'pop-close' : 'pop-cta'}" type="button" data-close>${hasBtn ? 'Close' : esc(x.closeText || 'OK')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const stop = x.animation && x.animation !== 'none' ? FX.run(el.querySelector('canvas'), x.animation, { full: true, burst: true }) : () => {};
    Sound.play(x.animation || 'none');
    const close = () => { stop(); el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.querySelector('[data-close]').addEventListener('click', close);
    const goBtn = el.querySelector('[data-go]');
    if (goBtn) goBtn.addEventListener('click', () => {
      close();
      if (preview) return;
      const l = x.buttonLink || '';
      if (/^post:/.test(l)) go('post', { id: l.slice(5) });
      else if (safeUrl(l)) window.open(l, '_blank', 'noopener');
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    setTimeout(() => el.querySelector('[data-close]').focus(), 50);
    return true;
  }

  /** On someone's last working day: a thank-you pop-up with sparkles, once that day. */
  function maybeFarewell() {
    const f = state.farewell;
    if (!f || !state.user || LS.get('bb_farewell_shown') === todayIso()) return;
    const tryShow = () => {
      if (!state.token) return;
      if (document.querySelector('.celebrate')) { setTimeout(tryShow, 1500); return; }
      const ends = new Date(f.endsAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
      const shown = showPopup({
        title: 'Thank you, ' + firstName(state.user.name) + '!',
        message: 'Thank you for your time and dedication at ' + f.where + '. You made a valuable difference here, to our guests and to all of us, and you will always be part of our family.\n\nWe wish you every success in your next chapter.\n\nYour access to the app ends today at ' + ends + '.',
        color: 'navy', animation: 'sparkle', buttonText: '', buttonLink: '', closeText: 'Thank you'
      });
      if (shown) LS.set('bb_farewell_shown', todayIso());
    };
    setTimeout(tryShow, 1200);
  }

  /** After the feed loads, schedules the first pop-up this person should see. Runs once per app open. */
  function schedulePopups() {
    if (state.popupScheduled || !state.popups || !state.popups.length) return;
    state.popupScheduled = true;
    const seen = LS.get('bb_pop_seen') || {};
    const today = todayIso();
    const x = state.popups.find((p) => p.frequency === 'always' || (p.frequency === 'daily' ? seen[p.id] !== today : !seen[p.id]));
    if (!x) return;
    const wait = Math.max(0, x.delay * 1000 - (Date.now() - state.openedAt));
    const tryShow = () => {
      if (!state.token) return;
      if (document.querySelector('.celebrate')) { setTimeout(tryShow, 1500); return; }
      if (showPopup(x)) { seen[x.id] = today; LS.set('bb_pop_seen', seen); }
    };
    setTimeout(tryShow, wait);
  }

  /* ---------- Publisher: compose ---------- */
  function composeDefaults(cat) {
    return { category: cat, property: 'Cluster', priority: 'Normal', pinned: false, sendPush: true, inclusions: [], title: '', message: '' };
  }

  VIEWS.compose = ({ id, cat, groups }) => {
    const editing = id ? ((state.myPosts || []).find((p) => p.id === id) || state.posts.find((p) => p.id === id)) : null;
    if (id && !editing) return '<div class="screen"><div class="page"><div class="spinner"></div></div></div>';
    const g = groups ? groups.split(',') : null;
    const allowed = state.canPublish.filter((x) => !g || g.indexOf(catOf(x).group) >= 0);
    const category = editing ? editing.category : (cat && allowed.indexOf(cat) >= 0 ? cat : (allowed.length === 1 ? allowed[0] : null));

    if (!category) {
      return `<div class="screen"><div class="page">
        <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1>New post</h1><span style="width:44px"></span></div>
        <p class="muted">What would you like to share?</p>
        <div class="list">${allowed.map((id) => { const c = catOf(id); return `
          <button type="button" class="pcard" data-act="pickCat" data-v="${esc(c.id)}"><span class="tag tag-${esc(c.color)}">${esc(TYPE_INFO[c.type].name)}</span><span class="t">${esc(c.label)}</span><span class="m">${esc(TYPE_INFO[c.type].desc)}</span></button>`; }).join('')}</div>
      </div></div>`;
    }

    const d = editing || composeDefaults(category);
    if (!state.lists) getLists().then(() => { if (state.route.name === 'compose') render(); });
    const outlets = (state.lists && state.lists.outlets) || [];
    const catInfo = catOf(category);
    const isOffer = catInfo.type === 'offer';
    const isMonthly = catInfo.type === 'monthly';
    const isPeople = catInfo.type === 'people';
    const titleLabel = 'New: ' + catInfo.label;
    const img = safeUrl(d.image);
    if (isPeople) return composePeople(id, category, d, editing);
    if (catInfo.type === 'training') return composeTraining(id, category, d, editing);

    return `
    <div class="screen"><form class="page" data-form="post" data-id="${esc(id || '')}" data-cat="${esc(category)}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${editing ? 'Edit post' : esc(titleLabel)}</h1>
        <span style="width:52px"></span>
      </div>

      ${imageField('image', img, { label: !isOffer && !isMonthly ? 'Image (optional, shown when the post is opened)' : '' })}

      <div class="card">
        ${isOffer ? `
        <div class="grid-2">
          <div class="field"><label for="c-outlet">Outlet</label>
            <select class="select" id="c-outlet" name="outlet">
              <option value="">Select</option>
              ${outlets.concat(d.outlet && outlets.indexOf(d.outlet) < 0 ? [d.outlet] : []).map((o) => `<option ${o === d.outlet ? 'selected' : ''}>${esc(o)}</option>`).join('')}
            </select></div>
          <div class="field"><label for="c-price">Price (AED)</label><input class="input" id="c-price" name="price" inputmode="decimal" value="${esc(d.price == null ? '' : d.price)}"></div>
        </div>` : ''}
        <div class="field"><label for="c-title">Title</label><input class="input" id="c-title" name="title" required maxlength="120" value="${esc(d.title)}"></div>
        ${isOffer ? `
        <div class="grid-2">
          <div class="field"><label for="c-days">Date</label><input class="input" id="c-days" name="days" list="days-list" placeholder="e.g. 24 December, Every Wednesday" value="${esc(d.days || '')}"></div>
          <div class="field"><label for="c-time">Timing</label><input class="input" id="c-time" name="timing" placeholder="e.g. 5–10 pm" value="${esc(d.timing || '')}"></div>
        </div>
        <datalist id="days-list"><option>Daily</option><option>Every weekday</option><option>Weekends</option><option>Every Friday</option><option>Every Saturday</option><option>Every Sunday</option></datalist>
        <div class="field"><label for="c-inc">Inclusions</label><textarea class="textarea" id="c-inc" name="inclusions" placeholder="One item per line">${esc((d.inclusions || []).join('\n'))}</textarea></div>
        <div class="field"><label for="c-serves">Note</label><input class="input" id="c-serves" name="serves" placeholder="e.g. Serves 2–3 guests" value="${esc(d.serves || '')}"></div>` : ''}
        <div class="field"><label for="c-msg">${isOffer ? 'Description (optional)' : 'Message'}</label><textarea class="textarea" id="c-msg" name="message" ${isOffer ? '' : 'required'}>${esc(d.message || '')}</textarea></div>
        <label class="switch-row" style="border:0;padding:0;min-height:0"><span class="small"><b>White box around the ${isOffer ? 'description' : 'message'}</b><br><span class="muted">Turn off to show it as plain text on the page background</span></span>
          <span class="switch"><input type="checkbox" role="switch" name="messageBox" ${d.plainText ? '' : 'checked'}><span></span></span></label>
        ${isOffer ? `<div class="field"><label for="c-terms">Terms &amp; Conditions (optional)</label><textarea class="textarea" id="c-terms" name="terms" maxlength="2000" placeholder="One condition per line, e.g. Prior reservation required">${esc(d.terms || '')}</textarea></div>` : ''}
      </div>

      ${isOffer ? `
      <div class="card">
        <span class="label">Guest call-to-action</span>
        <p class="hint" style="margin-top:-8px">Only appears on the image or PDF you share with guests, not in the staff app.</p>
        <div class="grid-2">
          <div class="field"><label for="c-cta">Button text</label><input class="input" id="c-cta" name="ctaText" maxlength="40" list="cta-list" placeholder="e.g. Book now" value="${esc(d.ctaText || '')}"></div>
          <div class="field"><label for="c-ctal">Phone or link</label><input class="input" id="c-ctal" name="ctaLink" inputmode="url" placeholder="+971 4… or https://" value="${esc(d.ctaLink || '')}"></div>
        </div>
        <datalist id="cta-list"><option>Book now</option><option>Reserve a table</option><option>Call to book</option><option>WhatsApp us</option><option>View menu</option></datalist>
        <p class="hint">For WhatsApp, write the number as wa:+9715…</p>
      </div>` : ''}

      <div class="card">
        <span class="label">${isOffer ? 'Menu (PDF)' : isMonthly ? 'Full newsletter (PDF)' : 'Attachment (PDF or image)'}</span>
        ${fileField(isOffer || isMonthly ? 'menu' : 'attachment', isOffer || isMonthly ? d.menu : d.attachment, isOffer || isMonthly ? 'application/pdf' : 'application/pdf,image/*')}
        ${isOffer || isMonthly ? `<input type="hidden" name="attachment" value="${esc(safeUrl(d.attachment))}">` : `<input type="hidden" name="menu" value="${esc(safeUrl(d.menu))}">`}
      </div>

      ${isOffer ? Blocks.editor(d.blocks || [], { exclude: d.id, title: 'More sections (optional)', hint: 'Add images and text sections below the description, in the order you want. Images keep their own height.' }) : ''}
      ${isMonthly ? newsletterStyleFields(d) : ''}
      ${isMonthly ? Blocks.editor(newsletterBlocks(d), { posts: true, exclude: d.id, title: 'Newsletter sections', hint: 'Build the newsletter: text sections with headings, images and chosen posts, in the order you want. Use the arrows to move them.' }) : ''}
      ${isMonthly && canCollect() ? `<div class="card"><label class="switch-row" style="border:0;padding:0">
        <span><b style="font-size:14px">Can be shared with guests</b><br><span class="small muted">Adds a “Share with guests” button (picture or PDF, with the hotel logo and address)</span></span>
        <span class="switch"><input type="checkbox" role="switch" name="shareable" ${d.shareable ? 'checked' : ''}><span></span></span></label></div>` : ''}
      ${collectionPicker(d)}
      ${specialFields(d)}

      <div class="card" style="gap:12px">
        <div class="field"><span class="label" id="c-prop-l">Property</span>
          <div class="seg" role="group" aria-labelledby="c-prop-l">${['Cluster', 'DXBAI', 'DXBPI'].map((v) => `
            <button type="button" data-act="formSeg" data-name="property" data-v="${v}" aria-pressed="${postProp(d.property) === v}">${v}</button>`).join('')}</div>
          <input type="hidden" name="property" value="${esc(postProp(d.property))}">
          <p class="hint">Cluster sends to everyone at both hotels.</p></div>
        ${!isOffer && !isMonthly ? `
        <div class="field"><span class="label" id="c-pri-l">Priority</span>
          <div class="seg" role="group" aria-labelledby="c-pri-l">${['Normal', 'Urgent'].map((v) => `
            <button type="button" data-act="formSeg" data-name="priority" data-v="${v}" aria-pressed="${(d.priority || 'Normal') === v}">${v}</button>`).join('')}</div>
          <input type="hidden" name="priority" value="${esc(d.priority || 'Normal')}"></div>` : ''}
        <div class="grid-2">
          <div class="field"><label for="c-start">Show from</label><input class="input" id="c-start" name="start" type="date" value="${esc(d.start || '')}"></div>
          <div class="field"><label for="c-end">Until</label><input class="input" id="c-end" name="end" type="date" value="${esc(d.end || '')}"></div>
        </div>
        <p class="hint">Leave “Show from” empty to publish now. After the “Until” date the post disappears from the feed.</p>
      </div>

      <div class="card" style="gap:0;padding:4px 16px">
        <label class="switch-row"><span><b style="font-size:14px">Pin to top</b><br><span class="small muted">Keeps it first in everyone’s feed</span></span>
          <span class="switch"><input type="checkbox" name="pinned" ${d.pinned ? 'checked' : ''}><span></span></span></label>
        ${!editing || !d.pushSent ? `<label class="switch-row"><span><b style="font-size:14px">Send notification</b><br><span class="small muted">${CONFIG.oneSignalAppId ? 'Alerts staff at the selected hotel' : 'Will work once alerts are set up'}</span></span>
          <span class="switch"><input type="checkbox" name="sendPush" ${editing ? '' : 'checked'}><span></span></span></label>` : ''}
      </div>

      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions">
        <button class="btn" type="submit" id="publish-btn">${editing ? 'Save changes' : 'Publish'}</button>
      </div>
    </form></div>`;
  };

  /** Newsletter: choose which posts appear inside it, grouped by category. */
  function includePicker(d) {
    const sel = new Set(d.includes || []);
    const groups = cats().filter((c) => c.active !== false && c.type !== 'monthly')
      .map((c) => [c, state.posts.filter((x) => x.category === c.id && x.id !== d.id)]).filter((g) => g[1].length);
    return `<div class="card">
      <span class="label">Include in this newsletter</span>
      <p class="hint" style="margin-top:-6px">Tick the posts to show inside this newsletter. They appear grouped by their category. Nothing is included unless you tick it.</p>
      ${groups.map(([c, ps]) => `<details class="inc-group" ${ps.some((x) => sel.has(x.id)) ? 'open' : ''}>
        <summary>${catTag(c)}<span class="small muted">${ps.length} post${ps.length > 1 ? 's' : ''}</span></summary>
        ${ps.map((x) => `<label class="check-row"><input type="checkbox" name="inc" value="${esc(x.id)}" ${sel.has(x.id) ? 'checked' : ''}><span>${esc(x.title)}${x.outlet ? ` <span class="small muted">· ${esc(x.outlet)}</span>` : ''}</span></label>`).join('')}
      </details>`).join('') || '<p class="small muted">No live posts to include yet.</p>'}
    </div>`;
  }

  /** When a post shows in Today's Special: never, one date, every day, chosen weekdays, or a day of the month. */
  function specialFields(d) {
    const r = d.specialRepeat || '';
    let mode = 'off', days = [], md = 1;
    if (r === 'date' || r === 'daily') mode = r;
    else if (r.startsWith('weekly:')) { mode = 'weekly'; days = r.slice(7).split(',').map(Number); }
    else if (r.startsWith('monthly:')) { mode = 'monthly'; md = Number(r.slice(8)) || 1; }
    else if (!r && d.specialDate) mode = 'date';
    else if (!r && d.todaySpecial) { days = daysFromText(d.days); mode = days.length ? 'weekly' : 'daily'; }
    const opt = (v, l) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`;
    const order = [1, 2, 3, 4, 5, 6, 0];
    return `<div class="card">
      <span class="label">${I.star} Today’s Special</span>
      <div class="field"><label for="c-smode">How often</label>
        <select class="select" id="c-smode" name="specialMode" data-change="specialMode">
          ${opt('off', 'Don’t show in Today’s Special')}${opt('date', 'On one date')}${opt('weekly', 'Every week, on chosen days')}${opt('monthly', 'Every month, on one date')}${opt('daily', 'Every day')}
        </select></div>
      <div class="field" data-sm="date" ${mode === 'date' ? '' : 'hidden'}><label for="c-sdate">Date</label>
        <input class="input" id="c-sdate" name="specialDate" type="date" value="${esc(d.specialDate || '')}"></div>
      <div class="field" data-sm="weekly" ${mode === 'weekly' ? '' : 'hidden'}><span class="label">On</span>
        <div class="wk-chips" role="group" aria-label="Days of the week">${order.map((i) => `<label class="wk-chip"><input type="checkbox" name="specialDays" value="${i}" ${days.indexOf(i) >= 0 ? 'checked' : ''}><span>${WEEKDAYS[i].slice(0, 3).replace(/^./, (c) => c.toUpperCase())}</span></label>`).join('')}</div></div>
      <div class="field" data-sm="monthly" ${mode === 'monthly' ? '' : 'hidden'}><label for="c-smd">Day of the month</label>
        <select class="select" id="c-smd" name="specialMonthDay">${Array.from({ length: 31 }, (_, k) => `<option value="${k + 1}" ${md === k + 1 ? 'selected' : ''}>${k + 1}</option>`).join('')}</select>
        <span class="hint" style="margin:0">In shorter months it shows on the last day.</span></div>
      <p class="hint">It only shows between the “Show from / Until” dates, if you set them, and always stays in its own section too.</p>
    </div>`;
  }

  /** File (PDF) upload with a Remove button. */
  function fileField(name, url, accept) {
    const has = !!safeUrl(url);
    return `<label class="upload" style="min-height:64px">
        <span class="upload-label" id="${name}-label">${has ? 'File attached · tap to replace' : 'Choose file'}</span>
        <input type="file" accept="${accept}" data-change="upload" data-target="${name}" data-label="${name}-label">
      </label>
      <button type="button" class="link-btn remove-btn" data-act="removeUpload" data-target="${name}" data-label="${name}-label" data-remove-for="${name}" ${has ? '' : 'hidden'}>${I.trash} Remove file</button>
      <input type="hidden" name="${name}" value="${esc(safeUrl(url))}">`;
  }

  /** Image upload box with a Remove button. */
  function imageField(name, url, o) {
    o = o || {};
    const id = o.id || 'img';
    const noun = o.noun || 'image';
    return `<div class="img-field">
      ${o.label ? `<span class="label">${o.label}</span>` : ''}
      <label class="upload" id="${id}-box" ${o.style ? `style="${o.style}"` : ''}>
        ${url ? `<img src="${esc(url)}" alt="">` : I.image}
        <span class="upload-label" id="${id}-label">${url ? 'Change ' + noun : 'Add ' + noun}</span>
        <input type="file" accept="image/*" data-change="upload" data-target="${name}" data-label="${id}-label" data-box="${id}-box" data-noun="${noun}">
      </label>
      <button type="button" class="link-btn remove-btn" data-act="removeUpload" data-target="${name}" data-box="${id}-box" data-label="${id}-label" data-noun="${noun}" data-remove-for="${name}" ${url ? '' : 'hidden'}>${I.trash} Remove ${noun}</button>
      <input type="hidden" name="${name}" value="${esc(url)}">
    </div>`;
  }

  function colorPicker(name, value, list) {
    const keys = list || Object.keys(COLORS);
    const isCustom = value && keys.indexOf(value) < 0;
    return `<div class="swatches" role="group" aria-label="Colour">${keys.map((k) => `
        <button type="button" class="swatch" data-act="pickColor" data-name="${name}" data-v="${k}" aria-pressed="${value === k}" aria-label="${COLOR_NAMES[k] || k}" style="background:${COLORS[k]}"></button>`).join('')}
        <label class="swatch swatch-custom" aria-label="Custom colour" style="${isCustom ? `background:${esc(value)};box-shadow:0 0 0 3px var(--navy)` : ''}">
          <input type="color" data-change="customColor" data-name="${name}" value="${esc(isCustom ? value : '#B3202A')}">${isCustom ? '' : '+'}</label>
      </div>
      <input type="hidden" name="${name}" value="${esc(value || '')}">`;
  }

  function animPicker(name, value) {
    return `<div class="chips" role="group" aria-label="Animation" style="flex-wrap:wrap;margin:0;padding:0">${Object.keys(ANIMS).map((k) => `
      <button type="button" class="chip" data-act="formSeg" data-name="${name}" data-v="${k}" aria-pressed="${(value || 'none') === k}">${ANIMS[k]}</button>`).join('')}</div>
      <input type="hidden" name="${name}" value="${esc(value || 'none')}">`;
  }

  function newsletterStyleFields(d) {
    const style = d.style || 'Regular';
    return `<div class="card" id="nl-style">
      <div class="field"><span class="label" id="c-sty-l">Newsletter style</span>
        <div class="seg" role="group" aria-labelledby="c-sty-l">${['Regular', 'Special', 'Festive'].map((v) => `
          <button type="button" data-act="nlStyle" data-v="${v}" aria-pressed="${style === v}">${v}</button>`).join('')}</div>
        <input type="hidden" name="style" value="${esc(style)}"></div>
      <div class="stack" id="nl-extra" ${style === 'Regular' ? 'hidden' : ''}>
        <div class="field"><span class="label">Colour</span>${colorPicker('themeColor', d.themeColor || (style === 'Festive' ? FESTIVE_RED : 'navy'), ['navy', 'red', 'burgundy', 'green', 'teal', 'purple', 'gold', 'orange'])}</div>
        <div class="field"><span class="label">Animation</span>${animPicker('animation', d.animation || (style === 'Festive' ? 'sparkle' : 'none'))}</div>
        <p class="hint">The newsletter card and the whole page take this colour when opened.</p>
      </div>
    </div>`;
  }

  function collectionPicker(d) {
    if (!canCollect()) return '';
    const list = (state.adminColls || state.collections || []);
    if (!list.length && !d.collection) return '';
    return `<div class="card">
      <div class="field"><label for="c-coll">Special collection (optional)</label>
        <select class="select" id="c-coll" name="collection" data-change="collPick">
          <option value="">None</option>
          ${list.map((c) => `<option value="${esc(c.id)}" ${d.collection === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select></div>
      <p class="hint">Shows this post inside the highlighted collection, e.g. Festive Season.</p>
      <label class="switch-row" id="coll-only" style="border:0;padding-bottom:0" ${d.collection ? '' : 'hidden'}>
        <span><b style="font-size:14px">Only inside the collection</b><br><span class="small muted">Turn off to also show it on the Home and Offers pages</span></span>
        <span class="switch"><input type="checkbox" role="switch" name="collectionOnly" ${d.id ? (d.collectionOnly ? 'checked' : '') : 'checked'}><span></span></span></label>
    </div>`;
  }

  function composePeople(id, category, d, editing) {
    const c = catOf(category);
    const img = safeUrl(d.image);
    const award = isAward(c);
    return `
    <div class="screen"><form class="page" data-form="post" data-id="${esc(id || '')}" data-cat="${esc(category)}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${editing ? 'Edit' : esc(c.label)}</h1><span style="width:52px"></span>
      </div>
      <div class="card">
        <div class="field"><label for="c-pid">Employee ID or name</label>
          <div class="row"><input class="input" id="c-pid" name="personId" value="${esc(d.personId || '')}" placeholder="ID, first or last name" data-enter="lookupPerson">
            <button class="btn btn-sm btn-outline" type="button" data-act="lookupPerson">Find</button></div>
          <p class="hint" id="pid-hint">Optional. If the colleague uses the app, their name and photo are filled in.</p></div>
        <div class="field"><label for="c-pname">Name</label><input class="input" id="c-pname" name="personName" maxlength="80" value="${esc(d.personName || '')}"></div>
        <div class="field"><label for="c-pos">${/promot/i.test(c.label) ? 'New position and department' : 'Position and department'}</label><input class="input" id="c-pos" name="position" maxlength="80" placeholder="e.g. Guest Service Agent, Front Office" value="${esc(d.position || '')}"></div>
        ${award ? `<div class="field"><label for="c-sub">Award</label>
          <select class="select" id="c-sub" name="subtitle" required>
            <option value="">Choose the award</option>
            ${c.subcategories.concat(d.subtitle && c.subcategories.indexOf(d.subtitle) < 0 ? [d.subtitle] : []).map((x) => `<option ${x === d.subtitle ? 'selected' : ''}>${esc(x)}</option>`).join('')}
          </select>
          <p class="hint">Shows as the ribbon on the photo. Admin manages these in App setup › ${esc(c.label)}.</p></div>` : '<input type="hidden" name="subtitle" value="">'}
      </div>
      ${imageField('image', img, { label: 'Photo', noun: 'photo', style: 'min-height:180px' })}
      <input type="hidden" name="title" value="${esc(d.title || '')}">
      <div class="card">
        <div class="field"><label for="c-msg">Message (optional)</label><textarea class="textarea" id="c-msg" name="message" placeholder="Why they’re being recognised, or a few words of welcome">${esc(d.message || '')}</textarea></div>
      </div>
      <div class="card" style="gap:12px">
        <div class="field"><span class="label" id="c-prop-l">Property</span>
          <div class="seg" role="group" aria-labelledby="c-prop-l">${['Cluster', 'DXBAI', 'DXBPI'].map((v) => `
            <button type="button" data-act="formSeg" data-name="property" data-v="${v}" aria-pressed="${postProp(d.property) === v}">${v}</button>`).join('')}</div>
          <input type="hidden" name="property" value="${esc(postProp(d.property))}"></div>
        <div class="grid-2">
          <div class="field"><label for="c-start">Show from</label><input class="input" id="c-start" name="start" type="date" value="${esc(d.start || '')}"></div>
          <div class="field"><label for="c-end">Until</label><input class="input" id="c-end" name="end" type="date" value="${esc(d.end || '')}"></div>
        </div>
      </div>
      ${specialFields(d)}
      <div class="card" style="gap:0;padding:4px 16px">
        ${!editing || !d.pushSent ? `<label class="switch-row"><span><b style="font-size:14px">Send notification</b><br><span class="small muted">Alerts staff at the selected hotel</span></span>
          <span class="switch"><input type="checkbox" name="sendPush" ${editing ? '' : 'checked'}><span></span></span></label>` : ''}
      </div>
      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions"><button class="btn" type="submit">${editing ? 'Save changes' : 'Publish'}</button></div>
    </form></div>`;
  }

  function composeTraining(id, category, d, editing) {
    const c = catOf(category);
    const tm = /^(\d{2}:\d{2})(?:\s*[–-]\s*(\d{2}:\d{2}))?$/.exec(String(d.timing || '').trim());
    return `
    <div class="screen"><form class="page narrow" data-form="post" data-kind="training" data-id="${esc(id || '')}" data-cat="${esc(category)}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${editing ? 'Edit training' : 'New training'}</h1><span style="width:52px"></span>
      </div>
      ${imageField('image', safeUrl(d.image), { label: 'Image (optional)' })}
      <div class="card">
        <div class="field"><label for="c-title">Training title</label><input class="input" id="c-title" name="title" required maxlength="120" value="${esc(d.title || '')}" placeholder="e.g. Fire safety refresher"></div>
        <div class="field"><label for="c-date">Date</label><input class="input" id="c-date" name="eventDate" type="date" required value="${esc(d.eventDate || '')}"></div>
        <div class="grid-2">
          <div class="field"><label for="c-from">Starts</label><input class="input" id="c-from" name="timeFrom" type="time" value="${esc(tm ? tm[1] : '')}"></div>
          <div class="field"><label for="c-to">Ends</label><input class="input" id="c-to" name="timeTo" type="time" value="${esc(tm && tm[2] ? tm[2] : '')}"></div>
        </div>
        ${!tm && d.timing ? `<input type="hidden" name="timingRaw" value="${esc(d.timing)}">` : ''}
        <div class="field"><label for="c-venue">Venue</label><input class="input" id="c-venue" name="location" maxlength="80" placeholder="e.g. Training Room, Level 2" value="${esc(d.location || '')}"></div>
      </div>
      <div class="card">
        <span class="label">Presenter</span>
        <div class="field"><label for="c-pid">Employee ID or name</label>
          <div class="row"><input class="input" id="c-pid" name="personId" value="${esc(d.personId || '')}" placeholder="ID, first or last name" data-enter="lookupPerson">
            <button class="btn btn-sm btn-outline" type="button" data-act="lookupPerson">Find</button></div>
          <p class="hint" id="pid-hint">Or just type the name below, e.g. for an external trainer.</p></div>
        <div class="field"><label for="c-pname">Name</label><input class="input" id="c-pname" name="personName" maxlength="80" value="${esc(d.personName || '')}"></div>
      </div>
      <div class="card">
        <div class="field"><label for="c-msg">About the training (optional)</label><textarea class="textarea" id="c-msg" name="message" placeholder="What it covers, who should attend, what to bring">${esc(d.message || '')}</textarea></div>
        <span class="label">Attachment (PDF or image)</span>
        ${fileField('attachment', d.attachment, 'application/pdf,image/*')}
      </div>
      <div class="card" style="gap:12px">
        <div class="field"><span class="label" id="c-prop-l">Who it’s for</span>
          <div class="seg" role="group" aria-labelledby="c-prop-l">${['Cluster', 'DXBAI', 'DXBPI'].map((v) => `
            <button type="button" data-act="formSeg" data-name="property" data-v="${v}" aria-pressed="${postProp(d.property) === v}">${v}</button>`).join('')}</div>
          <input type="hidden" name="property" value="${esc(postProp(d.property))}">
          <p class="hint">Everyone it’s for gets a reminder at 9:00 am on the day.</p></div>
      </div>
      <div class="card" style="gap:0;padding:4px 16px">
        ${!editing || !d.pushSent ? `<label class="switch-row"><span><b style="font-size:14px">Announce it now</b><br><span class="small muted">Sends a notification today as well</span></span>
          <span class="switch"><input type="checkbox" name="sendPush" ${editing ? '' : 'checked'}><span></span></span></label>` : ''}
      </div>
      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions"><button class="btn" type="submit">${editing ? 'Save changes' : 'Add to calendar'}</button></div>
    </form></div>`;
  }

  /* ---------- Special collections (Marketing / Admin) ---------- */
  async function loadCollections() {
    try { state.adminColls = (await api('collections')).collections || []; }
    catch (e) { showError(e); state.adminColls = state.adminColls || []; }
    if (['collections', 'collectionEdit'].indexOf(state.route.name) >= 0) render();
  }

  VIEWS.collections = () => {
    if (state.adminColls === null) { setTimeout(loadCollections, 0); }
    const list = state.adminColls || [];
    const today = todayIso();
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">Marketing</span><h1>Special collections</h1></div></div>
      <p class="muted small">A highlighted section with its own colour and animation, e.g. Festive Season or Ramadan. Add offers, notices and newsletters to it when posting.</p>
      <button class="btn" type="button" data-act="nav" data-to="collectionEdit" data-id="">${I.plus} New collection</button>
      ${state.adminColls === null ? '<div class="spinner"></div>' : `<div class="list">${list.map((c) => {
        const live = c.active && (!c.start || c.start <= today) && (!c.end || c.end >= today);
        return `<button type="button" class="pcard" data-act="nav" data-to="collectionEdit" data-id="${esc(c.id)}" style="flex-direction:row;align-items:center;gap:14px">
          <span class="avatar" style="background:${esc(colorHex(c.color))};color:#fff">${I.sparkles}</span>
          <span class="spacer stack" style="gap:2px"><span class="t">${esc(c.name)}</span>
            <span class="m">${esc(ANIMS[c.animation] || 'None')} animation${c.end ? ' · until ' + esc(fmtDate(c.end)) : ''}</span></span>
          <span class="tag ${live ? 'tag-ok' : 'tag-muted'}">${live ? 'Live' : c.active ? 'Scheduled' : 'Hidden'}</span>
        </button>`;
      }).join('') || '<p class="small muted center">No collections yet.</p>'}</div>`}
    </div>${nav('collections')}</div>`;
  };

  VIEWS.collectionEdit = ({ id }) => {
    if (state.adminColls === null) { setTimeout(loadCollections, 0); return '<div class="screen"><div class="page"><div class="spinner"></div></div></div>'; }
    const c = id ? state.adminColls.find((x) => x.id === id) : { name: '', color: FESTIVE_RED, animation: 'sparkle', active: true, banner: '', start: '', end: '' };
    if (!c) return '<div class="screen"><div class="page"><p>Collection not found.</p></div></div>';
    const banner = safeUrl(c.banner);
    return `
    <div class="screen"><form class="page" data-form="collection" data-id="${esc(id || '')}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${id ? 'Edit collection' : 'New collection'}</h1><span style="width:52px"></span>
      </div>
      <div class="coll-preview" id="coll-prev" style="--bg:${esc(colorHex(c.color))}" data-fx="${esc(c.animation)}">
        <span class="ey">${I.sparkles} Special</span><span class="nm" id="coll-prev-name">${esc(c.name || 'Festive Season')}</span>
      </div>
      <div class="card">
        <div class="field"><label for="k-cname">Name</label><input class="input" id="k-cname" name="name" maxlength="40" value="${esc(c.name)}" placeholder="e.g. Festive Season" data-input="collName"></div>
        <div class="field"><span class="label">Background colour</span>${colorPicker('color', c.color, ['red', 'burgundy', 'green', 'navy', 'teal', 'purple', 'gold', 'orange'])}</div>
        <div class="field"><span class="label">Animation</span>${animPicker('animation', c.animation)}</div>
      </div>
      ${imageField('banner', banner, { label: 'Banner image (optional)', noun: 'banner' })}
      ${Blocks.editor(c.blocks && c.blocks.length ? (c.blocks.some((b) => b.type === 'auto') ? c.blocks : c.blocks.concat([{ type: 'auto' }])) : [{ type: 'auto' }], { posts: true, title: 'Page sections', hint: 'Build the collection page like a newsletter: add text, images and chosen posts, and move “Posts in this collection” to where you want it.' })}
      <div class="card" style="gap:12px">
        <div class="grid-2">
          <div class="field"><label for="k-cs">Show from</label><input class="input" id="k-cs" name="start" type="date" value="${esc(c.start || '')}"></div>
          <div class="field"><label for="k-ce">Until</label><input class="input" id="k-ce" name="end" type="date" value="${esc(c.end || '')}"></div>
        </div>
        <label class="switch-row" style="border:0"><span><b style="font-size:14px">Show in the app</b><br><span class="small muted">Turn off to hide the whole collection</span></span>
          <span class="switch"><input type="checkbox" role="switch" name="active" ${c.active ? 'checked' : ''}><span></span></span></label>
      </div>
      <div class="error-box" id="form-error" hidden></div>
      ${id && isAdmin() ? `<button class="btn btn-danger" type="button" data-act="deleteCollection" data-id="${esc(id)}">${I.trash} Delete collection</button>` : ''}
      <div class="sticky-actions"><button class="btn" type="submit">${id ? 'Save collection' : 'Create collection'}</button></div>
    </form></div>`;
  };

  /* ---------- Birthdays (HR / Admin) ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  async function loadBirthdays() {
    try { state.bdayList = (await api('birthdays')).birthdays || []; }
    catch (e) { showError(e); state.bdayList = state.bdayList || []; }
    if (state.route.name === 'birthdays') render();
  }

  /** Reads a date in common formats; day comes first unless that is impossible. Returns {day, month} or null. */
  function parseBirthday(raw) {
    let v = String(raw == null ? '' : raw).trim();
    if (!v) return null;
    if (/^\d{5}(\.\d+)?$/.test(v)) { // Excel serial number
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 864e5);
      return { day: d.getUTCDate(), month: d.getUTCMonth() + 1 };
    }
    v = v.replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ');
    const mon = (t) => { const i = MONTHS.findIndex((m) => t.toLowerCase().startsWith(m.toLowerCase())); return i < 0 ? 0 : i + 1; };
    let m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(v))) return ok(+m[3], +m[2]);
    if ((m = /^(\d{1,2})[-/. ]([A-Za-z]{3,})(?:[-/. ]\d{2,4})?$/.exec(v))) return ok(+m[1], mon(m[2]));
    if ((m = /^([A-Za-z]{3,})[-/. ](\d{1,2})(?:[-/. ]\d{2,4})?$/.exec(v))) return ok(+m[2], mon(m[1]));
    if ((m = /^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/.exec(v))) {
      const a = +m[1], b = +m[2];
      return a > 12 ? ok(a, b) : b > 12 ? ok(b, a) : ok(a, b);
    }
    return null;
    function ok(day, month) { return month >= 1 && month <= 12 && day >= 1 && day <= new Date(2024, month, 0).getDate() ? { day, month } : null; }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    const delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t'
      : (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim()));
  }

  function importRows(text) {
    const rows = parseCsv(text.replace(/^﻿/, ''));
    if (!rows.length) return { good: [], bad: [] };
    const head = rows[0].map((h) => String(h).toLowerCase());
    const find = (re) => head.findIndex((h) => re.test(h));
    let iId = find(/emp|staff|\bid\b|number|code/), iName = find(/name/), iDate = find(/birth|dob|date/), iProp = find(/prop|hotel/), iDept = find(/dep/);
    let body = rows.slice(1);
    if (iId < 0 || iDate < 0) { iId = 0; iName = 1; iDate = 2; iProp = 3; iDept = 4; body = parseBirthday(rows[0][2]) ? rows : rows.slice(1); }
    const good = [], bad = [];
    body.forEach((r, n) => {
      const id = String(r[iId] || '').trim().toUpperCase();
      const d = parseBirthday(r[iDate]);
      let prop = String(iProp >= 0 ? r[iProp] || '' : '').trim().toUpperCase();
      prop = prop === 'CLUSTER' ? 'Cluster' : prop;
      if (!id || !d) { bad.push(n + 2); return; }
      good.push({ employeeId: id, name: String(iName >= 0 ? r[iName] || '' : '').trim(), day: d.day, month: d.month, property: ['DXBAI', 'DXBPI', 'Cluster'].indexOf(prop) >= 0 ? prop : '', department: String(iDept >= 0 ? r[iDept] || '' : '').trim() });
    });
    return { good, bad };
  }

  VIEWS.birthdays = () => {
    if (state.bdayList === null) setTimeout(loadBirthdays, 0);
    const list = state.bdayList || [];
    const q = state.bdayQuery.trim().toLowerCase();
    const needsCheck = (b) => b.mismatch || (!b.hrDate && b.selfDate);
    const toCheck = list.filter(needsCheck).length;
    const shown = list.filter((b) => !state.bdayCheckOnly || needsCheck(b)).filter((b) => personMatches(q, b))
      .sort((a, b) => a.month - b.month || a.day - b.day);
    const imp = state.bdayImport;
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">HR</span><h1>Birthdays</h1></div></div>
      <div class="card">
        <span class="section-title" style="margin:0">Upload the list</span>
        <p class="hint" style="margin-top:-6px">A CSV file with columns: Employee ID, Name, Date of birth (Property and Department are optional). Save from Excel as “CSV UTF-8”. Only the day and month are kept, never the year.</p>
        ${imp ? `<div class="offline" style="background:var(--ok-bg);color:var(--ok)">${imp.good.length} birthdays ready${imp.bad.length ? ` · ${imp.bad.length} ${imp.bad.length === 1 ? 'row' : 'rows'} skipped (${imp.bad.length === 1 ? 'row' : 'rows'} ${esc(imp.bad.slice(0, 8).join(', '))}${imp.bad.length > 8 ? '…' : ''})` : ''}</div>
          <div class="grid-2">
            <button class="btn btn-sm" type="button" data-act="saveImport" data-mode="merge">Add / update</button>
            <button class="btn btn-sm btn-danger" type="button" data-act="saveImport" data-mode="replace">Replace all</button>
          </div>
          <button class="link-btn" type="button" data-act="cancelImport">Cancel</button>` : `
          <div class="grid-2">
            <label class="btn btn-sm" style="position:relative;overflow:hidden">Choose CSV file<input type="file" accept=".csv,text/csv,.txt,text/plain" data-change="bdayCsv" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
            <button class="btn btn-sm btn-outline" type="button" data-act="bdayTemplate">Get template</button>
          </div>`}
      </div>
      <form class="card" data-form="birthday" novalidate>
        <span class="section-title" style="margin:0">Add one person</span>
        <div class="grid-2">
          <div class="field"><label for="b-id">Employee ID</label><input class="input" id="b-id" name="employeeId" autocapitalize="characters"></div>
          <div class="field"><label for="b-date">Birthday</label><input class="input" id="b-date" name="date" type="date"></div>
        </div>
        <div class="field"><label for="b-name">Name (if not in the app yet)</label><input class="input" id="b-name" name="name"></div>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn btn-sm" type="submit">Save birthday</button>
      </form>
      <div class="search">${I.search}<label class="sr-only" for="bq">Search birthdays</label><input class="input" id="bq" type="search" placeholder="First name, last name or Employee ID" value="${esc(state.bdayQuery)}" data-input="bdaySearch"></div>
      ${state.bdayList === null ? '<div class="spinner"></div>' : `<p class="small muted">${list.length} people · ${list.filter((b) => b.registered).length} use the app</p>
      ${toCheck || state.bdayCheckOnly ? `<button type="button" class="chip" data-act="bdayCheck" aria-pressed="${!!state.bdayCheckOnly}" style="align-self:flex-start">Needs checking (${toCheck})</button>` : ''}
      <div class="card" style="gap:0;padding:4px 16px" id="bday-list">${shown.map((b) => `
        <div class="kv" style="align-items:center">
          <span class="stack" style="gap:2px;color:var(--ink)"><b>${esc(b.name || '(no name)')}</b><span class="small muted">ID ${esc(b.employeeId)}${b.registered ? '' : ' · not in app yet'}</span>
            ${b.mismatch ? `<span class="small" style="color:var(--notice);font-weight:700">They entered ${dm(b.selfDate.day, b.selfDate.month)}</span>` : !b.hrDate && b.selfDate ? '<span class="small" style="color:var(--gold-text);font-weight:700">Added by colleague</span>' : ''}
            ${needsCheck(b) ? `<button class="link-btn" type="button" data-act="useSelfBday" data-id="${esc(b.employeeId)}" data-d="${b.selfDate.day}" data-m="${b.selfDate.month}" style="align-self:flex-start;padding:0;min-height:30px">${b.mismatch ? 'Use their date' : 'Confirm'}</button>` : ''}</span>
          <span class="row" style="gap:6px"><b>${dm(b.day, b.month)}</b>
            <button class="icon-btn" type="button" data-act="deleteBday" data-id="${esc(b.employeeId)}" aria-label="Remove ${esc(b.name)}" style="width:36px;height:36px;background:var(--notice-bg);color:var(--notice)">${sv('<path d="M6 6l12 12M18 6L6 18"/>', 16)}</button></span>
        </div>`).join('') || '<p class="small muted center" style="padding:12px 0">No birthdays yet.</p>'}</div>`}
    </div>${nav('birthdays')}</div>`;
  };

  /* ---------- Publisher: my posts ---------- */
  VIEWS.myposts = () => {
    if (state.myPosts === null) {
      setTimeout(loadMyPosts, 0);
      return `<div class="screen"><div class="page with-nav"><div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">My posts</h1></div><div class="spinner"></div></div>${nav('myposts')}</div>`;
    }
    const all = state.myPosts;
    const counts = {};
    all.forEach((p) => { const st = postStatus(p); counts[st] = (counts[st] || 0) + 1; });
    const statuses = ['All', 'Live', 'Scheduled', 'Expired', 'Removed', 'Draft'].filter((x) => x === 'All' || counts[x]);
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><div class="greet"><span class="eyebrow">${isAdmin() ? 'All posts' : 'Published by you'}</span><h1>My posts</h1></div><span style="width:44px"></span></div>
      ${!all.length ? `<div class="empty">${I.inbox}<b>No posts yet</b><span class="small">Tap + to share your first update.</span></div>` : `
      <div class="search">${I.search}<label class="sr-only" for="mq">Search posts</label><input class="input" id="mq" type="search" placeholder="Search by title${isAdmin() ? ' or who posted' : ''}" value="${esc(state.mineFilter.q)}" data-input="mineSearch"></div>
      <div class="chips" role="group" aria-label="Status">${statuses.map((x) => `
        <button type="button" class="chip" data-act="mineStatus" data-v="${x}" aria-pressed="${state.mineFilter.status === x}">${x}${x !== 'All' ? ` (${counts[x]})` : ''}</button>`).join('')}</div>`}
      <div class="list" id="mine-list">${myPostsList()}</div>
    </div>${nav('myposts')}<button class="fab" type="button" data-act="compose" aria-label="New post">${I.plus}</button></div>`;
  };

  function postStatus(p) {
    if (p.status === 'Removed') return 'Removed';
    if (p.status === 'Draft') return 'Draft';
    if (p.expired) return 'Expired';
    if (p.start && p.start > todayIso()) return 'Scheduled';
    return 'Live';
  }

  function myPostsList() {
    const f = state.mineFilter;
    const q = f.q.trim().toLowerCase();
    const list = state.myPosts.filter((p) => {
      if (f.status !== 'All' && postStatus(p) !== f.status) return false;
      if (q && [p.title, p.postedBy, catOf(p.category).label, p.outlet].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (!list.length && state.myPosts.length) return '<p class="small muted center" style="padding:24px 0">No posts match.</p>';
    return list.map((p) => {
        const st = postStatus(p);
        const status = [{ Live: 'tag-ok', Scheduled: 'tag-fb' }[st] || 'tag-muted', st];
        const ackable = catOf(p.category).ack;
        return `<div class="person">
          <div class="row" style="justify-content:space-between">${tagFor(p)}<span class="tag ${status[0]}">${status[1]}</span></div>
          <div class="stack" style="gap:2px"><b>${esc(p.title)}</b><span class="small muted">${esc(fmtStamp(p.created))}${isAdmin() && p.postedBy ? ' · ' + esc(p.postedBy) : ''}${p.pushSent ? ' · Alert sent' : ''}</span></div>
          <div class="row" style="flex-wrap:wrap;gap:8px">
            ${ackable ? `<button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="report" data-id="${esc(p.id)}">${I.eye} ${p.ackCount} read</button>` : ''}
            <button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="editPost" data-id="${esc(p.id)}">Edit</button>
            ${p.status === 'Removed'
              ? `<button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="setPostStatus" data-id="${esc(p.id)}" data-v="Live">Restore</button>`
              : `<button class="btn btn-sm btn-danger" type="button" data-act="setPostStatus" data-id="${esc(p.id)}" data-v="Removed">Hide</button>`}
            ${isAdmin() ? `<button class="btn btn-sm" style="background:var(--notice);color:#fff" type="button" data-act="deletePost" data-id="${esc(p.id)}">Delete</button>` : ''}
          </div>
        </div>`;
      }).join('');
  }

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function loadMyPosts() {
    try {
      const j = await api('myPosts');
      state.myPosts = j.posts || [];
    } catch (e) {
      showError(e);
      state.myPosts = state.myPosts || [];
    }
    if (['myposts', 'compose'].indexOf(state.route.name) >= 0) render();
  }

  VIEWS.report = ({ id }) => {
    const r = state.report && state.report.id === id ? state.report : null;
    if (!r) {
      setTimeout(async () => {
        try {
          const j = await api('readReport', { postId: id });
          state.report = { id, done: j.done, pending: j.pending };
        } catch (e) { showError(e); state.report = { id, done: [], pending: [] }; }
        if (state.route.name === 'report') render();
      }, 0);
    }
    const p = (state.myPosts || []).find((x) => x.id === id) || {};
    const person = (x, done) => `<div class="who" style="padding:10px 0;border-top:1px solid #EEE7DA">
      ${avatarHtml(x, 36)}
      <div class="spacer"><div class="n" style="font-size:14px">${esc(x.name)}</div><div class="d" style="font-size:12px">${esc([x.department, x.property].filter(Boolean).join(' · '))}</div></div>
      ${done ? `<span class="small muted">${esc(fmtStamp(x.at))}</span>` : ''}</div>`;
    return `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1>Read report</h1><span style="width:44px"></span></div>
      <b>${esc(p.title || '')}</b>
      ${!r ? '<div class="spinner"></div>' : `
      <div class="grid-2">
        <div class="fact"><span>Acknowledged</span><b style="font-size:22px">${r.done.length}</b></div>
        <div class="fact"><span>Not yet</span><b style="font-size:22px">${r.pending.length}</b></div>
      </div>
      <div class="card" style="gap:0"><span class="section-title" style="margin:0 0 6px">Not yet (${r.pending.length})</span>${r.pending.map((x) => person(x, false)).join('') || '<p class="small muted">Everyone has acknowledged.</p>'}</div>
      <div class="card" style="gap:0"><span class="section-title" style="margin:0 0 6px">Acknowledged (${r.done.length})</span>${r.done.map((x) => person(x, true)).join('') || '<p class="small muted">No one yet.</p>'}</div>`}
    </div></div>`;
  };

  /* ---------- Admin ---------- */
  async function loadStaff() {
    try {
      const j = await api('staffList');
      state.staff = j.staff || [];
    } catch (e) {
      showError(e);
      state.staff = state.staff || [];
    }
    if (['admin', 'adminTeam', 'profile'].indexOf(state.route.name) >= 0) render();
  }

  async function loadAdminSettings() {
    try {
      const j = await api('adminSettings');
      state.adminCats = j.categories || [];
      state.adminOutlets = j.outlets || [];
      state.adminTheme = j.theme || { preset: 'default' };
      state.adminDepts = j.departments || [];
      setSettings({ heroImage: j.heroImage || '' }, j.brand);
    } catch (e) {
      showError(e);
      state.adminCats = state.adminCats || [];
    }
    if (['adminSetup', 'setupSection', 'category'].indexOf(state.route.name) >= 0) render();
  }

  function adminShell(inner, sec, title) {
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <div class="greet spacer"><span class="eyebrow">${title ? 'App setup' : isAdmin() ? 'Admin' : 'HR'}</span><h1>${sec === 'team' ? (isAdmin() ? 'Team access' : 'Access requests') : esc(title || 'App setup')}</h1></div></div>
      ${inner}
    </div>${nav('admin')}</div>`;
  }

  VIEWS.admin = () => {
    if (state.staff === null) setTimeout(loadStaff, 0);
    const staff = state.staff || [];
    const pending = staff.filter((s) => s.status === 'Pending').length;
    const approved = staff.filter((s) => s.status === 'Approved').length;
    const tile = (to, icon, title, sub, badge) => `
      <button type="button" class="pcard" data-act="nav" data-to="${to}" style="flex-direction:row;align-items:center;gap:14px;padding:18px 16px">
        <span class="avatar" style="background:var(--gold-bg);color:var(--gold-text)">${icon}</span>
        <span class="spacer stack" style="gap:2px"><span class="t" style="font-size:16px">${title}</span><span class="m">${sub}</span></span>
        ${badge ? `<span class="tag tag-red">${badge}</span>` : ''}
        <span style="color:var(--muted)">${sv('<path d="M9 6l6 6-6 6"/>', 20)}</span>
      </button>`;
    return `
    <div class="screen"><div class="page with-nav">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><div class="greet"><span class="eyebrow">Admin</span><h1>Admin</h1></div><span style="width:44px"></span></div>
      <div class="list">
        ${tile('adminTeam', I.user, 'Team access', state.staff === null ? 'Approvals, roles and access' : `${approved} active · ${pending} waiting for approval`, pending ? pending + ' new' : '')}
        ${tile('adminSetup', sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'), 'App setup', 'Sign-in image and post categories', '')}
      </div>
    </div>${nav('admin')}</div>`;
  };

  VIEWS.adminSetup = () => adminShell(appSetupHtml(), 'setup');
  VIEWS.setupSection = ({ id }) => adminShell(appSetupHtml(id), 'setup', (SETUP_SECTIONS[id] || {}).title);

  /* App setup: a Settings-style menu, each item opens its own page. */
  const SETUP_SECTIONS = {
    logo: { title: 'Logo', color: '#13294B', icon: () => sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15l3-4 3 3 2-2 3 3"/>', 18), desc: 'Sign-in screen and app header' },
    hotels: { title: 'Hotels', color: '#7E5F2E', icon: () => sv('<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M8 8h3M8 12h3M8 16h3M3 21h18"/>', 18), desc: 'Name, address, contacts and logo for what guests receive' },
    fonts: { title: 'Fonts', color: '#8A4B1F', icon: () => sv('<path d="M4 20l6-16h1l6 16"/><path d="M6.5 14h9"/>', 18), desc: 'Headline and body text fonts' },
    theme: { title: 'App theme', color: '#B48A4E', icon: () => I.sparkles, desc: 'Seasonal colours, greeting and animation' },
    signin: { title: 'Sign-in image', color: '#2F6FDB', icon: () => sv('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>', 18), desc: 'Photo at the top of the sign-in screen' },
    outlets: { title: 'Outlets', color: '#1F8A8A', icon: () => sv('<path d="M4 10h16l-1.5 10h-13z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', 18), desc: 'Choices when posting an offer' },
    departments: { title: 'Departments', color: '#5B3C88', icon: () => I.users, desc: 'Choices when creating an account' },
    categories: { title: 'Post categories', color: '#E8833A', icon: () => sv('<path d="M4 6h16M4 12h16M4 18h10"/>', 18), desc: 'Sections, who posts, acknowledgements' },
    reset: { title: 'Reset content', color: '#9B2C2C', icon: () => I.trash, desc: 'Permanently delete posts and other content' }
  };

  function setupValue(sec) {
    const fonts = state.settings.fonts || {};
    const th = state.adminTheme || {};
    return {
      logo: safeUrl(state.settings.logo) ? 'Added' : 'None',
      hotels: ['DXBAI', 'DXBPI', 'Cluster'].filter((k) => ((state.settings.hotels || {})[k] || {}).address).length + ' of 3 set',
      fonts: Object.keys(fonts).length ? Object.keys(fonts).length + ' uploaded' : 'Built-in',
      theme: th.preset && th.preset !== 'default' ? (THEMES[th.preset] || {}).name + (th.live ? '' : ' (scheduled)') : 'Classic',
      signin: safeUrl(state.settings.heroImage) ? 'Added' : 'None',
      outlets: String((state.adminOutlets || []).length),
      departments: String((state.adminDepts || []).length),
      categories: String((state.adminCats || []).length),
      reset: ''
    }[sec];
  }

  function appSetupHtml(sec) {
    if (state.adminCats === null) {
      setTimeout(loadAdminSettings, 0);
      return '<div class="spinner"></div>';
    }
    if (sec) return setupSectionHtml(sec);
    const row = (k) => { const x = SETUP_SECTIONS[k]; const v = setupValue(k);
      return setRow({ attrs: `data-act="nav" data-to="setupSection" data-id="${k}"`, icon: x.icon(), color: x.color, title: esc(x.title), sub: esc(x.desc), danger: k === 'reset',
        right: `${v ? `<span class="set-val">${esc(v)}</span>` : ''}${I.chevron}` }); };
    return `
      <div class="set-intro">
        <span class="set-intro-ic">${I.gear}</span>
        <h2>App setup</h2>
        <p>Manage how the app looks and works for everyone at DXBAI and DXBPI: the logo, fonts and seasonal theme, the lists people choose from, and the post categories.</p>
      </div>
      <div class="set-group">${['logo', 'hotels', 'fonts', 'theme', 'signin'].map(row).join('')}</div>
      <div class="set-group">${['outlets', 'departments', 'categories'].map(row).join('')}</div>
      <div class="set-group">${row('reset')}</div>`;
  }

  function setupSectionHtml(sec) {
    const hero = safeUrl(state.settings.heroImage);
    const x = SETUP_SECTIONS[sec];
    const head = x && sec !== 'reset' ? `<div class="set-intro small-intro"><span class="set-intro-ic" style="background:${x.color}">${x.icon()}</span><h2>${esc(x.title)}</h2><p>${esc(x.desc)}.</p></div>` : '';
    if (sec === 'logo') return head + logoCard() + reportLogoCard();
    if (sec === 'fonts') return head + fontsCard();
    if (sec === 'hotels') return head + hotelsForm();
    if (sec === 'theme') return head + themeCard();
    if (sec === 'signin') return head + `
      <div class="card">
        <span class="section-title" style="margin:0">Sign-in screen image</span>
        <div class="hero-preview">${hero ? `<img src="${esc(hero)}" alt="Current sign-in image">` : 'No image yet: the sign-in screen shows plain navy'}</div>
        <p class="hint">Shown full width at the top of the sign-in screen. A landscape photo works best.</p>
        <div class="grid-2">
          <label class="btn btn-sm" style="position:relative;overflow:hidden">
            <span id="hero-label">${hero ? 'Change image' : 'Upload image'}</span>
            <input type="file" accept="image/*" data-change="hero" style="position:absolute;inset:0;opacity:0;cursor:pointer">
          </label>
          ${hero ? `<button class="btn btn-sm btn-danger" type="button" data-act="removeHero">Remove</button>` : ''}
        </div>
      </div>
`;
    if (sec === 'outlets') return head + `
      <form class="card" data-form="outlets" novalidate>
        <span class="section-title" style="margin:0">Outlets</span>
        <p class="hint" style="margin-top:-6px">Shown in the outlet list when posting an offer. Renaming here does not change offers already posted.</p>
        <div class="stack" id="outlet-rows" style="gap:8px">${(state.adminOutlets || []).map((o, i) => outletRow(o, i)).join('')}</div>
        <button class="btn btn-sm btn-ghost" style="border:1px dashed var(--gold);color:var(--gold-text);width:100%" type="button" data-act="addOutlet">${sv('<path d="M12 5v14M5 12h14"/>', 18)} Add outlet</button>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn btn-sm" style="width:100%" type="submit">Save outlets</button>
      </form>
      <div class="card">
        <span class="section-title" style="margin:0">Outlet logos</span>
        <p class="hint" style="margin-top:-6px">Printed in place of the outlet name on offers shared with guests. Upload a black logo as SVG or PNG with a transparent background; it keeps the transparency.</p>
        <div class="set-group" style="background:none">${(state.adminOutlets || []).map((o) => {
          const u = safeUrl((state.settings.outletLogos || {})[o]);
          return `<div class="ol-row"><span class="ol-name">${esc(o)}</span>
            <span class="ol-prev">${u ? `<img src="${esc(u)}" alt="">` : '<span class="small muted">No logo</span>'}</span>
            <label class="btn btn-sm btn-outline ol-up">${u ? 'Change' : 'Upload'}<input type="file" accept="image/svg+xml,.svg,image/png,image/webp" data-change="outletLogo" data-outlet="${esc(o)}"></label>
            ${u ? `<button type="button" class="blk-btn danger" data-act="removeOutletLogo" data-outlet="${esc(o)}" aria-label="Remove logo">${I.trash}</button>` : ''}</div>`;
        }).join('') || '<p class="small muted">Add outlets above first.</p>'}</div>
      </div>
`;
    if (sec === 'departments') return head + `
      <form class="card" data-form="departments" novalidate>
        <span class="section-title" style="margin:0">Departments</span>
        <p class="hint" style="margin-top:-6px">The choices colleagues see when they create an account. Renaming here does not change people already registered.</p>
        <div class="stack" id="dept-rows" style="gap:8px">${(state.adminDepts || []).map((o, i) => outletRow(o, i, 'dept')).join('')}</div>
        <button class="btn btn-sm btn-ghost" style="border:1px dashed var(--gold);color:var(--gold-text);width:100%" type="button" data-act="addDept">${sv('<path d="M12 5v14M5 12h14"/>', 18)} Add department</button>
        <div class="error-box" id="form-error" hidden></div>
        <button class="btn btn-sm" style="width:100%" type="submit">Save departments</button>
      </form>
`;
    if (sec === 'categories') return head + `
      <div class="row" style="justify-content:space-between;margin-top:4px">
        <span class="section-title" style="margin:0">Post categories</span>
        <button class="btn btn-sm" type="button" data-act="editCat" data-id="">${sv('<path d="M12 5v14M5 12h14"/>', 18)} Add</button>
      </div>
      <p class="hint" style="margin-top:-8px">Categories appear as filters in the feed and as choices when posting.</p>
      <div class="list">${state.adminCats.map((c) => `
        <button type="button" class="pcard" data-act="editCat" data-id="${esc(c.id)}" style="${c.active ? '' : 'opacity:.6'}">
          <div class="head">${catTag(c)}<span class="small muted">${c.active ? 'Active' : 'Hidden'}</span></div>
          <span class="m">${esc(TYPE_INFO[c.type].name)}${c.subcategories && c.subcategories.length ? ` (award: ${esc(c.subcategories.join(', '))})` : ''} · ${esc(GROUPS[c.group] || 'Home only')} · Posted by ${esc(['Admin'].concat(c.roles || []).join(', '))}${c.ack ? ' · Needs acknowledgement' : ''}</span>
        </button>`).join('')}</div>
`;
    if (sec === 'reset') return resetCard();
    return '';
  }

  /** Admin: permanently clear the content they choose (e.g. after testing). */
  function resetCard() {
    return `<form class="card reset-card" data-form="reset" novalidate>
      <span class="section-title" style="margin:0;color:var(--notice)">Reset content</span>
      <p class="hint" style="margin-top:-6px">Permanently deletes what you tick, from the app and the Google Sheet. Uploaded files stay in the Drive folder. Categories, outlets, departments, the logo, fonts and theme are not touched.</p>
      <span class="label">Posts</span>
      <div class="reset-grid">${(state.adminCats || []).map((c) => `<label class="check-row"><input type="checkbox" name="cat" value="${esc(c.id)}"> ${esc(c.label)}</label>`).join('')}</div>
      <span class="label">Other content</span>
      <label class="check-row"><input type="checkbox" name="popups"> Pop-ups</label>
      <label class="check-row"><input type="checkbox" name="collections"> Special collections</label>
      <label class="check-row"><input type="checkbox" name="birthdays"> Birthday list</label>
      <label class="check-row"><input type="checkbox" name="staff"> Team accounts (everyone except Admins)</label>
      <div class="field"><label for="rs-c">Type RESET to confirm</label><input class="input" id="rs-c" name="confirm" autocomplete="off" autocapitalize="characters" placeholder="RESET"></div>
      <div class="error-box" id="form-error" hidden></div>
      <button class="btn btn-sm btn-danger" type="submit" style="width:100%">${I.trash} Delete selected content</button>
    </form>`;
  }

  function themeCard() {
    const saved = state.adminTheme || { preset: 'default' };
    const preset = state.themeDraft || saved.preset || 'default';
    const base = THEMES[preset];
    const same = preset === saved.preset;
    const v = (k) => (same && saved[k]) || base[k];
    const live = saved.live;
    return `<form class="card" data-form="theme" novalidate>
      <div class="row" style="justify-content:space-between"><span class="section-title" style="margin:0">App theme</span>
        ${saved.preset && saved.preset !== 'default' ? `<span class="tag ${live ? 'tag-ok' : 'tag-muted'}">${live ? 'Showing now' : 'Scheduled'}: ${esc(THEMES[saved.preset].name)}</span>` : ''}</div>
      <p class="hint" style="margin-top:-6px">Changes the app’s colours for a season, with an optional greeting and animation on Home and Today’s Special. Everyone sees it within 5 minutes.</p>
      <div class="chips wrap" role="group" aria-label="Season">${Object.keys(THEMES).map((k) => `
        <button type="button" class="chip theme-chip" data-act="themePreset" data-v="${k}" aria-pressed="${preset === k}"><i style="background:${THEMES[k].primary};box-shadow:inset -8px 0 0 ${THEMES[k].accent}"></i>${esc(THEMES[k].name)}</button>`).join('')}</div>
      <input type="hidden" name="preset" value="${esc(preset)}">
      ${preset === 'default' ? '<p class="small muted">The classic navy and gold look.</p>' : `
      <div class="theme-prev" style="--p:${esc(v('primary'))};--a:${esc(v('accent'))};--b:${esc(v('background'))}">
        <span class="tp-bar"></span><span class="tp-title">Today’s Special</span><span class="tp-chip">${esc(v('greeting') || base.name)}</span><span class="tp-btn">Button</span>
      </div>
      <div class="grid-3">
        <label class="field"><span class="label">Main</span><input type="color" class="color-in" name="primary" value="${esc(v('primary'))}" data-change="themePrev"></label>
        <label class="field"><span class="label">Accent</span><input type="color" class="color-in" name="accent" value="${esc(v('accent'))}" data-change="themePrev"></label>
        <label class="field"><span class="label">Background</span><input type="color" class="color-in" name="background" value="${esc(v('background'))}" data-change="themePrev"></label>
      </div>
      <div class="field"><label for="th-g">Greeting (optional)</label><input class="input" id="th-g" name="greeting" maxlength="60" value="${esc(same ? (saved.greeting || '') : base.greeting)}" placeholder="e.g. Ramadan Kareem"></div>
      <div class="field"><span class="label">Animation</span>${animPicker('animation', same ? (saved.animation || base.animation) : base.animation)}</div>
      <div class="grid-2">
        <div class="field"><label for="th-s">From</label><input class="input" id="th-s" name="start" type="date" value="${esc(same ? saved.start || '' : '')}"></div>
        <div class="field"><label for="th-e">Until</label><input class="input" id="th-e" name="end" type="date" value="${esc(same ? saved.end || '' : '')}"></div>
      </div>
      <p class="hint">Leave the dates empty to start now and keep it until you change it. After “Until”, the app goes back to the classic look by itself.</p>`}
      <div class="error-box" id="form-error" hidden></div>
      <button class="btn btn-sm" type="submit" style="width:100%">${preset === 'default' ? 'Use classic look' : 'Save theme'}</button>
    </form>`;
  }

  function outletRow(name, i, kind) {
    const k = kind || 'outlet';
    const noun = k === 'dept' ? 'Department' : 'Outlet';
    return `<div class="row" style="gap:8px">
      <label class="sr-only" for="${k}-${i}">${noun} ${i + 1}</label>
      <input class="input" id="${k}-${i}" name="${k}" maxlength="60" value="${esc(name)}" placeholder="${noun} name" style="min-height:46px">
      <button class="icon-btn" type="button" data-act="removeOutlet" aria-label="Remove ${esc(name || noun.toLowerCase())}" style="background:var(--notice-bg);color:var(--notice)">${sv('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</button>
    </div>`;
  }

  /** Admin: the logo on the sign-in screen and the app header. */
  function logoCard() {
    const logo = safeUrl(state.settings.logo);
    const tone = state.settings.logoTone === 'light' ? 'light' : 'dark';
    return `<div class="card">
      <span class="section-title" style="margin:0">Logo</span>
      <div class="grid-2">
        <div class="logo-preview">${logo ? logoImg('', true) : 'No logo yet'}</div>
        <div class="logo-preview light">${logo ? logoImg('', false) : 'On light backgrounds'}</div>
      </div>
      <p class="hint">Shown on the sign-in screen (on the navy panel or over the sign-in image) and in the app header on computers. Set below whether the file is a colour or a white logo, so it shows well on dark and light backgrounds. A PNG with a transparent background works best.</p>
      ${logo ? `<div class="field"><span class="label" id="lt-l">The logo file is</span>
        <div class="seg" role="group" aria-labelledby="lt-l">
          <button type="button" data-act="logoTone" data-v="dark" aria-pressed="${tone === 'dark'}">Colour or black</button>
          <button type="button" data-act="logoTone" data-v="light" aria-pressed="${tone === 'light'}">White</button>
        </div></div>` : ''}
      <div class="grid-2">
        <label class="btn btn-sm" style="position:relative;overflow:hidden">
          <span id="logo-label">${logo ? 'Change logo' : 'Upload logo'}</span>
          <input type="file" accept="image/png,image/webp,image/jpeg" data-change="logo" style="position:absolute;inset:0;opacity:0;cursor:pointer">
        </label>
        ${logo ? `<button class="btn btn-sm btn-danger" type="button" data-act="removeLogo">Remove</button>` : ''}
      </div>
    </div>`;
  }

  /** Admin: each hotel's profile, printed at the bottom of offers and newsletters shared with guests. */
  function hotelsForm() {
    const H = state.settings.hotels || {};
    const card = (k, label) => {
      const h = H[k] || {};
      return `<div class="card" data-hotel="${k}">
        <span class="section-title" style="margin:0">${esc(label)}</span>
        ${imageField('hlogo-' + k, safeUrl(h.logo), { id: 'hl-' + k, label: 'Logo at the bottom of shared offers and newsletters', noun: 'logo', style: 'min-height:96px' })}
        <div class="field"><label for="h-n-${k}">Hotel name</label><input class="input" id="h-n-${k}" name="name-${k}" maxlength="120" value="${esc(h.name || '')}"></div>
        <div class="field"><label for="h-a-${k}">Address</label><textarea class="textarea" id="h-a-${k}" name="address-${k}" maxlength="300" style="min-height:76px" placeholder="e.g. Marasi Drive, Business Bay, Dubai, UAE">${esc(h.address || '')}</textarea></div>
        <div class="grid-2">
          <div class="field"><label for="h-p-${k}">Phone</label><input class="input" id="h-p-${k}" name="phone-${k}" inputmode="tel" maxlength="40" value="${esc(h.phone || '')}" placeholder="+971 4 …"></div>
          <div class="field"><label for="h-e-${k}">Email</label><input class="input" id="h-e-${k}" name="email-${k}" inputmode="email" maxlength="120" value="${esc(h.email || '')}"></div>
        </div>
        <div class="field"><label for="h-w-${k}">Website</label><input class="input" id="h-w-${k}" name="website-${k}" inputmode="url" maxlength="160" value="${esc(h.website || '')}" placeholder="https://"></div>
      </div>`;
    };
    return `<form class="stack" data-form="hotels" novalidate style="gap:16px">
      <p class="hint" style="margin:0">Shown at the bottom of every offer and newsletter shared with guests, for the hotel the post is for. “Cluster” is used for posts for both hotels, so you can use a combined logo there.</p>
      ${card('DXBAI', 'DXBAI · Embassy Suites')}
      ${card('DXBPI', 'DXBPI · Hilton Garden Inn')}
      ${card('Cluster', 'Cluster · both hotels')}
      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions"><button class="btn" type="submit">Save hotels</button></div>
    </form>`;
  }

  /** Admin: a separate logo printed at the top of training attendance sheets (PDF). */
  function reportLogoCard() {
    const url = safeUrl(state.settings.reportLogo);
    return `<div class="card">
      <span class="section-title" style="margin:0">Logo for attendance sheets</span>
      <div class="logo-preview light">${url ? `<img src="${esc(url)}" alt="Attendance sheet logo">` : 'No logo yet: the sheet shows the main logo'}</div>
      <p class="hint">Printed at the top of the training attendance sheet (PDF), on white paper. Use the hotel logo in colour or black, for example both hotel logos side by side. A PNG with a transparent background works best.</p>
      <div class="grid-2">
        <label class="btn btn-sm" style="position:relative;overflow:hidden">
          <span id="rlogo-label">${url ? 'Change logo' : 'Upload logo'}</span>
          <input type="file" accept="image/png,image/webp,image/jpeg" data-change="reportLogo" style="position:absolute;inset:0;opacity:0;cursor:pointer">
        </label>
        ${url ? `<button class="btn btn-sm btn-danger" type="button" data-act="removeReportLogo">Remove</button>` : ''}
      </div>
    </div>`;
  }

  /** Admin: upload fonts in place of the built-in Hilton Serif and Hilton Sans. */
  function fontsCard() {
    const fonts = state.settings.fonts || {};
    return `<div class="card">
      <span class="section-title" style="margin:0">Fonts</span>
      <p class="hint" style="margin-top:-6px">Upload fonts to use in place of the built-in Hilton Serif (headlines) and Hilton Sans (body text). WOFF2, WOFF, TTF or OTF, up to 2 MB each. Everyone’s app switches to them within 5 minutes. Remove a font to go back to the built-in one.</p>
      ${Object.keys(FONT_SLOTS).map((slot) => {
        const s = FONT_SLOTS[slot];
        const f = fonts[slot];
        const heading = s.family === 'AppHeading';
        const bold = s.weight !== '400';
        return `<div class="font-row">
          <div class="fr-head"><b>${esc(s.label)}</b><span class="fr-file">${f ? esc(f.name) : 'Built-in · ' + esc(s.hint)}</span></div>
          <div class="font-sample" style="font-family:${heading ? 'var(--serif)' : 'var(--sans)'};font-weight:${bold ? 700 : 400};${heading ? 'text-transform:uppercase;letter-spacing:.12em;font-size:19px' : 'font-size:17px'}">${heading ? esc(APP_NAME) : 'Our guests are at the heart of everything we do.'}</div>
          <div class="row">
            <label class="btn btn-sm btn-outline upload-btn"><span id="font-label-${slot}">${f ? 'Replace' : 'Upload'}</span>
              <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" data-change="fontUpload" data-slot="${slot}"></label>
            ${f ? `<button class="btn btn-sm btn-danger" type="button" data-act="removeFont" data-slot="${slot}">Remove</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function subRow(name, i) {
    return `<div class="row" style="gap:8px">
      <label class="sr-only" for="sub-${i}">Award title ${i + 1}</label>
      <input class="input" id="sub-${i}" name="sub" maxlength="40" value="${esc(name)}" placeholder="e.g. Heart of the House" style="min-height:46px">
      <button class="icon-btn" type="button" data-act="removeOutlet" aria-label="Remove ${esc(name || 'title')}" style="background:var(--notice-bg);color:var(--notice)">${sv('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</button>
    </div>`;
  }

  VIEWS.category = ({ id }) => {
    if (state.adminCats === null) { setTimeout(loadAdminSettings, 0); return '<div class="screen"><div class="page"><div class="spinner"></div></div></div>'; }
    const c = id ? state.adminCats.find((x) => x.id === id) : { label: '', type: 'update', roles: [], ack: true, active: true, color: 'blue', group: 'general' };
    if (!c) return '<div class="screen"><div class="page"><p>Category not found.</p></div></div>';
    return `
    <div class="screen"><form class="page" data-form="category" data-id="${esc(id || '')}" novalidate>
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>${id ? 'Edit category' : 'New category'}</h1>
        <span style="width:52px"></span>
      </div>
      <div class="card">
        <div class="field"><label for="k-label">Name</label><input class="input" id="k-label" name="label" maxlength="40" required value="${esc(c.label)}" placeholder="e.g. Training"></div>
        <div class="field"><span class="label" id="k-type-l">Type</span>
          <div class="chips wrap" role="group" aria-labelledby="k-type-l">${Object.keys(TYPE_INFO).map((t) => `
            <button type="button" class="chip" data-act="formSeg" data-name="type" data-v="${t}" aria-pressed="${c.type === t}">${TYPE_INFO[t].name}</button>`).join('')}</div>
          <input type="hidden" name="type" value="${esc(c.type)}">
          <p class="hint">Update: title and message. Offer: price, timing, inclusions. Newsletter: monthly card. People: a colleague with photo (awards, new joiners, promotions). Training: Learning &amp; Development calendar with date, time, venue and presenter.</p>
        </div>
        <div class="field" id="sub-field" ${c.type === 'people' ? '' : 'hidden'}>
          <span class="label">Award titles (sub-categories)</span>
          <p class="hint" style="margin-top:-2px">Add titles to make this an award, e.g. Front of the House, Heart of the House. HR picks one when posting and it shows as the ribbon on the photo. Leave empty for New Joiners or Promotions (no ribbon).</p>
          <div class="stack" id="sub-rows" style="gap:8px">${(c.subcategories || []).map((x, i) => subRow(x, i)).join('')}</div>
          <button class="btn btn-sm btn-ghost" style="border:1px dashed var(--gold);color:var(--gold-text)" type="button" data-act="addSub">${sv('<path d="M12 5v14M5 12h14"/>', 18)} Add award title</button>
        </div>
        <div class="field"><span class="label" id="k-grp-l">Shows in</span>
          <div class="seg" role="group" aria-labelledby="k-grp-l">${Object.keys(GROUPS).map((g) => `
            <button type="button" data-act="formSeg" data-name="group" data-v="${g}" aria-pressed="${(c.group || 'general') === g}">${GROUPS[g]}</button>`).join('')}</div>
          <input type="hidden" name="group" value="${esc(c.group || 'general')}">
          <p class="hint">Every category also appears on Home as its own section.</p>
        </div>
        <div class="field"><span class="label">Section colour</span>${colorPicker('color', c.color)}</div>
      </div>
      <div class="card" style="gap:4px">
        <span class="label">Who can post</span>
        <label class="check-row"><input type="checkbox" checked disabled> Admin (always)</label>
        <label class="check-row"><input type="checkbox" name="role_HR" ${(c.roles || []).indexOf('HR') >= 0 ? 'checked' : ''}> HR</label>
        <label class="check-row"><input type="checkbox" name="role_Marketing" ${(c.roles || []).indexOf('Marketing') >= 0 ? 'checked' : ''}> Marketing</label>
      </div>
      <div class="card" style="gap:0;padding:4px 16px">
        <label class="switch-row"><span><b style="font-size:14px">Needs acknowledgement</b><br><span class="small muted">Staff tap “Got it” and you see who read it</span></span>
          <span class="switch"><input type="checkbox" role="switch" name="ack" ${c.ack ? 'checked' : ''}><span></span></span></label>
        <label class="switch-row"><span><b style="font-size:14px">Show in the app</b><br><span class="small muted">Turn off to hide the category and its posts</span></span>
          <span class="switch"><input type="checkbox" role="switch" name="active" ${c.active ? 'checked' : ''}><span></span></span></label>
      </div>
      <div class="error-box" id="form-error" hidden></div>
      <div class="sticky-actions"><button class="btn" type="submit">${id ? 'Save category' : 'Add category'}</button></div>
    </form></div>`;
  };

  VIEWS.adminTeam = () => {
    if (state.staff === null) {
      setTimeout(loadStaff, 0);
      return adminShell('<div class="spinner"></div>', 'team');
    }
    const tab = state.adminTab;
    const q = state.staffQuery;
    const pending = state.staff.filter((s) => s.status === 'Pending' && personMatches(q, s)).sort((a, b) => a.signedUp - b.signedUp);
    const searchBox = `<div class="search">${I.search}<label class="sr-only" for="sq">Search staff</label><input class="input" id="sq" type="search" placeholder="First name, last name or Employee ID" value="${esc(state.staffQuery)}" data-input="staffSearch"></div>`;
    const all = state.staff.filter((s) => s.status !== 'Pending')
      .filter((s) => personMatches(q, s))
      .sort((a, b) => a.name.localeCompare(b.name));
    const roleSelect = (s) => `<select class="select" aria-label="Role for ${esc(s.name)}" data-role-for="${esc(s.employeeId)}">${['Viewer', 'HR', 'Marketing', 'Admin'].map((r) => `<option ${s.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
    if (!isAdmin()) {
      return adminShell(`
        <p class="muted small">New colleagues who asked for access. Approving gives them Viewer access; your Admin manages roles.</p>
        ${searchBox}
        ${!pending.length ? `<div class="empty">${I.check}<b>No pending requests</b><span class="small">New sign-ups will appear here, and you’ll get a notification.</span></div>` : ''}
        <div class="list">${pending.map((s) => `
          <div class="person">
            <div class="who">${avatarHtml(s)}
              <div><div class="n">${esc(s.name)}</div><div class="d">ID ${esc(s.employeeId)} · ${esc(s.department)} · ${esc(s.property)}</div></div></div>
            <div class="grid-2">
              <button class="btn btn-sm btn-danger" type="button" data-act="setStatus" data-id="${esc(s.employeeId)}" data-v="Declined">Decline</button>
              <button class="btn btn-sm" type="button" data-act="approve" data-id="${esc(s.employeeId)}">Approve</button>
            </div>
          </div>`).join('')}</div>`, 'team');
    }
    return adminShell(`
      <div class="seg" role="group" aria-label="Staff list">
        <button type="button" data-act="adminTab" data-v="pending" aria-pressed="${tab === 'pending'}">Pending (${pending.length})</button>
        <button type="button" data-act="adminTab" data-v="all" aria-pressed="${tab === 'all'}">All staff (${state.staff.filter((s) => s.status !== 'Pending').length})</button>
      </div>
      ${searchBox}
      ${tab === 'pending' ? `
        ${!pending.length ? `<div class="empty">${I.check}<b>No pending requests</b><span class="small">New sign-ups will appear here.</span></div>` : ''}
        <div class="list">${pending.map((s) => `
          <div class="person">
            <div class="who">${avatarHtml(s)}
              <div><div class="n">${esc(s.name)}</div><div class="d">ID ${esc(s.employeeId)} · ${esc(s.department)} · ${esc(s.property)}</div></div></div>
            <div class="field"><label class="label">Role on approval</label>${roleSelect(s)}</div>
            <div class="grid-2">
              <button class="btn btn-sm btn-danger" type="button" data-act="setStatus" data-id="${esc(s.employeeId)}" data-v="Declined">Decline</button>
              <button class="btn btn-sm" type="button" data-act="approve" data-id="${esc(s.employeeId)}">Approve</button>
            </div>
          </div>`).join('')}</div>` : `
        <div class="list" id="staff-list">${all.map((s) => {
          const self = s.employeeId === (state.user || {}).employeeId;
          const st = s.status === 'Approved' ? 'tag-ok' : 'tag-muted';
          return `<details class="person">
            <summary class="who" style="cursor:pointer;list-style:none">${avatarHtml(s)}
              <div class="spacer"><div class="n">${esc(s.name)}</div><div class="d">${esc(s.role)} · ${esc(s.department)} · ${esc(s.property)}${s.lastDay && s.status === 'Approved' ? ' · <b style="color:var(--notice)">leaving ' + esc(fmtDate(s.lastDay)) + '</b>' : ''}</div></div>
              <span class="tag ${st}">${esc(s.status)}</span></summary>
            ${self ? '<p class="small muted">This is you.</p>' : `
            <div class="field"><label class="label">Role</label>${roleSelect(s)}</div>
            <div class="grid-2">
              <button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="saveRole" data-id="${esc(s.employeeId)}">Save role</button>
              <button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="resetPin" data-id="${esc(s.employeeId)}">Reset PIN</button>
            </div>
            <div class="device-box">
              <span class="small"><b>Signed in on:</b> ${s.devices && s.devices.length ? s.devices.map((d) => esc((d.device || 'a device') + (d.at ? ' · since ' + dmy(new Date(d.at)) : ''))).join(', ') : 'no device'}</span>
              ${s.devices && s.devices.length ? `<button class="btn btn-sm btn-ghost" style="border:1px solid var(--field-line)" type="button" data-act="signOutEverywhere" data-id="${esc(s.employeeId)}">Sign out of all devices</button>` : ''}
            </div>
            ${s.status === 'Approved'
              ? `<button class="btn btn-sm btn-danger" style="width:100%" type="button" data-act="setStatus" data-id="${esc(s.employeeId)}" data-v="Blocked">Remove access</button>`
              : `<button class="btn btn-sm" style="width:100%" type="button" data-act="setStatus" data-id="${esc(s.employeeId)}" data-v="Approved">Give access</button>`}`}
          </details>`;
        }).join('') || '<p class="small muted center">No staff found.</p>'}</div>`}`, 'team');
  };


  /* ---------------- Body sections: text, images and selected posts ---------------- */
  /*
   * Offers, newsletters and special collections can have a body made of sections, in any order:
   * a text section (heading + text), an image (full width, its own height), a row of selected posts,
   * and, in a collection, "Posts in this collection". Built and reordered in the post form.
   */
  const Blocks = {
    uid: 0,
    KIND: { text: 'Text section', image: 'Image', posts: 'Selected posts', divider: 'Divider', auto: 'Posts in this collection' },
    pickList(sel, exclude) {
      const groups = cats().filter((c) => c.active !== false && c.type !== 'monthly')
        .map((c) => [c, state.posts.filter((x) => x.category === c.id && x.id !== exclude)]).filter((g) => g[1].length);
      return groups.map(([c, ps]) => `<details class="inc-group" ${ps.some((x) => sel.has(x.id)) ? 'open' : ''}>
        <summary>${catTag(c)}<span class="small muted">${ps.length}</span></summary>
        ${ps.map((x) => `<label class="check-row"><input type="checkbox" data-k="id" value="${esc(x.id)}" ${sel.has(x.id) ? 'checked' : ''}><span>${esc(x.title)}${x.outlet ? ` <span class="small muted">· ${esc(x.outlet)}</span>` : ''}</span></label>`).join('')}
      </details>`).join('') || '<p class="small muted">No live posts to choose yet.</p>';
    },
    item(b, exclude) {
      const n = ++this.uid;
      const body = b.type === 'text' ? `
          <input class="input" data-k="heading" maxlength="120" placeholder="Heading (optional)" value="${esc(b.heading || '')}">
          <textarea class="textarea" data-k="text" maxlength="4000" placeholder="Write this section…">${esc(b.text || '')}</textarea>
          <label class="switch-row" style="border:0;padding:0;min-height:0"><span class="small"><b>White box</b> · turn off for text on the page background</span>
            <span class="switch"><input type="checkbox" role="switch" data-k="box" ${b.plain ? '' : 'checked'}><span></span></span></label>
          <label class="switch-row" style="border:0;padding:0;min-height:0"><span class="small"><b>Highlight this section</b> · a tinted band, edge to edge, for this section and what follows it</span>
            <span class="switch"><input type="checkbox" role="switch" data-k="hl" ${b.highlight ? 'checked' : ''}><span></span></span></label>`
        : b.type === 'image' ? imageField('blkimg' + n, safeUrl(b.url), { id: 'bi' + n, noun: 'image', style: 'min-height:120px' })
        : b.type === 'posts' ? `
          <input class="input" data-k="title" maxlength="80" placeholder="Section title, e.g. This month’s offers" value="${esc(b.title || '')}">
          <div class="blk-pick">${this.pickList(new Set(b.ids || []), exclude)}</div>`
        : b.type === 'divider' ? '<p class="small muted" style="margin:0">A line that separates the section above from the one below.</p>'
        : '<p class="small muted" style="margin:0">All posts added to this collection, grouped by category. Move it to choose where they appear.</p>';
      return `<div class="blk" data-type="${esc(b.type)}">
        <div class="blk-bar"><span class="blk-kind">${esc(this.KIND[b.type] || '')}</span>
          <button type="button" class="blk-btn" data-act="blkMove" data-v="-1" aria-label="Move up">${sv('<path d="M12 19V5M5 12l7-7 7 7"/>', 18)}</button>
          <button type="button" class="blk-btn" data-act="blkMove" data-v="1" aria-label="Move down">${sv('<path d="M12 5v14M5 12l7 7 7-7"/>', 18)}</button>
          ${b.type === 'auto' ? '' : `<button type="button" class="blk-btn danger" data-act="blkDel" aria-label="Remove section">${I.trash}</button>`}
        </div>
        <div class="blk-body">${body}</div>
      </div>`;
    },
    /** opts: { posts: allow selected posts, auto: collection posts, exclude: this post's id, hint } */
    editor(blocks, opts) {
      opts = opts || {};
      return `<div class="card blk-editor" data-exclude="${esc(opts.exclude || '')}">
        <span class="label">${esc(opts.title || 'Sections')}</span>
        <p class="hint" style="margin-top:-8px">${esc(opts.hint || 'Add text, images' + (opts.posts ? ' and posts' : '') + ' in the order you want them to appear. Use the arrows to move a section.')}</p>
        <div class="blk-list">${(blocks || []).map((b) => this.item(b, opts.exclude)).join('')}</div>
        <div class="blk-add">
          <button type="button" class="btn btn-sm btn-ghost" data-act="blkAdd" data-v="text">${sv('<path d="M4 6h16M4 12h16M4 18h10"/>', 16)} Text</button>
          <button type="button" class="btn btn-sm btn-ghost" data-act="blkAdd" data-v="image">${I.image} Image</button>
          ${opts.posts ? `<button type="button" class="btn btn-sm btn-ghost" data-act="blkAdd" data-v="posts">${I.tag} Posts</button>` : ''}
          <button type="button" class="btn btn-sm btn-ghost" data-act="blkAdd" data-v="divider">${sv('<path d="M4 12h16"/>', 16)} Divider</button>
        </div>
      </div>`;
    },
    read(form) {
      return [...form.querySelectorAll('.blk-list > .blk')].map((el) => {
        const t = el.dataset.type;
        if (t === 'text') { const o = { type: t, heading: el.querySelector('[data-k=heading]').value.trim(), text: el.querySelector('[data-k=text]').value.trim() };
          if (!el.querySelector('[data-k=box]').checked) o.plain = true;
          if (el.querySelector('[data-k=hl]').checked) o.highlight = true;
          return o; }
        if (t === 'image') return { type: t, url: (el.querySelector('input[type=hidden]') || {}).value || '' };
        if (t === 'posts') return { type: t, title: el.querySelector('[data-k=title]').value.trim(), ids: [...el.querySelectorAll('[data-k=id]:checked')].map((i) => i.value) };
        return { type: t };
      }).filter((b) => (b.type === 'text' && (b.heading || b.text)) || (b.type === 'image' && b.url) || (b.type === 'posts' && b.ids.length) || b.type === 'auto' || b.type === 'divider');
    },
    one(b, opts) {
      if (b.type === 'text') return `<section class="${b.plain ? 'blk-text plain' : 'card blk-text'}">${b.heading ? `<h3>${esc(b.heading)}</h3>` : ''}${b.text ? `<div class="blk-prose">${esc(b.text)}</div>` : ''}</section>`;
      if (b.type === 'image' && safeUrl(b.url)) return `<img class="blk-img" src="${esc(b.url)}" alt="" loading="lazy">`;
      if (b.type === 'posts') {
        const ps = b.ids.map((id) => state.posts.find((x) => x.id === id)).filter(Boolean);
        if (!ps.length) return '';
        return `<section class="sec blk-posts">${b.title ? `<div class="sec-h"><h2>${esc(b.title)}</h2></div>` : ''}<div class="hrow">${ps.map(hcard).join('')}</div></section>`;
      }
      if (b.type === 'auto') return opts.auto || '';
      return '';
    },
    /**
     * In the app. Related blocks are grouped into one softly tinted section: a group starts at each
     * text section with a heading, and a Divider block separates groups. opts: { auto: collection posts }
     */
    render(blocks, opts) {
      opts = opts || {};
      const groups = [];
      let cur = null;
      (blocks || []).forEach((b) => {
        if (b.type === 'divider') { groups.push({ divider: true }); cur = null; return; }
        if (!cur || (b.type === 'text' && b.heading)) { cur = { items: [] }; groups.push(cur); }
        cur.items.push(b);
      });
      return groups.map((g) => {
        if (g.divider) return '<div class="blk-divider" aria-hidden="true"><span></span></div>';
        if (!g.items || !g.items.length) return '';
        const inner = g.items.map((b) => this.one(b, opts)).join('');
        if (!inner.trim()) return '';
        const hl = g.items[0].type === 'text' && g.items[0].highlight;
        return hl ? `<div class="blk-band">${inner}</div>` : inner;
      }).join('');
    }
  };
  /** A newsletter's sections: its own, or (older newsletters) the posts ticked under "Include". */
  function newsletterBlocks(p) {
    if (p.blocks && p.blocks.length) return p.blocks;
    return p.includes && p.includes.length ? [{ type: 'posts', title: '', ids: p.includes }] : [];
  }

  /* ---------------- Guest share: image and PDF ---------------- */
  const HOTEL_NAMES = {
    DXBAI: ['Embassy Suites by Hilton Dubai Business Bay'],
    DXBPI: ['Hilton Garden Inn Dubai Business Bay'],
    Cluster: ['Embassy Suites by Hilton Dubai Business Bay', 'Hilton Garden Inn Dubai Business Bay']
  };
  /** Pictures a shared offer or newsletter needs: the cover, section images, post thumbnails, the hotel logo. */
  async function shareAssets(p, isNl) {
    const a = { hero: null, imgs: {}, logo: null };
    const urls = new Set();
    const blocks = isNl ? newsletterBlocks(p) : (p.blocks || []);
    blocks.forEach((b) => {
      if (b.type === 'image') urls.add(b.url);
      if (b.type === 'posts') b.ids.forEach((id) => { const x = state.posts.find((q) => q.id === id); if (x && safeUrl(x.image)) urls.add(x.image); });
    });
    const h = hotelFor(p);
    const jobs = [loadShareImage(p.image).then((i) => { a.hero = i; })];
    const ol = !isNl && p.outlet ? (state.settings.outletLogos || {})[p.outlet] : '';
    if (safeUrl(ol)) jobs.push(loadShareImage(ol).then((i) => { a.outletLogo = i; }));
    if (h && safeUrl(h.logo)) jobs.push(loadShareImage(h.logo).then((i) => { a.logo = i; }));
    urls.forEach((u) => jobs.push(loadShareImage(u).then((i) => { a.imgs[u] = i; })));
    await Promise.all(jobs.map((j) => j.catch(() => {})));
    return a;
  }
  function hotelFor(p) {
    const k = postProp(p.property);
    const h = (state.settings.hotels || {})[k] || {};
    return Object.assign({ name: (HOTEL_NAMES[k] || []).join(' & ') }, h);
  }

  const SH = { serif: '"AppHeading", "Hilton Serif", Georgia, serif', sans: '"AppBody", "Hilton Sans", system-ui, sans-serif',
    navy: '#13294B', gold: '#B48A4E', goldText: '#7E5F2E', muted: '#5A6273', cream: '#F4EFE7', line: '#E3DBCD' };

  /** Text, image and post sections on the shared picture. Returns the new y. */
  /** Draws one list of section blocks straight down. */
  function drawBlockItems(ctx, blocks, a, y, draw, PAD, INNER) {
    const { serif, sans, navy, goldText, muted } = SH;
    blocks.forEach((b) => {
      if (b.type === 'text') {
        // In a white box, or (plain) straight on the page background.
        const ip = b.plain ? 0 : 44;
        ctx.font = `34px ${sans}`;
        const lines = b.text ? wrapLines(ctx, b.text, INNER - ip * 2) : [];
        ctx.font = `52px ${serif}`;
        const hl = b.heading ? wrapLines(ctx, b.heading, INNER - ip * 2) : [];
        const h = ip * 2 + hl.length * 64 + (hl.length && lines.length ? 16 : 0) + lines.length * 50 - (lines.length ? 0 : 10);
        if (draw) {
          if (!b.plain) { roundRect(ctx, PAD, y, INNER, h, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill(); }
          let ly = y + ip;
          ctx.fillStyle = navy; ctx.font = `52px ${serif}`;
          hl.forEach((ln) => { ctx.fillText(ln, PAD + ip, ly + 48); ly += 64; });
          if (hl.length && lines.length) ly += 16;
          ctx.font = `34px ${sans}`;
          lines.forEach((ln) => { ctx.fillText(ln, PAD + ip, ly + 36); ly += 50; });
        }
        y += h + 32;
      } else if (b.type === 'image') {
        const img = a.imgs[b.url];
        if (!img) return;
        const h = Math.min(2400, Math.round(INNER * img.naturalHeight / img.naturalWidth));
        if (draw) {
          ctx.save(); roundRect(ctx, PAD, y, INNER, h, 28); ctx.clip();
          const s = Math.max(INNER / img.naturalWidth, h / img.naturalHeight);
          ctx.drawImage(img, PAD + (INNER - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
          ctx.restore();
        }
        y += h + 32;
      } else if (b.type === 'divider') {
        if (draw) { ctx.strokeStyle = SH.gold; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); const mx = PAD + INNER / 2; ctx.moveTo(mx - 60, y + 18); ctx.lineTo(mx + 60, y + 18); ctx.stroke(); ctx.globalAlpha = 1; }
        y += 44;
      } else if (b.type === 'posts') {
        const ps = b.ids.map((id) => state.posts.find((x) => x.id === id)).filter(Boolean);
        if (!ps.length) return;
        if (b.title) {
          ctx.font = `56px ${serif}`;
          wrapLines(ctx, b.title, INNER).forEach((ln) => { if (draw) { ctx.fillStyle = navy; ctx.fillText(ln, PAD, y + 52); } y += 68; });
          y += 16;
        }
        ps.forEach((x) => {
          const CH = 260, TH = 212, tx = PAD + 24 + TH + 36, tw = INNER - (tx - PAD) - 28;
          if (draw) {
            roundRect(ctx, PAD, y, INNER, CH, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill();
            const img = a.imgs[x.image];
            ctx.save(); roundRect(ctx, PAD + 24, y + 24, TH, TH, 20); ctx.clip();
            if (img) {
              const s = Math.max(TH / img.naturalWidth, TH / img.naturalHeight);
              ctx.drawImage(img, PAD + 24 + (TH - img.naturalWidth * s) / 2, y + 24 + (TH - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
            } else { ctx.fillStyle = '#1F3A63'; ctx.fillRect(PAD + 24, y + 24, TH, TH); }
            ctx.restore();
            let ly = y + 64;
            const eb = (x.outlet || catOf(x.category).label || '').toUpperCase();
            ctx.fillStyle = goldText; ctx.font = `bold 24px ${sans}`; ctx.fillText(wrapLines(ctx, eb, tw)[0] || '', tx, ly); ly += 50;
            ctx.fillStyle = navy; ctx.font = `40px ${serif}`;
            wrapLines(ctx, x.title, tw).slice(0, 2).forEach((ln) => { ctx.fillText(ln, tx, ly); ly += 48; });
            const meta = [offerDate(x), x.timing].filter(Boolean).join(' · ');
            ctx.font = `26px ${sans}`; ctx.fillStyle = muted;
            if (meta) { ctx.fillText(wrapLines(ctx, meta, tw)[0], tx, ly + 4); ly += 40; }
            if (x.price !== '' && x.price != null) { ctx.fillStyle = goldText; ctx.font = `bold 30px ${sans}`; ctx.fillText('AED ' + money(x.price), tx, Math.min(ly + 6, y + CH - 28)); }
          }
          y += CH + 24;
        });
        y += 12;
      }
    });
    return y;
  }

  /** Groups blocks and, for a highlighted section, paints a full-width tinted band behind it. */
  function drawBlocksCanvas(ctx, blocks, a, y, draw, PAD, INNER) {
    const W = PAD * 2 + INNER;
    const groups = [];
    let cur = null;
    (blocks || []).forEach((b) => {
      if (b.type === 'divider') { groups.push({ divider: true }); cur = null; return; }
      if (!cur || (b.type === 'text' && b.heading)) { cur = { items: [], hl: false }; groups.push(cur); }
      if (b.type === 'text' && cur.items.length === 0) cur.hl = !!b.highlight;
      cur.items.push(b);
    });
    groups.forEach((g) => {
      if (g.divider) { y = drawBlockItems(ctx, [{ type: 'divider' }], a, y, draw, PAD, INNER); return; }
      if (g.hl) {
        const h = drawBlockItems(ctx, g.items, a, y, false, PAD, INNER) - y;
        if (draw) { ctx.fillStyle = 'rgba(180,138,78,0.10)'; ctx.fillRect(0, y - 20, W, h + 20); }
        y = drawBlockItems(ctx, g.items, a, y, draw, PAD, INNER) + 12;
      } else {
        y = drawBlockItems(ctx, g.items, a, y, draw, PAD, INNER);
      }
    });
    return y;
  }

  /** Bottom of everything guests receive: the hotel's logo, name, address and contacts. */
  /** Crops the transparent margin off a logo so logos of different shapes end up a consistent size. */
  function logoTrim(img) {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        if (d[(yy * w + xx) * 4 + 3] > 14) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
      }
      if (maxX < 0) return { src: img, w: w, h: h };
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      if (cw >= w - 2 && ch >= h - 2) return { src: img, w: w, h: h };
      const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
      cc.getContext('2d').drawImage(img, minX, minY, cw, ch, 0, 0, cw, ch);
      return { src: cc, w: cw, h: ch };
    } catch (e) { return { src: img, w: img.naturalWidth, h: img.naturalHeight }; }
  }

  function drawFooter(ctx, p, a, y, draw, W, PAD) {
    const { serif, sans, navy, muted, line } = SH;
    const h = hotelFor(p);
    y += 30;
    if (draw) { ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); }
    const GAP = 48;
    y += GAP;
    const center = (txt, font, color, lh) => {
      ctx.font = font;
      wrapLines(ctx, txt, W - PAD * 2).forEach((ln) => { if (draw) { ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(ln, W / 2, y); ctx.textAlign = 'left'; } y += lh; });
    };
    if (a.logo) {
      // Logo only (no name): scaled to a steady height, with equal space above and below.
      const L = a.logoFit || (a.logoFit = logoTrim(a.logo));
      const s = Math.min(560 / L.w, 150 / L.h);
      const lw = L.w * s, lh = L.h * s;
      if (draw) ctx.drawImage(L.src, (W - lw) / 2, y, lw, lh);
      y += lh + GAP;
    } else { y -= 6; if (h.name) center(h.name, `34px ${serif}`, navy, 50); }
    if (h.address) { y += 4; center(h.address, `28px ${sans}`, muted, 40); }
    const contact = [h.phone, h.email].filter(Boolean).join('  ·  ');
    if (contact) center(contact, `28px ${sans}`, muted, 40);
    if (h.website) center(h.website.replace(/^https?:\/\//, ''), `bold 28px ${sans}`, navy, 40);
    return y + 40;
  }

  /** A newsletter as one long picture: cover, title band, intro, sections, hotel footer. */
  function drawNewsletter(ctx, p, a, measureOnly) {
    const W = 1080, PAD = 72, INNER = W - PAD * 2;
    const { serif, sans, navy, cream } = SH;
    const draw = !measureOnly;
    const special = p.style === 'Special' || p.style === 'Festive';
    const band = special ? colorHex(p.themeColor || (p.style === 'Festive' ? FESTIVE_RED : 'navy')) : navy;
    let y = 0;
    if (draw) { ctx.fillStyle = cream; ctx.fillRect(0, 0, W, 99999); }
    if (a.hero) {
      const h = Math.min(1350, Math.round(W * a.hero.naturalHeight / a.hero.naturalWidth));
      if (draw) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, h); ctx.clip();
        const s = Math.max(W / a.hero.naturalWidth, h / a.hero.naturalHeight);
        ctx.drawImage(a.hero, (W - a.hero.naturalWidth * s) / 2, (h - a.hero.naturalHeight * s) / 2, a.hero.naturalWidth * s, a.hero.naturalHeight * s);
        ctx.restore();
      }
      y = h;
    }
    ctx.font = `80px ${serif}`;
    const tl = wrapLines(ctx, p.title, INNER);
    const bandH = 80 + 40 + tl.length * 92 + 56;
    if (draw) {
      ctx.fillStyle = band; ctx.fillRect(0, y, W, bandH);
      ctx.fillStyle = '#E8D3AE'; ctx.font = `bold 28px ${sans}`; ctx.fillText(tileDate(p).toUpperCase(), PAD, y + 92);
      ctx.fillStyle = '#FFFFFF'; ctx.font = `80px ${serif}`;
      tl.forEach((ln, i) => ctx.fillText(ln, PAD, y + 92 + 40 + 72 + i * 92));
    }
    y += bandH + 56;
    if (p.message) {
      ctx.font = `36px ${sans}`;
      wrapLines(ctx, p.message, INNER).forEach((ln) => { if (draw) { ctx.fillStyle = navy; ctx.fillText(ln, PAD, y + 36); } y += 52; });
      y += 32;
    }
    y = drawBlocksCanvas(ctx, newsletterBlocks(p), a, y, draw, PAD, INNER);
    y = drawFooter(ctx, p, a, y, draw, W, PAD);
    return { height: Math.ceil(y), ctaRect: null };
  }



  function ctaTarget(raw) {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (/^https:\/\//i.test(v)) {
      let shown = v.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');
      if (shown.length > 42) shown = shown.slice(0, 40) + '…';
      return { url: v, shown };
    }
    const wa = /^(wa:|whatsapp:)/i.test(v);
    const num = v.replace(/^(wa:|whatsapp:)/i, '').trim();
    const digits = num.replace(/[^\d+]/g, '');
    if (wa) return { url: 'https://wa.me/' + digits.replace(/^\+/, ''), shown: 'WhatsApp ' + num };
    return { url: 'tel:' + digits, shown: num };
  }

  function wrapLines(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
      });
      out.push(line);
    });
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loadImg(src, cors) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      if (cors) im.crossOrigin = 'anonymous';
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = 2; c.height = 2;
          c.getContext('2d').drawImage(im, 0, 0, 2, 2); c.toDataURL();
          resolve(im);
        } catch (e) { reject(e); }
      };
      im.onerror = () => reject(new Error('Image did not load'));
      im.src = src;
    });
  }

  /** Offer photo for the share card. Tries the image link directly, then via the backend; returns null if neither works. */
  async function loadShareImage(url) {
    if (!safeUrl(url)) return null;
    if (state.shareCache[url]) return state.shareCache[url];
    let img = null;
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'reload', credentials: 'omit' });
      if (!res.ok) throw new Error('Image did not load');
      img = await loadImg(URL.createObjectURL(await res.blob()), false);
    } catch (e0) { img = null; }
    if (!img) try { img = await loadImg(url, true); } catch (e) {
      try {
        const j = await api('getImage', { url });
        img = await loadImg('data:' + j.mimeType + ';base64,' + j.data, false);
      } catch (e2) { img = null; }
    }
    if (img) state.shareCache[url] = img;
    return img;
  }

  /** Draws the guest card. Layout units are 1080 wide; the canvas is scaled up for full resolution. */
  function drawOffer(ctx, p, a, measureOnly) {
    a = a || { imgs: {} };
    const img = a.hero;
    const W = 1080, PAD = 72, INNER = W - PAD * 2;
    const serif = '"AppHeading", "Hilton Serif", Georgia, serif';
    const sans = '"AppBody", "Hilton Sans", system-ui, sans-serif';
    const navy = '#13294B', gold = '#B48A4E', goldText = '#7E5F2E', muted = '#5A6273', cream = '#F4EFE7';
    const draw = !measureOnly;
    let y = 0;
    const imgH = img ? 810 : 620; // 4:3 landscape photo
    if (draw) {
      ctx.fillStyle = cream; ctx.fillRect(0, 0, W, 99999);
      if (img) {
        const s = Math.max(W / img.naturalWidth, imgH / img.naturalHeight);
        const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, imgH); ctx.clip();
        ctx.drawImage(img, (W - iw) / 2, (imgH - ih) / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.fillStyle = navy; ctx.fillRect(0, 0, W, imgH);
        ctx.fillStyle = '#E8D3AE'; ctx.font = `64px ${serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.outlet || p.title, W / 2, imgH / 2);
        ctx.textAlign = 'left';
      }
    }
    y = imgH;
    const hasPrice = p.price !== '' && p.price != null;
    if (hasPrice && draw) {
      const cx = W - PAD - 100, cy = imgH, r = 112;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = cream; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = gold; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = goldText; ctx.font = `bold 28px ${sans}`; ctx.fillText('AED', cx, cy - 26);
      ctx.fillStyle = navy; ctx.font = `76px ${serif}`; ctx.fillText(money(p.price), cx, cy + 50);
      ctx.textAlign = 'left';
    }
    ctx.textBaseline = 'alphabetic';
    y += 84;
    // Outlet: its logo if one is uploaded (App setup › Outlets), otherwise its name.
    const eyebrow = (p.outlet || '').toUpperCase();
    if (a.outletLogo) {
      const L = a.outletLogo, s = Math.min(440 / L.naturalWidth, 120 / L.naturalHeight);
      const lw = L.naturalWidth * s, lh = L.naturalHeight * s;
      if (draw) ctx.drawImage(L, PAD, y - 34, lw, lh);
      y += lh - 34;
    } else if (eyebrow) {
      ctx.font = `bold 30px ${sans}`;
      if (draw) { ctx.fillStyle = goldText; ctx.fillText(eyebrow, PAD, y); }
      y += 30;
    }
    y += hasPrice ? 64 : 34;
    // Title
    ctx.font = `76px ${serif}`;
    wrapLines(ctx, p.title, INNER).forEach((ln) => { if (draw) { ctx.fillStyle = navy; ctx.fillText(ln, PAD, y + 60); } y += 88; });
    y += 28;
    // Date / Time boxes
    const boxes = [];
    if (offerDate(p)) boxes.push(['DATE', [offerDate(p)]]);
    if (p.timing) boxes.push(['TIME', [p.timing]]);
    if (boxes.length) {
      const gap = 24, bw = boxes.length === 2 ? (INNER - gap) / 2 : INNER;
      ctx.font = `bold 38px ${sans}`;
      const linesPer = boxes.map(([, vals]) => vals.reduce((n, v) => n + wrapLines(ctx, v, bw - 56).length, 0));
      const bh = 96 + Math.max.apply(null, linesPer) * 50;
      boxes.forEach(([label, vals], i) => {
        const bx = PAD + i * (bw + gap);
        if (draw) {
          roundRect(ctx, bx, y, bw, bh, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill();
          ctx.fillStyle = muted; ctx.font = `bold 26px ${sans}`; ctx.fillText(label, bx + 28, y + 52);
          ctx.fillStyle = navy; ctx.font = `bold 38px ${sans}`;
          let ly = y + 104;
          vals.forEach((v) => wrapLines(ctx, v, bw - 56).forEach((ln) => { ctx.fillText(ln, bx + 28, ly); ly += 50; }));
        }
      });
      y += bh + 32;
    }
    // Inclusions
    if ((p.inclusions && p.inclusions.length) || p.serves) {
      ctx.font = `38px ${sans}`;
      let lines = [];
      (p.inclusions || []).forEach((it) => wrapLines(ctx, it, INNER - 110).forEach((ln, k) => lines.push([ln, k === 0])));
      const bh = 60 + (p.inclusions && p.inclusions.length ? 64 + lines.length * 56 : 0) + (p.serves ? 80 : 0);
      if (draw) {
        roundRect(ctx, PAD, y, INNER, bh, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        let ly = y + 70;
        if (p.inclusions && p.inclusions.length) {
          ctx.fillStyle = muted; ctx.font = `bold 26px ${sans}`; ctx.fillText('INCLUDES', PAD + 32, ly); ly += 60;
          ctx.fillStyle = navy; ctx.font = `38px ${sans}`;
          lines.forEach(([ln, first]) => {
            if (first) { ctx.beginPath(); ctx.arc(PAD + 44, ly - 13, 7, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill(); ctx.fillStyle = navy; }
            ctx.fillText(ln, PAD + 72, ly); ly += 56;
          });
        }
        if (p.serves) { ctx.fillStyle = muted; ctx.font = `34px ${sans}`; ctx.fillText(p.serves, PAD + 32, ly + 18); }
      }
      y += bh + 32;
    }
    // Description
    if (p.message) {
      ctx.font = `36px ${sans}`;
      const lines = wrapLines(ctx, p.message, INNER).slice(0, 8);
      lines.forEach((ln) => { if (draw) { ctx.fillStyle = navy; ctx.fillText(ln, PAD, y + 36); } y += 52; });
      y += 24;
    }

    // Sections added to the offer (text and images)
    y = drawBlocksCanvas(ctx, p.blocks || [], a, y, draw, PAD, INNER);
    // CTA (guest share only)
    let ctaRect = null;
    const target = ctaTarget(p.ctaLink);
    if (p.ctaText || target) {
      y += 10;
      const bh = 124;
      ctaRect = { x: PAD, y, w: INNER, h: bh + (target ? 60 : 0), url: target ? target.url : '' };
      if (draw) {
        roundRect(ctx, PAD, y, INNER, bh, 30); ctx.fillStyle = navy; ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 44px ${sans}`; ctx.textAlign = 'center';
        ctx.fillText(p.ctaText || 'Book now', W / 2, y + 78);
        if (target) { ctx.fillStyle = navy; ctx.font = `bold 36px ${sans}`; ctx.fillText(target.shown, W / 2, y + bh + 52); }
        ctx.textAlign = 'left';
      }
      y += bh + (target ? 80 : 30);
    }
    // Terms & Conditions (small print)
    if (p.terms) {
      ctx.font = `bold 24px ${sans}`;
      if (draw) { ctx.fillStyle = muted; ctx.fillText('TERMS & CONDITIONS', PAD, y + 30); }
      y += 52;
      ctx.font = `26px ${sans}`;
      String(p.terms).split('\n').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        wrapLines(ctx, '• ' + t, INNER).forEach((ln) => { if (draw) { ctx.fillStyle = muted; ctx.fillText(ln, PAD, y + 26); } y += 36; });
      });
      y += 20;
    }
    // Footer: hotel logo, name, address and contacts
    y = drawFooter(ctx, p, a, y, draw, W, PAD);
    return { height: Math.ceil(y), ctaRect };
  }

  const Share = {
    current: null,
    async build(p) {
      try { await Fonts.queue; } catch (e) { /* built-in fonts */ }
      try {
        await Promise.all(['76px AppHeading', '76px "Hilton Serif"', '38px AppBody', 'bold 38px AppBody', '38px "Hilton Sans"']
          .map((f) => document.fonts.load(f)));
      } catch (e) { /* fallback fonts */ }
      const isNl = catOf(p.category).type === 'monthly';
      const draw = isNl ? drawNewsletter : drawOffer;
      const assets = await shareAssets(p, isNl);
      const probe = document.createElement('canvas').getContext('2d');
      const m = draw(probe, p, assets, true);
      // Phones limit how big a picture can be: long newsletters are drawn at a slightly lower resolution.
      const SCALE = Math.max(0.8, Math.min(2, Math.sqrt(15e6 / (1080 * m.height))));
      const c = document.createElement('canvas');
      c.width = Math.round(1080 * SCALE); c.height = Math.round(m.height * SCALE);
      const ctx = c.getContext('2d');
      ctx.scale(SCALE, SCALE);
      const res = draw(ctx, p, assets, false);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
      const links = res.ctaRect && res.ctaRect.url ? [{ x: res.ctaRect.x * SCALE, y: res.ctaRect.y * SCALE, w: res.ctaRect.w * SCALE, h: res.ctaRect.h * SCALE, url: res.ctaRect.url }] : [];
      const pdf = makePdf(new Uint8Array(await blob.arrayBuffer()), c.width, c.height, links);
      const base = (p.title || 'offer').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'offer';
      this.current = { id: p.id, image: blob, pdf: new Blob([pdf], { type: 'application/pdf' }), base, title: p.title, url: URL.createObjectURL(blob) };
      return this.current;
    },
    async send(kind) {
      const cur = this.current;
      if (!cur) return;
      const blob = kind === 'pdf' ? cur.pdf : cur.image;
      const name = cur.base + (kind === 'pdf' ? '.pdf' : '.jpg');
      const file = new File([blob], name, { type: blob.type });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: cur.title });
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Saved to your downloads.');
    }
  };

  /** Minimal one-page PDF: the share image, plus a tappable link over the call-to-action. */
  function makePdf(jpeg, wPx, hPx, links) {
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const f = (n) => (Math.round(n * 100) / 100).toString();
    const pw = 595.28, ph = pw * hPx / wPx, k = pw / wPx;
    const obj = (n, body) => { offsets[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
    const annIds = links.map((_, i) => 6 + i);
    push(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]));
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R${annIds.length ? ' /Annots [' + annIds.map((n) => n + ' 0 R').join(' ') + ']' : ''} >>`));
    obj(4, () => { push(`<< /Type /XObject /Subtype /Image /Width ${wPx} /Height ${hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); push(jpeg); push('\nendstream'); });
    const content = `q ${f(pw)} 0 0 ${f(ph)} 0 0 cm /Im0 Do Q`;
    obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    links.forEach((l, i) => {
      const x1 = l.x * k, x2 = (l.x + l.w) * k, y2 = ph - l.y * k, y1 = ph - (l.y + l.h) * k;
      const uri = l.url.replace(/[\\()]/g, (c) => '\\' + c);
      obj(6 + i, () => push(`<< /Type /Annot /Subtype /Link /Rect [${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}] /Border [0 0 0] /A << /S /URI /URI (${uri}) >> >>`));
    });
    const count = 6 + links.length;
    const xref = len;
    let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let n = 1; n < count; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len);
    let o = 0;
    parts.forEach((b) => { out.set(b, o); o += b.length; });
    return out;
  }

  /* ---------------- Social share: a team member's achievement ---------------- */
  /** The one-line message on the achievement card, by category. */
  function achievementText(p) {
    const c = catOf(p.category);
    const key = (c.id + ' ' + c.label).toLowerCase();
    if (isAward(c) && p.subtitle) return 'Congratulations on being named ' + p.subtitle + '!';
    if (/join|welcome|new/.test(key)) return 'Welcome to the team!';
    if (/promot/.test(key)) return 'Congratulations on a well-deserved promotion!';
    return 'Congratulations!';
  }

  /** Pictures the achievement card needs: the person's photo and the hotel logo. */
  async function achievementAssets(p) {
    const a = { photo: null, logo: null };
    const h = hotelFor(p);
    const jobs = [];
    if (safeUrl(p.image)) jobs.push(loadShareImage(p.image).then((i) => { a.photo = i; }));
    if (h && safeUrl(h.logo)) jobs.push(loadShareImage(h.logo).then((i) => { a.logo = i; }));
    await Promise.all(jobs.map((j) => j.catch(() => {})));
    return a;
  }

  /** A clean social card for a person post: 'post' (4:5) or 'story' (9:16). */
  function drawAchievement(ctx, p, a, format) {
    const W = 1080, H = format === 'story' ? 1920 : 1350;
    const { serif, sans, navy, gold, goldText, muted, cream } = SH;
    const c = catOf(p.category);
    const name = p.personName || p.title;
    const msg = achievementText(p);
    const eyebrow = (c.label || '').toUpperCase();
    const D = format === 'story' ? 460 : 400;

    // Measure the stack so it can be centred.
    const parts = [];
    parts.push({ t: 'eyebrow', h: 40 });
    parts.push({ gap: format === 'story' ? 96 : 76 });
    parts.push({ t: 'photo', h: D });
    if (isAward(c) && p.subtitle) { parts.push({ gap: 30 }); parts.push({ t: 'badge', h: 66 }); }
    parts.push({ gap: 40 });
    ctx.font = `84px ${serif}`;
    const nameLines = wrapLines(ctx, name, W - 140);
    parts.push({ t: 'name', h: nameLines.length * 92, lines: nameLines });
    if (p.position) { parts.push({ gap: 14 }); parts.push({ t: 'pos', h: 44 }); }
    parts.push({ gap: 44 });
    ctx.font = `40px ${sans}`;
    const msgLines = wrapLines(ctx, msg, W - 200);
    parts.push({ t: 'msg', h: msgLines.length * 56, lines: msgLines });

    const foot = 190; // reserved for the hotel logo and name at the bottom
    const total = parts.reduce((s, x) => s + (x.h || x.gap || 0), 0);
    let y = Math.max(96, (H - foot - total) / 2);

    // Where the photo will sit, so the divider curve can pass behind it (like the design).
    let py = y;
    for (const x of parts) { if (x.t === 'photo') break; py += (x.h || x.gap || 0); }
    const pcy = py + D / 2;

    // Background: cream, with a soft white curve peaking behind the photo and one faint gold line.
    ctx.fillStyle = cream; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, pcy + 150);
    ctx.quadraticCurveTo(W / 2, pcy - 120, W, pcy + 150); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = gold; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-20, pcy + 40); ctx.quadraticCurveTo(W * 0.45, pcy - 210, W + 20, pcy - 30); ctx.stroke();
    ctx.restore();

    const centerText = (txt, font, color, baseline) => { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, baseline); ctx.textAlign = 'left'; };

    parts.forEach((x) => {
      if (x.gap) { y += x.gap; return; }
      if (x.t === 'eyebrow' && eyebrow) { ctx.font = `bold 28px ${sans}`; ctx.fillStyle = goldText; ctx.textAlign = 'center';
        ctx.fillText(eyebrow.length > 42 ? eyebrow.slice(0, 42) : eyebrow, W / 2, y + 28);
        ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 36, y + 50); ctx.lineTo(W / 2 + 36, y + 50); ctx.stroke(); ctx.textAlign = 'left'; }
      else if (x.t === 'photo') {
        const cx = W / 2, cy = y + D / 2, r = D / 2;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.clip();
        if (a.photo) {
          const s = Math.max(D / a.photo.naturalWidth, D / a.photo.naturalHeight);
          ctx.drawImage(a.photo, cx - a.photo.naturalWidth * s / 2, cy - a.photo.naturalHeight * s / 2, a.photo.naturalWidth * s, a.photo.naturalHeight * s);
        } else { ctx.fillStyle = navy; ctx.fillRect(cx - r, cy - r, D, D);
          ctx.fillStyle = '#E8D3AE'; ctx.font = `${D * 0.32}px ${serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials(name), cx, cy + 4); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; }
        ctx.restore();
        ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 14; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, Math.PI * 2); ctx.strokeStyle = gold; ctx.lineWidth = 6; ctx.stroke();
      }
      else if (x.t === 'badge') {
        ctx.font = `bold 30px ${sans}`;
        const tw = ctx.measureText(p.subtitle).width, bw = tw + 108, bx = (W - bw) / 2;
        roundRect(ctx, bx, y, bw, 58, 29); ctx.fillStyle = gold; ctx.fill();
        // small award glyph
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx + 34, y + 25, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + 27, y + 33); ctx.lineTo(bx + 24, y + 46); ctx.lineTo(bx + 34, y + 40); ctx.lineTo(bx + 44, y + 46); ctx.lineTo(bx + 41, y + 33); ctx.stroke();
        centerText(p.subtitle, `bold 30px ${sans}`, '#FFFFFF', y + 38);
      }
      else if (x.t === 'name') { ctx.font = `84px ${serif}`; ctx.fillStyle = navy; ctx.textAlign = 'center';
        x.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + 72 + i * 92)); ctx.textAlign = 'left'; }
      else if (x.t === 'pos') centerText(p.position, `38px ${sans}`, muted, y + 34);
      else if (x.t === 'msg') { ctx.font = `40px ${sans}`; ctx.fillStyle = navy; ctx.textAlign = 'center';
        x.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + 36 + i * 56)); ctx.textAlign = 'left'; }
      y += x.h;
    });

    // Footer: hotel logo (or name), centred in its band with equal space top and bottom.
    const h = hotelFor(p);
    let fy = H - foot + 30;
    if (a.logo) {
      const L = a.logoFit || (a.logoFit = logoTrim(a.logo));
      const s = Math.min(520 / L.w, 150 / L.h);
      const lw = L.w * s, lh = L.h * s;
      ctx.drawImage(L.src, (W - lw) / 2, (H - foot) + (foot - lh) / 2, lw, lh);
    } else if (h.name) {
      ctx.font = `34px ${serif}`;
      wrapLines(ctx, h.name, W - 160).forEach((ln, i) => centerText(ln, `34px ${serif}`, navy, fy + 20 + i * 46));
    }
    return { W, H };
  }

  const Ach = {
    cache: {}, building: false, failedKey: null, fmt: 'post',
    key(p, fmt) { return p.id + '|' + fmt; },
    async build(p, fmt) {
      try { await Fonts.queue; } catch (e) { /* built-in */ }
      try { await Promise.all(['84px AppHeading', '84px "Hilton Serif"', '40px AppBody', 'bold 30px AppBody'].map((f) => document.fonts.load(f))); } catch (e) { /* fallback */ }
      const a = await achievementAssets(p);
      const H = fmt === 'story' ? 1920 : 1350;
      const SCALE = Math.min(2, Math.sqrt(12e6 / (1080 * H)));
      const cv = document.createElement('canvas');
      cv.width = Math.round(1080 * SCALE); cv.height = Math.round(H * SCALE);
      const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
      drawAchievement(ctx, p, a, fmt);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.94));
      const base = ((p.personName || p.title || 'achievement').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'achievement') + '-' + (fmt === 'story' ? 'story' : 'post');
      const out = { blob, base, url: URL.createObjectURL(blob), version: p };
      this.cache[this.key(p, fmt)] = out;
      return out;
    },
    async send(p) {
      const cur = this.cache[this.key(p, this.fmt)];
      if (!cur) return;
      const file = new File([cur.blob], cur.base + '.jpg', { type: 'image/jpeg' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(cur.blob); link.download = cur.base + '.jpg';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 10000);
      toast('Saved to your device.');
    }
  };

  VIEWS.achievement = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || (state.myPosts || []).find((x) => x.id === id);
    if (!p) return `<div class="screen"><div class="page"><div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button><h1 style="flex:1">Share</h1><span style="width:44px"></span></div><p>Not found.</p></div></div>`;
    const fmt = Ach.fmt;
    const cur = Ach.cache[Ach.key(p, fmt)];
    const ready = cur && cur.version === p;
    const failed = Ach.failedKey === Ach.key(p, fmt);
    if (!ready && !Ach.building && !failed) {
      Ach.building = true;
      Ach.build(p, fmt).then(() => { Ach.failedKey = null; })
        .catch((e) => { Ach.failedKey = Ach.key(p, fmt); showError(e); })
        .finally(() => { Ach.building = false; if (state.route.name === 'achievement') render(); });
    }
    return `
    <div class="screen"><div class="page">
      <div class="topbar"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1 style="flex:1">Share achievement</h1><span style="width:44px"></span></div>
      <div class="seg" role="group" aria-label="Size">
        <button type="button" data-act="achFmt" data-v="post" aria-pressed="${fmt === 'post'}">Post · 4:5</button>
        <button type="button" data-act="achFmt" data-v="story" aria-pressed="${fmt === 'story'}">Story · 9:16</button>
      </div>
      <div class="ach-prev ${fmt}">
        ${ready ? `<img src="${esc(cur.url)}" alt="Achievement card">`
          : failed ? `<div class="card center"><p>Could not prepare the image.</p><button class="btn btn-outline" type="button" data-act="achRetry">Try again</button></div>`
          : '<div class="card center"><div class="spinner"></div><p class="small muted">Preparing your image…</p></div>'}
      </div>
      <p class="hint center">Save it, then post it to Instagram, WhatsApp status or LinkedIn.</p>
      <div class="sticky-actions">
        <button class="btn" type="button" data-act="achSend" data-id="${esc(p.id)}" ${ready ? '' : 'disabled'}>${I.share} Save / share</button>
      </div>
    </div></div>`;
  };

  VIEWS.share = ({ id }) => {
    const p = state.posts.find((x) => x.id === id) || (state.myPosts || []).find((x) => x.id === id);
    if (!p) return `<div class="screen"><div class="page"><div class="row"><button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button></div><p>Not found.</p></div></div>`;
    const ready = Share.current && Share.current.id === id && Share.current.version === p;
    const failed = Share.failedId === id;
    if (!ready && !Share.building && !failed) {
      Share.building = true;
      Share.build(p).then((cur) => { cur.version = p; Share.failedId = null; })
        .catch((e) => { Share.failedId = id; showError(e); })
        .finally(() => { Share.building = false; if (state.route.name === 'share') render(); });
    }
    return `
    <div class="screen"><div class="page">
      <div class="topbar">
        <button class="icon-btn" type="button" data-act="back" aria-label="Back">${I.back}</button>
        <h1>Share with guest</h1><span style="width:44px"></span>
      </div>
      ${ready ? `<img src="${esc(Share.current.url)}" alt="Picture for guests" style="width:100%;border-radius:16px;box-shadow:0 6px 24px rgba(19,41,75,.12)">`
        : failed ? `<div class="card center"><p>Could not prepare the image.</p><button class="btn btn-outline" type="button" data-act="retryShare">Try again</button></div>`
        : '<div class="card center"><div class="spinner"></div><p class="small muted">Preparing a full-resolution image…</p></div>'}
      <div class="sticky-actions">
        <div class="grid-2">
          <button class="btn btn-outline" type="button" data-act="sharePdf" ${ready ? '' : 'disabled'}>${I.file} PDF</button>
          <button class="btn" type="button" data-act="shareImage" ${ready ? '' : 'disabled'}>${I.share} Image</button>
        </div>
      </div>
    </div></div>`;
  };

  /* ---------------- Uploads ---------------- */
  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read the file.'));
      r.readAsDataURL(file);
    });
  }
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be opened. Try a JPG or PNG.')); };
      img.src = url;
    });
  }
  /** An SVG logo drawn large and sharp, with a transparent background (saved as PNG). */
  async function svgImage(file) {
    const txt = await file.text();
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new Error('That SVG file could not be opened.');
    let w = parseFloat(svg.getAttribute('width')) || 0, h = parseFloat(svg.getAttribute('height')) || 0;
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3]; }
    if (!w || !h) { w = 300; h = 150; }
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const scale = 1200 / Math.max(w, h);
    svg.setAttribute('width', Math.round(w * scale)); svg.setAttribute('height', Math.round(h * scale));
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    return loadImage(blob);
  }
  async function filePayload(file, maxSide) {
    if (file.type === 'application/pdf') {
      if (file.size > 8 * 1024 * 1024) throw new Error('The PDF is too large (8 MB maximum).');
      const d = await readAsDataUrl(file);
      return { mimeType: 'application/pdf', data: d.split(',')[1], name: file.name };
    }
    const img = await loadImage(file);
    const max = maxSide || 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', 0.82);
    return { mimeType: 'image/jpeg', data: d.split(',')[1], name: (file.name || 'image').replace(/\.\w+$/, '') + '.jpg' };
  }

  /** Logo upload: keeps transparency (PNG), scaled to at most 1200 px. */
  async function logoPayload(file) {
    const img = /svg/i.test(file.type) || /\.svg$/i.test(file.name || '') ? await svgImage(file) : await loadImage(file);
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/png');
    return { mimeType: 'image/png', data: d.split(',')[1], name: 'hotel-logo.png' };
  }

  /* ---------------- Actions ---------------- */
  const ACT = {
    nav(el) {
      const to = el.dataset.to;
      if (to === 'section' && el.dataset.coll) { go(to, { id: el.dataset.id, coll: el.dataset.coll }); return; }
      if (['share', 'achievement', 'section', 'collection', 'collectionEdit', 'popupEdit', 'attendees', 'setupSection', 'checkin', 'checkinHost'].indexOf(to) >= 0) { go(to, { id: el.dataset.id }); return; }
      if (to === 'trainingReport') { state.report = null; go(to, { id: el.dataset.id }); return; }
      if (to === 'leavers') { state.leavers = null; state.leaverQuery = ''; }
      if (to === 'popups') state.popupList = null;
      if (to === 'collections') state.adminColls = null;
      if (to === 'birthdays') state.bdayList = null;
      if (to === 'offers' || to === 'feed') state.filter.q = '';
      if (to === 'myposts') state.myPosts = null;
      if (to === 'admin' || to === 'adminTeam') state.staff = null;
      if (to === 'adminSetup') state.adminCats = null;
      go(to);
    },
    back() { back(); },
    signupProp(el) {
      state.signupProperty = el.dataset.v;
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    },
    setCat(el) { state.filter.cat = el.dataset.v; render(); },
    setProp(el) { state.filter.prop = el.dataset.v; render(); },
    refresh() { PTR.run(); },
    open(el) { go('post', { id: el.dataset.id }); },
    enablePush() { Push.enable(); },
    async wishBday(el) {
      const id = el.dataset.id;
      if (!id || el.disabled) return;
      el.disabled = true;
      try {
        await api('wishBirthday', { employeeId: id });
        const w = LS.get('bb_wished') || {}; const day = todayIso();
        const set = new Set(w[day] || []); set.add(id); w[day] = [...set]; LS.set('bb_wished', w);
        el.classList.add('done'); el.innerHTML = I.check + ' Wished';
        try { Haptics.tap(true); } catch (e) { /* none */ }
        toast('Birthday wish sent 💐');
      } catch (e) { el.disabled = false; showError(e); }
    },
    installApp: async () => {
      if (!state.installEvt) return;
      state.installEvt.prompt();
      try { await state.installEvt.userChoice; } catch (e) { /* ignore */ }
      state.installEvt = null;
      render();
    },
    installDone() { LS.set('bb_install_seen', true); go('today', {}, true); },
    compose(el) {
      if (canCollect() && !state.adminColls) api('collections').then((j) => { state.adminColls = j.collections; }).catch(() => {});
      go('compose', el && el.dataset.groups ? { groups: el.dataset.groups } : {});
    },
    pickCat(el) { go('compose', { cat: el.dataset.v }, true); },
    pickColor(el) {
      const box = el.closest('.field') || el.closest('form');
      box.querySelector(`input[type=hidden][name="${el.dataset.name}"]`).value = el.dataset.v;
      el.parentElement.querySelectorAll('.swatch').forEach((b) => { b.setAttribute('aria-pressed', String(b === el)); if (b.classList.contains('swatch-custom')) b.style.boxShadow = ''; });
      const prev = document.getElementById('coll-prev');
      if (prev && el.dataset.name === 'color') prev.style.setProperty('--bg', colorHex(el.dataset.v));
    },
    nlStyle(el) {
      const form = el.closest('form');
      const v = el.dataset.v;
      form.querySelector('input[name="style"]').value = v;
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      form.querySelector('#nl-extra').hidden = v === 'Regular';
      if (v === 'Festive') {
        const tc = form.querySelector('input[name="themeColor"]');
        if (!tc.value || tc.value === 'navy') { const sw = form.querySelector('.swatch[data-v="red"]'); if (sw) ACT.pickColor(sw); }
        const an = form.querySelector('input[name="animation"]');
        if (an.value === 'none') { const ch = form.querySelector('.chip[data-name="animation"][data-v="sparkle"]'); if (ch) ACT.formSeg(ch); }
      }
    },
    async lookupPerson(el) {
      const form = el.closest('form');
      const id = form.querySelector('#c-pid').value.trim();
      const hint = form.querySelector('#pid-hint');
      if (!id) { hint.textContent = 'Type an Employee ID, first or last name.'; return; }
      el.disabled = true;
      const old = form.querySelector('.pick-list'); if (old) old.remove();
      try {
        const j = await api('lookupStaff', { employeeId: id });
        if (!j.found && j.matches && j.matches.length) {
          hint.textContent = j.matches.length + ' colleagues match. Choose one:';
          hint.insertAdjacentHTML('afterend', `<div class="pick-list">${j.matches.map((m) => `<button type="button" class="pick" data-act="pickPerson" data-id="${esc(m.employeeId)}">${avatarHtml(m, 32)}<span><b>${esc(m.name)}</b><small>ID ${esc(m.employeeId)}${m.department ? ' · ' + esc(m.department) : ''}${m.property ? ' · ' + esc(m.property) : ''}</small></span></button>`).join('')}</div>`);
        } else if (!j.found) { hint.textContent = form.dataset.kind === 'training' ? 'Not registered in the app. Type the presenter’s name.' : 'Not registered in the app. Type their name and add a photo.'; }
        else if (form.dataset.kind === 'training') {
          form.querySelector('#c-pid').value = j.employeeId || id;
          form.querySelector('#c-pname').value = j.name;
          hint.textContent = 'Found ' + j.name + (j.department ? ', ' + j.department : '') + '.';
        } else {
          form.querySelector('#c-pid').value = j.employeeId || id;
          form.querySelector('#c-pname').value = j.name;
          const pos = form.querySelector('#c-pos'); if (!pos.value && j.department) pos.value = j.department;
          if (j.photo && !form.querySelector('input[name="image"]').value) {
            form.querySelector('input[name="image"]').value = j.photo;
            const box = form.querySelector('#img-box');
            box.querySelectorAll('img,svg').forEach((n) => n.remove());
            const im = document.createElement('img'); im.src = j.photo; im.alt = ''; box.prepend(im);
            form.querySelector('#img-label').textContent = 'Change photo';
            const rm = form.querySelector('[data-remove-for="image"]'); if (rm) rm.hidden = false;
          }
          if (j.property && ['DXBAI', 'DXBPI', 'Cluster'].indexOf(j.property) >= 0) {
            const b = form.querySelector(`.seg [data-name="property"][data-v="${j.property}"]`); if (b) ACT.formSeg(b);
          }
          hint.textContent = 'Found ' + j.name + '.';
        }
      } catch (e) { showError(e); }
      el.disabled = false;
    },
    pickPerson(el) {
      const form = el.closest('form');
      form.querySelector('#c-pid').value = el.dataset.id;
      const list = el.closest('.pick-list'); if (list) list.remove();
      ACT.lookupPerson(form.querySelector('[data-act="lookupPerson"]'));
    },
    formSeg(el) {
      const form = el.closest('form');
      form.querySelector(`input[name="${el.dataset.name}"]`).value = el.dataset.v;
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      if (el.dataset.name === 'animation') { refreshPreview(); if (form.dataset.form === 'popup') Sound.play(el.dataset.v); }
      if (el.dataset.name === 'type') { const sf = form.querySelector('#sub-field'); if (sf) sf.hidden = el.dataset.v !== 'people'; }
    },
    addSub() {
      const box = document.getElementById('sub-rows');
      const i = box.children.length;
      box.insertAdjacentHTML('beforeend', subRow('', i));
      const inp = document.getElementById('sub-' + i);
      if (inp) inp.focus();
    },
    removeUpload(el) {
      const form = el.closest('form');
      const noun = el.dataset.noun;
      form.querySelector(`input[type=hidden][name="${el.dataset.target}"]`).value = '';
      const label = document.getElementById(el.dataset.label);
      if (label) label.textContent = noun ? 'Add ' + noun : 'Choose file';
      if (el.dataset.box) {
        const box = document.getElementById(el.dataset.box);
        box.querySelectorAll('img').forEach((n) => n.remove());
        if (!box.querySelector('svg')) box.insertAdjacentHTML('afterbegin', I.image);
      }
      el.hidden = true;
      toast((noun ? noun.charAt(0).toUpperCase() + noun.slice(1) : 'File') + ' removed. Save to apply.');
    },
    lndMonth(el) {
      const [y, m] = (state.lndMonth || todayIso().slice(0, 7)).split('-').map(Number);
      const d = new Date(y, m - 1 + Number(el.dataset.v), 1);
      state.lndMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      state.lndDay = '';
      const y0 = window.scrollY; render(); window.scrollTo(0, y0);
    },
    lndDay(el) {
      state.lndDay = el.dataset.v === state.lndDay ? '' : el.dataset.v;
      const y0 = window.scrollY; render(); window.scrollTo(0, y0);
    },
    async deleteCollection(el) {
      const c = (state.adminColls || []).find((x) => x.id === el.dataset.id);
      if (!confirm(`Permanently delete the collection “${c ? c.name : ''}”?\n\nIts offers and posts stay in the app; they just leave the collection. This cannot be undone.`)) return;
      el.disabled = true;
      try {
        const j = await api('deleteCollection', { id: el.dataset.id });
        state.adminColls = j.collections || [];
        state.collections = state.collections.filter((x) => x.id !== el.dataset.id);
        state.posts.forEach((x) => { if (x.collection === el.dataset.id) x.collection = ''; });
        toast('Collection deleted.');
        go('collections', {}, true);
        loadFeed(true);
      } catch (e) { showError(e); el.disabled = false; }
    },
    setAppearance(el) {
      LS.set('bb_appearance', el.dataset.v);
      applyAppearance(); render();
    },
    async attend(el) {
      const id = el.dataset.id;
      const going = el.dataset.v === '1';
      el.disabled = true;
      const p = state.posts.find((x) => x.id === id);
      try {
        const j = await api('attend', { postId: id, going });
        if (p) { p.attending = j.attending; p.attendees = j.attendees; LS.set('bb_posts', state.posts); }
        toast(going ? 'See you there! You’re attending.' : 'You’re no longer attending.');
        const y0 = window.scrollY; render(); window.scrollTo(0, y0);
      } catch (e) { showError(e); el.disabled = false; }
    },
    async ack(el) {
      const id = el.dataset.id;
      el.disabled = true;
      el.innerHTML = '<span class="spinner"></span>';
      try {
        await api('ack', { postId: id });
        const p = state.posts.find((x) => x.id === id);
        if (p) p.acknowledged = true;
        LS.set('bb_posts', state.posts);
        toast('Thank you, acknowledged.');
        render();
      } catch (e) { showError(e); render(); }
    },
    async shareOffer(el) {
      const p = state.posts.find((x) => x.id === el.dataset.id);
      if (!p) return;
      const lines = [p.title + (p.outlet ? ' at ' + p.outlet : '')];
      if (p.price !== '' && p.price != null) lines.push('AED ' + money(p.price));
      const when = [p.timing, p.location].filter(Boolean).join(', ');
      if (when) lines.push(when);
      if (p.inclusions && p.inclusions.length) lines.push('Includes: ' + p.inclusions.join(', '));
      if (p.serves) lines.push(p.serves);
      if (p.terms) lines.push('T&Cs: ' + p.terms.split('\n').join('; '));
      const text = lines.join('\n');
      try {
        if (navigator.share) await navigator.share({ title: p.title, text });
        else { await navigator.clipboard.writeText(text); toast('Offer details copied.'); }
      } catch (e) { /* share cancelled */ }
    },
    async signOut(el) {
      if (el) el.disabled = true;
      const ok = await signOutOnServer();
      if (!ok && !confirm('You seem to be offline, so the app can’t sign you out properly.\n\nIf you sign out now, you may not be able to sign in on another phone until your Admin signs you out of all devices.\n\nSign out anyway?')) { if (el) el.disabled = false; return; }
      signOut('Signed out.');
    },
    reloadReport() { PTR.run(); },
    reloadLeavers() { PTR.run(); },
    async clearLastDay(el) {
      const x = (state.leavers || []).find((p) => p.employeeId === el.dataset.id) || {};
      const back = x.status === 'Left';
      if (!confirm(back ? `Give ${x.name} access to the app again?` : `Remove the last working day for ${x.name}? They will keep their access.`)) return;
      el.disabled = true;
      try {
        await api('setLastDay', { employeeId: el.dataset.id, date: '' });
        x.lastDay = ''; x.status = 'Approved';
        state.leaverOpen = '';
        toast(back ? 'Access given back.' : 'Last working day removed.');
        render();
      } catch (e) { showError(e); el.disabled = false; }
    },
    async downloadReportPdf(el) {
      const r = state.report;
      if (!r || el.disabled) return;
      el.disabled = true;
      const label = el.innerHTML;
      el.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Preparing the PDF…';
      try {
        const doc = await ReportPdf.build(r, (d, n) => { if (n > 3) el.lastChild.textContent = ` Adding photos ${d} of ${n}…`; });
        const name = ('Attendance - ' + (r.title || 'training') + ' - ' + (r.date || '')).replace(/[\\/:*?"<>|]+/g, '') + '.pdf';
        const blob = doc.output('blob');
        const file = typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null;
        // Phones: open the share sheet (Save to Files, Mail, WhatsApp, Print). Computers: download.
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && 'ontouchstart' in window) {
          try { await navigator.share({ files: [file], title: name }); } catch (e) { /* closed */ }
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        }
      } catch (e) { showError(e); }
      el.disabled = false; el.innerHTML = label;
    },
    downloadReport(el) {
      const r = state.report;
      if (!r) return;
      const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const dt = (ts) => ts ? fmtStamp(ts) : '';
      const lines = [['Training', r.title], ['Date', fmtDate(r.date)], ['Time', fmtTiming(r.timing)], ['Venue', r.location], ['Presenter', r.presenter], [],
        ['Employee ID', 'Name', 'Department', 'Position', 'Hotel', 'Signed up', 'Checked in', 'Check-in method', 'Status']]
        .concat(r.rows.map((x) => [x.employeeId, x.name, x.department, x.position || '', x.property, dt(x.signedUp), dt(x.checkedIn), x.method, x.checkedIn ? 'Attended' : 'Did not check in']));
      const csv = '\ufeff' + lines.map((l) => l.map(q).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = ('Attendance - ' + (r.title || 'training') + ' - ' + (r.date || '')).replace(/[\\/:*?"<>|]+/g, '') + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    },
    async signOutEverywhere(el) {
      const s = (state.staff || []).find((x) => x.employeeId === el.dataset.id) || {};
      if (!confirm(`Sign ${s.name || 'this colleague'} out of every phone and computer?\n\nUse this if they lost or changed their phone. They can then sign in again on their new device.`)) return;
      el.disabled = true;
      try {
        await api('signOutEverywhere', { employeeId: el.dataset.id });
        s.devices = [];
        toast('Signed out of all devices.');
        render();
      } catch (e) { showError(e); el.disabled = false; }
    },
    reloadMine() { PTR.run(); },
    editPost(el) { go('compose', { id: el.dataset.id }); },
    async setPostStatus(el) {
      const v = el.dataset.v;
      if (v === 'Removed' && !confirm('Hide this post from everyone’s feed? You can restore it later.')) return;
      el.disabled = true;
      try {
        await api('updatePost', { postId: el.dataset.id, post: { status: v } });
        toast(v === 'Removed' ? 'Post hidden.' : 'Post restored.');
        state.lastLoad = 0;
        await loadMyPosts();
      } catch (e) { showError(e); el.disabled = false; }
    },
    report(el) { state.report = null; go('report', { id: el.dataset.id }); },
    adminTab(el) { state.adminTab = el.dataset.v; render(); },
    addOutlet() {
      const box = document.getElementById('outlet-rows');
      const i = box.children.length;
      box.insertAdjacentHTML('beforeend', outletRow('', i));
      const inp = document.getElementById('outlet-' + i);
      if (inp) inp.focus();
    },
    removeOutlet(el) { el.closest('.row').remove(); },
    addDept() {
      const box = document.getElementById('dept-rows');
      const i = box.children.length;
      box.insertAdjacentHTML('beforeend', outletRow('', i, 'dept'));
      const inp = document.getElementById('dept-' + i);
      if (inp) inp.focus();
    },
    async logoTone(el) {
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      try {
        const j = await api('saveSettings', { logoTone: el.dataset.v });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        toast('Logo updated.');
        const y0 = window.scrollY; render(); window.scrollTo(0, y0);
      } catch (e) { showError(e); }
    },
    async removeOutletLogo(el) {
      if (!confirm('Remove the logo for ' + el.dataset.outlet + '?')) return;
      try {
        const logos = Object.assign({}, state.settings.outletLogos || {});
        delete logos[el.dataset.outlet];
        const j = await api('saveSettings', { outletLogos: logos });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        Share.current = null;
        render();
      } catch (e) { showError(e); }
    },
    async removeReportLogo() {
      if (!confirm('Remove the attendance sheet logo? The sheet will use the main logo.')) return;
      try {
        const j = await api('saveSettings', { reportLogo: '' });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        toast('Logo removed.');
        render();
      } catch (e) { showError(e); }
    },
    async removeLogo() {
      if (!confirm('Remove the hotel logo?')) return;
      try {
        const j = await api('saveSettings', { logo: '' });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        Share.current = null;
        toast('Logo removed.');
        render();
      } catch (e) { showError(e); }
    },
    async removeFont(el) {
      const slot = el.dataset.slot;
      if (!confirm(`Remove the ${FONT_SLOTS[slot].label} font? The app goes back to the built-in font.`)) return;
      el.disabled = true;
      try {
        const j = await api('removeFont', { slot });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        await Fonts.queue;
        toast('Font removed.');
        const y0 = window.scrollY; render(); window.scrollTo(0, y0);
      } catch (e) { showError(e); el.disabled = false; }
    },
    async deletePost(el) {
      const p = (state.myPosts || []).find((x) => x.id === el.dataset.id);
      if (!confirm(`Permanently delete “${p ? p.title : 'this post'}”?\n\nIt will be removed from the app and the sheet, with its read records. This cannot be undone.`)) return;
      el.disabled = true;
      try {
        await api('deletePost', { postId: el.dataset.id });
        state.myPosts = state.myPosts.filter((x) => x.id !== el.dataset.id);
        state.posts = state.posts.filter((x) => x.id !== el.dataset.id);
        LS.set('bb_posts', state.posts);
        toast('Post deleted.');
        render();
      } catch (e) { showError(e); el.disabled = false; }
    },
    mineStatus(el) { state.mineFilter.status = el.dataset.v; render(); },
    shareImage() { Share.send('image'); },
    achFmt(el) { if (Ach.fmt === el.dataset.v) return; Ach.fmt = el.dataset.v; render(); },
    achRetry() { Ach.failedKey = null; render(); },
    async achSend(el) {
      const p = state.posts.find((x) => x.id === el.dataset.id) || (state.myPosts || []).find((x) => x.id === el.dataset.id);
      if (p) await Ach.send(p);
    },
    retryShare() { Share.failedId = null; render(); },
    sharePdf() { Share.send('pdf'); },
    pushOnBanner() { Push.setOn(true); },
    bdayTemplate() {
      const csv = 'Employee ID,Name,Date of birth,Property,Department\n104582,Ana Kowalska,15/10/1990,DXBAI,Front Office\n';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'birthdays-template.csv';
      document.body.appendChild(a); a.click(); a.remove();
    },
    cancelImport() { state.bdayImport = null; render(); },
    async saveImport(el) {
      const mode = el.dataset.mode;
      const imp = state.bdayImport;
      if (!imp || !imp.good.length) return;
      if (mode === 'replace' && !confirm('Replace the whole birthday list with this file? Anyone not in the file will be removed.')) return;
      el.disabled = true;
      try {
        const j = await api('saveBirthdays', { rows: imp.good, mode });
        toast(`Saved: ${j.added} added, ${j.updated} updated.`);
        state.bdayImport = null; state.bdayList = null; state.lastLoad = 0;
        render(); loadFeed(true);
      } catch (e) { showError(e); el.disabled = false; }
    },
    async deleteBday(el) {
      if (!confirm('Remove this birthday?')) return;
      try {
        await api('deleteBirthday', { employeeId: el.dataset.id });
        state.bdayList = state.bdayList.filter((b) => b.employeeId !== el.dataset.id);
        render();
      } catch (e) { showError(e); }
    },
    async deleteQuote(el) {
      if (!confirm('Delete this quote?')) return;
      el.disabled = true;
      try {
        state.quoteList = (await api('deleteQuote', { date: el.dataset.v })).quotes || [];
        if (el.dataset.v === todayIso()) state.quote = null;
        render();
      } catch (e) { showError(e); el.disabled = false; }
    },
    blkAdd(el) {
      const ed = el.closest('.blk-editor');
      const t = el.dataset.v;
      ed.querySelector('.blk-list').insertAdjacentHTML('beforeend', Blocks.item(t === 'posts' ? { type: t, ids: [] } : { type: t }, ed.dataset.exclude));
      const last = ed.querySelector('.blk-list > .blk:last-child');
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const f = last.querySelector('input:not([type=hidden]):not([type=file]), textarea');
      if (f && t !== 'posts') setTimeout(() => f.focus(), 300);
      if (t === 'image') { const fi = last.querySelector('input[type=file]'); if (fi) fi.click(); }
    },
    blkMove(el) {
      const b = el.closest('.blk');
      if (el.dataset.v === '-1' && b.previousElementSibling) b.parentNode.insertBefore(b, b.previousElementSibling);
      else if (el.dataset.v === '1' && b.nextElementSibling) b.parentNode.insertBefore(b.nextElementSibling, b);
      b.classList.remove('blk-moved'); void b.offsetWidth; b.classList.add('blk-moved');
    },
    blkDel(el) {
      const b = el.closest('.blk');
      const filled = [...b.querySelectorAll('textarea, input[data-k], input[type=hidden]')].some((i) => i.value.trim()) || b.querySelector('[data-k=id]:checked');
      if (filled && !confirm('Remove this section?')) return;
      b.remove();
    },
    previewPopup(el) { showPopup(popupFromForm(el.closest('form')), true); },
    popupLink(el) {
      const form = el.closest('form');
      form.querySelector('input[name="linkType"]').value = el.dataset.v;
      el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      form.querySelector('#pp-post').hidden = el.dataset.v !== 'post';
      form.querySelector('#pp-web').hidden = el.dataset.v !== 'web';
    },
    async deletePopup(el) {
      if (!confirm('Delete this pop-up? This cannot be undone.')) return;
      el.disabled = true;
      try {
        const j = await api('deletePopup', { id: el.dataset.id });
        state.popupList = j.popups || [];
        toast('Pop-up deleted.');
        go('popups', {}, true);
      } catch (e) { showError(e); el.disabled = false; }
    },
    themePreset(el) {
      state.themeDraft = el.dataset.v;
      const y0 = window.scrollY; render(); window.scrollTo(0, y0);
    },
    async removeMyBday() {
      if (!confirm('Remove the birthday you added?')) return;
      try {
        const j = await api('setMyBirthday', { remove: true });
        state.myBdayInfo = j.myBirthdayInfo; LS.set('bb_my_bday', state.myBdayInfo);
        render(); loadFeed(true);
      } catch (e) { showError(e); }
    },
    async useSelfBday(el) {
      el.disabled = true;
      try {
        await api('saveBirthdays', { rows: [{ employeeId: el.dataset.id, day: +el.dataset.d, month: +el.dataset.m }], mode: 'merge' });
        toast('Birthday confirmed.');
        state.bdayList = null; render(); loadFeed(true);
      } catch (e) { showError(e); el.disabled = false; }
    },
    bdayCheck() { state.bdayCheckOnly = !state.bdayCheckOnly; render(); },
    pushLater() { LS.set('bb_push_later', Date.now()); render(); },
    reloadStaff() { PTR.run(); },
    reloadSetup() { PTR.run(); },
    adminSection(el) { state.adminSection = el.dataset.v; render(); },
    editCat(el) { go('category', { id: el.dataset.id || '' }); },
    addHome: async () => {
      if (state.installEvt) {
        state.installEvt.prompt();
        try { await state.installEvt.userChoice; } catch (e) { /* ignore */ }
        state.installEvt = null;
        render();
      } else {
        go('install');
      }
    },
    async removePhoto() {
      if (!confirm('Remove your profile photo?')) return;
      try {
        const j = await api('setPhoto', { remove: true });
        saveSession({ user: j.user, canPublish: state.canPublish });
        render();
      } catch (e) { showError(e); }
    },
    async removeHero() {
      if (!confirm('Remove the sign-in image?')) return;
      try {
        const j = await api('saveSettings', { heroImage: '' });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        render();
      } catch (e) { showError(e); }
    },
    async approve(el) {
      const id = el.dataset.id;
      const sel = app.querySelector(`select[data-role-for="${CSS.escape(id)}"]`);
      await setStaff(el, { employeeId: id, status: 'Approved', role: sel ? sel.value : 'Viewer' }, 'Approved.');
    },
    async setStatus(el) {
      const v = el.dataset.v;
      const msgs = { Declined: 'Decline this request?', Blocked: 'Remove this person’s access to the app?' };
      if (msgs[v] && !confirm(msgs[v])) return;
      await setStaff(el, { employeeId: el.dataset.id, status: v }, v === 'Approved' ? 'Access given.' : v === 'Declined' ? 'Request declined.' : 'Access removed.');
    },
    async saveRole(el) {
      const id = el.dataset.id;
      const sel = app.querySelector(`select[data-role-for="${CSS.escape(id)}"]`);
      await setStaff(el, { employeeId: id, role: sel.value }, 'Role updated.');
    },
    async resetPin(el) {
      if (!confirm('Reset this PIN? They will choose a new PIN the next time they sign in.')) return;
      el.disabled = true;
      try { await api('resetPin', { employeeId: el.dataset.id }); toast('PIN reset. They can set a new one at sign-in.'); }
      catch (e) { showError(e); }
      el.disabled = false;
    }
  };

  /** Re-runs the animation on the collection editor preview after a change. */
  function refreshPreview() {
    const prev = document.getElementById('coll-prev');
    const form = prev && prev.closest('.screen').querySelector('form');
    if (!prev || !form) return;
    prev.querySelectorAll('canvas').forEach((c) => c.remove());
    prev.setAttribute('data-fx', form.querySelector('input[name="animation"]').value);
    FX.stop();
    FX.start(app);
  }

  async function setStaff(el, data, okMsg) {
    el.disabled = true;
    try {
      await api('setStaff', data);
      toast(okMsg);
      const s = state.staff.find((x) => x.employeeId === data.employeeId);
      if (s) { if (data.role) s.role = data.role; if (data.status) s.status = data.status; }
      render();
    } catch (e) { showError(e); el.disabled = false; }
  }

  function formError(form, msg) {
    const box = form.querySelector('#form-error');
    if (!box) { toast(msg); return; }
    box.textContent = msg;
    box.hidden = false;
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function busy(form, on, label) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + (label ? ' ' + label : ''); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || 'Submit'; }
  }

  const FORMS = {
    async login(form) {
      const f = Object.fromEntries(new FormData(form));
      const id = String(f.employeeId || '').trim();
      if (!id) return formError(form, 'Please enter your Employee ID.');
      if (!/^\d{4}$/.test(f.pin || '')) return formError(form, 'Your PIN is 4 digits.');
      busy(form, true);
      try {
        const j = await api('login', { employeeId: id, pin: f.pin, device: deviceLabel() });
        LS.set('bb_last_id', id);
        if (j.status === 'SignedInElsewhere') {
          busy(form, false);
          const where = j.device ? 'on ' + (/^(iPhone|iPad|Mac)$/.test(j.device) ? 'an ' : 'a ') + j.device : 'on another device';
          const since = j.since ? ' since ' + dmy(new Date(j.since)) : '';
          formError(form, `You’re already signed in ${where}${since}. Please sign out on that device first (Profile › Sign out), then try again. Lost or changed your phone? Ask your Admin to sign you out of all devices.`);
          return;
        }
        if (j.status !== 'Approved') {
          state.pendingStatus = j.status;
          go('pending', {}, true);
          return;
        }
        saveSession(j);
        setCategories(j.categories);
        state.lastLoad = 0;
        state.openedAt = Date.now(); state.popupScheduled = false;
        Push.tag();
        if (!isStandalone() && !LS.get('bb_install_seen')) go('install', {}, true);
        else go('today', {}, true);
        // Notifications are on by default: ask straight away (sign-in is a tap, which browsers require).
        if (CONFIG.oneSignalAppId && !LS.get('bb_push_off') && !(isIOS() && !isStandalone()) && Push.permission() === 'default') Push.setOn(true);
        toast('Welcome, ' + firstName(j.user && j.user.name) + '!');
      } catch (e) {
        busy(form, false);
        formError(form, e.message);
      }
    },
    async quote(form) {
      const f = Object.fromEntries(new FormData(form));
      if (!f.date) return formError(form, 'Please choose a date.');
      if (!String(f.text || '').trim()) return formError(form, 'Please write the quote.');
      busy(form, true);
      try {
        state.quoteList = (await api('saveQuote', { date: f.date, text: f.text.trim(), author: (f.author || '').trim() })).quotes || [];
        if (f.date === todayIso()) state.quote = { text: f.text.trim(), author: (f.author || '').trim() };
        toast('Quote saved.');
        render();
      } catch (e) { busy(form, false); formError(form, e.message); }
    },
    async myPosition(form) {
      const f = Object.fromEntries(new FormData(form));
      busy(form, true);
      try {
        const j = await api('setMyPosition', { position: (f.position || '').trim() });
        if (j.user) { state.user = Object.assign({}, state.user, { position: j.user.position }); LS.set('bb_user', state.user); }
        toast('Job title saved.');
        render();
      } catch (e) { busy(form, false); formError(form, e.message); }
    },
    async signup(form) {
      const f = Object.fromEntries(new FormData(form));
      if (!String(f.employeeId || '').trim()) return formError(form, 'Please enter your Employee ID.');
      if (String(f.name || '').trim().length < 2) return formError(form, 'Please enter your full name.');
      if (!f.department) return formError(form, 'Please choose your department.');
      if (!state.signupProperty) return formError(form, 'Please choose your property.');
      if (!/^\d{4}$/.test(f.pin || '')) return formError(form, 'Your PIN must be 4 digits.');
      if (f.pin !== f.pin2) return formError(form, 'The two PINs don’t match.');
      if (/^(\d)\1{3}$/.test(f.pin) || f.pin === '1234') return formError(form, 'Please choose a less obvious PIN.');
      busy(form, true);
      try {
        await api('signup', { employeeId: f.employeeId.trim(), name: f.name.trim(), department: f.department, position: (f.position || '').trim(), property: state.signupProperty, pin: f.pin });
        LS.set('bb_last_id', f.employeeId.trim());
        state.pendingStatus = 'Pending';
        go('pending', {}, true);
      } catch (e) {
        busy(form, false);
        formError(form, e.message);
      }
    },
    async changePin(form) {
      const f = Object.fromEntries(new FormData(form));
      if (!/^\d{4}$/.test(f.oldPin || '') || !/^\d{4}$/.test(f.newPin || '')) return formError(form, 'Both PINs must be 4 digits.');
      if (/^(\d)\1{3}$/.test(f.newPin) || f.newPin === '1234') return formError(form, 'Please choose a less obvious PIN.');
      busy(form, true);
      try {
        await api('changePin', { oldPin: f.oldPin, newPin: f.newPin });
        form.reset();
        form.querySelector('#form-error').hidden = true;
        toast('PIN updated.');
      } catch (e) { formError(form, e.message); }
      busy(form, false);
    },
    async post(form) {
      if (form.querySelector('[data-uploading="1"]')) return formError(form, 'Please wait for the upload to finish.');
      const f = Object.fromEntries(new FormData(form));
      const id = form.dataset.id;
      const category = form.dataset.cat;
      const ctype = catOf(category).type;
      if (ctype === 'people') {
        if (!String(f.personName || '').trim() && !String(f.personId || '').trim()) return formError(form, 'Please enter the colleague’s name or Employee ID.');
        f.title = String(f.personName || f.title || '').trim();
      } else if (!String(f.title || '').trim()) return formError(form, 'Please add a title.');
      if (ctype === 'training' && !f.eventDate) return formError(form, 'Please choose the training date.');
      if (ctype === 'training' && f.timeFrom && f.timeTo && f.timeTo < f.timeFrom) return formError(form, 'The end time is before the start time.');
      if (['offer', 'people', 'training'].indexOf(ctype) < 0 && !String(f.message || '').trim()) return formError(form, 'Please write a message.');
      if (f.start && f.end && f.end < f.start) return formError(form, 'The “Until” date is before the “Show from” date.');
      const post = {
        category,
        title: f.title.trim(),
        message: f.message || '',
        property: f.property || 'Cluster',
        start: f.start || '',
        end: f.end || '',
        pinned: !!f.pinned,
        sendPush: !!f.sendPush,
        image: f.image || '',
        menu: f.menu || '',
        attachment: f.attachment || ''
      };
      if ('collection' in f) { post.collection = f.collection || ''; post.collectionOnly = !!(f.collection && f.collectionOnly); }
      if (form.querySelector('[name=messageBox]')) post.plainText = !f.messageBox;
      if (form.querySelector('.blk-editor')) post.blocks = Blocks.read(form);
      if (ctype === 'monthly') {
        post.includes = [...new Set(post.blocks.filter((b) => b.type === 'posts').reduce((acc, b) => acc.concat(b.ids), []))];
        if (canCollect()) post.shareable = !!f.shareable;
      }
      if (ctype === 'monthly') Object.assign(post, { style: f.style || 'Regular', themeColor: f.style === 'Regular' ? '' : (f.themeColor || ''), animation: f.style === 'Regular' ? 'none' : (f.animation || 'none') });
      if (ctype === 'people') {
        if (isAward(catOf(category)) && !f.subtitle) return formError(form, 'Please choose the award.');
        Object.assign(post, { personName: (f.personName || '').trim(), personId: (f.personId || '').trim(), position: f.position || '', subtitle: f.subtitle || '' });
      }
      if (ctype === 'training') {
        Object.assign(post, {
          eventDate: f.eventDate,
          timing: f.timeFrom ? f.timeFrom + (f.timeTo ? '–' + f.timeTo : '') : (f.timingRaw || ''),
          location: (f.location || '').trim(),
          personName: (f.personName || '').trim(),
          personId: (f.personId || '').trim()
        });
      }
      if (ctype === 'offer') {
        Object.assign(post, {
          outlet: f.outlet || '',
          price: f.price || '',
          timing: f.timing || '',
          days: f.days || '',
          ctaText: f.ctaText || '',
          ctaLink: f.ctaLink || '',
          inclusions: String(f.inclusions || '').split('\n').map((s) => s.trim()).filter(Boolean),
          serves: f.serves || '',
          terms: (f.terms || '').trim(),
          todaySpecial: false
        });
      }
      if (ctype !== 'training') {
        const sm = f.specialMode || 'off';
        const sdays = [...form.querySelectorAll('input[name="specialDays"]:checked')].map((i) => i.value);
        if (sm === 'date' && !f.specialDate) return formError(form, 'Please choose the date for Today’s Special.');
        if (sm === 'weekly' && !sdays.length) return formError(form, 'Please choose at least one day of the week for Today’s Special.');
        post.specialDate = sm === 'date' ? f.specialDate : '';
        post.specialRepeat = sm === 'weekly' ? 'weekly:' + sdays.join(',') : sm === 'monthly' ? 'monthly:' + (f.specialMonthDay || 1) : sm;
        if (post.specialDate && ((f.start && post.specialDate < f.start) || (f.end && post.specialDate > f.end))) return formError(form, 'The Today’s Special date is outside the “Show from / Until” dates.');
      }
      if (ctype !== 'offer') post.priority = f.priority || 'Normal';
      busy(form, true, id ? 'Saving' : 'Publishing');
      try {
        const j = id ? await api('updatePost', { postId: id, post }) : await api('createPost', { post });
        state.lastLoad = 0;
        state.myPosts = null;
        toast((id ? 'Saved.' : 'Published.') + (post.sendPush ? (j.pushed ? ' Alert sent.' : (CONFIG.oneSignalAppId ? ' The alert could not be sent.' : '')) : ''));
        const grp = catOf(category).group;
        if (id) back('myposts'); else go(grp === 'hr' ? 'hr' : grp === 'marketing' ? 'offers' : 'feed', {}, true);
        loadFeed(true);
      } catch (e) {
        busy(form, false);
        formError(form, e.message);
      }
    }
  };

  FORMS.outlets = async (form) => {
    const outlets = [...form.querySelectorAll('input[name="outlet"]')].map((i) => i.value.trim()).filter(Boolean);
    if (!outlets.length) return formError(form, 'Please keep at least one outlet.');
    busy(form, true);
    try {
      const j = await api('saveOutlets', { outlets });
      state.adminOutlets = j.outlets;
      state.lists = Object.assign({}, state.lists || { departments: [] }, { outlets: j.outlets });
      LS.set('bb_lists', state.lists);
      toast('Outlets saved.');
      render();
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.reset = async (form) => {
    const f = Object.fromEntries(new FormData(form));
    const categories = [...form.querySelectorAll('input[name="cat"]:checked')].map((i) => i.value);
    const pick = { categories, popups: !!f.popups, collections: !!f.collections, birthdays: !!f.birthdays, staff: !!f.staff };
    if (!categories.length && !pick.popups && !pick.collections && !pick.birthdays && !pick.staff) return formError(form, 'Tick what you want to delete.');
    if (String(f.confirm || '').trim().toUpperCase() !== 'RESET') return formError(form, 'Type RESET to confirm.');
    const names = categories.map((id) => catOf(id).label).concat(pick.popups ? ['Pop-ups'] : [], pick.collections ? ['Special collections'] : [], pick.birthdays ? ['Birthday list'] : [], pick.staff ? ['Team accounts (except Admins)'] : []);
    if (!confirm('Permanently delete:\n\n• ' + names.join('\n• ') + '\n\nThis cannot be undone.')) return;
    busy(form, true, 'Deleting');
    try {
      const j = await api('resetContent', Object.assign({ confirm: 'RESET' }, pick));
      const r = j.removed || {};
      const bits = [];
      if (r.posts !== undefined) bits.push(r.posts + ' posts');
      if (r.popups !== undefined) bits.push(r.popups + ' pop-ups');
      if (r.collections !== undefined) bits.push(r.collections + ' collections');
      if (r.birthdays !== undefined) bits.push(r.birthdays + ' birthdays');
      if (r.staff !== undefined) bits.push(r.staff + ' accounts');
      toast('Deleted ' + (bits.join(', ') || 'nothing') + '.');
      Object.assign(state, { posts: [], myPosts: null, popupList: null, adminColls: null, bdayList: null, staff: null, lastLoad: 0 });
      LS.del('bb_posts');
      render();
      loadFeed(true);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.departments = async (form) => {
    const departments = [...form.querySelectorAll('input[name="dept"]')].map((i) => i.value.trim()).filter(Boolean);
    if (!departments.length) return formError(form, 'Please keep at least one department.');
    busy(form, true);
    try {
      const j = await api('saveDepartments', { departments });
      state.adminDepts = j.departments;
      state.lists = Object.assign({}, state.lists || { outlets: [] }, { departments: j.departments });
      LS.set('bb_lists', state.lists);
      toast('Departments saved.');
      render();
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.hotels = async (form) => {
    if (form.querySelector('[data-uploading="1"]')) return formError(form, 'Please wait for the upload to finish.');
    const f = Object.fromEntries(new FormData(form));
    const hotels = {};
    ['DXBAI', 'DXBPI', 'Cluster'].forEach((k) => {
      hotels[k] = { name: (f['name-' + k] || '').trim(), address: (f['address-' + k] || '').trim(), phone: (f['phone-' + k] || '').trim(),
        email: (f['email-' + k] || '').trim(), website: (f['website-' + k] || '').trim(), logo: f['hlogo-' + k] || '' };
    });
    busy(form, true);
    try {
      const j = await api('saveSettings', { hotels });
      if (!j.brand || !j.brand.hotels) throw new Error('The backend needs updating: paste the new Code.gs into Apps Script, then Deploy › Manage deployments › Edit › New version › Deploy.');
      setSettings({ heroImage: j.heroImage || '' }, j.brand);
      Share.current = null;
      toast('Hotels saved.');
      busy(form, false);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.collection = async (form) => {
    if (form.querySelector('[data-uploading="1"]')) return formError(form, 'Please wait for the upload to finish.');
    const f = Object.fromEntries(new FormData(form));
    if (!String(f.name || '').trim()) return formError(form, 'Please give the collection a name.');
    if (f.start && f.end && f.end < f.start) return formError(form, 'The “Until” date is before the “Show from” date.');
    const collection = { id: form.dataset.id || undefined, name: f.name.trim(), color: f.color, animation: f.animation, banner: f.banner || '', start: f.start || '', end: f.end || '', active: !!f.active, blocks: Blocks.read(form) };
    busy(form, true);
    try {
      const j = await api('saveCollection', { collection });
      state.adminColls = j.collections || [];
      toast(collection.id ? 'Collection saved.' : 'Collection created.');
      state.lastLoad = 0;
      go('collections', {}, true);
      loadFeed(true);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.lastDay = async (form) => {
    const date = String(new FormData(form).get('date') || '');
    if (!date) return formError(form, 'Please choose the last working day.');
    if (date < todayIso()) return formError(form, 'The last working day can’t be in the past.');
    const x = (state.leavers || []).find((p) => p.employeeId === form.dataset.id) || {};
    if (!confirm(`${x.name}’s access will end on ${longDate(date)} at 6:00 pm.\n\nSave?`)) return;
    busy(form, true);
    try {
      await api('setLastDay', { employeeId: form.dataset.id, date });
      x.lastDay = date;
      state.leaverQuery = ''; state.leaverOpen = '';
      toast('Last working day saved.');
      render();
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.checkinCode = async (form) => {
    const code = String(new FormData(form).get('code') || '').replace(/\D/g, '');
    if (code.length !== 6) return formError(form, 'Please type the 6-digit code on the trainer’s screen.');
    busy(form, true);
    const msg = document.getElementById('scan-msg');
    await submitCheckin(form.dataset.id, code, 'code');
    if (state.route.name === 'checkin') { busy(form, false); if (msg) formError(form, msg.textContent); }
  };

  FORMS.popup = async (form) => {
    if (form.querySelector('[data-uploading="1"]')) return formError(form, 'Please wait for the upload to finish.');
    const popup = popupFromForm(form);
    if (!popup.title) return formError(form, 'Please give the pop-up a title.');
    if (popup.buttonText && !popup.buttonLink) return formError(form, 'Choose what the button opens, or clear the button text.');
    if (popup.start && popup.end && popup.end < popup.start) return formError(form, 'The “Until” date is before the “Show from” date.');
    busy(form, true);
    try {
      const j = await api('savePopup', { popup });
      state.popupList = j.popups || [];
      toast(popup.id ? 'Pop-up saved.' : 'Pop-up created.');
      go('popups', {}, true);
      loadFeed(true);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.theme = async (form) => {
    const f = Object.fromEntries(new FormData(form));
    if (f.start && f.end && f.end < f.start) return formError(form, 'The “Until” date is before the “From” date.');
    const base = THEMES[f.preset] || THEMES.default;
    const theme = f.preset === 'default' ? { preset: 'default' } : {
      preset: f.preset, primary: (f.primary || '').toUpperCase(), accent: (f.accent || '').toUpperCase(), background: (f.background || '').toUpperCase(),
      animation: f.animation || base.animation, greeting: (f.greeting || '').trim(), start: f.start || '', end: f.end || ''
    };
    busy(form, true);
    try {
      const j = await api('saveSettings', { theme });
      if (!j.theme) throw new Error('The theme could not be saved: the Apps Script backend needs updating to version 1.6 (Deploy › Manage deployments › Edit › New version).');
      state.adminTheme = j.theme; state.themeDraft = null;
      setTheme(Object.assign({ saved: true }, j.theme));
      toast(theme.preset === 'default' ? 'Classic look restored.' : j.theme.live ? 'Theme is live.' : 'Theme saved and scheduled.');
      render();
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.myBirthday = async (form) => {
    const f = Object.fromEntries(new FormData(form));
    const day = Number(f.day), month = Number(f.month);
    if (!day || !month) return formError(form, 'Please choose the day and month.');
    if (day > new Date(2024, month, 0).getDate()) return formError(form, 'That date doesn’t exist.');
    busy(form, true);
    try {
      const j = await api('setMyBirthday', { day, month });
      state.myBdayInfo = j.myBirthdayInfo; LS.set('bb_my_bday', state.myBdayInfo);
      toast('Birthday saved.');
      render(); loadFeed(true);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.birthday = async (form) => {
    const f = Object.fromEntries(new FormData(form));
    const id = String(f.employeeId || '').trim();
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(f.date || '');
    if (!id) return formError(form, 'Please enter the Employee ID.');
    if (!m) return formError(form, 'Please choose the birthday.');
    busy(form, true);
    try {
      await api('saveBirthdays', { rows: [{ employeeId: id, name: f.name || '', day: +m[2], month: +m[1] }], mode: 'merge' });
      toast('Birthday saved.');
      state.bdayList = null; state.lastLoad = 0;
      render(); loadFeed(true);
    } catch (e) { busy(form, false); formError(form, e.message); }
  };

  FORMS.category = async (form) => {
    const f = Object.fromEntries(new FormData(form));
    if (!String(f.label || '').trim()) return formError(form, 'Please give the category a name.');
    const category = {
      id: form.dataset.id || undefined,
      label: f.label.trim(),
      type: f.type,
      color: f.color,
      group: f.group,
      roles: ['HR', 'Marketing'].filter((r) => f['role_' + r]),
      ack: !!f.ack,
      active: !!f.active,
      subcategories: f.type === 'people' ? [...form.querySelectorAll('input[name="sub"]')].map((i) => i.value.trim()).filter(Boolean) : []
    };
    busy(form, true);
    try {
      const j = await api('saveCategory', { category });
      state.adminCats = j.categories || [];
      setCategories(state.adminCats.filter((c) => c.active));
      toast(category.id ? 'Category saved.' : 'Category added.');
      state.lastLoad = 0;
      back('adminSetup');
      loadFeed(true);
    } catch (e) {
      busy(form, false);
      formError(form, e.message);
    }
  };

  const CHANGE = {
    themePrev(el) {
      const prev = el.closest('form').querySelector('.theme-prev');
      if (prev) prev.style.setProperty({ primary: '--p', accent: '--a', background: '--b' }[el.name], el.value);
    },
    pushToggle(el) { Push.setOn(el.checked); },
    specialMode(el) { el.closest('.card').querySelectorAll('[data-sm]').forEach((n) => { n.hidden = n.dataset.sm !== el.value; }); },
    collPick(el) { const r = document.getElementById('coll-only'); if (r) r.hidden = !el.value; },
    sounds(el) { LS.set('bb_sounds', !!el.checked); if (el.checked) { Sound.unlock(); Sound.play('none'); } toast(el.checked ? 'Sounds on.' : 'Sounds off.'); },
    haptics(el) { LS.set('bb_haptics', !!el.checked); if (el.checked) Haptics.decorate(document.body); else Haptics.strip(); toast(el.checked ? 'Haptic feedback on.' : 'Haptic feedback off.'); render(); },
    customColor(el) {
      const box = el.closest('.field') || el.closest('form');
      box.querySelector(`input[type=hidden][name="${el.dataset.name}"]`).value = el.value.toUpperCase();
      const lab = el.parentElement;
      lab.parentElement.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      lab.style.background = el.value; lab.style.boxShadow = '0 0 0 3px var(--navy)';
      if (lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.remove();
      const prev = document.getElementById('coll-prev'); if (prev && el.dataset.name === 'color') prev.style.setProperty('--bg', el.value);
    },
    async bdayCsv(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      if (/\.xlsx?$/i.test(file.name)) { toast('Please save the Excel file as CSV first (File › Save As › CSV UTF-8).'); el.value = ''; return; }
      const text = await file.text();
      state.bdayImport = importRows(text);
      if (!state.bdayImport.good.length) { toast('No valid rows found. Check the columns: Employee ID, Name, Date of birth.'); state.bdayImport = null; }
      render();
    },
    async photo(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      state.photoBusy = true;
      render();
      try {
        const payload = await filePayload(file, 600);
        const j = await api('setPhoto', payload);
        saveSession({ user: j.user, canPublish: state.canPublish });
        toast('Photo updated.');
      } catch (e) { showError(e); }
      state.photoBusy = false;
      render();
    },
    async hero(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const label = document.getElementById('hero-label');
      if (label) label.textContent = 'Uploading…';
      try {
        const payload = await filePayload(file, 1800);
        const up = await api('uploadFile', payload);
        const j = await api('saveSettings', { heroImage: up.url });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        toast('Sign-in image updated.');
      } catch (e) { showError(e); }
      render();
    },
    async logo(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const label = document.getElementById('logo-label');
      if (label) label.textContent = 'Uploading…';
      try {
        const payload = await logoPayload(file);
        const up = await api('uploadFile', payload);
        const j = await api('saveSettings', { logo: up.url });
        if (!j.brand) throw new Error('The backend needs updating to version 1.9: paste the new Code.gs into Apps Script, then Deploy › Manage deployments › Edit › New version › Deploy.');
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        Share.current = null;
        toast('Logo updated. Check how it looks on both backgrounds.');
      } catch (e) { showError(e); }
      render();
    },
    async outletLogo(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const lab = el.parentElement; lab.firstChild.textContent = 'Uploading…';
      try {
        const up = await api('uploadFile', await logoPayload(file));
        const logos = Object.assign({}, state.settings.outletLogos || {}, { [el.dataset.outlet]: up.url });
        const j = await api('saveSettings', { outletLogos: logos });
        if (!j.brand || !j.brand.outletLogos) throw new Error('The backend needs updating: paste the new Code.gs into Apps Script, then Deploy › Manage deployments › Edit › New version › Deploy.');
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        Share.current = null;
        toast('Logo saved for ' + el.dataset.outlet + '.');
      } catch (e) { showError(e); }
      render();
    },
    async reportLogo(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const label = document.getElementById('rlogo-label');
      if (label) label.textContent = 'Uploading…';
      try {
        const payload = await logoPayload(file);
        const up = await api('uploadFile', payload);
        const j = await api('saveSettings', { reportLogo: up.url });
        if (!j.brand || !('reportLogo' in j.brand)) throw new Error('The backend needs updating: paste the new Code.gs into Apps Script, then Deploy › Manage deployments › Edit › New version › Deploy.');
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        toast('Attendance sheet logo saved.');
      } catch (e) { showError(e); }
      render();
    },
    async fontUpload(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const slot = el.dataset.slot;
      const label = document.getElementById('font-label-' + slot);
      const ext = (/\.(woff2|woff|ttf|otf)$/i.exec(file.name) || [])[1];
      el.value = '';
      if (!ext) { toast('Please choose a WOFF2, WOFF, TTF or OTF font file.'); return; }
      if (file.size > 2 * 1024 * 1024) { toast('That font file is too large (2 MB maximum). A WOFF2 file is usually much smaller.'); return; }
      if (label) label.textContent = 'Uploading…';
      try {
        const buf = await file.arrayBuffer();
        // Check it opens as a font before sending it to everyone.
        try { await new FontFace('FontCheck', buf).load(); } catch (e) { throw new Error('That file could not be opened as a font. Please try another file.'); }
        const d = await readAsDataUrl(file);
        const j = await api('uploadFont', { slot, name: file.name, data: d.split(',')[1] });
        setSettings({ heroImage: j.heroImage || '' }, j.brand);
        await Fonts.queue;
        toast(FONT_SLOTS[slot].label + ' font updated.');
      } catch (e) { showError(e); }
      const y0 = window.scrollY; render(); window.scrollTo(0, y0);
    },
    async upload(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const form = el.closest('form');
      const label = document.getElementById(el.dataset.label);
      const hidden = form.querySelector(`input[name="${el.dataset.target}"]`);
      el.dataset.uploading = '1';
      label.textContent = 'Uploading…';
      try {
        // Logos keep their transparent background (PNG); photos are made smaller as JPEG.
        const payload = el.dataset.noun === 'logo' ? await logoPayload(file) : await filePayload(file);
        const j = await api('uploadFile', payload);
        hidden.value = j.url;
        label.textContent = el.dataset.noun ? 'Change ' + el.dataset.noun : 'File attached · tap to replace';
        const rm = form.querySelector(`[data-remove-for="${el.dataset.target}"]`);
        if (rm) rm.hidden = false;
        if (el.dataset.box) {
          const box = document.getElementById(el.dataset.box);
          let img = box.querySelector('img');
          if (!img) { img = document.createElement('img'); img.alt = ''; box.prepend(img); }
          img.src = URL.createObjectURL(file);
          const svg = box.querySelector('svg');
          if (svg) svg.remove();
        }
        if (typeof ComposePreview !== 'undefined') ComposePreview.schedule();
      } catch (e) {
        label.textContent = 'Upload failed · tap to try again';
        showError(e);
      } finally {
        el.dataset.uploading = '';
        el.value = '';
      }
    }
  };

  const INPUT = {
    leaverSearch(el) {
      state.leaverQuery = el.value;
      const pos = el.selectionStart;
      render();
      const n = document.getElementById('lq');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
    },
    bdaySearch(el) {
      state.bdayQuery = el.value;
      const pos = el.selectionStart;
      render();
      const n = document.getElementById('bq');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
    },
    collName(el) { const n = document.getElementById('coll-prev-name'); if (n) n.textContent = el.value || 'Festive Season'; },
    mineSearch(el) {
      state.mineFilter.q = el.value;
      const box = document.getElementById('mine-list');
      if (box) box.innerHTML = myPostsList();
    },
    search(el) {
      state.filter.q = el.value;
      refreshFeedArea();
    },
    staffSearch(el) {
      state.staffQuery = el.value;
      const pos = el.selectionStart;
      render();
      const n = document.getElementById('sq');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
    }
  };

  /* ---------------- Haptic feedback ----------------
   * A light tick on every tap, like the phone keyboard. Android: the vibration motor.
   * iPhone (iOS 18 and later): Safari has no vibration API, but toggling a native switch plays the system haptic,
   * so each tap flips a hidden switch. Turn it off in Profile › Haptic feedback. */
  /*
   * Pop-up sounds, made on the phone with Web Audio (no sound files to download).
   * Phones only allow sound after the person has touched the screen once, so the first touch "unlocks" it.
   * On iPhone the silent switch mutes these sounds, as it should.
   */
  const Sound = {
    ctx: null, out: null,
    on() { return LS.get('bb_sounds') !== false; },
    unlock() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!this.ctx) {
          this.ctx = new AC();
          const comp = this.ctx.createDynamicsCompressor();
          this.out = this.ctx.createGain();
          this.out.gain.value = 0.45;
          this.out.connect(comp); comp.connect(this.ctx.destination);
        }
        if (this.ctx.state !== 'running') this.ctx.resume();
        const b = this.ctx.createBufferSource();
        b.buffer = this.ctx.createBuffer(1, 1, 22050);
        b.connect(this.ctx.destination); b.start(0);
      } catch (e) { /* no sound on this phone */ }
    },
    ready() { return !!this.ctx && this.on(); },
    env(g, t, peak, a, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    },
    tone(f, t, d, o) {
      o = o || {};
      const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
      this.env(g, t, o.gain || 0.2, o.a || 0.005, d);
      osc.connect(g);
      if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; g.connect(f2); f2.connect(this.out); } else g.connect(this.out);
      osc.start(t); osc.stop(t + (o.a || 0.005) + d + 0.05);
    },
    bell(f, t, d, gain) {
      this.tone(f, t, d, { gain: gain });
      this.tone(f * 2.76, t, d * 0.45, { gain: gain * 0.28 });
      this.tone(f * 5.4, t, d * 0.2, { gain: gain * 0.12 });
    },
    noise(t, d, o) {
      o = o || {};
      const c = this.ctx, len = Math.max(1, Math.floor(c.sampleRate * (d + 0.1)));
      const buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf;
      flt.type = o.filter || 'bandpass'; flt.Q.value = o.q || 1;
      flt.frequency.setValueAtTime(o.f || 1500, t);
      if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + d);
      this.env(g, t, o.gain || 0.2, o.a || 0.004, d);
      src.connect(flt); flt.connect(g); g.connect(this.out);
      src.start(t); src.stop(t + d + 0.1);
    },
    rnd(a, b) { return a + Math.random() * (b - a); },
    /** kind: an animation name (confetti, sparkle, fireworks, snow, lights) or 'none' for a soft chime. */
    play(kind) {
      if (!this.ready()) return;
      try {
        if (this.ctx.state !== 'running') this.ctx.resume();
        const t = this.ctx.currentTime + 0.05;
        (this.KINDS[kind] || this.KINDS.none).call(this, t);
      } catch (e) { /* ignore */ }
    },
    KINDS: {
      // Party popper: a pop, a thump, a bright run up and the paper fluttering down.
      confetti(t) {
        this.noise(t, 0.07, { f: 1900, q: 0.8, gain: 0.55, a: 0.002 });
        this.tone(190, t, 0.14, { to: 55, gain: 0.45, a: 0.002 });
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, t + 0.08 + i * 0.06, 0.32, { type: 'triangle', gain: 0.1 }));
        for (let i = 0; i < 18; i++) this.noise(t + 0.15 + this.rnd(0, 0.9), 0.025, { f: this.rnd(3000, 7000), q: 6, gain: this.rnd(0.03, 0.08) * (1 - i / 22) });
      },
      // Twinkling chimes, high and light.
      sparkle(t) {
        const notes = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
        for (let i = 0; i < 9; i++) this.bell(notes[Math.floor(Math.random() * notes.length)], t + i * 0.11 + this.rnd(0, 0.05), 0.9, 0.07 * (1 - i / 14));
        this.tone(523, t, 1.4, { type: 'sine', gain: 0.04, a: 0.25 });
      },
      // A rocket whoosh, a boom and crackles, then a second smaller one.
      fireworks(t) {
        const shot = (s, size) => {
          this.noise(s, 0.55, { filter: 'highpass', f: 500, to: 3200, gain: 0.12 * size, a: 0.45 });
          this.tone(110, s + 0.58, 0.9, { to: 38, gain: 0.55 * size, a: 0.004 });
          this.noise(s + 0.58, 0.8, { filter: 'lowpass', f: 900, to: 120, gain: 0.4 * size, a: 0.004 });
          for (let i = 0; i < 26; i++) this.noise(s + 0.75 + this.rnd(0, 0.9), 0.012, { f: this.rnd(2500, 6500), q: 4, gain: this.rnd(0.05, 0.14) * size });
        };
        shot(t, 1); shot(t + 1.1, 0.6);
      },
      // A soft music box, falling slowly, over a breath of wind.
      snow(t) {
        this.noise(t, 2, { filter: 'lowpass', f: 600, to: 300, gain: 0.05, a: 0.8 });
        [1568, 1319, 1175, 1047, 1319, 1568].forEach((f, i) => this.bell(f, t + i * 0.26, 1.3, 0.08));
      },
      // A warm chord that glows in, with a glint on top.
      lights(t) {
        [220, 277, 330, 440].forEach((f) => this.tone(f, t, 1.6, { type: 'triangle', gain: 0.07, a: 0.45, lp: 1600 }));
        this.bell(1760, t + 0.5, 1.2, 0.06);
        this.bell(2637, t + 0.75, 1, 0.045);
      },
      // A simple two-note chime.
      none(t) {
        this.bell(1319, t, 0.9, 0.12);
        this.bell(1976, t + 0.14, 1.1, 0.1);
      }
    }
  };
  ['touchend', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (!Sound.ctx || Sound.ctx.state !== 'running') Sound.unlock(); }, { passive: true, capture: true }));

  const Haptics = {
    el: null,
    busy: false,
    on() { return LS.get('bb_haptics') !== false; },
    /** iPhone: a fresh, hidden native switch is added, clicked and removed within the tap (this is what plays the haptic). */
    iosTick() {
      const label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.className = 'haptic-proxy';
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click();
      document.head.removeChild(label);
    },
    tap(force) {
      if ((!this.on() && !force) || this.busy) return;
      this.busy = true;
      try {
        if (navigator.vibrate && !isIOS()) navigator.vibrate(12);
        else this.iosTick();
      } catch (e) { /* not supported on this phone */ }
      this.busy = false;
    },
    /*
     * iPhone (iOS 26.5 and later only give a haptic when a finger itself toggles a native switch):
     * every button gets an invisible switch laid over it. The finger toggles that switch (the phone ticks),
     * then the tap is passed on to the button so it works as normal.
     */
    // Only buttons and small controls. Never cards, list rows or anything in a swipeable row: a switch under the finger
    // would hold on to the touch, so scrolling or swiping that starts on a post would not move the page.
    HOSTS: '.nav button, .btn, .icon-btn, .chip, .seg button, .link-btn, .fab, .swatch, .choice, .look-opt, .lnd-grid button, .remove-btn',
    NO_HOST: '.hrow, .pgrid, .list > .pcard, .hc, .pcard, .ocard, .mcard, .tcard, .coll-tile, .set-row, .me-row, .face-stack, .pick',
    decorate(root) {
      if (!isIOS() || !this.on()) return;
      (root || document).querySelectorAll(this.HOSTS).forEach((h) => {
        if (h.dataset.hap || h.matches('label, input, select, textarea, .haptic-proxy') || h.closest('label') || h.closest(this.NO_HOST) || h.querySelector('input, select, textarea')) return;
        h.dataset.hap = '1';
        if (getComputedStyle(h).position === 'static') h.style.position = 'relative';
        const sw = document.createElement('input');
        sw.type = 'checkbox';
        sw.setAttribute('switch', '');
        sw.className = 'hap-ov';
        sw.tabIndex = -1;
        sw.setAttribute('aria-hidden', 'true');
        h.appendChild(sw);
      });
    },
    strip() { document.querySelectorAll('.hap-ov').forEach((x) => { const h = x.parentElement; x.remove(); if (h) delete h.dataset.hap; }); }
  };
  if (isIOS()) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; Haptics.decorate(document.body); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  const TAPPABLE = 'button, a[href], [data-act], [data-to], .chip, .swatch, .switch, .set-row, .me-row, .check-row, .choice, .upload, .photo-edit, select, input[type="checkbox"], input[type="radio"], input[type="file"], input[type="date"], input[type="time"], input[type="color"], summary';
  document.addEventListener('click', (e) => {
    // A finger on the invisible switch: the phone has ticked; now pass the tap on to the button itself.
    if (e.target.classList && e.target.classList.contains('hap-ov')) {
      e.stopImmediatePropagation();
      const host = e.target.parentElement;
      if (host && !host.disabled) { Haptics.busy = true; try { host.click(); } finally { Haptics.busy = false; } }
      return;
    }
    if (Haptics.busy || (e.target.closest && e.target.closest('.haptic-proxy'))) return;
    const el = e.target.closest && e.target.closest(TAPPABLE);
    if (!el || el.disabled) return;
    // Native switches already tick on iPhone; avoid a double tick.
    if (isIOS() && el.matches('input[type="checkbox"][switch], .switch, .switch *')) return;
    Haptics.tap();
  }, true);

  /* ---------------- Event wiring ---------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !(app.contains(el) || el.closest('.tr-fixed'))) return;
    const fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = FORMS[form.dataset.form];
    if (fn) fn(form);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && INPUT[el.dataset.input]) INPUT[el.dataset.input](el, e);
  });
  // Enter in a "Find" field runs the search instead of submitting the form.
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('[data-enter]');
    if (!el || e.key !== 'Enter') return;
    e.preventDefault();
    const btn = el.closest('.row') && el.closest('.row').querySelector('[data-act="' + el.dataset.enter + '"]');
    if (btn && ACT[el.dataset.enter]) ACT[el.dataset.enter](btn);
  });
  // No pinch or double-tap zoom: the app behaves like an installed app.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Double-tap zoom is turned off with CSS (touch-action: manipulation), so taps right after a scroll are never swallowed.
  // Portrait only (Android installed app; iPhone shows a "turn your phone" screen in landscape).
  try { if (screen.orientation && screen.orientation.lock && isStandalone()) screen.orientation.lock('portrait').catch(() => {}); } catch (e) { /* not supported */ }
  if (!document.getElementById('rotate-note')) {
    const rn = document.createElement('div');
    rn.id = 'rotate-note';
    rn.setAttribute('aria-hidden', 'true');
    rn.innerHTML = `<div>${sv('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', 40)}<p>Please turn your phone upright</p></div>`;
    document.body.appendChild(rn);
  }

  // Keep only digits in PIN fields
  document.addEventListener('input', (e) => {
    if (e.target.classList && e.target.classList.contains('pin-input')) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    }
    if (e.target.classList && e.target.classList.contains('code-input')) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    }
  }, true);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installEvt = e;
    if (state.route.name === 'install') render();
  });
  window.addEventListener('online', () => { if (state.token) loadFeed(true); });
  // Refresh on every sign-in and app open, then every 5 minutes while the app is open.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.token && Date.now() - state.lastLoad >= REFRESH_MS) loadFeed(true);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && state.token && Date.now() - state.lastLoad >= REFRESH_MS - 5000) loadFeed(true);
  }, 30 * 1000);

  /* ---------------- Pull down to refresh ---------------- */
  /*
   * Like iPhone apps: pull the page down and the grey activity indicator appears at the top, one spoke at a time.
   * Let go once it is complete and it spins while the app reloads. The bottom bar stays where it is.
   */
  const SPINNER = '<svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">' +
    Array.from({ length: 12 }, (_, i) => `<rect x="18.4" y="3" width="3.2" height="10" rx="1.6" transform="rotate(${i * 30} 20 20)" style="--o:${(0.25 + 0.75 * ((i + 1) / 12)).toFixed(2)}"/>`).join('') + '</svg>';
  const PTR = {
    y0: null, x0: 0, dist: 0, pulling: false, busy: false, el: null, page: null,
    PAGES: ['today', 'feed', 'hr', 'offers', 'profile', 'post', 'section', 'collection', 'search', 'myposts', 'leavers', 'adminTeam', 'adminSetup', 'setupSection', 'trainingReport', 'birthdays', 'attendees', 'popups', 'collections', 'admin', 'quotes'],
    MAX: 96, HOLD: 58, NEED: 70,
    ok() { return !!state.token && !this.busy && this.PAGES.indexOf(state.route.name) >= 0 && !document.querySelector('.celebrate'); },
    init() {
      this.el = document.createElement('div');
      this.el.className = 'ptr';
      this.el.setAttribute('role', 'status');
      this.el.setAttribute('aria-label', 'Refreshing');
      this.el.innerHTML = SPINNER;
      document.body.appendChild(this.el);
      if (!('ontouchstart' in window)) return;
      window.addEventListener('touchstart', (e) => {
        this.y0 = null;
        if (!this.ok() || e.touches.length !== 1 || window.scrollY > 0) return;
        if (e.target.closest && e.target.closest('input, textarea, select, .scan-box, .nav, .fab')) return;
        this.y0 = e.touches[0].clientY; this.x0 = e.touches[0].clientX; this.dist = 0; this.pulling = false;
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (this.y0 === null) return;
        const dy = e.touches[0].clientY - this.y0, dx = Math.abs(e.touches[0].clientX - this.x0);
        if (!this.pulling) {
          if (dy > 10 && dy > dx * 1.5 && window.scrollY <= 0) { this.pulling = true; this.page = app.querySelector('.screen > .page, .screen > form.page'); }
          else if (dx > 12 || dy < -4) { this.y0 = null; return; }
        }
        if (this.pulling) { this.dist = Math.min(this.MAX, (dy - 10) * 0.6); this.show(); }
      }, { passive: true });
      const end = () => {
        if (this.pulling && this.dist >= this.NEED) this.run(); else if (this.pulling) this.hide();
        this.y0 = null; this.pulling = false;
      };
      window.addEventListener('touchend', end, { passive: true });
      window.addEventListener('touchcancel', end, { passive: true });
    },
    /** Moves only the page; the bottom bar and + button are outside it and stay fixed. */
    shift(px, animate) {
      const pg = this.page;
      if (pg) {
        pg.style.transition = animate ? 'transform .35s cubic-bezier(.2, .9, .3, 1)' : 'none';
        pg.style.transform = px ? `translate3d(0, ${px}px, 0)` : '';
      }
      this.el.style.transition = animate ? 'transform .35s cubic-bezier(.2, .9, .3, 1), opacity .2s' : 'opacity .15s';
      this.el.style.transform = `translate(-50%, ${Math.max(0, px / 2 - 15)}px)`;
    },
    show() {
      const ready = this.dist >= this.NEED;
      if (ready && !this.wasReady) { try { Haptics.tap(true); } catch (e) { /* none */ } }
      this.wasReady = ready;
      const spokes = Math.max(0, Math.min(12, Math.round(this.dist / this.NEED * 12)));
      this.el.querySelectorAll('rect').forEach((r, i) => r.classList.toggle('on', i < spokes));
      this.el.style.opacity = this.dist > 6 ? '1' : '0';
      this.shift(this.dist, false);
    },
    hide() {
      this.wasReady = false;
      this.el.classList.remove('spin');
      this.el.style.opacity = '0';
      this.shift(0, true);
      const pg = this.page;
      setTimeout(() => { if (pg) { pg.style.transition = ''; pg.style.transform = ''; } }, 380);
    },
    /** Loads again what this screen shows, keeping the old content on screen until the new arrives. */
    reloadScreen() {
      const r = state.route.name, p = state.route.params || {};
      const jobs = [loadFeed(true)];
      if (r === 'leavers') jobs.push(loadLeavers());
      if (r === 'popups') jobs.push(loadPopups());
      if (r === 'collections') jobs.push(loadCollections());
      if (r === 'birthdays') jobs.push(loadBirthdays());
      if (r === 'myposts') jobs.push(loadMyPosts());
      if (r === 'quotes') jobs.push(loadQuotes());
      if (r === 'trainingReport') jobs.push(loadReport(p.id));
      if (['admin', 'adminTeam', 'profile'].indexOf(r) >= 0 && canApprove()) jobs.push(loadStaff());
      if (['adminSetup', 'setupSection'].indexOf(r) >= 0) { state.themeDraft = null; jobs.push(loadAdminSettings()); }
      return Promise.all(jobs.map((j) => Promise.resolve(j).catch(() => {})));
    },
    async run() {
      if (this.busy) return;
      this.busy = true;
      this.el.querySelectorAll('rect').forEach((r) => r.classList.add('on'));
      this.el.classList.add('spin');
      this.el.style.opacity = '1';
      this.shift(this.HOLD, true);
      const started = Date.now();
      try { await this.reloadScreen(); } catch (e) { /* each screen shows its own message */ }
      await new Promise((res) => setTimeout(res, Math.max(0, 800 - (Date.now() - started))));
      this.busy = false;
      this.page = null;
      render();
      // The page was drawn again: slide the new one back up from where the old one was.
      this.page = app.querySelector('.screen > .page, .screen > form.page');
      this.shift(this.HOLD, false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.hide()));
      if (state.offline) toast('You’re offline. Showing what you loaded last.');
    }
  };

  /*
   * Top bar like iPhone Mail: it stays at the top while you scroll. Over the page it turns to frosted glass,
   * and on main pages the big title scrolls away under it while a small title appears in the bar.
   */
  const Bar = {
    el: null, big: null,
    setup() {
      this.el = null; this.big = null;
      const bar = app.querySelector('.page > .topbar');
      if (!bar || bar.parentElement.firstElementChild !== bar) return;
      bar.classList.add('tb');
      const greet = bar.querySelector(':scope > .greet');
      const h1 = greet ? greet.querySelector('h1') : null;
      if (greet && h1) {
        const ey = greet.querySelector('span');
        const mini = document.createElement('div');
        mini.className = 'tb-title';
        mini.setAttribute('aria-hidden', 'true');
        mini.innerHTML = `<b>${esc(h1.textContent)}</b>${ey ? `<span>${esc(ey.textContent)}</span>` : ''}`;
        greet.replaceWith(mini);
        greet.classList.remove('spacer');
        greet.classList.add('large-title');
        bar.after(greet);
        this.big = greet;
      }
      this.el = bar;
      this.update();
    },
    update() {
      const bar = this.el;
      if (!bar || !bar.isConnected) return;
      const y = window.scrollY;
      bar.classList.toggle('is-scrolled', y > 4);
      const tuck = this.big ? this.big.getBoundingClientRect().bottom < bar.getBoundingClientRect().bottom + 4 : y > 4;
      bar.classList.toggle('is-tucked', tuck);
    }
  };
  window.addEventListener('scroll', () => Bar.update(), { passive: true });
  window.addEventListener('resize', () => { Bar.update(); Lens.place(false); if (typeof ComposePreview !== 'undefined') ComposePreview.sync(); });

  /*
   * Bottom bar like iOS: a glass lens sits behind the current tab and slides to the next one.
   * Press and slide your finger along the bar: the lens lifts, follows the finger, and opens the tab you let go on.
   */
  const Lens = {
    last: null, drag: null,
    wide() { return window.matchMedia('(min-width: 960px)').matches; },
    nav() { return document.querySelector('.nav'); },
    rectOf(btn, nav) {
      const n = nav.getBoundingClientRect(), b = btn.getBoundingClientRect();
      return { x: b.left - n.left, w: b.width };
    },
    set(lens, r, animate) {
      lens.style.transition = animate ? '' : 'none';
      lens.style.width = r.w + 'px';
      lens.style.transform = `translateX(${r.x}px)`;
      if (!animate) { void lens.offsetWidth; lens.style.transition = ''; }
    },
    place(animate) {
      const nav = this.nav();
      const lens = nav && nav.querySelector('.nav-lens');
      if (!lens || this.wide()) return;
      const cur = nav.querySelector('button[aria-current="page"]');
      if (!cur) { lens.style.opacity = '0'; this.last = null; return; }
      lens.style.opacity = '';
      const to = this.rectOf(cur, nav);
      if (animate && this.last && Math.abs(this.last.x - to.x) > 2) {
        this.set(lens, this.last, false);
        requestAnimationFrame(() => this.set(lens, to, true));
      } else this.set(lens, to, false);
      this.last = to;
    },
    btnAt(nav, x) {
      return [...nav.querySelectorAll('button[data-to]')].find((b) => { const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right; });
    },
    init() {
      document.addEventListener('touchstart', (e) => {
        const nav = e.target.closest && e.target.closest('.nav');
        if (!nav || this.wide() || e.touches.length !== 1) return;
        const lens = nav.querySelector('.nav-lens');
        if (!lens) return;
        this.drag = { nav, lens, x0: e.touches[0].clientX, moved: false, over: null };
      }, { passive: true });
      document.addEventListener('touchmove', (e) => {
        const d = this.drag;
        if (!d) return;
        const x = e.touches[0].clientX;
        if (!d.moved && Math.abs(x - d.x0) < 10) return;
        d.moved = true;
        const n = d.nav.getBoundingClientRect();
        const w = parseFloat(d.lens.style.width) || 64;
        const left = Math.max(0, Math.min(n.width - w, x - n.left - w / 2));
        d.lens.classList.add('lifted');
        d.lens.style.transition = 'none';
        d.lens.style.transform = `translateX(${left}px)`;
        const over = this.btnAt(d.nav, x);
        if (over && over !== d.over) {
          if (d.over) d.over.classList.remove('lens-over');
          over.classList.add('lens-over');
          if (d.over) { try { Haptics.tap(true); } catch (er) { /* none */ } }
          d.over = over;
        }
      }, { passive: true });
      const end = () => {
        const d = this.drag;
        this.drag = null;
        if (!d) return;
        d.lens.classList.remove('lifted');
        d.lens.style.transition = '';
        d.nav.querySelectorAll('.lens-over').forEach((b) => b.classList.remove('lens-over'));
        if (!d.moved) return;
        const target = d.over;
        const cur = d.nav.querySelector('button[aria-current="page"]');
        if (target && target !== cur) {
          this.last = { x: parseFloat((d.lens.style.transform.match(/-?[\d.]+/) || [0])[0]), w: parseFloat(d.lens.style.width) || 0 };
          ACT.nav(target);
        } else this.place(true);
      };
      document.addEventListener('touchend', end, { passive: true });
      document.addEventListener('touchcancel', end, { passive: true });
    }
  };

  /*
   * Date boxes show DD/MM/YY on every phone and computer (the built-in box follows the device's own
   * format, e.g. MM/DD/YYYY on a US Mac). Tapping still opens the device's calendar.
   */
  const DateFields = {
    show(inp) {
      const out = inp.parentElement && inp.parentElement.querySelector(':scope > .date-show');
      if (!out) return;
      out.textContent = inp.value ? dmyIso(inp.value) : 'DD/MM/YY';
      out.classList.toggle('is-blank', !inp.value);
    },
    enhance(root) {
      (root || document).querySelectorAll('input[type="date"]:not([data-dmy])').forEach((inp) => {
        inp.dataset.dmy = '1';
        const wrap = document.createElement('span');
        wrap.className = 'date-wrap';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);
        const out = document.createElement('span');
        out.className = 'date-show';
        out.setAttribute('aria-hidden', 'true');
        wrap.appendChild(out);
        ['input', 'change', 'blur'].forEach((ev) => inp.addEventListener(ev, () => this.show(inp)));
        inp.addEventListener('click', () => { try { if (inp.showPicker) inp.showPicker(); } catch (e) { /* the device opens its own */ } });
        this.show(inp);
      });
    }
  };
  // Dates set by the app itself (e.g. a suggested day) also refresh the DD/MM/YY text.
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(HTMLInputElement.prototype, 'value', {
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); if (this.dataset && this.dataset.dmy) DateFields.show(this); },
    configurable: true
  });
  new MutationObserver(() => DateFields.enhance(app)).observe(app, { childList: true, subtree: true });

  /** Runs after every screen is drawn. */
  /* ---------------- Desktop: live mobile preview while composing ---------------- */
  /** Builds a preview post object from the current compose form. */
  function composePreviewObj(form) {
    const f = Object.fromEntries(new FormData(form));
    const cat = form.dataset.cat;
    const type = catOf(cat).type;
    const u = state.user || {};
    const p = { id: '__preview', category: cat, created: Date.now(), postedBy: u.name || '', postedById: '__none',
      property: f.property || 'Cluster', title: (f.title || '').trim(), message: (f.message || '').trim(),
      image: f.image || '', start: f.start || '', end: f.end || '', priority: f.priority || 'Normal',
      plainText: form.querySelector('[name="messageBox"]') ? !f.messageBox : false };
    if (form.querySelector('.blk-editor')) { try { p.blocks = Blocks.read(form); } catch (e) { p.blocks = []; } }
    if (type === 'offer') Object.assign(p, { outlet: f.outlet || '', price: f.price || '', days: f.days || '', timing: f.timing || '',
      inclusions: String(f.inclusions || '').split('\n').map((x) => x.trim()).filter(Boolean), serves: f.serves || '',
      terms: (f.terms || '').trim(), ctaText: f.ctaText || '', ctaLink: f.ctaLink || '' });
    if (type === 'people') { Object.assign(p, { personName: (f.personName || '').trim(), position: (f.position || '').trim(), subtitle: f.subtitle || '' }); p.title = p.personName || 'Name'; }
    if (type === 'training') { const t = [f.timeFrom, f.timeTo].filter(Boolean).join('–'); Object.assign(p, { eventDate: f.eventDate || '', timing: t || f.timingRaw || '', location: f.location || '', personName: (f.personName || '').trim(), personPhoto: f.personPhoto || '' }); }
    if (type === 'monthly') { p.includes = [...new Set((p.blocks || []).filter((b) => b.type === 'posts').reduce((a, b) => a.concat(b.ids), []))];
      Object.assign(p, { style: f.style || 'Regular', themeColor: f.style === 'Regular' ? '' : (f.themeColor || ''), animation: f.style === 'Regular' ? 'none' : (f.animation || 'none'), shareable: !!f.shareable }); }
    return p;
  }
  function composePreviewHtml(form) {
    const p = composePreviewObj(form);
    const type = catOf(p.category).type;
    if (type === 'offer') return offerDetail(p);
    if (type === 'people') return personDetail(p);
    if (type === 'training') return trainingDetail(p);
    if (type === 'monthly' && (p.style === 'Special' || p.style === 'Festive')) return specialNewsletter(p);
    return textDetail(p);
  }
  const ComposePreview = {
    form: null, aside: null, frame: null, timer: 0, onEvt: null,
    wide() { return window.matchMedia('(min-width: 960px)').matches; },
    sync() {
      const form = app.querySelector('form[data-form="post"]');
      if (!this.wide() || !form) { this.teardown(); return; }
      if (this.form === form && this.aside && this.aside.isConnected) { this.schedule(); return; }
      this.teardown();
      const screen = form.closest('.screen');
      this.form = form; screen.classList.add('cp-on');
      const aside = document.createElement('aside');
      aside.className = 'cp-aside';
      aside.innerHTML = '<div class="cp-inner"><span class="cp-label">Live preview</span><div class="cp-phone"><iframe title="Preview" aria-hidden="true"></iframe></div></div>';
      screen.appendChild(aside);
      this.aside = aside; this.frame = aside.querySelector('iframe');
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      const doc = this.frame.contentDocument;
      doc.open();
      doc.write('<!doctype html><html data-theme="' + theme + '"><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="' + esc(location.href) + '"><link rel="stylesheet" href="styles.css"><style>html,body{margin:0;background:var(--cream)}.sticky-actions{display:none!important}</style></head><body></body></html>');
      doc.close();
      this.update();
      this.onEvt = () => this.schedule();
      form.addEventListener('input', this.onEvt);
      form.addEventListener('change', this.onEvt);
      form.addEventListener('click', this.onEvt);
    },
    schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => this.update(), 160); },
    update() {
      if (!this.frame || !this.form || !this.form.isConnected) return;
      try {
        const html = composePreviewHtml(this.form);
        const doc = this.frame.contentDocument;
        if (!doc || !doc.body) return;
        doc.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') || 'light');
        doc.body.innerHTML = html;
      } catch (e) { /* half-filled form: keep the last good preview */ }
    },
    teardown() {
      if (this.form && this.onEvt) { this.form.removeEventListener('input', this.onEvt); this.form.removeEventListener('change', this.onEvt); this.form.removeEventListener('click', this.onEvt); }
      if (this.aside) this.aside.remove();
      const on = app.querySelector('.screen.cp-on'); if (on) on.classList.remove('cp-on');
      this.form = null; this.aside = null; this.frame = null;
    }
  };

  function afterPaint() {
    // Coloured pages (special collections, special newsletters): the whole window takes that colour,
    // so nothing else shows behind them while they slide in or when you overscroll.
    const cp = app.querySelector('.screen.coll-page');
    const col = cp ? cp.style.getPropertyValue('--bg').trim() : '';
    document.documentElement.style.backgroundColor = col;
    document.body.style.backgroundColor = col;
    DateFields.enhance(app);
    Bar.setup();
    Lens.place(true);
    ComposePreview.sync();
  }

  /* ---------------- Start ---------------- */
  applyAppearance();
  Fonts.apply(state.settings.fonts);
  document.title = CONFIG.appName || document.title;
  // The service worker keeps the app and every image on the phone (same file OneSignal uses for push).
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js', { scope: BASE }).catch(() => {});
  }
  if (state.token) setTimeout(() => Preload.images(state.posts), 300);
  Push.init();
  PTR.init();
  Lens.init();
  state.route = { name: state.token ? (state.deepLinkPost ? 'post' : 'today') : 'login', params: state.deepLinkPost ? { id: state.deepLinkPost } : {} };
  if (state.token && state.deepLinkReport) {
    state.route = { name: 'trainingReport', params: { id: state.deepLinkReport } };
    history.replaceState(null, '', location.pathname);
  }
  if (state.token && state.deepLinkAccess && state.user && (state.user.role === 'Admin' || state.user.role === 'HR')) {
    state.route = { name: 'adminTeam', params: {} }; state.adminTab = 'pending'; state.staff = null;
    history.replaceState(null, '', location.pathname);
  }
  history.replaceState({ name: state.route.name, params: state.route.params }, '');
  render();
  if (state.token) loadFeed(true);
})();
