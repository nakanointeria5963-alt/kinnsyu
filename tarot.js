'use strict';

/* 大アルカナ22枚のタロット占い。禁酒アプリ本体とは独立したお楽しみ機能。
   誕生日＋当日の日付から決定的に1枚を引くので、同じ日は同じ結果になり、
   日付が変わると自動で更新される。 */

const TAROT_CARDS = [
  { n: 0,  name: '愚者',       emoji: '🃏', up: '新しい始まり・自由・冒険', rev: '無計画・軽率・停滞' },
  { n: 1,  name: '魔術師',     emoji: '🎩', up: '創造力・意志・実現', rev: '準備不足・迷い' },
  { n: 2,  name: '女教皇',     emoji: '🌙', up: '直感・知恵・秘密', rev: '感情の乱れ・不安' },
  { n: 3,  name: '女帝',       emoji: '👑', up: '豊かさ・愛情・実り', rev: '停滞・浪費・依存' },
  { n: 4,  name: '皇帝',       emoji: '🏛️', up: '安定・リーダーシップ・達成', rev: '頑固・支配・空回り' },
  { n: 5,  name: '教皇',       emoji: '📿', up: '信頼・導き・良縁', rev: '不信・お節介・形式主義' },
  { n: 6,  name: '恋人',       emoji: '💕', up: '選択・調和・出会い', rev: 'すれ違い・優柔不断' },
  { n: 7,  name: '戦車',       emoji: '🏇', up: '前進・勝利・行動力', rev: '暴走・焦り・停止' },
  { n: 8,  name: '力',         emoji: '🦁', up: '勇気・忍耐・内なる強さ', rev: '弱気・衝動・自信喪失' },
  { n: 9,  name: '隠者',       emoji: '🏮', up: '内省・探求・賢明さ', rev: '孤立・頑固・閉塞' },
  { n: 10, name: '運命の輪',   emoji: '🎡', up: '転機・幸運・流れ', rev: '停滞・タイミングのずれ' },
  { n: 11, name: '正義',       emoji: '⚖️', up: '公正・バランス・決断', rev: '偏り・不誠実・迷い' },
  { n: 12, name: '吊るされた男', emoji: '🙃', up: '転換の視点・受容・忍耐', rev: '無駄な我慢・停滞' },
  { n: 13, name: '死神',       emoji: '🦋', up: '再生・終わりと始まり・変化', rev: '執着・停滞・恐れ' },
  { n: 14, name: '節制',       emoji: '🕊️', up: '調和・節度・穏やかさ', rev: '過不足・浪費・不安定' },
  { n: 15, name: '悪魔',       emoji: '🔮', up: '情熱・魅力・現実的な力', rev: '束縛からの解放・自制' },
  { n: 16, name: '塔',         emoji: '⚡', up: '衝撃的な気づき・刷新', rev: '危機回避・緩やかな変化' },
  { n: 17, name: '星',         emoji: '⭐', up: '希望・癒やし・理想', rev: '失望・現実逃避・停滞' },
  { n: 18, name: '月',         emoji: '🌕', up: '想像力・繊細さ・神秘', rev: '不安の解消・霧が晴れる' },
  { n: 19, name: '太陽',       emoji: '☀️', up: '成功・活力・喜び', rev: '空元気・見栄・遅れ' },
  { n: 20, name: '審判',       emoji: '📯', up: '復活・決断・良い知らせ', rev: '停滞・後悔・見送り' },
  { n: 21, name: '世界',       emoji: '🌍', up: '完成・達成・充実', rev: 'あと一歩・未完・停滞' },
];

const FORTUNE_ADVICE = [
  '小さな一歩を大切に。今日の選択が未来をつくります。',
  '直感を信じてみて。心の声が正解を知っています。',
  '焦らずマイペースで。あなたのリズムが一番です。',
  '身近な人との会話に、思わぬヒントが隠れています。',
  '深呼吸をひとつ。落ち着けば道は開けます。',
  '新しいことに触れてみて。世界が少し広がります。',
  '自分を労わる時間を。休むことも前進のうちです。',
  '感謝を言葉にすると、良い流れが巡ってきます。',
  '整理整頓が運気の追い風に。まず一箇所から。',
  '笑顔でいることが、今日最大のお守りになります。',
];

const LUCKY_COLORS = [
  { name: '深紅',   hex: '#dc2626' }, { name: 'サファイア', hex: '#2563eb' },
  { name: 'エメラルド', hex: '#059669' }, { name: 'ゴールド', hex: '#d97706' },
  { name: 'ラベンダー', hex: '#7c3aed' }, { name: 'ターコイズ', hex: '#0891b2' },
  { name: 'コーラル', hex: '#f43f5e' }, { name: 'シルバー', hex: '#64748b' },
  { name: 'オレンジ', hex: '#ea580c' }, { name: 'ミント', hex: '#10b981' },
];

const LUCKY_ITEMS = [
  '手帳', 'ハーブティー', '観葉植物', 'お気に入りの音楽', '青いペン',
  '天然石', 'ろうそく', '散歩', '新しい本', 'あたたかいスープ',
  'ストレッチ', 'キャンドル', 'コーヒー', '深呼吸', '手書きのメモ',
];

/* 誕生日(YYYY-MM-DD or '') と当日(YYYY-MM-DD) から今日の運勢を返す */
function drawFortune(birthDate, dateStr) {
  const seed = Util.hashSeed((birthDate || 'guest') + '|' + dateStr);
  const rand = Util.rng(seed);
  const card = TAROT_CARDS[Math.floor(rand() * TAROT_CARDS.length)];
  const reversed = rand() < 0.35;
  const advice = FORTUNE_ADVICE[Math.floor(rand() * FORTUNE_ADVICE.length)];
  const color = LUCKY_COLORS[Math.floor(rand() * LUCKY_COLORS.length)];
  const item = LUCKY_ITEMS[Math.floor(rand() * LUCKY_ITEMS.length)];
  const luckyNumber = Math.floor(rand() * 9) + 1;
  // 総合運を星3〜5個で（誕生日ありの人がほんの少し良くなる遊び心）
  const stars = 3 + Math.floor(rand() * 3);
  return {
    card, reversed,
    meaning: reversed ? card.rev : card.up,
    orientation: reversed ? '逆位置' : '正位置',
    advice, color, item, luckyNumber, stars,
  };
}

window.Tarot = { drawFortune };
