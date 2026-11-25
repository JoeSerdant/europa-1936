// Alternativní cesty a modernizace (M100). Vlastní obsah, bez skutečných osob.
//  • Politické cesty: na začátku stromu volba mezi historickou cestou (`path: 'hist'`) a alternativami (`path: 'alt'`), vzájemně výlučné (`excl`).
//    Alternativa vede přes podporu strany ke změně vlády (účinek `gov`), novým spojencům a národnímu duchu. Historická AI cesty nevybírá
//    (průběh války drží koleje); AI bez historie zvolí jednu z dostupných cest (`aiMayFocus` v engine/nat/day.js).
//  • Modernizace: větev pozdních technologií (logistika, radar, rakety, proudová letadla, výsadky) pro všechny země a výchozí strom.
//  Položka: [id, název, dny, předpoklady, účinky, doplňky { ai, info, mod, excl, any, path }]
import { COUNTRIES } from '../countries.js';

const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const spirit = (id) => ({ t: 'spirit', id });
const bld = (k, n = 1) => ({ t: 'bld', k, n });
const party = (i, v) => ({ t: 'party', i, v });
const gov = (i, v = 30) => ({ t: 'gov', i, v });
const law = (cat, id) => ({ t: 'law', cat, id });
const NAMES = {
  GER: 'Německo', ITA: 'Itálie', SOV: 'SSSR', ENG: 'Británie', FRA: 'Francie', POL: 'Polsko', CZE: 'Československo', HUN: 'Maďarsko', ROM: 'Rumunsko',
  YUG: 'Jugoslávie', BUL: 'Bulharsko', GRE: 'Řecko', TUR: 'Turecko', SPR: 'Španělsko', POR: 'Portugalsko', SWE: 'Švédsko', FIN: 'Finsko', NOR: 'Norsko',
  DEN: 'Dánsko', HOL: 'Nizozemsko', BEL: 'Belgie', SWI: 'Švýcarsko', AUS: 'Rakousko', EST: 'Estonsko', LAT: 'Lotyšsko', LIT: 'Litva', ALB: 'Albánie', EGY: 'Egypt',
  IRE: 'Irsko', IRQ: 'Irák', PER: 'Persie', SAU: 'Saúdská Arábie', OMA: 'Omán', ICE: 'Island', LUX: 'Lucembursko',

  // W1
  USA: 'Spojené státy', CAN: 'Kanada', MEX: 'Mexiko', GUA: 'Guatemala', HON: 'Honduras', ELS: 'Salvador', NIC: 'Nikaragua', COS: 'Kostarika', PAN: 'Panama', CUB: 'Kuba', HAI: 'Haiti', DOM: 'Dominikánská republika', COL: 'Kolumbie', VEN: 'Venezuela', ECU: 'Ekvádor', PRU: 'Peru', BOL: 'Bolívie', CHL: 'Chile', ARG: 'Argentina', URG: 'Uruguay', PAR: 'Paraguay', BRA: 'Brazílie', ETH: 'Etiopie', LBR: 'Libérie', SAF: 'Jihoafrická unie', JAP: 'Japonsko', MAN: 'Mandžukuo', CHI: 'Čína', PRC: 'Čínští komunisté', SIK: 'Sin-ťiang', TIB: 'Tibet', MON: 'Mongolsko', TAN: 'Tuva', SIA: 'Siam', AFG: 'Afghánistán', RAJ: 'Indie', NEP: 'Nepál', YEM: 'Jemen', PHI: 'Filipíny', AST: 'Austrálie', NZL: 'Nový Zéland',
};
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });

/** Kořeny jedné volby cest: `roots` = [[id, název, účinky, path, info]] – každý vylučuje ostatní. */
const choice = (roots, ai = 12) => roots.map(([id, n, fx, path, info]) => [id, n, 35, [], fx, { path, ai, info, excl: roots.map((r) => r[0]).filter((x) => x !== id) }]);

