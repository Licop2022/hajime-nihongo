const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map(),events={};
function el(s){if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(s)}
const document={querySelector:el,querySelectorAll:()=>[],addEventListener:(n,fn)=>{(events[n]??=[]).push(fn)}};
const storage=new Map();const context=vm.createContext({document,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,Date,JSON,Math,Number,String,Array,setTimeout:()=>0,clearTimeout(){}});
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
function check(code){return vm.runInContext(code,context)}
assert(check("lessons.length===12 && lessons.every(l=>l.examples.length>0 && l.options[l.answer] && l.rule && l.why)"));
assert(check("kanaRows.flatMap(r=>Array.from(r[0])).filter(k=>k!==' ').length===46"));
assert(check("new Set(kanaRows.flatMap(r=>Array.from(r[0])).filter(k=>k!==' ')).size===46"));
for(const p of ['home','kana','lessons','grammar','practice','progress']){check(`page='${p}';render(false)`);assert(el('#view').innerHTML.length>500);}
check("openLesson('g11')");assert(el('#lessonDialog').open);assert(el('#lessonBody').innerHTML.includes('読んで'));
for(let i=0;i<100;i++){check(`quizIndex=${i%10};quizRound=${i};quizType='kana'`);assert(check("(()=>{let q=getQuestion();return q.options.length===4&&new Set(q.options).size===4&&q.options[q.answer]})()"));}
const listeners=events.click;const b={dataset:{id:'g1'},id:'completeLesson',classList:{contains(){return false}}};listeners[0]({target:{closest:()=>b}});assert(check("state.completed.includes('g1') && state.days.length===1"));assert(JSON.parse(storage.get('hajime-study-v1')).completed.includes('g1'));
const parent={dataset:{},children:Array.from({length:3},()=>({classList:{add(){}}}))};const answer={id:'',dataset:{lessonanswer:'0',id:'g1'},parentElement:parent,classList:{add(){},contains(){return false}}};listeners[0]({target:{closest:()=>answer}});assert(check('state.correct===1 && state.attempts===1'));listeners[0]({target:{closest:()=>answer}});assert(check('state.attempts===1'));
assert(fs.existsSync('dist/landscape.svg'));assert(fs.readFileSync('dist/style.css','utf8').includes('[hidden]{display:none!important}'));
console.log('Passed: all six views, 12 lesson contracts, 46 unique kana, 100 generated quizzes, lesson completion persistence, answer feedback, duplicate-answer prevention, static assets.');
