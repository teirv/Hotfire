const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:850}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/skulpt*.js',r=>{const f=r.request().url().split('/').pop();r.fulfill({path:'server/static/vendor/'+f,contentType:'text/javascript'})});
await p.route('**fonts.g**',r=>r.abort());await p.addInitScript(()=>{window.__hotfireRunner=true});await p.route('**/api/run',async r=>{const res=await fetch('http://127.0.0.1:8101/run',{method:'POST',headers:{'content-type':'application/json'},body:r.request().postData()});r.fulfill({status:res.status,contentType:'application/json',body:await res.text()})});p.on('console',m=>{if(m.type()==='error')console.log('CON',m.text().slice(0,200))});

const html=fs.readFileSync('dist/hotfire.html','utf8');
await p.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+html+'</body></html>'}));await p.goto('https://app.test/');
await p.waitForFunction('window.__hf');
const res=await p.evaluate(async(ONLY)=>{const {COURSES,run,grade,norm}=__hf;const bad=[];let n=0;
 for(const lang of Object.keys(COURSES))for(const u of COURSES[lang].units)for(const l of u.lessons)for(let i=0;i<(ONLY&&!new RegExp(ONLY).test(l.id)?0:l.s.length);i++){const s=l.s[i],id=lang+'/'+l.id+'#'+i+s.k;n++;
  try{
  if(s.k==='C'){if(!s.sol){bad.push(id+' no sol');continue}if(!s.anyout&&!s.styles&&!s.cases.some(c=>c.out))bad.push(id+' no out');const neg=await grade(s,lang,s.start);if(neg.ok)bad.push(id+' STARTER PASSES');const r=await grade(s,lang,s.sol);if(!r.ok)bad.push(id+' FAIL '+JSON.stringify(r))}
  if(s.k==='P'){const r=await run(lang,s.code,[]);const c=s.opts.find(o=>o.ok).t;const act=norm(r.out);const q=s.prompt;
    if(/How many|last line|^How/.test(q)){bad.push('CHECK '+id+' '+q+' got '+JSON.stringify(act)+' ans '+c)}
    else if(c==='Nothing'?act!=='':act!==norm(c))bad.push(id+' P want '+JSON.stringify(c)+' got '+JSON.stringify(act)+(r.error?JSON.stringify(r.error):''));
    if(s.opts.filter(o=>o.ok).length!==1)bad.push(id+' opts')}
  if(s.k==='Q'&&s.opts.filter(o=>o.ok).length!==1)bad.push(id+' opts');
  if(s.k==='W'&&(!s.accept||!s.accept.length))bad.push(id+' no accept');
  if(s.k==='T'&&s.code&&lang!=='html'){const r=await run(lang,s.code,s.stdin||[],s.html?{html:s.html}:undefined);if(r.timedOut&&!s.html)bad.push(id+' timeout');if(r.error&&!/bug|error|Error/i.test(s.text))bad.push(id+' T err '+JSON.stringify(r.error)+' out '+r.out)}
  if(s.k==='B'&&s.code.split('___').length-1!==s.ans.length)bad.push(id+' blanks');
  if(s.k==='B'&&!['japanese','spanish','html','csharp','rust'].includes(lang)){const parts=s.code.split('___');if(parts.length-1!==s.ans.length)bad.push(id+' blanks');let src=parts[0];s.ans.forEach((a,i)=>src+=a+parts[i+1]);if(s.vout){const r=await run(lang,src,s.vout.stdin);if(norm(r.out)!==norm(s.vout.out))bad.push(id+' B got '+JSON.stringify(r)+' want '+s.vout.out)}}
  if(s.k==='O'&&s.vout){const r=await run(lang,s.lines.join('\n'),[]);if(norm(r.out)!==norm(s.vout.out))bad.push(id+' O '+JSON.stringify(r))}
  }catch(e){bad.push(id+' EXC '+e)}}
 return {n,bad}},process.env.ONLY||'');
console.log(res.n,'cards');console.log(res.bad.join('\n'));console.log('pageerrors',errs);await b.close()})()
