/**
 * Business Bay Team App: backend
 * Connects the staff app to this Google Sheet
 * (tabs: Staff, Posts, Read Log, Categories, Collections, Birthdays, Popups, Attendance, Settings, Lists).
 * New tabs and columns are added automatically the first time this version runs.
 *
 * Setup:
 *   1. Paste this file into Extensions > Apps Script (replace everything in Code.gs).
 *   2. Project Settings: set Time zone to (GMT+04:00) Dubai.
 *   3. Run setup() once and approve the permissions (it also schedules the 9:00 am birthday and training notifications).
 *   4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   5. Copy the Web app URL into the app's config.
 *
 * Push notifications (optional, later): add these in Project Settings > Script properties
 *   ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, APP_URL (your Netlify address)
 */

const SHEET_STAFF = 'Staff';
const SHEET_POSTS = 'Posts';
const SHEET_LOG = 'Read Log';
const SHEET_LISTS = 'Lists';
const SHEET_CATS = 'Categories';
const SHEET_SETTINGS = 'Settings';
const SHEET_BDAYS = 'Birthdays';
const SHEET_COLLS = 'Collections';
const SHEET_POPUPS = 'Popups';
const SHEET_ATTEND = 'Attendance';
const SHEET_QUOTES = 'Quotes';
const SHEET_WISHES = 'Wishes';
const SCHEMA_VERSION = 18;
const BIRTHDAY_HOUR = 9;

const SESSION_DAYS = 30;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_FONT_BYTES = 2 * 1024 * 1024;
// Admin › App setup › Fonts: the headline and body fonts (and their bold weights) the app uses.
const FONT_SLOTS = ['heading', 'headingBold', 'body', 'bodyBold'];
const TZ = 'Asia/Dubai';

// Post categories and who may post in them live on the Categories tab.
// Type decides the form and card: update (title + message), offer (price, timing, inclusions),
// monthly (newsletter), people (employee of the month, new joiners, promotions),
// training (Learning & Development calendar: date, time, venue, presenter).
// A people category with Subcategories is an award: the chosen subcategory shows as a ribbon.
// Group decides which tab shows it: hr (HR tab), marketing (Offers tab), general (Home only).
const CAT_TYPES = ['update', 'offer', 'monthly', 'people', 'training'];
const CAT_GROUPS = ['hr', 'marketing', 'general'];
const CAT_COLORS = ['blue', 'gold', 'red', 'green', 'purple', 'navy', 'grey', 'teal', 'orange', 'pink', 'burgundy'];
const ANIMATIONS = ['none', 'sparkle', 'confetti', 'snow', 'lights', 'fireworks', 'bubbles', 'hearts', 'petals'];
const NEWSLETTER_STYLES = ['Regular', 'Special', 'Festive'];

const ROLES = ['Viewer', 'HR', 'Marketing', 'Admin'];
const STAFF_STATUSES = ['Pending', 'Approved', 'Declined', 'Blocked', 'Left'];
const LEAVE_HOUR = 18; // access ends at 6:00 pm (Dubai) on the last working day
// DXBAI = Embassy Suites by Hilton Dubai Business Bay, DXBPI = Hilton Garden Inn Dubai Business Bay.
// Cluster = cluster colleagues (staff) or both hotels (posts).
const HOTELS = ['DXBAI', 'DXBPI'];
const STAFF_PROPERTIES = ['DXBAI', 'DXBPI', 'Cluster'];
const POST_PROPERTIES = ['DXBAI', 'DXBPI', 'Cluster'];

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

const BACKEND_VERSION = '1.26.0';

function doGet() {
  return out({ ok: true, status: 'running', version: BACKEND_VERSION });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return out({ ok: false, error: 'Bad request.' });
  }
  const fn = ACTIONS[req.action];
  if (!fn) return out({ ok: false, error: 'Unknown action.' });
  try {
    ensureSchema_();
    return out(Object.assign({ ok: true }, fn(req) || {}));
  } catch (err) {
    if (err.userMessage) return out({ ok: false, error: err.userMessage });
    console.error(req.action, err && err.stack || err);
    return out({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}

/** Run once from the editor to create the PIN salt and the uploads folder. */
function setup() {
  salt_();
  const folder = uploadFolder_();
  ensureSchema_(true);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['dailyBirthdayPush', 'trainingWrapUp'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyBirthdayPush').timeBased().everyDays(1).atHour(BIRTHDAY_HOUR).nearMinute(0).inTimezone(TZ).create();
  // Every 10 minutes: when a training session has ended, tell the trainer the attendance report is ready.
  ScriptApp.newTrigger('trainingWrapUp').timeBased().everyMinutes(10).create();
  console.log('Setup complete. Birthday and training notifications scheduled daily at ' + BIRTHDAY_HOUR + ':00 (' + TZ + '), and attendance reports after each training. Uploads folder: ' + folder.getUrl());
}

/**
 * Replaces the dropdown rules on the Categories tab so they match this version
 * (adds the People type, the Group column, and allows custom #hex colours).
 */
function refreshCategoryRules_(cats) {
  const sh = cats.sh;
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, 1, rows, sh.getMaxColumns()).clearDataValidations();
  const list = function (values, strict) {
    return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(!strict).build();
  };
  const col = function (h) { return cats.col[h] === undefined ? 0 : cats.col[h] + 1; };
  if (col('Type')) sh.getRange(2, col('Type'), rows, 1).setDataValidation(list(CAT_TYPES, true));
  if (col('Group')) sh.getRange(2, col('Group'), rows, 1).setDataValidation(list(CAT_GROUPS, true));
  if (col('Color')) sh.getRange(2, col('Color'), rows, 1).setDataValidation(list(CAT_COLORS, false));
  const box = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  if (col('Needs Acknowledge')) sh.getRange(2, col('Needs Acknowledge'), rows, 1).setDataValidation(box);
  if (col('Active')) sh.getRange(2, col('Active'), rows, 1).setDataValidation(box);
}

/** Adds the tabs, columns and default categories this version needs. Runs once per version. */
function ensureSchema_(force) {
  const props = PropertiesService.getScriptProperties();
  if (!force && Number(props.getProperty('SCHEMA') || 0) >= SCHEMA_VERSION) return;
  withLock_(function () {
    if (!force && Number(props.getProperty('SCHEMA') || 0) >= SCHEMA_VERSION) return;
    const ss = SpreadsheetApp.getActive();
    const tab = function (name, headers) {
      let sh = ss.getSheetByName(name);
      if (!sh) {
        sh = ss.insertSheet(name);
        sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
          .setBackground('#13294B').setFontColor('#FFFFFF').setFontFamily('Arial');
        sh.setFrozenRows(1);
      }
      let t = table_(name);
      headers.forEach(function (h) { t = ensureColumn_(t, h); });
      return t;
    };
    ensureColumn_(ensureColumn_(ensureColumn_(table_(SHEET_STAFF), 'Photo URL'), 'Last Working Day'), 'Position');
    // The Status dropdown on the Staff tab reads Lists › Statuses: add "Left" so it is accepted.
    const lists = table_(SHEET_LISTS);
    const sc = lists.col['Statuses'];
    if (sc !== undefined) {
      const vals = listColumn_(lists, 'Statuses');
      if (vals.length && vals.indexOf('Left') < 0) lists.sh.getRange(vals.length + 2, sc + 1).setValue('Left');
    }
    let posts = table_(SHEET_POSTS);
    ['Days', 'CTA Text', 'CTA Link', 'Collection', 'Style', 'Theme Color', 'Animation', 'Person Name', 'Person ID', 'Position', 'Subtitle',
      'Event Date', 'Today Special', 'Person Photo', 'Special Date', 'Terms', 'Includes', 'Checkin Secret', 'Report Sent', 'Collection Only', 'Blocks', 'Shareable', 'Special Repeat', 'Plain Text']
      .forEach(function (h) { posts = ensureColumn_(posts, h); });
    tab(SHEET_BDAYS, ['Employee ID', 'Name', 'Birthday', 'Property', 'Department', 'Updated', 'Self Birthday']);
    tab(SHEET_COLLS, ['ID', 'Name', 'Color', 'Animation', 'Banner URL', 'Start Date', 'End Date', 'Active', 'Created By', 'Blocks']);
    tab(SHEET_POPUPS, ['ID', 'Title', 'Message', 'Image URL', 'Button Text', 'Button Link', 'Color', 'Animation', 'Delay Seconds',
      'Frequency', 'Property', 'Start Date', 'End Date', 'Active', 'Created By', 'Updated']);
    tab(SHEET_ATTEND, ['Timestamp', 'Post ID', 'Employee ID', 'Full Name', 'Checked In', 'Check-in Method']);
    tab(SHEET_QUOTES, ['Date', 'Quote', 'Author', 'Created By', 'Updated']);
    ss.getSheetByName(SHEET_QUOTES).getRange('A:A').setNumberFormat('@');
    tab(SHEET_WISHES, ['Date', 'Target ID', 'Wisher ID', 'Wisher Name', 'Emoji', 'Updated']);
    ss.getSheetByName(SHEET_WISHES).getRange('A:C').setNumberFormat('@');
    ss.getSheetByName(SHEET_ATTEND).getRange('C:C').setNumberFormat('@');
    ss.getSheetByName(SHEET_BDAYS).getRange('A:A').setNumberFormat('@');
    ss.getSheetByName(SHEET_BDAYS).getRange('C:C').setNumberFormat('@');
    ss.getSheetByName(SHEET_BDAYS).getRange('G:G').setNumberFormat('@');

    let cats = table_(SHEET_CATS);
    cats = ensureColumn_(cats, 'Group');
    cats = ensureColumn_(cats, 'Subcategories');
    refreshCategoryRules_(cats);
    const defaultGroup = { 'HR': 'hr', 'F&B Offer': 'marketing', 'Notice': 'general', 'Monthly Update': 'marketing' };
    cats.rows.forEach(function (r, i) {
      if (String(r[cats.col['Group']] || '').trim()) return;
      const id = String(r[cats.col['ID']] || '').trim();
      if (!id) return;
      const roles = String(r[cats.col['Posting Roles']] || '');
      const g = defaultGroup[id] || (roles.indexOf('HR') >= 0 && roles.indexOf('Marketing') < 0 ? 'hr'
        : roles.indexOf('Marketing') >= 0 && roles.indexOf('HR') < 0 ? 'marketing' : 'general');
      setCell_(cats, i, 'Group', g);
    });
    const hasPeople = cats.rows.some(function (r) { return String(r[cats.col['Type']]).trim() === 'people'; });
    if (!hasPeople) {
      [['EOTM', 'Employee of the Month', 'gold'], ['NEWJOIN', 'New Joiners', 'green'], ['PROMO', 'Promotions', 'purple']]
        .forEach(function (c) {
          appendRow_(cats, { 'ID': c[0], 'Label': c[1], 'Type': 'people', 'Posting Roles': 'HR',
            'Needs Acknowledge': false, 'Active': true, 'Color': c[2], 'Group': 'hr' });
        });
      cats = table_(SHEET_CATS);
    }
    // Employee of the Month becomes an award with its three titles (only if no titles are set yet).
    cats.rows.forEach(function (r, i) {
      if (String(r[cats.col['ID']]).trim() === 'EOTM' && !String(r[cats.col['Subcategories']] || '').trim()) {
        setCell_(cats, i, 'Subcategories', 'Front of the House, Heart of the House, Medallion Winner');
      }
    });
    const hasTraining = cats.rows.some(function (r) { return String(r[cats.col['Type']]).trim() === 'training'; });
    if (!hasTraining) {
      appendRow_(cats, { 'ID': 'LND', 'Label': 'Learning & Development', 'Type': 'training', 'Posting Roles': 'HR',
        'Needs Acknowledge': false, 'Active': true, 'Color': 'teal', 'Group': 'hr' });
    }
    props.setProperty('SCHEMA', String(SCHEMA_VERSION));
  });
}

const ACTIONS = {
  lists: actionLists_,
  signup: actionSignup_,
  login: actionLogin_,
  logout: actionLogout_,
  me: actionMe_,
  changePin: actionChangePin_,
  feed: actionFeed_,
  ack: actionAck_,
  attend: actionAttend_,
  checkinCode: actionCheckinCode_,
  checkIn: actionCheckIn_,
  attendanceReport: actionAttendanceReport_,
  signOutEverywhere: actionSignOutEverywhere_,
  leavers: actionLeavers_,
  setLastDay: actionSetLastDay_,
  createPost: actionCreatePost_,
  updatePost: actionUpdatePost_,
  myPosts: actionMyPosts_,
  readReport: actionReadReport_,
  uploadFile: actionUploadFile_,
  setPhoto: actionSetPhoto_,
  getImage: actionGetImage_,
  appSettings: actionAppSettings_,
  adminSettings: actionAdminSettings_,
  saveSettings: actionSaveSettings_,
  saveCategory: actionSaveCategory_,
  saveOutlets: actionSaveOutlets_,
  saveDepartments: actionSaveDepartments_,
  uploadFont: actionUploadFont_,
  removeFont: actionRemoveFont_,
  getFont: actionGetFont_,
  saveCollection: actionSaveCollection_,
  collections: actionCollections_,
  birthdays: actionBirthdays_,
  saveBirthdays: actionSaveBirthdays_,
  deleteBirthday: actionDeleteBirthday_,
  setMyBirthday: actionSetMyBirthday_,
  popups: actionPopups_,
  wishBirthday: actionWishBirthday_,
  wishes: actionWishes_,
  quotes: actionQuotes_,
  saveQuote: actionSaveQuote_,
  deleteQuote: actionDeleteQuote_,
  setMyPosition: actionSetMyPosition_,
  savePopup: actionSavePopup_,
  deletePopup: actionDeletePopup_,
  lookupStaff: actionLookupStaff_,
  deletePost: actionDeletePost_,
  resetContent: actionResetContent_,
  deleteCollection: actionDeleteCollection_,
  staffList: actionStaffList_,
  setStaff: actionSetStaff_,
  resetPin: actionResetPin_
};

/* ------------------------------------------------------------------ */
/* Public actions (no sign-in needed)                                  */
/* ------------------------------------------------------------------ */

function actionLists_() {
  const t = table_(SHEET_LISTS);
  return {
    departments: listColumn_(t, 'Departments'),
    outlets: listColumn_(t, 'Outlets')
  };
}

function actionSignup_(req) {
  const id = normId_(req.employeeId);
  const name = String(req.name || '').trim();
  if (!/^[A-Z0-9-]{3,15}$/.test(String(req.employeeId || '').trim().toUpperCase()) || !id) fail_('Please enter a valid Employee ID.');
  if (name.length < 2) fail_('Please enter your full name.');
  if (STAFF_PROPERTIES.indexOf(req.property) < 0) fail_('Please choose your property.');
  if (!String(req.department || '').trim()) fail_('Please choose your department.');
  checkPinFormat_(req.pin);

  return withLock_(function () {
    const t = table_(SHEET_STAFF);
    if (findStaff_(t, id) >= 0) {
      fail_('This Employee ID is already registered. Try signing in, or contact your Admin.');
    }
    appendRow_(t, {
      'Employee ID': id,
      'Full Name': clean_(name),
      'Department': clean_(req.department),
      'Property': req.property,
      'Role': 'Viewer',
      'Status': 'Pending',
      'PIN Hash': hashPin_(id, req.pin),
      'Signed Up': new Date(),
      'Position': asText_(String(req.position || '').slice(0, 80))
    });
    try { notifyAccessRequest_(t, id, name, req.department, req.property); } catch (e) { console.error('Access request alert failed', e); }
    return { status: 'Pending' };
  });
}

/** Tells approved HR and Admins that someone is waiting for access. */
function notifyAccessRequest_(t, id, name, department, property) {
  const managers = t.rows.map(function (r, i) { return userAt_(t, i); })
    .filter(function (u) { return u.employeeId && u.status === 'Approved' && (u.role === 'Admin' || u.role === 'HR'); })
    .map(function (u) { return normId_(u.employeeId); });
  if (!managers.length) return;
  const appUrl = (PropertiesService.getScriptProperties().getProperty('APP_URL') || '').replace(/\/$/, '');
  oneSignal_({
    include_aliases: { external_id: managers },
    headings: { en: 'New access request' },
    contents: { en: name + ' (' + id + ') · ' + department + ' · ' + property + ' is waiting for approval.' },
    web_url: appUrl ? appUrl + '/?access=1' : undefined
  });
}

function actionLogin_(req) {
  const id = normId_(req.employeeId);
  checkPinFormat_(req.pin);

  const cache = CacheService.getScriptCache();
  const failKey = 'fail_' + id;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_PIN_ATTEMPTS) fail_('Too many attempts. Please wait 15 minutes and try again.');

  const wrong = 'Employee ID or PIN is incorrect.';
  const t = table_(SHEET_STAFF);
  const i = findStaff_(t, id);
  if (i < 0) {
    cache.put(failKey, String(fails + 1), LOCKOUT_SECONDS);
    fail_(wrong);
  }
  const user = userAt_(t, i);
  const stored = String(t.rows[i][t.col['PIN Hash']] || '');

  if (!stored) {
    // Row added by an Admin directly in the sheet: the first sign-in sets the PIN.
    if (user.status !== 'Approved') fail_(wrong);
    setCell_(t, i, 'PIN Hash', hashPin_(id, req.pin));
  } else if (stored !== hashPin_(id, req.pin)) {
    if (stored === legacyHash_(t.rows[i][t.col['Employee ID']], req.pin)) {
      setCell_(t, i, 'PIN Hash', hashPin_(id, req.pin));
    } else {
      cache.put(failKey, String(fails + 1), LOCKOUT_SECONDS);
      fail_(wrong);
    }
  }
  cache.remove(failKey);

  if (user.status === 'Approved' && hasLeft_(user)) { markLeft_(t, i); return { status: 'Left' }; }
  if (user.status !== 'Approved') return { status: user.status || 'Pending' };

  pruneSessions_();
  // One device at a time (Admins can use several): sign out on the other device first.
  if (user.role !== 'Admin') {
    const other = activeSessions_(id)[0];
    if (other) return { status: 'SignedInElsewhere', device: other.device || '', since: other.at || 0 };
  }
  setCell_(t, i, 'Last Login', new Date());
  return { status: 'Approved', token: newSession_(id, req.device), user: user, canPublish: publishableFor_(user), categories: activeCategories_() };
}

/* ------------------------------------------------------------------ */
/* Signed-in actions                                                   */
/* ------------------------------------------------------------------ */

function actionLogout_(req) {
  if (req.token) PropertiesService.getScriptProperties().deleteProperty('sess_' + req.token);
  return {};
}

function actionMe_(req) {
  const a = auth_(req);
  return { user: a.user, canPublish: publishableFor_(a.user), myBirthdayInfo: myBirthdayInfo_(a.user.employeeId) };
}

function actionChangePin_(req) {
  const a = auth_(req);
  checkPinFormat_(req.oldPin);
  checkPinFormat_(req.newPin);
  const stored = String(a.staff.rows[a.index][a.staff.col['PIN Hash']] || '');
  if (stored !== hashPin_(a.user.employeeId, req.oldPin) && stored !== legacyHash_(a.staff.rows[a.index][a.staff.col['Employee ID']], req.oldPin)) fail_('Your current PIN is incorrect.');
  setCell_(a.staff, a.index, 'PIN Hash', hashPin_(a.user.employeeId, req.newPin));
  return {};
}

function actionFeed_(req) {
  const user = auth_(req).user;
  const t = table_(SHEET_POSTS);
  const today = dayKey_(new Date());
  const oldest = dayKey_(new Date(Date.now() - 90 * 864e5));
  const acked = ackedBy_(user.employeeId);
  const activeCats = activeCategories_();
  const activeIds = activeCats.map(function (c) { return c.id; });

  const posts = t.rows
    .map(function (r) { return rowObject_(t, r); })
    .filter(function (p) {
      if (!p['Post ID'] || p['Status'] !== 'Live') return false;
      if (activeIds.indexOf(String(p['Category'])) < 0) return false;
      if (p['Start Date'] && dayKey_(p['Start Date']) > today) return false;
      if (p['End Date'] && dayKey_(p['End Date']) < today) return false;
      if (p['Event Date'] && dayKey_(p['Event Date']) < oldest) return false;
      return seesProperty_(user.property, p['Property']);
    })
    .map(function (p) {
      const c = clientPost_(p);
      c.acknowledged = acked.has(c.id);
      return c;
    });
  addAttendance_(posts, user, activeCats);
  applyLivePhotos_(posts, activeCats);

  posts.sort(function (a, b) {
    return (Number(b.pinned) - Number(a.pinned)) || (b.created - a.created);
  });
  const bd = birthdaysFor_(user);
  addWishInfo_(bd, user);
  return {
    user: user,
    canPublish: publishableFor_(user),
    categories: activeCats,
    collections: activeCollections_(),
    posts: posts,
    birthdaysToday: bd.today,
    birthdaysMonth: bd.month,
    myBirthday: bd.mine,
    myBirthdayInfo: myBirthdayInfo_(user.employeeId),
    farewell: farewell_(user),
    quote: quoteFor_(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')),
    theme: theme_(),
    brand: brand_(),
    popups: popups_().filter(function (x) { return x.live && seesProperty_(user.property, x.property); })
  };
}

/* ------------------------------------------------------------------ */
/* Training attendance ("Attend" on a Learning & Development session)  */
/* ------------------------------------------------------------------ */

/** Who is attending each training post: { postId: [employeeId, ...] } in the order they joined. */
function attendanceMap_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SHEET_ATTEND)) return {};
  const t = table_(SHEET_ATTEND);
  const map = {};
  t.rows.forEach(function (r) {
    const pid = String(r[t.col['Post ID']] || '');
    const id = normId_(r[t.col['Employee ID']]);
    if (!pid || !id) return;
    (map[pid] = map[pid] || []);
    if (map[pid].indexOf(id) < 0) map[pid].push(id);
  });
  return map;
}

