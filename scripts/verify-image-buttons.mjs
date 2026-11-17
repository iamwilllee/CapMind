#!/usr/bin/env node
/**
 * 图片按钮识别/执行的端到端自检。
 *
 * 用无头 Chrome 加载 test/ 下的两个测试页，把 selector.ts / recognizer.ts / executor.ts
 * 编译后注入页面，验证：
 *   1. 图片按钮能拿到文案（alt / title / 文件名），且 textHintSource 正确；
 *   2. 纯 sprite / canvas 按钮拿不到文案时 textHintSource === 'none'，不伪造文案；
 *   3. 生成的 selector 唯一命中且指向目标元素；
 *   4. 执行侧 probePage 读到的文案与识别侧一致，不会误判「文案不匹配」。
 *
 * 用法：node scripts/verify-image-buttons.mjs
 * 需要本机有 Chrome/Chromium；可用 CM_CHROME 指定路径。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = mkdtempSync(join(tmpdir(), 'cm-verify-'));

const CHROME_CANDIDATES = [
  process.env.CM_CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean);

const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('找不到浏览器。请设置 CM_CHROME 指向 Chrome/Chromium 可执行文件。');
  process.exit(1);
}

const TSC = join(ROOT, 'node_modules', '.bin', 'tsc');

/** 编译三个模块到临时目录。 */
function compile() {
  const r = spawn(
    TSC,
    [
      'entrypoints/content/selector.ts',
      'lib/recognizer.ts',
      'lib/executor.ts',
      '--outDir',
      OUT,
      '--target', 'ES2020',
      '--module', 'ESNext',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--lib', 'ES2020,DOM',
    ],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let err = '';
  r.stderr.on('data', (d) => (err += d));
  return new Promise((res) => {
    r.on('close', () => {
      // `~/lib/types` 是路径别名，tsc 单文件编译时会报找不到模块，
      // 但它是 import type，编译产物里已被擦除，可以忽略。
      const fatal = err
        .split('\n')
        .filter((l) => l.trim() && !l.includes("Cannot find module '~/lib/types'"));
      if (fatal.length) console.warn('[tsc] ' + fatal.join('\n'));
      res();
    });
  });
}

const stripExports = (s) =>
  s
    .replace(/export async function /g, 'async function ')
    .replace(/export function /g, 'function ')
    .replace(/export class /g, 'class ')
    .replace(/export const /g, 'const ')
    .replace(/^export \{[^}]*\};?$/gm, '')
    .replace(/^export default .*$/gm, '');

function buildInject() {
  const sel = readFileSync(join(OUT, 'entrypoints/content/selector.js'), 'utf8');
  const rec = readFileSync(join(OUT, 'lib/recognizer.js'), 'utf8');
  const ex = readFileSync(join(OUT, 'lib/executor.js'), 'utf8');

  const grab = (src, name) => {
    const m = new RegExp(`(function ${name}\\([\\s\\S]*?\\n\\})`).exec(src);
    if (!m) throw new Error(`编译产物里找不到 ${name}`);
    return m[1];
  };

  return [
    'if (!window.CSS) window.CSS = {};',
    "if (!CSS.escape) CSS.escape = function(s){ return String(s).replace(/[^a-zA-Z0-9_-]/g, function(c){ return '\\\\' + c; }); };",
    stripExports(sel),
    'window.__cm = { textFromUrl: textFromUrl, describeButton: describeButton, extractPayload: extractPayload };',
    stripExports(rec),
    'window.__rec = recognizeLocally;',
    grab(ex, 'textFromUrl'),
    grab(ex, 'ownText'),
    grab(ex, 'probePage'),
    'window.__probe = probePage;',
  ].join('\n');
}

