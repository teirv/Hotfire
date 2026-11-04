const __lines=[];let __pending=0,__main=false,__ended=false,__live=false;
function __fmt(v,d,seen){const t=typeof v;if(t==="string")return d?"'"+v+"'":v;if(t==="function")return (/^class\s/.test(Function.prototype.toString.call(v))?"[class "+v.name+"]":"[Function: "+(v.name||"anonymous")+"]");if(v===null||t!=="object")return String(v);if(v instanceof Error)return v.name+": "+v.message;if(seen.includes(v))return "[Circular]";if(d>3)return Array.isArray(v)?"[Array]":"[Object]";const s=seen.concat([v]);if(v instanceof Map)return "Map("+v.size+") { "+[...v].map(([a,b])=>__fmt(a,d+1,s)+" => "+__fmt(b,d+1,s)).join(", ")+" }";if(v instanceof Set)return "Set("+v.size+") { "+[...v].map(a=>__fmt(a,d+1,s)).join(", ")+" }";if(v instanceof Date)return v.toISOString();if(v instanceof RegExp)return String(v);if(Array.isArray(v))return v.length?"[ "+v.map(x=>__fmt(x,d+1,s)).join(", ")+" ]":"[]";const k=Object.keys(v),nm=v.constructor&&v.constructor!==Object&&v.constructor.name?v.constructor.name+" ":"";return k.length?nm+"{ "+k.map(x=>x+": "+__fmt(v[x],d+1,s)).join(", ")+" }":nm+"{}"}
const __log=(...a)=>{postMessage({t:"out",s:a.map(x=>__fmt(x,0,[])).join(" ")+"\n"})};
self.console={log:__log,info:__log,warn:__log,error:__log,debug:__log,table:__log};
const __st=self.setTimeout.bind(self),__ct=self.clearTimeout.bind(self),__si=self.setInterval.bind(self),__ci=self.clearInterval.bind(self);
const __timers=new Map();let __tid=0;
self.setTimeout=(f,ms,...a)=>{__pending++;const id=++__tid;__timers.set(id,__st(()=>{__timers.delete(id);try{f(...a)}catch(e){__fail(e)}__pending--;__check()},ms));return id};
self.clearTimeout=id=>{if(__timers.has(id)){__ct(__timers.get(id));__timers.delete(id);__pending--;__check()}};
const __ivs=new Map();
self.setInterval=(f,ms,...a)=>{__pending++;const id=++__tid;__ivs.set(id,__si(()=>{try{f(...a)}catch(e){__fail(e)}},ms));return id};
self.clearInterval=id=>{if(__ivs.has(id)){__ci(__ivs.get(id));__ivs.delete(id);__pending--;__check()}};
self.wait=ms=>new Promise(r=>__st(r,ms));
function __line(e){const m=String(e&&e.stack||"").match(/blob:[^\s)]*:(\d+):\d+/);return m?+m[1]:null}
function __fail(e){if(__ended)return;__ended=true;postMessage({t:"err",name:e&&e.name||"Error",msg:e&&e.message||String(e),line:__line(e)})}
let __chk=false;function __check(){if(__chk)return;__chk=true;__st(()=>{__chk=false;if(__main&&!__ended&&(__pending<=0||__live)){if(__live){postMessage({t:"done"});return}__ended=true;postMessage({t:"done"})}},0)}
self.addEventListener("unhandledrejection",e=>{e.preventDefault();__fail(e.reason)});
self.alert=m=>__log("[alert] "+m);self.prompt=()=>null;self.confirm=()=>true;
/* practice stand-ins: nothing here reaches the internet */
const __W={Austin:{city:"Austin",tempF:88,condition:"Sunny"},Seattle:{city:"Seattle",tempF:58,condition:"Rain"},Chicago:{city:"Chicago",tempF:41,condition:"Cloudy"}};
function __route(url,o){o=o||{};const u=new URL(url,"https://api.example.com/");const p=u.pathname,c=u.searchParams.get("city");
  if(p==="/weather"){if(__W[c])return[200,__W[c]];return[404,{error:"City not found"}]}
  if(p==="/forecast"){if(__W[c])return[200,{city:c,days:[__W[c].tempF,__W[c].tempF+2,__W[c].tempF-3]}];return[404,{error:"City not found"}]}
  if(p==="/quote")return[200,{quote:"Measure twice, cut once.",author:"Proverb"}];
  if(p==="/users")return[200,[{id:1,name:"Ana"},{id:2,name:"Leo"}]];
  if(p==="/echo")return[200,{received:o.body===undefined?null:String(o.body)}];
  if(p==="/rates")return[200,{base:"USD",EUR:0.9,GBP:0.8,JPY:150}];
  return[404,{error:"Not found"}]}
self.fetch=(url,o)=>new Promise(res=>{self.setTimeout(()=>{const[st,b]=__route(String(url),o);const t=JSON.stringify(b);res({ok:st<400,status:st,statusText:st<400?"OK":"Not Found",url:String(url),json:async()=>JSON.parse(t),text:async()=>t})},15)});
self.XMLHttpRequest=class XMLHttpRequest{constructor(){this.readyState=0;this.status=0;this.responseText="";this.response=null;this.responseType="";this.withCredentials=false;this._l={};this.statusText=""}
  open(m,u){this._m=m;this._u=u;this.readyState=1}setRequestHeader(){}overrideMimeType(){}getAllResponseHeaders(){return "content-type: application/json\r\n"}getResponseHeader(){return "application/json"}abort(){}
  addEventListener(n,f){(this._l[n]=this._l[n]||[]).push(f)}removeEventListener(){}
  _fire(n){const e={type:n,target:this};if(this["on"+n])this["on"+n](e);(this._l[n]||[]).forEach(f=>f.call(this,e))}
  send(b){self.setTimeout(()=>{const[st,o]=__route(String(this._u),{body:b});const t=JSON.stringify(o);this.status=st;this.statusText=st<400?"OK":"Not Found";this.responseText=t;this.response=this.responseType==="json"?JSON.parse(t):t;this.readyState=4;this._fire("readystatechange");this._fire("load");this._fire("loadend")},15)}};
self.WebSocket=class WebSocket{constructor(u){this.url=u;this.readyState=0;this._l={};self.setTimeout(()=>{this.readyState=1;this._fire("open",{})},10)}
  addEventListener(n,f){(this._l[n]=this._l[n]||[]).push(f)}_fire(n,e){e.type=n;e.target=this;if(this["on"+n])this["on"+n](e);(this._l[n]||[]).forEach(f=>f(e))}
  send(d){self.setTimeout(()=>this._fire("message",{data:"Server received: "+d}),10)}close(){this.readyState=3;self.setTimeout(()=>this._fire("close",{}),5)}};
class __Store{constructor(){Object.defineProperty(this,"_m",{value:new Map()})}getItem(k){return this._m.has(k)?this._m.get(k):null}setItem(k,v){this._m.set(String(k),String(v))}removeItem(k){this._m.delete(k)}clear(){this._m.clear()}key(i){return [...this._m.keys()][i]??null}get length(){return this._m.size}}
Object.defineProperty(self,"localStorage",{value:new __Store()});Object.defineProperty(self,"sessionStorage",{value:new __Store()});
