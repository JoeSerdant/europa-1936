// Akce rozhraní: přechody mezi obrazovkami, výběr oblasti, mapové režimy a veškeré povely armádě. Jediné místo, které mění zároveň herní stav,
// stav UI a kameru. Příkazy enginu jsou neutrální (nehlídají, komu jednotka patří) – vlastnictví vůči hráči se kontroluje tady.
import {
  createGame, getWorld, provinceOwner, countryName, findPath, geo, ARMY,
  declareWar, makePeace, orderMove, cancelOrder, disband,
  createArmy, renameArmy, disbandArmy, assignDivisions, createGroup, renameGroup, disbandGroup, assignArmies, assignCommander,
  setPlan, clearPlan, setPlanMode, suggestFront,
  recruit, cancelRecruit, createTemplate, editTemplate, deleteTemplate, validateTemplate,
  justifyWar, startWar, proposePeace, createFaction, inviteToFaction, leaveFaction, warBlock, peaceBlock, inviteBlock, justReady,
  formFleet, disbandFleet, orderFleet, stopFleet, renameFleet, orderSail, sailBlock, navyOf, SHIPS,
  startFocus, cancelFocus, chooseEvent, FOCUS_BY_ID,
  setLaw, hireAdvisor, fireAdvisor, lawBlock, LAWS, ADVISORS,
  startResearch, cancelResearch, researchOf, isUnlocked, TECHS,
  tightenControl, loosenControl, useAbility, abilityBlock, ABILITIES, guarantee, revokeGuarantee, guaranteeBlock, lendLease, lendBlock, lendMax, EQUIP, buildFort, hireAgent, startOp, cancelOp, ackEnd, takeDecision, adoptDoctrine, confPuppet, confAnnex, confSkip, confTake, confTribute, annexPuppet, runCheat, formWing, disbandWing, reinforceWing, setMission, rebaseWing, missionBlock, build, cancelBuild, moveBuild, addLine, setLineFactories, setLineEquip, addTrade, setTradeAmount, cancelTrade, stateIndustry, IND, BUILDINGS,
} from '../engine/index.js';
import { gameStore, uiStore, setUi, NONE } from './store.js';
import { play } from './sound.js';
import { mapController as mc } from './map/controller.js';
import { writeSave, readSave, deleteSave, slotName } from './saves.js';

/** Plochy zakryté panely na jednotlivých obrazovkách (CSS pixely) – kamera středí pohledy do zbytku. */
export const INSETS = {
  menu: { l: 0, r: 0, t: 0, b: 0 },
  select: { l: 336, r: 396, t: 0, b: 0 },
  game: { l: 70, r: 0, t: 56, b: 0 },
  gameDossier: { l: 70, r: 394, t: 56, b: 0 },
};

/** Podle toho, zda je vpravo panel, nastaví volnou plochu pro pohledy kamery. */
export function applyInsets() {
  const u = uiStore.getState();
  if (u.screen !== 'game') return;
  mc.setInsets(u.selected || u.panel ? INSETS.gameDossier : INSETS.game);
}

const FRESH_UI = { selected: 0, hover: 0, mode: 'political', menuOpen: false, selDivs: NONE, hoverUnits: null, panel: null, armyFocus: 0, open: {}, planEdit: null, designer: null, indTab: 'build', techCat: 'all', saveDialog: null, saveMsg: '', overview: false, fleetSel: 0, console: false, toast: null, popups: [], battle: 0 };

/** Nastavení AI zemí pro novou hru (obrazovka výběru země). */
export const setAiOptions = (patch) => setUi(patch);

export function goMenu() {
  gameStore.setState(createGame());
  setUi({ screen: 'menu', helpOpen: false, ...FRESH_UI });
}

export function goSelect() {
  setUi({ screen: 'select', ...FRESH_UI });
}

export function pickCountry(tag, fly = true) {
  if (!getWorld().ownerIdx[tag]) return;
  setUi({ pickTag: tag });
  if (fly) { mc.setInsets(INSETS.select); mc.flyToCountry(tag, 800, 0.3, 2.2); }
}

/** Začne novou hru za zemi `tag` (null = pozorovatel). */
export function startGame(tag) {
  const u = uiStore.getState();
  gameStore.setState(createGame({ player: tag, aiLevel: u.aiLevel, hist: !!u.aiHist, scenario: u.scenario }));
  setUi({ screen: 'game', ...FRESH_UI });
  mc.setInsets(INSETS.game);
  if (tag) mc.flyToCountry(tag, 1100, 0.45, 1.8); else mc.viewEurope(900);
}

/** Označí oblast (provincii nebo moře); prázdné místo, jezero nebo neobsazená pevnina výběr zruší. */
export function selectLabel(l, fly = false) {
  const w = getWorld();
  if (!l || !(w.isLand(l) || w.isSea(l))) { setUi({ selected: 0 }); applyInsets(); return; }
  setUi({ selected: l });
  applyInsets();
  if (fly) mc.flyToLabel(l, 650);
}

export const closeDossier = () => { setUi({ selected: 0 }); applyInsets(); };
/** Zavře celý pravý panel (údaje o oblasti i armádu a nábor). */
export const closeSide = () => { setUi({ selected: 0, panel: null }); applyInsets(); };
/** Schová okno přes celou obrazovku, ale nechá označenou provincii (např. místo nástupu nových divizí). */
export const hideFull = () => { setUi({ panel: null }); applyInsets(); };
export const setMode = (mode) => setUi({ mode });
export const setHelp = (open) => setUi({ helpOpen: !!open });
export const setMenuOpen = (open) => setUi({ menuOpen: !!open });

