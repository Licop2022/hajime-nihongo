const fs=require('fs'),vm=require('vm'),assert=require('assert');
function boot(saved={}){const els=new Map(),events={},store=new Map(Object.entries(saved));function el(s){if(!els.has(s))els.set(s,{innerHTML:'',textContent:'',hidden:false,remove(){},prepend(){},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false}});return els.get(s)}const ctx=vm.createContext({document:{createElement:el,querySelector:el,querySelectorAll:()=>[],addEventListener:(n,f)=>{(events[n]??=[]).push(f)}},window:{scrollTo(){},addEventListener(){}},location:{hash:''},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console,Date,JSON,Math,Number,String,Array,Set,Map,setTimeout:()=>0,clearTimeout(){},setInterval(){return 0}});for(const f of ['base-data.js','curriculum.js','n5-data.js','romaji.js','journey.js','guided.js','real-data.js','real.js','n5.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);return{run:c=>vm.runInContext(c,ctx),els,events,store};}
const t=boot({'hajime-study-v1':JSON.stringify({completed:['g1','g11'],seen:['あ'],attempts:3,correct:2,days:['2026-10-10']})});
assert(t.run("state.completed.includes('g1')&&state.completed.includes('g11')&&state.attempts===3&&state.seen[0]==='あ'"));
assert.equal(t.run('grammar.length'),140);assert(t.run('words.length')>=620);assert.equal(t.run('readings.length'),84);assert.equal(t.run('listenings.length'),84);
assert(t.run("[...grammar,...words,...readings,...listenings].length===new Set([...grammar,...words,...readings,...listenings].map(x=>x.id)).size"));
assert(t.run("[...grammar,...readings,...listenings].every(q=>q.title&&q.q&&q.why&&q.options[q.answer]&&new Set(q.options).size===q.options.length)"));
assert(t.run("words.every(w=>{const q=wordQuestion(w);return q.options.length===4&&q.options[q.answer]===w.meaning&&new Set(q.options).size===4;})"));
for(const l of ['N5','N4','N3','N2']){for(const p of ['home','kana','lessons','grammar','vocab','reading','listening','practice','progress','plan']){t.run(`level='${l}';page='${p}';render(false)`);assert(t.els.get('#view').innerHTML.length>500);}t.run("startQuiz('exam')");assert(t.run("state.activeQuiz.ids.length===20&&new Set(state.activeQuiz.ids).size===20"));assert(t.run("JSON.stringify(state.activeQuiz.ids.map(questionById).reduce((a,q)=>(a[q.type]=(a[q.type]||0)+1,a),{}))===JSON.stringify({grammar:8,vocab:6,reading:3,listening:3})"));t.run("state.activeQuiz.answers=state.activeQuiz.ids.map(id=>questionById(id).answer);finishQuiz()");assert(t.run('state.history.at(-1).score===100'));}
const q=t.run("questionById('n2-g1')");t.run("recordAnswer(questionById('n2-g1'),0)");assert(t.run("state.mistakes['n2-g1'].count===1"));t.run("recordAnswer(questionById('n2-g1'),1)");assert(t.run("!state.mistakes['n2-g1']"));
t.run("level='N4';page='practice';startQuiz('grammar');state.activeQuiz.answers.push(questionById(state.activeQuiz.ids[0]).answer);persist()");const resumed=boot({'hajime-study-v2':t.store.get('hajime-study-v2')});assert(resumed.run("state.activeQuiz.answers.length===1&&state.activeQuiz.ids.length===10"));t.run('finishQuiz()');assert.equal(t.run('state.history.length'),4);
assert(t.run("cleanState({completed:['g1','fake','g1'],wordReviews:{fake:{box:9,due:'2026-10-10'}},correct:999,attempts:2}).completed.length===1"));assert(t.run("cleanState({completed:[],correct:999,attempts:2}).correct===2"));assert(t.run("cleanState({completed:[],activeQuiz:{level:'N5',mode:'exam',ids:['fake'],answers:[],index:0}}).activeQuiz===null"));
console.log('PASS: 40 level/page views; 140 grammar, expanded vocabulary, 168 text questions; valid unique content; four 20-question exams and per-section scores; v1 migration; wrong-answer review; saved quiz resumption; incomplete-exam exclusion; import sanitization.');
const beginner=boot();assert(beginner.run("studyDay().steps.map(x=>x.kind).join(',')==='kana,recall'"));
beginner.run("studyDay().steps[0].done=true;studyDay().writing='あいうえお';persist()");
const restored=boot({'hajime-study-v2':beginner.store.get('hajime-study-v2')});assert(restored.run("studyDay().steps[0].done&&studyDay().writing==='あいうえお'"));
restored.run("studyDay().steps[1].done=true;state.guide.foundation=1;archiveDay();makeStudyDay()");assert(restored.run("studyDay().number===2&&studyDay().foundation===1&&state.guide.archive[0].writing==='あいうえお'"));
const study=boot();study.run("state.guide.foundation=foundationTotal;state.guide.day=null;state.plan.minutes=20;makeStudyDay()");assert(study.run("studyDay().n5Unit==='u01'&&studyDay().n5Stages[0]==='words1'"));
study.run("state.plan.start='N4';state.guide.day=null;makeStudyDay();state.completed.push(studyDay().steps[0].ids[0]);syncStudyDay()");assert(study.run("studyDay().steps[0].done&&!studyDay().steps[1].done"));
study.run("guideActive=true;page='practice';const p=studyDay().steps.at(-1);state.activeQuiz={level:studyDay().level,mode:'grammar',ids:p.ids,answers:[],index:0};finishQuiz()");assert(study.run("!studyDay().steps.at(-1).done"));
study.run("const p2=studyDay().steps.at(-1);state.activeQuiz={level:studyDay().level,mode:'grammar',ids:p2.ids,answers:p2.ids.map(id=>questionById(id).answer),index:p2.ids.length-1};finishQuiz()");assert(study.run("studyDay().steps.at(-1).done"));
assert(study.run("cleanState({...state,guide:{foundation:999,number:-4,day:{date:'bad',steps:[]}}}).guide.day===null"));
console.log('PASS: beginner order, persisted partial day and writing, manual next study day with archive, targeted practice, incomplete practice does not complete daily step, and guided import validation.');
const real=boot();const dailyBefore=real.run('JSON.stringify(state)');
assert(real.run('REAL_PAPERS.length===8&&REAL_PAPERS.every(p=>realQuestions(p).every(q=>q.answer>=1&&q.answer<=q.options))'));
for(const year of [2018,2012])for(const l of ['N5','N4','N3','N2']){
 real.run(`page='real';level='${l}';realYear=${year};startReal('all')`);
 assert(real.run("realState.active.paper===`${realYear}-${level}`&&renderReal().includes('答题卡')"));
 real.run('realState.active.answers=Object.fromEntries(realQuestions(realPaper(realState.active.paper)).map(q=>[q.id,q.answer]));finishReal()');
 assert(real.run('realStats(realState.history.at(-1)).correct===realStats(realState.history.at(-1)).total'));
}
assert.equal(real.run('JSON.stringify(state)'),dailyBefore,'real training must not modify daily study state');
real.run("realResult=-1;realYear=2018;level='N5';startReal('grammar-2');realState.active.answers[realQuestions(realPaper(realState.active.paper),'grammar-2')[0].id]=2;realState.active.flags=[realQuestions(realPaper(realState.active.paper),'grammar-2')[1].id];realState.active.notes='排序题笔记';realPause()");
const realRestored=boot({'hajime-real-v1':real.store.get('hajime-real-v1')});assert(realRestored.run("realState.active.scope==='grammar-2'&&Object.keys(realState.active.answers).length===1&&realState.active.flags.length===1&&realState.active.notes==='排序题笔记'&&realState.history.length===8"));
realRestored.run('finishReal()');assert(realRestored.run('realStats(realState.history.at(-1)).total===5&&realStats(realState.history.at(-1)).answered===1'));
assert(real.run("cleanReal({active:{paper:'unknown',scope:'all'},history:[]}).active===null"));
assert(real.run("cleanReal({active:{paper:'2018-N5',scope:'grammar-2',answers:{fake:1,'2018-N5-grammar-2-1':9}},history:[]}).active!==null"));
assert(real.run("Object.keys(cleanReal({active:{paper:'2018-N5',scope:'grammar-2',answers:{fake:1,'2018-N5-grammar-2-1':9}},history:[]}).active.answers).length===0"));
console.log('PASS: eight official workbook answer banks, complete grading, daily-state isolation, subgroup scope, saved answers/flags/notes, partial submission, and import validation.');



