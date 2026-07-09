'use strict';

/* AIの今日のアドバイス生成エンジン（端末内で動作・日英対応）。
   カスタム指示:
     - 医学的なアドバイスと禁酒の豆知識を必ず含める
     - 継続日数と年齢を参照する
     - 少し長めにする
     - 直近に出したものを避け、同じような内容が続かないようにする
   誕生日＋日付＋salt から決定的に生成するため、同じ日は同じ結果になり、
   「別のアドバイス」を押すと別の組み合わせが出る。 */

const ADVISOR_JA = {
  MED: {
    s0: [
      'アルコールを断つと、まず肝臓が解毒の負担から解放され、休息を取り戻し始めます。今日は水分をこまめに摂り、体をいたわってあげましょう。',
      '飲酒をやめた直後、体は失われた水分を求めます。ノンカフェインの水やお茶で脱水を防ぐと、だるさや頭重感が和らぎます。',
      'もし手の震え・強い動悸・大量の発汗・吐き気などの離脱症状が出たときは、我慢せず医療機関に相談してください。特に大量に飲んでいた方の急な断酒は、安全のため医師のサポートが望ましい場合があります。',
    ],
    s1: [
      '断酒から24〜48時間は離脱反応が出やすい時期です。睡眠が浅くなりやすいので、就寝前のスマホやカフェインを控えると眠りが深まります。',
      '血中のアルコールはほぼ抜け、体はデトックスに集中しています。ビタミンB群やタンパク質を含む食事が、消耗した栄養の回復を助けます。',
      'この時期の頭痛・イライラ・不安感は、脳がアルコールのない状態に慣れていく一時的な反応であることが多いです。強い症状が続くときは医師へ相談を。',
    ],
    s2: [
      '離脱症状のピークを越える頃です。血圧が少しずつ落ち着き、胃腸の調子も整い始めます。消化に優しい食事を心がけましょう。',
      'アルコールの利尿作用がなくなり、体内の水分バランスが回復してきます。むくみが引いて顔まわりがすっきりしてくる人もいます。',
      '睡眠リズムが乱れやすい数日です。日中に軽い運動や日光を取り入れると、体内時計が整い夜の寝つきが良くなります。',
    ],
    s3: [
      '1週間の断酒で睡眠が深まり、朝の目覚めの良さを感じ始める時期です。カフェインを午後に避けると、睡眠の質はさらに安定します。',
      '肝臓の炎症が落ち着き始め、血糖値も安定しやすくなります。3食を規則正しく摂ることが回復を後押しします。',
      '肌の水分量が戻り、顔のむくみやくすみが軽くなってくる頃です。鏡を見るのが少し楽しみになるかもしれません。',
    ],
    s4: [
      '2週間を超えると、血圧の低下や中性脂肪の改善が期待できます。ウォーキングなど適度な有酸素運動を足すと相乗効果があります。',
      '胃酸の分泌が整い、胸やけや胃のむかつきが減ってくる時期です。胃腸が本来の調子を取り戻しつつあります。',
      '集中力や記憶のクリアさが戻ってきたと感じる人が多い頃です。新しい習慣や学びを始める好機です。',
    ],
    s5: [
      '1か月の断酒で、肝臓に溜まった脂肪が目に見えて減り始めます。健康診断のγ-GTPやALT（肝機能の数値）の改善も期待できる時期です。',
      'アルコール由来の余分なカロリーを断つことで、体重や体脂肪が落ち着いてくる人が多い頃です。',
      '気分の波が穏やかになり、慢性的だった不安感やイライラが減ってきたという報告もあります。',
    ],
    s6: [
      '2か月を超えると、睡眠と栄養の土台が効いて免疫機能が整い、体調を崩しにくくなると言われます。',
      '肝機能の数値がさらに改善しやすい時期です。定期的な血液検査で成果を「見える化」すると、継続の励みになります。',
    ],
    s7: [
      '3か月の節目です。肝臓の脂肪が大幅に減り、脂肪肝の改善が期待できます。血圧や血糖の安定も続きます。',
      '脳の報酬系が回復し、飲酒への強い渇望が自然と弱まってくる人が増える頃です。ここまでの継続が土台になっています。',
    ],
    s8: [
      '半年の断酒で、心臓や血管への負担が減り、心血管系のリスクが着実に下がってきます。運動習慣を組み合わせるとさらに効果的です。',
      '肝臓は再生力の高い臓器です。ここまでの継続で、多くの機能が着実に回復へ向かっています。',
    ],
    s9: [
      '1年以上の断酒は、高血圧やいくつかのがんのリスク低下につながると報告されています。心から称賛に値する積み重ねです。',
      '長期の断酒によって、睡眠・気分・人間関係の質までもが総合的に向上したと感じる人が多くいます。',
    ],
  },
  AGE: {
    young: [
      '若い今のうちに飲酒習慣を手放すことは、将来の肝臓や脳を守る大きな投資になります。',
      '20代は回復力が高い一方で、習慣が定着しやすい時期でもあります。今日の選択が10年後の自分を形づくります。',
    ],
    a30: [
      '30代は仕事や付き合いで飲む機会が増えがちです。断酒は睡眠の質と日中の集中力に直結します。',
      '代謝が少しずつ変わり始める30代。飲まずに浮いた時間とお金を、自分の健康投資に回してみましょう。',
    ],
    a40: [
      '40代は肝機能や血圧に変化が出やすい年代です。断酒はこれらの数値改善に特に効果を発揮します。',
      '40代の断酒は、生活習慣病の予防という観点でも価値の大きい選択です。',
    ],
    a50: [
      '50代は肝臓の回復に少し時間がかかることもありますが、断酒の効果は着実に表れます。焦らず継続を。',
      '睡眠が乱れやすくなる年代です。アルコールを断つことで、夜間に目が覚める回数が減る人が多くいます。',
    ],
    senior: [
      'シニア世代はアルコールの影響を受けやすく、断酒は転倒予防や薬との相互作用の面でも安心につながります。',
      '年齢を重ねてからの断酒でも、睡眠・認知機能・バランス感覚の改善が期待できます。無理のない範囲で続けましょう。',
    ],
    unknown: [
      '設定で生年月日を登録すると、あなたの年齢に合わせたアドバイスをお届けできます。',
      '年齢に合った助言のために、よければ設定から生年月日を入力してみてください。',
    ],
  },
  TRIVIA: [
    'アルコールは「寝つきを良くする」と思われがちですが、実は睡眠の後半を浅くし、夜中の目覚めを増やします。',
    'ビール中びん1本(約500ml)は、ごはん約1杯分に近いカロリー。断酒はダイエットの近道でもあります。',
    '「とりあえず一杯」を我慢すると、多くの場合15〜20分ほどで飲みたい気持ちの波は引いていきます。',
    '肝臓は「沈黙の臓器」。かなり傷んでも症状が出にくいため、数値での定期チェックが大切です。',
    'アルコールを分解する速さには大きな個人差があり、遺伝的に「お酒に弱い」人は食道がんのリスクが高いと報告されています。',
    '休肝日を点々と作るより、まとまった期間しっかり断つ方が、肝臓の回復には効果的というデータもあります。',
    '喉の渇きを「飲みたい」と勘違いすることがあります。まず水を一杯飲むと、衝動がすっと収まることも。',
    'アルコールには利尿作用があり、飲むほど体は脱水に傾きます。翌朝のだるさの大きな一因です。',
    '「節酒」より「断酒」の方が続けやすいと感じる人は少なくありません。ゼロの方が毎回の判断に迷わないためです。',
    '炭酸水やノンアルコール飲料を「儀式」として置き換えると、手持ち無沙汰からくる飲みたさが和らぎます。',
    '飲み会は最初の30分が山場。ソフトドリンクを手に持っておくと、お酒を勧められにくくなります。',
    'アルコールはレム睡眠を減らし、記憶の定着を妨げるとされています。学びの多い日ほど断酒が味方になります。',
    '日本人の約4割は、アルコールを分解する酵素の働きが生まれつき弱い「下戸体質」と言われています。',
    '断酒による肌の変化(くすみ・むくみの改善)は、2〜4週間で気づく人が多いようです。',
    '「飲みたい」の多くは、ストレスや退屈が引き金です。別の行動に置き換えると衝動は弱まります。',
    'グラス1杯のワインにも数十kcal。1年間の休肝は、数万kcal分の節約になることもあります。',
  ],
  TIP: [
    '今日は飲みたくなったら、まず冷たい炭酸水を一杯どうぞ。',
    '衝動が来たら5分だけ散歩してみましょう。波はきっと引いていきます。',
    '今日の気分を「記録」タブに残すと、続ける力になります。',
    '夜の時間を持て余したら、いつもと違うお茶を試してみてください。',
    'ゆっくり深呼吸を3回。それだけで衝動の強さは変わります。',
    '飲みたくなったら、我慢した先にある「明日のスッキリした朝」を想像してみましょう。',
    '手持ち無沙汰なときは、温かい飲み物をゆっくり味わってみて。',
    '今日を達成できたら、お酒以外の小さなご褒美を自分にあげましょう。',
  ],
  CLOSING: [
    '一日ずつで大丈夫。あなたはよくやっています。',
    '今日の一歩が、確かな回復につながっています。',
    '無理せず、あなたのペースで。',
    '未来のあなたが、今日の選択にきっと感謝します。',
  ],
  head(days, label) {
    if (days <= 0) return label ? `断酒スタート、${label}のあなたへ。` : '断酒スタート。よく決心しました。';
    return label ? `断酒 ${days} 日目、${label}のあなたへ。` : `断酒 ${days} 日目のあなたへ。`;
  },
  triviaLabel: '💡 豆知識: ',
  ageLabel(age) {
    if (age == null) return null;
    if (age < 20) return '10代';
    if (age < 30) return '20代';
    if (age < 40) return '30代';
    if (age < 50) return '40代';
    if (age < 60) return '50代';
    if (age < 70) return '60代';
    return '70代以上';
  },
};

