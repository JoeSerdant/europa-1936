// Měření výkonu enginu (F2 A2): pozorovatelská hra do dne DAY (výchozí 2000 = červen 1941, ~1000 divizí ve válce), pak DAYS dní
// s měřením po systémech a po hodinách. Stav ve dni DAY se uloží do `sim/out/` a příští běh ho použije (SNAP=0 vynutí nový běh).
// Výsledek: ms na herní den po systémech, rozpad armády, nejhorší hodina a „snímek“ při rychlosti 5 (240 h/s → 4 h na snímek při 60 fps).
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { packGame, unpackGame, advance, divisionCount, getWorld, hourSteps } from '../src/engine/index.js';
import { armyHour } from '../src/engine/army/system.js';
import { industryHour } from '../src/engine/industry/system.js';
import { researchHour } from '../src/engine/research/system.js';
import { politicsHour } from '../src/engine/politics/system.js';
import { natHour } from '../src/engine/nat/system.js';
import { dipHour } from '../src/engine/dip/system.js';
import { aiHour } from '../src/engine/ai/system.js';
import { navHour } from '../src/engine/nav/system.js';
import { airHour } from '../src/engine/air/system.js';
import { docHour } from '../src/engine/doc/system.js';
import { endHour } from '../src/engine/end.js';
import { occHour } from '../src/engine/occ/system.js';
import { spyHour } from '../src/engine/spy/system.js';
import { cmdHour } from '../src/engine/cmd/index.js';
import { statHour } from '../src/engine/stat/index.js';
import { openCtx, closeCtx } from '../src/engine/army/ctx.js';
import { dailyStep } from '../src/engine/army/daily.js';
import { trainingStep } from '../src/engine/army/training.js';
import { movementStep } from '../src/engine/army/movement.js';
import { combatStep } from '../src/engine/army/combat.js';
import { upkeepStep } from '../src/engine/army/upkeep.js';
import { env, simulate, writeReport, dateOf } from './run.js';

const SYSTEMS = [['army', armyHour], ['occ', occHour], ['nav', navHour], ['air', airHour], ['industry', industryHour], ['doc', docHour], ['spy', spyHour], ['research', researchHour],
  ['politics', politicsHour], ['nat', natHour], ['dip', dipHour], ['ai', aiHour], ['end', endHour], ['cmd', cmdHour], ['stat', statHour]];

