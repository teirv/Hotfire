const fs=require('fs');
function parse(txt,lang){
  const units=[];let unit=null,lesson=null,card=null,sec=null;
  const close=()=>{if(card){for(const k in card._){card._[k]=card._[k].join('\n').replace(/\n+$/,'')}finishCard(card);lesson.s.push(card._out);card=null}sec=null};
  function finishCard(c){const _=c._,o={k:c.k};
    if(_.html)o.html=_.html;
    if(c.k==='T'){o.text=_.body;if(_.keep!==undefined)o.keep=true;if(_.code)o.code=_.code;if(_.stdin!==undefined)o.stdin=_.stdin.split('\n')}
    else o.prompt=_.body;
    if('QPB'.includes(c.k)){const list=[];for(const l of (_.opts||'').split('\n')){if(/^\* /.test(l))list.push({t:l.slice(2),ok:true});else if(/^- /.test(l))list.push({t:l.slice(2),ok:false});else if(list.length)list[list.length-1].t+='\n'+l}
      if(c.k==='B'){o.ans=list.filter(x=>x.ok).map(x=>x.t);o.extra=list.filter(x=>!x.ok).map(x=>x.t)}else o.opts=list}
    if('QP'.includes(c.k)&&_.code)o.code=_.code;
    if(c.k==='B')o.code=_.code;
    if(c.k==='O')o.lines=_.lines.split('\n');
    if(c.k==='W')o.accept=_.accept.split('\n').filter(Boolean);
    if(_.why)o.why=_.why;
    if('BO'.includes(c.k)&&c.outs.length)o.vout=c.outs[0];
    if(c.k==='C'){o.start=_.start||'';if(!o.start.endsWith('\n'))o.start+='\n';o.sol=_.sol;o.hint=_.hint;if(_.after)o.after=_.after;if(_.replace)o.replace=_.replace;
      o.cases=c.outs.length?c.outs:[{stdin:[],out:''}];if(c.anyout)o.anyout=true;
      if(_.style)o.styles=_.style.split('\n').filter(Boolean).map(l=>{const [sel,prop,val]=l.split(' :: ');return{sel,prop,val}});
      if(_.must)o.must=_.must.split('\n').filter(Boolean).map(l=>{const [re,msg]=l.split(' :: ');return{re,msg}})}
    c._out=o}
  for(const raw of txt.split('\n')){
    let m;
    if((m=raw.match(/^=X (\S+)$/))){close();unit={extend:m[1],lessons:[]};units.push(unit);continue}
    if((m=raw.match(/^=U (\S+) \| ([^|]+?)(?: \| (.*))?$/))){close();unit={id:m[1],title:m[2],blurb:m[3]||'',lessons:[]};units.push(unit);continue}
    if((m=raw.match(/^=([LF]) (\S+) \| (.*)$/))){close();lesson={id:m[2],title:m[3],s:[]};if(m[1]==='F')lesson.fire=true;unit.lessons.push(lesson);continue}
    if((m=raw.match(/^@([TQPBOCW])$/))){close();card={k:m[1],_:{body:[]},outs:[]};sec='body';continue}
    if(card&&(m=raw.match(/^~(\w+)(?: (.*))?$/))){
      if(m[1]==='anyout'){card.anyout=true;continue}
      if(m[1]==='out'){const c={stdin:[]},a=m[2]||'';if(a.startsWith('stdin='))c.stdin=a.slice(6).split('|');if(a.startsWith('with='))c.with=a.slice(5);card.outs.push(c);const buf=[];c._b=buf;sec=buf;continue}
      sec=m[1];card._[sec]=card._[sec]||[];continue}
    if(card){if(Array.isArray(sec))sec.push(raw);else card._[sec].push(raw)}
  }
  close();
  return units}
