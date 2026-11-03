const fs=require('node:fs'),assert=require('node:assert/strict');
const base=fs.readFileSync('verify-n5.cjs','utf8');
const harness=base.slice(0,base.indexOf('const t=boot();')).replace("'n5-data.js','romaji.js'","'n5-data.js','n4-data.js','n4-more.js','n3-data.js','study-extras.js','romaji.js'").replace("'n5.js']","'n5.js','dashboard.js','n4.js','n3.js','favorites.js']");
const boot=new Function('require',harness+'return boot;')(require),t=boot();
function click(t,dataset={},id='',extra={}){const b={dataset,id,disabled:false,classList:{contains:()=>false},...extra};for(const f of t.events.click)f({target:{closest:sel=>sel==='button'?b:null}});}
assert.equal(t.run('N3_UNITS.length'),24);
assert.equal(t.run('N3_UNITS.flatMap(u=>u.vocab).length'),240);
assert.equal(t.run('N3_UNITS.flatMap(u=>u.grammar).length'),48);
assert(t.run('N3_UNITS.every(u=>u.wordIds.length===10&&new Set(u.wordIds).size===10&&u.grammar.length===2&&u.grammar.every(g=>g.rule&&g.pitfall&&g.examples.length===2&&g.examples.every(e=>e.length===3&&e.every(Boolean))&&g.options.length===3&&g.options[g.answer]&&g.why)&&[u.reading,u.listening].every(x=>x.translation&&x.text.length>70&&x.ids.length===3&&x.questions.every(q=>q.options.length===3&&new Set(q.options).size===3&&q.options[q.answer]&&q.why)))'));
assert(t.run('new Set([...grammar,...words,...readings,...listenings].map(x=>x.id)).size===[...grammar,...words,...readings,...listenings].length'));
assert(t.run('N3_UNITS.every(u=>u.reading.ids.every(id=>questionById(id).type==="reading")&&u.listening.ids.every(id=>questionById(id).type==="listening"))'));
assert(t.run('new Set(N3_UNITS.flatMap(u=>n3Ids(u)).map(id=>questionById(id).answer)).size===3'));
for(let i=0;i<24;i++)for(const stage of ['words','grammar','reading','listening','review']){t.run(`level='N3';page='lessons';state.n3.cursor=N3_UNITS[${i}].id;state.n3.stage='${stage}';render(false)`);assert(t.els.get('#view').innerHTML.includes('n3Finish'));}
for(const level of ['N5','N4','N3','N2'])for(const page of ['home','lessons','grammar','vocab','reading','listening','practice','progress','plan','real']){t.run(`level='${level}';page='${page}';render(false)`);assert(t.els.get('#view').innerHTML.length>300);}
for(const kind of ['reading','listening']){t.run(`level='N3';page='${kind}';render(false)`);assert.equal((t.els.get('#view').innerHTML.match(/data-n3open=/g)||[]).length,24);}
// A real unit through event handlers, including failed review and retry.
click(t,{n3unit:'n3u01'});assert.equal(t.run('level'),'N3');
assert(!t.run("n3CanFinish(N3_UNITS[0],'words')"));
const wordHtml=t.els.get('#view').innerHTML;
for(const id of t.run('N3_UNITS[0].wordIds'))click(t,{n3rate:id,value:'1'});
assert.equal(t.els.get('#view').innerHTML,wordHtml,'self-rating must not recreate or collapse word cards');
assert(t.run("n3CanFinish(N3_UNITS[0],'words')"));click(t,{},'n3Finish');assert.equal(t.run('state.n3.stage'),'grammar');
for(const kind of ['grammar','reading','listening']){assert.equal(t.run('state.n3.stage'),kind);const ids=t.run(kind==='grammar'?'N3_UNITS[0].grammarIds':`N3_UNITS[0].${kind}.ids`);for(const id of ids)click(t,{n3answer:id,kind:'answers',value:String(t.run(`questionById('${id}').answer`))});assert(t.run(`n3CanFinish(N3_UNITS[0],'${kind}')`));click(t,{},'n3Finish');}
assert(t.run('N3_UNITS[0].grammarIds.every(id=>state.completed.includes(id))&&N3_UNITS[0].reading.ids.every(id=>state.textDone.includes(id))&&N3_UNITS[0].listening.ids.every(id=>state.textDone.includes(id))'));
for(const [i,id]of t.run('n3Ids(N3_UNITS[0])').entries())click(t,{n3answer:id,kind:'review',value:String(t.run(`(questionById('${id}').answer+${i<2?1:0})%3`))});assert(!t.run("n3CanFinish(N3_UNITS[0],'review')"));click(t,{},'n3Finish');assert(!t.run("n3State(N3_UNITS[0]).done.includes('review')"));
click(t,{},'n3Retry');for(const id of t.run('n3Ids(N3_UNITS[0])'))click(t,{n3answer:id,kind:'review',value:String(t.run(`questionById('${id}').answer`))});click(t,{},'n3Finish');assert(t.run("n3State(N3_UNITS[0]).done.length===5&&state.n3.cursor===null&&n3Next().id==='n3u02'"));
// Favorites and optional writing survive a refresh and a JSON merge.
click(t,{n3unit:'n3u02'});for(const key of ['word:'+t.run('N3_UNITS[1].wordIds[0]'),'grammar:n3u02g0','example:n3u02g0:1'])click(t,{favorite:key});
for(const fn of t.events.input)fn({target:{id:'n3Draft',value:'締め切りを忘れないようにしています。'}});
t.run("state.plan.minutes=20;state.n3.day=null;n3Daily();state.course.units.u01={done:['words1'],ratings:[],answers:{},review:{},draft:'N5草稿',score:0};n4State(N4_UNITS[0]).done=['words'];n4State(N4_UNITS[0]).draft='N4草稿';state.completed.push('n3-g1');persist()");
for(const hash of ['#N3/plan','#N3/lessons','#N5/home']){const r=boot({'hajime-study-v2':t.store.get('hajime-study-v2')},hash);assert.equal(r.run('state.n3.units.n3u02.draft'),'締め切りを忘れないようにしています。');assert(r.run("state.favorites.includes('example:n3u02g0:1')&&state.n3.units.n3u01.done.length===5&&state.course.units.u01.draft==='N5草稿'&&state.n4.units.n4u01.draft==='N4草稿'&&state.completed.includes('n3-g1')"));}
t.run('const incoming=cleanState(emptyState());mergeStudyExtras(state,incoming)');assert(t.run("incoming.n3.units.n3u02.draft.length>0&&incoming.n4.units.n4u01.draft==='N4草稿'&&incoming.favorites.length===3&&incoming.n3.day.unit==='n3u02'"));
assert(t.run("cleanState({...state,n3:{cursor:'fake',stage:'fake',units:{n3u01:{done:'bad',ratings:['bad'],answers:{n3u01g0:99},review:{fake:0}}},final:{answers:{fake:0},submitted:true}}}).n3.cursor===null"));
assert(t.run("!cleanState({...state,n3:{final:{answers:{n3u01g0:0},submitted:true}}}).n3.final.submitted"));
t.run("const first=cleanState({...emptyState(),n3:{final:{answers:{n3u01g0:0}}}}),second=cleanState({...emptyState(),n3:{final:{answers:{n3u02g1:1}}}});mergeStudyExtras(first,second)");assert(t.run('Object.keys(second.n3.final.answers).length===2&&!second.n3.final.submitted'),'merge independent partial final answers');
// Manual next-day action is gated and preserves remaining unit steps.
const before=t.run('state.n3.number');click(t,{},'n3NextDay');assert.equal(t.run('state.n3.number'),before);
t.run("n3State(N3_UNITS[1]).done=['words']");click(t,{},'n3NextDay');assert.equal(t.run('state.n3.number'),before+1);assert.equal(t.run('n3Daily().stages.join()'),'grammar');
// Final answers are editable and ungraded until explicit submission.
click(t,{},'n3Final');const finalId=t.run('n3FinalIds()[0]'),attempts=t.run('state.attempts');click(t,{n3answer:finalId,kind:'final',value:'0'});click(t,{n3answer:finalId,kind:'final',value:'1'});assert.equal(t.run(`state.n3.final.answers['${finalId}']`),1);assert.equal(t.run('state.attempts'),attempts);assert(!t.els.get('#view').innerHTML.includes('class="feedback"'));assert(!t.els.get('#view').innerHTML.includes('你的选择'));
const partial=boot({'hajime-study-v2':t.store.get('hajime-study-v2')},'#N3/lessons');assert.equal(partial.run(`state.n3.final.answers['${finalId}']`),1);
click(t,{},'n3SubmitFinal');assert(!t.run('state.n3.final.submitted'));
for(const id of t.run('n3FinalIds()'))click(t,{n3answer:id,kind:'final',value:String(t.run(`questionById('${id}').answer`))});click(t,{},'n3SubmitFinal');assert(t.run('state.n3.final.submitted&&n3Score(n3FinalIds(),state.n3.final.answers)===100&&state.history.at(-1).total===48'));
assert.equal(t.run('state.attempts'),attempts+48);click(t,{},'n3SubmitFinal');assert.equal(t.run('state.attempts'),attempts+48);
for(let m=0;m<4;m++){t.run('state.activeQuiz=null');click(t,{n3focus:String(m)});assert(t.run('state.activeQuiz.ids.length===12&&state.activeQuiz.ids.every(id=>questionById(id).level==="N3")'));}const active=boot({'hajime-study-v2':t.store.get('hajime-study-v2')});assert.equal(active.run('state.activeQuiz.ids.length'),12);
t.run("state.activeQuiz=null;for(const u of N3_UNITS)n3State(u).done=N3_STAGES.slice();state.n3.day=null");assert.equal(t.run('n3Daily()'),null);assert(!t.run('n3DailyHtml().includes("n3NextDay")'));
console.log('PASS: 24 N3 units, 48 explanations/96 examples, 240 word entries, 48 texts/144 questions, 120 stage views, review gates, editable final, four module quizzes, daily sequencing, persistent cards, favorites/drafts, imports and N5/N4/legacy compatibility.');

// Exercise N3-only records through the real cloud adapter using a mock transport.
const cloud=fs.readFileSync('verify-cloud-ui.cjs','utf8').replace("const existing=fs.readFileSync('verify-n5.cjs','utf8');","const existing="+JSON.stringify(harness+"const t=boot();")+";").replace("markLesson('g1');persist();","state.n3.cursor='n3u02';n3State(N3_UNITS[1]).draft='仅有N3草稿';persist();").replaceAll("state.completed.includes('g1')","state.n3.units.n3u02?.draft==='仅有N3草稿'").replace("window.testDocs.get('alice:study').payload.completed.includes('g1')","window.testDocs.get('alice:study').payload.n3.units.n3u02?.draft==='仅有N3草稿'");
new Function('require',cloud)(require);
