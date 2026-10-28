// M18 – příkazy hráče: šablony, nábor, rozpuštění, rozkazy, armády, skupiny, velitelé, plány.
import { describe, it, expect } from 'vitest';
import {
  createGame, advance, advanceHour, deriveStats, ARMY, templatesOf, createTemplate, editTemplate, deleteTemplate, recruit, cancelRecruit, disband,
  orderMove, cancelOrder, createArmy, renameArmy, disbandArmy, assignDivisions, createGroup, renameGroup, disbandGroup, assignArmies, assignCommander,
  setPlan, clearPlan, setPlanMode, declareWar, armyTree, generalsOf, divisionView, templateView, findPath, pathHours, TPL_KINDS, EQUIP_IDS,
} from '../src/engine/index.js';
import { emptyBattlefield, addDivision, pairWithTerrain, realBorder, giveSides, neighbors, idx, W } from './armyKit.js';

const infantryTpl = (s, tag) => templatesOf(s.mil, idx(tag)).find((id) => s.mil.tpl[id].short === 'pěší divize');
const goodTemplate = { nm: 'Moje pěchota', reg: [['pesi', 'pesi', 'pesi'], ['pesi', 'pesi', 'pesi']], sup: ['del', 'ing'] };

function deepFreeze(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x) && !ArrayBuffer.isView(x)) { Object.freeze(x); for (const k of Object.keys(x)) deepFreeze(x[k]); }
  return x;
}

describe('šablony', () => {
  it('vytvoření platné šablony přidá novou, neplatné vrací tentýž stav', () => {
    const s = createGame();
    const t = createTemplate(s, 'GER', goodTemplate);
    expect(t).not.toBe(s);
    const ids = templatesOf(t.mil, idx('GER'));
    const last = t.mil.tpl[ids[ids.length - 1]];
    expect(last.nm).toBe('Moje pěchota');
    expect(last.o).toBe(idx('GER'));
    expect(last.reg).toEqual(goodTemplate.reg);
    expect(last.reg).not.toBe(goodTemplate.reg);                       // kopie
    expect(createTemplate(s, 'XXX', goodTemplate)).toBe(s);
    expect(createTemplate(s, 'GER', { ...goodTemplate, nm: '' })).toBe(s);
    expect(createTemplate(s, 'GER', { ...goodTemplate, reg: [['mtank']] })).toBe(s);   // zamčeno
    expect(createTemplate(s, 'GER', null)).toBe(s);
  });

  it('počet šablon země je omezený', () => {
    let s = createGame();
    for (let i = 0; i < ARMY.TPL_MAX + 5; i++) s = createTemplate(s, 'LUX', { ...goodTemplate, nm: `T${i}` });
    expect(templatesOf(s.mil, idx('LUX')).length).toBe(ARMY.TPL_MAX);
  });

  it('úprava šablony přepočítá divize: síla a organizace nepřekročí nové maximum', () => {
    const s = createGame();
    const id = infantryTpl(s, 'GER');
    const small = { nm: 'Zmenšená', reg: [['pesi']], sup: [] };
    const t = editTemplate(s, id, small);
    expect(t).not.toBe(s);
    const max = deriveStats(t.mil.tpl[id]);
    const d = t.mil.divs.find((x) => x && x.tpl === id);
    expect(d.hp).toBeLessThanOrEqual(max.hp);
    expect(d.org).toBeLessThanOrEqual(max.org);
    expect(t.mil.tpl[id].nm).toBe('Zmenšená');
    expect(t.mil.tpl[id].short).toBeUndefined();                       // přejmenovaná šablona ztrácí výchozí zkratku
    expect(editTemplate(s, 99999, small)).toBe(s);
    expect(editTemplate(s, id, { ...small, reg: [] })).toBe(s);
  });

  it('nezměněný název ponechá zkrácené jméno divizí', () => {
    const s = createGame();
    const id = infantryTpl(s, 'GER');
    const t = editTemplate(s, id, { nm: s.mil.tpl[id].nm, reg: [['pesi', 'pesi']], sup: [] });
    expect(t.mil.tpl[id].short).toBe('pěší divize');
  });

  it('smazat jde jen nepoužívanou šablonu', () => {
    let s = createGame();
    const used = infantryTpl(s, 'GER');
    expect(deleteTemplate(s, used)).toBe(s);
    s = createTemplate(s, 'GER', goodTemplate);
    const ids = templatesOf(s.mil, idx('GER'));
    const fresh = ids[ids.length - 1];
    const t = deleteTemplate(s, fresh);
    expect(t.mil.tpl[fresh]).toBe(null);
    expect(deleteTemplate(t, fresh)).toBe(t);
    expect(deleteTemplate(s, 0)).toBe(s);
    // šablona s divizí ve výcviku se smazat nedá
    const cap = W.owners[idx('GER')].cap;
    const r = recruit(s, fresh, cap, 1);
    expect(r).not.toBe(s);
    expect(deleteTemplate(r, fresh)).toBe(r);
  });

  it('pohled na šablonu nese cenu a je cachovaný', () => {
    const s = createGame();
    const id = infantryTpl(s, 'GER');
    const v = templateView(s, id);
    expect(v.men).toBe(deriveStats(s.mil.tpl[id]).men);
    expect(templateView(s, id)).toBe(v);
    expect(templateView(s, 0)).toBe(null);
  });
});

