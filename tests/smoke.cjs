/* 禁酒トラッカー E2Eスモークテスト
   実行: node tests/smoke.cjs (要: 起動済みローカルサーバー localhost:8130) */
/* playwright はローカル環境ではグローバル、CIでは node_modules から読み込む */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL = process.env.TEST_URL || 'http://localhost:8130/index.html';
const EXEC = process.env.CHROME_PATH ||
  (require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : '');
let failures = [];
function check(name, cond) {
  console.log((cond ? '  ok ' : '  NG ') + name);
  if (!cond) failures.push(name);
}
(async () => {
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
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
  const luckyText = await page.textContent('#fortuneLucky');
  check('ラッキーカラーに名前が表示される(値なしのカンマ落ちバグの再発防止)', /ラッキーカラー: \S/.test(luckyText), luckyText);
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

  // ── 5b. 深呼吸完了後: 「よく乗り越えました」を強調＋「続ける」ボタンで再開 ──
  check('SOS: 開始/続けるボタンが閉じるボタンの直前(真ん中付近)に配置', await page.$eval('#sosStart', el => el.nextElementSibling && el.nextElementSibling.id === 'sosClose'));
  await page.click('#sosClose');
  await page.click('#sosBtn');
  await page.waitForTimeout(50);
  await page.clock.install();
  await page.click('#sosStart');
  await page.clock.runFor(60000);
  check('深呼吸完了: 完了メッセージが強調表示される(breath-doneクラス)', await page.$eval('#breathPhase', el => el.classList.contains('breath-done')));
  const repeatVisible = await page.$eval('#sosStart', el => !el.hidden);
  const repeatLabel = await page.textContent('#sosStart');
  check('深呼吸完了: 「続ける」ボタンが閉じるボタンの上に表示される', repeatVisible && repeatLabel.includes('続ける'));
  await page.click('#sosStart');
  check('「続ける」タップで深呼吸が再開する(ボタンが再び隠れる)', await page.$eval('#sosStart', el => el.hidden));
  await page.clock.runFor(1000);
  const phase2 = await page.textContent('#breathPhase');
  check('再開後: 呼吸フェーズが進行する', ['吸って…', '止めて', '吐いて…'].includes(phase2));
  await page.clock.resume();
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

  // ── 7h. 肝臓イラスト自体をタップするとポップアップ(タップ前は脈打つ演出とタップ表示→タップ後もイラストは押せる+隣に小さいアイコンも追加) ──
  check('肝臓: 見出しが断定的な医学表現を避けている', !(await page.textContent('#liverCaption')).includes('健康な肝臓'));
  check('肝臓: 初回はheroSideにliver-seenクラスなし(脈打つ演出あり)', !(await page.$eval('#heroSide', el => el.classList.contains('liver-seen'))));
  check('肝臓: 初回はタップボタンが表示されている', await page.$eval('#liverInfoBtn', el => el.offsetParent !== null));
  check('肝臓: 「タップ」ラベルが表示されている', (await page.textContent('#liverInfoBtn')).includes('タップ'));
  check('肝臓: 初回はイメージ図隣のアイコンは非表示', await page.$eval('#liverInfoIcon', el => el.offsetParent === null));
  await page.click('#liverInfoBtn');
  await page.waitForTimeout(300);
  check('肝臓: ボタンタップでポップアップが開く', !(await page.$eval('#liverInfoSheet', el => el.classList.contains('hidden'))));
  check('肝臓: 一度タップ後はheroSideにliver-seenクラスが付く', await page.$eval('#heroSide', el => el.classList.contains('liver-seen')));
  await page.click('#closeLiverInfo');
  await page.waitForTimeout(300);
  check('肝臓: タップ後は「タップ」ラベルが消える', await page.$eval('.liver-tap-label', el => getComputedStyle(el).display === 'none'));
  check('肝臓: タップ後もイラスト自体は引き続き押せる', await page.$eval('#liverInfoBtn', el => el.offsetParent !== null));
  check('肝臓: タップ後はイメージ図隣のアイコンも表示される', await page.$eval('#liverInfoIcon', el => el.offsetParent !== null));
  check('肝臓: タップ後もイラスト自体を押すとポップアップが開く', await (async () => {
    await page.click('#liverInfoBtn');
    await page.waitForTimeout(300);
    const opened = !(await page.$eval('#liverInfoSheet', el => el.classList.contains('hidden')));
    await page.click('#closeLiverInfo');
    await page.waitForTimeout(300);
    return opened;
  })());
  const liverBody = await page.textContent('.liver-info-body');
  check('肝臓: 注意書きに「医学的な診断ではない」旨を明記', liverBody.includes('医学的な診断'));
  check('肝臓: 注意書きに受診の案内を明記', liverBody.includes('医療機関'));
  check('肝臓: 隣のアイコンを再タップしてもポップアップが開く', await (async () => {
    await page.click('#liverInfoIcon');
    await page.waitForTimeout(300);
    const opened = !(await page.$eval('#liverInfoSheet', el => el.classList.contains('hidden')));
    await page.click('#closeLiverInfo');
    await page.waitForTimeout(300);
    return opened;
  })());
  await page.reload(); await page.waitForTimeout(600);
  check('肝臓: リロード後もliver-seen状態を保持', await page.$eval('#heroSide', el => el.classList.contains('liver-seen')));

  // ── 7i. 「すべてのデータを削除」で肝臓イラストの脈打つ演出も最初の状態に戻る ──
  page.once('dialog', d => d.accept());
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.click('#resetAll');
  await page.waitForTimeout(500);
  check('肝臓: 「すべてのデータを削除」でliver-seenクラスが外れ、再び脈打つ状態に戻る', !(await page.$eval('#heroSide', el => el.classList.contains('liver-seen'))));

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
  check('EN: マニフェストが英語版に切替', (await page.$eval('#manifestLink', el => el.href)).endsWith('manifest-en.json'));
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
  check('JA復帰: マニフェストが日本語版に戻る', (await page.$eval('#manifestLink', el => el.href)).endsWith('manifest.json'));
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
  const colorCheck = await page.evaluate(() => {
    let missingJa = 0, missingEn = 0;
    for (let i = 0; i < 200; i++) {
      const d = Util.addDays(Util.todayStr(), -i);
      if (!Tarot.drawFortune('1985-03-10', d, 'ja').color.name) missingJa++;
      if (!Tarot.drawFortune('1985-03-10', d, 'en').color.name) missingEn++;
    }
    return { missingJa, missingEn };
  });
  check('ラッキーカラー: 日本語名が全日で解決される', colorCheck.missingJa === 0, `missing=${colorCheck.missingJa}`);
  check('ラッキーカラー: 英語名が全日で解決される', colorCheck.missingEn === 0, `missing=${colorCheck.missingEn}`);

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
    check('大吉: 演出優先のため線画アイコンには差し替えない', !(await page.$eval('#tarotVisual', el => el.classList.contains('major'))));
    const jpTitle = await page.textContent('.jp-title');
    check('大吉: タイトル表示', jpTitle.includes('大吉') || jpTitle.includes('JACKPOT'));
    await page.click('#jackpotOverlay');
    await page.waitForTimeout(300);
    check('大吉: タップで演出が閉じる', await page.$eval('#jackpotOverlay', el => el.classList.contains('hidden')));
  }

  // ── 11b. 大アルカナの線画アイコン(大吉を除く)・小アルカナは絵文字のまま ──
  const majorBirth = await page.evaluate(() => {
    for (let y = 1950; y < 2010; y++) for (let m = 1; m <= 12; m++) {
      const b = `${y}-${String(m).padStart(2, '0')}-03`;
      const f = Tarot.drawFortune(b, Util.todayStr());
      if (f.card.kind === 'major' && !f.jackpot) return b;
    }
    return null;
  });
  check('大アルカナ(非大吉)になる誕生日が見つかる', !!majorBirth, majorBirth);
  if (majorBirth) {
    await page.evaluate((b) => {
      const s = JSON.parse(localStorage.getItem('kinshu_v1'));
      s.birthDate = b; s.tarotFlipped = ''; s.advice = null;
      localStorage.setItem('kinshu_v1', JSON.stringify(s));
    }, majorBirth);
    await page.reload(); await page.waitForTimeout(500);
    await page.click('#tarotFlip');
    await page.waitForTimeout(900);
    check('大アルカナ: カードに.majorクラスが付く', await page.$eval('#tarotVisual', el => el.classList.contains('major')));
    check('大アルカナ: 線画SVGアイコンが描画される', await page.$eval('#tarotEmoji', el => !!el.querySelector('svg')));
  }
  const minorBirth = await page.evaluate(() => {
    for (let y = 1950; y < 2010; y++) for (let m = 1; m <= 12; m++) {
      const b = `${y}-${String(m).padStart(2, '0')}-07`;
      if (Tarot.drawFortune(b, Util.todayStr()).card.kind === 'minor') return b;
    }
    return null;
  });
  check('小アルカナになる誕生日が見つかる', !!minorBirth, minorBirth);
  if (minorBirth) {
    await page.evaluate((b) => {
      const s = JSON.parse(localStorage.getItem('kinshu_v1'));
      s.birthDate = b; s.tarotFlipped = ''; s.advice = null;
      localStorage.setItem('kinshu_v1', JSON.stringify(s));
    }, minorBirth);
    await page.reload(); await page.waitForTimeout(500);
    await page.click('#tarotFlip');
    await page.waitForTimeout(900);
    check('小アルカナ: .majorクラスは付かない', !(await page.$eval('#tarotVisual', el => el.classList.contains('major'))));
    check('小アルカナ: 絵文字のまま(SVGなし)', !(await page.$eval('#tarotEmoji', el => !!el.querySelector('svg'))));
  }

  // ── 12. Service Worker更新（キャッシュ総入れ替え）でも記録データは消えないか検証 ──
  const beforeUpdate = {
    total: await page.textContent('#chipTotal b'),
    money: await page.textContent('#moneySaved'),
    raw: await page.evaluate(() => localStorage.getItem('kinshu_v1')),
  };
  const swSource = await page.evaluate(() => fetch('sw.js').then(r => r.text()));
  // SWは記録本体（localStorageのkinshu_v1）には一切触れない設計。
  // （通知用の別置き設定 kinshu-sw のIndexedDBのみ使用可）
  check('sw.jsは記録データに触れない設計', !/localStorage|kinshu_v1/.test(swSource));
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

  // ── 13. 通貨変更の警告表示 ──
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  check('通貨警告: 初期状態は非表示', await page.$eval('#currencyWarn', el => el.hidden));
  await page.selectOption('#currency', 'USD');
  check('通貨警告: 変更すると表示', !(await page.$eval('#currencyWarn', el => el.hidden)));
  await page.selectOption('#currency', 'JPY');
  check('通貨警告: 元に戻すと消える', await page.$eval('#currencyWarn', el => el.hidden));

  // ── 14. バックアップ読み込みの確認ダイアログ ──
  const fixture = require('path').join(require('os').tmpdir(), 'kinshu-import-test.json');
  const fixDate = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
  require('fs').writeFileSync(fixture, JSON.stringify({
    startDate: fixDate, drinksPerDay: 2, pricePerDrink: 300, calPerDrink: 100,
    logs: { [fixDate]: { mood: 4, craving: 2, note: 'インポートテスト', triggers: [] } },
    relapses: [], goalDays: 30,
  }));
  const beforeImport = await page.evaluate(() => localStorage.getItem('kinshu_v1'));
  page.once('dialog', d => d.dismiss());        // (a) キャンセル
  await page.setInputFiles('#importFile', fixture);
  await page.waitForTimeout(500);
  check('読み込みをキャンセル→データは無変更', (await page.evaluate(() => localStorage.getItem('kinshu_v1'))) === beforeImport);
  page.once('dialog', d => d.accept());          // (b) OK
  await page.setInputFiles('#importFile', fixture);
  await page.waitForTimeout(600);
  check('読み込みOK→データが置き換わる', (await page.evaluate(() => JSON.parse(localStorage.getItem('kinshu_v1')).startDate)) === fixDate);

  // ── 15. バックアップ促し（30日以上未保存なら月1回のトースト） ──
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kinshu_v1'));
    s.lastBackupAt = ''; s.backupNudgedAt = '';
    localStorage.setItem('kinshu_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(3800);   // 促しは起動3秒後に出る
  const nudgeText = await page.textContent('#toast');
  check('バックアップ促しトースト表示', nudgeText.includes('バックアップ'));
  const [nudgeDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.click('#toast button'),
  ]);
  check('促しから保存できる', (nudgeDl.suggestedFilename() || '').startsWith('kinshu-backup-'));
  check('保存日を記録（次の促しは30日後）', (await page.evaluate(() => JSON.parse(localStorage.getItem('kinshu_v1')).lastBackupAt)).length === 10);

  // ── 16. 端末salt・テーマ先読み・マニフェスト ──
  check('deviceSaltが生成・保存される', (await page.evaluate(() => (JSON.parse(localStorage.getItem('kinshu_v1')).deviceSalt || '').length)) >= 8);
  check('生年月日なしでも端末ごとに占いが変わる', await page.evaluate(() => {
    const d = Util.todayStr();
    let diff = false;
    for (let i = 0; i < 30 && !diff; i++) {   // 30日分みれば必ずどこかで差が出る
      const a = Tarot.drawFortune('dev-aaaa', Util.addDays(d, -i));
      const b = Tarot.drawFortune('dev-bbbb', Util.addDays(d, -i));
      if (a.name !== b.name) diff = true;
    }
    return diff;
  }));
  const htmlSrc = await page.evaluate(() => fetch('index.html').then(r => r.text()));
  check('テーマ先読みスクリプトがheadにある', /dataset\.theme/.test(htmlSrc.split('styles.css')[0]));
  const manifests = await page.evaluate(async () => ({
    ja: await fetch('manifest.json').then(r => r.json()),
    en: await fetch('manifest-en.json').then(r => r.json()),
  }));
  check('マニフェストJA: 日本語名のみ', manifests.ja.short_name === '禁酒');
  check('マニフェストEN: 英語名のみ', manifests.en.short_name === 'Sober');
  check('maskableアイコンは専用画像', manifests.ja.icons.some(i => i.purpose === 'maskable' && i.src === 'maskable-512.png'));

  // ── 17. 「今日のアドバイス」: AI表記の削除・断定表現の抑制・コンテンツ量 ──
  const adviceTitle = await page.textContent('.advice-title');
  check('アドバイス見出しから「AI」表記を削除', adviceTitle.trim() === '今日のアドバイス');
  const adviceNote = await page.textContent('.advice-note');
  check('免責文が「診断や治療ではない」旨を明記', adviceNote.includes('診断') && adviceNote.includes('治療'));
  // 「別のアドバイスに切り替え」を12回押しても、豆知識が極端に早く一巡しないことを確認
  // （豆知識プールは26個に拡充済み。直近12個を除外する仕組みなので、12回中は基本的に重複しないはず）
  const seenTrivia = new Set();
  for (let i = 0; i < 12; i++) {
    await page.click('#adviceRefresh');
    await page.waitForTimeout(120);
    const body = await page.textContent('#adviceBody');
    const line = body.split('\n').find(l => l.startsWith('💡'));
    if (line) seenTrivia.add(line);
  }
  check('豆知識: 12回切替で10種類以上出る(量の底上げ確認)', seenTrivia.size >= 10, `size=${seenTrivia.size}`);

  check('コンソールエラーなし', errors.length === 0);
  if (errors.length) console.log('errors:', errors);
  console.log(failures.length ? `\n✗ ${failures.length} 件失敗` : '\n✓ 全テスト合格');
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
