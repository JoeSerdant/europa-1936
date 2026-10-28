// Státy (provincie 1. řádu) severní, střední a jihovýchodní Evropy. Formát viz statesWest.js.

export const DEN = [
  ['Sjælland', 11.9, 55.5],
  ['Lolland-Falster', 11.8, 54.8, { w: 0.5 }],
  ['Fyn', 10.4, 55.35, { w: 0.7 }],
  ['Jižní Jutsko', 9.3, 55.6],
  ['Severní Jutsko', 9.6, 56.9],
  ['Bornholm', 14.9, 55.15, { w: 0.4 }],
  ['Faerské ostrovy', -6.9, 62.0, { w: 0.5 }],
];

export const NOR = [
  ['Oslo', 10.7, 59.8],
  ['Telemark', 8.9, 59.4],
  ['Sørlandet', 7.9, 58.4],
  ['Rogaland', 6.1, 59.0],
  ['Západní Norsko', 6.0, 60.5],
  ['Møre', 7.2, 62.4],
  ['Trøndelag', 10.8, 63.5],
  ['Východní Norsko', 11.0, 61.3],
  ['Nordland', 14.5, 66.5, { sp: 1.5 }],
  ['Narvik', 17.4, 68.4, { w: 0.7, sp: 1.5 }],
  ['Troms', 19.5, 69.2, { sp: 1.5 }],
  ['Finnmark', 25.0, 70.0, { sp: 2.5 }],
];

export const SWE = [
  ['Skåne', 13.4, 55.9],
  ['Småland', 14.8, 57.0],
  ['Gotland', 18.5, 57.5, { w: 0.5 }],
  ['Göteborg', 12.8, 58.0],
  ['Östergötland', 15.6, 58.4],
  ['Stockholm', 18.0, 59.4, { w: 0.8 }],
  ['Värmland', 13.5, 59.6],
  ['Dalarna', 14.6, 60.8, { sp: 1.3 }],
  ['Gävleborg', 16.5, 61.5, { sp: 1.3 }],
  ['Jämtland', 14.0, 63.0, { sp: 1.6 }],
  ['Västernorrland', 17.5, 63.2, { sp: 1.4 }],
  ['Västerbotten', 19.0, 64.8, { sp: 1.6 }],
  ['Norrbotten', 22.0, 66.6, { sp: 1.8 }],
  ['Kiruna', 19.8, 67.8, { sp: 2.2 }],
];

export const FIN = [
  ['Uusimaa', 25.0, 60.4],
  ['Turku', 22.5, 60.6],
  ['Satakunta', 22.0, 61.5],
  ['Häme', 24.5, 61.4],
  ['Kymenlaakso', 26.9, 60.95, { w: 0.7 }],
  ['Viipuri', 29.0, 60.8],
  ['Sortavala', 30.8, 61.8],
  ['Savo', 27.5, 62.8],
  ['Pohjanmaa', 22.5, 63.0],
  ['Oulu', 26.0, 64.8, { sp: 1.5 }],
  ['Kainuu', 28.5, 64.3, { sp: 1.5 }],
  ['Lappi', 26.5, 67.3, { sp: 2 }],
  ['Salla', 30.1, 67.0, { w: 0.8, sp: 2 }],
  ['Petsamo', 30.5, 69.4, { w: 0.8, sp: 2 }],
  ['Åland', 20.0, 60.2, { w: 0.4 }],
];

export const EST = [
  ['Harju', 24.8, 59.3],
  ['Pärnu', 24.3, 58.4],
  ['Tartu', 26.7, 58.3],
  ['Ida-Viru', 27.3, 59.3, { w: 0.8 }],
  ['Ostrovy', 22.6, 58.4, { w: 0.7 }],
  ['Petseri', 27.7, 57.8, { w: 0.7 }],
];

export const LAT = [
  ['Riga', 24.1, 57.0, { w: 0.7 }],
  ['Kuronsko', 21.8, 56.9],
  ['Vidzeme', 25.5, 57.6],
  ['Zemgale', 23.6, 56.5],
  ['Latgale', 27.0, 56.4],
];

export const LIT = [
  ['Klaipėda', 21.3, 55.6, { w: 0.8 }],
  ['Žemaitija', 22.4, 56.0],
  ['Aukštaitija', 24.8, 55.6],
  ['Kaunas', 23.9, 54.9],
  ['Suvalkija', 23.2, 54.4],
];

export const POL = [
  ['Varšava', 21.0, 52.2, { w: 0.6 }],
  ['Mazovsko', 21.8, 52.7],
  ['Lodž', 19.5, 51.8],
  ['Poznaň', 17.0, 52.4],
  ['Gdyně', 18.0, 54.3, { w: 0.8 }],
  ['Kujavsko', 18.6, 53.0],
  ['Slezsko', 19.0, 50.3, { w: 0.8 }],
  ['Krakov', 20.0, 50.1],
  ['Kielce', 20.7, 50.9],
  ['Lublin', 22.8, 51.2],
  ['Rzeszów', 22.0, 49.9],
  ['Bialystok', 23.2, 53.1],
  ['Polesí', 25.0, 52.2],
  ['Grodno', 24.5, 53.7],
  ['Novogrudek', 26.0, 53.4],
  ['Vilnius', 25.3, 54.7],
  ['Volyň', 25.5, 50.7],
  ['Tarnopol', 25.6, 49.6],
  ['Lvov', 24.0, 49.8],
  ['Stanislavov', 24.7, 48.9],
];

