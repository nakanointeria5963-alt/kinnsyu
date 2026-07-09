/* 禁酒トラッカー E2Eスモークテスト
   実行: node tests/smoke.cjs (要: 起動済みローカルサーバー localhost:8130) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.TEST_URL || 'http://localhost:8130/index.html';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let failures = [];
function check(name, cond) {
  console.log((cond ? '  ok ' : '  NG ') + name);
  if (!cond) failures.push(name);
}
(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // ── 1. 新規ユーザー: オンボーディング ──
  await page.goto(URL);
  await page.waitForTimeout(400);
  check('新規: オンボーディング表示', !(await page.$eval('#onboarding', el => el.classList.contains('hidden'))));
  const past = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  await page.fill('#obStartDate', past);
  await page.click('#reasonChips .trigger[data-reason="健康のため"]');
  await page.click('#reasonChips .trigger[data-reason="お金を貯めたい"]');
  await page.click('#obNext1');
  await page.fill('#obDrinks', '3');
  await page.fill('#obPrice', '500');
  await page.click('#obNext2');
  await page.fill('#obGoal', '30');
  await page.fill('#obBirth', '1985-03-10');
  await page.click('#obFinish');
  await page.waitForTimeout(600);
  check('オンボーディング完了で閉じる', await page.$eval('#onboarding', el => el.classList.contains('hidden')));
  await page.waitForTimeout(800); // count-up 完了待ち
  check('継続10日', (await page.textContent('#daysCount')) === '10');
  check('通算10日', (await page.textContent('#totalNum')) === '10');
  check('節約¥15,000', (await page.textContent('#moneySaved')) === '¥15,000');
  check('禁酒率100%', (await page.textContent('#soberRate')) === '100%');
  check('あいさつ表示', ((await page.textContent('#greeting')) || '').length > 3);
  check('週間ストリップ7日分', (await page.$$('#weekStrip .ws-day')).length === 7);

  // ── 2. 今日を記録（気分必須） ──
  await page.click('#recordTodayBtn');
  await page.click('#saveLogBtn'); // 気分未選択 → エラートースト
  await page.waitForTimeout(200);
  check('気分未選択で保存できない', !(await page.$eval('#recordSheet', el => el.classList.contains('hidden'))));
  await page.click('.mood[data-mood="4"]');
  await page.$eval('#craving', el => { el.value = 6; el.dispatchEvent(new Event('input')); });
  await page.click('#triggerRow .trigger[data-trigger="ストレス"]');
  await page.fill('#note', 'テストメモ');
  await page.click('#saveLogBtn');
  await page.waitForTimeout(400);
  check('記録シートが閉じる', await page.$eval('#recordSheet', el => el.classList.contains('hidden')));
  await page.click('.nav-item[data-tab="log"]');
  const summary = await page.textContent('#todaySummary');
  check('今日のサマリーに記録済み表示', summary.includes('記録済み') && summary.includes('6/10'));

  // ── 3. タロットめくり ──
  await page.click('.nav-item[data-tab="home"]');
  check('タロットは伏せた状態', !(await page.$eval('#tarotFlip', el => el.classList.contains('flipped'))));
  await page.click('#tarotFlip');
  await page.waitForTimeout(700);
  check('タロットがめくれる', await page.$eval('#tarotFlip', el => el.classList.contains('flipped')));
  check('カード名表示', ((await page.textContent('#fortuneName')) || '').length > 1);
  await page.reload(); await page.waitForTimeout(500);
  check('リロード後もめくれたまま', await page.$eval('#tarotFlip', el => el.classList.contains('flipped')));

  // ── 4. スリップ（昨日）＋undo → 通算は保持 ──
  await page.click('#relapseBtn');
  await page.click('#relapseDaySeg .seg-btn[data-day="1"]');
  await page.fill('#relapseNote', '飲み会で断れなかった');
  await page.click('#saveRelapseBtn');
  await page.waitForTimeout(600);
  check('スリップ後: 連続0日(今日から再開)', (await page.textContent('#streakNum')) === '0');
  check('スリップ後: 通算9日(保持)', (await page.textContent('#totalNum')) === '9');
  const money2 = await page.textContent('#moneySaved');
  check('スリップ後も節約額は保持', money2 === '¥13,500');
  // undo
  const undoVisible = !(await page.$eval('#toast', el => el.classList.contains('hidden')));
  check('undoトースト表示', undoVisible);
  await page.click('#toast button');
  await page.waitForTimeout(400);
  check('undo後: 連続10日に戻る', (await page.textContent('#streakNum')) === '10');

  // ── 5. SOS ──
  await page.click('#sosBtn');
  await page.waitForTimeout(200);
  const sosText = await page.textContent('#sosReasons');
  check('SOSに登録した理由が出る', sosText.includes('健康のため'));
  await page.click('#sosStart');
  await page.waitForTimeout(1200);
  const phase = await page.textContent('#breathPhase');
  check('呼吸フェーズ進行', ['吸って…', '止めて', '吐いて…'].includes(phase));
  await page.click('#sosClose');

  // ── 6. カレンダー詳細 ──
  await page.click('.nav-item[data-tab="stats"]');
  await page.waitForTimeout(300);
  const todayNum = String(new Date().getDate());
  await page.click(`#calendar button.cal-cell.today`);
  await page.waitForTimeout(200);
  const dd = await page.textContent('#dayDetail');
  check('日別詳細に記録内容', dd.includes('渇望 6/10') && dd.includes('テストメモ'));

  // ── 7. 設定・テーマ・エクスポート ──
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.click('#themeSeg .seg-btn[data-theme="dark"]');
  check('ダークテーマ適用', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.click('#exportBtn'),
  ]);
  check('エクスポートDL発火', (download.suggestedFilename() || '').startsWith('kinshu-backup-'));

  // ── 7b. ごほうび貯金（節約¥15,000 / 目標¥20,000 → あと¥5,000） ──
  await page.fill('#rewardName', 'イヤホン');
  await page.fill('#rewardPrice', '20000');
  await page.click('#saveSettings');
  await page.waitForTimeout(400);
  check('ごほうびカード表示', !(await page.$eval('#rewardCard', el => el.hidden)));
  const rw = await page.textContent('#rewardSub');
  check('ごほうび残額あと¥5,000', rw.includes('あと ¥5,000'));

  // ── 7c. 戻るボタンでシートが閉じる ──
  await page.click('.nav-item[data-tab="home"]');
  await page.click('#recordTodayBtn');
  await page.waitForTimeout(250);
  check('記録シート再表示', !(await page.$eval('#recordSheet', el => el.classList.contains('hidden'))));
  await page.goBack();
  await page.waitForTimeout(350);
  check('戻る操作でシートが閉じる', await page.$eval('#recordSheet', el => el.classList.contains('hidden')));

  // ── 7d. シェアボタン ──
  await page.click('.nav-item[data-tab="badges"]');
  check('シェアボタンあり', !!(await page.$('#shareBtn')));

  // ── 8. 既存ユーザーの移行（旧形式localStorage） ──
  await page.evaluate(() => {
    localStorage.setItem('kinshu_v1', JSON.stringify({
      startDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      drinksPerDay: 2, pricePerDrink: 400, calPerDrink: 150,
      relapses: [], logs: {}, checkIns: [], bestStreak: 5,
      goalDays: 30, reminderOn: false, reminderTime: '21:00',
    }));
  });
  await page.reload(); await page.waitForTimeout(600);
  check('旧データ移行: オンボーディングをスキップ', await page.$eval('#onboarding', el => el.classList.contains('hidden')));
  await page.waitForTimeout(800);
  check('旧データ移行: 継続5日', (await page.textContent('#daysCount')) === '5');

  check('コンソールエラーなし', errors.length === 0);
  if (errors.length) console.log('errors:', errors);
  console.log(failures.length ? `\n✗ ${failures.length} 件失敗` : '\n✓ 全テスト合格');
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
