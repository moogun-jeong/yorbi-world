/* YORBI Sprint 6.5 - bounded observations, never lifetime portfolio or proven PnL.
 * Zero extra API calls. Reports stay on the browser unless the visitor explicitly exports.
 */
const addressRE=/^0x[a-fA-F0-9]{40}$/, hashRE=/^0x[a-fA-F0-9]{64}$/;
const host=Object.freeze({ethereum:"https://eth.blockscout.com",base:"https://base.blockscout.com"});
const lowered=a=>typeof a==="string"?a.toLowerCase():"";
const short=a=>addressRE.test(a)?a.slice(0,8)+"…"+a.slice(-6):"—";
const lang=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
const allowedPeriods=new Set(["24h","7d","sample"]);
const verdictTypes=["swap_buy_evidence","swap_sell_evidence","swap_context_evidence","transfer","unverified"];
export function parseMovement(record,wallet,token){
 if(!record||!addressRE.test(wallet)||!addressRE.test(token)||
    lowered(record.token?.address_hash)!==lowered(token)||!hashRE.test(record.transaction_hash))return null;
 const from=record.from?.hash,to=record.to?.hash;
 if(!addressRE.test(from)||!addressRE.test(to))return null;
 const origin=lowered(from)===lowered(wallet),destination=lowered(to)===lowered(wallet);
 if(origin===destination)return null;
 const date=Date.parse(record.timestamp||"");
 if(!Number.isFinite(date))return null;
 const raw=record.total?.value;
 const dec=Number(record.total?.decimals??record.token?.decimals);
 let amount=null;
 if(typeof raw==="string"&&/^[0-9]+$/.test(raw)&&Number.isInteger(dec)&&dec>=0&&dec<=36){
  try{
   const calculated=Number(BigInt(raw))/Math.pow(10,dec);
   if(Number.isFinite(calculated))amount=calculated;
  }catch(_){}
 }
 const index=record.log_index??record.index??"";
 return {wallet,hash:record.transaction_hash,direction:destination?"in":"out",
  amount,time:new Date(date).toISOString(),timestamp:date,logIndex:String(index)};
}
export function normalizeMovements(wallets,token){
 const out=[],dedup=new Set();let walletsObserved=0,paginatedWallets=0;
 for(const entry of Array.isArray(wallets)?wallets:[]){
  if(!addressRE.test(entry?.address)||!Array.isArray(entry?.records))continue;
  walletsObserved++;
  if(entry?.more===true)paginatedWallets++;
  for(const raw of entry.records.slice(0,50)){
   const move=parseMovement(raw,entry.address,token);
   if(!move)continue;
   // Same tx can contain multiple transfer logs; log index differentiates when available.
   // On missing log index, retaining the ordinal avoids collapsing independent movements.
   const key=[lowered(move.wallet),lowered(move.hash),move.logIndex||String(raw?.__ordinal??out.length),
     move.direction].join("|");
   if(dedup.has(key))continue;dedup.add(key);out.push(move);
  }
 }
 return {movements:out,walletsObserved,paginatedWallets};
}
export function periodSample(movements,period,now){
 if(!allowedPeriods.has(period)||!Number.isFinite(now))throw new TypeError("Invalid period or reference time");
 const horizon=period==="24h"?86400000:period==="7d"?7*86400000:null;
 const start=horizon===null?-Infinity:now-horizon;
 return (Array.isArray(movements)?movements:[]).filter(x=>
  Number.isFinite(x.timestamp)&&x.timestamp<=now&&x.timestamp>=start);
}
export function summarizeMoves(movements,period,now){
 const selected=periodSample(movements,period,now);
 const byWallet=new Map(),byDay=new Map();let invalidAmount=0;
 for(const ev of selected){
  let w=byWallet.get(lowered(ev.wallet));
  if(!w){w={wallet:ev.wallet,in:0,out:0,inAmount:0,outAmount:0,unknownAmounts:0};byWallet.set(lowered(ev.wallet),w);}
  const date=ev.time.slice(0,10);
  let d=byDay.get(date);
  if(!d){d={date,in:0,out:0,unknownAmounts:0};byDay.set(date,d);}
  w[ev.direction]++;d[ev.direction]++;
  if(ev.amount===null){w.unknownAmounts++;d.unknownAmounts++;invalidAmount++;}
  else w[ev.direction==="in"?"inAmount":"outAmount"]+=ev.amount;
 }
 return {period,total:selected.length,missingAmounts:invalidAmount,
  wallets:[...byWallet.values()].sort((a,b)=>b.in+b.out-(a.in+a.out)),
  days:[...byDay.values()].sort((a,b)=>b.date.localeCompare(a.date)),
  first:selected.length?new Date(Math.min(...selected.map(x=>x.timestamp))).toISOString():null,
  last:selected.length?new Date(Math.max(...selected.map(x=>x.timestamp))).toISOString():null};
}
export function classifyEvidenceByWallet(reports){
 const byWallet=new Map(),seen=new Set();
 for(const e of Array.isArray(reports)?reports:[]){
  if(!addressRE.test(e?.wallet)||!hashRE.test(e.hash))continue;
  const kind=e?.verdict?.kind;
  if(!verdictTypes.includes(kind))continue;
  const uid=lowered(e.wallet)+"-"+lowered(e.hash);
  if(seen.has(uid))continue;seen.add(uid);
  const label=lowered(e.wallet);
  if(!byWallet.has(label))byWallet.set(label,{wallet:e.wallet,strongReceive:0,strongSend:0,context:0,transfer:0,unknown:0});
  const w=byWallet.get(label);
  if(kind==="swap_buy_evidence")w.strongReceive++;
  else if(kind==="swap_sell_evidence")w.strongSend++;
  else if(kind==="swap_context_evidence")w.context++;
  else if(kind==="transfer")w.transfer++;
  else w.unknown++;
 }
 return [...byWallet.values()];
}
export function createEvidenceReport({chain,token,creator,period,now,wallets,events,movements,graph}){
 if(!host[chain]||!addressRE.test(token)||!allowedPeriods.has(period)||!Number.isFinite(now))throw Error("Invalid report arguments");
 const stats=summarizeMoves(movements,period,now);
 const recent=periodSample(movements,period,now).slice().sort((a,b)=>b.timestamp-a.timestamp);
 const evidence=(Array.isArray(events)?events:[]).filter(e=>addressRE.test(e.wallet)&&hashRE.test(e.hash)).slice(0,6).map(e=>({
  wallet:e.wallet,tx:e.hash,source:host[chain]+"/tx/"+e.hash,
  classification:verdictTypes.includes(e.verdict?.kind)?e.verdict.kind:"unverified",
  reason:typeof e.verdict?.reason==="string"?e.verdict.reason:"unverified"
 }));
 const edges=Array.isArray(graph?.edges)?graph.edges.filter(e=>
  typeof e?.url==="string"&&e.url.startsWith(host[chain]+"/tx/")&&hashRE.test(e.hash)).slice(0,18).map(e=>
   ({type:e.type,from:e.from,to:e.to,contractSender:e.sender||null,tx:e.hash,url:e.url})):[];
 return {
  schema:"yorbi-wallet-sample-v1",generatedAt:new Date(now).toISOString(),
  chain,token,creator:addressRE.test(creator)?creator:null,
  period,coverage:{
   note:"First-page wallet transfer samples only, not complete transaction history or trading activity.",
   maxTransfersPerWallet:50,checkedWallets:wallets?.walletsObserved??0,
   knownTruncatedWalletPages:wallets?.paginatedWallets??0,
   allTransactionsReviewed:false,tradePnL:false,beneficialOwnersVerified:false,
   noDataMeansNoActivity:false
  },
  summary:stats,classifiedEvidence:classifyEvidenceByWallet(events),
  recentSample:recent.slice(0,15).map(x=>({
   wallet:x.wallet,tx:x.hash,time:x.time,direction:x.direction,
   amount:x.amount,source:host[chain]+"/tx/"+x.hash
  })),
  transactionEvidence:evidence,provenTransferLinks:edges
 };
}
export function reportText(r,language="ko"){
 if(!r||r.schema!=="yorbi-wallet-sample-v1")throw Error("Unsupported report");
 const ko=language==="ko";
 const base=ko?[
  "YORBI 지갑 활동 표본 보고서","체인: "+r.chain,
  "토큰: "+r.token,"조회 범위: "+r.period+" (표본)",
  "보고 시각(UTC): "+r.generatedAt,
  "표본 토큰 유입 "+r.summary.wallets.reduce((s,w)=>s+w.in,0)+"건 / 유출 "+
    r.summary.wallets.reduce((s,w)=>s+w.out,0)+"건",
  "기간 내 조회 표본 "+r.summary.total+"건",
  "분류된 개별 거래 표본 "+r.transactionEvidence.length+"건",
  "주의: 상위 지갑의 최근 거래 표본이며 전체 기간 매수·매도, 손익, 연결 지갑 소유 관계를 확정하지 않습니다."
 ]:[
  "YORBI Wallet Sample Report","Chain: "+r.chain,"Token: "+r.token,
  "Window: "+r.period+" (bounded sample)","Generated (UTC): "+r.generatedAt,
  "Token inflows "+r.summary.wallets.reduce((s,w)=>s+w.in,0)+" / outflows "+
   r.summary.wallets.reduce((s,w)=>s+w.out,0),
  "Sampled token movements "+r.summary.total,
  "Transaction evidence samples "+r.transactionEvidence.length,
  "Caution: these limited records do NOT establish all buys, sells, PnL or common ownership."
 ];
 return base.join("\n");
}
function e(tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;return n;
}
const money=n=>n===null?"—":n>=1e12?"~"+(n/1e12).toFixed(2)+"T":
 n>=1e9?"~"+(n/1e9).toFixed(2)+"B":n>=1e6?"~"+(n/1e6).toFixed(2)+"M":
 n>=1e3?"~"+(n/1e3).toFixed(2)+"K":Number(n).toLocaleString("en-US",{maximumFractionDigits:3});
