'use strict';

const { $, $$, todayStr, parseDate, diffDays, addDays, fmtDate, escapeHtml, pad, DAY } = Util;
const t = (k, v) => I18N.t(k, v);

/* ═══════════════ 状態 ═══════════════ */
const STORE_KEY = 'kinshu_v1';
const STATE_VERSION = 2;

const defaultState = {
  version: STATE_VERSION,
  onboarded: false,
  theme: 'auto',
  lang: 'auto',
  currency: '',             // '' = 言語から自動（ja→JPY / それ以外→USD）
  startDate: todayStr(),
  birthDate: '',
  drinksPerDay: 3,
  pricePerDrink: 500,
  calPerDrink: 150,
  goalDays: 30,
  goalCelebrated: 0,        // 祝福済みの目標値（重複紙吹雪の防止）
  reminderOn: false,
  reminderTime: '21:00',
  lastReminded: '',
  relapses: [],             // 飲んでしまった日 (YYYY-MM-DD)
  relapseNotes: {},         // { date: きっかけメモ }
  logs: {},                 // { date: { mood, craving, note, triggers[] } }
  bestStreak: 0,
  badgeDates: {},           // { 日数: 達成日 }
  reasons: [],              // 禁酒する理由
  rewardName: '',           // ごほうび貯金の目当て
  rewardPrice: 0,
  rewardCelebrated: '',     // 祝福済みのごほうび（name+price）
  tarotFlipped: '',         // タロットをめくった日
  advice: null,
  adviceHistory: {},
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    const s = { ...defaultState, ...parsed };
    if (!parsed.version || parsed.version < STATE_VERSION) {
      s.onboarded = true;                    // 既存ユーザーはオンボーディングを飛ばす
      s.version = STATE_VERSION;
    }
    return s;
  } catch (e) {
    return { ...defaultState };
  }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* 別タブでの変更を反映 */
window.addEventListener('storage', e => {
  if (e.key === STORE_KEY) { state = load(); applyTheme(); applyLang(); updateDerived(); render(); }
});

/* ═══════════════ 派生値の計算 ═══════════════ */
function streakStart() {
  let start = state.startDate;
  if (state.relapses.length) {
    const last = state.relapses.slice().sort().pop();
    const dayAfter = addDays(last, 1);
    if (parseDate(dayAfter) > parseDate(start)) start = dayAfter;
  }
  return start;
}
function currentDays() { return Math.max(0, diffDays(todayStr(), streakStart())); }
function elapsedDays() { return Math.max(0, diffDays(todayStr(), state.startDate)); }
function relapseCount() {
  const t = todayStr();
  return state.relapses.filter(d => d >= state.startDate && d <= t).length;
}
function totalSoberDays() { return Math.max(0, elapsedDays() - relapseCount()); }
function isRelapseDay(ds) { return state.relapses.includes(ds); }

const BADGES = [
  { days: 1,   emoji: '🌱' }, { days: 3,   emoji: '🍃' }, { days: 7,   emoji: '⭐' },
  { days: 14,  emoji: '💪' }, { days: 30,  emoji: '🏅' }, { days: 60,  emoji: '🎖️' },
  { days: 90,  emoji: '🏆' }, { days: 180, emoji: '💎' }, { days: 365, emoji: '👑' },
];
const badgeTitle = b => t('badge.d' + b.days);
const badgeSub = b => t('badge.d' + b.days + 's');

/* ═══════════════ 通貨 ═══════════════ */
const CURRENCIES = { JPY: '¥', USD: '$', EUR: '€', GBP: '£', KRW: '₩' };
function curCode() {
  return CURRENCIES[state.currency] ? state.currency : (I18N.lang() === 'ja' ? 'JPY' : 'USD');
}
function fmtMoney(n) {
  return CURRENCIES[curCode()] + Math.round(n).toLocaleString(I18N.locale());
}

/* 状態から派生する更新（描画とは分離）。新規達成バッジの配列を返す。 */
function updateDerived() {
  let changed = false;
  const days = currentDays();
  if (days > state.bestStreak) { state.bestStreak = days; changed = true; }

  const newly = [];
  const start = streakStart();
  for (const b of BADGES) {
    if (days >= b.days && !state.badgeDates[b.days]) {
      state.badgeDates[b.days] = addDays(start, b.days);
      newly.push(b);
      changed = true;
    }
  }
  if (changed) save();
  return newly.filter(b => state.badgeDates[b.days] === todayStr());
}

/* ═══════════════ 描画 ═══════════════ */
function render() {
  renderGreeting();
  renderHero();
  renderWeekStrip();
  renderGoal();
  renderReward();
  renderStats();
  renderAdvice();
  renderFortune();
  renderTodaySummary();
  renderLogList();
  renderCalendar();
  renderCharts();
  renderTriggerInsight();
  renderBadges();
}

/* --- あいさつ（時間帯＋日替わりのひとこと） --- */
function renderGreeting() {
  const h = new Date().getHours();
  const g = t(h < 5 ? 'greet.evening' : h < 11 ? 'greet.morning' : h < 18 ? 'greet.day' : 'greet.evening');
  const m = t('greet.m' + (Util.hashSeed(todayStr() + 'greet') % 8));
  $('#greeting').textContent = `${g} ${m}`;
}

