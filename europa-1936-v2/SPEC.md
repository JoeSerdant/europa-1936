# Evropa 1936 – 2. generace: specifikace

Strategie v duchu **Hearts of Iron IV** (React + Canvas 2D): Evropa, Středomoří, severní Afrika a Blízký východ v lednu 1936.
Je to **nová hra od základů** – vlastní kód, vlastní mapa, vlastní texty i grafika; staré projekty (`europa-1936`, M0–M16) zůstávají nedotčené.
Cíl: mechaniky věrné vzoru zhruba z 90 %, deset procent je záměrné zjednodušení (viz „Odchylky od vzoru“).

> **Zásada o vzoru:** soubory z instalace HOI4 slouží **jen jako technická dokumentace** (jak mechaniky fungují). Nekopíruje se z nich mapa,
> text, tabulka dat ani obrázek. Geometrie světa vzniká z veřejných geodat Natural Earth (public domain), všechna jména, čísla a obsah jsou naše.

## 1. Příkazy

| Příkaz | Účel |
|---|---|
| `npm run dev` | vývojový server (s `?debug` je v konzoli `window.__e1936 = { map, gameStore, uiStore, engine }`) |
| `npm test` | vitest (musí projít před každým „hotovo“) |
| `npm run build` | `check-build.mjs` (oprava poškozených cest + kontrola vstupů) a produkční build do **ploché** složky `dist/` (relativní `base`, běží v kořeni i v podsložce) |
| `npm run check:inputs` | jen `check-build.mjs`: opraví soubory typu `src\main.jsx` a ověří, že existují `index.html`, `src/main.jsx`, `src/App.jsx`, `src/data/*` … (při chybě vypíše obsah adresáře) |
| `npm run world:fetch` | stáhne geodata Natural Earth do `tools/cache/` (jednou; složka není v gitu) |
| `npm run world` | přegeneruje `src/data/world.json` (≈ 20 s, deterministické) |
| `npm run world:preview -- owner\|terrain x,y,w,h scale` | PNG náhled **exportovaného** světa do `tools/preview/` |
| `node tools/smoke.mjs [šířka výška]` | automatická kontrola v prohlížeči (Playwright; viz § 7) |

Proměnné generátoru: `STOP=1..5` (zastaví po kroku a vykreslí náhled), `NO_EXPORT=1`, `SVGMODE=owner\|state\|prov\|sea\|terrain`, `CROP`, `SCALE`, `SHOW_STRAITS=1`.

## 2. Adresáře

```
src/
  engine/        čistá logika (žádný React, DOM, Math.random, Date.now)
    worldCore.js   načtení světa do typovaných polí (bez JSON importu – použitelné i z nástrojů v Node)
    world.js       getWorld() nad src/data/world.json
    game.js        createGame(), SPEEDS, stav hry
    commands.js    příkazy (čisté funkce state → state)
    tick.js        advanceHour / advance / hoursForElapsed
    selectors.js   dotazy na stav (vlastník, souhrny země; mezipaměť podle pole stateOwner)
    store.js       minimální store (getState/setState/update/subscribe)
    rng.js, time.js
    industry/      M19 – průmysl (viz § 4b): constants (vyvážení), core (sloty, souhrn po zemích, toky surovin), setup (počáteční továrny), day (denní krok), commands, selectors, infra, system, index
    army/          M18 – armáda (viz § 4a): constants (vyvážení), geo, war, paths, heap, stats, unit, ctx (pracovní kontext hodiny), setup (počáteční rozmístění),
                   system (pořadí kroků), daily, training, movement, combat, supply, upkeep, leaders, plans, commands, selectors, index (veřejné rozhraní)
  data/
    world.json     GENEROVANÝ svět – needitovat ručně
    countries.js   popis zemí (vůdce, vláda, ideologie, vlajka, obtížnost, text)
    industry/      M19 – data průmyslu: budovy, kategorie států, ceny výzbroje a suroviny, počáteční průmysl zemí a smlouvy
    army/          M18 – data armády: výzbroj, prapory a podpora, terén, šablony, národní sestavy, rysy a jména velitelů
  ui/
    store.js       gameStore + uiStore + useGame/useUi/useGameSlow
    actions.js     přechody mezi obrazovkami, výběr oblasti a jednotek, rozkazy, armády, plány, nábor, návrhář šablon (jediné místo, které mění zároveň stav, UI a kameru)
    hooks.js       herní smyčka a klávesové zkratky
    format.js      formátování čísel (česky)
    theme.css      vzhled (army/army.css přidává vzhled armády)
    map/           camera, geometry, colors, labels, tiles (čistá logika) + renderer, controller, MapView, Minimap (Canvas/DOM); units (žetony, cesty, plán na mapě, hit-testy) a counters (kreslení žetonu)
    hud/           TopBar, MapModes (+Legend), Dossier, Tooltip, GameMenu, Hud
    army/          SidePanel (záložky Oblast / Armáda / Nábor), ArmyPanel (strom skupin, armád a divizí), RecruitPanel, TemplateDesigner (+ designer.js, čistá logika), SelectionBar, PlanBar, parts, helpers, bridge
    menu/          MainMenu, CountrySelect
    common/        Flag, Icon, Help, Toast
tools/
  generateWorld.js + world/*.js + world/data/*.js   generátor světa (viz § 3)
  fetchGeodata.js, previewWorld.js, cropOf.js, smoke.mjs
check-build.mjs  příprava před `vite build` – záměrně v kořeni, ne v tools/ (kořenové soubory se na server dostanou vždy): oprava cest (`fixPaths`) a kontrola vstupů
                 (seznam povinných souborů `REQUIRED`; měníš-li vstupní soubory, uprav i ten)
vercel.json      nasazení na Vercel: Vite, `npm run build`, výstup `dist`
test/            world, game, map, ui, tools, army-* (commands, combat, setup, system, war-supply, ui) + armyKit.js (pomůcky pro bojiště v testech) (vitest, prostředí node)
```

## 3. Generátor světa

Surový rastr 2,5 km/pixel → sdílené hladké vektorové oblouky. Souřadnice světa jsou v **pixelech mapového listu** (2728 × 2048 px = 6820 × 5120 km),
kuželová konformní projekce (centrální poledník 16° V, rovnoběžky 38° a 62° S). Co leží východněji než 63,6° V, je „prázdná pevnina“ (štítek 0).

Kroky (`tools/generateWorld.js`, každý je modul v `tools/world/`):

1. **vlastníci** – rastr zemí 1936 z Natural Earth + převody území + jezera + průlivy (`owners.js`, `config.js` – tagy, barvy, hlavní města)
2. **státy** – geodetický růst ze semínek (`statesStep.js`, data `statesWest/NorthEast/East/states.js`); stát = jednotka vlastnictví (jako HOI4)
3. **řeky a provincie** – k-means + růst uvnitř států, sloučení drobných slepenců (`provincesStep.js`, `tinyStep.js`)
4. **moře** – námořní provincie (`seaStep.js`, 40 mořských regionů v `data/seaRegions.js`)
5. **štítky a vektorizace** – hranice jako sdílené oblouky (`vectorStep.js`, `trace.js`)
6. **terén, města, vítězné body** – vrstvený rastr + většinové hlasování (`terrainStep.js`, `placesStep.js`; města `data/citiesEurope.js`, `citiesExtra.js` – 766 měst)
7. **sousednosti, přístavy, železnice** – (`networkStep.js`, data `networkData.js`)
8. **regiony a obyvatelstvo** – 122 strategických regionů s podnebím (`regionsStep.js`, `data/landRegions.js`, `data/population.js`)
9. **export** – `src/data/world.json` (`exportStep.js`, `WORLD_FORMAT = 1`)

Výsledek: **2895 provincií, 393 námořních oblastí, 96 jezer, 527 států, 35 zemí**, 618 M obyvatel, 1007 železničních spojů.

### Formát `world.json` (v1)

Jednotný prostor štítků: `0` = prázdná pevnina, `1..L` pevninské provincie, `L+1..L+S` moře, `L+S+1..` jezera (nejsou provincie, jen kreslí se).

| klíč | význam |
|---|---|
| `v`, `frame{w,h,km}`, `counts{land,sea,lake}` | verze, rozměr listu, počty |
| `terrains` | názvy terénů: 0 rovina, 1 les, 2 pahorkatina, 3 hory, 4 bažiny, 5 poušť, 6 město |
| `owners[null,{tag,name,color,cap}]` | země (index = id vlastníka), `cap` = provincie hlavního města |
| `states[null,{id,n,o,p,a,v[],cap}]` | státy: vlastník, obyvatelé (tis.), plocha (km²), provincie, hlavní provincie |
| `regions[[name,climate]]`, `seaRegions[name]` | regiony (provincie ukazuje `r` od 1), mořské regiony (`r` od 0) |
| `land[null,{n,s,o,t,v,p,a,b,c,r,k,j,q,h?}]` | provincie: jméno, stát, vlastník, terén, vítězné body, obyvatelé (tis.), plocha, obálka `b`, střed `c`, region, města `k[[jméno,tis.,x,y]]`, sousedé `j[[id,druh,km]]` (0 souš, 1 řeka, 2 průliv), pobřeží `q[[moře,km]]`, přístav `h[moře,úroveň]` |
| `sea[null,{n,r,a,b,c,j,q}]` | moře: region, plocha, obálka, střed, sousední moře `j`, pobřežní provincie `q` |
| `lakes[{b,a}]`, `rails[[a,b,úroveň1-5]]`, `hubs` | jezera, železniční spoje, uzly |
| `arcs`, `rings` | geometrie: oblouky `[třída,levý,pravý,x0,y0,dx,dy,…]` (0,1 px), okruhy štítků jako podepsaná čísla oblouků (`~i` = opačný směr) |

Třídy oblouků: 0 rám, 1 provincie, 2 stát, 3 země, 4 pobřeží, 5 jezero, 6 moře, 7 okraj prázdna. Vykreslování třídí pozemní oblouky podle **aktuálních** vlastníků.

Pravidla, která svět splňuje (hlídá `test/world.test.js`): jména unikátní, vlastník státu = vlastník jeho provincií, hlavní města existují, sousednosti souměrné,
vlastníci souvislí (FRA ≥ 50 % kvůli koloniím, ostatní ≥ 90 %), každý oblouk sousedí právě s tolika štítky, kolik jich je ≥ 0, populace sedí.

Vítězné body podle největšího města provincie (tis. obyv.): ≥ 2500 → 40, 1500 → 32, 1000 → 26, 600 → 20, 400 → 15, 250 → 11, 150 → 8, 100 → 6, 60 → 4, 40 → 3, 25 → 2, 12 → 1;
druhá města ≥ 60 tis. přidávají polovinu, hlavní město +10. Železnice: uzly = města ≥ 40 tis. a hlavní města, spojení Dijkstrou po grafu provincií, úroveň z menšího města (+1 při velkém provozu).

## 4. Engine

**Herní stav** (`createGame`, `GAME_VERSION = 10`, čistý JSON):

```
{ v, tick, rng, player, speed, paused, stateOwner[], ctrl[], ownerVer, mil, ind, tech, pol, nat, dip, ai, log, nav }
```
`stateOwner[stát] = idx vlastníka` (vlastnictví je po státech), `ctrl[provincie] = idx držitele kontroly` (okupace je po provinciích), `mil` = armáda (§ 4a), `ind` = průmysl (§ 4b), `tech` = výzkum (§ 4c), `pol` = politika (§ 4d), `nat` = národní cíle a události (§ 4e), `dip` = diplomacie (§ 4f), `ai` = nastavení AI (§ 4g), `log` = deník dění (§ 4i), `nav` = námořnictvo (§ 4j).
Čas: 1 tick = 1 herní hodina, start 1. 1. 1936 00:00; rychlosti 1–5 = `[12, 24, 48, 96, 240]` herních hodin za sekundu (`SPEEDS[0]` = pauza).
Hra začíná pozastavená. `hoursForElapsed(state, ms, carry)` přenáší zlomky hodin.

Pravidla:
1. `src/engine/` nezná React ani DOM; náhoda jen přes `rng.js`, čas jen přes `state.tick`.
2. Příkazy jsou čisté `(state, …) → state`; při neplatném vstupu vrací **tentýž objekt**. Stav se nemutuje.
3. Svět (`getWorld()`) je neměnný a **nikdy se nekopíruje do stavu**; stav drží jen to, co se mění.
4. Změna tvaru stavu = zvednout `GAME_VERSION` a upravit testy.
5. Selektory mají mezipaměť podle pole `stateOwner` (stejné pole při plynutí času, nové po změně vlastnictví).
6. Systémy času (armáda, průmysl, výzkum, …) se přidávají do `advanceHour` v pevném pořadí; každý má vlastní soubor a testy.

API světa (`getWorld()`): `L, S, K, nLabel`, `owners, ownerIdx, tags`, `states, stateOwner0`, `land, sea`, typovaná pole `provOwner0, provState, terrain, vp, pop, area, region, portSea, portLevel`,
CSR sousednosti `landAdj, coast, seaAdj, seaCoast, rails`, pomocné `kind(l), isLand, isSea, provName, seaName, stateName, ownerTag,
forLandNeighbors(p, cb), forSeaNeighbors(l, cb), forCoast(p, cb)`.

## 4a. Armáda (M18)

Pozemní válka podle vzoru HOI4: **divize ze šablon**, výzbroj a lidská síla ve skladech, velitelé, armády a skupiny armád, plány a rozkazy, zásobování, boj s šířkou fronty, terénem a organizací.
Všechna čísla (statistiky praporů, terén, vzorce) jsou **naše**: data v `src/data/army/*`, vyvážení vzorců na jednom místě v `src/engine/army/constants.js` (`ARMY`); ze vzoru je převzat jen princip.
Letectvo zatím nemáme a vzdušná podpora v boji chybí; přes moře se divize dostanou lodní přepravou (§ 4j), pěšky jsou průlivy neprůchodné.
Příkazy enginu nekontrolují, komu divize patří vůči hráči – to dělá rozhraní (`ui/actions.js`); engine je neutrální, aby jím šla řídit i AI (M24).

### Pojmy
- **Prapor** (`BATTALIONS`) – pěší (`pesi`), jízdní (`jezdci`), horští střelci (`horsti`), motorizovaný (`motor`), lehký tank (`ltank`); mechanizovaný, střední a těžký tank jsou zamčené do M20 (`unlock`). Stojí v **pluku** (sloupec mřížky 5 × 5, `GRID`); prapor má šířku `w`, obvykle 2.
- **Podpůrná rota** (`SUPPORT`) – ženisté (`ing`), dělostřelectvo (`del`), protitankové (`pt`), průzkum (`zvid`); spojaři, logistika a polní nemocnice (`spoj`, `log`, `nem`) jsou zamčené do M20. Mřížka podpory 1 × 5; rota nemá šířku, dává útok, zakopání, průzkum, úsporu zásob nebo léčení.
- **Výzbroj** (`EQUIP`) – pušky, děla, protitanková děla, auta, obrněná vozidla, lehké tanky, podpůrná výzbroj (střední a těžké tanky zamčené). Sklady jsou po zemích; divize nenese počty kusů, výzbroj se jen odečítá při náboru a doplňování (`need`).
- **Šablona** (`tpl`) – 1–5 pluků po 1–5 praporech + až 5 podpůrných rot; nejvýš `TPL_MAX` = 40 šablon na zemi. **Divize** je instance šablony; po úpravě šablony si divize ponechají sílu a organizaci (nejvýš nové maximum). Smazat jde jen šablonu, kterou nepoužívá žádná divize ani výcvik.
- **Armáda** – divize pod generálem, nejvýš `ARMY_CAP` = 24 divizí. **Skupina armád** – armády pod polním maršálem, nejvýš `GROUP_CAP` = 5 armád. Divize smí stát i mimo armádu, pak neplní žádný plán. Velitel má nejvýš jedno místo: přiřazení ho uvolní z původního.
- **Plán** armády: *Hájit oblast* (`area`) nebo *Linie fronty* (`front` s cílovými provinciemi a režimem útoku Opatrně / Vyváženě / Zteče).

