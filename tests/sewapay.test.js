'use strict';
const assert=require('assert');
const crypto=require('crypto');

process.env.XSOFTWARE_API_KEY='xo-test';
process.env.ADMIN_PASSWORD='admin-test';
process.env.SEWAPAY_API_KEY='pg_test_key';
process.env.SEWAPAY_SECRET_KEY='sk_test_secret';
process.env.PAYMENT_TOKEN_SECRET='token-secret';
process.env.UPSTASH_REDIS_REST_URL='https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN='redis-token';
process.env.FULFILLMENT_KEY_PREFIX='test:v13';

const calls=[];
const redis=new Map();
let createdReference='';
let stockRecords=[{id:8901,stock_id:11,variation_id:111,value:{Email:'buyer@example.com',Password:'pw123'},createdAt:'2026-09-20T09:15:00.000Z'}];
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
function redisReply(cmd){
  const op=String(cmd[0]||'').toUpperCase();
  if(op==='GET') return {result:redis.has(String(cmd[1]))?redis.get(String(cmd[1])):null};
  if(op==='DEL'){const existed=redis.delete(String(cmd[1]));return {result:existed?1:0};}
  if(op==='SET'){
    const k=String(cmd[1]),v=String(cmd[2]);
    const nx=cmd.some(x=>String(x).toUpperCase()==='NX');
    if(nx&&redis.has(k)) return {result:null};
    redis.set(k,v);return {result:'OK'};
  }
  return {error:`unsupported redis op ${op}`};
}

global.fetch=async(url,options={})=>{
  const u=new URL(url); const method=String(options.method||'GET').toUpperCase(); const raw=options.body||''; let body;
  try{body=raw?JSON.parse(raw):undefined;}catch{body=raw;}
  calls.push({host:u.host,path:u.pathname,query:Object.fromEntries(u.searchParams.entries()),method,raw,body,headers:options.headers||{}});
  if(u.host==='redis.test') return reply(200,redisReply(body));
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/product'){
    return reply(200,{status:true,data:[
      {id:11,title:'Netflix',code:'NFLX',price:0,stock:5,is_variation:true,variations:[{id:111,code:'NFLX-1M',title:'1 Bulan',price:25000,stock:3}]},
      {id:12,title:'Viu',code:'VIU-1M',price:7000,stock:9,is_variation:false,variations:[]}
    ]});
  }
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/products/11/stocks'&&method==='GET'){
    const variation=u.searchParams.get('variation_id');
    const stocks=stockRecords.filter(x=>!variation||String(x.variation_id)===variation);
    return reply(200,{code:200,message:'OK',data:{stocks:stocks.slice(0,Number(u.searchParams.get('limit')||50)),pagination:{page:1,limit:1,total:stocks.length,total_pages:stocks.length?1:0}}});
  }
  if(u.host==='backend-s2.xoftware.id'&&/^\/v1\/products\/stocks\/\d+$/.test(u.pathname)&&method==='DELETE'){
    const id=Number(u.pathname.split('/').pop());
    const idx=stockRecords.findIndex(x=>x.id===id);
    if(idx<0)return reply(404,{code:404,message:'Data stok tidak ditemukan',data:null});
    stockRecords.splice(idx,1);return reply(200,{code:200,message:'Data akun stok berhasil dihapus',data:null});
  }
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/methods') return reply(200,{methods:['QRIS'],binance:{enabled:false,payId:null}});
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/create'){createdReference=body.reference;return reply(200,{id:'tx_test_1',status:'PENDING',amount:25000,fee:200,total_payment:25200,method:'QRIS',reference:body.reference,description:body.description,payment_data:{qr_string:'000201TEST'},expires_at:'2026-09-28T00:00:00.000Z'});}
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/status') return reply(200,{id:'tx_test_1',reference:u.searchParams.get('reference')||createdReference,amount:25000,method:'QRIS',status:'COMPLETED',fee:200,net_amount:25000,payment_data:{qr_string:'000201TEST'}});
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/cancel') return reply(200,{id:body.id,status:'CANCELLED'});
  return reply(404,{message:'not mocked'});
};