const HARNESS = String.raw`<!doctype html>
<html><head><meta charset="utf-8"><title>verify</title></head>
<body>
<pre id="out">PENDING</pre>
<iframe id="frame" src="__PAGE__" style="width:900px;height:1700px"></iframe>
<script>
const out = [];
let pass = 0, fail = 0;
const log = (s) => out.push(s);
const check = (c, label, detail) => {
  if (c) { log('PASS ' + label); pass++; }
  else { log('FAIL ' + label + (detail ? '  << ' + detail : '')); fail++; }
};
const INJECT = __INJECT__;
const CASES = __CASES__;

document.getElementById('frame').addEventListener('load', () => {
  try {
    const frame = document.getElementById('frame');
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc) { log('FAIL 拿不到 iframe document'); return finish(); }
    win.eval(INJECT);

    log('== 识别侧 ==');
    const recs = CASES.map((t) => {
      const el = doc.querySelector(t.sel);
      if (!el) return { name: t.name, error: '元素不存在: ' + t.sel };
      const r = el.getBoundingClientRect();
      const payload = win.__cm.extractPayload({ x: r.x, y: r.y, w: r.width, h: r.height });
      const rec = win.__rec(payload);
      return { name: t.name, kind: t.kind, expectHint: t.expectHint,
               el: el, buttons: payload.buttons, action: rec.recipe.action, warnings: rec.warnings };
    });

    for (const r of recs) {
      log('');
      log('-- ' + r.name);
      if (r.error) { check(false, r.error); continue; }
      log('   action: ' + JSON.stringify(r.action));
      check(r.action.selector.length > 0, '拿到可用 selector', 'actual=' + JSON.stringify(r.action.selector));
      check(r.action.textHintSource === r.kind, 'textHintSource=' + r.kind, 'actual=' + r.action.textHintSource);

      let count = -1, same = false;
      try {
        const hits = doc.querySelectorAll(r.action.selector);
        count = hits.length;
        same = hits.length > 0 && hits[0] === r.el;
      } catch (e) { count = -1; }
      check(count === 1, 'selector 唯一命中', 'count=' + count);
      check(same, 'selector 指向的就是目标元素', 'same=' + same);

      if (r.kind === 'none') {
        check(r.action.textHint === '', '无文案时 textHint 为空串', 'actual=' + JSON.stringify(r.action.textHint));
        check(r.warnings.some((w) => w.indexOf('图片或画布') >= 0), '给出「无文案可校验」警告');
      }
      if (r.expectHint !== undefined) {
        check(r.action.textHint === r.expectHint, 'textHint 符合预期',
              'actual=' + JSON.stringify(r.action.textHint) + ' expect=' + JSON.stringify(r.expectHint));
      }
    }

    log('');
    log('== 执行侧 probePage ==');
    for (const r of recs) {
      if (r.error) continue;
      const recipe = { action: r.action, alreadySignals: ['已领取', '今日已领'], successSignals: ['领取成功'] };
      const pr = win.__probe(recipe);
      log('');
      log('-- ' + r.name + '  label=' + JSON.stringify(pr.label));
      check(pr.found, '元素能被找到');
      // 核心：按 executor 的判定逻辑，绝不能误判「文案不匹配」
      const verifiable = recipe.action.textHintSource !== 'none' && Boolean(recipe.action.textHint);
      const mismatch = verifiable && pr.label.indexOf(recipe.action.textHint) < 0;
      check(!mismatch, '不会误判「文案不匹配」',
            'verifiable=' + verifiable + ' label=' + JSON.stringify(pr.label) + ' hint=' + JSON.stringify(recipe.action.textHint));
      if (verifiable) {
        check(pr.label.indexOf(recipe.action.textHint) >= 0, '执行侧读到同一份文案（两侧一致）',
              'label=' + JSON.stringify(pr.label));
      } else {
        check(pr.label === '', '无文案时不伪造 label', 'label=' + JSON.stringify(pr.label));
      }
    }

    log('');
    log('RESULT pass=' + pass + ' fail=' + fail);
    finish();
  } catch (e) {
    log('EXCEPTION: ' + (e && e.stack ? e.stack : e));
    finish();
  }
});

function finish() { document.getElementById('out').textContent = out.join('\n'); }
</script>
</body></html>`;

const PAGE_CASES = [
  {
    page: join(ROOT, 'test/checkin-image-demo.html'),
    label: '图片/画布按钮',
    cases: [
      { name: 'button>img[alt]', sel: '#case-alt button', kind: 'attr', expectHint: '签到领额度' },
      { name: 'button>img[src]', sel: '#case-src button', kind: 'attr', expectHint: 'btn checkin claim' },
      { name: 'div[role=button] 纯 sprite', sel: '#case-sprite [role=button]', kind: 'none' },
      { name: 'canvas 自绘', sel: '#case-canvas canvas', kind: 'none' },
      { name: 'span 包裹文字', sel: '#case-span button', kind: 'text', expectHint: '签到领额度' },
    ],
  },
  {
    page: join(ROOT, 'test/checkin-demo.html'),
    label: '文本按钮（回归）',
    cases: [
      { name: '文本按钮', sel: '#checkin-btn', kind: 'text', expectHint: '签到领额度' },
    ],
  },
];

function runHarness(pagePath, cases) {
  const html = HARNESS.replace('__PAGE__', 'file://' + pagePath)
    .replace('__INJECT__', JSON.stringify(buildInject()))
    .replace('__CASES__', JSON.stringify(cases));
  const file = join(OUT, 'harness.html');
  writeFileSync(file, html);

  const profile = mkdtempSync(join(tmpdir(), 'cm-profile-'));
  const p = spawn(
    CHROME,
    [
      `--user-data-dir=${profile}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-sandbox',
      '--allow-file-access-from-files',
      '--virtual-time-budget=6000',
      '--dump-dom',
      'file://' + file,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let dom = '';
  p.stdout.on('data', (d) => (dom += d));
  return new Promise((res) => {
    p.on('close', () => {
      const m = /<pre id="out">([\s\S]*?)<\/pre>/.exec(dom);
      res(m ? m[1] : '（没有拿到输出）');
    });
  });
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const main = async () => {
  await compile();
  let totalPass = 0;
  let totalFail = 0;

  for (const group of PAGE_CASES) {
    console.log(`\n### ${group.label}  (${group.page.replace(ROOT + '/', '')})`);
    const text = decode(await runHarness(group.page, group.cases));
    console.log(text);
    const m = /RESULT pass=(\d+) fail=(\d+)/.exec(text);
    if (m) {
      totalPass += Number(m[1]);
      totalFail += Number(m[2]);
    } else {
      totalFail += 1;
    }
  }

  console.log('\n' + '='.repeat(52));
  console.log(`总计 通过 ${totalPass} · 失败 ${totalFail}`);
  rmSync(OUT, { recursive: true, force: true });
  process.exitCode = totalFail === 0 ? 0 : 1;
};

main().catch((e) => {
  console.error(e);
  rmSync(OUT, { recursive: true, force: true });
  process.exitCode = 1;
});
