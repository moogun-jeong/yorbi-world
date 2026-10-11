/**
 * Isolated one-off Solana DEVNET PoW funding attempt.
 * No YORBI token minting, transfer, or production code is executed in this file.
 * Keypairs are generated in RAM only; no secret material is logged or persisted.
 */
import {Connection,Keypair,sendAndConfirmTransaction,Transaction} from '@solana/web3.js';
import {
  DEVNET_GENESIS,RPC,POW_PROGRAM,DIFFICULTY,REWARD_LAMPORTS,BOOTSTRAP_LAMPORTS,
  BRANCH,PRECHECK_COMMIT,derivePoWFaucet,parseFaucetSpec,checkFundingGate,
  isValidProofAddress,createPowClaim
} from './pow-utils.mjs';

const connection=new Connection(RPC,{commitment:'confirmed',confirmTransactionInitialTimeout:60_000});
const payer=Keypair.generate();
function log(event, fields={}) {
  // No secret keys or untrusted exception bodies.
  console.log('POW_STAGE_JSON='+JSON.stringify({event,network:'devnet',...fields}));
}
function info(err) { return String(err?.message||err).slice(0,280); }

async function main() {
  if (process.env.GITHUB_ACTIONS!=='true' ||
      process.env.GITHUB_REF_NAME!==BRANCH ||
      process.env.GITHUB_EVENT_NAME!=='push' ||
      process.env.GITHUB_HEAD_COMMIT_MESSAGE!==PRECHECK_COMMIT) {
    throw new Error('BLOCKED: not the intentionally armed GitHub Actions preflight');
  }
  const genesis=await connection.getGenesisHash();
  if (genesis!==DEVNET_GENESIS) throw new Error('FATAL: NOT_SOLANA_DEVNET');
  const {spec,source}=derivePoWFaucet();
  const account=await connection.getAccountInfo(spec,'confirmed');
  if (!account||!account.owner.equals(POW_PROGRAM)) {
    throw new Error('BLOCKED: POW_FAUCET_SPEC_NOT_FOUND');
  }
  const parsed=parseFaucetSpec(account.data);
  const available=await connection.getBalance(source,'confirmed');
  log('POW_FAUCET_READ_ONLY_CHECK',{
    faucet:source.toBase58(),spec:spec.toBase58(),balanceLamports:available,
    faucetDifficulty:parsed.difficulty,faucetRewardLamports:parsed.amount.toString(),
    feePayerPublic:payer.publicKey.toBase58()});
  // Verify PoW program state BEFORE any attempt to obtain Devnet SOL.
  if (parsed.difficulty!==DIFFICULTY || parsed.amount!==BigInt(REWARD_LAMPORTS)) {
    throw new Error('BLOCKED: POW_FAUCET_PARAMETERS_CHANGED');
  }
  if (available<REWARD_LAMPORTS) {
    throw new Error('BLOCKED: POW_FAUCET_EMPTY');
  }

  let startingBalance=await connection.getBalance(payer.publicKey,'confirmed');
  if(startingBalance<5000) {
    log('POW_BOOTSTRAP_REQUIRED',{currentLamports:startingBalance,
      requirement:'PoW claim itself must pay a Devnet network fee'});
    // PoW CLI also calls a conventional Airdrop if the fee payer is empty.
    // Attempt ONCE with a minimal amount. Never retry, never pay real SOL.
    try {
      const sig=await connection.requestAirdrop(payer.publicKey,BOOTSTRAP_LAMPORTS);
      await connection.confirmTransaction(sig,'confirmed');
      log('FEE_BOOTSTRAP_AIRDROP_TX',{tx: sig});
    } catch(e) {
      log('FEE_BOOTSTRAP_AIRDROP_FAILED',{error:info(e)});
    }
    startingBalance=await connection.getBalance(payer.publicKey,'confirmed');
  }
  checkFundingGate({
    genesis,payerLamports:startingBalance,
    faucetLamports:available,spec:parsed});
  log('POW_BOOTSTRAP_CONFIRMED',{payerLamports:startingBalance});
  // Only grind nonce AFTER Devnet fee funding is confirmed.
  const deadline=Date.now()+120_000,MAX_ATTEMPTS=4_000_000;
  let mined,attempts=0;
  while(Date.now()<deadline && attempts<MAX_ATTEMPTS) {
    const candidate=Keypair.generate();
    attempts++;
    if(isValidProofAddress(candidate.publicKey)) {mined=candidate;break;}
  }
  if(!mined) throw new Error('BLOCKED: POW_MINING_TIMEOUT');
  log('POW_PROOF_FOUND',{iterations:attempts,proofPublic:mined.publicKey.toBase58()});
  const instruction=createPowClaim(payer.publicKey,mined.publicKey);
  const sig=await sendAndConfirmTransaction(
    connection,new Transaction().add(instruction),[payer,mined],{commitment:'confirmed'});
  const newBalance=await connection.getBalance(payer.publicKey,'confirmed');
  log('POW_CLAIM_RESULT',{tx:sig,payerBefore:startingBalance,payerAfter:newBalance,
    targetRewardLamports:REWARD_LAMPORTS,
    explorer:'https://explorer.solana.com/tx/'+sig+'?cluster=devnet'});
  if(newBalance<startingBalance + 1_000_000) {
    throw new Error('FAILED: POW_TX_CONFIRMED_BUT_REWARD_BALANCE_INSUFFICIENT');
  }
  log('POW_FUNDED_VERIFIED',{funded:true,
    caveat:'Disposable fee-payer key is RAM-only; mint is intentionally NOT started in this stage'});
}
main().catch(e=>{log('POW_FUNDING_STAGE_FAILED',{reason:info(e),mintStarted:false});
  process.exitCode=1;});
