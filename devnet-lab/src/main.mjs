/** Phantom-signed Solana Devnet ONLY YORBI trial. Never store seed phrases/private keys. */
import {Buffer} from 'buffer';
import {RPC,DEVNET_GENESIS,RECIPIENT,NAME,SYMBOL,DECIMALS,INITIAL_SUPPLY,TRANSFER_AMOUNT,MIN_LAMPORTS,URI,assertDevnet,assertKnownWallet,assertBalance,tokenUrl,txUrl} from './config.mjs';
globalThis.Buffer ??= Buffer;
const {Connection,Keypair,PublicKey,SystemProgram,Transaction}=await import('@solana/web3.js');
const {TOKEN_2022_PROGRAM_ID,ExtensionType,getMintLen,LENGTH_SIZE,TYPE_SIZE,
  createInitializeMetadataPointerInstruction,createInitializeMintInstruction,
  getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,createTransferCheckedInstruction,
  createSetAuthorityInstruction,AuthorityType,getMint,getTokenMetadata,getAccount}
  =await import('@solana/spl-token');
const {createInitializeInstruction,pack}=await import('@solana/spl-token-metadata');

const connection=new Connection(RPC,{commitment:'confirmed',confirmTransactionInitialTimeout:55000});
const $=id=>document.getElementById(id);
const state={wallet:null,provider:null,mint:null,balance:0,busy:false};
const STORAGE_KEY='yorbi.solana.devnet.publicmint.v1';
const buttonIds=['connect','balance','create','issue','send','revoke','verify'];
function say(message){
  $('log').textContent+='['+new Date().toLocaleTimeString('ko-KR')+'] '+message+'\n';
  $('log').scrollTop=$('log').scrollHeight;
}
function addLink(title,url){
  const a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';
  a.rel='noopener noreferrer';$('mintlinks').appendChild(a);
}
function controls(){
  for(const id of buttonIds)$(id).disabled=state.busy;
  if(state.busy)return;
  $('balance').disabled=!state.wallet;
  $('create').disabled=!state.wallet||!!state.mint||state.balance<MIN_LAMPORTS;
  for(const id of ['issue','send','revoke','verify'])$(id).disabled=!state.wallet||!state.mint;
}
function phantom(){
  const p=window.phantom?.solana||window.solana;
  if(!p?.isPhantom||typeof p.connect!=='function'||typeof p.signTransaction!=='function'){
    throw Error('Phantom을 찾지 못했습니다. 아이폰에서는 Phantom 앱 내부 브라우저를 이용해주세요.');
  }
  return p;
}
async function gate(){
  assertDevnet(await connection.getGenesisHash());
  if(!state.provider?.isConnected||!state.wallet)throw Error('Phantom 지갑 연결이 필요합니다.');
  assertKnownWallet(state.wallet.toBase58());
  if(state.provider.publicKey?.toBase58()!==RECIPIENT)throw Error('연결된 지갑 주소가 변경되었습니다.');
}
async function balance(){
  await gate();
  state.balance=await connection.getBalance(state.wallet,'confirmed');
  $('funds').textContent='현재 Devnet SOL: '+(state.balance/1e9).toFixed(6)+'개 (실제 가치 0원)';
  say('Devnet SOL 잔액 확인: '+(state.balance/1e9).toFixed(6));
  controls();
  return state.balance;
}
async function signedTransaction(transaction,otherSigners=[]){
  await gate();
  const latest=await connection.getLatestBlockhash('confirmed');
  transaction.feePayer=state.wallet;transaction.recentBlockhash=latest.blockhash;
  if(otherSigners.length)transaction.partialSign(...otherSigners);
  const signed=await state.provider.signTransaction(transaction);
  const signature=await connection.sendRawTransaction(signed.serialize(),{
    skipPreflight:false,maxRetries:2
  });
  const confirmed=await connection.confirmTransaction({...latest,signature},'confirmed');
  if(confirmed.value.err)throw Error('온체인 거래 실패: '+JSON.stringify(confirmed.value.err));
  addLink('Devnet 거래 확인 ↗',txUrl(signature));
  say('거래 성공: '+signature);
  return signature;
}
async function currentMint(){
  await gate();
  if(!state.mint)throw Error('연습용 Mint가 아직 없습니다.');
  const info=await getMint(connection,state.mint,'confirmed',TOKEN_2022_PROGRAM_ID);
  if(info.decimals!==DECIMALS)throw Error('예상과 다른 토큰 decimals');
  return info;
}
async function verify(){
  const info=await currentMint();
  const ata=getAssociatedTokenAddressSync(state.mint,state.wallet,false,TOKEN_2022_PROGRAM_ID);
  let owned=0n;
  try {owned=(await getAccount(connection,ata,'confirmed',TOKEN_2022_PROGRAM_ID)).amount;}
  catch(e){if(!/not found|could not find account/i.test(String(e?.message||e)))throw e;}
  const meta=await getTokenMetadata(connection,state.mint,'confirmed',TOKEN_2022_PROGRAM_ID);
  const ok=meta?.name===NAME&&meta?.symbol===SYMBOL&&meta?.uri===URI;
  const result='총발행 '+(Number(info.supply)/10**DECIMALS)+
   '개 | 내 잔액 '+(Number(owned)/10**DECIMALS)+
   '개 | 추가 발행 '+(info.mintAuthority?'가능':'불가능')+
   ' | 동결 '+(info.freezeAuthority?'가능':'불가능')+
   ' | 메타데이터 '+(ok?'정상':'재검토');
  $('verify-result').textContent=result;say('검증: '+result);
  return {info,owned,ok};
}
async function action(title,fn){
  if(state.busy)return;
  state.busy=true;controls();say('시작: '+title);
  try {await fn();}
  catch(e){say('중단: '+String(e?.message||e));}
  finally {state.busy=false;controls();}
}
$('connect').addEventListener('click',()=>action('Phantom 연결',async()=>{
  assertDevnet(await connection.getGenesisHash());
  const p=phantom();const result=await p.connect();
  assertKnownWallet(result.publicKey.toBase58());
  state.wallet=result.publicKey;state.provider=p;
  $('wallet').textContent='연결됨: '+state.wallet.toBase58();
  say('Phantom 공개 주소 연결 완료');
  const previous=localStorage.getItem(STORAGE_KEY);
  if(previous){
    try {
      const address=new PublicKey(previous);
      await getMint(connection,address,'confirmed',TOKEN_2022_PROGRAM_ID);
      state.mint=address;
      $('mint').textContent=address.toBase58();
      addLink('저장된 Devnet Mint 보기 ↗',tokenUrl(address.toBase58()));
    } catch {localStorage.removeItem(STORAGE_KEY);}
  }
  await balance();
}));
$('balance').addEventListener('click',()=>action('Devnet SOL 잔액 확인',balance));
$('create').addEventListener('click',()=>action('YORBI-T 토큰 계정 및 메타데이터 생성',async()=>{
  await gate();assertBalance(await connection.getBalance(state.wallet,'confirmed'));
  if(state.mint)throw Error('이미 이 브라우저에 발행용 민트가 있습니다.');
  if(!window.confirm('실제 가치가 없는 Solana DEVNET 테스트 YORBI-T를 만들까요?'))return;
  const mint=Keypair.generate();
  const metadata={updateAuthority:state.wallet,mint:mint.publicKey,name:NAME,symbol:SYMBOL,uri:URI,additionalMetadata:[]};
  const space=getMintLen([ExtensionType.MetadataPointer]);
  const rent=await connection.getMinimumBalanceForRentExemption(space+TYPE_SIZE+LENGTH_SIZE+pack(metadata).length);
  const transaction=new Transaction().add(
    SystemProgram.createAccount({fromPubkey:state.wallet,newAccountPubkey:mint.publicKey,
      lamports:rent,space,programId:TOKEN_2022_PROGRAM_ID}),
    createInitializeMetadataPointerInstruction(mint.publicKey,state.wallet,mint.publicKey,TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey,DECIMALS,state.wallet,null,TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({programId:TOKEN_2022_PROGRAM_ID,metadata:mint.publicKey,
      updateAuthority:state.wallet,mint:mint.publicKey,mintAuthority:state.wallet,name:NAME,symbol:SYMBOL,uri:URI})
  );
  say('Phantom 승인 필요: 토큰 생성용 '+(rent/1e9).toFixed(6)+' Devnet SOL 계정 예치금');
  await signedTransaction(transaction,[mint]);
  state.mint=mint.publicKey;localStorage.setItem(STORAGE_KEY,mint.publicKey.toBase58());
  $('mint').textContent=mint.publicKey.toBase58();
  addLink('발행 토큰 보기 ↗',tokenUrl(mint.publicKey.toBase58()));
  say('성공: 테스트 토큰 메타데이터 등록. 다음 버튼으로 1,000개 발행하세요.');
  await balance();
}));
$('issue').addEventListener('click',()=>action('YORBI-T 1,000개 발행',async()=>{
  const info=await currentMint();
  if(info.supply!==0n)throw Error('중복 발행 방지: 이미 공급량이 존재합니다.');
  if(info.mintAuthority?.toBase58()!==RECIPIENT)throw Error('내 Phantom 계정이 발행 권한자가 아닙니다.');
  if(!window.confirm('Solana Devnet에서 YORBI-T 1,000개를 내 Phantom 지갑에 발행할까요?'))return;
  const ata=getAssociatedTokenAddressSync(state.mint,state.wallet,false,TOKEN_2022_PROGRAM_ID);
  const transaction=new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(state.wallet,ata,state.wallet,state.mint,TOKEN_2022_PROGRAM_ID),
    createMintToCheckedInstruction(state.mint,ata,state.wallet,INITIAL_SUPPLY,DECIMALS,[],TOKEN_2022_PROGRAM_ID)
  );
  await signedTransaction(transaction);
  const result=await verify();
  if(result.info.supply!==INITIAL_SUPPLY)throw Error('발행 공급량 1,000개 검증 실패');
  say('성공: 내 Phantom 주소로 YORBI-T 1,000개 발행.');
}));
$('send').addEventListener('click',()=>action('다른 Devnet 지갑으로 10개 전송',async()=>{
  const info=await currentMint();
  if(info.supply!==INITIAL_SUPPLY)throw Error('예상과 다른 전체 공급량');
  const other=new PublicKey($('destination').value.trim());
  if(other.equals(state.wallet))throw Error('다른 Solana 지갑 주소를 입력하세요.');
  if(!PublicKey.isOnCurve(other.toBytes()))throw Error('일반 Solana 공개키를 입력하세요.');
  const from=getAssociatedTokenAddressSync(state.mint,state.wallet,false,TOKEN_2022_PROGRAM_ID);
  const account=await getAccount(connection,from,'confirmed',TOKEN_2022_PROGRAM_ID);
  if(account.amount<TRANSFER_AMOUNT)throw Error('YORBI-T 10개 이상이 필요합니다.');
  const to=getAssociatedTokenAddressSync(state.mint,other,false,TOKEN_2022_PROGRAM_ID);
  if(!window.confirm(other.toBase58()+' 공개 주소로 YORBI-T 테스트 토큰 10개를 전송할까요?'))return;
  await signedTransaction(new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(state.wallet,to,other,state.mint,TOKEN_2022_PROGRAM_ID),
    createTransferCheckedInstruction(from,state.mint,to,state.wallet,TRANSFER_AMOUNT,DECIMALS,[],TOKEN_2022_PROGRAM_ID)
  ));
  await verify();
  say('성공: Devnet 테스트 토큰 10개 전송.');
}));
$('revoke').addEventListener('click',()=>action('Mint Authority 폐기',async()=>{
  const info=await currentMint();
  if(info.supply!==INITIAL_SUPPLY)throw Error('1,000개 발행 후에만 권한을 폐기할 수 있습니다.');
  if(info.mintAuthority===null){say('이미 발행 권한이 없습니다.');return;}
  if(info.mintAuthority.toBase58()!==RECIPIENT)throw Error('발행 권한 계정 불일치');
  if(!window.confirm('Mint Authority를 영구 폐기할까요? 되돌릴 수 없습니다.'))return;
  await signedTransaction(new Transaction().add(
    createSetAuthorityInstruction(state.mint,state.wallet,AuthorityType.MintTokens,null,[],TOKEN_2022_PROGRAM_ID)
  ));
  const checked=await currentMint();
  if(checked.mintAuthority!==null)throw Error('추가 발행 권한 검증 실패');
  say('성공: 추가 발행 권한 영구 폐기.');
  await verify();
}));
$('verify').addEventListener('click',()=>action('온체인 공급량·메타데이터·권한 확인',verify));
say('준비 완료. Phantom 앱 내부 브라우저에서 연결하세요. 메인넷 거래는 차단됩니다.');
controls();
