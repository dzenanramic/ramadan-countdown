/**
 * RamadanCountdown — ShadCN-compatible countdown to 1 Ramadan.
 *
 * Drop this file plus `ramadan-countdown.css` into your project (e.g.
 * `components/ramadan-countdown/`). Tailwind is the only requirement; there is
 * no animation library, no date library and no icon dependency.
 *
 * SSR-safe: the server renders the static fallback, and the live grid only
 * replaces it after mount — so there is no hydration mismatch, and a visitor
 * without JavaScript keeps a meaningful, styled answer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import './ramadan-countdown.css';

/* ── Configuration ───────────────────────────────────────────────────────── */

export type RamadanAnchor = {
  /** Hijri year, e.g. 1448. */
  hijri: number;
  /** Gregorian date of 1 Ramadan, as stated in `referenceZone`. */
  y: number; m: number; d: number;
};

/**
 * Estimated Gregorian date of 1 Ramadan, stated in the reference zone.
 * Astronomical estimates — the observed start depends on local moon sighting
 * and has varied by a day between regions (1447 began 18 Feb 2026 in Saudi
 * Arabia, 19 Feb in some other communities).
 *
 * Past entries exist so the progress ruler can say "since <a real date>"
 * rather than deriving one. Keep the list ahead of today's date.
 */
export const RAMADAN_ANCHORS: RamadanAnchor[] = [
  { hijri: 1446, y: 2025, m: 3,  d: 1  },
  { hijri: 1447, y: 2026, m: 2,  d: 18 },
  { hijri: 1448, y: 2027, m: 2,  d: 8  },
  { hijri: 1449, y: 2028, m: 1,  d: 28 },
  { hijri: 1450, y: 2029, m: 1,  d: 16 },
  { hijri: 1451, y: 2030, m: 1,  d: 5  },
  { hijri: 1452, y: 2030, m: 12, d: 26 },
  { hijri: 1453, y: 2031, m: 12, d: 15 },
];

export type RamadanCountdownProps = {
  anchors?: RamadanAnchor[];
  /** IANA zone the anchor dates are stated in. */
  referenceZone?: string;
  /**
   * `reference` (default) counts down to one fixed instant; the timezone
   * control only changes how that instant is described.
   * `display` re-anchors the countdown to local midnight of the anchor date —
   * use it when the product is local-first.
   */
  targetMode?: 'reference' | 'display';
  /** Leave on `auto`, or pass your theme provider's resolved value. */
  theme?: 'auto' | 'light' | 'dark';
  accent?: 'ink' | 'crimson';
  /** `auto` = the visitor's own zone. */
  defaultZone?: string;
  /** Remember the visitor's zone choice. */
  storageKey?: string;
  /** Day count for the no-JS fallback — compute it at build time. */
  staticDays?: number;
  locale?: string;
  timetableHref?: string;
  learnMoreHref?: string;
  className?: string;
};

/* ── Timezone helpers: Intl only, DST-safe, no libraries ─────────────────── */

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

function zoneOffsetMs(ts: number, zone: string): number {
  const p: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(new Date(ts))) p[part.type] = part.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
       - Math.floor(ts / 1000) * 1000;
}

/** Wall-clock time in `zone` → the UTC instant it denotes. */
function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, zone: string): number {
  const guess = Date.UTC(y, m - 1, d, h, mi, 0);
  try {
    const ts = guess - zoneOffsetMs(guess, zone);
    return guess - zoneOffsetMs(ts, zone); // second pass settles DST edges
  } catch {
    return guess;                          // unknown zone → literal UTC reading
  }
}

function fmt(zone: string, opts: Intl.DateTimeFormatOptions, date: Date, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: zone, ...opts }).format(date);
  } catch {
    /* unknown zone, or an option this engine does not know */
  }
  try { return new Intl.DateTimeFormat(locale, opts).format(date); } catch { return ''; }
}

function localZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

function offsetLabel(zone: string, date: Date, locale?: string): string {
  const s = fmt(zone, { timeZoneName: 'shortOffset' }, date, locale);
  const m = s && s.match(/GMT[+-]?\d{0,2}(?::?\d{2})?/);
  return m ? m[0] : '';
}

