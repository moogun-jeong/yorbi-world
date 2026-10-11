import test from 'node:test'; import assert from 'node:assert/strict';
import {RPC,DEVNET_GENESIS,RECIPIENT,INITIAL_SUPPLY,MIN_LAMPORTS,NAME,SYMBOL,assertDevnet,assertKnownWallet,assertBalance,txUrl,tokenUrl} from '../src/config.mjs';
test('Devnet RPC and genesis forced',()=>{assert.equal(RPC,'https://api.devnet.solana.com');assertDevnet(DEVNET_GENESIS);assert.throws(()=>assertDevnet('mainnet'),/Devnet/)});
test('Phantom address must match',()=>{assertKnownWallet(RECIPIENT);assert.throws(()=>assertKnownWallet('other'),/주소/)});
test('Trial name, symbol and supply fixed',()=>{assert.equal(INITIAL_SUPPLY,1000000000n);assert.equal(NAME,'YORBI Devnet Trial');assert.equal(SYMBOL,'YORBI-T');assert.equal(MIN_LAMPORTS,30000000)});
test('Funding threshold cannot be bypassed',()=>{assert.throws(()=>assertBalance(0),/부족/);assert.throws(()=>assertBalance(29999999),/부족/);assertBalance(30000000)});
test('Explorer links enforce Devnet',()=>{assert.match(txUrl('abc'),/cluster=devnet$/);assert.match(tokenUrl('abc'),/cluster=devnet$/)});
