// Konzole s cheaty (jako v HOI4): `runCheat(state, text)` → `{ state, msg }`. Čistá funkce; neznámý nebo neplatný příkaz vrací tentýž stav a hlášku.
// Cheaty nemění tvar stavu, jen hodnoty, a používají stejné příkazy jako hráč tam, kde existují.
import { getWorld } from './world.js';
import { TECHS, TECH_IDS } from '../data/research/index.js';
import { grantTech } from './research/commands.js';
import { declareWar, makePeace } from './army/commands.js';
import { capitulate } from './dip/capitulate.js';
import { BUILDINGS } from '../data/industry/index.js';
import { EQUIP } from '../data/army/equipment.js';
import { PLANES } from '../data/air/planes.js';

export const CHEAT_HELP = [
  'pp <n> – přidá politickou moc',
  'manpower <n> – přidá lidskou sílu',
  'stab <0–100>, ws <0–100> – nastaví stabilitu / podporu války',
  'research all | <id> – dokončí všechny / jednu technologii',
  'ic – okamžitě dokončí všechny vaše stavby',
  'equip <id> <n> – přidá výzbroj do skladu (např. equip pusky 1000)',
  'plane <sti|bit|tac|str> <n> – přidá letadla do rezervy',
  'tag <TAG> – přepne na jinou zemi (např. tag FRA)',
  'war <TAG> | peace <TAG> – válka / mír s danou zemí',
  'annex <TAG> – země kapitulace (okupanti dostanou její území)',
  'ai <0–3> – úroveň AI, speed <1–5> – rychlost času',
];

const num = (v) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const same = (state, msg) => ({ state, msg });

/** Provede jeden příkaz konzole nad stavem. */
export function runCheat(state, text) {
  const w = getWorld();
  const [cmd, a, b] = String(text || '').trim().split(/\s+/);
  const me = state.player ? w.ownerIdx[state.player] : 0;
  const needMe = () => (me ? null : 'Jako pozorovatel nemáte zemi (použijte tag).');
  const tagOf = (t) => { const k = String(t || '').toUpperCase(); return w.ownerIdx[k] ? k : null; };
  switch (String(cmd || '').toLowerCase()) {
    case '': return same(state, '');
    case 'help': return same(state, CHEAT_HELP.join('\n'));
    case 'pp': case 'manpower': case 'stab': case 'ws': {
      const err = needMe(), n = num(a);
      if (err || n === null) return same(state, err || `Použití: ${cmd} <číslo>`);
      if (cmd === 'pp') {
        const own = state.pol.own.slice(); own[me] = { ...own[me], pp: Math.max(0, own[me].pp + n) };
        return { state: { ...state, pol: { ...state.pol, own } }, msg: `Politická moc ${n >= 0 ? '+' : ''}${n}.` };
      }
      if (cmd === 'manpower') {
        const man = state.mil.man.slice(); man[me] = Math.max(0, (man[me] || 0) + n);
        return { state: { ...state, mil: { ...state.mil, man } }, msg: `Lidská síla ${n >= 0 ? '+' : ''}${n}.` };
      }
      const own = state.pol.own.slice(); own[me] = { ...own[me], [cmd]: Math.min(1, Math.max(0, n / 100)) };
      return { state: { ...state, pol: { ...state.pol, own } }, msg: `${cmd === 'stab' ? 'Stabilita' : 'Podpora války'} ${Math.round(n)} %.` };
    }
    case 'research': {
      const err = needMe();
      if (err) return same(state, err);
      if (a === 'all') {
        let s = state, k = 0;
        for (let pass = 0; pass < 8; pass++) for (const id of TECH_IDS) { const n = grantTech(s, me, id); if (n !== s) { s = n; k++; } }
        return { state: s, msg: `Odemčeno ${k} technologií.` };
      }
      if (!TECHS[a]) return same(state, `Neznámá technologie. Např. research pusky2 (nebo research all).`);
      const n = grantTech(state, me, a);
      return n === state ? same(state, 'Technologie už je hotová.') : { state: n, msg: `Technologie ${TECHS[a].n} hotová.` };
    }
    case 'ic': {
      const err = needMe();
      if (err) return same(state, err);
      let k = 0;
      const build = state.ind.build.map((p) => { if (p.o !== me || p.prog >= BUILDINGS[p.k].cost) return p; k++; return { ...p, prog: BUILDINGS[p.k].cost }; });
      return k ? { state: { ...state, ind: { ...state.ind, build } }, msg: `Stavby (${k}) se dokončí o půlnoci.` } : same(state, 'Nic se nestaví.');
    }
    case 'equip': {
      const err = needMe(), n = num(b);
      if (err || !EQUIP[a] || n === null) return same(state, err || `Použití: equip <${Object.keys(EQUIP).join('|')}> <počet>`);
      const stock = state.mil.stock.slice(); stock[me] = { ...(stock[me] || {}), [a]: Math.max(0, ((stock[me] || {})[a] || 0) + n) };
      return { state: { ...state, mil: { ...state.mil, stock } }, msg: `${EQUIP[a].n} ${n >= 0 ? '+' : ''}${n}.` };
    }
    case 'plane': {
      const err = needMe(), n = num(b);
      if (err || !PLANES[a] || n === null) return same(state, err || `Použití: plane <${Object.keys(PLANES).join('|')}> <počet>`);
      const pool = state.air.pool.slice(); pool[me] = { ...pool[me], [a]: Math.max(0, (pool[me][a] || 0) + n) };
      return { state: { ...state, air: { ...state.air, pool, ver: state.air.ver + 1 } }, msg: `${PLANES[a].n} ${n >= 0 ? '+' : ''}${n}.` };
    }
    case 'tag': {
      const t = tagOf(a);
      return t ? (t === state.player ? same(state, 'Už hrajete za tuto zemi.') : { state: { ...state, player: t }, msg: `Hrajete za ${w.owners[w.ownerIdx[t]].name}.` }) : same(state, 'Neznámá země (použijte tag, např. FRA).');
    }
    case 'war': case 'peace': {
      const err = needMe(), t = tagOf(a);
      if (err || !t || t === state.player) return same(state, err || 'Použití: war <TAG> / peace <TAG>');
      const s = cmd === 'war' ? declareWar(state, state.player, t) : makePeace(state, state.player, t);
      return s === state ? same(state, cmd === 'war' ? 'Válka už trvá.' : 'Nejste ve válce.') : { state: s, msg: cmd === 'war' ? 'Válka vyhlášena.' : 'Mír uzavřen.' };
    }
    case 'annex': {
      const t = tagOf(a);
      if (!t) return same(state, 'Použití: annex <TAG>');
      const s = capitulate(state, w.ownerIdx[t]);
      return s === state ? same(state, 'Země už kapitulovala.') : { state: s, msg: 'Země kapitulovala.' };
    }
    case 'ai': {
      const n = num(a);
      if (n === null || n < 0 || n > 3 || !Number.isInteger(n)) return same(state, 'Použití: ai <0–3>');
      return { state: { ...state, ai: { ...state.ai, level: n } }, msg: `AI zemí: úroveň ${n}.` };
    }
    case 'speed': {
      const n = num(a);
      if (n === null || n < 1 || n > 5 || !Number.isInteger(n)) return same(state, 'Použití: speed <1–5>');
      return { state: { ...state, speed: n }, msg: `Rychlost ${n}.` };
    }
    default: return same(state, `Neznámý příkaz „${cmd}“. Napište help.`);
  }
}