### Tvar stavu (`state.mil`, `GAME_VERSION = 2`)
```
mil: {
  ver,                       // zvyšuje se při změně struktury (vznik/zánik/přesun divize, armády, skupiny, velitele, šablony) – klíč mezipamětí (`armyTree`, UI)
  bn, qn,                    // čítače id bitev a položek výcviku (id se nikdy nepoužije znovu)
  wars: [[a, b], …],         // dvojice indexů zemí ve válce (a < b); M23 přidala bloky a kapitulaci (§ 4f)
  tpl:   [null, Tpl…],       // šablony: index = id, null = smazaná
  divs:  [null, Div…],       // divize
  armies:[null, Army…],      // armády
  groups:[null, Group…],     // skupiny armád
  gens:  [null, Gen…],       // velitelé
  battles: [Battle…],        // právě probíhající bitvy (hustý seznam)
  queue: [QItem…],           // divize ve výcviku
  stock: [null, {výzbroj: počet}…],   // sklady výzbroje podle indexu země
  man:   [0, počet…],        // zásoba lidské síly podle indexu země
  cas:   [0, počet…],        // ztráty podle indexu země (statistika; M23 válečné skóre)
}
Tpl    = { o, nm, short?, reg: [[typ…]…], sup: [typ…] }                   // reg = pluky (sloupce), v každém řada praporů shora dolů; short = zkrácený název do jmen divizí
Div    = { o, tpl, nr, p, org, hp, xp, army, path[], prog, b, rt, dig, sup, sg, hold }
         // nr pořadové číslo jména, p provincie, org/hp aktuální (hp = síla), xp 0–1, army id armády (0 = žádná),
         // path zbývající provincie rozkazu, prog 0–100 postup do první provincie cesty, b id bitvy (0 = žádná),
         // rt hodin ústupu (nemůže útočit), dig zakopání 0–5 (stupně, i zlomky), sup poměr zásobování 0–1,
         // sg hodin zásoby v batohu (0–72), hold hodin výdrže po neúspěšném útoku
Army   = { o, nm, grp, cmd, plan, pl }                                      // grp id skupiny, cmd id generála, plan | null, pl nahromaděné plánování 0–strop
Group  = { o, nm, cmd }
Gen    = { o, nm, r: 'M'|'G', a, d, pl, lg, tr[], xp }                      // maršál / generál; útok, obrana, plánování, logistika (1–9), rysy, zkušenosti
Battle = { id, p, att[], dep[], from[], hrs, fa[], fd[], adv }              // p napadená provincie, att/dep id divizí, from odkud útočí, hrs trvání;
                                                                            // fa/fd divize na frontě v poslední hodině, adv podíl útočníků na zásazích 0–1 (ukazatel pro UI)
QItem  = { id, o, tpl, p, done }                                            // id z `qn`, p místo vzniku, done = absolutní herní hodina dokončení výcviku
Plan   = { k: 'area', area: [prov…], auto? } | { k: 'front', line: [prov…], to: [prov…], mode: 'careful'|'balanced'|'rush' }
         // auto = plán přidělila obranná AI (hráčův plán ho nemá; AI ho smí přepsat)
```
Světové pole se do stavu nekopíruje; provincie jsou čísla `1..L`. Mazání = `null` v poli.

### Počáteční rozmístění (`setup.js`, data `data/army/national.js`)
`createMil` vyrobí armádu všech zemí z `NATIONAL` (počty divizí podle druhu `pesi, brig, motor, tank, hory, kav`, zkušenost, záloha výzbroje `res`, podíl obyvatel jako lidská síla, počet velitelů navíc `pool`). Deterministicky z `rng`:
- každá země dostane kopie použitých šablon a divize v provinciích vlastního území podle váhy (vítězné body, hranice, uzly, přístavy, hlavní město); jen tam, kde by divize dostala zásoby. Druh se přiřazuje podle vhodnosti terénu (horské do hor, tanky na roviny s uzly …);
- divize se shlukují do armád podle polohy (nejvýš 16 divizí), armády do skupin armád (nejvýš 5 armád; Sever / Střed / Jih); země s méně než 3 divizemi armády nemají;
- sklady = potřeba nasazených divizí × `res`, nejméně záloha podle velikosti země; velitelé mají jména podle kultury (`names.js`), dovednosti podle velikosti země a rysy (`traits.js`).

### Statistiky divize (`stats.js`, čistá funkce šablony a úrovně výzbroje, mezipaměť podle objektu šablony)
Součet přes prapory: `hp, soft, hard, def, brk, men, sup, need` + podpůrné `rec` (průzkum), `eng` (ženisté), `supSave`, `healing`; `days` = nejdelší výcvik; `width` = součet `w` liniových praporů.
Průměr váhou lidské síly: `org` (liniové), `hardness` (všechny). `pierce` = 0,4 · nejvyšší + 0,6 · průměr (jen prapory s průrazem), `armor` = 0,4 · nejvyšší + 0,6 · průměr (liniové); `speed` = nejpomalejší liniový prapor;
`cls` (`inf, arm, mot, cav, mtn`) = převažující druh liniové lidské síly (ikona žetonu, rysy velitelů); `terr[terén] = {atk, def, mov}` průměr bonusů praporů (`r` = přechod řeky).
Úroveň výzbroje (`EQUIP_LEVEL_MULT`, zatím jen 1; M20 ji zvedá) násobí útok, obranu, průraz a pancíř příslušného druhu výzbroje. `validateTemplate` vrací český popis chyby nebo `null`.

### Pohyb a rozkazy (`movement.js`, `paths.js`)
- Cesta: Dijkstra po sousednostech provincií, cena = hodiny přechodu pěšáka (`PROV_HOURS` × vzdálenost středů / `PROV_KM`, omezeno na `DIST_MIN`–`DIST_MAX` × cena terénu cílové provincie × řeka +25 %); rychlost divize ji škáluje (`SPEED_REF` = 4).
- Vstoupit smí do vlastní provincie a do provincie, jejíž držitel je s divizí ve válce (`ctrl`); cizí neutrální území a průlivy jsou zavřené.
- Postup `prog += 100 / hodiny`; při 100 % divize vstoupí. Je-li v cílové provincii nepřítel, místo vstupu se otevře nebo připojí **bitva** (postup stojí, dokud trvá; útočit smí divize bez `hold` a `rt` a s organizací aspoň 10 %). Prázdnou nepřátelskou provincii divize obsadí (`ctrl[p] = o`, `ownerVer++`).
- Pohyb stojí organizaci (`ORG_MOVE_COST`, nikdy pod 10 % maxima) a ruší zakopání; zpomaluje ho nízká organizace, nedostatek zásob a slabá infrastruktura cílové provincie.

### Boj (`combat.js`)
Bitva = jedna napadená provincie; útočníci stojí v sousedních provinciích a bojují „přes hranici“. Šířka bitvy `W` = šířka terénu × (1 + 0,5 · (počet směrů útoku − 1)). Strany nasazují divize na frontu podle pořadí příchodu, dokud nenaplní `W`; ostatní jsou **v záloze** (nahradí padlé).
Přeplnění šířky (nejvýš −33 %) a stohování nad 5 divizí (−2 % za divizi) penalizují útok; útok z více směrů snižuje obranu.
Každou hodinu každá divize ve frontě rozdělí svůj útok mezi nepřátelskou frontu (35 % na náhodně zvolený hlavní cíl):
`zásah = (soft · (1 − tvrdost cíle) + hard · tvrdost) · útok · (1 − uhnutí) · pancíř(průraz vs. pancíř) · síla · kostka · podíl / obrana cíle`, kde
- `útok` = 1 + terén praporů + velitel + zkušenosti (+4 % za úroveň) + zásobování + (útočník: terén provincie, řeka −20 %, plánování armády), nejméně 0,1;
- `obrana` (`guard`) = 1 + terén praporů + velitel + zkušenosti + zásobování + (obránce: zakopání +4 % za stupeň, útok z více směrů), nejméně 0,25; zásah se jí **dělí**;
- `uhnutí` = 0,9 · `def` / (`def` + 2 · `brk` útočníka + 60): obránce uhne podílu zásahů, průraz fronty `brk` tuto obranu přemáhá;
- `pancíř`: poměr průrazu a pancíře cíle přes prahy 1,00 / 0,75 / 0,50 dává násobky 1,0 / 0,8 / 0,65 / 0,5; pod 0,5 se navíc zásah půlí, naopak útočník s pancířem nad průrazem cíle má +30 %;
- `síla` = podíl zbylé síly divize (nejméně 10 %), `kostka` = 0,55 až 1,45 z `rng`.
Zásah ubírá **organizaci** (`K_ORG`, rychle) a **sílu** (`K_HP`, pomalu); část ztracené síly jsou skutečné ztráty (`EQUIP_LOSS`), zbytek ranění (`CASUALTY_BACK` se vrací do zásoby lidské síly).
Divize s `org ≤ 0`: obránce ustoupí do sousední vlastní provincie bez nepřítele co nejdál od útočníků (organizace klesne na 10 %, 18 h nesmí útočit, ztratí 3 % síly), nemá-li kam, je zničen; útočník se zastaví a 36 h nesmí útočit (`hold`). Pod 0,1 % síly divize zaniká.
Bitva končí, když jedna strana nemá bojovníky. Vítězní útočníci dostanou postup 60 % do provincie. Zkušenosti divizí rostou v boji, velitelé dostávají zkušenosti za každou divizi v bitvě (maršál 30 %).

### Zásobování (`supply.js`)
Zdroje: hlavní město (`SUP_CAPITAL`) a **uzly** železnice (`world.raw.hubs`); uzel spojený železnicí s hlavním městem přes vlastní území dostane podíl jeho toku (`SUP_HUB` × podíl dorazivší po železnici, na každém spoji se ztrácí `SUP_RAIL_DROP` / úroveň spoje),
a každý vlastní uzel má aspoň slabý místní tok `SUP_LOCAL` (kolonie, obklíčení). Tok se šíří Dijkstrou po vlastních provinciích a každou zeslabí (terén, řeka, vzdálenost; infrastruktura srážku zmírňuje).
`supplyFlow(ctrl, o)` → `Float32Array` toku po provinciích (mezipaměť podle množiny provincií země); `tok × SUP_CAPACITY` = zásoby za hodinu v provincii, tok kolem 3 je dobré zásobování.
Denně (`dailySupply`) dostane každá divize `sup = min(1, kapacita / spotřeba všech jednotek v provincii)`. `sg` (72 h) je zásoba v batohu: při `sup < 1` ubývá o 24 h denně, při plném zásobování se plní o 48 h denně.
Po vyčerpání batohu (`lack = 1 − sup`): slabší útok a obrana, nižší strop organizace (až 35 %), pomalejší pohyb, ztráta síly (terénní únava). Zásobování **hlídá i rozmístění**: počáteční posádky vznikají jen tam, kde divize dostane zásoby.
Infrastruktura provincie = základ ze světa (`geo(w).infra`: terén, železnice, velká města) + vylepšení státu (M19, `infraOf`).

### Doplňování a výcvik (`daily.js`, `training.js`, `upkeep.js`)
Denně doplní divize mimo boj a se zásobováním ≥ 50 % (`REINF_PER_DAY` = 5 % maxima, léčení rot ho zvyšuje) část `hp` ze skladu (spotřebuje úměrně lidskou sílu a výzbroj). Organizace se obnovuje hodinově (nad 80 % pomaleji, pod 25 % rychleji, infrastruktura a velitel ji ovlivňují). Zakopání roste o 1 stupeň za den na místě (ženisté zrychlují).
`recruit(state, tplId, prov, count ≤ 20)` odečte lidskou sílu a výzbroj hned (všechno, nebo nic), položky `QItem` s `done = tick + dny výcviku · 24` se mění v divize v `p` (nemá-li ji země už pod kontrolou, v nejbližší vlastní provincii nebo v hlavním městě); výcvik jde zrušit s plným vrácením.
Měsíčně (1. dne) roste zásoba lidské síly (`MAN_GROWTH_MONTH` obyvatel). Sklady od M19 doplňuje výroba (§ 4b).

### Velitelé, armády, plány (`leaders.js`, `plans.js`)
Velitel dává bonusy podle dovedností (útok, obrana, plánování, logistika) a rysů (`TRAITS`); bonusy armády = její generál + 50 % bonusů polního maršála její skupiny (`armyMods`). Úroveň velitele = součet dovedností − 3; zkušenosti na další úroveň = `60 × aktuální úroveň` (lineárně), po dosažení se náhodně zvýší jedna dovednost (max. 9).
Armáda s plánem *útoku* (`front` s cíli) hromadí plánování (+2 % denně až do stropu `PLAN_CAP` + dovednosti), jinak plánování klesá. **Plánovač** (`plansStep`, denně a hned po zadání plánu) rozdělí divize armády mezi provincie plánu podle důležitosti
(vítězné body, přístav, uzel, hlavní město, nepřátelé v sousedství; u cílů útoku dvojnásobně) a zadá jim cesty; **každé místo dostane aspoň jednu divizi**, je-li jich dost. Ovládá jen nečinné divize – ruční rozkaz platí, dokud divize nedojde.
U *Linie fronty* divize útočí na sousední cílové provincie, jakmile to dovolí režim: *Opatrně* čeká na půlku stropu plánování a organizaci 85 %, *Vyváženě* útočí od 65 % organizace, *Zteč* od 35 %. Dobytá cílová provincie přejde z cílů do linie.
Země bez hráče ve válce (obranná AI, zatím jediná): armády bez vlastního plánu dostanou plán *Hájit oblast* kolem hranic s nepřítelem (`auto`), týdně se přepočítá.

### Války (minimum pro M18)
`mil.wars` – dvojice zemí. `declareWar(state, aTag, bTag)` / `makePeace(state, aTag, bTag)` (bílý mír: provincie okupované druhou stranou se vracejí držiteli, cizí jednotky se přesunou domů, bitvy mezi stranami se ruší).
Spojenectví, bloky, ospravedlnění a kapitulace řeší od M23 diplomacie (§ 4f); `declareWar` / `makePeace` jsou nízkoúrovňové příkazy pro testy a AI.

### Pořadí v `advanceHour` (pevné)
`tick + 1` → `armyHour`: (po půlnoci) denní krok `dailyStep` = zásobování → doplňování ze skladu → zakopání → plánování armád → zkušenosti velitelů → plánovač (a AI plány) → (1. den měsíce) lidská síla;
dále každou hodinu výcvik (dokončení) → **pohyb** → **boj** → údržba (organizace, ústup a výdrž, ztráty bez zásob).

### Příkazy (`engine/army/commands.js`, čisté, neplatný vstup = tentýž stav)
`declareWar`, `makePeace`, `createTemplate`, `editTemplate`, `deleteTemplate`, `recruit`, `cancelRecruit`, `disband` (přeskočí divize v boji), `orderMove(divIds, prov)`, `cancelOrder`,
`createArmy`, `renameArmy`, `disbandArmy`, `assignDivisions(armyId, divIds)` (0 = vyřadit z armády), `createGroup`, `renameGroup`, `disbandGroup`, `assignArmies(groupId, armyIds)`, `assignCommander(kind: 'army'|'group', id, genId)` (0 = odvolat; skupinu smí vést jen maršál),
`setPlan(armyId, plan)` (plán se normalizuje: jen pevninské provincie, nejvýš `AREA_MAX` = 300, cíle nesmí být v linii; hned se naplánuje), `clearPlan`, `setPlanMode`. `assignArmies(groupId, …)` s `groupId` 0 vyřadí armády ze skupin. Jména se čistí (`cleanName`, 40 znaků).

### Selektory (`engine/army/selectors.js`)
`divisionsByProvince(state)` (provincie → pole id; mezipaměť podle `mil.divs`), `divisionCount(state, o)`, `armyTree(state, o)` (skupiny → armády → divize; mezipaměť podle `mil.ver`), `atWar`, `enemiesOf`,
`divisionView(state, id)` (odvozené statistiky + stav `idle | moving | fighting | retreating | lack`), `templateView`, `templatesOf`, `generalsOf` / `generalPost`, `supplyReach(state, o)`, `frontEdges(state)`,
`suggestFront(state, armyId)` (návrh linie a cílů podle skutečné fronty kolem divizí armády), `manpowerOf`, `stockOf`, `queueOf`.

