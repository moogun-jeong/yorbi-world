import test from "node:test";
import assert from "node:assert/strict";
import {evidenceUrl,nativeUrl,txExplorer,dedupeEvidenceSources,classifySwapEvidence,directNativeFunding,SWAP_TOPICS,swapEventEvidence,explainEvidenceReason,nextEvidencePageUrl,innerTraceUrl,inspectNativeSettlement,creatorInitiatedNativeTraces,loadTraceSample}
 from "../assets/wallet-evidence.mjs";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const quote="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const trader="0x1234567890123456789012345678901234567890";
const router="0x5555555555555555555555555555555555555555";
const creator="0x4444444444444444444444444444444444444444";
const hash="0x"+"a".repeat(64);
const receipt=(method="swapExactTokensForTokens",result="success")=>({hash,result,method,from:{hash:trader}});
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


test("ETH execution URL is chain restricted and transaction scoped",()=>{
 assert.equal(innerTraceUrl("ethereum",hash),"https://eth.blockscout.com/api/v2/transactions/"+hash+"/internal-transactions");
 assert.equal(innerTraceUrl("base",hash),"https://base.blockscout.com/api/v2/transactions/"+hash+"/internal-transactions");
 assert.equal(innerTraceUrl("bsc",hash),null);
 assert.equal(innerTraceUrl("ethereum","javascript:"),null);
});
test("native ETH value with token receipt is contextual, never proven swap",()=>{
 const tx={...receipt("execute"),from:{hash:trader},to:{hash:router,is_contract:true},value:qty(2)};
 const erc=[move(token,router,trader,qty(400))];
 const assessment=inspectNativeSettlement(tx,erc,[],trader,token,{complete:true});
 assert.equal(assessment.kind,"native_payment_context");
 assert.equal(assessment.direction,"receive");
 assert.equal(assessment.events[0].amount,2);
 assert.equal(assessment.events[0].source,"outer_tx_value");
 assert.equal(assessment.contractTarget,true);
});
test("internal ETH returned to wallet is contextual for token spend, not proven sell",()=>{
 const tx={...receipt("execute"),from:{hash:trader},to:{hash:router,is_contract:true},value:"0"};
 const transfers=[move(token,trader,router,qty(300))];
 const traces=[{transaction_hash:hash,from:{hash:router},to:{hash:trader},value:qty(1),success:true,type:"call"}];
 tx.hash=hash;
 const result=inspectNativeSettlement(tx,transfers,traces,trader,token);
 assert.equal(result.kind,"native_payment_context");
 assert.equal(result.direction,"send");
 assert.equal(result.events[0].amount,1);
});
test("zero ETH, reverted internal calls and other wallet traces never create false settlement",()=>{
 const tx={...receipt("execute"),from:{hash:trader},to:{hash:router,is_contract:true},value:"0"};
 const erc=[move(token,router,trader,qty(100))];
 const traces=[
 {transaction_hash:hash,from:{hash:trader},to:{hash:router},value:qty(1),success:false},
 {transaction_hash:"0x"+"b".repeat(64),from:{hash:trader},to:{hash:router},value:qty(1),success:true},
 {transaction_hash:hash,from:{hash:creator},to:{hash:router},value:qty(1),success:true}
 ];
 assert.equal(inspectNativeSettlement(tx,erc,traces,trader,token).kind,"no_native_counterflow");
 assert.equal(inspectNativeSettlement(tx,erc,traces,trader,token,{complete:false}).reason,"partial_internal_traces");
});
test("bad token amount, missing token logs, failed transaction retain uncertainty",()=>{
 const tx={...receipt("execute"),from:{hash:trader},to:{hash:router},value:qty(2)};
 assert.equal(inspectNativeSettlement(tx,null,[],trader,token).kind,"unverified");
 assert.equal(inspectNativeSettlement({...tx,result:"error"},[move(token,router,trader,qty(100))],[],trader,token).kind,"unverified");
 assert.equal(inspectNativeSettlement(tx,[move(token,router,trader,"foo")],[],trader,token).reason,"invalid_amount");
});
test("creator-initiated contract-funded wallet ETH is attributed to initiator, not ownership",()=>{
 const tx={hash,from:{hash:creator},to:{hash:router,is_contract:true},result:"success"};
 const calls=[{transaction_hash:hash,index:3,from:{hash:router},to:{hash:trader},value:qty(3),success:true,type:"call"}];
 const report=creatorInitiatedNativeTraces(tx,{items:calls,next_page_params:null},creator,[trader],"ethereum");
 assert.equal(report.hits.length,1);
 assert.equal(report.hits[0].kind,"creator_initiated_via_contract");
 assert.equal(report.hits[0].amount,3);
 assert.equal(report.complete,true);
});
test("creator-originated ETH internal send is distinguished from contract-mediated send",()=>{
 const tx={hash,from:{hash:creator},result:"success"};
 const rows=[{transaction_hash:hash,index:1,from:{hash:creator},to:{hash:trader},value:qty(1),success:true}];
 const result=creatorInitiatedNativeTraces(tx,{items:rows},creator,[trader],"base");
 assert.equal(result.hits[0].kind,"direct_internal_sender");
 assert.equal(result.hits[0].url,"https://base.blockscout.com/tx/"+hash);
});
test("creator funding rejects third-party initiated, failed, zero-value and wrong-tx entries",()=>{
 const tx={hash,from:{hash:router},result:"success"};
 const calls=[{transaction_hash:hash,index:1,from:{hash:creator},to:{hash:trader},value:qty(2),success:true}];
 assert.equal(creatorInitiatedNativeTraces(tx,{items:calls},creator,[trader],"ethereum").hits.length,0);
 const valid={...tx,from:{hash:creator}};
 const bad=[
 {...calls[0],success:false},
 {...calls[0],index:2,value:"0"},
 {...calls[0],index:3,transaction_hash:"0x"+"b".repeat(64)},
 {...calls[0],index:4,to:{hash:router}}
 ];
 assert.equal(creatorInitiatedNativeTraces(valid,{items:bad},creator,[trader],"ethereum").hits.length,0);
});
test("trace page loader enforces strict two-page cap and reports incomplete without lying",async()=>{
 const seen=[];
 const response=async url=>{seen.push(url);
  return {items:[{transaction_hash:hash}],next_page_params:{index:seen.length,block_number:900}};};
 const base=innerTraceUrl("base",hash);
 const result=await loadTraceSample(base,response,{pages:2});
 assert.equal(result.pagesLoaded,2);
 assert.equal(result.items.length,2);
 assert.equal(result.complete,false);
 assert.equal(seen.length,2);
 assert.match(seen[1],/index=1/);
});
test("trace loader reports complete only when pagination ends",async()=>{
 const sample=await loadTraceSample(innerTraceUrl("ethereum",hash),async()=>({items:[],next_page_params:null}));
 assert.equal(sample.complete,true);
 assert.equal(sample.pagesLoaded,1);
 assert.equal(sample.items.length,0);
});
test("new native-flow reasons have readable Korean labels",()=>{
 assert.match(explainEvidenceReason("partial_internal_traces","ko"),/누락/);
 assert.match(explainEvidenceReason("native_payment_opposes_token_flow","ko"),/매매 확정 아님/);
});

test("swap method via another signer stays CONTEXT, not a confirmed watched-wallet trade",()=>{
 const tx={...receipt("swapExactTokensForTokens"),from:{hash:creator}};
 const flow=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 const result=classifySwapEvidence(tx,flow,trader,token);
 assert.equal(result.kind,"swap_context_evidence");
 assert.equal(result.reason,"shared_router_not_initiator");
 assert.match(explainEvidenceReason(result.reason,"ko"),/직접 시작하지 않음/);
});
test("swap method with absent origin also stays contextual rather than presumptively direct",()=>{
 const tx={...receipt("swapExactTokensForTokens")};
 delete tx.from;
 const flow=[move(token,router,trader,qty(200)),move(quote,trader,router,qty(100,6),"6","USDC")];
 assert.equal(classifySwapEvidence(tx,flow,trader,token).kind,"swap_context_evidence");
});
