const fs=require('fs'),vm=require('vm'),assert=require('assert');
const c=vm.createContext({document:{querySelector:()=>({classList:{toggle(){}},addEventListener(){}})},localStorage:{getItem(){return null}},esc:s=>String(s)});
vm.runInContext(fs.readFileSync('dist/romaji.js','utf8'),c);
for(const [kana,roman,sentence] of [['がっこう','gakkou'],['きって','kitte'],['まっちゃ','matcha'],['びょういん','byouin'],['びよういん','biyouin'],['コーヒー','koohii'],['しんよう','shin\'you'],['コンピューター','konpyuutaa'],['わたしは がくせいです。','watashi wa gakuseidesu.',true],['がっこうへ いきます。','gakkou e ikimasu.',true],['こんにちは。','konnichiwa.',true],['せんせいではありません。','senseidewaarimasen.',true]])assert.equal(vm.runInContext(`kanaRoman(${JSON.stringify(kana)},${!!sentence})`,c),roman);
console.log('PASS: long vowels, contracted sounds, sokuon, syllabic n, katakana, and sentence particles.');
