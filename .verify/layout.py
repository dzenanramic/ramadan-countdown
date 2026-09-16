from playwright.sync_api import sync_playwright
import json, pathlib
import sys as _sys
URL = _sys.argv[1] if len(_sys.argv) > 1 else "file:///home/dzenan/ramadan-countdown/ramadan-countdown.html"
out=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h,label in [(320,800,"320"),(380,800,"380"),(640,900,"640"),(768,900,"768"),(1100,900,"1100"),(1440,900,"1440")]:
        ctx=b.new_context(viewport={"width":w,"height":h})
        pg=ctx.new_page(); pg.goto(URL,wait_until="load"); pg.wait_for_timeout(1800)
        r=pg.evaluate("""() => {
          const doc=document.documentElement;
          const card=document.querySelector('.rc-card');
          const cb=card.getBoundingClientRect();
          const units=[...document.querySelectorAll('.rc-live .rc-unit')].map(u=>{
            const n=u.querySelector('.rc-num'), l=u.querySelector('.rc-label');
            const nb=n.getBoundingClientRect(), lb=l.getBoundingClientRect();
            return {num:n.textContent, numTop:+nb.top.toFixed(1), numBottom:+nb.bottom.toFixed(1),
                    numLeft:+nb.left.toFixed(1), numRight:+nb.right.toFixed(1),
                    labTop:+lb.top.toFixed(1), labLeft:+lb.left.toFixed(1), labRight:+lb.right.toFixed(1),
                    unitTop:+u.getBoundingClientRect().top.toFixed(1),
                    unitLeft:+u.getBoundingClientRect().left.toFixed(1),
                    unitRight:+u.getBoundingClientRect().right.toFixed(1),
                    borderTop:getComputedStyle(u).borderTopWidth, borderRight:getComputedStyle(u).borderRightWidth,
                    fontSize:getComputedStyle(n).fontSize, color:getComputedStyle(n).color};
          });
          const oob=[...document.querySelectorAll('#ramadan-countdown *')].filter(e=>{
            const r=e.getBoundingClientRect();
            return r.width>0 && (r.left < cb.left-1 || r.right > cb.right+1);
          }).map(e=>e.className+'|'+e.tagName+'|'+e.getBoundingClientRect().right.toFixed(1));
          return {
            scrollW:doc.scrollWidth, clientW:doc.clientWidth,
            hOverflow: doc.scrollWidth > doc.clientWidth,
            cardW:+cb.width.toFixed(1),
            units, outOfCard:oob.slice(0,6),
            mismatchedRow: (()=>{ const t=new Set(units.map(u=>u.numBottom)); return t.size; })(),
            clipped: [...document.querySelectorAll('#ramadan-countdown *')].filter(e=>
              e.children.length===0 && e.scrollWidth > e.clientWidth+1).map(e=>e.className+'|'+e.textContent.slice(0,20)),
          };
        }""")
        r["viewport"]=label
        out.append(r); ctx.close()
    b.close()
print(json.dumps(out,indent=1))