it('výkon enginu', () => {
  const cfg = env(), DAY = +(process.env.DAY || 2000), DAYS = +(process.env.DAYS || 10);
  const dir = path.join(process.cwd(), 'sim', 'out');
  const snapFile = path.join(dir, `snap-${cfg.seed}-${DAY}${cfg.hist ? '' : '-nohist'}.json`);
  let s = null;
  if (process.env.SNAP !== '0' && fs.existsSync(snapFile)) { const r = unpackGame(JSON.parse(fs.readFileSync(snapFile, 'utf8'))); s = r.state || null; }
  if (!s) {
    s = simulate(cfg, DAY);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(snapFile, JSON.stringify(packGame(s)));
  }
  s = advance(s, 24 * 2);   // zahřátí (JIT, mezipaměti světa), aby první měřený den nebyl zkreslený
  const w = getWorld();
  let divs = 0; for (let o = 1; o < w.owners.length; o++) divs += divisionCount(s, w.owners[o].tag);
  const REP = +(process.env.REP || 3);   // úsek se měří několikrát a bere se nejlepší běh (šum stroje, úklid paměti)
  const T = (bag, k, fn) => { const t0 = performance.now(); const r = fn(); bag[k] = (bag[k] || 0) + performance.now() - t0; return r; };
  const start = s;
  let sys = null, army = null, hours = null;
  for (let rep = 0; rep < REP; rep++) {
    // 1) celé hodiny (jako ve hře) – po hodinách kvůli špičkám
    const sys1 = {}, hours1 = [];
    s = start;
    for (let h = 0; h < 24 * DAYS; h++) {
      const t0 = performance.now();
      let x = { ...s, tick: s.tick + 1 };
      for (const [k, fn] of SYSTEMS) x = T(sys1, k, () => fn(x));
      s = x;
      hours1.push({ ms: performance.now() - t0, midnight: s.tick % 24 === 0 });
    }
    // 2) rozpad armády na stejném úseku (znovu od začátku, stejný průběh)
    const army1 = {};
    let a = start;
    for (let h = 0; h < 24 * DAYS; h++) {
      a = { ...a, tick: a.tick + 1 };
      const ctx = T(army1, 'open', () => openCtx(a));
      if (ctx.tick % 24 === 0) T(army1, 'daily', () => dailyStep(ctx));
      T(army1, 'training', () => trainingStep(ctx));
      T(army1, 'movement', () => movementStep(ctx));
      T(army1, 'combat', () => combatStep(ctx));
      T(army1, 'upkeep', () => upkeepStep(ctx));
      a = T(army1, 'close', () => closeCtx(ctx));
    }
    const sum = (b) => Object.values(b).reduce((x, y) => x + y, 0);
    if (!sys || sum(sys1) < sum(sys)) { sys = sys1; hours = hours1; }
    if (!army || sum(army1) < sum(army)) army = army1;
  }
  // 3) nejdelší nepřerušitelný kousek práce (mezi přestávkami generátoru `hourSteps`) – tolik nejvýš zabere engine v jednom snímku hry
  const chunks = [];
  let c = start;
  for (let h = 0; h < 24 * DAYS; h++) {
    const g = hourSteps(c);
    let r;
    do { const t0 = performance.now(); r = g.next(); chunks.push(performance.now() - t0); } while (!r.done);
    c = r.value;
  }
  chunks.sort((x, y) => x - y);
  const per = (bag) => Object.entries(bag).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${(v / DAYS).toFixed(1)}`).join(', ');
  const total = Object.values(sys).reduce((x, y) => x + y, 0) / DAYS;
  const mid = hours.filter((x) => x.midnight).map((x) => x.ms), other = hours.filter((x) => !x.midnight).map((x) => x.ms).sort((x, y) => x - y);
  // snímek při rychlosti 5: 4 herní hodiny; nejhorší = snímek s půlnocí
  const frames = [];
  for (let i = 0; i + 4 <= hours.length; i += 4) frames.push(hours.slice(i, i + 4).reduce((x, y) => x + y.ms, 0));
  frames.sort((x, y) => x - y);
  const out = [
    `Výkon enginu: semínko ${cfg.seed}, ${dateOf(start)}, divizí ${divs}, měřeno ${DAYS} dní, nejlepší z ${REP} běhů (${process.env.LABEL || ''})`,
    `celkem ${total.toFixed(1)} ms na herní den`,
    `systémy (ms/den): ${per(sys)}`,
    `armáda (ms/den): ${per(army)}`,
    `hodina s půlnocí: průměr ${(mid.reduce((x, y) => x + y, 0) / mid.length).toFixed(1)} ms, nejvíc ${Math.max(...mid).toFixed(1)} ms; ostatní hodiny: medián ${other[other.length >> 1].toFixed(2)} ms, nejvíc ${other[other.length - 1].toFixed(1)} ms`,
    `snímek při rychlosti 5 bez rozložení (4 h): medián ${frames[frames.length >> 1].toFixed(1)} ms, nejhorší ${frames[frames.length - 1].toFixed(1)} ms`,
    `kousky práce mezi přestávkami: ${chunks.length}, p99 ${chunks[Math.floor(chunks.length * 0.99)].toFixed(1)} ms, nejdelší ${chunks[chunks.length - 1].toFixed(1)} ms`,
  ];
  writeReport(`perf${process.env.LABEL ? '-' + process.env.LABEL : ''}`, cfg, out);
  expect(total).toBeGreaterThan(0);
});
