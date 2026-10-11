import {test} from "node:test";
import assert from "node:assert/strict";
import {GROWTH_KEY,GROWTH_RETENTION_MS,GROWTH_MIN_COMPARISON_MS,
 GROWTH_PER_TOKEN_LIMIT,GROWTH_GLOBAL_LIMIT,tokenKey,takeMarketSnapshot,
 readHolderCount,saveObservation,previousObservation,observedChange,
 listingPath,reviewGrowth,parseHistory} from "../assets/moonshot-growth.mjs";
const token="0x6982508145454Ce325dDbE47a25d4Ec3d2311933";
const now=1791691200000;
const pair=(marketCap=600000,liq=38000)=>({
 chainId:"ethereum",baseToken:{address:token,symbol:"PEPE"},quoteToken:{symbol:"WETH"},
 pairAddress:"0x"+"f".repeat(40),dexId:"uniswap",
 liquidity:{usd:liq},volume:{h24:290000},marketCap,fdv:870000,
 priceUsd:"0.00003",txns:{h24:{buys:100,sells:91}},
 pairCreatedAt:now-60*86400000,priceChange:{h24:4.2}
});
const explorer=(ts=now,cap=600000)=>({chain:"ethereum",address:token,date:ts,pair:pair(cap)});
test("snapshot recognizes supported chain and contract-address only",()=>{
 const s=takeMarketSnapshot(explorer());
 assert.equal(s.key,"ethereum:"+token.toLowerCase());
 assert.equal(s.marketCap,600000);
 assert.equal(s.fdv,870000);
 assert.equal(s.volume24h,290000);
 assert.equal(s.holderCount,null);
 assert.equal(tokenKey("ethereum","bad"),null);
 assert.equal(tokenKey("unsupported",token),null);
});
test("market cap and FDV stay separate; missing numbers are NOT zeros",()=>{
 const p=pair();p.marketCap=null;p.fdv=170000;
 p.liquidity=null;p.volume={};p.priceUsd="";p.txns={};
 const s=takeMarketSnapshot({...explorer(),pair:p});
 assert.equal(s.marketCap,null);assert.equal(s.fdv,170000);
 assert.equal(s.liquidity,null);assert.equal(s.volume24h,null);
 assert.equal(s.priceUsd,null);assert.equal(s.buys24h,null);
});
test("rejects wrong base token or missing timestamp and refuses to mix contracts",()=>{
 const e=explorer();e.pair.baseToken.address="0x"+"a".repeat(40);
 assert.equal(takeMarketSnapshot(e),null);
 assert.equal(takeMarketSnapshot({...explorer(),date:"invalid"}),null);
});
test("preserves GoPlus holder numbers only with exact matching chain and token",()=>{
 const current=takeMarketSnapshot(explorer());
 const security={chain:"ethereum",address:token.toLowerCase(),report:{holderCount:12999}};
 assert.equal(readHolderCount(security,current),12999);
 assert.equal(readHolderCount({...security,chain:"base"},current),null);
 assert.equal(readHolderCount({...security,address:"0x"+"c".repeat(40)},current),null);
 assert.equal(readHolderCount({...security,report:{holderCount:null}},current),null);
});
test("first user scan yields zero fabricated historical growth",()=>{
 const current=takeMarketSnapshot(explorer());
 const records=saveObservation([],current,now);
 const summary=reviewGrowth(records,current);
 assert.equal(summary.prior,null);
 assert.equal(summary.coverage.observations,1);
 assert.equal(summary.changes.marketCap,null);
 assert.equal(summary.coverage.cexListingVerified,false);
});
test("two observations less than 15 minutes apart do not create a growth comparison",()=>{
 const one=takeMarketSnapshot(explorer(now-600000,500000));
 const next=takeMarketSnapshot(explorer(now,700000));
 const samples=saveObservation(saveObservation([],one,now),next,now);
 assert.equal(previousObservation(samples,next),null);
});
test("past 15 minutes gives measured comparison and actual elapsed time",()=>{
 const old=takeMarketSnapshot(explorer(now-3600000,500000));
 const latest=takeMarketSnapshot(explorer(now,600000));
 const entries=saveObservation(saveObservation([],old,now),latest,now);
 const info=reviewGrowth(entries,latest);
 assert.equal(info.changes.marketCap.percent,20);
 assert.equal(info.changes.marketCap.elapsedMs,3600000);
 assert.equal(info.changes.fdv.percent,0);
 assert.equal(info.coverage.observations,2);
});
test("same within-five-minute refresh merges rather than inventing a second observation",()=>{
 const old={...takeMarketSnapshot(explorer(now-100000,550000)),holderCount:250};
 const next=takeMarketSnapshot(explorer(now,580000));
 const records=saveObservation(saveObservation([],old,now),next,now);
 assert.equal(records.length,1);
 assert.equal(records[0].marketCap,580000);
 assert.equal(records[0].holderCount,250);
});
test("zero baseline yields absolute change but no infinite percentage",()=>{
 const a={...takeMarketSnapshot(explorer(now-3600000)),holderCount:0};
 const b={...takeMarketSnapshot(explorer(now)),holderCount:100};
 const c=observedChange(b,a,"holderCount");
 assert.equal(c.difference,100);assert.equal(c.percent,null);
});
test("unknown holder baseline is unknown, not zero growth",()=>{
 const a=takeMarketSnapshot(explorer(now-3600000));
 const b={...takeMarketSnapshot(explorer(now)),holderCount:150};
 assert.equal(observedChange(b,a,"holderCount"),null);
});
test("history rejects stale, future, malformed and cross-chain records",()=>{
 const s=takeMarketSnapshot(explorer());
 const old={...s,checkedAt:now-GROWTH_RETENTION_MS-10000};
 const future={...s,checkedAt:now+200000};
 const wrong={...s,key:"base:"+token.toLowerCase()};
 const records=saveObservation([old,future,wrong],s,now);
 assert.equal(records.length,1);
 assert.equal(records[0].key,s.key);
});
test("caps number of observations for one token and globally",()=>{
 const all=Array.from({length:400},(_,i)=>takeMarketSnapshot(explorer(now-(399-i)*600000)));
 const samples=all.reduce((acc,entry)=>saveObservation(acc,entry,now),[]);
 assert.ok(samples.length<=GROWTH_PER_TOKEN_LIMIT);
 assert.ok(samples.length<=GROWTH_GLOBAL_LIMIT);
});
test("listing pathway admits DEX pool evidence but NEVER asserts DEX-only or CEX absence",()=>{
 const s=takeMarketSnapshot(explorer());
 const path=listingPath({pair:{pairAddress:s.pairAddress}});
 assert.equal(path.length,5);
 assert.equal(path[0].status,"observed");
 assert.deepEqual(path.slice(1).map(x=>x.status),["unknown","unknown","unknown","unknown"]);
 assert.match(path[0].koNote,/DEX에만/);
 assert.equal(path.some(x=>x.probability!==undefined),false);
});
test("no pair means no listing path evidence",()=>{
 assert.deepEqual(listingPath(null),[]);
 assert.deepEqual(listingPath({pair:null}),[]);
});
test("growth lookup storage roundtrip filters invalid timestamp and contract",()=>{
 const ok=takeMarketSnapshot(explorer());
 const wrong={...ok,key:"base:"+token.toLowerCase()};
 const history=parseHistory(JSON.stringify([ok,wrong]),now);
 assert.equal(history.length,1);
 assert.equal(history[0].marketCap,600000);
 assert.deepEqual(parseHistory("not-json",now),[]);
 assert.deepEqual(parseHistory("{}",now),[]);
});
test("history remains local and read-only with explicit retention bounds",()=>{
 assert.equal(GROWTH_KEY,"yorbi:moonshot-snapshots:v1");
 assert.equal(GROWTH_RETENTION_MS,30*86400000);
 assert.equal(GROWTH_MIN_COMPARISON_MS,15*60000);
 assert.equal(GROWTH_PER_TOKEN_LIMIT,48);
 assert.equal(GROWTH_GLOBAL_LIMIT,240);
});

