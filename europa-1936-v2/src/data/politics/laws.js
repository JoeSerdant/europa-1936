// Zákony (M21): tři obory po třech až čtyřech krocích. Čísla jsou vlastní.
//  pp    cena v politické moci               req  { ws, stab } minimální podpora války a stabilita
//  mod   účinky: stab, ws (cíle), cons (spotřební zboží), build, prod, extract, imp (cena dovozu), man (lidská síla), research
export const LAW_CATS = {
  eco: { n: 'Ekonomika', order: ['civ', 'early', 'war', 'total'] },
  con: { n: 'Odvod', order: ['vol', 'lim', 'ext', 'serv'] },
  trd: { n: 'Obchod', order: ['free', 'lim', 'closed'] },
};
export const LAW_CAT_IDS = Object.keys(LAW_CATS);

export const LAWS = {
  eco: {
    civ: { n: 'Civilní ekonomika', pp: 0, req: {}, mod: {}, info: 'Mírové hospodářství: nejvíc spotřebního zboží, žádné příplatky.' },
    early: { n: 'Raná mobilizace', pp: 150, req: { ws: 0.2 }, mod: { cons: -0.07, stab: -0.01 }, info: 'Část spotřebního zboží ustoupí zbrojení.' },
    war: { n: 'Válečná ekonomika', pp: 250, req: { ws: 0.4 }, mod: { cons: -0.15, prod: 0.05, stab: -0.03 }, info: 'Průmysl pracuje pro armádu; lidé si stěžují.' },
    total: { n: 'Totální mobilizace', pp: 350, req: { ws: 0.6 }, mod: { cons: -0.25, prod: 0.1, stab: -0.08 }, info: 'Všechno pro frontu: minimum spotřebního zboží, citelná únava obyvatel.' },
  },
  con: {
    vol: { n: 'Dobrovolnická armáda', pp: 0, req: {}, mod: { man: -0.2 }, info: 'Málo rekrutů, ale žádný odpor veřejnosti.' },
    lim: { n: 'Omezený odvod', pp: 0, req: {}, mod: {}, info: 'Běžná míra odvodu.' },
    ext: { n: 'Rozšířený odvod', pp: 150, req: { ws: 0.3 }, mod: { man: 0.5, stab: -0.02 }, info: 'Víc branců za cenu nespokojenosti.' },
    serv: { n: 'Branná služba', pp: 250, req: { ws: 0.5 }, mod: { man: 1, stab: -0.05, ws: -0.03 }, info: 'Dvojnásobný příliv lidské síly.' },
  },
  trd: {
    free: { n: 'Volný obchod', pp: 0, req: {}, mod: { imp: -0.2, stab: 0.03 }, info: 'Levnější dovoz surovin a spokojenější obchodníci.' },
    lim: { n: 'Omezený obchod', pp: 0, req: {}, mod: {}, info: 'Běžné obchodní podmínky.' },
    closed: { n: 'Uzavřené hospodářství', pp: 100, req: { ws: 0.3 }, mod: { imp: 0.3, extract: 0.1, stab: -0.02 }, info: 'Dražší dovoz, ale těžba doma vzroste.' },
  },
};
