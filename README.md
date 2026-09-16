# Ramazansko odbrojavanje — za Tech Towers

Odbrojavanje do 1. ramazana: živi prikaz dana, sati, minuta i sekundi, svijetla
i tamna tema, te stvarna statična rezerva za posjetioce bez JavaScripta.

Sve je prilagođeno Bosni i Hercegovini i Evropi: vrijeme je uvijek
**bosansko (Europe/Sarajevo)** — stranica ne pita posjetioca za zonu i ne
prilagođava se njegovom satu. Datum se računa po **Takvimu Rijaseta Islamske
zajednice u BiH**, a poziv na akciju vodi na **vaktija.ba**.

Dvije ravnopravne verzije iste komponente:

| Datoteka | Kada je koristiti |
| --- | --- |
| `ramazan-odbrojavanje.html` | Bilo koja stranica — kopirajte označeni blok, bez build koraka. Ujedno i samostalni pregled. |
| `RamazanskoOdbrojavanje.tsx` | Vaša ShadCN/React aplikacija. |

`ramazan-odbrojavanje.css` je zajednički listić stilova za obje verzije.
**Dizajn nije mijenjan pri prevođenju** — 183 deklaracije i 52 selektora su
identični s engleskom verzijom; mijenjao se samo tekst.

---

## Brzi početak

### HTML

Iz `ramazan-odbrojavanje.html` kopirajte tri označena bloka: `<style>`
komponente, `<section id="ramadan-countdown">` i dvije `<script>` cjeline
(jednoredna boot skripta odmah iza sekcije, zatim skripta komponente).

U datoteci su još samo dvije pomoćne stvari, obje jasno komentarisane i obje se
brišu u projektu: Tailwind CDN (jedan red) i blok stilova razine stranice koji
samo centrira karticu kad datoteku otvorite samostalno. Komponenta sama ne
sadrži nikakav okvir stranice.

Tailwind mora biti prisutan. Drugo ništa.

### React

```tsx
import { RamazanskoOdbrojavanje } from '@/components/ramazansko-odbrojavanje/RamazanskoOdbrojavanje';

export default function RamazanskaStranica() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <RamazanskoOdbrojavanje
        staticDays={144}                       // vidi "Rezerva bez JS-a"
        timetableHref="/ramazan/vaktija"
      />
    </div>
  );
}
```

Dodajte `ramazan-odbrojavanje.css` u svoj globalni listić stilova ili zadržite
`import './ramazan-odbrojavanje.css'` u komponenti — radi oboje.

---

## Datumi — pročitajte prije puštanja u rad

**Bosna ne prati osmatranje mjeseca u Zaljevu.** Takvim Rijaseta Islamske
zajednice u BiH računa se unaprijed, a proračun je usaglašen s turskim
Diyanetom (Diyanet İşleri Başkanlığı). Zato se datum u BiH zna razlikovati od
datuma u arapskim zemljama **za jedan dan**:

| Godina | Bosna i Hercegovina | Saudijska Arabija |
| --- | --- | --- |
| 1447 / 2026 | **četvrtak, 19. februar 2026.** | srijeda, 18. februar 2026. |

Ugrađeni datumi su **prvi dan posta**:

- **Provjereno:** 1446 → prvi dan posta 1. 3. 2025. · 1447 → prvi dan posta
  19. 2. 2026. (akšam 18. 2. u 17:45)
- **Procijena:** 1448 → prvi dan posta 8. 2. 2027. (akšam 7. 2. u 17:12) i
  1449–1453 — provjerite u Takvimu Rijaseta prije oslanjanja.

Za produkciju je najbolje hraniti `unosi` / `anchors` iz vlastitog izvora —
Takvim Rijaseta ili Umm al-Qura tabela — i držati listu najmanje godinu ispred
današnjeg datuma. U tekstu na stranici već stoji da je mjesec određen Takvimom,
pa se korisniku ne nudi procjena kao činjenica.

Napomena: mjesec ramazan u BiH **nastupa akšamskim ezanom** uoči prvog dana
posta. Odbrojavanje cilja ponoć prvog dana posta; ako želite da cilja akšam,
postavite `startHour`/`startMinute`, ali imajte u vidu da se akšam razlikuje od
grada do grada.

---

## Podešavanja

