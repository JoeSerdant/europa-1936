// Popisky mapy: zeměpisný střed souvislé skupiny provincií (pro názvy zemí a států). Čisté funkce nad světem.

function components(world, list) {
  const inSet = new Set(list), seen = new Set(), comps = [];
  for (const p of list) {
    if (seen.has(p)) continue;
    const comp = [];
    const stack = [p];
    seen.add(p);
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      world.forLandNeighbors(u, (q) => { if (inSet.has(q) && !seen.has(q)) { seen.add(q); stack.push(q); } });
    }
    comps.push(comp);
  }
  return comps;
}

// těžiště vážené plochou, kotva = nejbližší bod popisku některé provincie, obálka souvislé skupiny
function describe(world, comp) {
  let sx = 0, sy = 0, sa = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of comp) {
    const o = world.land[p];
    const a = Math.max(1, world.area[p]);
    sx += o.c[0] * a; sy += o.c[1] * a; sa += a;
    if (o.b[0] < x0) x0 = o.b[0]; if (o.b[1] < y0) y0 = o.b[1]; if (o.b[2] > x1) x1 = o.b[2]; if (o.b[3] > y1) y1 = o.b[3];
  }
  const mx = sx / sa, my = sy / sa;
  let best = comp[0], bd = Infinity;
  for (const p of comp) { const c = world.land[p].c; const d = (c[0] - mx) ** 2 + (c[1] - my) ** 2; if (d < bd) { bd = d; best = p; } }
  const c = world.land[best].c;
  return { x: c[0], y: c[1], w: x1 - x0, h: y1 - y0, area: sa, prov: best, n: comp.length };
}

/** Popisky zemí podle aktuálních vlastníků: pole { idx, tag, name, x, y, w, h } (největší souvislá část země). */
export function countryLabels(world, game) {
  const byOwner = Array.from({ length: world.owners.length }, () => []);
  for (let p = 1; p <= world.L; p++) byOwner[game ? game.stateOwner[world.provState[p]] : world.provOwner0[p]].push(p);
  const out = [];
  byOwner.forEach((list, idx) => {
    if (!idx || !list.length) return;
    const comps = components(world, list).map((c) => describe(world, c));
    comps.sort((a, b) => b.area - a.area);
    const d = comps[0];
    const o = world.owners[idx];
    out.push({ idx, tag: o.tag, name: o.name, x: d.x, y: d.y, w: d.w, h: d.h, n: list.length });
  });
  return out;
}

/** Popisky států (statické podle počátečního stavu): pole podle id státu. */
export function stateLabels(world) {
  const out = new Array(world.states.length).fill(null);
  for (let s = 1; s < world.states.length; s++) {
    const st = world.states[s];
    const comps = components(world, st.v).map((c) => describe(world, c));
    comps.sort((a, b) => b.area - a.area);
    const d = comps[0];
    out[s] = { id: s, name: st.n, x: d.x, y: d.y, w: d.w, h: d.h };
  }
  return out;
}
