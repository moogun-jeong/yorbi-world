/* YORBI Sprint 6.8 — local observation history, NOT real-time CEX listing verification.
   Only scans initiated by the user record new samples; restoring cached results does not.
   No automatic monitoring, API keys, trading, rankings or fabricated growth percentages.
*/
export const GROWTH_KEY="yorbi:moonshot-snapshots:v1";
export const GROWTH_RETENTION_MS=30*24*60*60*1000;
export const GROWTH_MIN_COMPARISON_MS=15*60*1000;
export const GROWTH_PER_TOKEN_LIMIT=48;
export const GROWTH_GLOBAL_LIMIT=240;
const chains=new Set(["ethereum","base","bsc","solana"]);
const evm=/^0x[a-fA-F0-9]{40}$/;
const sol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const readable=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
const numberOrNull=x=>{
 if(x===null||x===undefined||x===""||typeof x==="boolean")return null;
 const v=Number(x);
 return Number.isFinite(v)&&v>=0?v:null;
};
export function tokenKey(chain,address){
 if(!chains.has(chain)||typeof address!=="string")return null;
 if(chain==="solana")return sol.test(address)?chain+":"+address:null;
 return evm.test(address)?chain+":"+address.toLowerCase():null;
}
export function takeMarketSnapshot(explorer){
 const key=tokenKey(explorer?.chain,explorer?.address);
 if(!key||!explorer?.pair||!Number.isSafeInteger(explorer.date)||explorer.date<=0)return null;
 const pair=explorer.pair;
 const base=tokenKey(explorer.chain,pair.baseToken?.address);
 if(base!==key)return null;
 const pool=pair.pairAddress;
 if(typeof pool!=="string"||pool.length>128)return null;
 const time=explorer.date;
 const holders=null;
 return {
  key,chain:explorer.chain,address:explorer.address,checkedAt:time,
  pairAddress:pool,dex:typeof pair.dexId==="string"?pair.dexId.slice(0,70):null,
  marketCap:numberOrNull(pair.marketCap),fdv:numberOrNull(pair.fdv),
  liquidity:numberOrNull(pair.liquidity?.usd),volume24h:numberOrNull(pair.volume?.h24),
  priceUsd:numberOrNull(pair.priceUsd),holderCount:holders,
  buys24h:numberOrNull(pair.txns?.h24?.buys),sells24h:numberOrNull(pair.txns?.h24?.sells),
  priceChange24h:typeof pair.priceChange?.h24==="number"&&Number.isFinite(pair.priceChange.h24)?
   pair.priceChange.h24:null,
  pairCreatedAt:Number.isSafeInteger(pair.pairCreatedAt)&&pair.pairCreatedAt>0?pair.pairCreatedAt:null
 };
}
export function readHolderCount(security,snapshot){
 if(!security?.report||!snapshot||security.chain!==snapshot.chain||
    tokenKey(security.chain,security.address)!==snapshot.key)return null;
 const count=numberOrNull(security.report.holderCount);
 return count!==null&&Number.isSafeInteger(count)?count:null;
}
export function saveObservation(records,snapshot,now=Date.now()){
 if(!snapshot?.key||tokenKey(snapshot.chain,snapshot.address)!==snapshot.key||
    !Number.isSafeInteger(snapshot.checkedAt)||snapshot.checkedAt>now+60000)return [];
 const filtered=(Array.isArray(records)?records:[]).filter(r=>
  r&&r.key===tokenKey(r.chain,r.address)&&Number.isSafeInteger(r.checkedAt)&&
  r.checkedAt>now-GROWTH_RETENTION_MS&&r.checkedAt<=now+60000);
 const same=filtered.findIndex(r=>r.key===snapshot.key&&
  Math.abs(r.checkedAt-snapshot.checkedAt)<5*60*1000);
 if(same>=0){
  // Same provider fetch/scan interval: do not manufacture a second growth observation.
  const former=filtered[same];
  filtered[same]={...snapshot,holderCount:snapshot.holderCount??former.holderCount,
   checkedAt:snapshot.checkedAt,marketCap:snapshot.marketCap,fdv:snapshot.fdv};
 }else filtered.push(snapshot);
 filtered.sort((a,b)=>a.checkedAt-b.checkedAt);
 const per=new Map(),kept=[];
 for(let i=filtered.length-1;i>=0;i--){
  const r=filtered[i],n=per.get(r.key)||0;
  if(n>=GROWTH_PER_TOKEN_LIMIT||kept.length>=GROWTH_GLOBAL_LIMIT)continue;
  per.set(r.key,n+1);kept.push(r);
 }
 return kept.reverse();
}
export function previousObservation(records,current){
 if(!current?.key)return null;
 const matches=(Array.isArray(records)?records:[]).filter(r=>r?.key===current.key&&
  Number.isFinite(r.checkedAt)&&r.checkedAt<=current.checkedAt-GROWTH_MIN_COMPARISON_MS);
 matches.sort((a,b)=>b.checkedAt-a.checkedAt);
 return matches[0]||null;
}
export function observedChange(current,prior,metric){
 const value=current?.[metric],baseline=prior?.[metric];
 if(typeof value!=="number"||!Number.isFinite(value)||typeof baseline!=="number"||
    !Number.isFinite(baseline)||baseline<0)return null;
 // Different highest-liquidity pairs can be selected on different scans:
 // pair-specific liquidity and rolling 24h volume are not comparable across pools.
 if((metric==="liquidity"||metric==="volume24h")&&
   typeof current.pairAddress==="string"&&typeof prior.pairAddress==="string"&&
   current.pairAddress.toLowerCase()!==prior.pairAddress.toLowerCase())return null;
 const diff=value-baseline;
 return {current:value,previous:baseline,difference:diff,
  percent:baseline>0?diff/baseline*100:null,
  elapsedMs:current.checkedAt-prior.checkedAt};
}
export function listingPath(explorer,cex=null){
 if(!explorer?.pair)return [];
 const stages=[
  {step:"dex",en:"DEX liquidity pool",ko:"DEX 거래쌍",status:"observed",
   enNote:"One matching DEX pool is observed. This does NOT prove DEX-only status.",
   koNote:"일치하는 DEX 거래쌍 1개를 확인했습니다. DEX에만 상장됐다는 증거는 아닙니다."},
  {step:"small",en:"Small CEX",ko:"소형 CEX",status:"unknown",enNote:"Not checked against exchange markets.",
   koNote:"거래소별 상장 마켓을 조회하지 않았습니다."},
  {step:"mid",en:"Mid-size CEX",ko:"중형 CEX",status:"unknown",enNote:"Not checked.",
   koNote:"상장 여부 미검증"},
  {step:"tier1",en:"Major / Tier-1 CEX",ko:"대형·Tier-1 CEX",status:"unknown",enNote:"Not checked.",
   koNote:"상장 여부 미검증"},
  {step:"binance",en:"Binance / Coinbase",ko:"Binance / Coinbase",status:"unknown",
   enNote:"No listing promise, ETA, probability or verification.",
   koNote:"상장 보장·일정·확률을 추정하지 않습니다."}
 ];
 if(!Array.isArray(cex?.results))return stages;
 // This is a deliberately restricted exchange sample, not the whole CEX universe.
 const apply=(stage,exchanges)=>{
  const rows=cex.results.filter(r=>exchanges.includes(r.id));
  const verified=rows.filter(r=>r.status==="contract_verified");
  const candidates=rows.filter(r=>r.status==="ticker_market");
  if(verified.length){
   stage.status="contract_verified";
   stage.enNote="Exact contract + active spot pair at "+verified.map(r=>r.name).join(", ")+". Other exchanges remain unverified.";
   stage.koNote=verified.map(r=>r.name).join(", ")+"의 공식 자산 컨트랙트와 현물 마켓이 일치합니다. 다른 거래소는 미검증입니다.";
  }else if(candidates.length){
   stage.status="ticker_market";
   stage.enNote="Spot pair with matching ticker at "+candidates.map(r=>r.name).join(", ")+", but contract identity NOT verified.";
   stage.koNote=candidates.map(r=>r.name).join(", ")+"에서 같은 티커의 현물 거래쌍을 확인했지만 동일 컨트랙트인지는 미검증입니다.";
  }
 };
 apply(stages[2],["kucoin"]);
 apply(stages[3],["kraken","binance","coinbase"]);
 apply(stages[4],["binance","coinbase"]);
 return stages;
}
export function reviewGrowth(records,current){
 const matching=(Array.isArray(records)?records:[]).filter(r=>r?.key===current?.key);
 const prior=previousObservation(matching,current);
 const metrics=["marketCap","fdv","volume24h","liquidity","holderCount"];
 const changes=Object.fromEntries(metrics.map(m=>[m,observedChange(current,prior,m)]));
 return {current,prior,changes,history:matching.slice().sort((a,b)=>a.checkedAt-b.checkedAt),
  coverage:{observations:matching.length,holderHistory:matching.filter(x=>x.holderCount!==null).length,
   cexListingVerified:false,liquidityLocked:false,automatedWatch:false},
  path:listingPath({pair:current?.pairAddress?{pairAddress:current.pairAddress}:null})};
}
function el(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;
 if(value!==undefined)n.textContent=value;return n;}