/** Vlastník oblasti pod klikem na obrazovce výběru země: tag nebo null. */
export function ownerTagAt(l) {
  const w = getWorld();
  if (!w.isLand(l)) return null;
  const idx = provinceOwner(gameStore.getState(), l);
  return idx ? w.owners[idx].tag : null;
}

// ============================================================ pomocné
let popupSeq = 0;
const popupTimers = new Map();
/** Vyskakovací karta oznámení; mizí sama po `POPUP_MS`, kromě „sticky“ (války), které zavře hráč. Nejvýš `POPUP_MAX` karet najednou. */
export const POPUP_MS = 14000, POPUP_MAX = 4;
export function pushPopup(card) {
  const id = ++popupSeq;
  const list = [...uiStore.getState().popups, { ...card, id }];
  while (list.length > POPUP_MAX) { const old = list.shift(); clearTimeout(popupTimers.get(old.id)); popupTimers.delete(old.id); }
  setUi({ popups: list });
  if (!card.sticky) popupTimers.set(id, setTimeout(() => closePopup(id), POPUP_MS));
  play(card.tone === 'bad' ? 'alert' : 'notify');
  return id;
}
export function closePopup(id) {
  clearTimeout(popupTimers.get(id)); popupTimers.delete(id);
  setUi({ popups: uiStore.getState().popups.filter((p) => p.id !== id) });
}
let toastSeq = 0, toastTimer = 0;
/** Krátké oznámení dole uprostřed (zmizí samo). */
export function toast(text) {
  play('notify');
  const id = ++toastSeq;
  setUi({ toast: { id, text } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { const t = uiStore.getState().toast; if (t && t.id === id) setUi({ toast: null }); }, 4200);
}

/** Index země hráče (0 = pozorovatel). */
export function playerIdx(s = gameStore.getState()) {
  return s.player ? getWorld().ownerIdx[s.player] : 0;
}

/** Spustí příkaz nad aktuálním stavem; vrací true, když se stav změnil. */
function run(fn, ...args) {
  const s = gameStore.getState();
  const n = fn(s, ...args);
  if (n === s) return false;
  gameStore.setState(n);
  return true;
}

const sameIds = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// ============================================================ panely
export function openPanel(name) {
  if (uiStore.getState().screen !== 'game') return;
  setUi({ panel: name });
  applyInsets();
}
/** Otevře okno Průmysl na dané záložce (build = Stavby, prod = Výroba, trade = Obchod); stejné tlačítko okno zavře. */
export function toggleIndustry(tab) {
  const u = uiStore.getState();
  if (u.panel === 'industry' && u.indTab === tab) { openPanel(null); return; }
  setUi({ indTab: tab });
  openPanel('industry');
}
export function togglePanel(name) {
  const u = uiStore.getState();
  openPanel(u.panel === name ? null : name);
}

// ============================================================ výběr jednotek
/** Nastaví výběr divizí (pole id). */
export function setSelection(ids) {
  const cur = uiStore.getState().selDivs;
  const next = ids.length ? ids : NONE;
  if (next === cur || sameIds(next, cur)) return;
  setUi({ selDivs: next, armyFocus: 0 });
}
export const clearSelection = () => setSelection(NONE);

// ---- skupiny jednotek (M59): Alt + 1–9 uloží výběr, Shift + 1–9 ho vyvolá (druhé stisknutí zaměří kameru); skupiny žijí jen v rozhraní
const groupSlots = {};
export const unitGroups = () => groupSlots;
export function saveUnitGroup(n) {
  const ids = ownSelected();
  if (!ids.length) { toast('Nejdřív vyberte jednotky.'); return false; }
  groupSlots[n] = ids.slice();
  toast(`Skupina ${n}: ${ids.length} ${ids.length === 1 ? 'divize' : ids.length < 5 ? 'divize' : 'divizí'}.`);
  return true;
}
let lastGroup = { n: 0, t: 0 };
export function recallUnitGroup(n) {
  const s = gameStore.getState();
  const ids = (groupSlots[n] || []).filter((id) => s.mil.divs[id] && s.mil.divs[id].o === playerIdx(s));
  if (!ids.length) { toast(`Skupina ${n} je prázdná.`); return false; }
  groupSlots[n] = ids;
  const again = lastGroup.n === n && performance.now() - lastGroup.t < 600;
  lastGroup = { n, t: performance.now() };
  setSelection(ids);
  if (again) focusSelection();
  return true;
}

/** Vlastní vybrané divize (existující, patřící hráči). */
export function ownSelected(s = gameStore.getState(), sel = uiStore.getState().selDivs) {
  const me = playerIdx(s);
  return me ? sel.filter((id) => { const d = s.mil.divs[id]; return d && d.o === me; }) : [];
}

/** Zruší z výběru divize, které už neexistují (zničené, rozpuštěné). */
export function pruneSelection() {
  const sel = uiStore.getState().selDivs;
  if (!sel.length) return;
  const divs = gameStore.getState().mil.divs;
  const keep = sel.filter((id) => divs[id]);
  if (keep.length !== sel.length) setSelection(keep);
}

export function divisionsOfArmy(s, armyId) {
  const out = [];
  const divs = s.mil.divs;
  for (let id = 1; id < divs.length; id++) if (divs[id] && divs[id].army === armyId) out.push(id);
  return out;
}

/** Klik na žeton: vlastní jednotky se vyberou (Shift přidá/odebere, dvojklik vybere celou armádu), cizí jen k prohlídce. */
export function clickCounter(c, { shift = false, dbl = false } = {}) {
  const s = gameStore.getState();
  const me = playerIdx(s);
  if (!me || c.o !== me) { setSelection(c.ids); return; }
  let ids = c.ids;
  if (dbl) {
    const army = s.mil.divs[c.ids[0]] && s.mil.divs[c.ids[0]].army;
    if (army) ids = divisionsOfArmy(s, army);
  }
  const cur = uiStore.getState().selDivs;
  if (shift && cur.length && ownSelected(s, cur).length === cur.length) {
    const all = ids.every((id) => cur.includes(id));
    setSelection(all ? cur.filter((id) => !ids.includes(id)) : cur.concat(ids.filter((id) => !cur.includes(id))));
  } else setSelection(ids);
}

/** Výběr tažením obdélníku (`ids` z mapy); Shift přidá k dosavadnímu výběru. */
export function boxSelect(ids, { shift = false } = {}) {
  const s = gameStore.getState();
  const mine = ids.filter((id) => s.mil.divs[id]);
  if (!mine.length && !shift) { clearSelection(); return; }
  const cur = shift ? ownSelected(s) : [];
  setSelection(cur.concat(mine.filter((id) => !cur.includes(id))));
}

/** Vybere všechny divize armády (a zaměří ji v panelu). */
export function selectArmy(armyId, { add = false } = {}) {
  const s = gameStore.getState();
  const ids = divisionsOfArmy(s, armyId);
  const cur = add ? uiStore.getState().selDivs : NONE;
  setSelection(cur.concat(ids.filter((id) => !cur.includes(id))));
  setUi({ armyFocus: armyId });
}

export function selectGroup(groupId, { add = false } = {}) {
  const s = gameStore.getState();
  let ids = [];
  for (let a = 1; a < s.mil.armies.length; a++) if (s.mil.armies[a] && s.mil.armies[a].grp === groupId) ids = ids.concat(divisionsOfArmy(s, a));
  const cur = add ? uiStore.getState().selDivs : NONE;
  setSelection(cur.concat(ids.filter((id) => !cur.includes(id))));
}

export function toggleDivision(id, additive) {
  const cur = uiStore.getState().selDivs;
  if (additive) setSelection(cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat([id]));
  else setSelection([id]);
}

/** Rozbalí/sbalí uzel stromu armád (klíč: g<id> skupina, a<id> armáda, 'loose' bez armády). */
export function setOpen(key, open) {
  const cur = uiStore.getState().open;
  if (cur[key] === open) return;
  setUi({ open: { ...cur, [key]: open } });
}

// ============================================================ kamera
const centerOf = (p) => { const g = geo(getWorld()); return [g.cx[p], g.cy[p]]; };

/** Přelétne kamerou k provincii. */
export function focusProvince(p, maxZoom = 2.6) {
  const [x, y] = centerOf(p);
  mc.flyTo(mc.viewForBox([x - 60, y - 45, x + 60, y + 45], 0.4, maxZoom), 600);
}

/** Zaměří kameru na vybrané divize. */
export function focusSelection() {
  const s = gameStore.getState();
  const sel = uiStore.getState().selDivs.filter((id) => s.mil.divs[id]);
  if (!sel.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of sel) { const [x, y] = centerOf(s.mil.divs[id].p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  mc.flyTo(mc.viewForBox([x0 - 50, y0 - 40, x1 + 50, y1 + 40], 0.3, 2.6), 600);
}

// ============================================================ rozkazy
/** Pošle vybrané vlastní divize do provincie (nepřátelská provincie = útok). */
export function orderSelected(prov, { queue = false } = {}) {
  const s = gameStore.getState();
  const ids = ownSelected(s);
  if (!ids.length || !getWorld().isLand(prov)) return false;
  if (!run(orderMove, ids, prov, queue)) {
    if (ids.every((id) => s.mil.divs[id].p === prov || (queue && s.mil.divs[id].path.includes(prov)))) return false;
    if (queue) { toast('Další bod trasy se nepodařilo najít.'); return false; }
    // po souši to nejde: zkusit lodní přepravu (M27)
    const why = sailBlock(s, ids, prov);
    if (!why) {
      if (run(orderSail, ids, prov)) { toast('Divize vyplouvají na moře.'); pruneSelection(); return true; }
      toast('Trasu přes moře se nepodařilo najít (blokáda nebo příliš daleko).');
      return false;
    }
    toast(`Tam se jednotky nedostanou po souši. Lodí: ${why}`);
    return false;
  }
  return true;
}

export function stopSelected() {
  const ids = ownSelected();
  return ids.length ? run(cancelOrder, ids) : false;
}

export function disbandSelected() {
  const ids = ownSelected();
  if (!ids.length) return false;
  const ok = run(disband, ids);
  if (!ok) toast('Divize v boji nelze rozpustit.');
  pruneSelection();
  return ok;
}

/** Náhled trasy pro vedoucí vybranou divizi do provincie `to`: { nodes, attack } nebo null. */
export function routePreview(to) {
  const s = gameStore.getState();
  const ids = ownSelected(s);
  if (!ids.length || !to || !getWorld().isLand(to)) return null;
  const d = s.mil.divs[ids[0]];
  if (!d || d.p === to) return null;
  const path = findPath(s.mil, s.ctrl, d.o, d.p, to);
  if (!path) return null;
  return { nodes: [d.p, ...path], attack: s.ctrl[to] !== d.o };
}

// ============================================================ klik na mapu
/**
 * Levé tlačítko na mapě (mimo žeton): při úpravě plánu přidá/odebere provincii, jinak označí oblast.
 * Klik bez Shiftu zároveň zruší výběr jednotek (jako ve strategiích: klik do prázdna = odznačit).
 */
export function mapClick(l, { shift = false } = {}) {
  const u = uiStore.getState();
  if (u.planEdit) { planPaint(l, { shift }); return; }
  if (!shift && u.selDivs.length) clearSelection();
  selectLabel(l);
}

/** Pravé tlačítko na mapě: rozkaz vybraným vlastním divizím (pohyb, v nepřátelské provincii útok). */
export function contextClick(l, { shift = false } = {}) {
  const u = uiStore.getState();
  if (u.planEdit || !l) return false;
  if (u.fleetSel && getWorld().isSea(l)) return orderFleetTo(l);
  if (!u.selDivs.length) return false;
  return orderSelected(l, { queue: shift });
}

// ============================================================ války
/** Ospravedlní válku proti zemi `tag` (stojí politickou moc a čas). */
export function justifyOn(tag, goal = 'conquest') {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t) return false;
  const why = warBlock(s, me, t);
  if (why) { toast(why); return false; }
  if (!run(justifyWar, me, t, goal)) { toast('Ospravedlnění nejde zahájit (chybí politická moc, nebo už jich běží příliš mnoho).'); return false; }
  toast(`Ospravedlňujete válku: ${countryName(tag)}.`);
  return true;
}

/** Vyhlásí válku zemi `tag` (vyžaduje hotové ospravedlnění); zapojí se bloky. */
export function declareWarOn(tag) {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t || me === t) return false;
  if (!justReady(s, me, t)) { toast('Válka není ospravedlněná – nejdřív ji ospravedlněte (diplomacie, D).'); return false; }
  if (!run(startWar, me, t)) return false;
  play('war');
  toast(`Vyhlásili jste válku: ${countryName(tag)}.`);
  return true;
}

/** Navrhne bílý mír; protivník ho odmítne, když vyhrává. */
export function makePeaceWith(tag) {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t || me === t) return false;
  const why = peaceBlock(s, me, t);
  if (why) { toast(why); return false; }
  if (!run(proposePeace, me, t)) return false;
  toast(`Uzavřen bílý mír: ${countryName(tag)}.`);
  return true;
}

