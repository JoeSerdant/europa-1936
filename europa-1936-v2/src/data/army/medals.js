// S5d: vyznamenání divizí (vlastní obdoba medailí za zásluhy). Zkušená divize (aspoň `MEDAL.XP` stupeň zkušeností) může dostat
// jedno vyznamenání za velitelskou moc; přidává bonus v boji (`atk` / `def` – příplatek k útoku a obraně divize, čte `army/combat.js`).
export const MEDAL = { CP: 25, XP: 2, BASE: 3, PER_DIV: 0.03 };   // cena, potřebný stupeň zkušeností, strop vyznamenání země = BASE + divize × PER_DIV

export const MEDALS = {
  statecnost: { n: 'Řád za statečnost', info: 'Divize se vyznamenala v útoku: útočí odhodlaněji.', icon: 'attack', atk: 0.06 },
  vytrvalost: { n: 'Kříž za vytrvalost', info: 'Divize udržela postavení proti přesile: brání se houževnatěji.', icon: 'shield', def: 0.06 },
  prukopnik: { n: 'Odznak průkopníka', info: 'Divize první prorazila nepřátelskou linii: o něco lepší útok i obrana.', icon: 'flag', atk: 0.03, def: 0.03 },
};
export const MEDAL_IDS = Object.keys(MEDALS);