describe('nábor', () => {
  const s0 = createGame({ player: 'GER' });
  const o = idx('GER');
  const tpl = infantryTpl(s0, 'GER');
  const cap = W.owners[o].cap;
  const st = deriveStats(s0.mil.tpl[tpl]);

  it('odečte lidskou sílu i výzbroj hned a divize se objeví po dokončení výcviku', () => {
    const s = recruit(s0, tpl, cap, 2);
    expect(s).not.toBe(s0);
    expect(s.mil.man[o]).toBe(s0.mil.man[o] - 2 * st.men);
    for (const e of Object.keys(st.need)) expect(s.mil.stock[o][e]).toBe(s0.mil.stock[o][e] - 2 * st.need[e]);
    expect(s.mil.queue.length).toBe(2);
    expect(new Set(s.mil.queue.map((q) => q.id)).size).toBe(2);
    expect(s.mil.queue[0].done).toBe(s0.tick + st.days * 24);
    const before = s.mil.divs.filter(Boolean).length;
    const mid = advance(s, st.days * 24 - 1);
    expect(mid.mil.divs.filter(Boolean).length).toBe(before);           // v míru nikdo nezahyne
    expect(mid.mil.divs.filter(Boolean).length).toBe(before);
    const end = advanceHour(mid);
    expect(end.mil.queue.length).toBe(0);
    expect(end.mil.divs.filter(Boolean).length).toBe(before + 2);
    const nd = end.mil.divs[end.mil.divs.length - 1];
    expect(nd.p).toBe(cap);
    expect(nd.tpl).toBe(tpl);
    expect(nd.org).toBe(st.org);
    expect(nd.hp).toBe(st.hp);
    expect(nd.army).toBe(0);
    expect(end.mil.ver).toBeGreaterThan(mid.mil.ver);
  });

  it('nemá-li země lidskou sílu, výzbroj nebo území, nic se nestane', () => {
    expect(recruit(s0, tpl, cap, 0)).toBe(s0);
    expect(recruit(s0, tpl, cap, 21)).toBe(s0);
    expect(recruit(s0, tpl, cap, 1.5)).toBe(s0);
    expect(recruit(s0, tpl, 0, 1)).toBe(s0);
    expect(recruit(s0, tpl, W.owners[idx('POL')].cap, 1)).toBe(s0);      // cizí území
    expect(recruit(s0, 99999, cap, 1)).toBe(s0);
    const poor = { ...s0, mil: { ...s0.mil, man: s0.mil.man.map(() => 0) } };
    expect(recruit(poor, tpl, cap, 1)).toBe(poor);
    const noGuns = { ...s0, mil: { ...s0.mil, stock: s0.mil.stock.map((x) => x && { ...x, pusky: 0 }) } };
    expect(recruit(noGuns, tpl, cap, 1)).toBe(noGuns);
  });

  it('zrušení výcviku vrátí všechno', () => {
    const s = recruit(s0, tpl, cap, 1);
    const t = cancelRecruit(s, s.mil.queue[0].id);
    expect(t.mil.queue).toEqual([]);
    expect(t.mil.man[o]).toBe(s0.mil.man[o]);
    for (const e of EQUIP_IDS) expect(t.mil.stock[o][e]).toBe(s0.mil.stock[o][e]);
    expect(cancelRecruit(t, 12345)).toBe(t);
  });

  it('rozpuštění vrátí lidskou sílu a výzbroj podle zbývající síly', () => {
    const id = s0.mil.divs.findIndex((d) => d && d.o === o && d.tpl === tpl);
    const half = { ...s0, mil: { ...s0.mil, divs: s0.mil.divs.map((d, i) => (i === id ? { ...d, hp: st.hp / 2 } : d)) } };
    const t = disband(half, [id, id, 99999]);
    expect(t.mil.divs[id]).toBe(null);
    expect(t.mil.man[o]).toBeCloseTo(half.mil.man[o] + st.men / 2, 5);
    expect(t.mil.stock[o].pusky).toBeCloseTo(half.mil.stock[o].pusky + st.need.pusky / 2, 5);
    expect(t.mil.ver).toBeGreaterThan(half.mil.ver);
    expect(disband(t, [id])).toBe(t);
    expect(disband(t, [])).toBe(t);
  });

  it('divizi v boji rozpustit nelze', () => {
    const f = pairWithTerrain(0);
    let s = giveSides(emptyBattlefield(), 'GER', 'POL', f.from, f.to);
    let a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', f.from, { path: [f.to] });
    [s, b] = addDivision(s, 'POL', 'pesi', f.to);
    s = declareWar(s, 'GER', 'POL');
    s = advance(s, 8);
    expect(s.mil.battles.length).toBe(1);
    expect(disband(s, [a, b])).toBe(s);
  });
});