/** Adds attendees (name, photo, department) and whether I am attending to every training post. */
function addAttendance_(posts, user, cats) {
  const training = (cats || activeCategories_()).filter(function (c) { return c.type === 'training'; }).map(function (c) { return c.id; });
  if (!training.length) return;
  const map = attendanceMap_();
  const checked = {};
  const at = table_(SHEET_ATTEND);
  at.rows.forEach(function (r) {
    const ci = r[at.col['Checked In']];
    if (!ci) return;
    const pid = String(r[at.col['Post ID']] || '');
    (checked[pid] = checked[pid] || {})[normId_(r[at.col['Employee ID']])] = new Date(ci).getTime();
  });
  const rawById = {};
  const pt = table_(SHEET_POSTS);
  pt.rows.forEach(function (r) { const o = rowObject_(pt, r); if (o['Post ID']) rawById[String(o['Post ID'])] = o; });
  const staff = table_(SHEET_STAFF);
  const byId = {};
  staff.rows.forEach(function (r, i) { const u = userAt_(staff, i); if (u.employeeId) byId[u.employeeId] = u; });
  const me = normId_(user.employeeId);
  posts.forEach(function (c) {
    if (training.indexOf(String(c.category)) < 0) return;
    const ids = map[c.id] || [];
    c.attending = ids.indexOf(me) >= 0;
    c.checkedInAt = (checked[c.id] || {})[me] || 0;
    c.checkedInCount = Object.keys(checked[c.id] || {}).length;
    const raw = rawById[c.id];
    if (raw) {
      const w = trainingWindow_(raw);
      if (w) { c.checkinOpens = w.opens.getTime(); c.checkinCloses = w.closes.getTime(); }
      c.canRunCheckin = canRunCheckin_(user, raw);
    }
    c.attendees = ids.map(function (id) {
      const u = byId[id] || {};
      return { employeeId: id, name: u.name || id, photo: u.photo || '', department: u.department || '' };
    });
  });
}

/* ---------- Training check-in: rotating code / QR shown by the trainer ---------- */

const CHECKIN_STEP_MS = 30 * 1000;      // the code changes every 30 seconds
const CHECKIN_EARLY_MIN = 15;           // check-in opens 15 minutes before the start
const CHECKIN_LATE_MIN = 15;            // and closes 15 minutes after the end

/** The session's start and end as Dates (Dubai time). Without times: the whole day. */
function trainingWindow_(p) {
  const d = p['Event Date'] ? new Date(p['Event Date']) : null;
  if (!d) return null;
  const ymd = Utilities.formatDate(d, TZ, 'yyyy-MM-dd').split('-').map(Number);
  const m = /(\d{1,2}):(\d{2})(?:\s*[–-]\s*(\d{1,2}):(\d{2}))?/.exec(cellText_(p['Timing']));
  const at = function (h, mi) { return dubaiDate_(ymd[0], ymd[1], ymd[2], h, mi); };
  let start, end, timed = !!m;
  if (m) {
    start = at(Number(m[1]), Number(m[2]));
    end = m[3] ? at(Number(m[3]), Number(m[4])) : new Date(start.getTime() + 2 * 3600 * 1000);
  } else {
    start = at(0, 0); end = at(23, 59);
  }
  return {
    start: start, end: end, timed: timed,
    opens: new Date(start.getTime() - (timed ? CHECKIN_EARLY_MIN : 0) * 60000),
    closes: new Date(end.getTime() + (timed ? CHECKIN_LATE_MIN : 0) * 60000)
  };
}

/** A Date for a wall-clock time in Dubai (UTC+4, no daylight saving). */
function dubaiDate_(y, mo, d, h, mi) {
  return new Date(Date.UTC(y, mo - 1, d, h - 4, mi));
}

function checkinSecret_(posts, i) {
  let sec = String(posts.rows[i][posts.col['Checkin Secret']] || '');
  if (!sec) {
    sec = Utilities.getUuid().replace(/-/g, '');
    setCell_(posts, i, 'Checkin Secret', sec);
  }
  return sec;
}

/** 6-digit code for a 30-second step, from the session's secret. */
function checkinCodeAt_(secret, postId, step) {
  const sig = Utilities.computeHmacSha256Signature(postId + ':' + step, secret);
  let n = 0;
  for (let k = 0; k < 4; k++) n = (n * 256 + ((sig[k] + 256) % 256)) % 1000000007;
  return ('000000' + (n % 1000000)).slice(-6);
}

