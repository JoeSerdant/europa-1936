import * as W from './statesWest.js';
import * as N from './statesNorthEast.js';
import * as E from './statesEast.js';
import { EXTRA, NEW } from './statesWorld.js';

// tag -> [[název, lon, lat, opts?], ...]  (W1: doplněné kolonie EXTRA a nové země světa NEW)
const BASE = {
  GER: W.GER, FRA: W.FRA, ENG: W.ENG, IRE: W.IRE, HOL: W.HOL, BEL: W.BEL, LUX: W.LUX, SWI: W.SWI, AUS: W.AUS,
  ITA: W.ITA, SPR: W.SPR, POR: W.POR,
  DEN: N.DEN, NOR: N.NOR, SWE: N.SWE, FIN: N.FIN, EST: N.EST, LAT: N.LAT, LIT: N.LIT, POL: N.POL, CZE: N.CZE,
  HUN: N.HUN, ROM: N.ROM, YUG: N.YUG, BUL: N.BUL, GRE: N.GRE, ALB: N.ALB, TUR: N.TUR, ICE: N.ICE,
  SOV: E.SOV, EGY: E.EGY, IRQ: E.IRQ, PER: E.PER, SAU: E.SAU, OMA: E.OMA,
};
export const STATE_SEEDS = { ...BASE, ...NEW };
for (const [tag, list] of Object.entries(EXTRA)) STATE_SEEDS[tag] = [...(BASE[tag] || []), ...list];
