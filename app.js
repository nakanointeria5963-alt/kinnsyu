'use strict';

const { $, $$, todayStr, parseDate, diffDays, addDays, fmtDate, escapeHtml, pad, DAY } = Util;

/* ═══════════════ 状態 ═══════════════ */
const STORE_KEY = 'kinshu_v1';
const STATE_VERSION = 2;

const defaultState = {
  version: STATE_VERSION,
  onboarded: false,
  theme: 'auto',
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
  if (e.key === STORE_KEY) { state = load(); updateDerived(); render(); }
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
  { days: 1,   emoji: '🌱', title: '1日目',  sub: '最初の一歩' },
  { days: 3,   emoji: '🍃', title: '3日',    sub: '山を越えた' },
  { days: 7,   emoji: '⭐', title: '1週間',  sub: '習慣の芽' },
  { days: 14,  emoji: '💪', title: '2週間',  sub: '体が軽い' },
  { days: 30,  emoji: '🏅', title: '30日',   sub: '1ヶ月達成' },
  { days: 60,  emoji: '🎖️', title: '60日',   sub: '2ヶ月' },
  { days: 90,  emoji: '🏆', title: '90日',   sub: '3ヶ月の壁' },
  { days: 180, emoji: '💎', title: '180日',  sub: 'ハーフイヤー' },
  { days: 365, emoji: '👑', title: '1年',    sub: '記念すべき1年' },
];

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
  renderHero();
  renderGoal();
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

/* --- ヒーロー（リング・肝臓・チップ） --- */
const RING_C = 2 * Math.PI * 86;
let lastAnimatedDays = null;

function renderHero() {
  const days = currentDays();
  animateNumber($('#daysCount'), days);
  $('#streakNum').textContent = days;
  $('#totalNum').textContent = totalSoberDays();
  $('#bestNum').textContent = state.bestStreak;
  $('#counterSub').textContent = `${fmtDate(streakStart())}から継続中 ・ 開始 ${fmtDate(state.startDate)}`;

  const next = BADGES.find(b => b.days > days);
  const prev = [...BADGES].reverse().find(b => b.days <= days);
  const base = prev ? prev.days : 0;
  let pct = 1;
  if (next) pct = Math.max(0.02, (days - base) / (next.days - base));
  $('#ringFg').style.strokeDashoffset = RING_C * (1 - pct);
  $('#ringSub').textContent = next ? `${next.emoji} ${next.title}まであと${next.days - days}日` : '👑 全バッジ達成！';

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
  $('#liverCaption').innerHTML = remain > 0
    ? `健康な肝臓まで<br><b>あと ${remain} 日</b>`
    : `健康な状態に到達 🎉`;
}

/* --- 目標 --- */
function renderGoal() {
  const days = currentDays();
  const goal = Math.max(1, state.goalDays || 1);
  const pct = Math.min(100, Math.round((days / goal) * 100));
  const reached = days >= goal;
  $('#goalCard').classList.toggle('reached', reached);
  $('#goalCount').innerHTML = `<b>${days}</b> / ${goal} 日`;
  $('#goalBar').style.width = Math.max(3, pct) + '%';
  $('#goalSub').textContent = reached
    ? '🎉 目標達成！設定から次の目標を決めて、さらに前へ。'
    : `達成率 ${pct}% ・ あと ${goal - days} 日`;

  if (reached && state.goalCelebrated !== goal) {
    state.goalCelebrated = goal;
    save();
    celebrate();
    toast(`🎉 目標 ${goal}日 を達成しました！`);
  }
}

/* --- 統計（通算ベース） --- */
function renderStats() {
  const total = totalSoberDays();
  const money = Math.round(total * state.drinksPerDay * state.pricePerDrink);
  const cals = Math.round(total * state.drinksPerDay * state.calPerDrink);
  const drinks = Math.round(total * state.drinksPerDay);
  $('#moneySaved').textContent = '¥' + money.toLocaleString('ja-JP');
  $('#calSaved').textContent = cals.toLocaleString('ja-JP');
  $('#drinksAvoided').textContent = drinks.toLocaleString('ja-JP');
  const el = elapsedDays();
  $('#soberRate').textContent = (el === 0 ? 100 : Math.round((total / el) * 100)) + '%';
}