| Opcija / prop | Podrazumijevano | Napomena |
| --- | --- | --- |
| `unosi` / `anchors` | `RAMAZANSKI_UNOSI` | Gregorijanski datumi prvog dana posta. Cilj je prvi **budući** unos; raniji unosi postoje da traka napretka navede stvaran datum. |
| `referenceZone` | `Europe/Sarajevo` | Zona u kojoj su navedeni datumi. Fiksna je namjerno. |
| `theme` | `auto` | `auto` prati `prefers-color-scheme`. Proslijedite razriješenu temu svoje aplikacije da prati aplikaciju. |
| `accent` | `ink` | `ink` = ponoćno plava i mjed. `crimson` = grimiz i zlato. |
| `staticDays` | – | Broj dana za rezervu bez JS-a. |
| `vaktijaGrad` | `sarajevo` | Grad čija se vaktija otvara; ulazi u adresu. |
| `vaktijaHref` | `https://vaktija.ba/{grad}` | Odredište glavnog dugmeta. |
| `learnMoreHref` | `https://vaktija.ba/{grad}` | Odredište sporednog linka. |

U HTML verziji iste opcije su u objektu `CONFIG` na vrhu skripte komponente, a
tema i akcent su atributi `data-rc-theme` i `data-rc-accent` na sekciji.

---

## Favicon

U mapi `favicon/`:

| Datoteka | Za šta |
| --- | --- |
| `favicon.svg` | Glavna ikona — oštra na svakoj gustini ekrana |
| `favicon.ico` | Rezerva za starije preglednike (16, 32 i 48 px u jednom fajlu) |
| `favicon-16/32/48/192.png` | PNG varijante |
| `apple-touch-icon.png` | 180×180 za iOS početni ekran |
| `site.webmanifest` | Web aplikacija (PWA) |

U `<head>` ide ovo (putanje su relativne, pa rade i iz podmape):

```html
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png">
<link rel="manifest" href="/favicon/site.webmanifest">
```

### Zašto ovakav znak

Ikona nije novi motiv, nego **umanjena komponenta**: tamnoplava kartica
(`--rc-surface` iz tamne teme, `#101728`), mjedena traka s lijeve ivice
(`--rc-accent`, `#d3af5e`) i mreža 2×2 polja iz `.rc-grid`, gdje je prvo polje
(dani) mjedeno — kao što su u komponenti dani naglašeni.

Tako se favicon i stranica čitaju kao ista stvar, bez novog motiva. Boje su
preuzete iz CSS tokena, pa ako promijenite paletu, promijenite i `favicon.svg`.

**Ne koristi znak vaktija.ba.** Njihova ikona je bijela podloga s džamijom
(kupola i dva minareta) u toploj smeđoj. Preuzimanje tuđeg znaka nije samo
pravno upitno — nego i zbunjuje, jer favicon stoji uz vaš brend, a ne uz
njihov. Zato je nacrtan vlastiti znak u bojama komponente.

**Provjereno:** SVG je valjan XML i koristi tačno `#101728` i `#d3af5e` iz
tokena; ICO sadrži 16/32/48; Chromium učitava manifest **bez grešaka**; sve
datoteke se služe s ispravnim MIME tipovima (`image/svg+xml`,
`image/vnd.microsoft.icon`, `application/manifest+json`); na 16 px mreža je
još čitljiva. Snimka svih veličina: `.verify/favicon-sizes.png`.

> Napomena: SVG u XML komentaru **ne smije** sadržavati dvostruku crticu.
> Prva verzija je pukla na `--rc-surface` u komentaru; komentari su zato bez
> imena tokena.

---

## Odbrojavanje ide do akšama, ne do ponoći

Mjesec ramazan **ne počinje u ponoć** — počinje akšamskim ezanom uoči prvog
dana posta. Zato odbrojavanje cilja taj trenutak.

Potvrđeno u Takvimu Rijaseta IZ BiH za 1447:

```
Sr 18.02.    Uoči ramazana (prva teravija)
Če 19.02.    PRVI DAN RAMAZANA – početak posta
```

Dakle akšam **18. februara 2026. u 17:45**, a prvi dan posta je 19. februar.

Za 1448 je ciljni trenutak:

| | |
| --- | --- |
| Akšam | **nedjelja, 7. februar 2027. u 17:12** (CET, GMT+1) |
| Prvi dan posta | ponedjeljak, 8. februar 2027. |

### Kako je izveden taj akšam

Takvim za 2027. još ne postoji, pa je vrijeme izvedeno iz Takvimove vlastite
metode i provjereno na dva načina:

1. **Metoda.** U Takvimu je u februaru kolona *Akšam* jednaka zalasku sunca
   (7.2.2026: izlazak 06:51, akšam 17:11; 18.2.2026: izlazak 06:36, akšam
   17:45). Zalazak se od 7. do 18. februara pomjera +34 min, tj. ~3,1 min/dan.
