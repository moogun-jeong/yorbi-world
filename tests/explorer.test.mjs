import {test} from "node:test";
import assert from "node:assert/strict";
import {validAddress,chooseBestPair,formatMoney,liquidityNote,safeProviderUrl} from "../assets/explorer.mjs";

const addr="0x6982508145454Ce325dDbE47a25d4Ec3d2311933";
const other="0x2222222222222222222222222222222222222222";
const pair=(chainId="ethereum",base=addr,liq=15000)=>({
  chainId,baseToken:{address:base,name:"Example",symbol:"EX"},quoteToken:{address:other,symbol:"WETH"},
  liquidity:{usd:liq},dexId:"uniswap",pairAddress:other,priceUsd:"0.00005",
  url:"https://dexscreener.com/ethereum/"+other
});

test("accepts chain + exact EVM address, rejects ticker and unsupported chains",()=>{
  assert.ok(validAddress("ethereum",addr));
  assert.ok(validAddress("base",addr));
  assert.equal(validAddress("base","PEPE"),false);
  assert.equal(validAddress("notachain",addr),false);
  assert.equal(validAddress("bsc","0x1234"),false);
});
test("Solana address syntax is separate from EVM",()=>{
  assert.ok(validAddress("solana","So11111111111111111111111111111111111111112"));
  assert.equal(validAddress("solana",addr),false);
});
test("highest-liquidity matching token BASE pair is selected",()=>{
  const result=chooseBestPair([pair("ethereum",addr,12000),pair("ethereum",addr,22000)],"ethereum",addr);
  assert.equal(result?.pair.liquidity.usd,22000);
  assert.equal(result?.count,2);
});
test("does not present quote token's partner price as the requested token",()=>{
  const quoteOnly={...pair("ethereum",other,60000),quoteToken:{address:addr,symbol:"EX"}};
  assert.equal(chooseBestPair([quoteOnly],"ethereum",addr),null);
});
test("does not cross chains even with identical contract addresses",()=>{
  const result=chooseBestPair([pair("bsc",addr,900000),pair("ethereum",addr,20000)],"ethereum",addr);
  assert.equal(result?.pair.liquidity.usd,20000);
});
test("missing market data is never converted into zero",()=>{
  assert.equal(formatMoney(null),"—");
  assert.equal(formatMoney(undefined),"—");
  assert.equal(formatMoney(""),"—");
  assert.equal(formatMoney(0),"$0");
});
test("liquidity notes are descriptive and do not call a pool safe",()=>{
  assert.match(liquidityNote(1000,"en"),/thin liquidity/i);
  assert.match(liquidityNote(150000,"en"),/does not guarantee/i);
});
test("links are restricted to the official DEX Screener hostname",()=>{
  assert.equal(safeProviderUrl({url:"https://dexscreener.com/ethereum/"+other}),"https://dexscreener.com/ethereum/"+other);
  assert.equal(safeProviderUrl({url:"https://dexscreener.com.evil.example/foo"}),null);
  assert.equal(safeProviderUrl({url:"javascript:alert(1)"}),null);
});