/* --- AIアドバイス --- */
function renderAdvice(force) {
  const el = $('#adviceBody');
  if (!el || !window.Advisor) return;
  const today = todayStr();
  const age = Advisor.ageFrom(state.birthDate);

  if (!force && state.advice && state.advice.date === today &&
      state.advice.age === (age == null ? null : age) && state.advice.text) {
    el.textContent = state.advice.text;
    return;
  }
  const salt = (force && state.advice && state.advice.date === today) ? (state.advice.salt || 0) + 1 : 0;
  if (!state.adviceHistory) state.adviceHistory = {};
  const { text } = Advisor.generate({ days: currentDays(), age, date: today, salt, history: state.adviceHistory });
  state.advice = { date: today, salt, age: (age == null ? null : age), text };
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
  const f = Tarot.drawFortune(state.birthDate, todayStr());
  $('#tarotVisual').classList.toggle('reversed', f.reversed);
  $('#tarotEmoji').textContent = f.card.emoji;
  $('#tarotNum').textContent = f.card.n;
  $('#fortuneName').innerHTML = `${f.card.name}<span class="orient">（${f.orientation}）</span>`;
  $('#fortuneStars').textContent = '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars);
  $('#fortuneMeaning').textContent = f.meaning;
  $('#fortuneAdvice').textContent = '💫 ' + f.advice;
  $('#fortuneLucky').innerHTML =
    `<span class="luck"><span class="swatch" style="background:${f.color.hex}"></span>ラッキーカラー: ${f.color.name}</span>` +
    `<span class="luck">🔢 ${f.luckyNumber}</span>` +
    `<span class="luck">🎁 ${escapeHtml(f.item)}</span>`;
}

/* --- 今日の記録サマリー --- */
const MOOD_EMOJI = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😣' };
function renderTodaySummary() {
  const t = todayStr();
  const log = state.logs[t];
  const el = $('#todaySummary');
  if (!log) {
    el.innerHTML = `<p class="empty">まだ記録がありません。</p>
      <button class="btn btn-primary btn-lg" id="logFromTab">✍️ 今日を記録する</button>`;
    $('#logFromTab').addEventListener('click', () => openRecordSheet(t));
    return;
  }
  const tags = (log.triggers || []).join('・');
  el.innerHTML = `<div class="today-summary">
      <span class="ts-emoji">${MOOD_EMOJI[log.mood] || '📝'}</span>
      <div class="ts-text">
        記録済みです。今日もおつかれさまでした。
        <div class="ts-sub">渇望 ${log.craving}/10${tags ? ' ・ ' + escapeHtml(tags) : ''}</div>
      </div>
      <button class="btn" id="editToday">編集</button>
    </div>`;
  $('#editToday').addEventListener('click', () => openRecordSheet(t));
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
    list.innerHTML = `<p class="empty">まだ記録がありません。今日の気分を残しましょう。</p>`;
    return;
  }
  list.innerHTML = rows.map(r => {
    const emoji = r.relapse ? '🍺' : (r.log ? MOOD_EMOJI[r.log.mood] || '📝' : '📝');
    const note = r.log && r.log.note ? escapeHtml(r.log.note) : '';
    const rNote = r.relapse && state.relapseNotes[r.date] ? escapeHtml(state.relapseNotes[r.date]) : '';
    const craving = r.log && r.log.craving != null ? ` ・ 渇望 ${r.log.craving}/10` : '';
    const tags = r.log && r.log.triggers && r.log.triggers.length
      ? `<div class="li-tags">${r.log.triggers.map(escapeHtml).join(' ・ ')}</div>` : '';
    const badge = r.relapse ? `<div class="li-badge">リセットした日${rNote ? '：' + rNote : ''}</div>` : '';
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
  $('#calTitle').textContent = `${y}年 ${m + 1}月`;
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();

  const dows = ['日', '月', '火', '水', '木', '金', '土'];
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

  let status = before ? '記録期間外' : relapse ? '🍺 飲酒した日' : '🌱 禁酒できた日';
  let body = '';
  if (log) {
    body += `<div>${MOOD_EMOJI[log.mood] || ''} 気分 ・ 渇望 ${log.craving}/10</div>`;
    if (log.triggers && log.triggers.length) body += `<div>きっかけ: ${log.triggers.map(escapeHtml).join('・')}</div>`;
    if (log.note) body += `<div>${escapeHtml(log.note)}</div>`;
  }
  if (relapse && state.relapseNotes[ds]) body += `<div>メモ: ${escapeHtml(state.relapseNotes[ds])}</div>`;

  let actions = `<button class="btn" id="ddEdit">✍️ この日の記録を${log ? '編集' : '追加'}</button>`;
  if (relapse) actions += `<button class="btn" id="ddUnrelapse">スリップを取り消す</button>`;
  else if (!before) actions += `<button class="btn" id="ddRelapse">この日に飲んだと記録</button>`;

  box.hidden = false;
  box.innerHTML = `<div class="dd-date">${fmtDate(ds)} — ${status}</div>${body}<div class="dd-actions">${actions}</div>`;

  $('#ddEdit').addEventListener('click', () => openRecordSheet(ds));
  const un = $('#ddUnrelapse');
  if (un) un.addEventListener('click', () => {
    state.relapses = state.relapses.filter(d => d !== ds);
    delete state.relapseNotes[ds];
    save(); updateDerived(); render();
    toast('スリップの記録を取り消しました');
  });
  const re = $('#ddRelapse');
  if (re) re.addEventListener('click', () => addRelapse(ds, ''));
}

/* --- チャート --- */
function renderCharts() {
  drawLineChart($('#moodChart'), d => (state.logs[d] ? state.logs[d].mood : null), 1, 5,
    '記録するとここに気分の推移が表示されます');
  drawLineChart($('#cravingChart'), d => (state.logs[d] ? state.logs[d].craving : null), 0, 10,
    '記録するとここに渇望の推移が表示されます');
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
  $('#triggerInsight').innerHTML = entries.slice(0, 5).map(([name, n]) =>
    `<div class="ti-row"><span>${escapeHtml(name)}</span>
      <span class="ti-bar"><i style="width:${Math.round(n / max * 100)}%"></i></span>
      <span class="ti-count">${n}回</span></div>`).join('') +
    `<p class="hint" style="margin-top:10px">「${escapeHtml(entries[0][0])}」のときに飲みたくなりやすいようです。対策を考えておくと安心です。</p>`;
}

/* --- バッジ --- */
function renderBadges() {
  const days = currentDays();
  $('#badgeGrid').innerHTML = BADGES.map(b => {
    const on = days >= b.days;
    const date = state.badgeDates[b.days];
    return `<div class="badge ${on ? 'unlocked' : 'locked'}">
      <div class="b-emoji">${b.emoji}</div>
      <div class="b-title">${b.title}</div>
      <div class="b-sub">${on ? (date ? fmtDate(date) : '達成') : 'あと' + (b.days - days) + '日'}</div>
    </div>`;
  }).join('');
}

/* ═══════════════ 記録シート ═══════════════ */
let sheetDate = null;
let selectedMood = null;

function openRecordSheet(ds) {
  sheetDate = ds;
  const log = state.logs[ds] || {};
  $('#recordDateTitle').textContent = (ds === todayStr() ? '今日' : fmtDate(ds)) + 'の記録';
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
  if (!selectedMood) { toast('今日の気分を選んでください 🙂'); return; }
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
    toast(`${newly[0].emoji} ${newly[0].title} 達成！おめでとう！`);
  } else {
    toast('記録を保存しました ✍️');
  }
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
  toast('記録しました。また今日から、一歩ずつ 🌱', {
    label: '取り消す',
    fn: () => {
      state.relapses = undoState.relapses;
      state.relapseNotes = undoState.notes;
      save(); updateDerived(); render();
      toast('取り消しました');
    },
  });
}

