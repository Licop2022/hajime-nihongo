const assert=require('node:assert/strict');
const {HajimeCloudEngine}=require('./dist/cloud-engine.js');
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const server=new Map();
function device(){const local={study:{completed:[]},real:{history:[]}},checkpoints=new Map(),backups=[];let offline=false,beforeSave=null;
 const adapter={read:(u,n)=>local[n],apply:(u,n,p)=>local[n]=p,isEmpty:(n,p)=>!(p.completed?.length||p.history?.length),checkpoint:async(u,n)=>clone(checkpoints.get(u+':'+n)),remember:async(u,n,d)=>checkpoints.set(u+':'+n,clone(d)),backup:async(u,n,d)=>backups.push({u,n,d}),fetch:async(u,n)=>{if(offline)throw Error('offline');return clone(server.get(u+':'+n))},save:async(u,n,p,rev)=>{if(offline)throw Error('offline');const hook=beforeSave;beforeSave=null;if(hook)await hook();const old=server.get(u+':'+n);if((old?.revision||0)!==rev)return {accepted:false,document:clone(old)};const doc={payload:clone(p),revision:rev+1};server.set(u+':'+n,doc);return {accepted:true,document:clone(doc)}}};
 return {local,checkpoints,backups,engine:new HajimeCloudEngine(adapter),offline:v=>offline=v,onSave:f=>beforeSave=f};
}
(async()=>{
 const desktop=device(),phone=device();desktop.engine.setUser('alice');phone.engine.setUser('alice');
 desktop.local.study.completed=['g1'];desktop.local.real.history=[{paper:'N5'}];await desktop.engine.synchronize();await phone.engine.synchronize();assert.deepEqual(phone.local,desktop.local,'both study and authentic tests download');
 phone.offline(true);phone.local.study.completed.push('g2');assert.equal((await phone.engine.synchronize()).study.status,'pending');assert.equal(phone.local.study.completed.length,2,'offline keeps local changes');phone.offline(false);await phone.engine.synchronize();await desktop.engine.synchronize();assert.deepEqual(desktop.local.study.completed,['g1','g2']);
 desktop.local.study.completed.push('g3');phone.local.study.completed.push('g4');await desktop.engine.synchronize();assert.equal((await phone.engine.synchronize()).study.status,'conflict');assert(phone.backups.length);assert.deepEqual(server.get('alice:study').payload.completed,['g1','g2','g3'],'stale device cannot overwrite');
 const racing=device();racing.engine.setUser('alice');await racing.engine.synchronize();racing.local.study.completed.push('g5');racing.onSave(async()=>{racing.local.study.completed.push('g6')});await racing.engine.synchronize();assert(server.get('alice:study').payload.completed.includes('g6'),'edits during save remain pending and upload again');
 const switched=device();switched.engine.setUser('charlie');switched.local.study.completed=['local'];switched.onSave(async()=>switched.engine.setUser('bob'));await switched.engine.synchronize();assert(!switched.checkpoints.has('bob:study'),'no cross-account checkpoint');assert(!server.has('bob:study'));
 switched.engine.setUser(null);assert.deepEqual(await switched.engine.synchronize(),{status:'signed-out'});
 console.log('PASS: two-device study/test sync, offline retry, concurrent edit backup, server revision conflict, edits during upload, account switch and sign-out isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
