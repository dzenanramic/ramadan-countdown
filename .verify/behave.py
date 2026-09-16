from playwright.sync_api import sync_playwright
import json
import sys as _sys
URL = _sys.argv[1] if len(_sys.argv) > 1 else "file:///home/dzenan/ramadan-countdown/ramadan-countdown.html"
R={}
def card_bg(pg): return pg.eval_on_selector(".rc-card","e=>getComputedStyle(e).backgroundColor")
with sync_playwright() as p:
    b=p.chromium.launch()

    # --- 1. ShadCN class strategy: <html class="dark"> must reach the component
    ctx=b.new_context(viewport={"width":1100,"height":900})
    pg=ctx.new_page(); pg.goto(URL,wait_until="load"); pg.wait_for_timeout(1500)
    R["auto_light_bg"]=card_bg(pg)
    pg.evaluate("document.documentElement.classList.add('dark')"); pg.wait_for_timeout(200)
    R["html_dark_class_bg"]=card_bg(pg)
    pg.evaluate("document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')")
    pg.wait_for_timeout(200); R["html_light_class_bg"]=card_bg(pg)
    pg.evaluate("document.documentElement.classList.remove('light')")
    # forced attribute wins
    pg.evaluate("document.getElementById('ramadan-countdown').setAttribute('data-rc-theme','dark')")
    pg.wait_for_timeout(200); R["forced_dark_bg"]=card_bg(pg)
    # accent variant
    pg.evaluate("document.getElementById('ramadan-countdown').setAttribute('data-rc-accent','crimson')")
    pg.wait_for_timeout(200)
    R["crimson_rail"]=pg.eval_on_selector(".rc-card","e=>getComputedStyle(e).borderLeftColor")
    R["crimson_days"]=pg.eval_on_selector(".rc-unit .rc-num","e=>getComputedStyle(e).color")
    R["crimson_cta_bg"]=pg.eval_on_selector(".rc-cta","e=>getComputedStyle(e).backgroundColor")
    R["crimson_cta_fg"]=pg.eval_on_selector(".rc-cta","e=>getComputedStyle(e).color")
    pg.evaluate("document.getElementById('ramadan-countdown').setAttribute('data-rc-accent','ink')")
    pg.evaluate("document.getElementById('ramadan-countdown').setAttribute('data-rc-theme','light')")
    pg.wait_for_timeout(200)

    # --- 2. focus visibility
    pg.focus(".rc-cta"); pg.wait_for_timeout(150)
    R["cta_focus"]=pg.eval_on_selector(".rc-cta","e=>{const s=getComputedStyle(e);return s.outlineStyle+' '+s.outlineWidth+' '+s.outlineColor+' off '+s.outlineOffset}")
    R["selects_remaining"]=pg.eval_on_selector_all("select","els=>els.length")
    pg.focus(".rc-ghost"); pg.wait_for_timeout(150)
    R["ghost_focus"]=pg.eval_on_selector(".rc-ghost","e=>{const s=getComputedStyle(e);return s.outlineStyle+' '+s.outlineWidth+' '+s.outlineColor}")

    # --- 3. hover micro-interactions
    before=pg.eval_on_selector(".rc-card","e=>getComputedStyle(e).transform")
    pg.hover(".rc-card"); pg.wait_for_timeout(400)
    after=pg.eval_on_selector(".rc-card","e=>getComputedStyle(e).transform")
    R["card_hover_transform"]=f"{before} -> {after}"
    R["card_hover_border"]=pg.eval_on_selector(".rc-card","e=>getComputedStyle(e).borderTopColor")
    pg.hover(".rc-cta"); pg.wait_for_timeout(400)
    R["cta_hover_bg"]=pg.eval_on_selector(".rc-cta","e=>getComputedStyle(e).backgroundColor")
    R["cta_hover_arrow"]=pg.eval_on_selector(".rc-cta svg","e=>getComputedStyle(e).transform")

    # --- 4. digit animation fires
    pg.mouse.move(5,5); pg.wait_for_timeout(300)
    anim=pg.evaluate("""async () => {
      const s=document.querySelector('.rc-live [data-rc="s"]');
      const seen=new Set();
      for(let i=0;i<40;i++){ s.getAnimations().forEach(a=>seen.add(a.animationName||a.constructor.name)); await new Promise(r=>setTimeout(r,100)); }
      return [...seen];
    }""")
    R["digit_animations_seen"]=anim

    # --- 5. ruler consistency
    R["ruler"]=pg.evaluate("""() => {
      const t=document.querySelector('[role=progressbar]'), f=document.querySelector('.rc-fill');
      return {now:t.getAttribute('aria-valuenow'), text:t.getAttribute('aria-valuetext'),
              fillW:getComputedStyle(f).width, trackW:getComputedStyle(t.parentElement).width,
              pct:document.querySelector('[data-rc=pct]').textContent,
              trackH:getComputedStyle(t).height, fillBg:getComputedStyle(f).backgroundColor};
    }""")

    # --- 6. captions in reference vs display zone
    R["cap_default"]=pg.inner_text('[data-rc="caption"]')
    R["caption_alt_removed"]=pg.eval_on_selector_all('[data-rc="caption-alt"]',"e=>e.length")
    R["ruler_prev_next"]=pg.inner_text('[data-rc="prev"]')+" | "+pg.inner_text('[data-rc="next"]')
    R["caption_zone_independent"]=pg.inner_text('[data-rc="caption"]')
    R["cta_href"]=pg.eval_on_selector(".rc-cta","e=>e.href")
    R["cta_new_tab"]=pg.eval_on_selector(".rc-cta","e=>e.target+'/'+e.rel")
    R["ghost_href"]=pg.eval_on_selector(".rc-ghost","e=>e.href")
    ctx.close()

    # --- 7. reduced motion
    ctx2=b.new_context(viewport={"width":1100,"height":900},reduced_motion="reduce")
    pg2=ctx2.new_page(); pg2.goto(URL,wait_until="load"); pg2.wait_for_timeout(1500)
    R["rm_digit_anim"]=pg2.evaluate("""async () => {
      const s=document.querySelector('.rc-live [data-rc="s"]'); const seen=new Set();
      for(let i=0;i<25;i++){ s.getAnimations().forEach(a=>seen.add(a.animationName)); await new Promise(r=>setTimeout(r,100)); }
      return [...seen];
    }""")
    pg2.hover(".rc-card"); pg2.wait_for_timeout(300)
    R["rm_card_transform"]=pg2.eval_on_selector(".rc-card","e=>getComputedStyle(e).transform")
    R["rm_transition"]=pg2.eval_on_selector(".rc-card","e=>getComputedStyle(e).transitionDuration")
    R["rm_still_counts"]=pg2.inner_text('.rc-live [data-rc="d"]')
    ctx2.close()

    # --- 8. tab-hidden resync (clock jump robustness)
    ctx3=b.new_context(viewport={"width":1100,"height":900})
    pg3=ctx3.new_page(); pg3.goto(URL,wait_until="load"); pg3.wait_for_timeout(1000)
    R["clock_jump"]=pg3.evaluate("""async () => {
      const before=document.querySelector('.rc-live [data-rc="d"]').textContent;
      return {before};
    }""")
    ctx3.close()
    b.close()
print(json.dumps(R,indent=2,ensure_ascii=False))
