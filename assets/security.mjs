/* YORBI Safety Scan v0.2 — read-only, provider signals are NOT an audit or a safety verdict. */
const CODES=Object.freeze({ethereum:"1",bsc:"56",base:"8453",solana:"solana"});
export const supportedSecurityChains=Object.keys(CODES);
const bilingual=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
export const booleanSignal=v=>{
  const raw=v&&typeof v==="object"&&"status" in v?v.status:v;
  if(raw==="1"||raw===1||raw===true)return true;
  if(raw==="0"||raw===0||raw===false)return false;
  return null;
};
export const taxRate=v=>{
  if(v===null||v===undefined||v===""||typeof v==="boolean")return null;
  const number=Number(v);
  return Number.isFinite(number)&&number>=0&&number<=1?number*100:null;
};
export function providerEndpoint(chain,address){
  if(!Object.hasOwn(CODES,chain)||typeof address!=="string")return null;
  const path=chain==="solana"?"/api/v1/solana/token_security":"/api/v1/token_security/"+CODES[chain];
  const key=chain==="solana"?address:address.toLowerCase();
  return "https://api.gopluslabs.io"+path+"?contract_addresses="+encodeURIComponent(key);
}
export function extractToken(response,chain,address){
  if(!response||typeof response!=="object"||String(response.code)!=="1"||!response.result||typeof response.result!=="object")return null;
  const entries=Object.entries(response.result);
  const match=entries.find(([key])=>chain==="solana"?key===address:key.toLowerCase()===address.toLowerCase());
  const token=match?.[1];
  return token&&typeof token==="object"&&!Array.isArray(token)?token:null;
}
export function topHolderConcentration(token){
  const array=token?.holders;
  if(!Array.isArray(array)||!array.length)return {pct:null,count:0};
  const valid=array.map(x=>{
    if(x?.percent===null||x?.percent===undefined||x.percent==="")return null;
    const n=Number(x.percent);return Number.isFinite(n)&&n>=0&&n<=1?n:null;
  }).filter(v=>v!==null);
  if(!valid.length)return {pct:null,count:array.length};
  return {pct:Math.min(100,valid.reduce((a,b)=>a+b,0)*100),count:valid.length};
}
const row=(key,en,ko,value,negative=true)=>({
  key,en,ko,state:value===null?"unknown":value===negative?"risk":"checked",
  evidence:value===null?"unknown":String(value)
});
function evmChecks(token){
 const fields=[
  ["is_honeypot","Honeypot detected","허니팟 감지"],
  ["cannot_sell_all","Full sale restriction","전량 매도 제한"],
  ["is_mintable","Token minting capability","추가 발행(Mint) 권한"],
  ["owner_change_balance","Owner can modify balances","관리자의 보유량 변경 권한"],
  ["transfer_pausable","Transfer pause capability","거래·전송 중단 권한"],
  ["is_blacklisted","Blacklist controls","블랙리스트 제어"],
  ["hidden_owner","Hidden owner","숨겨진 소유자"],
  ["is_proxy","Upgradeable proxy structure","프록시 변경 가능 구조"],
  ["slippage_modifiable","Mutable trading fees","거래세 변경 권한"],
  ["personal_slippage_modifiable","Address-specific fees","지갑별 차등 수수료"],
  ["can_take_back_ownership","Ownership can be reclaimed","소유권 재획득 권한"]
 ];
 const checks=fields.map(([field,en,ko])=>row(field,en,ko,booleanSignal(token[field])));
 checks.unshift({key:"is_open_source",en:"Verified source code",ko:"소스 코드 검증",state:booleanSignal(token.is_open_source)===null?"unknown":booleanSignal(token.is_open_source)?"checked":"risk",evidence:String(token.is_open_source??"unknown")});
 const buy=taxRate(token.buy_tax),sell=taxRate(token.sell_tax);
 const taxCheck=(key,en,ko,n)=>({key,en,ko,state:n===null?"unknown":n>=10?"risk":"checked",evidence:n===null?"unknown":n.toFixed(2)+"%",value:n});
 checks.push(taxCheck("buy_tax","Buy tax (10%+ warning)","매수세 (10% 이상 주의)",buy));
 checks.push(taxCheck("sell_tax","Sell tax (10%+ warning)","매도세 (10% 이상 주의)",sell));
 const blocked=booleanSignal(token.cannot_buy);
 checks.push(row("cannot_buy","Buy restriction detected","매수 제한 감지",blocked));
 return checks;
}
function solanaChecks(token){
 const fields=[
 ["mintable","Mint authority available","추가 발행(Mint) 권한"],
 ["freezable","Freeze authority available","동결(Freeze) 권한"],
 ["closable","Token close authority","토큰 종료 권한"],
 ["balance_mutable_authority","Balance mutable authority","보유량 변경 권한"],
 ["transfer_fee_upgradable","Upgradeable transfer fees","전송 수수료 변경 권한"],
 ["default_account_state_upgradable","Account state can change","계정 상태 변경 권한"]
 ];
 const checks=fields.map(([key,en,ko])=>row(key,en,ko,booleanSignal(token[key])));
 checks.push(row("non_transferable","Non-transferable token","전송 불가 토큰",booleanSignal(token.non_transferable)));
 const hook=token.transfer_hook;
 checks.push(row("transfer_hook","External transfer hooks","외부 전송 후크",Array.isArray(hook)?hook.length>0:null));
 const frozen=token.default_account_state;
 checks.push(row("default_account_state","New accounts default frozen","새 계정 기본 동결",frozen===null||frozen===undefined?null:String(frozen)==="2"));
 return checks;
}
export function evaluateSecurity(token,chain){
  if(!token||typeof token!=="object")return null;
  const checks=chain==="solana"?solanaChecks(token):evmChecks(token);
  const holder=topHolderConcentration(token);
  // IMPORTANT: GoPlus top-holder list may contain LP, exchange, burn, lockers and program-owned accounts.
  // Never infer developer holdings or unlocked LP from aggregate concentration.
  const alerts=checks.filter(x=>x.state==="risk");
  return {
    checks,
    risk:alerts.length,
    checked:checks.filter(x=>x.state==="checked").length,
    unknown:checks.filter(x=>x.state==="unknown").length,
    holder,
    holderCount:Number.isFinite(Number(token.holder_count))&&token.holder_count!==""&&!(Number(token.holder_count)===0&&Array.isArray(token.holders)&&token.holders.length>0)?Number(token.holder_count):null,
    owner:typeof token.owner_address==="string"&&/^0x[a-fA-F0-9]{40}$/.test(token.owner_address)?token.owner_address:null,
    creator:typeof token.creator_address==="string"&&/^0x[a-fA-F0-9]{40}$/.test(token.creator_address)?token.creator_address:null,
    lpLock:"unknown"
  };
}
function textOr(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function create(tag,css,text){
  const node=document.createElement(tag);if(css)node.className=css;if(text!==undefined)node.textContent=text;return node;
}
function renderSummary(state){
  const label=state==="risk"?bilingual("POTENTIAL RISK","위험 신호"):state==="checked"?bilingual("NOT FLAGGED","해당 신호 미감지"):bilingual("NOT VERIFIED","미확인");
  return create("span","safety-chip safety-"+state,label);
}
const brief=(key,lang)=>{
 const ko={
 is_honeypot:"제공사 모델의 판정이며 실제 매도 가능성을 보증하지 않습니다.",
 transfer_pausable:"전송 중단 기능 감지입니다. 현재 관리자 권한 행사 가능 여부는 별도 확인해야 합니다.",
 is_blacklisted:"블랙리스트 기능 감지입니다. 현재 관리자가 사용할 수 있다는 의미는 아닙니다.",
 is_open_source:"미검증 소스의 다른 검사 결과는 누락될 수 있습니다.",
 is_proxy:"업그레이드 가능성은 실제 권한 구조에 따라 달라집니다.",
 is_mintable:"추가 발행 기능 감지와 현재 발행 권한 사용 가능성은 다릅니다.",
 mintable:"권한이 존재하는지에 대한 제공사 신호입니다.",
 freezable:"토큰 계정 동결이 가능할 수 있습니다."
 };
 const en={
 is_honeypot:"Provider signal only; successful selling is never guaranteed.",
 transfer_pausable:"Capability signal; present-day admin control requires a separate check.",
 is_blacklisted:"Blacklist code signal does not prove currently usable permissions.",
 is_open_source:"Missing verified source may make other checks unavailable.",
 is_proxy:"Actual upgrade powers depend on implementation and admin.",
 is_mintable:"Mint capability does not prove a currently usable mint authority.",
 mintable:"This is a reported authority signal, not an execution test.",
 freezable:"Some token accounts may be frozen."
 };
 return (lang==="ko"?ko:en)[key]||"";
};
function initSafety(){
 const panel=document.getElementById("security-panel");
 if(!panel)return;
 const status=document.getElementById("security-status");
 const table=document.getElementById("security-checks");
 const provider=document.getElementById("security-source");
 let requestId=0,last=null,abort=null;
 const lang=()=>document.documentElement.lang==="ko"?"ko":"en";
 function clear(){
   requestId++;
   if(abort){abort.abort();abort=null;}
   last=null;panel.hidden=true;table.replaceChildren();
 }
 function showInfo(msg,state){
   status.textContent=msg;
   status.dataset.kind=state;
 }
 function render(){
   if(!last)return;
   const result=last.report;
   const currentLang=lang();
   textOr("security-risk-count",String(result.risk));
   textOr("security-unknown-count",String(result.unknown));
   textOr("security-checked-count",String(result.checked));
   textOr("security-holder-percent",result.holder.pct===null?"—":result.holder.pct.toFixed(1)+"%");
   textOr("security-owner",result.owner||"—");
   textOr("security-creator",result.creator||"—");
   textOr("security-holder-count",result.holderCount===null?"—":result.holderCount.toLocaleString("en-US"));
   textOr("security-holder-explain",result.holder.count===0?
     bilingual("No usable top-holder data reported.","활용 가능한 상위 홀더 정보가 제공되지 않았습니다."):
     bilingual("Sum of "+result.holder.count+" reported top-holder shares; includes possible pools/lockers/exchanges. NOT developer ownership.","제공된 상위 "+result.holder.count+"개 지갑 비율 합계입니다. LP·락커·거래소 등이 포함될 수 있으며 개발팀 보유량이 아닙니다."));
   textOr("security-timestamp",new Date(last.time).toISOString().replace("T"," ").replace(/\.\d+Z/," UTC"));
   table.replaceChildren();
   for(const check of result.checks){
     const item=create("li","safety-row");
     const title=create("span","safety-name",currentLang==="ko"?check.ko:check.en);
     const detail=brief(check.key,currentLang);
     const left=create("div","safety-left");left.append(title);
     if(detail)left.append(create("small","",detail));
     const right=create("div","safety-right");
     if(check.key==="buy_tax"||check.key==="sell_tax"){
       if(check.value!==null)right.append(create("strong","safety-value",check.value.toFixed(2)+"%"));
     }
     right.append(renderSummary(check.state));
     item.append(left,right);table.append(item);
   }
   showInfo(
     bilingual("GoPlus signals received. This is not a verified safety verdict.","GoPlus의 위험 신호를 조회했습니다. 안전 판정을 의미하지 않습니다."),
     "complete"
   );
 }
 async function scan({chain,address}){
   clear();
   panel.hidden=false;
   if(!Object.hasOwn(CODES,chain)){
     showInfo(bilingual("Security provider does not support this chain.","보안 제공사가 이 체인을 지원하지 않습니다."),"unknown");return;
   }
   const thisId=requestId;
   const controller=new AbortController();abort=controller;
   showInfo(bilingual("Checking reported contract and holder risk signals…","컨트랙트·홀더 위험 신호를 조회 중입니다…"),"pending");
   const url=providerEndpoint(chain,address);
   provider.href=url;
   const timeout=setTimeout(()=>controller.abort(),13000);
   try{
     const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"});
     if(!response.ok)throw new Error(response.status===429?"RATE_LIMIT":"HTTP_"+response.status);
     const json=await response.json();
     if(thisId!==requestId)return;
     const token=extractToken(json,chain,address);
     if(!token){showInfo(bilingual("No security record returned for this token; no conclusion can be drawn.","이 토큰의 보안 분석 기록이 제공되지 않았습니다. 안전 여부를 판단할 수 없습니다."),"unknown");return;}
     const report=evaluateSecurity(token,chain);
     last={report,time:Date.now()};
     render();
   }catch(err){
     if(thisId!==requestId)return;
     let message=bilingual("Security data unavailable (network, CORS or provider issue). No safety conclusion.","보안 데이터 조회 실패(CORS·네트워크·제공사 문제). 안전 여부는 미확인입니다.");
     if(err?.message==="RATE_LIMIT")message=bilingual("Security provider rate limit exceeded. Try again later.","보안 API 호출 제한에 도달했습니다. 잠시 뒤 다시 시도하세요.");
     if(err?.name==="AbortError")message=bilingual("Security lookup timed out. Please try again.","보안 데이터 조회가 시간 초과되었습니다. 다시 시도하세요.");
     showInfo(message,"unknown");
   }finally{clearTimeout(timeout);if(thisId===requestId)abort=null;}
 }
 window.addEventListener("yorbi:scanstart",clear);
 window.addEventListener("yorbi:scanresult",event=>{
   if(event.detail?.chain&&event.detail?.address)scan(event.detail);
 });
 window.addEventListener("yorbi:languagechange",()=>{if(last)render();});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initSafety,{once:true});
 else initSafety();
}
