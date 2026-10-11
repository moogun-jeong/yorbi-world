import test from "node:test";
import assert from "node:assert/strict";
import {walletGraph,boundedMap,memoizedBlockscout,safeProof} from "../assets/wallet-graph.mjs";
const creator="0x"+"1".repeat(40),holder="0x"+"2".repeat(40),holder2="0x"+"3".repeat(40),contract="0x"+"4".repeat(40);
const hash="0x"+"a".repeat(64),otherHash="0x"+"b".repeat(64);
test("direct token edge requires creator↔sampled holder plus chain-specific transaction hash",()=>{
 const g=walletGraph({chain:"ethereum",creator,holders:[holder,holder2],tokenLinks:[
  {hash,from:creator,to:holder},{hash:"invalid",from:creator,to:holder},{hash:otherHash,from:holder,to:holder2}
 ]});
 assert.equal(g.nodes.length,3);
 assert.equal(g.edges.length,1);
 assert.equal(g.edges[0].type,"token");
 assert.equal(g.edges[0].url,"https://eth.blockscout.com/tx/"+hash);
});
test("shared router or same-token holdings never fabricate an ownership connection",()=>{
 const graph=walletGraph({chain:"ethereum",creator,holders:[holder,holder2],
  tokenLinks:[{hash,from:holder,to:contract},{hash:otherHash,from:holder2,to:contract}]});
 assert.equal(graph.edges.length,0);
 assert.equal(graph.reason,"none_in_sample");
});
test("direct ETH and creator-initiated mediated ETH remain DIFFERENT edge types",()=>{
 const graph=walletGraph({chain:"base",creator,holders:[holder],nativeDirect:[
  {hash,from:creator,to:holder}
 ],nativeVia:[{hash:otherHash,kind:"creator_initiated_via_contract",from:contract,to:holder}]});
 assert.equal(graph.edges.length,2);
 assert.equal(graph.edges[0].type,"eth");
 assert.equal(graph.edges[1].type,"contract");
 assert.equal(graph.edges[1].sender,contract);
 assert.equal(graph.edges[1].from,creator);
 assert.equal(graph.edges[1].url,"https://base.blockscout.com/tx/"+otherHash);
});
test("other initiator, invalid hash, unauthorized chain and malformed addresses give no edges",()=>{
 assert.equal(walletGraph({chain:"bsc",creator,holders:[holder]}).reason,"creator_unknown");
 assert.equal(walletGraph({chain:"ethereum",creator:"bad",holders:[holder]}).reason,"creator_unknown");
 const g=walletGraph({chain:"ethereum",creator,holders:[holder],nativeVia:[
  {hash,kind:"creator_initiated_via_contract",from:creator,to:holder},
  {hash:"a",kind:"creator_initiated_via_contract",from:contract,to:holder},
  {hash,kind:"unrecognized",from:contract,to:holder}
 ]});
 assert.equal(g.edges.length,0);
 assert.equal(safeProof("base","0x1234"),null);
});
test("direct ETH internal trace from creator is not mislabeled as mediated and is deduplicated",()=>{
 const g=walletGraph({chain:"ethereum",creator,holders:[holder],nativeDirect:[{hash,from:creator,to:holder}],
 nativeVia:[{hash,kind:"direct_internal_sender",from:creator,to:holder}]});
 assert.equal(g.edges.length,1);
 assert.equal(g.edges[0].type,"eth");
});
test("repeated evidence hashes and holders are deduplicated, graph limited to three holders",()=>{
 const g=walletGraph({chain:"ethereum",creator,
  holders:[holder,holder,holder2,"0x"+"5".repeat(40),"0x"+"6".repeat(40)],
  tokenLinks:[{hash,from:creator,to:holder},{hash,from:creator,to:holder}]});
 assert.equal(g.nodes.length,4);
 assert.equal(g.edges.length,1);
});
test("bounded asynchronous scheduler preserves order while concurrency never exceeds two",async()=>{
 let active=0,max=0;
 const nums=[1,2,3,4,5,6];
 const res=await boundedMap(nums,2,async num=>{
  active++;max=Math.max(max,active);
  await Promise.resolve();await Promise.resolve();
  active--;return num*3;
 });
 assert.deepEqual(res,[3,6,9,12,15,18]);
 assert.equal(max,2);
});
test("zero request list produces zero network calls",async()=>{
 let n=0;const r=await boundedMap([],2,async()=>{n++;});
 assert.deepEqual(r,[]);assert.equal(n,0);
});
test("memoized requests coalesce concurrent and repeated URL calls within one scan",async()=>{
 let calls=0;
 const url="https://eth.blockscout.com/api/v2/transactions/"+hash;
 const fetch=memoizedBlockscout(async()=>{calls++;await Promise.resolve();return {ok:true};});
 const [a,b,c]=await Promise.all([fetch(url),fetch(url),fetch(url)]);
 assert.equal(calls,1);assert.deepEqual(a,b);assert.deepEqual(b,c);
});
test("failed request can be retried, other hosts and invalid paths are rejected",async()=>{
 let calls=0;
 const url="https://base.blockscout.com/api/v2/transactions/"+hash;
 const fetch=memoizedBlockscout(async()=>{calls++;if(calls===1)throw Error("temporary");return {ok:true};});
 await assert.rejects(fetch(url));
 const res=await fetch(url);assert.equal(calls,2);assert.equal(res.ok,true);
 await assert.rejects(fetch("https://base.blockscout.com.evil.org/api/v2/transactions/"+hash));
 await assert.rejects(fetch("javascript:alert(1)"));
});
test("memoized single scan respects a strict URL request budget",async()=>{
 const fetch=memoizedBlockscout(async()=>({ok:true}),{max:1});
 const a="https://eth.blockscout.com/api/v2/transactions/"+hash,b="https://eth.blockscout.com/api/v2/transactions/"+otherHash;
 await fetch(a);await assert.rejects(fetch(b));
});
test("invalid scheduler concurrency and malformed inputs are rejected",async()=>{
 await assert.rejects(boundedMap([1],0,async()=>1));
 await assert.rejects(boundedMap([1],4,async()=>1));
 await assert.rejects(boundedMap("invalid",2,async()=>1));
});
