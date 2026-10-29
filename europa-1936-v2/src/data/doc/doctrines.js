// Doktríny (M34): tři větve (pozemní, letecká, námořní), v každé tři směry po třech stupních. V každé větvi lze zvolit jediný směr (první stupeň ho určí).
// Vlastní názvy a čísla. `mod` = součet bonusů k odpovídajícím vzorcům (klíče viz engine/doc/core.js).
export const BRANCHES = {
  land: { n: 'Pozemní doktríny', xp: 'Zkušenosti armády', icon: 'army' },
  air: { n: 'Letecké doktríny', xp: 'Zkušenosti letectva', icon: 'air' },
  sea: { n: 'Námořní doktríny', xp: 'Zkušenosti námořnictva', icon: 'navy' },
};
export const BRANCH_IDS = Object.keys(BRANCHES);

const lv = (track, i, n, mod, info) => ({ id: `${track}${i}`, n, mod, info });

export const TRACKS = {
  masa: { branch: 'land', n: 'Masová pěchota', info: 'Převaha počtu: silnější útok pěchoty.', levels: [
    lv('masa', 1, 'Hromadné nasazení', { atk: 0.03 }, 'Útok divizí +3 %.'),
    lv('masa', 2, 'Útočné vlny', { atkInf: 0.05 }, 'Útok pěchoty +5 %.'),
    lv('masa', 3, 'Nekompromisní tlak', { atk: 0.05 }, 'Útok divizí +5 %.'),
  ] },
  obrana: { branch: 'land', n: 'Pevná obrana', info: 'Opevněná fronta: odolnější divize.', levels: [
    lv('obrana', 1, 'Opevněná fronta', { def: 0.05 }, 'Obrana divizí +5 %.'),
    lv('obrana', 2, 'Hlubinná obrana', { defInf: 0.06 }, 'Obrana pěchoty +6 %.'),
    lv('obrana', 3, 'Pružná obrana', { def: 0.06, hillDef: 0.05 }, 'Obrana +6 %, v kopcích a horách navíc +5 %.'),
  ] },
  pruraz: { branch: 'land', n: 'Rychlý průlom', info: 'Obrněné údery a manévr.', levels: [
    lv('pruraz', 1, 'Motorizované předvoje', { atkArm: 0.05 }, 'Útok obrněných +5 %.'),
    lv('pruraz', 2, 'Hloubka operace', { atk: 0.03, atkArm: 0.05 }, 'Útok +3 %, obrněných dalších +5 %.'),
    lv('pruraz', 3, 'Bleskový průlom', { atk: 0.03, atkArm: 0.08 }, 'Útok +3 %, obrněných dalších +8 %.'),
  ] },
  podpora: { branch: 'air', n: 'Podpora pozemních sil', info: 'Letadla v boji s armádou.', levels: [
    lv('podpora', 1, 'Spolupráce s armádou', { cas: 0.1 }, 'Bonus podpory boje +10 %.'),
    lv('podpora', 2, 'Přímá podpora', { cas: 0.15 }, 'Bonus podpory boje +15 %.'),
    lv('podpora', 3, 'Letecké dělostřelectvo', { cas: 0.2 }, 'Bonus podpory boje +20 %.'),
  ] },
  nadvlada: { branch: 'air', n: 'Vzdušná převaha', info: 'Stíhači vládnou obloze.', levels: [
    lv('nadvlada', 1, 'Hlídkové lety', { patrol: 0.08 }, 'Síla hlídek +8 %.'),
    lv('nadvlada', 2, 'Řízení stíhačů', { patrol: 0.1 }, 'Síla hlídek +10 %.'),
    lv('nadvlada', 3, 'Radarová síť', { patrol: 0.12 }, 'Síla hlídek +12 %.'),
  ] },
  strategie: { branch: 'air', n: 'Strategické bombardování', info: 'Údery na zázemí.', levels: [
    lv('strategie', 1, 'Plošné nálety', { bomb: 0.12 }, 'Účinek bombardování +12 %.'),
    lv('strategie', 2, 'Přesné zaměřování', { bomb: 0.16 }, 'Účinek bombardování +16 %.'),
    lv('strategie', 3, 'Bombardovací proudy', { bomb: 0.2 }, 'Účinek bombardování +20 %.'),
  ] },
  flotila: { branch: 'sea', n: 'Bitevní flotila', info: 'Rozhodující střet loďstev.', levels: [
    lv('flotila', 1, 'Palebná kázeň', { fire: 0.06 }, 'Palebná síla flotil +6 %.'),
    lv('flotila', 2, 'Řízení palby', { fire: 0.08 }, 'Palebná síla flotil +8 %.'),
    lv('flotila', 3, 'Námořní nadvláda', { fire: 0.1 }, 'Palebná síla flotil +10 %.'),
  ] },
  obchod: { branch: 'sea', n: 'Obchodní válka', info: 'Nájezdy na konvoje.', levels: [
    lv('obchod', 1, 'Hlídkové ponorky', { raid: 0.1 }, 'Nájezdy na konvoje +10 %.'),
    lv('obchod', 2, 'Vlčí smečky', { raid: 0.15 }, 'Nájezdy na konvoje +15 %.'),
    lv('obchod', 3, 'Neomezená válka', { raid: 0.2 }, 'Nájezdy na konvoje +20 %.'),
  ] },
  eskorta: { branch: 'sea', n: 'Ochrana konvojů', info: 'Eskorta a protiponorkový boj.', levels: [
    lv('eskorta', 1, 'Eskortní skupiny', { escort: 0.15 }, 'Krytí konvojů +15 %.'),
    lv('eskorta', 2, 'Hlubinné pumy', { escort: 0.2 }, 'Krytí konvojů +20 %.'),
    lv('eskorta', 3, 'Letecké krytí', { escort: 0.25 }, 'Krytí konvojů +25 %.'),
  ] },
};
export const TRACK_IDS = Object.keys(TRACKS);
export const DOCTRINES = Object.fromEntries(TRACK_IDS.flatMap((t) => TRACKS[t].levels.map((l, i) => [l.id, { ...l, track: t, branch: TRACKS[t].branch, level: i + 1 }])));
