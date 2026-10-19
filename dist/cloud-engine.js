/* Transport-independent synchronization; no request is made until an authenticated adapter exists. */
(function(root){
 'use strict';
 const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
 const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 class HajimeCloudEngine {
  constructor(adapter){this.adapter=adapter;this.user=null;this.epoch=0;this.running=null;this.retry=false;this.conflicts=new Map();}
  setUser(id){this.epoch++;this.user=id||null;this.conflicts.clear();this.retry=false;}
  async synchronize(){
   if(!this.user)return {status:'signed-out'};
   if(this.running){this.retry=true;return this.running;}
   const user=this.user,epoch=this.epoch;
   const run=async()=>{
    const results={};let passes=0;
    do {this.retry=false;
     for(const name of ['study','real']){
      if(this.epoch!==epoch)return {status:'account-changed'};
      try{results[name]=await this.syncDocument(user,epoch,name);}catch(error){results[name]={status:'pending',message:String(error.message||error)};}
     }
    }while(this.retry&&++passes<3&&this.epoch===epoch);
    return results;
   };
   this.running=run();try{return await this.running;}finally{this.running=null;}
  }
  async syncDocument(user,epoch,name){
   const a=this.adapter,active=()=>this.user===user&&this.epoch===epoch;
   const base=await a.checkpoint(user,name),remote=await a.fetch(user,name);
   if(!active())return {status:'account-changed'};
   const local=copy(a.read(user,name));
   if(remote&&stable(local)===stable(remote.payload)){
    await a.remember(user,name,copy(remote));this.conflicts.delete(name);return {status:'synced'};
   }
   const changed=base?stable(local)!==stable(base.payload):!a.isEmpty(name,local);
   if(remote&&!changed){
    // apply() must persist before returning; an account switch never applies a different user's data.
    a.apply(user,name,copy(remote.payload));await a.remember(user,name,copy(remote));
    this.conflicts.delete(name);return {status:'downloaded'};
   }
   if(remote&&(!base||stable(remote.payload)!==stable(base.payload))){
    const conflict={local,remote:copy(remote)};this.conflicts.set(name,conflict);
    await a.backup(user,name,copy(conflict));return {status:'conflict'};
   }
   if(!remote&&!changed)return {status:'empty'};
   const response=await a.save(user,name,local,remote?.revision||0);
   if(!active())return {status:'account-changed'};
   if(!response.accepted){
    const conflict={local:copy(a.read(user,name)),remote:copy(response.document)};
    this.conflicts.set(name,conflict);await a.backup(user,name,copy(conflict));return {status:'conflict'};
   }
   // Remember exactly what the server accepted, not edits made while the request was in flight.
   await a.remember(user,name,copy(response.document));
   this.conflicts.delete(name);
   if(stable(a.read(user,name))!==stable(local))this.retry=true;
   return {status:'uploaded'};
  }
 }
 root.HajimeCloudEngine=HajimeCloudEngine;
 if(typeof module!=='undefined'&&module.exports)module.exports={HajimeCloudEngine};
})(typeof window!=='undefined'?window:globalThis);
