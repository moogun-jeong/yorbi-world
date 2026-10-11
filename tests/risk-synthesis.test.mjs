import test from "node:test";
import assert from "node:assert/strict";
import {matches,integratedEvidence} from "../assets/risk-synthesis.mjs";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const other="0x"+"1".repeat(40),creator="0x"+"2".repeat(40),hash="0x"+"a".repeat(64);
const base=(liquidity=8000)=>({chain:"ethereum",address:token,pair:{
 liquidity:liquidity===null?undefined:{usd:liquidity},
 url:"https://dexscreener.com/ethereum/0x"+"f".repeat(40)},date:1000});
const safety=(flags=[])=>({chain:"ethereum",address:token,report:{
 checks:[{key:"is_honeypot",state:flags.includes("honeypot")?"risk":"checked",en:"Honeypot",ko:"허니팟"},
  {key:"is_mintable",state:"unknown",en:"Mint",ko:"Mint"}],
 holder:{pct:37.3,count:10},creator,lpLock:"unknown"}});
const radar=(sent=3)=>({context:{chain:"ethereum",address:token},last:{
 creatorRecord:{error:false,summary:{sent,received:1,partial:true}}}});
const deep=(kind="swap_sell_evidence",wallet=creator)=>({context:{chain:"ethereum",token},output:{events:[
 {wallet,hash,verdict:{kind,reason:"swap_method_and_opposing_erc20_flows",direction:"send"}}
]}});
const item=(out,id)=>out.items.find(x=>x.id===id);
test("unknown sources are explicit, not assumed safe",()=>{
 const result=integratedEvidence({explorer:base()});
 assert.equal(result.ready,true);
 assert.equal(item(result,"contract").status,"unknown");
 assert.equal(item(result,"holders").status,"unknown");
 assert.equal(item(result,"lp-lock").status,"unknown");
 assert.equal(item(result,"creator").status,"unknown");
 assert.equal(item(result,"creator-swap").status,"unknown");
});
test("thin pair is attention, provider observation not an exit guarantee",()=>{
 const result=integratedEvidence({explorer:base(9000)});
 assert.equal(item(result,"liquidity").status,"attention");
 assert.equal(item(result,"liquidity").grade,"provider");
 assert.match(item(result,"liquidity").ko,/유동성/);
});
test("zero and missing liquidity are separate; no bogus safe claims",()=>{
 assert.equal(item(integratedEvidence({explorer:base(0)}),"liquidity").status,"attention");
 assert.equal(item(integratedEvidence({explorer:base(null)}),"liquidity").status,"unknown");
});
test("provider flags remain potential risk, not a verified exploitable admin right",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(["honeypot"])});
 assert.equal(item(result,"contract").status,"attention");
 assert.match(item(result,"contract").ko,/권한/);
});
test("no provider risk flags are NOT a SAFE verdict",()=>{
 const result=integratedEvidence({explorer:base(150000),security:safety()});
 assert.equal(item(result,"contract").status,"watch");
 assert.match(item(result,"contract").ko,/안전 인증/);
});
test("top-holder 37.3% is not developer allocation or owner confirmation",()=>{
 const result=integratedEvidence({explorer:base(),security:safety()});
 assert.equal(item(result,"holders").status,"watch");
 assert.match(item(result,"holders").ko,/개발팀 지분이 아닙니다/);
});
test("creator outward ERC20 sample is explicitly not a sale",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(5)});
 assert.equal(item(result,"creator").status,"watch");
 assert.match(item(result,"creator").ko,/DEX 매도 확정은 아닙니다/);
 assert.equal(item(result,"creator-swap").status,"unknown");
});
test("zero outgoing in 50-record window does not prove no older sells",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(0)});
 assert.equal(item(result,"creator").status,"reported");
 assert.match(item(result,"creator").ko,/이전 거래/);
});
test("deep creator token spent with explicit swap evidence stays bounded",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(),deep:deep()});
 assert.equal(item(result,"creator-swap").status,"attention");
 assert.equal(item(result,"creator-swap").grade,"onchain");
 assert.equal(item(result,"creator-swap").link,"https://eth.blockscout.com/tx/"+hash);
 assert.match(item(result,"creator-swap").ko,/전체 매도/);
});
test("router or smart-account swap contexts remain context only",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(),
 deep:deep("swap_context_evidence")});
 assert.equal(item(result,"creator-swap").status,"watch");
 assert.equal(item(result,"creator-swap").grade,"context");
 assert.match(item(result,"creator-swap").ko,/인과관계 미확인/);
});
test("deep scan other wallet does not allege creator selling",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(),
 deep:deep("swap_sell_evidence",other)});
 assert.equal(item(result,"creator-swap").status,"unknown");
});
test("mismatched security, wallet and deep token never bleed into another token",()=>{
 const mismatched=safety(["honeypot"]);mismatched.address=other;
 const r=radar(100);r.context.address=other;
 const d=deep();d.context.token=other;
 const res=integratedEvidence({explorer:base(200000),security:mismatched,radar:r,deep:d});
 assert.equal(item(res,"contract").status,"unknown");
 assert.equal(item(res,"creator").status,"unknown");
 assert.equal(item(res,"creator-swap").status,"unknown");
});
test("mismatched chain prevents bleed even if contract string matches",()=>{
 const sec=safety();sec.chain="base";
 assert.equal(item(integratedEvidence({explorer:base(),security:sec}),"contract").status,"unknown");
 assert.equal(matches({chain:"base",address:token},"ethereum",token),false);
});
test("invalid/missing explorer cannot expose misleading evidence dashboard",()=>{
 const result=integratedEvidence({explorer:{pair:{}}});
 assert.equal(result.ready,false);assert.deepEqual(result.items,[]);
});
test("fraud scoring and buy recommendation are intentionally absent",()=>{
 const result=integratedEvidence({explorer:base(),security:safety(),radar:radar(),deep:deep()});
 assert.equal(result.score,undefined);
 assert.equal(result.buyRecommendation,undefined);
 assert.match(result.summary,/사기 확정 판정이 아닙니다/);
});
test("LP lock is unverified regardless of liquidity and holder concentration",()=>{
 const result=integratedEvidence({explorer:base(10000000),security:safety()});
 assert.equal(item(result,"lp-lock").status,"unknown");
 assert.equal(result.coverage.lpVerified,false);
});
test("source URL allowlist rejects unsafe DEX pair links",()=>{
 const rec=base();rec.pair.url="https://dexscreener.com.evil.test/fake";
 const result=integratedEvidence({explorer:rec});
 assert.equal(item(result,"liquidity").link,null);
});