/* --- ヒーロー（リング・肝臓・チップ） --- */
const RING_C = 2 * Math.PI * 86;
let lastAnimatedDays = null;

function renderHero() {
  const days = currentDays();
  animateNumber($('#daysCount'), days);
  $('.ring-days i').textContent = t(days === 1 ? 'ring.dayUnit1' : 'ring.dayUnit');
  $('#chipStreak').innerHTML = t('chip.streak', { n: days });
  $('#chipTotal').innerHTML = t('chip.total', { n: totalSoberDays() });
  $('#chipBest').innerHTML = t('chip.best', { n: state.bestStreak });
  $('#counterSub').textContent = t('hero.since', { d1: fmtDate(streakStart()), d2: fmtDate(state.startDate) });

  const next = BADGES.find(b => b.days > days);
  const prev = [...BADGES].reverse().find(b => b.days <= days);
  const base = prev ? prev.days : 0;
  let pct = 1;
  if (next) pct = Math.max(0.02, (days - base) / (next.days - base));
  $('#ringFg').style.strokeDashoffset = RING_C * (1 - pct);
  $('#ringSub').textContent = next
    ? t('hero.nextBadge', { emoji: next.emoji, title: badgeTitle(next), n: next.days - days })
    : t('hero.allBadges');

  renderLiver(days);
}

function animateNumber(el, target) {
  if (lastAnimatedDays === target) { el.textContent = target; return; }
  lastAnimatedDays = target;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) {
    el.textContent = target; return;
  }
  const dur = 700, t0 = performance.now();
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* --- 肝臓：30日で濃い茶色→健康的なピンク --- */
const LIVER_TARGET_DAYS = 30;
function liverColor(days) {
  const t = Math.max(0, Math.min(1, days / LIVER_TARGET_DAYS));
  const from = [43, 24, 16], to = [233, 150, 140];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function renderLiver(days) {
  const d = Math.min(days, LIVER_TARGET_DAYS);
  const body = document.getElementById('liverBody');
  if (body) body.setAttribute('fill', liverColor(d));
  const remain = Math.max(0, LIVER_TARGET_DAYS - d);
  $('#liverCaption').innerHTML = remain > 0 ? t('liver.remain', { n: remain }) : t('liver.done');
}

/* --- 直近7日ストリップ（タップでその日の記録へ） --- */
function renderWeekStrip() {
  const el = $('#weekStrip');
  if (!el) return;
  const today = todayStr();
  const dows = I18N.dows();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const ds = addDays(today, -i);
    const log = state.logs[ds];
    const relapse = isRelapseDay(ds);
    const inRange = ds >= state.startDate;
    const icon = relapse ? '🍺' : log ? (MOOD_EMOJI[log.mood] || '📝') : inRange ? '🌱' : '·';
    const cls = 'ws-day' + (ds === today ? ' today' : '') + (relapse ? ' relapse' : '') +
      (!log && !relapse ? ' faint' : '');
    html += `<button class="${cls}" data-date="${ds}" aria-label="${escapeHtml(t('ws.dayAria', { d: fmtDate(ds) }))}">
      <span class="ws-dow">${dows[parseDate(ds).getDay()]}</span><span class="ws-icon">${icon}</span></button>`;
  }
  el.innerHTML = html;
  $$('#weekStrip .ws-day').forEach(b =>
    b.addEventListener('click', () => openRecordSheet(b.dataset.date)));
}

/* --- 目標 --- */
function renderGoal() {
  const days = currentDays();
  const goal = Math.max(1, state.goalDays || 1);
  const pct = Math.min(100, Math.round((days / goal) * 100));
  const reached = days >= goal;
  $('#goalCard').classList.toggle('reached', reached);
  $('#goalCount').innerHTML = t('goal.count', { d: days, g: goal });
  $('#goalBar').style.width = Math.max(3, pct) + '%';
  $('#goalSub').textContent = reached
    ? t('goal.reached')
    : t('goal.progress', { p: pct, n: goal - days });

  if (reached && state.goalCelebrated !== goal) {
    state.goalCelebrated = goal;
    save();
    celebrate();
    toast(t('goal.toast', { g: goal }));
  }
}

/* --- ごほうび貯金 --- */
function savedMoney() { return Math.round(totalSoberDays() * state.drinksPerDay * state.pricePerDrink); }

function renderReward() {
  const card = $('#rewardCard');
  if (!card) return;
  const name = (state.rewardName || '').trim();
  const price = Math.round(Number(state.rewardPrice) || 0);
  if (!name || price <= 0) { card.hidden = true; return; }
  card.hidden = false;
  const money = savedMoney();
  const pct = Math.min(100, Math.round((money / price) * 100));
  const reached = money >= price;
  card.classList.toggle('reached', reached);
  $('#rewardCount').innerHTML = `<b>${fmtMoney(Math.min(money, price))}</b> / ${fmtMoney(price)}`;
  $('#rewardBar').style.width = Math.max(3, pct) + '%';
  $('#rewardSub').textContent = reached
    ? t('reward.reached', { name })
    : t('reward.progress', { name, money: fmtMoney(price - money), p: pct });

  const key = name + '|' + price;
  if (reached && state.rewardCelebrated !== key) {
    state.rewardCelebrated = key;
    save();
    celebrate();
    toast(t('reward.toast', { name }));
  }
}

