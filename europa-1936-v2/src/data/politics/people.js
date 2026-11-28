// P1: skuteční politici a velitelé štábů jako poradci – každá velmoc má vlastní výběr, každý člověk má vlastnost (trait).
// Vlastnosti, jejich názvy i čísla jsou vlastní (ne převzaté); jména jsou historické osoby, přiřazení vlastností je herní zjednodušení.
// Poradce bez `tag` je obecný (pro země bez vlastního výběru v daném slotu). `req`: { ideo } = jen při vládě dané ideologie, { focus } = po splnění cíle.

/** Vlastnosti poradců: `mod` = klíče z NO_POL (politika, hospodářství), `doc` = klíče doktrín (vrchní velení). */
export const ADV_TRAITS = {
  propagandista: { n: 'Mistr propagandy', mod: { ws: 0.06 } },
  smirce: { n: 'Smířlivý diplomat', mod: { stab: 0.05 } },
  aparatcik: { n: 'Stranický aparátčík', mod: { stab: 0.02, ws: 0.03 } },
  demagog: { n: 'Ohnivý řečník', mod: { ws: 0.08, stab: -0.02 } },
  reformista: { n: 'Sociální reformátor', mod: { stab: 0.04, cons: -0.02 } },
  odvod: { n: 'Organizátor odvodů', mod: { man: 0.1 } },
  mobilizator: { n: 'Plánovač mobilizace', mod: { man: 0.05, cons: -0.02 } },
  veteran: { n: 'Válečný veterán', mod: { ws: 0.05, stab: 0.01 } },
  magnat: { n: 'Průmyslový magnát', mod: { prod: 0.05 } },
  stavitel: { n: 'Stavitel', mod: { build: 0.1 } },
  tezar: { n: 'Ředitel těžby', mod: { extract: 0.1 } },
  planovac: { n: 'Hospodářský plánovač', mod: { prod: 0.03, build: 0.05 } },
  akademik: { n: 'Vědecký organizátor', mod: { research: 0.1 } },
  konstrukter: { n: 'Hlavní konstruktér', mod: { research: 0.05, prod: 0.02 } },
  fyzik: { n: 'Geniální fyzik', mod: { research: 0.08, stab: 0.01 } },
  utok: { n: 'Stoupenec útoku', doc: { atk: 0.05 } },
  obrana: { n: 'Stoupenec obrany', doc: { def: 0.05 } },
  tanky: { n: 'Teoretik obrněných sil', doc: { atkArm: 0.1 } },
  plan: { n: 'Mistr plánování', doc: { planGain: 0.25 } },
  logistik: { n: 'Logistik', doc: { supUse: -0.1 } },
  palba: { n: 'Dělostřelecký admirál', doc: { fire: 0.08 } },
  ponorky: { n: 'Velitel ponorek', doc: { raid: 0.12 } },
  konvoje: { n: 'Organizátor konvojů', doc: { escort: 0.15 } },
  stihaci: { n: 'Velitel stíhačů', doc: { patrol: 0.1 } },
  podpora: { n: 'Velitel podpory', doc: { cas: 0.12 } },
  bombarder: { n: 'Velitel bombardérů', doc: { bomb: 0.12 } },
};

