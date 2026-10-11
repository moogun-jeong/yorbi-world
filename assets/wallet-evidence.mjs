import { boundedMap, memoizedBlockscout } from "./wallet-graph.mjs?v=s64-20261011";
import { executionEvidence, contextVerdict } from "./wallet-execution.mjs?v=s66-20261011";
/* YORBI Sprint 6.6: v4 + smart-account execution context; optimized read-only evidence review. No ownership, PnL, safety or guaranteed trade verdict. */
export const EVM_EXPLORERS=Object.freeze({ethereum:"https://eth.blockscout.com",base:"https://base.blockscout.com"});
const isAddress=v=>typeof v==="string"&&/^0x[a-fA-F0-9]{40}$/.test(v);
const isHash=v=>typeof v==="string"&&/^0x[a-fA-F0-9]{64}$/.test(v);
const key=v=>typeof v==="string"?v.toLowerCase():"";
const labels=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
export const SWAP_TOPICS=Object.freeze({
 v2:"0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
 v3:"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
});
export function swapEventEvidence(logs,{complete=true}={}){
 if(!complete||!Array.isArray(logs))return {present:false,complete:false,pools:[]};
 const found=[];
 for(const event of logs){
  const topic=event?.topics?.[0];
  if(!Object.values(SWAP_TOPICS).includes(String(topic||"").toLowerCase()))continue;
  const address=event?.address?.hash;
  if(typeof address==="string"&&/^0x[a-fA-F0-9]{40}$/.test(address)){
   if(!found.some(v=>v.toLowerCase()===address.toLowerCase()))found.push(address);
  }
 }
 return {present:found.length>0,complete:true,pools:found.slice(0,4)};
}
export function explainEvidenceReason(reason,lang="en"){
 const phrases={
 bad_input:["Invalid evidence input","거래 근거 입력값을 검증할 수 없음"],
 failed_or_pending:["Transaction unsuccessful or pending","거래가 실패했거나 아직 완료되지 않음"],
 incomplete_logs:["Transaction token movement records are incomplete","토큰 이동 로그를 전부 가져오지 못함"],
 invalid_amount:["Some token transfer amounts cannot be verified","일부 토큰 이동 수량을 확인할 수 없음"],
 no_net_target_flow:["No net tracked-token movement was observed","추적 토큰의 순이동을 확인하지 못함"],
 no_explicit_swap_method:["No explicit swap method or matching DEX-style event evidence","명시적 스왑 호출 또는 일치하는 DEX형 이벤트 근거가 없음"],
 no_opposing_payment:["Matching ERC-20 payment in the opposite direction was not found","반대 방향 결제 토큰 이동을 확인하지 못함"],
 swap_method_and_opposing_erc20_flows:["Explicit swap call + opposite ERC-20 payment flows","명시적 스왑 호출 + 반대 방향 ERC-20 결제 토큰 이동"],
 swap_event_and_opposing_erc20_flows:["Swap event topic + opposite token flows; wallet execution not proven","DEX형 Swap 이벤트 + 반대 방향 토큰 이동 (지갑의 실제 매매는 미확정)"],
 shared_router_not_initiator:["Swap method and payment flow appear, but the watched wallet did not initiate the outer transaction","스왑 호출과 토큰 이동이 확인되지만 추적 지갑이 해당 거래를 직접 시작하지 않음"],
 no_native_counterflow:["No matching native ETH payment found in this transaction sample","해당 거래 표본에서 반대 방향 ETH 결제 흐름을 찾지 못함"],
 partial_internal_traces:["Trace pages incomplete; no conclusion about ETH movement","내부 ETH 거래 내역이 일부 누락되어 결론을 내릴 수 없음"],
 native_payment_opposes_token_flow:["Token transfer and opposite native ETH flow share a transaction; trade not proven","동일 거래에서 토큰 이동과 반대 방향 ETH 흐름 확인 (매매 확정 아님)"],
 v4_poolmanager_and_token_flow:["Canonical Uniswap v4 PoolManager Swap log and tracked-wallet token movement share one transaction; the token and wallet cannot be attributed to that pool swap with certainty","공식 Uniswap V4 PoolManager의 스왑 로그와 추적 지갑의 토큰 이동이 동일 거래에서 확인됐지만 해당 지갑이 그 풀에서 매매했다고 확정할 수 없음"],
 erc4337_user_operation_without_verified_swap:["ERC-4337 UserOperation event names the watched wallet; no matching swap was proven","ERC-4337 UserOperation 이벤트에서 추적 지갑이 확인됐으나 실제 스왑은 확인하지 못함"],
 incomplete_or_failed:["Transaction failed or relevant event logs incomplete","실패한 거래이거나 이벤트 로그가 불완전함"],
 no_valid_tracked_token_flow:["Matching token movement by watched wallet not found","추적 지갑의 해당 토큰 이동을 확인하지 못함"],
 explorer_unavailable:["Transaction details unavailable from explorer","블록 탐색기에서 거래 상세 정보를 가져오지 못함"]
 };
 const entry=phrases[reason];
 return entry?(lang==="ko"?entry[1]:entry[0]):(lang==="ko"?"기타 판정 불가 사유":"Other / unclassified");
}
export function nextEvidencePageUrl(original,params){
 if(typeof original!=="string"||!original.startsWith("https://")||!params||typeof params!=="object"||Array.isArray(params))return null;
 try{
   const url=new URL(original);
   if(!Object.values(EVM_EXPLORERS).some(host=>url.origin===host))return null;
   for(const [name,value] of Object.entries(params)){
     if(!/^[a-z][a-z0-9_]*$/.test(name))return null;
     if(!["string","number"].includes(typeof value)||String(value).length>120)return null;
     url.searchParams.set(name,String(value));
   }
   return url.toString();
 }catch(_){return null;}
}
const knownMethods=/^(swap|swapExact|exactInput|exactOutput|unoswap|uniswapV[23]Swap|executeSwap|swapETH|swapTokens|swapExactTokens)/i;
export function evidenceUrl(chain,hash,suffix=""){
 const host=EVM_EXPLORERS[chain];
 if(!host||!isHash(hash)||!["","/token-transfers","/logs"].includes(suffix))return null;
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
export function classifySwapEvidence(tx,transfers,wallet,trackedToken,{complete=true,swapEvent=null}={}){
 if(!isAddress(wallet)||!isAddress(trackedToken)||!tx||!isHash(tx.hash))return {kind:"unverified",reason:"bad_input"};
 if(tx.result!=="success")return {kind:"unverified",reason:"failed_or_pending"};
 if(!complete||!Array.isArray(transfers))return {kind:"unverified",reason:"incomplete_logs"};
 const target=sumFlows(transfers,wallet,trackedToken);
 if(target.unknownAmount)return {kind:"unverified",reason:"invalid_amount"};
 const receive=target.in>target.out,send=target.out>target.in;
 if(!receive&&!send)return {kind:"unverified",reason:"no_net_target_flow"};
 // Normal ERC-20 transfers are never called market trades just because they moved.
 const hasSwapMethod=methodSwap(tx);
 const hasSwapContext=swapEvent?.present===true&&swapEvent?.complete===true;
 if(!hasSwapMethod&&!hasSwapContext)return {kind:"transfer",reason:"no_explicit_swap_method",target};
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
 // Explicit method on a shared router is not evidence that every receiving wallet initiated that swap.
 // Only elevate to a stronger classification when the watched wallet is the actual outer tx signer.
 if(!hasSwapMethod||key(tx.from?.hash)!==key(wallet)){
   return {kind:"swap_context_evidence",direction:receive?"receive":"send",
     reason:hasSwapMethod?"shared_router_not_initiator":"swap_event_and_opposing_erc20_flows",target,
     pools:swapEvent?.pools||[],quoteToken:quotes===1?quoteToken:"multiple tokens",quoteAmount:quotes===1?quoteAmount:null};
 }
 return {kind:receive?"swap_buy_evidence":"swap_sell_evidence",
  reason:"swap_method_and_opposing_erc20_flows",target,
  quoteToken:quotes===1?quoteToken:"multiple tokens",quoteAmount:quotes===1?quoteAmount:null};
}

/** Bounded Blockscout execution trace evidence: NOT transaction attribution or ownership. */
export function innerTraceUrl(chain,hash){
 const host=EVM_EXPLORERS[chain];
 return host&&isHash(hash)?host+"/api/v2/transactions/"+hash+"/internal-transactions":null;
}
function positiveEth(wei){
 if(typeof wei!=="string"||!/^\d+$/.test(wei))return null;
 try{
  const n=BigInt(wei);
  return n>0n?Number(n)/1e18:0;
 }catch(_){return null;}
}
export function inspectNativeSettlement(tx,transfers,internal,wallet,token,{complete=true}={}){
 if(!tx||!isHash(tx.hash)||!isAddress(wallet)||!isAddress(token))
   return {kind:"unverified",reason:"bad_input"};
 if(tx.result!=="success"||!Array.isArray(transfers))
   return {kind:"unverified",reason:"failed_or_pending"};
 const target=sumFlows(transfers,wallet,token);
 if(target.unknownAmount)return {kind:"unverified",reason:"invalid_amount"};
 const direction=target.in>target.out?"receive":target.out>target.in?"send":null;
 if(!direction)return {kind:"unverified",reason:"no_net_target_flow"};
 const walletKey=key(wallet);
 const outerFrom=key(tx.from?.hash)===walletKey;
 const outerTo=key(tx.to?.hash);
 const contractTarget=Boolean(tx.to?.is_contract);
 const outerEth=outerFrom?positiveEth(tx.value):null;
 const outs=[],ins=[];
 const all=Array.isArray(internal)?internal:[];
 for(const t of all){
  // Trace 'success' is Boolean; ignore reverted and non-value calls.
  if(t?.success!==true||!isHash(t.transaction_hash)||key(t.transaction_hash)!==key(tx.hash))continue;
  const value=positiveEth(t.value);
  if(value===null||value<=0)continue;
  if(key(t.from?.hash)===walletKey&&key(t.to?.hash)!==walletKey){
   outs.push({to:t.to?.hash||null,amount:value,source:"internal_trace"});
  }
  if(key(t.to?.hash)===walletKey&&key(t.from?.hash)!==walletKey){
   ins.push({from:t.from?.hash||null,amount:value,source:"internal_trace"});
  }
 }
 const paid=outs.length>0||(outerEth!==null&&outerEth>0);
 const received=ins.length>0;
 const relevant=direction==="receive"?paid:received;
 if(!relevant)return {kind:"no_native_counterflow",direction,
  reason:complete?"no_native_counterflow":"partial_internal_traces",
  inspected:all.length,complete,contractTarget,outerContract:contractTarget?tx.to.hash:null};
 const flows=(direction==="receive"?outs:ins).slice(0,3);
 if(direction==="receive"&&outerEth>0&&!outs.length)flows.unshift({to:tx.to?.hash||null,amount:outerEth,source:"outer_tx_value"});
 return {kind:"native_payment_context",direction,reason:"native_payment_opposes_token_flow",
  complete,inspected:all.length,contractTarget,
  outerContract:contractTarget&&isAddress(outerTo)?tx.to.hash:null,
  events:flows.slice(0,3)};
}
/** Initiator-to-holder native ETH trace: direct sender vs routed contract is explicitly separated.
 *  A contract-intermediated payment is NOT proof the initiator owns the receiving wallet.
 */
export function creatorInitiatedNativeTraces(tx,tracePayload,creator,holderAddresses,chain){
 if(!tx||tx.result!=="success"||key(tx.from?.hash)!==key(creator)||!isHash(tx.hash)||
    !isAddress(creator)||!Array.isArray(holderAddresses)||!Array.isArray(tracePayload?.items))
   return {hits:[],complete:false,inspected:0};
 const targets=new Set(holderAddresses.filter(isAddress).map(key));
 const seen=new Set(),hits=[];
 for(const inner of tracePayload.items){
  if(inner?.success!==true||key(inner.transaction_hash)!==key(tx.hash))continue;
  if(!isAddress(inner.to?.hash)||!targets.has(key(inner.to.hash)))continue;
  const amount=positiveEth(inner.value);
  if(amount===null||amount<=0)continue;
  const source=inner.from?.hash;
  if(!isAddress(source))continue;
  const kind=key(source)===key(creator)?"direct_internal_sender":"creator_initiated_via_contract";
  const unique=[inner.transaction_hash,inner.index,source,inner.to.hash].join(":");
  if(seen.has(unique))continue;seen.add(unique);
  hits.push({hash:tx.hash,from:source,to:inner.to.hash,amount,kind,url:txExplorer(chain,tx.hash)});
 }
 return {hits:hits.slice(0,6),complete:!tracePayload.next_page_params,
  inspected:tracePayload.items.length};
}
/** Small bounded pagination helper, retaining unknown rather than assuming completeness. */
export async function loadTraceSample(base,reader,{pages=2}={}){
 if(typeof reader!=="function"||typeof base!=="string"||pages<1||pages>2)return null;
 let url=base,all=[],complete=false,pagesLoaded=0;
 for(let page=0;page<pages;page++){
  const response=await reader(url);
  if(!Array.isArray(response?.items))return null;
  all=all.concat(response.items);pagesLoaded++;
  if(!response.next_page_params){complete=true;break;}
  const next=nextEvidencePageUrl(base,response.next_page_params);
  if(!next)break;
  url=next;
 }
 return {items:all,complete,pagesLoaded};
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
async function readJson(url,parentSignal){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000);
 const cancel=()=>abort.abort();
 if(parentSignal?.aborted)abort.abort();
 else parentSignal?.addEventListener("abort",cancel,{once:true});
 try{
  const r=await fetch(url,{headers:{Accept:"application/json"},signal:abort.signal,cache:"no-store"});
  if(!r.ok)throw Error("HTTP_"+r.status);
  return await r.json();
 }finally{clearTimeout(timeout);parentSignal?.removeEventListener("abort",cancel);}
}
function initDeep(){
 const section=document.getElementById("tracker-deep");
 if(!section)return;
 const button=document.getElementById("tracker-deep-run"),status=document.getElementById("tracker-deep-status");
 const trades=document.getElementById("tracker-deep-events"),funding=document.getElementById("tracker-deep-funding");
 const metadata=document.getElementById("tracker-deep-scope");
 const internalFunding=document.getElementById("tracker-deep-inner-funding");
 const resultsArea=section.querySelector(".tracker-deep-results");
 let context=null,output=null,busy=false,job=0,activeController=null;
 const msg=(a,state="info")=>{status.textContent=a;status.dataset.kind=state};
 function reset(){job++;activeController?.abort();activeController=null;context=null;output=null;busy=false;button.disabled=false;section.hidden=true;resultsArea.hidden=true;trades.replaceChildren();funding.replaceChildren();internalFunding?.replaceChildren();}
 function row(e,chain){
  const div=create("div","tracker-deep-event");
  const kind={
    swap_buy_evidence:["DEX swap: token received","DEX 스왑: 토큰 수령"],
    swap_sell_evidence:["DEX swap: token sent","DEX 스왑: 토큰 지출"],
    swap_context_evidence:["DEX-style swap context (not verified wallet trade)","DEX형 스왑 정황 (지갑 매매 미확정)"],
    transfer:["Token transfer; trade unproven","토큰 전송: 매매 미확인"],
    unverified:["Unable to classify","거래 성격 판정 불가"]
  }[e.verdict.kind]||["Unable to classify","거래 성격 판정 불가"];
  const native=e.native;
  const nativeFocus=native?.kind==="native_payment_context";
  if(nativeFocus&&e.verdict.kind==="transfer")
   div.append(create("strong","",labels("Token transfer + ETH settlement context (trade unproven)","토큰 이동 + ETH 결제 정황 (매매 미확정)")));
  else div.append(create("strong","",labels(...kind)));
  div.append(create("span","",e.wallet.slice(0,8)+"…"+e.wallet.slice(-6)));
  if(e.verdict.quoteToken&&e.verdict.quoteAmount!==null)
   div.append(create("small","",labels("Opposing payment: ","반대 방향 결제 토큰: ")+e.verdict.quoteToken+" ~"+e.verdict.quoteAmount.toLocaleString("en-US",{maximumSignificantDigits:5})));
  div.append(create("small","",labels("Why: ","판정 근거: ")+explainEvidenceReason(e.verdict.reason,document.documentElement.lang)));
  if(e.execution?.v4?.length){
    const pool=e.execution.v4[0].poolId;
    div.append(create("small","tracker-native-note",
      labels("Uniswap v4 Pool ID (context only): ","Uniswap V4 Pool ID (거래 정황): ")+pool.slice(0,12)+"…"+pool.slice(-8)));
    div.append(create("small","",
      labels("PoolManager swap caller (often router): ","PoolManager 스왑 호출자(라우터일 수 있음): ")+
      (e.execution.v4[0].caller||"—")));
  }
  if(e.execution?.erc4337?.length){
    div.append(create("small","tracker-native-note",labels(
     "ERC-4337 UserOperation identifies this smart account; bundler ≠ wallet owner.",
     "ERC-4337 UserOperation에서 해당 스마트 지갑 확인 · 번들러 ≠ 지갑 소유자")));
  }
  if(e.execution?.eip7702){
    div.append(create("small","tracker-native-note",labels(
      "EIP-7702 type-4 transaction; the watched wallet was NOT necessarily the signer.",
      "EIP-7702 유형 4 거래 · 추적 지갑이 직접 서명했다는 뜻은 아님")));
  }
  if(nativeFocus){
   const flow=native.events?.[0];
   const amount=flow?.amount===null||flow?.amount===undefined?"":flow.amount.toLocaleString("en-US",{maximumSignificantDigits:7})+" ETH";
   div.append(create("small","tracker-native-note",labels("Same transaction: ","동일 거래: ")+
     (native.direction==="receive"?labels("token received + ETH sent","토큰 수령 + ETH 지출"):labels("token sent + ETH received","토큰 지출 + ETH 수령"))+
     (amount?" · "+amount:"")+" · "+labels("not verified as a swap","스왑 확정 아님")));
  }else if(native?.reason==="partial_internal_traces"){
   div.append(create("small","tracker-native-note",explainEvidenceReason(native.reason,document.documentElement.lang)));
  }
  if(native?.contractTarget&&native.outerContract)
    div.append(create("small","",labels("Outer call to contract: ","외부 호출 대상 컨트랙트: ")+native.outerContract.slice(0,8)+"…"+native.outerContract.slice(-6)));
  if(e.verdict.pools?.length)div.append(create("small","",labels("Swap event emitted by: ","Swap 이벤트 발생 주소: ")+e.verdict.pools.map(x=>x.slice(0,8)+"…"+x.slice(-6)).join(", ")));
  div.append(evidenceLink(chain,e.hash));
  return div;
 }
 function render(){
  if(!context||!output)return;
  resultsArea.hidden=false;
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
  if(internalFunding){
    internalFunding.replaceChildren();
    const inner=output.innerFunding;
    if(!inner){
      internalFunding.append(create("p","tracker-mini",labels("Internal ETH funding sample unavailable or creator not identified.","내부 ETH 자금 연결 표본 미조회 또는 생성자 미확인.")));
    }else if(inner.hits.length===0){
      internalFunding.append(create("p","tracker-mini",labels(
       "No creator-initiated ETH receipt by watched holders in "+inner.checked+" inspected transactions. Older or unexamined transfers may exist.",
       "검사한 생성자 거래 "+inner.checked+"건에서 추적 홀더가 ETH를 받은 내역은 발견되지 않았습니다. 이전·미조사 거래는 알 수 없습니다.")));
    }else{
      for(const hit of inner.hits.slice(0,8)){
       const div=create("div","tracker-deep-event");
       div.append(create("strong","",hit.kind==="direct_internal_sender"?
         labels("Creator directly sent ETH (execution trace)","생성자 직접 ETH 송금 (실행 기록)"):
         labels("Creator-initiated contract-mediated ETH receipt","생성자 시작 거래에서 컨트랙트를 경유한 ETH 수령")));
       div.append(create("small","",hit.from.slice(0,8)+"… → "+hit.to.slice(0,8)+"… · "+
         (hit.amount===null?"—":hit.amount.toLocaleString("en-US",{maximumSignificantDigits:8}))+" ETH"));
       div.append(evidenceLink(chain,hit.hash));internalFunding.append(div);
      }
    }
  }
  const timing=output.stats?
   labels(" Requests "+output.stats.requests+" (deduplicated), "+(output.stats.elapsed/1000).toFixed(1)+"s.",
    " 실제 API 요청 "+output.stats.requests+"회(중복 제거), "+(output.stats.elapsed/1000).toFixed(1)+"초."):"";
  metadata.textContent=labels(
   "Reviewed "+output.events.length+" wallet/transaction pairs (max 6). "+output.failed+" transaction records unavailable. Native trace sample: up to 3 watched transactions, max 2 pages each. Creator outer transactions sampled: "+(output.funding?.sampled??"unavailable")+"; inner traces checked: "+(output.innerFunding?.checked??"unavailable")+", incomplete: "+(output.innerFunding?.partial??"unavailable")+". Not a complete history or profit report."+timing,
   "지갑·거래 조합 "+output.events.length+"건 확인(최대 6건). 개별 거래 자료 "+output.failed+"건 미확인. 네이티브 실행 표본: 추적 거래 최대 3건·각 최대 2페이지. 생성자 일반 거래 표본 "+(output.funding?.sampled??"미확인")+"건, 그중 내부 실행 조회 "+(output.innerFunding?.checked??"미확인")+"건, 기록 불완전 "+(output.innerFunding?.partial??"미확인")+"건. 전체 기간의 매매·수익 분석이 아닙니다.");
  msg(labels("Limited transaction evidence loaded. Do not infer profit or common wallet ownership.","제한된 개별 거래 근거를 조회했습니다. 수익·같은 지갑 소유자를 추정할 수 없습니다."),"ok");
 }

 async function run(){
  if(!context||busy)return;
  busy=true;button.disabled=true;
  const id=++job,{chain,token,creator,samples}=context;
  const controller=new AbortController();activeController=controller;
  const started=Date.now();let requests=0,finished=0;
  const reader=memoizedBlockscout(url=>{
   requests++;return readJson(url,controller.signal);
  },{max:64});
  const targets=dedupeEvidenceSources(samples,6);
  const jobs=targets.map(t=>({kind:"target",item:t}));
  if(creator&&isAddress(creator))jobs.push({kind:"creator"});
  msg(labels("Reviewing evidence with 2 parallel jobs (free API)…",
   "무료 API를 이용해 최대 2건씩 병렬 조회 중…"),"loading");
  const live=()=>id===job&&!controller.signal.aborted;
  const readPages=async(base)=>{
   if(!base||!live())return null;
   return loadTraceSample(base,reader,{pages:2});
  };
  const traceTarget=async(target,index)=>{
   if(!live())return null;
   const url=evidenceUrl(chain,target.hash);
   try{
    const tx=await reader(url);
    if(!live())return null;
    if(!tx||key(tx.hash)!==key(target.hash))throw Error("hash_mismatch");
    let logs=Array.isArray(tx.token_transfers)?tx.token_transfers:null;
    let complete=logs!==null&&!tx.token_transfers_overflow;
    if(!complete){
      const received=await readPages(evidenceUrl(chain,target.hash,"/token-transfers"));
      logs=received?.items??null;
      complete=received?.complete===true;
    }
    if(!live())return null;
    let swapEvent=null,eventRecords=null;
    if(complete&&Array.isArray(logs)){
      try{
       // v4 and ERC-4337 signals are emitted during nested calls, even if outer method is unknown.
       // Fetch at most two pages. A truncated event list must not support a verified context label.
       eventRecords=await readPages(evidenceUrl(chain,target.hash,"/logs"));
       swapEvent=swapEventEvidence(eventRecords?.items||[],{complete:eventRecords?.complete===true});
      }catch(_){swapEvent={present:false,complete:false,pools:[]};}
    }
    const execution=executionEvidence(tx,eventRecords?.items||[],target.wallet,
      {complete:eventRecords?.complete===true,chain});
    let verdict=classifySwapEvidence(tx,logs,target.wallet,token,{complete,swapEvent});
    if(execution.v4.length>0){
      // A v4 Pool ID alone does not reveal its two currencies or its actual end trader.
      const v4=contextVerdict(tx,logs,target.wallet,token,execution,{complete});
      if(v4.kind==="swap_context_evidence")verdict=v4;
    }
    let native=null;
    if(index<3&&complete&&Array.isArray(logs)&&tx.result==="success"){
      try{
       const trace=await readPages(innerTraceUrl(chain,target.hash));
       native=inspectNativeSettlement(tx,logs,trace?.items||[],target.wallet,token,{complete:trace?.complete===true});
      }catch(_){native={kind:"unverified",reason:"partial_internal_traces"};}
    }
    return {...target,verdict,native,execution};
   }catch(_){
    if(!live())return null;
    return {...target,verdict:{kind:"unverified",reason:"explorer_unavailable"},native:null};
   }
  };
  const traceCreator=async()=>{
   if(!live()||!creator||!isAddress(creator))return null;
   try{
     const outer=await reader(nativeUrl(chain,creator));
     if(!live()||!Array.isArray(outer?.items))return null;
     const direct=directNativeFunding(outer,creator,context.holders,chain);
     const eligible=outer.items.filter(x=>x?.result==="success"&&key(x.from?.hash)===key(creator)&&isHash(x.hash)).slice(0,3);
     const innerFunding={checked:0,partial:0,hits:[]};
     for(const transaction of eligible){
      if(!live())return null;
      innerFunding.checked++;
      try{
       const trace=await readPages(innerTraceUrl(chain,transaction.hash));
       if(!trace){innerFunding.partial++;continue;}
       const result=creatorInitiatedNativeTraces(transaction,
         {items:trace.items,next_page_params:trace.complete?null:{more:true}},
         creator,context.holders,chain);
       if(!result.complete)innerFunding.partial++;
       for(const hit of result.hits){
        if(direct.items.some(v=>key(v.hash)===key(hit.hash)&&key(v.to)===key(hit.to)&&
          hit.kind==="direct_internal_sender"))continue;
        innerFunding.hits.push(hit);
       }
      }catch(_){innerFunding.partial++;}
     }
     return {direct,innerFunding};
   }catch(_){return null;}
  };
  try{
   const reviewed=await boundedMap(jobs,2,async(task,index)=>{
    if(!live())return null;
    const result=task.kind==="creator"?await traceCreator():await traceTarget(task.item,index);
    if(live()){
     finished++;
     msg(labels("Evidence processed "+finished+"/"+jobs.length+"…",
      "거래·자금 근거 "+finished+"/"+jobs.length+"건 처리…"),"loading");
    }
    return result;
   });
   if(!live())return;
   const events=reviewed.filter((x,i)=>jobs[i].kind==="target"&&x!==null);
   const creatorIndex=jobs.findIndex(x=>x.kind==="creator");
   const result=creatorIndex>=0?reviewed[creatorIndex]:null;
   const funding=result?.direct||null,innerFunding=result?.innerFunding||null;
   output={events,funding,innerFunding,
     failed:events.filter(x=>x.verdict.reason==="explorer_unavailable").length,
     stats:{requests,elapsed:Date.now()-started,parallel:Math.min(2,jobs.length)}};
   render();
   window.dispatchEvent(new CustomEvent("yorbi:cachechange",{detail:{
    section:"deep",value:{context,output}
   }}));
   window.dispatchEvent(new CustomEvent("yorbi:deepsample",{detail:{
    chain,token,creator,direct:funding?.items||[],via:innerFunding?.hits||[],
    events:output.events.map(x=>({wallet:x.wallet,hash:x.hash,verdict:x.verdict}))
   }}));
  }catch(_){
   if(live())msg(labels("Limited evidence lookup failed. Results cannot be classified.",
    "제한된 거래 근거 조회에 실패했습니다. 매매를 판정할 수 없습니다."),"error");
  }finally{
   if(id===job){busy=false;button.disabled=false;activeController=null;}
  }
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
 window.addEventListener("yorbi:restore-deep",event=>{
   const state=event.detail;
   if(!state?.context||!state?.output||!Array.isArray(state.output.events)||
      !EVM_EXPLORERS[state.context.chain]||!isAddress(state.context.token))return;
   const currentChain=document.querySelector("#scan-chain")?.value;
   const currentAddress=document.querySelector("#scan-address")?.value?.trim();
   if(currentChain!==state.context.chain||key(currentAddress)!==key(state.context.token))return;
   reset();context=state.context;output=state.output;
   section.hidden=false;
   render();
   window.dispatchEvent(new CustomEvent("yorbi:deepsample",{detail:{
    chain:context.chain,token:context.token,creator:context.creator,
    direct:output.funding?.items||[],via:output.innerFunding?.hits||[],
    events:output.events.map(x=>({wallet:x.wallet,hash:x.hash,verdict:x.verdict}))
   }}));
 });
 window.addEventListener("yorbi:languagechange",()=>{if(output)render();else if(context)msg(labels("Ready for evidence review.","거래 근거 조회 준비 완료."))});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initDeep,{once:true});
 else initDeep();
}
