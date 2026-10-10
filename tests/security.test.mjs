import test from "node:test";
import assert from "node:assert/strict";
import {booleanSignal,taxRate,providerEndpoint,extractToken,topHolderConcentration,evaluateSecurity,compactAddress,explorerAddressUrl,coverageDescription} from "../assets/security.mjs";
const PEPE="0x6982508145454ce325ddbe47a25d4ec3d2311933";
test("tri-state security flags: explicit zero is not unknown",()=>{
 assert.equal(booleanSignal("1"),true);
 assert.equal(booleanSignal("0"),false);
 assert.equal(booleanSignal(undefined),null);
 assert.equal(booleanSignal(null),null);
 assert.equal(booleanSignal(""),null);
 assert.equal(booleanSignal({status:"1"}),true);
 assert.equal(booleanSignal({status:"0"}),false);
});
test("tax rate uses fractional units; missing means unknown",()=>{
 assert.equal(taxRate("0.1"),10);
 assert.equal(taxRate("1"),100);
 assert.equal(taxRate("0"),0);
 assert.equal(taxRate(""),null);
 assert.equal(taxRate(null),null);
 assert.equal(taxRate("invalid"),null);
 assert.equal(taxRate("200"),null);
});
test("correct chain-aware read-only provider URLs",()=>{
 assert.equal(providerEndpoint("ethereum",PEPE),"https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses="+PEPE);
 assert.equal(providerEndpoint("bsc",PEPE),"https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses="+PEPE);
 assert.equal(providerEndpoint("base",PEPE),"https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses="+PEPE);
 assert.match(providerEndpoint("solana","So11111111111111111111111111111111111111112"),/solana\/token_security/);
 assert.equal(providerEndpoint("unlisted",PEPE),null);
});
test("provider response must match the exact contract and successful status",()=>{
 const sample={code:1,result:{[PEPE]:{is_honeypot:"0"}}};
 assert.equal(extractToken(sample,"ethereum",PEPE.toUpperCase()).is_honeypot,"0");
 assert.equal(extractToken(sample,"ethereum","0x1111111111111111111111111111111111111111"),null);
 assert.equal(extractToken({...sample,code:0},"ethereum",PEPE),null);
 assert.equal(extractToken({code:1,result:{}},"ethereum",PEPE),null);
});
test("honeypot positive, negative and unknown never collapse",()=>{
 for(const [value,state] of [["1","risk"],["0","checked"],[undefined,"unknown"]]){
   const report=evaluateSecurity({is_honeypot:value},"ethereum");
   assert.equal(report.checks.find(x=>x.key==="is_honeypot").state,state);
 }
});
test("unverified contract does not make absent checks pass",()=>{
 const result=evaluateSecurity({is_open_source:"0"},"ethereum");
 assert.equal(result.checks.find(x=>x.key==="is_open_source").state,"risk");
 assert.equal(result.checks.find(x=>x.key==="is_mintable").state,"unknown");
});
test("high sell tax, hidden owner and balances are explicit warnings",()=>{
 const result=evaluateSecurity({sell_tax:"0.22",hidden_owner:"1",owner_change_balance:"1"},"ethereum");
 assert.equal(result.checks.find(x=>x.key==="sell_tax").state,"risk");
 assert.equal(result.checks.find(x=>x.key==="hidden_owner").state,"risk");
 assert.equal(result.checks.find(x=>x.key==="owner_change_balance").state,"risk");
 assert.equal(result.risk,3);
});
test("LP/contract addresses in top holders are never labeled developer wallets",()=>{
 const result=evaluateSecurity({holders:[
  {address:"0xpool",percent:"0.21",is_contract:1},
  {address:"0xowner",percent:"0.17"}
 ]},"ethereum");
 assert.equal(result.holder.pct,38);
 assert.equal(result.holder.count,2);
 assert.equal(result.lpLock,"unknown");
});
test("holder records must have meaningful ratios",()=>{
 assert.equal(topHolderConcentration({holders:[{percent:"bad"}]}).pct,null);
 assert.equal(topHolderConcentration({holders:[]}).count,0);
 assert.equal(evaluateSecurity({holder_count:"0",holders:[{percent:"0.01"}]},"ethereum").holderCount,null);
});
test("Solana capability status is read as authority signal, not EVM contract flags",()=>{
 const report=evaluateSecurity({mintable:{status:"1"},freezable:{status:"0"},closable:{status:"0"},non_transferable:"0",transfer_hook:[]}, "solana");
 assert.equal(report.checks.find(x=>x.key==="mintable").state,"risk");
 assert.equal(report.checks.find(x=>x.key==="freezable").state,"checked");
 assert.equal(report.checks.find(x=>x.key==="is_honeypot"),undefined);
});
test("no provider fields yields unknown, never SAFE",()=>{
 const report=evaluateSecurity({},"ethereum");
 assert.equal(report.risk,0);
 assert.equal(report.checked,0);
 assert.ok(report.unknown>=10);
});


test("wallet display shortens but never overwrites the on-chain address",()=>{
 const raw="0x1234567890123456789012345678901234567890";
 assert.equal(compactAddress(raw),"0x123456…567890");
 assert.equal(compactAddress(""),"—");
 assert.equal(compactAddress("<script>alert(1)</script>"),"—");
});
test("only validated explorer hosts and chain/address matches generate links",()=>{
 const raw="0x1234567890123456789012345678901234567890";
 assert.equal(explorerAddressUrl("ethereum",raw),"https://etherscan.io/address/"+raw);
 assert.equal(explorerAddressUrl("bsc",raw),"https://bscscan.com/address/"+raw);
 assert.equal(explorerAddressUrl("base",raw),"https://basescan.org/address/"+raw);
 assert.equal(explorerAddressUrl("solana",raw),null);
 assert.equal(explorerAddressUrl("ethereum","So11111111111111111111111111111111111111112"),null);
 assert.equal(explorerAddressUrl("evil",raw),null);
 assert.equal(explorerAddressUrl("ethereum","0x<script>"),null);
});
test("Solana wallet links remain on Solscan and do not use EVM explorers",()=>{
 const raw="So11111111111111111111111111111111111111112";
 assert.equal(explorerAddressUrl("solana",raw),"https://solscan.io/account/"+raw);
 assert.match(compactAddress(raw),/^So1111…111112$/);
});
test("zero unknown means zero unknown provider fields, not verified token safety",()=>{
 const report=evaluateSecurity({is_honeypot:"0",is_mintable:"0"},"ethereum");
 const ko=coverageDescription(report,"ko");
 assert.match(ko,/GoPlus 제공 검사/);
 assert.match(ko,/LP 잠금/);
 assert.match(coverageDescription(report,"en"),/outside this count/);
 assert.equal(report.lpLock,"unknown");
});
test("provider alerts are prioritized without incorrectly asserting current authority",()=>{
 const report=evaluateSecurity({
   is_honeypot:"0",transfer_pausable:"1",is_blacklisted:"1",
   owner_address:"0x0000000000000000000000000000000000000000"
 },"ethereum");
 assert.equal(report.risk,2);
 assert.equal(report.checks.filter(c=>c.state==="risk").length,2);
 assert.equal(report.owner,"0x0000000000000000000000000000000000000000");
 assert.equal(report.lpLock,"unknown");
});
