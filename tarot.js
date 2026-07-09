'use strict';

/* 大アルカナ22枚のタロット占い（日英対応）。禁酒アプリ本体とは独立したお楽しみ機能。
   誕生日＋当日の日付から決定的に1枚を引くので、同じ日は同じ結果になり、
   日付が変わると自動で更新される。言語を切り替えても同じカードが出る。 */

const TAROT_CARDS = [
  { n: 0,  emoji: '🃏', ja: { name: '愚者', up: '新しい始まり・自由・冒険', rev: '無計画・軽率・停滞' }, en: { name: 'The Fool', up: 'New beginnings, freedom, adventure', rev: 'Recklessness, hesitation, stalling' } },
  { n: 1,  emoji: '🎩', ja: { name: '魔術師', up: '創造力・意志・実現', rev: '準備不足・迷い' }, en: { name: 'The Magician', up: 'Creativity, willpower, manifestation', rev: 'Unpreparedness, doubt' } },
  { n: 2,  emoji: '🌙', ja: { name: '女教皇', up: '直感・知恵・秘密', rev: '感情の乱れ・不安' }, en: { name: 'The High Priestess', up: 'Intuition, wisdom, mystery', rev: 'Emotional turbulence, unease' } },
  { n: 3,  emoji: '👑', ja: { name: '女帝', up: '豊かさ・愛情・実り', rev: '停滞・浪費・依存' }, en: { name: 'The Empress', up: 'Abundance, love, fruition', rev: 'Stagnation, excess, dependence' } },
  { n: 4,  emoji: '🏛️', ja: { name: '皇帝', up: '安定・リーダーシップ・達成', rev: '頑固・支配・空回り' }, en: { name: 'The Emperor', up: 'Stability, leadership, achievement', rev: 'Stubbornness, control, spinning wheels' } },
  { n: 5,  emoji: '📿', ja: { name: '教皇', up: '信頼・導き・良縁', rev: '不信・お節介・形式主義' }, en: { name: 'The Hierophant', up: 'Trust, guidance, good connections', rev: 'Distrust, meddling, rigidity' } },
  { n: 6,  emoji: '💕', ja: { name: '恋人', up: '選択・調和・出会い', rev: 'すれ違い・優柔不断' }, en: { name: 'The Lovers', up: 'Choice, harmony, encounters', rev: 'Miscommunication, indecision' } },
  { n: 7,  emoji: '🏇', ja: { name: '戦車', up: '前進・勝利・行動力', rev: '暴走・焦り・停止' }, en: { name: 'The Chariot', up: 'Momentum, victory, drive', rev: 'Overdrive, impatience, standstill' } },
  { n: 8,  emoji: '🦁', ja: { name: '力', up: '勇気・忍耐・内なる強さ', rev: '弱気・衝動・自信喪失' }, en: { name: 'Strength', up: 'Courage, patience, inner strength', rev: 'Timidity, impulse, lost confidence' } },
  { n: 9,  emoji: '🏮', ja: { name: '隠者', up: '内省・探求・賢明さ', rev: '孤立・頑固・閉塞' }, en: { name: 'The Hermit', up: 'Reflection, seeking, wisdom', rev: 'Isolation, stubbornness, feeling stuck' } },
  { n: 10, emoji: '🎡', ja: { name: '運命の輪', up: '転機・幸運・流れ', rev: '停滞・タイミングのずれ' }, en: { name: 'Wheel of Fortune', up: 'Turning point, luck, momentum', rev: 'Stagnation, off timing' } },
  { n: 11, emoji: '⚖️', ja: { name: '正義', up: '公正・バランス・決断', rev: '偏り・不誠実・迷い' }, en: { name: 'Justice', up: 'Fairness, balance, decision', rev: 'Bias, dishonesty, doubt' } },
  { n: 12, emoji: '🙃', ja: { name: '吊るされた男', up: '転換の視点・受容・忍耐', rev: '無駄な我慢・停滞' }, en: { name: 'The Hanged Man', up: 'New perspective, acceptance, patience', rev: 'Pointless endurance, stalling' } },
  { n: 13, emoji: '🦋', ja: { name: '死神', up: '再生・終わりと始まり・変化', rev: '執着・停滞・恐れ' }, en: { name: 'Death', up: 'Rebirth, endings and beginnings, change', rev: 'Attachment, stagnation, fear' } },
  { n: 14, emoji: '🕊️', ja: { name: '節制', up: '調和・節度・穏やかさ', rev: '過不足・浪費・不安定' }, en: { name: 'Temperance', up: 'Harmony, moderation, calm', rev: 'Imbalance, excess, instability' } },
  { n: 15, emoji: '🔮', ja: { name: '悪魔', up: '情熱・魅力・現実的な力', rev: '束縛からの解放・自制' }, en: { name: 'The Devil', up: 'Passion, allure, worldly power', rev: 'Breaking free, self-control' } },
  { n: 16, emoji: '⚡', ja: { name: '塔', up: '衝撃的な気づき・刷新', rev: '危機回避・緩やかな変化' }, en: { name: 'The Tower', up: 'Sudden insight, renewal', rev: 'Crisis averted, gentle change' } },
  { n: 17, emoji: '⭐', ja: { name: '星', up: '希望・癒やし・理想', rev: '失望・現実逃避・停滞' }, en: { name: 'The Star', up: 'Hope, healing, ideals', rev: 'Disappointment, escapism, stalling' } },
  { n: 18, emoji: '🌕', ja: { name: '月', up: '想像力・繊細さ・神秘', rev: '不安の解消・霧が晴れる' }, en: { name: 'The Moon', up: 'Imagination, sensitivity, mystery', rev: 'Anxiety lifting, fog clearing' } },
  { n: 19, emoji: '☀️', ja: { name: '太陽', up: '成功・活力・喜び', rev: '空元気・見栄・遅れ' }, en: { name: 'The Sun', up: 'Success, vitality, joy', rev: 'Forced cheer, vanity, delay' } },
  { n: 20, emoji: '📯', ja: { name: '審判', up: '復活・決断・良い知らせ', rev: '停滞・後悔・見送り' }, en: { name: 'Judgement', up: 'Revival, decision, good news', rev: 'Stagnation, regret, missed calls' } },
  { n: 21, emoji: '🌍', ja: { name: '世界', up: '完成・達成・充実', rev: 'あと一歩・未完・停滞' }, en: { name: 'The World', up: 'Completion, achievement, fulfillment', rev: 'One step short, unfinished' } },
];

