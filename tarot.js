'use strict';

/* タロット占い（日英対応・全78枚デッキ）。禁酒アプリ本体とは独立したお楽しみ機能。
   - 大アルカナ22枚＋小アルカナ56枚（ワンド/カップ/ソード/ペンタクル × A〜10・ペイジ・ナイト・クイーン・キング）
   - 誕生日＋当日の日付から決定的に1枚を引く（同じ日は同じ結果・言語を切り替えても同じカード）
   - ごくまれに「大吉（ジャックポット）」の日があり、そのときだけ特別演出が走る */

const TAROT_MAJOR = [
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

/* ---- 小アルカナ: 4スート × 14ランク = 56枚 ---- */
const MINOR_SUITS = [
  { emoji: '🔥', ja: { name: 'ワンド', theme: '情熱・行動' }, en: { name: 'Wands', theme: 'passion & action' } },
  { emoji: '🏺', ja: { name: 'カップ', theme: '感情・人間関係' }, en: { name: 'Cups', theme: 'feelings & relationships' } },
  { emoji: '⚔️', ja: { name: 'ソード', theme: '思考・決断' }, en: { name: 'Swords', theme: 'thought & decisions' } },
  { emoji: '🪙', ja: { name: 'ペンタクル', theme: 'お金・仕事・健康' }, en: { name: 'Pentacles', theme: 'money, work & health' } },
];

const MINOR_RANKS = [
  { r: 'A',  ja: { label: 'エース', up: '新しいエネルギーの芽生え。チャンスの種が届く日', rev: '少し出遅れ気味。あわてず準備を整えて' },
             en: { label: 'Ace', up: 'A fresh spark — the seed of an opportunity arrives', rev: 'A slow start; take time to prepare' } },
  { r: '2',  ja: { label: '2', up: 'バランスと選択。次の一手が見えてくる', rev: '決めきれない気配。保留も立派な選択' },
             en: { label: 'Two', up: 'Balance and choice — your next move becomes clear', rev: 'Hard to decide; waiting is also a choice' } },
  { r: '3',  ja: { label: '3', up: '努力が形になり、視野がぐっと広がる', rev: '計画の見直しどき。急がば回れ' },
             en: { label: 'Three', up: 'Effort takes shape and your horizons widen', rev: 'Time to revisit the plan — slow is smooth' } },
  { r: '4',  ja: { label: '4', up: '土台が固まる安定の日。休息も吉', rev: 'マンネリ気味。小さな変化を一つだけ' },
             en: { label: 'Four', up: 'Foundations settle — a stable day; rest is welcome', rev: 'A little stale; add one small change' } },
  { r: '5',  ja: { label: '5', up: '小さな試練は成長のスパイス。学びが多い日', rev: '消耗注意。無理をしないのが正解' },
             en: { label: 'Five', up: 'A small challenge spices growth — a day of lessons', rev: 'Watch your energy; don’t push too hard' } },
  { r: '6',  ja: { label: '6', up: '調和と助け合い。素直さが幸運を呼ぶ', rev: '過去を振り返りすぎ。目線は前へ' },
             en: { label: 'Six', up: 'Harmony and helping hands — openness invites luck', rev: 'Looking back too much; face forward' } },
  { r: '7',  ja: { label: '7', up: '工夫と粘り強さが実る。あきらめないで', rev: '見込み違いに注意。一度立ち止まって確認を' },
             en: { label: 'Seven', up: 'Ingenuity and persistence pay off — don’t give up', rev: 'Check your assumptions before pressing on' } },
  { r: '8',  ja: { label: '8', up: '流れが速く動き出す。波に乗って', rev: '空回り気味。深呼吸してペースを戻して' },
             en: { label: 'Eight', up: 'Things speed up — ride the wave', rev: 'Wheels spinning; breathe and reset your pace' } },
  { r: '9',  ja: { label: '9', up: '積み重ねの成果を感じる充実の日', rev: '警戒しすぎかも。肩の力を抜いて' },
             en: { label: 'Nine', up: 'A fulfilling day — your consistency shows', rev: 'Maybe too much on guard; relax your shoulders' } },
  { r: '10', ja: { label: '10', up: 'ひと区切りの完成。次のサイクルの始まり', rev: '抱え込みすぎ注意。手放すと軽くなる' },
             en: { label: 'Ten', up: 'A cycle completes — a new one begins', rev: 'Carrying too much; letting go lightens you' } },
  { r: 'P',  ja: { label: 'ペイジ', up: 'うれしい知らせや新しい学びが舞い込む', rev: '注意散漫になりがち。ひとつずつ丁寧に' },
             en: { label: 'Page', up: 'Good news or a new lesson arrives', rev: 'Easily distracted; take things one at a time' } },
  { r: 'N',  ja: { label: 'ナイト', up: '行動力に追い風。動けば道が開ける', rev: '勇み足に注意。一呼吸おいてから' },
             en: { label: 'Knight', up: 'Tailwind for action — moving opens the way', rev: 'Don’t rush in; pause one beat first' } },
  { r: 'Q',  ja: { label: 'クイーン', up: '直感が冴え、包容力が魅力になる日', rev: '感情の波に注意。自分を甘やかしてOK', },
             en: { label: 'Queen', up: 'Sharp intuition; your warmth draws people in', rev: 'Emotional waves — it’s okay to be gentle with yourself' } },
  { r: 'K',  ja: { label: 'キング', up: '自信と実力が発揮できる。堂々といこう', rev: '頑固になりすぎ注意。人の意見も宝物' },
             en: { label: 'King', up: 'Confidence and skill shine — stand tall', rev: 'Beware stubbornness; others’ views are gold' } },
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

const DECK_SIZE = TAROT_MAJOR.length + MINOR_SUITS.length * MINOR_RANKS.length; // 78

/* デッキの index からカード情報を取り出す（0-21: 大アルカナ / 22-77: 小アルカナ） */
function cardAt(index, L) {
  if (index < TAROT_MAJOR.length) {
    const c = TAROT_MAJOR[index];
    return {
      kind: 'major', emoji: c.emoji, numLabel: String(c.n),
      name: c[L].name, up: c[L].up, rev: c[L].rev,
    };
  }
  const m = index - TAROT_MAJOR.length;
  const suit = MINOR_SUITS[Math.floor(m / MINOR_RANKS.length)];
  const rank = MINOR_RANKS[m % MINOR_RANKS.length];
  const name = L === 'ja'
    ? `${suit.ja.name}の${rank.ja.label}`
    : `${rank.en.label} of ${suit.en.name}`;
  const theme = suit[L].theme;
  const up = L === 'ja' ? `【${theme}】${rank.ja.up}` : `(${theme}) ${rank.en.up}`;
  const rev = L === 'ja' ? `【${theme}】${rank.ja.rev}` : `(${theme}) ${rank.en.rev}`;
  return { kind: 'minor', emoji: suit.emoji, numLabel: rank.r, name, up, rev };
}

/* 誕生日(YYYY-MM-DD or '') と当日(YYYY-MM-DD) から今日の運勢を返す。
   乱数を引く順序は言語に依存しないため、言語を切り替えても同じ結果になる。 */
function drawFortune(birthDate, dateStr, lang = 'ja') {
  const L = lang === 'en' ? 'en' : 'ja';
  const seed = Util.hashSeed((birthDate || 'guest') + '|' + dateStr);
  const rand = Util.rng(seed);

  const index = Math.floor(rand() * DECK_SIZE);
  let reversed = rand() < 0.35;
  const advice = FORTUNE_ADVICE[L][Math.floor(rand() * FORTUNE_ADVICE.ja.length)];
  const color = LUCKY_COLORS[Math.floor(rand() * LUCKY_COLORS.length)];
  const item = LUCKY_ITEMS[L][Math.floor(rand() * LUCKY_ITEMS.ja.length)];
  const luckyNumber = Math.floor(rand() * 9) + 1;

  /* 運勢ランク。ごくまれ（約3%）に「大吉」の日があり、特別演出の対象になる */
  const roll = rand();
  let stars, jackpot = false;
  if (roll < 0.03) { stars = 5; jackpot = true; reversed = false; }
  else if (roll < 0.18) stars = 5;
  else if (roll < 0.55) stars = 4;
  else stars = 3;

  const card = cardAt(index, L);
  return {
    card: { emoji: card.emoji, numLabel: card.numLabel, kind: card.kind },
    name: card.name,
    reversed,
    meaning: reversed ? card.rev : card.up,
    advice, color, item, luckyNumber, stars, jackpot,
  };
}

window.Tarot = { drawFortune, DECK_SIZE };
