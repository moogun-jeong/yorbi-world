/* YORBI Explorer Beta: public DEX pair lookup only. No trades, wallet connection, AI, or contract security auditing. */
export const CHAINS=Object.freeze({ethereum:"Ethereum",bsc:"BNB Chain",base:"Base",solana:"Solana"});
const evm=/^0x[a-fA-F0-9]{40}$/;
const sol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function validAddress(chain,address){
  if(!Object.hasOwn(CHAINS,chain)||typeof address!=="string")return false;
  return chain==="solana"?sol.test(address):evm.test(address);
}
export function chooseBestPair(items,chain,address){
  if(!Array.isArray(items))return null;
  const normalize=v=>chain==="solana"?String(v||""):String(v||"").toLowerCase();
  const matches=items.filter(p=>
    p&&p.chainId===chain&&
    normalize(p.baseToken?.address)===normalize(address)&&
    typeof p.pairAddress==="string"
  );
  const usable=matches.filter(p=>Number.isFinite(Number(p.liquidity?.usd))&&Number(p.liquidity.usd)>=0);
  const sorted=usable.length?usable:matches;
  sorted.sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));
  return sorted.length?{pair:sorted[0],count:matches.length}:null;
}
export function formatMoney(value,{compact=true,price=false}={}){
  if(value===null||value===undefined||value===""||!Number.isFinite(Number(value)))return "—";
  const n=Number(value);
  if(price){
    if(n===0)return "$0";
    if(n<0.000001)return "$"+n.toExponential(4);
    if(n<0.01)return "$"+n.toLocaleString("en-US",{maximumSignificantDigits:6});
    return "$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:6});
  }
  if(compact&&Math.abs(n)>=1e9)return "$"+(n/1e9).toFixed(2)+"B";
  if(compact&&Math.abs(n)>=1e6)return "$"+(n/1e6).toFixed(2)+"M";
  if(compact&&Math.abs(n)>=1e3)return "$"+(n/1e3).toFixed(2)+"K";
  return "$"+n.toLocaleString("en-US",{maximumFractionDigits:2});
}
export function liquidityNote(usd,lang="en"){
  if(!Number.isFinite(Number(usd))||usd===null||usd===undefined)return lang==="ko"?"유동성 정보가 제공되지 않습니다. 이 값만으로 안전성을 판단하지 마세요.":"Liquidity is not reported. This alone does not determine safety.";
  const n=Number(usd);
  if(n<20000)return lang==="ko"?"선택된 거래쌍의 유동성이 적은 편입니다. 작은 매도도 가격에 큰 영향을 줄 수 있습니다.":"This pair has thin liquidity. Even a small sale may move the price significantly.";
  if(n<100000)return lang==="ko"?"선택된 거래쌍의 유동성이 제한적입니다. 매도 시 슬리피지를 주의하세요.":"This pair has limited liquidity; consider potential slippage when selling.";
  return lang==="ko"?"선택된 거래쌍의 유동성이 표시됩니다. 큰 매도도 안전하게 체결된다는 의미는 아닙니다.":"Liquidity is reported for this pair; it does not guarantee a low-impact exit.";
}
export function safeProviderUrl(pair){
  try{
    const link=new URL(pair?.url);
    return link.protocol==="https:"&&(link.hostname==="dexscreener.com"||link.hostname==="www.dexscreener.com")?link.href:null;
  }catch(_){return null;}
}
const t=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
function initExplorer(){
 const form=document.querySelector("#token-form");
 if(!form)return;
 const select=document.querySelector("#scan-chain");
 const field=document.querySelector("#scan-address");
 const submit=document.querySelector("#scan-submit");
 const status=document.querySelector("#scan-status");
 const out=document.querySelector("#scan-results");
 const demo=document.querySelector("#scan-demo");
 const source=document.querySelector("#scan-source");
 const assign=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
 let loading=false;
 let last=null;
 function setStatus(message,state){
   status.textContent=message;
   status.dataset.kind=state||"info";
 }
 function render(record){
   if(!record)return;
   const {pair,count,chain,address,date}=record;
   const token=([pair.baseToken,pair.quoteToken].find(x=>
     chain==="solana"?x?.address===address:String(x?.address||"").toLowerCase()===address.toLowerCase()
   ))||pair.baseToken;
   assign("scan-token",(token?.name||"Unknown token")+" ("+(token?.symbol||"?")+")");
   assign("scan-contract",address);
   assign("scan-selected-chain",CHAINS[chain]);
   assign("scan-pair",(pair.baseToken?.symbol||"?")+"/"+(pair.quoteToken?.symbol||"?")+" · "+String(pair.dexId||"DEX"));
   assign("scan-price",formatMoney(pair.priceUsd,{price:true}));
   assign("scan-liquidity",formatMoney(pair.liquidity?.usd));
   assign("scan-volume",formatMoney(pair.volume?.h24));
   assign("scan-mcap",formatMoney(pair.marketCap));
   assign("scan-fdv",formatMoney(pair.fdv));
   const change=pair.priceChange?.h24;
   assign("scan-change",change===null||change===undefined||!Number.isFinite(Number(change))?"—":(Number(change)>0?"+":"")+Number(change).toFixed(2)+"%");
   const txn=pair.txns?.h24;
   assign("scan-trades",txn&&Number.isFinite(Number(txn.buys))&&Number.isFinite(Number(txn.sells))?
      Number(txn.buys).toLocaleString("en-US")+" / "+Number(txn.sells).toLocaleString("en-US"):"—");
   assign("scan-count",String(count));
   assign("scan-checked",new Date(date).toISOString().replace("T"," ").replace(/\.\d+Z/," UTC"));
   assign("scan-interpretation",liquidityNote(pair.liquidity?.usd,document.documentElement.lang));
   const link=safeProviderUrl(pair);
   source.hidden=!link;
   if(link)source.href=link;
   out.hidden=false;
 }
 async function scan(){
   if(loading)return;
   const chain=select.value;
   const address=field.value.trim();
   out.hidden=true;
   last=null;
   if(!validAddress(chain,address)){
     setStatus(t("Enter a valid contract address for the selected chain. Token names and symbols are not accepted.","선택한 체인의 정확한 토큰 주소를 입력하세요. 이름이나 티커만으로는 조회하지 않습니다."),"error");
     return;
   }
   setStatus(t("Looking up public DEX pairs…","공개 DEX 거래쌍을 조회하고 있습니다…"),"loading");
   loading=true;submit.disabled=true;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
     const endpoint="https://api.dexscreener.com/token-pairs/v1/"+encodeURIComponent(chain)+"/"+encodeURIComponent(address);
     const response=await fetch(endpoint,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"});
     if(!response.ok)throw new Error(response.status===429?"LIMIT":"HTTP_"+response.status);
     const pairs=await response.json();
     const found=chooseBestPair(pairs,chain,address);
     if(!found){setStatus(t("No matching DEX pair with this token as its base was reported. This does not mean the token does not exist.","요청한 토큰이 기준 토큰으로 표시된 DEX 거래쌍을 찾지 못했습니다. 토큰이 존재하지 않는다는 뜻은 아닙니다."),"info");return;}
     last={...found,chain,address,date:Date.now()};
     render(last);
     setStatus(t("Data received. Displaying the highest-liquidity matching pair.","조회 완료. 일치하는 거래쌍 중 표시 유동성이 가장 큰 거래쌍을 보여줍니다."),"ok");
   }catch(err){
     let msg=t("DEX data could not be retrieved. Try again later or check the token on DEX Screener.","DEX 데이터를 가져오지 못했습니다. 잠시 후 재시도하거나 DEX Screener에서 직접 확인하세요.");
     if(err?.name==="AbortError")msg=t("The lookup timed out. Please try again.","조회 시간이 초과됐습니다. 다시 시도하세요.");
     if(err?.message==="LIMIT")msg=t("The data provider is rate-limiting requests. Try again later.","데이터 제공자의 요청 제한에 도달했습니다. 잠시 후 다시 시도하세요.");
     setStatus(msg,"error");
   }finally{clearTimeout(timeout);loading=false;submit.disabled=false;}
 }
 form.addEventListener("submit",event=>{event.preventDefault();scan();});
 demo.addEventListener("click",()=>{
   select.value="ethereum";
   field.value="0x6982508145454Ce325dDbE47a25d4Ec3d2311933";
   scan();
 });
 window.addEventListener("yorbi:languagechange",()=>{
   if(last)render(last);
   // Preserve the current request state without making an unrequested new API call.
 });
}
if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initExplorer,{once:true});
  else initExplorer();
}
