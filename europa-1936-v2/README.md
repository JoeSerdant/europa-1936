# Evropa 1936 – 2. generace

Velká strategie ve stylu **Hearts of Iron IV**, odehrávající se v lednu 1936 na mapě Evropy, Středomoří, severní Afriky a Blízkého východu.
Nová hra od základů: vlastní kód, vlastní mapa (generovaná z veřejných geodat Natural Earth), vlastní texty a grafika.

**Stav: milník M42 – Pevnosti.** Hotové je: mapa (2895 provincií, 393 moří, 527 států, 35 zemí), čas a vlastnictví, hlavní menu, výběr země, horní lišta, mapové režimy (včetně zásobování),
minimapa a panel s údaji o oblasti (M17) a **pozemní armáda**: divize ze šablon (vlastní návrhář), výzbroj a lidská síla, výcvik, velitelé, armády a skupiny armád, plány (Hájit oblast, Linie fronty),
rozkazy, zásobování, boj s šířkou fronty, terénem a organizací a počáteční rozmístění všech zemí. Války se zatím vyhlašují z karty oblasti (dočasně).
A od M19 **průmysl**: státy se sloty podle velikosti, civilní a vojenské továrny, fronta staveb, výrobní linky výzbroje s efektivitou, suroviny (ocel, hliník, ropa, wolfram, chrom, guma), obchodní smlouvy, spotřební zboží a vylepšování infrastruktury (zlepšuje pochod i zásobování). Výroba plní sklady výzbroje, ze kterých se nabírají divize.
A od M20 **výzkum**: 39 technologií v pěti oborech, sloty, předstih před historickým rokem, úrovně výzbroje (silnější divize za dražší výrobu), odemykání jednotek (mechanizovaná pěchota, střední a těžké tanky, spojovací a logistické roty, nemocnice) a bonusy průmyslu.
Rozhodnutí a diplomacie přicházejí v dalších milnících (viz `SPEC.md`, § 8).

