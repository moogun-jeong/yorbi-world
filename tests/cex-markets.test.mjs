import test from "node:test";
import assert from "node:assert/strict";
import {CEX_VENUES,marketSymbol,contractKey,cexRequests,networkContract,
 inspectCexResponse,summarizeCexResults,restoreMatches,boundedCexFetch} from "../assets/cex-markets.mjs";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const other="0x"+"a".repeat(40);
const coinbaseMarket={id:"PEPE-USD",base_currency:"PEPE",quote_currency:"USD",status:"online",
 trading_disabled:false,cancel_only:false};
const cbCurrency={id:"PEPE",supported_networks:[
 {id:"ethereum",contract_address:token,name:"Ethereum",status:"online"}]};
const binanceMarket={symbols:[{symbol:"PEPEUSDT",baseAsset:"PEPE",quoteAsset:"USDT",status:"TRADING",isSpotTradingAllowed:true}]};
const krakenMarket={error:[],result:{PEPEUSD:{altname:"PEPEUSD",wsname:"PEPE/USD",base:"PEPE",status:"online"}}};
const kucoinMarket={code:"200000",data:{symbol:"PEPE-USDT",baseCurrency:"PEPE",quoteCurrency:"USDT",enableTrading:true}};
const query=(venue,payload,currency,chain="ethereum",contract=token)=>{
 const url=cexRequests("PEPE").find(x=>x.id===venue&&x.kind==="market").url;
 return inspectCexResponse(venue,payload,currency,"PEPE",chain,contract,url);
};
test("constructs five safe official-market request URLs for four distinct venues",()=>{
 const req=cexRequests("PEPE");
 assert.equal(req.length,5);
 assert.deepEqual(req.map(x=>x.id),["binance","coinbase","coinbase","kraken","kucoin"]);
 assert.match(req[0].url,/^https:\/\/data-api\.binance\.vision\/api\/v3\/exchangeInfo\?symbol=PEPEUSDT$/);
 assert.match(req[2].url,/\/currencies\/PEPE$/);
 assert.equal(CEX_VENUES.length,4);
});
test("ticker input is strongly validated to prevent URL/path injection",()=>{
 assert.equal(marketSymbol("pepe"),"PEPE");
 assert.equal(marketSymbol("ABC/USDT"),null);
 assert.equal(marketSymbol("A%2f"),null);
 assert.equal(marketSymbol(""),null);
 assert.equal(cexRequests("../etc/passwd").length,0);
});
test("chain and contract identifiers are exact and chain-sensitive",()=>{
 assert.equal(contractKey("ethereum",token),"ethereum:"+token);
 assert.equal(contractKey("base",token),"base:"+token);
 assert.equal(contractKey("eth",token),null);
});
test("Coinbase network details can provide exact contract on Ethereum, not just a ticker",()=>{
 const item=query("coinbase",coinbaseMarket,cbCurrency);
 assert.equal(item.status,"contract_verified");
 assert.equal(item.identity,"contract_verified");
 assert.equal(item.detail,token);
});
test("a different contract on the same Coinbase network is NOT our token",()=>{
 const item=query("coinbase",coinbaseMarket,cbCurrency,"ethereum",other);
 assert.equal(item.status,"contract_mismatch");
 assert.equal(item.identity,"different_contract");
});
test("supported network not matching target chain does not prove identity or mismatch",()=>{
 const item=query("coinbase",coinbaseMarket,cbCurrency,"base",other);
 assert.equal(item.status,"ticker_market");
 assert.equal(item.identity,"ticker_only");
});
test("Coinbase product alone without identity metadata remains ticker-only",()=>{
 assert.equal(query("coinbase",coinbaseMarket,null).status,"ticker_market");
 assert.equal(networkContract(null,"ethereum",token).status,"unknown");
});
test("Coinbase paused product is not counted as actively trading",()=>{
 const item=query("coinbase",{...coinbaseMarket,status:"offline"},cbCurrency);
 assert.equal(item.status,"paused");
});
test("official Binance market is ticker-matched and not contract-verified",()=>{
 const item=query("binance",binanceMarket,null);
 assert.equal(item.status,"ticker_market");
 assert.equal(item.identity,"ticker_only");
});
test("Binance market suspended or invalid symbol is not labelled listed",()=>{
 assert.equal(query("binance",{symbols:[{...binanceMarket.symbols[0],status:"BREAK"}]},null).status,"paused");
 assert.equal(query("binance",{code:-1121,msg:"Invalid symbol."},null).status,"not_found_pair");
});
test("Kraken and KuCoin responses distinguish online ticker markets from contract identity",()=>{
 const k=query("kraken",krakenMarket,null),u=query("kucoin",kucoinMarket,null);
 assert.equal(k.status,"ticker_market");assert.equal(u.status,"ticker_market");
 assert.equal(k.identity,"ticker_only");assert.equal(u.identity,"ticker_only");
});
test("missing selected pair does NOT prove unlisted everywhere",()=>{
 const a=query("kraken",{error:[],result:{}},null);
 const b=query("kucoin",{code:"200000",data:null},null);
 assert.equal(a.status,"not_found_pair");assert.equal(b.status,"not_found_pair");
 assert.equal(summarizeCexResults([a,b]).cexAbsenceProven,false);
});
test("API failures, CORS and HTTP 451 must remain unavailable, not absent",()=>{
 const blocked=query("binance",{__fetchError:true},null);
 assert.equal(blocked.status,"unavailable");
 assert.equal(query("coinbase",{__notFound:true},null).status,"not_found_pair");
 assert.equal(query("kraken",{error:["EGeneral:Busy"],result:{}},null).status,"unavailable");
});
test("scope prevents fabricated verified markets",()=>{
 assert.equal(inspectCexResponse("kucoin",kucoinMarket,null,"A/USDT","ethereum",token,"https://x").status,"unavailable");
 assert.equal(inspectCexResponse("fake",kucoinMarket,null,"PEPE","ethereum",token,"https://x").status,"unavailable");
});
test("summary never asserts DEX-only or Remaining Upside from sparse quotes",()=>{
 const rows=[query("coinbase",coinbaseMarket,cbCurrency),
  query("binance",binanceMarket,null),
  query("kraken",{error:[],result:{}},null)];
 const result=summarizeCexResults(rows);
 assert.equal(result.verified,1);assert.equal(result.ticker,1);
 assert.equal(result.noPair,1);assert.equal(result.dexOnlyProven,false);
 assert.equal(result.remainingListingPathKnown,false);
});
test("restored CEX report must match chain, exact token and ticker and be fresh",()=>{
 const now=Date.now();
 const data={chain:"ethereum",contract:"ethereum:"+token,symbol:"PEPE",checkedAt:now,results:[]};
 assert.equal(restoreMatches(data,"ethereum",token,"PEPE"),true);
 assert.equal(restoreMatches(data,"base",token,"PEPE"),false);
 assert.equal(restoreMatches(data,"ethereum",other,"PEPE"),false);
 assert.equal(restoreMatches({...data,checkedAt:now-13*3600000},"ethereum",token,"PEPE"),false);
});
test("rate-limited parallel market calls preserve order and limit concurrency",async()=>{
 let active=0,max=0;
 const source=cexRequests("PEPE");
 const out=await boundedCexFetch(source,async x=>{
  active++;max=Math.max(active,max);await Promise.resolve();await Promise.resolve();active--;
  return x.kind;
 });
 assert.equal(max,2);assert.deepEqual(out,source.map(x=>x.kind));
});
test("one failing API cannot suppress successful official market results",async()=>{
 const queries=cexRequests("PEPE");
 const out=await boundedCexFetch(queries,async x=>{
  if(x.id==="binance")throw Error("451");
  return {ok:true};
 });
 assert.equal(out[0].__fetchError,true);
 assert.equal(out[1].ok,true);
 assert.equal(out.length,5);
});