/* --- 統計（通算ベース） --- */
function renderStats() {
  const total = totalSoberDays();
  const money = savedMoney();
  const cals = Math.round(total * state.drinksPerDay * state.calPerDrink);
  const drinks = Math.round(total * state.drinksPerDay);
  $('#moneySaved').textContent = fmtMoney(money);
  $('#calSaved').textContent = cals.toLocaleString(I18N.locale());
  $('#drinksAvoided').textContent = drinks.toLocaleString(I18N.locale());
  const el = elapsedDays();
  $('#soberRate').textContent = (el === 0 ? 100 : Math.round((total / el) * 100)) + '%';
}

/* --- AIアドバイス --- */
function renderAdvice(force) {
  const el = $('#adviceBody');
  if (!el || !window.Advisor) return;
  const today = todayStr();
  const age = Advisor.ageFrom(state.birthDate);

  const lang = I18N.lang();
  if (!force && state.advice && state.advice.date === today && state.advice.lang === lang &&
      state.advice.age === (age == null ? null : age) && state.advice.text) {
    el.textContent = state.advice.text;
    return;
  }
  const salt = (force && state.advice && state.advice.date === today) ? (state.advice.salt || 0) + 1 : 0;
  if (!state.adviceHistory) state.adviceHistory = {};
  const { text } = Advisor.generate({ days: currentDays(), age, date: today, salt, history: state.adviceHistory, lang });
  state.advice = { date: today, salt, age: (age == null ? null : age), text, lang };
  save();
  el.textContent = text;
}

/* --- タロット（タップでめくる） --- */
function renderFortune() {
  if (!window.Tarot) return;
  const today = todayStr();
  $('#fortuneDate').textContent = fmtDate(today);
  const flipped = state.tarotFlipped === today;
  const flip = $('#tarotFlip');
  flip.classList.toggle('flipped', flipped);
  flip.disabled = flipped;
  $('#fortuneInfo').hidden = !flipped;
  $('#fortuneDetail').hidden = !flipped;
  if (flipped) fillFortune();
}
function fillFortune() {
  const f = Tarot.drawFortune(state.birthDate, todayStr(), I18N.lang());
  $('#tarotVisual').classList.toggle('reversed', f.reversed);
  $('#tarotEmoji').textContent = f.card.emoji;
  $('#tarotNum').textContent = f.card.n;
  $('#fortuneName').innerHTML = `${escapeHtml(f.name)}<span class="orient">（${t(f.reversed ? 'fortune.reversed' : 'fortune.upright')}）</span>`;
  $('#fortuneStars').textContent = '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars);
  $('#fortuneMeaning').textContent = f.meaning;
  $('#fortuneAdvice').textContent = '💫 ' + f.advice;
  $('#fortuneLucky').innerHTML =
    `<span class="luck"><span class="swatch" style="background:${f.color.hex}"></span>${escapeHtml(t('fortune.color', { name: f.color.name }))}</span>` +
    `<span class="luck">🔢 ${f.luckyNumber}</span>` +
    `<span class="luck">🎁 ${escapeHtml(f.item)}</span>`;
}

/* --- 今日の記録サマリー --- */
const MOOD_EMOJI = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😣' };
function renderTodaySummary() {
  const td = todayStr();
  const log = state.logs[td];
  const el = $('#todaySummary');
  if (!log) {
    el.innerHTML = `<p class="empty">${escapeHtml(t('log.noneToday'))}</p>
      <button class="btn btn-primary btn-lg" id="logFromTab">${escapeHtml(t('btn.recordToday'))}</button>`;
    $('#logFromTab').addEventListener('click', () => openRecordSheet(td));
    return;
  }
  const tags = (log.triggers || []).map(triggerLabel).join('・');
  el.innerHTML = `<div class="today-summary">
      <span class="ts-emoji">${MOOD_EMOJI[log.mood] || '📝'}</span>
      <div class="ts-text">
        ${escapeHtml(t('log.done'))}
        <div class="ts-sub">${escapeHtml(t('log.craving', { n: log.craving }))}${tags ? ' ・ ' + escapeHtml(tags) : ''}</div>
      </div>
      <button class="btn" id="editToday">${escapeHtml(t('log.edit'))}</button>
    </div>`;
  $('#editToday').addEventListener('click', () => openRecordSheet(td));
}

/* きっかけタグは日本語キーで保存し、表示時に翻訳する */
function triggerLabel(key) {
  const l = t('triggerName.' + key);
  return l.startsWith('triggerName.') ? key : l;
}

