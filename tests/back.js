const {chromium}=require('playwright');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/48db5b89-57b2-5592-8e32-32bbdba1c2f8/scratchpad/n/';
const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':x);
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1000,height:800},colorScheme:'dark'});const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync('dist/hotfire.html','utf8')+'</body></html>'}));await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*',r=>r.abort());
await p.goto('https://app.test/');await p.waitForTimeout(300);
const st=()=>p.evaluate(()=>JSON.parse(JSON.stringify(__hf.state())));
ok('no back on first card',(await (async()=>{await p.click('[data-start=values]');return !(await p.$('[data-prevcard]'))})()));
await p.click('[data-next]');await p.click('[data-next]');
const right=async()=>{for(const o of await p.$$('.opt')){if((await o.textContent()).includes('15')){await o.click();break}}await p.click('#primary');await p.waitForSelector('.verdict.ok')};
await right();ok('back hidden while answered',await p.evaluate(()=>document.querySelector('[data-prevcard]').hidden));await p.click('#primary');
const before=JSON.stringify(await st());
// now on card 3; go back twice
await p.click('[data-prevcard]');ok('review shows answer',await p.$$eval('.opt.right',x=>x.length)===1&&!!(await p.$('.peekwhy')));await p.screenshot({path:S+'back1.png'});
ok('option cannot be answered',await p.$$eval('button.opt',x=>x.length)===0);
await p.click('[data-prevcard]');ok('earlier teaching card shows',!!(await p.$('.prose')));
await p.click('[data-peeknext]');await p.click('[data-peeknext]');ok('returns to current',(await p.$$eval('button.opt',x=>x.length))===3&&!(await p.$('.peeknote')));
ok('nothing changed',JSON.stringify(await st())===before);
// answer current still scores once; finish lesson
for(const o of await p.$$('.opt')){const t=await o.textContent();if(t.includes('10 + 5')&&!t.includes('"')){await o.click();break}}await p.click('#primary');await p.waitForSelector('.verdict');ok('still scorable',true);
// go through other card kinds
await p.click('#primary');await p.click('[data-quit]');await p.click('[data-leave]');
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
