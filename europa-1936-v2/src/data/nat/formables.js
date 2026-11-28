// P3: formovatelné národy (vlastní návrhy) – země z `members` může národ vyhlásit rozhodnutím, když drží hlavní města všech
// ostatních členů. Vyhlášení změní jméno a vlajku země (`nat.own[o].form`), přidá stabilitu a politickou moc. Vlajky jsou vlastní.
const H3 = (a, b, c) => [['r', a, 0, 0, 30, 6.67], ['r', b, 0, 6.67, 30, 6.66], ['r', c, 0, 13.33, 30, 6.67]];
const V3 = (a, b, c) => [['r', a, 0, 0, 10, 20], ['r', b, 10, 0, 10, 20], ['r', c, 20, 0, 10, 20]];

export const FORMABLES = {
  danube: { n: 'Podunajská federace', members: ['AUS', 'HUN', 'CZE'], flag: [...H3('#c8102e', '#f2f2f2', '#11457e'), ['c', '#e0b000', 15, 10, 3.2], ['s', '#11457e', 15, 10, 2]] },
  scand: { n: 'Skandinávská unie', members: ['SWE', 'NOR', 'DEN'], flag: [['r', '#0b4fa0', 0, 0, 30, 20], ['r', '#f2c200', 8, 0, 5, 20], ['r', '#f2c200', 0, 7.5, 30, 5], ['r', '#c8102e', 9.2, 0, 2.6, 20], ['r', '#c8102e', 0, 8.7, 30, 2.6]] },
  balkan: { n: 'Balkánská federace', members: ['YUG', 'BUL', 'GRE', 'ALB'], flag: [...H3('#0d5eaf', '#f2f2f2', '#00966e'), ['sg', '#e0b000', 9, 7.4, 12, 5.2, 1, 4, 1.1]] },
  baltic: { n: 'Pobaltská unie', members: ['EST', 'LAT', 'LIT'], flag: [...H3('#0072ce', '#f2f2f2', '#9e3039'), ['s', '#fdb913', 5, 10, 2.4]] },
  iberia: { n: 'Iberská unie', members: ['SPR', 'POR'], flag: [['r', '#046a38', 0, 0, 12, 20], ['r', '#c60b1e', 12, 0, 18, 20], ['r', '#f1bf00', 12, 6, 18, 8], ['ring', '#f1bf00', 12, 10, 3.6, 1.1]] },
  benelux: { n: 'Beneluxská unie', members: ['HOL', 'BEL', 'LUX'], flag: [...H3('#ae1c28', '#f2f2f2', '#21468b'), ['p', '#fdda24', '0,0 9,10 0,20']] },
  grancol: { n: 'Velká Kolumbie', members: ['COL', 'VEN', 'ECU'], flag: [['r', '#fcd116', 0, 0, 30, 10], ['r', '#003893', 0, 10, 30, 5], ['r', '#ce1126', 0, 15, 30, 5], ['sg', '#f2f2f2', 9, 10.6, 12, 3.8, 1, 3, 1]] },
  centram: { n: 'Středoamerická federace', members: ['GUA', 'HON', 'ELS', 'NIC', 'COS'], flag: [...H3('#0067c6', '#f2f2f2', '#0067c6'), ['sg', '#0067c6', 7.5, 7.6, 15, 4.8, 1, 5, 0.9]] },
  plata: { n: 'Spojené provincie La Platy', members: ['ARG', 'URG', 'PAR'], flag: [...H3('#74acdf', '#f2f2f2', '#74acdf'), ['r', '#d52b1e', 0, 9, 30, 2], ['sun', '#f6b40e', 15, 10, 2.9, 16, 1.6]] },
  polit: { n: 'Polsko-litevská unie', members: ['POL', 'LIT'], flag: [['r', '#f2f2f2', 0, 0, 30, 10], ['r', '#dc143c', 0, 10, 30, 10], ['r', '#006a44', 0, 0, 9, 20], ['s', '#fdb913', 4.5, 10, 2.5]] },
  arab: { n: 'Arabská federace', members: ['IRQ', 'SAU', 'YEM', 'OMA'], flag: [...H3('#111111', '#f2f2f2', '#007a3d'), ['p', '#ce1126', '0,0 11,10 0,20'], ['s', '#f2f2f2', 3.8, 10, 2]] },
  andes: { n: 'Andská konfederace', members: ['PRU', 'BOL', 'CHL'], flag: [...V3('#d91023', '#f2f2f2', '#007934'), ['sun', '#f6b40e', 15, 10, 3.2, 12, 1.8]] },
};
export const FORMABLE_IDS = Object.keys(FORMABLES);
