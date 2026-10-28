// Deterministický generátor náhodných čísel (mulberry32).
// Stav je jediné číslo, takže se snadno ukládá do savu a hra jde přehrát se stejným výsledkem.
// Použití: const [x, rng] = nextRandom(game.rng);  →  game = { ...game, rng }

const INC = 0x6d2b79f5;

export function seedToState(seed) {
  return seed >>> 0;
}

/** @returns {[number, number]} [hodnota v <0,1), nový stav] */
export function nextRandom(state) {
  const a = (state + INC) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** @returns {[number, number]} [celé číslo 0..n-1, nový stav] */
export function randomInt(state, n) {
  const [x, next] = nextRandom(state);
  return [Math.floor(x * n), next];
}