const FORTUNE_ADVICE = {
  ja: [
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
  ],
  en: [
    'Cherish the small steps — today’s choices build your future.',
    'Trust your gut. Your inner voice already knows.',
    'No rush — your own rhythm is the right one.',
    'A chat with someone close hides an unexpected hint.',
    'One deep breath. Calm opens the way.',
    'Try something new — the world widens a little.',
    'Make time to care for yourself. Rest counts as progress.',
    'Speak your gratitude aloud and good things circulate.',
    'Tidying up invites good fortune. Start with one corner.',
    'Your smile is today’s best lucky charm.',
  ],
};

const LUCKY_COLORS = [
  { hex: '#dc2626', ja: '深紅', en: 'Crimson' },
  { hex: '#2563eb', ja: 'サファイア', en: 'Sapphire' },
  { hex: '#059669', ja: 'エメラルド', en: 'Emerald' },
  { hex: '#d97706', ja: 'ゴールド', en: 'Gold' },
  { hex: '#7c3aed', ja: 'ラベンダー', en: 'Lavender' },
  { hex: '#0891b2', ja: 'ターコイズ', en: 'Turquoise' },
  { hex: '#f43f5e', ja: 'コーラル', en: 'Coral' },
  { hex: '#64748b', ja: 'シルバー', en: 'Silver' },
  { hex: '#ea580c', ja: 'オレンジ', en: 'Orange' },
  { hex: '#10b981', ja: 'ミント', en: 'Mint' },
];

const LUCKY_ITEMS = {
  ja: ['手帳', 'ハーブティー', '観葉植物', 'お気に入りの音楽', '青いペン', '天然石', 'ろうそく', '散歩', '新しい本', 'あたたかいスープ', 'ストレッチ', 'キャンドル', 'コーヒー', '深呼吸', '手書きのメモ'],
  en: ['a notebook', 'herbal tea', 'a houseplant', 'favorite music', 'a blue pen', 'a gemstone', 'a candle', 'a walk', 'a new book', 'warm soup', 'stretching', 'candlelight', 'coffee', 'deep breaths', 'a handwritten note'],
};

/* 誕生日(YYYY-MM-DD or '') と当日(YYYY-MM-DD) から今日の運勢を返す。
   乱数を引く順序は言語に依存しないため、言語を切り替えても同じ結果になる。 */
function drawFortune(birthDate, dateStr, lang = 'ja') {
  const L = lang === 'en' ? 'en' : 'ja';
  const seed = Util.hashSeed((birthDate || 'guest') + '|' + dateStr);
  const rand = Util.rng(seed);
  const card = TAROT_CARDS[Math.floor(rand() * TAROT_CARDS.length)];
  const reversed = rand() < 0.35;
  const advice = FORTUNE_ADVICE[L][Math.floor(rand() * FORTUNE_ADVICE.ja.length)];
  const color = LUCKY_COLORS[Math.floor(rand() * LUCKY_COLORS.length)];
  const item = LUCKY_ITEMS[L][Math.floor(rand() * LUCKY_ITEMS.ja.length)];
  const luckyNumber = Math.floor(rand() * 9) + 1;
  const stars = 3 + Math.floor(rand() * 3);
  return {
    card, reversed,
    name: card[L].name,
    meaning: reversed ? card[L].rev : card[L].up,
    advice,
    color: { hex: color.hex, name: color[L] },
    item, luckyNumber, stars,
  };
}

window.Tarot = { drawFortune };
