# Visit every route; report console/page errors and suspicious text (undefined, NaN, [object).
import asyncio, os, sys, re
from playwright.async_api import async_playwright
W = int(os.environ.get('W', '1366')); SCHEME = os.environ.get('SCHEME', 'light')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = await b.new_page(viewport={'width': W, 'height': 900}, color_scheme=SCHEME)
        errs = []
        pg.on('console', lambda m: errs.append(('console', m.text)) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
        await pg.goto('http://localhost:8765/index.html#home'); await pg.wait_for_timeout(800)
        labs = await pg.evaluate('Object.keys(AI.labs)')
        chs = await pg.evaluate('AI.chapters.map(c => String(c.n))')
        routes = ['home', 'labs', 'practice', 'papers', 'about'] + ['ch-' + c for c in chs] + ['quiz-' + c for c in chs] + ['lab-' + l for l in labs]
        bad = 0
        for r in routes:
            before = len(errs)
            await pg.evaluate(f"location.hash = '{r}'"); await pg.wait_for_timeout(int(os.environ.get('WAIT', '450')))
            txt = await pg.evaluate("document.querySelector('main').innerText")
            sus = [m for m in re.findall(r'\b(NaN|\[object Object\]|null)\b', txt)]
            if os.environ.get('OVERFLOW'):
                ov = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth, [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 2 && !e.closest('.scroll') && getComputedStyle(e).position !== 'fixed').slice(0,3).map(e => e.tagName + '.' + (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className))]")
                if ov[0] > ov[1] + 1: sus.append(f'overflow {ov[0]}>{ov[1]} {ov[2]}')
            new = errs[before:]
            if new or sus:
                bad += 1; print('ERR', r, sus[:5]); [print('    ', e) for e in new[:4]]
        print(f'{len(routes)} routes visited ({len(labs)} labs, {len(chs)} chapters); {bad} with problems')
        await b.close()
asyncio.run(main())
