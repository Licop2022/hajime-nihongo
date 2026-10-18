const fs=require('fs'),vm=require('vm'),assert=require('assert');
const units=[...JSON.parse(fs.readFileSync('n5-units-a.json','utf8')),...JSON.parse(fs.readFileSync('n5-units-b.json','utf8'))];
const reference=JSON.parse(fs.readFileSync('n5-reference.json','utf8'));
assert.equal(units.length,24);
for(const [i,u]of units.entries()){
 assert.equal(u.id,`u${String(i+1).padStart(2,'0')}`);assert.equal(u.grammar.length,3);assert(u.vocab.length>=20);
 for(const t of [u.reading,u.listening]){assert(t.text&&t.kana&&t.translation);assert.equal(t.questions.length,3);}
 for(const q of [...u.grammar,...u.reading.questions,...u.listening.questions])assert(q.q&&q.why&&q.options[q.answer]&&new Set(q.options).size===q.options.length);
}
assert(reference.kanji.length>=100);assert(reference.vocab.length>=300);
fs.writeFileSync('dist/n5-data.js',`// 原创 N5 教学课程；非官方公布的考纲或词表。\nconst N5_UNITS=${JSON.stringify(units)};\nconst N5_REFERENCE=${JSON.stringify(reference)};\n`+fs.readFileSync('n5-data-adapter.js','utf8'));
console.log(`Built ${units.length} units, ${units.length*3} grammar explanations, ${units.length*2} texts, ${units.length*9} contextual questions, ${reference.kanji.length} kanji.`);