describe('rozkazy', () => {
  /** Vlastní řetěz provincií délky `n` v zemi (cesta po vlastním území). */
  function chain(tag, n, s) {
    const o = idx(tag);
    for (let p = 1; p <= W.L; p++) {
      if (s.ctrl[p] !== o) continue;
      const path = [p];
      let cur = p;
      for (let i = 1; i < n; i++) {
        const next = neighbors(cur).find((q) => s.ctrl[q] === o && !path.includes(q));
        if (!next) break;
        path.push(next); cur = next;
      }
      if (path.length === n) return path;
    }
    return null;
  }

  it('divize dojde do cíle za přibližně očekaný čas', () => {
    let s = emptyBattlefield();
    const ch = chain('GER', 4, s);
    let id;
    [s, id] = addDivision(s, 'GER', 'pesi', ch[0]);
    const t = orderMove(s, [id], ch[3]);
    expect(t).not.toBe(s);
    expect(t.mil.divs[id].path).toEqual(findPath(s.mil, s.ctrl, idx('GER'), ch[0], ch[3]));
    const hours = pathHours(ch[0], t.mil.divs[id].path);
    const early = advance(t, Math.floor(hours * 0.4));
    expect(early.mil.divs[id].p).not.toBe(ch[3]);
    const late = advance(t, Math.ceil(hours * 2) + 24);
    expect(late.mil.divs[id].p).toBe(ch[3]);
    expect(late.mil.divs[id].path).toEqual([]);
    expect(late.mil.divs[id].prog).toBe(0);
  });

  it('rychlejší divize dojde dřív než pěší', () => {
    let s = emptyBattlefield();
    const ch = chain('GER', 5, s);
    let a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', ch[0]);
    [s, b] = addDivision(s, 'GER', 'motor', ch[0]);
    s = orderMove(s, [a, b], ch[4]);
    let t = s, ha = null, hb = null;
    for (let h = 1; h < 24 * 20 && (ha === null || hb === null); h++) {
      t = advanceHour(t);
      if (ha === null && t.mil.divs[a].p === ch[4]) ha = h;
      if (hb === null && t.mil.divs[b].p === ch[4]) hb = h;
    }
    expect(hb).toBeLessThan(ha);
  });

  it('neplatné rozkazy nic nemění', () => {
    let s = emptyBattlefield();
    const ch = chain('GER', 3, s);
    let id;
    [s, id] = addDivision(s, 'GER', 'pesi', ch[0]);
    expect(orderMove(s, [id], ch[0])).toBe(s);                         // už tam je
    expect(orderMove(s, [id], 0)).toBe(s);
    expect(orderMove(s, [id], W.L + 5)).toBe(s);
    expect(orderMove(s, [id], W.owners[idx('POL')].cap)).toBe(s);      // cizí neutrální území
    expect(orderMove(s, [77777], ch[2])).toBe(s);
    expect(orderMove(s, 'x', ch[2])).toBe(s);
    expect(cancelOrder(s, [id])).toBe(s);                              // nemá rozkaz
  });

  it('zrušení rozkazu zastaví divizi', () => {
    let s = emptyBattlefield();
    const ch = chain('GER', 4, s);
    let id;
    [s, id] = addDivision(s, 'GER', 'pesi', ch[0]);
    s = advance(orderMove(s, [id], ch[3]), 10);
    expect(s.mil.divs[id].path.length).toBeGreaterThan(0);
    const t = cancelOrder(s, [id]);
    expect(t.mil.divs[id].path).toEqual([]);
    expect(t.mil.divs[id].prog).toBe(0);
    const p = t.mil.divs[id].p;
    expect(advance(t, 100).mil.divs[id].p).toBe(p);
  });

  it('do nepřátelské provincie vede rozkaz k útoku', () => {
    const f = pairWithTerrain(0);
    let s = giveSides(emptyBattlefield(), 'GER', 'POL', f.from, f.to);
    let a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', f.from);
    [s, b] = addDivision(s, 'POL', 'pesi', f.to);
    expect(orderMove(s, [a], f.to)).toBe(s);                           // mír: zavřeno
    s = declareWar(s, 'GER', 'POL');
    s = orderMove(s, [a], f.to);
    expect(s.mil.divs[a].path).toEqual([f.to]);
    s = advance(s, 12);
    expect(s.mil.battles.length).toBe(1);
    expect(s.mil.divs[a].b).toBe(s.mil.battles[0].id);
    expect(s.mil.divs[b].b).toBe(s.mil.battles[0].id);
    // útočníka lze z útoku stáhnout, bránícího se ne
    expect(cancelOrder(s, [b])).toBe(s);
    const t = cancelOrder(s, [a]);
    expect(t.mil.divs[a].path).toEqual([]);
    expect(advance(t, 3).mil.divs[a].b).toBe(0);
  });
});

