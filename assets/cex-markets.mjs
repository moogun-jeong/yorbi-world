/* YORBI Sprint 6.9 — official CEX spot-market checks.
 * Only checks ONE chosen quote market per venue; no "DEX-only" or future listing claims.
 * A same-symbol market is NOT proof that the chain+contract matches.
 * User-click only, five publicly available REST requests, no keys or server storage.
 */
const CEX_HOSTS=Object.freeze({
 binance:"https://data-api.binance.vision",
 coinbase:"https://api.exchange.coinbase.com",
 kraken:"https://api.kraken.com",
 kucoin:"https://api.kucoin.com"
});
export const CEX_VENUES=Object.freeze([
 {id:"binance",name:"Binance",tier:"major",quote:"USDT"},
 {id:"coinbase",name:"Coinbase",tier:"major",quote:"USD"},
 {id:"kraken",name:"Kraken",tier:"major",quote:"USD"},
 {id:"kucoin",name:"KuCoin",tier:"mid",quote:"USDT"}
]);
const EVM=/^0x[a-fA-F0-9]{40}$/;
const SOL=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const norm=x=>typeof x==="string"?x.toLowerCase():"";
export function marketSymbol(value){
 return typeof value==="string"&&/^[A-Za-z0-9]{2,15}$/.test(value)?value.toUpperCase():null;
}
export function contractKey(chain,address){
 if(chain==="solana")return SOL.test(address||"")?"solana:"+address:null;
 return ["ethereum","base","bsc"].includes(chain)&&EVM.test(address||"")?
  chain+":"+address.toLowerCase():null;
}
export function cexRequests(symbol){
 const code=marketSymbol(symbol);
 if(!code)return [];
 return [
  {id:"binance",kind:"market",url:CEX_HOSTS.binance+"/api/v3/exchangeInfo?symbol="+code+"USDT"},
  {id:"coinbase",kind:"market",url:CEX_HOSTS.coinbase+"/products/"+code+"-USD"},
  {id:"coinbase",kind:"currency",url:CEX_HOSTS.coinbase+"/currencies/"+code},
  {id:"kraken",kind:"market",url:CEX_HOSTS.kraken+"/0/public/AssetPairs?pair="+code+"USD"},
  {id:"kucoin",kind:"market",url:CEX_HOSTS.kucoin+"/api/v2/symbols/"+code+"-USDT"}
 ];
}
export function networkContract(currency,chain,contract){
 if(!currency||!contractKey(chain,contract)||!Array.isArray(currency.supported_networks))
  return {status:"unknown",address:null};
 const allowed={
  ethereum:["ethereum"],base:["base"],bsc:["bsc","bep20","bnb smart chain","binance smart chain"],
  solana:["solana"]
 }[chain]||[];
 const sameNetwork=currency.supported_networks.filter(n=>
  allowed.includes(norm(n?.id))||allowed.includes(norm(n?.name)));
 const actual=sameNetwork.map(n=>n?.contract_address).filter(x=>contractKey(chain,x));
 if(!actual.length)return {status:"unknown",address:null};
 const matching=actual.find(x=>contractKey(chain,x)===contractKey(chain,contract));
 return matching?{status:"match",address:matching}:{status:"mismatch",address:actual[0]};
}
function report(venue,kind,pair,url,status,detail=null){
 return {id:venue,name:CEX_VENUES.find(x=>x.id===venue)?.name||venue,
  tier:CEX_VENUES.find(x=>x.id===venue)?.tier||"unknown",
  pair,source:url,status,detail,identity:"unknown"};
}
export function inspectCexResponse(venue,raw,currency,symbol,chain,contract,url){
 const code=marketSymbol(symbol),entry=CEX_VENUES.find(x=>x.id===venue);
 if(!entry||!code||!contractKey(chain,contract))return report(venue,"error",null,url,"unavailable","invalid_scope");
 const pair=venue==="binance"?code+"USDT":
  venue==="coinbase"?code+"-USD":venue==="kraken"?code+"/USD":code+"-USDT";
 const result=report(venue,"market",pair,url,"unavailable","unknown_response");
 if(raw===null||raw===undefined||raw?.__fetchError)return {...result,status:"unavailable",detail:"network_or_cors"};
 if(raw?.__notFound===true)return {...result,status:"not_found_pair",detail:"checked_pair_only"};
 let listed=false,enabled=false;
 if(venue==="binance"){
  if(raw.code===-1121||raw.code===-1122)return {...result,status:"not_found_pair",detail:"invalid_symbol"};
  const matches=Array.isArray(raw.symbols)?raw.symbols.filter(x=>x?.symbol===code+"USDT"&&x.baseAsset===code&&x.quoteAsset==="USDT"):[];
  if(!Array.isArray(raw.symbols))return result;
  listed=matches.length>0;
  enabled=matches.some(x=>x.status==="TRADING"&&x.isSpotTradingAllowed!==false);
 }else if(venue==="coinbase"){
  if(raw.id!==code+"-USD"||raw.base_currency!==code||raw.quote_currency!=="USD")
   return result;
  listed=true;enabled=raw.status==="online"&&!raw.trading_disabled&&!raw.cancel_only;
 }else if(venue==="kraken"){
  if(!Array.isArray(raw.error)||!raw.result||typeof raw.result!=="object")return result;
  if(raw.error.length>0)return {...result,status:"unavailable",detail:"provider_error"};
  const matches=Object.values(raw.result).filter(x=>
   x&&typeof x.wsname==="string"&&x.wsname.toUpperCase()===code+"/USD"&&
   (x.base===code||x.altname===code+"USD"||x.wsname?.split("/")[0]===code));
  listed=matches.length>0;
  enabled=matches.some(x=>x.status==="online");
 }else if(venue==="kucoin"){
  if(raw.code!=="200000")return {...result,status:"unavailable",detail:"provider_error"};
  const x=raw.data;
  listed=Boolean(x&&x.symbol===code+"-USDT"&&x.baseCurrency===code&&x.quoteCurrency==="USDT");
  enabled=listed&&x.enableTrading===true;
 }
 if(!listed)return {...result,status:"not_found_pair",detail:"checked_pair_only"};
 if(!enabled)return {...result,status:"paused",identity:"ticker_only",detail:"market_not_trading"};
 if(venue==="coinbase"){
  const identity=networkContract(currency,chain,contract);
  if(identity.status==="match")return {...result,status:"contract_verified",identity:"contract_verified",detail:identity.address};
  if(identity.status==="mismatch")return {...result,status:"contract_mismatch",identity:"different_contract",detail:identity.address};
 }
 return {...result,status:"ticker_market",identity:"ticker_only",detail:"contract_unverified"};
}
export function summarizeCexResults(results){
 const known=Array.isArray(results)?results:[];
 const verified=known.filter(x=>x.status==="contract_verified").length;
 const ticker=known.filter(x=>x.status==="ticker_market").length;
 const mismatch=known.filter(x=>x.status==="contract_mismatch").length;
 const unavailable=known.filter(x=>x.status==="unavailable").length;
 const noPair=known.filter(x=>x.status==="not_found_pair").length;
 return {verified,ticker,mismatch,unavailable,noPair,checked:known.length,
  dexOnlyProven:false,cexAbsenceProven:false,remainingListingPathKnown:false};
}
export function restoreMatches(result,chain,contract,symbol){
 return Boolean(result&&result.chain===chain&&result.contract===contractKey(chain,contract)&&
  result.symbol===marketSymbol(symbol)&&Number.isFinite(result.checkedAt)&&
  Date.now()-result.checkedAt>=0&&Date.now()-result.checkedAt<12*3600000);
}
export async function boundedCexFetch(requests,fetcher,{concurrency=2}={}){
 if(!Array.isArray(requests)||typeof fetcher!=="function"||concurrency<1||concurrency>2)
  throw Error("Invalid market fetch input");
 const output=new Array(requests.length);let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,requests.length)},async()=>{
  while(next<requests.length){
   const i=next++;
   const task=requests[i];
   try{output[i]=await fetcher(task);}catch(_){output[i]={__fetchError:true};}
  }
 }));
 return output;
}
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function initCex(){
 const section=document.getElementById("cex-check");if(!section)return;
 const run=document.getElementById("cex-run"),list=document.getElementById("cex-results"),
  message=document.getElementById("cex-status"),summary=document.getElementById("cex-summary");
 let chain=null,contract=null,symbol=null,job=0,controller=null,last=null,working=false;
 const lng=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
 const valid=()=>Boolean(chain&&contractKey(chain,contract)&&marketSymbol(symbol));
 function reset(){
  job++;controller?.abort();controller=null;chain=null;contract=null;symbol=null;
  last=null;working=false;section.hidden=true;list.replaceChildren();
  message.textContent="";summary.textContent="";run.disabled=false;
 }
 function render(){
  if(!valid()){section.hidden=true;return;}
  section.hidden=false;list.replaceChildren();
  if(!last){message.textContent=lng(
   "Official CEX market check is optional. Click to inspect 4 exchanges (5 API calls).",
   "선택 조회입니다. 버튼을 누르면 공식 CEX 4곳의 거래쌍(최대 API 5회)을 확인합니다.");
   summary.textContent="";return;}
  const stats=summarizeCexResults(last.results);
  message.textContent=lng("Checked at ","조회 시각 ")+new Date(last.checkedAt).toLocaleString()+
   " · "+lng("Only selected USD/USDT pairs were checked.","선정된 USD/USDT 거래쌍만 검사했습니다.");
  summary.textContent=lng(
    stats.verified+" exact-contract market(s), "+stats.ticker+" ticker-only market(s), "+
    stats.unavailable+" unavailable. No DEX-only status inferred.",
    "컨트랙트 일치 "+stats.verified+"곳 · 티커 마켓 "+stats.ticker+
    "곳 · 조회 불가 "+stats.unavailable+"곳. DEX-only 판정 불가.");
  for(const x of last.results){
   const row=el("div","cex-result");
   const head=el("div","cex-result-head");
   const label=el("strong","",x.name+" · "+x.pair);
   const meta={
    contract_verified:["Exact contract confirmed","컨트랙트 일치 확인"],
    ticker_market:["Ticker market found · identity unverified","티커 마켓 확인 · 동일 코인 미검증"],
    contract_mismatch:["Different contract on this chain","해당 체인 컨트랙트 불일치"],
    paused:["Market exists, trading not active","마켓 존재 · 거래 활성 아님"],
    not_found_pair:["Selected pair not found","검사한 거래쌍 미발견"],
    unavailable:["API unavailable / not verified","공식 API 조회 불가"]
   }[x.status]||["Unknown","미확인"];
   head.append(label,el("span","cex-result-status cex-"+x.status,lng(...meta)));
   row.append(head);
   if(x.status==="contract_mismatch"&&typeof x.detail==="string")
    row.append(el("small","cex-result-explain",lng("Exchange lists a different contract: ","거래소에 표기된 다른 컨트랙트: ")+x.detail));
   else if(x.status==="contract_verified")
    row.append(el("small","cex-result-explain",lng("Official exchange currency metadata confirms this chain and contract.",
      "거래소의 공식 자산 정보가 현재 체인·컨트랙트와 일치합니다.")));
   else row.append(el("small","cex-result-explain",lng(
     "Market ticker is not contract identity. No absence claim for other quote pairs.",
     "티커 일치만으로 같은 코인인지 확인할 수 없습니다. 다른 거래쌍의 미상장도 확정하지 않습니다.")));
   const anchor=el("a","cex-original",lng("Official API evidence ↗","공식 API 근거 ↗"));
   anchor.href=x.source;anchor.rel="noopener noreferrer";anchor.target="_blank";row.append(anchor);
   list.append(row);
  }
 }
 function receiveExplorer(value,restored=false){
  const p=value?.pair,base=p?.baseToken?.address;
  if(!p||contractKey(value.chain,value.address)!==contractKey(value.chain,base))return;
  const nextSymbol=marketSymbol(p.baseToken?.symbol);
  chain=value.chain;contract=value.address;symbol=nextSymbol;
  if(!valid()){section.hidden=true;return;}
  last=null;render();
  if(!nextSymbol)message.textContent=lng("Unsupported ticker characters for official market lookup.",
   "티커 형식이 공식 마켓 조회용 코드와 맞지 않습니다.");
 }
 window.addEventListener("yorbi:scanstart",reset);
 window.addEventListener("yorbi:cachechange",e=>{
  if(e.detail?.section==="explorer"){reset();receiveExplorer(e.detail.value);}
 });
 window.addEventListener("yorbi:restore-explorer",e=>{reset();receiveExplorer(e.detail);});
 window.addEventListener("yorbi:restore-cex",e=>{
  const x=e.detail;
  if(!valid()||!restoreMatches(x,chain,contract,symbol))return;
  last=x;render();
  window.dispatchEvent(new CustomEvent("yorbi:cexresult",{detail:last}));
 });
 window.addEventListener("yorbi:languagechange",render);
 async function apiCall(task,signal){
  const timeout=new AbortController(),onAbort=()=>timeout.abort();
  if(signal.aborted)timeout.abort();
  signal.addEventListener("abort",onAbort,{once:true});
  const timer=setTimeout(()=>timeout.abort(),9000);
  try{
   const response=await fetch(task.url,{headers:{Accept:"application/json"},signal:timeout.signal,cache:"no-store"});
   if(response.status===404)return {__notFound:true};
   if(!response.ok)throw Error("HTTP_"+response.status);
   return await response.json();
  }finally{clearTimeout(timer);signal.removeEventListener("abort",onAbort);}
 }
 run.addEventListener("click",async()=>{
  if(!valid()||working)return;
  const id=++job,snapshot={chain,contract:contractKey(chain,contract),symbol};
  working=true;run.disabled=true;
  controller=new AbortController();
  message.textContent=lng("Checking official CEX spot markets (0/5)…",
   "공식 CEX 현물 마켓 확인 중 (0/5)…");
  let finished=0;
  const requests=cexRequests(symbol);
  const done=await boundedCexFetch(requests,async task=>{
   const value=await apiCall(task,controller.signal);
   finished++;
   if(id===job)message.textContent=lng("Official requests completed: ","공식 API 응답 완료: ")+finished+"/"+requests.length;
   return value;
  },{concurrency:2});
  if(id!==job||controller.signal.aborted)return;
  const currency=done[2]?.__fetchError||done[2]?.__notFound?null:done[2];
  const output=[0,1,3,4].map(i=>inspectCexResponse(requests[i].id,done[i],currency,
    snapshot.symbol,snapshot.chain,contract,requests[i].url));
  last={...snapshot,checkedAt:Date.now(),results:output};
  working=false;run.disabled=false;controller=null;
  render();
  window.dispatchEvent(new CustomEvent("yorbi:cexresult",{detail:last}));
  window.dispatchEvent(new CustomEvent("yorbi:cachechange",{detail:{section:"cex",value:last}}));
 });
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initCex,{once:true});
 else initCex();
}
