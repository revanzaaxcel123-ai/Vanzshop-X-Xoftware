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
async function set(name,value,{ttl=DEFAULT_TTL,nx=false}={}){
  const args=['SET',key(name),String(value)];
  if(nx) args.push('NX');
  if(ttl>0) args.push('EX',String(Math.floor(ttl)));
  return command(args);
}
async function setJson(name,value,{ttl=DEFAULT_TTL,nx=false}={}){
  return set(name,JSON.stringify(value),{ttl,nx});
}
async function del(name){ return command(['DEL',key(name)]); }
async function expire(name,ttl){ return command(['EXPIRE',key(name),String(Math.max(1,Math.floor(ttl)))]); }

async function compareDelete(name,expected){
  const script="if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";
  return command(['EVAL',script,'1',key(name),String(expected)]);
}

async function acquireLock(name,token,ttl=30){
  const result=await set(`lock:${name}`,String(token),{ttl:Math.max(3,Math.floor(ttl)),nx:true});
  return result==='OK';
}
async function releaseLock(name,token){
  return Number(await compareDelete(`lock:${name}`,String(token)))>0;
}

async function scanJson(pattern,{limit=100}={}){
  const out=[];
  let cursor='0';
  const match=key(pattern);
  const max=Math.max(1,Math.min(1000,Number(limit)||100));
  do{
    const result=await command(['SCAN',cursor,'MATCH',match,'COUNT','100']);
    cursor=String(Array.isArray(result)?result[0]:'0');
    const keys=Array.isArray(result?.[1])?result[1]:[];
    if(keys.length){
      const values=await command(['MGET',...keys]);
      for(let i=0;i<keys.length && out.length<max;i++){
        const raw=Array.isArray(values)?values[i]:null;
        let value=null;
        try{value=raw==null?null:JSON.parse(String(raw));}catch{}
        out.push({key:String(keys[i]),value});
      }
    }
    if(out.length>=max) break;
  }while(cursor!=='0');
  return out;
}

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

module.exports={URL,ready,key,command,get,getJson,set,setJson,del,expire,compareDelete,acquireLock,releaseLock,scanJson,wait,DEFAULT_TTL};
