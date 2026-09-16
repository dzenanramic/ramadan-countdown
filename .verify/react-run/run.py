from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    msgs=[]
    pg.on("console", lambda m: msgs.append(f"{m.type}: {m.text[:200]}") if m.type in ("error","warning") else None)
    pg.on("pageerror", lambda e: msgs.append("pageerror: "+str(e)[:300]))
    pg.goto("file:///home/dzenan/ramadan-countdown/.verify/react-run/ssr.html")
    pg.wait_for_function("window.__DONE__ === true", timeout=20000)
    print(json.dumps({"page_console":msgs, **pg.evaluate("window.__RESULT__")}, indent=2, ensure_ascii=False)[:4200])
    b.close()
