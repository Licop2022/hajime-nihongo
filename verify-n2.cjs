const fs=require('node:fs'),assert=require('node:assert/strict');
const base=fs.readFileSync('verify-n5.cjs','utf8');
const harness=base.slice(0,base.indexOf('const t=boot();')).replace("'n5-data.js','romaji.js'","'n5-data.js','n4-data.js','n4-more.js','n3-data.js','n2-data.js','study-extras.js','romaji.js'").replace("'n5.js']","'n5.js','dashboard.js','n4.js','n3.js','n2.js','favorites.js']");
const boot=new Function('require',harness+'return boot;')(require),t=boot();
function click(t,dataset={},id='',extra={}){const b={dataset,id,disabled:false,classList:{contains:()=>false},...extra};for(const f of t.events.click)f({target:{closest:sel=>sel==='button'?b:null}});}
assert.equal(t.run('N2_UNITS.length'),24);
assert.equal(t.run('N2_UNITS.flatMap(u=>u.vocab).length'),288);
assert.equal(t.run('N2_UNITS.flatMap(u=>u.grammar).length'),48);
assert(t.run('N2_UNITS.every(u=>u.wordIds.length===12&&new Set(u.wordIds).size===12&&u.grammar.length===2&&u.grammar.every(g=>g.rule&&g.pitfall&&g.examples.length===2&&g.examples.every(e=>e.length===3&&e.every(Boolean))&&g.options.length===4&&g.options[g.answer]&&g.why)&&[u.reading,u.listening].every(x=>x.translation&&x.text.length>175&&x.ids.length===4&&x.questions.every(q=>q.options.length===4&&new Set(q.options).size===4&&q.options[q.answer]&&q.why)))'));
assert(t.run('new Set([...grammar,...words,...readings,...listenings].map(x=>x.id)).size===[...grammar,...words,...readings,...listenings].length'));
assert(t.run('N2_UNITS.every(u=>u.reading.ids.every(id=>questionById(id).type==="reading")&&u.listening.ids.every(id=>questionById(id).type==="listening"))'));
assert(t.run('new Set(N2_UNITS.flatMap(u=>n2Ids(u)).map(id=>questionById(id).answer)).size===4'));
assert(t.run('N2_UNITS.every(u=>u.vocab.every(v=>v.length===4&&v.every(Boolean)&&/^[\\p{Script=Hiragana}\\p{Script=Katakana}ー・]+$/u.test(v[1])))'),'all word readings are kana');
const audioSource=fs.readFileSync('dist/audio.js','utf8');t.run(audioSource.slice(audioSource.indexOf('function dialogueTurns'),audioSource.indexOf('function audioState')));
assert(t.run('N2_UNITS.every(u=>{const ts=dialogueTurns(u.listening.text);return ts.length===u.listening.text.split("\\n").length&&new Set(ts.map(t=>t.speaker)).size===2&&ts.every(t=>t.speaker&&t.text&&!t.text.includes("："));})'),'all 24 dialogues split into two named roles without reading labels');
for(const file of ['dist/index.html','dist/journey.html']){const html=fs.readFileSync(file,'utf8'),scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);assert(scripts.indexOf('n2-data.js')<scripts.indexOf('study-extras.js'));assert(scripts.indexOf('n2.js')>scripts.indexOf('n3.js')&&scripts.indexOf('n2.js')<scripts.indexOf('cloud-sync.js'));for(const name of scripts)assert(fs.existsSync('dist/'+name),'missing browser asset: '+name);}
for(let i=0;i<24;i++)for(const stage of ['words','grammar','reading','listening','review']){t.run(`level='N2';page='lessons';state.n2.cursor=N2_UNITS[${i}].id;state.n2.stage='${stage}';render(false)`);assert(t.els.get('#view').innerHTML.includes('n2Finish'));}
for(const level of ['N5','N4','N3','N2'])for(const page of ['home','lessons','grammar','vocab','reading','listening','practice','progress','plan','real']){t.run(`level='${level}';page='${page}';render(false)`);assert(t.els.get('#view').innerHTML.length>300);}
for(const kind of ['reading','listening']){t.run(`level='N2';page='${kind}';render(false)`);assert.equal((t.els.get('#view').innerHTML.match(/data-n2open=/g)||[]).length,24);}
// A real unit through event handlers, including failed review and retry.
click(t,{n2unit:'n2u01'});assert.equal(t.run('level'),'N2');
assert(!t.run("n2CanFinish(N2_UNITS[0],'words')"));
const wordHtml=t.els.get('#view').innerHTML;
for(const id of t.run('N2_UNITS[0].wordIds'))click(t,{n2rate:id,value:'1'});
assert.equal(t.els.get('#view').innerHTML,wordHtml,'self-rating must not recreate or collapse word cards');
assert(t.run("n2CanFinish(N2_UNITS[0],'words')"));click(t,{},'n2Finish');assert.equal(t.run('state.n2.stage'),'grammar');
for(const kind of ['grammar','reading','listening']){assert.equal(t.run('state.n2.stage'),kind);const ids=t.run(kind==='grammar'?'N2_UNITS[0].grammarIds':`N2_UNITS[0].${kind}.ids`);for(const id of ids)click(t,{n2answer:id,kind:'answers',value:String(t.run(`questionById('${id}').answer`))});assert(t.run(`n2CanFinish(N2_UNITS[0],'${kind}')`));click(t,{},'n2Finish');}
assert(t.run('N2_UNITS[0].grammarIds.every(id=>state.completed.includes(id))&&N2_UNITS[0].reading.ids.every(id=>state.textDone.includes(id))&&N2_UNITS[0].listening.ids.every(id=>state.textDone.includes(id))'));
for(const [i,id]of t.run('n2Ids(N2_UNITS[0])').entries())click(t,{n2answer:id,kind:'review',value:String(t.run(`(questionById('${id}').answer+${i<3?1:0})%4`))});assert(!t.run("n2CanFinish(N2_UNITS[0],'review')"));click(t,{},'n2Finish');assert(!t.run("n2State(N2_UNITS[0]).done.includes('review')"));
click(t,{},'n2Retry');for(const id of t.run('n2Ids(N2_UNITS[0])'))click(t,{n2answer:id,kind:'review',value:String(t.run(`questionById('${id}').answer`))});click(t,{},'n2Finish');assert(t.run("n2State(N2_UNITS[0]).done.length===5&&state.n2.cursor===null&&n2Next().id==='n2u02'"));
t.run("const boundary=n2State(N2_UNITS[23]);boundary.done=N2_STAGES.slice(0,4);boundary.review=Object.fromEntries(n2Ids(N2_UNITS[23]).map((id,i)=>[id,(questionById(id).answer+(i<2?1:0))%4]))");assert(t.run("n2CanFinish(N2_UNITS[23],'review')"),'8/10 passes');t.run("boundary.done=[]");assert(!t.run("n2CanFinish(N2_UNITS[23],'review')"),'review score alone does not bypass earlier stages');t.run('delete state.n2.units.n2u24');
// Favorites and optional writing survive a refresh and a JSON merge.
click(t,{n2unit:'n2u02'});for(const key of ['word:'+t.run('N2_UNITS[1].wordIds[0]'),'grammar:n2u02g0','example:n2u02g0:1'])click(t,{favorite:key});
for(const fn of t.events.input)fn({target:{id:'n2Draft',value:'引き受けた以上は、最後まで責任を持ちます。'}});
t.run("state.plan.minutes=20;state.n2.day=null;n2Daily();state.course.units.u01={done:['words1'],ratings:[],answers:{},review:{},draft:'N5草稿',score:0};n4State(N4_UNITS[0]).done=['words'];n4State(N4_UNITS[0]).draft='N4草稿';n3State(N3_UNITS[0]).done=['grammar'];n3State(N3_UNITS[0]).draft='N3草稿';state.completed.push('n2-g1');persist()");
for(const hash of ['#N2/plan','#N2/lessons','#N5/home']){const r=boot({'hajime-study-v2':t.store.get('hajime-study-v2')},hash);assert.equal(r.run('state.n2.units.n2u02.draft'),'引き受けた以上は、最後まで責任を持ちます。');assert(r.run("state.favorites.includes('example:n2u02g0:1')&&state.n2.units.n2u01.done.length===5&&state.course.units.u01.draft==='N5草稿'&&state.n4.units.n4u01.draft==='N4草稿'&&state.n3.units.n3u01.draft==='N3草稿'&&state.n3.units.n3u01.done.includes('grammar')&&state.completed.includes('n2-g1')"));}
t.run('const incoming=cleanState(emptyState());mergeStudyExtras(state,incoming)');assert(t.run("incoming.n2.units.n2u02.draft.length>0&&incoming.n4.units.n4u01.draft==='N4草稿'&&incoming.favorites.length===3&&incoming.n2.day.unit==='n2u02'"));
assert(t.run("cleanState({...state,n2:{cursor:'fake',stage:'fake',units:{n2u01:{done:'bad',ratings:['bad'],answers:{n2u01g0:99},review:{fake:0}}},final:{answers:{fake:0},submitted:true}}}).n2.cursor===null"));
assert(t.run("!cleanState({...state,n2:{final:{answers:{n2u01g0:0},submitted:true}}}).n2.final.submitted"));
t.run("const first=cleanState({...emptyState(),n2:{final:{answers:{n2u01g0:0}}}}),second=cleanState({...emptyState(),n2:{final:{answers:{n2u02g1:1}}}});mergeStudyExtras(first,second)");assert(t.run('Object.keys(second.n2.final.answers).length===2&&!second.n2.final.submitted'),'merge independent partial final answers');
// Manual next-day action is gated and preserves remaining unit steps.
const before=t.run('state.n2.number');click(t,{},'n2NextDay');assert.equal(t.run('state.n2.number'),before);
t.run("n2State(N2_UNITS[1]).done=['words']");click(t,{},'n2NextDay');assert.equal(t.run('state.n2.number'),before+1);assert.equal(t.run('n2Daily().stages.join()'),'grammar');
// Final answers are editable and ungraded until explicit submission.
click(t,{},'n2Final');const finalId=t.run('n2FinalIds()[0]'),attempts=t.run('state.attempts');click(t,{n2answer:finalId,kind:'final',value:'0'});click(t,{n2answer:finalId,kind:'final',value:'1'});assert.equal(t.run(`state.n2.final.answers['${finalId}']`),1);assert.equal(t.run('state.attempts'),attempts);assert(!t.els.get('#view').innerHTML.includes('class="feedback"'));assert(!t.els.get('#view').innerHTML.includes('你的选择'));
const partial=boot({'hajime-study-v2':t.store.get('hajime-study-v2')},'#N2/lessons');assert.equal(partial.run(`state.n2.final.answers['${finalId}']`),1);
click(t,{},'n2SubmitFinal');assert(!t.run('state.n2.final.submitted'));
for(const id of t.run('n2FinalIds()'))click(t,{n2answer:id,kind:'final',value:String(t.run(`questionById('${id}').answer`))});click(t,{},'n2SubmitFinal');assert(t.run('state.n2.final.submitted&&n2Score(n2FinalIds(),state.n2.final.answers)===100&&state.history.at(-1).total===48'));
assert.equal(t.run('state.attempts'),attempts+48);click(t,{},'n2SubmitFinal');assert.equal(t.run('state.attempts'),attempts+48);
for(let m=0;m<4;m++){t.run('state.activeQuiz=null');click(t,{n2focus:String(m)});assert(t.run('state.activeQuiz.ids.length===12&&state.activeQuiz.ids.every(id=>questionById(id).level==="N2")'));}const active=boot({'hajime-study-v2':t.store.get('hajime-study-v2')});assert.equal(active.run('state.activeQuiz.ids.length'),12);
t.run("state.activeQuiz=null;for(const u of N2_UNITS)n2State(u).done=N2_STAGES.slice();state.n2.day=null");assert.equal(t.run('n2Daily()'),null);assert(!t.run('n2DailyHtml().includes("n2NextDay")'));
console.log('PASS: 24 N2 units, 48 explanations/96 examples, 288 word entries, 48 texts/192 questions, 120 stage views, review gates, editable final, four module quizzes, daily sequencing, persistent cards, favorites/drafts, imports and N5/N4/N3/legacy compatibility.');

// Exercise N2-only records through the real cloud adapter using a mock transport.
const cloud=fs.readFileSync('verify-cloud-ui.cjs','utf8').replace("const existing=fs.readFileSync('verify-n5.cjs','utf8');","const existing="+JSON.stringify(harness+"const t=boot();")+";").replace("markLesson('g1');persist();","state.n2.cursor='n2u02';n2State(N2_UNITS[1]).draft='仅有N2草稿';persist();").replaceAll("state.completed.includes('g1')","state.n2.units.n2u02?.draft==='仅有N2草稿'").replace("window.testDocs.get('alice:study').payload.completed.includes('g1')","window.testDocs.get('alice:study').payload.n2.units.n2u02?.draft==='仅有N2草稿'");
new Function('require',cloud)(require);
