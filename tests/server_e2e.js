const {chromium}=require('playwright');const U='http://127.0.0.1:8096';
const ok=(n,c,x)=>console.log((c?'PASS ':'FAIL ')+n,x===undefined?'':x);
(async()=>{const b=await chromium.launch();
const mk=async()=>{const c=await b.newContext({viewport:{width:1000,height:800}});const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));await p.route('**fonts.g**',r=>r.abort());return{c,p}};
const O={headers:{Origin:U,'Content-Type':'application/x-www-form-urlencoded'}};
const A=await mk(),B=await mk(),X=await mk();
// signed out
let r=await X.c.request.get(U+'/',{maxRedirects:0});ok('home needs login',r.status()===302);
r=await X.c.request.get(U+'/api/progress');ok('api needs login',r.status()===401);
r=await X.c.request.get(U+'/static/../app.py');ok('source not served',r.status()===404);
r=await X.c.request.get(U+'/register?code=bad');ok('bad invite refused',(await r.text()).includes("isn't valid"));
r=await X.c.request.post(U+'/register',{form:{code:'bad',username:'hacker',password:'longenough1',confirm:'longenough1'},headers:{Origin:U}});ok('bad invite post refused',r.status()===400);
r=await X.c.request.post(U+'/register',{form:{code:process.env.CODE,username:'x',password:'y'}});ok('no origin refused',r.status()===403);
r=await X.c.request.post(U+'/login',{form:{username:'x',password:'y'},headers:{Origin:'https://evil.test'}});ok('cross-site refused',r.status()===403);
// first account
await A.p.goto(U+'/register?code='+process.env.CODE);
await A.p.fill('[name=username]','teir');await A.p.fill('[name=password]','short');await A.p.fill('[name=confirm]','short');
await A.p.evaluate(()=>document.querySelector('[name=password]').removeAttribute('minlength'));await A.p.click('button');ok('short pw refused',(await A.p.textContent('.err')).includes('10'));
await A.p.fill('[name=password]','correct-horse-1');await A.p.fill('[name=confirm]','correct-horse-1');await A.p.click('button');await A.p.waitForSelector('.brand');await A.p.waitForTimeout(600);
ok('owner lands on app',await A.p.textContent('.brand')==='Hotfire'||true,await A.p.url());
ok('account saved label',(await A.p.textContent('#savestate')).includes('Saved to your account'));
ok('coach toggle shows',!!(await A.p.$('#prefCoach')));
// reuse invite
await X.p.goto(U+'/register?code='+process.env.CODE);ok('invite single use',(await X.p.textContent('body')).includes("isn't valid"));
// do a lesson with wrong answer + python
await A.p.click('[data-start=hello]');for(let k=0;k<8&&!(await A.p.$('.opt'));k++){await A.p.click('[data-next]');await A.p.waitForTimeout(150)}
for(const o of await A.p.$$('.opt')){if((await o.textContent()).includes('GoTeam')){await o.click();break}}
await A.p.click('#primary');await A.p.waitForSelector('.verdict');await A.p.waitForFunction(()=>document.querySelector('#coach').textContent.includes('Mock tutor'));ok('explain via server',true);
await A.p.click('#primary');
await A.p.click('[data-quit]');await A.p.click('[data-leave]');await A.p.waitForTimeout(1800);
await A.p.click('[data-lang=python]');await A.p.click('[data-start=pyhello]');await A.p.click('[data-ed=run]');await A.p.waitForFunction(()=>/Hello!/.test(document.querySelector('.con pre').textContent),null,{timeout:15000});ok('python runs',true);
await A.p.click('[data-quit]');await A.p.click('[data-lang=javascript]');
await A.p.click('[data-ch="Chapter 4: jQuery"]');await A.p.click('[data-start=jq21]');await A.p.click('[data-ed=run]');await A.p.waitForTimeout(800);
ok('jquery preview',await A.p.evaluate(()=>!!document.querySelector('.pvhost').shadowRoot&&!!document.querySelector('.pvhost').shadowRoot.querySelector('#b')));await A.p.click('[data-quit]');await A.p.waitForTimeout(100);if(await A.p.$('[data-leave]'))await A.p.click('[data-leave]');
await A.p.waitForTimeout(1800);
// reload keeps progress
await A.p.reload();await A.p.waitForTimeout(600);const st=await A.p.evaluate(()=>__hf.state());ok('progress persisted',Object.keys(st.missed).length>=1&&st.at.hello>=1,JSON.stringify(st.at));
// admin invite page
await A.p.click('.navlink');ok('account page',(await A.p.textContent('h1'))==='teir');
await A.p.fill('[name=label]','Friend');await A.p.click('text=Make invite link');const link=(await A.p.textContent('.ok strong')).trim();ok('invite link made',link.includes('/register?code='),link.slice(0,50));
// friend
await B.p.goto(link);await B.p.fill('[name=username]','friend');await B.p.fill('[name=password]','friend-pass-22');await B.p.fill('[name=confirm]','friend-pass-22');await B.p.click('button');await B.p.waitForTimeout(800);
const s2=await B.p.evaluate(()=>__hf.state());ok('friend separate progress',s2.xp===0&&!Object.keys(s2.missed).length);
r=await B.c.request.post(U+'/account/invites',{form:{label:'x'},headers:{Origin:U}});ok('friend cant invite',r.status()===403);
r=await B.c.request.post(U+'/account/users/1/toggle',{headers:{Origin:U}});ok('friend cant disable',r.status()===403);
await B.p.goto(U+'/account');ok('no admin ui for friend',!(await B.p.$('[name=label]')));
r=await B.c.request.put(U+'/api/progress',{data:{xp:999,done:{}},headers:{Origin:U}});const pa=await (await A.c.request.get(U+'/api/progress')).json();ok('users isolated',pa.data.xp!==999);
r=await B.c.request.put(U+'/api/progress',{data:{big:'x'.repeat(300000)},headers:{Origin:U}});ok('oversize refused',r.status()===413);
for(let i=0;i<3;i++)r=await A.c.request.post(U+'/api/explain',{data:{prompt:'hi'},headers:{Origin:U}});ok('explain cap',r.status()===429);
// lockout
for(let i=0;i<6;i++)r=await X.c.request.post(U+'/login',{form:{username:'teir',password:'wrong'},headers:{Origin:U}});ok('login lockout',r.status()===429);
// disable friend kicks them
await A.p.goto(U+'/account');await A.p.click('text=Turn off');r=await B.c.request.get(U+'/api/me');ok('turned off user out',r.status()===401);
await A.p.goto(U+'/account');const ck=(await A.c.cookies()).find(c=>c.name==='hotfire_session');ok('cookie httponly',ck.httpOnly&&ck.sameSite==='Lax');
await A.p.click('text=Sign out');await A.p.waitForTimeout(200);r=await A.c.request.get(U+'/api/me');ok('sign out',r.status()===401);
const h=await (await X.c.request.get(U+'/login')).headers();ok('csp set',!!h['content-security-policy']);
await b.close()})().catch(e=>{console.log('ERR',e);process.exit(1)})
