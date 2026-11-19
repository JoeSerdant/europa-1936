// Měření plynulosti v prohlížeči (F2 A2): načte válečný stav (snímek ze `sim/out/`, viz `npm run sim -- perf`), nechá běžet čas při rychlosti 3 a 5
// a vypíše herní dny za sekundu a délky snímků (medián, p95, nejdelší, počet nad 50 ms). Potřebuje běžící `npm run dev` (URL, výchozí :5173).
// Použití: SNAP=sim/out/snap-7-2160.json URL=http://localhost:5179/ node tools/perf-browser.mjs [sekund]
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
await page.evaluate(() => { window.__fr = []; let last = performance.now(); const f = (t) => { window.__fr.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });

async function run(speed) {
  await page.evaluate((sp) => { const { gameStore, engine } = window.__e1936; gameStore.setState(engine.setSpeed({ ...gameStore.getState(), paused: false }, sp)); window.__fr = []; window.__t0 = gameStore.getState().tick; }, speed);
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
    return { dps: (g.tick - window.__t0) / 24 / secs, n: fr.length, med: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1], over50: fr.filter((x) => x > 50).length, date: window.__e1936.engine.formatDate(g.tick) };
  }, SECS);
}

for (const sp of [3, 5]) {
  const r = await run(sp);
  console.log(`rychlost ${sp}: ${r.dps.toFixed(1)} herních dní/s, snímky medián ${r.med.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms, nejdelší ${r.max.toFixed(0)} ms, nad 50 ms ${r.over50}/${r.n} (${r.date})`);
}
console.log(errs.length ? `chyby v konzoli: ${errs.slice(0, 5).join(' | ')}` : 'bez chyb v konzoli');
await browser.close();
