from playwright.sync_api import sync_playwright
import json, pathlib, sys

import sys as _sys
URL = _sys.argv[1] if len(_sys.argv) > 1 else "file:///home/dzenan/ramadan-countdown/ramadan-countdown.html"
OUT = pathlib.Path("/home/dzenan/ramadan-countdown/.verify")
report = {}

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- JS enabled ----------
    ctx = b.new_context(viewport={"width": 1100, "height": 900}, device_scale_factor=2)
    pg = ctx.new_page()
    errs, reqfail = [], []
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.on("requestfailed", lambda r: reqfail.append(f"{r.url} :: {r.failure}"))
    pg.goto(URL, wait_until="load")
    pg.wait_for_timeout(2500)

    def txt(sel):
        n = pg.query_selector(sel)
        return n.inner_text().strip() if n else None

    report["console"] = errs
    report["failed_requests"] = reqfail
    report["has_rcjs"] = pg.get_attribute("#ramadan-countdown", "data-rc-js")
    report["live_visible"] = pg.is_visible(".rc-live")
    report["static_visible"] = pg.is_visible(".rc-static")
    report["digits"] = {k: txt(f'.rc-live [data-rc="{k}"]') for k in "dhms"}
    report["state"] = txt('[data-rc="state"]')
    report["hijri"] = txt('[data-rc="hijri"]')
    report["hijri_ar"] = txt('[data-rc="hijri-ar"]')
    report["caption"] = txt('[data-rc="caption"]')
    report["caption_alt"] = txt('[data-rc="caption-alt"]')
    report["pct"] = txt('[data-rc="pct"]')
    report["prev"] = txt('[data-rc="prev"]')
    report["next"] = txt('[data-rc="next"]')
    report["sr"] = txt('[data-rc="sr"]')
    report["progress_aria"] = pg.get_attribute('[role="progressbar"]', "aria-valuenow")
    # the timezone control was removed on request — assert it is really gone
    report["zone_control_present"] = pg.eval_on_selector_all(
        "#rc-zone, select, [data-rc=\"caption-alt\"]", "els => els.length")

    # tick accuracy: seconds must advance
    s1 = txt('.rc-live [data-rc="s"]')
    pg.wait_for_timeout(1600)
    s2 = txt('.rc-live [data-rc="s"]')
    report["seconds_ticking"] = f"{s1} -> {s2}"

    # captions must read the same no matter where the page is opened
    report["caption_is_zone_independent"] = txt('[data-rc="caption"]')
    report["cta_links"] = pg.eval_on_selector_all(
        "#ramadan-countdown a[href]", "els => els.map(a => a.href)")
    report["cta_targets_blank"] = pg.eval_on_selector_all(
        '#ramadan-countdown a[target="_blank"]',
        "els => els.every(a => (a.rel || '').includes('noopener'))")
    pg.screenshot(path=str(OUT / "light-auto.png"), full_page=True)

    # dark
    pg.evaluate("""() => {
      document.getElementById('ramadan-countdown').setAttribute('data-rc-theme','dark');
    }""")
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT / "dark.png"), full_page=True)

    # crimson dark
    pg.evaluate("""() => document.getElementById('ramadan-countdown').setAttribute('data-rc-accent','crimson')""")
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "crimson-dark.png"), full_page=True)

    # mobile, light
    pg.evaluate("""() => {
      document.getElementById('ramadan-countdown').setAttribute('data-rc-theme','light');
      document.getElementById('ramadan-countdown').setAttribute('data-rc-accent','ink');
    }""")
    pg.set_viewport_size({"width": 380, "height": 900})
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / "mobile-light.png"), full_page=True)
    ctx.close()

    # ---------- JS disabled ----------
    ctx2 = b.new_context(viewport={"width": 1100, "height": 900}, java_script_enabled=False)
    pg2 = ctx2.new_page()
    pg2.goto(URL, wait_until="load")
    pg2.wait_for_timeout(800)
    report["nojs_live_visible"] = pg2.is_visible(".rc-live")
    report["nojs_static_visible"] = pg2.is_visible(".rc-static")
    report["nojs_static_text"] = pg2.inner_text(".rc-static").replace("\n", " | ")
    pg2.screenshot(path=str(OUT / "nojs.png"), full_page=True)
    ctx2.close()

    # ---------- forced dark OS, component left on auto ----------
    ctx3 = b.new_context(viewport={"width": 1100, "height": 900}, color_scheme="dark")
    pg3 = ctx3.new_page()
    pg3.goto(URL, wait_until="load")
    pg3.wait_for_timeout(2000)
    report["osdark_card_bg"] = pg3.eval_on_selector(".rc-card", "e => getComputedStyle(e).backgroundColor")
    report["osdark_root_theme_attr"] = pg3.get_attribute("#ramadan-countdown", "data-rc-theme")
    ctx3.close()
    b.close()

print(json.dumps(report, indent=2, ensure_ascii=False))
