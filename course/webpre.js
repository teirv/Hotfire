const {window:__w,document:__d}=__parseHTML(__HTML);
self.document=__d;self.window=__w;
for(const k of ["Event","CustomEvent","Node","Element","HTMLElement"])if(__w[k])self[k]=__w[k];
for(const k of ["setTimeout","clearTimeout","setInterval","clearInterval","fetch","XMLHttpRequest","WebSocket","alert","prompt","confirm","console","localStorage","sessionStorage"])try{__w[k]=self[k]}catch(e){}
__w.getComputedStyle=self.getComputedStyle=el=>new Proxy({},{get:(t,p)=>p==="getPropertyValue"?(n=>el.style[n]||""):(el.style[p]||(p==="display"?"block":""))});
__w.requestAnimationFrame=self.requestAnimationFrame=f=>self.setTimeout(()=>f(performance.now()),16);__w.cancelAnimationFrame=self.cancelAnimationFrame=id=>self.clearTimeout(id);
Object.defineProperty(self,"location",{configurable:true,value:{href:"https://app.test/",protocol:"https:",host:"app.test",origin:"https://app.test",pathname:"/",search:"",hash:""}});
Object.defineProperty(__d,"implementation",{value:{createHTMLDocument:()=>__parseHTML("<!doctype html><html><head></head><body></body></html>").document}});
try{Object.defineProperty(__d,"location",{value:__w.location})}catch(e){}
const __cf=__d.createDocumentFragment.bind(__d);
__d.createDocumentFragment=()=>{const f=__cf();Object.defineProperty(f,"textContent",{configurable:true,get(){return ""},set(){for(const c of [...this.childNodes])c.remove()}});return f};
const __canvases=[];
Object.getPrototypeOf(__d.createElement("canvas")).getContext=function(){if(this.__c)return this.__c;const ops=[];this.__ops=ops;__canvases.push(this);
  this.__c=new Proxy({canvas:this},{get:(t,p)=>{if(p==="canvas")return t.canvas;if(p in t&&typeof p==="string")return t[p];if(typeof p!=="string")return undefined;return(...a)=>{ops.push([p,...a]);if(p==="measureText")return{width:String(a[0]).length*7}}},set:(t,p,v)=>{t[p]=v;ops.push(["=",p,v]);return true}});return this.__c};
self.__calls=n=>__canvases.flatMap(c=>c.__ops).filter(o=>o[0]===n);
function __act(el,type,val){if(val!==undefined){if(el.type==="checkbox"||el.type==="radio")el.checked=!!val;else el.value=val}
  el.dispatchEvent(new __w.Event(type,{bubbles:true,cancelable:true}));
  if(type==="click"){const t=(el.type||"").toLowerCase(),f=el.closest&&el.closest("form");if(f&&(t==="submit"||(el.tagName==="BUTTON"&&t!=="button")))f.dispatchEvent(new __w.Event("submit",{bubbles:true,cancelable:true}))}}
self.__click=s=>{const e=__d.querySelector(s);if(!e)throw new Error("Test could not find "+s);__act(e,"click")};
self.__type=(s,v)=>{const e=__d.querySelector(s);if(!e)throw new Error("Test could not find "+s);__act(e,"input",v);e.dispatchEvent(new __w.Event("change",{bubbles:true}))};
self.__key=(s,k)=>{const e=__d.querySelector(s);const ev=new __w.Event("keydown",{bubbles:true});ev.key=k;e.dispatchEvent(ev)};
let __isLoaded=false;self.__loaded=async()=>{if(__isLoaded)return;__isLoaded=true;__d.dispatchEvent(new __w.Event("DOMContentLoaded",{bubbles:true}));__w.dispatchEvent&&__w.dispatchEvent(new __w.Event("load"))};
let __lastSnap="";
function __snap(){const body=__d.body.innerHTML,css=[...__d.querySelectorAll("style")].map(x=>x.textContent).join("\n"),cv=__canvases.map(c=>({w:c.getAttribute("width")||300,h:c.getAttribute("height")||150,ops:c.__ops.length>4000?c.__ops.slice(-4000):c.__ops}));
  const k=body+css+cv.map(c=>c.ops.length).join();if(k!==__lastSnap){__lastSnap=k;postMessage({t:"dom",body,css,cv:JSON.parse(JSON.stringify(cv))})}}
__si(__snap,100);
self.onmessage=e=>{const d=e.data;if(d.t!=="ev")return;let el=__d.body;for(const i of d.path){el=el&&el.children[i]}if(!el)return;try{__act(el,d.type,d.val)}catch(x){__fail(x)}__snap()};
