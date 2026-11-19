// Zimní válka (F3): průběh války SSSR–Finsko po dnech – kolik provincií a států Finska drží SSSR, kdy Finsko kapituluje a co z něj zbude;
// potom pokračovací válka 1941 (válčí Finsko se SSSR po boku Německa?). Výstup sim/out/finland-<semínko>.txt.
import { it, expect } from 'vitest';
import { getWorld, atWar } from '../src/engine/index.js';
import { env, simulate, writeReport, dateOf, tagOf } from './run.js';

it('zimní válka', () => {
  const cfg = env(), w = getWorld(), F = w.ownerIdx.FIN, S = w.ownerIdx.SOV, G = w.ownerIdx.GER;
  const out = [`Zimní válka: semínko ${cfg.seed}${cfg.hist ? '' : ' (volná historie)'}`];
  const own0 = []; for (let p = 1; p <= w.L; p++) if (w.provOwner0[p] === F) own0.push(p);
  let started = 0, capDay = 0, last = '';
  simulate(cfg, +(process.env.END || 2100), (s, d) => {
    const war = atWar(s, 'SOV', 'FIN');
    if (war && !started) { started = d; out.push(`${dateOf(s)}: válka SSSR–Finsko (den ${d})`); }
    if (started && !capDay && !war && !s.dip.cap[F] && !out.some((x) => x.includes('konec války'))) {
      const states = new Set(); for (const p of own0) states.add(w.provState[p]);
      const lost = [...states].filter((x) => s.stateOwner[x] !== F).map((x) => `${w.states[x].n}→${tagOf(s.stateOwner[x])}`);
      out.push(`${dateOf(s)}: konec války bez kapitulace (den ${d}); pán ${tagOf(s.dip.sub[F])}, hlavní město ${tagOf(s.stateOwner[w.provState[w.owners[F].cap]])}; ztracené státy: ${lost.join(', ') || 'žádné'}`);
    }
    if (started && !capDay && (war || s.dip.cap[F])) {
      const held = own0.filter((p) => s.ctrl[p] === S).length;
      const line = `drží SSSR ${held}/${own0.length} provincií`;
      if ((d - started) % 5 === 0 && line !== last) { out.push(`${dateOf(s)}: ${line}`); last = line; }
    }
    if (!capDay && s.dip.cap[F]) {
      capDay = d;
      const states = new Set(); for (const p of own0) states.add(w.provState[p]);
      const lost = [...states].filter((x) => s.stateOwner[x] !== F).map((x) => `${w.states[x].n}→${tagOf(s.stateOwner[x])}`);
      out.push(`${dateOf(s)}: Finsko kapituluje (den ${d}, ${d - started} dní války); pán ${tagOf(s.dip.sub[F])}; ztracené státy: ${lost.join(', ') || 'žádné'}`);
    }
    if (!out.some((x) => x.includes('pokračovací')) && atWar(s, 'FIN', 'SOV') && d > 1700) out.push(`${dateOf(s)}: pokračovací válka Finsko–SSSR (den ${d})`);
    if (d === 2010 || d === 2060 || d === 2200 || d === 2600 || d === 3100 || d === 3250) out.push(`${dateOf(s)}: Finsko–SSSR ${atWar(s, 'FIN', 'SOV') ? 'válka' : 'mír'}, Finsko–Německo ${atWar(s, 'FIN', 'GER') ? 'válka' : 'mír'}, pán ${tagOf(s.dip.sub[F])}, kapitulace ${s.dip.cap[F] ? 'ano' : 'ne'}`);
    void G;
    return false;
  });
  writeReport('finland', cfg, out);
  expect(out.length).toBeGreaterThan(0);
});
