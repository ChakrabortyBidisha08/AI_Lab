import asyncio, sys, json, os
from playwright.async_api import async_playwright
ROUTES = sys.argv[1].split(',') if len(sys.argv) > 1 else ['home']
SHOT = os.environ.get('SHOT', '')
W = int(os.environ.get('W', '1366')); H = int(os.environ.get('H', '900'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = await b.new_page(viewport={'width': W, 'height': H}, color_scheme=os.environ.get('SCHEME','light'))
        errs = []
        pg.on('console', lambda m: errs.append(('console', m.text)) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
        await pg.goto('http://localhost:8765/index.html#home'); await pg.wait_for_timeout(700)
        for r in ROUTES:
            before = len(errs)
            await pg.evaluate(f"location.hash = '{r}'"); await pg.wait_for_timeout(int(os.environ.get('WAIT','900')))
            title = await pg.title(); h1 = await pg.evaluate("(document.querySelector('h1')||{}).textContent || ''")
            new = errs[before:]
            print(('OK  ' if not new else 'ERR ') + r.ljust(26), '|', h1[:50], '|', title[:40])
            for e in new: print('     ', e)
            if SHOT and (SHOT == 'all' or r in SHOT.split(',')):
                await pg.screenshot(path=f'/tmp/shot_{r}_{W}.png', full_page=os.environ.get('FULL','1')=='1')
        await b.close()
asyncio.run(main())