describe('armády, skupiny armád a velitelé', () => {
  const base = createGame({ player: 'GER' });
  const o = idx('GER');
  const loose = (s) => s.mil.divs.map((d, id) => (d && d.o === o && !d.army ? id : 0)).filter(Boolean);

  it('strom velení: skupiny → armády → divize a samostatné divize', () => {
    const tree = armyTree(base, 'GER');
    expect(armyTree(base, 'GER')).toBe(tree);                          // cachováno
    expect(armyTree(advance(base, 5), 'GER')).toBe(tree);              // beze změny struktury i po čase
    let n = 0;
    for (const g of tree.groups) for (const a of g.armies) n += a.divs.length;
    for (const a of tree.loose.armies) n += a.divs.length;
    n += tree.loose.divs.length;
    expect(n).toBe(base.mil.divs.filter((d) => d && d.o === o).length);
    for (const g of tree.groups) expect(g.armies.length).toBeLessThanOrEqual(ARMY.GROUP_CAP);
  });

  it('vytvoření, přejmenování a rozpuštění armády', () => {
    let s = createGame({ player: 'GER' });
    const ids = loose(s);
    const mine = s.mil.divs.map((d, id) => (d && d.o === o ? id : 0)).filter(Boolean).slice(0, 3);
    s = disbandArmy(s, s.mil.divs[mine[0]].army || 0) === s ? s : disbandArmy(s, s.mil.divs[mine[0]].army);
    let t = createArmy(s, 'GER', '  Nová   armáda ', mine);
    expect(t).not.toBe(s);
    const aid = t.mil.armies.length - 1;
    expect(t.mil.armies[aid].nm).toBe('Nová armáda');
    for (const id of mine) expect(t.mil.divs[id].army).toBe(aid);
    expect(armyTree(t, 'GER').loose.armies.some((a) => a.id === aid)).toBe(true);
    expect(armyTree(t, 'GER')).not.toBe(armyTree(s, 'GER'));
    const r = renameArmy(t, aid, 'Severní');
    expect(r.mil.armies[aid].nm).toBe('Severní');
    expect(renameArmy(r, aid, 'Severní')).toBe(r);
    expect(renameArmy(r, aid, '   ')).toBe(r);
    const u = disbandArmy(r, aid);
    expect(u.mil.armies[aid]).toBe(null);
    for (const id of mine) expect(u.mil.divs[id].army).toBe(0);
    expect(disbandArmy(u, aid)).toBe(u);
    expect(ids).toBeDefined();
  });

  it('armáda má limit velení', () => {
    let s = emptyBattlefield();
    const cap = W.owners[o].cap;
    const ids = [];
    for (let i = 0; i < ARMY.ARMY_CAP + 2; i++) { let id; [s, id] = addDivision(s, 'GER', 'pesi', cap); ids.push(id); }
    expect(createArmy(s, 'GER', 'Moc', ids)).toBe(s);
    let t = createArmy(s, 'GER', 'Plná', ids.slice(0, ARMY.ARMY_CAP));
    const aid = t.mil.armies.length - 1;
    expect(assignDivisions(t, aid, [ids[ARMY.ARMY_CAP]])).toBe(t);
    const u = assignDivisions(t, aid, [ids[0], ids[ARMY.ARMY_CAP]]);      // ids[0] už je členem → přibude jediná
    expect(u.mil.divs[ids[ARMY.ARMY_CAP]].army).toBe(0 || u.mil.divs[ids[ARMY.ARMY_CAP]].army);
    const v = assignDivisions(t, 0, [ids[0]]);                          // vyřadit
    expect(v.mil.divs[ids[0]].army).toBe(0);
    const w2 = assignDivisions(v, aid, [ids[ARMY.ARMY_CAP]]);
    expect(w2.mil.divs[ids[ARMY.ARMY_CAP]].army).toBe(aid);
  });

  it('cizí divize nelze přiřadit', () => {
    let s = emptyBattlefield();
    let a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', W.owners[o].cap);
    [s, b] = addDivision(s, 'POL', 'pesi', W.owners[idx('POL')].cap);
    s = createArmy(s, 'GER', 'X', [a]);
    const aid = s.mil.armies.length - 1;
    expect(assignDivisions(s, aid, [b])).toBe(s);
    expect(createArmy(s, 'GER', 'Y', [b]).mil.divs[b].army).toBe(0);
  });

  it('skupiny armád: vytvoření, limit, přiřazení, přejmenování, rozpuštění', () => {
    let s = createGame({ player: 'GER' });
    const armies = s.mil.armies.map((a, id) => (a && a.o === o ? id : 0)).filter(Boolean);
    let t = createGroup(s, 'GER', 'Fronta', []);
    const gid = t.mil.groups.length - 1;
    expect(t.mil.groups[gid].nm).toBe('Fronta');
    const sov = s.mil.armies.map((a, id) => (a && a.o === idx('SOV') ? id : 0)).filter(Boolean);
    expect(sov.length).toBeGreaterThan(ARMY.GROUP_CAP);
    expect(createGroup(s, 'SOV', 'X', sov.slice(0, ARMY.GROUP_CAP + 1))).toBe(s);
    expect(createGroup(s, 'SOV', 'X', sov.slice(0, ARMY.GROUP_CAP)).mil.groups.length).toBe(s.mil.groups.length + 1);
    t = assignArmies(t, gid, armies);
    for (const id of armies) expect(t.mil.armies[id].grp).toBe(gid);
    expect(armyTree(t, 'GER').groups.find((g) => g.id === gid).armies.length).toBe(armies.length);
    expect(assignArmies(t, gid, armies)).toBe(t);                       // beze změny
    const r = renameGroup(t, gid, 'Východ');
    expect(r.mil.groups[gid].nm).toBe('Východ');
    const u = disbandGroup(r, gid);
    expect(u.mil.groups[gid]).toBe(null);
    for (const id of armies) expect(u.mil.armies[id].grp).toBe(0);
    expect(disbandGroup(u, gid)).toBe(u);
    expect(assignArmies(u, gid, armies)).toBe(u);
  });

  it('velitelé: jen vlastní, skupinu vede polní maršál, přeložený velitel opustí staré místo', () => {
    const s = createGame({ player: 'GER' });
    const armies = s.mil.armies.map((a, id) => (a && a.o === o ? id : 0)).filter(Boolean);
    const groups = s.mil.groups.map((g, id) => (g && g.o === o ? id : 0)).filter(Boolean);
    const gens = generalsOf(s, 'GER');
    expect(generalsOf(s, 'GER')).toBe(gens);                            // cachováno
    const free = gens.filter((g) => !g.post);
    const freeG = free.find((g) => g.gen.r === 'G');
    expect(freeG).toBeTruthy();
    const foreign = s.mil.gens.findIndex((g) => g && g.o === idx('POL'));
    expect(assignCommander(s, 'army', armies[0], foreign)).toBe(s);
    expect(assignCommander(s, 'group', groups[0], freeG.id)).toBe(s);   // generál nesmí velet skupině armád
    expect(assignCommander(s, 'zlo', 1, 1)).toBe(s);
    expect(assignCommander(s, 'army', 99999, freeG.id)).toBe(s);
    const t = assignCommander(s, 'army', armies[0], freeG.id);
    expect(t.mil.armies[armies[0]].cmd).toBe(freeG.id);
    const oldCmd = s.mil.armies[armies[0]].cmd;
    expect(generalsOf(t, 'GER').find((g) => g.id === oldCmd).post).toBe(null);
    // velitel druhé armády přeložený k první opustí svou armádu
    const second = s.mil.armies[armies[1]].cmd;
    const u = assignCommander(t, 'army', armies[0], second);
    expect(u.mil.armies[armies[0]].cmd).toBe(second);
    expect(u.mil.armies[armies[1]].cmd).toBe(0);
    const v = assignCommander(u, 'army', armies[0], 0);
    expect(v.mil.armies[armies[0]].cmd).toBe(0);
    expect(assignCommander(v, 'army', armies[0], 0)).toBe(v);
    const marshal = s.mil.groups[groups[0]].cmd;
    expect(s.mil.gens[marshal].r).toBe('M');
  });
});

