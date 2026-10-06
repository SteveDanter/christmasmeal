import http from 'node:http';

import fs from 'node:fs';

import path from 'node:path';

import crypto from 'node:crypto';

import os from 'node:os';

import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));

const dir=path.join(root,'data'); fs.mkdirSync(dir,{recursive:true});

const file=path.join(dir,'poll.json');

function freshPoll(){return {phase:'setup',venues:[],dates:[],selected:null,mode:'all',venueVotes:[],dateVotes:[],nominees:[],nominationVotes:[],seen:{venue:[],date:[],nomination:[]},salt:crypto.randomBytes(32).toString('hex'),pollId:crypto.randomUUID(),demo:false,venueRound:1,dateRound:1,venueOptions:null,dateOptions:null,history:[]};}

let state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):freshPoll();

state.venueRound??=1;state.dateRound??=1;state.venueOptions??=null;state.dateOptions??=null;state.history??=[];

state.pollId??=crypto.randomUUID();state.demo??=false;

state.nominees??=[];state.nominationVotes??=[];state.seen.nomination??=[];

function save(next){fs.writeFileSync(file+'.tmp',JSON.stringify(next,null,2));fs.renameSync(file+'.tmp',file);state=next;}

function leaders(round){const labels=round==='venue'?state.venues:state.dates,votes=state[round+'Votes'],options=state[round+'Options']??labels.map((_,i)=>i),counts=labels.map((_,i)=>round==='venue'?votes.filter(v=>v===i).length:votes.filter(v=>v.includes(i)).length),max=Math.max(...options.map(i=>counts[i]));return options.filter(i=>counts[i]===max);}

function publicState(){const {phase,venues,dates,selected,mode,nominees,pollId,demo,venueRound,dateRound,venueOptions,dateOptions}=state; const results=phase==='venue-closed'||phase==='date'||phase==='closed';return {phase,venues,dates,selected,mode,nominees,pollId,demo,venueRound,dateRound,venueOptions,dateOptions,venueLeaders:phase==='venue-closed'?leaders('venue'):[],dateLeaders:['date-tied','closed'].includes(phase)?leaders('date'):[],nominationCount:state.nominationVotes.length,nominationTotals:phase==='nomination-closed'?nominees.map((_,i)=>state.nominationVotes.filter(v=>v===i).length):null,venueCount:state.venueVotes.length,dateCount:state.dateVotes.length,venueTotals:results?venues.map((_,i)=>state.venueVotes.filter(v=>v===i).length):null,dateTotals:['date-tied','closed'].includes(phase)?dates.map((_,i)=>state.dateVotes.filter(v=>v.includes(i)).length):null};}