const SewaPay=require('../lib/sewapay');
const Fulfillment=require('../lib/fulfillment');
const handler=require('../api/xo.js');
function invoke({method='GET',query={},body,headers={}}={}){return new Promise((resolve,reject)=>{const req={method,query,body,headers};const res={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[String(k).toLowerCase()]=v;},end(payload){try{resolve({status:this.statusCode,body:JSON.parse(payload)});}catch(e){reject(e);}}};Promise.resolve(handler(req,res)).catch(reject);});}

(async()=>{
  assert.equal(SewaPay.ready(),true);
  assert.equal(Fulfillment.ready(),true);
  { const raw=JSON.stringify({event:'payment.completed',data:{id:'tx_test_1',reference:'R'}}); const ts=Math.floor(Date.now()/1000); const sig=crypto.createHmac('sha256','sk_test_secret').update(`${ts}.${raw}`).digest('hex'); assert.equal(SewaPay.verifyWebhook(raw,String(ts),sig).ok,true); }
  await SewaPay.getMethods();
  const methodsCall=calls.at(-1);
  assert.equal(methodsCall.headers['X-PG-API-Key'],'pg_test_key');
  assert.ok(methodsCall.headers['X-PG-Signature']);
  const mts=methodsCall.headers['X-PG-Timestamp'];
  const expectedGet=crypto.createHmac('sha256','sk_test_secret').update(`${mts}.`).digest('hex');
  assert.equal(methodsCall.headers['X-PG-Signature'],expectedGet);

  calls.length=0;
  let r=await invoke({method:'POST',query:{a:'payment_create'},body:{product_id:11,variation_id:111,code:'NFLX-1M',quantity:1,method:'QRIS'}});
  assert.equal(r.status,201);
  assert.equal(r.body.data.payment.id,'tx_test_1');
  assert.equal(r.body.data.order.unit_price,25000);
  assert.equal(r.body.data.fulfillment.mode,'automatic');
  assert.match(r.body.data.payment_token,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const createCall=calls.find(x=>x.host==='sewapay.id'&&x.path==='/api/v1/payments/create');
  assert.equal(createCall.body.amount,25000);
  assert.equal(createCall.body.method,'QRIS');
  assert.ok(String(createCall.body.reference).startsWith('VZ-'));
  const ts=createCall.headers['X-PG-Timestamp'];
  const expected=crypto.createHmac('sha256','sk_test_secret').update(`${ts}.${createCall.raw}`).digest('hex');
  assert.equal(createCall.headers['X-PG-Signature'],expected);

  const token=r.body.data.payment_token;
  const reference=r.body.data.payment.reference;
  calls.length=0;
  r=await invoke({method:'POST',query:{a:'payment_status'},body:{id:'tx_test_1',reference,payment_token:token}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.status,'success');
  assert.equal(r.body.data.fulfillment.automatic,true);
  assert.equal(r.body.data.fulfillment.status,'fulfilled');
  assert.equal(r.body.data.fulfillment.accounts.length,1);
  assert.equal(r.body.data.fulfillment.accounts[0].value.Email,'buyer@example.com');
  assert.equal(stockRecords.length,0,'stock must be deleted after claim');
  const deleteCalls1=calls.filter(x=>x.host==='backend-s2.xoftware.id'&&x.method==='DELETE');
  assert.equal(deleteCalls1.length,1);
  const statusCall=calls.find(x=>x.host==='sewapay.id'&&x.path==='/api/v1/payments/status');
  assert.equal(statusCall.headers['X-PG-Signature'],undefined,'status GET docs say no signature required');

  calls.length=0;
  r=await invoke({method:'POST',query:{a:'payment_status'},body:{id:'tx_test_1',reference,payment_token:token}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.fulfillment.status,'fulfilled');
  assert.equal(r.body.data.fulfillment.accounts[0].value.Password,'pw123');
  assert.equal(calls.filter(x=>x.host==='backend-s2.xoftware.id'&&x.method==='DELETE').length,0,'same payment must not delete another stock');

  r=await invoke({method:'POST',query:{a:'payment_status'},body:{id:'tx_wrong',reference,payment_token:token}});
  assert.equal(r.status,401);

  r=await invoke({method:'POST',query:{a:'payment_cancel'},body:{payment_token:token}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.response.status,'CANCELLED');

  console.log('PASS sewapay.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
