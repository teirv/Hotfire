const {chromium}=require('playwright');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/48db5b89-57b2-5592-8e32-32bbdba1c2f8/scratchpad/n/';
const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':x);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1000,height:800},colorScheme:'dark'})).newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync('dist/hotfire.html','utf8')+'</body></html>'}));await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*',r=>r.abort());
await p.goto('https://app.test/');await p.waitForTimeout(300);
const st=()=>p.evaluate(()=>JSON.stringify(__hf.state()));
await p.click('[data-ch="Chapter 1: JavaScript Fundamentals"]').catch(()=>{});
await p.evaluate(()=>{__hf.state().at.forloop=5;__hf.open('forloop')});await p.waitForTimeout(100);
ok('clickable up to current',await p.$$eval('button.segb',x=>x.length)===6);ok('future not clickable',await p.$$eval('span.segb',x=>x.length)>0);
await p.fill('#ed-ta','for (let i = 1; i <= 2; i++) {\n}\n');const s0=await st();
await p.click('[data-seg="1"]');ok('jumps to card 2',(await p.textContent('.seg .look')==='' )&&!!(await p.$('.peeknote')));ok('card 2 highlighted',await p.$eval('[data-seg="1"] i',x=>x.classList.contains('look')));
await p.screenshot({path:S+'seg.png'});
await p.click('[data-seg="3"]');ok('jumps forward',await p.$eval('[data-seg="3"] i',x=>x.classList.contains('look')));
await p.click('[data-seg="5"]');ok('current restored',!(await p.$('.peeknote')));ok('typed code kept',(await p.inputValue('#ed-ta')).includes('i <= 2'));
await p.waitForTimeout(100);const a=JSON.parse(s0),z=JSON.parse(await st());ok('progress same',z.xp===a.xp&&JSON.stringify(z.at)===JSON.stringify(a.at)&&JSON.stringify(z.missed)===JSON.stringify(a.missed));
await p.fill('#ed-ta','for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}\n');await p.click('#primary');await p.waitForSelector('.verdict.ok');ok('locked after answer',await p.$$eval('button.segb',x=>x.every(b=>b.disabled)));
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