/* ═══════════════ SOS（深呼吸） ═══════════════ */
let breathTimer = null;

function openSos() {
  const box = $('#sosReasons');
  box.innerHTML = state.reasons.length
    ? `<p class="sr-title">あなたが禁酒する理由：</p>` +
      state.reasons.map(r => `<div class="sr-item">🍀 ${escapeHtml(r)}</div>`).join('')
    : `<p class="sr-title">設定で「禁酒する理由」を登録すると、ここに表示されます。</p>`;
  $('#breathPhase').textContent = '準備';
  $('#breathCount').textContent = '60';
  $('#sosStart').hidden = false;
  $('#breathCircle').className = 'breath-circle';
  $('#sosOverlay').classList.remove('hidden');
}

function startBreathing() {
  $('#sosStart').hidden = true;
  const circle = $('#breathCircle');
  const phases = [
    { name: '吸って…', cls: 'in', sec: 4 },
    { name: '止めて', cls: 'hold', sec: 2 },
    { name: '吐いて…', cls: 'out', sec: 6 },
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
      $('#breathPhase').textContent = 'よく乗り越えました🎉';
      $('#breathCount').textContent = '波は引いていきます';
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

function closeSos() {
  clearInterval(breathTimer);
  $('#sosOverlay').classList.add('hidden');
}

/* ═══════════════ 設定 ═══════════════ */
function openSettings() {
  $('#startDate').value = state.startDate;
  $('#goalDays').value = state.goalDays;
  $('#drinksPerDay').value = state.drinksPerDay;
  $('#pricePerDrink').value = state.pricePerDrink;
  $('#calPerDrink').value = state.calPerDrink;
  $('#birthDate').value = state.birthDate;
  $('#reasonsInput').value = state.reasons.join('\n');
  $('#reminderOn').checked = state.reminderOn;
  $('#reminderTime').value = state.reminderTime;
  $$('#themeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
  updateReminderUI();
  openSheet('#settingsSheet');
}

function updateReminderUI() {
  const on = $('#reminderOn').checked;
  $('#reminderTimeField').style.display = on ? '' : 'none';
  const hint = $('#reminderHint');
  if (!('Notification' in window)) hint.textContent = 'この端末/ブラウザは通知に対応していません。';
  else if (!on) hint.textContent = 'アプリを開いている間、設定時刻に「まだ記録していない日」だけお知らせします。';
  else if (Notification.permission === 'denied') hint.textContent = '通知がブラウザでブロックされています。ブラウザの設定から許可してください。';
  else hint.textContent = '設定時刻にアプリ（またはホーム画面のPWA）を開いていると通知が届きます。';
}

async function saveSettings() {
  const sd = $('#startDate').value;
  if (sd && parseDate(sd) > new Date()) { toast('未来の日付は設定できません'); return; }
  state.startDate = sd || state.startDate;
  state.goalDays = Math.max(1, Math.round(Number($('#goalDays').value) || 30));
  state.drinksPerDay = Math.max(0, Number($('#drinksPerDay').value) || 0);
  state.pricePerDrink = Math.max(0, Number($('#pricePerDrink').value) || 0);
  state.calPerDrink = Math.max(0, Number($('#calPerDrink').value) || 0);
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
      toast('通知が許可されなかったため、リマインダーはオフのままです');
    }
  }
  state.reminderOn = $('#reminderOn').checked && ('Notification' in window) && Notification.permission === 'granted';

  save();
  closeSheet('#settingsSheet');
  scheduleReminder();
  updateDerived();
  render();
  toast('設定を保存しました');
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme || 'auto';
}

/* --- バックアップ --- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kinshu-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('バックアップを保存しました 📤');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || !data.startDate || typeof data.logs !== 'object') {
        toast('バックアップファイルの形式が正しくありません'); return;
      }
      state = { ...defaultState, ...data, version: STATE_VERSION, onboarded: true };
      save(); applyTheme(); updateDerived(); render();
      closeSheet('#settingsSheet');
      toast('バックアップを読み込みました 📥');
    } catch (e) {
      toast('読み込みに失敗しました。ファイルを確認してください');
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
  const t = todayStr();
  if (state.logs[t]) return;
  if (state.lastReminded === t) return;
  if (document.visibilityState === 'visible') return;   // 画面を見ている最中は不要
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  state.lastReminded = t;
  save();
  const days = currentDays();
  const body = days > 0
    ? `禁酒 ${days} 日目。今日の気分を記録して継続を残しましょう 🌱`
    : `今日の一歩を記録しましょう。あなたならできます 🌱`;
  try { new Notification('禁酒トラッカー', { body, tag: 'kinshu-daily' }); } catch (e) { /* SW通知が必要なブラウザもある */ }
}

