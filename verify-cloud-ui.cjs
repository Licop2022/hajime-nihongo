const fs=require('node:fs'),assert=require('node:assert/strict');
const existing=fs.readFileSync('verify-n5.cjs','utf8');
const boot=new Function('require',existing.slice(0,existing.indexOf('const t=boot();'))+'return boot;')(require);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const t=boot();t.run("markLesson('g1');persist();document.body={append(){}};globalThis.navigator={onLine:true};setTimeout=(fn,ms)=>{if(ms===0)Promise.resolve().then(fn);return 0};");
 t.run(`window.HAJIME_CLOUD_CONFIG={url:'https://unit-test.invalid',publishableKey:'unit-test'};window.testDocs=new Map();window.testSession={user:{id:'alice',email:'alice@example.invalid'}};window.supabase={createClient(){return {auth:{onAuthStateChange(fn){window.testAuthEvent=fn},async getSession(){return {data:{session:window.testSession}}}},from(){let u,n;return {select(){return this},eq(k,v){if(k==='user_id')u=v;else n=v;return this},async maybeSingle(){return {data:window.testDocs.get(u+':'+n)||null}}}},async rpc(fn,args){const id=window.testSession.user.id,key=id+':'+args.p_namespace,old=window.testDocs.get(key);if((old?.revision||0)!==args.p_expected_revision)return {data:{accepted:false,document:old}};const document={payload:JSON.parse(JSON.stringify(args.p_payload)),revision:(old?.revision||0)+1};window.testDocs.set(key,document);return {data:{accepted:true,document}}}}}};`);
 t.run(fs.readFileSync('dist/cloud-engine.js','utf8'));t.run(fs.readFileSync('dist/cloud-sync.js','utf8'));await tick();await tick();
 assert(t.store.has('hajime-cloud-cache-v1:guest'));assert(!t.run("state.completed.includes('g1')"),'guest progress is isolated until imported');
 const click=id=>t.events.click.at(-1)({target:{closest:()=>({id,dataset:{}})}});
 click('cloudImportGuest');await tick();await tick();assert(t.run("state.completed.includes('g1')"));assert(t.run("window.testDocs.get('alice:study').payload.completed.includes('g1')"));
 t.run("markLesson('g2');persist()");click('cloudNow');await tick();await tick();assert(t.run("window.testDocs.get('alice:study').payload.completed.includes('g2')"));
 t.run("const doc=window.testDocs.get('alice:study');doc.payload.completed.push('g3');doc.revision++;");click('cloudNow');await tick();await tick();assert(t.run("state.completed.includes('g3')"),'remote updates apply to the course state');
 t.run("window.testSession={user:{id:'bob',email:'bob@example.invalid'}};window.testAuthEvent('SIGNED_IN',window.testSession)");await tick();await tick();assert(!t.run("state.completed.includes('g2')"));assert(!t.run("window.testDocs.has('bob:study')"));
 t.run("window.testSession=null;window.testAuthEvent('SIGNED_OUT',null)");await tick();await tick();assert(t.run("state.completed.includes('g1')"),'sign-out restores guest progress');
 console.log('PASS: real application adapters, guest backup/import, signed-in save, remote restore, account isolation and guest restoration on logout.');
})().catch(e=>{console.error(e);process.exitCode=1});
