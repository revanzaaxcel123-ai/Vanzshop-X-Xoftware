'use strict';
const assert=require('assert');
const crypto=require('crypto');

process.env.XSOFTWARE_API_KEY='xo-test';
process.env.ADMIN_PASSWORD='admin-test';
process.env.SEWAPAY_API_KEY='pg_test_key';
process.env.SEWAPAY_SECRET_KEY='sk_test_secret';
process.env.PAYMENT_TOKEN_SECRET='token-secret';

const calls=[];
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}

global.fetch=async(url,options={})=>{
  const u=new URL(url); const method=String(options.method||'GET').toUpperCase(); const raw=options.body||''; const body=raw?JSON.parse(raw):undefined;
  calls.push({host:u.host,path:u.pathname,query:Object.fromEntries(u.searchParams.entries()),method,raw,body,headers:options.headers||{}});
  if(u.host==='backend-s2.xoftware.id'&&u.pathname==='/v1/product'){
    return reply(200,{status:true,data:[
      {id:11,title:'Netflix',code:'NFLX',price:0,stock:5,is_variation:true,variations:[{id:111,code:'NFLX-1M',title:'1 Bulan',price:25000,stock:3}]},
      {id:12,title:'Viu',code:'VIU-1M',price:7000,stock:9,is_variation:false,variations:[]}
    ]});
  }
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/methods') return reply(200,{methods:['QRIS'],binance:{enabled:false,payId:null}});
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/create') return reply(200,{id:'tx_test_1',status:'PENDING',amount:25000,fee:200,total_payment:25200,method:'QRIS',reference:body.reference,description:body.description,payment_data:{qr_string:'000201TEST'},expires_at:'2026-09-28T00:00:00.000Z'});
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/status') return reply(200,{id:'tx_test_1',reference:u.searchParams.get('reference')||'REF',amount:25000,method:'QRIS',status:'COMPLETED',fee:200,net_amount:25000,payment_data:{qr_string:'000201TEST'}});
  if(u.host==='sewapay.id'&&u.pathname==='/api/v1/payments/cancel') return reply(200,{id:body.id,status:'CANCELLED'});
  return reply(404,{message:'not mocked'});
};

const SewaPay=require('../lib/sewapay');
const handler=require('../api/xo.js');
function invoke({method='GET',query={},body,headers={}}={}){return new Promise((resolve,reject)=>{const req={method,query,body,headers};const res={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[String(k).toLowerCase()]=v;},end(payload){try{resolve({status:this.statusCode,body:JSON.parse(payload)});}catch(e){reject(e);}}};Promise.resolve(handler(req,res)).catch(reject);});}

(async()=>{
  assert.equal(SewaPay.ready(),true);
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
  assert.equal(r.body.data.fulfillment.automatic,false);
  const statusCall=calls.find(x=>x.host==='sewapay.id'&&x.path==='/api/v1/payments/status');
  assert.equal(statusCall.headers['X-PG-Signature'],undefined,'status GET docs say no signature required');

  r=await invoke({method:'POST',query:{a:'payment_status'},body:{id:'tx_wrong',reference,payment_token:token}});
  assert.equal(r.status,401);

  r=await invoke({method:'POST',query:{a:'payment_cancel'},body:{payment_token:token}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.response.status,'CANCELLED');

  console.log('PASS sewapay.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
