#!/usr/bin/env node
'use strict';

/* 共通ファイルを本家(このリポジトリ)から姉妹アプリへ配るツール。
 *
 *   node tools/sync-common.cjs           配る（書き込み）
 *   node tools/sync-common.cjs --check   ズレがないか確認するだけ（CI用・書き込まない）
 *   node tools/sync-common.cjs --only sesshu   特定の配布先だけ
 *
 * 配るファイルと、配布先ごとの単語の置き換えは tools/sync-config.json で定義する。
 * sw.js の CACHE 名は配布先で stamp-sw.cjs が振り直すため、比較時は無視する。 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync-config.json'), 'utf8'));

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

/* CACHE名の10桁ハッシュは配布先ごとに変わって当然なので、比較の前に伏せる */
function normalize(text) {
  return text.replace(/^(const CACHE = '[a-z]+-)[0-9a-f]{10}';$/m, "$1<stamp>';");
}

function applyReplace(text, rules) {
  return rules.reduce((s, [from, to]) => s.split(from).join(to), text);
}

let drift = 0;
let wrote = 0;

for (const target of cfg.targets) {
  if (only && target.name !== only) continue;

  const dir = path.resolve(ROOT, target.dir);
  if (!fs.existsSync(dir)) {
    console.error(`  ! 配布先が見つかりません: ${target.name} (${dir})`);
    console.error('    先に git clone してから実行してください。');
    process.exitCode = 1;
    continue;
  }

  console.log(`\n── ${target.name} (${target.dir})`);
  let changedHere = 0;

  for (const rel of cfg.files) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) {
      console.error(`  ! 本家に無いファイル: ${rel}`);
      process.exitCode = 1;
      continue;
    }
    const expected = applyReplace(fs.readFileSync(src, 'utf8'), target.replace);
    const dst = path.join(dir, rel);
    const current = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;

    if (current !== null && normalize(current) === normalize(expected)) continue;

    const label = current === null ? '新規' : 'ズレ';
    if (checkOnly) {
      console.log(`  ${label} ${rel}`);
      drift++;
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, expected);
      console.log(`  配布(${label}) ${rel}`);
      wrote++;
      changedHere++;
    }
  }

  if (!checkOnly && changedHere === 0) console.log('  変更なし');

  /* sw.js を配り直したらキャッシュ名を振り直す（配布先の接頭辞で再生成される） */
  if (!checkOnly && changedHere > 0 && fs.existsSync(path.join(dir, 'tools/stamp-sw.cjs'))) {
    const out = execFileSync('node', ['tools/stamp-sw.cjs'], { cwd: dir, encoding: 'utf8' });
    console.log(`  ${out.trim()}`);
  }
}

console.log('');
if (checkOnly) {
  if (drift > 0) {
    console.error(`✗ ${drift}件ズレています。本家で 'node tools/sync-common.cjs' を実行して配ってください。`);
    process.exit(1);
  }
  console.log('✓ 共通ファイルはすべて同期されています');
} else {
  console.log(wrote > 0 ? `✓ ${wrote}件配りました。各アプリでテストを実行してからコミットしてください。` : '✓ すべて同期済みでした');
}
