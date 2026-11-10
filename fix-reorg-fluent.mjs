#!/usr/bin/env node
// reorg-fluent.mjs - move transform output from
//   src/fluent/generated/<category>/<type>/<sysid>.now.ts
// to
//   src/fluent/<table|acl|role|service-portal|...>/<readable-name>.now.ts
// carrying asset folders (client_script.js, template.html, ...) and fixing relative paths.
// $id values are never touched, so records keep their identity on the instance.
//
// Run from the project root:
//   node reorg-fluent.mjs                     show the plan, change nothing
//   node reorg-fluent.mjs --apply             do it (backs up src/fluent, verifies with now-sdk build)
//   node reorg-fluent.mjs --apply --no-build  do it without the before/after build check
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const BUILD = !process.argv.includes('--no-build');
const FLUENT = path.join(ROOT, 'src', 'fluent');
const GEN = path.join(FLUENT, 'generated');
const BACKUP = path.join(ROOT, '.reorg-backup');
const KEEP = new Set(['keys.ts']); // Now.ID key map - stays in generated/

// generated type folder -> target folder under src/fluent (unlisted types keep their folder name)
const TARGET = {
  'table': 'table', 'sys-db-object': 'table',
  'access-control': 'acl', 'sys-security-acl': 'acl',
  'role': 'role',
  'service-portal': 'service-portal',
  'sp-widget': 'service-portal/widget',
  'sp-header-footer': 'service-portal/header-footer',
  'sp-page': 'service-portal/page',
  'sp-theme': 'service-portal/theme',
  'sys-ui-page': 'ui-page',
  'sys-restricted-caller-access': 'cross-scope/restricted-caller-access',
};
// property that names the file, per target folder (first non-sys_id value found wins)
const NAME_PROPS = {
  'service-portal': ['urlSuffix', 'url_suffix', 'id', 'title'],
  'service-portal/widget': ['id', 'name'],
  'service-portal/header-footer': ['id', 'name'],
  'service-portal/page': ['id', 'title'],
  'cross-scope/restricted-caller-access': ['target', 'source'],
  default: ['name', 'id', 'title'],
};

