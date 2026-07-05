'use strict';

/* ---------- state ---------- */
const STORE_KEY = 'kinshu_v1';
const DAY = 86400000;

const defaultState = {
  startDate: todayStr(),
  birthDate: '',
  drinksPerDay: 3,
  pricePerDrink: 500,
  calPerDrink: 150,
  relapses: [],   // array of date strings (YYYY-MM-DD) when a relapse happened
  logs: {},       // { 'YYYY-MM-DD': { mood, craving, note } }
  checkIns: [],   // array of date strings
  bestStreak: 0,
  goalDays: 30,
  reminderOn: false,
  reminderTime: '21:00',
  lastReminded: '',   // date string of the last day a reminder fired
  advice: null,        // { date, salt, text } — 今日のアドバイスのキャッシュ
  adviceHistory: {},   // 直近に使った文の履歴（繰り返し防止）
};

let state = load();

/* ---------- persistence ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch (e) {
    return { ...defaultState };
  }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

/* ---------- date helpers ---------- */
function todayStr(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function diffDays(a, b) { return Math.floor((parseDate(a) - parseDate(b)) / DAY); }

/* The current sober streak starts from the later of startDate or the day after
   the most recent relapse. */
function streakStart() {
  let start = state.startDate;
  if (state.relapses.length) {
    const last = state.relapses.slice().sort().pop();
    const dayAfter = todayStr(new Date(parseDate(last).getTime() + DAY));
    if (parseDate(dayAfter) > parseDate(start)) start = dayAfter;
  }
  return start;
}
function currentDays() {
  const d = diffDays(todayStr(), streakStart());
  return Math.max(0, d);
}

/* ---------- milestones ---------- */
const BADGES = [
  { days: 1,   emoji: '🌱', title: '1日目',    sub: '最初の一歩' },
  { days: 3,   emoji: '🍃', title: '3日',      sub: '山を越えた' },
  { days: 7,   emoji: '⭐', title: '1週間',    sub: '習慣の芽' },
  { days: 14,  emoji: '💪', title: '2週間',    sub: '体が軽い' },
  { days: 30,  emoji: '🏅', title: '30日',     sub: '1ヶ月達成' },
  { days: 60,  emoji: '🎖️', title: '60日',     sub: '2ヶ月' },
  { days: 90,  emoji: '🏆', title: '90日',     sub: '3ヶ月の壁' },
  { days: 180, emoji: '💎', title: '180日',    sub: 'ハーフイヤー' },
  { days: 365, emoji: '👑', title: '1年',      sub: '記念すべき1年' },
];

const QUOTES = [
  '今日飲まなかったこと、それ自体が勝利です。',
  '一度に一日ずつ。それで十分。',
  '渇望は波のように来て、必ず引いていく。',
  '未来の自分は、今日のあなたに感謝する。',
  '完璧じゃなくていい。続けることが力になる。',
  '飲まない選択が、明日の自由をつくる。',
  'しらふの朝は、何にも代えがたい。',
  '小さな積み重ねが、大きな変化になる。',
  'つらい時こそ、深呼吸をひとつ。',
  'あなたは思っているより、ずっと強い。',
];

/* ---------- rendering ---------- */
function render() {
  renderHome();
  renderLiver();
  renderGoal();
  renderAdvice();
  renderFortune();
  renderLog();
  renderCalendar();
  renderMoodChart();
  renderBadges();
}

function renderHome() {
  const days = currentDays();
  if (days > state.bestStreak) { state.bestStreak = days; save(); }

  $('#daysCount').textContent = days;
  const start = streakStart();
  $('#counterSub').textContent = `${start} から`;
  $('#counterDetail').textContent = milestoneLine(days);

  const money = Math.round(days * state.drinksPerDay * state.pricePerDrink);
  const cals = Math.round(days * state.drinksPerDay * state.calPerDrink);
  const drinks = Math.round(days * state.drinksPerDay);
  $('#moneySaved').textContent = '¥' + money.toLocaleString('ja-JP');
  $('#calSaved').textContent = cals.toLocaleString('ja-JP');
  $('#drinksAvoided').textContent = drinks.toLocaleString('ja-JP');
  $('#bestStreak').textContent = state.bestStreak;

  $('#quote').textContent = '“' + QUOTES[days % QUOTES.length] + '”';

  renderNextBadge(days);
}

function milestoneLine(days) {
  const next = BADGES.find(b => b.days > days);
  if (!next) return '全マイルストーン達成！🎉';
  return `次の目標「${next.title}」まであと ${next.days - days} 日`;
}

/* AIの今日のアドバイス（端末内生成・カスタム指示に従う） */
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
  const { text } = Advisor.generate({
    days: currentDays(), age, date: today, salt, history: state.adviceHistory,
  });
  state.advice = { date: today, salt, age: (age == null ? null : age), text };
  save();
  el.textContent = text;
}