const ADVISOR_EN = {
  MED: {
    s0: [
      'The moment you stop drinking, your liver gets a break from detox duty and starts to rest. Sip water regularly today and be gentle with yourself.',
      'Right after quitting, your body craves the fluids it lost. Water or caffeine-free tea helps prevent dehydration and eases fatigue and heavy-headedness.',
      'If you get shaking hands, a racing heart, heavy sweating or nausea, don’t tough it out — see a doctor. For heavy drinkers, quitting abruptly is safest with medical support.',
    ],
    s1: [
      'Withdrawal effects peak around 24–48 hours in. Sleep may be shallow, so skipping screens and caffeine before bed helps you rest deeper.',
      'The alcohol is nearly out of your bloodstream and your body is focused on detox. Meals with B vitamins and protein help restore what was depleted.',
      'Headaches, irritability and anxiety at this stage are usually your brain temporarily adjusting to life without alcohol. If symptoms are severe or persist, talk to a doctor.',
    ],
    s2: [
      'You’re getting past the peak of withdrawal. Blood pressure starts settling and digestion improves. Favor easy-to-digest meals for now.',
      'Without alcohol’s diuretic effect, your fluid balance is recovering. Many people notice facial puffiness fading around now.',
      'Sleep rhythms can be bumpy for a few days. Light daytime exercise and sunlight help reset your body clock for easier nights.',
    ],
    s3: [
      'A week in, sleep deepens and mornings start feeling genuinely better. Avoiding caffeine after noon stabilizes sleep quality further.',
      'Liver inflammation is calming down and blood sugar becomes steadier. Regular meals three times a day support the recovery.',
      'Skin hydration returns and puffiness or dullness starts lifting around now. The mirror might become a little more fun.',
    ],
    s4: [
      'Past two weeks, you can expect lower blood pressure and improving triglycerides. Adding light cardio like walking multiplies the benefit.',
      'Stomach acid regulation improves and heartburn or queasiness fades. Your digestive system is finding its rhythm again.',
      'Many people notice sharper focus and clearer memory around now. It’s a great moment to start a new habit or learn something.',
    ],
    s5: [
      'At one month, fat stored in the liver is measurably decreasing. Liver panel numbers like GGT and ALT often start improving around now.',
      'Cutting alcohol’s empty calories means weight and body fat often begin settling at this stage.',
      'Mood swings smooth out, and many people report less of the chronic anxiety and irritability they used to feel.',
    ],
    s6: [
      'Past two months, better sleep and nutrition strengthen your immune system, making you less likely to get run down.',
      'Liver values tend to keep improving in this period. Regular blood tests make the progress visible — great motivation.',
    ],
    s7: [
      'Three months — a real milestone. Liver fat is greatly reduced and fatty liver often improves. Blood pressure and blood sugar stay steadier too.',
      'Your brain’s reward system is recovering, and strong cravings naturally weaken for many people around now. Your consistency built this.',
    ],
    s8: [
      'Half a year alcohol-free reduces strain on your heart and blood vessels, steadily lowering cardiovascular risk. Pairing it with exercise helps even more.',
      'The liver is a remarkably regenerative organ. With this much consistency, many of its functions are steadily recovering.',
    ],
    s9: [
      'Over a year alcohol-free is linked to lower risk of high blood pressure and several cancers. This is an accomplishment worth genuine pride.',
      'Long-term sobriety often improves sleep, mood and even the quality of relationships — the benefits compound.',
    ],
  },
  AGE: {
    young: [
      'Letting go of drinking while you’re young is a huge investment in your future liver and brain.',
      'Your twenties bring high resilience but also fast habit formation. Today’s choice shapes who you are in ten years.',
    ],
    a30: [
      'Your thirties tend to bring more work drinks and social pressure. Staying sober directly improves your sleep and daytime focus.',
      'Metabolism starts shifting in your thirties. Reinvest the time and money you’re not spending on drinks into your health.',
    ],
    a40: [
      'In your forties, liver values and blood pressure start to move. Quitting alcohol is especially effective at improving those numbers.',
      'Quitting in your forties is also a high-value move for preventing lifestyle diseases down the road.',
    ],
    a50: [
      'In your fifties the liver can take a little longer to recover, but the benefits of sobriety arrive reliably. No rush — just keep going.',
      'Sleep gets more fragile at this age. Many people find they wake up far less at night once alcohol is out of the picture.',
    ],
    senior: [
      'Older bodies feel alcohol’s effects more strongly — quitting also means fewer falls and safer medication use.',
      'Even quitting later in life improves sleep, cognition and balance. Keep it sustainable and steady.',
    ],
    unknown: [
      'Add your birth date in Settings and the advice here will be tailored to your age.',
      'For age-specific guidance, consider entering your birth date in Settings.',
    ],
  },
  TRIVIA: [
    'Alcohol seems to help you fall asleep, but it actually makes the second half of the night shallower and wakes you more often.',
    'A pint of beer carries roughly the calories of a bowl of rice. Quitting is a shortcut for weight control too.',
    'Ride out the "just one drink" urge and it usually fades within 15–20 minutes.',
    'The liver is a "silent organ" — it rarely complains even when damaged, which is why regular blood tests matter.',
    'People vary hugely in how fast they break down alcohol; those who flush easily carry a higher risk of esophageal cancer.',
    'Data suggests a solid continuous break helps the liver recover more than scattered alcohol-free days.',
    'Thirst is often mistaken for a craving. Drink a glass of water first — the urge frequently just dissolves.',
    'Alcohol is a diuretic: the more you drink, the more dehydrated you get. It’s a big reason mornings-after feel awful.',
    'Many people find full sobriety easier than moderation — zero means never having to negotiate with yourself.',
    'Swapping in sparkling water or alcohol-free drinks as a "ritual" eases the restless urge to hold a drink.',
    'The first 30 minutes of a party are the hardest. Holding a soft drink makes people far less likely to offer you alcohol.',
    'Alcohol suppresses REM sleep and interferes with memory consolidation — sobriety is your ally on days you learn a lot.',
    'A significant share of East Asians have a gene variant that weakens alcohol metabolism from birth.',
    'Skin improvements from sobriety — less dullness and puffiness — typically show within 2–4 weeks.',
    'Most cravings are triggered by stress or boredom. Swapping in another activity reliably weakens the urge.',
    'Even one glass of wine has dozens of calories. A year alcohol-free can mean tens of thousands of calories saved.',
  ],
  TIP: [
    'If a craving hits today, pour yourself a cold sparkling water first.',
    'When the urge comes, walk for just five minutes. The wave will pass.',
    'Logging today’s mood in the Log tab genuinely strengthens the streak.',
    'If the evening feels long, try a tea you’ve never had before.',
    'Three slow, deep breaths. That alone changes the strength of an urge.',
    'When you want a drink, picture tomorrow’s clear-headed morning — it’s on the other side of tonight.',
    'Restless hands? Slowly savor a warm drink instead.',
    'If you make it through today, give yourself a small non-alcohol reward.',
  ],
  CLOSING: [
    'One day at a time is enough. You’re doing well.',
    'Today’s step is real recovery in motion.',
    'Go at your own pace — no forcing it.',
    'Future you will be grateful for today’s choice.',
  ],
  head(days, label) {
    if (days <= 0) return label ? `Starting your alcohol-free journey — for you, ${label}.` : 'Day zero. That decision took courage.';
    return label ? `Day ${days} alcohol-free — for you, ${label}.` : `Day ${days} alcohol-free.`;
  },
  triviaLabel: '💡 Did you know: ',
  ageLabel(age) {
    if (age == null) return null;
    if (age < 20) return 'in your teens';
    if (age < 30) return 'in your 20s';
    if (age < 40) return 'in your 30s';
    if (age < 50) return 'in your 40s';
    if (age < 60) return 'in your 50s';
    if (age < 70) return 'in your 60s';
    return 'in your 70s or beyond';
  },
};