/** Založí blok hráče. */
export function foundBloc(name) {
  const me = playerIdx();
  if (!me) return false;
  if (!run(createFaction, me, name)) { toast('Blok nejde založit (chybí politická moc nebo už v bloku jste).'); return false; }
  toast('Blok založen.');
  return true;
}
/** Pozve zemi do bloku hráče; pozvaný přijme podle vztahů. */
export function inviteBloc(tag) {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t) return false;
  const why = inviteBlock(s, me, t);
  if (why) { toast(why); return false; }
  if (!run(inviteToFaction, me, t)) return false;
  toast(`${countryName(tag)} přijala pozvání do bloku.`);
  return true;
}
export const leaveBloc = () => { const me = playerIdx(); return !!me && run(leaveFaction, me); };

// ============================================================ armády a skupiny
export function newArmy(fromSelection = true) {
  const s = gameStore.getState();
  if (!s.player) return 0;
  const ids = fromSelection ? ownSelected(s) : [];
  const id = s.mil.armies.length;
  if (!run(createArmy, s.player, '', ids)) { toast(`Armáda smí mít nejvýš ${ARMY.ARMY_CAP} divizí.`); return 0; }
  const cur = uiStore.getState();
  setUi({ armyFocus: id, panel: 'army', open: { ...cur.open, [`a${id}`]: true } });
  applyInsets();
  return id;
}

