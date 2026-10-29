// Zdroje terénu: názvy oblastí z Natural Earth (geography_regions_polys) a vlastní doplňkové zóny [lon, lat].
// Typy terénu: plains, forest, hills, mountains, marsh, desert (urban se přidává podle měst).

export const MOUNTAIN_NAMES = new Set([
  'Moyen Atlas', 'Hardanger-vidda', 'Er Rif', 'Atlas Tellien', 'Lebanon Mts.', 'Kopet Dag Mts .', 'Al Hajar Mts.', 'Taurus Mts.',
  'Transylvanian Alps', 'Tatra Mts.', 'Pindus Mts.', 'Vatnajökull', 'Lesser Caucasus', 'PONTIC MOUNTAINS', 'Balkan Mts.', 'Dinaric Alps',
  'Cord. Cantábrica', 'S. Nevada', 'ATLAS SAHARIEN', 'HAUT ATLAS', 'AHAGGAR MTS.', 'HEJAZ MTS.', 'ELBURZ MTS.', 'KJØLEN MOUNTAINS',
  'CARPATHIAN MOUNTAINS', 'APPENNINI', 'PYRENEES', 'ZAGROS MOUNTAINS', 'ALPS', 'CAUCASUS MTS.',
]);
export const HILL_RANGE_NAMES = new Set([
  'Jabal bin Ghunaymah', 'Al Jabal al Akhdar', 'Tuwayq Mts.', 'Böhmerwald', 'Calabria', 'Harz', 'Vosges', 'Sudetes Mts.', 'Erzgebirge',
  'Ardennes', 'Jura', 'Grampian Mts.', 'Cambrian Mts.', 'Anti Atlas', 'KUH RUD MOUNTAINS', 'Sierra Morena', 'ATLAS MOUNTAINS', 'URAL MOUNTAINS',
]);
export const HILL_PLATEAU_NAMES = new Set([
  'Massif Central', 'Volga Upland', 'Dnieper Upland', 'Azov Upland', 'CENTRAL RUSSIAN UPLAND', 'Stavropol’ Plateau', 'Finnmarks-vidda',
]);
export const DESERT_PLATEAU_NAMES = new Set(['Ustyurt Plateau', 'Libyan Plateau', 'Plat. du Tademaït', 'Jilf al Kabir Plateau', 'Al Harüj al Aswad']);
export const MARSH_NAMES = new Set(['Volga Delta', 'Danube Delta', 'Bol’shezemel’skaya Tundra']);
export const DESERT_PLAIN_NAMES = new Set(['Hasa Plain']);

