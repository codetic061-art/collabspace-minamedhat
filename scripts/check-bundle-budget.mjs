import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_DIR = resolve('dist');
const INDEX_HTML_PATH = join(DIST_DIR, 'index.html');
const ASSETS_DIR = join(DIST_DIR, 'assets');

const ENTRY_BUDGET_BYTES = 140 * 1024;
const FEATURE_BUDGET_BYTES = 60 * 1024;
const CHART_BUDGET_BYTES = 150 * 1024;

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function checkIndexHtml(html) {
  const errors = [];
  const entryFiles = new Set();
  const preloadFiles = new Set();

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1] ?? '';
    const body = (match[2] ?? '').trim();
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(attrs);

    if (body.length > 0 || !srcMatch) {
      errors.push(
        `Inline or non-src <script> tag found in dist/index.html (violates CSP script-src 'self').`,
      );
      continue;
    }

    const src = srcMatch[1];
    if (!src.startsWith('/assets/')) {
      errors.push(`Unexpected <script src="${src}"> in dist/index.html; expected /assets/*.js.`);
      continue;
    }

    entryFiles.add(src.slice('/assets/'.length));
  }

  if (entryFiles.size === 0) {
    errors.push('No entry <script type="module" src="/assets/..."> found in dist/index.html.');
  }

  const preloadRegex = /<link\b([^>]*rel=["']modulepreload["'][^>]*)>/gi;
  while ((match = preloadRegex.exec(html)) !== null) {
    const attrs = match[1] ?? '';
    const hrefMatch = /\bhref=["']\/assets\/([^"']+\.js)["']/i.exec(attrs);
    if (hrefMatch) {
      preloadFiles.add(hrefMatch[1]);
    }
  }

  return { errors, entryFiles, preloadFiles };
}

function main() {
  const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
  const { errors, entryFiles, preloadFiles } = checkIndexHtml(indexHtml);

  const assetNames = readdirSync(ASSETS_DIR).filter((name) => name.endsWith('.js')).sort();

  if (assetNames.length === 0) {
    errors.push('No JS bundles found under dist/assets/.');
  }

  const rows = [];
  let initialLoadGzipBytes = 0;

  for (const name of assetNames) {
    const fullPath = join(ASSETS_DIR, name);
    const buffer = readFileSync(fullPath);
    const rawBytes = buffer.byteLength;
    const gzipBytes = gzipSync(buffer).byteLength;
    const content = buffer.toString('utf8');

    const isEntry = entryFiles.has(name) || preloadFiles.has(name);
    const isChart = !isEntry && (/chart|recharts/i.test(name) || /recharts/i.test(content));

    let category = 'route';
    let budgetBytes = FEATURE_BUDGET_BYTES;

    if (isEntry) {
      category = entryFiles.has(name) ? 'entry' : 'entry-preload';
      budgetBytes = ENTRY_BUDGET_BYTES;
      initialLoadGzipBytes += gzipBytes;

      if (/recharts/i.test(content)) {
        errors.push(`Entry chunk "${name}" contains "recharts"; chart library must stay lazy.`);
      }
    } else if (isChart) {
      category = 'chart';
      budgetBytes = CHART_BUDGET_BYTES;
    }

    const passed = gzipBytes <= budgetBytes;
    if (!passed) {
      errors.push(
        `Chunk "${name}" (${category}) is ${formatKb(gzipBytes)} gzipped, exceeding ${formatKb(budgetBytes)} budget.`,
      );
    }

    rows.push({
      Chunk: name,
      Category: category,
      Raw: formatKb(rawBytes),
      Gzip: formatKb(gzipBytes),
      Budget: formatKb(budgetBytes),
      Status: passed ? 'PASS' : 'FAIL',
    });
  }

  if (initialLoadGzipBytes > ENTRY_BUDGET_BYTES) {
    errors.push(
      `Combined initial entry JS (${formatKb(initialLoadGzipBytes)} gzipped) exceeds ${formatKb(ENTRY_BUDGET_BYTES)} budget.`,
    );
  }

  console.log('\nBundle Budget Report (dist/assets/*.js):');
  console.table(rows);
  console.log(
    `Initial entry total: ${formatKb(initialLoadGzipBytes)} / ${formatKb(ENTRY_BUDGET_BYTES)} gzipped`,
  );

  if (errors.length > 0) {
    console.error('\nBundle budget / CSP checks failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('All bundle budget and CSP inline-script checks passed.');
}

main();