/* --- 記録リスト --- */
function renderLogList() {
  const entries = Object.entries(state.logs).sort((a, b) => b[0].localeCompare(a[0]));
  const relapseSet = new Set(state.relapses);
  const list = $('#logList');
  const rows = [];
  for (const [date, log] of entries) rows.push({ date, log, relapse: relapseSet.has(date) });
  for (const date of state.relapses) if (!state.logs[date]) rows.push({ date, log: null, relapse: true });
  rows.sort((a, b) => b.date.localeCompare(a.date));

  if (!rows.length) {
    list.innerHTML = `<p class="empty">${escapeHtml(t('log.empty'))}</p>`;
    return;
  }
  list.innerHTML = rows.map(r => {
    const emoji = r.relapse ? '🍺' : (r.log ? MOOD_EMOJI[r.log.mood] || '📝' : '📝');
    const note = r.log && r.log.note ? escapeHtml(r.log.note) : '';
    const rNote = r.relapse && state.relapseNotes[r.date] ? escapeHtml(state.relapseNotes[r.date]) : '';
    const craving = r.log && r.log.craving != null ? ` ・ ${escapeHtml(t('log.craving', { n: r.log.craving }))}` : '';
    const tags = r.log && r.log.triggers && r.log.triggers.length
      ? `<div class="li-tags">${r.log.triggers.map(x => escapeHtml(triggerLabel(x))).join(' ・ ')}</div>` : '';
    const badge = r.relapse ? `<div class="li-badge">${escapeHtml(t('log.relapseBadge'))}${rNote ? '：' + rNote : ''}</div>` : '';
    return `<button class="log-item" data-date="${r.date}">
      <span class="li-emoji">${emoji}</span>
      <span class="li-body">
        <span class="li-date">${fmtDate(r.date)}${craving}</span>
        ${note ? `<span class="li-note">${note}</span>` : ''}
        ${tags}${badge}
      </span>
    </button>`;
  }).join('');
  $$('#logList .log-item').forEach(b =>
    b.addEventListener('click', () => openRecordSheet(b.dataset.date)));
}

/* --- カレンダー（タップで詳細） --- */
let calCursor = new Date();
let selectedDay = null;

