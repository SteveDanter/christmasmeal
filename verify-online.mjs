import {verifyFlow} from './verify-flow.mjs';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './dist/server/index.js';
const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync('drizzle/0000_friendly_gwen_stacy.sql','utf8'));
const env={ADMIN_EMAIL:'owner@example.com',DB:{prepare(query){let values=[];return {bind(...args){values=args;return this;},async first(){return sql.prepare(query).get(...values);},async run(){const result=sql.prepare(query).run(...values);return {meta:{changes:result.changes}};}};}}};
const origin='https://vote.example';
const owner={'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':env.ADMIN_EMAIL};
async function state(headers={}){return (await worker.fetch(new Request(origin+'/api/state',{headers}),env)).json();}
async function post(path,body,admin=false,headers={}){const p=await state();const response=await worker.fetch(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(admin?owner:{}),...headers},body:JSON.stringify({...body,pollId:p.pollId,phase:p.phase,venueRound:p.venueRound,dateRound:p.dateRound})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}

assert.equal((await state()).admin,false);assert.equal((await state(owner)).admin,true);
for(const action of ['set-participants','set-venues','reset'])assert.equal((await post('/api/admin',{action,participantCount:15,venues:['X','Y'],confirm:true})).status,403);
const page=await worker.fetch(new Request(origin+'/'),env);const html=await page.text();new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);assert.ok(html.includes('/signin-with-chatgpt'));
await verifyFlow({state,post});
await post('/api/admin',{action:'reset',confirm:true},true);
await post('/api/admin',{action:'set-venues',venues:['X','Y'],participantCount:12},true);
await post('/api/attendance',{answer:'yes',voterToken:'a'.repeat(64)},true);
assert.equal((await post('/api/vote',{choices:[0,0,0],voterToken:'a'.repeat(64)},true)).status,200);
assert.equal((await post('/api/vote',{choices:[1,1,1],voterToken:'b'.repeat(64)},true)).status,409);
await post('/api/attendance',{answer:'yes',voterToken:'c'.repeat(64)});await post('/api/attendance',{answer:'yes',voterToken:'d'.repeat(64)});
const simultaneous=await Promise.all([post('/api/vote',{choices:[0,0,0],voterToken:'c'.repeat(64)}),post('/api/vote',{choices:[1,1,1],voterToken:'d'.repeat(64)})]);
assert.equal(simultaneous.filter(r=>r.status===200).length,1);assert.equal(simultaneous.filter(r=>r.status===409).length,1);
const row=sql.prepare('SELECT state FROM polls WHERE id=1').get(),legacy=JSON.parse(row.state);delete legacy.participantCount;
sql.prepare('UPDATE polls SET state=? WHERE id=1').run(JSON.stringify(legacy));
assert.equal((await state()).participantCount,12);assert.equal((await state()).venueCount,2);
console.log('Online checks passed: permissions, concurrent writes, legacy data, identity checks and frontend syntax.');

await post('/api/admin',{action:'reset',confirm:true},true);
await post('/api/admin',{action:'set-venues',venues:['A','B','C'],participantCount:12},true);
for(const token of ['1','2','3'])await post('/api/attendance',{answer:'yes',voterToken:token.repeat(64)});
for(const choices of [[],[0],[0,1],[0,0,0,0],[0,0,3],[0,0,-1],[0,0,0.5],['0',0,0]])assert.equal((await post('/api/vote',{choices,voterToken:'1'.repeat(64)})).status,400);
assert.equal((await post('/api/vote',{choices:[0,0,0],voterToken:'1'.repeat(64)})).status,200);
assert.equal((await post('/api/vote',{choices:[0,0,1],voterToken:'2'.repeat(64)})).status,200);
assert.equal((await post('/api/vote',{choices:[0,1,2],voterToken:'3'.repeat(64)})).status,200);
assert.equal((await state()).venueCount,3);assert.equal((await state()).venuePointsCast,9);assert.equal((await state()).venueTotals,null);
await post('/api/admin',{action:'close-venue'},true);
assert.deepEqual((await state()).venueTotals,[6,2,1]);assert.deepEqual((await state()).venueLeaders,[0]);
// Existing single-vote rounds keep their original rule and score after upgrade.
const existing=JSON.parse(sql.prepare('SELECT state FROM polls WHERE id=1').get().state);delete existing.venuePointBudget;existing.venueVotes=[0,1,1];existing.phase='venue-closed';
sql.prepare('UPDATE polls SET state=? WHERE id=1').run(JSON.stringify(existing));assert.equal((await state()).venuePointBudget,1);assert.deepEqual((await state()).venueTotals,[1,2,0]);
console.log('Three-point checks passed: 3 / 2+1 / 1+1+1 allocations, exact budget, person counts, point totals, and legacy single-vote compatibility.');