// ---------------------------------------------------------------- velmoci (větve pro `big` stromy)
export const ALT_BRANCHES = {
  GER: [{ prio: 3, list: [
    ...choice([
      ['ger_alt_kurz', 'Nastoupený kurz', [pp(40), ws(0.03)], 'hist', 'Historická cesta: režim zůstává a připravuje se na válku.'],
      ['ger_alt_mon', 'Návrat koruny', [party('neutrality', 12), stab(-0.03)], 'alt', 'Armáda a konzervativci sesadí režim a obnoví monarchii.'],
      ['ger_alt_dem', 'Obnova republiky', [party('democracy', 12), stab(-0.04)], 'alt', 'Demokratická opozice se vrátí k moci.'],
      ['ger_alt_com', 'Rudá revoluce', [party('communism', 12), stab(-0.05)], 'alt', 'Dělnické rady převezmou továrny a vládu.'],
    ]),
    ['ger_alt_kurz2', 'Jednota strany a státu', 35, ['ger_alt_kurz'], [spirit('kontinuita_vlady'), pp(30)]],
    // monarchie
    ['ger_alt_mon1', 'Armáda nad stranami', 35, ['ger_alt_mon'], [party('neutrality', 10), xp('land', 20)]],
    ['ger_alt_mon2', 'Regentská rada', 70, ['ger_alt_mon1'], [gov('neutrality'), stab(0.04)]],
    ['ger_alt_mon3', 'Pruské tradice', 35, ['ger_alt_mon2'], [spirit('cisarska_armada'), boost('sup_pruz', 0.4)]],
    ['ger_alt_mon4', 'Smír s Londýnem', 35, ['ger_alt_mon2'], [rel('ENG', 50), rel('FRA', 30)]],
    ['ger_alt_mon5', 'Středoevropská unie', 35, ['ger_alt_mon4'], [rel('AUS', 50), rel('HUN', 40), rel('CZE', 20)]],
    ['ger_alt_mon6', 'Koruna a průmysl', 70, ['ger_alt_mon3'], [civ(2), boost('ind_mech', 0.4)]],
    ['ger_alt_mon7', 'Císařské námořnictvo', 35, ['ger_alt_mon6'], [boost('bb2', 0.5), bld('dok', 1), xp('sea', 20)]],
    ['ger_alt_mon8', 'Říše ve středu Evropy', 70, ['ger_alt_mon5', 'ger_alt_mon7'], [ws(0.06), man(0.004)], { mod: { stab: 0.03 } }],
    // republika
    ['ger_alt_dem1', 'Svobodné volby', 35, ['ger_alt_dem'], [party('democracy', 12), pp(20)]],
    ['ger_alt_dem2', 'Nová ústava', 70, ['ger_alt_dem1'], [gov('democracy'), stab(0.05)]],
    ['ger_alt_dem3', 'Usmíření se západem', 35, ['ger_alt_dem2'], [rel('FRA', 60), rel('ENG', 50), rel('POL', 30)]],
    ['ger_alt_dem4', 'Sociální tržní hospodářství', 70, ['ger_alt_dem2'], [civ(3), law('trd', 'free')]],
    ['ger_alt_dem5', 'Obranná armáda republiky', 35, ['ger_alt_dem4'], [boost('inf_zak', 0.5), boost('art_pl', 0.4)]],
    ['ger_alt_dem6', 'Vědecká spolupráce', 35, ['ger_alt_dem3'], [boost('vyz_univ', 0.5), boost('el_radio', 0.4)], { mod: { research: 0.04 } }],
    ['ger_alt_dem7', 'Obnovená republika', 70, ['ger_alt_dem5', 'ger_alt_dem6'], [spirit('obnovena_republika')]],
    ['ger_alt_dem8', 'Evropská obranná smlouva', 35, ['ger_alt_dem7'], [rel('HOL', 30), rel('BEL', 30), rel('CZE', 30), ws(0.05)]],
    // rudé Německo
    ['ger_alt_com1', 'Generální stávka', 35, ['ger_alt_com'], [party('communism', 15), stab(-0.03)]],
    ['ger_alt_com2', 'Rada lidových komisařů', 70, ['ger_alt_com1'], [gov('communism'), stab(0.03)]],
    ['ger_alt_com3', 'Rudá armáda Německa', 35, ['ger_alt_com2'], [man(0.005), stock('pusky', 3000)]],
    ['ger_alt_com4', 'Znárodnění koncernů', 70, ['ger_alt_com2'], [mil(2), civ()]],
    ['ger_alt_com5', 'Spojenectví s Moskvou', 35, ['ger_alt_com3'], [rel('SOV', 70), rel('POL', -30)]],
    ['ger_alt_com6', 'Rudé Německo', 70, ['ger_alt_com4', 'ger_alt_com5'], [spirit('rude_nemecko')]],
    ['ger_alt_com7', 'Světová revoluce', 35, ['ger_alt_com6'], [ws(0.08), xp('land', 25)]],
  ] }],
  SOV: [{ prio: 3, list: [
    ...choice([
      ['sov_alt_kurz', 'Generální linie', [pp(40), ws(0.03)], 'hist', 'Historická cesta: plánované hospodářství a pevná ruka strany.'],
      ['sov_alt_nep', 'Návrat k nové hospodářské politice', [party('communism', 5), stab(0.03)], 'alt', 'Strana povolí trh a soukromé hospodaření.'],
      ['sov_alt_dem', 'Demokratizace sovětů', [party('democracy', 12), stab(-0.04)], 'alt', 'Sověty si zvolí vlastní zástupce a strana ztratí monopol.'],
      ['sov_alt_rus', 'Národní obroda', [party('neutrality', 12), stab(-0.05)], 'alt', 'Armáda a církev postaví národ nad třídu.'],
    ]),
    ['sov_alt_kurz2', 'Ocelová disciplína', 35, ['sov_alt_kurz'], [spirit('kontinuita_vlady'), man(0.002)]],
    ['sov_alt_nep1', 'Družstevní vesnice', 35, ['sov_alt_nep'], [stab(0.05), boost('ind_bet', 0.4)]],
    ['sov_alt_nep2', 'Trh s obilím', 35, ['sov_alt_nep1'], [civ(2), law('trd', 'free')]],
    ['sov_alt_nep3', 'Zahraniční koncese', 35, ['sov_alt_nep2'], [rel('ENG', 30), rel('FRA', 30), boost('ind_pas', 0.4)]],
    ['sov_alt_nep4', 'Nová hospodářská politika', 70, ['sov_alt_nep3'], [spirit('nova_hospodarska_politika'), civ()]],
    ['sov_alt_nep5', 'Rehabilitace velitelů', 35, ['sov_alt_nep1'], [xp('land', 30), stab(0.03)]],
    ['sov_alt_nep6', 'Smíšená ekonomika', 70, ['sov_alt_nep4', 'sov_alt_nep5'], [civ(2)], { mod: { build: 0.03 } }],
    ['sov_alt_dem1', 'Svobodné volby do sovětů', 35, ['sov_alt_dem'], [party('democracy', 12), pp(20)]],
    ['sov_alt_dem2', 'Ústavodárné shromáždění', 70, ['sov_alt_dem1'], [gov('democracy'), stab(0.04)]],
    ['sov_alt_dem3', 'Federace svobodných republik', 35, ['sov_alt_dem2'], [spirit('svobodne_sovety')]],
    ['sov_alt_dem4', 'Mír na západní hranici', 35, ['sov_alt_dem2'], [rel('POL', 50), rel('FIN', 50), rel('ROM', 30)]],
    ['sov_alt_dem5', 'Spojenectví demokracií', 35, ['sov_alt_dem4'], [rel('ENG', 50), rel('FRA', 50)]],
    ['sov_alt_dem6', 'Akademie bez cenzury', 35, ['sov_alt_dem3'], [boost('vyz_univ', 0.5), boost('vyz_lab', 0.4)], { mod: { research: 0.04 } }],
    ['sov_alt_dem7', 'Občanská armáda', 70, ['sov_alt_dem5', 'sov_alt_dem6'], [man(0.004), boost('inf_zak', 0.5)]],
    ['sov_alt_rus1', 'Zvony znovu zní', 35, ['sov_alt_rus'], [party('neutrality', 12), stab(0.03)]],
    ['sov_alt_rus2', 'Vojenská správa', 70, ['sov_alt_rus1'], [gov('neutrality'), ws(0.04)]],
    ['sov_alt_rus3', 'Ruská obroda', 35, ['sov_alt_rus2'], [spirit('ruska_obroda')]],
    ['sov_alt_rus4', 'Kozácké pluky', 35, ['sov_alt_rus2'], [xp('land', 25), stock('auta', 300)]],
    ['sov_alt_rus5', 'Slovanská jednota', 35, ['sov_alt_rus3'], [rel('YUG', 50), rel('BUL', 50), rel('CZE', 30)]],
    ['sov_alt_rus6', 'Uralská zbrojovka', 70, ['sov_alt_rus4'], [mil(2)]],
    ['sov_alt_rus7', 'Velká Rus', 70, ['sov_alt_rus5', 'sov_alt_rus6'], [ws(0.06), man(0.004)]],
  ] }],
  ENG: [{ prio: 3, list: [
    ...choice([
      ['eng_alt_kurz', 'Parlamentní tradice', [pp(40), stab(0.03)], 'hist', 'Historická cesta: parlamentní vláda a pomalé přezbrojení.'],
      ['eng_alt_fas', 'Hnutí za nový řád', [party('fascism', 12), stab(-0.05)], 'alt', 'Uniformované hnutí slibuje konec krize silnou rukou.'],
      ['eng_alt_com', 'Dělnická republika', [party('communism', 12), stab(-0.05)], 'alt', 'Odbory vyhlásí generální stávku a převezmou zemi.'],
      ['eng_alt_imp', 'Imperiální federace', [party('democracy', 5), pp(30)], 'alt', 'Dominia a kolonie se spojí v jednu federaci.'],
    ]),
    ['eng_alt_kurz2', 'Koalice všech stran', 35, ['eng_alt_kurz'], [spirit('kontinuita_vlady'), ws(0.03)]],
    ['eng_alt_fas1', 'Pochody na Londýn', 35, ['eng_alt_fas'], [party('fascism', 15)]],
    ['eng_alt_fas2', 'Rozpuštění parlamentu', 70, ['eng_alt_fas1'], [gov('fascism'), ws(0.05)]],
    ['eng_alt_fas3', 'Nový řád', 35, ['eng_alt_fas2'], [spirit('novy_rad_britanie')]],
    ['eng_alt_fas4', 'Dohoda s kontinentem', 35, ['eng_alt_fas2'], [rel('GER', 50), rel('ITA', 50), rel('FRA', -30)]],
    ['eng_alt_fas5', 'Říšské zbrojovky', 70, ['eng_alt_fas3'], [mil(2)]],
    ['eng_alt_fas6', 'Imperiální legie', 70, ['eng_alt_fas4', 'eng_alt_fas5'], [man(0.004), xp('land', 25)]],
    ['eng_alt_com1', 'Generální stávka', 35, ['eng_alt_com'], [party('communism', 15)]],
    ['eng_alt_com2', 'Svaz britských republik', 70, ['eng_alt_com1'], [gov('communism'), stab(0.03)]],
    ['eng_alt_com3', 'Dělnická republika', 35, ['eng_alt_com2'], [spirit('delnicka_republika')]],
    ['eng_alt_com4', 'Bratrství s Moskvou', 35, ['eng_alt_com2'], [rel('SOV', 60), rel('FRA', 20)]],
    ['eng_alt_com5', 'Znárodněné loděnice', 70, ['eng_alt_com3'], [bld('dok', 2), boost('dd2', 0.4)]],
    ['eng_alt_com6', 'Lidové námořnictvo', 70, ['eng_alt_com4', 'eng_alt_com5'], [xp('sea', 30), boost('cv2', 0.4)]],
    ['eng_alt_imp1', 'Konference dominií', 35, ['eng_alt_imp'], [man(0.004), stab(0.03)]],
    ['eng_alt_imp2', 'Imperiální preference', 35, ['eng_alt_imp1'], [civ(2)], { mod: { imp: -0.06 } }],
    ['eng_alt_imp3', 'Imperiální federace', 70, ['eng_alt_imp2'], [spirit('imperialni_federace')]],
    ['eng_alt_imp4', 'Společný generální štáb', 35, ['eng_alt_imp1'], [xp('land', 20), xp('sea', 20)]],
    ['eng_alt_imp5', 'Atlantické přátelství', 35, ['eng_alt_imp4'], [rel('FRA', 40), rel('HOL', 30), rel('NOR', 30)]],
    ['eng_alt_imp6', 'Federální loďstvo', 70, ['eng_alt_imp3', 'eng_alt_imp5'], [boost('bb3', 0.4), boost('cv2', 0.4), bld('dok', 1)]],
  ] }],
  FRA: [{ prio: 3, list: [
    ...choice([
      ['fra_alt_kurz', 'Třetí republika', [pp(40), stab(0.02)], 'hist', 'Historická cesta: střídání vlád a obrana za pevnostmi.'],
      ['fra_alt_pop', 'Lidová fronta u moci', [party('communism', 12), stab(-0.03)], 'alt', 'Levice ovládne ulice i parlament.'],
      ['fra_alt_nat', 'Národní revoluce', [party('fascism', 12), stab(-0.05)], 'alt', 'Ligy a veteráni svrhnou republiku.'],
      ['fra_alt_mon', 'Obnova monarchie', [party('neutrality', 12), stab(-0.04)], 'alt', 'Royalisté a armáda přivolají krále.'],
    ]),
    ['fra_alt_kurz2', 'Posvátná jednota', 35, ['fra_alt_kurz'], [spirit('kontinuita_vlady'), unspiritSafe('rozstepena_republika')]],
    ['fra_alt_pop1', 'Matignonské dohody', 35, ['fra_alt_pop'], [party('communism', 12), stab(0.03)]],
    ['fra_alt_pop2', 'Lidová vláda', 70, ['fra_alt_pop1'], [gov('communism'), pp(30)]],
    ['fra_alt_pop3', 'Lidová fronta', 35, ['fra_alt_pop2'], [spirit('lidova_fronta')]],
    ['fra_alt_pop4', 'Znárodněné letectví', 70, ['fra_alt_pop3'], [mil(), boost('sti2', 0.5)]],
    ['fra_alt_pop5', 'Pakt s Moskvou', 35, ['fra_alt_pop2'], [rel('SOV', 60), rel('CZE', 40)]],
    ['fra_alt_pop6', 'Dobrovolníci do Španělska', 35, ['fra_alt_pop5'], [rel('SPR', 30), xp('land', 20)]],
    ['fra_alt_pop7', 'Lidová armáda', 70, ['fra_alt_pop4', 'fra_alt_pop6'], [man(0.004), boost('tank_rad', 0.4)]],
    ['fra_alt_nat1', 'Únorové nepokoje', 35, ['fra_alt_nat'], [party('fascism', 15)]],
    ['fra_alt_nat2', 'Stát nad stranami', 70, ['fra_alt_nat1'], [gov('fascism'), ws(0.05)]],
    ['fra_alt_nat3', 'Národní revoluce', 35, ['fra_alt_nat2'], [spirit('narodni_revoluce'), unspiritSafe('rozstepena_republika')]],
    ['fra_alt_nat4', 'Latinský blok', 35, ['fra_alt_nat2'], [rel('ITA', 50), rel('SPR', 40), rel('POR', 30)]],
    ['fra_alt_nat5', 'Mobilní armáda', 70, ['fra_alt_nat3'], [unspiritSafe('obranne_mysleni'), boost('tank_rad', 0.5), xp('land', 25)]],
    ['fra_alt_nat6', 'Africké impérium', 70, ['fra_alt_nat4', 'fra_alt_nat5'], [man(0.004)], { mod: { extract: 0.04 } }],
    ['fra_alt_mon1', 'Akce royalistů', 35, ['fra_alt_mon'], [party('neutrality', 15)]],
    ['fra_alt_mon2', 'Návrat krále', 70, ['fra_alt_mon1'], [gov('neutrality'), stab(0.05)]],
    ['fra_alt_mon3', 'Obnovená koruna', 35, ['fra_alt_mon2'], [spirit('obnovena_koruna'), unspiritSafe('rozstepena_republika')]],
    ['fra_alt_mon4', 'Koruna a armáda', 35, ['fra_alt_mon3'], [unspiritSafe('tezkopadne_veleni'), xp('land', 20)]],
    ['fra_alt_mon5', 'Dynastické sňatky', 35, ['fra_alt_mon2'], [rel('BEL', 40), rel('ENG', 30), rel('SPR', 30)]],
    ['fra_alt_mon6', 'Královské manufaktury', 70, ['fra_alt_mon4', 'fra_alt_mon5'], [civ(2), mil()]],
  ] }],
  ITA: [{ prio: 3, list: [
    ...choice([
      ['ita_alt_kurz', 'Nová římská říše', [pp(40), ws(0.03)], 'hist', 'Historická cesta: režim sní o říši kolem Středomoří.'],
      ['ita_alt_mon', 'Koruna proti režimu', [party('neutrality', 12), stab(-0.03)], 'alt', 'Král a generálové odvolají vůdce.'],
      ['ita_alt_dem', 'Demokratická obnova', [party('democracy', 12), stab(-0.04)], 'alt', 'Opozice se vrátí z exilu a vyhraje volby.'],
      ['ita_alt_com', 'Rudé Itálie', [party('communism', 12), stab(-0.05)], 'alt', 'Dělníci obsadí továrny severu.'],
    ]),
    ['ita_alt_kurz2', 'Mare Nostrum', 35, ['ita_alt_kurz'], [spirit('kontinuita_vlady'), xp('sea', 15)]],
    ['ita_alt_mon1', 'Velká rada se rozpadá', 35, ['ita_alt_mon'], [party('neutrality', 15)]],
    ['ita_alt_mon2', 'Královská vláda', 70, ['ita_alt_mon1'], [gov('neutrality'), stab(0.04)]],
    ['ita_alt_mon3', 'Pád režimu', 35, ['ita_alt_mon2'], [spirit('pad_rezimu')]],
    ['ita_alt_mon4', 'Návrat ke spojencům', 35, ['ita_alt_mon2'], [rel('ENG', 50), rel('FRA', 50), rel('GER', -30)]],
    ['ita_alt_mon5', 'Alpské divize', 35, ['ita_alt_mon3'], [boost('inf_hory', 0.5), xp('land', 15)]],
    ['ita_alt_mon6', 'Královské loďstvo', 70, ['ita_alt_mon4', 'ita_alt_mon5'], [boost('bb2', 0.4), bld('dok', 1)]],
    ['ita_alt_dem1', 'Návrat z exilu', 35, ['ita_alt_dem'], [party('democracy', 15)]],
    ['ita_alt_dem2', 'Republika', 70, ['ita_alt_dem1'], [gov('democracy'), stab(0.04)]],
    ['ita_alt_dem3', 'Demokratický převrat', 35, ['ita_alt_dem2'], [spirit('novy_rezim_dem'), unspiritSafe('sen_o_imperiu')]],
    ['ita_alt_dem4', 'Pozemková reforma', 70, ['ita_alt_dem3'], [civ(2), stab(0.03)]],
    ['ita_alt_dem5', 'Západní dohoda', 35, ['ita_alt_dem2'], [rel('FRA', 50), rel('ENG', 40), rel('GRE', 30)]],
    ['ita_alt_dem6', 'Průmysl severu', 70, ['ita_alt_dem4', 'ita_alt_dem5'], [unspiritSafe('slaby_prumysl'), boost('ind_pas', 0.5)]],
    ['ita_alt_com1', 'Obsazení továren', 35, ['ita_alt_com'], [party('communism', 15)]],
    ['ita_alt_com2', 'Italská sovětská republika', 70, ['ita_alt_com1'], [gov('communism'), stab(0.03)]],
    ['ita_alt_com3', 'Rudá Itálie', 35, ['ita_alt_com2'], [spirit('rude_italie')]],
    ['ita_alt_com4', 'Půda rolníkům', 35, ['ita_alt_com3'], [man(0.004), stab(0.03)]],
    ['ita_alt_com5', 'Bratrská pomoc', 35, ['ita_alt_com2'], [rel('SOV', 60), rel('YUG', 30)]],
    ['ita_alt_com6', 'Rudé brigády', 70, ['ita_alt_com4', 'ita_alt_com5'], [mil(2), stock('pusky', 2000)]],
  ] }],
};
function unspiritSafe(id) { return { t: 'unspirit', id }; }

