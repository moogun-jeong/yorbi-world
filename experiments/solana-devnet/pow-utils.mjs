import {createHash} from 'node:crypto';
import {PublicKey, SystemProgram, TransactionInstruction} from '@solana/web3.js';

export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const RPC = 'https://api.devnet.solana.com';
export const POW_PROGRAM = new PublicKey('PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL');
export const DIFFICULTY = 3;
export const REWARD_LAMPORTS = 20_000_000; // 0.02 DEVNET SOL, per official faucet documentation.
export const BOOTSTRAP_LAMPORTS = 2_000_000; // 0.002 DEVNET SOL; ONE try only, no loops.
export const BRANCH = 'experiment/yorbi-devnet-genesis-20261011';
export const PRECHECK_COMMIT = 'ci: probe PoW funding prerequisites only';

export function derivePoWFaucet() {
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(REWARD_LAMPORTS));
  const [spec] = PublicKey.findProgramAddressSync(
    [Buffer.from('spec'),Buffer.from([DIFFICULTY]),amount], POW_PROGRAM);
  const [source] = PublicKey.findProgramAddressSync(
    [Buffer.from('source'),spec.toBuffer()],POW_PROGRAM);
  return {spec,source};
}

export function parseFaucetSpec(accountData) {
  if(!Buffer.isBuffer(accountData)||accountData.length<17)
    throw new Error('Invalid PoW faucet spec account length');
  return {
    difficulty:accountData.readUInt8(8),
    amount:accountData.readBigUInt64LE(9)
  };
}

export function checkFundingGate({genesis,payerLamports,faucetLamports,spec}) {
  if(genesis!==DEVNET_GENESIS) throw new Error('FATAL: NOT_SOLANA_DEVNET');
  if(spec.difficulty!==DIFFICULTY || spec.amount!==BigInt(REWARD_LAMPORTS))
    throw new Error('FATAL: POW_SPEC_MISMATCH');
  if(faucetLamports<REWARD_LAMPORTS) throw new Error('BLOCKED: POW_FAUCET_EMPTY');
  if(payerLamports<5000) throw new Error('BLOCKED: POW_NEEDS_FEE_PAYER_BOOTSTRAP');
  return true;
}

export function isValidProofAddress(pubkey) {
  return pubkey.toBase58().startsWith('A'.repeat(DIFFICULTY));
}

export function createPowClaim(payerPubkey,proofPubkey) {
  if(!isValidProofAddress(proofPubkey)) throw new Error('PoW proof key is invalid');
  const {spec,source}=derivePoWFaucet();
  const [receipt]=PublicKey.findProgramAddressSync(
    [Buffer.from('receipt'),proofPubkey.toBuffer(),Buffer.from([DIFFICULTY])], POW_PROGRAM);
  // Anchor 0.27 instruction discriminator: first eight bytes of sha256('global:airdrop')
  const discriminator=createHash('sha256').update('global:airdrop').digest().subarray(0,8);
  return new TransactionInstruction({
    programId:POW_PROGRAM,
    keys:[
      {pubkey:payerPubkey,isSigner:true,isWritable:true},
      {pubkey:proofPubkey,isSigner:true,isWritable:false},
      {pubkey:receipt,isSigner:false,isWritable:true},
      {pubkey:spec,isSigner:false,isWritable:false},
      {pubkey:source,isSigner:false,isWritable:true},
      {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
    ],
    data:discriminator,
  });
}