/** Trainer (presenter), whoever posted it, HR and Admin can run check-in and see the report. */
function canRunCheckin_(user, p) {
  if (user.role === 'Admin' || user.role === 'HR') return true;
  if (normId_(String(p['Person ID'] || '').replace(/^'/, '')) === normId_(user.employeeId)) return true;
  return String(p['Posted By'] || '').slice(-(user.employeeId.length + 2)) === '(' + user.employeeId + ')';
}

function trainingPost_(postId) {
  const posts = table_(SHEET_POSTS);
  const i = findPost_(posts, postId);
  if (i < 0) fail_('This training is no longer available.');
  const p = rowObject_(posts, posts.rows[i]);
  const cat = categories_().filter(function (c) { return c.id === String(p['Category']); })[0];
  if (!cat || cat.type !== 'training') fail_('This is not a training session.');
  return { posts: posts, i: i, p: p };
}

function checkedInRows_(postId) {
  const t = table_(SHEET_ATTEND);
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .filter(function (o) { return String(o['Post ID']) === String(postId) && o['Checked In']; });
}

/** Trainer screen: the current code (and QR text), how long it stays valid and how many have checked in. */
function actionCheckinCode_(req) {
  const user = auth_(req).user;
  return withLock_(function () {
    const x = trainingPost_(String(req.postId || ''));
    if (!canRunCheckin_(user, x.p)) fail_('Only the trainer, HR or Admin can show the check-in code.');
    const w = trainingWindow_(x.p);
    if (!w) fail_('Please add the training date first.');
    const now = Date.now();
    const open = now >= w.opens.getTime() && now <= w.closes.getTime();
    const res = { open: open, opens: w.opens.getTime(), closes: w.closes.getTime(), count: checkedInRows_(x.p['Post ID']).length };
    if (!open) return res;
    const step = Math.floor(now / CHECKIN_STEP_MS);
    res.code = checkinCodeAt_(checkinSecret_(x.posts, x.i), String(x.p['Post ID']), step);
    res.qr = 'DXBAIPI-CHECKIN:' + x.p['Post ID'] + ':' + res.code;
    res.validFor = Math.round(((step + 1) * CHECKIN_STEP_MS - now) / 1000);
    return res;
  });
}

/** Anyone: check in to a session with the trainer's current code (typed or scanned). */
function actionCheckIn_(req) {
  const user = auth_(req).user;
  const code = String(req.code || '').replace(/\D/g, '');
  if (code.length !== 6) fail_('Please enter the 6-digit code shown by the trainer.');
  return withLock_(function () {
    const x = trainingPost_(String(req.postId || ''));
    const w = trainingWindow_(x.p);
    const now = Date.now();
    if (!w) fail_('This training has no date yet.');
    if (now < w.opens.getTime()) fail_('Check-in opens at ' + Utilities.formatDate(w.opens, TZ, 'h:mm a') + ' on ' + Utilities.formatDate(w.opens, TZ, 'd MMM') + '.');
    if (now > w.closes.getTime()) fail_('Check-in for this training has closed.');
    const secret = String(x.posts.rows[x.i][x.posts.col['Checkin Secret']] || '');
    const step = Math.floor(now / CHECKIN_STEP_MS);
    const pid = String(x.p['Post ID']);
    const ok = secret && [step, step - 1, step - 2].some(function (s) { return checkinCodeAt_(secret, pid, s) === code; });
    if (!ok) fail_('That code is not right or has expired. Please scan or type the code on the trainer’s screen now.');
    const t = table_(SHEET_ATTEND);
    const me = normId_(user.employeeId);
    const method = req.method === 'qr' ? 'QR scan' : 'Code';
    let row = -1;
    t.rows.forEach(function (r, k) { if (row < 0 && String(r[t.col['Post ID']]) === pid && normId_(r[t.col['Employee ID']]) === me) row = k; });
    if (row >= 0 && t.rows[row][t.col['Checked In']]) {
      return { checkedIn: new Date(t.rows[row][t.col['Checked In']]).getTime(), already: true };
    }
    const at = new Date();
    if (row >= 0) {
      setCell_(t, row, 'Checked In', at);
      setCell_(t, row, 'Check-in Method', method);
    } else {
      appendRow_(t, { 'Timestamp': at, 'Post ID': pid, 'Employee ID': "'" + me, 'Full Name': clean_(user.name), 'Checked In': at, 'Check-in Method': method });
    }
    return { checkedIn: at.getTime() };
  });
}

/** Trainer, poster, HR, Admin: everyone who signed up or checked in, with times. */
function actionAttendanceReport_(req) {
  const user = auth_(req).user;
  const x = trainingPost_(String(req.postId || ''));
  if (!canRunCheckin_(user, x.p)) fail_('Only the trainer, HR or Admin can see the attendance report.');
  const t = table_(SHEET_ATTEND);
  const staff = table_(SHEET_STAFF);
  const byId = {};
  staff.rows.forEach(function (r, i) { const u = userAt_(staff, i); if (u.employeeId) byId[normId_(u.employeeId)] = u; });
  const seen = {};
  const rows = [];
  t.rows.forEach(function (r) {
    if (String(r[t.col['Post ID']]) !== String(x.p['Post ID'])) return;
    const id = normId_(r[t.col['Employee ID']]);
    if (!id || seen[id]) return;
    seen[id] = true;
    const u = byId[id] || {};
    const ci = r[t.col['Checked In']];
    rows.push({ employeeId: id, name: u.name || cellText_(r[t.col['Full Name']]), department: u.department || '', position: u.position || '', property: u.property || '', photo: u.photo || '',
      signedUp: r[t.col['Timestamp']] ? new Date(r[t.col['Timestamp']]).getTime() : 0,
      checkedIn: ci ? new Date(ci).getTime() : 0, method: cellText_(r[t.col['Check-in Method']]) });
  });
  rows.sort(function (a, b) { return (b.checkedIn ? 1 : 0) - (a.checkedIn ? 1 : 0) || (a.checkedIn - b.checkedIn) || a.name.localeCompare(b.name); });
  const w = trainingWindow_(x.p);
  return { title: cellText_(x.p['Title']), date: dateString_(x.p['Event Date']), timing: cellText_(x.p['Timing']), location: cellText_(x.p['Location']),
    presenter: cellText_(x.p['Person Name']), opens: w ? w.opens.getTime() : 0, closes: w ? w.closes.getTime() : 0, rows: rows };
}

/**
 * Runs every 10 minutes (set up by setup()). When a session has ended, the trainer
 * (if they use the app) and whoever posted it get a notification to download the attendance report.
 */
function trainingWrapUp() {
  ensureSchema_();
  try { expireLeavers_(); } catch (e) { console.error('Leavers check failed', e); }
  const training = activeCategories_().filter(function (c) { return c.type === 'training'; }).map(function (c) { return c.id; });
  if (!training.length) return;
  const appUrl = (PropertiesService.getScriptProperties().getProperty('APP_URL') || '').replace(/\/$/, '');
  withLock_(function () {
    const posts = table_(SHEET_POSTS);
    const now = Date.now();
    posts.rows.forEach(function (r, i) {
      const p = rowObject_(posts, r);
      if (!p['Post ID'] || p['Status'] !== 'Live' || training.indexOf(String(p['Category'])) < 0 || p['Report Sent']) return;
      const w = trainingWindow_(p);
      if (!w || now < w.end.getTime() || now - w.end.getTime() > 2 * 864e5) return;
      const to = [];
      const trainer = normId_(String(p['Person ID'] || '').replace(/^'/, ''));
      if (trainer) to.push(trainer);
      const m = /\(([^)]*)\)\s*$/.exec(String(p['Posted By'] || ''));
      if (m && to.indexOf(normId_(m[1])) < 0) to.push(normId_(m[1]));
      const count = checkedInRows_(p['Post ID']).length;
      if (to.length) {
        oneSignal_({
          include_aliases: { external_id: to },
          headings: { en: 'Training finished: attendance report' },
          contents: { en: cellText_(p['Title']) + ': ' + count + ' checked in. Tap to view and download the report.' },
          web_url: appUrl ? appUrl + '/?report=' + encodeURIComponent(String(p['Post ID'])) : undefined
        });
      }
      setCell_(posts, i, 'Report Sent', new Date());
    });
  });
}

/** Anyone: attend (going = true) or stop attending a training session that has not passed. */
function actionAttend_(req) {
  const user = auth_(req).user;
  const postId = String(req.postId || '');
  return withLock_(function () {
    const posts = table_(SHEET_POSTS);
    const i = findPost_(posts, postId);
    if (i < 0) fail_('This training is no longer available.');
    const p = rowObject_(posts, posts.rows[i]);
    const cat = categories_().filter(function (c) { return c.id === String(p['Category']); })[0];
    if (!cat || cat.type !== 'training') fail_('Only training sessions can be attended.');
    if (p['Event Date'] && dayKey_(p['Event Date']) < dayKey_(new Date())) fail_('This training has already taken place.');
    const t = table_(SHEET_ATTEND);
    const me = normId_(user.employeeId);
    const mine = [];
    t.rows.forEach(function (r, k) { if (String(r[t.col['Post ID']]) === postId && normId_(r[t.col['Employee ID']]) === me) mine.push(k); });
    if (req.going && !mine.length) {
      appendRow_(t, { 'Timestamp': new Date(), 'Post ID': postId, 'Employee ID': "'" + me, 'Full Name': clean_(user.name) });
    } else if (!req.going && mine.length) {
      for (let k = mine.length - 1; k >= 0; k--) t.sh.deleteRow(mine[k] + 2);
    }
    const one = [clientPost_(p)];
    addAttendance_(one, user);
    return { attending: !!one[0].attending, attendees: one[0].attendees || [] };
  });
}

function actionAck_(req) {
  const user = auth_(req).user;
  const postId = String(req.postId || '');
  if (!postId) fail_('Missing post.');
  return withLock_(function () {
    if (ackedBy_(user.employeeId).has(postId)) return {};
    appendRow_(table_(SHEET_LOG), {
      'Timestamp': new Date(),
      'Post ID': postId,
      'Employee ID': user.employeeId,
      'Full Name': user.name,
      'Action': 'Acknowledged'
    });
    return {};
  });
}

function actionCreatePost_(req) {
  const user = auth_(req).user;
  const p = req.post || {};
  if (publishableFor_(user).indexOf(p.category) < 0) fail_('Your role cannot publish this type of post.');
  const fields = postFields_(p, true);
  fillPerson_(fields, true);
  if (!String(fields['Title'] || '').trim()) fail_('Please add a title, or an Employee ID that is registered in the app.');
  const ctype = (categories_().filter(function (c) { return c.id === p.category; })[0] || {}).type;
  if (ctype === 'training' && !fields['Event Date']) fail_('Please choose the training date.');

  const id = 'P' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  const row = Object.assign(fields, {
    'Post ID': id,
    'Created': new Date(),
    'Category': p.category,
    'Send Push': !!p.sendPush,
    'Push Sent': false,
    'Posted By': user.name + ' (' + user.employeeId + ')',
    'Status': p.status === 'Draft' ? 'Draft' : 'Live'
  });

  withLock_(function () { appendRow_(table_(SHEET_POSTS), row); });

  let pushed = false;
  if (row['Send Push'] && row['Status'] === 'Live') {
    pushed = sendPush_(id, row);
    if (pushed) markPushSent_(id);
  }
  return { id: id, pushed: pushed };
}

function actionUpdatePost_(req) {
  const user = auth_(req).user;
  const p = req.post || {};
  return withLock_(function () {
    const t = table_(SHEET_POSTS);
    const i = findPost_(t, req.postId);
    if (i < 0) fail_('Post not found.');
    const existing = rowObject_(t, t.rows[i]);
    if (!canManage_(user, existing)) fail_('You can only change your own posts.');

    if (p.category && publishableFor_(user).indexOf(p.category) < 0) {
      fail_('Your role cannot publish this type of post.');
    }
    const fields = postFields_(p, false);
    fillPerson_(fields, false);
    if (p.category) fields['Category'] = p.category;
    if (p.status && ['Live', 'Draft', 'Removed'].indexOf(p.status) >= 0) fields['Status'] = p.status;
    Object.keys(fields).forEach(function (h) { setCell_(t, i, h, fields[h]); });

    let pushed = false;
    const newStatus = fields['Status'] || existing['Status'];
    if (p.sendPush && newStatus === 'Live' && existing['Push Sent'] !== true) {
      const merged = Object.assign({}, existing, fields);
      pushed = sendPush_(String(existing['Post ID']), merged);
      if (pushed) setCell_(t, i, 'Push Sent', true);
    }
    return { pushed: pushed };
  });
}

function actionMyPosts_(req) {
  const user = auth_(req).user;
  if (!publishableFor_(user).length) fail_('Not allowed.');
  const t = table_(SHEET_POSTS);
  const counts = ackCounts_();
  const today = dayKey_(new Date());
  const posts = t.rows
    .map(function (r) { return rowObject_(t, r); })
    .filter(function (p) { return p['Post ID'] && canManage_(user, p); })
    .map(function (p) {
      const c = clientPost_(p);
      c.ackCount = counts[c.id] || 0;
      c.expired = !!p['End Date'] && dayKey_(p['End Date']) < today;
      c.pushSent = p['Push Sent'] === true;
      return c;
    });
  posts.sort(function (a, b) { return b.created - a.created; });
  return { posts: posts };
}

function actionReadReport_(req) {
  const user = auth_(req).user;
  const t = table_(SHEET_POSTS);
  const i = findPost_(t, req.postId);
  if (i < 0) fail_('Post not found.');
  const post = rowObject_(t, t.rows[i]);
  if (!canManage_(user, post)) fail_('Not allowed.');

  const log = table_(SHEET_LOG);
  const ackedAt = {};
  log.rows.forEach(function (r) {
    if (String(r[log.col['Post ID']]) === String(req.postId)) {
      ackedAt[normId_(r[log.col['Employee ID']])] = r[log.col['Timestamp']];
    }
  });

  const staff = table_(SHEET_STAFF);
  const done = [];
  const pending = [];
  staff.rows.forEach(function (r, idx) {
    const u = userAt_(staff, idx);
    if (!u.employeeId || u.status !== 'Approved') return;
    if (!seesProperty_(u.property, post['Property'])) return;
    const item = { employeeId: u.employeeId, name: u.name, department: u.department, property: u.property };
    const at = ackedAt[normId_(u.employeeId)];
    if (at) {
      item.at = new Date(at).getTime();
      done.push(item);
    } else {
      pending.push(item);
    }
  });
  return { done: done, pending: pending };
}

function actionUploadFile_(req) {
  const user = auth_(req).user;
  if (!publishableFor_(user).length) fail_('Not allowed.');
  const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (types.indexOf(req.mimeType) < 0) fail_('Please upload a JPG, PNG, WEBP or PDF file.');
  const bytes = Utilities.base64Decode(String(req.data || ''));
  if (!bytes.length) fail_('The file is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) fail_('The file is too large (8 MB maximum).');

  return { url: saveUpload_(bytes, req.mimeType, req.name) };
}

/** Any signed-in person can set or remove their own profile photo. */
function actionSetPhoto_(req) {
  const a = auth_(req);
  let url = '';
  if (!req.remove) {
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(req.mimeType) < 0) fail_('Please choose a JPG, PNG or WEBP photo.');
    const bytes = Utilities.base64Decode(String(req.data || ''));
    if (!bytes.length) fail_('The photo is empty.');
    if (bytes.length > MAX_PHOTO_BYTES) fail_('The photo is too large (3 MB maximum).');
    url = saveUpload_(bytes, req.mimeType, 'photo-' + a.user.employeeId);
  }
  return withLock_(function () {
    const t = ensureColumn_(table_(SHEET_STAFF), 'Photo URL');
    const i = findStaff_(t, a.user.employeeId);
    setCell_(t, i, 'Photo URL', url);
    return { user: userAt_(t, i) };
  });
}

/** Returns an uploaded image as base64 so the app can draw it into the guest share image. */
function actionGetImage_(req) {
  auth_(req);
  const m = /\/d\/([\w-]{10,})/.exec(String(req.url || ''));
  if (!m) fail_('Image not found.');
  let file;
  try { file = DriveApp.getFileById(m[1]); } catch (e) { fail_('Image not found.'); }
  const folderId = uploadFolder_().getId();
  let inFolder = false;
  const parents = file.getParents();
  while (parents.hasNext()) { if (parents.next().getId() === folderId) { inFolder = true; break; } }
  // Also allowed: pictures already public by link (anyone could open them anyway), e.g. uploaded with an earlier folder.
  if (!inFolder) {
    let pub = false;
    try { const a = file.getSharingAccess(); pub = a === DriveApp.Access.ANYONE_WITH_LINK || a === DriveApp.Access.ANYONE; } catch (e) { pub = false; }
    if (!pub || !/^image\//.test(file.getMimeType())) fail_('Image not found.');
  }
  const blob = file.getBlob();
  return { mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function saveUpload_(bytes, mimeType, rawName) {
  const name = String(rawName || 'upload').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'upload';
  let file;
  try {
    file = uploadFolder_().createFile(Utilities.newBlob(bytes, mimeType, name));
  } catch (e) {
    console.error('Upload to Drive failed', e);
    fail_('The file could not be saved to Google Drive. In Apps Script, run setup once and allow Drive access, then deploy a new version. (' + String(e && e.message || e).slice(0, 120) + ')');
  }
  // Files take the uploads folder's link sharing. Setting it per file can be refused by Drive
  // (e.g. when the folder already shares more widely), so a refusal is not an error.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.log('Per-file sharing skipped (the folder sharing applies): ' + (e && e.message || e));
  }
  const fid = file.getId();
  return mimeType === 'application/pdf'
    ? 'https://drive.google.com/file/d/' + fid + '/view'
    : 'https://lh3.googleusercontent.com/d/' + fid;
}

/* ------------------------------------------------------------------ */
/* App settings and categories                                         */
/* ------------------------------------------------------------------ */

/** Public: what the sign-in screen and the app need before anyone signs in. */
function actionAppSettings_() {
  const s = settings_();
  return { heroImage: safeUrl_(s.heroImage), categories: activeCategories_(), theme: theme_(s), brand: brand_(s) };
}

/* Hotel logo and fonts (Admin › App setup). Fonts are stored as JSON in Settings › fonts: { slot: { id, name, mimeType } }. */
function fontsSetting_(s) {
  let f = {};
  try { f = JSON.parse(String((s || settings_()).fonts || '{}')) || {}; } catch (e) { f = {}; }
  const out = {};
  FONT_SLOTS.forEach(function (k) {
    if (f[k] && /^[\w-]{10,}$/.test(String(f[k].id || ''))) out[k] = { id: String(f[k].id), name: String(f[k].name || 'Font').slice(0, 80), mimeType: String(f[k].mimeType || 'font/woff2') };
  });
  return out;
}

/** What every screen needs to show the hotel brand: the logo and the uploaded fonts (names and file IDs only). */
function brand_(s) {
  s = s || settings_();
  const fonts = fontsSetting_(s);
  const pub = {};
  Object.keys(fonts).forEach(function (k) { pub[k] = { id: fonts[k].id, name: fonts[k].name }; });
  return { logo: safeUrl_(s.logo), logoTone: String(s.logoTone) === 'light' ? 'light' : 'dark', reportLogo: safeUrl_(s.reportLogo), hotels: hotels_(s), outletLogos: outletLogos_(s), fonts: pub };
}

/** Admin: upload a font file for one slot. Replaces (and bins) the previous file. */
function actionUploadFont_(req) {
  requireAdmin_(req);
  if (FONT_SLOTS.indexOf(req.slot) < 0) fail_('Unknown font.');
  const name = String(req.name || '').replace(/[^\w.\- ]+/g, '').slice(0, 80);
  const ext = (/\.(woff2|woff|ttf|otf)$/i.exec(name) || [])[1];
  if (!ext) fail_('Please choose a WOFF2, WOFF, TTF or OTF font file.');
  const bytes = Utilities.base64Decode(String(req.data || ''));
  if (!bytes.length) fail_('The file is empty.');
  if (bytes.length > MAX_FONT_BYTES) fail_('The font file is too large (2 MB maximum).');
  const sig = String.fromCharCode(bytes[0] & 255, bytes[1] & 255, bytes[2] & 255, bytes[3] & 255);
  const isFont = sig === 'wOF2' || sig === 'wOFF' || sig === 'OTTO' || sig === 'true' || sig === '\u0000\u0001\u0000\u0000';
  if (!isFont) fail_('That file is not a font. Please choose a WOFF2, WOFF, TTF or OTF file.');
  const mime = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' }[ext.toLowerCase()];
  const file = uploadFolder_().createFile(Utilities.newBlob(bytes, 'application/octet-stream', 'font-' + req.slot + '-' + name));
  return withLock_(function () {
    const fonts = fontsSetting_();
    if (fonts[req.slot]) { try { DriveApp.getFileById(fonts[req.slot].id).setTrashed(true); } catch (e) { /* already gone */ } }
    fonts[req.slot] = { id: file.getId(), name: name, mimeType: mime };
    setSetting_('fonts', JSON.stringify(fonts));
    const s = settings_();
    return { heroImage: safeUrl_(s.heroImage), brand: brand_(s) };
  });
}

/** Admin: remove the font in one slot (the app goes back to its built-in font). */
function actionRemoveFont_(req) {
  requireAdmin_(req);
  if (FONT_SLOTS.indexOf(req.slot) < 0) fail_('Unknown font.');
  return withLock_(function () {
    const fonts = fontsSetting_();
    if (fonts[req.slot]) { try { DriveApp.getFileById(fonts[req.slot].id).setTrashed(true); } catch (e) { /* already gone */ } }
    delete fonts[req.slot];
    setSetting_('fonts', JSON.stringify(fonts));
    const s = settings_();
    return { heroImage: safeUrl_(s.heroImage), brand: brand_(s) };
  });
}

/** Public (the sign-in screen uses the fonts too): the font file in one slot, as base64. */
function actionGetFont_(req) {
  const f = fontsSetting_()[req.slot];
  if (!f) fail_('No font uploaded.');
  let file;
  try { file = DriveApp.getFileById(f.id); } catch (e) { fail_('Font not found.'); }
  const cache = CacheService.getScriptCache();
  const key = 'font_' + f.id;
  const hit = cache.get(key);
  const data = hit || Utilities.base64Encode(file.getBlob().getBytes());
  if (!hit && data.length < 95000) { try { cache.put(key, data, 21600); } catch (e) { /* too large to cache */ } }
  return { id: f.id, mimeType: f.mimeType, data: data };
}


/* Seasonal app theme (Admin › App setup › App theme). Stored as JSON in Settings › theme. */
const THEME_PRESETS = ['default', 'ramadan', 'eid', 'nationalday', 'festive', 'diwali', 'summer', 'custom'];

function cleanTheme_(t) {
  t = t || {};
  const preset = THEME_PRESETS.indexOf(t.preset) >= 0 ? t.preset : 'default';
  const hex = function (v) { return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toUpperCase() : ''; };
  const out = {
    preset: preset,
    primary: hex(t.primary),
    accent: hex(t.accent),
    background: hex(t.background),
    animation: ANIMATIONS.indexOf(t.animation) >= 0 ? t.animation : 'none',
    greeting: String(t.greeting || '').trim().slice(0, 60),
    start: /^\d{4}-\d{2}-\d{2}$/.test(String(t.start || '')) ? t.start : '',
    end: /^\d{4}-\d{2}-\d{2}$/.test(String(t.end || '')) ? t.end : ''
  };
  if (out.start && out.end && out.end < out.start) fail_('The theme end date is before the start date.');
  return out;
}

/** The theme as saved (for Admin) plus whether it is showing today. */
function theme_(s) {
  let t;
  try { t = cleanTheme_(JSON.parse(String((s || settings_()).theme || '{}'))); } catch (e) { t = cleanTheme_({}); }
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  t.live = t.preset !== 'default' && (!t.start || t.start <= today) && (!t.end || t.end >= today);
  return t;
}

function actionAdminSettings_(req) {
  requireAdmin_(req);
  const s = settings_();
  const lists = table_(SHEET_LISTS);
  return { heroImage: safeUrl_(s.heroImage), categories: categories_(), outlets: listColumn_(lists, 'Outlets'),
    departments: listColumn_(lists, 'Departments'), theme: theme_(s), brand: brand_(s) };
}

/** Admin: replace the outlet list (Lists tab, Outlets column). Existing posts keep the outlet name they were saved with. */
function actionSaveOutlets_(req) {
  return { outlets: saveList_(req, 'Outlets', req.outlets, 'outlet') };
}

/** Admin: replace the department list (Lists tab, Departments column) shown at sign-up. */
function actionSaveDepartments_(req) {
  return { departments: saveList_(req, 'Departments', req.departments, 'department') };
}

function saveList_(req, header, items, noun) {
  requireAdmin_(req);
  const seen = {};
  const outlets = (Array.isArray(items) ? items : [])
    .map(function (o) { return String(o || '').trim().slice(0, 60); })
    .filter(function (o) {
      const k = o.toLowerCase();
      if (!o || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  if (!outlets.length) fail_('Please keep at least one ' + noun + '.');
  return withLock_(function () {
    let t = ensureColumn_(table_(SHEET_LISTS), header);
    const c = t.col[header];
    const old = Math.max(t.rows.length, outlets.length);
    if (old > 0) t.sh.getRange(2, c + 1, old, 1).clearContent();
    t.sh.getRange(2, c + 1, outlets.length, 1).setValues(outlets.map(function (o) { return [clean_(o)]; }));
    return outlets;
  });
}

/** Admin: permanently delete a post and its acknowledgements. */
function actionDeletePost_(req) {
  requireAdmin_(req);
  const id = String(req.postId || '');
  if (!id) fail_('Missing post.');
  return withLock_(function () {
    const t = table_(SHEET_POSTS);
    const i = findPost_(t, id);
    if (i < 0) fail_('Post not found.');
    t.sh.deleteRow(i + 2);
    const log = table_(SHEET_LOG);
    for (let k = log.rows.length - 1; k >= 0; k--) {
      if (String(log.rows[k][log.col['Post ID']]) === id) log.sh.deleteRow(k + 2);
    }
    return {};
  });
}

function actionSaveSettings_(req) {
  requireAdmin_(req);
  if (Object.prototype.hasOwnProperty.call(req, 'heroImage')) {
    const url = safeUrl_(req.heroImage);
    if (req.heroImage && !url) fail_('That image link is not valid.');
    withLock_(function () { setSetting_('heroImage', url); });
  }
  if (req.theme) {
    const t = cleanTheme_(req.theme);
    withLock_(function () { setSetting_('theme', JSON.stringify(t)); });
  }
  if (Object.prototype.hasOwnProperty.call(req, 'logo')) {
    const url = safeUrl_(req.logo);
    if (req.logo && !url) fail_('That logo link is not valid.');
    withLock_(function () { setSetting_('logo', url); });
  }
  if (req.outletLogos && typeof req.outletLogos === 'object') {
    const o = {};
    Object.keys(req.outletLogos).slice(0, 80).forEach(function (k) {
      const name = String(k).trim().slice(0, 60), url = safeUrl_(req.outletLogos[k]);
      if (name && url) o[name] = url;
    });
    withLock_(function () { setSetting_('outletLogos', JSON.stringify(o)); });
  }
  if (req.hotels && typeof req.hotels === 'object') {
    const h = cleanHotels_(req.hotels);
    withLock_(function () { setSetting_('hotels', JSON.stringify(h)); });
  }
  if (Object.prototype.hasOwnProperty.call(req, 'reportLogo')) {
    const url = safeUrl_(req.reportLogo);
    if (req.reportLogo && !url) fail_('That logo link is not valid.');
    withLock_(function () { setSetting_('reportLogo', url); });
  }
  if (Object.prototype.hasOwnProperty.call(req, 'logoTone')) {
    withLock_(function () { setSetting_('logoTone', req.logoTone === 'light' ? 'light' : 'dark'); });
  }
  return actionAdminSettings_(req);
}

function actionSaveCategory_(req) {
  requireAdmin_(req);
  const c = req.category || {};
  const label = String(c.label || '').trim();
  if (!label) fail_('Please give the category a name.');
  if (label.length > 40) fail_('Please keep the name under 40 characters.');
  if (CAT_TYPES.indexOf(c.type) < 0) fail_('Please choose a category type.');
  const color = validColor_(c.color) || 'grey';
  const group = CAT_GROUPS.indexOf(c.group) >= 0 ? c.group : 'general';
  const roles = (Array.isArray(c.roles) ? c.roles : []).filter(function (r) { return r === 'HR' || r === 'Marketing'; });
  const seenSub = {};
  const subs = (c.type === 'people' && Array.isArray(c.subcategories) ? c.subcategories : [])
    .map(function (x) { return String(x || '').replace(/,/g, ' ').trim().slice(0, 40); })
    .filter(function (x) { const k = x.toLowerCase(); if (!x || seenSub[k]) return false; seenSub[k] = true; return true; });

  return withLock_(function () {
    const t = ensureColumn_(ensureColumn_(table_(SHEET_CATS), 'Group'), 'Subcategories');
    const existing = categories_();
    const clash = existing.filter(function (x) { return x.label.toLowerCase() === label.toLowerCase() && x.id !== c.id; });
    if (clash.length) fail_('A category with this name already exists.');
    const row = {
      'Label': clean_(label),
      'Type': c.type,
      'Posting Roles': roles.join(', '),
      'Needs Acknowledge': !!c.ack,
      'Active': c.active !== false,
      'Color': color,
      'Group': group,
      'Subcategories': clean_(subs.join(', '))
    };
    let i = -1;
    if (c.id) {
      for (let k = 0; k < t.rows.length; k++) {
        if (String(t.rows[k][t.col['ID']]).trim() === String(c.id)) { i = k; break; }
      }
      if (i < 0) fail_('Category not found.');
      Object.keys(row).forEach(function (h) { setCell_(t, i, h, row[h]); });
    } else {
      row['ID'] = 'C' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
      appendRow_(t, row);
    }
    return { categories: categories_() };
  });
}

function categories_() {
  const t = table_(SHEET_CATS);
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .filter(function (c) { return String(c['ID'] || '').trim(); })
    .map(function (c) {
      const type = String(c['Type'] || '').trim();
      const color = String(c['Color'] || '').trim();
      return {
        id: String(c['ID']).trim(),
        label: String(c['Label'] || c['ID']).trim(),
        type: CAT_TYPES.indexOf(type) >= 0 ? type : 'update',
        roles: String(c['Posting Roles'] || '').split(',').map(function (s) { return s.trim(); })
          .filter(function (r) { return r === 'HR' || r === 'Marketing'; }),
        ack: isTrue_(c['Needs Acknowledge']),
        active: isTrue_(c['Active']),
        color: validColor_(color) || 'grey',
        group: CAT_GROUPS.indexOf(String(c['Group'] || '').trim()) >= 0 ? String(c['Group']).trim() : 'general',
        subcategories: type === 'people' ? String(c['Subcategories'] || '').replace(/^'/, '').split(',')
          .map(function (s) { return s.trim(); }).filter(Boolean) : []
      };
    });
}

function activeCategories_() {
  return categories_().filter(function (c) { return c.active; });
}

function settings_() {
  const t = table_(SHEET_SETTINGS);
  const o = {};
  t.rows.forEach(function (r) {
    const k = String(r[t.col['Key']] || '').trim();
    if (k) o[k] = r[t.col['Value']];
  });
  return o;
}

function setSetting_(key, value) {
  const t = table_(SHEET_SETTINGS);
  for (let i = 0; i < t.rows.length; i++) {
    if (String(t.rows[i][t.col['Key']]).trim() === key) { setCell_(t, i, 'Value', value); return; }
  }
  appendRow_(t, { 'Key': key, 'Value': value });
}

function isTrue_(v) {
  return v === true || String(v).trim().toUpperCase() === 'TRUE';
}

/* ------------------------------------------------------------------ */
/* Admin actions                                                       */
/* ------------------------------------------------------------------ */

/** Admins see everyone. HR see only pending access requests. */
function actionStaffList_(req) {
  const me = requireApprover_(req).user;
  const t = table_(SHEET_STAFF);
  const all = PropertiesService.getScriptProperties().getProperties();
  const now = Date.now();
  const devices = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try { const x = JSON.parse(all[k]); if (x.exp > now) (devices[x.id] = devices[x.id] || []).push({ device: x.device || '', at: x.at || 0 }); } catch (e) { /* ignore */ }
  });
  const staff = t.rows.map(function (r, i) {
    const u = userAt_(t, i);
    const signed = r[t.col['Signed Up']];
    u.signedUp = signed ? new Date(signed).getTime() : 0;
    u.devices = (devices[normId_(u.employeeId)] || []).sort(function (a, b) { return b.at - a.at; });
    return u;
  }).filter(function (u) { return u.employeeId && (me.role === 'Admin' || u.status === 'Pending'); });
  return { staff: staff };
}

function requireApprover_(req) {
  const a = auth_(req);
  if (a.user.role !== 'Admin' && a.user.role !== 'HR') fail_('Not allowed.');
  return a;
}

function actionSetStaff_(req) {
  const admin = requireApprover_(req).user;
  if (admin.role === 'HR') {
    // HR can approve or decline new requests (as Viewers). Roles and existing staff stay with Admins.
    if (['Approved', 'Declined'].indexOf(req.status) < 0) fail_('Admins only.');
    const t0 = table_(SHEET_STAFF);
    const k = findStaff_(t0, req.employeeId);
    if (k < 0 || userAt_(t0, k).status !== 'Pending') fail_('Only new requests can be approved by HR.');
    req.role = 'Viewer';
  }
  if (req.role && ROLES.indexOf(req.role) < 0) fail_('Unknown role.');
  if (req.status && STAFF_STATUSES.indexOf(req.status) < 0) fail_('Unknown status.');
  return withLock_(function () {
    const t = table_(SHEET_STAFF);
    const i = findStaff_(t, req.employeeId);
    if (i < 0) fail_('Staff member not found.');
    const self = normId_(req.employeeId) === normId_(admin.employeeId);
    if (self && ((req.role && req.role !== 'Admin') || (req.status && req.status !== 'Approved'))) {
      fail_('You cannot remove your own Admin access.');
    }
    if (req.role) setCell_(t, i, 'Role', req.role);
    if (req.status) {
      setCell_(t, i, 'Status', req.status);
      if (req.status === 'Approved') {
        setCell_(t, i, 'Approved By', admin.name);
        setCell_(t, i, 'Approved On', new Date());
        if (t.col['Last Working Day'] !== undefined && hasLeft_(userAt_(t, i))) setCell_(t, i, 'Last Working Day', '');
      } else {
        revokeSessions_(req.employeeId);
      }
    }
    return { user: userAt_(table_(SHEET_STAFF), i) };
  });
}

/** Clears a staff member's PIN so they choose a new one at their next sign-in. */
function actionResetPin_(req) {
  requireAdmin_(req);
  return withLock_(function () {
    const t = table_(SHEET_STAFF);
    const i = findStaff_(t, req.employeeId);
    if (i < 0) fail_('Staff member not found.');
    setCell_(t, i, 'PIN Hash', '');
    revokeSessions_(req.employeeId);
    return {};
  });
}

/* ------------------------------------------------------------------ */
/* Sessions and PINs                                                   */
/* ------------------------------------------------------------------ */

function auth_(req) {
  const props = PropertiesService.getScriptProperties();
  const raw = req.token ? props.getProperty('sess_' + req.token) : null;
  if (!raw) fail_('SESSION_EXPIRED');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) {
    props.deleteProperty('sess_' + req.token);
    fail_('SESSION_EXPIRED');
  }
  const t = table_(SHEET_STAFF);
  const i = findStaff_(t, s.id);
  if (i < 0) fail_('SESSION_EXPIRED');
  const user = userAt_(t, i);
  if (user.status === 'Approved' && hasLeft_(user)) { markLeft_(t, i); fail_('ACCESS_REMOVED'); }
  if (user.status !== 'Approved') fail_('ACCESS_REMOVED');
  return { user: user, staff: t, index: i };
}

function requireAdmin_(req) {
  const a = auth_(req);
  if (a.user.role !== 'Admin') fail_('Admins only.');
  return a;
}

function newSession_(id, device) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('sess_' + token,
    JSON.stringify({ id: normId_(id), exp: Date.now() + SESSION_DAYS * 864e5, at: Date.now(),
      device: String(device || '').replace(/[^\w .,·()\-]/g, '').slice(0, 40) }));
  return token;
}

/** Signed-in devices for one person, newest first: [{ device, at }]. */
function activeSessions_(employeeId) {
  const id = normId_(employeeId);
  const all = PropertiesService.getScriptProperties().getProperties();
  const now = Date.now();
  const out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try {
      const s = JSON.parse(all[k]);
      // Sessions from before this rule (no "at") don't block a new sign-in; they simply expire.
      if (s.id === id && s.exp > now && s.at) out.push({ device: s.device || '', at: s.at });
    } catch (e) { /* ignore */ }
  });
  return out.sort(function (a, b) { return b.at - a.at; });
}

/* ---------- Leavers: HR sets the last working day; access ends at 6:00 pm that day ---------- */

function markLeft_(t, i) {
  try {
    withLock_(function () {
      setCell_(t, i, 'Status', 'Left');
      revokeSessions_(t.rows[i][t.col['Employee ID']]);
    });
  } catch (e) { console.error('Could not mark leaver', e); }
}

/** Runs with the 10-minute trigger: ends access for everyone whose last working day has passed 6:00 pm. */
function expireLeavers_() {
  const t = table_(SHEET_STAFF);
  if (t.col['Last Working Day'] === undefined) return 0;
  let n = 0;
  t.rows.forEach(function (r, i) {
    const u = userAt_(t, i);
    if (u.employeeId && u.status === 'Approved' && hasLeft_(u)) { markLeft_(t, i); n++; }
  });
  return n;
}

/** HR / Admin: everyone with access (to search), plus who is leaving and who has left. */
function actionLeavers_(req) {
  requireApprover_(req);
  const t = table_(SHEET_STAFF);
  const staff = t.rows.map(function (r, i) { return userAt_(t, i); })
    .filter(function (u) { return u.employeeId && (u.status === 'Approved' || u.status === 'Left'); })
    .map(function (u) { return { employeeId: u.employeeId, name: u.name, department: u.department, property: u.property, role: u.role, status: u.status, photo: u.photo, lastDay: u.lastDay }; });
  return { staff: staff };
}

/** HR / Admin: set or clear someone's last working day (today or later). */
function actionSetLastDay_(req) {
  const me = requireApprover_(req).user;
  const date = String(req.date || '');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail_('Please choose a valid date.');
  if (date && date < Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')) fail_('The last working day can’t be in the past.');
  return withLock_(function () {
    const t = ensureColumn_(table_(SHEET_STAFF), 'Last Working Day');
    const i = findStaff_(t, req.employeeId);
    if (i < 0) fail_('Staff member not found.');
    const u = userAt_(t, i);
    if (normId_(u.employeeId) === normId_(me.employeeId)) fail_('You can’t set your own last working day. Please ask another HR colleague or your Admin.');
    if (u.role === 'Admin' && me.role !== 'Admin') fail_('Only an Admin can set the last working day for an Admin.');
    if (u.status === 'Left' && !date) {
      // Clearing the date for someone who has left gives their access back.
      setCell_(t, i, 'Status', 'Approved');
    } else if (u.status !== 'Approved') fail_('This person doesn’t have access to the app.');
    setCell_(t, i, 'Last Working Day', parseDate_(date));
    return { person: Object.assign({}, userAt_(t, i), { lastDay: date }) };
  });
}

/** The thank-you message for someone on their last working day. */
function farewell_(user) {
  if (!user.lastDay || user.lastDay !== Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')) return null;
  const names = { DXBAI: 'Embassy Suites by Hilton Dubai Business Bay', DXBPI: 'Hilton Garden Inn Dubai Business Bay' };
  const where = names[user.property] || (names.DXBAI + ' and ' + names.DXBPI);
  return { where: where, endsAt: leaveAt_(user.lastDay).getTime() };
}

/** Admin: sign a colleague out of every device (e.g. a lost or changed phone). */
function actionSignOutEverywhere_(req) {
  requireAdmin_(req);
  const t = table_(SHEET_STAFF);
  if (findStaff_(t, req.employeeId) < 0) fail_('Staff member not found.');
  revokeSessions_(req.employeeId);
  return {};
}

function pruneSessions_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try {
      if (JSON.parse(all[k]).exp < now) props.deleteProperty(k);
    } catch (e) {
      props.deleteProperty(k);
    }
  });
}

function revokeSessions_(employeeId) {
  const id = normId_(employeeId);
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try {
      if (JSON.parse(all[k]).id === id) props.deleteProperty(k);
    } catch (e) { /* ignore */ }
  });
}

function salt_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SALT');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SALT', s);
  }
  return s;
}

