'use strict';
const assert = require('assert');

process.env.XSOFTWARE_API_KEY='test-api-key';
process.env.ADMIN_PASSWORD='test-admin';
process.env.XSOFTWARE_CHECKOUT_MODE='shared';
process.env.XSOFTWARE_SHARED_CHANNEL='whatsapp';
process.env.XSOFTWARE_SHARED_SENDER='08111111111';
process.env.XSOFTWARE_SHARED_NAME='Store Sender';

const calls=[];
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
global.fetch=async(url,options={})=>{
  const u=new URL(url), method=String(options.method||'GET').toUpperCase(), body=options.body?JSON.parse(options.body):undefined;
  calls.push({path:u.pathname,method,body});
  if(u.pathname==='/v1/product') return reply(200,{status:true,data:[{id:1,title:'Demo',code:'DEMO-1',is_reseller:false,price:1000,stock:5,is_variation:false,variations:[]}]});
  if(u.pathname==='/v1/balance'&&method==='POST'){
    if(String(body.sender)==='628111111111') return reply(200,{status:true,data:{id:1,name:'Store Sender',sender:'628111111111',saldo:0,level:'BASIC'}});
    return reply(404,{status:false,message:'User not found'});
  }
  if(u.pathname==='/v1/register') return reply(200,{status:false,message:'API Registration is disabled for this bot'});
  if(u.pathname==='/v1/order/qris'&&method==='POST') return reply(200,{status:true,data:{transaction_id:'SHARED-TX',amount:1000,total_to_pay:1317,qr_string:'QR',status:'pending'}});
  if(u.pathname==='/v1/order/status'&&method==='POST') return reply(200,{status:true,data:{transaction_id:body.transaction_id,status:'success',total:1317,accounts:[{user:'demo',pass:'pw'}]}});
  return reply(200,{status:true,data:{}});
};
const handler=require('../api/xo.js');
function invoke({method='GET',query={},body,headers={}}={}){return new Promise((resolve,reject)=>{const req={method,query,body,headers};const res={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(payload){try{resolve({status:this.statusCode,body:JSON.parse(payload)});}catch(e){reject(e);}}};Promise.resolve(handler(req,res)).catch(reject);});}

(async()=>{
  let r=await invoke({query:{a:'init'}});
  assert.equal(r.body.data.store.checkout.mode,'sewapay');
  assert.equal(r.body.data.store.checkout.legacy_xoftware_mode,'shared');
  assert.equal(r.body.data.store.checkout.shared_sender_configured,true);
  assert.equal(r.body.data.store.registration.otp_endpoint_documented,false);

  calls.length=0;
  r=await invoke({method:'POST',query:{a:'customer_prepare'},body:{channel:'whatsapp',sender:'08222222222',name:'Buyer'}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.state,'shared');
  assert.equal(calls.filter(x=>x.path==='/v1/register').length,0);
  assert.equal(calls.find(x=>x.path==='/v1/balance').body.sender,'628111111111');

  calls.length=0;
  r=await invoke({method:'POST',query:{a:'xo_checkout_qris'},body:{channel:'whatsapp',sender:'08222222222',name:'Buyer',code:'DEMO-1',quantity:1}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.checkout_mode,'shared');
  assert.equal(r.body.data.buyer_sender,'628222222222');
  assert.equal(calls.filter(x=>x.path==='/v1/register').length,0);
  assert.deepEqual(calls.find(x=>x.path==='/v1/order/qris').body,{sender:'628111111111',code:'DEMO-1',quantity:1});

  const token=r.body.data.status_token;
  r=await invoke({method:'POST',query:{a:'order_status'},body:{transaction_id:'SHARED-TX',status_token:token}});
  assert.equal(r.body.data.transaction.accounts[0].user,'demo');
  console.log('PASS shared-mode.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