export function addSelectionToArmy(armyId) {
  const ids = ownSelected();
  if (!ids.length) { toast('Nejdřív vyberte divize na mapě nebo v panelu.'); return false; }
  return moveDivisionsToArmy(ids, armyId);
}

export function moveDivisionsToArmy(ids, armyId) {
  const ok = run(assignDivisions, armyId, ids);
  if (!ok) toast(armyId ? `Armáda smí mít nejvýš ${ARMY.ARMY_CAP} divizí.` : 'Divize už jsou bez armády.');
  return ok;
}

export const removeSelectionFromArmy = () => moveDivisionsToArmy(ownSelected(), 0);
export const renameArmyTo = (id, name) => run(renameArmy, id, name);
export function disbandArmyById(id) {
  const ok = run(disbandArmy, id);
  if (ok && uiStore.getState().armyFocus === id) setUi({ armyFocus: 0 });
  return ok;
}

export function newGroup(armyIds = []) {
  const s = gameStore.getState();
  if (!s.player) return 0;
  const id = s.mil.groups.length;
  if (!run(createGroup, s.player, '', armyIds)) { toast(`Skupina armád smí mít nejvýš ${ARMY.GROUP_CAP} armád.`); return 0; }
  return id;
}
export const renameGroupTo = (id, name) => run(renameGroup, id, name);
export const disbandGroupById = (id) => run(disbandGroup, id);
export function moveArmiesToGroup(armyIds, groupId) {
  const ok = run(assignArmies, groupId, armyIds);
  if (!ok) toast(groupId ? `Skupina armád smí mít nejvýš ${ARMY.GROUP_CAP} armád.` : 'Armády už jsou mimo skupiny.');
  return ok;
}