function hashPin_(id, pin) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    salt_() + '|' + normId_(id) + '|' + String(pin), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function legacyHash_(rawId, pin) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    salt_() + '|' + legacyId_(rawId) + '|' + String(pin), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function checkPinFormat_(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) fail_('PIN must be 4 digits.');
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

/** Category IDs this person may post in (Admins: every active category). */
function publishableFor_(user) {
  if (user.role === 'Viewer') return [];
  return activeCategories_()
    .filter(function (c) { return user.role === 'Admin' || c.roles.indexOf(user.role) >= 0; })
    .map(function (c) { return c.id; });
}

function canManage_(user, post) {
  if (user.role === 'Admin') return true;
  if (!publishableFor_(user).length) return false;
  return String(post['Posted By'] || '').slice(-(user.employeeId.length + 2)) === '(' + user.employeeId + ')';
}

/** Sheet fields from a post sent by the app. For updates, only the fields sent are returned. */
function postFields_(p, isNew) {
  const f = {};
  const has = function (k) { return isNew || Object.prototype.hasOwnProperty.call(p, k); };

  if (has('title')) {
    const title = String(p.title || p.personName || '').trim();
    if (!title && !p.personId) fail_('Please add a title.');
    f['Title'] = clean_(title);
  }
  if (has('property')) {
    if (POST_PROPERTIES.indexOf(p.property) < 0) fail_('Please choose a property.');
    f['Property'] = p.property;
  }
  if (has('outlet')) f['Outlet'] = clean_(p.outlet);
  if (has('message')) f['Message'] = clean_(p.message);
  if (has('price')) {
    const n = Number(p.price);
    f['Price (AED)'] = (p.price === '' || p.price == null || isNaN(n)) ? '' : n;
  }
  if (has('timing')) f['Timing'] = asText_(p.timing);
  if (has('days')) f['Days'] = asText_(p.days);
  if (has('ctaText')) f['CTA Text'] = clean_(String(p.ctaText || '').slice(0, 40));
  if (has('ctaLink')) f['CTA Link'] = cleanCtaLink_(p.ctaLink);
  if (has('location')) f['Location'] = clean_(p.location);
  if (has('inclusions')) {
    const list = Array.isArray(p.inclusions) ? p.inclusions : String(p.inclusions || '').split('\n');
    f['Inclusions'] = clean_(list.map(function (s) { return String(s).trim(); }).filter(Boolean).join('\n'));
  }
  if (has('serves')) f['Serves'] = asText_(p.serves);
  if (has('image')) f['Image URL'] = safeUrl_(p.image);
  if (has('menu')) f['Menu / PDF URL'] = safeUrl_(p.menu);
  if (has('attachment')) f['Attachment URL'] = safeUrl_(p.attachment);
  if (has('start')) f['Start Date'] = parseDate_(p.start);
  if (has('end')) f['End Date'] = parseDate_(p.end);
  if (has('priority')) f['Priority'] = p.priority === 'Urgent' ? 'Urgent' : 'Normal';
  if (has('pinned')) f['Pinned'] = !!p.pinned;
  if (has('collection')) {
    const cid = String(p.collection || '').trim();
    if (cid && !collections_().some(function (c) { return c.id === cid; })) fail_('That special collection no longer exists.');
    f['Collection'] = cid;
    if (has('collectionOnly')) f['Collection Only'] = !!(cid && p.collectionOnly);
  }
  if (has('style')) f['Style'] = NEWSLETTER_STYLES.indexOf(p.style) >= 0 ? p.style : 'Regular';
  if (has('themeColor')) f['Theme Color'] = validColor_(p.themeColor);
  if (has('animation')) f['Animation'] = ANIMATIONS.indexOf(p.animation) >= 0 ? p.animation : 'none';
  if (has('personName')) f['Person Name'] = clean_(String(p.personName || '').slice(0, 80));
  if (has('personId')) f['Person ID'] = p.personId ? "'" + normId_(p.personId) : '';
  if (has('position')) f['Position'] = asText_(String(p.position || '').slice(0, 80));
  if (has('subtitle')) f['Subtitle'] = asText_(String(p.subtitle || '').slice(0, 60));
  if (has('eventDate')) f['Event Date'] = parseDate_(p.eventDate);
  if (has('todaySpecial')) f['Today Special'] = !!p.todaySpecial;
  if (has('specialDate')) f['Special Date'] = parseDate_(p.specialDate);
  // How often it shows in Today's Special: off, date (Special Date), daily, weekly:1,3 (0 = Sunday), monthly:15.
  if (has('specialRepeat')) {
    const r = String(p.specialRepeat || '');
    f['Special Repeat'] = /^(off|date|daily|weekly:[0-6](,[0-6]){0,6}|monthly:([1-9]|[12]\d|3[01]))$/.test(r) ? "'" + r : '';
  }
  if (has('includes')) f['Includes'] = (Array.isArray(p.includes) ? p.includes : []).map(String)
    .filter(function (x) { return /^P[A-Z0-9]+$/.test(x); }).slice(0, 60).join(',');
  if (has('blocks')) f['Blocks'] = blocksCell_(p.blocks);
  if (has('shareable')) f['Shareable'] = !!p.shareable;
  if (has('plainText')) f['Plain Text'] = !!p.plainText;
  if (has('terms')) f['Terms'] = clean_(String(p.terms || '').slice(0, 2000));
  if (f['Start Date'] && f['End Date'] && f['End Date'] < f['Start Date']) {
    fail_('The end date is before the start date.');
  }
  return f;
}

