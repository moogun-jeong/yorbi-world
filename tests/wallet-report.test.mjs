import test from "node:test";
import assert from "node:assert/strict";
import {parseMovement,normalizeMovements,periodSample,summarizeMoves,
 classifyEvidenceByWallet,createEvidenceReport,reportText} from "../assets/wallet-report.mjs";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const wallet="0x1234567890123456789012345678901234567890";
const other="0x2222222222222222222222222222222222222222";
const creator="0x3333333333333333333333333333333333333333";
const tx1="0x"+"a".repeat(64),tx2="0x"+"b".repeat(64);
const now=Date.parse("2026-10-11T02:00:00Z");
const raw=(from,to,hash,time,value="20000000000000000000",index=1,coin=token)=>({
 from:{hash:from},to:{hash:to},token:{address_hash:coin,decimals:"18"},
 transaction_hash:hash,timestamp:time,log_index:index,
 total:{value,decimals:"18"}
});
const a=raw(other,wallet,tx1,"2026-10-11T01:00:00Z");
const b=raw(wallet,other,tx2,"2026-10-09T14:00:00Z","4000000000000000000",2);
test("normalizes exact-token transfer with canonical wallet direction and UTC time",()=>{
 const r=parseMovement(a,wallet,token);
 assert.equal(r.direction,"in");assert.equal(r.amount,20);
 assert.equal(r.time,"2026-10-11T01:00:00.000Z");
 assert.equal(parseMovement(b,wallet,token).direction,"out");
});
test("rejects unrelated token, invalid transfer hashes, self-transfer and wallet not involved",()=>{
 assert.equal(parseMovement({...a,token:{address_hash:other}},wallet,token),null);
 assert.equal(parseMovement({...a,transaction_hash:"x"},wallet,token),null);
 assert.equal(parseMovement({...a,from:{hash:wallet}},wallet,token),null);
 assert.equal(parseMovement({...a,from:{hash:creator},to:{hash:other}},wallet,token),null);
 assert.equal(parseMovement({...a,timestamp:"bad-date"},wallet,token),null);
});
test("invalid transfer amount is unknown, never zero",()=>{
 const r=parseMovement({...a,total:{value:"not-a-number",decimals:"18"}},wallet,token);
 assert.equal(r.amount,null);
 const summary=summarizeMoves([r],"sample",now);
 assert.equal(summary.missingAmounts,1);
 assert.equal(summary.wallets[0].unknownAmounts,1);
});
test("normalization deduplicates repeated exact log index but keeps different logs in same tx",()=>{
 const distinct={...a,log_index:2};
 const x=normalizeMovements([{address:wallet,records:[a,a,distinct],more:true}],token);
 assert.equal(x.movements.length,2);
 assert.equal(x.paginatedWallets,1);
 assert.equal(x.walletsObserved,1);
});
test("normalization limits each watched wallet to first 50 supplied records",()=>{
 const records=Array.from({length:55},(_,i)=>({...a,log_index:i}));
 assert.equal(normalizeMovements([{address:wallet,records}],token).movements.length,50);
});
test("24h, 7d and full fetch differ; future events do not leak into report",()=>{
 const future={...parseMovement(a,wallet,token),timestamp:now+1000,time:"2026-10-11T02:00:01.000Z"};
 const set=[parseMovement(a,wallet,token),parseMovement(b,wallet,token),future];
 assert.equal(periodSample(set,"24h",now).length,1);
 assert.equal(periodSample(set,"7d",now).length,2);
 assert.equal(periodSample(set,"sample",now).length,2);
});
test("summarizes UTC dates and wallet event directions separately",()=>{
 const summary=summarizeMoves([parseMovement(a,wallet,token),parseMovement(b,wallet,token)],"7d",now);
 assert.equal(summary.total,2);
 assert.equal(summary.wallets[0].in,1);
 assert.equal(summary.wallets[0].out,1);
 assert.equal(summary.days.length,2);
 assert.equal(summary.days[0].date,"2026-10-11");
});
test("no records means no observed activity, not a claim of no lifetime buys/sells",()=>{
 const summary=summarizeMoves([],"24h",now);
 assert.equal(summary.total,0);assert.equal(summary.days.length,0);
 assert.equal(summary.first,null);
});
test("invalid timeframe is rejected rather than silently ignored",()=>{
 assert.throws(()=>periodSample([],"24hours",now));
 assert.throws(()=>periodSample([],"7d",Number.NaN));
});
test("classification distinguishes explicit wallet swaps, context, ordinary transfers and unknown",()=>{
 const rs=[
 {wallet,hash:tx1,verdict:{kind:"swap_buy_evidence"}},
 {wallet,hash:tx1,verdict:{kind:"swap_buy_evidence"}},
 {wallet,hash:tx2,verdict:{kind:"swap_context_evidence"}},
 {wallet:other,hash:tx1,verdict:{kind:"transfer"}},
 {wallet:other,hash:tx2,verdict:{kind:"unverified"}}
 ];
 const summary=classifyEvidenceByWallet(rs);
 assert.equal(summary.length,2);
 assert.equal(summary[0].strongReceive,1);
 assert.equal(summary[0].context,1);
 assert.equal(summary[1].transfer,1);
 assert.equal(summary[1].unknown,1);
});
test("report includes chain, sampled-only flags, original transaction evidence and date metadata",()=>{
 const rs=[{wallet,hash:tx1,verdict:{kind:"transfer",reason:"no_explicit_swap_method"}}];
 const report=createEvidenceReport({chain:"ethereum",token,creator,period:"24h",now,
  wallets:{walletsObserved:1,paginatedWallets:1},events:rs,
  movements:[parseMovement(a,wallet,token)],graph:{edges:[{
   type:"token",from:creator,to:wallet,hash:tx1,url:"https://eth.blockscout.com/tx/"+tx1
  }]}});
 assert.equal(report.schema,"yorbi-wallet-sample-v1");
 assert.equal(report.coverage.allTransactionsReviewed,false);
 assert.equal(report.coverage.knownTruncatedWalletPages,1);
 assert.equal(report.summary.total,1);
 assert.equal(report.provenTransferLinks.length,1);
 assert.equal(report.transactionEvidence[0].source,"https://eth.blockscout.com/tx/"+tx1);
 assert.match(reportText(report,"ko"),/전체 기간/);
});
test("unsafe graph URLs, other chains and invalid report parameters never enter exports",()=>{
 const report=createEvidenceReport({chain:"base",token,period:"7d",now,
  wallets:{},movements:[],events:[],graph:{edges:[{
   type:"token",hash:tx1,url:"https://evil.example/tx/"+tx1
  }]}});
 assert.equal(report.provenTransferLinks.length,0);
 assert.equal(report.creator,null);
 assert.match(reportText(report,"en"),/NOT establish/);
 assert.throws(()=>createEvidenceReport({chain:"bsc",token,period:"7d",now,movements:[]}));
});
test("unknown-wallet data does not create extra network dependencies",()=>{
 const report=createEvidenceReport({chain:"ethereum",token,period:"sample",now,
  wallets:{walletsObserved:0,paginatedWallets:0},movements:[],events:[]});
 assert.equal(report.summary.total,0);
 assert.equal(report.transactionEvidence.length,0);
 assert.equal(report.coverage.noDataMeansNoActivity,false);
});
