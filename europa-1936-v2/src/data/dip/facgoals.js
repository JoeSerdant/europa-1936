// S10: společné cíle bloků (vlastní obdoba cílů frakcí z HOI4). Vedoucí bloku zvolí až `DIP.FAC_GOAL_SLOTS` cílů; splněný cíl
// (kontroluje `facGoalsDay` týdně) dává trvalý bonus všem členům bloku (`mod` s klíči z `NO_POL`, čte `polModsOf`).
//  druhy (`kind`): divs = divize členů, fac = továrny (civilní + vojenské), ships = lodě ve flotilách, planes = letadla v křídlech,
//  mem = počet členů, vp = vítězné body v provinciích, které členové ovládají.
export const FAC_GOALS = {
  armada: { n: 'Společná armáda', info: 'Členové bloku mají dohromady aspoň 200 divizí.', kind: 'divs', v: 200, mod: { man: 0.05 }, icon: 'army', ai: 3 },
  arzenal: { n: 'Arzenál bloku', info: 'Členové bloku mají dohromady aspoň 200 továren.', kind: 'fac', v: 200, mod: { prod: 0.03 }, icon: 'industry', ai: 3 },
  more: { n: 'Vláda nad moři', info: 'Flotily členů bloku mají dohromady aspoň 150 lodí.', kind: 'ships', v: 150, mod: { research: 0.03 }, icon: 'navy', ai: 2 },
  nebe: { n: 'Nadvláda ve vzduchu', info: 'Letecká křídla členů bloku mají dohromady aspoň 3000 letadel.', kind: 'planes', v: 3000, mod: { research: 0.02, prod: 0.02 }, icon: 'air', ai: 2 },
  aliance: { n: 'Široká aliance', info: 'Blok má aspoň 5 členů.', kind: 'mem', v: 5, mod: { stab: 0.05 }, icon: 'handshake', ai: 1 },
  sfera: { n: 'Sféra vlivu', info: 'Členové bloku ovládají území s aspoň 1500 vítěznými body.', kind: 'vp', v: 1500, mod: { build: 0.05 }, icon: 'crown', ai: 2 },
};
export const FAC_GOAL_IDS = Object.keys(FAC_GOALS);
