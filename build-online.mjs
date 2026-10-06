import fs from 'node:fs';
const hex=bytes=>Buffer.from(bytes).toString('hex');
let source=fs.readFileSync('server.mjs','utf8').replace(/\r/g,'');
const helpers=source.slice(source.indexOf('function freshPoll()'),source.indexOf('const server=http.createServer'));
let functions=helpers.slice(0,helpers.indexOf('let state='))+helpers.slice(helpers.indexOf('function leaders('));
let handler=source.slice(source.indexOf('const server=http.createServer(async(req,res)=>{')+'const server=http.createServer(async(req,res)=>{'.length,source.indexOf('\n});',source.indexOf('const server=http.createServer')));
handler=handler.replace(/const local=.*?;\n/,`const local=Boolean(request.headers.get('oai-authenticated-user-id')&&env.ADMIN_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase());\n`);
handler=handler.replace("new URL(req.url,'http://localhost')",'new URL(request.url)');
handler=handler.replace("url.pathname==='/'","(url.pathname==='/'||url.pathname==='/admin')");
handler=handler.replace("fs.readFileSync(path.join(root,'index.html'))",'HTML');
handler=handler.replace("if(req.headers.origin!==`http://${req.headers.host}`)","if(request.headers.get('origin')!==new URL(request.url).origin)");
handler=handler.replace(/let raw='';for await\(const chunk of req\)\{raw\+=chunk;if\(raw.length>10000\)return reply\(413,\{error:'Request too large\.'\}\);\}/,"const raw=await request.text();if(raw.length>10000)return reply(413,{error:'Request too large.'});");
handler=handler.replace("const body=JSON.parse(raw), next=structuredClone(state);",`let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request.'});}
 if(body.pollId!==state.pollId||body.phase!==state.phase||body.venueRound!==state.venueRound||body.dateRound!==state.dateRound)return reply(409,{error:'The poll has changed. Please refresh before continuing.'});
 const next=structuredClone(state);`);
handler=handler.replaceAll('save(', 'await save(');
handler=handler.replace('res.end(JSON.stringify(data));','return res.end(JSON.stringify(data));');
handler=handler.replace("\n reply(404,{error:'Page not found.'});","\n return reply(404,{error:'Page not found.'});");
handler=handler.replace("crypto.createHash('sha256').update(state.salt+token).digest('hex')", "Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(state.salt+token))),b=>b.toString(16).padStart(2,'0')).join('')");
handler=handler.replace("Max-Age=31536000`", "Max-Age=31536000; Secure`");
handler=handler.replace("Open localhost on the organiser’s laptop to manage this poll.","Sign in as the organiser to manage this poll.");
handler=handler.replace("}catch(error){reply(500,{error:'Unable to save or load this request. Please try again.'});}","}catch(error){return reply(error.code===409?409:500,{error:error.code===409?'Another response arrived at the same time. Please try again.':'Unable to save or load this request. Please try again.'});}");
let html=fs.readFileSync('index.html','utf8');
html=html.replace('Organiser controls · this laptop only','Organiser controls');
html=html.replace("if(!p.admin)return;",`if(!p.admin){$('organiser').innerHTML='<p><a href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">Organiser sign-in</a></p>';return;}`);
html=html.replace("body:JSON.stringify(body)","body:JSON.stringify({...body,pollId:poll.pollId,phase:poll.phase,venueRound:poll.venueRound,dateRound:poll.dateRound})");
const runtime=`import HTML from './html.mjs';
const crypto={randomUUID:()=>globalThis.crypto.randomUUID(),randomBytes:n=>({toString:()=>Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('')})};
export default {async fetch(request,env){
const responseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const res={setHeader:(k,v)=>{responseHeaders[k]=v;},writeHead:(code,headers)=>{res.code=code;Object.assign(responseHeaders,headers);},end:body=>new Response(body,{status:res.code??200,headers:responseHeaders})};
const req={method:request.method,headers:Object.fromEntries(request.headers.entries())};
let state,revision;
async function save(next){const result=await env.DB.prepare('UPDATE polls SET state = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(JSON.stringify(next),revision).run();if(result.meta.changes!==1){const error=new Error('Concurrent update');error.code=409;throw error;}state=next;revision++;}
${functions}
try{let row=await env.DB.prepare('SELECT state, revision FROM polls WHERE id = 1').first();if(!row){await env.DB.prepare('INSERT INTO polls (id,state,revision) VALUES (1,?,0) ON CONFLICT(id) DO NOTHING').bind(JSON.stringify(freshPoll())).run();row=await env.DB.prepare('SELECT state, revision FROM polls WHERE id = 1').first();}state=JSON.parse(row.state);revision=row.revision;}catch{return new Response(JSON.stringify({error:'Vote storage is temporarily unavailable. Please try again.'}),{status:503,headers:{...responseHeaders,'Content-Type':'application/json'}});}
${handler}
}};
`;
fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js',runtime);
fs.writeFileSync('dist/server/html.mjs',`export default ${JSON.stringify(html)};\n`);
console.log('Online Worker built with durable storage and organiser-only authentication.');
