// Vstup spojenců do války (F2 B1): členové bloku se do válek bloku zapojují podle `HIST_ENTRY` (Itálie 1940, Bulharsko a Maďarsko 1941),
// do útočné války táhne členy jen vedoucí bloku, Bulharsko kvůli bloku neválčí se SSSR, Malá dohoda Československo nebrání.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, startWar, HIST_ENTRY } from '../src/engine/index.js';
import { atWar } from '../src/engine/army/war.js';
import { aiDiplomacy } from '../src/engine/ai/diplomacy.js';
import { heldBack, skipsWar } from '../src/engine/dip/entry.js';

const W = getWorld();
const I = (t) => W.ownerIdx[t];
const GER = I('GER'), ITA = I('ITA'), HUN = I('HUN'), BUL = I('BUL'), POL = I('POL'), FRA = I('FRA'), SOV = I('SOV'), ALB = I('ALB'), CZE = I('CZE'), ROM = I('ROM');

/** Hra v daný den s blokem Osy (Německo, Itálie, Maďarsko, Bulharsko); AI zapnutá. */
function axis(day) {
  let s = createGame({ player: null, aiLevel: 2 });
  const facs = [...s.dip.facs, { nm: 'Osa', ldr: GER, mem: [GER, ITA, HUN, BUL] }], fac = s.dip.fac.slice();
  for (const o of [GER, ITA, HUN, BUL]) fac[o] = facs.length - 1;
  s = { ...s, tick: day * 24, dip: { ...s.dip, fac, facs, ver: s.dip.ver + 1 } };
  return s;
}
const ready = (s, a, b) => ({ ...s, dip: { ...s.dip, just: [...s.dip.just, { a, b, g: 'conquest', ready: s.tick - 1 }] } });

describe('vstup členů bloku do války', () => {
  it('data: Itálie 1940, Bulharsko a Maďarsko 1941', () => {
    const row = (t) => HIST_ENTRY.find((r) => r.tag === t);
    expect(row('ITA').from).toBeGreaterThanOrEqual(1461);   // rok 1940
    expect(row('ITA').from).toBeLessThan(1827);
    for (const t of ['HUN', 'BUL']) { expect(row(t).from).toBeGreaterThanOrEqual(1827); expect(row(t).from).toBeLessThan(2192); }   // rok 1941
    expect(heldBack(axis(1334), ITA)).toBe(true);
    expect(heldBack(axis(1700), ITA)).toBe(false);
    expect(heldBack(createGame({ player: null }), ITA)).toBe(false);   // bez AI zemí platí bloky jako dřív
  });
  it('v září 1939 jde Německo do války s Polskem samo; spojenci Polska ano', () => {
    const s = startWar(ready(axis(1334), GER, POL), GER, POL);
    expect(atWar(s.mil, GER, POL)).toBe(true);
    for (const x of [ITA, HUN, BUL]) expect(atWar(s.mil, x, POL)).toBe(false);
    expect(atWar(s.mil, GER, FRA)).toBe(true);   // Francouzský systém Polsko brání
    for (const x of [ITA, HUN, BUL]) expect(atWar(s.mil, x, FRA)).toBe(false);
  });
  it('od data vstupu se AI člen sám přidá k válkám vedoucího bloku (Itálie v červnu 1940)', () => {
    let s = startWar(ready(axis(1334), GER, POL), GER, POL);
    s = { ...s, tick: 1625 * 24 };
    const t = aiDiplomacy(s, ITA);
    expect(atWar(t.mil, ITA, FRA)).toBe(true);
    expect(t.log.items.some((e) => e.k === 'war' && e.a === ITA && e.b === FRA)).toBe(true);
    expect(atWar(aiDiplomacy({ ...s, tick: 1625 * 24 }, HUN).mil, HUN, FRA)).toBe(false);   // Maďarsko až 1941
  });
  it('Bulharsko kvůli bloku neválčí se SSSR', () => {
    expect(skipsWar(axis(2000), BUL, SOV)).toBe(true);
    const s = startWar(ready(axis(2000), GER, SOV), GER, SOV);
    expect(atWar(s.mil, GER, SOV)).toBe(true);
    expect(atWar(s.mil, ITA, SOV)).toBe(true);   // Itálie už je ve válce s blokem
    expect(atWar(s.mil, BUL, SOV)).toBe(false);
  });
  it('válku člena bloku vede člen sám (Itálie a Albánie bez Německa)', () => {
    const s = startWar(ready(axis(1700), ITA, ALB), ITA, ALB);
    expect(atWar(s.mil, ITA, ALB)).toBe(true);
    expect(atWar(s.mil, GER, ALB)).toBe(false);
  });
  it('Malá dohoda Československo v roce 1938 nebrání', () => {
    const s = startWar(ready(axis(1040), GER, CZE), GER, CZE);
    expect(atWar(s.mil, GER, CZE)).toBe(true);
    expect(atWar(s.mil, GER, ROM)).toBe(false);
  });
});

describe('výjimka skip a loutky', () => {
  it('Bulharsko neválčí ani s loutkou SSSR (jinak by válku každý den vyhlašovalo a loutka by uzavírala mír)', () => {
    const FIN = I('FIN');
    let s = axis(2000);
    const sub = s.dip.sub.slice(); sub[FIN] = SOV;
    s = { ...s, dip: { ...s.dip, sub } };
    expect(skipsWar(s, BUL, FIN)).toBe(true);
    expect(skipsWar(s, ITA, FIN)).toBe(false);
  });
});
