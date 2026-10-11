/* Sprint 6.7: combined evidence, not a trading signal or safety score. */
const supported=new Set(["ethereum","base","bsc","solana"]);
const addr=/^0x[a-fA-F0-9]{40}$/;
const hash=/^0x[a-fA-F0-9]{64}$/;
const key=x=>typeof x==="string"?x.toLowerCase():"";
const localize=(en,ko,lang)=>lang==="ko"?ko:en;
function safeLink(url){
 try{const u=new URL(url);
 return u.protocol==="https:"&&["dexscreener.com","www.dexscreener.com","eth.blockscout.com","base.blockscout.com"].includes(u.hostname)?u.href:null;
 }catch(_){return null;}
}
function row(id,status,grade,en,ko,source,url){
 return {id,status,grade,en,ko,source,link:safeLink(url)};
}
export function matches(record,chain,token){
 const value=record?.address??record?.token;
 return supported.has(chain)&&record?.chain===chain&&typeof value==="string"&&typeof token==="string"&&
  (chain==="solana"?value===token:key(value)===key(token));
}
export function integratedEvidence({explorer,security,radar,deep}={},lang="ko"){
 if(!explorer?.pair||!matches(explorer,explorer.chain,explorer.address))return {ready:false,items:[]};
 const chain=explorer.chain,token=explorer.address,items=[];
 const sec=matches(security,chain,token)&&security?.report?security.report:null;
 const wal=matches(radar?.context,chain,token)&&radar?.last?radar.last:null;
 const dep=matches(deep?.context,chain,token)&&deep?.output?deep.output:null;
 const pair=explorer.pair;
 const liquidity=pair.liquidity?.usd;
 const usd=liquidity===null||liquidity===undefined||liquidity===""?null:Number(liquidity);
 const link=safeLink(pair.url);
 if(usd===null||!Number.isFinite(usd)||usd<0)
  items.push(row("liquidity","unknown","unverified","Selected pool liquidity was not reported. Exit capacity is unknown.",
   "선택 거래쌍 유동성 미제공. 실제 매도 가능 규모는 미확인입니다.","DEX Screener",link));
 else{
  const str="$"+usd.toLocaleString("en-US",{maximumFractionDigits:0});
  items.push(row("liquidity",usd<20000?"attention":usd<100000?"watch":"reported","provider",
    "Selected pair liquidity "+str+". "+(usd<20000?"Thin pool; even small sales may move price.":usd<100000?"Limited depth, actual slippage unverified.":"Displayed depth cannot guarantee successful exits."),
    "선택 거래쌍 유동성 "+str+". "+(usd<20000?"유동성이 얇아 소액 매도에도 가격 영향이 클 수 있습니다.":usd<100000?"유동성이 제한적이며 실제 슬리피지는 미확인입니다.":"표시 유동성이 실제 매도 체결을 보장하지 않습니다."),"DEX Screener",link));
 }
 if(!sec){
  items.push(row("contract","unknown","unverified","GoPlus contract-risk results unavailable.",
   "GoPlus 컨트랙트 위험 결과 미확인.","GoPlus"));
  items.push(row("holders","unknown","unverified","Top-holder concentration unavailable.",
   "상위 홀더 집중도 미확인.","GoPlus"));
 }else{
  const checks=Array.isArray(sec.checks)?sec.checks:[];
  const alerts=checks.filter(x=>x?.state==="risk"),missing=checks.filter(x=>x?.state==="unknown");
  if(!checks.length)items.push(row("contract","unknown","unverified",
    "No usable security provider checks.","사용할 수 있는 제공사 보안 검사 항목이 없습니다.","GoPlus"));
  else items.push(row("contract",alerts.length?"attention":missing.length?"watch":"reported","provider",
    alerts.length?alerts.length+" provider risk flags: "+alerts.slice(0,3).map(x=>x.en||x.key).join(", ")+". Active administrative power unverified.":
      "No risk flags among "+checks.length+" GoPlus checks ("+missing.length+" unknown); NOT a safety certificate.",
    alerts.length?"GoPlus 위험 신호 "+alerts.length+"개: "+alerts.slice(0,3).map(x=>x.ko||x.key).join(", ")+". 현재 행사 가능한 관리자 권한은 미검증입니다.":
      "GoPlus 검사 "+checks.length+"개 중 위험 신호 미감지(미확인 "+missing.length+"개). 안전 인증은 아닙니다.","GoPlus"));
  const pct=sec.holder?.pct,n=Number(sec.holder?.count)||0;
  items.push(typeof pct==="number"&&Number.isFinite(pct)&&n>0?
   row("holders",pct>=50?"attention":pct>=25?"watch":"reported","provider",
    "Provider top "+n+" holder shares total "+pct.toFixed(1)+"%. Includes possible pools, exchanges and custodians; NOT team ownership.",
    "제공사 상위 "+n+"개 홀더 지분 합계 "+pct.toFixed(1)+"%. LP·거래소·수탁 지갑 포함 가능, 개발팀 지분이 아닙니다.","GoPlus"):
   row("holders","unknown","unverified","Top-holder data insufficient for concentration analysis.",
    "상위 홀더 집중도를 계산할 자료가 없습니다.","GoPlus"));
 }
 items.push(row("lp-lock","unknown","unverified","LP lock/burn and rug-resistance NOT verified.",
  "LP 잠금·소각과 유동성 회수(Rug) 방지 여부는 미검증입니다.","Not checked"));
 const creator=sec?.creator;
 if(!addr.test(creator||""))items.push(row("creator","unknown","unverified",
  "Reported token creator unavailable; developer selling cannot be assessed.",
  "생성자 주소가 확인되지 않아 개발자 매도 여부는 미확인입니다.","GoPlus / Blockscout"));
 else if(!wal)items.push(row("creator","unknown","unverified",
  "Creator identified by provider, but no wallet sample was fetched.",
  "제공사 생성자 주소는 있으나 지갑 이동 표본을 조회하지 않았습니다.","GoPlus / Blockscout"));
 else {
  const r=wal.creatorRecord,summary=r?.summary;
  if(r?.error||!summary)items.push(row("creator","unknown","unverified",
   "Creator transfer history unavailable; zero sales cannot be inferred.",
   "생성자 이동 내역 조회 실패. 매도가 없었다고 볼 수 없습니다.","Blockscout"));
  else {
   const sent=Number(summary.sent)||0;
   items.push(row("creator",sent?"watch":"reported","onchain",
    sent?"Creator-address outward token transfers: "+sent+" in a bounded sample. NOT proven DEX sales.":
     "No outgoing creator transfer in fetched sample; older activity remains unknown.",
    sent?"생성자 주소의 토큰 유출 "+sent+"건이 제한 표본에서 관찰됐습니다. DEX 매도 확정은 아닙니다.":
     "조회한 표본에 생성자 유출이 없지만 이전 거래·매도가 없었다는 뜻은 아닙니다.","Blockscout"));
  }
 }
 const events=Array.isArray(dep?.events)?dep.events:null;
 if(!events)items.push(row("creator-swap","unknown","unverified",
  "Creator swap transactions not investigated yet.",
  "생성자 스왑 거래 근거를 아직 조사하지 않았습니다.","Blockscout"));
 else if(!addr.test(creator||""))items.push(row("creator-swap","unknown","unverified",
  "No provider-identified creator to match with transaction evidence.",
  "거래 근거와 대조할 생성자 주소 미확인.","Blockscout"));
 else {
  const relevant=events.filter(e=>key(e?.wallet)===key(creator)&&hash.test(e?.hash||""));
  const sell=relevant.filter(e=>e.verdict?.kind==="swap_sell_evidence");
  const context=relevant.filter(e=>e.verdict?.kind==="swap_context_evidence"&&["send","sent"].includes(e.verdict.direction));
  const first=sell[0]||context[0];
  const proof=first&&["ethereum","base"].includes(chain)?
   "https://"+(chain==="base"?"base":"eth")+".blockscout.com/tx/"+first.hash:null;
  if(sell.length)items.push(row("creator-swap","attention","onchain",
    "Creator-address token spent with explicit swap method and opposing payment flow in "+sell.length+" sampled transaction(s); NOT lifetime sales or realized profit.",
    "생성자 주소의 명시적 스왑·반대 방향 결제 흐름을 동반한 토큰 지출 "+sell.length+"건. 전체 매도·실현손익이 아닙니다.","Blockscout",proof));
  else if(context.length)items.push(row("creator-swap","watch","context",
    "Creator-address token-spend swap CONTEXT: "+context.length+" sampled transactions; sale causation unproven.",
    "생성자 토큰 지출과 스왑 정황 "+context.length+"건. 실제 매도 인과관계 미확인.","Blockscout",proof));
  else items.push(row("creator-swap",relevant.length?"reported":"unknown",relevant.length?"onchain":"unverified",
    relevant.length?"No creator swap-spend evidence in "+relevant.length+" inspected transaction(s). Not a lifetime no-sale statement.":
      "Deep sample did not inspect creator transactions. No sale conclusion.",
    relevant.length?"생성자 거래 "+relevant.length+"건 조사에서 스왑 지출 근거 미감지. 전체 매도 여부는 미확인입니다.":
      "심층 분석 표본에 생성자 거래가 없어 매도 여부를 판단하지 못합니다.","Blockscout"));
 }
 const coverage={
  explorer:true,security:Boolean(sec),holders:Boolean(sec?.holder?.count),
  creatorTransfers:Boolean(wal?.creatorRecord&&!wal.creatorRecord.error),
  deep:Boolean(dep),lpVerified:false
 };
 const totals={attention:items.filter(x=>x.status==="attention").length,watch:items.filter(x=>x.status==="watch").length,
  unknown:items.filter(x=>x.status==="unknown").length};
 return {ready:true,chain,token,items,coverage,totals,summary:localize(
  "Integrated evidence review, NOT an investment recommendation or fraud verdict.",
  "근거 통합 확인이며 투자 추천 점수나 사기 확정 판정이 아닙니다.",lang)};
}
function el(tag,cls,value){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(value!==undefined)n.textContent=value;return n;
}
function init(){
 const panel=document.getElementById("risk-synthesis");if(!panel)return;
 const list=document.getElementById("risk-evidence"),caption=document.getElementById("risk-scope"),
 summary=document.getElementById("risk-summary"),counts=document.getElementById("risk-counts");
 let explorer=null,security=null,radar=null,deep=null;
 const lang=()=>document.documentElement.lang==="ko"?"ko":"en";
 const clear=()=>{explorer=null;security=null;radar=null;deep=null;panel.hidden=true;list.replaceChildren();};
 function render(){
  const result=integratedEvidence({explorer,security,radar,deep},lang());
  if(!result.ready){panel.hidden=true;return;}
  const names={attention:["Warning","주의 신호"],watch:["Review","추가 확인"],
   reported:["Reported","관찰·제공"],unknown:["Unknown","미확인"]};
  const grades={provider:["Provider signal","제공사 자료"],onchain:["On-chain sample","온체인 표본"],
   context:["Context only","정황만 확인"],unverified:["Unverified","미검증"]};
  list.replaceChildren();
  for(const x of result.items){
   const li=el("li","risk-evidence-row"),top=el("div","risk-evidence-head");
   top.append(el("span","risk-evidence-tag risk-"+x.status,names[x.status][lang()==="ko"?1:0]));
   li.append(top,el("p","risk-evidence-description",lang()==="ko"?x.ko:x.en),
    el("small","risk-evidence-meta",grades[x.grade][lang()==="ko"?1:0]+" · "+x.source));
   if(x.link){const a=el("a","risk-evidence-link",
     lang()==="ko"?"근거 원문 확인 ↗":"Original evidence ↗");
    a.href=x.link;a.target="_blank";a.rel="noopener noreferrer";li.append(a);}
   list.append(li);
  }
  counts.textContent=lang()==="ko"?"주의 "+result.totals.attention+" · 추가 확인 "+result.totals.watch+" · 미확인 "+result.totals.unknown:
   result.totals.attention+" warnings · "+result.totals.watch+" review · "+result.totals.unknown+" unknown";
  const c=result.coverage;
  const coverage=[c.explorer,c.security,c.holders,c.creatorTransfers,c.deep].filter(Boolean).length;
  caption.textContent=lang()==="ko"?
   "자료 범위 5개 중 조회 "+coverage+"개. LP 잠금 미검증. 지갑 이동·심층 거래는 최대 조회 표본만 사용합니다.":
   coverage+" of 5 evidence areas available. LP lock unverified; wallet/trade records are bounded samples.";
  summary.textContent=result.summary;panel.hidden=false;
 }
 window.addEventListener("yorbi:scanstart",clear);
 window.addEventListener("yorbi:cachechange",e=>{
  const {section,value}=e.detail||{};
  if(section==="explorer"){
   if(explorer&&!matches(value,explorer.chain,explorer.address)){security=null;radar=null;deep=null;}
   explorer=value;
  }else if(section==="security")security=value;
  else if(section==="radar")radar=value;
  else if(section==="deep")deep=value;
  render();
 });
 window.addEventListener("yorbi:restore-explorer",e=>{explorer=e.detail;render()});
 window.addEventListener("yorbi:restore-security",e=>{security=e.detail;render()});
 window.addEventListener("yorbi:restore-radar",e=>{radar=e.detail;render()});
 window.addEventListener("yorbi:restore-deep",e=>{deep=e.detail;render()});
 window.addEventListener("yorbi:languagechange",render);
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
