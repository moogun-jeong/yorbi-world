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

/** Present shortened wallet addresses without losing the full address for copy / explorer. */
export function compactAddress(address){
 if(typeof address!=="string")return "—";
 if(/^0x[a-fA-F0-9]{40}$/.test(address))return address.slice(0,8)+"…"+address.slice(-6);
 if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))return address.slice(0,6)+"…"+address.slice(-6);
 return "—";
}
export function explorerAddressUrl(chain,address){
 if(typeof address!=="string")return null;
 if(chain==="solana"){
   return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)?"https://solscan.io/account/"+address:null;
 }
 if(!/^0x[a-fA-F0-9]{40}$/.test(address))return null;
 const hosts={ethereum:"etherscan.io",bsc:"bscscan.com",base:"basescan.org"};
 const host=hosts[chain];return host?"https://"+host+"/address/"+address:null;
}
/** These are detections from a provider, not a universal number of unverified risks. */
export function coverageDescription(report,lang="en"){
 const checked=report?.checks?.length||0;
 const missing=report?.unknown||0;
 if(lang==="ko")return "GoPlus 제공 검사 "+checked+"개 중 미확인 "+missing+"개입니다. LP 잠금, 실제 매도 성공, 관리자 권한 행사 가능 여부, 연결 지갑은 이 숫자에 포함되지 않습니다.";
 return missing+" of "+checked+" GoPlus checks were unknown. LP locks, real sell execution, active admin authority and linked wallets are outside this count.";
}

