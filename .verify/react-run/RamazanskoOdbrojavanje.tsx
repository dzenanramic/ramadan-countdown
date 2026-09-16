/**
 * RamazanskoOdbrojavanje — odbrojavanje do 1. ramazana, usklađeno sa ShadCN-om.
 *
 * Ubacite ovu datoteku i `ramazan-odbrojavanje.css` u projekat (npr.
 * `components/ramazansko-odbrojavanje/`). Potreban je samo Tailwind; nema
 * biblioteke za animacije, za datume ni za ikone.
 *
 * Sigurno za SSR: server ispisuje statičnu rezervu, a živa mreža je zamjenjuje
 * tek nakon montiranja — pa nema neusklađenosti pri hidrataciji, a posjetilac
 * bez JavaScripta dobija smislen, stilizovan odgovor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import './ramazan-odbrojavanje.css';

/* ── Podešavanja ─────────────────────────────────────────────────────────── */

export type RamazanskiUnos = {
  /** Hidžretska godina, npr. 1448. */
  hijri: number;
  /** Gregorijanski datum AKŠAMA uoči prvog dana posta, u `referenceZone`. */
  y: number; m: number; d: number;
  /** Vrijeme akšama [sati, minute] po Takvimu, lokalno vrijeme Sarajeva. */
  aksam: [number, number];
};

/**
 * Trenutak početka ramazana u Bosni i Hercegovini: AKŠAM (magrib) uoči prvog
 * dana posta. Mjesec ne počinje u ponoć — počinje akšamskim ezanom, pa
 * odbrojavanje ide do tog trenutka.
 *
 * Tako i Takvim Rijaseta IZ BiH kaže za 1447: „Sr 18.02. Uoči ramazana (prva
 * teravija)", „Če 19.02. PRVI DAN RAMAZANA – početak posta". Znači: akšam
 * 18. februara 2026. u 17:45, pa je 19. prvi dan posta.
 *
 * BiH ne prati osmatranje mjeseca u Zaljevu: Takvim se računa unaprijed, a
 * proračun je usaglašen s turskim Diyanetom. Zato je 1447. u BiH počeo
 * 19. februara 2026, dok je u Saudijskoj Arabiji počeo dan ranije.
 *
 * Provjereno u Takvimu 2026:  1446 → akšam 28. 2. 2025.
 *                             1447 → akšam 18. 2. 2026. u 17:45
 * Procijena:                  1448 i dalje — akšam izveden iz Takvimove metode
 *                             (akšam = zalazak sunca) i pomaka zalaska za isti
 *                             datum između godina. Provjerite u novom Takvimu.
 *
 * Sva vremena su za Sarajevo. U drugim gradovima BiH akšam se razlikuje do
 * ~10 minuta (Bihać kasnije, Goražde ranije).
 */
export const RAMAZANSKI_UNOSI: RamazanskiUnos[] = [
  { hijri: 1446, y: 2025, m: 2,  d: 28, aksam: [17, 30] },
  { hijri: 1447, y: 2026, m: 2,  d: 18, aksam: [17, 45] },
  { hijri: 1448, y: 2027, m: 2,  d: 7,  aksam: [17, 12] },
  { hijri: 1449, y: 2028, m: 1,  d: 27, aksam: [16, 50] },
  { hijri: 1450, y: 2029, m: 1,  d: 15, aksam: [16, 35] },
  { hijri: 1451, y: 2030, m: 1,  d: 4,  aksam: [16, 22] },
  { hijri: 1452, y: 2030, m: 12, d: 25, aksam: [16, 12] },
  { hijri: 1453, y: 2031, m: 12, d: 14, aksam: [16, 5] },
];

