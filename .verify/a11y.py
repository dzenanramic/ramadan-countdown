"""Accessibility + computed-contrast audit for ramadan-countdown.html.

Verifies against the real rendered DOM (not the palette in isolation):
  * WCAG contrast of every text element, in light and dark
  * the Chrome accessibility tree: roles, names, live regions
  * keyboard tab order

Run:  python3 .verify/a11y.py
"""
from playwright.sync_api import sync_playwright
import json

import sys as _sys
URL = _sys.argv[1] if len(_sys.argv) > 1 else "file:///home/dzenan/ramadan-countdown/ramadan-countdown.html"

CHECK = r"""
() => {
  const lin = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const nums = s => { const m = String(s).match(/[0-9.]+/g); return m ? m.map(Number).slice(0,3) : null; };
  const lum = rgb => 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2]);
  const ratio = (a,b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1,l2), lo = Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  const alpha = s => { const m = String(s).match(/[0-9.]+/g); if (!m) return 1; return m.length > 3 ? Number(m[3]) : 1; };
  const bgOf = e => {
    let n = e;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && alpha(c) > 0.5) return nums(c);
      n = n.parentElement;
    }
    return [255,255,255];
  };
  const check = (sel, label, min) => {
    const e = document.querySelector(sel);
    if (!e) return { label, missing: true };
    const s = getComputedStyle(e);
    const fg = nums(s.color), bg = bgOf(e);
    if (!fg || !bg) return { label, missing: true, raw: s.color };
    const r = ratio(fg, bg);
    return { label, text: e.textContent.trim().slice(0,34), size: s.fontSize,
             fg: s.color, bg: 'rgb(' + bg.join(', ') + ')',
             ratio: +r.toFixed(2), needs: min, pass: r >= min };
  };
  return [
    check('.rc-live [data-rc="d"]',  'days digit',            3),
    check('.rc-live [data-rc="s"]',  'seconds digit',         3),
    check('.rc-unit .rc-label',      'unit label',            4.5),
    check('#rc-title',               'heading',               4.5),
    check('#rc-title ~ p',           'sighting caveat',       4.5),
    check('[data-rc="caption"]',     'caption',               4.5),
    check('[data-rc="caption-alt"]', 'caption alt',           4.5),
    check('#rc-ruler-label',         'ruler label',           4.5),
    check('.rc-ghost',               'ghost link',            4.5),
    check('.rc-cta',                 'CTA text vs its fill',  4.5),
    check('#rc-zone',                'timezone select',       4.5),
    check('.rc-static p',            'no-JS fallback text',   4.5)
  ];
}
"""


def ax_tree(ctx, pg):
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Accessibility.enable")
    tree = cdp.send("Accessibility.getFullAXTree")
    want = {"timer", "progressbar", "heading", "combobox", "link", "status", "region"}
    out = []
    for n in tree["nodes"]:
        role = (n.get("role") or {}).get("value")
        if role not in want:
            continue
        row = {"role": role, "name": (n.get("name") or {}).get("value", "")[:64]}
        for prop in n.get("properties", []):
            if prop["name"] in ("live", "valuenow", "valuetext", "level", "atomic", "focusable"):
                row[prop["name"]] = prop.get("value", {}).get("value")
        out.append(row)
    return out


with sync_playwright() as p:
    browser = p.chromium.launch()
    report = {}
    for scheme in ("light", "dark"):
        ctx = browser.new_context(viewport={"width": 1100, "height": 900}, color_scheme=scheme)
        pg = ctx.new_page()
        pg.goto(URL, wait_until="load")
        pg.wait_for_timeout(2200)
        report[scheme] = pg.evaluate(CHECK)
        if scheme == "light":
            report["ax_tree"] = ax_tree(ctx, pg)
            report["tab_order"] = pg.evaluate(
                """() => [...document.querySelectorAll('#ramadan-countdown a[href],#ramadan-countdown select')]
                     .map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 30),
                                  id: e.id || null, href: e.getAttribute('href') }))"""
            )
        ctx.close()
    browser.close()

fails = 0
for scheme in ("light", "dark"):
    print(f"=== {scheme} contrast (WCAG 2.1 AA) ===")
    for c in report[scheme]:
        if c.get("missing"):
            print(f"  --  {'-':>6}  {'':>7} {c['label']}  (element not rendered)")
            continue
        if not c["pass"]:
            fails += 1
        print(f"  {'OK ' if c['pass'] else 'FAIL'} {c['ratio']:>6} (needs {c['needs']}) "
              f"{c['size']:>7}  {c['label']:<20} {c['fg']} on {c['bg']}")

print("\n=== accessibility tree ===")
print(json.dumps(report["ax_tree"], indent=1, ensure_ascii=False))
print("\n=== tab order ===")
for i, e in enumerate(report["tab_order"], 1):
    print(f"  {i}. {e['tag']:<7} {e['text'] or e['id']}")
print(f"\ncontrast failures: {fails}")
