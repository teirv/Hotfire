const {chromium}=require('playwright');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/48db5b89-57b2-5592-8e32-32bbdba1c2f8/scratchpad/n/';
(async()=>{const b=await chromium.launch();
const open=async(o)=>{const c=await b.newContext(o);const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.addInitScript(()=>{window.__s=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{if(u.text.trim())__s.push([u.lang||'',u.text])},cancel(){},getVoices:()=>[{name:'Microsoft Nanami',lang:'ja-JP',localService:true},{name:'Samantha',lang:'en-US',localService:true}],addEventListener(){}}})});
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync('dist/hotfire.html','utf8')+'</body></html>'}));await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*',r=>r.abort());
await p.goto('https://app.test/');await p.waitForTimeout(300);return p};
let p=await open({viewport:{width:1000,height:820},colorScheme:'light'});
await p.click('[data-lang=japanese]');await p.screenshot({path:S+'ja0.png'});
console.log('scratch hidden',!(await p.$('[data-nav=scratch]')));
await p.click('[data-start=hga]');await p.screenshot({path:S+'ja1.png'});await p.click('.prose .ja');console.log('tap',JSON.stringify(await p.evaluate(()=>__s.slice(-1))));
await p.click('[data-next]');
const ch=await p.textContent('.bigja');await p.fill('#wans','zzz');await p.press('#wans','Enter');await p.waitForSelector('.verdict.bad');console.log('wrong',ch,(await p.textContent('#coach')));console.log('said',JSON.stringify(await p.evaluate(()=>__s.slice(-4))));await p.screenshot({path:S+'ja2.png'});await p.click('#primary');
// jump to a kanji lesson with ruby
await p.click('[data-quit]');await p.click('[data-leave]');
await p.click('[data-ch="Part 3: Intermediate and Beyond"]');await p.click('[data-start=jre1]');await p.screenshot({path:S+'ja3.png'});
await p.click('.prose .ja');console.log('sentence',JSON.stringify(await p.evaluate(()=>__s.slice(-1))).slice(0,120));console.log('ruby count',await p.$$eval('ruby',r=>r.length));
await p.click('[data-next]');await p.screenshot({path:S+'ja4.png'});await p.click('[data-quit]');await p.click('[data-leave]');
await p.click('[data-start=jfire2]');await p.click('.tok:has-text("を")');await p.click('.tok:has-text("たい")');await p.screenshot({path:S+'ja5.png'});await p.click('#primary');await p.waitForSelector('.verdict.ok');console.log('B ok say',JSON.stringify(await p.evaluate(()=>__s.slice(-1))).slice(0,100));await p.click('#primary');await p.click('[data-quit]');await p.click('[data-leave]');
// html
await p.click('[data-lang=html]');await p.screenshot({path:S+'h0.png'});await p.click('[data-ch="CSS: Beginner and Intermediate"]');await p.click('[data-start=c3a]');await p.waitForTimeout(200);
const pv=()=>p.evaluate(()=>{const b=document.querySelector('.pvhost').shadowRoot.querySelector('.bar');return b&&getComputedStyle(b).display});console.log('flex preview',await pv());await p.screenshot({path:S+'h1.png'});
await p.click('[data-quit]').catch(()=>{});if(await p.$('[data-leave]'))await p.click('[data-leave]');
await p.click('[data-nav=scratch]');await p.waitForTimeout(100);console.log('scratch preview',await p.evaluate(()=>getComputedStyle(document.querySelector('.pvhost').shadowRoot.querySelector('h1')).color));
const m=await open({viewport:{width:390,height:800},isMobile:true,hasTouch:true,colorScheme:'dark'});
await m.click('[data-lang=japanese]');await m.screenshot({path:S+'m0.png'});console.log('m',await m.evaluate(()=>document.documentElement.scrollWidth-innerWidth));await m.click('[data-start=hga]');await m.click('[data-next]');await m.screenshot({path:S+'m1.png'});console.log('m',await m.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
