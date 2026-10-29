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

  // AI zemí (M24): výchozí běžná obtížnost s historickými plány, volba těžké a návrat
  check('výběr země nabízí obtížnost AI (výchozí Běžná) a historické plány', (await page.getByRole('button', { name: 'Běžná' }).getAttribute('aria-pressed')) === 'true' && (await page.getByLabel('Historické plány').isChecked()));
  await page.getByRole('button', { name: 'Těžká' }).click();
  await page.getByRole('button', { name: 'Začít hru' }).click();
  await page.waitForSelector('.topbar');
  await page.waitForTimeout(1800);
  const top = await page.locator('.topbar').innerText();
  check('hra začíná s AI zemí na těžké obtížnosti', (await page.evaluate(() => window.__e1936.gameStore.getState().ai)).level === 3);
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
    const on = await page.locator('.mm-trigger').getAttribute('data-mode');
    check(`režim ${key} = ${mode}`, on === mode, on);
    if (key === '2') await shot('terrain');
  }
  await page.locator('.mm-trigger').click();
  check('seznam mapových režimů dole má 8 položek s klávesami', (await page.locator('.mm-list li').count()) === 8 && (await page.locator('.mm-list kbd').first().innerText()) === '1');
  await shot('mapmodes');
  await page.locator('.mm-list button', { hasText: 'Státy' }).click();
  check('výběr ze seznamu přepne režim a seznam se zavře', (await page.locator('.mm-trigger').getAttribute('data-mode')) === 'Státy' && (await page.locator('.mm-list').count()) === 0);
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
  const clearEvents = async () => { for (let i = 0; i < 6 && (await page.locator('.event-dialog').count()); i++) { await page.locator('.event-dialog .ev-opt').first().click(); await page.waitForTimeout(150); } };
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
  // od M23: válku je třeba nejdřív ospravedlnit (politická moc + 30 dní), potom vyhlásit; zapojí se bloky
  const justBtn = page.getByRole('button', { name: /Ospravedlnit válku/ });
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
  await clearEvents();

  // mapový režim Zásobování (klávesa 7)
  await page.keyboard.press('7');
  await page.waitForTimeout(500);
  check('režim 7 = Zásobování', (await page.locator('.mm-trigger').getAttribute('data-mode')) === 'Zásobování');
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

  // válka je splněna: bílý mír s protivníky (AI zemí by jinak za dlouhé skoky v čase hráče porazily), pak dlouhé skoky v čase
  const peace = await E(() => {
    const { gameStore, engine } = window.__e1936;
    const GER = engine.getWorld().ownerIdx.GER;
    let s = gameStore.getState();
    for (const [a, b] of s.mil.wars.slice()) { const e = a === GER ? b : b === GER ? a : 0; if (e) s = engine.proposePeace(s, GER, e); }
    gameStore.setState(s);
    return s.mil.wars.filter(([a, b]) => a === GER || b === GER).length;
  });
  check('bílý mír s protivníky po zkoušce války', peace === 0, `zbývá válek hráče: ${peace}`);
  // průmysl (M19): panel Průmysl (I), stavba, linky výroby, obchod, režim mapy 8, tři dny hry
  await page.keyboard.press('t');
  await page.waitForSelector('.industry-panel', { timeout: 3000 });
  const sum = await page.locator('.ind-sum').innerText();
  check('klávesa I otevře panel Průmysl se souhrnem továren', (await ui()).panel === 'industry' && /Civilní/.test(sum) && /Vojenské/.test(sum), sum.replace(/\s+/g, ' '));
  const b0 = await E(() => { const g = window.__e1936.gameStore.getState(); return g.ind.build.filter((b) => b.o === window.__e1936.engine.getWorld().ownerIdx.GER).length; });
  await page.locator('.ind-new').getByRole('button', { name: 'Civilní továrna' }).click();
  await page.waitForSelector('.ind-queue li', { timeout: 3000 });
  const b1 = await E(() => { const g = window.__e1936.gameStore.getState(); return g.ind.build.filter((b) => b.o === window.__e1936.engine.getWorld().ownerIdx.GER).length; });
  check('stavba: „Civilní továrna“ přidá projekt do fronty', b1 === b0 + 1 && (await page.locator('.ind-queue li').count()) === b1, `fronta ${b0} → ${b1}`);
  await shot('industry-build');
  await page.getByRole('tab', { name: 'Výroba' }).click();
  await page.waitForSelector('.ind-line', { timeout: 3000 });
  const nLines = await page.locator('.ind-line').count();
  const fac0 = await E(() => window.__e1936.gameStore.getState().ind.lines.filter((l) => l.o === window.__e1936.engine.getWorld().ownerIdx.GER).reduce((a, l) => a + l.fac, 0));
  await page.locator('.ind-line').first().getByRole('button', { name: 'Ubrat továrnu' }).click();
  await page.waitForTimeout(250);
  const fac1 = await E(() => window.__e1936.gameStore.getState().ind.lines.filter((l) => l.o === window.__e1936.engine.getWorld().ownerIdx.GER).reduce((a, l) => a + l.fac, 0));
  check('výroba: linky jsou vidět a ubrání továrny je uvolní', nLines >= 3 && fac1 === fac0 - 1 && (await page.locator('.ind-note').count()) >= 1, `${nLines} linek, továren ${fac0} → ${fac1}`);
  await shot('industry-prod');
  await page.getByRole('tab', { name: 'Obchod' }).click();
  await page.waitForSelector('.ind-res', { timeout: 3000 });
  check('obchod: tabulka šesti surovin a smlouvy', (await page.locator('.ind-res tbody tr').count()) === 6 && (await page.locator('.ind-trades li').count()) >= 1);
  await shot('industry-trade');
  await page.getByRole('tab', { name: 'Stavby' }).click();
  await page.keyboard.press('8');
  await page.waitForTimeout(500);
  check('režim 8 = Průmysl s vysvětlivkami', (await page.locator('.mm-trigger').getAttribute('data-mode')) === 'Průmysl' && (await page.locator('.legend').innerText()).includes('továren'));
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
  check('lišta nabídek má 13 tlačítek', (await page.locator('.menubar button').count()) === 13);
  await page.keyboard.press('i');
  await page.waitForSelector('.logistics-panel', { timeout: 3000 });
  check('klávesa I otevře Logistiku s tabulkou výzbroje a surovin', (await ui()).panel === 'logistics' && (await page.locator('.lg-table tbody tr').count()) >= 4 && (await page.locator('.lg-res li').count()) === 6);
  await shot('logistics');
  await page.keyboard.press('a');
  await page.waitForSelector('.air-panel .air-wing', { timeout: 3000 });
  check('klávesa A otevře Letectvo s křídly a letišti', (await ui()).panel === 'air' && (await page.locator('.air-wing').count()) >= 3 && (await page.locator('.air-bases li').count()) >= 1);
  const wingBit = page.locator('.air-wing', { hasText: 'Bitevní letoun' }).first();
  await wingBit.getByLabel('Mise').selectOption('cas');
  await page.waitForTimeout(1000);
  check('mise „Podpora boje“ se zadá křídlu (cíl se nabídne)', (await E(() => window.__e1936.gameStore.getState().air.wings.some((w) => w && w.m === 'cas' && w.o === window.__e1936.engine.getWorld().ownerIdx.GER))) && (await wingBit.getByLabel('Cílový stát').count()) === 1);
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
  check('horní lišta ukazuje stabilitu, podporu války a politickou moc', /Stabilita/.test(await page.locator('.stat[title="Stabilita"]').getAttribute('title')) && (await page.locator('.stat[title="Politická moc"]').count()) === 1, topPol.replace(/\s+/g, ' ').slice(-80));
  await page.keyboard.press('p');
  await page.waitForSelector('.politics-panel', { timeout: 3000 });
  check('klávesa P otevře panel Politika se zákony a poradci', (await ui()).panel === 'politics' && (await page.locator('.pol-law').count()) === 3 && (await page.locator('.pol-adv').count()) === 4);
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const own = s.pol.own.slice(); own[o] = { ...own[o], pp: 400, ws: 0.9 }; gameStore.setState({ ...s, pol: { ...s.pol, own } }); });
  await page.waitForTimeout(900);
  await page.locator('.pol-law').first().getByRole('button', { name: /Raná mobilizace/ }).click();
  await page.locator('.pol-adv').nth(3).getByRole('button', { name: /Akademik/ }).click();
  await page.waitForTimeout(250);
  const pol1 = await E(() => { const { gameStore, engine } = window.__e1936; const e = gameStore.getState().pol.own[engine.getWorld().ownerIdx.GER]; return { eco: e.laws.eco, sci: e.adv.sci, pp: e.pp }; });
  check('zákon a poradce se zadají a zaplatí politickou mocí', pol1.eco === 'early' && pol1.sci === 'akademik' && pol1.pp < 400, `${pol1.eco}, ${pol1.sci}, zbývá ${pol1.pp}`);
  await shot('politics');
  await page.keyboard.press('p');
  await page.waitForTimeout(150);

  // národní cíle a události (M22): panel Cíle (C), zahájení cíle, událost hráče s dialogem
  await page.keyboard.press('c');
  await page.waitForSelector('.nat-panel', { timeout: 3000 });
  check('klávesa C otevře panel Cíle se stromem cílů', (await ui()).panel === 'nat' && (await page.locator('.focus-card').count()) >= 8 && (await page.locator('.focus-card.available').count()) >= 1);
  await page.locator('.focus-card.available').first().getByRole('button', { name: 'Zahájit' }).click();
  await page.waitForSelector('.nat-panel .rs-slot:not(.empty)', { timeout: 3000 });
  check('„Zahájit“ spustí plnění cíle', (await page.locator('.focus-card.active').count()) === 1);
  await shot('nat');
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

  // diplomacie (M23): panel Diplomacie (D), seznam zemí, rozbalení řádku, blok
  await page.keyboard.press('d');
  await page.waitForSelector('.dip-panel', { timeout: 3000 });
  check('klávesa D otevře panel Diplomacie se seznamem zemí', (await ui()).panel === 'dip' && (await page.locator('.dip-row').count()) >= 30);
  await E(() => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.declareWar(gameStore.getState(), 'GER', 'SWE')); });
  await page.waitForTimeout(900);
  check('země ve válce jsou v seznamu první a označené', (await page.locator('.dip-row.war').count()) >= 1 && (await page.locator('.dip-list li').first().getAttribute('class')).includes('war'));
  await page.locator('.dip-head').nth(3).click();
  await page.waitForSelector('.dip-body', { timeout: 3000 });
  check('řádek země se rozbalí s akcemi', (await page.locator('.dip-body .sbtn').count()) >= 2);
  await shot('diplomacy');
  await E(() => { const { gameStore, engine } = window.__e1936; const w = engine.getWorld(); gameStore.setState(engine.proposePeace(gameStore.getState(), w.ownerIdx.GER, w.ownerIdx.SWE)); });
  await page.keyboard.press('d');
  await page.waitForTimeout(150);

  // zprávy a přehled zemí (M26): panel Zprávy (L), okno Přehled zemí (O)
  await page.keyboard.press('l');
  await page.waitForSelector('.log-panel', { timeout: 3000 });
  check('klávesa L otevře panel Zprávy se záznamy', (await ui()).panel === 'log' && (await page.locator('.log-row').count()) >= 3);
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
  check('na mapě jsou žetony flotil', fleetTokens >= 10, `${fleetTokens} žetonů`);
  await page.keyboard.press('m');
  await page.waitForSelector('.navy-panel', { timeout: 3000 });
  check('klávesa M otevře panel Námořnictvo s hlavní flotilou', (await ui()).panel === 'navy' && (await page.locator('.fleet-card').count()) >= 1 && /Transporty/.test(await page.locator('.navy-panel .rs-sum').innerText()));
  await E(() => { const { gameStore, engine } = window.__e1936; const s = gameStore.getState(); const o = engine.getWorld().ownerIdx.GER; const pool = s.nav.pool.slice(); pool[o] = { ...pool[o], dd: 4 }; gameStore.setState({ ...s, nav: { ...s.nav, pool } }); });
  await page.waitForSelector('.fl-form', { timeout: 3000 });
  const nFleets0 = await page.locator('.fleet-card').count();
  await page.getByLabel('Počet: Torpédoborec').fill('3');
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

  // uložené hry (M25): rychlé uložení F6, dialog z nabídky, načtení z hlavního menu
  const tickSaved = await E(() => window.__e1936.gameStore.getState().tick);
  await page.keyboard.press('F6');
  await page.waitForTimeout(250);
  check('F6 uloží hru do rychlého slotu', await E(() => !!localStorage.getItem('e1936:save:quick')));
  await page.keyboard.press('Escape');
  await page.waitForSelector('.dialog');
  await page.getByRole('button', { name: 'Uložit hru' }).click();
  await page.waitForSelector('.save-dialog');
  await page.getByRole('button', { name: 'Uložit do slotu Slot 1' }).click();
  await page.waitForTimeout(250);
  check('dialog uložení: slot 1 se obsadí a ohlásí uložení', (await page.locator('.sv-msg').innerText()).includes('uložena') && (await page.locator('.sv-list li.full').count()) >= 2);
  await shot('save');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc zavře dialog uložených her', (await page.locator('.save-dialog').count()) === 0);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.dialog');
  await page.getByRole('button', { name: 'Hlavní menu' }).click();
  await page.getByRole('button', { name: 'Odejít do menu' }).click();
  await page.waitForSelector('.menu');
  check('zpět do hlavního menu', (await page.locator('.menu').count()) === 1);
  await page.getByRole('button', { name: 'Načíst hru' }).click();
  await page.waitForSelector('.save-dialog');
  await page.getByRole('button', { name: 'Načíst Rychlé uložení' }).click();
  await page.waitForSelector('.topbar', { timeout: 5000 });
  const tickLoaded = await E(() => window.__e1936.gameStore.getState().tick);
  check('načtení z hlavního menu vrátí uloženou hru', tickLoaded === tickSaved && (await page.locator('.save-dialog').count()) === 0, `tick ${tickLoaded}`);
} catch (e) {
  check('kontrola doběhla', false, e.message);
}

check('bez chyb v konzoli', problems.length === 0, problems.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} z ${results.length} kontrol selhalo` : `\nVše v pořádku (${results.length} kontrol, ${W}×${H})`);
process.exit(failed ? 1 : 0);
