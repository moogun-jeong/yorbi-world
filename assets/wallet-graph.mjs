/* Wallet link evidence map: observed transactions, NEVER shared ownership. */
const EVM_HOSTS={ethereum:"https://eth.blockscout.com",base:"https://base.blockscout.com"};
const ADDR=/^0x[a-fA-F0-9]{40}$/,HASH=/^0x[a-fA-F0-9]{64}$/;
const low=x=>typeof x==="string"?x.toLowerCase():"";
const short=x=>ADDR.test(x)?x.slice(0,8)+"…"+x.slice(-6):"—";
const l=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
export function safeProof(chain,hash){
 return EVM_HOSTS[chain]&&HASH.test(hash)?EVM_HOSTS[chain]+"/tx/"+hash:null;
}
export function walletGraph({chain,creator,holders,tokenLinks=[],nativeDirect=[],nativeVia=[]}={}){
 if(!EVM_HOSTS[chain]||!ADDR.test(creator))return {nodes:[],edges:[],reason:"creator_unknown"};
 const chosen=[],known=new Set([low(creator)]);
 for(const id of Array.isArray(holders)?holders:[]){
  if(ADDR.test(id)&&!known.has(low(id))){chosen.push(id);known.add(low(id));}
  if(chosen.length===3)break;
 }
 const nodes=[{id:creator,role:"creator"},...chosen.map((id,i)=>({id,role:"holder",rank:i+1}))];
 const canonical=new Map(nodes.map(x=>[low(x.id),x.id]));
 const edges=[],seen=new Set();
 function add(type,hash,from,to,sender){
  const url=safeProof(chain,hash),a=canonical.get(low(from)),b=canonical.get(low(to));
  if(!url||!a||!b||low(a)===low(b))return;
  if(low(a)!==low(creator)&&low(b)!==low(creator))return;
  const identity=[type,low(hash),low(a),low(b)].join("|");
  if(seen.has(identity))return;seen.add(identity);
  edges.push({type,hash,from:a,to:b,sender:ADDR.test(sender)?sender:null,url});
 }
 for(const x of Array.isArray(tokenLinks)?tokenLinks:[])add("token",x.hash,x.from,x.to,null);
 for(const x of Array.isArray(nativeDirect)?nativeDirect:[]){
  if(low(x.from)===low(creator))add("eth",x.hash,x.from,x.to,null);
 }
 for(const x of Array.isArray(nativeVia)?nativeVia:[]){
  if(x.kind==="creator_initiated_via_contract"&&ADDR.test(x.from)&&low(x.from)!==low(creator))
   add("contract",x.hash,creator,x.to,x.from);
  if(x.kind==="direct_internal_sender"&&low(x.from)===low(creator))
   add("eth",x.hash,creator,x.to,null);
 }
 return {nodes,edges:edges.slice(0,18),reason:edges.length?"observed":"none_in_sample"};
}
export async function boundedMap(input,limit,worker){
 if(!Array.isArray(input)||!Number.isInteger(limit)||limit<1||limit>3||typeof worker!=="function")
  throw new TypeError("Invalid map request");
 const results=Array(input.length);let next=0;
 await Promise.all(Array.from({length:Math.min(limit,input.length)},async()=>{
  while(next<input.length){const i=next++;results[i]=await worker(input[i],i);}
 }));
 return results;
}
export function memoizedBlockscout(reader,{max=64}={}){
 if(typeof reader!=="function")throw Error("Missing request reader");
 const cache=new Map();
 return url=>{
  if(typeof url!=="string"||!/^https:\/\/(eth|base)\.blockscout\.com\/api\/v2\/[0-9a-zA-Z/?&=_+.%:-]+$/.test(url))
   return Promise.reject(Error("Untrusted API destination"));
  if(!cache.has(url)){
   if(cache.size>=max)return Promise.reject(Error("Request limit reached"));
   const p=Promise.resolve().then(()=>reader(url));
   cache.set(url,p);
   p.catch(()=>{if(cache.get(url)===p)cache.delete(url);});
  }
  return cache.get(url);
 };
}
const SVG="http://www.w3.org/2000/svg";
function createTag(tag,css,value){
 const n=document.createElement(tag);if(css)n.className=css;
 if(value!==undefined)n.textContent=value;return n;
}
function shape(tag,attrs,txt){
 const n=document.createElementNS(SVG,tag);
 for(const [key,value] of Object.entries(attrs||{}))n.setAttribute(key,String(value));
 if(txt!==undefined)n.textContent=txt;return n;
}
function draw(canvas,graph){
 canvas.replaceChildren();
 if(!graph.nodes.length)return;
 const svg=shape("svg",{viewBox:"0 0 640 270",role:"img",
  "aria-label":l("Creator and holders, evidence lines only","생성자와 홀더의 증거 확인된 연결선")});
 const defs=shape("defs"),mark=shape("marker",
  {id:"yorbi-evidence-arrow",markerWidth:8,markerHeight:8,refX:6,refY:3,orient:"auto"});
 mark.append(shape("path",{d:"M0 0 L6 3 L0 6Z",fill:"#6978ad"}));
 defs.append(mark);svg.append(defs);
 const coords=new Map();
 coords.set(low(graph.nodes[0].id),{x:320,y:54});
 const holders=graph.nodes.slice(1);
 holders.forEach((n,i)=>{
  const x=holders.length===1?320:holders.length===2?190+i*260:125+i*195;
  coords.set(low(n.id),{x,y:208});
 });
 for(const edge of graph.edges){
  const a=coords.get(low(edge.from)),b=coords.get(low(edge.to));
  if(!a||!b)continue;
  const start=a.y<b.y?a.y+26:a.y-26,end=a.y<b.y?b.y-27:b.y+27;
  const path="M"+a.x+" "+start+" Q"+((a.x+b.x)/2+10)+" "+((start+end)/2)+" "+b.x+" "+end;
  svg.append(shape("path",{d:path,stroke:edge.type==="token"?"#6c77bf":edge.type==="eth"?"#368b91":"#a685b8",
   "stroke-width":2.6,"stroke-dasharray":edge.type==="contract"?"6 5":"none",
   "marker-end":"url(#yorbi-evidence-arrow)",fill:"none",opacity:0.86}));
 }
 graph.nodes.forEach((n,i)=>{
  const p=coords.get(low(n.id));if(!p)return;
  const g=shape("g");
  g.append(shape("rect",{x:p.x-94,y:p.y-25,width:188,height:50,rx:14,
   fill:i===0?"#eae9ff":"#f7f9ff",stroke:i===0?"#928bcc":"#d1d8ec","stroke-width":1.4}));
  g.append(shape("text",{x:p.x,y:p.y-7,"text-anchor":"middle","font-size":12,
   "font-weight":700,fill:"#263256"},i===0?l("Creator","생성자"):l("Holder "+i,"홀더 "+i)));
  g.append(shape("text",{x:p.x,y:p.y+12,"text-anchor":"middle",
   "font-size":10,"font-family":"monospace",fill:"#5a6990"},short(n.id)));
  svg.append(g);
 });
 canvas.append(svg);
}
function label(type){
 return type==="token"?l("Direct ERC-20 transfer","ERC-20 직접 전송"):
 type==="eth"?l("Direct ETH transfer","ETH 직접 송금"):
 l("Creator-initiated contract ETH receipt","생성자 시작 계약 경유 ETH 수령");
}
function setup(){
 const wrap=document.getElementById("tracker-graph");
 if(!wrap)return;
 const svg=document.getElementById("tracker-graph-svg"),
  summary=document.getElementById("tracker-graph-status"),
  counts=document.getElementById("tracker-graph-counts"),
  list=document.getElementById("tracker-graph-evidence");
 let first=null,deep=null;
 const render=()=>{
  if(!first)return;
  const graph=walletGraph({...first,...deep});
  draw(svg,graph);list.replaceChildren();
  const by={token:0,eth:0,contract:0};
  graph.edges.forEach(x=>by[x.type]++);
  counts.textContent=l(
   graph.edges.length+" evidenced links: "+by.token+" token, "+by.eth+" direct ETH, "+by.contract+" contract-mediated.",
   "증거 확인된 연결 "+graph.edges.length+"개: 토큰 "+by.token+" · ETH 직접 "+by.eth+" · 컨트랙트 경유 "+by.contract);
  summary.textContent=graph.reason==="creator_unknown"?
   l("Creator unverified; cannot attribute any links.","생성자 주소 미확인으로 연결 관계를 표시할 수 없습니다."):
   !graph.edges.length?l("No direct links observed in this limited sample; older links may exist.",
     "이번 제한된 표본에서 확인된 직접 연결은 없습니다. 과거·간접 연결은 있을 수 있습니다."):
   l("Arrows show observable transfers, NOT wallet ownership.",
     "화살표는 자금 이동 근거이며 같은 소유자의 지갑이라는 뜻이 아닙니다.");
  for(const e of graph.edges){
   const row=createTag("li","tracker-graph-link");
   row.append(createTag("strong","",label(e.type)));
   row.append(createTag("span","",short(e.from)+" → "+short(e.to)));
   if(e.sender)row.append(createTag("small","",
     l("Contract ETH sender: ","ETH 송금 컨트랙트: ")+short(e.sender)));
   const a=createTag("a","tracker-source",l("Original tx ↗","근거 거래 ↗"));
   a.href=e.url;a.target="_blank";a.rel="noopener noreferrer";row.append(a);list.append(row);
  }
  wrap.hidden=false;
  window.dispatchEvent(new CustomEvent("yorbi:graphsample",{detail:{
    chain:first.chain,token:first.token,graph
  }}));
 };
 window.addEventListener("yorbi:scanstart",()=>{
  first=null;deep=null;wrap.hidden=true;list.replaceChildren();svg.replaceChildren();
 });
 window.addEventListener("yorbi:walletsample",e=>{
  const d=e.detail||{};first={chain:d.chain,token:d.token,creator:d.creator,holders:d.holders,tokenLinks:d.tokenLinks};
  deep=null;render();
 });
 window.addEventListener("yorbi:deepsample",e=>{
  const d=e.detail||{};
  if(!first||first.chain!==d.chain||low(first.creator)!==low(d.creator)||low(first.token)!==low(d.token))return;
  deep={nativeDirect:d.direct,nativeVia:d.via};render();
 });
 window.addEventListener("yorbi:graphrequest",()=>{
  if(!first)return;
  window.dispatchEvent(new CustomEvent("yorbi:graphsample",{detail:{
   chain:first.chain,token:first.token,graph:walletGraph({...first,...deep})
  }}));
 });
 window.addEventListener("yorbi:languagechange",()=>{if(first)render();});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
}
