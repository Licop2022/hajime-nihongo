// Answer identifiers only. Question text and recordings stay on the JLPT website.
const fs=require('fs'),assert=require('assert');
const groupCounts={N5:[4,3,3,4],N4:[5,3,3,4],N3:[5,3,4,5],N2:[6,3,5,5]};
const expected={'2018-N5':[35,26,6,24],'2012-N5':[33,26,6,24],'2018-N4':[35,25,10,28],'2012-N4':[34,25,10,28],'2018-N3':[35,23,16,28],'2012-N3':[33,23,16,27],'2018-N2':[32,22,21,32],'2012-N2':[32,22,21,31]};
const names={vocab:{N5:['汉字读音','表记','文脉选词','近义表达'],N4:['汉字读音','表记','文脉选词','近义表达','词语用法'],N3:['汉字读音','表记','文脉选词','近义表达','词语用法'],N2:['汉字读音','表记','词语构成','文脉选词','近义表达','词语用法']},grammar:['语法形式','句子排序','篇章语法'],reading:{N5:['短篇理解','中篇理解','信息检索'],N4:['短篇理解','中篇理解','信息检索'],N3:['短篇理解','中篇理解','长篇理解','信息检索'],N2:['短篇理解','中篇理解','综合理解','主旨理解','信息检索']},listening:{N5:['课题理解','要点理解','表达理解','即时应答'],N4:['课题理解','要点理解','表达理解','即时应答'],N3:['课题理解','要点理解','概要理解','表达理解','即时应答'],N2:['课题理解','要点理解','概要理解','即时应答','综合理解']}};
const papers=[];
for(const year of [2018,2012])for(const level of ['N5','N4','N3','N2']){
 const id=`${year}-${level}`,text=fs.readFileSync(`.package/official-reference/${id}.txt`,'utf8').normalize('NFKC');let groups=[],current;
 for(const raw of text.split('\n')){const line=raw.trim().replace(/\s+/g,' ');if(line.startsWith('問題')){current={example:line.includes('例'),answers:[]};groups.push(current);}else if(current&&/^[1-4](?: [1-4])*$/.test(line))current.answers.push(...line.split(' ').map(Number));}
 assert.equal(groups.length,groupCounts[level].reduce((a,b)=>a+b,0),id);
 const sections=[];let cursor=0,number=1;
 for(const [si,type] of ['vocab','grammar','reading','listening'].entries()){
  if(si===1&&level!=='N2')number=1;
  const section={type,groups:[]};
  for(let i=0;i<groupCounts[level][si];i++){
   const raw=groups[cursor++],answers=raw.example?raw.answers.slice(1):raw.answers;
   const title=(Array.isArray(names[type])?names[type]:names[type][level])[i];
   const groupNumber=type==='reading'?(level==='N2'?10:4)+i:type==='grammar'&&level==='N2'?7+i:i+1;
   const questions=answers.map((answer,j)=>{const label=type==='listening'?`${groupNumber}-${level==='N2'&&i===4&&j>=2?`3(${j-1})`:j+1}`:String(number++);return{id:`${id}-${type}-${i+1}-${j+1}`,label,answer,options:type==='listening'&&(['N5','N4'].includes(level)&&i===2||type==='listening'&&level==='N3'&&i===3||type==='listening'&&i===(level==='N2'?3:level==='N3'?4:3))?3:4};});
   section.groups.push({id:`${type}-${i+1}`,number:groupNumber,title,questions});
  }
  sections.push(section);
 }
 assert.deepEqual(sections.map(s=>s.groups.flatMap(g=>g.questions).length),expected[id],id);
 assert(sections.every(s=>s.groups.every(g=>g.questions.every(q=>q.answer<=q.options))),id+' options');
 papers.push({id,year,level,sections});
}
fs.writeFileSync('dist/real-data.js','// Numerical answer facts verified against official answer PDFs; no question text or audio is hosted.\nconst REAL_PAPERS='+JSON.stringify(papers,null,2)+';\n');
console.log(papers.map(p=>`${p.id}: ${p.sections.map(s=>s.groups.flatMap(g=>g.questions).length).join('/')} questions`).join('\n'));
