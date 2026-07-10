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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
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
  check('通算10日', (await page.textContent('#chipTotal b')) === '10');
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
  await page.waitForTimeout(150);
  check('タップ直後: シャッフル演出中', await page.$eval('#tarotFlip', el => el.classList.contains('shuffling')));
  await page.waitForTimeout(700);
  check('タロットがめくれる', await page.$eval('#tarotFlip', el => el.classList.contains('flipped')));
  check('シャッフル演出は終了している', !(await page.$eval('#tarotFlip', el => el.classList.contains('shuffling'))));
  check('カード名表示', ((await page.textContent('#fortuneName')) || '').length > 1);
  await page.reload(); await page.waitForTimeout(500);
  check('リロード後もめくれたまま', await page.$eval('#tarotFlip', el => el.classList.contains('flipped')));

  // ── 4. スリップ（昨日）＋undo → 通算は保持 ──
  await page.click('#relapseBtn');
  await page.click('#relapseDaySeg .seg-btn[data-day="1"]');
  await page.fill('#relapseNote', '飲み会で断れなかった');
  await page.click('#saveRelapseBtn');
  await page.waitForTimeout(600);
  check('スリップ後: 連続0日(今日から再開)', (await page.textContent('#chipStreak b')) === '0');
  check('スリップ後: 通算9日(保持)', (await page.textContent('#chipTotal b')) === '9');
  const money2 = await page.textContent('#moneySaved');
  check('スリップ後も節約額は保持', money2 === '¥13,500');
  // undo（中央ポップの確認カード）
  const confirmVisible = !(await page.$eval('#relapseConfirm', el => el.classList.contains('hidden')));
  check('スリップ確認カード表示', confirmVisible);
  await page.click('#rcUndo');
  await page.waitForTimeout(500);
  check('undo後: 連続10日に戻る', (await page.textContent('#chipStreak b')) === '10');
  check('undo後: 確認カードが閉じる', await page.$eval('#relapseConfirm', el => el.classList.contains('hidden')));

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

  // ── 7e. 記録リストに修正ボタン ──
  await page.click('.nav-item[data-tab="log"]');
  await page.waitForTimeout(200);
  check('記録リストに修正ボタン表示', (await page.$$('#logList .li-edit')).length >= 1);

  // ── 7f. スリップ「別の日」で4日前を記録 → 連続3日 → undo ──
  await page.click('.nav-item[data-tab="home"]');
  await page.click('#relapseBtn');
  await page.waitForTimeout(250);
  check('別の日ボタンあり', !!(await page.$('#relapseDaySeg .seg-btn[data-day="other"]')));
  await page.click('#relapseDaySeg .seg-btn[data-day="other"]');
  await page.waitForTimeout(150);
  check('別の日: 日付欄が出る', !(await page.$eval('#relapseDateField', el => el.hidden)));
  const day4ago = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
  await page.fill('#relapseDate', day4ago);
  await page.click('#saveRelapseBtn');
  await page.waitForTimeout(600);
  check('別の日スリップ後: 連続3日', (await page.textContent('#chipStreak b')) === '3');
  await page.click('#rcUndo'); // undo
  await page.waitForTimeout(500);
  check('別の日スリップundo後: 連続10日', (await page.textContent('#chipStreak b')) === '10');

  // ── 7g. スリップ確認カードの✕ボタン → undoせず記録は残る ──
  await page.click('#relapseBtn');
  await page.waitForTimeout(250);
  await page.click('#saveRelapseBtn'); // 今日を記録
  await page.waitForTimeout(500);
  check('✕ボタン前: 連続0日', (await page.textContent('#chipStreak b')) === '0');
  await page.click('#rcClose');
  await page.waitForTimeout(500);
  check('✕ボタンで確認カードが閉じる', await page.$eval('#relapseConfirm', el => el.classList.contains('hidden')));
  check('✕ボタンはundoしない: 連続0日のまま', (await page.textContent('#chipStreak b')) === '0');

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

  // ── 9. 言語切替（設定→English→UI英語化＋$表示） ──
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.click('#langSeg .seg-btn[data-lang="en"]');
  await page.waitForTimeout(300);
  check('EN: html langがen', (await page.evaluate(() => document.documentElement.lang)) === 'en');
  check('EN: タイトル英語化', (await page.textContent('.app-header h1')).includes('Sober Tracker'));
  check('EN: ナビ英語化', (await page.textContent('.nav-item[data-tab="home"] .nav-label')) === 'Home');
  await page.click('#closeSettings');
  await page.waitForTimeout(200);
  check('EN: 記録ボタン英語化', (await page.textContent('#recordTodayBtn')).includes('Log today'));
  const enAdvice = await page.textContent('#adviceBody');
  check('EN: AIアドバイス英語生成', /alcohol-free|Day/.test(enAdvice) && /Did you know/.test(enAdvice));
  // 言語を日本語に戻す→日本語UI
  await page.click('#settingsBtn');
  await page.waitForTimeout(200);
  await page.click('#langSeg .seg-btn[data-lang="ja"]');
  await page.waitForTimeout(300);
  check('JA復帰: タイトル日本語', (await page.textContent('.app-header h1')).includes('禁酒トラッカー'));
  await page.click('#closeSettings');

  // ── 10. 英語ロケールの新規ユーザー（自動判定＋USD） ──
  const pageEn = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  pageEn.on('pageerror', e => errors.push('EN: ' + e.message));
  await pageEn.goto(URL);
  await pageEn.waitForTimeout(500);
  check('EN新規: オンボーディング英語', (await pageEn.textContent('#onboarding h2')).includes('Welcome'));
  const enPast = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
  await pageEn.fill('#obStartDate', enPast);
  await pageEn.click('#obNext1');
  await pageEn.fill('#obDrinks', '2');
  await pageEn.fill('#obPrice', '10');
  await pageEn.click('#obNext2');
  await pageEn.click('#obFinish');
  await pageEn.waitForTimeout(900);
  check('EN新規: 節約$80表示', (await pageEn.textContent('#moneySaved')) === '$80');
  check('EN新規: html=en', (await pageEn.evaluate(() => document.documentElement.lang)) === 'en');
  await pageEn.close();

  // ── 11. タロット78枚デッキ＋大吉ジャックポット ──
  const variety = await page.evaluate(() => {
    let minor = 0, major = 0, jack = 0;
    for (let i = 0; i < 400; i++) {
      const d = Util.addDays(Util.todayStr(), -i);
      const f = Tarot.drawFortune('1985-03-10', d);
      if (f.card.kind === 'minor') minor++; else major++;
      if (f.jackpot) jack++;
    }
    return { minor, major, jack };
  });
  check('タロット: 小アルカナが引かれる', variety.minor > 100, `minor=${variety.minor}`);
  check('タロット: 大アルカナも引かれる', variety.major > 40, `major=${variety.major}`);
  check('タロット: 大吉はレア(400日中1〜40回)', variety.jack >= 1 && variety.jack <= 40, `jack=${variety.jack}`);
  check('タロット: デッキは78枚', (await page.evaluate(() => Tarot.DECK_SIZE)) === 78);

  // 今日が大吉になる誕生日を探して、めくり→演出→閉じるまで検証
  const jackBirth = await page.evaluate(() => {
    for (let y = 1950; y < 2010; y++) for (let m = 1; m <= 12; m++) {
      const b = `${y}-${String(m).padStart(2, '0')}-15`;
      if (Tarot.drawFortune(b, Util.todayStr()).jackpot) return b;
    }
    return null;
  });
  check('大吉になる誕生日が見つかる', !!jackBirth, jackBirth);
  if (jackBirth) {
    await page.evaluate((b) => {
      const s = JSON.parse(localStorage.getItem('kinshu_v1'));
      s.birthDate = b; s.tarotFlipped = ''; s.advice = null;
      localStorage.setItem('kinshu_v1', JSON.stringify(s));
    }, jackBirth);
    await page.reload(); await page.waitForTimeout(600);
    await page.click('#tarotFlip');
    await page.waitForTimeout(1700);
    check('大吉: ジャックポット演出が表示', !(await page.$eval('#jackpotOverlay', el => el.classList.contains('hidden'))));
    check('大吉: カードが金色仕様', await page.$eval('#tarotVisual', el => el.classList.contains('gold')));
    const jpTitle = await page.textContent('.jp-title');
    check('大吉: タイトル表示', jpTitle.includes('大吉') || jpTitle.includes('JACKPOT'));
    await page.click('#jackpotOverlay');
    await page.waitForTimeout(300);
    check('大吉: タップで演出が閉じる', await page.$eval('#jackpotOverlay', el => el.classList.contains('hidden')));
  }

  // ── 12. Service Worker更新（キャッシュ総入れ替え）でも記録データは消えないか検証 ──
  const beforeUpdate = {
    total: await page.textContent('#chipTotal b'),
    money: await page.textContent('#moneySaved'),
    raw: await page.evaluate(() => localStorage.getItem('kinshu_v1')),
  };
  const swSource = await page.evaluate(() => fetch('sw.js').then(r => r.text()));
  check('sw.jsはlocalStorage/indexedDBに触れない設計', !/localStorage|indexedDB/.test(swSource));
  await page.evaluate(async () => {
    // 新バージョンが降ってきて古いキャッシュを丸ごと入れ替える状況を再現
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  });
  await page.reload();
  await page.waitForTimeout(700);
  const afterUpdate = {
    total: await page.textContent('#chipTotal b'),
    money: await page.textContent('#moneySaved'),
    raw: await page.evaluate(() => localStorage.getItem('kinshu_v1')),
  };
  check('SW更新後も記録データ(生データ)が完全一致', beforeUpdate.raw === afterUpdate.raw);
  check('SW更新後も通算日数が変わらない', beforeUpdate.total === afterUpdate.total);
  check('SW更新後も節約額が変わらない', beforeUpdate.money === afterUpdate.money);

  check('コンソールエラーなし', errors.length === 0);
  if (errors.length) console.log('errors:', errors);
  console.log(failures.length ? `\n✗ ${failures.length} 件失敗` : '\n✓ 全テスト合格');
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
