import test from "node:test";
import assert from "node:assert/strict";
import {evidenceUrl,nativeUrl,txExplorer,dedupeEvidenceSources,classifySwapEvidence,directNativeFunding,SWAP_TOPICS,swapEventEvidence,explainEvidenceReason,nextEvidencePageUrl}
 from "../assets/wallet-evidence.mjs";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const quote="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const trader="0x1234567890123456789012345678901234567890";
const router="0x5555555555555555555555555555555555555555";
const creator="0x4444444444444444444444444444444444444444";
const hash="0x"+"a".repeat(64);
const receipt=(method="swapExactTokensForTokens",result="success")=>({hash,result,method});
const move=(asset,from,to,value,decimals="18",symbol="TEST")=>({
 from:{hash:from},to:{hash:to},
 token:{address_hash:asset,symbol,decimals},total:{decimals,value}
});
const qty=(amount,decimals=18)=>String(BigInt(amount)*10n**BigInt(decimals));
test("read-only evidence URLs reject unsupported chains and malicious hashes",()=>{
 assert.equal(evidenceUrl("ethereum",hash),"https://eth.blockscout.com/api/v2/transactions/"+hash);
 assert.equal(evidenceUrl("base",hash,"/token-transfers"),"https://base.blockscout.com/api/v2/transactions/"+hash+"/token-transfers");
 assert.equal(evidenceUrl("bsc",hash),null);
 assert.equal(evidenceUrl("ethereum","javascript:evil"),null);
 assert.equal(evidenceUrl("ethereum",hash,"/admin"),null);
 assert.equal(nativeUrl("ethereum",creator),"https://eth.blockscout.com/api/v2/addresses/"+creator+"/transactions");
 assert.equal(txExplorer("ethereum",hash),"https://eth.blockscout.com/tx/"+hash);
});
test("explicit swap and opposing quote token flows support DEX token-received evidence",()=>{
 const tx=receipt();
 const transfers=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const result=classifySwapEvidence(tx,transfers,trader,token);
 assert.equal(result.kind,"swap_buy_evidence");
 assert.equal(result.quoteToken,"USDC");
 assert.equal(result.quoteAmount,100);
});
test("explicit swap and opposing quote receipt support DEX token-spent evidence",()=>{
 const transfers=[move(token,trader,router,qty(200)),move(quote,router,trader,qty(100,6),"6","USDC")];
 const result=classifySwapEvidence(receipt("exactInput"),transfers,trader,token);
 assert.equal(result.kind,"swap_sell_evidence");
 assert.equal(result.quoteAmount,100);
});
test("token transfer() receipt with an unrelated payment is NOT classified as a swap",()=>{
 const transfers=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const result=classifySwapEvidence(receipt("transfer"),transfers,trader,token);
 assert.equal(result.kind,"transfer");
 assert.equal(result.reason,"no_explicit_swap_method");
});
test("swap method with only token transfer is NOT enough to classify buying or selling",()=>{
 const result=classifySwapEvidence(receipt(),[move(token,router,trader,qty(200))],trader,token);
 assert.equal(result.kind,"unverified");assert.equal(result.reason,"no_opposing_payment");
});
test("opposite asset must actually move through the watched wallet",()=>{
 const flows=[move(token,router,trader,qty(200)),move(quote,creator,router,qty(100,6),"6","USDC")];
 assert.equal(classifySwapEvidence(receipt(),flows,trader,token).kind,"unverified");
});
test("transaction failure, incomplete logs and invalid raw amounts always mean unknown",()=>{
 const flows=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 assert.equal(classifySwapEvidence(receipt("swap","error"),flows,trader,token).kind,"unverified");
 assert.equal(classifySwapEvidence(receipt(),flows,trader,token,{complete:false}).reason,"incomplete_logs");
 assert.equal(classifySwapEvidence(receipt(),[move(token,router,trader,"invalid")],trader,token).kind,"unverified");
});
test("explicit swap receipt with only native ETH payment stays unclassified",()=>{
 const r=classifySwapEvidence({...receipt(),value:qty(2)},[move(token,router,trader,qty(200))],trader,token);
 assert.equal(r.kind,"unverified");
});
test("multi-target address samples deduplicate and cap API work",()=>{
 const rows=[{wallet:trader,hash},{wallet:trader,hash},
  {wallet:creator,hash},{wallet:"bad",hash},{wallet:trader,hash:"bad"}];
 const out=dedupeEvidenceSources(rows,2);
 assert.equal(out.length,2);
 assert.equal(out[0].wallet,trader);
 assert.equal(out[1].wallet,creator);
});
test("direct ETH envelope funding is evidence of transfer, not of same-owner wallets",()=>{
 const payload={items:[
  {hash,from:{hash:creator},to:{hash:trader},value:qty(2),result:"success",timestamp:"2026-10-01T01:00:00Z"},
  {hash:"0x"+"b".repeat(64),from:{hash:creator},to:{hash:router},value:qty(3),result:"success"},
  {hash:"0x"+"c".repeat(64),from:{hash:creator},to:{hash:trader},value:"0",result:"success"},
  {hash:"0x"+"d".repeat(64),from:{hash:trader},to:{hash:creator},value:qty(7),result:"success"}
 ],next_page_params:{block_number:1}};
 const report=directNativeFunding(payload,creator,[trader],"ethereum");
 assert.equal(report.items.length,1);
 assert.equal(report.items[0].amount,2);
 assert.equal(report.sampled,4);
 assert.equal(report.more,true);
 assert.equal(report.items[0].url,"https://eth.blockscout.com/tx/"+hash);
});
test("failed native-coin sends and malformed creator never become funding facts",()=>{
 const tx={hash,from:{hash:creator},to:{hash:trader},value:qty(2),result:"error"};
 assert.equal(directNativeFunding({items:[tx]},creator,[trader],"ethereum").items.length,0);
 assert.equal(directNativeFunding({items:[{...tx,result:"success"}]},"bad",[trader],"ethereum").items.length,0);
 assert.equal(directNativeFunding({items:[]},creator,[trader],"ethereum").items.length,0);
});
test("real PEPE sample: ordinary ERC-20 transfer does not count as a buy",()=>{
 const actual={hash:"0x8c11c01bc68870d9a811f4e503afbb799c6bf7600d76754fa17baacc5998dd5a",result:"success",method:"transfer"};
 const who="0x1d48963DD8FAdA6aB5C2C7b92Eba81ECC5030270";
 const moves=[move(token,"0x841ed663F2636863D40be4EE76243377dff13a34",who,"500000000000000000000000000000")];
 const evaluation=classifySwapEvidence(actual,moves,who,token);
 assert.equal(evaluation.kind,"transfer");
});


