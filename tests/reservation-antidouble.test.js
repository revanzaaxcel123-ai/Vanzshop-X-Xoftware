'use strict';
const assert=require('assert');
process.env.XSOFTWARE_API_KEY='xo-test';
process.env.UPSTASH_REDIS_REST_URL='https://redis.reserve.test';
process.env.UPSTASH_REDIS_REST_TOKEN='redis-token';
process.env.FULFILLMENT_KEY_PREFIX='test:reserve:v15';
process.env.FULFILLMENT_EXCLUSIVE_STOCK='true';

const redis=new Map();
const stocks=[
  {id:1001,stock_id:10,variation_id:null,value:'a@example.com|pw1'},
  {id:1002,stock_id:10,variation_id:null,value:'b@example.com|pw2'},
];
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
function redisReply(cmd){
  const op=String(cmd[0]).toUpperCase();
  if(op==='GET')return{result:redis.has(String(cmd[1]))?redis.get(String(cmd[1])):null};
  if(op==='DEL'){let n=0;for(const k of cmd.slice(1)){if(redis.delete(String(k)))n++;}return{result:n};}
  if(op==='SET'){const k=String(cmd[1]),v=String(cmd[2]),nx=cmd.some(x=>String(x).toUpperCase()==='NX');if(nx&&redis.has(k))return{result:null};redis.set(k,v);return{result:'OK'};}
  if(op==='EXPIRE')return{result:redis.has(String(cmd[1]))?1:0};
  if(op==='EVAL'){const key=String(cmd[3]),expected=String(cmd[4]);if(String(redis.get(key)||'')===expected){const x=redis.delete(key);return{result:x?1:0};}return{result:0};}
  if(op==='MGET')return{result:cmd.slice(1).map(k=>redis.has(String(k))?redis.get(String(k)):null)};
  if(op==='SCAN')return{result:['0',[]]};
  return{error:'bad redis op '+op};
}
global.fetch=async(url,options={})=>{
  const u=new URL(url),method=String(options.method||'GET').toUpperCase();let body;try{body=options.body?JSON.parse(options.body):undefined}catch{}
  if(u.host==='redis.reserve.test')return reply(200,redisReply(body));
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/10/stocks'&&method==='GET')return reply(200,{code:200,data:{stocks,pagination:{page:1,limit:100,total:2,total_pages:1}}});
  return reply(404,{code:404,message:'not mocked'});
};

const F=require('../lib/fulfillment');
(async()=>{
  const a=await F.reserveCheckoutStock({reference:'REF-A',product_id:10,variation_id:null,quantity:1});
  const b=await F.reserveCheckoutStock({reference:'REF-B',product_id:10,variation_id:null,quantity:1});
  assert.equal(a.length,1);assert.equal(b.length,1);
  assert.notEqual(a[0].record_id,b[0].record_id,'two pending payments must not hold the same stock record');
  assert.equal((await F.stockClaimInfo(a[0].record_id)).owner,'REF-A');
  assert.equal((await F.stockClaimInfo(b[0].record_id)).owner,'REF-B');
  await F.releaseReservation(a[0].record_id,'REF-A');
  const c=await F.reserveCheckoutStock({reference:'REF-C',product_id:10,variation_id:null,quantity:1});
  assert.equal(c[0].record_id,a[0].record_id,'released hold may be used by a later payment');
  console.log('PASS reservation-antidouble.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
