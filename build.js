const fs=require('fs');
function parse(txt,lang){
  const units=[];let unit=null,lesson=null,card=null,sec=null;
  const close=()=>{if(card){for(const k in card._){card._[k]=card._[k].join('\n').replace(/\n+$/,'')}finishCard(card);lesson.s.push(card._out);card=null}sec=null};
  function finishCard(c){const _=c._,o={k:c.k};
    if(_.html)o.html=_.html;
    if(c.k==='T'){o.text=_.body;if(_.code)o.code=_.code;if(_.stdin!==undefined)o.stdin=_.stdin.split('\n')}
    else o.prompt=_.body;
    if('QPB'.includes(c.k)){const list=[];for(const l of (_.opts||'').split('\n')){if(/^\* /.test(l))list.push({t:l.slice(2),ok:true});else if(/^- /.test(l))list.push({t:l.slice(2),ok:false});else if(list.length)list[list.length-1].t+='\n'+l}
      if(c.k==='B'){o.ans=list.filter(x=>x.ok).map(x=>x.t);o.extra=list.filter(x=>!x.ok).map(x=>x.t)}else o.opts=list}
    if('QP'.includes(c.k)&&_.code)o.code=_.code;
    if(c.k==='B')o.code=_.code;
    if(c.k==='O')o.lines=_.lines.split('\n');
    if(_.why)o.why=_.why;
    if('BO'.includes(c.k)&&c.outs.length)o.vout=c.outs[0];
    if(c.k==='C'){o.start=_.start||'';if(!o.start.endsWith('\n'))o.start+='\n';o.sol=_.sol;o.hint=_.hint;if(_.after)o.after=_.after;if(_.replace)o.replace=_.replace;
      o.cases=c.outs.length?c.outs:[{stdin:[],out:''}];if(c.anyout)o.anyout=true;
      if(_.must)o.must=_.must.split('\n').filter(Boolean).map(l=>{const [re,msg]=l.split(' :: ');return{re,msg}})}
    c._out=o}
  for(const raw of txt.split('\n')){
    let m;
    if((m=raw.match(/^=U (\S+) \| ([^|]+?)(?: \| (.*))?$/))){close();unit={id:m[1],title:m[2],blurb:m[3]||'',lessons:[]};units.push(unit);continue}
    if((m=raw.match(/^=([LF]) (\S+) \| (.*)$/))){close();lesson={id:m[2],title:m[3],s:[]};if(m[1]==='F')lesson.fire=true;unit.lessons.push(lesson);continue}
    if((m=raw.match(/^@([TQPBOC])$/))){close();card={k:m[1],_:{body:[]},outs:[]};sec='body';continue}
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
const COURSES={javascript:{units:js},python:{units:py}};
// clean out-case buffers
const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(o._b){o.out=o._b.join('\n').replace(/\n+$/,'');delete o._b}Object.values(o).forEach(walk)}};walk(COURSES);
const json=JSON.stringify(COURSES).replace(/</g,'\\u003c');
const lit=f=>JSON.stringify(fs.readFileSync(f,'utf8')).replace(/</g,'\\u003c');
const JQS=fs.readFileSync('vendor/jquery.min.js','utf8');
const css=fs.readFileSync('course/app.css','utf8'),app=fs.readFileSync('course/app.js','utf8');
const html=`<title>Hotfire</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
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
for(const l of ['javascript','python'])console.log(l,'units',COURSES[l].units.length,'lessons',n(l).length,'cards',n(l).reduce((a,x)=>a+x.s.length,0),'code',n(l).flatMap(x=>x.s).filter(s=>s.k==='C').length);
console.log('bytes',html.length);
