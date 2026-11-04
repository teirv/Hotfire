const {chromium}=require('playwright');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/48db5b89-57b2-5592-8e32-32bbdba1c2f8/scratchpad/n/';
(async()=>{const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1000,height:820},colorScheme:'dark'});const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.addInitScript(()=>{window.__s=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{if(u.text.trim())__s.push([u.lang||'',u.text])},cancel(){},getVoices:()=>[{name:'Microsoft Dalia Online (Natural)',lang:'es-MX',localService:false},{name:'Monica',lang:'es-ES',localService:true},{name:'Samantha',lang:'en-US',localService:true}],addEventListener(){}}})});
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync('dist/hotfire.html','utf8')+'</body></html>'}));await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*',r=>r.abort());
await p.goto('https://app.test/');await p.waitForTimeout(300);
await p.click('[data-lang=spanish]');await p.screenshot({path:S+'es0.png'});console.log('no scratch',!(await p.$('[data-nav=scratch]')));
await p.click('[data-start=ss1]');await p.click('.prose .ja');console.log('tap',JSON.stringify(await p.evaluate(()=>__s.slice(-1))));await p.screenshot({path:S+'es1.png'});
await p.click('[data-next]');await p.click('[data-next]');
const wrong=(await p.$$('.opt'));for(const o of wrong){if((await o.textContent()).includes('sounds like j')){await o.click();break}}await p.click('#primary');await p.waitForSelector('.verdict.bad');await p.waitForTimeout(100);console.log('wrong said',JSON.stringify(await p.evaluate(()=>__s.slice(-3))));await p.click('#primary');
await p.click('.opt:has-text("niño")');await p.click('#primary');await p.waitForSelector('.verdict.ok');console.log('right say',JSON.stringify(await p.evaluate(()=>__s.slice(-1))));await p.click('#primary');
await p.fill('#wans','si');await p.press('#wans','Enter');await p.waitForSelector('.verdict.ok');console.log('accent note',await p.textContent('.msg'));await p.screenshot({path:S+'es2.png'});await p.click('[data-quit]');await p.click('[data-leave]');
// accent key + strict ñ
await p.click('[data-ch="Part 3: Intermediate and Beyond"]');await p.click('[data-start=sfire2]');await p.click('.tok:has-text("era")');await p.click('.tok:has-text("vivía")');await p.screenshot({path:S+'es3.png'});await p.click('#primary');await p.waitForSelector('.verdict.ok');console.log('B say',JSON.stringify(await p.evaluate(()=>__s.slice(-1))));
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