/** Jmenuje velitele armády/skupiny armád (genId 0 = odvolat). */
export function setCommander(kind, id, genId) {
  const ok = run(assignCommander, kind, id, genId);
  if (!ok && genId) toast(kind === 'group' ? 'Skupinu armád smí vést jen polní maršál.' : 'Velitele nelze jmenovat.');
  return ok;
}

// ============================================================ plány
export function startPlanEdit(armyId, kind) {
  const s = gameStore.getState();
  const a = s.mil.armies[armyId];
  if (!a || a.o !== playerIdx(s)) return;
  const cur = a.plan;
  const area = cur && cur.k === 'area' && kind === 'area' ? cur.area.slice() : [];
  const line = cur && cur.k === 'front' && kind === 'front' ? cur.line.slice() : [];
  const to = cur && cur.k === 'front' && kind === 'front' ? cur.to.slice() : [];
  const mode = cur && cur.k === 'front' ? cur.mode : 'balanced';
  setUi({ planEdit: { army: armyId, kind, area, line, to, mode, tool: kind === 'front' ? 'line' : 'area' }, armyFocus: armyId });
}

export function cancelPlanEdit() { setUi({ planEdit: null }); }

export function setPlanTool(tool) {
  const pe = uiStore.getState().planEdit;
  if (pe && pe.tool !== tool) setUi({ planEdit: { ...pe, tool } });
}

export function setEditMode(mode) {
  const pe = uiStore.getState().planEdit;
  if (pe && pe.mode !== mode) setUi({ planEdit: { ...pe, mode } });
}

/** Klik na mapu při úpravě plánu: přidá/odebere provincii (se Shiftem celý stát) do aktivního seznamu. */
export function planPaint(l, { shift = false } = {}) {
  const pe = uiStore.getState().planEdit;
  const w = getWorld();
  if (!pe || !l || !w.isLand(l)) return;
  const tool = pe.tool;
  const group = shift ? w.states[w.land[l].s].v : [l];
  const list = pe[tool];
  const allIn = group.every((p) => list.includes(p));
  let next = allIn ? list.filter((p) => !group.includes(p)) : list.concat(group.filter((p) => !list.includes(p)));
  const patch = { [tool]: next };
  if (!allIn) {                                  // linie a cíle se nepřekrývají
    if (tool === 'line') patch.to = pe.to.filter((p) => !group.includes(p));
    if (tool === 'to') patch.line = pe.line.filter((p) => !group.includes(p));
  }
  setUi({ planEdit: { ...pe, ...patch } });
}

/** Doplní úpravu plánu návrhem podle aktuální fronty v okolí armády. */
export function planSuggest() {
  const pe = uiStore.getState().planEdit;
  if (!pe) return false;
  const sg = suggestFront(gameStore.getState(), pe.army);
  if (!sg.line.length) { toast('V okolí armády není nepřítel – nejdřív vyhlaste válku nebo vyberte provincie ručně.'); return false; }
  setUi({ planEdit: pe.kind === 'area' ? { ...pe, area: sg.line, tool: 'area' } : { ...pe, line: sg.line, to: sg.to, tool: 'line' } });
  return true;
}

export function planClearLists() {
  const pe = uiStore.getState().planEdit;
  if (pe) setUi({ planEdit: { ...pe, area: [], line: [], to: [] } });
}

export function confirmPlan() {
  const pe = uiStore.getState().planEdit;
  if (!pe) return false;
  const plan = pe.kind === 'area' ? { k: 'area', area: pe.area } : { k: 'front', line: pe.line, to: pe.to, mode: pe.mode };
  if (!run(setPlan, pe.army, plan)) { toast(pe.kind === 'area' ? 'Vyberte aspoň jednu provincii k hájení.' : 'Vyberte aspoň jednu provincii linie fronty.'); return false; }
  setUi({ planEdit: null });
  return true;
}

export const clearArmyPlan = (armyId) => run(clearPlan, armyId);
export const setArmyPlanMode = (armyId, mode) => run(setPlanMode, armyId, mode);

// ============================================================ nábor a šablony
/** Provincie, kde se nově zařazené divize objeví: označená vlastní provincie, jinak hlavní město. */
export function recruitSite(s = gameStore.getState(), selected = uiStore.getState().selected) {
  const w = getWorld();
  const me = playerIdx(s);
  if (!me) return 0;
  if (selected && w.isLand(selected) && s.ctrl[selected] === me) return selected;
  return w.owners[me].cap;
}

export function recruitDivisions(tplId, count = 1) {
  const s = gameStore.getState();
  const prov = recruitSite(s);
  if (!prov) return false;
  if (!run(recruit, tplId, prov, count)) { toast('Nelze zařadit do výcviku: chybí lidská síla, výzbroj nebo místo ve výcviku.'); return false; }
  return true;
}
export const cancelTraining = (queueId) => run(cancelRecruit, queueId);

const DEFAULT_DRAFT = () => ({ nm: 'Nová divize', reg: [['pesi', 'pesi', 'pesi'], ['pesi', 'pesi', 'pesi'], ['pesi', 'pesi', 'pesi']], sup: [] });

export function openDesigner(tplId = 0) {
  const s = gameStore.getState();
  const src = tplId ? s.mil.tpl[tplId] : null;
  const draft = src ? { nm: src.nm, reg: src.reg.map((c) => c.slice()), sup: src.sup.slice() } : DEFAULT_DRAFT();
  setUi({ designer: { tplId, draft } });
}
export function closeDesigner() { setUi({ designer: null }); }
export function updateDraft(draft) {
  const d = uiStore.getState().designer;
  if (d) setUi({ designer: { ...d, draft } });
}

