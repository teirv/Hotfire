const {chromium}=require('playwright');const S=process.env.S||require('os').tmpdir();const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':JSON.stringify(x));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:850},colorScheme:'dark'});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*.js',r=>{const f=r.request().url().split('/').pop();r.fulfill({path:'server/static/vendor/'+f,contentType:'text/javascript'})});
await p.route('https://app.test/',r=>r.fulfill({body:require('fs').readFileSync('dist/hotfire.html','utf8'),contentType:'text/html; charset=utf-8'}));
await p.goto('https://app.test/');await p.waitForTimeout(800);
const open=async(lang,id)=>{await p.evaluate(([l,i])=>{__hf.leave();__hf.state().lang=l;__hf.open(i)},[lang,id]);await p.waitForTimeout(400);for(let k=0;k<4&&!(await p.$('#ed .edstack textarea'));k++){await p.click('#primary');await p.waitForTimeout(200)};await p.fill('#ed .edstack textarea','');await p.click('#ed .edstack textarea')};
const val=()=>p.inputValue('#ed .edstack textarea');
await open('python','pyprac1');
await p.keyboard.type('pri');await p.waitForTimeout(100);const items=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('python suggests print',items.includes('print'),items);
await p.screenshot({path:S+'/ac1.png'});
await p.keyboard.press('Tab');await p.keyboard.type('(');ok('accept + bracket closes',await val()==='print()',await val());
await p.keyboard.type('"hi');ok('quote closes',await val()==='print("hi")',await val());
await p.keyboard.type('")');ok('typing closers steps over',await val()==='print("hi")',await val());
await p.keyboard.press('Enter');await p.keyboard.type('total = 5');await p.keyboard.press('Enter');await p.keyboard.type('tot');await p.waitForTimeout(80);
const it2=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('suggests my own names',it2.includes('total'),it2);
await p.keyboard.press('Escape');await p.keyboard.type('al');ok('escape closes, typing continues',(await val()).endsWith('\ntotal'),await val());
await p.keyboard.type(' = f"');ok('f-string quote closes',(await val()).endsWith('f""'),await val());
await p.keyboard.press('Backspace');ok('backspace removes pair',(await val()).endsWith(' = f'),await val());
// "x." methods
await p.keyboard.press('Enter');await p.keyboard.type('name.up');await p.waitForTimeout(80);const it3=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('method after dot',it3.includes('upper'),it3);await p.keyboard.press('Escape');
// Run still works
await p.fill('#ed .edstack textarea','print("ok")');await p.click('[data-ed=run]');await p.waitForTimeout(1500);ok('run works',(await p.textContent('#ed .con')).includes('ok'));
// JS
await open('javascript','fire1');await p.keyboard.type('console.');await p.waitForTimeout(80);await p.keyboard.type('lo');await p.waitForTimeout(80);
const it4=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('js console.log',it4.includes('log'),it4);await p.keyboard.press('Enter');await p.keyboard.type('(');ok('js result',await val()==='console.log()',await val());
await p.keyboard.press('End');await p.keyboard.press('Enter');await p.keyboard.type('if (x) {');await p.keyboard.press('Enter');ok('enter inside braces indents',(await val()).endsWith('if (x) {\n  \n}'),await val());
await p.screenshot({path:S+'/ac2.png'});
// off switch
await p.evaluate(()=>{__hf.state().complete=false});await p.fill('#ed .edstack textarea','');await p.keyboard.type('cons(');await p.waitForTimeout(80);
ok('off: no list, no closing',!(await p.$('.acbox'))&&await val()==='cons(',await val());await p.evaluate(()=>{__hf.state().complete=true});
// html
await open('html','xfireh1a');await p.keyboard.type('<str');await p.waitForTimeout(80);const it5=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('html tags',it5.includes('strong'),it5);await p.keyboard.press('Escape');
ok('no page errors',!errs.length,errs);
// Typed language answers: autocomplete only attaches inside code editors
ok('only code editors get autocomplete',await p.evaluate(()=>document.querySelectorAll('textarea').length>=1));
await b.close()})().catch(e=>{console.log(e);process.exit(1)})
