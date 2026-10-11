import test from "node:test";
import assert from "node:assert/strict";
import {V4_SWAP_TOPIC,V4_POOL_MANAGER,USER_OP_TOPIC,ENTRY_POINTS,
 executionEvidence,tokenDirection,contextVerdict} from "../assets/wallet-execution.mjs";
const wallet="0x1234567890123456789012345678901234567890";
const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const router="0x5555555555555555555555555555555555555555";
const hash="0x"+"a".repeat(64),poolId="0x"+"b".repeat(64),opHash="0x"+"c".repeat(64);
const topicAddr=v=>"0x"+"0".repeat(24)+v.slice(2).toLowerCase();
const v4={address:{hash:V4_POOL_MANAGER},topics:[V4_SWAP_TOPIC,poolId,topicAddr(router)]};
const op={address:{hash:ENTRY_POINTS[1]},topics:[USER_OP_TOPIC,opHash,topicAddr(wallet)]};
const tx={hash,result:"success",method:"0x13d79a0b",from:{hash:router},type:2};
const move=(from,to,amount)=>({from:{hash:from},to:{hash:to},token:{address_hash:token},total:{value:String(amount)}});
test("uses exact verified Uniswap v4 PoolManager and Swap topic",()=>{
 assert.equal(V4_SWAP_TOPIC,"0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f");
 assert.equal(V4_POOL_MANAGER,"0x000000000004444c5dc75cb358380d2e3de08a90");
});
test("reads actual-format v4 Swap log and poolId, caller is router not automatically trader",()=>{
 const r=executionEvidence(tx,[v4],wallet);
 assert.equal(r.v4.length,1);
 assert.equal(r.v4[0].poolId,poolId);
 assert.equal(r.v4[0].caller,router);
 assert.equal(r.smartWalletInferred,false);
});
test("v4 log emitted by counterfeit PoolManager is ignored",()=>{
 const fake={...v4,address:{hash:router}};
 assert.equal(executionEvidence(tx,[fake],wallet).v4.length,0);
});
test("v4 event with malformed PoolId or topic caller is ignored",()=>{
 assert.equal(executionEvidence(tx,[{...v4,topics:[V4_SWAP_TOPIC,"bad",topicAddr(router)]}],wallet).v4.length,0);
 assert.equal(executionEvidence(tx,[{...v4,topics:[V4_SWAP_TOPIC,poolId,"bad"]}],wallet).v4.length,0);
});
test("incomplete event pages cannot support a v4 swap observation",()=>{
 const r=executionEvidence(tx,[v4],wallet,{complete:false});
 assert.equal(r.v4.length,0);assert.equal(r.logCompleteness,"partial");
});
test("v4 and token receipt in same tx get CONTEXT only, not proven buy",()=>{
 const e=executionEvidence(tx,[v4],wallet);
 const r=contextVerdict(tx,[move(router,wallet,1000)],wallet,token,e);
 assert.equal(r.kind,"swap_context_evidence");
 assert.equal(r.reason,"v4_poolmanager_and_token_flow");
 assert.equal(r.direction,"received");
 assert.equal(r.poolIds[0],poolId);
});
test("v4 and token spend in same tx remain CONTEXT only, not proven sell",()=>{
 const e=executionEvidence(tx,[v4],wallet);
 const r=contextVerdict(tx,[move(wallet,router,300)],wallet,token,e);
 assert.equal(r.kind,"swap_context_evidence");assert.equal(r.direction,"sent");
});
test("v4 event without wallet token flow never classifies a trade",()=>{
 const e=executionEvidence(tx,[v4],wallet);
 assert.equal(contextVerdict(tx,[move(router,"0x"+"6".repeat(40),100)],wallet,token,e).kind,"unverified");
});
test("v4 event in failed tx or partial event logs remains unknown",()=>{
 const e=executionEvidence(tx,[v4],wallet);
 assert.equal(contextVerdict({...tx,result:"error"},[move(router,wallet,1)],wallet,token,e).kind,"unverified");
 assert.equal(contextVerdict(tx,[move(router,wallet,1)],wallet,token,e,{complete:false}).kind,"unverified");
});
test("recognize ERC-4337 user operation only from allowlisted EntryPoints and watched sender",()=>{
 const e=executionEvidence(tx,[op],wallet);
 assert.equal(e.erc4337.length,1);assert.equal(e.smartWalletInferred,true);
 assert.equal(e.erc4337[0].userOpHash,opHash);
 const other=executionEvidence(tx,[op],router);
 assert.equal(other.erc4337.length,0);
 const spoof=executionEvidence(tx,[{...op,address:{hash:router}}],wallet);
 assert.equal(spoof.erc4337.length,0);
});
test("ERC-4337 event alone does not indicate buy/sell",()=>{
 const e=executionEvidence(tx,[op],wallet);
 assert.equal(contextVerdict(tx,[move(router,wallet,100)],wallet,token,e).reason,
  "erc4337_user_operation_without_verified_swap");
});
test("EIP-7702 type 4 is recognized as outer tx context but not attributed to watched signer",()=>{
 const result=executionEvidence({...tx,type:4},[],wallet);
 assert.equal(result.eip7702,true);assert.equal(result.smartWalletInferred,false);
 assert.equal(executionEvidence({...tx,type:"0x04"},[],wallet).eip7702,true);
 assert.equal(executionEvidence(tx,[],wallet).eip7702,false);
});
test("token direction uses exact raw integer amount rather than number of events",()=>{
 const rows=[move(router,wallet,500),move(wallet,router,100),move(wallet,router,99)];
 assert.equal(tokenDirection(rows,wallet,token),"received");
 assert.equal(tokenDirection([move(router,wallet,1),move(wallet,router,5)],wallet,token),"sent");
 assert.equal(tokenDirection([move(router,wallet,5),move(wallet,router,5)],wallet,token),"both");
});
test("no unsupported chains silently claim protocol support",()=>{
 const r=executionEvidence(tx,[v4,op],wallet,{chain:"bsc"});
 assert.equal(r.v4.length,0);assert.equal(r.erc4337.length,0);
});
test("real Ethereum tx example has canonical v4 log and method 0x13d79a0b, router is not the holder",()=>{
 const actualHash="0x8b63a3ac9f8f0ff04fe36c08eaf71b485d9bf18292d4d94da64ea0d62d985eb2";
 const actual={hash:actualHash,result:"success",method:"0x13d79a0b",type:2,from:{hash:"0x943810707e090F1Bdc486c4c990d43dA3B162e52"}};
 const e=executionEvidence(actual,[v4],wallet);
 assert.equal(e.v4.length,1);
 assert.equal(e.outerMethod,"0x13d79a0b");
});