/** Uloží šablonu z návrháře (nová nebo úprava). Vrací český popis chyby, nebo null. */
export function saveDesigner() {
  const s = gameStore.getState();
  const d = uiStore.getState().designer;
  if (!d || !s.player) return 'Nelze uložit.';
  const me = playerIdx(s);
  const err = validateTemplate(d.draft, (def) => isUnlocked(s, me, def.unlock));
  if (err) return err;
  const ok = d.tplId ? run(editTemplate, d.tplId, d.draft) : run(createTemplate, s.player, d.draft);
  if (!ok) return d.tplId ? 'Šablonu se nepodařilo upravit.' : `Země smí mít nejvýš ${ARMY.TPL_MAX} šablon.`;
  setUi({ designer: null });
  return null;
}

export function removeTemplate(tplId) {
  const ok = run(deleteTemplate, tplId);
  if (!ok) toast('Šablonu používají divize nebo výcvik – nejdřív je rozpusťte.');
  return ok;
}

export { uiStore };

// ============================================================ průmysl (M19)
// Engine průmysl nehlídá, komu věc patří vůči hráči – to se kontroluje tady (stát, stavba, linka a smlouva musí patřit hráči).
const ownsState = (s, st) => { const me = playerIdx(s); return !!me && s.stateOwner[st] === me && s.ctrl[getWorld().states[st].cap] === me; };

export const setIndTab = (indTab) => setUi({ indTab });

/** Zadá stavbu továrny nebo infrastruktury ve státě hráče; při neúspěchu řekne proč. */
export function buildIn(stateId, kind) {
  const s = gameStore.getState();
  if (!ownsState(s, stateId)) { toast('Stavět lze jen ve vlastním, neokupovaném státě.'); return false; }
  const info = stateIndustry(s, stateId);
  if (kind === 'inf' ? info.inf + info.queued.filter((b) => b.k === 'inf').length >= IND.INF_MAX : info.used >= info.slots) {
    toast(kind === 'inf' ? 'Infrastruktura státu je na nejvyšší úrovni.' : 'Ve státě není volný stavební slot (rozestavěné se počítají).');
    return false;
  }
  if (!run(build, stateId, kind)) { toast('Stavbu se nepodařilo zadat (fronta je plná).'); return false; }
  toast(`${BUILDINGS[kind].n}: stavba zadána.`);
  return true;
}

const ownProject = (s, id) => { const b = s.ind.build.find((x) => x.id === id); return !!b && b.o === playerIdx(s); };
export const cancelProject = (id) => ownProject(gameStore.getState(), id) && run(cancelBuild, id);
export const moveProject = (id, dir) => ownProject(gameStore.getState(), id) && run(moveBuild, id, dir);

const ownLine = (s, id) => { const l = s.ind.lines.find((x) => x.id === id); return !!l && l.o === playerIdx(s); };
/** Nová linka výroby s jednou továrnou (nebo `fac`). */
export function newLine(eq, fac = 1) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me) return false;
  if (!run(addLine, me, eq, fac)) { toast('Nová linka nejde založit: chybí volná vojenská továrna nebo je linek příliš mnoho.'); return false; }
  return true;
}
export function setLineFac(id, fac) {
  if (!ownLine(gameStore.getState(), id)) return false;
  if (!run(setLineFactories, id, fac)) { toast('Továrny nejdou přidat – žádná není volná.'); return false; }
  return true;
}
export const setLineEq = (id, eq) => ownLine(gameStore.getState(), id) && run(setLineEquip, id, eq);

/** Obchodní smlouva: `out` = hráč vyváží, jinak dováží od partnera. */
export function newTrade(partner, res, amt, out) {
  const me = playerIdx();
  if (!me || !partner) return false;
  const ok = out ? run(addTrade, me, partner, res, amt) : run(addTrade, partner, me, res, amt);
  if (!ok) toast('Smlouvu nelze uzavřít (válka, příliš mnoho smluv nebo neplatné množství).');
  return ok;
}
const ownTrade = (s, id) => { const d = s.ind.trade.find((x) => x.id === id); const me = playerIdx(s); return !!d && (d.from === me || d.to === me); };
export const changeTrade = (id, amt) => ownTrade(gameStore.getState(), id) && run(setTradeAmount, id, amt);
export const dropTrade = (id) => ownTrade(gameStore.getState(), id) && run(cancelTrade, id);

// ============================================================ výzkum (M20)
export const setTechCat = (techCat) => setUi({ techCat });

/** Zadá výzkum technologie do prvního volného slotu hráče (nebo do slotu `slot`); při neúspěchu řekne proč. */
export function researchTech(id, slot = -1) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me || !TECHS[id]) return false;
  const r = researchOf(s, me);
  const target = slot >= 0 ? slot : r.slots.findIndex((x) => !x.id);
  if (target < 0) { toast('Všechny sloty výzkumu jsou obsazené. Zrušte některý, nebo zadejte technologii přímo do slotu.'); return false; }
  if (r.slots.some((x) => x.id === id)) { toast('Tato technologie se už zkoumá.'); return false; }
  if (!run(startResearch, me, target, id)) { toast('Technologii zatím nelze zkoumat (chybí předpoklady).'); return false; }
  return true;
}
export const stopResearch = (slot) => { const me = playerIdx(); return !!me && run(cancelResearch, me, slot); };

