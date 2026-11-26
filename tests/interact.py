# Clicks through interactive labs and reports any console or page errors.
# usage: python3 tests/interact.py [name,...]
import asyncio, sys, os
from playwright.async_api import async_playwright
ONLY = sys.argv[1].split(',') if len(sys.argv) > 1 else None
W = int(os.environ.get('W', '1366'))

async def lottery(pg):
    await pg.goto('http://localhost:8765/index.html#lab-lottery-choices'); await pg.wait_for_timeout(600)
    for k in [0, 1, 0, 0, 1]:
        await pg.locator('.pick').nth(k).click(); await pg.wait_for_timeout(120)
        await pg.locator('[data-after] button').click(); await pg.wait_for_timeout(150)
    t = await pg.locator('.stage').inner_text(); assert 'inconsistent' in t, 'expected an inconsistency verdict'
    await pg.locator('input[type=range]').first.fill('1800000'); await pg.wait_for_timeout(200)
    return (await pg.locator('[data-cap]').inner_text())[:140]

async def policy(pg):
    await pg.goto('http://localhost:8765/index.html#lab-policy-game'); await pg.wait_for_timeout(600)
    cells = pg.locator('.stage [data-k]'); n = await cells.count()
    for i in range(n): await cells.nth(i).click(); await pg.wait_for_timeout(30)
    await pg.get_by_role('button', name='Check my policy').click(); await pg.wait_for_timeout(200)
    a = await pg.locator('.stats').first.inner_text()
    await pg.get_by_role('button', name='Run 1,000 episodes').click(); await pg.wait_for_timeout(400)
    await pg.get_by_role('button', name='Show the optimal policy').click(); await pg.wait_for_timeout(200)
    b = await pg.locator('.stats').first.inner_text()
    await pg.locator('select').first.select_option('3'); await pg.wait_for_timeout(300)
    await pg.get_by_role('button', name='Show the optimal policy').click(); await pg.wait_for_timeout(200)
    c = await pg.locator('.stats').first.inner_text()
    return ' | '.join(x.replace('\n', ' ') for x in [a, b, c])

async def bandits(pg):
    await pg.goto('http://localhost:8765/index.html#lab-bandits'); await pg.wait_for_timeout(600)
    for i in range(60): await pg.locator('.stage [data-a]').nth(i % 4).click(); await pg.wait_for_timeout(15)
    await pg.wait_for_timeout(900)
    r = await pg.locator('.below .panel').first.inner_text()
    await pg.locator('.seg button:has-text("Compare strategies")').click(); await pg.wait_for_timeout(200)
    await pg.locator('.side button:has-text("Run")').click(); await pg.wait_for_timeout(4000)
    r2 = await pg.locator('.below .panel').first.inner_text()
    return r[:160].replace('\n', ' ') + ' || ' + r2[:200].replace('\n', ' ')

async def ipd(pg):
    await pg.goto('http://localhost:8765/index.html#lab-ipd'); await pg.wait_for_timeout(600)
    for i in range(10): await pg.locator('[data-m="' + ('C' if i % 3 else 'D') + '"]').click(); await pg.wait_for_timeout(40)
    await pg.locator('[data-g="tft"]').click(); await pg.wait_for_timeout(200)
    fb = await pg.locator('[data-fb]').inner_text()
    await pg.locator('.seg button:has-text("Tournament")').click(); await pg.wait_for_timeout(200)
    await pg.get_by_role('button', name='Run tournament').click(); await pg.wait_for_timeout(1500)
    t = await pg.locator('.stage').inner_text()
    return fb[:150].replace('\n', ' ') + ' || ' + t[-200:].replace('\n', ' ')

async def auctions(pg):
    await pg.goto('http://localhost:8765/index.html#lab-auctions'); await pg.wait_for_timeout(600)
    await pg.locator('.seg button:has-text("Play ten rounds")').click(); await pg.wait_for_timeout(200)
    for i in range(10):
        await pg.locator('[data-bid]').fill(str(40 + i)); await pg.locator('[data-go]').click(); await pg.wait_for_timeout(80)
        await pg.locator('[data-res] button').click(); await pg.wait_for_timeout(80)
    return (await pg.locator('.stage').inner_text())[:200].replace('\n', ' ')