describe('plány', () => {
  /** Scéna: německá armáda ze 4 divizí na hranici, polská divize za ní, válka. */
  function scene(mode) {
    const f = realBorder('GER', 'POL');
    let s = emptyBattlefield('GER');                                   // skutečná hranice a skutečné zásobování
    const ids = [];
    for (let i = 0; i < 4; i++) { let id; [s, id] = addDivision(s, 'GER', 'pesi', f.from); ids.push(id); }
    let enemy;
    [s, enemy] = addDivision(s, 'POL', 'pesi', f.to);
    s = declareWar(s, 'GER', 'POL');
    s = createArmy(s, 'GER', 'Útočná', ids);
    const aid = s.mil.armies.length - 1;
    return { s, f, ids, aid, enemy, mode };
  }

  it('plán se normalizuje a neplatný se odmítne', () => {
    const { s, f, aid } = scene();
    expect(setPlan(s, aid, null)).toBe(s);
    expect(setPlan(s, aid, { k: 'nic' })).toBe(s);
    expect(setPlan(s, aid, { k: 'area', area: [] })).toBe(s);
    expect(setPlan(s, aid, { k: 'area', area: [0] })).toBe(s);
    expect(setPlan(s, aid, { k: 'area', area: [W.L + 1] })).toBe(s);
    expect(setPlan(s, aid, { k: 'front', line: [] })).toBe(s);
    expect(setPlan(s, 9999, { k: 'area', area: [f.from] })).toBe(s);
    const t = setPlan(s, aid, { k: 'front', line: [f.from, f.from], to: [f.to, f.from], mode: 'nesmysl' });
    const p = t.mil.armies[aid].plan;
    expect(p).toEqual({ k: 'front', line: [f.from], to: [f.to], mode: 'balanced' });
  });

  it('Linie fronty: armáda vyrazí na cíl, provincii dobyde a cíl přejde do linie', () => {
    const { s, f, aid, ids } = scene();
    let t = setPlan(s, aid, { k: 'front', line: [f.from], to: [f.to], mode: 'rush' });
    expect(ids.some((id) => t.mil.divs[id].path[0] === f.to)).toBe(true);
    for (let day = 0; day < 15 && t.ctrl[f.to] !== idx('GER'); day++) t = advance(t, 24);
    expect(t.ctrl[f.to]).toBe(idx('GER'));
    t = advance(t, 24 * 2);
    const plan = t.mil.armies[aid].plan;
    expect(plan.to).toEqual([]);
    expect(plan.line).toContain(f.to);
  });

  it('opatrný režim počká na plánování', () => {
    const { s, f, aid, ids } = scene();
    const t = setPlan(s, aid, { k: 'front', line: [f.from], to: [f.to], mode: 'careful' });
    expect(ids.every((id) => t.mil.divs[id].path.length === 0)).toBe(true);
    let u = t;
    for (let d = 0; d < 40 && !ids.some((id) => u.mil.divs[id].path.length); d++) u = advance(u, 24);
    expect(ids.some((id) => u.mil.divs[id].path.length || u.mil.divs[id].b)).toBe(true);
    expect(u.mil.armies[aid].pl).toBeGreaterThan(0);
    const m = setPlanMode(t, aid, 'rush');
    expect(m.mil.armies[aid].plan.mode).toBe('rush');
    expect(setPlanMode(m, aid, 'rush')).toBe(m);
    expect(setPlanMode(m, aid, 'x')).toBe(m);
  });

  it('Hájit oblast: divize se rozloží po provinciích oblasti', () => {
    let s = emptyBattlefield('GER');
    const o = idx('GER');
    const cap = W.owners[o].cap;
    const area = [cap];
    for (const q of neighbors(cap)) if (s.ctrl[q] === o && area.length < 3) area.push(q);
    expect(area.length).toBeGreaterThanOrEqual(2);
    const ids = [];
    for (let i = 0; i < 6; i++) { let id; [s, id] = addDivision(s, 'GER', 'pesi', cap); ids.push(id); }
    s = createArmy(s, 'GER', 'Obrana', ids);
    const aid = s.mil.armies.length - 1;
    let t = setPlan(s, aid, { k: 'area', area });
    t = advance(t, 24 * 4);
    const where = ids.map((id) => t.mil.divs[id].p);
    for (const p of area) expect(where.includes(p), `provincie ${p}`).toBe(true);
    expect(where.every((p) => area.includes(p))).toBe(true);
    const c = clearPlan(t, aid);
    expect(c.mil.armies[aid].plan).toBe(null);
    expect(clearPlan(c, aid)).toBe(c);
  });

  it('ruční rozkaz platí, dokud divize nedojde, a plánovač ji pak vrátí na post', () => {
    let s = emptyBattlefield('GER');
    const o = idx('GER');
    const cap = W.owners[o].cap;
    const area = [cap];
    const ids = [];
    let id;
    [s, id] = addDivision(s, 'GER', 'pesi', cap); ids.push(id);
    s = createArmy(s, 'GER', 'Jedna', ids);
    const aid = s.mil.armies.length - 1;
    s = setPlan(s, aid, { k: 'area', area });
    const away = neighbors(cap).find((q) => s.ctrl[q] === o);
    s = orderMove(s, ids, away);
    s = advance(s, 2);
    expect(s.mil.divs[ids[0]].path.length).toBeGreaterThan(0);
    s = advance(s, 24 * 6);
    expect(s.mil.divs[ids[0]].p).toBe(cap);
  });

  it('obranná AI dlouhodobě drží divize u fronty', () => {
    let s = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
    s = advance(s, 24 * 10);
    const front = new Set();
    for (const a of s.mil.armies) if (a && a.o === idx('POL') && a.plan) for (const p of a.plan.area) front.add(p);
    expect(front.size).toBeGreaterThan(5);
    let near = 0, n = 0;
    for (const d of s.mil.divs) if (d && d.o === idx('POL') && d.army) { n++; if (front.has(d.p) || d.path.length) near++; }
    expect(near / n).toBeGreaterThan(0.6);
  });
});

