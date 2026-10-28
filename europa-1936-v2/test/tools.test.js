// Příprava a kontrola před buildem (check-build.mjs): oprava poškozených cest, chybějící soubor, velikost písmen, odkazy z index.html, čitelná zpráva.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED, repairedPath, fixPaths, localRefs, lookup, checkInputs, report, countFiles, tree, main } from '../check-build.mjs';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';      // na Windows nejde vytvořit soubor se zpětným lomítkem v názvu – testy poškozených cest se tam přeskočí
const itPosix = it.skipIf(WIN);

function put(root, rel, text = 'x') {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

let tmp;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e1936-inputs-')); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

const HTML = '<!doctype html><html><head><link rel="icon" href="data:,"><link rel="stylesheet" href="https://fonts.example/x.css"></head>'
  + '<body><script type="module" src="/src/main.jsx"></script></body></html>';

function makeProject(root, { skip = [] } = {}) {
  for (const rel of REQUIRED) if (!skip.includes(rel)) put(root, rel, rel === 'index.html' ? HTML : 'x');
}

/** Poškodí nasazení tak, jak to udělá nahrávací nástroj z Windows: všechny vnořené soubory skončí v kořeni s „\“ v názvu. */
function mangle(root, sep = '\\') {
  const moves = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (dir !== root) moves.push(full);
    }
  })(root);
  for (const full of moves) {
    const rel = path.relative(root, full).split(path.sep).join(sep);
    fs.renameSync(full, path.join(root, rel));
  }
  for (const e of fs.readdirSync(root, { withFileTypes: true })) if (e.isDirectory()) fs.rmSync(path.join(root, e.name), { recursive: true });
}

describe('localRefs', () => {
  it('bere jen místní odkazy a zbavuje je úvodního lomítka a dotazu', () => {
    const html = '<script type="module" src="/src/main.jsx?v=1"></script><link href="./a/b.css"><script src="https://cdn/x.js"></script>'
      + '<link rel="icon" href="data:,"><link href="//cdn/y.css"><a href="#x">';
    expect(localRefs(html)).toEqual(['src/main.jsx', 'a/b.css']);
  });
  it('zvládne jednoduché i dvojité uvozovky a duplicity', () => {
    expect(localRefs(`<script src='/src/main.jsx'></script><script src="/src/main.jsx"></script>`)).toEqual(['src/main.jsx']);
  });
});

describe('lookup a checkInputs', () => {
  it('úplný projekt projde', () => {
    makeProject(tmp);
    const r = checkInputs(tmp);
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
  });
  it('chybějící vstupní soubor se ohlásí', () => {
    makeProject(tmp, { skip: ['src/main.jsx'] });
    const r = checkInputs(tmp);
    expect(r.ok).toBe(false);
    expect(r.problems.map((p) => p.file)).toContain('src/main.jsx');
  });
  it('chybějící celá složka src se ohlásí u všech souborů v ní', () => {
    const inSrc = REQUIRED.filter((f) => f.startsWith('src/'));
    makeProject(tmp, { skip: inSrc });
    const r = checkInputs(tmp);
    expect(r.ok).toBe(false);
    expect(r.problems.filter((p) => p.file.startsWith('src/')).length).toBe(inSrc.length);
    expect(r.problems[0].reason).toMatch(/chybí|není/);
  });
  it('rozliší velikost písmen a navrhne existující název', () => {
    makeProject(tmp, { skip: ['src/main.jsx'] });
    put(tmp, 'src/Main.jsx');
    const r = lookup(tmp, 'src/main.jsx');
    expect(r.ok).toBe(false);
    expect(r.near).toBe('Main.jsx');
  });
  it('kontroluje i soubory, na které odkazuje index.html', () => {
    makeProject(tmp);
    put(tmp, 'index.html', HTML.replace('</body>', '<script type="module" src="/src/extra.js"></script></body>'));
    const r = checkInputs(tmp);
    expect(r.problems.map((p) => p.file)).toEqual(['src/extra.js']);
  });
  it('chybějící index.html se ohlásí a nespadne', () => {
    makeProject(tmp, { skip: ['index.html'] });
    const r = checkInputs(tmp);
    expect(r.ok).toBe(false);
    expect(r.problems.map((p) => p.file)).toContain('index.html');
  });
});

