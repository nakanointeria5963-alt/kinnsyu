'use strict';

/* 大アルカナ22枚の線画アイコン（星座エングレービング風）。
   小アルカナ56枚は対象外（絵文字のまま）。カード番号(0〜21)をキーに、
   カード中央にはめ込むSVG断片（<svg>の中身）を持つ。
   外部画像は使わず、すべてインラインのstraight-line + circleで構成（座標は手作業で調整済み）。 */

(function () {
  const LINE = 'stroke="#d9c98c" stroke-width="1.1" stroke-linecap="round" fill="none"';
  const NODE = 'fill="#f3e6ae"';
  const STAR_ACCENT = `<g stroke="#f3e6ae" stroke-width="1" opacity=".85">
    <path d="M78 20 L78 10 M78 30 L78 24 M68 20 L74 20 M82 20 L88 20 M71 13 L75 17 M85 13 L81 17 M71 27 L75 23 M85 27 L81 23"/>
  </g>`;
  const BG_STARS = `<g fill="#d9c98c" opacity=".65">
    <circle cx="12" cy="14" r=".9"/><circle cx="90" cy="86" r=".8"/><circle cx="10" cy="60" r=".7"/>
    <circle cx="88" cy="50" r=".7"/><circle cx="16" cy="90" r=".7"/>
  </g>`;

  const FIGURES = {
    0: `<path ${LINE} d="M42 26 L42 40 M42 40 L34 52 M42 40 L52 56 M34 52 L26 66 M52 56 L62 74 M26 66 L18 78 M62 74 L70 84 M42 26 L54 18 M54 18 L62 22 M42 26 L32 32 M32 32 L24 40"/>
      <g ${NODE}><circle cx="42" cy="26" r="2.6"/><circle cx="42" cy="40" r="1.5"/><circle cx="34" cy="52" r="1.5"/><circle cx="52" cy="56" r="1.5"/><circle cx="26" cy="66" r="1.5"/><circle cx="62" cy="74" r="1.5"/><circle cx="18" cy="78" r="1.3"/><circle cx="70" cy="84" r="1.3"/><circle cx="54" cy="18" r="1.3"/><circle cx="62" cy="22" r="1.3"/><circle cx="32" cy="32" r="1.3"/><circle cx="24" cy="40" r="1.3"/></g>`,
    1: `<path ${LINE} d="M42 22 L42 34 M42 34 L36 84 M42 34 L48 84 M42 34 L52 22 L58 12 M42 34 L32 44 L26 54 M18 58 L50 58"/>
      <g ${NODE}><circle cx="42" cy="22" r="2.4"/><circle cx="42" cy="34" r="1.6"/><circle cx="36" cy="84" r="1.3"/><circle cx="48" cy="84" r="1.3"/><circle cx="52" cy="22" r="1.3"/><circle cx="58" cy="12" r="1.6"/><circle cx="32" cy="44" r="1.3"/><circle cx="26" cy="54" r="1.3"/><circle cx="26" cy="58" r="1.1"/><circle cx="34" cy="58" r="1.1"/><circle cx="42" cy="58" r="1.1"/></g>`,
    2: `<path ${LINE} d="M16 26 L16 84 M68 26 L68 84 M42 34 C40 30 44 30 46 26 M42 34 L42 54 M42 54 L34 70 L30 78 M42 54 L50 70 L54 78"/>
      <g ${NODE}><circle cx="42" cy="34" r="2.4"/><circle cx="42" cy="54" r="1.6"/><circle cx="34" cy="70" r="1.3"/><circle cx="30" cy="78" r="1.3"/><circle cx="50" cy="70" r="1.3"/><circle cx="54" cy="78" r="1.3"/><circle cx="16" cy="26" r="1.1"/><circle cx="16" cy="84" r="1.1"/><circle cx="68" cy="26" r="1.1"/><circle cx="68" cy="84" r="1.1"/></g>`,
    3: `<path ${LINE} d="M42 24 L38 18 M42 24 L42 16 M42 24 L46 18 M42 24 L42 50 M42 50 L34 80 M42 50 L50 80 M20 68 L14 62 M20 68 L14 68 M20 68 L14 74 M64 68 L70 62 M64 68 L70 68 M64 68 L70 74"/>
      <g ${NODE}><circle cx="42" cy="24" r="2.4"/><circle cx="42" cy="50" r="1.6"/><circle cx="34" cy="80" r="1.3"/><circle cx="50" cy="80" r="1.3"/><circle cx="20" cy="68" r="1.4"/><circle cx="64" cy="68" r="1.4"/></g>`,
    4: `<path ${LINE} d="M42 30 L42 44 M42 44 L34 58 L30 84 M42 44 L50 58 L54 84 M42 44 L54 38 M20 14 L20 90 M64 14 L64 90 M20 14 L64 14 M20 50 L28 50 M64 50 L56 50 M36 24 L42 16 L48 24"/>
      <g ${NODE}><circle cx="42" cy="30" r="2.4"/><circle cx="42" cy="44" r="1.6"/><circle cx="34" cy="58" r="1.2"/><circle cx="30" cy="84" r="1.2"/><circle cx="50" cy="58" r="1.2"/><circle cx="54" cy="84" r="1.2"/><circle cx="54" cy="38" r="1.3"/><circle cx="20" cy="14" r="1.1"/><circle cx="64" cy="14" r="1.1"/><circle cx="20" cy="90" r="1.1"/><circle cx="64" cy="90" r="1.1"/><circle cx="42" cy="16" r="1.2"/></g>`,
    5: `<path ${LINE} d="M42 26 L42 40 M42 40 L34 70 L32 88 M42 40 L50 70 L52 88 M42 40 L34 30 M34 30 L30 22 M34 30 L38 20 M42 26 L38 16 M42 26 L46 16 M16 30 L16 84 M68 30 L68 84 M30 78 L54 78"/>
      <g ${NODE}><circle cx="42" cy="26" r="2.4"/><circle cx="42" cy="40" r="1.6"/><circle cx="34" cy="70" r="1.2"/><circle cx="32" cy="88" r="1.2"/><circle cx="50" cy="70" r="1.2"/><circle cx="52" cy="88" r="1.2"/><circle cx="34" cy="30" r="1.3"/><circle cx="30" cy="22" r="1.1"/><circle cx="38" cy="20" r="1.1"/><circle cx="38" cy="16" r="1.1"/><circle cx="46" cy="16" r="1.1"/><circle cx="16" cy="30" r="1.1"/><circle cx="16" cy="84" r="1.1"/><circle cx="68" cy="30" r="1.1"/><circle cx="68" cy="84" r="1.1"/><circle cx="30" cy="78" r="1.2"/><circle cx="54" cy="78" r="1.2"/></g>`,
    6: `<path ${LINE} d="M28 28 L28 40 M28 40 L24 60 L22 80 M28 40 L34 60 L36 80 M28 40 L38 50 M56 28 L56 40 M56 40 L52 60 L50 80 M56 40 L62 60 L64 80 M56 40 L46 50 M38 50 L42 46 L46 50"/>
      <path ${LINE} d="M42 14 L42 6 M50 18 L56 12 M34 18 L28 12"/>
      <g ${NODE}><circle cx="28" cy="28" r="2.2"/><circle cx="56" cy="28" r="2.2"/><circle cx="28" cy="40" r="1.5"/><circle cx="56" cy="40" r="1.5"/><circle cx="42" cy="46" r="1.6"/><circle cx="22" cy="80" r="1.2"/><circle cx="36" cy="80" r="1.2"/><circle cx="50" cy="80" r="1.2"/><circle cx="64" cy="80" r="1.2"/><circle cx="42" cy="6" r="1.4"/></g>`,
    7: `<circle cx="24" cy="80" r="8" ${LINE}/><circle cx="60" cy="80" r="8" ${LINE}/>
      <path ${LINE} d="M28 50 L56 50 L56 74 L28 74 Z M28 74 L24 80 M56 74 L60 80 M42 20 L42 50 M42 50 L34 70 M42 50 L50 70 M36 12 L48 12 M42 6 L42 18"/>
      <g ${NODE}><circle cx="42" cy="20" r="2.2"/><circle cx="28" cy="50" r="1.2"/><circle cx="56" cy="50" r="1.2"/><circle cx="28" cy="74" r="1.2"/><circle cx="56" cy="74" r="1.2"/><circle cx="34" cy="70" r="1.2"/><circle cx="50" cy="70" r="1.2"/><circle cx="24" cy="80" r="1.3"/><circle cx="60" cy="80" r="1.3"/></g>`,
    8: `<path ${LINE} d="M30 26 L30 42 M30 42 L24 84 M30 42 L36 84 M30 42 L40 50 M60 60 L74 60 M60 60 L54 52 L56 46 M60 60 L54 68 L58 74 M60 60 L70 68 M28 8 C32 6 32 10 28 10 C24 10 24 6 28 8 Z M30 8 C34 6 34 10 30 10"/>
      <g ${NODE}><circle cx="30" cy="26" r="2.2"/><circle cx="30" cy="42" r="1.5"/><circle cx="40" cy="50" r="1.6"/><circle cx="60" cy="60" r="2"/><circle cx="24" cy="84" r="1.2"/><circle cx="36" cy="84" r="1.2"/></g>`,
    9: `<path ${LINE} d="M42 24 L42 38 M42 38 L34 60 L30 88 M42 38 L50 60 L54 88 M42 38 L30 46 M30 46 L24 86 M42 38 L54 30 M54 30 L54 22 M50 26 L46 22 M58 26 L62 22 M10 88 L74 88"/>
      <circle cx="54" cy="30" r="5" ${LINE}/>
      <g ${NODE}><circle cx="42" cy="24" r="2.4"/><circle cx="42" cy="38" r="1.6"/><circle cx="34" cy="60" r="1.2"/><circle cx="30" cy="88" r="1.2"/><circle cx="50" cy="60" r="1.2"/><circle cx="54" cy="88" r="1.2"/><circle cx="30" cy="46" r="1.3"/><circle cx="24" cy="86" r="1.1"/><circle cx="54" cy="30" r="1.6"/></g>`,
    10: `<circle cx="42" cy="52" r="26" ${LINE}/>
      <path ${LINE} d="M42 26 L42 78 M16 52 L68 52 M24 34 L60 70 M24 70 L60 34"/>
      <g ${NODE}><circle cx="42" cy="52" r="2"/><circle cx="42" cy="26" r="1.4"/><circle cx="42" cy="78" r="1.4"/><circle cx="16" cy="52" r="1.4"/><circle cx="68" cy="52" r="1.4"/><circle cx="24" cy="34" r="1.2"/><circle cx="60" cy="70" r="1.2"/><circle cx="24" cy="70" r="1.2"/><circle cx="60" cy="34" r="1.2"/></g>`,
    11: `<path ${LINE} d="M42 10 L42 28 M38 26 L46 26 M42 32 L42 56 M42 56 L34 84 M42 56 L50 84 M22 40 L62 40 M22 40 L22 50 M62 40 L62 50 M16 50 L28 50 M56 50 L68 50"/>
      <g ${NODE}><circle cx="42" cy="10" r="1.3"/><circle cx="42" cy="32" r="2.2"/><circle cx="42" cy="56" r="1.6"/><circle cx="34" cy="84" r="1.2"/><circle cx="50" cy="84" r="1.2"/><circle cx="22" cy="40" r="1.3"/><circle cx="62" cy="40" r="1.3"/><circle cx="22" cy="50" r="1.2"/><circle cx="62" cy="50" r="1.2"/></g>`,
    12: `<path ${LINE} d="M24 10 L70 10 M56 10 L56 22 M56 22 L66 32 M56 22 L44 28 M44 28 L48 40 M48 40 L44 74 M48 40 L36 46 M48 40 L38 52"/>
      <g ${NODE}><circle cx="24" cy="10" r="1.1"/><circle cx="70" cy="10" r="1.1"/><circle cx="56" cy="22" r="1.4"/><circle cx="66" cy="32" r="1.2"/><circle cx="44" cy="28" r="1.2"/><circle cx="48" cy="40" r="1.6"/><circle cx="44" cy="74" r="2.6"/><circle cx="36" cy="46" r="1.1"/><circle cx="38" cy="52" r="1.1"/></g>`,
    13: `<path ${LINE} d="M40 22 L40 30 M30 30 L50 30 L46 78 L34 78 Z M54 40 L74 14 M70 18 C74 14 78 16 76 20 C74 24 70 22 70 18 Z"/>
      <g ${NODE}><circle cx="40" cy="22" r="2.4"/><circle cx="30" cy="30" r="1.2"/><circle cx="50" cy="30" r="1.2"/><circle cx="34" cy="78" r="1.2"/><circle cx="46" cy="78" r="1.2"/><circle cx="54" cy="40" r="1.4"/><circle cx="20" cy="84" r="1.2"/><circle cx="26" cy="88" r="1"/></g>
      <path ${LINE} d="M18 88 C20 82 24 82 26 88"/>`,
    14: `<path ${LINE} d="M42 22 L42 44 M42 44 L34 74 M42 44 L50 74 M34 30 L22 24 M50 30 L62 24 M34 34 L20 40 M50 34 L64 40 M22 44 L30 50 L38 44 L46 50 L54 44 L62 50"/>
      <g ${NODE}><circle cx="42" cy="22" r="2.4"/><circle cx="42" cy="44" r="1.6"/><circle cx="34" cy="74" r="1.2"/><circle cx="50" cy="74" r="1.2"/><circle cx="22" cy="24" r="1.1"/><circle cx="62" cy="24" r="1.1"/><circle cx="20" cy="40" r="1.4"/><circle cx="64" cy="40" r="1.4"/></g>`,
    15: `<path ${LINE} d="M42 4 L42 12 M38 6 L46 10 M46 6 L38 10 M42 24 L36 18 M42 24 L34 10 M42 24 L48 18 M42 24 L50 10 M42 24 L42 50 M42 34 L26 30 M42 34 L58 30 M42 50 L34 74 M42 50 L50 74 M30 78 L54 78"/>
      <g ${NODE}><circle cx="42" cy="24" r="2.2"/><circle cx="34" cy="10" r="1"/><circle cx="50" cy="10" r="1"/><circle cx="42" cy="50" r="1.6"/><circle cx="26" cy="30" r="1.2"/><circle cx="58" cy="30" r="1.2"/><circle cx="34" cy="74" r="1.2"/><circle cx="50" cy="74" r="1.2"/><circle cx="20" cy="86" r="1.3"/><circle cx="64" cy="86" r="1.3"/></g>`,
    16: `<path ${LINE} d="M34 20 L34 90 M50 20 L50 90 M30 20 L38 20 M46 20 L54 20 M76 8 L60 30 L70 32 L52 58"/>
      <g ${NODE}><circle cx="34" cy="20" r="1.3"/><circle cx="50" cy="20" r="1.3"/><circle cx="34" cy="90" r="1.3"/><circle cx="50" cy="90" r="1.3"/><circle cx="76" cy="8" r="1.4"/><circle cx="52" cy="58" r="1.4"/><circle cx="66" cy="66" r="1.2"/></g>
      <path ${LINE} d="M60 60 L70 72" opacity=".7"/>`,
    17: `<path ${LINE} d="M42 6 L42 22 M34 14 L50 14 M37 9 L47 19 M47 9 L37 19 M38 44 L38 50 M38 50 L30 70 L28 84 M38 50 L44 70 L46 84 M38 50 L24 56 M38 50 L52 56 M14 84 L70 84"/>
      <g ${NODE}><circle cx="42" cy="14" r="1.8"/><circle cx="18" cy="24" r="1"/><circle cx="70" cy="20" r="1"/><circle cx="62" cy="10" r="1"/><circle cx="38" cy="44" r="2"/><circle cx="30" cy="70" r="1.2"/><circle cx="28" cy="84" r="1.2"/><circle cx="44" cy="70" r="1.2"/><circle cx="46" cy="84" r="1.2"/><circle cx="22" cy="58" r="1.3"/><circle cx="56" cy="58" r="1.3"/></g>`,
    18: `<circle cx="42" cy="20" r="10" ${LINE}/>
      <path ${LINE} d="M38 24 L42 26 L46 24 M16 50 L16 90 M68 50 L68 90 M12 50 L20 50 M64 50 L72 50 M26 80 L22 74 M26 80 L30 74 M58 80 L54 74 M58 80 L62 74 M10 90 L74 90"/>
      <g ${NODE}><circle cx="38" cy="18" r="1"/><circle cx="46" cy="18" r="1"/><circle cx="16" cy="50" r="1.1"/><circle cx="68" cy="50" r="1.1"/><circle cx="16" cy="90" r="1.1"/><circle cx="68" cy="90" r="1.1"/><circle cx="26" cy="80" r="1.4"/><circle cx="58" cy="80" r="1.4"/></g>`,
    19: `<circle cx="58" cy="18" r="10" ${LINE}/>
      <path ${LINE} d="M58 2 L58 8 M58 28 L58 34 M42 18 L48 18 M68 18 L74 18 M46 6 L50 10 M70 6 L66 10 M46 30 L50 26 M70 30 L66 26 M30 46 L30 66 M30 66 L24 88 M30 66 L36 88 M30 50 L20 40 M30 50 L40 40"/>
      <g ${NODE}><circle cx="30" cy="46" r="2.4"/><circle cx="30" cy="66" r="1.6"/><circle cx="24" cy="88" r="1.2"/><circle cx="36" cy="88" r="1.2"/><circle cx="20" cy="40" r="1.2"/><circle cx="40" cy="40" r="1.2"/></g>`,
    20: `<path ${LINE} d="M42 16 L42 22 M42 22 L26 16 M42 22 L58 16 M42 20 L54 26 M58 24 L64 20 M58 32 L64 34 M26 74 L26 70 M26 74 L20 66 M26 74 L32 66 M26 74 L26 86 M42 80 L42 76 M42 80 L36 72 M42 80 L48 72 M42 80 L42 92 M58 74 L58 70 M58 74 L52 66 M58 74 L64 66 M58 74 L58 86"/>
      <circle cx="56" cy="28" r="2.6" ${LINE}/>
      <g ${NODE}><circle cx="42" cy="16" r="2"/><circle cx="26" cy="70" r="1.6"/><circle cx="42" cy="76" r="1.6"/><circle cx="58" cy="70" r="1.6"/></g>`,
    21: `<ellipse cx="42" cy="52" rx="30" ry="38" ${LINE} stroke-dasharray="2 3"/>
      <path ${LINE} d="M42 30 L42 42 M42 42 L30 52 M42 42 L54 52 M30 52 L24 70 M54 52 L60 70 M24 70 L30 76 M60 70 L54 76"/>
      <g ${NODE}><circle cx="42" cy="30" r="2"/><circle cx="42" cy="42" r="1.4"/><circle cx="30" cy="52" r="1.3"/><circle cx="54" cy="52" r="1.3"/><circle cx="24" cy="70" r="1.2"/><circle cx="60" cy="70" r="1.2"/></g>`,
  };

  const ICONS = {};
  Object.keys(FIGURES).forEach((n) => {
    ICONS[n] = `<svg viewBox="0 0 100 100">${BG_STARS}${STAR_ACCENT}${FIGURES[n]}</svg>`;
  });

  window.TarotIcons = ICONS;
})();