function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $('#calTitle').textContent = I18N.lang() === 'ja'
    ? `${y}年 ${m + 1}月`
    : new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();

  const dows = I18N.dows();
  let html = dows.map(d => `<div class="cal-cell dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
    let cls = 'cal-cell';
    if (isRelapseDay(ds)) cls += ' relapse';
    else if (ds >= state.startDate && ds <= today) cls += ' sober';
    if (ds === today) cls += ' today';
    if (ds === selectedDay) cls += ' selected';
    const tappable = ds <= today;
    html += tappable
      ? `<button class="${cls}" data-date="${ds}">${d}</button>`
      : `<div class="${cls}" style="opacity:.4">${d}</div>`;
  }
  $('#calendar').innerHTML = html;
  $$('#calendar button.cal-cell').forEach(b =>
    b.addEventListener('click', () => showDayDetail(b.dataset.date)));
  renderDayDetail();
}

function showDayDetail(ds) {
  selectedDay = (selectedDay === ds) ? null : ds;
  renderCalendar();
}

function renderDayDetail() {
  const box = $('#dayDetail');
  if (!selectedDay) { box.hidden = true; return; }
  const ds = selectedDay;
  const log = state.logs[ds];
  const relapse = isRelapseDay(ds);
  const before = ds < state.startDate;

  let status = before ? t('dd.before') : relapse ? t('dd.drank') : t('dd.sober');
  let body = '';
  if (log) {
    body += `<div>${escapeHtml(t('dd.mood', { emoji: MOOD_EMOJI[log.mood] || '', n: log.craving }))}</div>`;
    if (log.triggers && log.triggers.length) body += `<div>${escapeHtml(t('dd.triggers', { list: log.triggers.map(triggerLabel).join('・') }))}</div>`;
    if (log.note) body += `<div>${escapeHtml(log.note)}</div>`;
  }
  if (relapse && state.relapseNotes[ds]) body += `<div>${escapeHtml(t('dd.note', { note: state.relapseNotes[ds] }))}</div>`;

  let actions = `<button class="btn" id="ddEdit">${escapeHtml(t(log ? 'dd.edit' : 'dd.add'))}</button>`;
  if (relapse) actions += `<button class="btn" id="ddUnrelapse">${escapeHtml(t('dd.unrelapse'))}</button>`;
  else if (!before) actions += `<button class="btn" id="ddRelapse">${escapeHtml(t('dd.relapse'))}</button>`;

  box.hidden = false;
  box.innerHTML = `<div class="dd-date">${fmtDate(ds)} — ${status}</div>${body}<div class="dd-actions">${actions}</div>`;

  $('#ddEdit').addEventListener('click', () => openRecordSheet(ds));
  const un = $('#ddUnrelapse');
  if (un) un.addEventListener('click', () => {
    state.relapses = state.relapses.filter(d => d !== ds);
    delete state.relapseNotes[ds];
    save(); updateDerived(); render();
    toast(t('dd.unrelapsed'));
  });
  const re = $('#ddRelapse');
  if (re) re.addEventListener('click', () => addRelapse(ds, ''));
}

/* --- チャート --- */
function renderCharts() {
  drawLineChart($('#moodChart'), d => (state.logs[d] ? state.logs[d].mood : null), 1, 5,
    t('stats.moodEmpty'));
  drawLineChart($('#cravingChart'), d => (state.logs[d] ? state.logs[d].craving : null), 0, 10,
    t('stats.cravingEmpty'));
}

function drawLineChart(canvas, valueFor, vMin, vMax, emptyMsg) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 320, h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const ds = todayStr(new Date(Date.now() - i * DAY));
    days.push({ ds, v: valueFor(ds) });
  }
  const px = 24, top = 14, bottom = h - 24;
  const stepX = (w - px * 2) / (days.length - 1);
  const yFor = v => bottom - ((v - vMin) / (vMax - vMin)) * (bottom - top);

  const css = getComputedStyle(document.body);
  const primary = css.getPropertyValue('--primary').trim() || '#0d9488';
  const muted = css.getPropertyValue('--muted').trim() || '#8fa3a0';

  ctx.strokeStyle = muted; ctx.globalAlpha = .25; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px, bottom); ctx.lineTo(w - px, bottom); ctx.stroke();
  ctx.globalAlpha = 1;

  /* 日付ラベル（両端と中央） */
  ctx.fillStyle = muted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  [0, 7, 13].forEach(i => {
    const [, m, d] = days[i].ds.split('-');
    ctx.fillText(`${Number(m)}/${Number(d)}`, px + i * stepX, h - 8);
  });

  const pts = days.map((d, i) => d.v != null ? { x: px + i * stepX, y: yFor(d.v) } : null);

  ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.beginPath();
  let started = false;
  pts.forEach(p => {
    if (!p) { started = false; return; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.fillStyle = primary;
  pts.forEach(p => { if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); } });

  if (pts.every(p => !p)) {
    ctx.fillStyle = muted; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(emptyMsg, w / 2, h / 2);
  }
}

/* --- きっかけの洞察 --- */
function renderTriggerInsight() {
  const counts = {};
  for (const log of Object.values(state.logs)) {
    for (const t of (log.triggers || [])) counts[t] = (counts[t] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const card = $('#triggerCard');
  if (!entries.length) { card.hidden = true; return; }
  card.hidden = false;
  const max = entries[0][1];
  const times = n => I18N.lang() === 'ja' ? `${n}回` : `${n}×`;
  $('#triggerInsight').innerHTML = entries.slice(0, 5).map(([name, n]) =>
    `<div class="ti-row"><span>${escapeHtml(triggerLabel(name))}</span>
      <span class="ti-bar"><i style="width:${Math.round(n / max * 100)}%"></i></span>
      <span class="ti-count">${times(n)}</span></div>`).join('') +
    `<p class="hint" style="margin-top:10px">${escapeHtml(t('stats.triggerHint', { name: triggerLabel(entries[0][0]) }))}</p>`;
}

/* --- バッジ --- */
function renderBadges() {
  const days = currentDays();
  $('#badgeGrid').innerHTML = BADGES.map(b => {
    const on = days >= b.days;
    const date = state.badgeDates[b.days];
    return `<div class="badge ${on ? 'unlocked' : 'locked'}">
      <div class="b-emoji">${b.emoji}</div>
      <div class="b-title">${escapeHtml(badgeTitle(b))}</div>
      <div class="b-sub">${on ? (date ? fmtDate(date) : escapeHtml(t('badge.done'))) : escapeHtml(t('badge.remain', { n: b.days - days }))}</div>
    </div>`;
  }).join('');
}

/* ═══════════════ 記録シート ═══════════════ */
let sheetDate = null;
let selectedMood = null;

function openRecordSheet(ds) {
  sheetDate = ds;
  const log = state.logs[ds] || {};
  $('#recordDateTitle').textContent = ds === todayStr()
    ? t('sheet.recordTitleToday')
    : t('sheet.recordTitle', { d: fmtDate(ds) });
  selectedMood = log.mood || null;
  $$('.mood').forEach(b => b.classList.toggle('selected', Number(b.dataset.mood) === selectedMood));
  $('#craving').value = log.craving || 0;
  $('#cravingOut').textContent = `${log.craving || 0} / 10`;
  const trigs = new Set(log.triggers || []);
  $$('#triggerRow .trigger').forEach(b => b.classList.toggle('selected', trigs.has(b.dataset.trigger)));
  $('#note').value = log.note || '';
  openSheet('#recordSheet');
}

function saveLog() {
  if (!sheetDate) return;
  if (!selectedMood) { toast(t('record.needMood')); return; }
  state.logs[sheetDate] = {
    mood: selectedMood,
    craving: Number($('#craving').value),
    note: $('#note').value.trim(),
    triggers: $$('#triggerRow .trigger.selected').map(b => b.dataset.trigger),
  };
  save();
  closeSheet('#recordSheet');
  const newly = updateDerived();
  render();
  if (newly.length) {
    celebrate();
    toast(t('badge.toast', { emoji: newly[0].emoji, title: badgeTitle(newly[0]) }));
  } else {
    toast(t('record.saved'));
  }
  buzz(12);
}

/* ═══════════════ スリップシート ═══════════════ */
let relapseDayOffset = 0;

function openRelapseSheet() {
  relapseDayOffset = 0;
  $$('#relapseDaySeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.day === '0'));
  $('#relapseNote').value = '';
  openSheet('#relapseSheet');
}

function addRelapse(ds, note) {
  const undoState = { relapses: [...state.relapses], notes: { ...state.relapseNotes } };
  if (!state.relapses.includes(ds)) state.relapses.push(ds);
  if (note) state.relapseNotes[ds] = note;
  save(); updateDerived(); render();
  switchTab('home');
  toast(t('relapse.toast'), {
    label: t('relapse.undo'),
    fn: () => {
      state.relapses = undoState.relapses;
      state.relapseNotes = undoState.notes;
      save(); updateDerived(); render();
      toast(t('relapse.undone'));
    },
  });
}

/* ═══════════════ SOS（深呼吸） ═══════════════ */
let breathTimer = null;

function openSos() {
  const box = $('#sosReasons');
  box.innerHTML = state.reasons.length
    ? `<p class="sr-title">${escapeHtml(t('sos.reasonsTitle'))}</p>` +
      state.reasons.map(r => `<div class="sr-item">🍀 ${escapeHtml(r)}</div>`).join('')
    : `<p class="sr-title">${escapeHtml(t('sos.noReasons'))}</p>`;
  $('#breathPhase').textContent = t('sos.ready');
  $('#breathCount').textContent = '60';
  $('#sosStart').hidden = false;
  $('#breathCircle').className = 'breath-circle';
  const ov = $('#sosOverlay');
  if (ov.classList.contains('hidden')) {
    ov.classList.remove('hidden');
    try { history.pushState({ sheet: '#sosOverlay' }, ''); } catch (e) {}
  }
}

function startBreathing() {
  $('#sosStart').hidden = true;
  const circle = $('#breathCircle');
  const phases = [
    { name: t('sos.in'), cls: 'in', sec: 4 },
    { name: t('sos.hold'), cls: 'hold', sec: 2 },
    { name: t('sos.out'), cls: 'out', sec: 6 },
  ];
  let remain = 60, pi = 0, phaseLeft = phases[0].sec;
  circle.className = 'breath-circle ' + phases[0].cls;
  $('#breathPhase').textContent = phases[0].name;
  $('#breathCount').textContent = remain;

  clearInterval(breathTimer);
  breathTimer = setInterval(() => {
    remain--; phaseLeft--;
    if (remain <= 0) {
      clearInterval(breathTimer);
      $('#breathPhase').textContent = t('sos.done');
      $('#breathCount').textContent = t('sos.doneSub');
      circle.className = 'breath-circle';
      return;
    }
    if (phaseLeft <= 0) {
      pi = (pi + 1) % phases.length;
      phaseLeft = phases[pi].sec;
      circle.className = 'breath-circle ' + phases[pi].cls;
      $('#breathPhase').textContent = phases[pi].name;
    }
    $('#breathCount').textContent = remain;
  }, 1000);
}

function closeSos(fromPop) {
  clearInterval(breathTimer);
  const ov = $('#sosOverlay');
  if (ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  if (!fromPop && history.state && history.state.sheet === '#sosOverlay') {
    try { history.back(); } catch (e) {}
  }
}

/* ═══════════════ 設定 ═══════════════ */
function openSettings() {
  $('#startDate').value = state.startDate;
  $('#goalDays').value = state.goalDays;
  $('#drinksPerDay').value = state.drinksPerDay;
  $('#pricePerDrink').value = state.pricePerDrink;
  $('#calPerDrink').value = state.calPerDrink;
  $('#rewardName').value = state.rewardName || '';
  $('#rewardPrice').value = state.rewardPrice || '';
  $('#birthDate').value = state.birthDate;
  $('#reasonsInput').value = state.reasons.join('\n');
  $('#reminderOn').checked = state.reminderOn;
  $('#reminderTime').value = state.reminderTime;
  $('#currency').value = curCode();
  $$('#themeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
  $$('#langSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === (state.lang || 'auto')));
  updateReminderUI();
  openSheet('#settingsSheet');
}

function updateReminderUI() {
  const on = $('#reminderOn').checked;
  $('#reminderTimeField').style.display = on ? '' : 'none';
  const hint = $('#reminderHint');
  if (!('Notification' in window)) hint.textContent = t('hint.noNotif');
  else if (!on) hint.textContent = t('hint.notifOff');
  else if (Notification.permission === 'denied') hint.textContent = t('hint.notifDenied');
  else hint.textContent = t('hint.notifOn');
}

async function saveSettings() {
  const sd = $('#startDate').value;
  if (sd && parseDate(sd) > new Date()) { toast(t('set.futureDate')); return; }
  state.startDate = sd || state.startDate;
  state.currency = $('#currency').value;
  state.goalDays = Math.max(1, Math.round(Number($('#goalDays').value) || 30));
  state.drinksPerDay = Math.max(0, Number($('#drinksPerDay').value) || 0);
  state.pricePerDrink = Math.max(0, Number($('#pricePerDrink').value) || 0);
  state.calPerDrink = Math.max(0, Number($('#calPerDrink').value) || 0);
  state.rewardName = $('#rewardName').value.trim();
  state.rewardPrice = Math.max(0, Math.round(Number($('#rewardPrice').value) || 0));
  const newBirth = $('#birthDate').value || '';
  if (newBirth !== state.birthDate) state.advice = null;
  state.birthDate = newBirth;
  state.reasons = $('#reasonsInput').value.split('\n').map(s => s.trim()).filter(Boolean);
  state.reminderTime = $('#reminderTime').value || '21:00';

  const wantReminder = $('#reminderOn').checked;
  if (wantReminder && 'Notification' in window && Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      $('#reminderOn').checked = false;
      toast(t('notif.denied'));
    }
  }
  state.reminderOn = $('#reminderOn').checked && ('Notification' in window) && Notification.permission === 'granted';

  save();
  closeSheet('#settingsSheet');
  scheduleReminder();
  updateDerived();
  render();
  toast(t('set.saved'));
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme || 'auto';
}

/* --- 言語の適用（静的HTML＋lang属性） --- */
function applyLang() {
  I18N.setLang(state.lang || 'auto');
  document.documentElement.lang = I18N.lang();
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.title = I18N.lang() === 'ja' ? '禁酒トラッカー' : 'Sober Tracker';
}

/* --- バックアップ --- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kinshu-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(t('backup.saved'));
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || !data.startDate || typeof data.logs !== 'object') {
        toast(t('backup.invalid')); return;
      }
      state = { ...defaultState, ...data, version: STATE_VERSION, onboarded: true };
      save(); applyTheme(); applyLang(); updateDerived(); render();
      closeSheet('#settingsSheet');
      toast(t('backup.loaded'));
    } catch (e) {
      toast(t('backup.failed'));
    }
  };
  reader.readAsText(file);
}

/* ═══════════════ リマインダー ═══════════════ */
let reminderTimer = null;
function scheduleReminder() {
  if (reminderTimer) { clearTimeout(reminderTimer); reminderTimer = null; }
  if (!state.reminderOn || !('Notification' in window) || Notification.permission !== 'granted') return;
  const [h, m] = (state.reminderTime || '21:00').split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) {
    maybeNotify();
    target.setDate(target.getDate() + 1);
  }
  const delay = Math.min(target - now, 2 ** 31 - 1);
  reminderTimer = setTimeout(() => { maybeNotify(); scheduleReminder(); }, delay);
}
function maybeNotify() {
  const td = todayStr();
  if (state.logs[td]) return;
  if (state.lastReminded === td) return;
  if (document.visibilityState === 'visible') return;   // 画面を見ている最中は不要
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  state.lastReminded = td;
  save();
  const days = currentDays();
  const body = days > 0 ? t('notif.body', { n: days }) : t('notif.body0');
  try { new Notification(t('notif.title'), { body, tag: 'kinshu-daily' }); } catch (e) { /* SW通知が必要なブラウザもある */ }
}

/* ═══════════════ オンボーディング ═══════════════ */
function showOnboarding() {
  $('#obStartDate').value = todayStr();
  if (I18N.lang() !== 'ja') $('#obPrice').value = 8;   // 海外向けの現実的な初期値（USD想定）
  $('#onboarding').classList.remove('hidden');
  let step = 1;
  const go = n => {
    step = n;
    $$('.ob-step').forEach(p => { p.hidden = Number(p.dataset.step) !== n; });
    $$('#obDots i').forEach((d, i) => d.classList.toggle('on', i === n - 1));
  };
  $('#obNext1').addEventListener('click', () => go(2));
  $('#obNext2').addEventListener('click', () => go(3));
  $('#obBack2').addEventListener('click', () => go(1));
  $('#obBack3').addEventListener('click', () => go(2));
  $$('#reasonChips .trigger').forEach(b =>
    b.addEventListener('click', () => b.classList.toggle('selected')));
  $('#obFinish').addEventListener('click', () => {
    const sd = $('#obStartDate').value;
    if (sd && parseDate(sd) <= new Date()) state.startDate = sd;
    state.reasons = $$('#reasonChips .trigger.selected').map(b => b.dataset.reason);
    state.drinksPerDay = Math.max(0, Number($('#obDrinks').value) || 3);
    state.pricePerDrink = Math.max(0, Number($('#obPrice').value) || (I18N.lang() === 'ja' ? 500 : 8));
    state.goalDays = Math.max(1, Math.round(Number($('#obGoal').value) || 30));
    state.birthDate = $('#obBirth').value || '';
    state.onboarded = true;
    save();
    $('#onboarding').classList.add('hidden');
    updateDerived();
    render();
    toast(t('ob.done'));
  });
}

/* ═══════════════ 紙吹雪 ═══════════════ */
function celebrate() {
  buzz([20, 60, 20]);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#2dd4bf'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 6 + Math.random() * 7;
    p.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;height:${size * (Math.random() > .5 ? 1 : 1.8)}px;` +
      `background:${colors[i % colors.length]};border-radius:${Math.random() > .5 ? '50%' : '2px'}`;
    document.body.appendChild(p);
    const drift = (Math.random() - .5) * 160;
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${drift}px, 105vh) rotate(${360 + Math.random() * 540}deg)`, opacity: .8 },
    ], { duration: 1900 + Math.random() * 1400, delay: Math.random() * 350, easing: 'cubic-bezier(.2,.6,.6,1)' })
      .onfinish = () => p.remove();
  }
}

/* ═══════════════ UI基盤（タブ・シート・トースト） ═══════════════ */
function switchTab(name) {
  $$('.nav-item').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  $$('.view').forEach(v => v.classList.toggle('active', v.id === name));
  if (name === 'stats') renderCharts();
  window.scrollTo({ top: 0 });
}

/* シートは開くと履歴を1つ積む → スマホの「戻る」で閉じられる */
const SHEET_SELS = ['#recordSheet', '#relapseSheet', '#settingsSheet'];
let lastFocus = null;

function openSheet(sel) {
  const el = $(sel);
  if (!el.classList.contains('hidden')) return;
  lastFocus = document.activeElement;
  el.classList.remove('hidden');
  try { history.pushState({ sheet: sel }, ''); } catch (e) {}
  const panel = el.querySelector('.sheet-panel, .sos-box');
  if (panel) { panel.setAttribute('tabindex', '-1'); panel.focus({ preventScroll: true }); }
}

function closeSheet(sel, fromPop) {
  const el = $(sel);
  if (el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  if (!fromPop && history.state && history.state.sheet === sel) {
    try { history.back(); } catch (e) {}
  }
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} lastFocus = null; }
}

window.addEventListener('popstate', () => {
  SHEET_SELS.forEach(s => closeSheet(s, true));
  const sos = $('#sosOverlay');
  if (sos && !sos.classList.contains('hidden')) closeSos(true);
});

/* 端末が対応していれば軽い振動でフィードバック */
function buzz(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern || 12); } catch (e) {} }
}

/* 実績のシェア（Web Share API → なければクリップボード） */
async function shareProgress() {
  const text = t('share.text', { days: currentDays(), total: totalSoberDays(), money: fmtMoney(savedMoney()) });
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(t('share.copied'));
  } catch (e) {
    toast(t('share.failed'));
  }
}

let toastTimer;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = escapeHtml(msg);
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => { el.classList.add('hidden'); action.fn(); });
    el.appendChild(btn);
  }
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), action ? 6000 : 2600);
}

/* ═══════════════ 起動 ═══════════════ */
function init() {
  applyTheme();
  applyLang();

  /* ナビ */
  $$('.nav-item').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  /* シェア */
  $('#shareBtn').addEventListener('click', shareProgress);

  /* ホーム */
  $('#recordTodayBtn').addEventListener('click', () => openRecordSheet(todayStr()));
  $('#relapseBtn').addEventListener('click', openRelapseSheet);
  $('#adviceRefresh').addEventListener('click', () => {
    const btn = $('#adviceRefresh');
    btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
    renderAdvice(true);
  });
  $('#tarotFlip').addEventListener('click', () => {
    if (state.tarotFlipped === todayStr()) return;
    state.tarotFlipped = todayStr();
    buzz(10);
    save();
    fillFortune();
    $('#tarotFlip').classList.add('flipped');
    setTimeout(() => { $('#fortuneInfo').hidden = false; $('#fortuneDetail').hidden = false; $('#tarotFlip').disabled = true; }, 400);
  });

  /* 記録シート */
  $$('.mood').forEach(btn => btn.addEventListener('click', () => {
    $$('.mood').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = Number(btn.dataset.mood);
  }));
  $('#craving').addEventListener('input', () => { $('#cravingOut').textContent = `${$('#craving').value} / 10`; });
  $$('#triggerRow .trigger').forEach(b => b.addEventListener('click', () => b.classList.toggle('selected')));
  $('#saveLogBtn').addEventListener('click', saveLog);
  $('#closeRecord').addEventListener('click', () => closeSheet('#recordSheet'));

  /* スリップシート */
  $$('#relapseDaySeg .seg-btn').forEach(b => b.addEventListener('click', () => {
    relapseDayOffset = Number(b.dataset.day);
    $$('#relapseDaySeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  }));
  $('#saveRelapseBtn').addEventListener('click', () => {
    const ds = addDays(todayStr(), -relapseDayOffset);
    closeSheet('#relapseSheet');
    addRelapse(ds, $('#relapseNote').value.trim());
  });
  $('#closeRelapse').addEventListener('click', () => closeSheet('#relapseSheet'));

  /* SOS */
  $('#sosBtn').addEventListener('click', openSos);
  $('#sosStart').addEventListener('click', startBreathing);
  $('#sosClose').addEventListener('click', () => closeSos());

  /* 設定 */
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#closeSettings').addEventListener('click', () => closeSheet('#settingsSheet'));
  $('#reminderOn').addEventListener('change', updateReminderUI);
  $$('#themeSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.theme = b.dataset.theme;
    $$('#themeSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    applyTheme(); save(); renderCharts();
  }));
  $$('#langSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.lang = b.dataset.lang;
    $$('#langSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    save(); applyLang(); updateReminderUI(); render();
  }));
  $('#exportBtn').addEventListener('click', exportData);
  $('#importFile').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
  $('#resetAll').addEventListener('click', () => {
    if (confirm(t('set.confirmReset'))) {
      localStorage.removeItem(STORE_KEY);
      state = { ...defaultState };
      save(); applyTheme(); applyLang(); render();
      closeSheet('#settingsSheet');
      showOnboarding();
    }
  });

  /* シートの背景タップ・Escで閉じる */
  SHEET_SELS.forEach(sel => {
    $(sel).addEventListener('click', e => { if (e.target === $(sel)) closeSheet(sel); });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    SHEET_SELS.forEach(s => closeSheet(s));
    closeSos();
  });

  /* カレンダー */
  $('#calPrev').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  const newly = updateDerived();
  render();
  if (newly.length) { celebrate(); toast(t('badge.toast', { emoji: newly[0].emoji, title: badgeTitle(newly[0]) })); }

  if (!state.onboarded) showOnboarding();

  scheduleReminder();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleReminder(); });
  window.addEventListener('resize', () => { if ($('#stats').classList.contains('active')) renderCharts(); });

  /* Service Worker 登録＋更新通知 */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast(t('sw.update'), { label: t('sw.reload'), fn: () => location.reload() });
          }
        });
      });
    }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
