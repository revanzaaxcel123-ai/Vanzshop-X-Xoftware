'use strict';
const assert=require('assert');
const crypto=require('crypto');
process.env.XSOFTWARE_API_KEY='xo-test';
process.env.SEWAPAY_API_KEY='pg_test';
process.env.SEWAPAY_SECRET_KEY='sk_webhook_test';
process.env.UPSTASH_REDIS_REST_URL='https://redis.webhook.test';
process.env.UPSTASH_REDIS_REST_TOKEN='redis-token';
process.env.FULFILLMENT_KEY_PREFIX='test:webhook:v13';

const redis=new Map();
let stocks=[{id:9001,stock_id:77,variation_id:null,value:'user@example.com|secret'}];
let deleteCount=0;
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
function redisReply(cmd){const op=String(cmd[0]).toUpperCase(),k=String(cmd[1]);if(op==='GET')return{result:redis.has(k)?redis.get(k):null};if(op==='DEL'){const x=redis.delete(k);return{result:x?1:0}};if(op==='SET'){const nx=cmd.some(x=>String(x).toUpperCase()==='NX');if(nx&&redis.has(k))return{result:null};redis.set(k,String(cmd[2]));return{result:'OK'}};return{error:'bad redis op'};}
global.fetch=async(url,options={})=>{const u=new URL(url),method=String(options.method||'GET').toUpperCase();let body;try{body=options.body?JSON.parse(options.body):undefined}catch{}
  if(u.host==='redis.webhook.test')return reply(200,redisReply(body));
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/77/stocks'&&method==='GET')return reply(200,{code:200,data:{stocks:stocks.slice(0,1),pagination:{page:1,limit:1,total:stocks.length,total_pages:stocks.length?1:0}}});
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
  console.log('PASS webhook-fulfillment.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
