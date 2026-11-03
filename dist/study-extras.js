const N4_STAGES=['words','grammar','reading','listening','review'];
const N4_STAGE_LABELS={words:'词汇认读',grammar:'句型与例句',reading:'阅读理解',listening:'听力理解',review:'单元复习'};
const N3_STAGES=N4_STAGES;
const N3_STAGE_LABELS=N4_STAGE_LABELS;
function structuredCourseSources(){return [['n4','N4',N4_UNITS],...(typeof N3_UNITS==='undefined'?[]:[['n3','N3',N3_UNITS]])];}
function cleanStructuredCourse(raw,units,level){
 const list=x=>Array.isArray(x)?x:[],known=new Set(units.map(u=>u.id));
 const out={units:{},cursor:known.has(raw?.cursor)?raw.cursor:null,stage:N4_STAGES.includes(raw?.stage)?raw.stage:'words',number:Number.isInteger(raw?.number)&&raw.number>0?Math.min(raw.number,100000):1,final:{answers:{},submitted:false}};
 const validAnswers=(map,ids)=>Object.fromEntries(Object.entries(map&&typeof map==='object'?map:{}).filter(([id,a])=>{const q=questionById(id);return ids.includes(id)&&q&&Number.isInteger(a)&&a>=0&&a<q.options.length;}));
 for(const u of units){const s=raw?.units?.[u.id];if(!s||typeof s!=='object')continue;const ids=[...u.grammarIds,...(u.reading.ids||[u.reading.id]),...(u.listening.ids||[u.listening.id])];out.units[u.id]={done:[...new Set(list(s.done).filter(k=>N4_STAGES.includes(k)))],ratings:[...new Set(list(s.ratings).filter(id=>u.wordIds.includes(id)))],answers:validAnswers(s.answers,ids),review:validAnswers(s.review,ids),draft:String(s.draft||'').slice(0,4000)};}
 const finalIds=level==='N3'?units.flatMap((u,i)=>[u.grammarIds[i%2],u[i%2?'reading':'listening'].ids[0]]):grammar.filter(g=>g.level===level).map(g=>g.id).concat(readings.filter(t=>t.level===level).map(t=>t.id),listenings.filter(t=>t.level===level).map(t=>t.id));
 out.final.answers=validAnswers(raw?.final?.answers,finalIds);out.final.submitted=!!raw?.final?.submitted&&(level!=='N3'||finalIds.every(id=>Number.isInteger(out.final.answers[id])));
 const day=raw?.day;if(day&&known.has(day.unit)&&Array.isArray(day.stages)&&day.stages.length>0&&day.stages.every(k=>N4_STAGES.includes(k)))out.day={unit:day.unit,stages:[...new Set(day.stages)]};return out;
}
function cleanStudyExtras(raw){
 const favorite=k=>{if(typeof k!=='string')return false;const [kind,id,index]=k.split(':');if(kind==='word')return words.some(w=>w.id===id);const g=grammar.find(g=>g.id===id);return !!g&&(kind==='grammar'||kind==='example'&&/^\d+$/.test(index)&&Number(index)<g.examples.length);};
 const out={favorites:[...new Set((Array.isArray(raw.favorites)?raw.favorites:[]).filter(favorite))].slice(0,5000)};for(const [key,level,units]of structuredCourseSources())out[key]=cleanStructuredCourse(raw[key],units,level);return out;
}
function mergeStudyExtras(a,b){
 const x=cleanStudyExtras(a),y=cleanStudyExtras(b);b.favorites=[...new Set([...x.favorites,...y.favorites])];
 for(const [key]of structuredCourseSources()){const old=x[key],next=y[key];for(const [id,v]of Object.entries(old.units)){const z=next.units[id];next.units[id]=z?{...z,done:[...new Set([...v.done,...z.done])],ratings:[...new Set([...v.ratings,...z.ratings])],answers:{...v.answers,...z.answers},review:{...v.review,...z.review},draft:z.draft||v.draft}:v;}
  if(!next.cursor)next.cursor=old.cursor;if(!next.day&&old.day)next.day=old.day;next.number=Math.max(old.number,next.number);if(key==='n3'){const incoming=Object.keys(next.final.answers).length;next.final={answers:{...old.final.answers,...next.final.answers},submitted:next.final.submitted||!incoming&&old.final.submitted};}else if(!Object.keys(next.final.answers).length)next.final=old.final;b[key]=next;
 }return b;
}
