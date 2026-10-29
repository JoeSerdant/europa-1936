// Příprava a kontrola před buildem – první polovina `npm run build` (druhá je `vite build`).
// Soubor je záměrně v kořeni projektu, ne v tools/: kořenové soubory se na server dostanou vždy, takže zpráva i oprava fungují,
// i když nahrávací nástroj poškodí složky (src/, tools/, …).
//   1) oprava cest – soubory pojmenované „src\main.jsx“ (zpětná lomítka z Windows; případně „src%2Fmain.jsx“) přesune na správné místo src/main.jsx
//   2) kontrola – ověří, že existují soubory, které index.html a projekt potřebují; jinak vypíše, co v adresáři skutečně je
// Spuštění:  node check-build.mjs   (v kořeni projektu; končí kódem 1, když nějaký soubor chybí)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Soubory, bez kterých projekt nejde sestavit (cesty s lomítky, relativně ke kořeni projektu). */
export const REQUIRED = [
  'index.html', 'package.json', 'vite.config.js',
  'src/main.jsx', 'src/App.jsx', 'src/data/world.json', 'src/data/countries.js',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vercel']);
const BROKEN_NAME = /[\\]|%2f|%5c/i;      // zpětné lomítko nebo zakódované lomítko v názvu souboru v kořeni

function listDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
}

// ------------------------------------------------------------------------------------------------ oprava cest

/** Jméno poškozeného souboru → správná cesta s lomítky, nebo null, když je podezřelá (mimo kořen, prázdná). */
export function repairedPath(name) {
  let rel = name;
  try { rel = decodeURIComponent(rel); } catch { /* neplatné kódování – ponechat jak je */ }
  rel = rel.replace(/[\\/]+/g, '/').replace(/^\.?\/+/, '');
  const segs = rel.split('/');
  if (!rel || segs.some((s) => s === '' || s === '.' || s === '..' || /^[a-z]:$/i.test(s))) return null;   // nic mimo kořen, žádné disky
  return segs.join('/');
}

/**
 * Soubory v kořeni s poškozenou cestou („src\main.jsx“) přesune do správných složek.
 * Nikdy nepřepisuje existující soubor a nesahá mimo kořen. Vrací { moved: [cesty], skipped: [názvy] }.
 */
