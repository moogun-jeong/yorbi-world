import test from "node:test";
import assert from "node:assert/strict";
import {TRACKER_HOSTS,apiUrl,addressUrl,txUrl,percentOfSupply,
 sampleWallets,transferSummary,directTokenLinks,shortAddress,compactToken} from "../assets/wallet-radar.mjs";

const token="0x6982508145454ce325ddbe47a25d4ec3d2311933";
const creator="0x1234567890123456789012345678901234567890";
const whale="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const reserve="0x0000000000000000000000000000000000000002";
const hash="0x"+"a".repeat(64);
function move(from,to,value="25000000000000000000",address=token,id=hash){
 return {from:{hash:from},to:{hash:to},token:{address_hash:address,decimals:"18"},
   total:{decimals:"18",value},transaction_hash:id,
   timestamp:"2026-10-11T00:00:00.000000Z"};
}
test("only allowlisted Ethereum and Base Blockscout URLs are generated",()=>{
 assert.equal(TRACKER_HOSTS.ethereum,"https://eth.blockscout.com");
 assert.equal(apiUrl("ethereum","holders",token),"https://eth.blockscout.com/api/v2/tokens/"+token+"/holders");
 assert.equal(apiUrl("base","token",token),"https://base.blockscout.com/api/v2/tokens/"+token);
 assert.equal(apiUrl("ethereum","transfers",creator,token),"https://eth.blockscout.com/api/v2/addresses/"+creator+"/token-transfers?token="+token);
 assert.equal(apiUrl("bsc","holders",token),null);
 assert.equal(apiUrl("solana","token",token),null);
});
test("reject malformed address and transaction links",()=>{
 assert.equal(addressUrl("base","0x<script>"),null);
 assert.equal(apiUrl("ethereum","transfers",creator,"PEPE"),null);
 assert.equal(txUrl("ethereum","0x1234"),null);
 assert.equal(txUrl("ethereum",hash),"https://eth.blockscout.com/tx/"+hash);
 assert.equal(shortAddress(creator),"0x123456…567890");
});
test("raw on-chain token balances are percentage of exact token supply",()=>{
 assert.equal(percentOfSupply("250","1000"),25);
 assert.equal(percentOfSupply("101","1000"),10.1);
 assert.equal(percentOfSupply("foo","1000"),null);
 assert.equal(percentOfSupply("100","0"),null);
});
test("filter known contracts, tagged exchanges and burned addresses from candidate holder sample",()=>{
 const holders={items:[
  {address:{hash:reserve,is_contract:true,name:"UniswapV3Pool"},value:"500"},
  {address:{hash:"0xf977814e90da44bfa03b6295a0616a897441acec",is_contract:false,metadata:{tags:[{name:"Binance: Hot Wallet 20"}]}},value:"400"},
  {address:{hash:whale,is_contract:false,metadata:null},value:"300"},
  {address:{hash:creator,is_contract:false},value:"200"}
 ],next_page_params:{value:"123"}};
 const report=sampleWallets(holders,{total_supply:"1000"},3);
 assert.equal(report.selected.length,2);
 assert.equal(report.selected[0].rank,3);
 assert.equal(report.selected[0].share,30);
 assert.equal(report.excludedCount,2);
 assert.equal(report.sourceCount,4);
 assert.equal(report.truncated,true);
});
test("do not relabel unlabeled addresses as developer-controlled wallets",()=>{
 const report=sampleWallets({items:[{address:{hash:whale,is_contract:false},value:"100"}]}, {total_supply:"1000"});
 assert.equal(report.selected[0].label,null);
 assert.equal(report.selected[0].knownService,false);
});
test("transfer counts represent actual token movements only, never swaps or buy/sell",()=>{
 const rows=[move(creator,whale),move(whale,creator,"10000000000000000000","0x1111111111111111111111111111111111111111"),
 move(whale,reserve,"5000000000000000000",token,"0x"+"b".repeat(64))];
 const r=transferSummary({items:rows},whale,token);
 assert.equal(r.received,1);assert.equal(r.sent,1);
 assert.equal(r.inAmount,25);assert.equal(r.outAmount,5);
 assert.equal(r.sampleEvents,2);
 assert.equal(r.recent[0].direction,"in");
});
test("pagination changes the bounded-sample label without claiming all history",()=>{
 const r=transferSummary({items:[move(creator,whale)],next_page_params:{block_number:100}},whale,token);
 assert.equal(r.partial,true);assert.equal(r.sampleEvents,1);
});
test("bad or unsupported amount precision is explicitly unknown",()=>{
 const r=transferSummary({items:[{...move(creator,whale),total:{value:"not-a-number",decimals:"18"}}]},whale,token);
 assert.equal(r.inAmount,null);assert.equal(r.received,1);
});
test("creator-to-whale direct token transfers require matching addresses and token",()=>{
 const items=[move(creator,whale),move(creator,whale,"1000000000000000000","0x1111111111111111111111111111111111111111","0x"+"b".repeat(64)),
 move(reserve,whale,"1000000000000000000",token,"0x"+"c".repeat(64))];
 const links=directTokenLinks(items,creator,[{address:whale}],token,"ethereum");
 assert.equal(links.length,1);
 assert.equal(links[0].url,"https://eth.blockscout.com/tx/"+hash);
 assert.equal(links[0].amount,25);
});
test("shared DEX router does not generate a wallet-owner relationship",()=>{
 const dex="0x4444444444444444444444444444444444444444";
 const items=[move(creator,dex),move(whale,dex,"20000000000000000000",token,"0x"+"b".repeat(64))];
 assert.deepEqual(directTokenLinks(items,creator,[whale],token,"ethereum"),[]);
});
test("empty first-page evidence cannot prove no prior developer sales",()=>{
 const result=transferSummary({items:[],next_page_params:{some:"next"}},creator,token);
 assert.equal(result.sent,0);assert.equal(result.partial,true);
});
test("compact token quantities are approximate, never a cash-out prediction",()=>{
 assert.equal(compactToken(null),"—");
 assert.equal(compactToken(1500000),"~1.50M");
 assert.equal(compactToken(0),"~0");
});