function stageKey(days) {
  if (days <= 0) return 's0';
  if (days <= 2) return 's1';
  if (days <= 6) return 's2';
  if (days <= 13) return 's3';
  if (days <= 29) return 's4';
  if (days <= 59) return 's5';
  if (days <= 89) return 's6';
  if (days <= 179) return 's7';
  if (days <= 364) return 's8';
  return 's9';
}

function ageGroup(age) {
  if (age == null) return 'unknown';
  if (age < 30) return 'young';
  if (age < 40) return 'a30';
  if (age < 50) return 'a40';
  if (age < 60) return 'a50';
  return 'senior';
}

/* 直近に使ったものを避けて選ぶ */
function pick(pool, rand, history, keep) {
  let avail = pool.filter(s => !history.includes(s));
  if (avail.length === 0) avail = pool.slice();
  const s = avail[Math.floor(rand() * avail.length)];
  history.push(s);
  while (history.length > keep) history.shift();
  return s;
}

function ageFrom(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate), t = new Date();
  if (isNaN(b)) return null;
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return (a >= 0 && a < 130) ? a : null;
}

/* history はステップ別の配列を持つオブジェクト（永続化される）。破壊的に更新する。 */
function generate({ days, age, date, salt = 0, history, lang = 'ja' }) {
  const C = lang === 'en' ? ADVISOR_EN : ADVISOR_JA;
  history = history || {};
  for (const k of ['med', 'age', 'trivia', 'tip', 'closing']) if (!history[k]) history[k] = [];

  const rand = Util.rng(Util.hashSeed(`${date}|${salt}|${age == null ? 'x' : age}|${days}`));
  const grp = ageGroup(age);
  const label = C.ageLabel(age);

  const med = pick(C.MED[stageKey(days)], rand, history.med, 4);
  const ageNote = pick(C.AGE[grp], rand, history.age, 2);
  const trivia = pick(C.TRIVIA, rand, history.trivia, 8);
  const tip = pick(C.TIP, rand, history.tip, 5);
  const closing = pick(C.CLOSING, rand, history.closing, 2);

  const text =
    `${C.head(days, label)}\n\n` +
    `🩺 ${med}\n\n` +
    `${ageNote}\n\n` +
    `${C.triviaLabel}${trivia}\n\n` +
    `${tip} ${closing}`;

  return { text };
}

window.Advisor = { generate, ageFrom };
