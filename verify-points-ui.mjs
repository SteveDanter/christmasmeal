import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const nodes={},fields=[0,1,2].map(i=>({value:'0',dataset:{venue:String(i)}})),button={disabled:true};
const context=vm.createContext({document:{hidden:false,body:{classList:{toggle(){}}},getElementById:id=>nodes[id]??={innerHTML:'',textContent:'',value:'',setAttribute(k,v){this[k]=v;},querySelector:()=>button,querySelectorAll:()=>fields,classList:{toggle(){}}},addEventListener(){}},setInterval(){},fetch:()=>new Promise(()=>{}),crypto:globalThis.crypto});
vm.runInContext(fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],context);
context.sample={phase:'venue',participantCount:12,votingTarget:12,attendanceChoice:'yes',venuePointBudget:3,venueRound:1,dateRound:1,venues:['A','B','C'],dates:[],dateLeaders:[],venueLeaders:[],nominationCount:0,venueCount:0,dateCount:0,admin:false};
vm.runInContext('poll=sample;render();post=async(url,body)=>{globalThis.last=body;};load=async()=>{};',context);
assert.ok(nodes.content.innerHTML.includes('You have 3 points'));
for(const values of [[3,0,0],[2,1,0],[1,1,1]]){fields.forEach((f,i)=>f.value=String(values[i]));nodes.ballot.onchange();assert.equal(button.disabled,false);await nodes.ballot.onsubmit({preventDefault(){}});assert.equal(context.last.choices.length,3);assert.deepEqual([...context.last.choices],values.flatMap((n,i)=>Array(n).fill(i)));}
fields[0].value='3';fields[1].value='1';fields[2].value='0';nodes.ballot.onchange();assert.equal(button.disabled,true);assert.ok(nodes['points-status'].textContent.includes('Remove 1'));
console.log('Frontend checks passed for 3, 2+1 and 1+1+1; over-allocation disables submission.');
