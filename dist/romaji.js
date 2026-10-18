/* Reading hints use the supplied kana, never infer unknown kanji readings. */
const romanKana={};
for(const [row,sounds] of [['あいうえお','a i u e o'],['かきくけこ','ka ki ku ke ko'],['さしすせそ','sa shi su se so'],['たちつてと','ta chi tsu te to'],['なにぬねの','na ni nu ne no'],['はひふへほ','ha hi fu he ho'],['まみむめも','ma mi mu me mo'],['やゆよ','ya yu yo'],['らりるれろ','ra ri ru re ro'],['わをん','wa o n'],['がぎぐげご','ga gi gu ge go'],['ざじずぜぞ','za ji zu ze zo'],['だぢづでど','da ji zu de do'],['ばびぶべぼ','ba bi bu be bo'],['ぱぴぷぺぽ','pa pi pu pe po'],['ぁぃぅぇぉゔ','a i u e o vu']])Array.from(row).forEach((k,i)=>romanKana[k]=sounds.split(' ')[i]);
for(const [k,r] of Object.entries({'き':'ky','ぎ':'gy','し':'sh','じ':'j','ち':'ch','ぢ':'j','に':'ny','ひ':'hy','び':'by','ぴ':'py','み':'my','り':'ry'}))for(const [small,v] of [['ゃ','a'],['ゅ','u'],['ょ','o']])romanKana[k+small]=r+v;
Object.assign(romanKana,{'しぇ':'she','じぇ':'je','ちぇ':'che','てぃ':'ti','でぃ':'di','とぅ':'tu','どぅ':'du','ふぁ':'fa','ふぃ':'fi','ふぇ':'fe','ふぉ':'fo','うぃ':'wi','うぇ':'we','うぉ':'wo','ゔぁ':'va','ゔぃ':'vi','ゔぇ':'ve','ゔぉ':'vo'});
function kanaRoman(text,sentence=false){
 let input=String(text).normalize('NFKC').replace(/[ァ-ヶ]/g,k=>String.fromCharCode(k.charCodeAt(0)-0x60));
 if(sentence)input=input.replace(/[^\s。！？、「」]+/g,token=>{
  if(token==='は')return 'わ';if(token==='へ')return 'え';if(token==='こんにちは')return 'こんにちわ';if(token==='こんばんは')return 'こんばんわ';
  if(token!=='はは')token=token.replace(/(.+)は$/,'$1 わ').replace(/(.+)へ$/,'$1 え');
  return token.replace(/では(?=ありません|ない|なく)/g,'でわ');
 });
 let out='',geminate=false;
 for(let i=0;i<input.length;i++){
  const char=input[i];if(char==='っ'){geminate=true;continue;}
  if(char==='ー'){out+=(out.match(/[aeiou](?=[^aeiou]*$)/)||[''])[0];continue;}
  let sound=romanKana[input.slice(i,i+2)];if(sound)i++;else sound=romanKana[char];
  if(sound){if(geminate){out+=sound.startsWith('ch')?'t':/^[bcdfghjklmpqrstvwxyz]/.test(sound)?sound[0]:'';geminate=false;}if(char==='ん'&&/^[aeiouy]/.test(romanKana[input[i+1]]||''))sound="n'";out+=sound;}
  else {geminate=false;out+=({'。':'. ','、':', ','！':'! ','？':'? ','・':' · '})[char]??char;}
 }
 return out.replace(/ +/g,' ').trim();
}
function romanLine(kana,sentence=false){if(!kana)return '';return `<span class="romaji" lang="ja-Latn">${esc(kanaRoman(kana,sentence))}</span>`;}
function romanExample(ja,translation){
 const example=typeof N5_UNITS!=='undefined'?N5_UNITS.flatMap(u=>u.grammar.flatMap(g=>g.examples)).find(e=>e[0]===ja):null;
 const supplied=example?.[1]||String(translation||'').split(' / ')[0];
 if(example||(/^[\s\u3040-\u30ff。、！？「」0-9]+$/.test(supplied)&&/[ぁ-んァ-ン]/.test(supplied)))return romanLine(supplied,true);
 return /^[\s\u3040-\u30ff。、！？「」0-9]+$/.test(ja)?romanLine(ja,true):'';
}
let romanVisible=true;
try{romanVisible=localStorage.getItem('hajime-romaji')!=='off';}catch{}
function setRomanVisible(on){romanVisible=on;document.querySelector('body').classList.toggle('hide-romaji',!on);const b=document.querySelector('#romajiToggle');if(b){b.textContent=on?'罗马音：显示':'罗马音：隐藏';b.setAttribute?.('aria-pressed',String(on));}}
setRomanVisible(romanVisible);
document.querySelector('#romajiToggle')?.addEventListener('click',()=>{setRomanVisible(!romanVisible);try{localStorage.setItem('hajime-romaji',romanVisible?'on':'off');}catch{}});