function textOr(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function create(tag,css,text){
 const el=document.createElement(tag);
 if(css)el.className=css;
 if(text!==undefined)el.textContent=text;
 return el;
}
const translated=(en,ko)=>bilingual(en,ko);
function makeTag(state){
 const caption=state==="risk"?
   translated("RISK SIGNAL","위험 신호"):state==="checked"?
   translated("NOT FLAGGED","해당 신호 미감지"):translated("NOT REPORTED","미확인");
 return create("span","safety-chip safety-"+state,caption);
}
const brief=(key,lang)=>{
 const ko={
   is_honeypot:"제공사 판정이며 실제 매도 성공을 보증하지 않습니다.",
   transfer_pausable:"코드 기능 탐지이며 현재 관리자 권한으로 행사 가능한지는 별도 검증이 필요합니다.",
   is_blacklisted:"블랙리스트 관련 코드 탐지로, 현재 사용 가능한 권한인지는 별도 확인해야 합니다.",
   is_open_source:"미검증 소스의 다른 위험 신호는 누락될 수 있습니다.",
   is_proxy:"업그레이드 가능 여부는 실제 권한 구조에 따라 다릅니다.",
   is_mintable:"추가 발행 코드 탐지와 현재 Mint 권한은 다릅니다.",
   mintable:"제공사가 탐지한 권한 신호이며 실제 권한 검증 결과는 아닙니다.",
   freezable:"일부 계정의 토큰이 동결될 수 있습니다."
 };
 const en={
   is_honeypot:"Provider flag only, not a guarantee of successful selling.",
   transfer_pausable:"Code-level capability; present-day admin authority requires verification.",
   is_blacklisted:"Code-level blacklist signal; usable privileges remain unverified.",
   is_open_source:"Unverified source may cause other risk checks to be missing.",
   is_proxy:"Actual upgrade authority depends on the contract implementation.",
   is_mintable:"Mintable code and currently usable mint authority are different.",
   mintable:"Provider-reported ability, not independent authority verification.",
   freezable:"Some token accounts may be frozen."
 };
 return (lang==="ko"?ko:en)[key]||"";
};
function isZeroAddress(value){
 return typeof value==="string"&&/^0x0{40}$/i.test(value);
}
function initSafety(){
 const panel=document.getElementById("security-panel");
 if(!panel)return;
 const status=document.getElementById("security-status");
 const alertList=document.getElementById("security-alerts");
 const checkedList=document.getElementById("security-checks");
 const unknownList=document.getElementById("security-unknown-checks");
 const checkedGroup=document.getElementById("security-checked-group");
 const unknownGroup=document.getElementById("security-unknown-group");
 const noAlert=document.getElementById("security-no-alerts");
 const riskBrief=document.getElementById("security-risk-brief");
 const provider=document.getElementById("security-source");
 const copyStatus=document.getElementById("security-copy-status");
 let requestId=0,last=null,abort=null;
 const lang=()=>document.documentElement.lang==="ko"?"ko":"en";
 function reset(){
  requestId++;
  if(abort){abort.abort();abort=null;}
  last=null;panel.hidden=true;
  alertList.replaceChildren();checkedList.replaceChildren();unknownList.replaceChildren();
  if(copyStatus)copyStatus.textContent="";
 }
 function showStatus(message,kind){status.textContent=message;status.dataset.kind=kind;}
 function rowFor(check,locale){
   const li=create("li","safety-row");
   const left=create("div","safety-left");
   left.append(create("span","safety-name",locale==="ko"?check.ko:check.en));
   const explanation=brief(check.key,locale);
   if(explanation)left.append(create("small","",explanation));
   const right=create("div","safety-right");
   if((check.key==="buy_tax"||check.key==="sell_tax")&&check.value!==null){
     right.append(create("strong","safety-value",check.value.toFixed(2)+"%"));
   }
   right.append(makeTag(check.state));
   li.append(left,right);
   return li;
 }
 function renderAddress(id,address,chain){
   const container=document.getElementById(id);
   if(!container)return;
   container.replaceChildren();
   const url=explorerAddressUrl(chain,address);
   if(!url){container.append(create("span","safety-address-empty","—"));return;}
   const anchor=create("a","safety-address-link",compactAddress(address)+" ↗");
   anchor.href=url;anchor.target="_blank";anchor.rel="noopener noreferrer";
   anchor.title=address;anchor.setAttribute("aria-label",address+" — "+translated("open block explorer","블록 탐색기 열기"));
   const btn=create("button","safety-copy",translated("Copy","복사"));
   btn.type="button";btn.dataset.address=address;btn.setAttribute("aria-label",translated("Copy full address","주소 전체 복사")+" "+address);
   container.append(anchor,btn);
 }
 function render(){
  if(!last)return;
  const {report,chain}=last;
  const locale=lang();
  textOr("security-risk-count",String(report.risk));
  textOr("security-checked-count",String(report.checked));
  textOr("security-unknown-count",String(report.unknown));
  textOr("security-scope-note",coverageDescription(report,locale));
  const flags=report.checks.filter(x=>x.state==="risk");
  const neutral=report.checks.filter(x=>x.state==="checked");
  const unknown=report.checks.filter(x=>x.state==="unknown");
  alertList.replaceChildren(...flags.map(c=>rowFor(c,locale)));
  checkedList.replaceChildren(...neutral.map(c=>rowFor(c,locale)));
  unknownList.replaceChildren(...unknown.map(c=>rowFor(c,locale)));
  noAlert.hidden=flags.length!==0;
  checkedGroup.hidden=neutral.length===0;
  unknownGroup.hidden=unknown.length===0;
  textOr("security-checked-label",translated("View "+neutral.length+" not-flagged checks","해당 신호 미감지 "+neutral.length+"개 자세히"));
  textOr("security-unknown-label",translated("View "+unknown.length+" unreported checks","미확인 "+unknown.length+"개 자세히"));
  riskBrief.textContent=flags.length===0?
   translated("No flags in the reported checks. This is not a safety certificate.","제공사 검사에서 감지된 신호가 없습니다. 안전 인증을 의미하지 않습니다."):
   translated("Detected: "+flags.map(x=>x.en).slice(0,3).join(", ")+(flags.length>3?" and "+(flags.length-3)+" more":"")+". Current exploitability is not confirmed.",
      "감지: "+flags.map(x=>x.ko).slice(0,3).join(", ")+(flags.length>3?" 외 "+(flags.length-3)+"건":"")+". 현재 행사 가능한 권한인지는 확인되지 않았습니다.");
  textOr("security-holder-percent",report.holder.pct===null?"—":report.holder.pct.toFixed(1)+"%");
  textOr("security-holder-count",report.holderCount===null?"—":report.holderCount.toLocaleString("en-US"));
  textOr("security-holder-explain",report.holder.count===0?
     translated("Provider did not return usable top-holder data.","제공된 상위 홀더 자료를 확인할 수 없습니다."):
     translated("Sum of "+report.holder.count+" reported top-holder holdings; pools, exchanges, lockers may be included. NOT team ownership.",
     "제공된 상위 "+report.holder.count+"개 지갑 비율의 합입니다. 풀·거래소·락커 등이 섞일 수 있으며 개발팀 보유량이 아닙니다."));
  renderAddress("security-owner",report.owner,chain);
  renderAddress("security-creator",report.creator,chain);
  textOr("security-admin-brief",
    isZeroAddress(report.owner)?
    translated("Reported owner is the zero address. It may indicate renounced ownership, but detected functions and alternative admin pathways still need verification.",
      "제공사상 소유자가 0 주소로 표시됩니다. 소유권 포기를 시사할 수 있지만 감지된 기능과 다른 관리자 경로는 추가 확인이 필요합니다."):
    translated("Owner/creator addresses are provider-reported, not proof of who currently controls detected functions.",
      "소유자·생성자 주소는 제공사 정보이며, 감지된 기능의 현재 통제 권한을 증명하지 않습니다."));
  textOr("security-timestamp",new Date(last.time).toISOString().replace("T"," ").replace(/\.\d+Z/," UTC"));
  showStatus(translated("GoPlus signals loaded. There is no global SAFE verdict.","GoPlus 조회 완료. 전체 안전 판정은 제공하지 않습니다."),"complete");
 }
 async function scan({chain,address}){
  reset();panel.hidden=false;
  if(!Object.hasOwn(CODES,chain)){
   showStatus(translated("Chain unsupported; security unknown.","미지원 체인으로 보안 상태는 미확인입니다."),"unknown");return;
  }
  const id=requestId;
  const controller=new AbortController();abort=controller;
  showStatus(translated("Checking GoPlus indicators…","GoPlus 위험 신호를 조회하고 있습니다…"),"pending");
  const url=providerEndpoint(chain,address);provider.href=url;
  const timeout=setTimeout(()=>controller.abort(),13000);
  try{
   const resp=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"});
   if(!resp.ok)throw new Error(resp.status===429?"RATE_LIMIT":"HTTP_"+resp.status);
   const data=await resp.json();if(id!==requestId)return;
   const token=extractToken(data,chain,address);
   if(!token){showStatus(translated("No provider record. Token safety is unknown.","제공된 보안 분석 결과가 없어 안전 여부는 미확인입니다."),"unknown");return;}
   last={report:evaluateSecurity(token,chain),time:Date.now(),chain,address};
   render();
   window.dispatchEvent(new CustomEvent("yorbi:cachechange",{detail:{section:"security",value:last}}));
   // Pass verified provider-reported metadata to read-only wallet analysis; no ownership inference.
   window.dispatchEvent(new CustomEvent("yorbi:securityresult",{detail:{chain,address,creator:last.report.creator,owner:last.report.owner}}));
  }catch(err){
   if(id!==requestId)return;
   let message=translated("Provider unavailable (network/CORS/error). Safety is unknown.","GoPlus 조회 실패(네트워크·CORS·제공사 오류). 안전 상태는 미확인입니다.");
   if(err?.message==="RATE_LIMIT")message=translated("Provider rate limit reached. Please retry later.","GoPlus 요청 한도에 도달했습니다. 나중에 다시 시도하세요.");
   if(err?.name==="AbortError")message=translated("GoPlus request timed out. Safety is unknown.","GoPlus 조회 시간 초과. 안전 여부는 미확인입니다.");
   showStatus(message,"unknown");
  }finally{clearTimeout(timeout);if(id===requestId)abort=null;}
 }
 panel.addEventListener("click",async e=>{
  const button=e.target.closest("button.safety-copy");
  if(!button||!panel.contains(button))return;
  const address=button.dataset.address;
  if(!address)return;
  try{
   if(!navigator.clipboard?.writeText)throw new Error("Clipboard API unsupported");
   await navigator.clipboard.writeText(address);
   if(copyStatus)copyStatus.textContent=translated("Full wallet address copied.","지갑 주소 전체를 복사했습니다.");
  }catch(_){
   if(copyStatus)copyStatus.textContent=translated("Clipboard unavailable; open the explorer link to copy the full address.","복사 기능을 사용할 수 없습니다. 탐색기 링크에서 주소를 복사하세요.");
  }
 });
 window.addEventListener("yorbi:scanstart",reset);
 window.addEventListener("yorbi:scanresult",e=>{if(e.detail?.chain&&e.detail?.address)scan(e.detail);});
 window.addEventListener("yorbi:restore-security",event=>{
   const value=event.detail;
   if(!value||!value.report||!Object.hasOwn(CODES,value.chain)||
     typeof value.address!=="string"||!value.address||
     !Number.isFinite(Number(value.time)))return;
   reset();
   last=value;panel.hidden=false;
   provider.href=providerEndpoint(value.chain,value.address);
   render();
   window.dispatchEvent(new CustomEvent("yorbi:securityresult",{detail:{
     chain:value.chain,address:value.address,creator:value.report.creator,owner:value.report.owner
   }}));
 });
 window.addEventListener("yorbi:languagechange",()=>{if(last)render();});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initSafety,{once:true});
 else initSafety();
}