test("liquidity and rolling volume are NOT compared across different selected DEX pools",()=>{
 const prior=takeMarketSnapshot(explorer(now-3600000,500000));
 const current=takeMarketSnapshot(explorer(now,900000));
 current.pairAddress="0x"+"a".repeat(40);
 assert.equal(observedChange(current,prior,"liquidity"),null);
 assert.equal(observedChange(current,prior,"volume24h"),null);
 assert.equal(observedChange(current,prior,"marketCap").percent,80);
});
test("two observations in the same selected DEX pool retain volume/liquidity comparisons",()=>{
 const prior=takeMarketSnapshot(explorer(now-7200000,500000));
 const current=takeMarketSnapshot(explorer(now,700000));
 assert.equal(observedChange(current,prior,"volume24h").percent,0);
 assert.equal(observedChange(current,prior,"liquidity").percent,0);
});

test("official Coinbase exact contract match updates Tier1/Binance-Coinbase stage only",()=>{
 const cb={id:"coinbase",name:"Coinbase",status:"contract_verified"};
 const result=listingPath({pair:{pairAddress:"0x"+"f".repeat(40)}},{results:[cb]});
 assert.equal(result[0].status,"observed");
 assert.equal(result[1].status,"unknown");
 assert.equal(result[2].status,"unknown");
 assert.equal(result[3].status,"contract_verified");
 assert.equal(result[4].status,"contract_verified");
 assert.match(result[4].koNote,/컨트랙트/);
});
test("Binance or KuCoin ticker-only CEX match does NOT become verified on-chain listing",()=>{
 const path=listingPath({pair:{pairAddress:"0x"+"f".repeat(40)}},{results:[
  {id:"binance",name:"Binance",status:"ticker_market"},
  {id:"kucoin",name:"KuCoin",status:"ticker_market"}
 ]});
 assert.equal(path[2].status,"ticker_market");
 assert.equal(path[3].status,"ticker_market");
 assert.equal(path[4].status,"ticker_market");
 assert.match(path[4].koNote,/미검증/);
});
test("unavailable, untested and missing quote pairs do not imply CEX delisting",()=>{
 const path=listingPath({pair:{pairAddress:"0x"+"f".repeat(40)}},{results:[
  {id:"binance",name:"Binance",status:"unavailable"},
  {id:"coinbase",name:"Coinbase",status:"not_found_pair"}
 ]});
 assert.equal(path[4].status,"unknown");
 assert.equal(path[1].status,"unknown");
});
