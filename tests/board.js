const {chromium}=require('playwright');const U='http://127.0.0.1:8096';
const S='/tmp/claude-0/-home-claude/48db5b89-57b2-5592-8e32-32bbdba1c2f8/scratchpad/n/';
const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':x);
const d=(n)=>{const t=new Date(Date.now()-n*864e5);return t.toISOString().slice(0,10)};
(async()=>{const b=await chromium.launch();
const mk=async()=>{const c=await b.newContext({viewport:{width:900,height:700}});const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));await p.route('**fonts.g**',r=>r.abort());return{c,p}};
const O={Origin:U};const A=await mk(),B=await mk();
const reg=async(x,code,name)=>{await x.p.goto(U+'/register?code='+code);await x.p.fill('[name=username]',name);await x.p.fill('[name=password]','long-enough-pass');await x.p.fill('[name=confirm]','long-enough-pass');await x.p.click('button');await x.p.waitForTimeout(600)};
await reg(A,process.env.CODE,'teir');await reg(B,process.env.CODE2,'<b>ana</b>'.replace(/[<>/]/g,'')+'x');
await A.c.request.put(U+'/api/progress',{data:{xp:100,days:{[d(0)]:10,[d(1)]:5,[d(20)]:85},done:{a:{at:1},b:{at:1},'fix:a:1':{at:1}}},headers:O});
await B.c.request.put(U+'/api/progress',{data:{xp:40,days:{[d(0)]:40},done:{a:{at:1}}},headers:O});
const r=await (await A.c.request.get(U+'/api/leaderboard')).json();const t=r.rows.find(x=>x.username==='teir'),f=r.rows.find(x=>x.username!=='teir');
ok('stats',t.xp===100&&t.week===15&&t.streak===2&&t.lessons===2&&t.you,JSON.stringify(t));ok('friend',f.week===40&&f.you===false,JSON.stringify(f));
ok('no private fields',!('days' in t)&&!('missed' in t));
let x=await (await mk()).c.request.get(U+'/api/leaderboard');ok('needs login',x.status()===401);
await A.p.reload();await A.p.waitForTimeout(500);await A.p.click('[data-nav=board]');await A.p.waitForSelector('.board');
ok('week: friend first',(await A.p.textContent('.board tbody tr:first-child')).includes('anax')||(await A.p.textContent('.board tbody tr:first-child')).includes('bana'),await A.p.textContent('.board tbody tr:first-child'));
await A.p.screenshot({path:S+'b1.png'});await A.p.click('[data-bsort=xp]');ok('all time: teir first',(await A.p.textContent('.board tbody tr:first-child')).includes('teir'));
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
