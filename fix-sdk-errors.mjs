#!/usr/bin/env node
// fix-sdk-errors.mjs - find and fix known ServiceNow SDK transform/build errors.
// Run from the project root:
//   node fix-sdk-errors.mjs                 fix what it can, then preview a transform
//   node fix-sdk-errors.mjs --dry-run       report only, change nothing
//   node fix-sdk-errors.mjs --placeholders  create empty HTML for missing UI page sources
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');
const PLACEHOLDERS = process.argv.includes('--placeholders');
const FLUENT = path.join(ROOT, 'src', 'fluent');
const CLIENT = path.join(ROOT, 'src', 'client');
const DIST = path.join(ROOT, 'dist', 'static');
const BACKUP = path.join(ROOT, '.fix-backup');

if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  console.error('No package.json here - run this from the project root.');
  process.exit(1);
}

const rel = (p) => path.relative(ROOT, p);
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const backup = (f) => {
  const dest = path.join(BACKUP, rel(f));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f, dest);
};
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const files = walk(FLUENT);
const fixes = [];
const manual = [];

// 1. Widget / header-footer client scripts must START with `api.controller = function(...) {`.
//    The SDK validator rejects a bare `function (...)` and also rejects leading comments,
//    so header comments are moved inside the function body.
const LEAD = /^(?:\s*(?:\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/))*\s*/;
const parses = (code) => { try { new Function(code); return true; } catch { return false; } };
for (const f of files.filter((f) => path.basename(f) === 'client_script.js')) {
  const src = fs.readFileSync(f, 'utf8');
  const lead = src.match(LEAD)[0];
  let body = src.slice(lead.length);
  const changes = [];

  if (/^function\s*\(/.test(body)) {
    body = 'api.controller = ' + body.replace(/\}\s*;?\s*$/, '};\n');
    changes.push('wrapped bare function in api.controller = ...');
  } else if (!/^api\.controller\s*=/.test(body)) {
    if (!/api\.controller\s*=/.test(stripComments(src))) {
      manual.push(`${rel(f)}: no controller function found - fix by hand`);
    }
    continue;
  }

  const comments = lead.trim();
  if (comments) {
    const open = body.match(/^api\.controller\s*=\s*function\s*\([^)]*\)\s*\{/);
    if (!open) { manual.push(`${rel(f)}: couldn't find the function's opening brace - fix by hand`); continue; }
    const indented = comments.split('\n').map((l) => '    ' + l.trim()).join('\n');
    body = body.slice(0, open[0].length) + '\n' + indented + body.slice(open[0].length);
    changes.push('moved leading comments inside the function');
  }

  if (!changes.length) continue;
  if (!parses(body)) { manual.push(`${rel(f)}: rewrite wouldn't parse - left unchanged, fix by hand`); continue; }
  if (!DRY) { if (!fs.existsSync(path.join(BACKUP, rel(f)))) backup(f); fs.writeFileSync(f, body); }
  fixes.push(`${rel(f)}: ${changes.join('; ')}`);
}

// 2. UI page HTML imports must resolve to a file in dist/static
const importRe = /import\s+\w+\s+from\s+['"]([^'"]+\.html)['"]/g;
for (const f of files.filter((f) => f.endsWith('.now.ts'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const [, spec] of src.matchAll(importRe)) {
    const source = path.resolve(path.dirname(f), spec);
    const sub = source.startsWith(CLIENT) ? path.relative(CLIENT, source) : path.basename(source);
    const built = path.join(DIST, sub);
    if (fs.existsSync(built)) continue;
    if (fs.existsSync(source)) {
      if (!DRY) { fs.mkdirSync(path.dirname(built), { recursive: true }); fs.copyFileSync(source, built); }
      fixes.push(`${rel(built)}: copied from ${rel(source)} (temporary - run now-sdk build to replace)`);
    } else if (PLACEHOLDERS) {
      if (!DRY) { fs.mkdirSync(path.dirname(built), { recursive: true }); fs.writeFileSync(built, ''); }
      manual.push(`${rel(built)}: EMPTY placeholder - add real HTML at ${rel(source)} before installing`);
    } else {
      manual.push(`${rel(f)}: imports ${spec}, but ${rel(source)} doesn't exist - copy the UI page HTML from the instance`);
    }
  }
}

// Report
console.log(`\n${DRY ? 'Would fix' : 'Fixed'} (${fixes.length}):`);
fixes.forEach((x) => console.log('  ✔ ' + x));
console.log(`\nNeeds you (${manual.length}):`);
manual.forEach((x) => console.log('  ✖ ' + x));
if (!DRY && fixes.length) console.log(`\nOriginals backed up in ${rel(BACKUP)}/`);

// 3. Surface anything else with a transform preview (compiles, writes nothing)
if (!DRY) {
  console.log('\nRunning transform preview to check for remaining errors...\n');
  try {
    execSync('now-sdk transform --from metadata --preview true', { stdio: 'inherit' });
    console.log('\nNo remaining compile errors. Run: now-sdk transform --from metadata');
  } catch {
    console.log('\nPreview still reports errors (above). Paste them and we can add fixes for them.');
  }
}