// Rozložení stromu výzkumu jako časové osy (M60): sloupec = rok technologie, dráha = větev. Čistá funkce bez Reactu.
export const COLW = 206, NODEW = 176, NODEH = 64, ROWH = 74, Y0 = 1936;

/** Řádky (dráhy) technologií oboru: dráha prvního předpokladu, je-li ve sloupci roku volná, jinak první volná. Vrací { id → { col, lane }, lanes }. */
export function layoutOf(items) {
  const byYear = [...items].sort((a, b) => a.year - b.year || a.days - b.days || a.id.localeCompare(b.id));
  const pos = {}, used = {};
  let lanes = 0;
  for (const t of byYear) {
    const col = t.year - Y0, taken = used[col] || (used[col] = new Set());
    let lane = -1;
    for (const r of t.req) { const q = pos[r]; if (q && !taken.has(q.lane)) { lane = q.lane; break; } }
    if (lane < 0) { lane = 0; while (taken.has(lane)) lane++; }
    taken.add(lane);
    pos[t.id] = { col, lane };
    lanes = Math.max(lanes, lane + 1);
  }
  return { pos, lanes };
}
