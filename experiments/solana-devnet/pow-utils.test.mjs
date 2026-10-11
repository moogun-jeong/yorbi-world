import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair} from '@solana/web3.js';
import {DEVNET_GENESIS,DIFFICULTY,REWARD_LAMPORTS,POW_PROGRAM,
  derivePoWFaucet,parseFaucetSpec,checkFundingGate,isValidProofAddress} from './pow-utils.mjs';

test('PoW program PDA and faucet source are valid public keys',()=>{
  const {spec,source}=derivePoWFaucet();
  assert.equal(spec.toBuffer().length,32);
  assert.equal(source.toBuffer().length,32);
  assert.notEqual(spec.toBase58(),source.toBase58());
  assert.equal(POW_PROGRAM.toBase58(),'PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL');
});

test('faucet account spec decode validates difficulty and reward',()=>{
  const data=Buffer.alloc(17);
  data.writeUInt8(DIFFICULTY,8);
  data.writeBigUInt64LE(BigInt(REWARD_LAMPORTS),9);
  assert.deepEqual(parseFaucetSpec(data),{
    difficulty:3,amount:20_000_000n});
  assert.throws(()=>parseFaucetSpec(Buffer.alloc(2)),/length/);
});

test('safety gate blocks mainnet genesis',()=>{
  assert.throws(()=>checkFundingGate({
    genesis:'mainnet',payerLamports:2_000_000,faucetLamports:100_000_000,
    spec:{difficulty:3,amount:20_000_000n}}),/NOT_SOLANA_DEVNET/);
});

test('safety gate blocks zero payer even when PoW faucet has funds',()=>{
  assert.throws(()=>checkFundingGate({
    genesis:DEVNET_GENESIS,payerLamports:0,faucetLamports:100_000_000,
    spec:{difficulty:3,amount:20_000_000n}}),/POW_NEEDS_FEE_PAYER_BOOTSTRAP/);
});

test('safety gate blocks mismatched faucet and empty source',()=>{
  const args={genesis:DEVNET_GENESIS,payerLamports:5000,
    faucetLamports:100_000_000,spec:{difficulty:3,amount:20_000_000n}};
  assert.throws(()=>checkFundingGate({...args,
    spec:{difficulty:4,amount:20_000_000n}}),/POW_SPEC_MISMATCH/);
  assert.throws(()=>checkFundingGate({...args,faucetLamports:1}),/POW_FAUCET_EMPTY/);
  assert.equal(checkFundingGate(args),true);
});

test('regular keypairs do not automatically satisfy three-A prefix',()=>{
  const kp=Keypair.generate();
  assert.equal(isValidProofAddress(kp.publicKey),
    kp.publicKey.toBase58().startsWith('AAA'));
});
