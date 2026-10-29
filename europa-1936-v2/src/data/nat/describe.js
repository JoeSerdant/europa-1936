// Popisy účinků cílů a událostí česky (pro rozhraní).
import { LAWS } from '../politics/laws.js';
import { ADVISORS } from '../politics/advisors.js';
import { TECHS } from '../research/techs.js';
import { EQUIP } from '../army/equipment.js';

const MOD = { stab: 'stabilita', ws: 'podpora války', cons: 'spotřební zboží', build: 'stavby', prod: 'výroba', extract: 'těžba', imp: 'cena dovozu', man: 'lidská síla', research: 'výzkum' };
const sign = (v) => (v > 0 ? '+' : '−');
const pct = (v) => `${sign(v)}${Math.round(Math.abs(v) * 1000) / 10} %`;

export function fxText(fx) {
  switch (fx.t) {
    case 'pp': return `Politická moc ${fx.v > 0 ? '+' : '−'}${Math.abs(fx.v)}`;
    case 'stab': return `Stabilita ${pct(fx.v)}`;
    case 'ws': return `Podpora války ${pct(fx.v)}`;
    case 'law': return `Zákon: ${LAWS[fx.cat][fx.id].n}`;
    case 'adv': return `Poradce: ${ADVISORS[fx.id].n}`;
    case 'factory': return `${fx.n}× ${fx.k === 'civ' ? 'civilní' : 'vojenská'} továrna`;
    case 'infra': return `Infrastruktura +${fx.n}`;
    case 'boost': return `Výzkum „${TECHS[fx.id].n}“ +${Math.round(fx.v * 100)} %`;
    case 'boostslot': return `Právě zkoumaná technologie +${Math.round(fx.v * 100)} %`;
    case 'tech': return `Technologie: ${TECHS[fx.id].n}`;
    case 'man': return `Lidská síla +${Math.round(fx.v * 1000) / 10} % obyvatel`;
    case 'stock': return `${EQUIP[fx.eq].n} +${fx.n}`;
    case 'flag': return null;
    case 'event': return null;
    default: return null;
  }
}
export const fxLinesOf = (list) => (list || []).map(fxText).filter(Boolean);
export const modLines = (mod) => Object.entries(mod || {}).map(([k, v]) => `${MOD[k]} ${pct(v)}`);
