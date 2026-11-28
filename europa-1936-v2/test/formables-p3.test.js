// P3: formovatelné národy, poradci dalších zemí a další cíle.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, takeDecision, decisionBlock, FORMABLES, countryTitle, formOf, transferState, FOCUS_BY_ID } from '../src/engine/index.js';
import { TECHS } from '../src/data/research/techs.js';
import { FOCUS_TREES } from '../src/data/nat/focuses.js';

const W = getWorld();
const capState = (tag) => W.provState[W.owners[W.ownerIdx[tag]].cap];

describe('P3: formovatelné národy', () => {
  it('všichni členové existují; vyhlásit lze až s hlavními městy ostatních', () => {
    for (const [id, F] of Object.entries(FORMABLES)) for (const t of F.members) expect(W.ownerIdx[t], `${id}: ${t}`).toBeTruthy();
    let s = createGame({ player: 'SWE' });
    const SWE = W.ownerIdx.SWE;
    s = { ...s, pol: { ...s.pol, own: s.pol.own.map((x, i) => (i === SWE ? { ...x, pp: 300 } : x)) } };
    expect(decisionBlock(s, SWE, 'form_scand')).toMatch(/hlavní město/);
    s = transferState(transferState(s, capState('NOR'), 'SWE'), capState('DEN'), 'SWE');
    expect(decisionBlock(s, SWE, 'form_scand')).toBe(null);
    const t = takeDecision(s, SWE, 'form_scand');
    expect(formOf(t, SWE)).toBe('scand');
    expect(countryTitle(t, SWE)).toBe('Skandinávská unie');
    expect(decisionBlock(t, SWE, 'form_scand')).toBeTruthy();
  });
});

describe('P3: další cíle', () => {
  it('nové cíle mají existující předpoklady a technologie', () => {
    for (const tree of Object.values(FOCUS_TREES)) for (const f of tree) {
      if (!/_p[23]/.test(f.id)) continue;
      for (const r of [...f.req, ...f.any]) expect(FOCUS_BY_ID[r], `${f.id} → ${r}`).toBeTruthy();
      for (const e of f.fx) if (e.t === 'boost') expect(TECHS[e.id], `${f.id}: ${e.id}`).toBeTruthy();
    }
  });
});