// ---------------------------------------------------------------- ostatní země: cesty k ostatním ideologiím (generované)
const IDEO = {
  democracy: { k: 'dem', sp: 'novy_rezim_dem', root: 'Demokratická opozice', s1: 'Svobodný tisk', s2: 'Svobodné volby', s3: 'Spojenci na západě', s4: 'Obnova hospodářství', s5: 'Demokratický převrat',
    ally: ['ENG', 'FRA'], eco: () => [civ(), stab(0.03)] },
  communism: { k: 'com', sp: 'novy_rezim_com', root: 'Dělnické rady', s1: 'Generální stávka', s2: 'Lidová republika', s3: 'Bratrská pomoc', s4: 'Znárodnění průmyslu', s5: 'Vítězství revoluce',
    ally: ['SOV', 'SOV'], eco: () => [mil(), man(0.002)] },
  fascism: { k: 'fas', sp: 'novy_rezim_fas', root: 'Národní hnutí', s1: 'Pochod na hlavní město', s2: 'Vláda jedné strany', s3: 'Osa přátel', s4: 'Zbrojní program', s5: 'Národní stát',
    ally: ['GER', 'ITA'], eco: () => [mil(), ws(0.04)] },
  neutrality: { k: 'neu', sp: 'novy_rezim_neu', root: 'Spiknutí generálů', s1: 'Výjimečný stav', s2: 'Vláda silné ruky', s3: 'Ozbrojená neutralita', s4: 'Státní zakázky', s5: 'Nový pořádek',
    ally: [null, null], eco: () => [civ(), pp(30)] },
};
const IDEO_NAME = { democracy: 'demokracie', communism: 'komunismus', fascism: 'fašismus', neutrality: 'autoritářský režim' };
const NEAR = {   // sousedé pro „silnou ruku“ (neutrální cesta)
  POL: ['ROM', 'HUN'], CZE: ['POL', 'AUS'], SPR: ['POR', 'ITA'], HUN: ['AUS', 'POL'], ROM: ['POL', 'YUG'], YUG: ['GRE', 'ROM'], TUR: ['GRE', 'PER'], SWE: ['NOR', 'FIN'],
  FIN: ['SWE', 'EST'], GRE: ['TUR', 'YUG'], HOL: ['BEL', 'ENG'], BEL: ['HOL', 'FRA'], POR: ['SPR', 'ENG'], SWI: ['AUS', 'ITA'], NOR: ['SWE', 'DEN'], BUL: ['TUR', 'YUG'],
  IRE: ['ENG', 'ICE'], LUX: ['BEL', 'HOL'], AUS: ['HUN', 'SWI'], DEN: ['SWE', 'NOR'], EST: ['FIN', 'LAT'], LAT: ['EST', 'LIT'], LIT: ['LAT', 'POL'], ALB: ['GRE', 'YUG'],
  ICE: ['NOR', 'DEN'], EGY: ['TUR', 'SAU'], IRQ: ['SAU', 'PER'], PER: ['TUR', 'IRQ'], SAU: ['IRQ', 'EGY'], OMA: ['PER', 'SAU'],
  // W1
  USA: ['CAN', 'MEX'], CAN: ['USA', 'ENG'], MEX: ['USA', 'GUA'], GUA: ['MEX', 'HON'], HON: ['GUA', 'NIC'], ELS: ['GUA', 'HON'], NIC: ['HON', 'COS'], COS: ['NIC', 'PAN'], PAN: ['COS', 'COL'], CUB: ['USA', 'HAI'], HAI: ['DOM', 'CUB'], DOM: ['HAI', 'CUB'], COL: ['VEN', 'ECU'], VEN: ['COL', 'BRA'], ECU: ['PRU', 'COL'], PRU: ['ECU', 'BOL'], BOL: ['PAR', 'PRU'], CHL: ['ARG', 'PRU'], ARG: ['BRA', 'CHL'], URG: ['ARG', 'BRA'], PAR: ['BOL', 'ARG'], BRA: ['ARG', 'URG'], ETH: ['ITA', 'ENG'], LBR: ['ENG', 'FRA'], SAF: ['ENG', 'POR'], JAP: ['CHI', 'SOV'], MAN: ['JAP', 'CHI'], CHI: ['JAP', 'PRC'], PRC: ['CHI', 'SOV'], SIK: ['SOV', 'CHI'], TIB: ['CHI', 'RAJ'], MON: ['SOV', 'CHI'], TAN: ['SOV', 'MON'], SIA: ['FRA', 'ENG'], AFG: ['RAJ', 'PER'], RAJ: ['ENG', 'AFG'], NEP: ['RAJ', 'TIB'], YEM: ['SAU', 'ENG'], PHI: ['USA', 'JAP'], AST: ['NZL', 'ENG'], NZL: ['AST', 'ENG'],
};
export const HIST_NAME = {
  POL: 'Vláda plukovníků', CZE: 'Hradní politika', SPR: 'Republika v krizi', HUN: 'Regentství', ROM: 'Královská diktatura', YUG: 'Regentská vláda', TUR: 'Odkaz zakladatele',
  SWE: 'Lidový domov', FIN: 'Mladá republika', GRE: 'Režim generála', HOL: 'Koloniální monarchie', BEL: 'Politika nezávislosti', POR: 'Nový stát', SWI: 'Spolková rada',
  NOR: 'Dělnická vláda', BUL: 'Carská vláda', IRE: 'Svobodný stát', LUX: 'Velkovévodství', AUS: 'Stavovský stát', DEN: 'Sociální smír', EST: 'Doba mlčení', LAT: 'Vůdcovský režim',
  LIT: 'Prezidentský režim', ALB: 'Královský dvůr', ICE: 'Althing', EGY: 'Král a parlament', IRQ: 'Hášimovská koruna', PER: 'Šáhova modernizace', SAU: 'Pouštní království', OMA: 'Sultanát',
  // W1
  USA: 'Nový úděl', CAN: 'Liberální vláda', MEX: 'Revoluční strana', GUA: 'Vláda generála', HON: 'Vláda caudilla', ELS: 'Vojenská vláda', NIC: 'Vláda národní gardy', COS: 'Kávová republika', PAN: 'Ústavní vláda', CUB: 'Vláda za armádou', HAI: 'Prezidentská vláda', DOM: 'Éra generalissima', COL: 'Liberální republika', VEN: 'Přechodná vláda', ECU: 'Vláda dekretů', PRU: 'Vojenská vláda', BOL: 'Poválečná vláda', CHL: 'Konzervativní republika', ARG: 'Konzervativní dekáda', URG: 'Terrova vláda', PAR: 'Vláda veteránů', BRA: 'Varguismus', ETH: 'Císařský dvůr', LBR: 'Pravá whigská strana', SAF: 'Spojená strana', JAP: 'Vláda pod tlakem armády', MAN: 'Loutkový trůn', CHI: 'Národní vláda', PRC: 'Sovětská oblast', SIK: 'Vláda guvernéra', TIB: 'Regentská vláda', MON: 'Lidová vláda', TAN: 'Lidová vláda', SIA: 'Konstituční vláda', AFG: 'Královská vláda', RAJ: 'Místokrálovská správa', NEP: 'Vláda Ranů', YEM: 'Imámova vláda', PHI: 'Vláda Společenství', AST: 'Spojenecká vláda', NZL: 'Labouristická vláda',
};