function fixOuts(units){for(const u of units)for(const l of u.lessons)for(const s of l.s){}}
const base=parse(fs.readFileSync('course/javascript.txt','utf8'),'javascript');
const CH=[['Chapter 1: JavaScript Fundamentals','course/js_ch1.txt'],['Chapter 2: JavaScript in the Browser','course/js_ch2.txt'],['Chapter 3: More JavaScript','course/js_ch3.txt'],['Chapter 4: jQuery','course/js_ch4.txt'],['Chapter 5: Angular Overview','course/js_ch5.txt'],['Chapter 6: React (optional)','course/js_ch6.txt'],['Chapter 7: Web Accessibility (optional)','course/js_ch7.txt']];
const ORDER1=['first','vars','math','decide','loops','funcs','scope','arrays','objects','maps','strobj','dateobj','mathobj','bugs','labs1'];
const MAP={first:'Book section 1.1.',vars:'Book section 1.1.',math:'Book section 1.2.',decide:'Book sections 1.3 and 1.4.',loops:'Book section 1.5.',funcs:'Book section 1.6.',arrays:'Book section 1.8.',objects:'Book section 1.9.',bugs:'Book section 1.14.'};
const js=[];CH.forEach(([t,f],i)=>{if(!fs.existsSync(f))return;let us=parse(fs.readFileSync(f,'utf8'),'javascript');
  if(i===0){const all=[...base,...us];us=ORDER1.map(id=>all.find(u=>u.id===id));us.forEach(u=>{if(MAP[u.id])u.blurb=MAP[u.id]+' '+u.blurb})}
  us.forEach(u=>{u.ch=t;js.push(u)})});
const py=parse(fs.readFileSync('course/python.txt','utf8'),'python');

const KANA=[['a',['あア a','いイ i','うウ u','えエ e','おオ o'],['かカ ka','きキ ki','くク ku','けケ ke','こコ ko']],
 ['s',['さサ sa','しシ shi si','すス su','せセ se','そソ so'],['たタ ta','ちチ chi ti','つツ tsu tu','てテ te','とト to']],
 ['n',['なナ na','にニ ni','ぬヌ nu','ねネ ne','のノ no'],['はハ ha','ひヒ hi','ふフ fu hu','へヘ he','ほホ ho']],
 ['m',['まマ ma','みミ mi','むム mu','めメ me','もモ mo'],['やヤ ya','ゆユ yu','よヨ yo']],
 ['r',['らラ ra','りリ ri','るル ru','れレ re','ろロ ro'],['わワ wa','をヲ o wo','んン n nn']],
 ['g',['がガ ga','ぎギ gi','ぐグ gu','げゲ ge','ごゴ go'],['ざザ za','じジ ji zi','ずズ zu','ぜゼ ze','ぞゾ zo']],
 ['d',['だダ da','ぢヂ ji di','づヅ zu du','でデ de','どド do'],['ばバ ba','びビ bi','ぶブ bu','べベ be','ぼボ bo'],['ぱパ pa','ぴピ pi','ぷプ pu','ぺペ pe','ぽポ po']],
 ['y',['きゃキャ kya','きゅキュ kyu','きょキョ kyo','しゃシャ sha sya','しゅシュ shu syu','しょショ sho syo'],['ちゃチャ cha tya','ちゅチュ chu tyu','ちょチョ cho tyo','にゃニャ nya','りゃリャ rya','じゃジャ ja zya']]];
const TITLES={a:'Vowels and k',s:'s and t',n:'n and h',m:'m and y',r:'r, w and n',g:'g and z sounds',d:'d, b and p sounds',y:'Combined sounds'};
let seed=7;const rnd=n=>{seed=(seed*16807)%2147483647;return seed%n};
const mix=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const part=(x,idx)=>{const [k,...ro]=x.split(' ');const c=[...k],n=c.length/2;return{ch:(idx?c.slice(n):c.slice(0,n)).join(''),ro}};
function kanaUnit(idx,title,blurb,words){const seen=[];const lessons=KANA.map(([id,...rows])=>{
  const items=rows.flat().map(x=>part(x,idx)),pool=[...seen,...items];
  const notes={s:idx?'シ is shi, チ is chi, and ツ is tsu.':'し is shi, ち is chi, and つ is tsu.',y:idx?'The small ャ, ュ, ョ join the character before them into one sound.':'The small ゃ, ゅ, ょ join the character before them into one sound.',g:'Two small marks turn k into g, and s into z.',d:'Two small marks turn t into d, and h into b. A small circle turns h into p.'};
  const cards=[{k:'T',text:'Tap each character to hear it, and say it out loud.\n\n'+rows.map(r=>r.map(x=>{const p=part(x,idx);return p.ch+' '+p.ro[0]}).join('    ')).join('\n\n')+(notes[id]?'\n\n'+notes[id]:'')}];
  for(const it of mix(items).slice(0,8))cards.push({k:'W',prompt:'Type the sound of this character in English letters.',big:it.ch,accept:it.ro,why:it.ch+' is '+it.ro[0]+'.'});
  for(const it of mix(items).slice(0,4)){const wrong=mix(pool.filter(x=>x.ch!==it.ch)).slice(0,3).map(x=>({t:x.ch,ok:false}));cards.push({k:'Q',prompt:'Which one is **'+it.ro[0]+'**?',opts:[{t:it.ch,ok:true},...wrong],why:it.ch+' is '+it.ro[0]+'.'})}
  seen.push(...items);return{id:(idx?'kt':'hg')+id,title:TITLES[id],s:cards}});
  lessons.push({id:(idx?'kt':'hg')+'fire',title:'Hot fire: Read '+title,fire:true,s:words.map(([w,ro,me])=>({k:'W',prompt:'Read this word and type it in English letters. It means "'+me+'".',big:w,accept:ro.split(' '),why:w+' is '+ro.split(' ')[0]+', meaning '+me+'.'}))});
  return{id:idx?'kata':'hira',title,blurb,lessons}}
