// Beslissingen: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.clock.install({ time:new Date('2026-11-15T12:00:00+01:00') });
  await p.goto(B + '/beslissingen/', { waitUntil:'networkidle' }); await p.waitForTimeout(200);
  // 1. Een open actie van een ingetrokken beslissing telt niet als open actie (denken, beslissingen)
  await p.evaluate(() => {
    localStorage.setItem('oc.project', JSON.stringify({ name:'Loket', since:1 }));
    localStorage.setItem('beslissingen.v1', JSON.stringify({ logs:[{ id:'l1', name:'Loket', items:[
      { id:'b1', what:'Loket blijft open op zaterdag', why:'', who:'Stuurgroep', date:'2026-10-01', status:'ingetrokken', created:1, actions:[{ id:'a1', text:'Brief aan personeel', who:'Els', when:'2026-10-10', done:false }] },
      { id:'b2', what:'Nieuwe software kopen', why:'', who:'Stuurgroep', date:'2026-10-02', status:'genomen', created:2, actions:[{ id:'a2', text:'Offerte vragen', who:'Jonas', when:'2026-11-01', done:false }, { id:'a3', text:'Budget vrijmaken', who:'Els', when:'2026-12-01', done:false }] }] }], current:'l1' }));
  });
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const t = (await p.innerText('#count-line')).replace(/\s+/g, ' ');
  ok(/2 open acties, 1 te laat/.test(t) && !/3 open/.test(t), 'telregel: 2 open acties (niet 3), 1 te laat (' + t + ')');
  // 2. Zonder ingetrokken beslissing blijft de telling gewoon
  await p.evaluate(() => { const l = cur(); l.items.find(i => i.id === 'b1').status = 'genomen'; save(); render(); }); await p.waitForTimeout(200);
  const t2 = (await p.innerText('#count-line')).replace(/\s+/g, ' ');
  ok(/3 open acties, 2 te laat/.test(t2), 'weer van kracht: 3 open acties, 2 te laat (' + t2 + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
