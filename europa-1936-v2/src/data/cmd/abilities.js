// Schopnosti armád (M53): za velitelskou moc dostane armáda na `days` dní dočasné bonusy. `mods` používají klíče velitelských bonusů (viz army/leaders.js MOD_KEYS).
export const ABILITIES = {
  force_attack: { n: 'Vynucený útok', cost: 20, days: 7, mods: { atk: 0.25, def: -0.1 }, info: 'Armáda útočí o čtvrtinu silněji, ale hůř se brání.' },
  last_stand: { n: 'Poslední vzdor', cost: 25, days: 5, mods: { def: 0.3, speed: -0.3 }, info: 'Armáda se silně brání, ale je pomalá.' },
  hold_line: { n: 'Pevná obrana', cost: 15, days: 10, mods: { def: 0.2, atk: -0.1 }, info: 'Lepší obrana za cenu slabšího útoku.' },
  rapid_march: { n: 'Zrychlený pochod', cost: 15, days: 5, mods: { speed: 0.35, def: -0.1 }, info: 'Armáda postupuje rychleji, ale je zranitelnější.' },
};
export const ABILITY_IDS = Object.keys(ABILITIES);
