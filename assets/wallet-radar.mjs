/* YORBI Wallet Radar Beta: read-only, evidence-only EVM token flow, on demand.
 * Address ownership is never inferred from a shared router, label or transfer.
 * A token transfer does not establish a buy or sell or the same wallet owner.
 */
export const TRACKER_HOSTS=Object.freeze({
 ethereum:"https://eth.blockscout.com",
 base:"https://base.blockscout.com"
});
const hexAddress=/^0x[a-fA-F0-9]{40}$/;
const txHash=/^0x[a-fA-F0-9]{64}$/;
const toKey=x=>typeof x==="string"?x.toLowerCase():"";
const ui=(en,ko)=>document.documentElement.lang==="ko"?ko:en;
export function apiUrl(chain,kind,address,token){
 const host=TRACKER_HOSTS[chain];
 if(!host||!hexAddress.test(address))return null;
 if(kind==="holders")return host+"/api/v2/tokens/"+address+"/holders";
 if(kind==="token")return host+"/api/v2/tokens/"+address;
 if(kind==="transfers"&&hexAddress.test(token))return host+"/api/v2/addresses/"+address+"/token-transfers?token="+token;
 return null;
}
export function addressUrl(chain,address){
 const host=TRACKER_HOSTS[chain];
 return host&&hexAddress.test(address)?host+"/address/"+address:null;
}
export function txUrl(chain,hash){
 const host=TRACKER_HOSTS[chain];
 return host&&txHash.test(hash)?host+"/tx/"+hash:null;
}
function toBigInt(value){
 try{return typeof value==="string"&&/^\d+$/.test(value)?BigInt(value):null;}catch(_){return null;}
}
export function percentOfSupply(balance,supply){
 const a=toBigInt(balance),b=toBigInt(supply);
 if(a===null||b===null||b<=0n)return null;
 const v=Number((a*100000n)/b)/1000;
 return Number.isFinite(v)?Math.min(100,v):null;
}
export function sampleWallets(payload,tokenInfo,max=3){
 const items=Array.isArray(payload?.items)?payload.items:[];
 const tokenSupply=tokenInfo?.total_supply;
 const selected=[],excluded=[];
 for(let i=0;i<items.length;i++){
   const h=items[i],addr=h?.address;
   const address=addr?.hash;
   if(!hexAddress.test(address))continue;
   const names=(addr?.metadata?.tags||[]).map(t=>String(t?.name||"").toLowerCase());
   const explicitService=names.some(n=>/exchange|hot wallet|binance|coinbase|kraken|okx|bybit|pool|liquidity|burn|dead|locker|custody|custodian/.test(n));
   const namedContract=Boolean(addr?.is_contract);
   const current={rank:i+1,address,balance:h.value||null,share:percentOfSupply(h.value,tokenSupply),
     label:addr?.name||null,isContract:namedContract,knownService:explicitService};
   if(namedContract||explicitService||/^0x0{40}$/i.test(address)){excluded.push(current);continue;}
   if(selected.length<max)selected.push(current);
 }
 return {selected,excludedCount:excluded.length,sourceCount:items.length,truncated:Boolean(payload?.next_page_params)};
}
function amountFromTransfer(item){
 const raw=item?.total?.value,dec=Number(item?.total?.decimals ?? item?.token?.decimals);
 if(!Number.isFinite(dec)||dec<0||dec>36)return null;
 const units=toBigInt(raw);
 if(units===null)return null;
 const total=Number(units)/10**dec;
 return Number.isFinite(total)?total:null;
}
export function transferSummary(payload,address,token){
 const arr=Array.isArray(payload?.items)?payload.items:[];
 const list=arr.filter(i=>toKey(i?.token?.address_hash)===toKey(token)&&
   (toKey(i?.from?.hash)===toKey(address)||toKey(i?.to?.hash)===toKey(address)));
 const recent=[],seen=new Set();
 let received=0,sent=0,inAmount=0,outAmount=0,knownReceived=0,knownSent=0;
 for(const item of list){
   const from=toKey(item.from?.hash),to=toKey(item.to?.hash),wallet=toKey(address);
   if(from===wallet&&to===wallet)continue;
   const direction=to===wallet?"in":"out";
   const amount=amountFromTransfer(item);
   if(direction==="in"){received++;if(amount!==null){inAmount+=amount;knownReceived++;}}
   else{sent++;if(amount!==null){outAmount+=amount;knownSent++;}}
   const hash=item.transaction_hash;
   if(txHash.test(hash)&&!seen.has(hash)&&recent.length<4){
      seen.add(hash);
      recent.push({hash,direction,amount,time:typeof item.timestamp==="string"?item.timestamp:null,
        counterparty:direction==="in"?item.from?.hash:item.to?.hash});
   }
 }
 return {received,sent,inAmount:knownReceived===received?inAmount:null,outAmount:knownSent===sent?outAmount:null,
   sampleEvents:list.length,partial:Boolean(payload?.next_page_params),recent};
}
export function directTokenLinks(creatorEvents,creator,watchlist,token,chain){
 if(!hexAddress.test(creator)||!Array.isArray(creatorEvents))return [];
 const wallets=new Set((watchlist||[]).map(w=>toKey(w.address||w)).filter(x=>hexAddress.test(x)));
 const dedup=new Set(),out=[];
 for(const t of creatorEvents){
  if(toKey(t?.token?.address_hash)!==toKey(token)||!txHash.test(t?.transaction_hash))continue;
  const from=toKey(t?.from?.hash),to=toKey(t?.to?.hash),origin=toKey(creator);
  if(!((from===origin&&wallets.has(to))||(to===origin&&wallets.has(from))))continue;
  const key=t.transaction_hash+"-"+(t.log_index??"");
  if(dedup.has(key))continue;dedup.add(key);
  out.push({hash:t.transaction_hash,from:t.from.hash,to:t.to.hash,amount:amountFromTransfer(t),
    time:t.timestamp||null,url:txUrl(chain,t.transaction_hash)});
 }
 return out.slice(0,8);
}
export function shortAddress(s){
 return hexAddress.test(s)?s.slice(0,8)+"…"+s.slice(-6):"—";
}
export function compactToken(n){
 if(n===null||!Number.isFinite(n))return "—";
 if(n>=1e12)return "~"+(n/1e12).toFixed(2)+"T";
 if(n>=1e9)return "~"+(n/1e9).toFixed(2)+"B";
 if(n>=1e6)return "~"+(n/1e6).toFixed(2)+"M";
 if(n>=1e3)return "~"+(n/1e3).toFixed(2)+"K";
 return "~"+n.toLocaleString("en-US",{maximumFractionDigits:4});
}
function el(tag,klass,content){
 const node=document.createElement(tag);
 if(klass)node.className=klass;
 if(content!==undefined)node.textContent=content;
 return node;
}
function link(chain,addr,label,isTx=false){
 const url=isTx?txUrl(chain,addr):addressUrl(chain,addr);
 if(!url)return el("span","tracker-missing",label||"—");
 const a=el("a","tracker-source",label||shortAddress(addr)+" ↗");
 a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.title=addr;
 return a;
}
async function getJson(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),13000);
 try{
  const response=await fetch(url,{headers:{"Accept":"application/json"},cache:"no-store",signal:controller.signal});
  if(!response.ok)throw Error(response.status===429?"RATE_LIMIT":"HTTP_"+response.status);
  return await response.json();
 }finally{clearTimeout(timer);}
}
function initTracker(){
 const panel=document.getElementById("wallet-tracker");
 if(!panel)return;
 const btn=document.getElementById("tracker-run");
 const status=document.getElementById("tracker-status");
 const cards=document.getElementById("tracker-wallets");
 const connections=document.getElementById("tracker-links");
 const scope=document.getElementById("tracker-scope");
 const creatorBlock=document.getElementById("tracker-creator");
 const summary=document.getElementById("tracker-summary");
 let context=null,creator=null,last=null,version=0,busy=false;
 function message(text,kind="info"){status.textContent=text;status.dataset.kind=kind;}
 function clear(){
   version++;context=null;creator=null;last=null;busy=false;
   cards.replaceChildren();connections.replaceChildren();summary.hidden=true;
   panel.hidden=true;btn.disabled=false;
 }
 function renderWalletActivity(record,chain,index,isCreator=false){
  const card=el("article","tracker-wallet-card");
  const header=el("div","tracker-wallet-head");
  const title=el("strong","",isCreator?ui("Token creator (provider-reported)","토큰 생성자 (제공사 기준)"):
    ui("Top holder #","상위 홀더 #")+record.holder.rank);
  header.append(title,link(chain,record.address,shortAddress(record.address)+" ↗"));
  card.append(header);
  const labels=record.summary;
  if(record.holder.share!==null&&!isCreator){
    card.append(el("p","tracker-share",ui("Reported supply share: ","표시된 공급량 점유율: ")+record.holder.share.toFixed(2)+"%"));
  }
  if(record.error){
    card.append(el("p","tracker-error",ui("Transfer history unavailable; not a zero-activity wallet.","토큰 이동 기록을 조회할 수 없습니다. 거래가 없다는 뜻이 아닙니다.")));
    return card;
  }
  const stats=el("div","tracker-flow-grid");
  for(const [count,amount,labelEn,labelKo] of [
    [labels.received,labels.inAmount,"Token inflows","토큰 유입"],
    [labels.sent,labels.outAmount,"Token outflows","토큰 유출"]
  ]){
    const b=el("div","");
    b.append(el("small","",ui(labelEn,labelKo)),el("strong","",String(count)+" "+ui("events","건")));
    b.append(el("span","",amount===null?ui("Amount unverified","수량 미확인"):compactToken(amount)+" "+ui("tokens (approx.)","토큰(근사)")));
    stats.append(b);
  }
  card.append(stats);
  const note=el("p","tracker-mini",
    ui("Latest "+labels.sampleEvents+" matching token transfer logs, first explorer page"+
      (labels.partial?" (MORE HISTORY NOT LOADED)":"")+
      ". Transfers are NOT proven trades.",
      "최근 조회한 토큰 이동 "+labels.sampleEvents+"건"+(labels.partial?" (이전 기록 미조회)":"")+". 실제 매수·매도 확정 자료는 아닙니다."));
  card.append(note);
  if(labels.recent.length){
    const d=el("details","tracker-recent");
    const summ=el("summary","",ui("Transaction evidence","트랜잭션 근거"));
    const ul=el("ul","");
    labels.recent.forEach(event=>{
      const li=el("li","");
      const direction=event.direction==="in"?ui("Received","유입"):ui("Sent","유출");
      const time=event.time?event.time.replace("T"," ").slice(0,16)+" UTC":"";
      li.append(el("span","",direction+" "+(event.amount===null?"—":compactToken(event.amount))+" "+time+" "));
      li.append(link(chain,event.hash,ui("View tx ↗","거래 확인 ↗"),true));ul.append(li);
    });
    d.append(summ,ul);card.append(d);
  }
  return card;
 }
 function render(){
  if(!last||!context)return;
  const {chain}=context;
  const {holderList,records,creatorRecord,links,creatorAddress}=last;
  scope.textContent=ui("Sample: first "+holderList.sourceCount+" ranked holder addresses; "+
   holderList.excludedCount+" labeled contracts/services/burn addresses skipped. Following "+records.length+
   " unlabeled non-contract top addresses. This is NOT a complete holder census.",
   "표본: 상위 홀더 "+holderList.sourceCount+"개 주소 중 계약·서비스·소각 주소로 분류된 "+
   holderList.excludedCount+"개를 제외하고, 남은 상위 비컨트랙트 주소 "+records.length+
   "개를 조회합니다. 전체 홀더 분석이 아닙니다.");
  creatorBlock.replaceChildren();
  if(creatorAddress&&creatorRecord){
    creatorBlock.append(link(chain,creatorAddress,shortAddress(creatorAddress)+" ↗"));
  }else{
    creatorBlock.append(el("span","",ui("Unavailable / unverified from GoPlus","GoPlus 생성자 정보 미확인")));
  }
  cards.replaceChildren();
  if(creatorRecord)cards.append(renderWalletActivity(creatorRecord,chain,0,true));
  records.forEach((r,i)=>cards.append(renderWalletActivity(r,chain,i,false)));
  connections.replaceChildren();
  if(links?.length){
    links.forEach(c=>{
      const line=el("div","tracker-connection");
      line.append(el("span","",shortAddress(c.from)+" → "+shortAddress(c.to)+" "));
      if(c.amount!==null)line.append(el("strong","",compactToken(c.amount)+" "));
      line.append(link(chain,c.hash,ui("Direct token transfer ↗","직접 토큰 이동 ↗"),true));
      connections.append(line);
    });
  }else{
    connections.append(el("p","tracker-mini",ui(
      "No direct creator-to-watched-holder token transfer was found in the fetched creator page, or the creator was not identified. This does NOT rule out earlier or indirect funding.",
      "확인한 생성자 지갑의 최근 기록에서 추적 홀더와 직접 토큰 이동이 발견되지 않았거나 생성자가 미확인입니다. 과거 이동·간접 자금 연결이 없다는 뜻은 아닙니다.")));
  }
  summary.hidden=false;
  message(ui("On-chain samples received. Open transaction links for evidence; inflows/outflows are not proven buys/sells.","온체인 표본 조회 완료. 증거 링크로 확인하세요. 유입·유출은 매수·매도 확정값이 아닙니다."),"ok");
 }
 async function run(){
  if(!context||busy)return;
  if(!(context.chain in TRACKER_HOSTS)){
   message(ui("Wallet transfer analysis is currently available for Ethereum and Base only. BNB Chain and Solana are not yet supported.","실제 지갑 이동 추적은 현재 Ethereum·Base만 지원합니다. BNB Chain·Solana는 아직 미지원입니다."),"unsupported");
   return;
  }
  busy=true;btn.disabled=true;
  const job=++version,{chain,address}=context;
  message(ui("Retrieving current top holders and sampled token transfer logs…","상위 홀더와 토큰 이동 기록 표본을 조회 중입니다…"),"loading");
  try{
    const [token,holders]=await Promise.all([
      getJson(apiUrl(chain,"token",address)),getJson(apiUrl(chain,"holders",address))
    ]);
    if(job!==version)return;
    if(!Array.isArray(holders?.items)||!token?.address_hash)
     throw Error("INCOMPLETE_DATA");
    if(toKey(token.address_hash)!==toKey(address))throw Error("WRONG_TOKEN");
    const holderList=sampleWallets(holders,token,3);
    const creatorAddress=hexAddress.test(creator)?creator:null;
    const queries=holderList.selected.map(h=>({address:h.address,holder:h}));
    if(creatorAddress&&!queries.some(h=>toKey(h.address)===toKey(creatorAddress))){
      queries.unshift({address:creatorAddress,holder:{rank:0,share:null},creator:true});
    }
    // Bounded to three top wallets and one creator; each only the latest 50 transfers.
    const transfers=await Promise.all(queries.map(async q=>{
      try{
        const result=await getJson(apiUrl(chain,"transfers",q.address,address));
        if(!Array.isArray(result?.items))throw Error("BAD_TRANSFER_DATA");
        return {...q,summary:transferSummary(result,q.address,address),raw:result.items,error:false};
      }catch(_){return {...q,summary:null,raw:null,error:true};}
    }));
    if(job!==version)return;
    const creatorRecord=transfers.find(r=>toKey(r.address)===toKey(creatorAddress));
    const records=transfers.filter(r=>!r.creator&&toKey(r.address)!==toKey(creatorAddress));
    const linked=creatorRecord?.raw?directTokenLinks(creatorRecord.raw,creatorAddress,holderList.selected,address,chain):[];
    last={holderList,creatorRecord,records,links:linked,creatorAddress};
    render();
    // Inform the optional evidence review only after the user explicitly ran Wallet Radar.
    const candidates=[...records,creatorRecord].filter(Boolean);
    const sources=[];
    // Round-robin sampling: one recent event per wallet first, before filling extras.
    // Prevent a very active wallet from monopolizing the 6 evidence slots.
    for(let turn=0;turn<2;turn++){
      for(const rec of candidates){
        if(rec.error||!rec.summary)continue;
        const eligible=rec.summary.recent.filter(ev=>ev.amount!==null&&ev.amount>0);
        const ev=eligible[turn];
        if(ev)sources.push({wallet:rec.address,hash:ev.hash});
      }
    }
    window.dispatchEvent(new CustomEvent("yorbi:walletsample",{detail:{
       chain,token:address,creator:creatorAddress,
       holders:holderList.selected.map(w=>w.address),tokenLinks:linked,samples:sources.slice(0,8)
    }}));
  }catch(err){
    if(job!==version)return;
    const msg=err?.message==="RATE_LIMIT"?ui("Explorer rate limit reached; retry later.","탐색기 요청 제한입니다. 잠시 뒤 재시도하세요."):
     ui("On-chain data unavailable (network, CORS, timeout or provider error). No wallet activity can be concluded.","온체인 자료 조회 실패(네트워크·CORS·시간 초과·제공사 오류). 지갑 활동을 판단할 수 없습니다.");
    message(msg,"error");
  }finally{if(job===version){busy=false;btn.disabled=false;}}
 }
 btn.addEventListener("click",run);
 window.addEventListener("yorbi:scanstart",clear);
 window.addEventListener("yorbi:scanresult",e=>{
  const {chain,address}=e.detail||{};
  if(!chain||!address)return;
  clear();context={chain,address};panel.hidden=false;
  if(!(chain in TRACKER_HOSTS)){btn.disabled=true;message(ui(
   "Ethereum and Base only for now. BNB Chain and Solana holder transfer history is not supported.",
   "현재 실제 지갑 이동 기록은 Ethereum·Base만 지원합니다. BNB Chain·Solana는 지원하지 않습니다."),"unsupported");}
  else message(ui("Ready. Click to load a limited on-chain wallet sample (no background requests).",
   "준비됐습니다. 버튼을 누르면 최근 온체인 표본을 조회합니다(자동 조회 없음)."));
 });
 window.addEventListener("yorbi:securityresult",e=>{
   if(context&&toKey(e.detail?.address)===toKey(context.address)&&e.detail?.chain===context.chain){
     creator=hexAddress.test(e.detail.creator)?e.detail.creator:null;
   }
 });
 window.addEventListener("yorbi:languagechange",()=>{if(last)render();else if(context)message(
  context.chain in TRACKER_HOSTS?ui("Ready to check recent on-chain records.","최근 온체인 기록 조회 준비 완료."):
   ui("Ethereum and Base wallet tracking only.","Ethereum·Base 지갑 추적만 지원합니다."),"info");});
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initTracker,{once:true});
 else initTracker();
}
