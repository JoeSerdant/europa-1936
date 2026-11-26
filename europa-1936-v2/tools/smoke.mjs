// Automatická kontrola hry v prohlížeči (Playwright): menu → výběr země → hra, klik na provincii, běh času, režimy, nabídka, výkon snímku
// a armáda (žetony, výběr a rozkazy, panel Armáda, válka, plán fronty, šest dní hry, mapa zásobování, nábor, návrhář šablon, řetěz Esc)
// a průmysl (panel Průmysl, stavba, linky, obchod, režim mapy 8, tři dny hry) a výzkum (panel Výzkum, sloty, obory, 80 dní) a politika (panel Politika, zákony, poradci, horní lišta) a národní cíle a události (panel Cíle, dialog události) a diplomacie (ospravedlnění a vyhlášení války s bloky, panel Diplomacie) a AI zemí (volba obtížnosti při startu) a zprávy a přehled zemí (panel Zprávy, okno Přehled) a námořnictvo (panel Námořnictvo, žetony flotil, sestavení flotily).
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
  check('hlavní menu se zobrazí', (await page.locator('h1').innerText()).toLowerCase().includes('dark times'));
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

  // AI zemí (M24): výchozí běžná obtížnost s historickými plány, volba těžké a návrat
  check('výběr země nabízí pět stupňů obtížnosti (výchozí Běžná) a historické plány', (await page.locator('.ai-opts .sbtn').count()) === 5 && (await page.getByRole('button', { name: 'Běžná', exact: true }).getAttribute('aria-pressed')) === 'true' && (await page.getByLabel('Historické plány').isChecked()));
  await page.getByRole('button', { name: 'Těžká', exact: true }).click();
  check('výběr země nabízí dva scénáře', (await page.locator('.scn-opts .sbtn').count()) === 2);
  await page.getByRole('button', { name: 'Začít hru' }).click();
  await page.waitForSelector('.topbar');
  await page.waitForTimeout(1800);
  const top = await page.locator('.topbar').innerText();
  check('hra začíná s AI zemí na těžké obtížnosti', (await page.evaluate(() => window.__e1936.gameStore.getState().ai)).diff === 1);
  check('horní lišta: země (jméno nebo na úzké obrazovce jen vlajka) a datum', (top.includes('Německo') || (await page.locator('.topbar .tb-flag').count()) === 1) && top.includes('1. ledna 1936'));
  await shot('game');
  // UI jako v HOI4: národní cíl a výzkum u vlajky, přehled vpravo s armádami
  check('horní lišta má národní cíl a výzkumné sloty', (await page.locator('.tb-focus').count()) === 1 && (await page.locator('.tb-slots i').count()) >= 2);
  check('přehled vpravo má oddíly cíl, výzkum a armády', (await page.locator('.outliner .ol-sec').count()) >= 3 && (await page.locator('.outliner .ol-sec[aria-label="Armády"] .ol-item').count()) >= 1);

  // W1: klik na německou provincii bez divizí, která je vidět (střed obrazovky může na mapě světa trefit žeton nebo moře)
  const freeXY = await page.evaluate(() => {
    const { engine, gameStore, map } = window.__e1936;
    const w = engine.getWorld(), s = gameStore.getState(), ger = w.ownerIdx.GER;
    const busy = new Set(s.mil.divs.filter(Boolean).map((d) => d.p));
    const cam = map.cam;
    let best = null;
    for (let p = 1; p <= w.L; p++) {
      if (w.provOwner0[p] !== ger || busy.has(p)) continue;
      const [x, y] = w.land[p].c;
      const sx = (x - cam.x) * cam.zoom + cam.w / 2, sy = (y - cam.y) * cam.zoom + cam.h / 2;
      if (sx < cam.w * 0.3 || sx > cam.w * 0.7 || sy < cam.h * 0.3 || sy > cam.h * 0.75) continue;
      const d = Math.hypot(sx - cam.w / 2, sy - cam.h * 0.55);
      if (!best || d < best.d) best = { d, sx, sy };
    }
    const r = document.querySelector('.map-host canvas, canvas').getBoundingClientRect();
    return best ? [r.left + best.sx, r.top + best.sy] : null;
  });
  await page.mouse.click(Math.round(freeXY ? freeXY[0] : W * 0.5), Math.round(freeXY ? freeXY[1] : H * 0.55));
  await page.waitForSelector('.dossier h2', { timeout: 3000 });
  check('klik na provincii otevře panel', (await page.locator('.dossier h2').innerText()).length > 0);
  check('karta státu ukazuje sloty budov a vlastnosti jako ikony', (await page.locator('.dossier .st-slot').count()) >= 2 && (await page.locator('.dossier .st-chips > span').count()) >= 5);
  await shot('dossier');
  check('karta vlastní provincie nabízí stavbu pevnosti', (await page.locator('.prov-fort').count()) === 1);

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
  check('průvodce ukazuje úkol', (await page.locator('.tutorial').count()) === 1 && /průvodce \d+\/\d+/i.test(await page.locator('.tutorial').innerText()));
  check('čas běží', !(await page.locator('.topbar').innerText()).includes('1. ledna 1936'));
  await page.keyboard.press('Space');

  for (const [key, mode] of [['2', 'Terén'], ['5', 'Obyvatelé'], ['6', 'Vítězné body'], ['1', 'Politická']]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
    const on = await page.locator('.mm').getAttribute('data-mode');
    check(`režim ${key} = ${mode}`, on === mode, on);
    if (key === '2') await shot('terrain');
  }
  check('mapové režimy jsou řada 12 tlačítek s ikonami (HOI4)', (await page.locator('.mm .mm-btn').count()) === 12 && (await page.locator('.mm .mm-btn.on').count()) === 1);
  await shot('mapmodes');
  await page.locator('.mm .mm-btn[aria-label="Státy"]').click();
  check('klik na ikonu přepne režim', (await page.locator('.mm').getAttribute('data-mode')) === 'Státy');
  await page.locator('.mm .mm-btn[aria-label="Počasí"]').click();
  await page.waitForTimeout(400);
  check('mapový režim Počasí', (await page.locator('.mm').getAttribute('data-mode')) === 'Počasí');
  await shot('weather');
  await page.keyboard.press('1');

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
  // události hráče (M22) pozastaví hru a blokují klávesy: po každém skoku v čase je vyřídíme první volbou
  const clearNews = async () => { for (let i = 0; i < 8 && (await page.locator('.news-paper').count()); i++) { await page.locator('.news-paper footer .btn').click(); await page.waitForTimeout(120); } };   // M101
  const clearEvents = async () => { await clearNews(); for (let i = 0; i < 6 && (await page.locator('.event-dialog').count()); i++) { await page.locator('.event-dialog .ev-opt').first().click(); await page.waitForTimeout(150); } await clearNews(); };
  const ui = () => E(() => { const u = window.__e1936.uiStore.getState(); return { panel: u.panel, selDivs: u.selDivs, planEdit: !!u.planEdit, designer: !!u.designer, armyFocus: u.armyFocus, selected: u.selected, fleetSel: u.fleetSel }; });
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
  check('na mapě jsou žetony jednotek (vlastní i cizí u hranic; ostatní skrývá mlha války)', cnt.all > 30 && cnt.all < 200 && cnt.own > 0 && cnt.foreign > 0, `${cnt.all} žetonů, na obrazovce ${cnt.own} vlastních a ${cnt.foreign} cizích`);
  await shot('units');

  const own1 = await ownCounterXY();
  await page.mouse.move(own1.x, own1.y);
  await page.waitForTimeout(250);
  check('žeton pod kurzorem ukáže bublinu s divizí', (await page.locator('.tooltip').innerText().catch(() => '')).includes('Síla'));
  await page.mouse.click(own1.x, own1.y);
  await page.waitForSelector('.selbar', { timeout: 3000 });
  const st1 = await ui();
  check('klik na vlastní žeton vybere divize a ukáže dolní lištu', st1.selDivs.length > 0 && (await page.locator('.selbar .sel-meters .bar').count()) === 2, `${st1.selDivs.length} divizí`);
  // M102: lišta armád dole – karty s portrétem, proužky a rozkazy vybrané armády jen ikonami
  check('lišta armád ukazuje karty armád s portrétem a proužky', (await page.locator('.armybar .acard .portrait').count()) >= 1 && (await page.locator('.armybar .acard .bar').count()) >= 2);
  await shot('selected');
  // F4c: tlačítko Přesun po železnici v liště výběru zapne režim jednoho rozkazu
  await page.locator('.selbar .ib[aria-label="Přesun po železnici"]').click();
  check('tlačítko přesunu po železnici zapne režim', (await page.evaluate(() => window.__e1936.uiStore.getState().railMode)) === true);
  await page.locator('.selbar .ib[aria-label="Přesun po železnici"]').click();
  check('druhý klik režim vypne', (await page.evaluate(() => window.__e1936.uiStore.getState().railMode)) === false);

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
  // od M23: válku je třeba nejdřív ospravedlnit (politická moc + 30 dní), potom vyhlásit; zapojí se bloky
  const justBtn = page.getByRole('button', { name: /Ospravedlnit: Podmanění/ });
  check('karta země nabízí ospravedlnění války (bez politické moci zamčené)', (await justBtn.count()) === 1 && (await justBtn.isDisabled()));
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const own = s.pol.own.slice(); own[o] = { ...own[o], pp: 200 }; gameStore.setState({ ...s, pol: { ...s.pol, own } }); });
  await page.waitForTimeout(900);
  await justBtn.click();
  await page.waitForTimeout(250);
  await E(() => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.advance(gameStore.getState(), 24 * 31)); });
  await clearEvents();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Vyhlásit válku' }).click();
  await page.getByRole('button', { name: 'Ano, vyhlásit válku' }).click();
  await page.waitForTimeout(300);
  const wars = await E(() => window.__e1936.gameStore.getState().mil.wars.length);
  check('vyhlášení války z karty oblasti po ospravedlnění (zapojí se bloky)', wars >= 1, `${wars} válek`);
  // M101: válka hráče ohlásí velký pruh a noviny (hra stojí, dokud je hráč nezavře)
  await page.waitForTimeout(300);
  check('válka: velký pruh a noviny ze světa s ilustrací', (await page.locator('.banner').count()) === 1 && (await page.locator('.news-paper .scene').count()) === 1);
  await shot('war');
  await clearNews();
  check('noviny se zavřou', (await page.locator('.news-paper').count()) === 0);

  // plán fronty: Linie fronty → Použít aktuální frontu → Potvrdit
  await page.keyboard.press('v');
  await page.waitForSelector('.army-panel');
  await page.getByRole('button', { name: 'Linie fronty' }).first().click();
  await page.waitForSelector('.planbar', { timeout: 3000 });
  await page.getByRole('button', { name: 'Použít aktuální frontu' }).click();
  const pe = await E(() => { const p = window.__e1936.uiStore.getState().planEdit; return p ? { line: p.line.length, to: p.to.length } : null; });
  check('plán fronty: návrh podle skutečné fronty doplní linii i cíle', !!pe && pe.line > 0 && pe.to > 0, pe ? `${pe.line} provincií v linii, ${pe.to} cílů` : 'bez úpravy');
  await shot('plan');
  // F4c: ústupová linie – nástroj v liště plánu, klik na vlastní provincii v týlu
  await page.getByRole('button', { name: /Ústupová linie/ }).click();
  await E(() => { const { uiStore, gameStore, engine } = window.__e1936; const u = uiStore.getState(); const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const w = engine.getWorld(); const p = w.owners[o].cap; uiStore.setState({ ...u, planEdit: { ...u.planEdit, fb: [p] } }); void s; });
  await page.waitForTimeout(150);
  check('lišta plánu má nástroj Ústupová linie', (await page.locator('.planbar button', { hasText: 'Ústupová linie' }).count()) === 1);
  await page.getByRole('button', { name: 'Potvrdit plán' }).click();
  await page.waitForTimeout(250);
  const planTxt = await page.locator('.army-panel .plan-line').first().innerText().catch(() => '');
  check('potvrzený plán je vidět v panelu armády', /Linie fronty/.test(planTxt), planTxt);
  const fbOk = await E(() => { const s = window.__e1936.gameStore.getState(); return s.mil.armies.some((a) => a && a.plan && a.plan.fb && a.plan.fb.length); });
  check('potvrzený plán si nese ústupovou linii', fbOk);

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
  await clearEvents();

  // mapový režim Zásobování (klávesa 7)
  await page.keyboard.press('7');
  await page.waitForTimeout(500);
  check('režim 7 = Zásobování', (await page.locator('.mm').getAttribute('data-mode')) === 'Zásobování');
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
  await page.waitForTimeout(700);   // okno Nábor se překresluje nejvýš dvakrát za sekundu
  check('nábor: šablony se složením z praporů, výzbroj ikonami, výcvik jako karty', (await page.locator('.tpl-card .tpl-comp .tc-bat').count()) >= 5 && (await page.locator('.tpl-card .eq-chip').count()) >= 5 && (await page.locator('.q-cards .q-card').count()) >= 1 && (await page.locator('.recruit-panel .stk-tile').count()) >= 3, `komp ${await page.locator('.tpl-card .tpl-comp .tc-bat').count()} chip ${await page.locator('.tpl-card .eq-chip').count()} q ${await page.locator('.q-cards .q-card').count()} stk ${await page.locator('.recruit-panel .stk-tile').count()}`);
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

  // válka je splněna: mír s protivníky (AI zemí by jinak za dlouhé skoky v čase hráče porazily), pak dlouhé skoky v čase.
  // Od M88 velmoci a členové válčících bloků bílý mír neuzavírají, proto nízkoúrovňový `makePeace` (jen pro zkoušku).
  const peace = await E(() => {
    const { gameStore, engine } = window.__e1936;
    const w = engine.getWorld(), GER = w.ownerIdx.GER;
    let s = gameStore.getState();
    for (const [a, b] of s.mil.wars.slice()) { const e = a === GER ? b : b === GER ? a : 0; if (e) s = engine.makePeace(s, 'GER', w.owners[e].tag); }
    gameStore.setState(s);
    return s.mil.wars.filter(([a, b]) => a === GER || b === GER).length;
  });
  check('bílý mír s protivníky po zkoušce války', peace === 0, `zbývá válek hráče: ${peace}`);
  // průmysl (M19): panel Průmysl (I), stavba, linky výroby, obchod, režim mapy 8, tři dny hry
  await page.keyboard.press('t');
  await page.waitForSelector('.build-panel', { timeout: 3000 });
  // M103: stavby jako v HOI4 – úzký panel vlevo, mapa zůstává vidět; budova se zvolí a staví se klikem na stát na mapě
  check('klávesa T otevře panel Stavby vlevo (mapa zůstane vidět) s volbou budov', (await ui()).panel === 'industry' && (await page.locator('.build-panel .bp-tile').count()) === 12 && (await page.locator('.industry-panel').count()) === 0);
  const nb = () => E(() => { const g = window.__e1936.gameStore.getState(); return g.ind.build.filter((b) => b.o === window.__e1936.engine.getWorld().ownerIdx.GER).length; });
  const b0 = await nb();
  await page.locator('.build-panel').getByRole('radio', { name: 'Civilní továrna' }).click();
  await page.waitForTimeout(200);
  check('volba budovy přepne mapu do režimu Stavby', (await E(() => window.__e1936.uiStore.getState().mode)) === 'build:civ');
  const spots = await E(() => {
    const { engine, gameStore } = window.__e1936; const s = gameStore.getState(), w = engine.getWorld(), me = w.ownerIdx.GER, out = [];
    for (let st = 1; st < w.states.length; st++) if (s.stateOwner[st] === me && engine.buildRoom(s, st, 'civ', me).n > 0) for (const p of w.states[st].v) if (s.ctrl[p] === me) out.push(p);
    return out.slice(0, 40);
  });
  let xy = null;
  for (const p of spots) {
    await E((q) => window.__e1936.map.flyToLabel(q, 0), p);
    await page.waitForTimeout(250);
    xy = await provinceXY(p);
    if (xy) break;
  }
  await page.mouse.click(xy.x, xy.y);
  await page.waitForTimeout(250);
  const b1 = await nb();
  await page.locator('.bp-best button').first().click();
  await page.waitForTimeout(700);   // seznam fronty se obnovuje se zpožděním (useGameSlow)
  const b2 = await nb();
  check('klik na stát na mapě i na doporučené místo zadá stavbu do fronty', b1 === b0 + 1 && b2 === b1 + 1 && (await page.locator('.bp-queue li.bq-card').count()) === b2, `fronta ${b0} → ${b1} → ${b2}`);
  check('fronta staveb: karty s ikonou, továrnami a postupem', (await page.locator('.bq-card .bq-ic').count()) === b2 && (await page.locator('.bq-card .bq-fac i.on').count()) >= 1 && (await page.locator('.bq-card .bq-prog').count()) === b2);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc ukončí stavění a vrátí mapový režim', (await E(() => window.__e1936.uiStore.getState().buildKind)) === null && (await E(() => window.__e1936.uiStore.getState().mode)) !== 'build:civ');
  await shot('industry-build');
  await page.getByRole('tab', { name: 'Výroba' }).click();
  await page.waitForSelector('.ind-line', { timeout: 3000 });
  const sum = await page.locator('.ind-sum').innerText();
  check('záložka Výroba otevře okno Průmysl se souhrnem továren', /Civilní/.test(sum) && /Vojenské/.test(sum), sum.replace(/\s+/g, ' '));
  const nLines = await page.locator('.ind-line').count();
  const fac0 = await E(() => window.__e1936.gameStore.getState().ind.lines.filter((l) => l.o === window.__e1936.engine.getWorld().ownerIdx.GER).reduce((a, l) => a + l.fac, 0));
  // M104: počet továren se nastaví klikem do řady továren (plné = na lince); kreslené ikony výzbroje
  const line0 = page.locator('.ind-line').first();
  const lf = Number(await line0.locator('.pl-fac b').innerText());
  await line0.locator('.fac-slots i').nth(lf - 2).click();
  await page.waitForTimeout(800);   // okno Průmysl se překresluje nejvýš dvakrát za sekundu
  const facSum = () => E(() => window.__e1936.gameStore.getState().ind.lines.filter((l) => l.o === window.__e1936.engine.getWorld().ownerIdx.GER).reduce((a, l) => a + l.fac, 0));
  const fac1 = await facSum();
  check('výroba: linky s kreslenými ikonami; klik do řady továren jednu uvolní', nLines >= 3 && fac1 === fac0 - 1 && (await page.locator('.ind-line .eq-icon').count()) === nLines && (await page.locator('.fac-pool .fp-drag b').innerText()) === '1', `${nLines} linek, továren ${fac0} → ${fac1}`);
  await page.locator('.fac-pool .fp-drag').dragTo(line0);
  await page.waitForTimeout(800);
  check('továrna ze zásobníku přetažená na linku se přidá', (await facSum()) === fac0, `${await facSum()}`);
  {
    const l0 = page.locator('.ind-line').first();
    await l0.locator('.pl-pick').click();
    const nOpt = await l0.locator('.pl-opts .pn-tile').count();
    check('výroba: druh na lince se vybírá dlaždicemi (žádný rozbalovací seznam), suroviny a sklad ikonami', nOpt >= 2 && (await page.locator('.industry-panel select').count()) === 0 && (await page.locator('.stk-tile .eq-icon').count()) >= 3, `${nOpt} voleb`);
    await shot('industry-prod');
    await l0.locator('.pl-pick').click();
  }
  await page.getByRole('tab', { name: 'Obchod' }).click();
  await page.waitForSelector('.res-grid', { timeout: 3000 });
  check('obchod: šest karet surovin, trh a smlouvy', (await page.locator('.res-card').count()) === 6 && (await page.locator('.ind-trades li').count()) >= 1);
  {
    const before = await page.locator('.ind-trades li').count();
    await page.locator('.res-card').nth(2).click();
    await page.waitForTimeout(200);
    const buy = page.locator('.mk-buy:not([disabled])').first();
    if (await buy.count()) { await buy.click(); await page.waitForTimeout(300); }
    check('obchod: klik na trhu uzavře smlouvu', (await page.locator('.mk-card').count()) === 0 || (await page.locator('.ind-trades li').count()) > before);
  }
  await shot('industry-trade');
  await page.keyboard.press('Escape');   // M103: panel Stavby by překryl mapové režimy vlevo dole
  await page.keyboard.press('8');
  await page.waitForTimeout(500);
  check('režim 8 = Průmysl s vysvětlivkami', (await page.locator('.mm').getAttribute('data-mode')) === 'Průmysl' && (await page.locator('.legend').innerText()).includes('továren'));
  await shot('industry-map');
  await page.keyboard.press('1');
  const ind3 = await E(() => {
    const { gameStore, engine } = window.__e1936;
    const s0 = gameStore.getState();
    const GER = engine.getWorld().ownerIdx.GER;
    const s1 = engine.advance(s0, 72);
    gameStore.setState(s1);
    const mine = s1.ind.lines.filter((l) => l.o === GER);
    return { prog: s1.ind.build.filter((b) => b.o === GER).reduce((a, b) => a + b.prog, 0), made: mine.reduce((a, l) => a + l.out, 0), eff: mine.every((l, i) => l.eff > s0.ind.lines.find((x) => x.id === l.id).eff) };
  });
  check('tři herní dny: stavba postoupila, linky vyrábějí a jejich efektivita roste', ind3.prog > 0 && ind3.made > 0 && ind3.eff, `body staveb ${Math.round(ind3.prog)}, kusů za poslední den ${ind3.made}`);
  await clearEvents();
  await page.keyboard.press('t');
  await page.waitForTimeout(150);

  // hlavní lišta nabídek a Logistika (M29)
  check('lišta nabídek má 17 tlačítek', (await page.locator('.menubar button').count()) === 17);
  await page.keyboard.press('i');
  await page.waitForSelector('.logistics-panel', { timeout: 3000 });
  check('klávesa I otevře Logistiku s dlaždicemi výzbroje po skupinách a surovinami', (await ui()).panel === 'logistics' && (await page.locator('.lg-tile').count()) >= 4 && (await page.locator('.lg-group').count()) >= 2 && (await page.locator('.lg-res-tile').count()) === 6);
  await shot('logistics');
  await page.keyboard.press('g');
  await page.waitForSelector('.spy-panel .ind-new', { timeout: 3000 });
  await page.getByRole('button', { name: 'Zahájit operaci' }).click();
  await page.waitForTimeout(1000);
  check('klávesa G otevře zpravodajství a operace se zahájí', (await ui()).panel === 'spy' && (await page.locator('.spy-op').count()) === 1);
  await shot('spy');
  await page.keyboard.press('g');
  await page.keyboard.press('j');
  await page.waitForSelector('.decisions-panel .dec-card', { timeout: 3000 });
  const ppBefore = await E(() => window.__e1936.gameStore.getState().pol.own[window.__e1936.engine.getWorld().ownerIdx.GER].pp);
  check('klávesa J otevře Rozhodnutí se záložkami kategorií a kartami', (await ui()).panel === 'decisions' && (await page.locator('.dec-tabs [role=tab]').count()) >= 6 && (await page.locator('.dec-card').count()) >= 4);
  await page.locator('.dec-tabs [role=tab]', { hasText: 'Diplomacie' }).click();
  await page.waitForTimeout(200);
  check('záložka Diplomacie ukáže diplomatické mise (W6)', (await page.locator('.dec-card', { hasText: 'Diplomatická mise' }).count()) >= 5);
  await page.locator('.dec-tabs [role=tab]').first().click();
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(), o = engine.getWorld().ownerIdx.GER; gameStore.setState({ ...s, pol: { ...s.pol, own: s.pol.own.map((x, i) => (i === o ? { ...x, pp: 400 } : x)) } }); });
  await page.waitForTimeout(1000);
  await page.locator('.dec-card.ready .sbtn').first().click();
  await page.waitForTimeout(500);
  const ppAfter = await E(() => window.__e1936.gameStore.getState().pol.own[window.__e1936.engine.getWorld().ownerIdx.GER].pp);
  check('použití rozhodnutí zaplatí politickou moc', ppAfter < 400 && ppBefore >= 0, `${ppBefore} → 400 → ${ppAfter}`);
  await shot('decisions');
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await page.waitForSelector('.doctrine-panel .doc-cols', { timeout: 3000 });
  check('klávesa K otevře doktríny: 3 záložky větví, 3 směry po 3 stupních (UI3)', (await ui()).panel === 'doctrine' && (await page.locator('.doc-tabs [role="tab"]').count()) === 3 && (await page.locator('.doc-track').count()) === 3 && (await page.locator('.doc-level').count()) === 9);
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); gameStore.setState(engine.addXp(s, engine.getWorld().ownerIdx.GER, 'land', 100)); });
  await page.waitForTimeout(1000);
  await page.locator('.doc-level.available .sbtn').first().click();
  await page.waitForTimeout(1000);
  check('přijetí doktríny: stupeň je přijat a směr větve zamčen', (await page.locator('.doc-level.done').count()) === 1 && (await page.locator('.doc-track.excluded').count()) >= 2);
  await shot('doctrine');
  await page.keyboard.press('k');
  // M97: Konstrukční kancelář – návrh lehkého tanku
  await page.keyboard.press('b');
  await page.waitForSelector('.design-panel .ds-slot select', { timeout: 3000 });
  check('klávesa B otevře Konstrukční kancelář s typy a sloty', (await ui()).panel === 'design' && (await page.locator('.ds-type').count()) === 3 && (await page.locator('.ds-slot select').count()) === 4);
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); gameStore.setState(engine.addXp(s, engine.getWorld().ownerIdx.GER, 'land', 60)); });
  await page.waitForTimeout(800);
  await page.locator('.ds-slot select').first().selectOption('tk_kan_l');
  await page.getByRole('button', { name: /Zavést návrh/ }).click();
  await page.waitForTimeout(800);
  check('„Zavést návrh“ uloží návrh lehkého tanku', await E(() => { const s = window.__e1936.gameStore.getState(); const lv = s.mil.lv[window.__e1936.engine.getWorld().ownerIdx.GER]; return !!(lv && lv.des && lv.des.ltanky && lv.des.ltanky.mods.zbran === 'tk_kan_l'); }));
  await shot('design');
  await page.keyboard.press('b');
  await page.keyboard.press('a');
  await page.waitForSelector('.air-panel .air-wing', { timeout: 3000 });
  check('klávesa A otevře Letectvo s křídly a letišti', (await ui()).panel === 'air' && (await page.locator('.air-wing').count()) >= 3 && (await page.locator('.air-bases li').count()) >= 1);
  const wingsAll = await page.locator('.air-wing').count();
  await page.locator('.af-tile').first().click();
  const wingsOne = await page.locator('.air-wing').count();
  check('filtr typů letadel zúží seznam křídel a druhý klik ho vrátí', wingsOne >= 1 && wingsOne < wingsAll && (await page.locator('.af-tile').first().click(), (await page.locator('.air-wing').count()) === wingsAll), `${wingsOne}/${wingsAll}`);
  const wingBit = page.locator('.air-wing', { hasText: 'Bitevní letoun' }).first();
  await wingBit.getByRole('button', { name: 'Podpora boje' }).click();
  await page.waitForTimeout(1000);
  check('mise „Podpora boje“ se zadá ikonou (cíle se nabídnou jako dlaždice)', (await E(() => window.__e1936.gameStore.getState().air.wings.some((w) => w && w.m === 'cas' && w.o === window.__e1936.engine.getWorld().ownerIdx.GER))) && (await wingBit.locator('.tg-chip').count()) >= 1);
  await shot('air');
  await page.locator('.air-panel .icon-btn.close').click();
  await page.waitForTimeout(300);
  const airMap = await E(() => { const u = window.__e1936.map.renderer.units; return { lines: u.air.lines.length, bases: u.air.bases.length }; });
  check('mapa ukazuje letecké mise a letiště hráče', airMap.lines >= 1 && airMap.bases >= 1, JSON.stringify(airMap));
  await shot('air-map');
  await page.locator('.menubar button[aria-label="Výroba"]').click();
  await page.waitForSelector('.ind-line', { timeout: 3000 });
  check('tlačítko Výroba v liště otevře okno Průmysl na záložce Výroba', (await ui()).panel === 'industry' && (await page.locator('.industry-panel .ind-tabs button.on').innerText()) === 'Výroba');
  await page.keyboard.press('y');
  await page.waitForTimeout(150);
  const pp0 = await E(() => Math.floor(window.__e1936.gameStore.getState().pol.own[window.__e1936.engine.getWorld().ownerIdx.GER].pp));
  await page.keyboard.press('`');
  await page.waitForSelector('.console .con-in', { timeout: 3000 });
  await page.locator('.con-in').fill('pp 500');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const pp1 = await E(() => Math.floor(window.__e1936.gameStore.getState().pol.own[window.__e1936.engine.getWorld().ownerIdx.GER].pp));
  check('konzole: příkaz „pp 500“ přidá politickou moc', pp1 === pp0 + 500 && /Politická moc/.test(await page.locator('.con-out').innerText()), `${pp0} → ${pp1}`);
  await shot('console');
  await page.keyboard.press('Escape');
  check('Esc zavře konzoli', (await page.locator('.console').count()) === 0);

  // výzkum (M20): panel Výzkum (R), zadání technologie, obory, běh času
  await page.keyboard.press('w');
  await page.waitForSelector('.research-panel', { timeout: 3000 });
  check('klávesa R otevře panel Výzkum se sloty', (await ui()).panel === 'research' && (await page.locator('.rs-slot').count()) === 3 && (await page.locator('.tech-card').count()) >= 30);
  await page.locator('.tech-card.available').first().getByRole('button', { name: 'Zkoumat' }).click();
  await page.waitForSelector('.rs-slot:not(.empty)', { timeout: 3000 });
  check('„Zkoumat“ obsadí slot výzkumu', (await page.locator('.rs-slot:not(.empty)').count()) === 1 && (await page.locator('.tech-card.active').count()) === 1);
  await page.getByRole('tab', { name: 'Tanky a motorizace' }).click();
  await page.waitForTimeout(200);
  const tankCards = await page.locator('.tech-card').count();
  check('obor Tanky a motorizace filtruje seznam a ukazuje zamčené technologie', tankCards >= 10 && tankCards < 30 && (await page.locator('.tech-card.locked').count()) >= 5, `${tankCards} karet`);
  await shot('research');
  await page.getByRole('tab', { name: 'Vše' }).click();
  const tech3 = await E(() => {
    const { gameStore, engine } = window.__e1936;
    const s0 = gameStore.getState();
    const GER = engine.getWorld().ownerIdx.GER;
    const s1 = engine.advance(s0, 24 * 80);
    gameStore.setState(s1);
    return { done: Object.keys(s1.tech.own[GER].done), ai: Object.keys(s1.tech.own[engine.getWorld().ownerIdx.FRA].done).length, lv: s1.mil.lv[GER] };
  });
  check('80 dní: zadaná technologie je hotová, AI země také zkoumají', tech3.done.length >= 1 && tech3.ai >= 1, `hotovo ${tech3.done.join(', ')}, FRA ${tech3.ai}`);
  await clearEvents();
  await page.waitForTimeout(700);
  check('hotové technologie jsou v seznamu označené', (await page.locator('.tech-card.done').count()) >= 1);
  await page.keyboard.press('w');
  await page.waitForTimeout(150);

  // politika (M21): panel Politika (P), zákony, poradci, horní lišta
  const topPol = await page.locator('.topbar').innerText();
  check('horní lišta ukazuje stabilitu, podporu války a politickou moc', (await page.locator('.stat[aria-label="Stabilita"]').count()) === 1 && (await page.locator('.stat[aria-label="Politická moc"]').count()) === 1, topPol.replace(/\s+/g, ' ').slice(-80));
  await page.locator('.stat[aria-label="Stabilita"]').hover();
  await page.waitForTimeout(150);
  check('UI2: najetí na stabilitu ukáže rozpis (základ, zdroje, dopady)', (await page.locator('.stat-tip dl div').count()) >= 2 && /Základ/.test(await page.locator('.stat-tip').innerText()));
  await page.mouse.move(5, 600);
  await page.keyboard.press('p');
  await page.waitForSelector('.politics-panel', { timeout: 3000 });
  check('klávesa P otevře panel Politika se zákony a poradci', (await ui()).panel === 'politics' && (await page.locator('.pol-law').count()) === 3 && (await page.locator('.pol-adv:not(.hc)').count()) === 4);
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const own = s.pol.own.slice(); own[o] = { ...own[o], pp: 400, ws: 0.9 }; gameStore.setState({ ...s, pol: { ...s.pol, own } }); });
  await page.waitForTimeout(900);
  // UI jako v HOI4: zákon a poradce jsou sloty – klik otevře volby jako dlaždice
  await page.locator('.pol-law').first().locator('.pol-slot').click();
  await page.waitForTimeout(150);
  check('klik na slot zákona otevře volby jako dlaždice', (await page.locator('.pol-law.open .pol-opt-tile').count()) >= 3);
  await shot('politics-top');
  await page.locator('.pol-law').first().getByRole('button', { name: /Raná mobilizace/ }).click();
  await page.locator('.pol-adv:not(.hc)').nth(3).locator('.pol-slot-main').click();
  await page.waitForTimeout(150);
  await page.locator('.pol-adv:not(.hc)').nth(3).getByRole('button', { name: /Akademik/ }).click();
  await page.waitForTimeout(250);
  const pol1 = await E(() => { const { gameStore, engine } = window.__e1936; const e = gameStore.getState().pol.own[engine.getWorld().ownerIdx.GER]; return { eco: e.laws.eco, sci: e.adv.sci, pp: e.pp }; });
  check('zákon a poradce se zadají a zaplatí politickou mocí', pol1.eco === 'early' && pol1.sci === 'akademik' && pol1.pp < 400, `${pol1.eco}, ${pol1.sci}, zbývá ${pol1.pp}`);
  // F4: vrchní velení – tři karty náčelníků štábů, najmutí klikem na dlaždici
  check('vůdce má koláč stran a duchy jako ikony', (await page.locator('.pol-pie path').count()) >= 2 && (await page.locator('.lc-spirits li .icon').count()) >= 1);
  check('politika má tři sloty vojenského štábu (UI4)', (await page.locator('.pol-adv.hc').count()) === 3);
  await page.locator('.pol-adv.hc').first().locator('.pol-slot-main').click();
  await page.waitForTimeout(200);
  check('klik na slot štábu otevře náčelníky jako dlaždice', (await page.locator('.pol-adv.hc.open .pol-opt-tile').count()) >= 3);
  await page.locator('.pol-adv.hc').first().getByRole('button', { name: /Teoretik obrněných sil/ }).click();
  await page.waitForTimeout(250);
  const hc1 = await E(() => { const { gameStore, engine } = window.__e1936; return gameStore.getState().pol.own[engine.getWorld().ownerIdx.GER].adv.army; });
  check('náčelník generálního štábu se najme klikem na dlaždici', hc1 === 'nac_tanky', String(hc1));
  await shot('politics');
  await page.keyboard.press('p');
  await page.waitForTimeout(150);

  // národní cíle a události (M22): panel Cíle (C), zahájení cíle, událost hráče s dialogem
  await page.keyboard.press('c');
  await page.waitForSelector('.nat-panel', { timeout: 3000 });
  check('klávesa C otevře panel Cíle se stromem cílů', (await ui()).panel === 'nat' && (await page.locator('.focus-card').count()) >= 8 && (await page.locator('.focus-card.available').count()) >= 1);
  check('UI1: strom cílů má hledání, filtr druhů a značky vylučujících se cílů', (await page.locator('.ft-search input').count()) === 1 && (await page.locator('.ft-cats .icon-btn').count()) >= 6 && (await page.locator('.focus-links .fx-excl').count()) >= 1);
  await page.locator('.focus-card.available').first().hover();
  check('UI1: najetí na cíl ukáže okno s účinky', (await page.locator('.focus-info').count()) === 1);
  await page.locator('button.focus-card.available').first().click();
  await page.waitForSelector('.nat-panel .rs-slot:not(.empty)', { timeout: 3000 });
  check('klik na dostupný cíl spustí jeho plnění', (await page.locator('.focus-card.active').count()) === 1);
  await shot('nat');
  // M103: přiblížení stromu cílů – oddálit tlačítkem i kolečkem, celý strom
  await page.getByRole('button', { name: 'Oddálit' }).click();
  const z1 = await page.locator('.fz-v').innerText();
  const box = await page.locator('.focus-scroll').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  const z2 = await page.locator('.fz-v').innerText();
  await page.getByRole('button', { name: 'Celý strom' }).click();
  await page.waitForTimeout(150);
  check('strom cílů jde oddálit tlačítkem, kolečkem i na celý strom', z1 === '80 %' && parseInt(z2, 10) < 80 && (await page.locator('.focus-tree.far').count()) === 1, `${z1} → ${z2} → ${await page.locator('.fz-v').innerText()}`);
  await shot('nat-zoom');
  await page.getByRole('button', { name: 'Přiblížit' }).click();
  await E(() => { const { gameStore, engine } = window.__e1936; const s = engine.applyFx(gameStore.getState(), engine.getWorld().ownerIdx.GER, [{ t: 'event', id: 'harvest', days: 1 }]); gameStore.setState(engine.advance({ ...s, paused: false }, 48)); });
  await page.waitForSelector('.event-dialog', { timeout: 3000 });
  check('událost hráče otevře dialog a pozastaví hru', (await page.locator('.event-dialog .ev-opt').count()) >= 1 && (await E(() => window.__e1936.gameStore.getState().paused)));
  await shot('event');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('dialog události se nedá zavřít klávesou Esc', (await page.locator('.event-dialog').count()) === 1);
  await page.locator('.event-dialog .ev-opt').first().click();
  await page.waitForTimeout(250);
  check('volba události dialog zavře', (await page.locator('.event-dialog').count()) === 0);
  await page.keyboard.press('c');
  await page.waitForTimeout(150);

  // vyskakovací oznámení (M58): karta se zobrazí a zavře klikem
  await E(() => { window.__e1936.uiStore.setState({ ...window.__e1936.uiStore.getState(), popups: [{ id: 9001, kind: 'focus', icon: 'flag', tone: 'good', title: 'Národní cíl splněn', text: 'Zkouška', lines: ['1× civilní továrna', 'výroba +3 %'], sticky: true }] }); });
  await page.waitForSelector('.popup', { timeout: 3000 });
  check('vyskakovací karta ukáže název, text a účinky', /národní cíl/i.test(await page.locator('.popup h4').innerText()) && (await page.locator('.popup li').count()) === 2);
  await shot('popup');
  await page.locator('.popup').click();
  await page.waitForTimeout(150);
  check('klik na kartu ji zavře', (await page.locator('.popup').count()) === 0);
  // okno bitvy (M61): otevře se podle id, neexistující bitva se ohlásí a Esc ho zavře
  await E(() => { window.__e1936.uiStore.setState({ ...window.__e1936.uiStore.getState(), battle: 99999 }); });
  await page.waitForSelector('.battle-dialog', { timeout: 3000 });
  check('okno bitvy ohlásí skončenou bitvu', /skončila/i.test(await page.locator('.battle-dialog').innerText()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc zavře okno bitvy', (await page.locator('.battle-dialog').count()) === 0);
  // diplomacie (M23): panel Diplomacie (D), seznam zemí, rozbalení řádku, blok
  await page.keyboard.press('d');
  await page.waitForSelector('.dip-panel', { timeout: 3000 });
  check('klávesa D otevře panel Diplomacie s kartami zemí', (await ui()).panel === 'dip' && (await page.locator('.dip-card').count()) >= 30);
  await E(() => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.declareWar(gameStore.getState(), 'GER', 'SWE')); });
  await page.waitForTimeout(900);
  check('země ve válce jsou v mřížce první a označené', (await page.locator('.dip-card.war').count()) >= 1 && (await page.locator('.dip-grid .dip-card').first().getAttribute('class')).includes('war'));
  await page.locator('.dip-card').nth(3).click();
  await page.waitForTimeout(250);
  check('klik na kartu vysune detail země s ukazatelem vztahu a dlaždicemi akcí', (await page.locator('.dip-side.open .dip-detail .rel-gauge').count()) >= 1 && (await page.locator('.dip-detail .dip-act').count()) >= 3 && (await page.locator('.dip-side.open').isVisible()));
  await page.getByRole('button', { name: 'Válka', exact: true }).click();
  await page.waitForTimeout(200);
  check('filtr Válka ukáže jen země ve válce', (await page.locator('.dip-card').count()) >= 1 && (await page.locator('.dip-card:not(.war)').count()) === 0);
  await page.getByRole('button', { name: 'Vše', exact: true }).click();
  await shot('diplomacy');
  await E(() => { const { gameStore, engine } = window.__e1936; const w = engine.getWorld(); gameStore.setState(engine.proposePeace(gameStore.getState(), w.ownerIdx.GER, w.ownerIdx.SWE)); });
  // F4: vojenská pomoc a licence – válka SSSR–Finsko, Německo posílá dobrovolníky a kupuje licenci na pušky
  await E(() => {
    const { gameStore, engine } = window.__e1936; const w = engine.getWorld(), G = w.ownerIdx.GER, F = w.ownerIdx.FIN;
    let s = engine.makePeace(gameStore.getState(), 'GER', 'SWE');
    s = engine.declareWar(s, 'SOV', 'FIN');
    const own = s.pol.own.slice(); own[G] = { ...own[G], ws: 0.9, pp: 300 };
    const lv = s.mil.lv.slice(); lv[F] = { ...(lv[F] || {}), pusky: 4 };
    const k = G < F ? `${G}-${F}` : `${F}-${G}`;
    gameStore.setState({ ...s, pol: { ...s.pol, own }, mil: { ...s.mil, lv }, dip: { ...s.dip, rel: { ...s.dip.rel, [k]: 80 } } });
  });
  await page.waitForTimeout(900);
  await page.locator('.dip-search').fill('Finsko');
  await page.waitForTimeout(200);
  await page.locator('.dip-card').first().click();
  await page.waitForTimeout(300);
  check('detail válčící země nabízí dobrovolníky, atašé a licence', (await page.locator('.dip-detail .dip-act', { hasText: 'Dobrovolníci' }).count()) === 1 && (await page.locator('.dip-detail .dip-act', { hasText: 'Vojenský atašé' }).count()) === 1 && (await page.locator('.dip-lic-tile').count()) >= 1);
  await page.locator('.dip-detail .dip-act', { hasText: 'Dobrovolníci' }).click();
  await page.locator('.dip-lic-tile').first().click();
  await page.waitForTimeout(300);
  const vol1 = await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(), w = engine.getWorld(); return { n: s.mil.divs.filter((d) => d && d.vo === w.ownerIdx.GER && d.o === w.ownerIdx.FIN).length, lv: s.mil.lv[w.ownerIdx.GER].pusky }; });
  check('klik pošle divizi jako dobrovolníky a koupí licenci', vol1.n === 1 && vol1.lv === 4, JSON.stringify(vol1));
  await shot('diplomacy-aid');
  await E(() => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.volDay(engine.makePeace(gameStore.getState(), 'SOV', 'FIN'))); });
  await page.locator('.dip-search').fill('');
  await page.locator('.dip-search').evaluate((e) => e.blur());   // klávesa D jinak skončí ve vyhledávání
  await page.keyboard.press('d');
  await page.waitForTimeout(150);

  // upozornění (M49): na začátku hry je aspoň jedno (volný výzkumný slot) a klik otevře příslušné okno
  check('vedle lišty nabídek jsou upozornění s tooltipem', (await page.locator('.alerts .alert').count()) >= 1 && (await page.locator('.alerts .alert-tip').first().innerText()).length > 5);
  await page.locator('.alerts .alert').first().click();
  check('klik na upozornění otevře okno a skryje upozornění', (await E(() => window.__e1936.uiStore.getState().panel)) != null && (await page.locator('.alerts').count()) === 0);
  await page.keyboard.press('Escape');
  // zprávy a přehled zemí (M26): panel Zprávy (L), okno Přehled zemí (O)
  await page.keyboard.press('l');
  await page.waitForSelector('.log-panel', { timeout: 3000 });
  check('klávesa L otevře panel Zprávy se záznamy', (await ui()).panel === 'log' && (await page.locator('.log-row').count()) >= 3);
  await page.mouse.move(400, 400);   // nápověda upozornění (myš nad ikonou) by v malém okně zakryla záložky
  await page.waitForTimeout(150);
  await page.getByRole('tab', { name: 'Moje' }).click();
  await page.waitForTimeout(150);
  const mineRows = await page.locator('.log-row').count();
  await page.getByRole('tab', { name: 'Světové' }).click();
  await page.waitForTimeout(150);
  check('filtry zpráv: moje i světové záznamy se liší od celku', mineRows >= 1 && (await page.locator('.log-row').count()) >= 1);
  await shot('log');
  await page.keyboard.press('l');
  await page.keyboard.press('o');
  await page.waitForSelector('.overview-dialog', { timeout: 3000 });
  check('klávesa O otevře Přehled zemí s řádkem hráče', (await page.locator('.ov-table tbody tr').count()) >= 30 && (await page.locator('.ov-table tr.me').count()) === 1);
  await shot('overview');
  await page.locator('.ov-tabs .tab', { hasText: 'Grafy' }).click();
  await page.waitForSelector('.ov-charts', { timeout: 3000 });
  check('záložka Grafy v Přehledu ukáže přepínač ukazatelů a legendu', (await page.locator('.ov-metrics button').count()) === 4 && (await page.locator('.ov-legend li').count()) >= 6);
  await shot('overview-charts');
  await page.locator('.ov-tabs .tab', { hasText: 'Pořadí' }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc zavře Přehled zemí', (await page.locator('.overview-dialog').count()) === 0);
  await page.keyboard.press('o');
  await page.locator('.ov-table tbody tr').nth(2).click();
  await page.waitForTimeout(400);
  check('klik na zemi v přehledu zavře okno a označí hlavní město', (await page.locator('.overview-dialog').count()) === 0 && (await E(() => window.__e1936.uiStore.getState().selected)) > 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  // námořnictvo (M27): panel Námořnictvo (M), žetony flotil na mapě, sestavení flotily
  const fleetTokens = await E(() => { const r = window.__e1936.map.renderer; return r.units.fleetTokens.length; });
  check('na mapě jsou žetony flotil v dohledu (mlha války skrývá vzdálené)', fleetTokens >= 1 && fleetTokens < 10, `${fleetTokens} žetonů`);
  const noFog = await E(() => { const e = window.__e1936; e.gameStore.setState({ ...e.gameStore.getState(), rules: { fog: 0 } }); return true; });
  await page.waitForTimeout(500);
  const allTokens = await E(() => { const r = window.__e1936.map.renderer; return { fleets: r.units.fleetTokens.length, divs: r.units.counters.length }; });
  check('bez mlhy války jsou vidět všechny flotily a divize', noFog && allTokens.fleets >= 10 && allTokens.divs > 100, `${allTokens.fleets} flotil, ${allTokens.divs} žetonů divizí`);
  await E(() => { const e = window.__e1936; e.gameStore.setState({ ...e.gameStore.getState(), rules: { fog: 1 } }); });
  await page.waitForTimeout(300);
  await page.keyboard.press('m');
  await page.waitForSelector('.navy-panel', { timeout: 3000 });
  check('klávesa M otevře panel Námořnictvo s hlavní flotilou', (await ui()).panel === 'navy' && (await page.locator('.fleet-card').count()) >= 1 && /Transporty/.test(await page.locator('.navy-panel .rs-sum').innerText()));
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const pool = s.nav.pool.slice(); pool[o] = { ...pool[o], dd: 4 }; gameStore.setState({ ...s, nav: { ...s.nav, pool } }); });
  await page.waitForSelector('.fl-form', { timeout: 3000 });
  const nFleets0 = await page.locator('.fleet-card').count();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Přidat: Torpédoborec' }).click();
  check('sestavení flotily: klik přesune lodě z rezervy do nové flotily', (await page.locator('.fl-tray .fl-picked').count()) === 1 && /\(3\)/.test(await page.getByRole('button', { name: /Sestavit flotilu/ }).innerText()));
  await page.getByRole('button', { name: /Sestavit flotilu/ }).click();
  await page.waitForFunction(() => window.__e1936.uiStore.getState().fleetSel > 0, null, { timeout: 3000 });
  await page.waitForTimeout(700);
  check('sestavení flotily z rezervy přidá flotilu a vybere ji', (await page.locator('.fleet-card').count()) === nFleets0 + 1 && (await ui()).fleetSel > 0);
  await E(() => { const { map, engine, gameStore } = window.__e1936; const s = gameStore.getState(); const f = s.nav.fleets[window.__e1936.uiStore.getState().fleetSel]; const c = map.world.sea[f.p - map.world.L].c; map.flyTo({ x: c[0], y: c[1], zoom: 2.2 }, 0); });
  await page.waitForTimeout(700);
  await shot('navy');
  const fleetMs = await E(() => { const m = window.__e1936.map, r = m.renderer; const t = []; for (let i = 0; i < 30; i++) { r.draw(m.cam, m.dpr); t.push(r.stats.unitsMs); } t.sort((a, b) => a - b); return t[15]; });
  check('vrstva jednotek s flotilami: čas kreslení', fleetMs <= 12, `${fleetMs.toFixed(1)} ms`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc zruší výběr flotily', (await ui()).fleetSel === 0);
  await page.keyboard.press('m');
  await page.waitForTimeout(150);

  // výkon vrstvy žetonů (čas příkazů v jednom snímku)
  const unitsMs = await E(() => {
    const m = window.__e1936.map, r = m.renderer;
    const c0 = r.units.counters[0] || { x: 5100, y: 1950 };   // ZM1: zblízka nad žetony (v dálce se skrývají, měření by bylo prázdné)
    m.cam.zoom = 2; m.cam.x = c0.x; m.cam.y = c0.y;
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

  // uložené hry (M25): rychlé uložení F6, dialog z nabídky, načtení z hlavního menu
  const tickSaved = await E(() => window.__e1936.gameStore.getState().tick);
  await page.keyboard.press('F6');
  await page.waitForTimeout(700);
  // F2: sloty jsou v IndexedDB, komprimované gzipem
  const quick = await E(() => new Promise((res) => {
    const rq = indexedDB.open('e1936');
    rq.onerror = () => res(null);
    rq.onsuccess = () => { const g = rq.result.transaction('meta').objectStore('meta').get('quick'); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); };
  }));
  check('F6 uloží hru do rychlého slotu (IndexedDB, komprimovaně)', !!quick && quick.zip > 0 && quick.zip < quick.size / 4, quick ? `${Math.round(quick.zip / 1024)} kB z ${Math.round(quick.size / 1024)} kB` : 'nic');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.dialog');
  await page.getByRole('button', { name: 'Uložit hru' }).click();
  await page.waitForSelector('.save-dialog');
  await page.getByRole('button', { name: 'Uložit do slotu Slot 1' }).click();
  await page.waitForTimeout(700);
  check('dialog uložení: slot 1 se obsadí a ohlásí uložení', (await page.locator('.sv-msg').innerText()).includes('uložena') && (await page.locator('.sv-list li.full').count()) >= 2);
  await shot('save');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc zavře dialog uložených her', (await page.locator('.save-dialog').count()) === 0);
  // UI jako v HOI4: klik na armádu v přehledu vpravo vybere její divize (posune kameru – proto až na konci)
  await page.evaluate(() => { const u = window.__e1936.uiStore; u.setState({ ...u.getState(), selected: 0, panel: null }); });
  await page.waitForTimeout(400);
  if ((await page.locator('.outliner .ol-sec[aria-label="Armády"] .ol-item').count()) > 0) {
    await page.locator('.outliner .ol-sec[aria-label="Armády"] .ol-item').first().click();
    await page.waitForTimeout(700);
    check('klik na armádu v přehledu vybere její divize', (await page.evaluate(() => window.__e1936.uiStore.getState().selDivs.length)) >= 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  } else check('přehled vpravo je vidět i na konci hry', false);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.dialog');
  check('nabídka má přepínač zvuku a průvodce, stránka vlastní kurzory', (await page.getByRole('button', { name: /Zvuk:/ }).count()) === 1 && (await page.getByRole('button', { name: /Průvodce:/ }).count()) === 1 && /url\(/.test(await page.evaluate(() => getComputedStyle(document.body).cursor)));
  {   // F2 C1–C2: hlasitost efektů a noviny ze světa jdou zapnout v nabídce
    const nb = page.getByRole('button', { name: /Noviny ze světa:/ });
    const before = await nb.innerText();
    await nb.click(); await page.waitForTimeout(100);
    const after = await nb.innerText();
    await nb.click(); await page.waitForTimeout(100);
    check('nabídka: posuvník hlasitosti a přepínač novin', (await page.getByRole('slider', { name: 'Hlasitost efektů' }).count()) === 1 && before !== after && (await nb.innerText()) === before);
  }
  {   // F3: interval automatického ukládání a okno Nastavení upozornění
    const ab = page.getByRole('button', { name: /Automatické ukládání:/ });
    const a0 = await ab.innerText();
    await ab.click(); await page.waitForTimeout(100);
    const a1 = await ab.innerText();
    for (let i = 0; i < 3; i++) { await ab.click(); await page.waitForTimeout(60); }   // dokola zpět na původní volbu
    check('nabídka: interval automatického ukládání', a0.includes('každý měsíc') && a1.includes('každý rok') && (await ab.innerText()) === a0);
    await page.getByRole('button', { name: /Nastavení upozornění/ }).click();
    await page.waitForSelector('.notify-dialog');
    await shot('notify');
    const rows = await page.locator('.notify-row').count();
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    check('okno Nastavení upozornění: skupiny zpráv a zavření Esc', rows >= 6 && (await page.locator('.notify-dialog').count()) === 0);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.dialog');
  }
  await page.getByRole('button', { name: 'Hlavní menu' }).click();
  await page.getByRole('button', { name: 'Odejít do menu' }).click();
  await page.waitForSelector('.menu');
  check('zpět do hlavního menu', (await page.locator('.menu').count()) === 1);
  await page.getByRole('button', { name: 'Načíst hru' }).click();
  await page.waitForSelector('.save-dialog');
  await page.getByRole('button', { name: 'Načíst Rychlé uložení' }).click();
  await page.waitForSelector('.topbar', { timeout: 5000 });
  const tickLoaded = await E(() => window.__e1936.gameStore.getState().tick);
  const conf0 = await E(() => {
    const { gameStore, engine } = window.__e1936;
    const W2 = engine.getWorld();
    const GER2 = W2.ownerIdx.GER, POL2 = W2.ownerIdx.POL;
    let s = gameStore.getState();
    if (!engine.atWar(s, 'GER', 'POL')) s = engine.declareWar(s, 'GER', 'POL');
    const ctrl = s.ctrl.slice();
    let k = 0;
    for (let st = 1; st < W2.states.length; st++) if (s.stateOwner[st] === POL2 && k++ > 0) for (const p of W2.states[st].v) ctrl[p] = GER2;
    gameStore.setState(engine.capitulate({ ...s, ctrl, ownerVer: s.ownerVer + 1 }, POL2));
    return gameStore.getState().dip.conf.length;
  });
  await page.waitForSelector('.conference', { timeout: 3000 });
  check('po kapitulaci protivníka se otevře mírová konference s dražbou států', conf0 === 1 && (await page.locator('.conference .conf-claims li').count()) > 0 && (await page.locator('.conference .conf-part').count()) >= 1);
  await shot('conference');
  const own0 = await E(() => { const s = window.__e1936.gameStore.getState(), W2 = window.__e1936.engine.getWorld(); return s.stateOwner.filter((o) => o === W2.ownerIdx.GER).length; });
  await page.locator('.conference .conf-claims li:not(.off)').first().getByRole('button', { name: 'Získat' }).click();
  await page.waitForTimeout(200);
  check('„Získat“ převede stát hráči za body', (await E(() => { const s = window.__e1936.gameStore.getState(), W2 = window.__e1936.engine.getWorld(); return s.stateOwner.filter((o) => o === W2.ownerIdx.GER).length; })) === own0 + 1);
  for (let k = 0; k < 10 && (await page.getByRole('button', { name: /^Pas/ }).count()); k++) { await page.getByRole('button', { name: /^Pas/ }).click(); await page.waitForTimeout(150); }
  check('po pasu rozhoduje hráč o zbytku země', (await page.locator('.conference .conf-opts .btn').count()) === 3);
  await page.getByRole('button', { name: /Loutkový stát/ }).click();
  await page.waitForTimeout(300);
  check('volba „Loutkový stát“ udělá z Polska loutku hráče', (await E(() => { const s = window.__e1936.gameStore.getState(), W2 = window.__e1936.engine.getWorld(); return s.dip.sub[W2.ownerIdx.POL] === W2.ownerIdx.GER && s.dip.conf.length === 0; })) && (await page.locator('.conference').count()) === 0);
  await E(() => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.forceEnd(gameStore.getState(), 'time')); });
  await page.waitForSelector('.end-dialog', { timeout: 3000 });
  check('konec hry: dialog s pořadím a skóre', /Konec války/.test(await page.locator('.end-dialog').innerText()) && (await page.locator('.end-stats > div').count()) === 5);
  await shot('end');
  await page.getByRole('button', { name: 'Pokračovat ve hře' }).click();
  await page.waitForTimeout(300);
  check('„Pokračovat ve hře“ zavře dialog a potvrdí konec', (await page.locator('.end-dialog').count()) === 0 && (await E(() => window.__e1936.gameStore.getState().end.ack)) === 1);
  check('načtení z hlavního menu vrátí uloženou hru', tickLoaded === tickSaved && (await page.locator('.save-dialog').count()) === 0, `tick ${tickLoaded}`);
} catch (e) {
  check('kontrola doběhla', false, e.message);
}

check('bez chyb v konzoli', problems.length === 0, problems.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} z ${results.length} kontrol selhalo` : `\nVše v pořádku (${results.length} kontrol, ${W}×${H})`);
process.exit(failed ? 1 : 0);