function usd(n){
 if(n===null||n===undefined)return "—";
 if(n>=1e9)return "$"+(n/1e9).toFixed(2)+"B";
 if(n>=1e6)return "$"+(n/1e6).toFixed(2)+"M";
 if(n>=1e3)return "$"+(n/1e3).toFixed(2)+"K";
 if(n>0&&n<.001)return "$"+n.toExponential(2);
 return "$"+n.toLocaleString("en-US",{maximumFractionDigits:3});
}
function num(n){return n===null||n===undefined?"—":Number(n).toLocaleString("en-US");}
function duration(ms){
 const hours=ms/3600000;
 return hours>=48?(hours/24).toFixed(1)+"d":hours>=1?hours.toFixed(1)+"h":Math.round(ms/60000)+"m";
}
function percent(v){
 if(v===null)return "—";
 return (v>0?"+":"")+v.toFixed(1)+"%";
}
function miniChart(parent,history,field){
 parent.replaceChildren();
 const points=history.filter(s=>typeof s[field]==="number"&&Number.isFinite(s[field]))
   .slice(-14);
 if(points.length<2){parent.append(el("small","growth-muted",readable("At least two valid observations required.","유효한 관찰 기록이 2개 이상 필요합니다.")));return;}
 const values=points.map(x=>x[field]),low=Math.min(...values),high=Math.max(...values);
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 300 70");svg.setAttribute("role","img");
 svg.setAttribute("aria-label",readable("Historical observed "+field+" values","과거 관찰된 "+field+" 값"));
 const poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");
 const coords=values.map((v,i)=>[9+i*282/(values.length-1),55-(high===low?20:(v-low)/(high-low)*42)]);
 poly.setAttribute("points",coords.map(p=>p.join(",")).join(" "));
 poly.setAttribute("fill","none");poly.setAttribute("stroke","currentColor");
 poly.setAttribute("stroke-width","2.5");poly.setAttribute("stroke-linejoin","round");
 svg.append(poly);parent.append(svg);
}
function getStore(){
 try{return window.localStorage;}catch(_){return null;}
}
export function parseHistory(serialized,now=Date.now()){
 if(typeof serialized!=="string"||serialized.length>200000)return [];
 try{
  const json=JSON.parse(serialized);
  if(!Array.isArray(json))return [];
  return json.filter(r=>r&&r.key===tokenKey(r.chain,r.address)&&
   Number.isSafeInteger(r.checkedAt)&&r.checkedAt>now-GROWTH_RETENTION_MS&&r.checkedAt<=now+60000)
   .slice(-GROWTH_GLOBAL_LIMIT);
 }catch(_){return [];}
}
function init(){
 const panel=document.getElementById("growth-panel");if(!panel)return;
 const metrics=document.getElementById("growth-metrics"),
  historyNote=document.getElementById("growth-history"),chart=document.getElementById("growth-chart"),
  holdersChart=document.getElementById("growth-holders-chart"),
  path=document.getElementById("growth-listing"),clear=document.getElementById("growth-clear"),
  status=document.getElementById("growth-status");
 const storage=getStore();
 let initialHistory="";
 try{initialHistory=storage?.getItem(GROWTH_KEY)||"";}catch(_){}
 let records=parseHistory(initialHistory),current=null,justScanned=false,cex=null;
 const language=()=>document.documentElement.lang==="ko"?"ko":"en";
 const persist=()=>{if(storage)try{storage.setItem(GROWTH_KEY,JSON.stringify(records));}catch(_){}};
 function render(){
  if(!current){panel.hidden=true;return;}
  const data=reviewGrowth(records,current),prior=data.prior,changes=data.changes;
  metrics.replaceChildren();
  const definitions=[
   ["marketCap","Market cap","시가총액",usd],
   ["fdv","FDV (not market cap)","FDV (시총과 다름)",usd],
   ["volume24h","Rolling 24h volume","최근 24시간 거래량",usd],
   ["liquidity","Selected pair liquidity","선택 거래쌍 유동성",usd],
   ["holderCount","Provider-reported holders","제공사 홀더 수",num],
   ["poolAge","Pair age (not token age)","거래쌍 생성 후 경과일",num]
  ];
  for(const [field,en,ko,format] of definitions){
   const section=el("div","growth-metric");
   section.append(el("small","",language()==="ko"?ko:en),
     el("strong","",field==="poolAge"?
       (current.pairCreatedAt!==null&&current.checkedAt>=current.pairCreatedAt?
         Math.floor((current.checkedAt-current.pairCreatedAt)/86400000)+readable(" days","일"):"—"):
       format(current[field])),
     el("span","growth-delta",field==="poolAge"?
       readable("DEX pair created; token launch may be earlier.","DEX 거래쌍 생성일이며 실제 토큰 발행일과 다를 수 있음"):
       changes[field]?
       (changes[field].percent===null?
         readable("Change ","증감 ")+(changes[field].difference>0?"+":"")+
           (field==="holderCount"?num(changes[field].difference):usd(changes[field].difference)):
         percent(changes[field].percent))+" · "+duration(changes[field].elapsedMs):
       readable("No comparable earlier observation","비교할 이전 기록 없음")));
   metrics.append(section);
  }
  const pairChanged=prior&&prior.pairAddress.toLowerCase()!==current.pairAddress.toLowerCase();
  historyNote.textContent=language()==="ko"?
   "이 기기에서 저장한 이 토큰 관찰 기록 "+data.coverage.observations+"개 (최대 30일). "+
    (prior?"직전 비교 시각: "+new Date(prior.checkedAt).toLocaleString("ko-KR"):"15분 이상 차이의 이전 관찰 기록이 있어야 변화율을 계산합니다.")+
    (pairChanged?" · 이전 조회와 대표 DEX 풀이 달라 유동성·24h 거래량은 비교하지 않습니다.":"")+
    " · 조회하지 않은 기간의 성장 추이를 알 수 없습니다.":
   data.coverage.observations+" device-local observations (up to 30 days). "+
    (prior?"Previous reference: "+new Date(prior.checkedAt).toLocaleString("en-US"):
     "A separate observation at least 15 minutes earlier is required for a comparison.")+
    (pairChanged?" The selected pool changed; liquidity/volume comparisons are omitted.":"")+" Unobserved periods cannot be reconstructed.";
  miniChart(chart,data.history,"marketCap");
  miniChart(holdersChart,data.history,"holderCount");
  path.replaceChildren();
  for(const step of listingPath({pair:current?.pairAddress?{pairAddress:current.pairAddress}:null},cex)){
   const li=el("li","growth-stage");
   li.append(el("span","growth-stage-status "+(step.status==="observed"?"growth-observed":""),
    step.status==="observed"?readable("Observed","확인"):
    step.status==="contract_verified"?readable("Exact contract","컨트랙트 확인"):
    step.status==="ticker_market"?readable("Ticker only","티커만 확인"):
    readable("Not checked","미검증")));
   li.append(el("strong","",language()==="ko"?step.ko:step.en));
   li.append(el("small","",language()==="ko"?step.koNote:step.enNote));
   path.append(li);
  }
  panel.hidden=false;
 }
 function newScan(record){
  const sample=takeMarketSnapshot(record);
  if(!sample)return;
  current=sample;justScanned=true;cex=null;
  records=saveObservation(records,sample);
  persist();render();
 }
 function mergeHolder(value){
  if(!justScanned||!current)return;
  const count=readHolderCount(value,current);
  if(count===null||value.time<current.checkedAt||value.time>current.checkedAt+15*60000)return;
  current={...current,holderCount:count};
  records=saveObservation(records,current);
  persist();render();
 }
 window.addEventListener("yorbi:scanstart",()=>{
  current=null;justScanned=false;cex=null;panel.hidden=true;
 });
 window.addEventListener("yorbi:cachechange",e=>{
  const {section,value}=e.detail||{};
  if(section==="explorer")newScan(value);
  if(section==="security")mergeHolder(value);
 });
 window.addEventListener("yorbi:restore-explorer",e=>{
  const snapshot=takeMarketSnapshot(e.detail);
  if(!snapshot)return;
  current=records.filter(r=>r.key===snapshot.key&&r.checkedAt===snapshot.checkedAt).at(-1)||snapshot;
  justScanned=false;cex=null;render();
 });
 window.addEventListener("yorbi:restore-security",e=>{
  // Restoration is not a new observation. Only display a previously saved holder value.
  if(!current||!e.detail||e.detail.time<current.checkedAt)return;
  const n=readHolderCount(e.detail,current);
  if(n!==null&&current.holderCount===null){current={...current,holderCount:n};render();}
 });
 window.addEventListener("yorbi:cexresult",e=>{
  const report=e.detail;
  if(!current||report?.chain!==current.chain||report.contract!==current.key||
     !Array.isArray(report.results))return;
  cex=report;render();
 });
 window.addEventListener("yorbi:languagechange",render);
 clear.addEventListener("click",()=>{
  if(!current)return;
  records=records.filter(r=>r.key!==current.key);
  persist();
  status.textContent=readable("This token's locally collected growth history was cleared.",
   "이 토큰의 기기 내 성장 관찰 기록을 지웠습니다.");
  render();
 });
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
