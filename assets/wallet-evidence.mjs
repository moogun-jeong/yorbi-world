/* YORBI Sprint 6.1: read-only evidence review. No ownership, PnL, safety or guaranteed trade verdict. */
export const EVM_EXPLORERS=Object.freeze({ethereum:"https://eth.blockscout.com",base:"https://base.blockscout.com"});
const isAddress=v=>typeof v==="string"&&/^0x[a-fA-F0-9]{40}$/.test(v);
const isHash=v=>typeof v==="string"&&/^0x[a-fA-F0-9]{64}$/.test(v);
const key=v=>typeof v==="string"?v.toLowerCase():"";
const labels=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
const knownMethods=/^(swap|swapExact|exactInput|exactOutput|unoswap|uniswapV[23]Swap|executeSwap|swapETH|swapTokens|swapExactTokens)/i;
export function evidenceUrl(chain,hash,suffix=""){
 const host=EVM_EXPLORERS[chain];
 if(!host||!isHash(hash)||!["","/token-transfers"].includes(suffix))return null;
 return host+"/api/v2/transactions/"+hash+suffix;
}
export function nativeUrl(chain,creator){
 const host=EVM_EXPLORERS[chain];
 return host&&isAddress(creator)?host+"/api/v2/addresses/"+creator+"/transactions":null;
}
export function txExplorer(chain,hash){
 const host=EVM_EXPLORERS[chain];return host&&isHash(hash)?host+"/tx/"+hash:null;
}
export function dedupeEvidenceSources(records,max=6){
 const unique=[],seen=new Set();
 if(!Array.isArray(records))return unique;
 for(const r of records){
  if(!isHash(r?.hash)||!isAddress(r?.wallet))continue;
  const k=key(r.hash)+"-"+key(r.wallet);
  if(seen.has(k))continue;seen.add(k);
  unique.push({hash:r.hash,wallet:r.wallet});
  if(unique.length>=max)break;
 }
 return unique;
}
function tokenNum(t){
 if(!t||!t.total)return null;
 const val=t.total?.value,dec=Number(t.total?.decimals??t.token?.decimals);
 if(typeof val!=="string"||! /^\d+$/.test(val)||!Number.isInteger(dec)||dec<0||dec>36)return null;
 const res=Number(BigInt(val))/10**dec;
 return Number.isFinite(res)?res:null;
}
function knownQuote(t,tracked){
 const token=key(t?.token?.address_hash);
 return token&&token!==key(tracked);
}
function methodSwap(tx){
 const method=String(tx?.method||"");
 const decoded=String(tx?.decoded_input?.method_call||"");
 return knownMethods.test(method)||knownMethods.test(decoded.split("(")[0].trim());
}
function sumFlows(transfers,wallet,token){
 let incoming=0,outgoing=0,n=0,unknownAmount=false;
 for(const t of transfers){
   if(key(t?.token?.address_hash)!==key(token))continue;
   const value=tokenNum(t);
   if(value===null){unknownAmount=true;continue;}
   if(key(t.from?.hash)===key(wallet)&&key(t.to?.hash)===key(wallet))continue;
   if(key(t.to?.hash)===key(wallet)){incoming+=value;n++;}
   if(key(t.from?.hash)===key(wallet)){outgoing+=value;n++;}
 }
 return {in:incoming,out:outgoing,count:n,unknownAmount};
}
export function classifySwapEvidence(tx,transfers,wallet,trackedToken,{complete=true}={}){
 if(!isAddress(wallet)||!isAddress(trackedToken)||!tx||!isHash(tx.hash))return {kind:"unverified",reason:"bad_input"};
 if(tx.result!=="success")return {kind:"unverified",reason:"failed_or_pending"};
 if(!complete||!Array.isArray(transfers))return {kind:"unverified",reason:"incomplete_logs"};
 const target=sumFlows(transfers,wallet,trackedToken);
 if(target.unknownAmount)return {kind:"unverified",reason:"invalid_amount"};
 const receive=target.in>target.out,send=target.out>target.in;
 if(!receive&&!send)return {kind:"unverified",reason:"no_net_target_flow"};
 // A confirmed token transfer is not a trade. Swap labels require BOTH an explicit swap method
 // and opposing payment-token movement through the same wallet in one successful transaction.
 if(!methodSwap(tx))return {kind:"transfer",reason:"no_explicit_swap_method",target};
 let quoteAmount=0,quoteToken=null,quotes=0;
 for(const t of transfers){
  if(!knownQuote(t,trackedToken))continue;
  const v=tokenNum(t);
  if(v===null||v<=0)continue;
  const direction=receive?key(t.from?.hash)===key(wallet):key(t.to?.hash)===key(wallet);
  if(!direction)continue;
  quoteAmount+=v;quotes++;quoteToken=t.token?.symbol||"quote token";
 }
 if(!quotes)return {kind:"unverified",reason:"no_opposing_payment",target};
 return {kind:receive?"swap_buy_evidence":"swap_sell_evidence",
  reason:"swap_method_and_opposing_erc20_flows",target,
  quoteToken:quotes===1?quoteToken:"multiple tokens",quoteAmount:quotes===1?quoteAmount:null};
}
export function directNativeFunding(payload,creator,watched,chain){
 if(!isAddress(creator)||!Array.isArray(watched)||!Array.isArray(payload?.items))return {items:[],sampled:0,more:false};
 const targets=new Set(watched.filter(isAddress).map(key)),seen=new Set(),hits=[];
 for(const tx of payload.items){
  if(!isHash(tx?.hash)||key(tx.from?.hash)!==key(creator)||!targets.has(key(tx.to?.hash))||tx.result!=="success")continue;
  if(seen.has(key(tx.hash)))continue;
  const raw=tx.value;
  if(typeof raw!=="string"||! /^\d+$/.test(raw))continue;
  const wei=BigInt(raw);if(wei===0n)continue;seen.add(key(tx.hash));
  const eth=Number(wei)/1e18;
  hits.push({hash:tx.hash,from:creator,to:tx.to.hash,amount:Number.isFinite(eth)?eth:null,url:txExplorer(chain,tx.hash),timestamp:tx.timestamp||null});
 }
 return {items:hits.slice(0,8),sampled:payload.items.length,more:Boolean(payload.next_page_params)};
}
const create=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
function evidenceLink(chain,hash){
 const href=txExplorer(chain,hash),a=create("a","tracker-source",labels("Transaction ↗","트랜잭션 ↗"));
 if(href){a.href=href;a.target="_blank";a.rel="noopener noreferrer";}else a.textContent="—";
 return a;
}
async function readJson(url){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000);
 try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:abort.signal,cache:"no-store"});
  if(!r.ok)throw Error("HTTP_"+r.status);
  return await r.json();
 }finally{clearTimeout(timeout);}
}
function initDeep(){
 const section=document.getElementById("tracker-deep");
 if(!section)return;
 const button=document.getElementById("tracker-deep-run"),status=document.getElementById("tracker-deep-status");
 const trades=document.getElementById("tracker-deep-events"),funding=document.getElementById("tracker-deep-funding");
 const metadata=document.getElementById("tracker-deep-scope");
 let context=null,output=null,busy=false,job=0;
 const msg=(a,state="info")=>{status.textContent=a;status.dataset.kind=state};
 function reset(){job++;context=null;output=null;busy=false;button.disabled=false;section.hidden=true;trades.replaceChildren();funding.replaceChildren();}
 function row(e,chain){
  const div=create("div","tracker-deep-event");
  const kind={
    swap_buy_evidence:["DEX swap: token received","DEX 스왑: 토큰 수령"],
    swap_sell_evidence:["DEX swap: token sent","DEX 스왑: 토큰 지출"],
    transfer:["Token transfer; trade unproven","토큰 전송: 매매 미확인"],
    unverified:["Unable to classify","거래 성격 판정 불가"]
  }[e.verdict.kind]||["Unable to classify","거래 성격 판정 불가"];
  div.append(create("strong","",labels(...kind)));
  div.append(create("span","",e.wallet.slice(0,8)+"…"+e.wallet.slice(-6)));
  if(e.verdict.quoteToken&&e.verdict.quoteAmount!==null)
   div.append(create("small","",labels("Opposing payment: ","반대 방향 결제 토큰: ")+e.verdict.quoteToken+" ~"+e.verdict.quoteAmount.toLocaleString("en-US",{maximumSignificantDigits:5})));
  div.append(create("small","",labels("Classification: ","분류 근거: ")+e.verdict.reason));
  div.append(evidenceLink(chain,e.hash));
  return div;
 }
 function render(){
  if(!context||!output)return;
  const {chain}=context;
  trades.replaceChildren();
  if(output.events.length){for(const e of output.events)trades.append(row(e,chain));}
  else trades.append(create("p","tracker-mini",labels("No transaction details available for the selected sample.","선택된 표본에서 개별 트랜잭션 정보를 확인하지 못했습니다.")));
  funding.replaceChildren();
  if(output.funding){
   const f=output.funding;
   if(f.items.length)for(const x of f.items){
    const c=create("div","tracker-deep-event");
    c.append(create("strong","",labels("Creator → holder: native coin transfer","생성자 → 홀더: 네이티브 코인 직접 전송")));
    c.append(create("small","",x.amount===null?"—":x.amount.toLocaleString("en-US",{maximumSignificantDigits:8})+" ETH"));
    c.append(evidenceLink(chain,x.hash));funding.append(c);
   }
   else funding.append(create("p","tracker-mini",labels("No direct outgoing native-coin transfer was observed in this first creator transaction page; older or internal transfers were not inspected.","생성자 최근 일반 거래 첫 페이지에서 추적 지갑으로 직접 전송한 네이티브 코인이 발견되지 않았습니다. 이전 페이지와 내부 전송은 미조사입니다.")));
  }else funding.append(create("p","tracker-mini",labels("Creator not identified, or native transactions could not be retrieved.","생성자 미확인 또는 네이티브 코인 전송 내역 조회 실패.")));
  metadata.textContent=labels(
   "Reviewed "+output.events.length+" wallet/transaction pairs (max 6; some may be duplicated across wallets). "+output.failed+" transaction records could not be verified. Creator native transfer sample: "+(output.funding?.sampled??"unavailable")+" outer transactions"+(output.funding?.more?" (older pages not loaded)":"")+". These are NOT lifetime trading results.",
   "지갑·거래 조합 "+output.events.length+"건 확인(최대 6건, 여러 지갑에 중복 가능). 개별 거래 자료 "+output.failed+"건 미확인. 생성자 일반 거래 표본 "+(output.funding?.sampled??"미확인")+"건"+(output.funding?.more?" (이전 기록 미조회)":"")+". 전체 기간 매매 내역은 아닙니다.");
  msg(labels("Limited transaction evidence loaded. Do not infer profit or common wallet ownership.","제한된 개별 거래 근거를 조회했습니다. 수익·같은 지갑 소유자를 추정할 수 없습니다."),"ok");
 }
 async function run(){
  if(!context||busy)return;
  busy=true;button.disabled=true;
  const id=++job,{chain,token,creator,samples}=context;
  msg(labels("Checking individual transactions and creator funding…","개별 거래와 생성자 자금 이동을 확인 중입니다…"),"loading");
  try{
   const targets=dedupeEvidenceSources(samples,6);
   const reports=[];
   // Sequential requests avoid burst rates on unauthenticated free explorers.
   let failed=0;
   for(const target of targets){
    if(job!==id)return;
    const url=evidenceUrl(chain,target.hash);
    try{
     const tx=await readJson(url);
     if(!tx||key(tx.hash)!==key(target.hash))throw Error("hash_mismatch");
     let logs=Array.isArray(tx.token_transfers)?tx.token_transfers:null;
     let complete=logs!==null&&!tx.token_transfers_overflow;
     if(!complete){
       const transferPage=await readJson(evidenceUrl(chain,target.hash,"/token-transfers"));
       logs=Array.isArray(transferPage?.items)?transferPage.items:null;
       complete=logs!==null&&!transferPage?.next_page_params;
     }
     const verdict=classifySwapEvidence(tx,logs,target.wallet,token,{complete});
     reports.push({...target,verdict});
    }catch(e){failed++;reports.push({...target,verdict:{kind:"unverified",reason:"explorer_unavailable"}});}
   }
   let native=null;
   if(creator&&isAddress(creator)){
    try{const outer=await readJson(nativeUrl(chain,creator));if(job!==id)return;
      native=directNativeFunding(outer,creator,context.holders,chain);}catch(e){}
   }
   if(job!==id)return;
   output={events:reports,funding:native,failed};render();
  }catch(e){if(job===id)msg(labels("Deep evidence lookup failed. No trade conclusion can be drawn.","심층 거래 조회 실패. 매매 여부를 판단할 수 없습니다."),"error");}
  finally{if(id===job){busy=false;button.disabled=false;}}
 }
 button.addEventListener("click",run);
 window.addEventListener("yorbi:scanstart",reset);
 window.addEventListener("yorbi:walletsample",event=>{
  const {chain,token,creator,holders,samples}=event.detail||{};
  reset();
  if(!EVM_EXPLORERS[chain]||!isAddress(token)||!Array.isArray(samples))return;
  context={chain,token,creator:isAddress(creator)?creator:null,
   holders:Array.isArray(holders)?holders.filter(isAddress).slice(0,3):[],samples};
  section.hidden=false;
  msg(labels("Ready. Click for individual transaction evidence (bounded and on demand).","준비됐습니다. 버튼을 누르면 제한된 거래별 근거를 확인합니다."),"info");
 });
 window.addEventListener("yorbi:languagechange",()=>{if(output)render();else if(context)msg(labels("Ready for evidence review.","거래 근거 조회 준비 완료."))});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initDeep,{once:true});
 else initDeep();
}
