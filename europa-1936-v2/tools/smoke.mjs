// Automatická kontrola hry v prohlížeči (Playwright): menu → výběr země → hra, klik na provincii, běh času, režimy, nabídka, výkon snímku
// a armáda (žetony, výběr a rozkazy, panel Armáda, válka, plán fronty, šest dní hry, mapa zásobování, nábor, návrhář šablon, řetěz Esc).
// Spuštění:  npm run dev  (nebo npm run build && npm run preview)  a pak  node tools/smoke.mjs [šířka výška]
//   URL=http://localhost:4173 node tools/smoke.mjs 1366 768
// Potřebuje balíček playwright (npm i -D playwright && npx playwright install chromium). Snímky: tools/preview/smoke-*.png.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Chybí balíček playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools/preview');
fs.mkdirSync(OUT, { recursive: true });
const W = Number(process.argv[2] || 1920), H = Number(process.argv[3] || 1080);
const BASE = process.env.URL || 'http://localhost:5173';
const MAX_FRAME_MS = Number(process.env.MAX_FRAME_MS || 60);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'CHYBA'} ${name}${extra ? ` – ${extra}` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const shot = (n) => page.screenshot({ path: path.join(OUT, `smoke-${n}-${W}.png`) });

try {
  await page.goto(`${BASE}/?debug=1`, { timeout: 15000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  check('hlavní menu se zobrazí', (await page.locator('h1').innerText()).toLowerCase().includes('evropa'));
  await page.waitForTimeout(1500);
  await shot('menu');

  await page.getByRole('button', { name: 'Nová hra' }).click();
  await page.waitForSelector('.select-list li button');
  const countries = await page.locator('.select-list li button').count();
  check('výběr země nabízí země', countries >= 30, `${countries}`);
  await page.getByRole('button', { name: /Německo/ }).first().click();
  await page.waitForTimeout(1200);
  check('karta země ukazuje vůdce', (await page.locator('.country-card').innerText()).includes('Adolf Hitler'));
  await shot('select');

  await page.getByRole('button', { name: 'Začít hru' }).click();
  await page.waitForSelector('.topbar');
  await page.waitForTimeout(1800);
  const top = await page.locator('.topbar').innerText();
  check('horní lišta: země a datum', top.includes('Německo') && top.includes('1. ledna 1936'));
  await shot('game');

  await page.mouse.click(Math.round(W * 0.5), Math.round(H * 0.55));
  await page.waitForSelector('.dossier h2', { timeout: 3000 });
  check('klik na provincii otevře panel', (await page.locator('.dossier h2').innerText()).length > 0);
  await shot('dossier');

  // zvýraznění pod myší: po posunu kamery bez pohybu myši se přepočítá a při tažení mapy se ruší
  const hx = Math.round(W * 0.42), hy = Math.round(H * 0.55);
  await page.mouse.move(hx, hy);
  await page.waitForTimeout(150);
  const hov = await page.evaluate(([x, y]) => {
    const e = window.__e1936, m = e.map;
    const before = e.uiStore.getState().hover;
    for (let i = 0; i < 6 && m.pick(x, y) === before; i++) m.pan(260, 0);
    return { before, expected: m.pick(x, y) };
  }, [hx, hy]);
  await page.waitForTimeout(200);
  const hoverNow = await page.evaluate(() => window.__e1936.uiStore.getState().hover);
  check('zvýraznění sleduje posun kamery pod nehybnou myší', hov.before > 0 && hov.expected !== hov.before && hoverNow === hov.expected, `před ${hov.before}, po ${hoverNow}`);
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 80, hy + 20, { steps: 6 });
  const hoverDrag = await page.evaluate(() => window.__e1936.uiStore.getState().hover);
  await page.mouse.up();
  check('tažení mapy ruší zvýraznění', hoverDrag === 0, `${hoverDrag}`);

  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  check('čas běží', !(await page.locator('.topbar').innerText()).includes('1. ledna 1936'));
  await page.keyboard.press('Space');

  for (const [key, mode] of [['2', 'Terén'], ['5', 'Obyvatelé'], ['6', 'Vítězné body'], ['1', 'Politická']]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
    const on = await page.locator('.rail-item > button.on').getAttribute('aria-label');
    check(`režim ${key} = ${mode}`, on === mode, on);
    if (key === '2') await shot('terrain');
  }

  // výkon: posun kamery přes mapu při průběžném kreslení (s vynuceným dokončením snímku)
  const perf = await page.evaluate(() => {
    const m = window.__e1936.map; const r = m.renderer;
    const flush = () => r.ctx.getImageData(0, 0, 1, 1);
    m.cam.zoom = 1; m.cam.x = 900; m.cam.y = 900;
    let guard = 0; do { r.draw(m.cam, m.dpr); } while (r.pending && guard++ < 300);
    const t = []; for (let i = 0; i < 40; i++) { m.cam.x += 14; const t0 = performance.now(); r.draw(m.cam, m.dpr); flush(); t.push(performance.now() - t0); }
    t.sort((a, b) => a - b);
    return { median: t[20], worst: t[39] };
  });
  check('snímek při posunu', perf.median <= MAX_FRAME_MS, `medián ${perf.median.toFixed(1)} ms, nejhorší ${perf.worst.toFixed(1)} ms (limit ${MAX_FRAME_MS})`);

  await page.keyboard.press('Escape');
  check('Esc zavře panel', (await page.locator('.dossier').count()) === 0);

  // ------------------------------------------------------------------------------------------------ armáda (M18)
  const E = (fn, arg) => page.evaluate(fn, arg);
  const ui = () => E(() => { const u = window.__e1936.uiStore.getState(); return { panel: u.panel, selDivs: u.selDivs, planEdit: !!u.planEdit, designer: !!u.designer, armyFocus: u.armyFocus, selected: u.selected }; });
  /** Souřadnice stránky bodu uvnitř provincie `p` nejblíž těžišti, ověřeno přes pick a mimo žetony (ty by klik zachytily). */
  const provinceXY = (p) => E((p) => {
    const m = window.__e1936.map, g = window.__e1936.engine.geo(m.world);
    const rc = m.canvas.getBoundingClientRect();
    const hits = m.renderer.units.hits;
    const covered = (x, y) => hits.some((h) => x >= h.x0 - 3 && x <= h.x1 + 3 && y >= h.y0 - 3 && y <= h.y1 + 3);
    const cx = (g.cx[p] - m.cam.x) * m.cam.zoom + m.cam.w / 2, cy = (g.cy[p] - m.cam.y) * m.cam.zoom + m.cam.h / 2;
    for (let r = 0; r <= 160; r += 4) {
      for (let a = 0; a < (r ? 16 : 1); a++) {
        const x = cx + r * Math.cos(a * Math.PI / 8), y = cy + r * Math.sin(a * Math.PI / 8);
        if (x > 8 && y > 8 && x < m.cam.w - 400 && y < m.cam.h - 8 && m.pick(x, y) === p && !covered(x, y)) return { x: rc.left + x, y: rc.top + y };
      }
    }
    return null;
  }, p);
  /** Střed vlastního žetonu nejblíž středu obrazovky. */
  const ownCounterXY = () => E(() => {
    const m = window.__e1936.map, me = m.world.ownerIdx.GER, rc = m.canvas.getBoundingClientRect();
    const own = m.renderer.units.hits.filter((h) => h.c.o === me);
    const d = (h) => Math.hypot((h.x0 + h.x1) / 2 - m.cam.w / 2, (h.y0 + h.y1) / 2 - m.cam.h / 2);
    own.sort((a, b) => d(a) - d(b));
    const h = own[0];
    return h ? { x: rc.left + (h.x0 + h.x1) / 2, y: rc.top + (h.y0 + h.y1) / 2 - 6, n: h.c.ids.length } : null;
  });

  // vlastní jednotky na mapě u polské hranice
  const pair = await E(() => {
    const { engine, map } = window.__e1936;
    const w = engine.getWorld(), g = engine.geo(w);
    const ger = w.ownerIdx.GER, pol = w.ownerIdx.POL;
    let found = null;
    for (let p = 1; p <= w.L && !found; p++) {
      if (w.provOwner0[p] !== ger) continue;
      w.forLandNeighbors(p, (q, kind) => { if (!found && kind === 0 && w.provOwner0[q] === pol) found = [p, q]; });
    }
    map.flyTo({ x: (g.cx[found[0]] + g.cx[found[1]]) / 2, y: (g.cy[found[0]] + g.cy[found[1]]) / 2, zoom: 2.4 }, 0);
    return found;
  });
  await page.waitForTimeout(800);
  const cnt = await E(() => {
    const u = window.__e1936.map.renderer.units, me = window.__e1936.map.world.ownerIdx.GER;
    return { all: u.counters.length, own: u.hits.filter((h) => h.c.o === me).length, foreign: u.hits.filter((h) => h.c.o !== me).length, ms: window.__e1936.map.renderer.stats.unitsMs };
  });
  check('na mapě jsou žetony jednotek (vlastní i cizí)', cnt.all > 100 && cnt.own > 0, `${cnt.all} žetonů, na obrazovce ${cnt.own} vlastních a ${cnt.foreign} cizích`);
  await shot('units');

  const own1 = await ownCounterXY();
  await page.mouse.move(own1.x, own1.y);
  await page.waitForTimeout(250);
  check('žeton pod kurzorem ukáže bublinu s divizí', (await page.locator('.tooltip').innerText().catch(() => '')).includes('Síla'));
  await page.mouse.click(own1.x, own1.y);
  await page.waitForSelector('.selbar', { timeout: 3000 });
  const st1 = await ui();
  check('klik na vlastní žeton vybere divize a ukáže dolní lištu', st1.selDivs.length > 0 && (await page.locator('.selbar').innerText()).includes('Organizace'), `${st1.selDivs.length} divizí`);
  await shot('selected');

  // pravé tlačítko: pochod do sousední vlastní provincie
  const order = await E(() => {
    const { engine, gameStore, uiStore } = window.__e1936;
    const s = gameStore.getState(), w = engine.getWorld(), me = w.ownerIdx.GER;
    const d = s.mil.divs[uiStore.getState().selDivs[0]];
    let target = 0;
    w.forLandNeighbors(d.p, (q, kind) => { if (!target && kind === 0 && s.ctrl[q] === me) target = q; });
    return { from: d.p, target };
  });
  const tgt = await provinceXY(order.target);
  await page.mouse.click(tgt.x, tgt.y, { button: 'right' });
  await page.waitForTimeout(250);
  const moved = await E(() => { const { gameStore, uiStore } = window.__e1936; const s = gameStore.getState(); return uiStore.getState().selDivs.filter((id) => s.mil.divs[id].path.length > 0).length; });
  check('pravé tlačítko pošle vybrané divize na pochod', moved > 0, `${moved} divizí na cestě`);
  await page.waitForTimeout(250);
  await shot('order');

  // nová armáda z výběru otevře panel Armáda
  await page.getByRole('button', { name: 'Nová armáda' }).click();
  await page.waitForSelector('.army-panel', { timeout: 3000 });
  const arm1 = await E(() => { const { gameStore, uiStore } = window.__e1936; const s = gameStore.getState(); const u = uiStore.getState(); const a = s.mil.armies[u.armyFocus]; return { panel: u.panel, id: u.armyFocus, name: a && a.nm, members: s.mil.divs.filter((d) => d && d.army === u.armyFocus).length }; });
  check('„Nová armáda“ vytvoří armádu a otevře panel Armáda', arm1.panel === 'army' && arm1.id > 0 && arm1.members > 0, `${arm1.name}, ${arm1.members} divizí`);
  check('panel Armáda ukazuje strom s armádou a jejími divizemi', (await page.locator('.army-panel .node.army').count()) >= 1 && (await page.locator('.army-panel .row.div').count()) >= 1);
  await shot('army-panel');
  await page.keyboard.press('v');
  await page.waitForTimeout(250);
  const closedV = (await ui()).panel === null;
  await page.keyboard.press('v');
  await page.waitForTimeout(250);
  check('klávesa V přepíná panel Armáda', closedV && (await ui()).panel === 'army');
  await page.keyboard.press('v');

  // válka: vyhlášení přes kartu oblasti
  const pol = await provinceXY(pair[1]);
  await page.mouse.click(pol.x, pol.y);
  await page.getByRole('button', { name: 'Vyhlásit válku' }).click();
  await page.getByRole('button', { name: 'Ano, vyhlásit válku' }).click();
  await page.waitForTimeout(300);
  const wars = await E(() => window.__e1936.gameStore.getState().mil.wars.length);
  check('vyhlášení války z karty oblasti', wars === 1, `${wars} válka`);
  await shot('war');

  // plán fronty: Linie fronty → Použít aktuální frontu → Potvrdit
  await page.keyboard.press('v');
  await page.waitForSelector('.army-panel');
  await page.getByRole('button', { name: 'Linie fronty' }).first().click();
  await page.waitForSelector('.planbar', { timeout: 3000 });
  await page.getByRole('button', { name: 'Použít aktuální frontu' }).click();
  const pe = await E(() => { const p = window.__e1936.uiStore.getState().planEdit; return p ? { line: p.line.length, to: p.to.length } : null; });
  check('plán fronty: návrh podle skutečné fronty doplní linii i cíle', !!pe && pe.line > 0 && pe.to > 0, pe ? `${pe.line} provincií v linii, ${pe.to} cílů` : 'bez úpravy');
  await shot('plan');
  await page.getByRole('button', { name: 'Potvrdit plán' }).click();
  await page.waitForTimeout(250);
  const planTxt = await page.locator('.army-panel .plan-line').first().innerText().catch(() => '');
  check('potvrzený plán je vidět v panelu armády', /Linie fronty/.test(planTxt), planTxt);

  // šest dnů hry s plánem: nic nespadne, divize armády se pohnou
  const sim = await E(() => {
    const { engine, gameStore, uiStore } = window.__e1936;
    let s = gameStore.getState();
    const army = uiStore.getState().armyFocus;
    const members = () => s.mil.divs.map((d, id) => (d && d.army === army ? [id, d.p] : null)).filter(Boolean);
    const before = members();
    const t0 = s.tick;
    for (let i = 0; i < 24 * 6; i++) s = engine.advanceHour(s);
    gameStore.setState(s);
    const after = members();
    return { hours: s.tick - t0, moved: before.filter(([id, p]) => { const a = after.find((x) => x[0] === id); return a && a[1] !== p; }).length, battles: s.mil.battles.length, total: before.length };
  });
  await page.waitForTimeout(600);
  check('šest herních dnů s plánem fronty: armáda postupuje nebo bojuje', sim.hours === 144 && sim.moved + sim.battles > 0, `${sim.moved} z ${sim.total} divizí se přesunulo, bitev ${sim.battles}`);
  await shot('after-6-days');

  // mapový režim Zásobování (klávesa 7)
  await page.keyboard.press('7');
  await page.waitForTimeout(500);
  check('režim 7 = Zásobování', (await page.locator('.rail-item > button.on').getAttribute('aria-label')) === 'Zásobování');
  await shot('supply');
  await page.keyboard.press('1');

  // nábor a návrhář šablon
  await page.keyboard.press('n');
  await page.waitForSelector('.tpl-card', { timeout: 3000 });
  const q0 = await E(() => window.__e1936.gameStore.getState().mil.queue.length);
  await page.locator('.tpl-card').first().getByRole('button', { name: 'Zařadit' }).click();
  await page.waitForTimeout(250);
  const q1 = await E(() => window.__e1936.gameStore.getState().mil.queue.length);
  check('nábor: „Zařadit“ přidá divizi do výcviku', q1 === q0 + 1, `fronta ${q0} → ${q1}`);
  await shot('recruit');
  const tplBefore = await page.locator('.tpl-card').count();
  await page.getByRole('button', { name: 'Nová šablona' }).click();
  await page.waitForSelector('.designer', { timeout: 3000 });
  await page.locator('.dz-pick', { hasText: 'Lehký tankový' }).click();
  await page.locator('.dz-grid .dz-col').nth(3).locator('.dz-cell').first().click();
  await page.locator('.dz-name').fill('Zkušební divize');
  await shot('designer');
  await page.getByRole('button', { name: 'Uložit šablonu' }).click();
  await page.waitForTimeout(300);
  const tplAfter = await page.locator('.tpl-card').count();
  check('návrhář šablon: nová šablona se uloží a objeví v seznamu', (await page.locator('.designer').count()) === 0 && tplAfter === tplBefore + 1, `${tplBefore} → ${tplAfter}`);

  // výkon vrstvy žetonů (čas příkazů v jednom snímku)
  const unitsMs = await E(() => {
    const m = window.__e1936.map, r = m.renderer;
    m.cam.zoom = 1; m.cam.x = 1000; m.cam.y = 900;
    let guard = 0; do { r.draw(m.cam, m.dpr); } while (r.pending && guard++ < 300);
    const t = []; for (let i = 0; i < 30; i++) { r.draw(m.cam, m.dpr); t.push(r.stats.unitsMs); }
    t.sort((a, b) => a - b);
    return { median: t[15], shown: r.units.stats.shown, counters: r.units.stats.counters };
  });
  check('vrstva žetonů: čas kreslení', unitsMs.median <= 12, `${unitsMs.median.toFixed(1)} ms, zobrazeno ${unitsMs.shown} z ${unitsMs.counters} žetonů (limit 12)`);

  // řetěz Esc: úprava plánu → panel → výběr → herní menu
  await page.keyboard.press('v');
  await page.waitForSelector('.army-panel');
  await page.getByRole('button', { name: 'Hájit oblast' }).first().click();
  await page.waitForSelector('.planbar');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const e1 = await ui();
  check('Esc 1: zruší úpravu plánu, panel zůstane', !e1.planEdit && e1.panel === 'army');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc 2: zavře boční panel', (await ui()).panel === null);
  await E((p) => { const { engine, map } = window.__e1936; const g = engine.geo(map.world); map.flyTo({ x: g.cx[p], y: g.cy[p], zoom: 2.4 }, 0); }, pair[0]);
  await page.waitForTimeout(700);
  const own2 = await ownCounterXY();
  await page.mouse.click(own2.x, own2.y);
  await page.waitForSelector('.selbar');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc 3: zruší výběr jednotek', (await ui()).selDivs.length === 0 && (await page.locator('.selbar').count()) === 0);

  await page.keyboard.press('Escape');
  await page.waitForSelector('.dialog');
  await page.getByRole('button', { name: 'Hlavní menu' }).click();
  await page.getByRole('button', { name: 'Odejít do menu' }).click();
  await page.waitForSelector('.menu');
  check('zpět do hlavního menu', (await page.locator('.menu').count()) === 1);
} catch (e) {
  check('kontrola doběhla', false, e.message);
}

check('bez chyb v konzoli', problems.length === 0, problems.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} z ${results.length} kontrol selhalo` : `\nVše v pořádku (${results.length} kontrol, ${W}×${H})`);
process.exit(failed ? 1 : 0);
