// Měření plynulosti v prohlížeči (F2 A2): načte válečný stav (snímek ze `sim/out/`, viz `npm run sim -- perf`), nechá běžet čas při rychlosti 3 a 5
// a vypíše herní dny za sekundu a délky snímků (medián, p95, nejdelší, počet nad 50 ms). Potřebuje běžící `npm run dev` (URL, výchozí :5173).
// Použití: SNAP=sim/out/snap-7-2160.json URL=http://localhost:5179/ node tools/perf-browser.mjs [sekund]   (PROF=soubor.cpuprofile uloží profil CPU rychlosti 5)
import { createRequire } from 'node:module';
import fs from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.URL || 'http://localhost:5173/';
const SNAP = process.env.SNAP || 'sim/out/snap-7-2160.json';
const SECS = +(process.argv[2] || 20);
const snap = fs.readFileSync(SNAP, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await page.addInitScript(() => { try { localStorage.setItem('e1936.tutorial', '0'); } catch { /* nic */ } });
await page.goto(`${URL}${URL.includes('?') ? '&' : '?'}debug=1`);
await page.waitForSelector('h1');
await page.getByRole('button', { name: 'Nová hra' }).click();
await page.waitForSelector('.select-list li button');
await page.getByRole('button', { name: /Německo/ }).first().click();
await page.getByRole('button', { name: 'Začít hru' }).click();
await page.waitForSelector('.topbar');
await page.evaluate((text) => {
  const { gameStore, engine } = window.__e1936;
  const g = engine.unpackGame(JSON.parse(text)).state;
  gameStore.setState({ ...g, player: 'GER', paused: true });
}, snap);
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__fr = []; let last = performance.now(); const f = (t) => { window.__fr.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
  // rozpad snímku: kreslení mapy a oznámení změny stavu (React, oznámení) – zbytek je engine a prohlížeč
  const r = window.__e1936.map.renderer, draw = r.draw.bind(r);
  window.__map = []; window.__units = []; r.draw = (...a) => { const t0 = performance.now(); draw(...a); window.__map.push(performance.now() - t0); window.__units.push(r.stats.unitsMs || 0); };
  const gs = window.__e1936.gameStore, set = gs.setState.bind(gs);
  window.__set = []; gs.setState = (x) => { const t0 = performance.now(); set(x); window.__set.push(performance.now() - t0); };
});

async function run(speed) {
  await page.evaluate((sp) => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.setSpeed({ ...gameStore.getState(), paused: false }, sp)); window.__fr = []; window.__map = []; window.__units = []; window.__set = []; window.__e1936.loopMs = []; window.__t0 = gameStore.getState().tick; }, speed);
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    await page.waitForTimeout(400);
    // vyřídit dialogy jako hráč (noviny, události, konference) a pokračovat
    await page.evaluate(() => {
      const { gameStore, engine } = window.__e1936;
      let s = gameStore.getState();
      const me = engine.getWorld().ownerIdx[s.player];
      for (const p of s.nat.pend.filter((x) => x.o === me)) s = engine.chooseEvent(s, me, p.id, 0);
      for (let k = 0; k < 5; k++) { const c = engine.confFor(s, me); if (!c) break; s = engine.confSkip(s, c.id); }
      if (s.end && !s.end.ack) s = engine.ackEnd(s);
      if (s !== gameStore.getState()) gameStore.setState(s);
    });
    if (await page.locator('.news-paper').count()) await page.locator('.news-paper footer .btn').click().catch(() => {});
    await page.evaluate(() => { const { gameStore } = window.__e1936; const s = gameStore.getState(); if (s.paused) gameStore.setState({ ...s, paused: false }); });
  }
  return page.evaluate((secs) => {
    const fr = window.__fr.slice(3), s = fr.slice().sort((a, b) => a - b), g = window.__e1936.gameStore.getState();
    const q = (a, k) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * k))] : 0; };
    return { dps: (g.tick - window.__t0) / 24 / secs, n: fr.length, med: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1], over50: fr.filter((x) => x > 50).length, date: window.__e1936.engine.formatDate(g.tick),
      eng: `engine ve snímku p95 ${q(window.__e1936.loopMs || [], 0.95).toFixed(0)} ms, nejvíc ${q(window.__e1936.loopMs || [], 1).toFixed(0)} ms`,
      map: `mapa ${window.__map.length}× p95 ${q(window.__map, 0.95).toFixed(0)} ms (z toho jednotky p95 ${q(window.__units, 0.95).toFixed(0)} ms), nejvíc ${q(window.__map, 1).toFixed(0)} ms`, set: `změna stavu (React) p95 ${q(window.__set, 0.95).toFixed(0)} ms, nejvíc ${q(window.__set, 1).toFixed(0)} ms` };
  }, SECS);
}

const PROF = process.env.PROF;   // PROF=soubor.cpuprofile: profil CPU stránky během rychlosti 5
let cdp = null;
if (PROF) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); }
for (const sp of [3, 5]) {
  if (cdp && sp === 5) await cdp.send('Profiler.start');
  const r = await run(sp);
  if (cdp && sp === 5) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(PROF, JSON.stringify(profile)); }
  console.log(`rychlost ${sp}: ${r.dps.toFixed(1)} herních dní/s, snímky medián ${r.med.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms, nejdelší ${r.max.toFixed(0)} ms, nad 50 ms ${r.over50}/${r.n} (${r.date});\n   ${r.eng}; ${r.map}; ${r.set}`);
}
console.log(errs.length ? `chyby v konzoli: ${errs.slice(0, 5).join(' | ')}` : 'bez chyb v konzoli');
await browser.close();
