/* YORBI recent-scan restoration v1.
 * Public read-only token/wallet data is cached locally for 12 hours.
 * Never stores wallet keys, authentication, permissions, or sends data anywhere.
 * Restores rendered evidence WITHOUT repeating public API requests.
 */
export const SCAN_KEY="yorbi:recent-scan:v1";
export const SCAN_TTL=12*60*60*1000;
export const SCAN_MAX=650000;
export const SCAN_PARTS=Object.freeze(["explorer","security","radar","deep","period"]);
export function validSnapshot(snapshot,now=Date.now()){
 if(!snapshot||snapshot.version!==1||typeof snapshot.savedAt!=="number"||
    now<snapshot.savedAt||now-snapshot.savedAt>SCAN_TTL||!snapshot.parts||
    typeof snapshot.parts!=="object"||Array.isArray(snapshot.parts))return false;
 return Boolean(snapshot.parts.explorer?.chain&&snapshot.parts.explorer?.address);
}
export function applyPart(snapshot,section,data,now=Date.now()){
 if(!SCAN_PARTS.includes(section))return null;
 const old=snapshot&&snapshot.version===1&&snapshot.parts?{...snapshot.parts}:{};
 old[section]=data;
 const base={version:1,savedAt:now,scrollY:Math.max(0,Math.floor(snapshot?.scrollY||0)),parts:old};
 try{
  if(JSON.stringify(base).length>SCAN_MAX){
   // Never persist half of a wallet/deep result. Retain latest basic token lookup if possible.
   const compact={version:1,savedAt:now,scrollY:base.scrollY,
      parts:{explorer:old.explorer,security:old.security,period:old.period}};
   return JSON.stringify(compact).length<=SCAN_MAX?compact:null;
  }
  return base;
 }catch(_){return null;}
}
export function sameToken(record,chain,address){
 return Boolean(record?.chain===chain&&typeof record?.address==="string"&&
  typeof address==="string"&&record.address.toLowerCase()===address.toLowerCase());
}
function getStorage(){
 try{return window.localStorage;}catch(_){return null;}
}
function read(storage){
 try{
  const source=storage?.getItem(SCAN_KEY);
  if(!source||source.length>SCAN_MAX)return null;
  const stored=JSON.parse(source);
  if(!validSnapshot(stored)){storage?.removeItem(SCAN_KEY);return null;}
  return stored;
 }catch(_){return null;}
}
function init(){
 const storage=getStorage(),banner=document.getElementById("scan-restored");
 const clearButton=document.getElementById("scan-clear");
 let stored=read(storage),restoring=false,scrollTimer=0;
 const show=()=>{if(clearButton)clearButton.hidden=!stored?.parts?.explorer;};
 const write=(value)=>{
  stored=value;
  if(storage){
   try{
    if(value)storage.setItem(SCAN_KEY,JSON.stringify(value));
    else storage.removeItem(SCAN_KEY);
   }catch(_){/* Storage can be disabled/full; the page must still work. */}
  }
  show();
 };
 const clear=()=>{
  write(null);
  if(banner)banner.hidden=true;
 };
 window.addEventListener("yorbi:scanstart",clear);
 window.addEventListener("yorbi:forget",()=>{
  clear();
  window.location.reload();
 });
 window.addEventListener("yorbi:cachechange",event=>{
  if(restoring)return;
  const {section,value}=event.detail||{};
  if(!SCAN_PARTS.includes(section))return;
  if(section!=="explorer"&&!stored?.parts?.explorer)return;
  const current=applyPart(stored,section,value);
  if(current)write(current);
 });
 const storeScroll=()=>{
  if(!stored)return;
  const current=Math.max(0,Math.floor(window.scrollY||0));
  // Remember which disclosures were open so a returned page feels unchanged.
  const expanded=[...document.querySelectorAll("#explorer details")].map((n,i)=>n.open?i:null).filter(x=>x!==null);
  stored.ui={expanded};
  stored.scrollY=current;
  write(stored);
 };
 window.addEventListener("pagehide",storeScroll);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")storeScroll();});
 window.addEventListener("scroll",()=>{
  if(scrollTimer)clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{scrollTimer=0;storeScroll();},600);
 },{passive:true});
 if(clearButton)clearButton.addEventListener("click",()=>window.dispatchEvent(new Event("yorbi:forget")));
 if(!stored){show();return;}
 restoring=true;
 try{
  // The order is essential: the wallet sample creates dependent graph/report contexts.
  for(const part of SCAN_PARTS){
   if(stored.parts[part]===undefined)continue;
   window.dispatchEvent(new CustomEvent("yorbi:restore-"+part,{detail:stored.parts[part]}));
  }
  if(banner)banner.hidden=false;
  show();
  const allDetails=[...document.querySelectorAll("#explorer details")];
  const opened=new Set(Array.isArray(stored.ui?.expanded)?stored.ui.expanded:[]);
  allDetails.forEach((n,i)=>{n.open=opened.has(i);});
  const savedScroll=stored.scrollY;
  if(savedScroll>0){
   setTimeout(()=>{if(stored&&Math.abs(window.scrollY-savedScroll)>120)window.scrollTo(0,savedScroll);},100);
  }
 }finally{restoring=false;}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