2. **Pomak između godina.** 7.2.2026. i 7.2.2027. su obje nedjelje, a između
   dvije proste godine zalazak za isti datum se pomjeri samo ~1 min. Od
   Takvimovih 17:11 za 7.2.2026. to daje **17:12** za 7.2.2027.

Oba puta se slažu na 17:12 ± 3 min. **Prije puštanja u rad provjerite novi
Takvim** i upišite tačno vrijeme u `aksam` — to je jedina vrijednost koju
trebate potvrditi.

> Napomena: vlastiti astronomski proračun sam probao i **odbacio** — davao je
> zalazak ~33 minuta ranije od Takvima (17:07 umjesto 17:45 za 18.2.2026.), pa
> se ne koristi. U kodu su samo Takvimovi podaci.

### Vrijeme je vezano za Sarajevo

Sva vremena su za Sarajevo. U drugim gradovima BiH akšam se razlikuje do
~10 minuta — Bihać ima kasniji, a Goražde raniji akšam. Ako vam treba drugi
grad, u `aksam` upišite njegovo vrijeme iz Takvima za taj grad.

### Polja u kodu

```js
{ hijri: 1448, y: 2027, m: 2, d: 7, aksam: [17, 12] }
//                                  ^^^^^  sati, minute — dan je dan AKŠAMA
```

**Pazite na vodeće nule.** `[16, 05]` je u strogoj JavaScript izvedbi
nedozvoljen oktalni literal i ruši cijelu skriptu — pišite `[16, 5]`. (Ovu
grešku sam napravio i uhvatio je test.)

---

## Vaktija i poziv na akciju

Oba linka vode na **vaktija.ba**, u novom tabu (`target="_blank"` +
`rel="noopener noreferrer"`). Adresa ima oblik:

```
https://vaktija.ba/{grad}
```

Tačan oblik je provjeren u pregledniku: `vaktija.ba/sarajevo`, `/banja-luka`,
`/tuzla`, `/mostar` — svi otvaraju vaktiju za taj grad, a `/` prikazuje
Sarajevo.

**Pazite na dvije stvari:**

- Putanja je `/{grad}`, **ne** `/vaktija/{grad}`. Ta druga vraća stranicu s
  kodom 200, ali je u stvari Sarajevo — tiha greška koju je lako previdjeti.
- Nepoznat grad se **ne prijavljuje kao greška**: `/nepostojeci-grad` tiho
  prikaže Sarajevo. Zato `vaktijaGrad` provjerite pri integraciji; ako želite
  grad iz konteksta stranice, proslijedite ga iz svog rutera:

```tsx
<RamazanskoOdbrojavanje vaktijaGrad="tuzla" />
```

Tekst dugmeta je trenutno **„Vaktija za Sarajevo“**. Ako proslijedite drugi
grad, promijenite i tekst (u HTML verziji to je oznaka `.rc-cta`).

---

## Teme

Obje teme voze na samostalnim tokenima `--rc-*` na `.rc-root`, pa komponenta
nikad ne ulazi u sukob s temom aplikacije. Rade sve tri ShadCN strategije:

- `prefers-color-scheme` — bez ikakvog podešavanja (`theme="auto"`).
- klasa `.dark` na `<html>` — ShadCN `darkMode: class`.
- razriješena vrijednost proslijeđena u `theme`, za aplikacije s providerom.

Tokeni koje vrijedi znati: `--rc-radius` (podrazumijevano `2px` — namjerno
oštro; stavite `12px`+ za mekši stil), `--rc-font-display` (serif naslova),
`--rc-font-ar` (arapski slog) i `--rc-pad`.

---

## Rezerva bez JS-a i SSR

Živa mreža je `display: none` dok komponenta ne proradi, pa posjetilac bez
JavaScripta dobija statični blok: broj dana, datum prvog dana posta i napomenu
šta nedostaje. Ništa se ne prikazuje kao red nula.

U React verziji isti prekidač vozi stanje montiranja, pa server šalje statičnu
rezervu, a hidratacija je zamjenjuje — **bez neusklađenosti**.

`staticDays` je podatak s builda i zastarijet će. Preračunajte ga pri svakom
deployu, istom matematikom kao živa mreža:

```js
// pod prvog dana posta u zoni Europe/Sarajevo (CET = UTC+1 u februaru)
const cilj = Date.UTC(2027, 1, 7, 23, 0, 0);   // 8. 2. 2027. u 00:00
const dana = Math.floor((cilj - Date.now()) / 864e5);
```

