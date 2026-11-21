const { chromium } = require('playwright');(async()=>{const b=await chromium.launch();let fout=0;const ok=(c,m)=>{console.log((c?'ok   ':'FOUT ')+m);if(!c)fout++;};
for(const vp of [{width:390,height:844},{width:1280,height:800}]){
const c=await b.newContext({viewport:vp,serviceWorkers:'block',hasTouch:vp.width<500,deviceScaleFactor:2});
const p=await c.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);fout++;});
await p.addInitScript(()=>{if(localStorage.getItem('zaad'))return;localStorage.setItem('zaad','1');localStorage.setItem('oc-app.welkom-weg','1');
const it=(a)=>a.map((t,i)=>({id:'i'+i+t.length,text:t,done:false}));
localStorage.setItem('vinkje.v1',JSON.stringify({lists:[{id:'a1',name:'Verhuis kantoor',items:it(['Dozen bestellen','Kabels labelen'])},{id:'b2',name:'Opendeurdag',items:it(['Affiche','Catering'])},{id:'c3',name:'Nieuwsbrief december',items:it(['Teksten','Foto kiezen'])},{id:'d4',name:'Teamdag',items:it(['Zaal'])},{id:'e5',name:'Jaarverslag',items:it(['Cijfers'])}],current:'a1'}));});
const B=(process.env.BASE||'http://127.0.0.1:8970')+'/';
await p.goto(B,{waitUntil:'networkidle'});await p.waitForTimeout(600);
await p.evaluate(()=>openTool('vinkje'));await p.waitForTimeout(2500);
await p.evaluate(()=>showHome());await p.waitForTimeout(700);
const rij=()=>p.evaluate(()=>{const e=document.getElementById('rs-lijst');return e.hidden?'(verborgen)':e.innerText.replace(/\s+/g,' ').trim()});
const sub=()=>p.evaluate(()=>document.querySelector('#resume .rs-body > span').textContent);
let t=await rij();console.log(vp.width,'rij:',t,'| sub:',await sub());
ok(/Of open:/.test(t)&&/Opendeurdag/.test(t)&&/Nieuwsbrief december/.test(t)&&/en nog [12]/.test(t)&&!/Verhuis/.test(t),'drie andere lijsten en "en nog 1", zonder de actieve');
ok(await sub()==='Verhuis kantoor','de grote knop noemt de actieve lijst');
await p.screenshot({path:''+(process.env.SHOTS||'/home/claude/tests/shots/look')+'/lijst-na-'+vp.width+'.png'});
await p.click('#rs-lijst [data-lijst="c3"]');await p.waitForTimeout(1500);
ok(await p.evaluate(()=>current)==='vinkje','de tool staat open');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('vinkje.v1')).current)==='c3','de gekozen lijst is actief in de tool');
await p.evaluate(()=>showHome());await p.waitForTimeout(600);
ok(await sub()==='Nieuwsbrief december','terug op Start: de grote knop noemt de nieuwe actieve lijst');
// na herladen: uit het geheugen van de app
await p.goto(B,{waitUntil:'networkidle'});await p.waitForTimeout(900);t=await rij();
ok(/Verhuis kantoor/.test(t)&&!/Nieuwsbrief/.test(t),'na herladen staat de regel er nog (uit oc-app.lijsten): '+t);
await p.click('#rs-lijst [data-lijst="b2"]');await p.waitForTimeout(3500);
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('vinkje.v1')).current)==='b2','na herladen: kiezen opent de juiste lijst in een verse tool');
await p.evaluate(()=>showHome());await p.waitForTimeout(600);
await p.click('#rs-lijst [data-lijst-meer]:visible');await p.waitForTimeout(1500);
ok(await p.evaluate(()=>{const w=frames.get('vinkje').contentWindow;const m=w.document.querySelector('.oc-pk-menu, [role=menu]');return !!m&&!m.hidden}),'"en nog" opent de kiezer in de tool');
await p.screenshot({path:''+(process.env.SHOTS||'/home/claude/tests/shots/look')+'/lijst-menu-'+vp.width+'.png'});
// een verdwenen lijst: gewoon de tool openen
await p.evaluate(()=>showHome());await p.waitForTimeout(500);
await p.evaluate(()=>{const b=document.querySelector('#rs-lijst [data-lijst]');b.dataset.lijst='bestaat-niet';b.click()});await p.waitForTimeout(1200);
ok(await p.evaluate(()=>current)==='vinkje'&&await p.evaluate(()=>JSON.parse(localStorage.getItem('vinkje.v1')).current)==='b2','een lijst die weg is: de tool opent zoals ze was');
// één lijst: geen regel
await p.evaluate(()=>{showHome();const d=JSON.parse(localStorage.getItem('vinkje.v1'));d.lists=d.lists.slice(0,1);d.current=d.lists[0].id;localStorage.setItem('vinkje.v1',JSON.stringify(d));dropFrame('vinkje');});
await p.evaluate(()=>openTool('vinkje'));await p.waitForTimeout(2500);await p.evaluate(()=>showHome());await p.waitForTimeout(600);
ok(await rij()==='(verborgen)','met één lijst staat er geen regel');
await c.close();}
await b.close();console.log('fouten: '+fout);process.exit(fout?1:0)})()