export function fixPaths(root) {
  const moved = [], skipped = [];
  for (const e of listDir(root) || []) {
    if (!e.isFile() || !BROKEN_NAME.test(e.name)) continue;
    const rel = repairedPath(e.name);
    if (!rel) { skipped.push(e.name); continue; }
    const target = path.join(root, ...rel.split('/'));
    if (fs.existsSync(target)) { skipped.push(e.name); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(path.join(root, e.name), target);
    moved.push(rel);
  }
  return { moved, skipped };
}

// ------------------------------------------------------------------------------------------------ kontrola vstupů

/** Místní odkazy (script src, link href) z HTML, převedené na cesty relativní ke kořeni. Odkazy ven, data: a kotvy se přeskakují. */
export function localRefs(html) {
  const out = [];
  const re = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let url = m[1].trim();
    if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) continue;   // http:, data:, //cdn, #kotva
    url = url.split(/[?#]/)[0].replace(/^\.?\//, '');
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

/**
 * Najde soubor po segmentech a rozlišuje velikost písmen i na systémech, které ji ignorují (Windows, macOS).
 * Vrací { ok } nebo { ok: false, reason, near } – `near` je položka, která se liší jen velikostí písmen.
 */
export function lookup(root, rel) {
  let cur = root;
  const segs = rel.split('/').filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    const entries = listDir(cur);
    const here = segs.slice(0, i).join('/') || '.';
    if (!entries) return { ok: false, reason: `složka ${here} chybí`, near: null };
    const exact = entries.find((e) => e.name === segs[i]);
    if (!exact) {
      const near = entries.find((e) => e.name.toLowerCase() === segs[i].toLowerCase());
      return { ok: false, reason: `v ${here} není „${segs[i]}“`, near: near ? near.name : null };
    }
    cur = path.join(cur, segs[i]);
  }
  return { ok: true };
}

/** Zkontroluje povinné soubory a všechny místní odkazy z index.html. */
export function checkInputs(root, { required = REQUIRED } = {}) {
  let html = '';
  try { html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); } catch { /* index.html se ohlásí jako chybějící níže */ }
  const wanted = [...new Set([...required, ...localRefs(html)])];
  const problems = [];
  for (const rel of wanted) {
    const r = lookup(root, rel);
    if (!r.ok) problems.push({ file: rel, reason: r.reason, near: r.near });
  }
  return { ok: problems.length === 0, problems, wanted };
}

// ------------------------------------------------------------------------------------------------ zpráva

function fmtSize(n) {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} kB`;
  return `${n} B`;
}

/** Spočítá soubory ve stromu (bez node_modules a dist). */
export function countFiles(dir) {
  let n = 0;
  for (const e of listDir(dir) || []) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) n += countFiles(path.join(dir, e.name)); }
    else n++;
  }
  return n;
}

/** Strom adresáře do dané hloubky: složky s počtem souborů, soubory s velikostí; v jedné složce nejvýš `cap` položek. */
export function tree(dir, depth = 2, indent = '  ', cap = 40) {
  const lines = [];
  const entries = (listDir(dir) || []).filter((e) => !SKIP_DIRS.has(e.name)).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries.slice(0, cap)) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      lines.push(`${indent}${e.name}/  (${countFiles(full)} souborů)`);
      if (depth > 1) lines.push(...tree(full, depth - 1, `${indent}  `, cap));
    } else {
      let size = 0;
      try { size = fs.statSync(full).size; } catch { /* nečitelný soubor se vypíše s nulou */ }
      lines.push(`${indent}${e.name}  (${fmtSize(size)})`);
    }
  }
  if (entries.length > cap) lines.push(`${indent}… a dalších ${entries.length - cap} položek`);
  return lines;
}

/** Text chybové zprávy pro log buildu. `fixed` je výsledek fixPaths. */
export function report(root, result, fixed = { moved: [], skipped: [] }, nodeVersion = process.version) {
  const L = [];
  L.push('');
  L.push('CHYBA: v adresáři buildu chybí soubory, které projekt potřebuje:');
  for (const p of result.problems) {
    L.push(`  • ${p.file} – ${p.reason}${p.near ? ` (existuje „${p.near}“ s jinou velikostí písmen)` : ''}`);
  }
  if (fixed.skipped.length) {
    L.push('');
    L.push(`Soubory s poškozenou cestou, které se nepodařilo opravit (${fixed.skipped.length}): ${fixed.skipped.slice(0, 5).join(', ')}${fixed.skipped.length > 5 ? ', …' : ''}`);
  }
  L.push('');
  L.push(`Adresář buildu: ${root}`);
  L.push(`Node: ${nodeVersion}, souborů v projektu (bez node_modules a dist): ${countFiles(root)}`);
  L.push('Obsah (2 úrovně):');
  L.push(...tree(root, 2));
  L.push('');
  L.push('Co s tím: nasazení neobsahuje celý projekt nebo má poškozené cesty. Nahraj ho znovu celý (včetně složky src/ a souboru index.html);');
  L.push('u Vercelu zkontroluj v nasazení záložku Source, jestli tam src/main.jsx je. Nejspolehlivější je nahrávat oficiálním nástrojem: npx vercel --prod.');
  L.push('');
  return L.join('\n');
}

// ------------------------------------------------------------------------------------------------ spuštění

export function main(root = process.cwd()) {
  let fixed = { moved: [], skipped: [] };
  try {
    fixed = fixPaths(root);
  } catch (e) {
    console.warn(`Oprava cest se nezdařila (${e.message}), pokračuji kontrolou.`);
  }
  if (fixed.moved.length) {
    const sample = fixed.moved.slice(0, 3).join(', ');
    console.log(`Opraveno ${fixed.moved.length} souborů s poškozenými cestami (zpětná lomítka z Windows): ${sample}${fixed.moved.length > 3 ? ', …' : ''}`);
  }
  const result = checkInputs(root);
  if (!result.ok) {
    console.error(report(root, result, fixed));
    return 1;
  }
  console.log(`Vstupy buildu v pořádku (ověřeno ${result.wanted.length} souborů, Node ${process.version}).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(main());
}
