// Akce rozhraní: přechody mezi obrazovkami, výběr oblasti, mapové režimy a veškeré povely armádě. Jediné místo, které mění zároveň herní stav,
// stav UI a kameru. Příkazy enginu jsou neutrální (nehlídají, komu jednotka patří) – vlastnictví vůči hráči se kontroluje tady.
import {
  createGame, getWorld, provinceOwner, countryName, findPath, geo, ARMY,
  declareWar, makePeace, orderMove, cancelOrder, disband,
  createArmy, renameArmy, disbandArmy, assignDivisions, createGroup, renameGroup, disbandGroup, assignArmies, assignCommander,
  setPlan, clearPlan, setPlanMode, suggestFront,
  recruit, cancelRecruit, createTemplate, editTemplate, deleteTemplate, validateTemplate,
} from '../engine/index.js';
import { gameStore, uiStore, setUi, NONE } from './store.js';
import { mapController as mc } from './map/controller.js';

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

const FRESH_UI = { selected: 0, hover: 0, mode: 'political', menuOpen: false, selDivs: NONE, hoverUnits: null, panel: null, armyFocus: 0, open: {}, planEdit: null, designer: null, toast: null };

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
  gameStore.setState(createGame({ player: tag }));
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
let toastSeq = 0, toastTimer = 0;
/** Krátké oznámení dole uprostřed (zmizí samo). */
export function toast(text) {
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
export function orderSelected(prov) {
  const s = gameStore.getState();
  const ids = ownSelected(s);
  if (!ids.length || !getWorld().isLand(prov)) return false;
  if (!run(orderMove, ids, prov)) {
    if (ids.every((id) => s.mil.divs[id].p === prov)) return false;
    toast('Tam se jednotky nedostanou (moře, průliv nebo cizí neutrální území).');
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
export function contextClick(l) {
  const u = uiStore.getState();
  if (u.planEdit || !u.selDivs.length || !l) return false;
  return orderSelected(l);
}

// ============================================================ války
export function declareWarOn(tag) {
  const s = gameStore.getState();
  if (!s.player || !tag || tag === s.player) return false;
  if (!run(declareWar, s.player, tag)) return false;
  toast(`Vyhlásili jste válku: ${countryName(tag)}.`);
  return true;
}

export function makePeaceWith(tag) {
  const s = gameStore.getState();
  if (!s.player || !tag || tag === s.player) return false;
  if (!run(makePeace, s.player, tag)) return false;
  toast(`Uzavřen bílý mír: ${countryName(tag)}.`);
  return true;
}

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
  const err = validateTemplate(d.draft);
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
