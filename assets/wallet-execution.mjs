/* Sprint 6.6: Ethereum/Base v4 and account-abstraction evidence only.
   These are transaction-level hints, NEVER proof of trader ownership or executed sell. */
export const V4_SWAP_TOPIC="0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";
export const V4_POOL_MANAGER="0x000000000004444c5dc75cb358380d2e3de08a90";
export const USER_OP_TOPIC="0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f";
export const ENTRY_POINTS=Object.freeze([
 "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
 "0x0000000071727de22e5e9d8baf0edac6f37da032",
 "0x4337084d9e255ff0702461cf8895ce9e3b5ff108"
]);
const address=/^0x[a-fA-F0-9]{40}$/;
const topic=/^0x[a-fA-F0-9]{64}$/;
const low=x=>typeof x==="string"?x.toLowerCase():"";
const decodeTopicAddr=x=>topic.test(x)?"0x"+x.slice(-40).toLowerCase():null;
const goodLog=log=>log&&Array.isArray(log.topics)&&typeof log.address?.hash==="string";
export function executionEvidence(tx,logs,wallet,{complete=true,chain="ethereum"}={}){
 const safeWallet=address.test(wallet)?low(wallet):null;
 const validChain=chain==="ethereum"||chain==="base";
 const result={v4:[],erc4337:[],eip7702:false,outerMethod:null,
  logCompleteness:complete?"complete":"partial",smartWalletInferred:false};
 if(!validChain||!tx||!safeWallet||!Array.isArray(logs))return result;
 result.outerMethod=typeof tx.method==="string"?tx.method:null;
 // EIP-7702 type 4 proves the outer *transaction* uses delegation authorization,
 // not that the watched wallet signed or controls any of its inner operations.
 result.eip7702=tx.type===4||tx.type==="4"||tx.type==="0x4"||tx.type==="0x04";
 if(!complete)return result;
 for(const log of logs){
  if(!goodLog(log))continue;
  const t0=low(log.topics[0]),source=low(log.address.hash);
  if(t0===V4_SWAP_TOPIC&&source===V4_POOL_MANAGER&&topic.test(log.topics[1])&&topic.test(log.topics[2])){
   const caller=decodeTopicAddr(log.topics[2]);
   const poolId=log.topics[1];
   if(!result.v4.some(x=>low(x.poolId)===low(poolId)&&low(x.caller)===caller))
    result.v4.push({poolId,caller,emitter:log.address.hash});
  }
  if(t0===USER_OP_TOPIC&&ENTRY_POINTS.includes(source)&&topic.test(log.topics[1])&&topic.test(log.topics[2])){
   const sender=decodeTopicAddr(log.topics[2]);
   if(sender===safeWallet&&!result.erc4337.some(x=>low(x.userOpHash)===low(log.topics[1])))
    result.erc4337.push({userOpHash:log.topics[1],sender,entryPoint:log.address.hash});
  }
 }
 result.v4=result.v4.slice(0,5);
 result.erc4337=result.erc4337.slice(0,5);
 result.smartWalletInferred=result.erc4337.length>0;
 return result;
}
export function tokenDirection(transfers,wallet,tracked){
 if(!address.test(wallet)||!address.test(tracked)||!Array.isArray(transfers))return null;
 let ins=0n,outs=0n;
 for(const t of transfers){
  if(low(t?.token?.address_hash)!==low(tracked))continue;
  const raw=t?.total?.value;
  if(typeof raw!=="string"||!/^[0-9]+$/.test(raw))return null;
  const amount=BigInt(raw);
  if(amount===0n)continue;
  const from=low(t.from?.hash),to=low(t.to?.hash),w=low(wallet);
  if(from===w&&to!==w)outs+=amount;
  if(to===w&&from!==w)ins+=amount;
 }
 return ins>outs?"received":outs>ins?"sent":ins&&outs?"both":null;
}
export function contextVerdict(tx,transfers,wallet,token,execution,{complete=true}={}){
 if(!complete||execution?.logCompleteness!=="complete"||
    tx?.result!=="success"||!Array.isArray(transfers))
    return {kind:"unverified",reason:"incomplete_or_failed"};
 const direction=tokenDirection(transfers,wallet,token);
 if(!direction)return {kind:"unverified",reason:"no_valid_tracked_token_flow"};
 if(execution.v4?.length){
  return {kind:"swap_context_evidence",reason:"v4_poolmanager_and_token_flow",direction,
   poolIds:execution.v4.map(x=>x.poolId),poolManager:execution.v4[0].emitter,
   routerCallers:execution.v4.map(x=>x.caller),smartWallet:execution.smartWalletInferred};
 }
 if(execution.erc4337?.length){
  return {kind:"unverified",reason:"erc4337_user_operation_without_verified_swap",
   direction,smartWallet:true,userOpHashes:execution.erc4337.map(x=>x.userOpHash)};
 }
 return {kind:"unverified",reason:"no_supported_execution_context",direction,
  eip7702:execution.eip7702};
}
