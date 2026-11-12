const { chromium } = require('playwright'); const B = (process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8904));
(async () => { const b = await chromium.launch(); let fout = 0; const chk = (ok, wat, extra) => { if (!ok) fout++; console.log((ok ? 'ok   ' : 'FOUT ') + wat + (extra != null ? ' → ' + extra : '')); };
  for (const [w, h, mob] of [[390, 844, true], [1280, 800, false]]) { const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob, serviceWorkers: 'block' }); const p = await c.newPage(), E = [], X = []; p.on('pageerror', e => E.push(String(e).slice(0, 140))); p.on('console', m => { if (m.type() === 'error') E.push('c:' + m.text().slice(0, 120)); }); p.on('request', r => { if (!r.url().startsWith(B) && !/^(data|blob):/.test(r.url())) X.push(r.url()); });
    await p.goto(B + '/zakmes/kompas/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    const zicht = () => p.evaluate(() => ['kp-start', 'kp-aan', 'kp-geen'].filter(id => !document.getElementById(id).hidden).join(','));
    chk(await zicht() === 'kp-start', w + ': opent met de startkaart'); chk(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), w + ': niet te breed'); await p.screenshot({ path: require('os').tmpdir() + `/oc-kp-${w}-1.png` });
    await p.click('#kp-begin'); await p.waitForTimeout(300); chk(await zicht() === 'kp-aan', w + ': Start toont het kompas');
    const stuur = (alpha, beta = 4, gamma = 2) => p.evaluate(([a, be, ga]) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: a, beta: be, gamma: ga, absolute: true })), [alpha, beta, gamma]);
    for (let i = 0; i < 30; i++) await stuur(300); await p.waitForTimeout(200);
    let t = await p.evaluate(() => ({ r: document.getElementById('kp-richting').textContent, g: document.getElementById('kp-graden').textContent, zin: document.getElementById('kp-zin').textContent, rot: document.getElementById('kp-roos').style.transform, plat: document.getElementById('kp-plat').hidden }));
    chk(t.r === 'Noordoost' && /^(5\d|60)°$/.test(t.g) && /rotate\(-(5\d|60)/.test(t.rot), w + ': alpha 300 = richting 60 graden, Noordoost', JSON.stringify(t)); await p.screenshot({ path: require('os').tmpdir() + `/oc-kp-${w}-2.png` });
    // over het noorden heen: van 350 naar 10 graden, de roos draait de korte weg
    for (let i = 0; i < 40; i++) await stuur(10); const voor = await p.evaluate(() => parseFloat(document.getElementById('kp-roos').style.transform.slice(7))); for (let i = 0; i < 40; i++) await stuur(350); const na = await p.evaluate(() => parseFloat(document.getElementById('kp-roos').style.transform.slice(7)));
    chk(Math.abs(na - voor) < 30, w + ': over het noorden draait de roos de korte weg', voor + ' → ' + na); chk((await p.evaluate(() => document.getElementById('kp-richting').textContent)) === 'Noord', w + ': 10 graden = Noord');
    await stuur(350, 70, 5); await p.waitForTimeout(100); chk(!(await p.evaluate(() => document.getElementById('kp-plat').hidden)), w + ': schuin gehouden: de tip om plat te leggen verschijnt');
    // iPhone: webkitCompassHeading
    await p.evaluate(() => { const e = new Event('deviceorientation'); e.webkitCompassHeading = 182; e.beta = 3; e.gamma = 1; for (let i = 0; i < 60; i++) window.dispatchEvent(e); }); chk((await p.evaluate(() => document.getElementById('kp-richting').textContent)) === 'Zuid', w + ': iPhone-richting 182 = Zuid');
    await p.click('#kp-stop'); chk(await zicht() === 'kp-start', w + ': Stop brengt je terug');
    // geen sensor: na 2,5 seconden de melding
    await p.click('#kp-begin'); await p.waitForTimeout(3000); chk(await zicht() === 'kp-geen', w + ': zonder sensor: duidelijke melding', (await p.evaluate(() => document.getElementById('kp-geen').innerText.replace(/\s+/g, ' ').slice(0, 90)))); await p.screenshot({ path: require('os').tmpdir() + `/oc-kp-${w}-3.png` });
    await p.click('#hoe-werkt-dit summary'); await p.waitForTimeout(300);
    chk(!E.length, w + ': geen fouten', E.join(' | ')); chk(!X.length, w + ': geen verzoeken naar buiten', X.join(' ')); await c.close(); }
  console.log('fouten:', fout); await b.close(); })();