// ============================================================ politika (M21)
/** Změní zákon hráče (stojí politickou moc); při neúspěchu napíše důvod. */
export function changeLaw(cat, id) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me) return false;
  const why = lawBlock(s.pol.own[me], cat, id);
  if (why) { toast(why); return false; }
  const ok = run(setLaw, me, cat, id);
  if (ok) toast(`Zákon „${LAWS[cat][id].n}“ je v platnosti.`);
  return ok;
}
/** Najme poradce do slotu hráče; při nedostatku politické moci napíše důvod. */
export function hireAdv(slot, id) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me || !ADVISORS[id]) return false;
  if (s.pol.own[me].pp < ADVISORS[id].pp) { toast(`Chybí politická moc (${Math.ceil(ADVISORS[id].pp - s.pol.own[me].pp)}).`); return false; }
  const ok = run(hireAdvisor, me, slot, id);
  if (ok) toast(`${ADVISORS[id].n} nastoupil do služby.`);
  return ok;
}
export const dismissAdv = (slot) => { const me = playerIdx(); return !!me && run(fireAdvisor, me, slot); };

// ============================================================ národní cíle a události (M22)
/** Zahájí plnění cíle hráče; nahradí rozpracovaný cíl. */
export function pickFocus(id) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me) return false;
  const cur = s.nat.own[me].cur;
  if (cur && cur.id !== id) { if (!run(cancelFocus, me)) return false; }
  const ok = run(startFocus, me, id);
  if (!ok) toast('Tento cíl zatím nejde zahájit.');
  else toast(`Cíl „${FOCUS_BY_ID[id].n}“ se plní.`);
  return ok;
}
export const abortFocus = () => { const me = playerIdx(); return !!me && run(cancelFocus, me); };
/** Rozhodne událost hráče volbou `choice`. */
export function decideEvent(id, choice) {
  const me = playerIdx();
  return !!me && run(chooseEvent, me, id, choice);
}

// ============================================================ uložené hry (M25)
export const openSaveDialog = (mode) => setUi({ saveDialog: mode, saveMsg: '' });
export const closeSaveDialog = () => setUi({ saveDialog: null, saveMsg: '' });

/** Uloží hru do slotu; při chybě ohlásí důvod. */
export function saveGame(slot) {
  const s = gameStore.getState();
  const err = writeSave(slot, s, new Date().toLocaleString('cs-CZ'));
  if (err) { setUi({ saveMsg: err }); toast(err); return false; }
  setUi({ saveMsg: `Hra uložena: ${slotName(slot)}.` });
  toast(`Hra uložena: ${slotName(slot)}.`);
  return true;
}

/** Načte hru ze slotu a přepne do hry; při chybě ohlásí důvod a nic nezmění. */
export function loadGame(slot) {
  const res = readSave(slot);
  if (res.error) { setUi({ saveMsg: res.error }); toast(res.error); return false; }
  gameStore.setState(res.state);
  setUi({ screen: 'game', helpOpen: false, ...FRESH_UI });
  mc.setInsets(INSETS.game);
  if (res.state.player) mc.flyToCountry(res.state.player, 900, 0.45, 1.8); else mc.viewEurope(700);
  toast(`Hra načtena: ${slotName(slot)}.`);
  return true;
}
export const removeSave = (slot) => { deleteSave(slot); setUi({ saveMsg: '' }); };

/** Rychlé uložení a načtení (F6 / F9). */
export const quickSave = () => (uiStore.getState().screen === 'game' ? saveGame('quick') : false);
export const quickLoad = () => loadGame('quick');

// ============================================================ přehled zemí (M26)
export const openBattle = (id) => setUi({ battle: id });
export const closeBattle = () => setUi({ battle: 0 });
export const openOverview = () => setUi({ overview: true });
export const closeOverview = () => setUi({ overview: false });
/** Zavře přehled a ukáže hlavní město země `o` (označí provincii a přeletí kamerou). */
export function selectCountryCapital(o) {
  const cap = getWorld().owners[o].cap;
  setUi({ overview: false });
  if (uiStore.getState().screen === 'game') selectLabel(cap, true);
}

// ============================================================ námořnictvo (M27)
const ownFleet = (s, id) => { const f = s.nav.fleets[id]; return f && f.o === playerIdx(s) ? f : null; };

/** Klik na námořní žeton: vlastní flotila se vybere (opakovaný klik přepíná mezi flotilami v oblasti), cizí se jen popíše. */
export function clickFleet(t) {
  const s = gameStore.getState(), me = playerIdx(s);
  const own = t.o === me;
  if (!own) { toast(`Cizí flotila: ${t.n} lodí, ${getWorld().owners[t.o].name}.`); return; }
  const cur = uiStore.getState().fleetSel;
  const i = t.ids.indexOf(cur);
  const next = t.ids[(i + 1) % t.ids.length];
  setUi({ fleetSel: next, selDivs: NONE, panel: 'navy' });
  applyInsets();
}
export const selectFleet = (id) => setUi({ fleetSel: id });

/** Pošle vybranou vlastní flotilu do mořské oblasti `label`. */
export function orderFleetTo(label) {
  const s = gameStore.getState();
  const id = uiStore.getState().fleetSel;
  if (!ownFleet(s, id)) return false;
  if (!run(orderFleet, id, label)) { toast('Flotila se tam nedostane (už tam je, nebo cesta neexistuje).'); return false; }
  return true;
}
export const stopSelectedFleet = () => { const id = uiStore.getState().fleetSel; return ownFleet(gameStore.getState(), id) ? run(stopFleet, id) : false; };
export function disbandSelectedFleet() {
  const id = uiStore.getState().fleetSel;
  if (!ownFleet(gameStore.getState(), id)) return false;
  if (!run(disbandFleet, id)) { toast('Flotilu jde rozpustit jen v domovském přístavu.'); return false; }
  setUi({ fleetSel: 0 });
  return true;
}
export const renameSelectedFleet = (nm) => { const id = uiStore.getState().fleetSel; return ownFleet(gameStore.getState(), id) ? run(renameFleet, id, nm) : false; };