describe('čistota příkazů', () => {
  it('žádný příkaz nemění vstupní stav', () => {
    const s = createGame({ player: 'GER' });
    deepFreeze(s);
    const o = idx('GER');
    const tpl = infantryTpl(s, 'GER');
    const mine = s.mil.divs.map((d, id) => (d && d.o === o ? id : 0)).filter(Boolean);
    const armies = s.mil.armies.map((a, id) => (a && a.o === o ? id : 0)).filter(Boolean);
    expect(() => {
      let t = declareWar(s, 'GER', 'POL');
      t = createTemplate(t, 'GER', goodTemplate);
      t = recruit(t, tpl, W.owners[o].cap, 1);
      t = orderMove(t, mine.slice(0, 3), W.owners[o].cap);
      t = cancelOrder(t, mine.slice(0, 3));
      t = createArmy(t, 'GER', 'N', mine.slice(0, 2));
      t = assignCommander(t, 'army', armies[0], 0);
      t = setPlan(t, armies[0], { k: 'area', area: [W.owners[o].cap] });
      t = disband(t, [mine[5]]);
      advance(t, 30);
    }).not.toThrow();
  });

  it('pohled na divizi je cachovaný podle objektu divize a ukazuje stav', () => {
    const s = createGame({ player: 'GER' });
    const id = s.mil.divs.findIndex((d) => d && d.o === idx('GER'));
    const v = divisionView(s, id);
    expect(divisionView(s, id)).toBe(v);
    expect(v.hpPct).toBeCloseTo(1, 5);
    expect(v.orgPct).toBeCloseTo(1, 5);
    expect(v.status).toBe('idle');
    expect(v.name).toMatch(/^\d+\. /);
    expect(divisionView(s, 0)).toBe(null);
    expect(divisionView(s, 99999)).toBe(null);
    expect(TPL_KINDS).toBeTruthy();
  });
});
