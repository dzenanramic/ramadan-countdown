# Ramazansko odbrojavanje

Odbrojavanje do ramazana 1448. h.g. za Bosnu i Hercegovinu. Statična stranica,
bez build koraka.

## Objavljeno

Vercel poslužuje `index.html` na korijenu. Ostale stranice su dostupne na
`/ramazan-odbrojavanje` i `/ramadan-countdown`.

## Datumi

Odbrojavanje ide do **akšama**, ne do ponoći — mjesec počinje akšamskim ezanom
uoči prvog dana posta.

| | |
| --- | --- |
| Cilj (1448) | nedjelja, 7. februar 2027. u 17:12 (CET) |
| Prvi dan posta | ponedjeljak, 8. februar 2027. |

Vrijeme po Takvimu Rijaseta Islamske zajednice u BiH, za Sarajevo. BiH ne prati
osmatranje mjeseca u Zaljevu: Takvim se računa unaprijed i usaglašen je s
turskim Diyanetom, pa se datum zna razlikovati od arapskih zemalja za jedan dan
(1447. je u BiH počeo 19. 2. 2026, u Saudijskoj Arabiji 18. 2. 2026).

Tačno vrijeme akšama za 1448. provjerite u novom Takvimu — u kodu je procijena.

## Datoteke

```
index.html                    naslovnica (kopija bosanske verzije)
ramazan-odbrojavanje.html     bosanska verzija, HTML isječak
RamazanskoOdbrojavanje.tsx    bosanska verzija, React/ShadCN
ramazan-odbrojavanje.css      stilovi (dijeljeni)

ramadan-countdown.html        ranija engleska verzija (zona Asia/Riyadh,
RamadanCountdown.tsx          cilj u ponoć, saudijski datum — nije BiH)
ramadan-countdown.css

favicon/                      ikone i web manifest
```

## Kako pokrenuti lokalno

Otvorite `index.html` u pregledniku ili poslužite mapu:

```bash
python3 -m http.server 8899
```

Tailwind se učitava s CDN-a, pa stranica radi i bez servera.

## Napomene

- Poziv na akciju vodi na [vaktija.ba](https://vaktija.ba/sarajevo).
- Favicon je umanjena komponenta (mjedena traka + mreža 2×2), u bojama iz CSS
  tokena; ne koristi znak vaktija.ba.
- Kontrole vremenske zone nema — stranica uvijek prikazuje vrijeme BiH.
- Skripte za provjeru su u `.verify/` (kontrast, raspored, ponašanje, SSR).