const server=http.createServer(async(req,res)=>{

 const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};

 try{

 const url=new URL(req.url,'http://localhost');

 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||'');

 if(req.method==='GET'&&url.pathname==='/api/state')return reply(200,{...publicState(),admin:local});

 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(fs.readFileSync(path.join(root,'index.html')));}

 if(req.method!=='POST')return reply(404,{error:'Page not found.'});

 if(req.headers.origin!==`http://${req.headers.host}`)return reply(403,{error:'Please submit from the voting page.'});

 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>10000)return reply(413,{error:'Request too large.'});}

 const body=JSON.parse(raw), next=structuredClone(state);

 if(url.pathname==='/api/admin'){

 if(!local)return reply(403,{error:'Open localhost on the organiser’s laptop to manage this poll.'});

 if(body.action==='reset'||body.action==='load-demo'){

 if(body.confirm!==true)return reply(400,{error:'Please confirm that the current poll will be cleared.'});

 const replacement=freshPoll();

 if(body.action==='load-demo'){

 replacement.demo=true;replacement.phase='nomination';

 replacement.nominees=['Sample: Riverside Bistro','Sample: City Steakhouse','Sample: Bay Italian','Sample: Festive Pub','Sample: Central Brasserie','Sample: Park Restaurant'];

 replacement.nominationVotes=[0,0,0,1,1,2,2,3,4,5];

 }

 save(replacement);return reply(200,publicState());

 }

 if(body.action==='open-runoff'){

 const round=state.phase==='venue-closed'?'venue':state.phase==='date-tied'?'date':null;

 if(!round||leaders(round).length<2)return reply(409,{error:'There is no tied result requiring a runoff.'});

 next.history.push({round,number:state[round+'Round'],votes:state[round+'Votes'],options:state[round+'Options']});

 next[round+'Options']=leaders(round);next[round+'Round']++;next[round+'Votes']=[];next.seen[round]=[];next.phase=round;

 if(next.demo){for(let i=0;i<10;i++){const choice=next[round+'Options'][i%next[round+'Options'].length];next[round+'Votes'].push(round==='venue'?choice:[choice]);}}

 save(next);return reply(200,publicState());

 }

 if(body.action==='open-nominations'){

 if(state.phase!=='setup')return reply(409,{error:'The poll has already started.'});

 next.phase='nomination';

 }else if(body.action==='close-nominations'&&state.phase==='nomination'){

 if(!state.nominees.length)return reply(400,{error:'At least one nomination is needed before closing.'});

 next.phase='nomination-closed';

 }else if(body.action==='open-shortlist'&&state.phase==='nomination-closed'){

 const counts=state.nominees.map((_,i)=>state.nominationVotes.filter(v=>v===i).length),limit=Math.min(5,counts.length),threshold=[...counts].sort((a,b)=>b-a)[limit-1];

 const selected=body.selected,top=counts.map((n,i)=>n===Math.max(...counts)?i:-1).filter(i=>i>=0);
 if(top.length>1){if(!Array.isArray(selected)||selected.length!==top.length||new Set(selected).size!==top.length||top.some(i=>!selected.includes(i)))return reply(400,{error:'Only the venues tied for the highest nomination total can enter this vote.'});}
 else {

 if(!Array.isArray(selected)||selected.length!==limit||new Set(selected).size!==limit||selected.some(i=>!Number.isInteger(i)||i<0||i>=counts.length||counts[i]<threshold)||counts.some((n,i)=>n>threshold&&!selected.includes(i)))return reply(400,{error:'Choose the most nominated venues; only venues tied at the cutoff can be exchanged.'});

 }
 next.venues=selected.map(i=>state.nominees[i]);next.phase='venue';

 if(next.demo)next.venueVotes=[0,0,0,0,1,1,2,2,3,4].map(i=>i%next.venues.length);

 }else if(body.action==='close-venue'&&state.phase==='venue'){next.phase='venue-closed';}

 else if(body.action==='open-dates'&&state.phase==='venue-closed'){

 if(leaders('venue').length!==1)return reply(409,{error:'A venue runoff is required before opening the date vote.'});

 const counts=state.venues.map((_,i)=>state.venueVotes.filter(v=>v===i).length);

 if(!Number.isInteger(body.selected)||body.selected<0||body.selected>=state.venues.length||body.selected!==leaders('venue')[0]||!Array.isArray(body.dates)||body.dates.length!==3||new Set(body.dates).size!==3||body.dates.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)||!['all','one'].includes(body.mode))return reply(400,{error:'Choose the highest voted venue (or one of the tied winners) and three different valid dates.'});

 next.selected=body.selected;next.dates=body.dates;next.mode=body.mode;next.phase='date';

 if(next.demo)next.dateVotes=next.mode==='all'?[[0,1],[0],[1,2],[0,2],[0,1,2],[1],[0],[2],[0,1],[0,2]]:[[0],[0],[1],[0],[2],[1],[0],[2],[0],[1]];

 }else if(body.action==='close-dates'&&state.phase==='date'){next.phase=leaders('date').length>1?'date-tied':'closed';}

 else return reply(409,{error:'This action is not available in the current round.'});

 save(next);return reply(200,publicState());

 }

 if(url.pathname==='/api/vote'){

 const round=state.phase;if(!['nomination','venue','date'].includes(round))return reply(409,{error:'Voting is currently closed.'});

 const choices=body.choices;

 if(round==='nomination'){

 if(typeof body.venue!=='string'||!body.venue.trim()||body.venue.length>120)return reply(400,{error:'Enter your favourite venue (up to 120 characters).'});

 }else if(!Array.isArray(choices)||!choices.length||new Set(choices).size!==choices.length||choices.some(i=>!Number.isInteger(i)||i<0||i>=(round==='venue'?state.venues.length:3))||((round==='venue'||state.mode==='one'||state.dateRound>1)&&choices.length!==1)||choices.some(i=>state[round+'Options']&&!state[round+'Options'].includes(i)))return reply(400,{error:'Please select the available choices for this round.'});

 const cookieName='christmas_'+round+(round==='nomination'?'':'_'+state[round+'Round']);

 const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);

 const token=cookie&&/^[a-f0-9]{64}$/.test(cookie)?cookie:crypto.randomBytes(32).toString('hex');

 const hash=crypto.createHash('sha256').update(state.salt+token).digest('hex');

 if(state.seen[round].includes(hash))return reply(409,{error:'This browser has already voted in this round.'});

 next.seen[round].push(hash);

 if(round==='nomination'){

 const name=body.venue.trim().replace(/\s+/g,' '),key=s=>s.toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N}]/gu,'');

 let index=next.nominees.findIndex(v=>key(v)===key(name));if(index<0){index=next.nominees.length;next.nominees.push(name);}next.nominationVotes.push(index);

 }else if(round==='venue')next.venueVotes.push(choices[0]);else next.dateVotes.push(choices);

 save(next);res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);return reply(200,{ok:true});

 }

 reply(404,{error:'Page not found.'});

 }catch(error){reply(500,{error:'Unable to save or load this request. Please try again.'});}

});

const port=Number(process.env.PORT||3000);

server.listen(port,'0.0.0.0',()=>{console.log(`Organiser and preview: http://localhost:${port}`);for(const list of Object.values(os.networkInterfaces()))for(const item of list||[])if(item.family==='IPv4'&&!item.internal)console.log(`Same-network voting: http://${item.address}:${port}`);});