function setup(){
 const panel=document.getElementById("tracker-report");
 if(!panel)return;
 const select=document.getElementById("report-period"),overview=document.getElementById("report-overview"),
  daily=document.getElementById("report-daily"),perWallet=document.getElementById("report-wallets"),
  verdict=document.getElementById("report-verdicts"),note=document.getElementById("report-status"),
  save=document.getElementById("report-save"),copy=document.getElementById("report-copy");
 let context=null,deep=[],graph=null,reference=null,tokenMovements=null,requestNumber=0,last=null;
 const clear=()=>{
  requestNumber++;context=null;deep=[];graph=null;reference=null;tokenMovements=null;last=null;
  panel.hidden=true;daily.replaceChildren();perWallet.replaceChildren();verdict.replaceChildren();
  note.textContent="";save.disabled=true;copy.disabled=true;
 };
 const dayWindow=()=>select.value||"7d";
 function render(){
  if(!context)return;
  const period=dayWindow();
  last=createEvidenceReport({chain:context.chain,token:context.token,creator:context.creator,
   period,now:reference,wallets:tokenMovements,events:deep,
   movements:tokenMovements?.movements||[],graph});
  const x=last.summary;
  overview.textContent=lang(
   x.total+" observed token movements in the "+period+" window (first-page sample, not all transactions).",
   period+" 범위에 해당하는 토큰 이동 표본 "+x.total+"건 (각 지갑 첫 페이지 기준, 전체 거래 아님).");
  perWallet.replaceChildren();
  for(const w of x.wallets){
   const line=e("div","report-wallet");
   line.append(e("strong","",short(w.wallet)),e("span","",
    lang("In ","유입 ")+w.in+lang(" / Out ","건 / 유출 ")+w.out+lang(" · amount ≈ ","건 · 수량 ≈ ")+
      money(w.inAmount)+" / "+money(w.outAmount)+(w.unknownAmounts?
      lang(" · unverified amount "+w.unknownAmounts," · 수량 미확인 "+w.unknownAmounts+"건"):"")));
   perWallet.append(line);
  }
  if(!x.wallets.length)perWallet.append(e("p","tracker-mini",lang(
   "No movements appeared in this bounded period sample; not proof of no trading.",
   "선택 기간의 조회 표본에 해당 기록이 없습니다. 거래가 없었다는 증거는 아닙니다.")));
  daily.replaceChildren();
  for(const d of x.days){
   const line=e("div","report-day");
   line.append(e("span","",d.date+" UTC"),e("strong","",
    lang("In ","유입 ")+d.in+" / "+lang("Out ","유출 ")+d.out));
   daily.append(line);
  }
  if(!x.days.length)daily.append(e("p","tracker-mini",lang(
   "No sampled dates in this period.","선택 기간에 해당하는 표본 날짜 없음.")));
  verdict.replaceChildren();
  if(deep.length){
   const sums=classifyEvidenceByWallet(deep);
   for(const v of sums){
    const line=e("div","report-wallet");
    line.append(e("strong","",short(v.wallet)),e("span","",
      lang("Explicit swaps received/spent ","명시적 스왑 수령·지출 ")+v.strongReceive+"/"+v.strongSend+
      lang(" · context "," · 정황 ")+v.context+
      lang(" · transfers "," · 일반 전송 ")+v.transfer+
      lang(" · unknown "," · 미확인 ")+v.unknown));
    verdict.append(line);
   }
  }else verdict.append(e("p","tracker-mini",lang(
   "For trade classifications, run the separate transaction evidence review.",
   "거래 분류는 별도 '실제 거래·자금 근거 확인하기'를 실행한 뒤 표시됩니다.")));
  note.textContent=lang(
   "Public records only. "+(tokenMovements?.walletsObserved??0)+" watched wallets (up to 50 transfers each), "+
    (tokenMovements?.paginatedWallets??0)+" known paginated addresses. No server storage or automatic sharing.",
   "공개 온체인 표본: 조회 지갑 "+(tokenMovements?.walletsObserved??0)+"개 (각 최대 50건), 이전 기록이 있는 것으로 확인된 지갑 "+
    (tokenMovements?.paginatedWallets??0)+"개. 서버 저장·자동 공유 없음.");
  save.disabled=false;copy.disabled=false;panel.hidden=false;
 }
 window.addEventListener("yorbi:scanstart",clear);
 window.addEventListener("yorbi:walletsample",ev=>{
  clear();
  const d=ev.detail||{};
  if(!host[d.chain]||!addressRE.test(d.token))return;
  context={chain:d.chain,token:d.token,creator:d.creator};
  const now=Date.now();reference=now;
  tokenMovements=normalizeMovements(d.walletRecords||[],d.token);
  render();
  window.dispatchEvent(new CustomEvent("yorbi:graphrequest"));
 });
 window.addEventListener("yorbi:deepsample",ev=>{
  if(!context||ev.detail?.chain!==context.chain||lowered(ev.detail?.token)!==lowered(context.token))return;
  deep=Array.isArray(ev.detail?.events)?ev.detail.events:[];render();
 });
 window.addEventListener("yorbi:languagechange",()=>{if(context)render();});
 window.addEventListener("yorbi:graphsample",ev=>{
  if(!context||ev.detail?.chain!==context.chain||lowered(ev.detail?.token)!==lowered(context.token))return;
  graph=ev.detail.graph||null;render();
 });
 select.addEventListener("change",()=>{
  if(context){
   render();
   window.dispatchEvent(new CustomEvent("yorbi:cachechange",{detail:{section:"period",value:select.value}}));
  }
 });
 window.addEventListener("yorbi:restore-period",event=>{
  const period=event.detail;
  if(!["24h","7d","sample"].includes(period))return;
  select.value=period;
  if(context)render();
 });
 save.addEventListener("click",()=>{
  if(!last||!context)return;
  const blob=new Blob([JSON.stringify(last,null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="yorbi-wallet-sample-"+context.chain+"-"+context.token.slice(0,10)+"-"+select.value+".json";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  note.textContent=lang("JSON sample exported to this device; no server upload.",
   "표본 JSON 파일을 기기에 저장했습니다. 서버 업로드는 없습니다.");
 });
 copy.addEventListener("click",async()=>{
  if(!last)return;
  try{
   await navigator.clipboard.writeText(reportText(last,document.documentElement.lang));
   note.textContent=lang("Summary copied to clipboard. No public URL was created.",
    "표본 요약을 복사했습니다. 공개 공유 URL을 생성하지 않았습니다.");
  }catch(_){note.textContent=lang("Clipboard unavailable. Use the JSON export instead.",
   "클립보드를 사용할 수 없습니다. JSON 내보내기를 이용하세요.");}
 });
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
}
