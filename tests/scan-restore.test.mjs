import test from "node:test";
import assert from "node:assert/strict";
import {SCAN_KEY,SCAN_TTL,SCAN_MAX,SCAN_PARTS,validSnapshot,applyPart,sameToken} from "../assets/scan-restore.mjs";
const now=Date.parse("2026-10-11T02:00:00Z");
const token="0x6982508145454Ce325dDbE47a25d4Ec3d2311933";
const base={version:1,savedAt:now-60000,scrollY:900,parts:{
 explorer:{chain:"ethereum",address:token,pair:{baseToken:{symbol:"PEPE"}},date:now-60000}
}};
test("recent lookup cache key is scoped and TTL is exactly twelve hours",()=>{
 assert.equal(SCAN_KEY,"yorbi:recent-scan:v1");
 assert.equal(SCAN_TTL,12*60*60*1000);
 assert.ok(SCAN_MAX>=500000);
});
test("recent valid chain/address snapshot survives a page re-entry",()=>{
 assert.equal(validSnapshot(base,now),true);
 assert.equal(base.scrollY,900);
});
test("expired snapshot is rejected, and timestamp from future cannot persist indefinitely",()=>{
 assert.equal(validSnapshot(base,now+SCAN_TTL),false);
 assert.equal(validSnapshot({...base,savedAt:now+2000},now),false);
});
test("missing token lookup or invalid shape cannot resurrect an empty lookup",()=>{
 assert.equal(validSnapshot({version:1,savedAt:now,parts:{}},now),false);
 assert.equal(validSnapshot({...base,parts:[]},now),false);
 assert.equal(validSnapshot({...base,parts:{explorer:null}},now),false);
 assert.equal(validSnapshot({...base,version:0},now),false);
});
test("creating the cache from an explorer result preserves the entire original record",()=>{
 const first=applyPart(null,"explorer",base.parts.explorer,now);
 assert.equal(first.parts.explorer.pair.baseToken.symbol,"PEPE");
 assert.equal(first.savedAt,now);
 assert.equal(validSnapshot(first,now+1000),true);
});
test("security, radar, deep and period updates preserve original explorer record",()=>{
 let next=applyPart(base,"security",{report:{risk:2}},now);
 next=applyPart(next,"radar",{last:{records:[{address:token}]}},now);
 next=applyPart(next,"deep",{output:{events:[]}},now);
 next=applyPart(next,"period","24h",now);
 assert.equal(next.parts.explorer.address,token);
 assert.equal(next.parts.security.report.risk,2);
 assert.equal(next.parts.radar.last.records.length,1);
 assert.deepEqual(next.parts.deep.output.events,[]);
 assert.equal(next.parts.period,"24h");
});
test("unrecognized section is never saved as a new field",()=>{
 assert.equal(applyPart(base,"privateKey","confidential",now),null);
 assert.deepEqual(SCAN_PARTS,["explorer","security","radar","deep","period","cex"]);
});
test("large deep analysis gracefully falls back to basic token and security record",()=>{
 const long="a".repeat(SCAN_MAX);
 const next=applyPart(base,"deep",{raw:long},now);
 assert.ok(next);
 assert.equal(next.parts.explorer.address,token);
 assert.equal(next.parts.deep,undefined);
 assert.equal(JSON.stringify(next).length<=SCAN_MAX,true);
});
test("saved scroll never goes negative and gets integer normalized",()=>{
 const first=applyPart({...base,scrollY:-99.25},"period","7d",now);
 assert.equal(first.scrollY,0);
 const next=applyPart({...base,scrollY:99.76},"period","7d",now);
 assert.equal(next.scrollY,99);
});
test("chain and token comparisons prevent restoring a different chain or token",()=>{
 const r=base.parts.explorer;
 assert.equal(sameToken(r,"ethereum",token.toLowerCase()),true);
 assert.equal(sameToken(r,"base",token),false);
 assert.equal(sameToken(r,"ethereum","0x"+"f".repeat(40)),false);
 assert.equal(sameToken(null,"ethereum",token),false);
});
test("no wallet secret, password or remote upload is part of persistence helper",()=>{
 assert.equal(SCAN_PARTS.includes("password"),false);
 assert.equal(SCAN_PARTS.includes("secretKey"),false);
 assert.equal(SCAN_PARTS.includes("privateKey"),false);
});