export type RamazanskoOdbrojavanjeProps = {
  unosi?: RamazanskiUnos[];
  /**
   * IANA zona u kojoj su navedeni datumi. Fiksna je namjerno: stranica uvijek
   * prikazuje vrijeme Bosne i Hercegovine, bez obzira odakle se gleda.
   */
  referenceZone?: string;
  /** Ostavite `auto` ili proslijedite razriješenu temu svoje aplikacije. */
  theme?: 'auto' | 'light' | 'dark';
  accent?: 'ink' | 'crimson';
  /** Broj dana za rezervu bez JS-a — izračunajte ga pri buildu. */
  staticDays?: number;
  /** Vaktija za grad; `grad` ulazi u adresu na vaktija.ba. */
  vaktijaGrad?: string;
  vaktijaHref?: string;
  learnMoreHref?: string;
  className?: string;
};

/* ── Zone: samo Intl, sigurno za DST, bez biblioteka ─────────────────────── */

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(zone, f);
  }
  return f;
}

type ZidniDijelovi = { y: number; m: number; d: number; h: number; mi: number };

function zoneParts(ts: number, zone: string): ZidniDijelovi {
  const p: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(new Date(ts))) p[part.type] = part.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

function zoneOffsetMs(ts: number, zone: string): number {
  const p = zoneParts(ts, zone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ts / 60000) * 60000;
}

/** Zidno vrijeme u zoni → UTC trenutak koji ono označava. */
function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, zone: string): number {
  const guess = Date.UTC(y, m - 1, d, h, mi, 0);
  try {
    const ts = guess - zoneOffsetMs(guess, zone);
    return guess - zoneOffsetMs(ts, zone); // drugi prolaz rješava DST rubove
  } catch {
    return guess;                          // nepoznata zona → doslovno UTC
  }
}

/* ── Bosanski nazivi i oblici datuma ─────────────────────────────────────── */
/* NAMJERNO bez oslanjanja na ICU nazive: `bs-BA` u nekim preglednicima prođe
   `supportedLocalesOf`, a ipak ispiše korijenski format ("2027 M02 8, Mon").
   Hrvatski daje "veljače", a srpski-latinica u BiH "februar". Zato su nazivi
   fiksni — ispis je tada isti u svakom pregledniku i tačno bosanski. */
