# Evropa 1936 – 2. generace

Velká strategie ve stylu **Hearts of Iron IV**, odehrávající se v lednu 1936 na mapě Evropy, Středomoří, severní Afriky a Blízkého východu.
Nová hra od základů: vlastní kód, vlastní mapa (generovaná z veřejných geodat Natural Earth), vlastní texty a grafika.

**Stav: milník M18 – Armáda.** Hotové je: mapa (2895 provincií, 393 moří, 527 států, 35 zemí), čas a vlastnictví, hlavní menu, výběr země, horní lišta, mapové režimy (včetně zásobování),
minimapa a panel s údaji o oblasti (M17) a **pozemní armáda**: divize ze šablon (vlastní návrhář), výzbroj a lidská síla, výcvik, velitelé, armády a skupiny armád, plány (Hájit oblast, Linie fronty),
rozkazy, zásobování, boj s šířkou fronty, terénem a organizací a počáteční rozmístění všech zemí. Války se zatím vyhlašují z karty oblasti (dočasně).
Průmysl, výzkum, politika, focusy a diplomacie přicházejí v dalších milnících (viz `SPEC.md`, § 8).

## Spuštění

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 205 testů
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
| mapové režimy | 1–7 (politická, terén, státy, regiony, obyvatelé, vítězné body, zásobování) |
| panel Armáda, Nábor | V, N |
| vybrat jednotky | klik na žeton (Shift přidává, dvojklik = celá armáda), Shift + tažení = obdélník |
| rozkaz | pravé tlačítko na mapě (nepřátelská provincie = útok), X = zastavit, F = zaměřit výběr |
| zavřít okno, zrušit výběr, nabídka | Esc |
| nápověda | F1 nebo ? |

### Jak na armádu

1. Klikni na vlastní žeton, pravým tlačítkem pošli divizi do sousední provincie. V dolní liště je jejich síla, organizace a zásobování.
2. **Nová armáda** v dolní liště vytvoří armádu z vybraných divizí; v panelu **Armáda** (V) ji přejmenuješ (dvojklik), jmenuješ velitele a zadáš plán.
3. **Hájit oblast** rozmístí divize po zvolených provinciích; **Linie fronty** drží linii a útočí na cílové provincie (režim Opatrně / Vyváženě / Zteče). *Použít aktuální frontu* označí provincie za tebe.
4. V panelu **Nábor** (N) zařadíš divize do výcviku (stojí lidskou sílu a výzbroj) nebo si v **Návrháři šablon** sestavíš vlastní divizi z praporů a podpůrných rot.
5. Válku vyhlásíš na kartě cizí provincie (záložka Oblast). Mapový režim **Zásobování** (7) ukáže, kam dorazí zásoby; divize bez zásob slábnou.

## Dokumentace

- `SPEC.md` – architektura, formát světa, pravidla enginu a rozhraní, plán milníků
- `CLAUDE.md` – pravidla pro další práci

## Licence dat a písem

Hranice a města vycházejí z veřejných dat **Natural Earth** (public domain). Písma Jost a Barlow Semi Condensed jsou pod licencí SIL OFL (balíčky `@fontsource`).
Z Hearts of Iron IV se nepoužívá žádná mapa, text ani data; jeho soubory posloužily jen jako technická dokumentace mechanik.