if (!fs.existsSync(path.join(ROOT, 'package.json'))) { console.error('No package.json here - run from the project root.'); process.exit(1); }
if (!fs.existsSync(GEN)) { console.log('No src/fluent/generated folder - nothing to do.'); process.exit(0); }

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
const isSysId = (v) => /^[0-9a-f]{32}$/i.test(v);
const prop = (s, k) => (s.match(new RegExp(`\\b${k}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`)) || [])[1];
const sanitize = (n) => n.replace(/\*/g, 'all').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^[_.]+|[_.]+$/g, '');
const aclName = (s) => {
  const table = prop(s, 'table') || prop(s, 'name');
  const field = prop(s, 'field');
  const op = prop(s, 'operation');
  const type = prop(s, 'type');
  if (!table || isSysId(table)) return null;
  return [type && type !== 'record' ? type : null, table, field ? (field === '*' ? 'all' : field) : null, op]
    .filter(Boolean).join('.');
};
const SPEC_RE = /((?:from\s+|import\s+|Now\.include\(\s*)(['"]))(\.{1,2}\/[^'"]+)(\2)/g;

// ---- plan ----
const genFiles = walk(GEN).filter((f) => f.endsWith('.now.ts') && !KEEP.has(path.basename(f)) && path.dirname(f) !== GEN);
const moved = new Map();     // old file -> new file
const movedDirs = new Map(); // old asset folder -> new asset folder
const taken = new Set(walk(FLUENT).filter((f) => !f.startsWith(GEN + path.sep)));
const unnamed = [];

for (const f of genFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const typeDir = path.basename(path.dirname(f));
  const target = TARGET[typeDir] ?? typeDir;
  let name = null;
  if (target === 'acl') name = aclName(src);
  else for (const k of NAME_PROPS[target] ?? NAME_PROPS.default) {
    const v = prop(src, k);
    if (v && !isSysId(v)) { name = v; break; }
  }
  const base = (name && sanitize(name)) || path.basename(f, '.now.ts');
  if (!name) unnamed.push(rel(f));
  const dir = path.join(FLUENT, target);
  let dest = path.join(dir, `${base}.now.ts`);
  for (let i = 2; taken.has(dest); i++) dest = path.join(dir, `${base}_${i}.now.ts`);
  taken.add(dest);
  moved.set(f, dest);
  for (const [, , , spec] of src.matchAll(SPEC_RE)) {
    const m = spec.match(/^\.\/([^/]+)\//);
    if (!m) continue;
    const od = path.join(path.dirname(f), m[1]);
    if (fs.existsSync(od) && fs.statSync(od).isDirectory()) movedDirs.set(od, path.join(dir, m[1]));
  }
}

const mapPath = (abs) => {
  for (const ext of ['', '.ts', '.now.ts', '.js']) {
    const n = moved.get(abs + ext);
    if (n) return n.slice(0, n.length - ext.length);
  }
  for (const [od, nd] of movedDirs) if (abs === od || abs.startsWith(od + path.sep)) return nd + abs.slice(od.length);
  return abs;
};

// rewrite relative paths in every .ts file under src/fluent (moved or not)
const writes = new Map(); // old file -> { dest, content }
let pathFixes = 0;
for (const f of walk(FLUENT).filter((f) => f.endsWith('.ts'))) {
  const src = fs.readFileSync(f, 'utf8');
  const dest = moved.get(f) ?? mapPath(f);
  const out = src.replace(SPEC_RE, (all, pre, q, spec, post) => {
    let ns = path.relative(path.dirname(dest), mapPath(path.resolve(path.dirname(f), spec))).split(path.sep).join('/');
    if (!ns.startsWith('.')) ns = './' + ns;
    if (ns !== spec) pathFixes++;
    return pre + ns + post;
  });
  if (out !== src || dest !== f) writes.set(f, { dest, content: out });
}

const leftovers = walk(GEN).filter((f) => !KEEP.has(path.basename(f)) && !moved.has(f) &&
  ![...movedDirs.keys()].some((d) => f.startsWith(d + path.sep)));

// ---- report ----
console.log(`\nPlan: ${moved.size} files, ${movedDirs.size} asset folders, ${pathFixes} path fixes\n`);
for (const [o, n] of moved) console.log(`  ${rel(o)}\n    -> ${rel(n)}`);
if (unnamed.length) console.log(`\nNo readable name found (keeping sys_id file name):\n  ${unnamed.join('\n  ')}`);
if (leftovers.length) console.log(`\nNot referenced by any moved file (left in generated/):\n  ${leftovers.map(rel).join('\n  ')}`);
if (!APPLY) { console.log('\nDry run - nothing changed. Run with --apply to do it.'); process.exit(0); }

// ---- apply ----
const buildOutput = () => {
  execSync('now-sdk build', { stdio: 'inherit' });
  return new Set(walk(path.join(ROOT, 'dist')).filter((f) => f.endsWith('.xml')).map(rel));
};
let before;
if (BUILD) {
  console.log('\nBuilding before reorganizing...');
  try { before = buildOutput(); } catch { console.error('\nBuild fails before reorganizing - fix that first. Nothing changed.'); process.exit(1); }
}

fs.rmSync(BACKUP, { recursive: true, force: true });
fs.cpSync(FLUENT, path.join(BACKUP, 'src', 'fluent'), { recursive: true });

for (const [od, nd] of movedDirs) { fs.mkdirSync(path.dirname(nd), { recursive: true }); fs.renameSync(od, nd); }
for (const [f, { dest, content }] of writes) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  if (dest !== f && fs.existsSync(f)) fs.rmSync(f);
}
const prune = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(d, e.name));
  if (d !== GEN && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
};
prune(GEN);
console.log(`\nDone. Backup of the original src/fluent is in ${rel(BACKUP)}/`);
const restore = `  rm -rf src/fluent && cp -R ${rel(BACKUP)}/src/fluent src/fluent`;

if (BUILD) {
  console.log('\nBuilding after reorganizing...');
  let after;
  try { after = buildOutput(); } catch { console.error(`\nBuild failed after reorganizing. To undo:\n${restore}`); process.exit(1); }
  const extra = [...after].filter((x) => !before.has(x));
  const missing = [...before].filter((x) => !after.has(x));
  if (!extra.length && !missing.length) console.log(`\n✔ Same ${after.size} records before and after - safe to install.`);
  else {
    console.log('\n✖ Build output changed - do NOT install yet.');
    extra.forEach((x) => console.log('  new:     ' + x));
    missing.forEach((x) => console.log('  missing: ' + x));
    console.log(`To undo:\n${restore}`);
  }
}