const jaUnits=[kanaUnit(0,'Hiragana','The basic Japanese alphabet. Start here.',[['さくら','sakura','cherry blossom'],['すし','sushi','sushi'],['ねこ','neko','cat'],['いぬ','inu','dog'],['やま','yama','mountain'],['みず','mizu','water'],['でんしゃ','densha','train'],['ありがとう','arigatou arigato','thank you']]),
 kanaUnit(1,'Katakana','The alphabet for foreign words and names.',[['テレビ','terebi','TV'],['カメラ','kamera','camera'],['ホテル','hoteru','hotel'],['アメリカ','amerika','America'],['バス','basu','bus'],['パン','pan','bread'],['ピザ','piza','pizza'],['ジュース','juusu jusu','juice']])];
const ja=[];[['Part 1: Reading Japanese',null],['Part 2: Beginner','course/ja_ch2.txt'],['Part 3: Intermediate and Beyond','course/ja_ch3.txt']].forEach(([t,f])=>{const us=f?parse(fs.readFileSync(f,'utf8'),'japanese'):jaUnits;us.forEach(u=>{u.ch=t;ja.push(u)})});
const web=[];[['HTML: Beginner and Intermediate','course/web_ch1.txt'],['CSS: Beginner and Intermediate','course/web_ch2.txt']].forEach(([t,f])=>{parse(fs.readFileSync(f,'utf8'),'html').forEach(u=>{u.ch=t;web.push(u)})});
const es=[];[['Part 1: Beginner','course/es_ch1.txt'],['Part 2: Everyday Spanish','course/es_ch2.txt'],['Part 3: Intermediate and Beyond','course/es_ch3.txt']].forEach(([t,f])=>{parse(fs.readFileSync(f,'utf8'),'spanish').forEach(u=>{u.ch=t;es.push(u)})});
const track=(parts,lang)=>{const out=[];parts.forEach(([t,f])=>parse(fs.readFileSync(f,'utf8'),lang).forEach(u=>{u.ch=t;out.push(u)}));return out};
const cs=track([['Part 1: C# Basics','course/cs_ch1.txt'],['Part 2: Objects and Beyond','course/cs_ch2.txt']],'csharp');
const rs=track([['Part 1: Rust Basics','course/rs_ch1.txt'],['Part 2: Ownership, Types and Errors','course/rs_ch2.txt']],'rust');
const COURSES={javascript:{units:js},python:{units:py},html:{units:web},japanese:{units:ja},spanish:{units:es},csharp:{units:cs},rust:{units:rs}};
/* Extra practice files add lessons to existing sections: =X unit-id, then =L (before the section's first hot fire) or =F (at the end). */
const EXTRA={javascript:'course/extra_js.txt',python:'course/extra_py.txt',html:'course/extra_web.txt',japanese:'course/extra_ja.txt',spanish:'course/extra_es.txt',csharp:'course/extra_cs.txt',rust:'course/extra_rs.txt'};
for(const [lang,base] of Object.entries(EXTRA)){const files=fs.readdirSync('course').filter(n=>n.startsWith(base.slice(7,-4))&&n.endsWith('.txt')).sort().map(n=>'course/'+n);for(const f of files)for(const x of parse(fs.readFileSync(f,'utf8'),lang)){
  const u=COURSES[lang].units.find(y=>y.id===x.extend);if(!x.extend||!u)throw new Error(f+': no section '+(x.extend||x.id));
  for(const l of x.lessons){if(l.fire)u.lessons.push(l);else{let i=u.lessons.findIndex(y=>y.fire);if(i<0)i=u.lessons.length;u.lessons.splice(i,0,l)}}}}