/** `Europe/Berlin` → `Europe Berlin`; also guards against a literal `auto`. */
function humanZone(zone: string): string {
  return zone === 'auto' ? 'local time' : zone.replace(/_/g, ' ');
}

function isZone(zone: string): boolean {
  try { new Intl.DateTimeFormat(undefined, { timeZone: zone }); return true; } catch { return false; }
}

const pad = (n: number) => (n < 10 ? '0' : '') + n;

/* Re-triggers the CSS digit animation only for a value that actually changed,
   and never on the first paint. */
function useDigit(value: string, animate: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const el = ref.current;
    const changed = previous.current !== value;
    previous.current = value;
    if (!el || !animate || !changed) return;
    el.classList.remove('rc-rise');
    void el.offsetWidth;              // force reflow so the animation replays
    el.classList.add('rc-rise');
  }, [value, animate]);
  return ref;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function RamadanCountdown({
  anchors = RAMADAN_ANCHORS,
  referenceZone = 'Asia/Riyadh',
  targetMode = 'reference',
  theme = 'auto',
  accent = 'ink',
  defaultZone = 'auto',
  storageKey = 'rc-zone',
  staticDays,
  locale,
  timetableHref = '/ramadan/timetable',
  learnMoreHref = '/ramadan/timetable',
  className = '',
}: RamadanCountdownProps) {
  const [zone, setZone] = useState(defaultZone);
  const [now, setNow] = useState<number | null>(null);   // null until mounted
  const [animate, setAnimate] = useState(false);
  /* Instant captured once, so the pre-mount render is deterministic: the server
     and the client resolve the same upcoming Ramadan, and the static fallback
     names the right date. */
  const [boot] = useState(() => Date.now());

  /* Restore the saved zone after mount — reading localStorage during render
     would break SSR hydration. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved && (saved === 'auto' || isZone(saved))) setZone(saved);
    } catch { /* storage disabled: keep the default */ }
  }, [storageKey]);

  /* Tick on the second boundary rather than every 1000ms from load, so the
     seconds digit never drifts. */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      setNow(Date.now());
      t = setTimeout(loop, 1000 - (Date.now() % 1000) + 20);
    };
    loop();
    const onVisible = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    const raf = requestAnimationFrame(() => setAnimate(true)); // calm first paint
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const live = now !== null;
  /* Never let the literal "auto" reach Intl, and keep the pre-mount value stable
     across server and client so hydration matches. */
  const display = zone !== 'auto' ? zone : live ? localZone() : referenceZone;

  const view = useMemo(() => {
    /* In `reference` mode the instants are anchored in the reference zone and
       the display zone only changes how they read. */
    const renderZone = targetMode === 'display' ? display : referenceZone;
    const list = anchors
      .map((a) => ({ hijri: a.hijri, ts: zonedToUtc(a.y, a.m, a.d, 0, 0, renderZone) }))
      .sort((a, b) => a.ts - b.ts);

    const at = now ?? boot;
    let i = list.findIndex((a) => a.ts > at);
    if (i === -1) i = list.length - 1;            // all past: hold on the last
    const next = list[i];
    /* Fallback only if no earlier anchor is listed: the mean lunar year, which
       can be a day off. Use a real past anchor when accuracy matters. */
    const prev = list[i - 1] ?? { hijri: next.hijri - 1, ts: next.ts - 354 * 864e5 };

    const target = new Date(next.ts);
    /* Everything below is derived from the visitor's clock, so it stays at a
       neutral placeholder until mount: the server and the client would
       otherwise disagree by a millisecond and trip a hydration mismatch. The
       live grid is display:none until data-rc-js is set, so nobody sees this. */
    const counted = live ? Math.max(0, next.ts - (now as number)) : null;
    const started = counted !== null && counted === 0;
    const d = counted === null ? 0 : Math.floor(counted / 864e5);
    const h = counted === null ? 0 : Math.floor(counted / 36e5) % 24;
    const m = counted === null ? 0 : Math.floor(counted / 6e4) % 60;
    const s = counted === null ? 0 : Math.floor(counted / 1e3) % 60;
    const pct = counted === null ? 0 : started ? 100
      : Math.max(0, Math.min(100, ((now as number) - prev.ts) / (next.ts - prev.ts) * 100));

    const dayIn = (z: string) =>
      fmt(z, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, target, locale);
    const timeIn = (z: string) =>
      fmt(z, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, target, locale);
    const zoneNote = (z: string) => {
      const off = offsetLabel(z, target, locale);
      return off ? ` (${off})` : '';
    };
    const shortDate = (ts: number) =>
      fmt(renderZone, { day: 'numeric', month: 'short', year: 'numeric' }, new Date(ts), locale);

    return {
      renderZone, next, prev, target, d, h, m, s, started, pct, shortDate,
      digits: { d: String(d), h: pad(h), m: pad(m), s: pad(s) },
      hijriArabic: new Intl.NumberFormat('ar-EG-u-nu-arab', { useGrouping: false }).format(next.hijri),
      reference: `Counts to 1 Ramadan ${next.hijri} AH — ${dayIn(renderZone)} at `
        + `${timeIn(renderZone)}${zoneNote(renderZone)} in ${humanZone(renderZone)}.`,
      local: display === renderZone
        ? `Times shown in ${humanZone(renderZone)}, the reference zone for this countdown.`
        : `For you in ${humanZone(display)}: ${dayIn(display)} at ${timeIn(display)}${zoneNote(display)}.`,
      /* Changes once a minute, never once a second. */
      announcement: `${d} ${d === 1 ? 'day' : 'days'}, ${h} ${h === 1 ? 'hour' : 'hours'}, `
        + `${m} ${m === 1 ? 'minute' : 'minutes'}`,
      staticDate: dayIn(renderZone),
    };
  }, [anchors, boot, display, locale, now, referenceZone, targetMode]);

  const refD = useDigit(view.digits.d, animate);
  const refH = useDigit(view.digits.h, animate);
  const refM = useDigit(view.digits.m, animate);
  const refS = useDigit(view.digits.s, animate);

  const units = [
    { key: 'd' as const, label: 'Days', ar: 'يوم', ref: refD },
    { key: 'h' as const, label: 'Hours', ar: 'ساعة', ref: refH },
    { key: 'm' as const, label: 'Minutes', ar: 'دقيقة', ref: refM },
    { key: 's' as const, label: 'Seconds', ar: 'ثانية', ref: refS },
  ];

  const onZone = (value: string) => {
    setZone(value);
    try { window.localStorage.setItem(storageKey, value); } catch { /* ignore */ }
  };

  return (
    <section
      className={`rc-root rc-card block ${className}`}
      data-rc-theme={theme}
      data-rc-accent={accent}
      /* Absent until mount, so the static fallback is what the server sends. */
      data-rc-js={live ? 'on' : undefined}
      aria-labelledby="rc-title"
    >
      {/* Header: identity + timezone control */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5">
            <span className="rc-mark" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-muted)]">
              Ramadan <span data-rc="hijri">{view.next.hijri}</span> AH
            </span>
            <span lang="ar" dir="rtl" className="rc-ar text-[var(--rc-accent)]" aria-hidden="true"
                  data-rc="hijri-ar">
              رمضان {view.hijriArabic}
            </span>
          </p>

          <h2 id="rc-title"
              className="mt-3 text-[1.65rem] leading-tight font-normal sm:text-3xl"
              style={{ fontFamily: 'var(--rc-font-display)' }}>
            <span data-rc="state">{view.started ? 'Ramadan has begun' : 'Ramadan begins in'}</span>
          </h2>

          <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-[var(--rc-muted)]">
            <time data-rc="target-iso" dateTime={view.target.toISOString()}>
              1 Ramadan {view.next.hijri} AH
            </time>
            <span aria-hidden="true">·</span> estimated by astronomical calculation, subject to
            local moon sighting — actual dates can differ by a day.
          </p>
        </div>

        <div className="flex flex-none flex-col gap-1.5">
          <label htmlFor="rc-zone"
                 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--rc-muted)]">
            Display timezone
          </label>
          <select id="rc-zone" className="rc-select" value={zone} aria-label="Display timezone"
                  onChange={(e) => onZone(e.target.value)}>
            {/* The detected name appears only after mount — it differs between
                the server and the visitor. */}
            <option value="auto">
              {live ? `Local — ${humanZone(localZone())}` : 'Local time'}
            </option>
            <option value="UTC">UTC / GMT</option>
            <option value="Asia/Riyadh">Riyadh — Makkah reference</option>
            <option value="Asia/Dubai">Dubai</option>
            <option value="Asia/Karachi">Karachi</option>
            <option value="Asia/Kolkata">Delhi — Mumbai</option>
            <option value="Asia/Jakarta">Jakarta</option>
            <option value="Asia/Kuala_Lumpur">Kuala Lumpur</option>
            <option value="Asia/Istanbul">Istanbul</option>
            <option value="Africa/Cairo">Cairo</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Berlin">Berlin — Paris</option>
            <option value="America/New_York">New York — Toronto</option>
            <option value="America/Los_Angeles">Los Angeles</option>
            <option value="Australia/Sydney">Sydney</option>
          </select>
        </div>
      </div>

      {/* Live countdown. The stylesheet hides this until data-rc-js is set. */}
      <div className="rc-live mt-7">
        <div className="rc-grid" role="timer" aria-live="off" aria-label="Time remaining until Ramadan">
          {units.map((u) => (
            <div className="rc-unit" key={u.key}>
              <span className="rc-num" data-rc={u.key} ref={u.ref}>{view.digits[u.key]}</span>
              <span className="rc-label">
                {u.label} <span lang="ar" dir="rtl" className="rc-ar">{u.ar}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Ruler: how far we are from the previous Ramadan to the next */}
        <div className="mt-6">
          <div className="rc-track" role="progressbar"
               aria-label="Progress from the previous Ramadan to the next"
               aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={Math.round(view.pct * 10) / 10}
               aria-valuetext={`${Math.round(view.pct)}% of the way from Ramadan ${view.prev.hijri} to Ramadan ${view.next.hijri}`}>
            <div className="rc-fill" data-rc="fill" style={{ width: `${view.pct}%` }} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p id="rc-ruler-label" className="text-[11px] text-[var(--rc-muted)]">
              Since <span data-rc="prev">{view.shortDate(view.prev.ts)}</span>
              <span aria-hidden="true">·</span> <span data-rc="pct">{Math.round(view.pct)}%</span> elapsed
            </p>
            <p className="text-[11px] text-[var(--rc-muted)]" dir="ltr">
              <span data-rc="next">1 Ramadan {view.next.hijri} · {view.shortDate(view.next.ts)}</span>
            </p>
          </div>
        </div>

        <p data-rc="caption"
           className="mt-5 border-t border-[var(--rc-line)] pt-4 text-[13px] leading-relaxed text-[var(--rc-fg)]">
          {view.reference}
        </p>
        <p data-rc="caption-alt" className="mt-1 text-[12px] leading-relaxed text-[var(--rc-muted)]">
          {view.local}
        </p>

        {/* Screen readers: announced once a minute, never once a second */}
        <p data-rc="sr" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {view.started ? 'Ramadan has begun.' : `${view.announcement} until Ramadan begins.`}
        </p>
      </div>

      {/* No-JS / pre-hydration fallback */}
      <div className="rc-static mt-7">
        <div className="rc-grid">
          <div className="rc-unit">
            <span className="rc-num">{staticDays ?? '—'}</span>
            <span className="rc-label">Days <span lang="ar" dir="rtl" className="rc-ar">يوم</span></span>
          </div>
          {[['Hours', 'ساعة'], ['Minutes', 'دقيقة'], ['Seconds', 'ثانية']].map(([label, ar]) => (
            <div className="rc-unit" key={label}>
              <span className="rc-num">—</span>
              <span className="rc-label">{label} <span lang="ar" dir="rtl" className="rc-ar">{ar}</span></span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--rc-fg)]">
          Ramadan {view.next.hijri} AH is estimated to begin on{' '}
          <strong className="font-semibold">{view.staticDate}</strong>.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--rc-muted)]">
          Live hours, minutes and seconds need JavaScript — this page shows the static fallback.
        </p>
      </div>

      {/* Footer: the CTA */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-[var(--rc-line)] pt-5">
        <p className="text-[12px] text-[var(--rc-muted)]">
          Fasting hours, suhoor and iftar for your city.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href={learnMoreHref} className="rc-ghost">How we calculate this</a>
          <a href={timetableHref} className="rc-cta">
            View the timetable
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

export default RamadanCountdown;
