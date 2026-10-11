/** Read-only Solana Devnet PoW faucet inventory. Zero transactions and zero token mints. */
import {Connection,PublicKey} from '@solana/web3.js';
import {DEVNET_GENESIS,RPC,POW_PROGRAM,parseFaucetSpec} from './pow-utils.mjs';
const connection=new Connection(RPC,'confirmed');
const parse=(n)=>Math.round(n/1e9*10000)/10000;
async function main(){
  const genesis=await connection.getGenesisHash();
  if(genesis!==DEVNET_GENESIS) throw Error('NOT_SOLANA_DEVNET');
  // Program account format is Anchor 8-byte discriminator + u8 difficulty + u64 reward.
  const accounts=await connection.getProgramAccounts(POW_PROGRAM,{
    commitment:'confirmed',filters:[{dataSize:17}]});
  const candidates=[];
  for(const {pubkey,account} of accounts.slice(0,100)){
    if(!account.owner.equals(POW_PROGRAM))continue;
    const {difficulty,amount}=parseFaucetSpec(account.data);
    const [source]=PublicKey.findProgramAddressSync(
      [Buffer.from('source'),pubkey.toBuffer()],POW_PROGRAM);
    candidates.push({difficulty,rewardLamports:Number(amount),
      source:source.toBase58(),spec:pubkey.toBase58()});
  }
  // Batch source lookups rather than a loop of unauthenticated rate-limited calls.
  const balances=[];
  for(let i=0;i<candidates.length;i+=20){
    const slice=candidates.slice(i,i+20);
    const infos=await connection.getMultipleAccountsInfo(slice.map(c=>new PublicKey(c.source)),'confirmed');
    for(let j=0;j<slice.length;j++) balances.push(infos[j]?.lamports??0);
  }
  const listing=candidates.map((x,i)=>({...x,balanceLamports:balances[i],
    canPay:balances[i]>=x.rewardLamports && x.rewardLamports>0,
    isPractical:x.difficulty<=3&&x.rewardLamports>=5_000_000
      && balances[i]>=x.rewardLamports}));
  console.log('POW_DISCOVERY_JSON='+JSON.stringify({status:'READ_ONLY',network:'devnet',
    candidates:listing.sort((a,b)=>Number(b.isPractical)-Number(a.isPractical)
      || a.difficulty-b.difficulty || b.rewardLamports-a.rewardLamports)}));
  console.log('POW_DISCOVERY_SUMMARY='+JSON.stringify({
    total:listing.length,funded:listing.filter(x=>x.canPay).length,
    practical:listing.filter(x=>x.isPractical).length}));
}
main().catch(e=>{console.error('POW_DISCOVERY_ERROR='+String(e?.message||e).slice(0,250));process.exitCode=1});