/** Cesty země `tag` (prefix `p`): historická + alternativy ke všem ostatním ideologiím. `ideo` = výchozí ideologie (null = všechny čtyři, výchozí strom). */
export function paths(p, tag, ideo, histName) {
  const list = [], keys = Object.keys(IDEO).filter((i) => i !== ideo);
  const roots = [[`${p}_alt_hist`, histName || 'Osvědčený kurz', [pp(30), stab(0.02)], 'hist', 'Historická cesta: vláda zůstává.'],
    ...keys.map((i) => [`${p}_alt_${IDEO[i].k}`, IDEO[i].root, [party(i, 10), stab(-0.03)], 'alt', `Alternativní cesta: ${IDEO_NAME[i]}.`])];
  for (const r of choice(roots, 15)) list.push(r);
  list.push([`${p}_alt_hist2`, 'Kontinuita vlády', 35, [`${p}_alt_hist`], [spirit('kontinuita_vlady')], { ai: 16 }]);
  for (const i of keys) {
    const d = IDEO[i], q = `${p}_alt_${d.k}`, near = NEAR[tag] || ['ENG', 'FRA'];
    const allies = d.ally[0] ? d.ally : near;
    list.push(
      [`${q}1`, d.s1, 35, [q], [party(i, 12), pp(20)], { ai: 16 }],
      [`${q}2`, d.s2, 70, [`${q}1`], [gov(i), stab(0.03)], { ai: 17 }],
      [`${q}3`, d.s3, 35, [`${q}2`], [rel(allies[0], 40), ...(allies[1] && allies[1] !== allies[0] ? [rel(allies[1], 30)] : [])], { ai: 18 }],
      [`${q}4`, d.s4, 70, [`${q}2`], d.eco(), { ai: 18 }],
      [`${q}5`, d.s5, 35, [`${q}3`, `${q}4`], [spirit(d.sp)], { ai: 19 }],
    );
  }
  return list;
}
const GP = new Set(['GER', 'SOV', 'ENG', 'FRA', 'ITA']);
const WGP = new Set(['USA', 'JAP', 'CHI']);   // W3: velmoci světa mají cesty a modernizaci přímo ve velkém stromu (`focuses_world.js`)
export const ALT_GROW = {};
for (const tag of Object.keys(NAMES)) if (!GP.has(tag) && !WGP.has(tag)) ALT_GROW[tag] = paths(tag.toLowerCase(), tag, COUNTRIES[tag]?.ideology || 'neutrality', HIST_NAME[tag]);