/** Sestaví flotilu hráče z lodí v rezervě. */
export function newFleet(ships, nm = '') {
  const me = playerIdx();
  if (!me) return false;
  const before = gameStore.getState().nav.fn;
  if (!run(formFleet, me, ships, nm)) { toast('Flotilu nejde sestavit (nejsou lodě, příliš mnoho flotil nebo chybí přístav).'); return false; }
  setUi({ fleetSel: before + 1 });
  return true;
}

// ============================================================ konzole (cheaty)
export const toggleConsole = () => setUi({ console: !uiStore.getState().console });
export const closeConsole = () => setUi({ console: false });
/** Provede příkaz konzole nad živým stavem a vrátí hlášku. */
export function runConsole(text) {
  const s = gameStore.getState();
  const r = runCheat(s, text);
  if (r.state !== s) {
    gameStore.setState(r.state);
    if (r.state.player !== s.player) setUi({ selected: 0, panel: null, selDivs: NONE, fleetSel: 0 });
  }
  return r.msg;
}

// ============================================================ letectvo (M30)
const myWing = (id) => { const s = gameStore.getState(), w = s.air.wings[id]; return w && w.o === playerIdx(s) ? w : null; };
export const formAirWing = (t, n, st) => !!playerIdx() && run(formWing, playerIdx(), t, n, st);
export const disbandAirWing = (id) => !!myWing(id) && run(disbandWing, id);
export const reinforceAirWing = (id, n) => !!myWing(id) && run(reinforceWing, id, n);
export const rebaseAirWing = (id, st) => !!myWing(id) && run(rebaseWing, id, st);
export const setAirMission = (id, m, to) => !!myWing(id) && run(setMission, id, m, to);

// ============================================================ loutky a mírová konference (M33)
export const conferencePuppet = (id) => run(confPuppet, id);
export const conferenceAnnex = (id) => run(confAnnex, id);
export const conferenceSkip = (id) => run(confSkip, id);
export const conferenceTake = (id) => run(confTake, id);
export const conferenceTribute = (id) => run(confTribute, id);
export const annexOwnPuppet = (tag) => { const me = playerIdx(), t = getWorld().ownerIdx[tag]; return !!me && !!t && run(annexPuppet, me, t); };

// ============================================================ autonomie loutek (M55)
export const tightenPuppet = (tag) => { const me = playerIdx(), t = getWorld().ownerIdx[tag]; return !!me && !!t && run(tightenControl, me, t); };
export const loosenPuppet = (tag) => { const me = playerIdx(), t = getWorld().ownerIdx[tag]; return !!me && !!t && run(loosenControl, me, t); };

// ============================================================ schopnosti armád (M53)
export function armyAbility(armyId, id) {
  const s = gameStore.getState(), me = playerIdx(s);
  if (!me) return false;
  const why = abilityBlock(s, me, armyId, id);
  if (why) { toast(why); return false; }
  if (!run(useAbility, me, armyId, id)) return false;
  toast(`${ABILITIES[id].n}: aktivní ${ABILITIES[id].days} dní.`);
  return true;
}

// ============================================================ záruky nezávislosti (M48)
export function guaranteeFor(tag) {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t) return false;
  const why = guaranteeBlock(s, me, t);
  if (why) { toast(why); return false; }
  if (!run(guarantee, me, t)) return false;
  toast(`Zaručujete nezávislost: ${countryName(tag)}.`);
  return true;
}
export const revokeGuaranteeFor = (tag) => { const me = playerIdx(), t = getWorld().ownerIdx[tag]; return !!me && !!t && run(revokeGuarantee, me, t); };

// ============================================================ půjčka a pronájem (M47)
export function lendTo(tag, eq) {
  const s = gameStore.getState(), me = playerIdx(s), t = getWorld().ownerIdx[tag];
  if (!me || !t) return false;
  const n = lendMax(s, me, eq);
  const why = lendBlock(s, me, t, eq, n);
  if (why) { toast(why); return false; }
  if (!run(lendLease, me, t, eq, n)) return false;
  toast(`Odesláno: ${EQUIP[eq].n} × ${n} (${countryName(tag)}).`);
  return true;
}

// ============================================================ doktríny (M34)
export const adoptDoc = (id) => !!playerIdx() && run(adoptDoctrine, playerIdx(), id);

// ============================================================ rozhodnutí (M35)
export const useDecision = (id) => { const ok = !!playerIdx() && run(takeDecision, playerIdx(), id); if (ok) toast('Rozhodnutí provedeno.'); return ok; };

// ============================================================ konec hry (M36)
export const ackGameEnd = () => run(ackEnd);

// ============================================================ zpravodajství (M41)
export const hireSpy = () => !!playerIdx() && run(hireAgent, playerIdx());
export const beginOp = (k, t) => { const ok = !!playerIdx() && run(startOp, playerIdx(), k, t); if (ok) toast('Operace zahájena.'); return ok; };
export const abortOp = (id) => !!playerIdx() && run(cancelOp, playerIdx(), id);

// ============================================================ pevnosti (M42)
export const buildFortHere = (p) => { const me = playerIdx(); const ok = !!me && run(buildFort, p); if (ok) toast('Pevnost: stavba zadána.'); return ok; };
