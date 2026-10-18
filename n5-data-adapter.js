// Keep the earlier IDs and their study records. New content has stable unit IDs.
const n5WordIndex=new Map(words.filter(w=>w.level==='N5').map(w=>[w.word+'|'+w.reading,w.id]));
function addN5Word(row,id){const [word,reading,meaning,pos]=row,key=word+'|'+reading;if(n5WordIndex.has(key))return n5WordIndex.get(key);words.push({id,level:'N5',word,reading,meaning,pos});n5WordIndex.set(key,id);return id;}
for(const u of N5_UNITS){
 u.wordIds=u.vocab.map((r,i)=>addN5Word(r,`n5-${u.id}-w${i+1}`));
 u.grammarIds=u.grammar.map((g,i)=>{const id=`n5-${u.id}-g${i+1}`;grammar.push({...g,id,level:'N5',topic:u.title,desc:g.rule.split('。')[0]+'。',examples:g.examples.map(e=>[e[0],e[1]+' / '+e[2]]),tip:g.pitfall});return id;});
 for(const [name,target,type]of [['reading',readings,'r'],['listening',listenings,'l']]){
  const t=u[name];t.ids=t.questions.map((q,i)=>{const id=`n5-${u.id}-${type}${i+1}`;target.push({...q,id,level:'N5',type,title:t.title,text:t.text,translation:t.translation,unit:u.id});return id;});
 }
}
N5_REFERENCE.wordIds=N5_REFERENCE.vocab.map((r,i)=>addN5Word(r,`n5-extra-w${i+1}`));
