/** Read-only on-chain verification via holder's Token-2022 account. NO SIGNING. */
import {Connection,PublicKey} from '@solana/web3.js';
import {TOKEN_2022_PROGRAM_ID,getMint,getTokenMetadata} from '@solana/spl-token';
import {RPC,DEVNET_GENESIS,RECIPIENT,NAME,SYMBOL,DECIMALS,INITIAL_SUPPLY} from '../src/config.mjs';
const SIG='EzkeUZLn2vGNeoMP7G8BdScacSnxcXUA8CWq3tiLbxTFisJhYp9NnmTnw8ksoknWz5RSZQTMbbiTyPLURk3a5bW';
const connection=new Connection(RPC,'confirmed');
async function main(){
 if(await connection.getGenesisHash()!==DEVNET_GENESIS)throw Error('DEVNET GENESIS MISMATCH');
 const owner=new PublicKey(RECIPIENT);
 let tx=null;
 try {tx=await connection.getParsedTransaction(SIG,{commitment:'confirmed',maxSupportedTransactionVersion:0});}
 catch(e){console.log('TRANSACTION_LOOKUP_WARNING='+String(e?.message||e).slice(0,180))}
 const accounts=await connection.getParsedTokenAccountsByOwner(owner,{programId:TOKEN_2022_PROGRAM_ID},'confirmed');
 console.log('DEVNET_TOKEN2022_ACCOUNTS='+accounts.value.length);
 const candidates=accounts.value.map(a=>({account:a.pubkey.toBase58(),mint:a.account.data.parsed?.info?.mint,
   amount:a.account.data.parsed?.info?.tokenAmount?.amount}))
   .filter(x=>x.mint&&x.amount&&BigInt(x.amount)>0n);
 let matched=null;
 for(const a of candidates.slice(0,40)){
   const mint=new PublicKey(a.mint);
   const info=await getMint(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID);
   if(info.decimals!==DECIMALS || info.supply!==INITIAL_SUPPLY)continue;
   const metadata=await getTokenMetadata(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID);
   if(metadata?.name!==NAME||metadata?.symbol!==SYMBOL)continue;
   matched={mint:a.mint,account:a.account,owner:RECIPIENT,balanceRaw:a.amount,
     supplyRaw:info.supply.toString(),decimals:info.decimals,
     mintAuthority:info.mintAuthority?.toBase58()??null,
     freezeAuthority:info.freezeAuthority?.toBase58()??null,
     metadataName:metadata.name,metadataSymbol:metadata.symbol,metadataUri:metadata.uri};
   break;
 }
 if(!matched){
   console.log('CHAIN_VERIFY_JSON='+JSON.stringify({status:'INCONCLUSIVE_NO_MATCHING_YORBI_TOKEN',
     txFound:!!tx,numberOfToken2022Accounts:accounts.value.length,
     detectedTokens:candidates.slice(0,10).map(x=>({mint:x.mint,amount:x.amount}))}));
   process.exitCode=2;return;
 }
 const checks={
  supply1000:matched.supplyRaw===INITIAL_SUPPLY.toString(),
  walletOwns1000:matched.balanceRaw===INITIAL_SUPPLY.toString(),
  metadataName:matched.metadataName===NAME,
  metadataSymbol:matched.metadataSymbol===SYMBOL,
  freezeDisabled:matched.freezeAuthority===null
 };
 console.log('CHAIN_VERIFY_JSON='+JSON.stringify({...matched,
    status:Object.values(checks).every(Boolean)?'VERIFIED':'MISMATCH',
    transactionLookupFound:!!tx,checks,
    explorerMint:'https://explorer.solana.com/address/'+matched.mint+'?cluster=devnet',
    explorerTx:'https://explorer.solana.com/tx/'+SIG+'?cluster=devnet'}));
 if(!Object.values(checks).every(Boolean))process.exitCode=2;
}
main().catch(e=>{console.error('CHAIN_VERIFY_ERROR='+String(e?.message||e).slice(0,600));process.exitCode=1;});
