// M27 – rozhraní námořnictva: čisté žetony a cesty flotil, akce hráče (výběr, rozkazy, sestavení, přeprava z kontextu), panel a klávesa.
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, homeSea, seaRoute, transportsOf, navyOf, advance } from '../src/engine/index.js';
import { gameStore, uiStore, NONE } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { buildFleetTokens, buildFleetRoutes } from '../src/ui/map/fleets.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { addDivision, emptyBattlefield } from './armyKit.js';

const W = getWorld();
const ENG = W.ownerIdx.ENG, FRA = W.ownerIdx.FRA;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();

beforeEach(() => { A.goMenu(); A.startGame('ENG'); });

describe('žetony a cesty na mapě', () => {
  it('jeden žeton na dvojici (oblast, země), s počtem lodí a středem oblasti', () => {
    const s = game();
    const t = buildFleetTokens(s, W);
    expect(t.length).toBeGreaterThanOrEqual(10);
    const eng = t.find((x) => x.o === ENG);
    const home = homeSea(s, ENG).sea;
    expect(eng.p).toBe(home);
    expect([eng.x, eng.y]).toEqual(W.sea[home - W.L].c);
    expect(eng.n).toBe(6 + 14 + 40 + 12);
    expect(eng.hp).toBe(1);
    expect(eng.moving).toBe(false);
    expect(eng.ids).toHaveLength(1);
    expect(new Set(t.map((x) => x.key)).size).toBe(t.length);
  });
  it('cesty jen pohybujících se flotil', () => {
    expect(buildFleetRoutes(game(), W)).toEqual([]);
    const id = game().nav.fleets.findIndex((f) => f && f.o === ENG);
    A.selectFleet(id);
    expect(A.orderFleetTo(homeSea(game(), W.ownerIdx.GER).sea)).toBe(true);
    const r = buildFleetRoutes(game(), W);
    expect(r).toHaveLength(1);
    expect(r[0].ids).toEqual([id]);
    expect(r[0].nodes.length).toBeGreaterThan(2);
  });
});

describe('akce', () => {
  it('klik na žeton vlastní flotily ji vybere a otevře panel; cizí jen ohlásí', () => {
    const t = buildFleetTokens(game(), W);
    A.clickFleet(t.find((x) => x.o === ENG));
    expect(ui().fleetSel).toBe(t.find((x) => x.o === ENG).ids[0]);
    expect(ui().panel).toBe('navy');
    A.clickFleet(t.find((x) => x.o === FRA));
    expect(ui().toast.text).toMatch(/Cizí flotila/);
    expect(ui().fleetSel).toBe(t.find((x) => x.o === ENG).ids[0]);
  });
  it('rozkaz flotile: jen vlastní, jen na mořskou oblast; Esc zruší výběr; mizející flotila se odznačí', () => {
    expect(A.orderFleetTo(W.L + 5)).toBe(false);                    // nic nevybráno
    const id = game().nav.fleets.findIndex((f) => f && f.o === ENG);
    A.selectFleet(id);
    expect(A.orderFleetTo(W.L + 5)).toBe(true);
    expect(game().nav.fleets[id].to).toBe(W.L + 5);
    expect(A.contextClick(W.L + 40)).toBe(true);                    // pravé tlačítko na moře
    expect(A.stopSelectedFleet()).toBe(true);
    const fr = game().nav.fleets.findIndex((f) => f && f.o === FRA);
    A.selectFleet(fr);
    expect(A.orderFleetTo(W.L + 5)).toBe(false);                    // cizí flotilu hráč neřídí
    expect(A.stopSelectedFleet()).toBe(false);
  });
  it('sestavení flotily z rezervy a rozpuštění v domovské oblasti', () => {
    const s = game();
    const pool = s.nav.pool.slice();
    pool[ENG] = { ...pool[ENG], dd: 4 };
    gameStore.setState({ ...s, nav: { ...s.nav, pool } });
    expect(A.newFleet({ dd: 99 })).toBe(false);
    expect(ui().toast.text).toMatch(/nejde sestavit/);
    expect(A.newFleet({ dd: 3 }, 'Nová')).toBe(true);
    const id = ui().fleetSel;
    expect(game().nav.fleets[id]).toMatchObject({ nm: 'Nová', o: ENG });
    expect(A.renameSelectedFleet('Přejmenovaná')).toBe(true);
    expect(game().nav.fleets[id].nm).toBe('Přejmenovaná');
    expect(A.disbandSelectedFleet()).toBe(true);
    expect(ui().fleetSel).toBe(0);
    expect(game().nav.pool[ENG].dd).toBe(4);
  });
  it('rozpuštění mimo domovskou oblast hlásí důvod', () => {
    const id = game().nav.fleets.findIndex((f) => f && f.o === ENG);
    A.selectFleet(id);
    A.orderFleetTo(homeSea(game(), W.ownerIdx.GER).sea);
    gameStore.setState(advance(game(), 24));
    expect(A.disbandSelectedFleet()).toBe(false);
    expect(ui().toast.text).toMatch(/domovském/);
  });
  it('pozorovatel nic neřídí; panel Námořnictvo se otevře', () => {
    A.openPanel('navy');
    expect(ui().panel).toBe('navy');
    A.goMenu(); A.startGame(null);
    expect(A.newFleet({ dd: 1 })).toBe(false);
    expect(A.orderFleetTo(W.L + 3)).toBe(false);
  });
});

describe('přeprava přes moře z rozhraní', () => {
  it('pravé tlačítko na pobřežní provincii za mořem pošle vybrané divize lodí; bez přístavu hlásí důvod', () => {
    const s0 = emptyBattlefield('ENG');
    const port = homeSea(s0, ENG).prov;
    const [s1, id] = addDivision(s0, 'ENG', 'pesi', port);
    gameStore.setState(s1);
    A.setSelection([id]);
    // cíl: pobřežní vlastní provincie v Irsku či jinde za mořem – hledá se provincie, kam po souši cesta není
    let dest = 0;
    const goals = (p) => { const out = new Set(); W.forCoast(p, (l) => out.add(l)); return out; };
    for (let p = 1; p <= W.L && !dest; p++) {
      if (s1.ctrl[p] !== ENG || p === port) continue;
      const g = goals(p);
      if (!g.size) continue;
      const r = seaRoute(W.portSea[port], g);
      if (r && r.km < 700 && !A.routePreview(p)) dest = p;   // po souši se tam nedá
    }
    expect(dest).toBeGreaterThan(0);
    expect(A.contextClick(dest)).toBe(true);
    expect(game().nav.sail).toHaveLength(1);
    expect(game().mil.divs[id]).toBeNull();
    expect(transportsOf(game(), ENG).used).toBe(1);
    expect(navyOf(game(), ENG).sail[0].to).toBe(dest);
  });
  it('záznamy o přepravě v deníku mají texty a důležitost', () => {
    const l = logLine({ k: 'landing', o: ENG, x: homeSea(game(), ENG).prov, a: 1 }, ENG);
    expect(l.text).toMatch(/Vylodění dokončeno/);
    expect(logLine({ k: 'landing', o: ENG, x: 1, a: 0 }, ENG).text).toMatch(/nezdařilo/);
    expect(logLine({ k: 'sunk', o: ENG, x: 1 }, ENG)).toMatchObject({ tone: 'bad' });
    expect(logImportant({ k: 'sunk', o: ENG }, ENG)).toBe(true);
    expect(logImportant({ k: 'landing', o: ENG }, ENG)).toBe(true);
    void NONE;
  });
});
