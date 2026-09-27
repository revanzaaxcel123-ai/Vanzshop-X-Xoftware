'use strict';

function clean(v){
  let s=String(v||'').trim();
  if(s.length>=2 && ((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))) s=s.slice(1,-1).trim();
  return s;
}

const URL = clean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_REST_URL);
const TOKEN = clean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_REST_TOKEN);
const PREFIX = clean(process.env.FULFILLMENT_KEY_PREFIX || 'vanzshop:v13');
const TTL_DAYS = Math.max(1, Math.min(365, Number(process.env.FULFILLMENT_TTL_DAYS || 30)));
const DEFAULT_TTL = Math.floor(TTL_DAYS * 86400);

function ready(){ return Boolean(URL && TOKEN); }
function key(name){ return `${PREFIX}:${name}`; }

async function command(args){
  if(!ready()) throw Object.assign(new Error('Fulfillment store belum dikonfigurasi. Tambahkan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.'),{status:503,code:'FULFILLMENT_STORE_MISSING'});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(URL,{
      method:'POST',
      headers:{'authorization':`Bearer ${TOKEN}`,'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify(args),
      signal:controller.signal,
    });
    const raw=await res.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{
      throw Object.assign(new Error(`Redis store mengirim response non-JSON (${res.status}).`),{status:502});
    }
    if(!res.ok || data?.error){
      throw Object.assign(new Error(String(data?.error||`Redis store gagal (${res.status}).`)),{status:res.status||502,upstream:data});
    }
    return data?.result;
  }catch(e){
    if(e?.name==='AbortError') throw Object.assign(new Error('Fulfillment store timeout.'),{status:504});
    if(e?.status) throw e;
    throw Object.assign(new Error('Fulfillment store tidak dapat dijangkau.'),{status:502,cause:e});
  }finally{clearTimeout(timer);}
}

async function get(name){ return command(['GET',key(name)]); }
async function getJson(name){
  const raw=await get(name);
  if(raw==null) return null;
  try{return JSON.parse(String(raw));}catch{return null;}
}
async function setJson(name,value,{ttl=DEFAULT_TTL,nx=false}={}){
  const args=['SET',key(name),JSON.stringify(value)];
  if(nx) args.push('NX');
  if(ttl>0) args.push('EX',String(Math.floor(ttl)));
  return command(args);
}
async function del(name){ return command(['DEL',key(name)]); }
async function acquireLock(name,token,ttl=30){
  const result=await command(['SET',key(`lock:${name}`),String(token),'NX','EX',String(Math.max(3,Math.floor(ttl)))]);
  return result==='OK';
}
async function releaseLock(name,token){
  const lockName=`lock:${name}`;
  const current=await get(lockName);
  if(String(current||'')!==String(token||'')) return false;
  await del(lockName);
  return true;
}
async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

module.exports={URL,ready,key,command,get,getJson,setJson,del,acquireLock,releaseLock,wait,DEFAULT_TTL};