### Záměrná zjednodušení proti vzoru
Žádná letecká a námořní podpora, počasí a noc, pevnosti (M19), doktríny a bojové taktiky, dobrovolníci, zajatci, vyloďování, parašutisté; divize nenesou vlastní počty kusů výzbroje (síla `hp` je nahrazuje);
velitelé divizí neexistují; pohyb po železnici viz § 4x (M46). Číselné hodnoty jsou vlastní.

## 4b. Průmysl (M19)

Hospodářství podle vzoru HOI4: **státy mají kategorii a stavební sloty**, civilní továrny staví, vojenské továrny vyrábějí výzbroj na **linkách**, výroba spotřebovává **suroviny**, jejich přebytek jde do **obchodu**.
Čísla jsou naše: data v `src/data/industry/*` (budovy, kategorie, ceny výzbroje a suroviny na kus, počáteční průmysl zemí, obchodní smlouvy na startu), vyvážení vzorců v `src/engine/industry/constants.js` (`IND`).
Vše se počítá **jednou denně** (o půlnoci, `industryHour` v `advanceHour` hned po armádě). Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`. Námořní doprava a konvoje zatím nejsou: obchod se surovinami je abstraktní (viz „Zjednodušení“).

### Tvar stavu (`state.ind`, od `GAME_VERSION = 3`)
```
ind: {
  ver,                          // zvyšuje se při změně struktury (stavba dokončena/zrušena, linky, smlouvy) – klíč mezipamětí UI
  jn,                           // čítač id staveb, linek a smluv (id se nepoužije znovu)
  st:   [null, {civ, mil, res:{surovina: množství/den}}…],   // podle id státu: továrny a těžba
  inf:  [0, úroveň 0–3…],       // vylepšení infrastruktury podle id státu (mění se jen při dokončení stavby)
  cons: [0, podíl 0–1…],        // spotřební zboží podle indexu země (M21: zákony)
  build: [{id, o, s, k, prog}…],     // fronta staveb: o země, s stát, k 'civ'|'mil'|'inf', prog získané body; pořadí = priorita v rámci země
  lines: [{id, o, eq, fac, eff, acc, f, out}…],   // linky: druh výzbroje, počet továren, efektivita, nahromaděné kusy 0–1, poměr výkonu (suroviny) a kusů za poslední den
  trade: [{id, from, to, res, amt, got}…]          // smlouvy: vývozce → dovozce, množství za den a skutečně dodané minulý den
}
```
Pole `st`/`inf` se kopírují jen při dokončení stavby. Továrny a těžba patří vlastníkovi státu; **okupovaný stát** (hlavní provincii drží jiná země) vlastníkovi nevyrábí a jeho těžba jde okupantovi (továrny se nepočítají nikomu).

### Státy a sloty
`STATE_CATEGORIES` podle obyvatel: osada (≤ 150 tis.) 2 sloty, městečko 4, město 6, velké město 8, velkoměsto 10, metropole 12. Sloty státu = základ kategorie + úroveň infrastruktury (`inf`). Slot zabírá civilní a vojenská továrna (i rozestavěná); infrastruktura ne (nejvýš `INF_MAX` = 3 vylepšení).
Počáteční továrny se rozdělí D'Hondtem podle váhy státu (obyvatelé, vítězné body; vojenské dávají přednost vítězným bodům), těžba po třech státech (50 / 30 / 20 %, ocel a hliník podle obyvatel, ostatní podle rozlohy). Země má aspoň ocel na základní výrobu (0,9 na vojenskou továrnu).

### Stavby (`day.js`)
Přísun bodů = (civilní továrny − spotřební zboží − dovoz) × `IC_PER_FAC`. Projekty ve frontě země dostávají body v pořadí fronty, každý nejvýš `cost / days` za den (civilní 800 bodů / 45 dní, vojenská 700 / 45, infrastruktura 500 / 30). Dokončená stavba přidá továrnu nebo úroveň infrastruktury; projekt ve státě, který země ztratila nebo neovládá, zaniká.
**Infrastruktura:** `infraOf(state)` = základ světa (`geo(w).infra`) + `inf[stát]`, nejvýš 5. Používá ji pohyb, obnova organizace i zásobování (`ctx.infra`, `supplyFlow(ctrl, o, infra)`); bez vylepšení je to přímo `geo(w).infra`.

### Výroba (`day.js`, `core.js`)
**Spotřební zboží** (`cons` × všechny továrny) ubírá nejdřív civilní, pak vojenské. Zbylé vojenské továrny se rozdělí na **linky** (jeden druh výzbroje, 1–`LINE_MAX_FAC` továren, nejvýš `LINES_MAX` linek na zemi; nedostupné továrny zkracují linky od posledních).
Kusy za den = `fac × IC_PER_FAC × eff / cost`, krát poměr výkonu `f` podle nejhorší potřebné suroviny (nejméně `RES_FLOOR`). Celé kusy jdou do `mil.stock`, zbytek je v `acc`.
Efektivita nové linky a po změně druhu výzbroje je `EFF_START`; denně roste o `EFF_GROW` podílu vzdálenosti ke stropu `EFF_CAP`; přidání továren ji zředí úměrně, ubrání ne. Linky na startu mají `EFF_INIT`. Země bez hráče mají výchozí linky podle `DEFAULT_SPLIT` (AI přijde v M24).

### Suroviny a obchod
Šest surovin (`ocel, hlinik, ropa, wolfram, chrom, guma`); `EQUIP_PROD[výzbroj].res` = suroviny na kus. Poptávka linek se spočítá z nominální výroby; pokrytí `f = min(1, (těžba − vývoz + dovoz) / poptávka)` za surovinu.
**Smlouva** vývozce → dovozce: vývozce dodá nejvýš svůj přebytek (těžba − vlastní poptávka − už vyvezené, smlouvy v pořadí id); dovozce platí `TRADE_CIV` civilní továrny za dovezenou jednotku. Ve válce mezi stranami se smlouva přeruší (`got = 0`); příkaz ji ani nepřijme. Embarga a obchodní vztahy v diplomacii zatím nejsou.

### Příkazy (`engine/industry/commands.js`, čisté, neplatný vstup = tentýž stav)
`build(s, stát, druh)`, `cancelBuild(id)`, `moveBuild(id, posun | -Infinity)`; `addLine(o, výzbroj, továrny)`, `setLineFactories(id, n)` (0 = zrušit), `setLineEquip(id, výzbroj)`, `removeLine(id)`; `addTrade(od, komu, surovina, množství)`, `setTradeAmount(id, množství)`, `cancelTrade(id)`.
Selektory (`selectors.js`): `industryOf(state, o)` (továrny, spotřební zboží, dostupné a volné vojenské továrny, body stavby, linky s výrobou, toky surovin, stavby, smlouvy), `stateIndustry(state, s)` (kategorie, sloty, budovy, fronta státu), `projectEta`, `infraOf`.

### Zjednodušení proti vzoru
Žádné konvoje ani námořní doprava (obchod je abstraktní a bez trasy), žádná energie ani zásoby surovin, výzbroj bez úrovní a zastaralosti (M20), žádné stavby pevností ani protiletadlové obrany, přístavy a letiště (letectvo a loďstvo později), žádné poškození budov bombardováním, žádná výměna výzbroje mezi zeměmi. Spotřební zboží se mění až zákony (M21).

## 4c. Výzkum (M20)

Technologie podle vzoru HOI4: **sloty výzkumu**, technologie s předpoklady a **historickým rokem** (výzkum předem je pomalejší), **úrovně výzbroje**, odemykání jednotek a bonusy průmyslu.
Strom (`src/data/research/techs.js`, ≈ 40 technologií v pěti oborech: Pěchota, Dělostřelectvo, Tanky a motorizace, Podpora a logistika, Průmysl) i čísla jsou naše; vyvážení vzorců je v `src/engine/research/constants.js` (`RES`).
Počítá se **jednou denně** (`researchHour` v `advanceHour` hned za průmyslem). Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.

### Tvar stavu (`state.tech`, `GAME_VERSION = 4`)
```
tech: {
  ver,                                   // zvyšuje se při zadání, zrušení a dokončení výzkumu (klíč mezipamětí UI)
  own: [null, { done: {id: 1}, slots: [id | 0, …], prog: {id: 0–1} }…]   // podle indexu země; slots = právě zkoumané (0 = prázdný slot), prog = rozpracovaný podíl (zůstává při přepnutí slotu)
}
mil.lv: [null, { výzbroj: úroveň 2–4 }…]  // úrovně výzbroje země (chybí = 1); mění je jen dokončený výzkum, čtou je statistiky divizí a výroba
```
`done` a `lv[o]` se při změně nahrazují novým objektem (mezipaměti statistik a bonusů se klíčují podle objektu).

### Pravidla
- **Sloty:** základ podle velikosti země (`SLOTS_TIER`: velmoc 3, regionální mocnost 3, malý stát 2) + technologie *Výzkumná pracoviště* (nejvýš `SLOTS_MAX` = 5).
- **Rychlost:** `speed = SPEED_BASE × národní násobek × (1 + bonusy výzkumu) × předstih`; předstih = `1 / (1 + AHEAD_PEN × roky_před_historickým_rokem)`. Denně přibude `speed / days` podílu technologie.
- **Dostupnost:** všechny předpoklady dokončeny, technologie nehotová a není ve dvou slotech.
- **Dokončení:** `fx.lv` zvedne úroveň výzbroje (`mil.lv`, násobí útok, obranu, průraz a pancíř podle `EQUIP_LEVEL_MULT`; výroba kusu je dražší o `LV_COST` za úroveň); technologie s `id` rovným klíči `unlock` v datech jednotek odemkne prapor, podpůrnou rotu nebo výzbroj; `fx.mod` dává bonusy (`effCap` strop efektivity linek, `build` body stavby, `extract` těžba, `research` rychlost); `fx.slot` přidá slot.
- **Země bez hráče** (a pozorovatel) si sloty plní samy: ze dostupných technologií s rokem ≤ aktuální rok vyberou deterministicky podle roku, délky a hashe země (AI přijde v M24).

### Příkazy a selektory (`engine/research/`)
`startResearch(state, o, slot, id)` (obsazený slot se přepíše, rozpracované zůstane), `cancelResearch(state, o, slot)`; `researchOf(state, o)` (sloty s postupem, rychlostí a odhadem, úrovně výzbroje, bonusy), `techList(state, o)` (všechny technologie se stavem `done | active | available | locked`, předstihem a odhadem dnů), `isUnlocked(state, o, klíč)`, `techMods(done)`, `isAvailable`.

### Zjednodušení proti vzoru
Žádné doktríny, štáby, výzkumné bonusy za nápady a vůdce, sdílení a ukradení technologií, přenos zkušeností z vyzkoušení; úroveň výzbroje se projeví ve všech divizích země okamžitě (bez postupné modernizace skladů). Počet technologií a jejich bonusy jsou záměrně menší.

## 4d. Politika (M21)

Politika podle vzoru HOI4: **stabilita**, **podpora války**, **politická moc**, **zákony** ve třech oborech a **poradci** ve čtyřech slotech. Data (`src/data/politics/*`: zákony, poradci, národní počáteční hodnoty) a čísla vyvážení (`src/engine/politics/constants.js`, `POL`) jsou naše. Počítá se **jednou denně** (`politicsHour` v `advanceHour` za výzkumem). Poradci jsou obecné role bez skutečných osob. Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.

### Tvar stavu (`state.pol`, `GAME_VERSION = 5`)
```
pol: {
  ver,                                   // zvyšuje se při změně zákona, poradce (klíč mezipamětí UI)
  own: [null, { stab, ws, pp, laws: { eco, con, trd }, adv: { pol, arm, ind, sci } }…]
  // stab stabilita 0–1, ws podpora války 0–1, pp politická moc, laws id zákonů, adv id poradců (0 = prázdný slot)
}
```
### Pravidla
- **Politická moc:** `PP_BASE` = 2 za den, nejvýš `PP_MAX`; platí se jí zákony a poradci.
- **Stabilita a podpora války** se denně přibližují k cíli o `DRIFT`. Cíl stability = základ země + bonusy zákonů a poradců − `OCC_STAB` za každý okupovaný stát (nejvýš 0,2); cíl podpory války = základ + bonusy + `WAR_WS`, když je země ve válce. Základ podle ideologie, u velmocí vlastní (`POL_NATIONAL`).
- **Dopady:** násobek výstupu továren a staveb = `(1 + bonus výroby) × (1 + (stabilita − 0,5) × STAB_OUT)`; lidská síla za měsíc × `(1 + bonus odvodu) × (0,85 + 0,3 × podpora války)`; spotřební zboží = základ země + `cons` zákonů a poradců (0 až `CONS_MAX`); dovoz stojí civilní továrny × `(1 + imp)`; těžba × `(1 + extract z techniky a politiky)`; rychlost výzkumu × `(1 + research)`.
- **Zákony** (`eco` ekonomika: civilní / raná mobilizace / válečná / totální; `con` odvod: dobrovolníci / omezený / rozšířený / branná služba; `trd` obchod: volný / omezený / uzavřený): změna stojí politickou moc a vyžaduje minimální podporu války (`req.ws`) a stabilitu (`req.stab`); povolen je jakýkoli krok.
- **Poradci:** čtyři sloty (politický, vojenský, průmyslový, vědecký), jednorázová cena; propuštění je zdarma.
- **Země bez hráče** za války zvyšují zákony ekonomiky a odvodu, když na ně mají, a zaplňují prázdné sloty nejlevnějším poradcem (AI přijde v M24).

### Příkazy a selektory
`setLaw(state, o, obor, zákon)`, `hireAdvisor(state, o, slot, poradce)`, `fireAdvisor(state, o, slot)`; `politicsOf(state, o)` (hodnoty, příjem, cíle, zákony se stavem a důvodem zamčení, poradci, bonusy), `polModsOf(state, o)`, `consOf(state, o)`, `stabMult`.

### Zjednodušení proti vzoru
Žádná ideologie ve stranách a puče (M22 události a focusy), žádné světové napětí (podmínky zákonů jsou podpora války a stabilita), žádné vlastní politické strany ani volby, poradci bez ideologických omezení.

## 4e. Národní cíle a události (M22)

**Národní cíle** (focusy) a **události** podle vzoru HOI4: každá země má strom cílů (vlastní pro velmoci a vybrané země, jinak obecný), jeden cíl se plní desítky dní a dá okamžité účinky a trvalé bonusy; **události** s volbami se spouštějí podmínkami a náhodou (deterministickou), hráči se zobrazí dialog a hra se pozastaví.
Data (`src/data/nat/*`: stromy cílů, události, popisy účinků) i texty jsou naše; čísla vyvážení v `src/engine/nat/constants.js` (`NAT`). Počítá se **jednou denně** (`natHour` v `advanceHour` za politikou). Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.

### Tvar stavu (`state.nat`, `GAME_VERSION = 6`)
```
nat: {
  ver,                                    // zvyšuje se při změně cíle, události, příznaků (klíč mezipamětí UI)
  own: [null, { done: {id: 1}, cur: { id, p } | null, flags: {id: 1}, seen: {událost: tick}, sched: [{id, at}…] }…]
  // done hotové cíle, cur právě plněný (p = uplynulé dny), flags příznaky, seen kdy se událost naposledy spustila, sched naplánované události (at = tick)
  pend: [{ o, id, at }…]                  // události čekající na volbu hráče (vždy jen země hráče)
}
```
### Cíle
Cíl má `id`, název, dny plnění (`days`), předpoklady `req` (všechny) a `any` (aspoň jeden), vylučující cíle `excl`, polohu v mřížce (`x`, `y`), okamžité účinky `fx` a trvalé bonusy `mod` (stejné klíče jako zákony: `stab, ws, cons, build, prod, extract, imp, man, research`). Plnit jde jeden cíl; přerušení zahodí postup. Trvalé bonusy se sčítají s bonusy zákonů a poradců (`polModsOf`).
**Účinky** (`fx`): `pp` politická moc, `stab` / `ws` přičtení (0–1), `law {cat, id}` změna zákona zdarma, `adv {slot, id}` poradce zdarma, `factory {k, n}` továrny do státu s volným slotem (hlavní stát první), `infra {n}`, `boost {id, v}` postup výzkumu, `boostslot {v}` postup právě zkoumané technologie, `tech {id}` hotová technologie, `man {v}` lidská síla jako podíl obyvatel, `stock {eq, n}` výzbroj do skladu, `flag {id}` příznak, `event {id, days}` naplánovaná událost.
**Země bez hráče** si cíle volí samy (nejnižší `ai`, pak poloha) a události řeší volbou s nejvyšší `ai` váhou.

### Události
Událost: `id`, název a text, podmínky `cond` (`tags`, `from`/`until` den hry, `flag`, `noFlag`, `focus`, `war`, `stabBelow/Above`, `wsBelow/Above`, `law {cat: id}`), `mtth` (střední doba do spuštění ve dnech; deterministické „náhodné“ číslo z hashe dne, země a události – nespotřebovává `state.rng`), `cool` (nejmenší odstup opakování ve dnech, jinak jednorázová) a volby `opts` s účinky. Hráči se událost zařadí do `pend`, hra se pozastaví; volba se provede příkazem `chooseEvent`.

### Příkazy a selektory
`startFocus(state, o, id)`, `cancelFocus(state, o)`, `chooseEvent(state, o, id, volba)`; `focusTree(state, o)` (cíle se stavem `done | active | available | locked | excluded`), `natOf(state, o)`, `pendingEvents(state, o)`, `focusMods(done)`, `fxText(fx)`.

### Zjednodušení proti vzoru
Žádné války a územní nároky z cílů, žádné ideologické změny vlády a občanské války (cíle a události jen upravují hodnoty a zákony), stromy jsou menší (6–8 cílů), události bez řetězců přes více zemí a bez obrázků.

## 4f. Diplomacie (M23)

Diplomacie podle vzoru HOI4: **vztahy** zemí, **bloky** (spojenectví) s voláním do zbraně, **ospravedlnění války** před vyhlášením, **kapitulace** a **anexe** obsazených států, bílý mír. Data (`src/data/dip/*`: počáteční vztahy a bloky) i čísla (`src/engine/dip/constants.js`, `DIP`) jsou naše. Počítá se **jednou denně** (`dipHour` v `advanceHour` za národními cíli). Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`. Nízkoúrovňové `declareWar` / `makePeace` v armádě zůstávají (testy, AI M24); hra používá `startWar` a `proposePeace`.

### Tvar stavu (`state.dip`, `GAME_VERSION = 7`)
```
dip: {
  ver,                                    // zvyšuje se při změně bloků, ospravedlnění, kapitulaci (klíč mezipamětí UI)
  rel: { "a-b": změna },                  // změny vztahů proti základu (a < b), −100…100 po sečtení se základem
  fac: [0, id bloku…],                    // blok každé země (0 = žádný)
  facs: [null, { nm, ldr, mem: [země…] }…],   // bloky (smazaný = null)
  just: [{ a, b, ready }…],               // ospravedlnění války a proti b; použitelné od ticku ready, platí `JUST_KEEP` dnů
  cap: [0, 0|1…],                         // kapitulovala země?
  since: { "a-b": tick },                 // kdy vznikla válka dvojice (jen války vyhlášené `startWar`; AI podle toho pozná vleklou válku)
}
```
### Pravidla
- **Vztah** = základ (ideologie + historická tabulka) + uložená změna, zaokrouhlený na celé číslo; změny se při míru zapomínají (`REL_FORGET` za den).
- **Ospravedlnění** (`justifyWar`) stojí `JUST_PP` politické moci a trvá `JUST_DAYS`; vyžaduje zemi, která není v témže bloku ani ve válce s cílem; nejvýš `JUST_MAX` zároveň na zemi.
- **Vyhlášení** (`startWar`) vyžaduje hotové ospravedlnění. Všichni členové bloku útočníka válčí se všemi členy bloku obránce (volání do zbraně); vztah s cílem klesne o `REL_WAR`.
- **Mír** (`proposePeace`): druhá strana přijme bílý mír, když její válečné skóre (podíl bodů území držený proti protivníkovi minus podíl držený protivníkem) je menší než `PEACE_SCORE`.
- **Kapitulace:** země ve válce kapituluje, když nepřátelé drží `CAP_SHARE` jejích vítězných bodů, nebo `CAP_CAPITAL_SHARE` při ztraceném hlavním městě. Okupované státy připadnou okupantům (nové vlastnictví), válečné stavy kapitulujícího skončí, jeho jednotky v anektovaných provinciích odejdou domů nebo zaniknou, vypadne z bloku a ztratí stabilitu.
- **Bloky:** `createFaction` (stojí `FAC_PP`), `inviteToFaction` (vedoucí; pozvaný přijme, když `skóre pozvání ≥ INVITE_MIN`: vztah + společný nepřítel + shodná ideologie), `leaveFaction` (opouštějící vedoucí předá vedení dalšímu členu, poslední člen blok zruší).
- **Země bez hráče:** AI zatím nevyhlašuje války ani nezakládá bloky (M24); počáteční bloky jsou v datech a volají se do zbraně automaticky.

### Příkazy a selektory
`justifyWar(state, a, b)`, `startWar(state, a, b)`, `proposePeace(state, a, b)`, `createFaction(state, o, nm)`, `inviteToFaction(state, o, cíl)`, `leaveFaction(state, o)`; `diplomacyOf(state, o)` (všechny země se vztahem, stavem, možnostmi a důvody zamčení), `factionOf(state, o)`, `relOf(state, a, b)`, `warScore(state, a, b)`, `vpHeld(state, o)`, `inviteScore`, `capitulate(state, země)` (volá denní krok).

### Zjednodušení proti vzoru
Žádné cíle války s výběrem území, žádná mírová konference (anexe okupantem), žádné loutkové státy, záruky nezávislosti, embarga, špionáž ani odboj okupovaných území, žádný odchod členů z bloku bez ztráty a žádné protiútoky při kapitulaci.

## 4g. AI zemí (M24)

Země bez hráče (a při pozorovateli všechny) řídí **AI, která používá stejné příkazy jako hráč** (`build`, `addLine`, `recruit`, `createArmy`, `setPlan`, `justifyWar`, `startWar`, `proposePeace` …) – žádné zkratky ve stavu. Data (`src/data/ai/plans.js`: historické válečné plány) a čísla (`src/engine/ai/constants.js`, `AI`) jsou naše. Počítá se **jednou denně** (`aiHour` v `advanceHour` jako poslední), těžší rozhodnutí (útočné plány) jednou týdně. AI nespotřebovává `state.rng`; všechna rozhodnutí jsou deterministická (řazení podle id, hash `rand01`).

### Tvar stavu (`state.ai`, `GAME_VERSION = 8`)
```
ai: { level: 0 | 1 | 2 | 3, hist: 0 | 1 }   // 0 AI vypnutá (výchozí v enginu a v testech), 1 lehká, 2 běžná, 3 těžká; hist = historické válečné plány
```
Nastavuje se při založení hry (`createGame({ aiLevel, hist })`; hra z rozhraní začíná na úrovni 2, výběr je na obrazovce výběru země) a dál se nemění. Engine má AI ve výchozím stavu vypnutou, aby šly testovat ostatní systémy izolovaně.

### Co AI dělá
- **Průmysl** (`ai/industry.js`): fronta staveb nejvýš `QUEUE` projektů; civilní a vojenské továrny v poměru podle války; při plných slotech infrastruktura; volné vojenské továrny přidává na linky podle nedostatku zásob výzbroje (`DEFAULT_SPLIT`, ve válce víc pušek a děl).
- **Armáda** (`ai/army.js`): cílový počet divizí = počáteční × (1 + `BASE_BONUS` + `GROWTH_YEAR` · roky) × válka × obtížnost; AI zařazuje do výcviku nejčastější šablonu své země v hlavním městě (omezuje ji lidská síla a výzbroj), nové divize přiděluje do armád (nové armády dostávají velitele) a týdně dává armádám ve válce **útočné plány** (`suggestFront`, režim Vyváženě), je-li poměr sil příznivý (`ATTACK_RATIO` podle obtížnosti); jinak platí obranné plány z M18.
- **Diplomacie** (`ai/diplomacy.js`): za války navrhuje bílý mír, když ji vyčerpá válka (stabilita pod `PEACE_STAB` nebo podpora války pod `PEACE_WS`, nebo válka starší než `STALEMATE_DAYS` s válečným skóre blízkým nule; protivník ho přijme jen když nevede; hráči AI mír nevnucuje); při `hist` zakládá historické bloky (`HIST_FACTIONS`: Osa, britská spolupráce) a zve do nich, ospravedlní a vyhlásí válku podle historických plánů (`HIST_WARS`: cíl, okno ve dnech, nejmenší poměr sil), jen když je stabilní (`stab ≥ 0,4`) a má dost sil.
- **Politika a výzkum:** zákony za války a poradce řeší denní krok politiky (M21), technologie a národní cíle denní kroky M20 a M22.
- **Obtížnost:** AI země mají násobek výroby, staveb a výzkumu `1 + 0,1 · (level − 2)` (lehká −10 %, těžká +10 %); hráč ho nemá.

### Záměrná zjednodušení
AI nenavrhuje šablony, nezakládá bloky, nevolí mezi několika národními cíli podle situace, neobchoduje a neřídí přesuny jednotek mimo plány; námořní a letecká válka neexistují. Historické plány jsou jen sklon k válce, ne scénář: když se podmínky nesplní, válka nevznikne.

## 4h. Uložené hry (M25)

Hra je jeden serializovatelný JSON, takže uložení je jeho zabalení a načtení jeho kontrola. **Engine** (`src/engine/save.js`) umí `packGame(state)` (obálka `{ fmt: 1, v: GAME_VERSION, tick, player, state }`) a `unpackGame(obj)`, který obálku i stav **zkontroluje** (formát, verze, tvar polí podle světa, přítomnost všech systémů) a vrátí `{ state }` nebo `{ error }` s českým popisem; starší verze stavu se nemigrují (hra je ve vývoji) a hlásí se jako nekompatibilní. Čas uložení patří rozhraní (engine nezná `Date.now`).
**Rozhraní** (`ui/saves.js`): sloty v `localStorage` (`e1936:save:<slot>` s obálkou, `e1936:meta:<slot>` s popisem pro seznam), sloty `1`–`5` ručně, `auto` (automatické uložení první den každého herního měsíce) a `quick` (klávesa F6 uloží, F9 načte). Všechny přístupy jsou v `try/catch` (soukromé okno, plné úložiště) a chyby se hlásí oznámením; stav ≈ 150–200 kB.
Dialog ukládání a načítání (`SaveDialog`) je v nabídce hry (Uložit / Načíst) a v hlavním menu (Načíst). Načtení vyčistí výběr jednotek a panely, přesune kameru na zemi hráče a zachová pozastavení uložené hry.

## 4i. Zprávy a přehled zemí (M26)

**Deník dění** (`state.log`) zaznamenává důležité události, aby je hráč nepřehlédl při rychlém běhu času, a **přehled zemí** je tabulka sil všech zemí (jen výpočet ze stavu, nic se neukládá).

### Tvar stavu (`state.log`, `GAME_VERSION = 9`)
```
log: { n, items: [{ id, t, k, o, a, b, x }…] }   // n čítač id; items nejstarší první, nejvýš LOG_MAX = 300
// k druh: 'war' (a napadla b), 'peace' (a, b uzavřely mír), 'cap' (o kapitulovala), 'faction' (o založila blok x), 'join' (o vstoupila do bloku x),
//         'tech' (o dokončila technologii x), 'focus' (o dokončila cíl x), 'built' (o dokončila stavbu x), 'event' (o řešila událost x)
```
Systémy zapisují přes `logAdd(state, entry)` / `logAddMany` (`engine/log.js`); války, mír, kapitulace a bloky se zapisují vždy, technologie, cíle, stavby a události jen u země hráče (u pozorovatele nic).
**Rozhraní:** záložka *Zprávy* (`L`) – seznam od nejnovějších s ikonou, datem a textem (`ui/logText.js`, čistá funkce), filtr *Vše / Moje / Světové*; důležité nové záznamy se ohlásí oznámením (válka se zemí hráče, kapitulace, dokončený výzkum a cíl). Okno *Přehled zemí* (`O`): pořadí podle vítězných bodů, divize, továrny, stabilita, stav (válka, kapitulace, blok); klik na řádek ukáže hlavní město. Selektor `countryTable(state)`.

## 4l. Konvoje a obchodní válka (M31)

Rozšíření § 4b a § 4j (`GAME_VERSION` 12, nové pole `nav.cv`: přenos zlomku potopených konvojů). Kód: `src/engine/nav/convoy.js`, čísla v `NAV` (`CONVOY_AMT`, `CONVOY_KM`, `RAID_COEF`, `RAID_MAX`, `ESCORT_K`).

- **Trasa** (`tradeRoute`): smlouva mezi zeměmi, jejichž hlavní města leží na téže souvislé pevnině, jede po souši (bez konvojů). Jinak jede po moři mezi domovskými přístavy (`seaRoute`); chybí-li přístav nebo cesta na mapě, počítá se tranzit mimo mapu (po souši).
- **Konvoje** (`convoysOf`): smlouva po moři potřebuje `ceil(množství / CONVOY_AMT) + floor(km / CONVOY_KM)` transportních lodí dovozce. Lodě zaneprázdněné přepravou divizí se odečítají; nedostatek zmenšuje dodávky poměrem `dostupné / potřeba`. `transportsOf` vrací i `convoys` a `need` (volné lodě pro přepravu divizí klesají o konvoje).
- **Riziko** (`routeRisk`): v každé oblasti trasy ruší nepřátelské lodě (země ve válce s dovozcem nebo vývozcem) dodávky úměrně své palebné síle; vlastní a spojenecké válečné lodě v téže oblasti riziko snižují. Dodávka dne = `got × poměr konvojů × (1 − riziko)` (v `industryDay`).
- **Nájezdy** (`navDay`): každý den se podle rizika potopí část konvojů dovozce (zlomek se přenáší v `nav.cv`), hráč dostane záznam `convoy`.
- **AI**: staví transporty podle potřeby konvojů, nečinné flotily posílá na nepřátelské obchodní trasy a kryje vlastní ohrožené.
- **Rozhraní**: Obchod ukazuje u smlouvy „po moři / po souši“, počet konvojů a riziko; Logistika počet konvojů.

## 4m. Loutkové státy a mírová konference (M33)

Rozšíření § 4f (`GAME_VERSION` 13): `dip.sub[o]` = pán loutkového státu `o` (0 = nikdo), `dip.conf` = čekající konference `[{ id, loser, victor }]`. Kód: `src/engine/dip/subjects.js`, čísla v `DIP` (`SUB_MAN`, `SUB_PP`, `ANNEX_PP`).

- **Konference** (`conference`, volá ji `capitulate`): okupované státy připadnou okupantům jako dřív; hlavní vítěz (ten, kdo z poraženého vzal nejvíc států) rozhodne o zbytku. Hráč-vítěz dostane položku do `dip.conf` (dialog: loutkový stát / anektovat / nechat být – `confPuppet`, `confAnnex`, `confSkip`), AI rozhodne hned (velká nebo významná země = loutka, jinak anexe).
- **Loutka** (`makePuppet`): kapitulovaná země znovu ožije (`cap = 0`, stabilita aspoň 0,35) a má pána. Pán a loutka spolu nebojují, loutka nevede vlastní války ani diplomacii (`warBlock`, AI přeskočí `aiDiplomacy`).
- **Denní krok** (`subjectsDay` na začátku `dipDay`): loutka vede války pána (chybějící se vyhlásí, zaniklé skončí), pán denně dostane `SUB_MAN` lidské síly loutky a `SUB_PP` politické moci za loutku.
- **Anexe loutky** (`annexPuppet`): za `ANNEX_PP` politické moci; státy se převedou, jednotky loutky zaniknou, země zanikne.
- **Rozhraní:** dialog Mírová konference, v Diplomacii štítek „vaše loutka“ / „loutka“ a tlačítko Anektovat loutku; záznamy `puppet`, `annex` v Zprávách.

## 4n. Doktríny (M34)

Stav `state.doc = { ver, own[o] = { xp: { land, air, sea }, done: { id: 1 }, track: { větev: směr }, c } }` (`GAME_VERSION` 14). Data `src/data/doc/doctrines.js` (3 větve × 3 směry × 3 stupně), čísla `src/engine/doc/constants.js` (`DOC`).

- **Zkušenosti** (`docDay`, o půlnoci): armáda `LAND_BASE` + za každou divizi v boji `LAND_BATTLE` (nejvíc `LAND_BATTLE_MAX`), letectvo za letadla na misi, námořnictvo za flotily na cestě; strop `XP_MAX`.
- **Přijetí** (`adoptDoctrine`): stupeň n stojí `DOC.COST[n−1]` zkušeností své větve, vyžaduje stupeň n−1 téhož směru; první stupeň zamkne směr celé větve (`docBlock` vrací český důvod).
- **Účinky** (`docMods`, součet hotových doktrín): pozemní jdou do `army/unit.js:modsOf` (klíče `atk, def, atkArm, atkInf, defInf, hillAtk, hillDef` spolu s bonusy velitele), letecké násobí sílu hlídek, podporu boje a bombardování v `airDay`, námořní palebnou sílu flotil v boji a nájezdy / krytí konvojů v `routeRisk`.
- **AI** (`ai/doc.js`): každá země jde směrem podle svého pořadí a bere stupně, jakmile na ně má zkušenosti.
- **Rozhraní:** okno Důstojnický sbor (klávesa `K`), zkušenosti v horní liště; cheat `xp <land|air|sea> <n>`; záznam `doctrine`.

## 4o. Rozhodnutí (M35)

Rozšíření § 4e (`GAME_VERSION` 15): `nat.own[o].dec = { id: tick, kdy bude dostupné }`. Data `src/data/nat/decisions.js` (`DECISIONS`, `DECISION_CATS`), kód `src/engine/nat/decisions.js`.

- **Rozhodnutí** = jednorázová akce za politickou moc s obnovovací dobou `cd` (99999 dní = jednou za hru). Podmínky jsou data (`when`: `war`, `stab`, `ws`, `tag`, `ideo`), účinky stejné jako u cílů a událostí (`applyFx`; nový účinek `xp` přidá zkušenosti doktrín).
- **Příkazy:** `takeDecision(state, o, id)`, `decisionBlock` (český důvod odmítnutí), `decisionsOf` (přehled s kategorií, zbývajícími dny a popisem účinků).
- **AI** (`ai/decisions.js`): jednou týdně použije první povolené rozhodnutí s příznakem `ai`, když má politické moci o `cost + 40` víc.
- **Rozhraní:** okno Rozhodnutí (klávesa `J`) po kategoriích, hotová rozhodnutí zvýrazněná.

## 4p. Konec hry (M36)

Nové pole `state.end = null | { kind: 'win'|'lose'|'time', tick, ack, share, rank, vp, score }` (`GAME_VERSION` 16). Kód `src/engine/end.js`, vyhodnocení jednou denně (`endHour` jako poslední systém hodiny).

- **Vítězství:** podíl bodů pod kontrolou hráčova bloku (členové a loutky) ≥ `END.WIN_SHARE` (0,5). **Porážka:** hráčova země kapitulovala a není loutkou. **Konec času:** `END.TICK` (1. 1. 1946). Zahrnuje čas hry zastavením (`paused`).
- `standing(state)` vrací `{ vp, share, rank, total }` (pořadí podle bodů pod kontrolou). `ackEnd` dovolí pokračovat (konec se už nevyhodnocuje), `forceEnd` vynutí konec (cheat `end`, testy).
- **Rozhraní:** dialog Konec hry se shrnutím (datum, podíl světa, pořadí, body, skóre), klávesy jsou do potvrzení zablokované.

## 4q. Okupace: odboj a poddajnost (M38)

Nové pole `state.occ = { ver, st: { [stát]: { r, c, g } } }` (`GAME_VERSION` 17), jen pro okupované státy (vlastník ≠ držitel hlavní provincie). Kód `src/engine/occ/`, čísla `OCC`.

- **Denní krok** (`occDay`, po armádě): poddajnost `c` roste (rychleji s garnizonou), odboj `r` se blíží cíli `(R_BASE·(1−c) + exil)·(1 − R_GARRISON·garnizona)`; „exil“ platí, když původní země ještě bojuje. Garnizona = divize okupanta ve státě / potřebná (`obyvatelé / POP_PER_DIV`).
- **Důsledky:** nad `R_DMG_FROM` ztrácí garnizona organizaci; těžba okupovaného státu jde okupantovi jen z podílu `RES_BASE + (1−RES_BASE)·c` (`tallyOwners`); při odboji ≥ `R_REBEL` a slabé garnizoně (< `G_REBEL`) se stát vzbouří a provincie se vrátí původnímu vlastníkovi (záznam `rebel`).
- **Rozhraní:** mapové režimy Odboj a Poddajnost (klávesy 9 a 0), karta státu s odbojem, poddajností a garnizonou.

## 4r. Scénáře (M39)

`createGame({ scenario })` (výchozí `'1936'`) postaví základní stav a pak ho upraví `applyScenario(state, id)` (`src/engine/scenario.js`) podle dat v `src/data/scenarios.js`. Tvar stavu se nemění; scénář 1936 je beze změny.

- **Přesuny států** (`transfer`), zaniklé země (`dead`: kapitulované, bez jednotek) – jednotky původního vlastníka v převedených státech zaniknou.
- **Růst zemí** (`growth` po tazích, `default` jinak): násobky továren (nové továrny do volných slotů, linky se znovu rozdělí), divizí (klony existujících, bez armády), letectva (do kapacity letišť, zbytek do rezervy) a námořnictva; `xp` nejmenší zkušenost jednotek; `tech` technologie do roku podle velikosti země; `pp` bonus politické moci.
- **Bloky a války** (`factions`, `wars`) a počáteční čas (`tick`). Scénář „Září 1939“ začíná válkou Německa s Polskem, Británií a Francií.
- **Rozhraní:** na obrazovce výběru země přepínač scénáře; zaniklé země se ve scénáři nedají vybrat. AI útočí v režimu „Spěchat“ při poměru sil nad `AI.RUSH_RATIO`.

## 4s. Zpravodajství (M41)

Nový stav `state.spy = { ver, own[o] = { ag, ops: [{ id, k, t, left }], intel: { cíl: 0–1 }, n } }` (`GAME_VERSION` 18). Data `src/data/spy/ops.js` (průzkum, sabotáž skladů, krádež technologie, podněcování nepokojů), čísla `SPY`, kód `src/engine/spy/`.

- **Agenti:** velmoc začíná se dvěma, ostatní s jedním; další za politickou moc (`hireAgent`), strop podle velikosti země. Operace (`startOp`) zabere volného agenta, stojí politickou moc a trvá několik dní (`cancelOp` ji zruší).
- **Vyhodnocení** (`spyDay`, denně): šance `BASE + INTEL_BONUS·přehled + AGENT_BONUS·agenti − COUNTER·agenti cíle` (v mezích), náhoda hashem `rand01`. Úspěch: přehled +, zásoby cíle −, urychlení výzkumu, ztráta stability a podpory války cíle. Neúspěch: s pravděpodobností `CAUGHT` je agent ztracen a vztah s cílem klesne. Přehled o zemi denně klesá.
- **AI** (`ai/spy.js`): jednou za pět dní najme agenta a vede operace proti nepříteli (nejdřív průzkum).
- **Rozhraní:** okno Zpravodajská agentura (`G`); záznam `spy` v Zprávách.

## 4t. Pevnosti (M42)

`ind.fort = { provincie: úroveň 0–5 }` (`GAME_VERSION` 19). Stavba `fort` je provinční (bez stavebního slotu, `BUILDINGS.fort.province`): `buildFort(state, p)` ji zadá v provincii, jejíž stát i kontrola patří téže zemi; položka fronty `{ id, o, s, p, k: 'fort', prog }`. Obecný `build` pevnost nezadá. `industryDay` po dokončení zvýší úroveň.

- **Účinek:** v `army/combat.js` dostává obránce v provincii s pevností bonus k obraně `ARMY.FORT_DEF` (0,12) za úroveň.
- **AI** (`ai/forts.js`): ve válce staví pevnosti ve vlastních provinciích na frontě, nejvýš dvě rozestavěné najednou.
- **Rozhraní:** karta provincie ukazuje úroveň pevnosti a tlačítko stavby; záznam „Stavba dokončena“ s názvem provincie.

## 4u. Počasí a roční období (M43)

Bez uloženého stavu: `weatherAt(tick, p)` (`src/engine/weather.js`) odvozuje počasí z měsíce a podnebí regionu provincie. Teplota = `průměr − rozkmit·cos(2π(měsíc−1)/12)` podle podnebí; z ní `cold` (mráz od 0 °C dolů, plný při −12 °C), `mud` (bláto v březnu, dubnu, říjnu a listopadu v mírném pásu při 0–12 °C) a `heat` (nad 28 °C). Účinky (násobí se silou jevu):

- **Boj** (`army/combat.js`): postih k útoku obou stran v bojové provincii (`atk`).
- **Pohyb** (`army/movement.js`): snížení rychlosti (`spd`). **Obnova organizace a opotřebení** (`army/upkeep.js`): pomalejší obnova (`org`), v mrazu větší ztráty bez zásob.
- **Rozhraní:** řádek Počasí na kartě provincie, mapový režim Počasí (bílá = mráz, hnědá = bláto, oranžová = vedro; mění se s měsícem).

## 4v. Historické události (M44)

Datový balík `data/nat/events_hist.js` (`HIST_EVENTS`, připojený k `EVENTS`): 23 příběhových událostí (GER, ENG, FRA, ITA, SOV, POL, CZE, SPR, SWE, TUR a obecné doby). Stejný tvar a stejné podmínky jako u ostatních událostí (`tags`, `from`/`until`, `flag`/`noFlag`, `war`, `stabBelow/Above`, `wsBelow`); žádné nové typy účinků ani změna stavu. Příběhové události se na hráče nebo AI spustí jednou (příznak `noFlag`). Texty jsou vlastní, bez skutečných osob. Test: `test/nat.test.js` (platnost dat, 720 dní s hráčem GER vyvolá události `ger_*`).

## 4w. Statistiky (M45)

`state.stat = { t: [tick…], m: { vp, divs, fac, stab }: [[hodnota podle indexu země]…] }` (`engine/stat/index.js`). Snímek se pořizuje při vzniku hry a pak každých 30 herních dní (`statHour` je vnější vrstva `advanceHour`); drží se nejvýše 130 snímků (`STAT.MAX`). Metriky: vítězné body pod kontrolou, divize, továrny (civilní + vojenské), stabilita (%). Selektory `seriesOf(state, metric, o)` a `topBy(state, metric, n)`. Stav je verze 20 (`GAME_VERSION`), `validateState` vyžaduje část `stat`. UI: okno Přehled zemí (O) má záložky Pořadí a Grafy (SVG čárový graf, 6 nejlepších zemí + hráč, přepínač ukazatelů). Test: `test/stat.test.js`.

## 4x. Železniční pohyb (M46)

Bez nového stavu a bez nového příkazu: krok `a`→`b` mezi dvěma provinciemi, které obě ovládá země divize, a se železničním spojem úrovně `L` (1–5) trvá `1 / (1 + RAIL_SPEED × L)` běžné doby (`RAIL_SPEED` 0,8, tedy úroveň 5 = 5× rychleji) a organizace ubývá jen `RAIL_ORG` (25 %) běžné ztráty. Platí pro každý rozkaz `orderMove`, i pro AI. `findPath` počítá s kratším krokem (cesta vede po železnici, kde se vyplatí) a `pathHours(from, path, ctrl, o)` dává odhad doby pro danou zemi. Pomocné funkce `railLevel(w,a,b)` a `stepHoursFor(w,ctrl,o,a,b,kind)` v `army/paths.js`. V nepřátelském a cizím území se pochoduje jako dřív. Test: `test/rail.test.js`.

## 4y. Půjčka a pronájem (M47)

`engine/dip/lend.js`: `lendLease(state, from, to, eq, n)` přesune `n` kusů druhu výzbroje ze skladu země `from` do skladu `to`. Smí se jen mezi členy téhož bloku a mezi pánem a loutkou, ne s kapitulovanou zemí ani ve válce, najednou nejvýš `DIP.LEND_MAX` (25 %) skladu; zásilka zvedne vztah o `DIP.LEND_REL`. Do stavu se nic nepřidává, jen záznam `{k:'lend', a, b, x:druh, y:počet}` v deníku. `lendBlock` vrací český důvod odmítnutí. AI (`aiLend`, denně) v míru posílá přátelům ve válce výzbroj, kterou sama má aspoň `DIP.LEND_AI_MIN` kusů a oni mají méně než čtvrtinu jejího zásoby. UI: v panelu Diplomacie u přítele výběr druhu a tlačítko „Poslat n“. Test: `test/lend.test.js`.

## 4z. Záruky nezávislosti (M48)

`state.dip.gar = [{ g, t }]` (zaručitel, zaručená země; od `GAME_VERSION` 21, `validateState` vyžaduje pole). `engine/dip/guarantee.js`: `guarantee` (cena `DIP.GAR_PP` politické moci, nejvýš `DIP.GAR_MAX` záruk na zaručitele, vztah + `DIP.GAR_REL`), `revokeGuarantee` (zdarma, vztah klesne), `guaranteeBlock` (český důvod odmítnutí: stejný blok, loutky, kapitulace, válka, chybí moc). Při `startWar(a, b)` se zaručitelé obránce `b` přidají do války na jeho straně i se svými bloky (`joiningGuarantors`), pokud nejsou v táboře útočníka, nekapitulovali, nejsou loutky a mají stabilitu aspoň `DIP.GAR_STAB`; ostatním záruka zaniká (`breakGuarantees`, vztah klesne). AI zaručuje podle `HIST_GUARANTEES` (`data/ai/plans.js`, jaro 1939: ENG a FRA → POL, ROM, GRE; ENG → TUR). UI: v panelu Diplomacie tlačítko „Zaručit nezávislost“ / „Zrušit záruku“ a štítek „vaše záruka“ / „zaručuje vás“; deník ukazuje `gar` a `garend`. Test: `test/guarantee.test.js`.

## 4za. Upozornění (M49)

`engine/alerts.js`: `alertsOf(state, o)` je čistá funkce stavu (nic se neukládá) a vrací seznam `{ id, panel, tab?, tone, text }`: čekající událost, volný výzkumný slot, neplněný národní cíl, politická moc od `ALERT.PP_HIGH` (150), prázdná stavební fronta při volných civilních továrnách, `ALERT.MIL_IDLE` (2) a více vojenských továren bez zakázky. Kapitulovaná nebo neplatná země nemá nic. UI: `ui/hud/Alerts.jsx` kreslí pod lištou nabídek svislou řadu tlačítek, klik otevře příslušné okno (nebo záložku Průmyslu); při otevřeném okně přes celou obrazovku se řada schová. Test: `test/alerts.test.js`.

## 4zb. Radar (M50)

Stavba `radar` (`BUILDINGS.radar`, mimo stavební sloty, nejvýš 3 úrovně, cena 300 b. za 35 dnů) zvyšuje `ind.st[s].radar` jako letiště `afb`; bez změny tvaru stavu. V `air/day.js` se k síle nepřátelských hlídek (`foesPatrol`) nad státem `s` přičítá `radarOf(ind, s) × AIR.RADAR_K` (30 = zhruba 5 stíhaček na úroveň), když stát patří zemi ve válce s letcem; tím klesá krytí (`cover`) a roste ztrátovost i slábne bombardování a podpora boje nad tím státem. Vlastní letadla nad vlastním státem radar nijak nepoškozuje. AI (`ai/air.js`, `radarState`) ve válce nebo s aspoň 40 letadly staví po jednom radaru ve státech s letištěm do úrovně 2. UI: tlačítko stavby ve Průmyslu i na kartě státu je generické (z `BUILDING_IDS`), na kartě státu řádek Radar. Test: `test/radar.test.js`.

## 4zc. Sdílení technologií (M51)

Členové téhož bloku sdílejí poznatky (`research/core.js`): za každého člena bloku, který technologii už má (ne kapitulovaný, ne loutka), roste rychlost jejího výzkumu o `RES.SHARE_PER` (10 %), nejvýš o `RES.SHARE_MAX` (50 %). `sharersOf` a `shareBonus` jsou čisté dotazy, bonus se používá v `researchDay`, v `dailyProgress` a v odhadu doby (`etaDays`). Bez změny stavu. UI: v panelu Výzkum se u rozpracovaných i dostupných oborů ukazuje „sdílení bloku +n %“. Test: `test/techshare.test.js`.

## 4zd. Letečtí esa (M52)

Křídla mají pole `a` (0–`AIR.ACE_MAX`, tj. 3; od `GAME_VERSION` 22). Ve vzdušném boji hlídek (`airDay`, mise `air` s nepřátelskými hlídkami nad cílem) vznikne eso s denní šancí `AIR.ACE_CHANCE × e/(e+mine) / (1 + a)` (hash `rand01(tick, id křídla, 'ace')`, žádná náhoda ze stavu). Každý stupeň zvedá sílu hlídek křídla o `AIR.ACE_BONUS` (5 %); jména stupňů jsou v `ACE_NAMES` (Dobrý, Unikátní, Geniální pilot). Rozpuštěním křídla se esa ztrácejí, doplnění je zachová. Hráči se vznik ohlásí v deníku (`ace`). UI: štítek v kartě křídla. Test: `test/aces.test.js`.

## 4ze. Velitelská moc (M53)

`state.cmd = { cp: [moc podle země], ab: [{ o, army, id, until }] }` (od `GAME_VERSION` 23, `validateState` vyžaduje část `cmd`). Velitelská moc začíná na `CMD.START`, denně roste o `CMD.PER_DAY` (ve válce `PER_DAY_WAR`) do `CMD.MAX` (`cmdHour` je vnější vrstva `advanceHour`). Za moc armáda použije schopnost z `data/cmd/abilities.js` (Vynucený útok, Poslední vzdor, Pevná obrana, Zrychlený pochod): `useAbility(state, o, armyId, id)` (hlídá `abilityBlock`, jedna aktivní schopnost na armádu) zapíše `ab` s časem vypršení; `army/unit.js modsOf` přičítá bonusy schopnosti k velitelským a doktrinálním (`abilityMods`). AI (`aiCommand`, denně ve válce) použije ve střetu vynucený útok (útočící armáda) nebo poslední vzdor (bránící). Cheat `cp <n>`. UI: řádek schopností v rozbalené armádě (panel Armáda) a údaj Velitelská moc v horní liště. Test: `test/cmd.test.js`.

## 4zf. Dovednosti velitelů (M54)

Velitelé (`mil.gens`) mají pátou dovednost `mn` (Manévr, od `GAME_VERSION` 24). Počáteční hodnota se odvodí z hashe jména a vlastníka (nespotřebuje náhodu, takže se ostatní velitelé nemění). Manévr dává bonus rychlosti `C.SKILL_MAN_SPEED` a obnovy organizace `C.SKILL_MAN_ORG` za úroveň (`genMods`); úroveň velitele je nyní součet pěti dovedností − 4, při postupu úrovně roste náhodně vybraná dovednost včetně manévru. UI: štítek Mn u velitele. Test: `test/leaderskills.test.js`.

## 4zg. Autonomie loutek (M55)

`dip.au[o]` = autonomie loutkového státu 0–100 (od `GAME_VERSION` 25; `validateState` vyžaduje pole). Nová loutka začíná na `DIP.AU_START`, autonomie denně roste o `DIP.AU_GROW` (`subjectsDay`). Úroveň určuje `autonomyLevel` podle `DIP.AU_LEVELS` (Kolonie, Loutkový stát, Dominion, Nespokojená loutka); příspěvky pánovi (lidská síla, politická moc) se násobí `DIP.AU_MULT[úroveň]` (1,6 / 1 / 0,5 / 0,2). Dosáhne-li autonomie 100, loutka se osamostatní (`dip.sub = 0`, vztah −20, záznam `free`). Pán může kontrolu utáhnout (`tightenControl`: −`AU_TIGHT` autonomie, stojí `AU_TIGHT_PP` politické moci a trochu stability loutky) nebo uvolnit (`loosenControl`: +`AU_LOOSE`, lepší vztah). AI pán utahuje loutky od autonomie 70. UI: v panelu Diplomacie u vlastní loutky úroveň, autonomie a tlačítka. Anexe loutky autonomii nuluje. Test: `test/autonomy.test.js`.

## 4zh. Válečné cíle (M56)

Ospravedlnění války má cíl (`data/dip/wargoals.js`): Podmanění (25 PM, 30 dní; po vítězství loutka nebo anexe), Územní nároky (12 PM, 15 dní; po vítězství převzetí až 3 nejcennějších zbylých států, poražený zůstane samostatný) a Ponížení (6 PM, 8 dní; poražený zaplatí `pp_gain` politické moci, ztratí podporu války a zůstane samostatný). `justifyWar(state, a, b, cíl)` ukládá cíl do `dip.just`, `startWar` ho zapíše do `dip.goal['a>b']` (od `GAME_VERSION` 26), kapitulace předá cíl konferenci (`conf.g`) a hráčův dialog nabídne volby podle cíle (`confPuppet`/`confAnnex` jen pro Podmanění, `confTake` pro Územní nároky, `confTribute` pro Ponížení). AI i výchozí tlačítko používají Podmanění. UI: v panelu Diplomacie jedno tlačítko ospravedlnění na cíl; řádek diplomacie má seznam `goals`. Test: `test/wargoals.test.js`.

## 4zi. Národní cíle všech zemí (M57)

Každá z 35 zemí má vlastní strom národních cílů (`data/nat/focuses_more.js`; obecný strom `DEFAULT` zůstává jen jako záloha pro neznámé tagy). Stromy menších zemí (6–9 cílů) jsou postavené na jejich situaci: neutralita a obrana hranic (BEL, HOL, SWI, SWE, FIN), pobaltské země, Balkán a revizionismus (HUN, BUL, ROM, YUG, GRE, ALB), Turecko a průlivy, ropa a koncese (IRQ, PER, SAU, OMA, EGY), kolonie (POR). Velmoci (GER, FRA, ENG, ITA, SOV, POL, CZE, SPR) dostaly další větve (letectvo, námořnictvo, zpravodajství, věda). Poloha cíle v mřížce se dopočítá z hloubky stromu pomocníkem `tree()`; id cíle začíná tagem země malými písmeny. Žádná nová mechanika ani změna stavu. Test: `test/nat.test.js` (blok „národní cíle pro všechny země“).

## 4zj. Oznámení a vyskakovací okna (M58)

Upozornění (`engine/alerts.js`) mají `n` (počet) a `lines` (podrobnosti) a přibyla dvě: divize bez armády (`divs`, otevře panel Armáda) a dostupná rozhodnutí (`decisions`). `ui/hud/Alerts.jsx` je kreslí jako vodorovnou řadu vedle lišty nabídek: ikona s počtem, po najetí tooltip s podrobnostmi, klik otevře okno, pravé tlačítko upozornění odloží do změny počtu. Důležité záznamy deníku hráče (`focus`, `tech`, `built`, `doctrine`, válka hráče, kapitulace, osamostatnění loutky) se v `useGameLoop` (`ui/hooks.js`) přes `popupFor` (`ui/popups.js`) změní na vyskakovací karty (`ui.popups`, `pushPopup`/`closePopup` v `ui/actions.js`, vykresluje `ui/hud/Popups.jsx`): název, text a seznam účinků cíle. Karty mizí po `POPUP_MS` (14 s), válka a kapitulace hráče zůstávají do zavření; nejvýš `POPUP_MAX` (4) najednou. Ostatní důležité záznamy zůstávají krátkým oznámením. Test: `test/popups.test.js`.

## 4zk. Ovládání ve stylu HOI4 (M59)

Ovládání mapy a jednotek podle HOI4 (jen mechanika, vlastní kód): **fronta rozkazů** – Shift + pravé tlačítko připojí další bod trasy za dosavadní rozkaz (`orderMove(state, ids, prov, append)`: `findPath` z posledního bodu cesty; `contextClick(label, { shift })`); **skupiny jednotek** – Alt + 1–9 uloží vybrané divize, Shift + 1–9 je vyvolá, druhé stisknutí do 0,6 s zaměří kameru (`saveUnitGroup`/`recallUnitGroup` v `ui/actions.js`, skupiny žijí jen v rozhraní a vyřazené divize ze skupiny vypadnou); **posun mapy** – střední tlačítko (tažení jakýmkoli tlačítkem posouvá) a okraj obrazovky (kurzor v pásu 4 px u levého, pravého a dolního okraje mapy; volba „Posun okrajem“ v nabídce, uložená v `localStorage` přes `ui/edge.js`). Nápověda (F1) je doplněna. Mapové režimy zůstávají na číslicích bez modifikátorů. Test: `test/controls.test.js`.

## 4k. Letectvo (M30)

Stav `state.air = { ver, wn, wings[], pool[], sup{} }` (`GAME_VERSION` 11). Čísla vyvážení jsou v `src/engine/air/constants.js` (`AIR`), data letounů v `src/data/air/planes.js` (`PLANES`, `AIR_PROD`, `AIR_NATIONAL`).

- **Typy:** stíhač (`sti`, hlídky), bitevní letoun (`bit`, podpora boje), taktický bombardér (`tac`, podpora i bombardování), strategický bombardér (`str`, odemyká technologie `strbomb`). Každý má dolet v km, sílu ve vzdušném boji (`atk`), podporu (`cas`) a bombardování (`bomb`).
- **Letiště:** úroveň `ind.st[s].afb` (0–5, stavba `afb` bez slotu, `build(state, s, 'afb')`); kapacita státu = úroveň × `AIR.PER_LEVEL` letadel.
- **Křídla:** `wings[id] = { id, o, t, n, s (základna), m: null|'air'|'cas'|'bomb', to (cílový stát), c (přenos zlomku ztrát) }`; `wings[0] = null`, zrušené křídlo je `null`. Rezerva `pool[o][typ]` dostává letadla z výroby (linky letounů používají vojenské továrny, `industryDay`).
- **Příkazy:** `formWing, disbandWing, reinforceWing, rebaseWing, setMission` (`air/commands.js`), `missionBlock` vrací český důvod odmítnutí (role, dolet, válka).
- **Denní krok `airDay`** (o půlnoci po armádě a námořnictvu): křídla na ztraceném letišti zaniknou (část letadel do rezervy) → hlídky (`air`) určí krytí států → mise ztrácejí letadla podle krytí → podpora (`cas`) se uloží do `air.sup["vlastník:stát"]` (strop `CAS_MAX`) a bojový profil divize v `army/combat.js` ji přičte k útoku → bombardování (`bomb`) snižuje cíli podporu války, stabilitu a sklady výzbroje (hráč dostane záznam `bombed`). Bez náhody (zlomky ztrát se přenášejí v `c`).
- **Technologie:** obor Letectvo (`sti2…`, `bit2…`, `tac2…`, `strbomb`, `str2`) zvedá úrovně `mil.lv` letounů (síla × `1 + LV_MULT·(úroveň−1)`).
- **AI** (`ai/air.js`): staví letiště, dává letecké linky z podílu továren (`AI.AIR_SHARE`), sestavuje křídla a zadává mise (hlídky nad frontou, podpora boje, bombardování).
- **Mapa:** vrstva jednotek (`ui/map/air.js`) kreslí misie hráče (čárkovaná čára z letiště, kruh hlídky nebo bod cíle; barvy hlídky / podpory / bombardování) a odznaky letišť s počtem letadel; cizí letectvo se nezobrazuje.
- **Rozhraní:** okno Letectvo (klávesa `A`, `ui/air/AirPanel.jsx`): křídla s volbou mise a cíle, nové křídlo, rezerva, letiště; letecké linky v okně Výroba; Logistika ukazuje letadla; cheat `plane <typ> <n>`.

## 4j. Námořnictvo a přeprava přes moře (M27)

Námořnictvo podle vzoru HOI4 ve zjednodušené podobě: **loděnice**, **lodě** vyráběné na linkách, **flotily** na mořských oblastech, **námořní boj** a **přeprava divizí** přes moře včetně vylodění. Bez toho by Britské ostrovy, Skandinávie a Středomoří byly pro armády nedosažitelné. Data (`src/data/navy/*`: lodě, ceny a suroviny, počáteční loďstva zemí) a čísla (`src/engine/nav/constants.js`, `NAV`) jsou naše. Pohyb flotil a přeprava se počítají **každou hodinu** (`navHour` za armádou), boj, potopení a výroba **denně**. Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.

### Tvar stavu (`state.nav`, `GAME_VERSION = 10`)
```
nav: {
  ver, fn,                                  // ver zvyšuje změna flotil, přepravy a rezervy (klíč mezipamětí UI); fn čítač id flotil
  fleets: [null, { o, nm, p, ships: {dd, ca, bb, ss, tr}, c: {…}, mx, to, path: [mořské oblasti…], prog }…],
  pool:   [null, { dd, ca, bb, ss, tr }…],  // nové a nezařazené lodě v přístavu země (mořská oblast přístavu = `homeSea`)
  sail:   [{ id, o, from, to, route: […], t0, arrive, div: {…divize…} }…]   // divize na moři
}
ind.st[stát] = { civ, mil, dok, res }       // nová budova `dok` (námořní loděnice; jen ve státě s přístavem)
```
`p` flotily je mořská oblast (štítek `L + 1 …`), `to` cílová oblast, `path` zbývající oblasti rozkazu, `prog` 0–100 postupu do první oblasti cesty; `c` zbytky škod po druzích lodí, `mx` největší součet síly (pro ústup).

### Lodě a výroba
`SHIPS`: torpédoborec (`dd`), křižník (`ca`), bitevní loď (`bb`), ponorka (`ss`), transportní loď (`tr`) – síla `hp`, palebná síla `atk`, rychlost `spd` (km/h), cena v bodech výroby a suroviny na kus (`SHIP_PROD`). **Loděnice** (`dok`: 900 bodů / 60 dní, zabírá stavební slot, jen ve státě s přístavem) dávají body lodním linkám: lodní linka je obyčejná linka (`ind.lines`) s lodí místo výzbroje a `fac` = počet loděnic; vojenské továrny a loděnice se počítají odděleně (`milFree` × `dockFree`), na loděnice nepůsobí spotřební zboží. Hotové lodě jdou do `nav.pool`.

### Flotily a boj
- `formFleet(o, lodě, jméno)` vezme lodě z rezervy a založí flotilu v `homeSea(o)` (mořská oblast nejlepšího přístavu, který země ovládá); `orderFleet(id, oblast)` zadá cestu po mořských oblastech (nejkratší podle vzdálenosti středů); `disbandFleet` vrátí lodě do rezervy (jen v domovské oblasti).
- **Boj** (denně) v oblasti, kde jsou flotily válčících stran: obě strany ztratí podíl síly `min(DMG_CAP, DMG · palba protivníka / síla strany)`, ztráty se rozdělí podle druhů lodí s přenosem zbytků; flotila pod `RETREAT` svého maxima ustoupí do nejbližší domovské oblasti, prázdná flotila zaniká.
- **Ovládání moře:** oblast ovládá strana, která tam má flotilu bez bojové protistrany (válčící strany spolu bojují). `seaBlocked(state, o, oblast)` = nepřátelská flotila a žádná vlastní nebo spojenecká.

### Přeprava a vylodění
`orderSail(divIds, cíl)`: divize musí stát v přístavu, mimo bitvu; cíl je pobřežní provincie, kterou země ovládá, nebo nepřátelská bez obránců (**vylodění**; neutrální cizí ne). Trasa vede po mořských oblastech, které nejsou zablokované nepřítelem; doba = nalodění `LOAD_H` + délka / `TR_SPEED`. Každá divize zabere jednu transportní loď (kapacita = všechny `tr` země minus divize na moři). Divize na moři zmizí z `mil.divs` (záznam v `nav.sail` nese celý objekt) a po příchodu se objeví v cíli s ztrátou organizace při vylodění mimo přístav (`LAND_ORG`); při příchodu do provincie s obránci se vrátí do výchozího přístavu. Denně se kontroluje, zda na trase nezablokovala oblast nepřátelská flotila: divize se **potopí** (zmizí, mizí i transportní loď). Přeprava hlásí zápisy v deníku (`landing`, `sunk`).

### AI
AI země zakládá loděnice podle `NAVY_NATIONAL`, staví lodě, z rezervy skládá flotilu a drží ji v domovské oblasti; na moři neútočí a nevyloďuje.

### Záměrná zjednodušení
Žádné konvoje a obchodní válka, ponorky jen jako levné lodě bez zvláštních pravidel, žádné letadlové lodě a letecká podpora, žádný palivový dosah, ostřelování pobřeží, miny ani námořní mise (hlídka, eskorta), vylodění jen na nehájenou provincii, jedna transportní loď = jedna divize.

## 5. Rozhraní

Obrazovky (`uiStore.screen`): `menu` → `select` → `game`. **Jedno trvalé plátno mapy** (`MapView`) leží pod všemi obrazovkami; React kreslí jen HUD.

**Mapa** (`ui/map/`):
- `camera.js` – střed + přiblížení (obrazovkové px na pixel světa), meze, převody, `lerpView`; `MAX_ZOOM = 12`.
- `geometry.js` – okruhy provincií, obálky, prostorový rastr (64 px) a hledání oblasti pod kurzorem (bbox + bod v mnohoúhelníku), `Path2D` cache.
- `tiles.js` – čistá logika dlaždic: úroveň z přiblížení (`levelFor`), rozsah dlaždic, `Grid`, `LruCache`.
- `renderer.js` – **dlaždicová mezipaměť**: svět se vykreslí do dlaždic 512 × 512 zař. px v měřítku 2^úroveň, snímek jen skládá dlaždice (3–8 ms), přidá zvýraznění,
  značky a popisky bez překrývání (země → státy → města) a rám listu. Změna vlastníků/režimu/ztlumení zvedne `version`, překreslí se jen viditelné dlaždice
  (při pohybu kamery s rozpočtem 9 ms na snímek, zbytek se dokreslí v dalších; do té doby se použije náhrada z jiné úrovně).
- `controller.js` – `mapController` (singleton): kamera, animace `flyTo`, `viewForBox` (středění do volné plochy mimo panely – `insets`), pomalý pohyb v menu, smyčka kreslí jen při změně.
- `colors.js` – osm režimů (klávesy 1–8): politická, terén, státy, regiony, obyvatelé, vítězné body, **zásobování** (provincie hráče podle toku `supplyFlow`: červená → žlutá → zelená, ostatní ztlumené), **průmysl** (barva podle počtu továren ve státě; překreslí se jen při změně `ind.st`); `focus` ztlumí všechny země kromě jedné (výběr země).
  Okupované provincie (držitel ≠ vlastník) se v politickém režimu a v režimu států kreslí pruhy barvy držitele; změna držitele zneplatní jen dlaždice v okolí provincie (`invalidateProvinces`), v režimu zásobování celou mapu.
- `labels.js` – kotvy jmen zemí (největší souvislá část) a států.
- `MapView.jsx` – vazba na DOM: tažení, kolečko, hover/klik (práh 5 px), ResizeObserver, klávesy. Zvýraznění pod myší se při tažení ruší a když se kamera pohne pod nehybnou myší
  (klávesy, kolečko, přelet), přepočítá se – nejvýš jednou za snímek. `Minimap.jsx` – přehled s výřezem.

Zrnění a ztmavení okrajů mapy je **CSS překryv** (`.map-host::after`), ne kreslení do plátna.

**Armáda v rozhraní** (M18; `ui/army/`, `ui/map/units.js` + `counters.js`). Stav `uiStore`: `selDivs` (vybrané divize, `NONE` = sdílené prázdné pole), `hoverUnits`, `panel` (`null | 'army' | 'recruit'`), `armyFocus`, `open` (rozbalené uzly stromu), `planEdit`, `designer`, `toast`.
- **Žetony na mapě** (`UnitLayer` v rendereru, kreslí se v obrazovkových pixelech nad dlaždicemi, ne do nich): divize stejné země ve stejné provincii (a se stejným směrem pohybu) tvoří jeden žeton s počtem, značkou převažujícího druhu, pruhy síly a organizace a odznaky stavu (boj, nedostatek zásob, ústup).
  Divize na pochodu se kreslí mezi provinciemi; při oddálení se blízké žetony stejné země slučují (`clusterCell` je mocnina dvou, shluky se při posunu mapy nemění). Vybrané mají zlatý okraj, nepřátelé červený. Kreslí se jen při změně; vrstva stojí ≈ 3–4 ms při ≈ 500 žetonech.
  Čistá data (`buildCounters`, `clusterCounters`, `routesOf`, `battlesOf`) jdou testovat bez plátna.
- **Na mapě dál:** šipky pohybu (vlastní zeleně, vybrané zlatě, útoky červeně), značky bitev s poměrem sil, náhled trasy pod kurzorem při vybraných jednotkách, plán armády (modře držená oblast nebo linie, červeně cíle útoku se šipkami z linie).
- **Výběr a rozkazy:** klik na žeton vybere divize, Shift přidává a odebírá, dvojklik vybere celou armádu, Shift + tažení vybere obdélníkem; pravé tlačítko = rozkaz (nepřátelská provincie = útok); `X` zastaví, `F` zaměří výběr. Cizí žeton jde vybrat jen k prohlídce.
- **Boční panel** (`SidePanel`, vpravo, `INSETS.gameDossier` r = 394) se záložkami *Oblast* (karta provincie, země a válek, od M19 i **Průmysl státu** se stavbou), *Armáda* (`V`), *Nábor* (`N`) a *Průmysl* (`I`) a *Výzkum* (`R`) a *Politika* (`P`) a *Cíle* (`C`) a *Diplomacie* (`D`; neaktivní záložky ukazují jen ikonu); je vidět, jen když je zvolená záložka nebo označená oblast.
- **Panel Armáda:** strom skupin armád → armád → divizí (šipkou se sbalí; dvojklik přejmenuje; přetažením se přesouvají divize do armád a armády do skupin), souhrny síly a organizace, velitel (výběr z velitelů země s dovednostmi a rysy), plán (*Hájit oblast*, *Linie fronty*, režim útoku, *Zrušit plán*), rozpuštění.
- **Lišta úpravy plánu** (`PlanBar`, nahoře uprostřed): nástroje Linie / Cíle útoku, *Použít aktuální frontu* (`suggestFront`), Vymazat, režim útoku, Potvrdit / Zrušit; klik na mapě provincii přidá nebo odebere, Shift + klik celý stát.
- **Dolní lišta výběru** (`SelectionBar`): síla, organizace, statistiky divize (u více divizí souhrn), armáda a velitel; Nová armáda, Do armády, Zastavit, Zaměřit, Rozpustit (s potvrzením).
- **Nábor** (`RecruitPanel`): sklady výzbroje a lidská síla, karty šablon s cenou a statistikami (Zařadit, × 5, úprava, smazání), fronta výcviku. **Návrhář šablon** (`TemplateDesigner`, okno): mřížka pluků a praporů 5 × 5, podpůrné roty, živé statistiky a kontrola `validateTemplate`.
- **Panel Průmysl** (`ui/industry/IndustryPanel.jsx`, M19): souhrn (civilní, vojenské, spotřební zboží, body stavby, volné továrny) a záložky *Stavby* (volba státu a druhu stavby, fronta s odhadem dokončení, přeřazení a zrušení), *Výroba* (sklad, linky s výběrem výzbroje, počtem továren, efektivitou, výrobou za den a pokrytím surovin, nová linka) a *Obchod* (tabulka šesti surovin, formulář nové smlouvy s přebytkem partnera, seznam smluv s dodaným množstvím). Akce (`buildIn`, `newLine`, `newTrade` …) kontrolují vlastnictví hráče a při neúspěchu napíšou důvod.
- **Panel Výzkum** (`ui/research/ResearchPanel.jsx`, M20): souhrn (rychlost, počet hotových, úrovně výzbroje), sloty se zkoumanou technologií, postupem a odhadem dnů (přerušení zachová postup), filtr oborů a karty technologií (rok, délka, účinky a odemykané jednotky, stav Hotovo / Zkoumá se / K dispozici / Zamčeno s chybějícími předpoklady, předstih a odhad). Návrhář šablon, panel Nábor a panel Průmysl respektují odemčené jednotky a výzbroj hráče a statistiky počítají s jeho úrovněmi výzbroje.
- **Panel Politika** (`ui/politics/PoliticsPanel.jsx`, M21): stabilita a podpora války s cílem a směrem, politická moc a příjem, souhrn dopadů (výroba, lidská síla, spotřební zboží), zákony po oborech (každý krok s cenou, účinky a důvodem zamčení) a čtyři sloty poradců. Horní lišta ukazuje stabilitu, podporu války a politickou moc.
- **Panel Cíle** (`ui/nat/NatPanel.jsx`, M22): plněný cíl s postupem a přerušením, strom cílů země jako seznam podle řad (účinky, trvalé bonusy, vylučující cíle, chybějící předpoklady, tlačítko Zahájit). **Dialog události** (`EventDialog`): při čekající události hráče se hra pozastaví, dialog se nedá zavřít a klávesy se ignorují, dokud hráč nezvolí.
- **Panel Diplomacie** (`ui/dip/DiplomacyPanel.jsx`, M23): blok hráče (členové, opuštění, založení s názvem), podíl území drženého nepřáteli a seznam zemí seřazený podle války, spojenectví a vztahu; řádek se rozbalí s akcemi (ospravedlnit / vyhlásit válku, navrhnout mír, pozvat do bloku) a důvody zamčení. Karta oblasti nabízí totéž pro vlastníka provincie. Po kapitulaci se zobrazí oznámení.
- **Obrazovka výběru země** (M24): u tlačítka *Začít hru* volba obtížnosti AI zemí (Lehká / Běžná / Těžká) a přepínač *Historické plány*; hodnoty jsou v `uiStore` (`aiLevel`, `aiHist`) a `startGame` je předá `createGame`.
- **Uložené hry** (M25): `SaveDialog` (Uložit / Načíst, sloty, smazání, zpráva o výsledku) je v nabídce hry a v hlavním menu; klávesy F6 / F9 = rychlé uložení a načtení; automatické uložení jednou za herní měsíc. Hlavní menu zobrazuje `VERSION_LABEL` (`src/version.js`).
- **Zprávy a přehled** (M26): záložka *Zprávy* (`L`) a okno *Přehled zemí* (`O`, tlačítko v horní liště) – viz § 4i; nové důležité záznamy se hlásí oznámením.
- Panely, tooltip a seznamy se při běhu času nepřekreslují každou herní hodinu: používají `useGameSlow(selektor, ms)` (nejvýš jedno překreslení za `ms`).

**Pravidla UI:** selektory `useGame`/`useUi` vracejí stabilní hodnoty (primitiva nebo existující objekty); stav obrazovek je v `uiStore`, ne ve hře; plátno se překresluje jen při změně;
změny stavu, UI a kamery dělají společně funkce v `actions.js`.

**Klávesy:** tažení / WASD / šipky = posun; kolečko, Q/E, PageUp/PageDown = přiblížení; Home = celá mapa; mezerník = pauza; + − = rychlost; 1–8 = mapové režimy;
V = panel Armáda, N = Nábor, I = Průmysl, R = Výzkum, P = Politika, C = Cíle, X = zastavit vybrané divize, F = zaměřit výběr; F1 nebo ? = ovládání.
Esc zavírá postupně: nápověda → herní nabídka → návrhář šablon → úprava plánu → výběr jednotek → boční panel / označená oblast → (nic nezbývá) herní nabídka.

**Vzhled:** „mapový stůl“ – inkoustové plochy (`--ink-0…3`), mosazné linky (`--brass`), krémový papír (`--paper`) pro nadpisy; písma Jost (nadpisy) a Barlow Semi Condensed (text),
oboje přes `@fontsource` (OFL); panely se seříznutými rohy. Vlajky jsou vlastní jednoduché vrstvy (`data/countries.js`), bez státních znaků a bez symbolů extremistických režimů.

## 6. Odchylky od vzoru (záměrné zjednodušení)

- Mapa je vlastní, menší než světová: Evropa, Středomoří, severní Afrika, Blízký východ po 63,6° V; 2895 provincií místo desítek tisíc.
- Stát je jednotka vlastnictví (jako ve vzoru) s kategorií a sloty staveb podle obyvatel (M19); sloty jsou společné pro civilní a vojenské továrny, bez dalších budov.
- Mimo hrací plochu neexistují hráčské země (Asie, Amerika) – zůstávají „prázdnou pevninou“; jejich vliv bude zastoupen událostmi a obchodem.
- Pro každou větší funkci platí „hotová a zahrabaná“: radši menší a funkční než vše napůl.

## 7. Ověření

- `npm test` – **371 testů v 24 souborech**: svět (struktura, sousednosti, geometrie, regiony, slavná města), stav a příkazy, kamera/geometrie/barvy/popisky, dlaždice a vykreslovač (s falešným plátnem), akce rozhraní, formátování,
  `check-build.mjs` (oprava cest `src\main.jsx` a `src%2Fmain.jsx`, ochrana proti cestám mimo kořen a přepsání, chybějící soubor, velikost písmen, odkazy z `index.html`, čitelná zpráva) a **armáda** (`army-*.test.js`, pomůcky v `armyKit.js`):
  - `army-setup` (15): počáteční rozmístění všech zemí (platné odkazy, žádný velitel dvakrát, odpovídá `NATIONAL`, divize ve stavu zásobování, deterministické, čistý JSON), statistiky divize, kontrola šablon;
  - `army-commands` (30): šablony, nábor a zrušení výcviku, rozpuštění, rozkazy (doba pochodu), armády, skupiny, velitelé, plány (Linie fronty, Opatrně, Hájit oblast, ruční rozkaz, obranná AI), čistota příkazů;
  - `army-combat` (20): trvání a ztráty boje, převaha, ústup a zničení, obsazení, terén, řeka, zakopání, zkušenosti, tanky, zásobování, šířka fronty a záloha, směry útoku, determinismus a čistota (JSON, dělení kroků);
  - `army-war-supply` (16): války (symetrie, mír, AI plány), hledání cest (neutrální a nepřátelské území, průlivy), tok zásobování a jeho mezipaměť, denní krok batohu;
  - `army-system` (6): 45 dní velké války drží invarianty, je deterministická a nezávisí na dělení kroků, výcvik a doplňování za války, měsíční lidská síla;
  - `industry` (28): počáteční rozmístění továren a těžby (sloty, součty, deterministické), stavby (sloty, fronta, dokončení, infrastruktura), výroba (sklad, efektivita, linky, nedostatek surovin, ztráta továren), suroviny a obchod (přebytek, válka, okupace), vliv infrastruktury na zásobování, čistota a invarianty;
  - `industry-ui` (9): akce hráče (vlastnictví, sloty, fronta, linky, smlouvy, pozorovatel), režim mapy Průmysl a přebarvení vykreslovače;
  - `research` (23): data technologií (předpoklady, cykly, zámky jednotek), sloty, dostupnost a příkazy, průběh a předstih, rychlost, úrovně výzbroje ve statistikách, odemykání šablon a linek, bonusy průmyslu, AI zemí, čistota a determinismus;
  - `research-ui` (6): akce hráče (sloty, hlášky, pozorovatel), návrhář s odemčenými prapory, herní smyčka;
  - `politics` (16): data zákonů a poradců, počáteční hodnoty, denní krok (moc, přiblížení k cíli, válka, okupace), zákony (cena, podmínky, dopady na spotřební zboží, výrobu, lidskou sílu, dovoz), poradci, AI-lite, čistota a determinismus;
  - `politics-ui` (3): akce hráče (zákony, poradci, hlášky, pozorovatel);
  - `nat` (18): data stromů a událostí (odkazy, cykly, vylučování, účinky), příkazy cílů, plnění a trvalé bonusy, každý druh účinku, události hráče (fronta, pozastavení, volba) i AI, AI výběr cílů, čistota a determinismus;
  - `nat-ui` (4): akce hráče (výběr, přepnutí, přerušení cíle, rozhodnutí události);
  - `dip` (20): data bloků a vztahů, vztahy a bloky, ospravedlnění (cena, čas, platnost, omezení), vyhlášení s voláním do zbraně, bílý mír a válečné skóre, kapitulace a anexe (vlastnictví, jednotky, blok, spojenci dál válčí), bloky (založení, pozvání, odchod), přehled, zapomínání, čistota;
  - `dip-ui` (4): akce hráče (ospravedlnění, vyhlášení, mír, bloky, hlášky, pozorovatel);
  - `ai` (17): nastavení a vypnutá AI (výchozí v enginu), průmysl AI (fronta, linky, růst po roce), armáda AI (cílový počet, výcvik, armády, útočné plány), diplomacie AI (mír při vyčerpání a při vleklé válce, hráči mír nevnucuje, historické války a bloky), obtížnost, čistota, determinismus a nespotřebovávání `state.rng`;
  - `save` (9): obálka a kontrola stavu (verze, tvar, chybové hlášky), shodné pokračování po načtení, sloty v úložišti (falešný `localStorage`: uložení, výpis, smazání, plné / zakázané / vadné úložiště), akce rozhraní (uložení, načtení, rychlé sloty, chybové stavy);
  - `log` (9): deník (id, čas, kruhová paměť, verze a kontrola uložené hry), zápisy ze systémů (válka, mír, bloky, kapitulace vždy; technologie, cíle, stavby, události jen hráči), texty záznamů, přehled zemí;
  - `nav` (19): flotily (sestavení, rozpuštění, pohyb po mořích, blokády), loděnice a lodní linky, přeprava divizí (nalodění, plavba, vylodění), námořní boj a potopení, AI loďstvo;
  - `nav-ui` (9): akce hráče (výběr flotily, rozkazy, sestavení, rozpuštění, přeprava z rozhraní), žetony a trasy flotil;
  - `air` (11): počáteční letectvo, příkazy (rezerva, kapacita, mise, dolet, válka), denní krok (podpora boje, krytí hlídkami, bombardování, ztráta letiště), výroba a letiště, výzkum, AI;
  - `convoy` (6): trasy po souši a po moři, potřeba konvojů, nedostatek lodí, riziko a krytí, nájezdy, determinismus;
  - `puppet` (8): konference (hráč a AI), loutka, anexe zbytku i loutky, války pána a příspěvky, uložení;
  - `doctrine` (7): zkušenosti, cena a zámky, účinky, nezávislost větví, AI, uložení;
  - `decisions` (5): data, použití a obnova, podmínky, zkušenosti a jednorázovost, AI a uložení;
  - `end` (6): postavení, podmínky konce, porážka a loutka, potvrzení, uložení;
  - `sound` (2): zvuky bez Web Audio, s falešným Web Audio a vypnutí, pamatování volby;
  - `occupation` (5): vznik a vývoj okupace, garnizona, těžba podle poddajnosti, povstání, uložení;
  - `scenario` (5): základ 1936 beze změny, 1939 (válka, bloky, zaniklé země, státy, síla zemí), běh a uložení;
  - `tutorial` (3): kroky, odškrtávání a latch, splnění všech kroků;
  - `spy` (6): agenti a strop, operace a jejich hlídání, šance, vyhodnocení, AI a uložení;
  - `fort` (4): stavba a omezení, dokončení, účinek v boji, AI a uložení;
  - `weather` (5): zima a léto, bláto, vedro, nezáporné účinky, závislost na datu a provincii;
  - `army-ui` (42): souhrny a texty, návrhář šablon, žetony na mapě (slučování, pochod, shlukování, cesty, bitvy), akce výběru a rozkazů, plány, armády a skupiny, nábor a návrhář, selektory (`divisionCount`, `suggestFront`), režim Zásobování, okupace a vrstva jednotek ve vykreslovači (falešné plátno).
- `npm run build` – musí projít bez chyb, i na čisté kopii bez `node_modules`, při Node 22 i 24 a také v nasazení s poškozenými cestami (kopie, kde jsou všechny soubory ze složek v kořeni pod názvy `src\main.jsx` …).
  Hotový `dist/` (plochý) se ověřuje smoke testem z kořene i z podsložky.
- `tools/smoke.mjs` – prohlížečová kontrola (Playwright, `npm i -D playwright` a `npx playwright install chromium`): menu → výběr země → hra, klik na provincii, běh času, přepnutí režimů,
  zvýraznění pod myší (po posunu kamery a při tažení), měření snímku a **armáda**: žetony na mapě, bublina nad žetonem, výběr, pravé tlačítko (pochod), Nová armáda, panel Armáda (strom, klávesa V),
  vyhlášení války z karty oblasti, plán fronty (návrh, potvrzení), šest herních dnů, režim Zásobování (7), nábor, návrhář šablon, čas kreslení vrstvy žetonů, řetěz Esc, bez chyb v konzoli;
  **103 kontrol** (od M58 vyskakovací karta a tooltip upozornění; od M49 upozornění pod lištou nabídek; od M45 záložka Grafy v Přehledu zemí; od M43 mapový režim Počasí; od M42 stavba pevnosti na kartě provincie; od M41 okno Zpravodajství; od M40 průvodce; od M39 volba scénáře; od M37 kurzory a přepínač zvuku; od M36 dialog konce hry; od M35 okno Rozhodnutí; od M34 okno Důstojnický sbor; od M33 mírová konference po kapitulaci; od M32 letecké mise na mapě; od M30 okno Letectvo, zadání mise; od M29 lišta nabídek, Logistika, konzole, seznam mapových režimů; od M27 žetony flotil, panel Námořnictvo (M), sestavení flotily, Esc ruší výběr flotily; od M26 panel Zprávy, filtry a Přehled zemí; od M25 rychlé uložení F6, dialog uložení, načtení z hlavního menu; od M24 volba obtížnosti AI a bílý mír po zkoušce války; od M23 ospravedlnění a vyhlášení války z karty oblasti a panel Diplomacie; od M22 panel Cíle a dialog události; od M19 i panel Průmysl: stavba, linky, obchod, režim 8, tři herní dny; od M20 panel Výzkum: sloty, obory, 80 dní; od M21 panel Politika a horní lišta) při 1920 × 1080 i 1366 × 768; snímky ukládá do `tools/preview/smoke-*.png`.
- Výkon (`__e1936.map.renderer.stats`, headless Chromium bez GPU): CPU čas vrstvy žetonů ≈ 3–4 ms na snímek při ≈ 500 žetonech (399 viditelných po shlukování při přiblížení 1); každý žeton se kreslí vektorově,
  při výrazně větším počtu divizí (AI v M24) se vyplatí sprite mezipaměť žetonů. Při rychlosti 5 s otevřeným panelem Armáda běží smyčka na 60 snímků/s (medián 16,7 ms, 95. percentil ≈ 26 ms).
- Ruční kontrola vždy při 1920 × 1080 a 1366 × 768.

## 8. Plán milníků

| # | Obsah | Stav |
|---|---|---|
| **M17** | **Svět**: generátor, formát, engine (stav, čas, vlastnictví), mapa (dlaždice, popisky, režimy), menu, výběr země, HUD, minimapa | **hotovo** |
| **M18** | **Armáda**: divize a šablony, výzbroj, generálové, armády a skupiny armád, plány a rozkazy, zásobování, boj (šířka fronty, terén, organizace), minimální stav války a počáteční rozmístění všech zemí; rozhraní: žetony, výběr, panel Armáda, nábor, návrhář šablon, mapa zásobování | **hotovo** |
| **M19** | **Průmysl**: kategorie států a sloty, civilní/vojenské továrny, fronta staveb, výrobní linky, suroviny a obchod, spotřební zboží, infrastruktura; rozhraní: panel Průmysl, karta státu, mapový režim 8. Konvoje a námořní doprava zatím ne (obchod je abstraktní) | **hotovo** |
| **M20** | **Výzkum**: 39 technologií v pěti oborech, sloty, předstih před historickým rokem, úrovně výzbroje, odemykání jednotek a výzbroje, bonusy průmyslu a výzkumu, výzkum AI zemí; rozhraní: panel Výzkum | **hotovo** |
| **M21** | **Politika**: stabilita, podpora války, politická moc, zákony (ekonomika, odvod, obchod), poradci, dopady na průmysl, výzkum a lidskou sílu; rozhraní: panel Politika, horní lišta. Ideologie a strany přijdou s M22 | **hotovo** |
| **M22** | **Národní cíle a události**: stromy cílů (vlastní pro velmoci a vybrané země), okamžité účinky a trvalé bonusy, vylučující cíle, události s volbami a naplánovanými následky, AI zemí; rozhraní: panel Cíle, dialog události. Rozhodnutí a politické cesty (změna vlády) později | **hotovo** |
| **M23** | **Diplomacie**: vztahy, bloky s voláním do zbraně, ospravedlnění a vyhlášení války, bílý mír a válečné skóre, kapitulace s anexí; rozhraní: panel Diplomacie, karta oblasti. Loutkové státy, mírová konference a odboj později | **hotovo** |
| **M24** | **AI** zemí (stejné příkazy jako hráč): průmysl, výcvik a armády, útočné plány, mír, historické bloky a války, 3 obtížnosti; rozhraní: volba při startu | **hotovo** |
| **M25** | **Uložené hry**: obálka a kontrola stavu v enginu, sloty (5 ručních, automatický, rychlý) v `localStorage`, dialog, F6 / F9, automatické měsíční uložení | **hotovo** |
| **M26** | **Zprávy a přehled zemí**: deník dění ve stavu, panel Zprávy s filtry, oznámení důležitých událostí, okno Přehled zemí | **hotovo** |
| **M27** | **Námořnictvo a přeprava přes moře**: loděnice, lodě, flotily, námořní boj, přeprava divizí; rozhraní: panel Námořnictvo (M), žetony flotil | **hotovo** |
| **M28** | **Rozhraní ve stylu HOI4**: okna Průmysl (I), Nábor (N), Výzkum (R, strom po sloupcích), Politika (P), Cíle (C) a Diplomacie (D) jsou přes celou obrazovku (`common/Screen.jsx`, třída `prod-screen`; seznam `FULL` v `SidePanel.jsx`); návrhář divizí je velké okno; zbývá Armáda, Zprávy a Námořnictvo | **hotovo část** |
| **M29** | **Hlavní lišta nabídek a konzole**: lišta oken s klávesami Q W E R T Y U I (Vláda, Výzkum, Diplomacie, Obchod, Stavby, Výroba, Nábor, Logistika) + C V M L, okno Logistika, horní lišta s továrnami, transporty a napětím ve světě (`worldTension`), konzole cheatů (`~`, `engine/cheats.js`: `runCheat`) | **hotovo** |
| **M30** | **Letectvo**: letiště a křídla, letouny z výroby, mise (hlídky, podpora boje, bombardování), AI, okno Letectvo (A) | **hotovo** |
| **M31** | **Konvoje a obchodní válka**: námořní obchod potřebuje transportní lodě, nájezdy a eskorta, AI | **hotovo** |
| **M32** | **Letectvo na mapě**: čáry misí, kruhy hlídek, odznaky letišť | **hotovo** |
| **M33** | **Loutkové státy a mírová konference**: rozhodnutí o zbytku poraženého, loutky vedou války pána a platí příspěvky, anexe | **hotovo** |
| **M34** | **Doktríny**: zkušenosti tří větví, stromy po třech směrech a stupních, účinky na boj, letectvo a konvoje, AI, okno Důstojnický sbor | **hotovo** |
| **M35** | **Rozhodnutí**: akce za politickou moc s podmínkami a obnovou, národní rozhodnutí, AI, okno Rozhodnutí | **hotovo** |
| **M36** | **Konec hry**: vítězství, porážka, konec času s hodnocením, dialog | **hotovo** |
| **M37** | **Kurzory a zvuky**: vlastní kurzory (šipka, ruka, otevřená a sevřená dlaň, zaměřovač) kreslené v SVG, syntetizované zvuky rozhraní (Web Audio) s přepínačem v nabídce | **hotovo** |
| **M38** | **Okupace**: odboj a poddajnost okupovaných států, garnizona, povstání, mapové režimy Odboj a Poddajnost | **hotovo** |
| **M39** | **Scénáře**: druhý začátek hry „Září 1939“ (přesuny států, zaniklé země, silnější země, bloky a války), volba na obrazovce výběru země | **hotovo** |
| **M40** | **Průvodce**: karta s úkoly (10 kroků), odškrtávání podle činnosti hráče, vypnutí v nabídce | **hotovo** |
| **M41** | **Zpravodajství**: agenti, operace proti cizím zemím, protišpionáž, AI, okno Zpravodajská agentura | **hotovo** |
| **M42** | **Pevnosti**: provinční stavba s bonusem k obraně, AI na frontě, karta provincie | **hotovo** |
| **M43** | **Počasí a roční období**: mráz, bláto a vedro podle podnebí a měsíce, účinky na boj, pohyb a organizaci, mapový režim Počasí | **hotovo** |
| **M44** | **Historické události**: 23 příběhových událostí velmocí a obecných (datový balík) | **hotovo** |
| **M45** | **Statistiky a grafy**: měsíční snímky zemí, záložka Grafy v Přehledu zemí | **hotovo** |
| **M46** | **Železniční pohyb**: rychlejší a méně vyčerpávající přesuny po železnici ve vlastním území | **hotovo** |
| **M47** | **Půjčka a pronájem**: posílání výzbroje spojencům a loutkám, AI to dělá také | **hotovo** |
| **M48** | **Záruky nezávislosti**: zaručitel se přidá do války za napadenou zemi, historické záruky AI na jaře 1939 | **hotovo** |
| **M49** | **Upozornění**: zahálející sloty, továrny a politická moc jako ikony pod lištou nabídek | **hotovo** |
| **M50** | **Radar**: nová stavba, obrana státu proti nepřátelskému letectvu, AI radary staví | **hotovo** |
| **M51** | **Sdílení technologií**: bonus rychlosti výzkumu za členy bloku, kteří techniku mají | **hotovo** |
| **M52** | **Letečtí esa**: piloti se v bojích vyznamenají a zesilují hlídky křídla | **hotovo** |
| **M53** | **Velitelská moc**: moc se hromadí a za ni armády dostanou dočasné bonusy, AI je používá | **hotovo** |
| **M54** | **Dovednosti velitelů**: pátá dovednost velitelů zrychluje pochod a obnovu organizace | **hotovo** |
| **M55** | **Autonomie loutek**: úrovně autonomie loutek určují příspěvky pánovi, nespokojená loutka se osamostatní | **hotovo** |
| **M56** | **Válečné cíle**: tři válečné cíle s různou cenou a výsledkem mírové konference | **hotovo** |
| **M57** | **Národní cíle všech zemí**: vlastní stromy cílů pro všech 35 zemí, rozšíření velmocí o letectvo, námořnictvo a zpravodajství | **hotovo** |
| **M58** | **Oznámení a vyskakovací okna**: upozornění jako ikony s tooltipem a vyskakovací karty (cíl splněn, výzkum, stavba, válka) | **hotovo** |
| **M59** | **Ovládání ve stylu HOI4**: fronta rozkazů, skupiny jednotek, posun středním tlačítkem a okrajem obrazovky | **hotovo** |
| později | špionáž, vyvolání zákonů, loutkové státy a mírová konference, scénáře | |

Každý milník končí hratelnou verzí se zelenými testy, čistým buildem, kontrolou v prohlížeči (1920 × 1080 a 1366 × 768) a aktualizovanou dokumentací.
