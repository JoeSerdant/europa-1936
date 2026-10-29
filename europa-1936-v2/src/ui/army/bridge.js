// Spojení stavu hry a rozhraní s vrstvou jednotek na mapě: výběr, zvýraznění pod kurzorem, plán armády a náhled trasy.
// Běží mimo React (předplatné obou úložišť) a ovladači předává jen to, co se opravdu změnilo.
import { gameStore, uiStore, setUi, NONE } from '../store.js';
import { mapController as mc } from '../map/controller.js';
import { pruneSelection, routePreview } from '../actions.js';

/** Armáda, jejíž plán se má ukázat: zvolená v panelu, jinak armáda, do které patří všechny vybrané divize. */
export function focusedArmy(u, g) {
  if (u.planEdit) return u.planEdit.army;
  if (u.armyFocus) return u.armyFocus;
  let army = -1;
  for (const id of u.selDivs) {
    const d = g.mil.divs[id];
    const a = d ? d.army : 0;
    if (army === -1) army = a; else if (army !== a) return 0;
  }
  return army > 0 ? army : 0;
}

/** Pohled na plán pro mapu: { area, line, to } nebo null. Při úpravě plánu se ukazují rozpracované seznamy. */
export function planViewOf(u, g) {
  if (u.planEdit) return { area: u.planEdit.area, line: u.planEdit.line, to: u.planEdit.to };
  const army = focusedArmy(u, g);
  const a = army ? g.mil.armies[army] : null;
  if (!a || !a.plan) return null;
  return a.plan.k === 'area' ? { area: a.plan.area, line: NONE, to: NONE } : { area: NONE, line: a.plan.line, to: a.plan.to };
}

export function connectArmyOverlay() {
  let last = { selDivs: null, hoverUnits: null, hover: -1, planEdit: null, armyFocus: -1 };
  let lastDivs = null;
  let viewKey = [null, -1];                         // [objekt plánu nebo úpravy, armáda] – nový pohled jen při změně
  const sync = () => {
    const u = uiStore.getState(), g = gameStore.getState();
    if (u.selDivs !== last.selDivs) mc.setSelection(u.selDivs);
    if (u.hoverUnits !== last.hoverUnits) mc.setHoverUnits(u.hoverUnits);
    if (u.fleetSel !== last.fleetSel) mc.setFleetSel(u.fleetSel);
    if (g.mil.divs !== lastDivs) { lastDivs = g.mil.divs; pruneSelection(); }
    if (u.fleetSel && !g.nav.fleets[u.fleetSel]) setUi({ fleetSel: 0 });
    // plán armády
    const army = focusedArmy(u, g);
    const src = u.planEdit ? u.planEdit : army && g.mil.armies[army] ? g.mil.armies[army].plan : null;
    if (src !== viewKey[0] || army !== viewKey[1]) {
      viewKey = [src, army];
      mc.setPlanView(planViewOf(u, g));
    }
    // náhled trasy: jen s vybranými vlastními jednotkami a bez úpravy plánu
    if (u.hover !== last.hover || u.selDivs !== last.selDivs || u.planEdit !== last.planEdit) {
      mc.setRoute(u.selDivs.length && !u.planEdit && u.hover ? routePreview(u.hover) : null);
    }
    last = { fleetSel: u.fleetSel, selDivs: u.selDivs, hoverUnits: u.hoverUnits, hover: u.hover, planEdit: u.planEdit, armyFocus: u.armyFocus };
  };
  const offUi = uiStore.subscribe(sync);
  const offGame = gameStore.subscribe(sync);
  sync();
  return () => { offUi(); offGame(); mc.setSelection(NONE); mc.setFleetSel(0); mc.setHoverUnits(null); mc.setPlanView(null); mc.setRoute(null); };
}