/* 肝臓の回復イメージ：30日かけて濃い茶色→健康的なピンクへ1日ずつ変化 */
const LIVER_TARGET_DAYS = 30;
function liverColor(days) {
  const t = Math.max(0, Math.min(1, days / LIVER_TARGET_DAYS));
  const from = [43, 24, 16];    // すごく濃い茶色 #2b1810
  const to = [233, 150, 140];   // 健康的なピンク  #e9968c
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function renderLiver() {
  const days = Math.min(currentDays(), LIVER_TARGET_DAYS);
  const body = document.getElementById('liverBody');
  if (body) body.setAttribute('fill', liverColor(days));
  const remain = Math.max(0, LIVER_TARGET_DAYS - days);
  const cap = $('#liverCaption');
  if (cap) {
    cap.innerHTML = remain > 0
      ? `健康な肝臓まで<br><b>あと ${remain} 日</b>`
      : `健康な状態に到達 🎉`;
  }
}

function renderFortune() {
  if (!window.Tarot) return;
  const today = todayStr();
  const f = Tarot.drawFortune(state.birthDate, today);
  $('#fortuneDate').textContent = today;
  const visual = $('#tarotVisual');
  visual.classList.toggle('reversed', f.reversed);
  $('#tarotEmoji').textContent = f.card.emoji;
  $('#tarotNum').textContent = f.card.n;
  $('#fortuneName').innerHTML = `${f.card.name}<span class="orient">（${f.orientation}）</span>`;
  $('#fortuneStars').textContent = '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars);
  $('#fortuneMeaning').textContent = f.meaning;
  $('#fortuneAdvice').textContent = '💫 ' + f.advice;
  $('#fortuneLucky').innerHTML =
    `<span class="luck"><span class="swatch" style="background:${f.color.hex}"></span>ラッキーカラー: ${f.color.name}</span>` +
    `<span class="luck">🔢 ラッキーナンバー: ${f.luckyNumber}</span>` +
    `<span class="luck">🎁 ラッキーアイテム: ${f.item}</span>`;
}

function renderGoal() {
  const days = currentDays();
  const goal = Math.max(1, state.goalDays || 1);
  const pct = Math.min(100, Math.round((days / goal) * 100));
  const reached = days >= goal;
  const card = $('#goalCard');
  card.classList.toggle('reached', reached);
  $('#goalCount').innerHTML = `<b>${days}</b> / ${goal} 日`;
  $('#goalBar').style.width = Math.max(3, pct) + '%';
  if (reached) {
    $('#goalSub').textContent = `🎉 目標達成！新しい目標を設定してさらに前へ。`;
  } else {
    $('#goalSub').textContent = `達成率 ${pct}% ・ あと ${goal - days} 日`;
  }
}

function renderNextBadge(days) {
  const el = $('#nextBadgeCard');
  const prev = [...BADGES].reverse().find(b => b.days <= days);
  const next = BADGES.find(b => b.days > days);
  if (!next) {
    el.innerHTML = `<span class="nb-emoji">👑</span><div class="nb-text"><div class="nb-title">すべて達成しました</div><div class="nb-sub">素晴らしい継続です</div></div>`;
    return;
  }
  const base = prev ? prev.days : 0;
  const pct = Math.round(((days - base) / (next.days - base)) * 100);
  el.innerHTML = `
    <span class="nb-emoji">${next.emoji}</span>
    <div class="nb-text">
      <div class="nb-title">次のバッジ: ${next.title}</div>
      <div class="nb-sub">あと ${next.days - days} 日</div>
      <div class="progress"><i style="width:${Math.min(100, Math.max(4, pct))}%"></i></div>
    </div>`;
}

function renderBadges() {
  const days = currentDays();
  $('#badgeGrid').innerHTML = BADGES.map(b => {
    const on = days >= b.days;
    return `<div class="badge ${on ? 'unlocked' : 'locked'}">
      <div class="b-emoji">${b.emoji}</div>
      <div class="b-title">${b.title}</div>
      <div class="b-sub">${on ? '達成' : b.days + '日'}</div>
    </div>`;
  }).join('');
}

function renderLog() {
  const entries = Object.entries(state.logs).sort((a, b) => b[0].localeCompare(a[0]));
  const relapseSet = new Set(state.relapses);
  const moodEmoji = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😣' };
  const list = $('#logList');
  if (!entries.length && !state.relapses.length) {
    list.innerHTML = `<p class="empty">まだ記録がありません。今日の気分を残しましょう。</p>`;
    return;
  }
  // Merge logs and relapse markers
  const rows = [];
  for (const [date, log] of entries) {
    rows.push({ date, log, relapse: relapseSet.has(date) });
  }
  for (const date of state.relapses) {
    if (!state.logs[date]) rows.push({ date, log: null, relapse: true });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = rows.map(r => {
    const emoji = r.relapse ? '🍺' : (r.log ? moodEmoji[r.log.mood] || '📝' : '📝');
    const note = r.log && r.log.note ? escapeHtml(r.log.note) : '';
    const craving = r.log && r.log.craving != null ? ` ・ 渇望 ${r.log.craving}/10` : '';
    const badge = r.relapse ? `<div class="li-badge">リセットした日</div>` : '';
    return `<div class="log-item">
      <div class="li-emoji">${emoji}</div>
      <div class="li-body">
        <div class="li-date">${r.date}${craving}</div>
        ${note ? `<div class="li-note">${note}</div>` : ''}
        ${badge}
      </div>
    </div>`;
  }).join('');
}

/* ---------- calendar ---------- */
let calCursor = new Date();
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $('#calTitle').textContent = `${y}年 ${m + 1}月`;
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const relapseSet = new Set(state.relapses);
  const soberFrom = streakStart();
  const today = todayStr();
  const globalStart = state.startDate;

  const dows = ['日', '月', '火', '水', '木', '金', '土'];
  let html = dows.map(d => `<div class="cal-cell dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
    let cls = 'cal-cell';
    if (relapseSet.has(ds)) cls += ' relapse';
    else if (ds >= globalStart && ds <= today && !isRelapseDay(ds)) cls += ' sober';
    if (ds === today) cls += ' today';
    html += `<div class="${cls}">${d}</div>`;
  }
  $('#calendar').innerHTML = html;
}
function isRelapseDay(ds) { return state.relapses.includes(ds); }

/* ---------- mood chart (simple canvas line) ---------- */
function renderMoodChart() {
  const canvas = $('#moodChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const ds = todayStr(new Date(Date.now() - i * DAY));
    days.push({ ds, mood: state.logs[ds] ? state.logs[ds].mood : null });
  }
  const pad = 24, top = 14, bottom = h - 22;
  const stepX = (w - pad * 2) / (days.length - 1);
  const yFor = v => bottom - ((v - 1) / 4) * (bottom - top);

  const css = getComputedStyle(document.body);
  const primary = css.getPropertyValue('--primary').trim() || '#0f766e';
  const muted = css.getPropertyValue('--muted').trim() || '#94a3b8';

  // grid baseline
  ctx.strokeStyle = muted; ctx.globalAlpha = .25; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, bottom); ctx.lineTo(w - pad, bottom); ctx.stroke();
  ctx.globalAlpha = 1;

  const pts = days.map((d, i) => d.mood ? { x: pad + i * stepX, y: yFor(d.mood) } : null);

  ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.beginPath();
  let started = false;
  pts.forEach(p => {
    if (!p) { started = false; return; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.fillStyle = primary;
  pts.forEach(p => { if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); } });

  if (pts.every(p => !p)) {
    ctx.fillStyle = muted; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('記録するとここに気分の推移が表示されます', w / 2, h / 2);
  }
}

/* ---------- actions ---------- */
function checkIn() {
  const t = todayStr();
  if (!state.checkIns.includes(t)) state.checkIns.push(t);
  if (!state.logs[t]) state.logs[t] = { mood: 4, craving: 0, note: '' };
  save();
  render();
  const days = currentDays();
  const hit = BADGES.find(b => b.days === days);
  toast(hit ? `${hit.emoji} ${hit.title} 達成！おめでとう！` : 'チェックイン完了！よく頑張りました 🎉');
}

function relapse() {
  if (!confirm('今日を「飲んでしまった日」として記録し、継続日数をリセットします。よろしいですか？\n\n失敗ではありません。また今日から始めましょう。')) return;
  const t = todayStr();
  if (!state.relapses.includes(t)) state.relapses.push(t);
  save();
  render();
  switchTab('home');
  toast('記録しました。また一歩ずつ、今日から。🌱');
}

/* ---------- log form ---------- */
let selectedMood = null;
function initLogForm() {
  $$('.mood').forEach(btn => btn.addEventListener('click', () => {
    $$('.mood').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = Number(btn.dataset.mood);
  }));
  const craving = $('#craving');
  craving.addEventListener('input', () => { $('#cravingOut').textContent = `${craving.value} / 10`; });

  // preload today's log
  const t = todayStr();
  const log = state.logs[t];
  if (log) {
    selectedMood = log.mood;
    const mb = document.querySelector(`.mood[data-mood="${log.mood}"]`);
    if (mb) mb.classList.add('selected');
    craving.value = log.craving || 0;
    $('#cravingOut').textContent = `${craving.value} / 10`;
    $('#note').value = log.note || '';
  }

  $('#saveLogBtn').addEventListener('click', () => {
    const t = todayStr();
    state.logs[t] = {
      mood: selectedMood || 3,
      craving: Number(craving.value),
      note: $('#note').value.trim(),
    };
    if (!state.checkIns.includes(t)) state.checkIns.push(t);
    save();
    render();
    toast('記録を保存しました ✍️');
  });
}

/* ---------- settings ---------- */
function openSettings() {
  $('#startDate').value = state.startDate;
  $('#birthDate').value = state.birthDate;
  $('#drinksPerDay').value = state.drinksPerDay;
  $('#pricePerDrink').value = state.pricePerDrink;
  $('#calPerDrink').value = state.calPerDrink;
  $('#goalDays').value = state.goalDays;
  $('#reminderOn').checked = state.reminderOn;
  $('#reminderTime').value = state.reminderTime;
  updateReminderUI();
  $('#settingsModal').classList.remove('hidden');
}

function updateReminderUI() {
  const on = $('#reminderOn').checked;
  $('#reminderTimeField').style.display = on ? '' : 'none';
  const hint = $('#reminderHint');
  if (!('Notification' in window)) {
    hint.textContent = 'この端末/ブラウザは通知に対応していません。';
  } else if (!on) {
    hint.textContent = 'アプリを開いている間、設定時刻に「まだ記録していない日」だけお知らせします。';
  } else if (Notification.permission === 'denied') {
    hint.textContent = '通知がブラウザでブロックされています。ブラウザの設定から許可してください。';
  } else {
    hint.textContent = '設定時刻にアプリ（またはホーム画面のPWA）を開いていると通知が届きます。';
  }
}

async function saveSettings() {
  const sd = $('#startDate').value;
  if (sd && parseDate(sd) > new Date()) { toast('未来の日付は設定できません'); return; }
  state.startDate = sd || state.startDate;
  const newBirth = $('#birthDate').value || '';
  if (newBirth !== state.birthDate) state.advice = null;  // 年齢が変われば作り直す
  state.birthDate = newBirth;
  state.drinksPerDay = Math.max(0, Number($('#drinksPerDay').value) || 0);
  state.pricePerDrink = Math.max(0, Number($('#pricePerDrink').value) || 0);
  state.calPerDrink = Math.max(0, Number($('#calPerDrink').value) || 0);
  state.goalDays = Math.max(1, Math.round(Number($('#goalDays').value) || 30));
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
  $('#settingsModal').classList.add('hidden');
  scheduleReminder();
  render();
  toast('設定を保存しました');
}

/* ---------- reminders ----------
   Server-less PWA: we can only notify while the page/PWA is open. We schedule a
   timer for today's reminder time and fire it if the user hasn't checked in. */
let reminderTimer = null;
function scheduleReminder() {
  if (reminderTimer) { clearTimeout(reminderTimer); reminderTimer = null; }
  if (!state.reminderOn || !('Notification' in window) || Notification.permission !== 'granted') return;

  const [h, m] = (state.reminderTime || '21:00').split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  // Already past the time today and not yet reminded / not checked in? Nudge shortly.
  if (target <= now) {
    maybeNotify();
    // schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }
  const delay = Math.min(target - now, 2 ** 31 - 1);
  reminderTimer = setTimeout(() => { maybeNotify(); scheduleReminder(); }, delay);
}

function maybeNotify() {
  const t = todayStr();
  if (state.checkIns.includes(t)) return;      // already logged today
  if (state.lastReminded === t) return;         // don't repeat within the same day
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  state.lastReminded = t;
  save();
  const days = currentDays();
  const body = days > 0
    ? `禁酒 ${days} 日目。今日の気分を記録して継続を残しましょう 🌱`
    : `今日の一歩を記録しましょう。あなたならできます 🌱`;
  try {
    new Notification('禁酒トラッカー', { body, tag: 'kinshu-daily', renotify: false });
  } catch (e) { /* some browsers require SW-based notifications */ }
}

/* ---------- tabs ---------- */
function switchTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === name));
  if (name === 'stats') renderMoodChart();
}

/* ---------- helpers ---------- */
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.from(document.querySelectorAll(s)); }
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

/* ---------- wire up ---------- */
function init() {
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#checkInBtn').addEventListener('click', checkIn);
  $('#relapseBtn').addEventListener('click', relapse);
  $('#adviceRefresh').addEventListener('click', () => {
    const btn = $('#adviceRefresh');
    btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
    renderAdvice(true);
  });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#reminderOn').addEventListener('change', updateReminderUI);
  $('#closeSettings').addEventListener('click', () => $('#settingsModal').classList.add('hidden'));
  $('#settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') $('#settingsModal').classList.add('hidden'); });
  $('#resetAll').addEventListener('click', () => {
    if (confirm('すべての記録を完全に削除します。元に戻せません。よろしいですか？')) {
      localStorage.removeItem(STORE_KEY);
      state = { ...defaultState };
      save();
      $('#settingsModal').classList.add('hidden');
      render();
      toast('データを削除しました');
    }
  });
  $('#calPrev').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  initLogForm();
  render();
  scheduleReminder();

  // Re-check reminders when the app regains focus (e.g. next morning).
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleReminder(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

window.addEventListener('resize', () => { if ($('#stats').classList.contains('active')) renderMoodChart(); });
document.addEventListener('DOMContentLoaded', init);