// ---------------------------------------------------------------- modernizace (všechny země)
/** Větev pozdních technologií pro zemi s prefixem `p` (`x` = vlastní názvy). */
export function modern(p, x = {}) {
  const q = (k) => `${p}_mod_${k}`;
  return [
    [q('log'), x.log || 'Polní logistika', 35, [], [boost('sup_dop', 0.4), boost('sup_zel', 0.3)]],
    [q('rail'), x.rail || 'Vojenské železnice', 35, [q('log')], [infra(), boost('sup_zel', 0.3)]],
    [q('fuel'), x.fuel || 'Syntetická paliva', 35, [], [boost('synt1', 0.5), boost('ind_destil', 0.3)]],
    [q('pref'), x.pref || 'Prefabrikované stavby', 35, [q('fuel')], [boost('ind_prefab', 0.5)], { mod: { build: 0.02 } }],
    [q('radar'), x.radar || 'Radiolokační síť', 35, [], [boost('el_radar', 0.5), bld('radar', 1)]],
    [q('radar2'), x.radar2 || 'Centimetrový radar', 35, [q('radar')], [boost('el_radar2', 0.5), boost('nav_radar', 0.3)]],
    [q('comp'), x.comp || 'Výpočetní ústav', 70, [q('radar2')], [boost('el_comp', 0.4), boost('el_rus', 0.3)], { mod: { research: 0.02 } }],
    [q('rak'), x.rak || 'Raketové dělostřelectvo', 35, [], [boost('art_rak', 0.5), boost('el_rak', 0.3)]],
    [q('jet'), x.jet || 'Proudové letectvo', 70, [q('rak')], [boost('el_jet', 0.4), boost('air_turbo', 0.4)]],
    [q('mech'), x.mech || 'Mechanizovaná pěchota', 35, [], [boost('mech2', 0.4), boost('tank_plam', 0.3)]],
    [q('para'), x.para || 'Výsadková vojska', 35, [q('mech')], [boost('sup_vys', 0.5), boost('inf_komando', 0.4)]],
    [q('med'), x.med || 'Vojenské zdravotnictví', 35, [q('para')], [boost('sup_san', 0.5), boost('sup_reh', 0.4), man(0.002)]],
    [q('amph'), x.amph || 'Obojživelné operace', 35, [q('rail')], [boost('nav_vysad', 0.4), boost('tr2', 0.3)]],
    [q('final'), x.final || 'Moderní armáda', 70, [q('comp'), q('jet'), q('med')], [xp('land', 25), xp('air', 15)]],
  ];
}
const MOD_NAMES = {
  GER: { final: 'Armáda budoucnosti', jet: 'Proudové stíhačky', rak: 'Odvetné zbraně' }, SOV: { rak: 'Raketomety', final: 'Hluboká operace', mech: 'Tanková vojska' },
  ENG: { radar: 'Řetěz radarů', comp: 'Luštitelská stanice', final: 'Kombinované operace' }, FRA: { final: 'Nová armáda republiky' }, ITA: { amph: 'Námořní pěchota', final: 'Moderní legie' },
};
export const MOD_BRANCHES = {};
for (const tag of GP) MOD_BRANCHES[tag] = [{ prio: 9, list: modern(tag.toLowerCase(), MOD_NAMES[tag]) }];
export const MOD_GROW = {};
for (const tag of Object.keys(NAMES)) if (!GP.has(tag) && !WGP.has(tag)) MOD_GROW[tag] = modern(tag.toLowerCase());

// ---------------------------------------------------------------- výchozí strom (vydané a nové země)
export const ALT_DEFAULT = [
  { prio: 3, list: paths('def', null, null, 'Osvědčený kurz') },
  { prio: 9, list: modern('def') },
];