// [slot, jméno, vlastnost, cena PM, požadavek?]
const P = {
  GER: [
    ['pol', 'Konstantin von Neurath', 'smirce', 120], ['pol', 'Joseph Goebbels', 'propagandista', 150, { ideo: 'fascism' }],
    ['arm', 'Wilhelm Keitel', 'mobilizator', 120], ['ind', 'Hjalmar Schacht', 'planovac', 120], ['ind', 'Fritz Todt', 'stavitel', 120, { focus: 'ger_road' }],
    ['ind', 'Albert Speer', 'magnat', 150, { focus: 'ger_rearm' }], ['sci', 'Werner Heisenberg', 'fyzik', 120], ['sci', 'Wernher von Braun', 'konstrukter', 150, { focus: 'ger_rearm' }],
    ['army', 'Heinz Guderian', 'tanky', 150], ['army', 'Ludwig Beck', 'plan', 120], ['army', 'Franz Halder', 'logistik', 120],
    ['navy', 'Erich Raeder', 'palba', 120], ['navy', 'Karl Dönitz', 'ponorky', 150], ['air', 'Wolfram von Richthofen', 'podpora', 150], ['air', 'Adolf Galland', 'stihaci', 120],
  ],
  SOV: [
    ['pol', 'Vjačeslav Molotov', 'aparatcik', 120], ['pol', 'Maxim Litvinov', 'smirce', 120], ['arm', 'Kliment Vorošilov', 'odvod', 120],
    ['ind', 'Lazar Kaganovič', 'stavitel', 120, { focus: 'sov_rail' }], ['ind', 'Nikolaj Voznesenskij', 'planovac', 120], ['ind', 'Ivan Tevosjan', 'tezar', 120, { focus: 'sov_siberia' }],
    ['sci', 'Igor Kurčatov', 'fyzik', 150, { focus: 'sov_sci' }], ['sci', 'Sergej Koroljov', 'konstrukter', 120],
    ['army', 'Michail Tuchačevskij', 'tanky', 150], ['army', 'Boris Šapošnikov', 'plan', 120], ['army', 'Alexandr Vasilevskij', 'logistik', 120, { focus: 'sov_army' }],
    ['navy', 'Nikolaj Kuzněcov', 'konvoje', 120], ['air', 'Jakov Smuškevič', 'stihaci', 120], ['air', 'Alexandr Novikov', 'podpora', 150],
  ],
  ENG: [
    ['pol', 'Anthony Eden', 'smirce', 120], ['pol', 'Winston Churchill', 'demagog', 150, { focus: 'eng_rearm' }], ['arm', 'Leslie Hore-Belisha', 'mobilizator', 120],
    ['ind', 'Lord Beaverbrook', 'magnat', 150, { focus: 'eng_shadow' }], ['ind', 'Ernest Bevin', 'planovac', 120, { ideo: 'democracy' }],
    ['sci', 'Henry Tizard', 'akademik', 120], ['sci', 'Robert Watson-Watt', 'fyzik', 150, { focus: 'eng_sci' }],
    ['army', 'Alan Brooke', 'plan', 120], ['army', 'John Dill', 'obrana', 120], ['army', 'Percy Hobart', 'tanky', 150, { focus: 'eng_army' }],
    ['navy', 'Dudley Pound', 'palba', 120], ['navy', 'Andrew Cunningham', 'konvoje', 120], ['air', 'Hugh Dowding', 'stihaci', 150, { focus: 'eng_air' }], ['air', 'Arthur Harris', 'bombarder', 120],
  ],
  FRA: [
    ['pol', 'Léon Blum', 'reformista', 120, { ideo: 'democracy' }], ['pol', 'Pierre-Étienne Flandin', 'smirce', 120], ['arm', 'Édouard Daladier', 'mobilizator', 120],
    ['ind', 'Raoul Dautry', 'planovac', 120, { focus: 'fra_arm' }], ['ind', 'Louis Renault', 'magnat', 120], ['sci', 'Frédéric Joliot-Curie', 'fyzik', 150],
    ['army', 'Maxime Weygand', 'obrana', 120], ['army', 'Charles de Gaulle', 'tanky', 150, { focus: 'fra_tank' }], ['army', 'Alphonse Georges', 'logistik', 120],
    ['navy', 'François Darlan', 'palba', 120], ['air', 'Joseph Vuillemin', 'bombarder', 120],
  ],
  ITA: [
    ['pol', 'Galeazzo Ciano', 'smirce', 120], ['pol', 'Dino Grandi', 'reformista', 120], ['pol', 'Achille Starace', 'propagandista', 150, { ideo: 'fascism' }],
    ['ind', 'Alberto Pirelli', 'magnat', 120, { focus: 'ita_arm' }], ['ind', 'Giuseppe Volpi', 'planovac', 120], ['sci', 'Enrico Fermi', 'fyzik', 150, { focus: 'ita_sci' }],
    ['army', 'Pietro Badoglio', 'obrana', 120], ['army', 'Alberto Pariani', 'plan', 120, { focus: 'ita_binary' }],
    ['navy', 'Domenico Cavagnari', 'palba', 120], ['air', 'Italo Balbo', 'bombarder', 150], ['air', 'Francesco Pricolo', 'podpora', 120],
  ],
  USA: [
    ['pol', 'Cordell Hull', 'smirce', 120], ['pol', 'Harry Hopkins', 'reformista', 120, { ideo: 'democracy' }], ['arm', 'Lewis Hershey', 'odvod', 120, { focus: 'usa_draft' }],
    ['ind', 'William Knudsen', 'magnat', 150, { focus: 'usa_detroit' }], ['ind', 'Henry J. Kaiser', 'stavitel', 120], ['sci', 'Vannevar Bush', 'akademik', 120], ['sci', 'J. Robert Oppenheimer', 'fyzik', 150],
    ['army', 'George C. Marshall', 'plan', 150, { focus: 'usa_army' }], ['army', 'Adna Chaffee', 'tanky', 120], ['army', 'Brehon Somervell', 'logistik', 120],
    ['navy', 'Ernest King', 'palba', 120], ['navy', 'William Leahy', 'konvoje', 120], ['air', 'Henry H. Arnold', 'bombarder', 150], ['air', 'Claire Chennault', 'stihaci', 120],
  ],
  JAP: [
    ['pol', 'Fumimaro Konoe', 'aparatcik', 120], ['pol', 'Kóki Hirota', 'smirce', 120], ['ind', 'Nobusuke Kiši', 'planovac', 150, { focus: 'jap_manchuria' }], ['ind', 'Jošisuke Aikawa', 'magnat', 120],
    ['sci', 'Jošio Nišina', 'fyzik', 120], ['army', 'Kandži Išiwara', 'plan', 120], ['army', 'Tomojuki Jamašita', 'utok', 150, { focus: 'jap_army' }],
    ['navy', 'Isoroku Jamamoto', 'palba', 150, { focus: 'jap_navy' }], ['navy', 'Osami Nagano', 'konvoje', 120], ['air', 'Minoru Genda', 'podpora', 150],
  ],
  POL: [
    ['pol', 'Józef Beck', 'smirce', 120], ['ind', 'Eugeniusz Kwiatkowski', 'planovac', 120], ['sci', 'Stefan Banach', 'akademik', 120],
    ['army', 'Wacław Stachiewicz', 'plan', 120], ['army', 'Tadeusz Kutrzeba', 'obrana', 120],
  ],
  CZE: [
    ['pol', 'Kamil Krofta', 'smirce', 120], ['pol', 'Milan Hodža', 'reformista', 120, { ideo: 'democracy' }], ['ind', 'Jan Antonín Baťa', 'magnat', 120],
    ['sci', 'Jaroslav Heyrovský', 'fyzik', 120], ['army', 'Ludvík Krejčí', 'obrana', 120], ['army', 'Sergej Ingr', 'plan', 120],
  ],
  SPR: [
    ['pol', 'Juan Negrín', 'reformista', 120, { ideo: 'democracy' }], ['pol', 'José Calvo Sotelo', 'demagog', 120], ['ind', 'Juan March', 'magnat', 120],
    ['sci', 'Juan de la Cierva', 'konstrukter', 120], ['army', 'Vicente Rojo', 'plan', 120],
  ],
  TUR: [
    ['pol', 'İsmet İnönü', 'aparatcik', 120], ['pol', 'Tevfik Rüştü Aras', 'smirce', 120], ['ind', 'Celal Bayar', 'planovac', 120], ['army', 'Fevzi Çakmak', 'obrana', 120],
  ],
  ROM: [
    ['pol', 'Nicolae Titulescu', 'smirce', 120], ['ind', 'Nicolae Malaxa', 'magnat', 120], ['sci', 'Henri Coandă', 'konstrukter', 120], ['army', 'Ion Antonescu', 'utok', 120],
  ],
  HUN: [
    ['pol', 'Pál Teleki', 'smirce', 120], ['pol', 'Kálmán Darányi', 'aparatcik', 120], ['ind', 'Ferenc Chorin', 'magnat', 120],
    ['sci', 'Albert Szent-Györgyi', 'akademik', 120], ['army', 'Henrik Werth', 'plan', 120],
  ],
  YUG: [
    ['pol', 'Milan Stojadinović', 'aparatcik', 120], ['sci', 'Milutin Milanković', 'akademik', 120], ['army', 'Dušan Simović', 'obrana', 120],
  ],
  CHI: [
    ['pol', 'Wang Čchung-chuej', 'smirce', 120], ['ind', 'Sung C’-wen', 'planovac', 120], ['army', 'Paj Čchung-si', 'plan', 120], ['army', 'Čchen Čcheng', 'obrana', 120],
  ],
  SWE: [
    ['pol', 'Rickard Sandler', 'smirce', 120], ['ind', 'Marcus Wallenberg', 'magnat', 120], ['sci', 'The Svedberg', 'akademik', 120], ['army', 'Olof Thörnell', 'obrana', 120],
  ],
  FIN: [
    ['pol', 'Rudolf Holsti', 'smirce', 120], ['ind', 'Risto Ryti', 'planovac', 120], ['sci', 'Artturi Ilmari Virtanen', 'akademik', 120], ['army', 'Erik Heinrichs', 'obrana', 120],
  ],
  CAN: [
    ['pol', 'Oscar D. Skelton', 'smirce', 120], ['ind', 'C. D. Howe', 'stavitel', 120], ['sci', 'Frederick Banting', 'akademik', 120], ['army', 'Andrew McNaughton', 'plan', 120],
  ],
  BRA: [
    ['pol', 'Oswaldo Aranha', 'smirce', 120], ['ind', 'Guilherme Guinle', 'tezar', 120], ['army', 'Pedro de Góis Monteiro', 'plan', 120],
  ],
};

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');