---

## Pristupačnost

Provjereno na stvarnom DOM-u, ne tvrdnjama:

- **Kontrast** — svaki tekstualni element prolazi WCAG AA u obje teme (najniže
  izmjereno 6,3:1 svijetla, 7,28:1 tamna). Prsten fokusa je 5,7:1+ na obje
  podloge.
- **Žive regije** — cifre koje otkucavaju su u `role="timer"` s
  `aria-live="off"`, pa čitač ekrana nije prekidan svake sekunde. Odvojen
  uljudni `role="status"` objavljuje sažetak **jednom u minuti**.
- **Nazivi** — regija je označena svojim naslovom, a traka je `progressbar` s
  `aria-valuetext` koji nosi značenje ("59% proteklo od ramazana 1447. do
  ramazana 1448.").
- **Kretanje** — `prefers-reduced-motion: reduce` uklanja animaciju cifre,
  podizanje kartice, klizanje strelice i sve tranzicije. Odbrojavanje i dalje radi.
- **Tastatura** — redoslijed taba je sporedni link → glavni CTA, svaki s
  vidljivim prstenom fokusa. Duže ime dugmeta („Vaktija za Sarajevo“) ima i
  skrivenu napomenu „(otvara se na vaktija.ba)“, pa je jasno da link vodi s
  stranice.
- Cifre koriste `tabular-nums`, pa se raspored ne trese.

### Zašto su nazivi mjeseci u kodu fiksni

`bs-BA` u nekim preglednicima **prođe** `Intl.DateTimeFormat.supportedLocalesOf`,
a ipak ispiše korijenski format: `2027 M02 8, Mon` umjesto
`ponedjeljak, 8. februar 2027.` Hrvatski daje `veljače`, a srpski-latinica u BiH
`februar`. Zato su bosanski nazivi mjeseci i dana fiksni u `BS_MJESECI` /
`BS_DANI`, a pomak zone se računa ručno (`GMT+1`) umjesto preko ICU naziva.
Ispis je tada isti u svakom pregledniku i tačno bosanski.

---

## Šta je provjereno

`ramazan-odbrojavanje.html` je vožen u headless Chromiumu:

- čista konzola i nema neuspjelih zahtjeva; nema horizontalnog preljeva ni
  odrezanog teksta na 320 / 380 / 640 / 768 / 1100 / 1440 px; mreža jedinica
  prelazi iz 2×2 u 4 kolone na 640 px, a brojevi dijele istu osnovnu liniju
- potvrđeno da je kontrola vremenske zone uklonjena (nema `<select>`-a u DOM-u)
  i da je ispis neovisan od zone u kojoj se stranica otvori
- ciljni trenutak provjeren na sekundu: stranica računa do
  `2027-02-07T16:12:00Z`, što je tačno **17:12:00** u Sarajevu
- `sekunde` otkucavaju na granici sekunde bez odstupanja; usklađivanje kad se
  kartica probudi
- hover, fokus, animacija cifre i obje strategije tema provjereni preko
  izračunatih stilova; smanjeno kretanje provjereno pod emuliranom postavkom
- ispis bez JS-a provjeren s isključenim JavaScriptom u pregledniku
- `RamazanskoOdbrojavanje.tsx` provjeren pod `strict`, zatim bundlovan i
  pokrenut: server-render → hidratacija dala **nula** grešaka hidratacije, uz
  statičnu rezervu u serverskom HTML-u i živu mrežu nakon montiranja

Skripte su u `.verify/` (`check.py`, `layout.py`, `behave.py`, `a11y.py` i SSR
harness u `react-run/`), uz referentne snimke ekrana (`bs-light`, `bs-light-os`, `bs-dark`,
`bs-dark-os`, `bs-crimson`, `bs-mobile`, `bs-nojs`). Otvorite
`ramazan-odbrojavanje.html` direktno u pregledniku. Komponenta prati postavku
sistema (`prefers-color-scheme`); za tamni izgled prebacite temu OS-a ili
postavite `data-rc-theme="dark"` na sekciji.

---

## Engleska verzija

Zadržana je i provjerena engleska varijanta, ako zatreba:
`ramadan-countdown.html`, `RamadanCountdown.tsx` i `ramadan-countdown.css`.
Pazi: engleska verzija koristi datum za Saudijsku Arabiju (18. 2. 2026), koji
**nije** datum prvog dana posta u Bosni.
