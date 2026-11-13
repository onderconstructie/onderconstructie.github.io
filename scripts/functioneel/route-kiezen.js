const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8977);
(async () => { const b = await chromium.launch(); for (const [W, naam] of [[390, 'g'], [1280, 'd']]) { const c = await b.newContext({ viewport: { width: W, height: 844 }, hasTouch: W < 500, isMobile: W < 500, serviceWorkers: 'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 120)));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('.stile[data-start="project"]'); await p.waitForTimeout(500); await p.keyboard.type('Nieuw loket'); await p.screenshot({ path: `v/${naam}1.png` });
  // toetsenbord: Tab loopt langs naam, Kort, Uitgebreid, Overslaan, Verder
  const rond = []; for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); rond.push(await p.evaluate(() => (document.activeElement.innerText || document.activeElement.id).replace(/\s+/g, ' ').slice(0, 22))); }
  await p.click('[data-pn-route="vol"]'); await p.waitForTimeout(150); await p.click('[data-pn-route="kort"]'); await p.click('#pn-ok'); await p.waitForTimeout(1300); await p.screenshot({ path: `v/${naam}2.png` });
  const balk = await p.evaluate(() => document.querySelector('#pathbar .pb-where').getAttribute('aria-label') + ' | knop ' + Math.round(document.querySelector('#pathbar .pb-where').getBoundingClientRect().width) + 'x' + Math.round(document.querySelector('#pathbar .pb-where').getBoundingClientRect().height));
  await p.click('#pathbar .pb-where'); await p.waitForTimeout(900); await p.screenshot({ path: `v/${naam}3.png` });
  const st = await p.evaluate(() => { const e = document.querySelector('.path[data-path="project"]'); return { open: e.classList.contains('open'), top: Math.round(e.getBoundingClientRect().top), stappen: e.querySelectorAll('ol.steps > li').length, aan: e.querySelector('.rk.aan').innerText.replace(/\s+/g, ' '), focus: document.activeElement.className }; });
  console.log(W, '| tab:', rond.join(' > '), '\n   balk:', balk, '\n   na tik:', JSON.stringify(st), 'fouten', E.length);
  if (W === 390) { // uitgebreid kiezen in de vraag bij een ander plan
    await p.evaluate(() => scrollTo(0, 0)); await p.click('.stile[data-start="proces"]', { timeout: 4000 }).catch(e => console.log('   geen tegel proces')); await p.waitForTimeout(600); if (await p.$('#pn-ok:visible')) { await p.click('[data-pn-route="vol"]'); await p.click('#pn-skip'); await p.waitForTimeout(1200); console.log('   proces, uitgebreid + overslaan:', await p.evaluate(() => document.querySelector('#pathbar .pb-where').getAttribute('aria-label'))); } }
  await c.close(); } await b.close(); })();