const BS_MJESECI = ['januar', 'februar', 'mart', 'april', 'maj', 'jun',
                    'jul', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'];
const BS_MJESECI_KRATKO = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
                           'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const BS_DANI = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
/* Akuzativ: uz "u" u rečenici ("počinje u nedjelju", ne "u nedjelja"). */
const BS_DANI_AKUZ = ['nedjelju', 'ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu'];
const AR_CIFRE = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const danUSedmici = (p: ZidniDijelovi) => BS_DANI[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
const danUSedmiciAkuz = (p: ZidniDijelovi) => BS_DANI_AKUZ[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
const pad = (n: number) => (n < 10 ? '0' : '') + n;

/** "ponedjeljak, 8. februar 2027." */
function bsDan(ts: number, zone: string): string {
  const p = zoneParts(ts, zone);
  return `${danUSedmici(p)}, ${p.d}. ${BS_MJESECI[p.m - 1]} ${p.y}.`;
}
/** Isto, ali u akuzativu: "u nedjelju, 7. februar 2027." */
function bsDanAkuz(ts: number, zone: string): string {
  const p = zoneParts(ts, zone);
  return `${danUSedmiciAkuz(p)}, ${p.d}. ${BS_MJESECI[p.m - 1]} ${p.y}.`;
}
/** "19. feb 2026." */
function bsKratko(ts: number, zone: string): string {
  const p = zoneParts(ts, zone);
  return `${p.d}. ${BS_MJESECI_KRATKO[p.m - 1]} ${p.y}.`;
}
/** "00:00" */
function bsVrijeme(ts: number, zone: string): string {
  const p = zoneParts(ts, zone);
  return `${pad(p.h)}:${pad(p.mi)}`;
}
/** 1448 → ١٤٤٨ (bez separatora hiljada) */
const arapskeCifre = (n: number) => String(n).replace(/[0-9]/g, (d) => AR_CIFRE[+d]);

/** "GMT+1", "GMT+5:30" — računato iz pomaka, bez ICU naziva zona. */
function oznakaPomaka(zone: string, date: Date): string {
  let off: number;
  try { off = zoneOffsetMs(date.getTime(), zone) / 60000; } catch { return ''; }
  const abs = Math.abs(off), hh = Math.floor(abs / 60), mm = abs % 60;
  return `GMT${off < 0 ? '-' : '+'}${hh}${mm ? ':' + pad(mm) : ''}`;
}

/** Bosanski množinski oblici: 1 dan, 2 dana, 5 dana; 1 sat, 2 sata, 5 sati */
function bsMnozina(n: number, jedan: string, dvaDoCetiri: string, ostalo: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return jedan;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return dvaDoCetiri;
  return ostalo;
}

/* Ponovo pokreće CSS animaciju cifre samo kad se vrijednost zaista promijeni,
   i nikad pri prvom iscrtavanju. */
function useCifra(value: string, animate: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const el = ref.current;
    const changed = previous.current !== value;
    previous.current = value;
    if (!el || !animate || !changed) return;
    el.classList.remove('rc-rise');
    void el.offsetWidth;              // prisilni reflow da se animacija ponovi
    el.classList.add('rc-rise');
  }, [value, animate]);
  return ref;
}

/* ── Komponenta ──────────────────────────────────────────────────────────── */

export function RamazanskoOdbrojavanje({
  unosi = RAMAZANSKI_UNOSI,
  referenceZone = 'Europe/Sarajevo',
  theme = 'auto',
  accent = 'ink',
  staticDays,
  vaktijaGrad = 'sarajevo',
  vaktijaHref = `https://vaktija.ba/${vaktijaGrad}`,
  learnMoreHref = `https://vaktija.ba/${vaktijaGrad}`,
  className = '',
}: RamazanskoOdbrojavanjeProps) {
  const [now, setNow] = useState<number | null>(null);   // null do montiranja
  const [animate, setAnimate] = useState(false);
  /* Trenutak se pamti jednom, pa je ispis prije montiranja deterministički:
     server i klijent razrješavaju isti ramazan, a statična rezerva navodi
     tačan datum. */
  const [boot] = useState(() => Date.now());

  /* Otkucaj na granici sekunde, a ne svakih 1000 ms od učitavanja, pa cifra
     sekundi nikad ne odstupa. */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      setNow(Date.now());
      t = setTimeout(loop, 1000 - (Date.now() % 1000) + 20);
    };
    loop();
    const onVisible = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    const raf = requestAnimationFrame(() => setAnimate(true)); // mirno prvo iscrtavanje
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const live = now !== null;

  const view = useMemo(() => {
    const renderZone = referenceZone;
    const list = unosi
      .map((a) => ({ hijri: a.hijri, ts: zonedToUtc(a.y, a.m, a.d, a.aksam[0], a.aksam[1], renderZone) }))
      .sort((a, b) => a.ts - b.ts);

    const at = now ?? boot;
    let i = list.findIndex((a) => a.ts > at);
    if (i === -1) i = list.length - 1;            // sve prošlo: zadnji poznati
    const next = list[i];
    /* Rezerva samo ako nema ranijeg unosa: prosječna lunarna godina, može
       promašiti dan. Dodajte stvarni prošli unos kad je tačnost važna. */
    const prev = list[i - 1] ?? { hijri: next.hijri - 1, ts: next.ts - 354 * 864e5 };

    const target = new Date(next.ts);
    /* Sve ispod zavisi od sata posjetioca, pa ostaje na neutralnoj vrijednosti
       do montiranja: inače bi se server i klijent razišli za milisekundu i
       izazvali neusklađenost pri hidrataciji. Živa mreža je display:none dok
       se ne postavi data-rc-js, pa to niko ne vidi. */
    const counted = live ? Math.max(0, next.ts - (now as number)) : null;
    const started = counted !== null && counted === 0;
    const d = counted === null ? 0 : Math.floor(counted / 864e5);
    const h = counted === null ? 0 : Math.floor(counted / 36e5) % 24;
    const m = counted === null ? 0 : Math.floor(counted / 6e4) % 60;
    const s = counted === null ? 0 : Math.floor(counted / 1e3) % 60;
    const pct = counted === null ? 0 : started ? 100
      : Math.max(0, Math.min(100, ((now as number) - prev.ts) / (next.ts - prev.ts) * 100));

    const pomak = oznakaPomaka(renderZone, target);

    return {
      renderZone, next, prev, target, d, h, m, s, started, pct,
      digits: { d: String(d), h: pad(h), m: pad(m), s: pad(s) },
      hijriArapski: arapskeCifre(next.hijri),
      kratko: (ts: number) => bsKratko(ts, renderZone),
      caption: `1. ramazan ${next.hijri}. h.g. nastupa akšamskim ezanom, `
        + `${bsDan(next.ts, renderZone)} u ${bsVrijeme(next.ts, renderZone)}`
        + `${pomak ? ` (${pomak})` : ''}. Prvi dan posta je dan poslije. Vrijeme za Sarajevo.`,
      /* Mijenja se jednom u minuti, nikad svake sekunde. */
      announcement: `${d} ${bsMnozina(d, 'dan', 'dana', 'dana')}, `
        + `${h} ${bsMnozina(h, 'sat', 'sata', 'sati')} i `
        + `${m} ${bsMnozina(m, 'minuta', 'minute', 'minuta')}`,
      staticniDatum: bsDanAkuz(next.ts, renderZone),
    };
  }, [boot, now, referenceZone, unosi, live]);

  const refD = useCifra(view.digits.d, animate);
  const refH = useCifra(view.digits.h, animate);
  const refM = useCifra(view.digits.m, animate);
  const refS = useCifra(view.digits.s, animate);

  const jedinice = [
    { key: 'd' as const, label: 'Dana', ar: 'يوم', ref: refD },
    { key: 'h' as const, label: 'Sati', ar: 'ساعة', ref: refH },
    { key: 'm' as const, label: 'Minuta', ar: 'دقيقة', ref: refM },
    { key: 's' as const, label: 'Sekundi', ar: 'ثانية', ref: refS },
  ];

  return (
    <section
      id="ramadan-countdown"
      className={`rc-root rc-card block ${className}`}
      data-rc-theme={theme}
      data-rc-accent={accent}
      /* Odsutan do montiranja, pa server šalje upravo statičnu rezervu. */
      data-rc-js={live ? 'on' : undefined}
      aria-labelledby="rc-title"
    >
      {/* Zaglavlje: identitet */}
      <div>
      <p className="flex items-center gap-2.5">
          <span className="rc-mark" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-muted)]">
            Ramazan <span data-rc="hijri">{view.next.hijri}</span>. h.g.
          </span>
          <span lang="ar" dir="rtl" className="rc-ar text-[var(--rc-accent)]" aria-hidden="true"
                data-rc="hijri-ar">
            رمضان {view.hijriArapski}
          </span>
        </p>

        <h2 id="rc-title"
            className="mt-3 text-[1.65rem] leading-tight font-normal sm:text-3xl"
            style={{ fontFamily: 'var(--rc-font-display)' }}>
          <span data-rc="state">
            {view.started ? 'Ramazan je počeo' : 'Ramazan počinje za'}
          </span>
        </h2>

        <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-[var(--rc-muted)]">
          <time data-rc="target-iso" dateTime={view.target.toISOString()}>
            1. ramazan {view.next.hijri}. h.g.
          </time>
          <span aria-hidden="true">·</span> prema Takvimu Rijaseta Islamske zajednice u BiH,
          čiji je proračun usaglašen s turskim Diyanetom. Mjesec nastupa akšamskim ezanom.
        </p>
      </div>

      {/* Živo odbrojavanje. Stilovi ga skrivaju dok se ne postavi data-rc-js. */}
      <div className="rc-live mt-7">
        <div className="rc-grid" role="timer" aria-live="off" aria-label="Vrijeme do ramazana">
          {jedinice.map((u) => (
            <div className="rc-unit" key={u.key}>
              <span className="rc-num" data-rc={u.key} ref={u.ref}>{view.digits[u.key]}</span>
              <span className="rc-label">
                {u.label} <span lang="ar" dir="rtl" className="rc-ar">{u.ar}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Traka: koliko je prošlo od prošlog do sljedećeg ramazana */}
        <div className="mt-6">
          <div className="rc-track" role="progressbar"
               aria-label="Proteklo vrijeme od prethodnog ramazana do sljedećeg"
               aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={Math.round(view.pct * 10) / 10}
               aria-valuetext={`${Math.round(view.pct)}% proteklo od ramazana ${view.prev.hijri}. do ramazana ${view.next.hijri}.`}>
            <div className="rc-fill" data-rc="fill" style={{ width: `${view.pct}%` }} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p id="rc-ruler-label" className="text-[11px] text-[var(--rc-muted)]">
              Od akšama <span data-rc="prev">{view.kratko(view.prev.ts)}</span>
              <span aria-hidden="true">·</span> <span data-rc="pct">{Math.round(view.pct)}%</span> proteklo
            </p>
            <p className="text-[11px] text-[var(--rc-muted)]" dir="ltr">
              <span data-rc="next">
                1. ramazan {view.next.hijri}. · {view.kratko(view.next.ts)}
              </span>
            </p>
          </div>
        </div>

        <p data-rc="caption"
           className="mt-5 border-t border-[var(--rc-line)] pt-4 text-[13px] leading-relaxed text-[var(--rc-fg)]">
          {view.caption}
        </p>
        {/* Čitačima ekrana: objava jednom u minuti, nikad svake sekunde */}
        <p data-rc="sr" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {view.started ? 'Ramazan je počeo.' : `${view.announcement} do početka ramazana.`}
        </p>
      </div>

      {/* Rezerva bez JS-a / prije hidratacije */}
      <div className="rc-static mt-7">
        <div className="rc-grid">
          <div className="rc-unit">
            <span className="rc-num">{staticDays ?? '—'}</span>
            <span className="rc-label">Dana <span lang="ar" dir="rtl" className="rc-ar">يوم</span></span>
          </div>
          {[['Sati', 'ساعة'], ['Minuta', 'دقيقة'], ['Sekundi', 'ثانية']].map(([label, ar]) => (
            <div className="rc-unit" key={label}>
              <span className="rc-num">—</span>
              <span className="rc-label">{label} <span lang="ar" dir="rtl" className="rc-ar">{ar}</span></span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--rc-fg)]">
          Ramazan počinje u <strong className="font-semibold">{view.staticniDatum}</strong>
          {' '}— akšamskim ezanom. Prvi dan posta je dan poslije.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--rc-muted)]">
          Za prikaz sati, minuta i sekundi potreban je JavaScript — prikazan je
          statični podatak.
        </p>
      </div>

      {/* Podnožje: poziv na akciju */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-[var(--rc-line)] pt-5">
        <p className="text-[12px] text-[var(--rc-muted)]">
          Vremena sehura, iftara i akšama za vaš grad.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href={learnMoreHref} target="_blank" rel="noopener noreferrer" className="rc-ghost">
            Kako računamo datum
          </a>
          <a href={vaktijaHref} target="_blank" rel="noopener noreferrer" className="rc-cta">
            Vaktija za Sarajevo
            <span className="sr-only">(otvara se na vaktija.ba)</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 7h9M7.9 3.3 11.6 7l-3.7 3.7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default RamazanskoOdbrojavanje;