test("official V2/V3 swap event topic signatures recognized as contextual evidence",()=>{
 const pool="0x1111111111111111111111111111111111111111";
 const ev=[{address:{hash:pool},topics:[SWAP_TOPICS.v2]},{address:{hash:pool},topics:[SWAP_TOPICS.v3]}];
 const signal=swapEventEvidence(ev);
 assert.equal(signal.present,true);
 assert.equal(signal.pools.length,1);
 assert.equal(SWAP_TOPICS.v2,"0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822");
 assert.equal(SWAP_TOPICS.v3,"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67");
});
test("V2/V3 event and opposing ERC-20 flows provide context, never confirmed wallet trade",()=>{
 const pool="0x1111111111111111111111111111111111111111";
 const signal=swapEventEvidence([{topics:[SWAP_TOPICS.v3],address:{hash:pool}}]);
 const tx=receipt("execute");
 const flows=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const verdict=classifySwapEvidence(tx,flows,trader,token,{swapEvent:signal});
 assert.equal(verdict.kind,"swap_context_evidence");
 assert.equal(verdict.direction,"receive");
 assert.equal(verdict.reason,"swap_event_and_opposing_erc20_flows");
 assert.deepEqual(verdict.pools,[pool]);
});
test("swap event without counterflow or complete event pagination is not evidence of wallet market trade",()=>{
 const pool="0x1111111111111111111111111111111111111111";
 const ev={topics:[SWAP_TOPICS.v2],address:{hash:pool}};
 const signal=swapEventEvidence([ev]);
 const incomplete=swapEventEvidence([ev],{complete:false});
 assert.equal(incomplete.present,false);
 const noPay=classifySwapEvidence(receipt("execute"),[move(token,router,trader,qty(200))],trader,token,{swapEvent:signal});
 assert.equal(noPay.kind,"unverified");
 const pay=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 assert.equal(classifySwapEvidence(receipt("transfer"),pay,trader,token,{swapEvent:incomplete}).kind,"transfer");
});
test("unknown event topics and unverified pool addresses never fabricate DEX context",()=>{
 const fake=[{topics:["0x"+"a".repeat(64)],address:{hash:router}},
 {topics:[SWAP_TOPICS.v2],address:{hash:"malformed"}}];
 const signal=swapEventEvidence(fake);
 assert.equal(signal.present,false);
});
test("explicit swap method still requires opposite payment and retains higher certainty",()=>{
 const flow=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const verdict=classifySwapEvidence(receipt("swapExactTokensForTokens"),flow,trader,token);
 assert.equal(verdict.kind,"swap_buy_evidence");
 assert.equal(verdict.reason,"swap_method_and_opposing_erc20_flows");
});
test("classification reasons are explained in Korean without raw code names",()=>{
 assert.match(explainEvidenceReason("no_explicit_swap_method","ko"),/스왑/);
 assert.match(explainEvidenceReason("incomplete_logs","ko"),/로그/);
 assert.match(explainEvidenceReason("swap_event_and_opposing_erc20_flows","ko"),/미확정/);
 assert.equal(explainEvidenceReason("invalid-data","ko"),"기타 판정 불가 사유");
});
test("next-page URL preserves allowlisted Blockscout origin and restricts query keys",()=>{
 const original=evidenceUrl("base",hash,"/token-transfers");
 const url=nextEvidencePageUrl(original,{block_number:123,index:19});
 assert.match(url,/base\.blockscout\.com\/api\/v2\/transactions/);
 assert.match(url,/block_number=123/);
 assert.equal(nextEvidencePageUrl("https://evil.example/api",{page:1}),null);
 assert.equal(nextEvidencePageUrl(original,{"redirect?":"http://evil"}),null);
 assert.equal(nextEvidencePageUrl(original,{block_number:"a".repeat(200)}),null);
});
test("incomplete transfer list remains unknown even if method claims swap",()=>{
 const flow=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const result=classifySwapEvidence(receipt("swapExactTokensForTokens"),flow,trader,token,{complete:false,swapEvent:swapEventEvidence([{topics:[SWAP_TOPICS.v3],address:{hash:router}}])});
 assert.equal(result.kind,"unverified");
 assert.equal(result.reason,"incomplete_logs");
});
