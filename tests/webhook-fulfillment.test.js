'use strict';
const assert=require('assert');
const crypto=require('crypto');
process.env.XSOFTWARE_API_KEY='xo-test';
process.env.SEWAPAY_API_KEY='pg_test';
process.env.SEWAPAY_SECRET_KEY='sk_webhook_test';
process.env.UPSTASH_REDIS_REST_URL='https://redis.webhook.test';
process.env.UPSTASH_REDIS_REST_TOKEN='redis-token';
process.env.FULFILLMENT_KEY_PREFIX='test:webhook:v15';
process.env.FULFILLMENT_EXCLUSIVE_STOCK='true';

const redis=new Map();
let stocks=[{id:9001,stock_id:77,variation_id:null,value:'user@example.com|secret'}];
let deleteCount=0;
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
function redisReply(cmd){
  const op=String(cmd[0]).toUpperCase();
  if(op==='GET')return{result:redis.has(String(cmd[1]))?redis.get(String(cmd[1])):null};
  if(op==='DEL'){let n=0;for(const k of cmd.slice(1)){if(redis.delete(String(k)))n++;}return{result:n};}
  if(op==='SET'){
    const k=String(cmd[1]),v=String(cmd[2]),nx=cmd.some(x=>String(x).toUpperCase()==='NX');
    if(nx&&redis.has(k))return{result:null};redis.set(k,v);return{result:'OK'};
  }
  if(op==='EXPIRE')return{result:redis.has(String(cmd[1]))?1:0};
  if(op==='EVAL'){
    const key=String(cmd[3]),expected=String(cmd[4]);
    if(String(redis.get(key)||'')===expected){const x=redis.delete(key);return{result:x?1:0};}
    return{result:0};
  }
  if(op==='MGET')return{result:cmd.slice(1).map(k=>redis.has(String(k))?redis.get(String(k)):null)};
  if(op==='SCAN'){
    const match=String(cmd[cmd.findIndex(x=>String(x).toUpperCase()==='MATCH')+1]||'*');
    const rx=new RegExp('^'+match.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\*/g,'.*')+'$');
    return{result:['0',[...redis.keys()].filter(k=>rx.test(k))]};
  }
  return{error:'bad redis op '+op};
}
global.fetch=async(url,options={})=>{const u=new URL(url),method=String(options.method||'GET').toUpperCase();let body;try{body=options.body?JSON.parse(options.body):undefined}catch{}
  if(u.host==='redis.webhook.test')return reply(200,redisReply(body));
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/77/stocks'&&method==='GET')return reply(200,{code:200,data:{stocks:stocks.slice(0,100),pagination:{page:1,limit:100,total:stocks.length,total_pages:stocks.length?1:0}}});
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/stocks/9001'&&method==='DELETE'){deleteCount++;if(!stocks.length)return reply(404,{code:404,message:'Data stok tidak ditemukan'});stocks=[];return reply(200,{code:200,message:'Data akun stok berhasil dihapus',data:null});}
  return reply(404,{message:'not mocked'});
};
const Fulfillment=require('../lib/fulfillment');
const webhook=require('../api/sewapay-webhook');
async function invoke(raw,headers){return new Promise((resolve,reject)=>{const req={method:'POST',body:raw,headers};const res={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[k]=v;},end(p){try{resolve({status:this.statusCode,body:JSON.parse(p)});}catch(e){reject(e);}}};Promise.resolve(webhook(req,res)).catch(reject);});}
(async()=>{
  await Fulfillment.saveOrder({reference:'ORDER-WEBHOOK-1',payment_id:'tx_webhook',product_id:77,variation_id:null,code:'DEMO',quantity:1,amount:5000,method:'QRIS',product_title:'Demo',variant_title:'',unit_price:5000});
  const payload={event:'payment.completed',data:{id:'tx_webhook',reference:'ORDER-WEBHOOK-1',amount:5000,method:'QRIS',status:'COMPLETED',completed_at:new Date().toISOString()}};
  const raw=JSON.stringify(payload),ts=Math.floor(Date.now()/1000),sig=crypto.createHmac('sha256','sk_webhook_test').update(`${ts}.${raw}`).digest('hex');
  let r=await invoke(raw,{'x-pg-timestamp':String(ts),'x-pg-signature':sig});
  assert.equal(r.status,200);assert.equal(r.body.fulfillment.status,'fulfilled');assert.equal(r.body.fulfillment.accounts[0].value,'user@example.com|secret');assert.equal(deleteCount,1);
  r=await invoke(raw,{'x-pg-timestamp':String(ts),'x-pg-signature':sig});
  assert.equal(r.status,200);assert.equal(r.body.fulfillment.status,'fulfilled');assert.equal(deleteCount,1,'replayed webhook must not delete another stock');
  const claim=await Fulfillment.stockClaimInfo(9001);
  assert.equal(claim.owner,'ORDER-WEBHOOK-1');
  console.log('PASS webhook-fulfillment.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
