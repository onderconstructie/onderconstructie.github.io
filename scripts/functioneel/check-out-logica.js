// Check-out: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1000, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/check-out/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const vul = async (naam, w) => { await p.fill('#q-naam', naam).catch(() => {}); await p.fill('#q-idee', 'Idee van ' + naam); for (let i = 0; i < 3; i++) await p.fill('#w' + (i + 1), w[i] || ''); await p.click('#bewaar'); await p.waitForTimeout(150); };
  // 1. Wie drie keer hetzelfde woord typt, telt als één persoon (denken, check-out)
  await vul('Ann', ['Fijn', 'fijn', 'FIJN']); await vul('Bart', ['Moe', 'Mechelen', '']); await vul('Cis', ['fijn', 'Moe', '']);
  await p.click('#tab-ov'); await p.waitForTimeout(200);
  const W = await p.evaluate(() => window.checkout.woorden());
  const fijn = W.find(x => x.w === 'fijn'), moe = W.find(x => x.w === 'moe');
  ok(fijn && fijn.n === 2, '"fijn" van Ann (3 keer) en Cis telt 2 keer (' + JSON.stringify(W) + ')');
  ok(moe && moe.n === 2, '"Moe" van Bart en Cis telt 2 keer');
  const kop = await p.evaluate(() => document.querySelector('#ov-h3').innerText.replace(/\s+/g, ' '));
  ok(/5 woorden, 3 verschillend/.test(kop), 'de kop telt per persoon: 5 woorden, 3 verschillend (' + kop + ')');
  const tekst = await p.evaluate(() => window.checkout.tekst().trim().split('\n').pop());
  ok(/fijn \(2\)/.test(tekst) && !/fijn \(4\)/.test(tekst), 'ook de tekst telt per persoon (' + tekst + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
