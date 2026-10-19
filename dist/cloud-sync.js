/* Local-first progress with account-scoped caches and compare-and-swap uploads. */
(function(){
 'use strict';
 const cfg=window.HAJIME_CLOUD_CONFIG,copy=x=>JSON.parse(JSON.stringify(x));
 const cacheKey=u=>'hajime-cloud-cache-v1:'+u,baseKey=(u,n)=>'hajime-cloud-base-v1:'+u+':'+n;
 const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 let client=null,user=null,applying=false,initPromise=null,timer=null,uiBusy=false,pendingPaint=false,binding=0;
 let owner=localStorage.getItem('hajime-cloud-owner-v1')||'guest';
 let status='尚未登录 · 本机自动保存',message='',lastSync='',importReceipt='';
 const snapshot=()=>({study:copy(state),real:copy(realState)});
 function normalize(name,payload){return name==='study'?cleanState(payload):cleanReal(payload);}
 function rememberLocal(){put(cacheKey(owner),snapshot());}
 function localChanged(){if(applying)return;try{rememberLocal();}catch{setStatus('本机同步缓存保存失败，请导出学习记录');return;}if(user){setStatus('本机已保存 · 等待同步');clearTimeout(timer);timer=setTimeout(synchronize,1000);}}
 const persistLocal=persist,saveRealLocal=saveReal;
 persist=function(){persistLocal();localChanged();};
 saveReal=function(){saveRealLocal();localChanged();};
 function repaint(){
  // Avoid destroying a word card, draft or an open lesson while the learner uses it.
  if(document.activeElement?.matches('input,textarea')||$('#lessonDialog')?.open){pendingPaint=true;return;}
  const expanded=[...document.querySelectorAll('.n5-word details[open]')].map(d=>d.closest('[data-word-id]')?.dataset.wordId);
  const top=window.scrollY;render(false);
  for(const id of expanded){const el=[...document.querySelectorAll('.n5-word[data-word-id]')].find(x=>x.dataset.wordId===id);if(el)el.querySelector('details').open=true;}
  window.scrollTo({top,behavior:'instant'});pendingPaint=false;
 }
 function applyDocument(name,payload){
  const valid=normalize(name,payload);applying=true;
  try{if(name==='study'){state=valid;level=state.level;n5Selected=state.course.cursor?.unit||null;n5Stage=state.course.cursor?.stage||'words1';n5Tab=state.course.cursor?.tab||'course';persistLocal();}else{realState=valid;saveRealLocal();}rememberLocal();}finally{applying=false;}
 }
 const engine=new window.HajimeCloudEngine({
  read:(u,n)=>{if(user?.id!==u)throw Error('账号已切换');return snapshot()[n];},
  apply:(u,n,p)=>{if(user?.id!==u)throw Error('账号已切换');applyDocument(n,p);pendingPaint=true;},
  isEmpty:(n,p)=>n==='real'?!p.active&&!p.history.length:!p.completed.length&&!p.seen.length&&!p.attempts&&!p.days.length&&!Object.keys(p.wordReviews).length&&!p.textDone.length&&!p.course?.kanji?.length&&!Object.keys(p.course?.units||{}).some(id=>{const x=p.course.units[id];return x.done.length||x.ratings.length||Object.keys(x.answers).length||x.draft;})&&!(p.guide?.foundation||0)&&!p.guide?.archive?.length&&!p.guide?.day?.writing&&!p.activeQuiz&&['target','minutes','start'].every(k=>p.plan[k]===emptyState().plan[k]),
  checkpoint:async(u,n)=>readJSON(baseKey(u,n)),
  remember:async(u,n,d)=>put(baseKey(u,n),d),
  backup:async(u,n,d)=>{put('hajime-cloud-conflict-v1:'+u+':'+n,d);},
  fetch:async(u,n)=>{const {data,error}=await client.from('hajime_progress').select('payload,revision,updated_at').eq('user_id',u).eq('namespace',n).maybeSingle();if(error)throw error;return data?{...data,payload:normalize(n,data.payload)}:null;},
  save:async(u,n,p,r)=>{if(user?.id!==u)throw Error('账号已切换');const {data,error}=await client.rpc('hajime_save_progress',{p_namespace:n,p_payload:p,p_expected_revision:r});if(error)throw error;return data;}
 });
 const dialog=document.createElement('dialog');dialog.id='cloudDialog';
 dialog.innerHTML='<button class="close" id="cloudClose" aria-label="关闭云端同步">×</button><h2>账号与云端同步</h2><p id="cloudStatus" role="status"></p><div id="cloudAccount"></div><div id="cloudForms"></div><div id="cloudConflicts"></div><p id="cloudMessage" role="status"></p><p class="cloud-note">同一账号可在手机、电脑同步。断网时自动保存在本机。</p>';
 document.body.append(dialog);
 function setStatus(text){status=text;const el=$('#cloudStatus');if(el)el.textContent=text;const b=$('#cloudSyncButton');if(b){b.textContent=user?'☁ '+(text.includes('已同步')?'已同步':'云端同步'):'登录 / 同步';b.title=text;}}
 function setMessage(text){message=text;$('#cloudMessage').textContent=text;}
 function renderPanel(){
  setStatus(status);setMessage(message);
  $('#cloudAccount').innerHTML=user?`<p class="cloud-account">已登录：<strong>${esc(user.email||'学习账号')}</strong></p><div class="toolbar"><button class="primary" id="cloudNow">立即同步</button><button class="secondary" id="cloudImportGuest">导入本机原有进度</button><button class="secondary" id="cloudLogout">退出账号</button></div><p id="cloudSummary">${lastSync?`最近同步：${esc(lastSync)}`:'首次登录会先读取云端记录。'}<br>共用设备请使用独立浏览器账号。</p>`:'';
  // Auth inputs are only rebuilt when opening the dialog or when the session changes.
  $('#cloudForms').innerHTML=user?'':cfg?'<form id="cloudLoginForm"><label for="cloudEmail">邮箱<input id="cloudEmail" type="email" autocomplete="username" required maxlength="254"></label><label for="cloudPassword">密码<input id="cloudPassword" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label><div class="toolbar"><button class="primary" type="submit">登录并同步</button><button class="secondary" type="button" id="cloudSignup">注册账号</button></div><p class="cloud-note">注册后验证邮箱，再回来登录。</p></form>':'<p class="cloud-note">云端服务暂未配置。本地学习与记录导出不受影响。</p>';
  renderConflicts();
 }
 function renderConflicts(){
  $('#cloudConflicts').innerHTML=[...engine.conflicts.keys()].map(n=>`<div class="cloud-conflict"><h3>${n==='study'?'学习记录':'真题记录'}在两台设备上都有修改</h3><p>两份记录已在本机备份。请选择后继续同步；覆盖前可先导出备份。</p><button class="secondary" data-cloud-export="${n}">导出两份备份</button><button class="secondary" data-cloud-choice="remote" data-cloud-name="${n}">采用云端记录</button><button class="primary" data-cloud-choice="local" data-cloud-name="${n}">采用本机记录</button></div>`).join('');
 }
 function saveAllForOwner(){rememberLocal();}
 function progressSummary(values){
  const s=cleanState(values.study),r=cleanReal(values.real);
  return `语法 ${s.completed.length} 课 · 假名 ${s.seen.length} 个 · 复习词汇 ${Object.keys(s.wordReviews).length} 个 · 单元步骤 ${Object.values(s.course.units).reduce((n,u)=>n+u.done.length,0)} 步 · 已自评单词 ${new Set(Object.values(s.course.units).flatMap(u=>u.ratings)).size} 个 · 入门 ${s.guide.foundation} 组 · 学习日 ${s.guide.number} · 真题历史 ${r.history.length} 次`;
 }
 async function bindUser(next){
  if(user?.id===next?.id)return;
  const generation=++binding;saveAllForOwner();engine.setUser(null);user=next||null;importReceipt='';message='';
  const nextOwner=user?.id||'guest',cached=readJSON(cacheKey(nextOwner));owner=nextOwner;
  localStorage.setItem('hajime-cloud-owner-v1',owner);
  const values=cached||{study:cleanState(emptyState()),real:realEmpty()};
  applyDocument('study',values.study);applyDocument('real',values.real);
  // Pause an imported timer on this device; two devices must not count the same running interval.
  if(realState.active?.runningSince){realState.active.elapsed=realElapsed(realState.active);realState.active.runningSince=null;saveRealLocal();rememberLocal();}
  if(engine.running)await engine.running.catch(()=>{});if(generation!==binding)return;engine.setUser(user?.id);pendingPaint=true;repaint();
  setStatus(user?'已登录 · 正在读取云端进度':'已退出 · 本机自动保存');
  if(dialog.open)renderPanel();if(user)await synchronize();
 }
 async function init(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{if(!cfg||!window.supabase?.createClient)return;
   client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{storageKey:'hajime-cloud-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   client.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED')return;setTimeout(()=>bindUser(session?.user||null).catch(e=>setMessage('账号恢复失败：'+e.message)),0);});
   const {data,error}=await client.auth.getSession();if(error)throw error;
   await bindUser(data.session?.user||null);
  })().catch(e=>{initPromise=null;setStatus('云端连接失败 · 本机记录保留');setMessage(e.message);throw e;});return initPromise;
 }
 async function synchronize(){
  if(!user||!client)return;if(!navigator.onLine){setStatus('离线 · 本机记录保留，联网后同步');return;}
  const id=user.id;setStatus('正在同步 · 本机记录已保存');
  try{const result=await engine.synchronize();if(user?.id!==id)return;
   const statuses=Object.values(result).map(x=>x?.status);renderConflicts();
   if(statuses.includes('conflict'))setStatus('存在两端修改 · 请打开云端同步处理');
   else if(statuses.includes('pending')){setStatus('同步未完成 · 本机记录保留，稍后重试');setMessage('请检查网络或重新登录。学习记录仍保存在本机。');}
   else{lastSync=new Date().toLocaleString('zh-CN');setStatus('已同步 · '+lastSync);setMessage(importReceipt);}
   if(pendingPaint)repaint();const summary=$('#cloudSummary');if(summary)summary.textContent='最近同步：'+lastSync;
  }catch(e){setStatus('同步未完成 · 本机记录保留');setMessage(e.message);}
 }
 async function resolveConflict(name,choice){
  if(!user)return;const conflict=engine.conflicts.get(name);if(!conflict?.remote){await synchronize();return;}
  const id=user.id;if(choice==='remote'){applyDocument(name,conflict.remote.payload);put(baseKey(id,name),conflict.remote);engine.conflicts.delete(name);}
  else {const local=copy(snapshot()[name]),response=await engine.adapter.save(id,name,local,conflict.remote.revision);if(user?.id!==id)return;if(!response.accepted){await synchronize();return;}put(baseKey(id,name),response.document);engine.conflicts.delete(name);}
  pendingPaint=true;renderConflicts();await synchronize();
 }
 async function importGuest(){
  if(!user)return;
  // Finish any download before merging, so a first-login request cannot replace the import.
  await synchronize();
  const account=user?.id;if(!account)return;
  const guest=readJSON(cacheKey('guest'));if(!guest){setMessage('未找到登录前的本机记录。也可在学习档案导入原来导出的 JSON 文件。');return;}
  const before=progressSummary(snapshot()),source=progressSummary(guest);
  // Union completed learning items while keeping ambiguous active sessions and drafts explicit as conflicts.
  const a=state,b=cleanState(guest.study);b.completed=[...new Set([...a.completed,...b.completed])];b.seen=[...new Set([...a.seen,...b.seen])];b.textDone=[...new Set([...a.textDone,...b.textDone])];b.days=[...new Set([...a.days,...b.days])];b.wordReviews={...a.wordReviews,...b.wordReviews};b.mistakes={...a.mistakes,...b.mistakes};b.history=[...new Map([...a.history,...b.history].map(x=>[JSON.stringify(x),x])).values()].slice(-100);if(a.attempts>b.attempts){b.attempts=a.attempts;b.correct=a.correct;}b.course=mergeN5Course(a.course,b.course);
  const current=a.guide,original=b.guide,done=g=>g.day?.steps.filter(t=>t.done).length||0;
  const keepCurrent=current.foundation>original.foundation||current.foundation===original.foundation&&(current.number>original.number||current.number===original.number&&done(current)>done(original));
  b.guide=copy(keepCurrent?current:original);b.guide.foundation=Math.max(current.foundation,original.foundation);b.guide.number=Math.max(current.number,original.number);b.guide.archive=[...new Map([...current.archive,...original.archive].map(x=>[JSON.stringify(x),x])).values()].slice(-60);
  if(current.day?.writing&&current.day.writing!==original.day?.writing)put('hajime-cloud-import-backup-v1:'+account,{study:copy(a),real:copy(realState)});
  for(const [day,values]of Object.entries(a.daily)){b.daily[day]??={};for(const [kind,n]of Object.entries(values))b.daily[day][kind]=Math.max(n,b.daily[day][kind]||0);}
  applyDocument('study',b);
  const incoming=cleanReal(guest.real);incoming.history=[...new Map([...realState.history,...incoming.history].map(x=>[JSON.stringify(x),x])).values()].slice(-100);if(realState.active)incoming.active=realState.active;applyDocument('real',incoming);localChanged();const after=progressSummary(snapshot());await synchronize();if(user?.id!==account)return;repaint();
  importReceipt=`本机备份：${source}\n导入前：${before}\n导入后：${after}\n${before===after?'记录数量没有增加；当前账号可能已包含这些记录。导入不会额外增加学习进度。':'已合并本机记录。'}\n请查看上方同步状态；如有两端修改，请先选择要保留的版本。`;setMessage(importReceipt);
 }
 async function busy(action){if(uiBusy)return;uiBusy=true;try{await action();}catch(e){setMessage('操作未完成：'+e.message);}finally{uiBusy=false;}}
 document.addEventListener('submit',e=>{if(e.target.id!=='cloudLoginForm')return;e.preventDefault();busy(async()=>{await init();const {error}=await client.auth.signInWithPassword({email:$('#cloudEmail').value.trim(),password:$('#cloudPassword').value});if(error)throw error;$('#cloudPassword').value='';});});
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='cloudSyncButton'){renderPanel();dialog.showModal();init().catch(()=>{});}
  if(b.id==='cloudClose')dialog.close();
  if(b.id==='cloudNow')busy(synchronize);
  if(b.id==='cloudSignup')busy(async()=>{if(!$('#cloudLoginForm').reportValidity())return;await init();const {error}=await client.auth.signUp({email:$('#cloudEmail').value.trim(),password:$('#cloudPassword').value,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;$('#cloudPassword').value='';setMessage('注册请求已提交。请查看邮箱并完成验证，然后在此登录；如未收到邮件，请检查垃圾邮件或稍后重试。');});
  if(b.id==='cloudLogout')busy(async()=>{await synchronize();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;await bindUser(null);});
  if(b.id==='cloudImportGuest')busy(importGuest);
  if(b.dataset.cloudChoice)busy(()=>resolveConflict(b.dataset.cloudName,b.dataset.cloudChoice));
  if(b.dataset.cloudExport&&user){const data=readJSON('hajime-cloud-conflict-v1:'+user.id+':'+b.dataset.cloudExport);if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify({type:'hajime-cloud-conflict',namespace:b.dataset.cloudExport,...data},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='初见日语-同步冲突备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 });
 window.addEventListener('online',synchronize);window.addEventListener('focus',()=>{if(pendingPaint)repaint();synchronize();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)synchronize();});
 window.addEventListener('pagehide',()=>{try{rememberLocal();}catch{}});
 setInterval(()=>{if(!document.hidden&&user)synchronize();},30000);
 setStatus(status);if(cfg)init().catch(()=>{});
})();
