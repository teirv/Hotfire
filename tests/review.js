const {chromium}=require('playwright');const S=process.env.S||require('os').tmpdir();const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x??'');
(async()=>{const b=await chromium.launch();
for(const [w,h,tag] of [[1400,900,'desk'],[400,850,'phone']]){
const p=await b.newPage({viewport:{width:w,height:h},colorScheme:'dark'});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**fonts.g**',r=>r.abort());await p.route('https://app.test/',r=>r.fulfill({body:require('fs').readFileSync('dist/hotfire.html','utf8'),contentType:'text/html; charset=utf-8'}));
await p.goto('https://app.test/');await p.waitForTimeout(800);
await p.evaluate(()=>{__hf.state().lang="python";__hf.open("pyprac3")});await p.waitForTimeout(500);for(let k=0;k<4&&!(await p.$('#ed .edstack textarea'));k++){await p.click('#primary');await p.waitForTimeout(200)};
const before=await p.evaluate(()=>JSON.stringify([__hf.state().xp,__hf.state().done,__hf.state().missed]));
await p.fill('#ed .edstack textarea','print("my work in progress")');await p.waitForTimeout(200);
await p.screenshot({path:`${S}/rev-${tag}-1.png`});
const n=await p.$$eval('.revb',x=>x.length);ok(tag+' review buttons shown',n>0,n);
if(tag==='phone'){await p.click('.revrail summary');await p.waitForTimeout(150)}
await p.screenshot({path:`${S}/rev-${tag}-1b.png`});
await p.click('.revb >> nth=4');await p.waitForTimeout(300);
await p.screenshot({path:`${S}/rev-${tag}-2.png`,fullPage:false});
ok(tag+' lesson open',await p.isVisible('#revpane .revtitle'),await p.textContent('#revpane .revtitle'));
await p.keyboard.press('Escape');await p.waitForTimeout(200);
const code=await p.inputValue('#ed .edstack textarea');ok(tag+' code kept',code.includes('my work in progress'));
const after=await p.evaluate(()=>JSON.stringify([__hf.state().xp,__hf.state().done,__hf.state().missed]));ok(tag+' progress unchanged',before===after);
await p.click('.revb >> nth=0');await p.waitForTimeout(200);await p.click('#revpane .btn:not(.revback)');await p.waitForTimeout(200);ok(tag+' bottom back button',await p.isVisible('#ed'));
// a blank card in a fire keeps the panel after tapping
await p.evaluate(()=>{__hf.state().lang="spanish";__hf.leave();__hf.open("sfire1")});await p.waitForTimeout(400);
for(let k=0;k<3&&!(await p.$('.tok'));k++){const o=await p.$('.opt');if(o){await o.click();await p.click('#primary');await p.waitForTimeout(200);await p.click('#primary');await p.waitForTimeout(300)}}
if(await p.$('.tok')){await p.click('.tok >> nth=0');await p.waitForTimeout(150);ok(tag+' panel survives a tap',!!(await p.$('.revrail')))}
ok(tag+' no page errors',!errs.length,errs.join(';'));await p.close()}
await b.close()})().catch(e=>{console.log(e);process.exit(1)})
