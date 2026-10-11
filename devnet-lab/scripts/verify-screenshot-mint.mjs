/** Read-only on-chain verification of YORBI-T issuance screenshot. NO SIGNING. */
import {Connection,PublicKey} from '@solana/web3.js';
import {TOKEN_2022_PROGRAM_ID,getMint,getTokenMetadata,getAccount,getAssociatedTokenAddressSync} from '@solana/spl-token';
import {RPC,DEVNET_GENESIS,RECIPIENT,NAME,SYMBOL,DECIMALS,INITIAL_SUPPLY} from '../src/config.mjs';
const SIG='EzkeUZLn2vGNeoMP7G8BdScacSnxcXUA8CWq3tiLbxTFisJhYp9NnmTnw8ksoknWz5RSZQTMbbiTyPLURk3a5bW';
const connection=new Connection(RPC,'confirmed');
async function main(){
 if(await connection.getGenesisHash()!==DEVNET_GENESIS)throw Error('DEVNET GENESIS MISMATCH');
 const tx=await connection.getParsedTransaction(SIG,{commitment:'confirmed',maxSupportedTransactionVersion:0});
 if(!tx){console.log('CHAIN_VERIFY_JSON='+JSON.stringify({status:'INCONCLUSIVE_NOT_FOUND',signature:SIG})); process.exitCode=2; return}
 if(tx.meta?.err)throw Error('MINT_TX_ON_CHAIN_FAILED: '+JSON.stringify(tx.meta.err));
 const entries=[...(tx.meta?.postTokenBalances||[])];
 const one=entries.find(x=>x.owner===RECIPIENT&&x.uiTokenAmount?.amount===INITIAL_SUPPLY.toString()
  &&x.uiTokenAmount?.decimals===DECIMALS);
 if(!one){console.log('CHAIN_VERIFY_JSON='+JSON.stringify({status:'INCONCLUSIVE_NO_MATCHING_POST_TOKEN_BALANCE',signature:SIG,slot:tx.slot,balances:entries.map(({mint,owner,uiTokenAmount})=>({mint,owner,amount:uiTokenAmount?.amount}))}));process.exitCode=2;return}
 const mint=new PublicKey(one.mint);
 const mintState=await getMint(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID);
 const metadata=await getTokenMetadata(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID);
 const ata=getAssociatedTokenAddressSync(mint,new PublicKey(RECIPIENT),false,TOKEN_2022_PROGRAM_ID);
 const owned=await getAccount(connection,ata,'confirmed',TOKEN_2022_PROGRAM_ID);
 const checks={
  supply1000:mintState.supply===INITIAL_SUPPLY,
  walletOwns1000:owned.amount===INITIAL_SUPPLY,
  metadataName:metadata?.name===NAME,
  metadataSymbol:metadata?.symbol===SYMBOL,
  freezeDisabled:mintState.freezeAuthority===null
 };
 console.log('CHAIN_VERIFY_JSON='+JSON.stringify({status:Object.values(checks).every(Boolean)?'VERIFIED':'MISMATCH',
  signature:SIG,slot:tx.slot,mint:mint.toBase58(),ata:ata.toBase58(),owner:RECIPIENT,
  checks,mintAuthority:mintState.mintAuthority?.toBase58()??null,
  metadataUri:metadata?.uri??null,
  explorer:'https://explorer.solana.com/tx/'+SIG+'?cluster=devnet'}));
 if(!Object.values(checks).every(Boolean))process.exitCode=2;
}
main().catch(e=>{console.error('CHAIN_VERIFY_ERROR='+String(e?.message||e).slice(0,600));process.exitCode=1;});