function clientPost_(p) {
  return {
    id: String(p['Post ID']),
    created: p['Created'] ? new Date(p['Created']).getTime() : 0,
    category: p['Category'],
    property: normPostProperty_(p['Property']),
    outlet: p['Outlet'],
    title: p['Title'],
    message: p['Message'],
    price: p['Price (AED)'],
    timing: cellText_(p['Timing'], 'h:mm a'),
    days: cellText_(p['Days'], 'd MMMM'),
    ctaText: p['CTA Text'] || '',
    ctaLink: String(p['CTA Link'] || '').replace(/^'/, ''),
    location: p['Location'],
    inclusions: String(p['Inclusions'] || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
    serves: cellText_(p['Serves']),
    image: p['Image URL'],
    menu: p['Menu / PDF URL'],
    attachment: p['Attachment URL'],
    start: dateString_(p['Start Date']),
    end: dateString_(p['End Date']),
    priority: p['Priority'] || 'Normal',
    pinned: p['Pinned'] === true,
    postedBy: String(p['Posted By'] || '').replace(/\s*\([^)]*\)\s*$/, ''),
    status: p['Status'],
    collection: String(p['Collection'] || ''),
    collectionOnly: !!String(p['Collection'] || '').trim() && isTrue_(p['Collection Only']),
    style: p['Style'] || 'Regular',
    themeColor: p['Theme Color'] || '',
    animation: p['Animation'] || 'none',
    personName: p['Person Name'] || '',
    personId: String(p['Person ID'] || '').replace(/^'/, ''),
    position: cellText_(p['Position'], 'MMMM yyyy'),
    subtitle: cellText_(p['Subtitle'], 'MMMM yyyy'),
    eventDate: dateString_(p['Event Date']),
    todaySpecial: isTrue_(p['Today Special']),
    specialDate: dateString_(p['Special Date']),
    specialRepeat: String(p['Special Repeat'] || '').replace(/^'/, ''),
    terms: String(p['Terms'] || '').replace(/^'/, ''),
    blocks: parseBlocks_(p['Blocks']),
    shareable: isTrue_(p['Shareable']),
    plainText: isTrue_(p['Plain Text']),
    includes: String(p['Includes'] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
    postedById: (/\(([^)]*)\)\s*$/.exec(String(p['Posted By'] || '')) || [])[1] || '',
    personPhoto: safeUrl_(p['Person Photo'])
  };
}

/** Cluster posts reach everyone. Cluster colleagues see every post. Hotel staff see their hotel's posts. */
function seesProperty_(userProperty, postProperty) {
  const post = normPostProperty_(postProperty);
  if (post === 'Cluster') return true;
  if (HOTELS.indexOf(userProperty) < 0) return true;
  return userProperty === post;
}

/** Older or blank values ("Both", empty) count as Cluster. */
function normPostProperty_(v) {
  const s = String(v || '').trim();
  return HOTELS.indexOf(s) >= 0 ? s : 'Cluster';
}

function ackedBy_(employeeId) {
  const t = table_(SHEET_LOG);
  const id = normId_(employeeId);
  const set = new Set();
  t.rows.forEach(function (r) {
    if (normId_(r[t.col['Employee ID']]) === id) set.add(String(r[t.col['Post ID']]));
  });
  return set;
}

function ackCounts_() {
  const t = table_(SHEET_LOG);
  const counts = {};
  t.rows.forEach(function (r) {
    const id = String(r[t.col['Post ID']]);
    if (id) counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

function findPost_(t, postId) {
  const id = String(postId || '');
  for (let i = 0; i < t.rows.length; i++) {
    if (String(t.rows[i][t.col['Post ID']]) === id) return i;
  }
  return -1;
}

function markPushSent_(postId) {
  withLock_(function () {
    const t = table_(SHEET_POSTS);
    const i = findPost_(t, postId);
    if (i >= 0) setCell_(t, i, 'Push Sent', true);
  });
}

/* ------------------------------------------------------------------ */
/* Push notifications (OneSignal)                                      */
/* ------------------------------------------------------------------ */

/**
 * The app tags each device with property = DXBAI, DXBPI or ALL (cluster colleagues), and approved = 1.
 * Returns true if OneSignal accepted the notification; false if not configured or it failed.
 */
function sendPush_(postId, row) {
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('ONESIGNAL_APP_ID');
  const apiKey = props.getProperty('ONESIGNAL_API_KEY');
  const appUrl = props.getProperty('APP_URL');
  if (!appId || !apiKey) return false;

  const property = row['Property'];
  const filters = (HOTELS.indexOf(property) >= 0)
    ? [
        { field: 'tag', key: 'property', relation: '=', value: property },
        { operator: 'OR' },
        { field: 'tag', key: 'property', relation: '=', value: 'ALL' }
      ]
    : [{ field: 'tag', key: 'approved', relation: '=', value: '1' }];

  const cat = categories_().filter(function (c) { return c.id === row['Category']; })[0];
  const heading = (row['Priority'] === 'Urgent' ? 'Urgent: ' : '') + (cat ? cat.label : 'Update');

  const body = {
    filters: filters,
    headings: { en: heading },
    contents: { en: String(row['Title'] || '').replace(/^'/, '') }
  };
  if (appUrl) body.web_url = appUrl.replace(/\/$/, '') + '/?post=' + encodeURIComponent(postId);
  return oneSignal_(body);
}

/** Low-level OneSignal call. Returns true when accepted. */
function oneSignal_(body) {
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('ONESIGNAL_APP_ID');
  const apiKey = props.getProperty('ONESIGNAL_API_KEY');
  if (!appId || !apiKey) return false;
  body.app_id = appId;
  body.target_channel = 'push';
  try {
    const res = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Key ' + apiKey },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) {
      console.error('OneSignal error', res.getResponseCode(), res.getContentText());
      return false;
    }
    return true;
  } catch (err) {
    console.error('OneSignal request failed', err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* People posts                                                        */
/* ------------------------------------------------------------------ */

/**
 * If a post names an Employee ID (a colleague, or a training presenter), fill in the person's name
 * and photo from the Staff tab. The post image is only filled in for new people posts, so a
 * removed image stays removed.
 */
function fillPerson_(f, isNew) {
  if (!Object.prototype.hasOwnProperty.call(f, 'Person ID')) return;
  const id = String(f['Person ID'] || '').replace(/^'/, '');
  f['Person Photo'] = '';
  if (!id) return;
  const t = table_(SHEET_STAFF);
  const i = findStaff_(t, id);
  if (i < 0) return;
  const u = userAt_(t, i);
  f['Person Photo'] = u.photo || '';
  if (!String(f['Person Name'] || '').trim()) f['Person Name'] = clean_(u.name);
  if (isNew && !f['Event Date'] && !f['Image URL'] && u.photo) f['Image URL'] = u.photo;
  if (Object.prototype.hasOwnProperty.call(f, 'Title') && !String(f['Title'] || '').trim()) f['Title'] = clean_(u.name);
}

/** HR/Admin: look up a colleague by Employee ID while writing a people post. */
function actionLookupStaff_(req) {
  const user = auth_(req).user;
  if (['HR', 'Admin', 'Marketing'].indexOf(user.role) < 0) fail_('Not allowed.');
  const t = table_(SHEET_STAFF);
  const q = String(req.employeeId || req.query || '').trim();
  const i = findStaff_(t, q);
  if (i >= 0) {
    const u = userAt_(t, i);
    return { found: true, employeeId: u.employeeId, name: u.name, department: u.department, property: u.property, photo: u.photo };
  }
  // Not an Employee ID: search first and last names (every word typed must start a word of the name).
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { found: false, matches: [] };
  const matches = [];
  t.rows.forEach(function (r, k) {
    const u = userAt_(t, k);
    if (!u.employeeId || u.status !== 'Approved') return;
    const parts = u.name.toLowerCase().split(/\s+/);
    const ok = words.every(function (w) { return parts.some(function (p) { return p.indexOf(w) === 0; }) || u.employeeId.toLowerCase().indexOf(w.replace(/^0+(?=.)/, '')) >= 0; });
    if (ok && matches.length < 10) matches.push({ employeeId: u.employeeId, name: u.name, department: u.department, property: u.property, photo: u.photo });
  });
  if (matches.length === 1) return Object.assign({ found: true }, matches[0]);
  return { found: false, matches: matches };
}

/**
 * Admin: permanently delete the content they choose.
 * req.categories: post category IDs to empty (with their read records); req.popups, req.collections, req.birthdays: true to empty;
 * req.staff: true to remove every account except Admins.
 */
function actionResetContent_(req) {
  const admin = requireAdmin_(req).user;
  if (String(req.confirm || '') !== 'RESET') fail_('Type RESET to confirm.');
  const cats = (Array.isArray(req.categories) ? req.categories : []).map(String);
  const done = {};
  return withLock_(function () {
    if (cats.length) {
      const posts = table_(SHEET_POSTS);
      const gone = {};
      done.posts = keepRows_(posts, function (r) {
        const del = cats.indexOf(String(r[posts.col['Category']])) >= 0;
        if (del) gone[String(r[posts.col['Post ID']])] = true;
        return !del;
      });
      const log = table_(SHEET_LOG);
      keepRows_(log, function (r) { return !gone[String(r[log.col['Post ID']])]; });
      if (SpreadsheetApp.getActive().getSheetByName(SHEET_ATTEND)) {
        const at = table_(SHEET_ATTEND);
        keepRows_(at, function (r) { return !gone[String(r[at.col['Post ID']])]; });
      }
    }
    if (req.popups) done.popups = keepRows_(table_(SHEET_POPUPS), function () { return false; });
    if (req.collections) {
      done.collections = keepRows_(table_(SHEET_COLLS), function () { return false; });
      const posts = table_(SHEET_POSTS);
      if (posts.col['Collection'] !== undefined) posts.rows.forEach(function (r, i) { if (String(r[posts.col['Collection']]).trim()) setCell_(posts, i, 'Collection', ''); });
    }
    if (req.birthdays) done.birthdays = keepRows_(table_(SHEET_BDAYS), function () { return false; });
    if (req.staff) {
      const st = table_(SHEET_STAFF);
      done.staff = keepRows_(st, function (r) {
        return String(r[st.col['Role']]).trim() === 'Admin' || normId_(r[st.col['Employee ID']]) === normId_(admin.employeeId);
      });
    }
    console.log('Content reset by ' + admin.name + ' (' + admin.employeeId + '): ' + JSON.stringify(done));
    return { removed: done };
  });
}

/** Keeps only the rows where keep(row) is true. Rewrites the tab below the header in one go. Returns how many rows were removed. */
function keepRows_(t, keep) {
  const rows = t.rows.filter(function (r) { return r.some(function (v) { return v !== '' && v !== null; }); });
  const kept = rows.filter(keep);
  if (t.rows.length) t.sh.getRange(2, 1, t.rows.length, t.headers.length).clearContent();
  if (kept.length) t.sh.getRange(2, 1, kept.length, t.headers.length).setValues(kept.map(function (r) {
    // Text that starts with a zero or looks like a formula keeps its leading apostrophe.
    return t.headers.map(function (h, c) { const v = r[c]; return typeof v === 'string' && /^(0\d|[=+\-@])/.test(v) ? "'" + v : (v === undefined ? '' : v); });
  }));
  return rows.length - kept.length;
}

/* ------------------------------------------------------------------ */
/* Special collections (e.g. festive season)                           */
/* ------------------------------------------------------------------ */

function collections_() {
  const t = table_(SHEET_COLLS);
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .filter(function (c) { return String(c['ID'] || '').trim(); })
    .map(function (c) {
      return {
        id: String(c['ID']).trim(),
        name: String(c['Name'] || '').trim(),
        color: validColor_(c['Color']) || '#9B2C2C',
        animation: ANIMATIONS.indexOf(String(c['Animation'])) >= 0 ? String(c['Animation']) : 'none',
        banner: safeUrl_(c['Banner URL']),
        start: dateString_(c['Start Date']),
        end: dateString_(c['End Date']),
        active: isTrue_(c['Active']),
        blocks: parseBlocks_(c['Blocks']),
        createdBy: String(c['Created By'] || '').replace(/\s*\([^)]*\)\s*$/, '')
      };
    });
}

function activeCollections_() {
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return collections_().filter(function (c) {
    return c.active && (!c.start || c.start <= today) && (!c.end || c.end >= today);
  });
}

function canCollect_(user) {
  return user.role === 'Admin' || user.role === 'Marketing';
}

function actionCollections_(req) {
  const user = auth_(req).user;
  if (!canCollect_(user)) fail_('Not allowed.');
  return { collections: collections_() };
}

function actionSaveCollection_(req) {
  const user = auth_(req).user;
  if (!canCollect_(user)) fail_('Only Marketing and Admins can manage special collections.');
  const c = req.collection || {};
  const name = String(c.name || '').trim();
  if (!name) fail_('Please give the collection a name.');
  if (name.length > 40) fail_('Please keep the name under 40 characters.');
  const row = {
    'Name': clean_(name),
    'Color': validColor_(c.color) || '#9B2C2C',
    'Animation': ANIMATIONS.indexOf(c.animation) >= 0 ? c.animation : 'none',
    'Banner URL': safeUrl_(c.banner),
    'Start Date': parseDate_(c.start),
    'End Date': parseDate_(c.end),
    'Active': c.active !== false,
    'Blocks': blocksCell_(c.blocks)
  };
  if (row['Start Date'] && row['End Date'] && row['End Date'] < row['Start Date']) fail_('The end date is before the start date.');
  return withLock_(function () {
    const t = table_(SHEET_COLLS);
    if (c.id) {
      let i = -1;
      for (let k = 0; k < t.rows.length; k++) if (String(t.rows[k][t.col['ID']]).trim() === String(c.id)) { i = k; break; }
      if (i < 0) fail_('Collection not found.');
      Object.keys(row).forEach(function (h) { setCell_(t, i, h, row[h]); });
    } else {
      row['ID'] = 'S' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
      row['Created By'] = user.name + ' (' + user.employeeId + ')';
      appendRow_(t, row);
    }
    return { collections: collections_() };
  });
}

/* ------------------------------------------------------------------ */
/* Pop-ups (shown inside the app, e.g. 5 seconds after opening)        */
/* ------------------------------------------------------------------ */

const POPUP_FREQ = ['once', 'daily', 'always'];

function canPopups_(user) {
  return ['Admin', 'HR', 'Marketing'].indexOf(user.role) >= 0;
}

function popups_() {
  const t = table_(SHEET_POPUPS);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .filter(function (o) { return String(o['ID'] || '').trim(); })
    .map(function (o) {
      const x = {
        id: String(o['ID']).trim(),
        title: cellText_(o['Title']),
        message: cellText_(o['Message']),
        image: safeUrl_(o['Image URL']),
        buttonText: cellText_(o['Button Text']),
        buttonLink: cellText_(o['Button Link']),
        color: validColor_(o['Color']) || '#13294B',
        animation: ANIMATIONS.indexOf(String(o['Animation'])) >= 0 ? String(o['Animation']) : 'none',
        delay: Math.max(0, Math.min(120, Number(o['Delay Seconds']) || 0)),
        frequency: POPUP_FREQ.indexOf(String(o['Frequency'])) >= 0 ? String(o['Frequency']) : 'once',
        property: normPostProperty_(o['Property']),
        start: dateString_(o['Start Date']),
        end: dateString_(o['End Date']),
        active: isTrue_(o['Active']),
        createdBy: String(o['Created By'] || '').replace(/\s*\([^)]*\)\s*$/, ''),
        updated: o['Updated'] ? new Date(o['Updated']).getTime() : 0
      };
      x.live = x.active && (!x.start || x.start <= today) && (!x.end || x.end >= today);
      return x;
    });
}

function actionPopups_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Not allowed.');
  return { popups: popups_() };
}

function actionSavePopup_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Only Admin, HR and Marketing can manage pop-ups.');
  const c = req.popup || {};
  const title = String(c.title || '').trim();
  if (!title) fail_('Please give the pop-up a title.');
  let link = String(c.buttonLink || '').trim();
  if (link && !/^post:[A-Z0-9]+$/i.test(link) && !safeUrl_(link)) fail_('The button link must start with https://');
  const row = {
    'Title': asText_(title.slice(0, 80)),
    'Message': asText_(String(c.message || '').slice(0, 600)),
    'Image URL': safeUrl_(c.image),
    'Button Text': asText_(String(c.buttonText || '').slice(0, 30)),
    'Button Link': link ? "'" + link : '',
    'Color': validColor_(c.color) || '#13294B',
    'Animation': ANIMATIONS.indexOf(c.animation) >= 0 ? c.animation : 'none',
    'Delay Seconds': Math.max(0, Math.min(120, Math.round(Number(c.delay) || 0))),
    'Frequency': POPUP_FREQ.indexOf(c.frequency) >= 0 ? c.frequency : 'once',
    'Property': POST_PROPERTIES.indexOf(c.property) >= 0 ? c.property : 'Cluster',
    'Start Date': parseDate_(c.start),
    'End Date': parseDate_(c.end),
    'Active': c.active !== false,
    'Updated': new Date()
  };
  if (row['Start Date'] && row['End Date'] && row['End Date'] < row['Start Date']) fail_('The end date is before the start date.');
  return withLock_(function () {
    const t = table_(SHEET_POPUPS);
    if (c.id) {
      let i = -1;
      for (let k = 0; k < t.rows.length; k++) if (String(t.rows[k][t.col['ID']]).trim() === String(c.id)) { i = k; break; }
      if (i < 0) fail_('Pop-up not found.');
      Object.keys(row).forEach(function (h) { setCell_(t, i, h, row[h]); });
    } else {
      row['ID'] = 'U' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
      row['Created By'] = user.name + ' (' + user.employeeId + ')';
      appendRow_(t, row);
    }
    return { popups: popups_() };
  });
}

function actionDeletePopup_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Not allowed.');
  return withLock_(function () {
    const t = table_(SHEET_POPUPS);
    for (let k = t.rows.length - 1; k >= 0; k--) {
      if (String(t.rows[k][t.col['ID']]).trim() === String(req.id || '')) t.sh.deleteRow(k + 2);
    }
    return { popups: popups_() };
  });
}

/** Admin: permanently delete a special collection. Its posts stay, they just leave the collection. */
function actionDeleteCollection_(req) {
  requireAdmin_(req);
  const id = String(req.id || '').trim();
  if (!id) fail_('Missing collection.');
  return withLock_(function () {
    const t = table_(SHEET_COLLS);
    let found = false;
    for (let k = t.rows.length - 1; k >= 0; k--) {
      if (String(t.rows[k][t.col['ID']]).trim() === id) { t.sh.deleteRow(k + 2); found = true; }
    }
    if (!found) fail_('Collection not found.');
    const posts = table_(SHEET_POSTS);
    if (posts.col['Collection'] !== undefined) {
      posts.rows.forEach(function (r, i) { if (String(r[posts.col['Collection']]).trim() === id) setCell_(posts, i, 'Collection', ''); });
    }
    return { collections: collections_() };
  });
}

/* ------------------------------------------------------------------ */
/* Birthdays                                                           */
/* ------------------------------------------------------------------ */

/** Birthdays are stored as day and month only (MM-DD), never the year. */
function birthdayRows_() {
  const t = table_(SHEET_BDAYS);
  const staff = table_(SHEET_STAFF);
  const byId = {};
  staff.rows.forEach(function (r, i) { const u = userAt_(staff, i); if (u.employeeId) byId[normId_(u.employeeId)] = u; });
  return t.rows.map(function (r) {
    const o = rowObject_(t, r);
    const id = normId_(String(o['Employee ID'] || '').replace(/^'/, ''));
    const hr = String(o['Birthday'] || '').replace(/^'/, '').trim();
    const self = String(o['Self Birthday'] || '').replace(/^'/, '').trim();
    const okHr = /^\d{2}-\d{2}$/.test(hr), okSelf = /^\d{2}-\d{2}$/.test(self);
    // HR's date wins; a date the colleague added themselves is used until HR has one.
    const md = okHr ? hr : okSelf ? self : '';
    if (!id || !md) return null;
    const u = byId[id];
    if (u && u.status === 'Left') return null; // colleagues who have left are not celebrated any more
    return {
      hr: okHr ? hr : '',
      self: okSelf ? self : '',
      employeeId: id,
      name: (u && u.name) || String(o['Name'] || '').trim(),
      md: md,
      property: (u && u.property) || String(o['Property'] || '').trim() || 'Cluster',
      department: (u && u.department) || String(o['Department'] || '').trim(),
      position: (u && u.position) || '',
      photo: (u && u.photo) || '',
      registered: !!(u && u.status === 'Approved')
    };
  }).filter(Boolean);
}

function birthdaysFor_(user) {
  const now = new Date();
  const todayMd = Utilities.formatDate(now, TZ, 'MM-dd');
  const month = Utilities.formatDate(now, TZ, 'MM');
  const me = normId_(user.employeeId);
  const out = { today: [], month: [], mine: false };
  birthdayRows_().forEach(function (b) {
    if (b.employeeId === me && b.md === todayMd) out.mine = true;
    if (!seesProperty_(user.property, b.property)) return;
    const item = { employeeId: b.employeeId, name: b.name, department: b.department, position: b.position, property: b.property, photo: b.photo, day: Number(b.md.slice(3)), month: Number(b.md.slice(0, 2)) };
    if (b.md === todayMd) out.today.push(Object.assign({ isMe: b.employeeId === me }, item));
    if (b.md.slice(0, 2) === month) out.month.push(item);
  });
  out.month.sort(function (a, b) { return a.day - b.day || a.name.localeCompare(b.name); });
  return out;
}

function canBirthdays_(user) {
  return user.role === 'Admin' || user.role === 'HR';
}

function actionBirthdays_(req) {
  const user = auth_(req).user;
  if (!canBirthdays_(user)) fail_('Not allowed.');
  return { birthdays: birthdayRows_().map(function (b) {
    const mdObj = function (md) { return md ? { day: Number(md.slice(3)), month: Number(md.slice(0, 2)) } : null; };
    return { employeeId: b.employeeId, name: b.name, day: Number(b.md.slice(3)), month: Number(b.md.slice(0, 2)), property: b.property, department: b.department, registered: b.registered,
      hrDate: mdObj(b.hr), selfDate: mdObj(b.self), mismatch: !!(b.hr && b.self && b.hr !== b.self) };
  }) };
}

/** HR/Admin: add or update birthdays (merge), or replace the whole list. */
function actionSaveBirthdays_(req) {
  const user = auth_(req).user;
  if (!canBirthdays_(user)) fail_('Only HR and Admins can manage birthdays.');
  const rows = Array.isArray(req.rows) ? req.rows : [];
  if (!rows.length) fail_('No birthdays to save.');
  if (rows.length > 5000) fail_('Please upload up to 5,000 rows at a time.');
  const clean = [];
  const bad = [];
  rows.forEach(function (r, i) {
    const id = normId_(r.employeeId);
    const d = Number(r.day), m = Number(r.month);
    const valid = /^[A-Z0-9-]{1,15}$/.test(id) && m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate();
    if (!valid) { bad.push(i + 1); return; }
    clean.push({ id: id, md: ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2), name: String(r.name || '').trim().slice(0, 80),
      property: STAFF_PROPERTIES.indexOf(r.property) >= 0 ? r.property : '', department: String(r.department || '').trim().slice(0, 60) });
  });
  if (!clean.length) fail_('None of the rows had a valid Employee ID and date.');
  return withLock_(function () {
    const t = table_(SHEET_BDAYS);
    const now = new Date();
    if (req.mode === 'replace' && t.rows.length) {
      // Clear HR's dates only; dates colleagues added themselves in their Profile stay.
      t.sh.getRange(2, t.col['Birthday'] + 1, t.rows.length, 1).setValues(t.rows.map(function () { return ['']; }));
      t.rows.forEach(function (r) { r[t.col['Birthday']] = ''; });
    }
    const existing = {};
    t.rows.forEach(function (r, i) { const id = normId_(String(r[t.col['Employee ID']]).replace(/^'/, '')); if (id) existing[id] = i; });
    const toAppend = [];
    let updated = 0;
    clean.forEach(function (c) {
      const vals = { 'Employee ID': "'" + c.id, 'Name': clean_(c.name), 'Birthday': "'" + c.md, 'Property': c.property, 'Department': clean_(c.department), 'Updated': now };
      if (existing[c.id] === -1) return; // same person twice in one upload: keep the first
      if (existing[c.id] !== undefined) {
        const i = existing[c.id];
        Object.keys(vals).forEach(function (h) { if (h !== 'Name' || c.name) setCell_(t, i, h, vals[h]); });
        existing[c.id] = -1;
        updated++;
      } else {
        existing[c.id] = -1;
        toAppend.push(t.headers.map(function (h) { return Object.prototype.hasOwnProperty.call(vals, h) ? vals[h] : ''; }));
      }
    });
    if (toAppend.length) {
      const start = t.rows.length + 2;
      t.sh.getRange(start, 1, toAppend.length, t.headers.length).setValues(toAppend);
    }
    return { added: toAppend.length, updated: updated, skipped: bad };
  });
}

function actionDeleteBirthday_(req) {
  const user = auth_(req).user;
  if (!canBirthdays_(user)) fail_('Not allowed.');
  const id = normId_(req.employeeId);
  return withLock_(function () {
    const t = table_(SHEET_BDAYS);
    for (let k = t.rows.length - 1; k >= 0; k--) {
      if (normId_(String(t.rows[k][t.col['Employee ID']]).replace(/^'/, '')) === id) t.sh.deleteRow(k + 2);
    }
    return {};
  });
}

/** The signed-in person's birthday as HR has it and as they entered it. */
function myBirthdayInfo_(employeeId) {
  const t = table_(SHEET_BDAYS);
  const id = normId_(employeeId);
  const out = { hr: null, self: null };
  t.rows.forEach(function (r) {
    if (normId_(String(r[t.col['Employee ID']]).replace(/^'/, '')) !== id) return;
    const hr = String(r[t.col['Birthday']] || '').replace(/^'/, '').trim();
    const self = t.col['Self Birthday'] === undefined ? '' : String(r[t.col['Self Birthday']] || '').replace(/^'/, '').trim();
    if (/^\d{2}-\d{2}$/.test(hr)) out.hr = { day: Number(hr.slice(3)), month: Number(hr.slice(0, 2)) };
    if (/^\d{2}-\d{2}$/.test(self)) out.self = { day: Number(self.slice(3)), month: Number(self.slice(0, 2)) };
  });
  return out;
}

/** Anyone: add, change or remove their own birthday (day and month only). HR's date takes priority if it differs. */
function actionSetMyBirthday_(req) {
  const user = auth_(req).user;
  let md = '';
  if (!req.remove) {
    const d = Number(req.day), m = Number(req.month);
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate())) fail_('Please choose a valid date.');
    md = ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  return withLock_(function () {
    const t = table_(SHEET_BDAYS);
    const id = normId_(user.employeeId);
    let i = -1;
    t.rows.forEach(function (r, k) { if (i < 0 && normId_(String(r[t.col['Employee ID']]).replace(/^'/, '')) === id) i = k; });
    if (i >= 0) {
      setCell_(t, i, 'Self Birthday', md ? "'" + md : '');
      setCell_(t, i, 'Updated', new Date());
    } else if (md) {
      appendRow_(t, { 'Employee ID': "'" + id, 'Name': clean_(user.name), 'Birthday': '', 'Property': user.property,
        'Department': clean_(user.department), 'Updated': new Date(), 'Self Birthday': "'" + md });
    }
    return { myBirthdayInfo: myBirthdayInfo_(id) };
  });
}

/**
 * Runs every day at 9:00 am (Dubai) once setup() has been run.
 * Sends today's training reminders, then birthdays.
 * The birthday person gets a personal wish; approved colleagues who share their hotel
 * (and Cluster colleagues) get a reminder to wish them.
 */
function dailyBirthdayPush() {
  ensureSchema_();
  try { trainingPush_(); } catch (e) { console.error('Training notifications failed', e); }
  birthdayPush_();
}

/** Today's Learning & Development sessions: one notification each, to everyone the post is for. */
function trainingPush_() {
  const todayKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('TRAIN_PUSH_DAY') === todayKey) return;
  props.setProperty('TRAIN_PUSH_DAY', todayKey);
  const training = activeCategories_().filter(function (c) { return c.type === 'training'; }).map(function (c) { return c.id; });
  if (!training.length) return;
  const appUrl = (props.getProperty('APP_URL') || '').replace(/\/$/, '');
  const t = table_(SHEET_POSTS);
  t.rows.map(function (r) { return rowObject_(t, r); }).forEach(function (p) {
    if (!p['Post ID'] || p['Status'] !== 'Live' || training.indexOf(String(p['Category'])) < 0) return;
    if (dateString_(p['Event Date']) !== todayKey) return;
    const property = normPostProperty_(p['Property']);
    const filters = HOTELS.indexOf(property) >= 0
      ? [{ field: 'tag', key: 'property', relation: '=', value: property }, { operator: 'OR' }, { field: 'tag', key: 'property', relation: '=', value: 'ALL' }]
      : [{ field: 'tag', key: 'approved', relation: '=', value: '1' }];
    const bits = [String(p['Timing'] || '').trim(), String(p['Location'] || '').replace(/^'/, '').trim()].filter(Boolean);
    const who = String(p['Person Name'] || '').replace(/^'/, '').trim();
    oneSignal_({
      filters: filters,
      headings: { en: "Today's training: " + String(p['Title'] || '').replace(/^'/, '') },
      contents: { en: (bits.join(' · ') || 'Today') + (who ? ' · with ' + who : '') },
      web_url: appUrl ? appUrl + '/?post=' + encodeURIComponent(String(p['Post ID'])) : undefined
    });
  });
}

function birthdayPush_() {
  const todayKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('BDAY_PUSH_DAY') === todayKey) return;
  props.setProperty('BDAY_PUSH_DAY', todayKey);

  const todayMd = Utilities.formatDate(new Date(), TZ, 'MM-dd');
  const people = birthdayRows_().filter(function (b) { return b.md === todayMd; });
  if (!people.length) return;
  const appUrl = (props.getProperty('APP_URL') || '').replace(/\/$/, '');
  const staff = table_(SHEET_STAFF);
  const approved = staff.rows.map(function (r, i) { return userAt_(staff, i); })
    .filter(function (u) { return u.employeeId && u.status === 'Approved'; });
  const bdayIds = people.map(function (b) { return b.employeeId; });

  people.forEach(function (b) {
    const first = b.name.split(/\s+/)[0] || b.name;
    if (b.registered) {
      oneSignal_({
        include_aliases: { external_id: [b.employeeId] },
        headings: { en: 'Happy birthday, ' + first + '!' },
        contents: { en: 'Wishing you a wonderful day from all of us at DXBAI and DXBPI.' },
        web_url: appUrl ? appUrl + '/?birthday=1' : undefined
      });
    }
    const colleagues = approved
      .filter(function (u) { return bdayIds.indexOf(normId_(u.employeeId)) < 0 && seesProperty_(u.property, b.property); })
      .map(function (u) { return normId_(u.employeeId); });
    for (let i = 0; i < colleagues.length; i += 2000) {
      oneSignal_({
        include_aliases: { external_id: colleagues.slice(i, i + 2000) },
        headings: { en: "It's " + first + "'s birthday today" },
        contents: { en: "Don't forget to wish " + b.name + (b.department ? ' (' + b.department + ')' : '') + ' a happy birthday!' },
        web_url: appUrl || undefined
      });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Sheet helpers                                                       */
/* ------------------------------------------------------------------ */

function table_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name);
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(function (h) { return String(h).trim(); });
  const col = {};
  headers.forEach(function (h, i) { col[h] = i; });
  return { sh: sh, headers: headers, col: col, rows: values };
}

function rowObject_(t, row) {
  const o = {};
  t.headers.forEach(function (h, i) { o[h] = row[i]; });
  return o;
}

function appendRow_(t, obj) {
  t.sh.appendRow(t.headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  }));
}

function setCell_(t, rowIndex, header, value) {
  if (t.col[header] === undefined) throw new Error('Missing column: ' + header);
  t.sh.getRange(rowIndex + 2, t.col[header] + 1).setValue(value);
  t.rows[rowIndex][t.col[header]] = value;
}

/** Adds a header at the end of the tab if it is missing. Returns a fresh table. */
function ensureColumn_(t, header) {
  if (t.col[header] !== undefined) return t;
  t.sh.getRange(1, t.headers.length + 1).setValue(header);
  return table_(t.sh.getName());
}

function findStaff_(t, id) {
  const key = normId_(id);
  for (let i = 0; i < t.rows.length; i++) {
    if (normId_(t.rows[i][t.col['Employee ID']]) === key) return i;
  }
  return -1;
}

function userAt_(t, i) {
  const o = rowObject_(t, t.rows[i]);
  return {
    employeeId: normId_(o['Employee ID']),
    name: String(o['Full Name'] || '').trim(),
    department: String(o['Department'] || '').trim(),
    property: String(o['Property'] || '').trim(),
    role: ROLES.indexOf(String(o['Role']).trim()) >= 0 ? String(o['Role']).trim() : 'Viewer',
    status: String(o['Status'] || '').trim(),
    photo: safeUrl_(o['Photo URL']),
    position: cellText_(o['Position']),
    lastDay: o['Last Working Day'] ? dateString_(o['Last Working Day']) : ''
  };
}

/** When someone's access ends: 6:00 pm Dubai time on their last working day. */
function leaveAt_(lastDay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(lastDay || ''));
  return m ? dubaiDate_(Number(m[1]), Number(m[2]), Number(m[3]), LEAVE_HOUR, 0) : null;
}
function hasLeft_(u) {
  const at = leaveAt_(u.lastDay);
  return !!at && Date.now() >= at.getTime();
}

function listColumn_(t, header) {
  const c = t.col[header];
  if (c === undefined) return [];
  return t.rows.map(function (r) { return String(r[c]).trim(); }).filter(Boolean);
}

function uploadFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('UPLOAD_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* folder removed: make a new one */ }
  }
  const folder = DriveApp.createFolder('Team App Uploads');
  props.setProperty('UPLOAD_FOLDER_ID', folder.getId());
  return folder;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(message) {
  const err = new Error(message);
  err.userMessage = message;
  throw err;
}

/** Employee IDs: trimmed, capitals, and leading zeros ignored, so 0104582 and 104582 are the same person. */
function normId_(v) {
  return String(v == null ? '' : v).trim().replace(/^'/, '').toUpperCase().replace(/^0+(?=.)/, '');
}

/** How IDs were written before leading zeros were ignored. PINs saved then were hashed with this. */
function legacyId_(v) {
  return String(v == null ? '' : v).trim().replace(/^'/, '').toUpperCase();
}

/** Stores text exactly as typed (the sheet won't turn "October 2026" into a date). */
function asText_(v) {
  const s = String(v == null ? '' : v).trim();
  return s ? "'" + s : '';
}

/** A cell as text; dates the sheet created from typed text come back as e.g. "October 2026". */
function cellText_(v, dateFormat) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, dateFormat || 'd MMM yyyy');
  return String(v == null ? '' : v).replace(/^'/, '');
}

/** Stops typed text from being read as a formula by the sheet. */
function clean_(v) {
  const s = String(v == null ? '' : v).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** CTA target: an https:// link, a phone number, or a WhatsApp number written as wa:+971... */
function cleanCtaLink_(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^(wa:|whatsapp:)?\s*\+?[0-9][0-9\s-]{5,20}$/i.test(s)) return "'" + s;
  fail_('The call-to-action link must be a phone number or start with https://');
}

/** A named colour from the list, or a #RRGGBB hex value. */
function validColor_(v) {
  const s = String(v || '').trim();
  if (CAT_COLORS.indexOf(s) >= 0) return s;
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : '';
}

function safeUrl_(v) {
  const s = String(v || '').trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
}

function parseDate_(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '';
}

function dateString_(d) {
  return d ? Utilities.formatDate(new Date(d), TZ, 'yyyy-MM-dd') : '';
}

function dayKey_(d) {
  return Utilities.formatDate(new Date(d), TZ, 'yyyyMMdd');
}


/* ------------------------------------------------------------------ */
/* Quote of the day (Today page) and job titles                        */
/* ------------------------------------------------------------------ */

function quotes_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SHEET_QUOTES)) return [];
  const t = table_(SHEET_QUOTES);
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .map(function (o) { return { date: dateString_(o['Date']), text: cellText_(o['Quote']), author: cellText_(o['Author']) }; })
    .filter(function (q) { return q.date && q.text; });
}

/** The quote set for one day (yyyy-MM-dd), or null (the app then shows one of its own). */
function quoteFor_(day) {
  try {
    const q = quotes_().filter(function (x) { return x.date === day; })[0];
    return q ? { text: q.text, author: q.author } : null;
  } catch (e) { return null; }
}

/** Admin, HR, Marketing: quotes from a week ago onwards. */
function actionQuotes_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Not allowed.');
  const from = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), TZ, 'yyyy-MM-dd');
  return { quotes: quotes_().filter(function (q) { return q.date >= from; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }) };
}

/** Sets (or replaces) the quote for one day. */
function actionSaveQuote_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Only Admin, HR and Marketing can set the quote of the day.');
  const day = String(req.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail_('Please choose a date.');
  const text = String(req.text || '').trim().slice(0, 240);
  if (!text) fail_('Please write the quote.');
  const author = String(req.author || '').trim().slice(0, 60);
  return withLock_(function () {
    const t = table_(SHEET_QUOTES);
    let i = -1;
    for (let k = 0; k < t.rows.length; k++) if (dateString_(t.rows[k][t.col['Date']]) === day) { i = k; break; }
    if (i >= 0) {
      setCell_(t, i, 'Quote', asText_(text));
      setCell_(t, i, 'Author', asText_(author));
      setCell_(t, i, 'Updated', new Date());
    } else {
      appendRow_(t, { 'Date': "'" + day, 'Quote': asText_(text), 'Author': asText_(author), 'Created By': user.name + ' (' + user.employeeId + ')', 'Updated': new Date() });
    }
    return actionQuotes_(req);
  });
}

function actionDeleteQuote_(req) {
  const user = auth_(req).user;
  if (!canPopups_(user)) fail_('Not allowed.');
  const day = String(req.date || '');
  return withLock_(function () {
    const t = table_(SHEET_QUOTES);
    for (let k = t.rows.length - 1; k >= 0; k--) {
      if (dateString_(t.rows[k][t.col['Date']]) === day) t.sh.deleteRow(k + 2);
    }
    return actionQuotes_(req);
  });
}

/** Anyone: their own job title (shown on attendance sheets). */
function actionSetMyPosition_(req) {
  const user = auth_(req).user;
  const pos = String(req.position || '').trim().slice(0, 80);
  return withLock_(function () {
    const t = table_(SHEET_STAFF);
    const i = findStaff_(t, user.employeeId);
    if (i < 0) fail_('Staff member not found.');
    setCell_(t, i, 'Position', asText_(pos));
    return { user: userAt_(table_(SHEET_STAFF), i) };
  });
}


/* ------------------------------------------------------------------ */
/* Body sections (offers, newsletters, collections) and hotel profiles */
/* ------------------------------------------------------------------ */

/**
 * A post or collection body is a list of sections, in order:
 * {type:'text', heading, text}, {type:'image', url}, {type:'posts', title, ids:[...]},
 * and for collections {type:'auto'} = the posts in the collection.
 */
function cleanBlocks_(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.slice(0, 40).forEach(function (b) {
    if (!b || typeof b !== 'object') return;
    if (b.type === 'text') {
      const heading = String(b.heading || '').trim().slice(0, 120), text = String(b.text || '').trim().slice(0, 4000);
      if (heading || text) { const t = { type: 'text', heading: heading, text: text }; if (b.plain) t.plain = true; if (b.highlight) t.highlight = true; out.push(t); }
    } else if (b.type === 'image') {
      const url = safeUrl_(b.url);
      if (url) out.push({ type: 'image', url: url });
    } else if (b.type === 'posts') {
      const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter(function (x) { return /^P[A-Z0-9]+$/.test(x); }).slice(0, 40);
      if (ids.length) out.push({ type: 'posts', title: String(b.title || '').trim().slice(0, 80), ids: ids });
    } else if (b.type === 'divider') {
      out.push({ type: 'divider' });
    } else if (b.type === 'auto') {
      if (!out.some(function (x) { return x.type === 'auto'; })) out.push({ type: 'auto' });
    }
  });
  return out;
}
function blocksCell_(list) {
  const b = cleanBlocks_(list);
  if (!b.length) return '';
  const json = JSON.stringify(b);
  if (json.length > 45000) fail_('The sections are too long. Please shorten the text.');
  return "'" + json;
}
function parseBlocks_(v) {
  const s = String(v || '').replace(/^'/, '').trim();
  if (!s || s.charAt(0) !== '[') return [];
  try { return cleanBlocks_(JSON.parse(s)); } catch (e) { return []; }
}

const HOTEL_KEYS = ['DXBAI', 'DXBPI', 'Cluster'];
const HOTEL_DEFAULTS = {
  DXBAI: { name: 'Embassy Suites by Hilton Dubai Business Bay' },
  DXBPI: { name: 'Hilton Garden Inn Dubai Business Bay' },
  Cluster: { name: 'Embassy Suites by Hilton & Hilton Garden Inn Dubai Business Bay' }
};
/** Name, address, contact details and footer logo for each hotel, used on what guests receive. */
function cleanHotels_(h) {
  const out = {};
  HOTEL_KEYS.forEach(function (k) {
    const x = (h && h[k]) || {};
    out[k] = {
      name: String(x.name || '').trim().slice(0, 120),
      address: String(x.address || '').trim().slice(0, 300),
      phone: String(x.phone || '').trim().slice(0, 40),
      email: String(x.email || '').trim().slice(0, 120),
      website: String(x.website || '').trim().slice(0, 160),
      logo: safeUrl_(x.logo)
    };
  });
  return out;
}
function hotels_(s) {
  let h = {};
  try { h = JSON.parse(String((s || settings_()).hotels || '{}')) || {}; } catch (e) { h = {}; }
  const c = cleanHotels_(h);
  HOTEL_KEYS.forEach(function (k) { if (!c[k].name) c[k].name = HOTEL_DEFAULTS[k].name; });
  return c;
}

/** Outlet name -> logo picture, printed in place of the outlet name on offers shared with guests. */
function outletLogos_(s) {
  try {
    const o = JSON.parse(String((s || settings_()).outletLogos || '{}')) || {};
    const out = {};
    Object.keys(o).forEach(function (k) { const u = safeUrl_(o[k]); if (u) out[k] = u; });
    return out;
  } catch (e) { return {}; }
}


/* ------------------------------------------------------------------ */
/* Live profile photos on people posts, and birthday wishes            */
/* ------------------------------------------------------------------ */

/** People posts (Employee of the Month, New Joiners, Promotions) show the colleague's current
 *  profile photo, so when someone updates their photo it refreshes everywhere, for everyone. */
function applyLivePhotos_(posts, activeCats) {
  var peopleTypes = {};
  (activeCats || activeCategories_()).forEach(function (c) { if (c.type === 'people') peopleTypes[c.id] = true; });
  if (!posts.some(function (p) { return peopleTypes[p.category] && p.personId; })) return;
  var staff = table_(SHEET_STAFF);
  var photoById = {};
  staff.rows.forEach(function (r, i) { var u = userAt_(staff, i); if (u.employeeId) photoById[normId_(u.employeeId)] = u.photo || ''; });
  posts.forEach(function (p) {
    if (!peopleTypes[p.category] || !p.personId) return;
    var live = photoById[normId_(p.personId)];
    if (live) p.image = live;
  });
}

/** Birthday wishes stored today: map "wisher>target" -> {emoji,name}, and counts/my-wishes for a user. */
const WISH_EMOJI = ['\uD83C\uDF89', '\uD83C\uDF8A', '\uD83E\uDD73']; // 🎉 🎊 🥳
function wishesToday_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SHEET_WISHES)) return [];
  const t = table_(SHEET_WISHES);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return t.rows.map(function (r) { return rowObject_(t, r); })
    .filter(function (o) { return dateString_(o['Date']) === today; })
    .map(function (o) {
      return { target: normId_(String(o['Target ID'] || '').replace(/^'/, '')), wisher: normId_(String(o['Wisher ID'] || '').replace(/^'/, '')),
        name: cellText_(o['Wisher Name']), emoji: String(o['Emoji'] || ''), at: o['Updated'] ? new Date(o['Updated']).getTime() : 0 };
    });
}
/** Adds this user's wish summary onto today's birthday items (count received, my chosen emoji). */
function addWishInfo_(bd, user) {
  var all;
  try { all = wishesToday_(); } catch (e) { return; }
  const me = normId_(user.employeeId);
  const countBy = {}, mySent = {};
  all.forEach(function (w) { countBy[w.target] = (countBy[w.target] || 0) + 1; if (w.wisher === me) mySent[w.target] = w.emoji; });
  (bd.today || []).forEach(function (it) {
    if (it.employeeId === me) it.wishCount = countBy[me] || 0;
    else it.myWish = mySent[it.employeeId] || '';
  });
}

/** Anyone: send a birthday wish to a colleague whose birthday is today, with a chosen emoji.
 *  One wish per colleague per day (changing the emoji updates it); a push is sent on the first wish. */
function actionWishBirthday_(req) {
  const user = auth_(req).user;
  const target = normId_(req.employeeId);
  if (!target) fail_('Who would you like to wish?');
  if (target === normId_(user.employeeId)) fail_('That is your own birthday.');
  const today = Utilities.formatDate(new Date(), TZ, 'MM-dd');
  if (!birthdayRows_().some(function (b) { return b.employeeId === target && b.md === today; })) fail_('It is not their birthday today.');
  const emoji = WISH_EMOJI.indexOf(String(req.emoji)) >= 0 ? String(req.emoji) : WISH_EMOJI[0];
  const me = normId_(user.employeeId);
  const dayIso = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const first = String(user.name || 'A colleague').trim();
  const isNew = withLock_(function () {
    const t = table_(SHEET_WISHES);
    var row = -1;
    for (var k = 0; k < t.rows.length; k++) {
      var o = rowObject_(t, t.rows[k]);
      if (dateString_(o['Date']) === dayIso && normId_(String(o['Target ID']).replace(/^'/, '')) === target && normId_(String(o['Wisher ID']).replace(/^'/, '')) === me) { row = k; break; }
    }
    if (row >= 0) { setCell_(t, row, 'Emoji', emoji); setCell_(t, row, 'Updated', new Date()); return false; }
    appendRow_(t, { 'Date': "'" + dayIso, 'Target ID': "'" + target, 'Wisher ID': "'" + me, 'Wisher Name': asText_(first), 'Emoji': emoji, 'Updated': new Date() });
    return true;
  });
  if (isNew) {
    try {
      oneSignal_({ include_aliases: { external_id: [target] }, headings: { en: emoji + ' Happy Birthday!' },
        contents: { en: first.split(/\s+/)[0] + ' sent you a birthday wish ' + emoji } });
    } catch (e) { /* recorded anyway */ }
  }
  const count = wishesToday_().filter(function (w) { return w.target === target; }).length;
  return { ok: true, count: count };
}

/** The birthday person (or HR/Admin) sees who wished them today, and with which emoji. */
function actionWishes_(req) {
  const user = auth_(req).user;
  const target = normId_(req.employeeId) || normId_(user.employeeId);
  if (target !== normId_(user.employeeId) && !canBirthdays_(user)) fail_('Not allowed.');
  const list = wishesToday_().filter(function (w) { return w.target === target; })
    .sort(function (a, b) { return b.at - a.at; })
    .map(function (w) { return { name: w.name, emoji: w.emoji }; });
  return { wishes: list, count: list.length };
}
