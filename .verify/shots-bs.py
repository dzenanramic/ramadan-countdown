"""Snimke ekrana bosanske verzije u svim temama i širinama."""
from playwright.sync_api import sync_playwright
import pathlib
URL = "file:///home/dzenan/ramadan-countdown/ramazan-odbrojavanje.html"
OUT = pathlib.Path("/home/dzenan/ramadan-countdown/.verify")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1100, "height": 900}, device_scale_factor=2)
    pg = ctx.new_page(); pg.goto(URL, wait_until="load"); pg.wait_for_timeout(2500)
    def settheme(t, acc="ink"):
        pg.evaluate("""([t,a]) => {
          const c = document.getElementById('ramadan-countdown');
          c.setAttribute('data-rc-theme', t);
          c.setAttribute('data-rc-accent', a);
        }""", [t, acc])
        pg.wait_for_timeout(600)
    settheme("light"); pg.screenshot(path=str(OUT/"bs-light.png"), full_page=True)
    settheme("dark");  pg.screenshot(path=str(OUT/"bs-dark.png"), full_page=True)
    settheme("dark", "crimson"); pg.screenshot(path=str(OUT/"bs-crimson.png"), full_page=True)
    settheme("light"); pg.set_viewport_size({"width": 380, "height": 900}); pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT/"bs-mobile.png"), full_page=True)
    ctx.close()
    ctx2 = b.new_context(viewport={"width": 1100, "height": 900}, java_script_enabled=False)
    pg2 = ctx2.new_page(); pg2.goto(URL, wait_until="load"); pg2.wait_for_timeout(900)
    pg2.screenshot(path=str(OUT/"bs-nojs.png"), full_page=True)
    ctx2.close(); b.close()
print("snimke spremne")
