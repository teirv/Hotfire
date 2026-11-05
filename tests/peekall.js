const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:900,height:700}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync('dist/hotfire.html','utf8')+'</body></html>'}));await p.route('**fonts.g**',r=>r.abort());await p.route('**/skulpt*',r=>r.abort());
await p.goto('https://app.test/');await p.waitForTimeout(300);
const r=await p.evaluate(async()=>{let n=0,bad=[];for(const lang of Object.keys(__hf.COURSES)){document.querySelector(`[data-lang=${lang}]`).click();for(const u of __hf.COURSES[lang].units)for(const l of u.lessons){__hf.state().at[l.id]=l.s.length-1;
  __hf.open(l.id);while(document.querySelector('[data-prevcard]')){document.querySelector('[data-prevcard]').click();n++}if(document.querySelector('[data-peeknext]')===null&&l.s.length>1)bad.push(l.id);
  let g=0;while(document.querySelector('[data-peeknext]')&&g++<50)document.querySelector('[data-peeknext]').click();if(document.querySelector('.peeknote'))bad.push(l.id+' stuck');__hf.leave();delete __hf.state().at[l.id]}}return{n,bad}});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));await b.close()})()