/** Poradci-osobnosti ve tvaru ADVISORS: { slot, n, pp, mod | doc, info, tag, trait, req }. Id = `<tag>_<jméno>`. */
export const PEOPLE = {};
for (const [tag, list] of Object.entries(P)) {
  for (const [slot, n, trait, pp, req] of list) {
    const T = ADV_TRAITS[trait];
    PEOPLE[`${tag.toLowerCase()}_${slug(n)}`] = { slot, n, pp, ...(T.mod ? { mod: T.mod } : {}), ...(T.doc ? { doc: T.doc } : {}), info: T.n, tag, trait, ...(req ? { req } : {}) };
  }
}

/** Vlastnosti vůdců (platí, dokud vládne strana z roku 1936 – po převratu nebo volbách vůdce odchází). Klíče `mod` jen z NO_POL. */
export const LEADER_TRAITS = {
  GER: { n: 'Neústupný vůdce', mod: { ws: 0.05 } },
  SOV: { n: 'Železná ruka', mod: { stab: 0.04, cons: -0.02 } },
  ENG: { n: 'Muž kompromisu', mod: { stab: 0.04 } },
  FRA: { n: 'Křehká koalice', mod: { stab: -0.03, cons: 0.02 } },
  ITA: { n: 'Imperiální sen', mod: { ws: 0.04 } },
  USA: { n: 'Nový úděl', mod: { build: 0.05 } },
  JAP: { n: 'Vláda generálů', mod: { man: 0.05 } },
  CHI: { n: 'Generalissimus', mod: { man: 0.05 } },
  POL: { n: 'Odkaz maršála', mod: { ws: 0.03 } },
  CZE: { n: 'Demokratická tradice', mod: { stab: 0.03 } },
  SPR: { n: 'Rozdělená republika', mod: { stab: -0.03 } },
  TUR: { n: 'Otec národa', mod: { stab: 0.04 } },
  ROM: { n: 'Králova kamarila', mod: { stab: -0.02, prod: 0.02 } },
  HUN: { n: 'Regent bez krále', mod: { stab: 0.02 } },
  YUG: { n: 'Regentská rada', mod: { stab: -0.02 } },
  SWE: { n: 'Lidový domov', mod: { stab: 0.03, cons: 0.01 } },
  FIN: { n: 'Rolnický prezident', mod: { ws: 0.03 } },
  CAN: { n: 'Opatrný premiér', mod: { stab: 0.03 } },
  AST: { n: 'Věrnost koruně', mod: { ws: 0.02 } },
  BRA: { n: 'Nový stát', mod: { build: 0.03 } },
  ARG: { n: 'Neblahé desetiletí', mod: { stab: -0.02, extract: 0.03 } },
  RAJ: { n: 'Místokrál', mod: { man: 0.03 } },
  MEX: { n: 'Znárodnění ropy', mod: { extract: 0.04 } },
};