// vlastní zóny (priorita: pořadí v poli; později má přednost)
export const CUSTOM_ZONES = [
  // pahorkatiny
  { type: 'hills', name: 'Iberská mesetá', ring: [[-7.0, 40.5], [-1.0, 43.0], [-1.0, 38.5], [-6.0, 38.0]] },
  { type: 'hills', name: 'Anatolská plošina', ring: [[28.0, 40.2], [37.0, 40.4], [38.0, 37.5], [30.0, 37.2], [28.5, 38.5]] },
  { type: 'hills', name: 'Českomoravská vrchovina', ring: [[13.0, 49.0], [16.5, 49.8], [16.5, 49.0], [14.5, 48.6]] },
  { type: 'hills', name: 'Wales a Pennines', ring: [[-3.8, 51.8], [-3.2, 53.0], [-2.0, 55.0], [-2.4, 54.0], [-3.0, 52.0]] },
  { type: 'hills', name: 'Srbská vysočina', ring: [[19.0, 44.0], [22.5, 44.0], [22.5, 43.0], [20.0, 43.0]] },
  { type: 'hills', name: 'Cornwall a Devon', ring: [[-5.6, 50.0], [-3.3, 50.9], [-3.3, 50.5], [-5.2, 50.1]] },
  { type: 'hills', name: 'Skotské vrchoviny', ring: [[-6.0, 56.5], [-3.5, 57.5], [-3.0, 55.2], [-5.0, 55.0]] },
  { type: 'hills', name: 'Švábská Alba a Franky', ring: [[8.7, 48.9], [11.0, 49.6], [11.5, 48.5], [9.5, 48.3]] },
  { type: 'hills', name: 'Moravské Karpaty', ring: [[17.5, 49.2], [19.0, 49.4], [19.0, 48.6], [17.7, 48.7]] },
  { type: 'hills', name: 'Dolní Slezsko', ring: [[15.5, 50.5], [17.5, 50.5], [17.0, 50.0], [15.5, 50.0]] },
  { type: 'hills', name: 'Střední Řecko', ring: [[21.5, 39.5], [23.0, 39.0], [23.0, 38.0], [21.5, 38.5]] },
  { type: 'hills', name: 'Peloponés', ring: [[21.5, 38.0], [23.0, 37.8], [23.0, 36.5], [21.7, 36.6]] },
  { type: 'hills', name: 'Kréta', ring: [[23.5, 35.5], [26.3, 35.3], [26.3, 35.0], [23.5, 35.1]] },
  { type: 'hills', name: 'Sicílie', ring: [[13.2, 38.0], [15.5, 38.1], [15.0, 37.3], [13.8, 37.5]] },
  { type: 'hills', name: 'Korsika a Sardinie', ring: [[8.7, 42.9], [9.5, 42.4], [9.4, 39.5], [8.7, 39.8], [9.0, 41.0]] },
  { type: 'hills', name: 'Kypr', ring: [[32.4, 35.0], [34.0, 35.4], [34.0, 34.9], [32.5, 34.7]] },
  { type: 'hills', name: 'Sinaj', ring: [[33.3, 29.2], [34.9, 30.0], [34.7, 28.8], [33.8, 28.2]] },
  { type: 'hills', name: 'Judské hory a Zajordánsko', ring: [[35.0, 33.0], [36.0, 32.5], [36.2, 30.0], [35.2, 30.5], [35.0, 32.0]] },
  { type: 'hills', name: 'Kurdistán', ring: [[42.5, 37.5], [45.5, 37.3], [46.0, 35.0], [43.5, 35.5]] },
  { type: 'hills', name: 'Baleáry', ring: [[2.3, 39.9], [3.4, 39.8], [3.3, 39.3], [2.4, 39.4]] },
  { type: 'hills', name: 'Skandinávské pahorkatiny', ring: [[11.0, 58.2], [14.5, 58.0], [16.0, 57.0], [13.0, 56.5]] },
  // bažiny
  { type: 'marsh', name: 'Pripjať', ring: [[23.5, 51.7], [26.0, 52.8], [29.5, 52.8], [31.0, 52.2], [29.5, 51.5], [26.0, 51.3]] },
  { type: 'marsh', name: 'Nizozemské pobřeží', ring: [[3.5, 51.3], [5.5, 53.4], [8.0, 53.8], [8.5, 53.0], [6.0, 52.0]] },
  { type: 'marsh', name: 'Podunajská nížina u delty', ring: [[28.0, 45.2], [29.6, 45.6], [29.8, 44.7], [28.5, 44.5]] },
  { type: 'marsh', name: 'Delta Pádu', ring: [[11.8, 45.2], [12.7, 45.2], [12.5, 44.6], [11.8, 44.8]] },
  { type: 'marsh', name: 'Camargue', ring: [[4.2, 43.7], [5.0, 43.7], [4.8, 43.3], [4.2, 43.4]] },
  { type: 'marsh', name: 'Mezopotámské močály', ring: [[46.5, 31.9], [47.8, 31.8], [47.9, 30.8], [46.6, 30.9]] },
  { type: 'marsh', name: 'Finské jezerní močály', ring: [[28.2, 63.4], [30.0, 64.0], [30.0, 62.8], [28.5, 62.5]] },
  { type: 'marsh', name: 'Kolchida', ring: [[41.3, 42.6], [42.2, 42.5], [42.2, 41.9], [41.5, 41.9]] },
  { type: 'marsh', name: 'Vychegda', ring: [[48.0, 62.5], [55.0, 64.0], [57.0, 62.0], [49.0, 60.5]] },
  { type: 'marsh', name: 'Pečorské nížiny', ring: [[48.0, 66.0], [56.0, 67.5], [60.0, 66.0], [52.0, 64.5]] },
  { type: 'marsh', name: 'Biebrza a Narew', ring: [[22.5, 53.3], [23.5, 53.5], [23.3, 52.9], [22.6, 52.9]] },
  // pouště nad rámec názvů z NE
  { type: 'desert', name: 'Negevská a sinajská poušť', ring: [[33.8, 30.0], [35.2, 31.0], [35.3, 29.6], [34.2, 28.8]] },
  { type: 'desert', name: 'Zajordánská poušť', ring: [[36.5, 32.0], [39.3, 32.0], [39.0, 29.3], [36.5, 29.5]] },
  { type: 'desert', name: 'Syrská step', ring: [[38.0, 36.2], [41.0, 36.5], [42.0, 33.5], [38.0, 33.5]] },
  { type: 'desert', name: 'Íránská vysočina', ring: [[53.0, 35.0], [60.0, 35.5], [61.0, 29.0], [54.0, 29.5]] },
  { type: 'desert', name: 'Kazašsko-turkmenský písek', ring: [[52.0, 47.0], [63.0, 47.0], [63.0, 38.0], [53.0, 38.0], [52.0, 42.0]] },
  { type: 'desert', name: 'Libyjské pobřeží jih', ring: [[11.0, 31.5], [25.0, 31.5], [25.0, 25.0], [11.0, 25.0]] },
  { type: 'desert', name: 'Egypt – poušť', ring: [[25.0, 31.0], [34.5, 31.0], [34.5, 23.0], [25.0, 23.0]] },
  { type: 'desert', name: 'Alžírská Sahara', ring: [[-5.0, 33.0], [10.5, 33.0], [10.5, 22.0], [-5.0, 22.0]] },
  { type: 'desert', name: 'Maroko – jih', ring: [[-9.0, 31.5], [-1.5, 32.0], [-1.5, 28.0], [-9.0, 28.0]] },
  { type: 'desert', name: 'Arábie – severní', ring: [[36.0, 32.2], [48.0, 32.2], [48.0, 24.0], [36.0, 24.0]] },
  { type: 'desert', name: 'Arábie – východ', ring: [[48.0, 30.5], [57.0, 30.5], [57.0, 22.0], [48.0, 22.0]] },
  { type: 'desert', name: 'Pobřeží smlouvy', ring: [[51.5, 26.5], [56.5, 26.0], [56.5, 22.5], [51.5, 22.5]] },
  { type: 'desert', name: 'Iráčtí pouštní jihozápad', ring: [[40.0, 32.8], [45.0, 32.0], [45.0, 29.0], [40.0, 30.0]] },
  { type: 'desert', name: 'Kerman a Sistán', ring: [[56.0, 31.5], [62.5, 31.5], [62.5, 25.0], [56.0, 25.0]] },
];

