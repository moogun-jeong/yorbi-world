/** One-off TEST TOKEN issuance; Solana Devnet ONLY. Re-running creates another test mint. */
import {Connection,Keypair,PublicKey,LAMPORTS_PER_SOL,SystemProgram,Transaction,sendAndConfirmTransaction} from '@solana/web3.js';
import {AuthorityType,ExtensionType,LENGTH_SIZE,TYPE_SIZE,TOKEN_2022_PROGRAM_ID,createInitializeMetadataPointerInstruction,createInitializeMintInstruction,getMintLen,getOrCreateAssociatedTokenAccount,getMint,getTokenMetadata,mintTo,transferChecked,setAuthority,getAccount} from '@solana/spl-token';
import {createInitializeInstruction,pack} from '@solana/spl-token-metadata';

const RPC='https://api.devnet.solana.com'; // Deliberately fixed; NEVER mainnet.
const BRANCH='experiment/yorbi-devnet-genesis-20261011';
const RECEIVER='5nhZYYpyrB8gMtmqBBSREyNTdn62u8QEo2T1mV8W4ckc';
const URI='https://raw.githubusercontent.com/moogun-jeong/yorbi-world/'+BRANCH+'/experiments/solana-devnet/metadata/yorbi-devnet.json';
const NAME='YORBI Devnet Trial', SYMBOL='YORBI-T', DECIMALS=6;
const AMOUNT=1000n*10n**6n;
const connection=new Connection(RPC,{commitment:'confirmed',confirmTransactionInitialTimeout:45000});
const payer=Keypair.generate(),mint=Keypair.generate(); // Ephemeral. NEVER write keys to GitHub.
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const txUrl=sig=>'https://explorer.solana.com/tx/'+sig+'?cluster=devnet';

async function main(){
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF_NAME!==BRANCH||
      process.env.GITHUB_EVENT_NAME!=='push'||
      process.env.GITHUB_HEAD_COMMIT_MESSAGE!=='ci: arm YORBI one-time Devnet genesis')
    throw Error('Aborted: requires intended one-off Devnet GitHub Actions push.');
  const recipient=new PublicKey(RECEIVER);
  const r=await fetch(URI,{signal:AbortSignal.timeout(15000)});
  if(!r.ok) throw Error('Public metadata URI unavailable: '+r.status);
  const data=await r.json();
  if(data.name!==NAME||data.symbol!==SYMBOL||!String(data.image).startsWith('https://'))
    throw Error('Invalid off-chain metadata JSON');
  console.log('NETWORK=Solana DEVNET only');
  console.log('RECIPIENT_PUBLIC='+RECEIVER);
  console.log('TEMPORARY_FEE_PAYER_PUBLIC='+payer.publicKey.toBase58());

  let funded=false;
  for(const sol of [1,0.5,0.2]){
    try{
      const sig=await connection.requestAirdrop(payer.publicKey,Math.round(sol*LAMPORTS_PER_SOL));
      await connection.confirmTransaction(sig,'confirmed');
      await sleep(1500);
      if(await connection.getBalance(payer.publicKey)>0.08*LAMPORTS_PER_SOL){funded=true;break;}
    }catch(e){
      console.log('Free Faucet '+sol+' SOL failed: '+String(e?.message||e).slice(0,180));
      await sleep(2000);
    }
  }
  if(!funded) throw Error('BLOCKED: official Devnet faucet refused. Zero real funds used. No mint created.');

  const meta={updateAuthority:payer.publicKey,mint:mint.publicKey,name:NAME,symbol:SYMBOL,uri:URI,additionalMetadata:[]};
  const mintSpace=getMintLen([ExtensionType.MetadataPointer]);
  const rent=await connection.getMinimumBalanceForRentExemption(mintSpace+TYPE_SIZE+LENGTH_SIZE+pack(meta).length);
  const createSig=await sendAndConfirmTransaction(connection,new Transaction().add(
    SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,
      lamports:rent,space:mintSpace,programId:TOKEN_2022_PROGRAM_ID}),
    createInitializeMetadataPointerInstruction(mint.publicKey,null,mint.publicKey,TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey,DECIMALS,payer.publicKey,null,TOKEN_2022_PROGRAM_ID)
  ),[payer,mint],{commitment:'confirmed'});
  console.log('MINT_PUBLIC='+mint.publicKey.toBase58());
  console.log('CREATE_TX='+createSig);

  const metadataSig=await sendAndConfirmTransaction(connection,new Transaction().add(
    createInitializeInstruction({programId:TOKEN_2022_PROGRAM_ID,metadata:mint.publicKey,
      updateAuthority:payer.publicKey,mint:mint.publicKey,mintAuthority:payer.publicKey,
      name:NAME,symbol:SYMBOL,uri:URI})
  ),[payer],{commitment:'confirmed'});
  console.log('METADATA_TX='+metadataSig);

  const from=await getOrCreateAssociatedTokenAccount(connection,payer,mint.publicKey,payer.publicKey,
    false,'confirmed',undefined,TOKEN_2022_PROGRAM_ID);
  const to=await getOrCreateAssociatedTokenAccount(connection,payer,mint.publicKey,recipient,
    false,'confirmed',undefined,TOKEN_2022_PROGRAM_ID);
  const mintSig=await mintTo(connection,payer,mint.publicKey,from.address,payer,AMOUNT,[],
    {commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
  console.log('MINT_TO_TEST_SENDER_TX='+mintSig);
  const transferSig=await transferChecked(connection,payer,from.address,mint.publicKey,
    to.address,payer,AMOUNT,DECIMALS,[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
  console.log('SEND_1000_TO_PHANTOM_TX='+transferSig);

  const revokeSig=await setAuthority(connection,payer,mint.publicKey,payer,AuthorityType.MintTokens,
    null,[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
  console.log('MINT_AUTHORITY_REVOKE_TX='+revokeSig);

  const info=await getMint(connection,mint.publicKey,'confirmed',TOKEN_2022_PROGRAM_ID);
  const sender=await getAccount(connection,from.address,'confirmed',TOKEN_2022_PROGRAM_ID);
  const receiver=await getAccount(connection,to.address,'confirmed',TOKEN_2022_PROGRAM_ID);
  const metadata=await getTokenMetadata(connection,mint.publicKey,'confirmed',TOKEN_2022_PROGRAM_ID);
  if(info.supply!==AMOUNT||info.mintAuthority!==null||info.freezeAuthority!==null||
     sender.amount!==0n||receiver.amount!==AMOUNT||metadata?.name!==NAME||
     metadata?.symbol!==SYMBOL||metadata?.uri!==URI) throw Error('On-chain verification failed');
  console.log('RESULT_JSON='+JSON.stringify({
    status:'VERIFIED_DEVNET',mint:mint.publicKey.toBase58(),receiver:RECEIVER,received:1000,
    supply:1000,symbol:SYMBOL,program:'Token-2022',mintAuthority:null,freezeAuthority:null,
    receiverTokenAccount:to.address.toBase58(),metadataURI:URI,
    mintURL:'https://explorer.solana.com/address/'+mint.publicKey.toBase58()+'?cluster=devnet',
    transferURL:txUrl(transferSig),revokeURL:txUrl(revokeSig)
  }));
  console.log('SUCCESS: 1000 DEVNET TEST TOKENS SENT, AUTHORITIES VERIFIED.');
}
main().catch(e=>{
  // Do not print signer objects or transactions containing secrets.
  console.error('FAILED_DEVNET_GENESIS: '+String(e?.message||e).slice(0,550));
  process.exitCode=1;
});