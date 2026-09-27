'use strict';
const assert=require('assert');
process.env.XSOFTWARE_API_KEY='xo-test';
process.env.UPSTASH_REDIS_REST_URL='https://redis.crash.test';
process.env.UPSTASH_REDIS_REST_TOKEN='redis-token';
process.env.FULFILLMENT_KEY_PREFIX='test:crash:v15';
process.env.FULFILLMENT_EXCLUSIVE_STOCK='true';

const redis=new Map();
let stocks=[{id:501,stock_id:50,variation_id:null,value:'crash@example.com|samepw'}];
let deleteCount=0,failedReceiptWrite=false;
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
function redisReply(cmd){
  const op=String(cmd[0]).toUpperCase();
  if(op==='GET')return{result:redis.has(String(cmd[1]))?redis.get(String(cmd[1])):null};
  if(op==='DEL'){let n=0;for(const k of cmd.slice(1)){if(redis.delete(String(k)))n++;}return{result:n};}
  if(op==='SET'){
    const k=String(cmd[1]),v=String(cmd[2]),nx=cmd.some(x=>String(x).toUpperCase()==='NX');
    if(nx&&redis.has(k))return{result:null};
    if(deleteCount===1 && !failedReceiptWrite && k.includes(':fulfillment:REF-CRASH')){failedReceiptWrite=true;return{error:'simulated redis write crash after xo delete'};}
    redis.set(k,v);return{result:'OK'};
  }
  if(op==='EXPIRE')return{result:redis.has(String(cmd[1]))?1:0};
  if(op==='EVAL'){const key=String(cmd[3]),expected=String(cmd[4]);if(String(redis.get(key)||'')===expected){const x=redis.delete(key);return{result:x?1:0};}return{result:0};}
  if(op==='MGET')return{result:cmd.slice(1).map(k=>redis.has(String(k))?redis.get(String(k)):null)};
  if(op==='SCAN')return{result:['0',[]]};
  return{error:'bad redis op '+op};
}
global.fetch=async(url,options={})=>{const u=new URL(url),method=String(options.method||'GET').toUpperCase();let body;try{body=options.body?JSON.parse(options.body):undefined}catch{}
  if(u.host==='redis.crash.test')return reply(200,redisReply(body));
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/50/stocks'&&method==='GET')return reply(200,{code:200,data:{stocks,pagination:{page:1,limit:100,total:stocks.length,total_pages:stocks.length?1:0}}});
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/stocks/501'&&method==='DELETE'){deleteCount++;if(!stocks.length)return reply(404,{code:404,message:'Data stok tidak ditemukan'});stocks=[];return reply(200,{code:200,data:null});}
  return reply(404,{message:'not mocked'});
};
const F=require('../lib/fulfillment');
(async()=>{
  const held=await F.reserveCheckoutStock({reference:'REF-CRASH',product_id:50,variation_id:null,quantity:1});
  await F.saveOrder({reference:'REF-CRASH',payment_id:'tx-crash',product_id:50,variation_id:null,code:'CRASH',quantity:1,amount:1000,method:'QRIS',product_title:'Crash Demo',reserved_stock_record_ids:held.map(x=>x.record_id)});
  const payment={id:'tx-crash',reference:'REF-CRASH',amount:1000,status:'COMPLETED'};
  let failed=false;
  try{await F.claimPaidOrder({reference:'REF-CRASH',payment,source:'test-first'});}catch{failed=true;}
  assert.equal(failed,true,'first attempt should simulate crash after DELETE');
  assert.equal(stocks.length,0,'stock was already deleted from Xoftware');
  const receipt=await F.claimPaidOrder({reference:'REF-CRASH',payment,source:'test-retry'});
  assert.equal(receipt.status,'fulfilled');
  assert.equal(receipt.accounts.length,1);
  assert.equal(receipt.accounts[0].value,'crash@example.com|samepw');
  assert.equal(deleteCount,2,'retry may re-DELETE same record and receive 404, but must not select another stock');
  console.log('PASS crash-recovery.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