async def grid(pg):
    await pg.goto('http://localhost:8765/index.html#lab-gridworld-mdp'); await pg.wait_for_timeout(700)
    await pg.locator('label.switch').click(); await pg.wait_for_timeout(500)
    await pg.locator('.player [data-a="first"]').click(); await pg.locator('.player [data-a="next"]').click(); await pg.locator('.player [data-a="next"]').click(); await pg.wait_for_timeout(200)
    a = await pg.locator('.explain').first.inner_text()
    await pg.locator('.seg button:has-text("Policy iteration")').click(); await pg.wait_for_timeout(400)
    await pg.locator('.seg button:has-text("4th ed.")').click(); await pg.wait_for_timeout(400)
    b = await pg.locator('.explain').first.inner_text()
    await pg.locator('.side input[type=range]').first.fill('-2'); await pg.wait_for_timeout(400)
    await pg.locator('.side input[type=range]').nth(2).fill('1'); await pg.wait_for_timeout(400)
    return a[:160].replace('\n', ' ') + ' || ' + b[:120]

async def misc(pg):
    out = []
    await pg.goto('http://localhost:8765/index.html#lab-value-of-info'); await pg.wait_for_timeout(500)
    await pg.locator('.seg button:has-text("Two options")').click(); await pg.wait_for_timeout(200)
    await pg.get_by_role('button', name='Close, and it matters').click(); await pg.wait_for_timeout(300); out.append((await pg.locator('.stats').first.inner_text()).replace('\n', ' '))
    await pg.goto('http://localhost:8765/index.html#lab-voting'); await pg.wait_for_timeout(500)
    for v in ['cycle', 'rules', 'custom']: await pg.locator('select').first.select_option(v); await pg.wait_for_timeout(200)
    out.append((await pg.locator('.stage').inner_text())[:120].replace('\n', ' '))
    await pg.goto('http://localhost:8765/index.html#lab-normal-form'); await pg.wait_for_timeout(500)
    await pg.locator('select').first.select_option('morra'); await pg.wait_for_timeout(300); out.append((await pg.locator('.side .explain').inner_text())[:160].replace('\n', ' '))
    await pg.goto('http://localhost:8765/index.html#lab-urn-model'); await pg.wait_for_timeout(500)
    await pg.get_by_role('button', name='Run 20,000 weighted samples').click(); await pg.wait_for_timeout(1200); out.append(await pg.locator('.side .explain').last.inner_text())
    await pg.goto('http://localhost:8765/index.html#lab-hmm-localize'); await pg.wait_for_timeout(500)
    for i in range(4): await pg.get_by_role('button', name='Move and sense').click(); await pg.wait_for_timeout(60)
    await pg.locator('label.switch').click(); await pg.wait_for_timeout(100)
    await pg.get_by_role('button', name='Move and sense').click(); await pg.wait_for_timeout(100)
    await pg.locator('.stage .cell').nth(5).click(); await pg.get_by_role('button', name='Reveal the robot').click(); await pg.wait_for_timeout(200)
    out.append((await pg.locator('.stats').first.inner_text()).replace('\n', ' '))
    await pg.goto('http://localhost:8765/index.html#lab-umbrella-hmm'); await pg.wait_for_timeout(500)
    await pg.locator('[data-d="2"]').click(); await pg.get_by_role('button', name='Add a day').click(); await pg.wait_for_timeout(200)
    out.append((await pg.locator('.below table').inner_text())[:100].replace('\n', ' '))
    return ' || '.join(out)

TESTS = dict(lottery=lottery, policy=policy, bandits=bandits, ipd=ipd, auctions=auctions, grid=grid, misc=misc)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        for name, fn in TESTS.items():
            if ONLY and name not in ONLY: continue
            pg = await b.new_page(viewport={'width': W, 'height': 900}); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            try: res = await fn(pg)
            except Exception as e: res = 'EXCEPTION ' + str(e)[:300]
            print(('OK  ' if not errs and not res.startswith('EXCEPTION') else 'ERR ') + name.ljust(9), res)
            for e in errs: print('     ', e[:300])
            await pg.close()
        await b.close()
asyncio.run(main())