// lesy: šum + práh podle polohy (viz terrainStep.js) – tady jen výjimky, kde les nemá být
export const NO_FOREST_ZONES = [
  { name: 'Pontická step', ring: [[28.0, 47.5], [40.0, 49.5], [48.0, 50.0], [48.0, 44.0], [34.0, 44.5], [28.0, 45.5]] },
  { name: 'Panonská nížina', ring: [[16.0, 47.8], [22.0, 48.2], [22.0, 45.0], [16.5, 45.2]] },
  { name: 'Dolnoválašská nížina', ring: [[22.5, 44.8], [28.5, 45.2], [28.5, 43.6], [22.5, 43.8]] },
];

// Lesnatost podle oblastí: hustota 0..1 = podíl plochy pokrytý lesem (šum rozhoduje, kde přesně). Při překryvu platí největší hustota.
export const FOREST_ZONES = [
  { name: 'Fennoskandská tajga', d: 0.85, ring: [[10, 60], [12, 63], [14, 66], [18, 68], [24, 69.5], [30, 70], [41, 68], [42, 66.5], [38, 64], [36, 62], [34, 60.5], [30, 60], [26, 60.3], [22, 60.5], [18, 60], [16, 59.3], [14, 58.8], [12.5, 58.5], [11, 59]] },
  { name: 'Smålandské lesy', d: 0.6, ring: [[12, 56.3], [16.2, 56.3], [16.5, 58.8], [12.5, 58.8]] },
  { name: 'Severoruská tajga', d: 0.85, ring: [[36, 62], [40, 66], [50, 66.5], [60, 66.5], [63.6, 62], [63.6, 56], [58, 55.5], [52, 57], [44, 58], [40, 59], [36, 60]] },
  { name: 'Smíšené lesy Východoevropské nížiny', d: 0.5, ring: [[12, 54], [18, 55], [24, 56.5], [28, 58.5], [34, 59], [38, 58], [44, 57.5], [48, 56.5], [52, 55.5], [56, 54], [56, 52], [50, 52.5], [44, 53], [38, 52.5], [34, 52.5], [30, 51.5], [26, 51.5], [22, 52], [18, 51.5], [14, 52], [12, 53]] },
  { name: 'Polesí', d: 0.62, ring: [[23, 51], [31, 51], [31, 53], [23, 53]] },
  { name: 'Prusko a Pomoří', d: 0.45, ring: [[14, 53.2], [19, 54.5], [22, 54.8], [23, 53.6], [19, 53.2], [15, 52.8]] },
  { name: 'Středoevropské vrchoviny', d: 0.5, ring: [[6, 49], [10, 50.4], [13, 51], [16, 50.6], [17, 49], [14, 47.6], [10, 47.5], [7.5, 48]] },
  { name: 'Alpské lesy', d: 0.55, ring: [[6, 46], [10, 47.5], [14, 47.6], [15.5, 47], [14, 46.2], [10, 45.8], [7, 45.2]] },
  { name: 'Karpaty', d: 0.62, ring: [[18, 49.5], [22, 49.6], [26, 48.6], [26.5, 47], [24, 45.5], [22, 45.4], [21, 47], [19, 48.5]] },
  { name: 'Balkánské lesy', d: 0.45, ring: [[16, 45.5], [20, 45], [22, 43], [20, 42], [17, 43.5]] },
  { name: 'Rodopy a Pirin', d: 0.5, ring: [[23, 42.5], [26, 42.4], [26, 41.4], [23.2, 41.4]] },
  { name: 'Černé moře – Pontské hory', d: 0.6, ring: [[30, 41.2], [36, 41.9], [41, 41.3], [41, 40.5], [36, 40.8], [31, 40.8]] },
  { name: 'Kavkaz – západ', d: 0.6, ring: [[37, 45], [41, 44], [43, 43], [42, 42], [38, 43.5]] },
  { name: 'Hyrkánské lesy', d: 0.7, ring: [[48.5, 38.5], [54, 37.0], [54.5, 36.5], [50, 36.4]] },
  { name: 'Landes', d: 0.7, ring: [[-1.4, 45.5], [-0.4, 45.0], [-0.4, 43.7], [-1.3, 43.8]] },
  { name: 'Francouzské vrchoviny', d: 0.5, ring: [[4, 50.2], [7, 50], [7.5, 48], [6.5, 47.8], [4.5, 49]] },
  { name: 'Bretaň a Normandie', d: 0.25, ring: [[-4.8, 48.6], [0.5, 49.6], [0.5, 48.0], [-3.0, 47.6]] },
  { name: 'Galicie a Kantábrie', d: 0.5, ring: [[-9, 43.5], [-1.5, 43.5], [-1.5, 42.7], [-8.7, 42]] },
  { name: 'Apeniny', d: 0.4, ring: [[9.5, 44.5], [12.5, 44.0], [14.5, 41.5], [16.5, 39.5], [15.5, 39.4], [13.5, 41.5], [11, 43.5]] },
  { name: 'Skotsko a sever Anglie', d: 0.2, ring: [[-6, 57.5], [-2, 57.8], [-2, 54.5], [-5, 55]] },
  { name: 'Norská pobřeží', d: 0.5, ring: [[4.8, 62], [8, 63.2], [12, 63.5], [11, 60], [6, 58.8]] },
  { name: 'Uralské lesy', d: 0.8, ring: [[56, 57], [63.6, 60], [63.6, 66], [58, 66], [55, 61]] },
  { name: 'Estonsko a Lotyšsko', d: 0.5, ring: [[21, 56.5], [28, 59.5], [28, 57], [24, 55.8]] },
  { name: 'Anatolské lesy', d: 0.2, ring: [[27, 40.4], [33, 41.5], [33, 39.5], [28, 38.6]] },
  { name: 'Pelješac a Dalmácie', d: 0.3, ring: [[13.5, 45.3], [19.5, 42.0], [18.5, 41.8], [14, 44.5]] },
  { name: 'Korsika a Sardinie', d: 0.35, ring: [[8.5, 43.0], [9.6, 42.5], [9.6, 39.5], [8.3, 39.5]] },
];