## Spuštění

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 473 testů
npm run build      # kontrola vstupů (check-build.mjs) + produkční build do dist/
```

`src/data/world.json` je hotový svět. Přegenerovat ho (≈ 20 s) jde příkazy `npm run world:fetch` (jednou, stáhne geodata) a `npm run world`.

## Nasazení na web

Hra je statický web, žádný server k ní není potřeba. Dvě cesty:

1. **Sestavit na serveru (Vercel, Netlify, …)** – nahraj **celý projekt včetně složky `src/` a souboru `index.html`**. `vercel.json` je připravený (Vite, `npm run build`, výstup `dist`).
   Build nejdřív spustí `check-build.mjs` (v kořeni, ne v `tools/`, aby se na server dostal vždy): opraví soubory s poškozenou cestou – některé nahrávací nástroje z Windows uloží
   `src/main.jsx` jako soubor `src\main.jsx` v kořeni – a ověří, že jsou všechny potřebné soubory. Chybí-li něco, log vypíše, co v adresáři skutečně je (`npm run check:inputs` totéž udělá lokálně).
2. **Nahrát hotový web** – `npm run build` vytvoří **plochou** složku `dist/` (žádné podsložky, relativní cesty), takže běží v kořeni domény i v podsložce a přežije i poškozené vnořené cesty.
   Její obsah nahraj na libovolný statický hosting (Vercel: `npx vercel --prod` uvnitř složky `dist`; Netlify Drop; GitHub Pages). Server pak nic nesestavuje.

Hláška `Failed to resolve /src/main.jsx from …/index.html` znamená, že v nasazení chybí `src/main.jsx` (nebo celá složka `src`) – u Vercelu to ukáže záložka **Source** u nasazení.
Nejspolehlivěji se nahrává oficiálním nástrojem (`npx vercel --prod`), který cesty převádí správně.

**Balíček `.zip` vždy nejdřív rozbal** (ve Windows pravé tlačítko → *Extrahovat vše*) a nahrávej soubory z rozbalené složky. Ze zipu otevřeného v Průzkumníku se soubory nemusí nahrát celé
(chybí pak podsložky `src/` nebo `tools/`) a Vercel hlásí `Failed to resolve /src/main.jsx …` nebo `Cannot find module …`. Nahrávat se má **obsah složky projektu** (kde leží `package.json` a `index.html`),
nebo – nejjednodušeji – obsah hotové složky `web/` z balíčku s příponou `-web.zip` (jen soubory vedle sebe, žádný build na serveru).

## Ovládání

| akce | klávesa |
|---|---|
| posun mapy | tažení myší, W A S D, šipky |
| přiblížení | kolečko myši, Q / E, PageDown / PageUp |
| celá mapa | Home |
| označit provincii nebo moře | klik |
| pauza, rychlost | mezerník, + a − |
| mapové režimy | 1–8 (politická, terén, státy, regiony, obyvatelé, vítězné body, zásobování, průmysl) |
| panel Armáda, Nábor, Průmysl, Výzkum, Politika, Cíle, Diplomacie | V, N, I, R, P, C, D |
| vybrat jednotky | klik na žeton (Shift přidává, dvojklik = celá armáda), Shift + tažení = obdélník |
| rozkaz | pravé tlačítko na mapě (nepřátelská provincie = útok), X = zastavit, F = zaměřit výběr |
| rychlé uložení / načtení | F6 / F9 |
| panel Zprávy, přehled zemí | L, O |
| panel Námořnictvo | M |
| okno Letectvo | A |
| okna Vláda, Výzkum, Diplomacie, Obchod, Stavby, Výroba, Nábor, Logistika | Q, W, E, R, T, Y, U, I |
| konzole s cheaty (`help`) | ~ nebo F2 |
| zavřít okno, zrušit výběr, nabídka | Esc |
| nápověda | F1 nebo ? |

### Jak na armádu

1. Klikni na vlastní žeton, pravým tlačítkem pošli divizi do sousední provincie. V dolní liště je jejich síla, organizace a zásobování.
2. **Nová armáda** v dolní liště vytvoří armádu z vybraných divizí; v panelu **Armáda** (V) ji přejmenuješ (dvojklik), jmenuješ velitele a zadáš plán.
3. **Hájit oblast** rozmístí divize po zvolených provinciích; **Linie fronty** drží linii a útočí na cílové provincie (režim Opatrně / Vyváženě / Zteče). *Použít aktuální frontu* označí provincie za tebe.
4. V panelu **Nábor** (N) zařadíš divize do výcviku (stojí lidskou sílu a výzbroj) nebo si v **Návrháři šablon** sestavíš vlastní divizi z praporů a podpůrných rot.
5. Válku vyhlásíš na kartě cizí provincie (záložka Oblast). Mapový režim **Zásobování** (7) ukáže, kam dorazí zásoby; divize bez zásob slábnou.

### Jak na průmysl

1. Panel **Průmysl** (I) ukazuje civilní a vojenské továrny, podíl spotřebního zboží a **body stavby** za den (civilní továrny po odečtení spotřebního zboží a dovozu).
2. Záložka **Stavby**: vyber stát (ve státě je tolik slotů, kolik dává jeho kategorie + infrastruktura), zadej civilní nebo vojenskou továrnu či vylepšení infrastruktury. Stavět lze i na kartě státu (záložka Oblast). Fronta se řadí od nejdůležitějšího.
3. Záložka **Výroba**: vojenské továrny jsou rozdělené do **linek** podle druhu výzbroje. Nová linka začíná s nízkou efektivitou a roste ke stropu; změna druhu výzbroje ji vynuluje. Hotové kusy jdou do skladu (vidět i v záložce Nábor).
4. Záložka **Obchod**: tabulka surovin (těžba, dovoz, vývoz, potřeba, krytí) a smlouvy. Chybí-li surovina, linky vyrábějí pomaleji (nejméně 25 %). Dovoz stojí civilní továrny, vývozce dodá jen svůj přebytek a ve válce se smlouva přeruší.
5. Mapový režim **Průmysl** (8) ukáže počet továren ve státech.

### Jak na výzkum

1. Panel **Výzkum** (R) má 2–5 slotů (podle velikosti země a laboratoří). Technologii zadáš tlačítkem *Zkoumat*; rozpracovaný postup se při přerušení zachová.
2. Technologie mají **historický rok**: výzkum o roky předem je výrazně pomalejší. Zkoumání potřebuje hotové předpoklady (zamčené karty ukazují, co chybí).
3. Technologie výzbroje zvedají **úroveň** (silnější útok a obrana všech divizí téhož druhu, ale kus výzbroje se vyrábí dráž). Další odemykají jednotky pro návrhář šablon a nové linky výroby; průmyslové dávají strop efektivity, body stavby, těžbu, rychlost výzkumu a sloty.
4. Země bez hráče si technologie vybírají samy podle dějin.

### Jak na politiku

1. Panel **Politika** (P): **stabilita** zvedá nebo snižuje výstup továren a staveb, **podpora války** odemyká přísnější zákony a ovlivňuje příliv lidské síly. Oboje se pomalu blíží k cíli (zákony, poradci, válka, okupace).
2. **Politická moc** (PM) roste o 2 za den. Platí se jí zákony (ekonomika, odvod, obchod) a poradci ve čtyřech slotech.
3. Válečná ekonomika a odvod dávají víc zbraní a rekrutů, ale stojí spotřební zboží, stabilitu a podporu války; volný obchod zlevňuje dovoz, uzavřené hospodářství zvedá domácí těžbu.

### Jak na národní cíle a události

1. Panel **Cíle** (C): každá země má strom cílů (obecný, velmoci a vybrané země vlastní). Plní se jeden cíl, nejčastěji 35–45 dní; dá okamžitou odměnu (továrny, infrastruktura, technologie, politická moc, zákony …) a někdy trvalý bonus. Některé cíle se vylučují.
2. **Události** přicházejí podle situace (válka, stabilita, zákony, datum) a náhody. Hra se při nich pozastaví a musíš zvolit řešení; každá volba má jiné následky.
3. Země bez hráče si cíle i volby v událostech vybírají samy.

### Jak na diplomacii

1. Panel **Diplomacie** (D): seznam zemí se vztahem. **Válku nejdřív ospravedlni** (25 PM, 30 dní), pak ji vyhlásíš; zapojí se členové bloků obou stran.
2. **Bílý mír** protivník přijme, když nevyhrává. Země kapituluje, když nepřátelé drží většinu jejích bodů (nebo její hlavní město a třetinu bodů); okupované státy připadnou okupantům.
3. **Blok** můžeš založit (50 PM) a zvát do něj země s dobrými vztahy.

### Jak hraje AI

1. Při výběru země zvol **obtížnost AI** (Lehká −10 %, Běžná, Těžká +10 % výroby, staveb a výzkumu) a zda mají mít **historické plány**.
2. AI země staví továrny, vyrábějí zbraně, cvičí divize, zakládají armády a ve válce útočí, je-li poměr sil příznivý. Hráči nevnucují mír.
3. S historickými plány vzniknou bloky (např. Osa) a války kolem Československa, Polska, Albánie nebo Finska v době, kdy by to odpovídalo dějinám – ale jen když jsou podmínky splněny; svět nemá napsaný průběh.

### Uložené hry

Nabídka (Esc) → **Uložit hru** / **Načíst hru**, nebo **Načíst hru** v hlavním menu. K dispozici je pět ručních slotů, **rychlé uložení** (F6, načtení F9) a **automatické uložení** jednou za herní měsíc. Uložené hry žijí v úložišti prohlížeče (`localStorage`) a platí jen pro stejnou verzi hry.

### Jak na letectvo

Okno **Letectvo** (A): letadla z výroby (linky v okně Výroba, Y) padají do rezervy; z rezervy sestavíte křídla na letištích (letiště stavíte v okně Stavby, T). Křídlu zadáte misi: **Hlídky** (stíhači kryjí stát a sestřelují nepřátelská letadla), **Podpora boje** (bonus k útoku vašich divizí ve zvoleném státě, nejlépe pod krytím hlídek) nebo **Bombardování** (válečný protivník ztrácí podporu války a zásoby). Mise se vyhodnocují o půlnoci.

### Pevnosti

Na kartě vlastní provincie můžete postavit **pevnost** (až 5 úrovní, 350 bodů stavby): obránce v ní má o 12 % za úroveň lepší obranu. AI je staví ve válce na frontě.

### Zpravodajství

Okno **Zpravodajská agentura** (G): agenti provádějí operace proti cizím zemím – průzkum (zvyšuje šanci dalších operací), sabotáž skladů, krádež technologie a podněcování nepokojů. Neúspěch může agenta prozradit a zhoršit vztah; cizí agenti vaši šanci snižují.

### Průvodce

V nové hře se dole ukazuje karta **Průvodce** s deseti úkoly (čas, výběr oblasti, stavby, výroba, výzkum, cíle, nábor, rozkazy, diplomacie, doktríny); odškrtávají se podle toho, co děláte. Vypnete ho křížkem nebo v nabídce (Esc).

### Scénáře

Na obrazovce výběru země zvolíte **Leden 1936** (klidný začátek) nebo **Září 1939** (válka už začala: Německo útočí na Polsko, Británie a Francie ho podporují; Rakousko, Československo a Albánie zanikly, země mají víc továren, divizí a technologií).

### Okupace

Okupované státy mají **odboj** a **poddajnost** (mapové režimy 9 a 0). Poddajnost se zvyšuje časem a **garnizonou** (divize v okupovaném státě, potřeba ≈ 1 divize na 400 tisíc obyvatel); odboj trápí garnizonu a při vysoké hodnotě a slabé garnizoně vyvolá povstání. Okupant dostane těžbu státu jen podle poddajnosti.

### Kurzory a zvuky

Hra má vlastní kurzory (šipka, ruka na tlačítkách, dlaň při posunu mapy, zaměřovač na minimapě) a krátké syntetizované zvuky (kliknutí, oznámení, událost, válka, konec hry). Zvuk vypnete v nabídce (Esc).

### Cíl hry a konec

**Vítězství:** váš blok (členové a loutky) ovládá polovinu světa podle vítězných bodů. **Porážka:** vaše země kapitulovala. **Konec času:** 1. 1. 1946, s hodnocením (podíl světa, pořadí, skóre). Po konci můžete hrát dál.

### Rozhodnutí

Okno **Rozhodnutí** (J): jednorázové akce za politickou moc (průmyslová kampaň, mimořádný odvod, propaganda, manévry, národní programy zemí). Každé má podmínky (válka / mír, stabilita, ideologie) a obnovovací dobu.

### Doktríny

Okno **Důstojnický sbor** (K): armáda, letectvo a námořnictvo sbírají zkušenosti (rychleji v boji a na misích). Za ně přijímáte doktríny: v každé větvi zvolíte jeden ze tří směrů (první stupeň ho určí) a postupně berete tři stupně. Doktríny zvyšují útok a obranu divizí, sílu hlídek, podporu boje a bombardování, palebnou sílu flotil a nájezdy nebo krytí konvojů.

### Loutky a mírová konference

Když kapitulují vaši protivníci, otevře se **mírová konference**: zbylé státy poražené země můžete anektovat, nebo je nechat jako **loutkový stát**. Loutka vede vaše války, denně vám dává lidskou sílu a politickou moc a v Diplomacii ji lze za politickou moc anektovat.

### Konvoje a obchodní válka

Smlouvy se zeměmi na jiné pevnině jedou po moři a zabírají vaše transportní lodě (okno Obchod ukazuje počet konvojů a riziko). Chybí-li lodě, dodávky se zmenší. Nepřátelské lodě na trase (nejlépe ponorky) konvoje ruší a potápějí; vlastní válečné lodě v téže oblasti je kryjí. Pošlete flotilu na trasu protivníkova dovozu a zlomíte mu zásobování.

### Jak na námořnictvo

Okno **Průmysl** (I) je přes celou obrazovku: Výroba (linky, dlaždice výzbroje), Stavby (státy, fronta), Obchod.

Panel **Námořnictvo** (M): sestav flotilu z lodí v zásobě (torpédoborce, křižníky, bitevní lodě, ponorky), pošli ji pravým tlačítkem na mořskou oblast. Lodě se vyrábějí v panelu Průmysl na lodních linkách a potřebují **loděnice**. Divizi přepravíš tak, že ji vybereš a pravým tlačítkem klikneš na pobřežní provincii za mořem; každá zabere jednu transportní loď. Flotily se na moři střetávají s nepřítelem a poškozené lodě se stahují.

### Zprávy a přehled

Panel **Zprávy** (L) ukazuje války, mír, kapitulace, bloky a tvoje dokončené stavby, výzkumy, cíle a události; filtr *Moje* / *Světové*. Důležité zprávy se ohlásí i oznámením dole. **Přehled zemí** (O nebo ikona v horní liště) seřadí všechny země podle vítězných bodů se silami a stavem; klik ukáže hlavní město.

## Dokumentace

- `SPEC.md` – architektura, formát světa, pravidla enginu a rozhraní, plán milníků
- `CLAUDE.md` – pravidla pro další práci

## Licence dat a písem

Hranice a města vycházejí z veřejných dat **Natural Earth** (public domain). Písma Jost a Barlow Semi Condensed jsou pod licencí SIL OFL (balíčky `@fontsource`).
Z Hearts of Iron IV se nepoužívá žádná mapa, text ani data; jeho soubory posloužily jen jako technická dokumentace mechanik.