describe('oprava poškozených cest', () => {
  it('repairedPath převede zpětná a zakódovaná lomítka a odmítne cesty mimo kořen', () => {
    expect(repairedPath('src\\main.jsx')).toBe('src/main.jsx');
    expect(repairedPath('src\\\\ui\\hud\\TopBar.jsx')).toBe('src/ui/hud/TopBar.jsx');
    expect(repairedPath('src%2Fmain.jsx')).toBe('src/main.jsx');
    expect(repairedPath('src%5Cmain.jsx')).toBe('src/main.jsx');
    expect(repairedPath('..\\evil.txt')).toBeNull();
    expect(repairedPath('src\\..\\..\\evil.txt')).toBeNull();
    expect(repairedPath('C:\\Users\\x\\src\\main.jsx')).toBeNull();
    expect(repairedPath('')).toBeNull();
  });
  itPosix('soubory „src\\main.jsx“ v kořeni přesune do src/main.jsx', () => {
    put(tmp, 'index.html', HTML);
    put(tmp, 'src\\main.jsx', 'M');
    put(tmp, 'src\\ui\\hud\\TopBar.jsx', 'T');
    put(tmp, 'tools\\lib\\geom.js', 'G');
    const r = fixPaths(tmp);
    expect(r.moved.sort()).toEqual(['src/main.jsx', 'src/ui/hud/TopBar.jsx', 'tools/lib/geom.js']);
    expect(r.skipped).toEqual([]);
    expect(fs.readFileSync(path.join(tmp, 'src/main.jsx'), 'utf8')).toBe('M');
    expect(fs.readFileSync(path.join(tmp, 'src/ui/hud/TopBar.jsx'), 'utf8')).toBe('T');
    expect(fs.existsSync(path.join(tmp, 'src\\main.jsx'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, 'index.html'))).toBe(true);        // běžné soubory se nemění
  });
  itPosix('nepřepíše existující soubor a nesahá mimo kořen', () => {
    put(tmp, 'src/main.jsx', 'PRAVY');
    put(tmp, 'src\\main.jsx', 'POSKOZENY');
    put(tmp, '..\\evil.txt', 'E');
    const r = fixPaths(tmp);
    expect(r.moved).toEqual([]);
    expect(r.skipped.sort()).toEqual(['..\\evil.txt', 'src\\main.jsx']);
    expect(fs.readFileSync(path.join(tmp, 'src/main.jsx'), 'utf8')).toBe('PRAVY');
    expect(fs.existsSync(path.join(path.dirname(tmp), 'evil.txt'))).toBe(false);
  });
  it('celý poškozený projekt po opravě projde kontrolou (zpětná lomítka i %2F)', () => {
    for (const sep of ['\\', '%2F']) {
      if (sep === '\\' && WIN) continue;
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e1936-mangled-'));
      try {
        makeProject(dir);
        mangle(dir, sep);
        expect(checkInputs(dir).ok).toBe(false);                            // před opravou chybí vnořené soubory
        const fixed = fixPaths(dir);
        expect(fixed.moved.length).toBe(REQUIRED.filter((f) => f.includes('/')).length);
        expect(checkInputs(dir).ok).toBe(true);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  });
});

describe('main a report', () => {
  it('main vrací 0 u úplného projektu a 1 u neúplného', () => {
    makeProject(tmp);
    expect(main(tmp)).toBe(0);
    fs.rmSync(path.join(tmp, 'src/main.jsx'));
    expect(main(tmp)).toBe(1);
  });
  itPosix('main opraví poškozený projekt a vrátí 0', () => {
    makeProject(tmp);
    mangle(tmp);
    expect(main(tmp)).toBe(0);
    expect(fs.existsSync(path.join(tmp, 'src/main.jsx'))).toBe(true);
  });
  it('zpráva jmenuje chybějící soubor, adresář a obsah', () => {
    makeProject(tmp, { skip: ['src/main.jsx'] });
    put(tmp, 'src/Main.jsx');
    const text = report(tmp, checkInputs(tmp), { moved: [], skipped: [] }, 'v99.0.0');
    expect(text).toContain('src/main.jsx');
    expect(text).toContain('Main.jsx');
    expect(text).toContain('v99.0.0');
    expect(text).toContain(tmp);
    expect(text).toContain('src/');
    expect(text).toContain('Source');
  });
  itPosix('zpráva zmíní neopravené soubory s poškozenou cestou', () => {
    makeProject(tmp, { skip: ['src/main.jsx'] });
    put(tmp, '..\\evil.txt');
    const fixed = fixPaths(tmp);
    const text = report(tmp, checkInputs(tmp), fixed);
    expect(text).toContain('nepodařilo opravit');
    expect(text).toContain('..\\evil.txt');
  });
  it('strom omezí počet položek v jedné složce', () => {
    for (let i = 0; i < 7; i++) put(tmp, `f${i}.txt`);
    const lines = tree(tmp, 1, '', 3);
    expect(lines.length).toBe(4);
    expect(lines[3]).toContain('dalších 4');
  });
  it('countFiles přeskakuje node_modules a dist', () => {
    makeProject(tmp);
    put(tmp, 'node_modules/a/b.js');
    put(tmp, 'dist/index.html');
    expect(countFiles(tmp)).toBe(REQUIRED.length);
  });
});

describe('skutečný projekt', () => {
  it('obsahuje všechny soubory potřebné k sestavení (hlídá přesun nebo přejmenování vstupů)', () => {
    const r = checkInputs(PROJECT);
    expect(r.problems).toEqual([]);
    expect(r.wanted).toContain('src/main.jsx');
  });
});