for(const l of Object.keys(COURSES))COURSES[l].units=COURSES[l].units.filter(u=>!u.extend);
{const seen=new Set();for(const l of Object.values(COURSES))for(const u of l.units)for(const x of u.lessons){if(seen.has(x.id))throw new Error('Duplicate lesson id '+x.id);seen.add(x.id);if(!x.s.length)throw new Error('Empty lesson '+x.id)}}
/* Cards never point at something they don't show. "Refer to the code above" copies in the nearest
   earlier code from the same lesson, and a teach card marked ~keep stays on screen for the questions after it. */
{const REF=/\b(the )?code (above|below)\b|above code|example above|\b(the )?same (code|component|function|class|object|loop|program)\b/i;
 for(const [ln,l] of Object.entries(COURSES))for(const u of l.units)for(const x of u.lessons){let code=null,html=null,ctx=null;
  for(const c of x.s){
   if(c.k==='T'){if(c.keep){ctx=c.text.replace(/^Read this[^\n]*\n+/i,'').replace(/^Tap the text[^\n]*\n+/i,'');delete c.keep}else ctx=null}
   else if(ctx&&!c.code)c.ctx=ctx;
   const t=c.prompt||'';
   if('QP'.includes(c.k)&&!c.code&&!t.includes('```')&&REF.test(t)){if(!code)throw new Error(`${ln}/${x.id}: "${t.slice(0,50)}" refers to code, but the lesson has none before it`);c.code=code;if(html&&!c.html)c.html=html}
   if('QP'.includes(c.k)&&c.code)c.prompt=t.replace(/Refer to the code above\./,'Refer to the code below.').replace(/\bthe code above\b/,'the code below');
   if(c.k!=='B'&&c.k!=='O'&&c.code){code=c.code;html=c.html||null}
   {const m=(c.text||t).match(/```\w*\n([\s\S]*?)```/);if(m&&!c.code)code=m[1].replace(/\n$/,'')}
   if(c.k==='C'&&c.sol){code=c.sol;html=c.html||null}
   if(c.k!=='T'&&/\babove\b/i.test(t)&&REF.test(t)&&!c.code&&!c.ctx)throw new Error(`${ln}/${x.id}: card refers to something above it that isn't shown`)}}}
// clean out-case buffers
const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(o._b){o.out=o._b.join('\n').replace(/\n+$/,'');delete o._b}Object.values(o).forEach(walk)}};walk(COURSES);
const json=JSON.stringify(COURSES).replace(/</g,'\\u003c');
const lit=f=>JSON.stringify(fs.readFileSync(f,'utf8')).replace(/</g,'\\u003c');
const JQS=fs.readFileSync('vendor/jquery.min.js','utf8');
const css=fs.readFileSync('course/app.css','utf8'),app=fs.readFileSync('course/app.js','utf8');
const html=`<title>Hotfire</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+JP:wght@400;500&display=swap">
<style>
${css}</style>
<div id="app"></div>
<script>
const COURSES=${json};
const LINKEDOM=${lit('vendor/linkedom.iife.js')};
const JSPRE=${lit('course/prelude.js')};
const WEBPRE=${lit('course/webpre.js')};
const JQUERY=${JSON.stringify(JQS).replace(/</g,'\\u003c')};
${app.replace(/<\/script/g,'<\\/script')}</script>
`;
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/hotfire.html',html);
if(fs.existsSync('server/static'))fs.writeFileSync('server/static/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style><script src="/host.js"></script></head><body>'+html.replace('<script>\nconst COURSES','<script>\nconst COURSES')+'</body></html>');
const n=l=>COURSES[l].units.flatMap(u=>u.lessons);
for(const l of Object.keys(COURSES))console.log(l,'units',COURSES[l].units.length,'lessons',n(l).length,'cards',n(l).reduce((a,x)=>a+x.s.length,0),'code',n(l).flatMap(x=>x.s).filter(s=>s.k==='C').length);
console.log('bytes',html.length);