/* ═══════════════ オンボーディング ═══════════════ */
function showOnboarding() {
  $('#obStartDate').value = todayStr();
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
    state.pricePerDrink = Math.max(0, Number($('#obPrice').value) || 500);
    state.goalDays = Math.max(1, Math.round(Number($('#obGoal').value) || 30));
    state.birthDate = $('#obBirth').value || '';
    state.onboarded = true;
    save();
    $('#onboarding').classList.add('hidden');
    updateDerived();
    render();
    toast('準備完了！一日ずつ、いきましょう 🌱');
  });
}

/* ═══════════════ 紙吹雪 ═══════════════ */
function celebrate() {
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

function openSheet(sel) { $(sel).classList.remove('hidden'); }
function closeSheet(sel) { $(sel).classList.add('hidden'); }

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

  /* ナビ */
  $$('.nav-item').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

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
  $('#sosClose').addEventListener('click', closeSos);

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
  $('#exportBtn').addEventListener('click', exportData);
  $('#importFile').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
  $('#resetAll').addEventListener('click', () => {
    if (confirm('すべての記録を完全に削除します。元に戻せません。よろしいですか？')) {
      localStorage.removeItem(STORE_KEY);
      state = { ...defaultState };
      save(); applyTheme(); render();
      closeSheet('#settingsSheet');
      showOnboarding();
    }
  });

  /* シートの背景タップ・Escで閉じる */
  ['#recordSheet', '#relapseSheet', '#settingsSheet'].forEach(sel => {
    $(sel).addEventListener('click', e => { if (e.target === $(sel)) closeSheet(sel); });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['#recordSheet', '#relapseSheet', '#settingsSheet'].forEach(closeSheet);
    closeSos();
  });

  /* カレンダー */
  $('#calPrev').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  const newly = updateDerived();
  render();
  if (newly.length) { celebrate(); toast(`${newly[0].emoji} ${newly[0].title} 達成！おめでとう！`); }

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
            toast('新しいバージョンがあります', { label: '更新', fn: () => location.reload() });
          }
        });
      });
    }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