export const CZE = [
  ['Praha', 14.4, 50.1, { w: 0.6 }],
  ['Plzeň', 13.4, 49.7],
  ['Jižní Čechy', 14.5, 49.1],
  ['Východní Čechy', 15.9, 50.0],
  ['Jižní Morava', 16.6, 49.2],
  ['Střední Morava', 17.2, 49.7],
  ['Ostravsko', 18.2, 49.8, { w: 0.7 }],
  ['Sudety-západ', 12.8, 50.25],
  ['Sudety-sever', 14.5, 50.75],
  ['Sudety-východ', 16.9, 50.25],
  ['Západní Slovensko', 17.7, 48.5],
  ['Střední Slovensko', 19.2, 48.8],
  ['Východní Slovensko', 21.0, 49.0],
  ['Podkarpatská Rus', 23.3, 48.4],
];

export const HUN = [
  ['Budapešť', 19.05, 47.5, { w: 0.4 }],
  ['Zadunají-sever', 17.6, 47.7],
  ['Zadunají-jih', 18.0, 46.2],
  ['Pest', 19.7, 47.3],
  ['Velká nížina', 20.0, 46.3],
  ['Debrecen', 21.6, 47.5],
  ['Miskolc', 20.7, 48.1],
];

export const ROM = [
  ['București', 26.1, 44.4, { w: 0.6 }],
  ['Muntenie', 25.3, 44.9],
  ['Východní Muntenie', 26.9, 45.2],
  ['Oltenie', 23.7, 44.7],
  ['Dobrudža', 28.4, 44.7],
  ['Jižní Dobrudža', 27.6, 43.8],
  ['Moldavsko', 27.0, 46.9],
  ['Dolní Moldavsko', 27.9, 45.7, { w: 0.8 }],
  ['Bukovina', 25.9, 47.7],
  ['Besarábie-sever', 28.0, 47.9],
  ['Besarábie-střed', 28.8, 47.0],
  ['Budžak', 29.6, 45.9],
  ['Banát', 21.5, 45.8],
  ['Krišana', 21.9, 46.9],
  ['Maramureš', 23.8, 47.7],
  ['Sedmihradsko-sever', 23.8, 46.6],
  ['Sedmihradsko-jih', 24.7, 45.8],
];

export const YUG = [
  ['Bělehrad', 20.5, 44.8, { w: 0.5 }],
  ['Šumadija', 20.9, 43.9],
  ['Niš', 21.9, 43.2],
  ['Vojvodina', 20.0, 45.5],
  ['Srem-Slavonie', 18.9, 45.2],
  ['Kosovo', 21.0, 42.7],
  ['Makedonie', 21.6, 41.6],
  ['Černá Hora', 19.2, 42.8],
  ['Bosna', 17.9, 44.2],
  ['Hercegovina', 17.8, 43.2],
  ['Dalmácie', 16.4, 43.7],
  ['Záhřeb', 16.0, 45.8],
  ['Lika', 15.9, 44.8],
  ['Lublaň', 14.5, 46.1],
  ['Maribor', 15.5, 46.5],
];

export const BUL = [
  ['Sofie', 23.3, 42.7, { w: 0.7 }],
  ['Severozápadní Bulharsko', 23.6, 43.5],
  ['Dunajsko', 25.6, 43.6],
  ['Varna', 27.6, 43.4],
  ['Burgas', 27.0, 42.4],
  ['Plovdiv', 24.9, 42.2],
  ['Rodopy a Pirin', 24.0, 41.7],
];

export const GRE = [
  ['Attika', 23.7, 38.0, { w: 0.6 }],
  ['Peloponés', 22.3, 37.5],
  ['Střední Řecko', 22.2, 38.7],
  ['Epir', 20.7, 39.7],
  ['Thesálie', 22.1, 39.6],
  ['Západní Makedonie', 21.8, 40.4],
  ['Soluň', 23.0, 40.7],
  ['Thrákie', 25.2, 41.1],
  ['Kréta', 24.9, 35.2],
  ['Egejské ostrovy', 26.0, 39.0, { w: 0.7 }],
  ['Kyklady', 25.3, 37.1, { w: 0.4 }],
];

export const ALB = [
  ['Škodra', 19.7, 41.9],
  ['Tirana', 19.8, 41.2],
  ['Gjirokastra', 20.2, 40.3],
];

export const TUR = [
  ['Istanbul', 28.95, 41.05, { w: 0.4 }],
  ['Východní Thrákie', 27.4, 41.3],
  ['Marmara', 29.5, 40.3],
  ['Egejské pobřeží', 27.9, 38.5],
  ['Denizli', 29.5, 37.6],
  ['Západní Anatolie', 30.2, 39.1],
  ['Ankara', 32.8, 39.9],
  ['Konya', 32.5, 37.9],
  ['Antalya', 30.7, 37.0],
  ['Adana', 35.3, 37.0],
  ['Gaziantep', 37.4, 37.2],
  ['Kayseri', 35.5, 38.7],
  ['Čorum', 35.0, 40.5],
  ['Sivas', 37.0, 39.7],
  ['Malatya', 38.3, 38.4],
  ['Kastamonu', 33.8, 41.4],
  ['Samsun', 36.3, 41.0],
  ['Trabzon', 39.7, 40.9],
  ['Erzurum', 41.3, 39.9],
  ['Kars', 43.0, 40.6],
  ['Van', 43.4, 38.5],
  ['Diyarbakır', 40.2, 37.9],
  ['Hakkâri', 43.6, 37.3],
];

export const ICE = [
  ['Reykjavík', -21.5, 64.4],
  ['Severní Island', -19.0, 65.6],
  ['Jižní a východní Island', -16.5, 64.4, { sp: 1.5 }],
];
