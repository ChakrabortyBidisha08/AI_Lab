# Opens every page of the site from disk and reports pages that keep growing by themselves,
# pages wider than the window, and JavaScript errors.
# usage: python3 tests/layout_check.py [width ...]      (default widths: 1280 and 390)
# needs: pip install playwright && playwright install chromium   (or set CHROME to a Chrome binary)
import asyncio, os, sys, pathlib
from playwright.async_api import async_playwright

SITE = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
WIDTHS = [int(a) for a in sys.argv[1:]] or [1280, 390]

async def check(p, width):
    b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    pg = await b.new_page(viewport={'width': width, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
    await pg.goto(SITE + '#home'); await pg.wait_for_timeout(500)
    routes = await pg.evaluate("""['home', 'labs', 'practice', 'papers', 'about']
        .concat(AI.chapters.map(c => c.id), AI.chapters.map(c => 'quiz-' + (typeof c.n === 'number' ? c.n : 'G20')),
                AI.labOrder.map(id => 'lab-' + id))""")
    growing, too_wide = [], []
    for r in routes:
        await pg.goto(f'{SITE}#{r}'); await pg.wait_for_timeout(700)
        h1 = await pg.evaluate('document.documentElement.scrollHeight')
        await pg.wait_for_timeout(1300)
        h2 = await pg.evaluate('document.documentElement.scrollHeight')
        if abs(h2 - h1) > 4: growing.append(f'{r} ({h1} → {h2} px)')
        extra = await pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        if extra > 0: too_wide.append(f'{r} (+{extra} px)')
    await b.close()
    print(f'width {width}: {len(routes)} pages')
    for label, items in (('keeps growing', growing), ('wider than the window', too_wide), ('JavaScript errors', errors)):
        print(f'  {label}: ' + (', '.join(items) if items else 'none'))
    return not (growing or too_wide or errors)

async def main():
    async with async_playwright() as p:
        results = [await check(p, w) for w in WIDTHS]
    print('all passed' if all(results) else 'PROBLEMS FOUND'); sys.exit(0 if all(results) else 1)

asyncio.run(main())
