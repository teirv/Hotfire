const {chromium}=require('playwright');const S=process.env.S||require('os').tmpdir();const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':JSON.stringify(x));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:900},colorScheme:'dark'});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*.js',r=>{const f=r.request().url().split('/').pop();r.fulfill({path:'server/static/vendor/'+f,contentType:'text/javascript'})});
await p.route('**/api/run',async r=>{const res=await fetch('http://127.0.0.1:8101/run',{method:'POST',body:r.request().postData(),headers:{'content-type':'application/json'}});r.fulfill({status:res.status,body:await res.text(),contentType:'application/json'})});
await p.route('https://app.test/',r=>r.fulfill({body:require('fs').readFileSync('dist/hotfire.html','utf8'),contentType:'text/html; charset=utf-8'}));
await p.addInitScript(()=>{window.__hotfireRunner=true});
await p.goto('https://app.test/');await p.waitForTimeout(800);
const open=async(lang,id)=>{await p.evaluate(([l,i])=>{__hf.leave();__hf.state().lang=l;__hf.open(i)},[lang,id]);await p.waitForTimeout(400);for(let k=0;k<4&&!(await p.$('#ed .edstack textarea'));k++){await p.click('#primary');await p.waitForTimeout(200)}};
const runWith=async(code,input)=>{await p.fill('#ed .edstack textarea',code);if(input!==null)await p.fill('#ed-in',input);await p.click('#ed [data-ed=run]');await p.waitForFunction(()=>!document.querySelector('#ed [data-ed=run]').disabled,null,{timeout:20000});await p.waitForTimeout(200);return (await p.textContent('#ed .con')).trim()};
await open('python','pyprac2');ok('python box prefilled',await p.inputValue('#ed-in')==='32500',await p.inputValue('#ed-in'));
ok('python input runs',(await runWith('n=int(input())\nprint(n*2)','21')).includes('42'));
await p.screenshot({path:S+'/con1.png'});
ok('empty input tip',(await runWith('n=int(input())\nprint(n)','')).includes('Input box is empty'));
await open('javascript','fire1');ok('js reads prompt()',(await runWith('const a = prompt("Name?");\nconsole.log("Hi " + a);','Teir')).includes('Hi Teir'));
await open('csharp','csfire1a');ok('c# ReadLine',(await runWith('string n = Console.ReadLine();\nConsole.WriteLine("Hi " + n);','Teir')).includes('Hi Teir'));
await open('rust','rsfire1a');ok('rust stdin',(await runWith('use std::io;\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_line(&mut s).unwrap();\n    println!("Hi {}", s.trim());\n}','Teir')).includes('Hi Teir'));
await open('html','xfireh1a');ok('html has no input box',!(await p.$('#ed-in')));
// mobile-style typing (input events only)
await open('python','pyprac1');await p.fill('#ed .edstack textarea','');
const typeMobile=async t=>{for(const ch of t)await p.evaluate(ch=>{const ta=document.querySelector('#ed .edstack textarea');const a=ta.selectionStart;ta.setRangeText(ch,a,ta.selectionEnd,'end');ta.dispatchEvent(new InputEvent('input',{inputType:'insertText',data:ch,bubbles:true}))},ch)};
await typeMobile('print("hi")');ok('mobile pairs',await p.inputValue('#ed .edstack textarea')==='print("hi")',await p.inputValue('#ed .edstack textarea'));
await p.fill('#ed .edstack textarea','');await typeMobile('x = ""');ok('mobile empty string',await p.inputValue('#ed .edstack textarea')==='x = ""',await p.inputValue('#ed .edstack textarea'));
// ctrl+space
await p.fill('#ed .edstack textarea','');await p.click('#ed .edstack textarea');await p.keyboard.type('p');await p.keyboard.press('Control+Space');await p.waitForTimeout(80);
const it=await p.$$eval('.aci',x=>x.map(e=>e.textContent));ok('ctrl+space opens list',it.includes('print'),it);await p.keyboard.press('Escape');
// scratchpad
await p.evaluate(()=>{__hf.leave();__hf.state().lang="python"});await p.evaluate(()=>{document.querySelector('[data-nav=scratch]')&&document.querySelector('[data-nav=scratch]').click()});await p.waitForTimeout(400);
ok('scratchpad has input box',!!(await p.$('#pad-in')),await p.$eval('#pad-in',e=>e.value).catch(()=>null));
await p.screenshot({path:S+'/con2.png'});
ok('no page errors',!errs.length,errs);await b.close()})().catch(e=>{console.log(e);process.exit(1)})
