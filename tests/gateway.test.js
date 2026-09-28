'use strict';

const assert = require('assert');

process.env.XSOFTWARE_API_KEY='test-api-key';
process.env.ADMIN_PASSWORD='test-admin';
process.env.STORE_NAME='VanzShop Test';

const calls=[];
let productGetFails=false;
let registrationEnabled=true;
const users=new Map([['628111111111',{id:1,name:'Existing',sender:'628111111111',saldo:50000,level:'BASIC'}]]);

function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}

global.fetch=async(url,options={})=>{
  const u=new URL(url), method=String(options.method||'GET').toUpperCase(), body=options.body?JSON.parse(options.body):undefined;
  calls.push({path:u.pathname,query:Object.fromEntries(u.searchParams.entries()),method,body,headers:options.headers||{}});

  if(u.pathname==='/v1/product'){
    if(method==='GET'&&productGetFails)return reply(405,{status:false,message:'Method Not Allowed'});
    return reply(200,{status:true,data:[
      {id:1,title:'Netflix Owner',code:'NFLIX-1',is_reseller:false,price:12000,stock:7,description:'Owner stock',is_variation:false,variations:[]},
      {id:2,title:'Canva Supplier',code:'CANVA',is_reseller:true,price:0,stock:3,description:'Supplier',is_variation:true,variations:[{id:21,code:'CANVA-1Y',title:'1 Tahun',price:25000,stock:3}]}
    ]});
  }
  if(u.pathname==='/v1/balance'&&method==='POST'){
    const x=users.get(String(body.sender));
    return x?reply(200,{status:true,data:x}):reply(404,{status:false,message:'User not found'});
  }
  if(u.pathname==='/v1/register'&&method==='POST'){
    if(!registrationEnabled)return reply(200,{status:false,message:'API Registration is disabled for this bot'});
    const x={id:users.size+10,name:String(body.name),sender:String(body.sender),saldo:0,level:'BASIC'};users.set(x.sender,x);return reply(200,{status:true,data:x});
  }
  if(u.pathname==='/v1/order/qris'&&method==='POST')return reply(200,{status:true,data:{transaction_id:'API-TX1',amount:25000,total_to_pay:25700,qr_string:'QR',link:'https://pay.test',status:'pending'}});
  if(u.pathname==='/v1/order/balance'&&method==='POST')return reply(200,{status:true,data:{transaction_id:9001,total_price:12000,status:'success',accounts:[{value:'demo'}]}});
  if(u.pathname==='/v1/deposit'&&method==='POST')return reply(200,{status:true,data:{transaction_id:'DEP-1',amount:body.amount,total_to_pay:body.amount+500,status:'pending'}});
  if(u.pathname==='/v1/order/status'&&method==='POST')return reply(200,{status:true,data:{transaction_id:body.transaction_id,status:'success',total:25700,accounts:[{email:'a@b.c',pass:'x'}]}});
  if(u.pathname==='/v1/products/'&&method==='GET')return reply(200,{code:200,message:'OK',data:{products:[{id:10,code:'ABC',title:'ABC',price:1000,stock_count:2,is_variation:false},{id:2,code:'CANVA',title:'Canva Supplier',price:0,stock_count:3,is_variation:true}],pagination:{page:1,limit:20,total:2,total_pages:1}}});
  if(u.pathname==='/v1/products/stocks'&&method==='POST')return reply(201,{code:201,data:{total_added:body.accounts.length,product_id:body.product_id,variation_id:body.variation_id??null}});
  if(u.pathname==='/v1/products/'&&method==='POST')return reply(201,{code:201,data:{product_id:108,code:body.code||'',title:body.title,is_variation:Boolean(body.is_variation)}});
  if(u.pathname==='/v1/products/108/variations'&&method==='POST')return reply(201,{code:201,data:{variation_id:45,code:body.code,title:body.title}});
  return reply(200,{code:200,message:'OK',data:{}});
};

const handler=require('../api/xo.js');
function invoke({method='GET',query={},body,headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req={method,query,body,headers};
    const res={statusCode:200,headers:{},status(c){this.statusCode=c;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},end(payload){try{resolve({status:this.statusCode,body:JSON.parse(payload),headers:this.headers});}catch(e){reject(e);}}};
    Promise.resolve(handler(req,res)).catch(reject);
  });
}

(async()=>{
  let r;
  r=await invoke({query:{a:'health'}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.base_url,'https://backend-s2.xoftware.id');
  assert.equal(r.body.data.catalog_endpoint,'/v1/product');
  assert.equal(r.body.data.readme_source_of_truth,true);
  assert.equal(r.body.data.build,'HARDMAX-v18-COMMERCE-SEO');

  calls.length=0;
  r=await invoke({query:{a:'init'}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.store.reseller.group_url,'https://chat.whatsapp.com/DQ2PsowpGt5FxhQDAS2sAz');
  assert.equal(r.body.data.products.length,2);
  assert.equal(r.body.data.products[1].is_reseller,true);
  assert.equal(r.body.data.products[1].variations[0].stock,3);
  assert.equal(r.body.data.catalog.known_stock_total,10);
  assert.equal(r.body.data.catalog.method,'GET');
  assert.equal(calls.filter(x=>x.path.includes('reseller-api')).length,0,'undocumented reseller-api must not be called');

  productGetFails=true; calls.length=0;
  r=await invoke({query:{a:'catalog_refresh'}});
  assert.equal(r.status,200);
  assert.equal(r.body.data.summary.method,'POST');
  assert.deepEqual(calls.filter(x=>x.path==='/v1/product').map(x=>x.method),['GET','POST']);
  productGetFails=false;

  calls.length=0;
  r=await invoke({method:'POST',query:{a:'customer_prepare'},body:{channel:'whatsapp',sender:'08111111111',name:'Existing'}});
  assert.equal(r.status,200); assert.equal(r.body.data.state,'existing'); assert.equal(r.body.data.sender,'628111111111');
  assert.equal(calls.filter(x=>x.path==='/v1/register').length,0);

  registrationEnabled=false; calls.length=0;
  r=await invoke({method:'POST',query:{a:'customer_prepare'},body:{channel:'whatsapp',sender:'08222222222',name:'New'}});
  assert.equal(r.status,409); assert.equal(r.body.details.reason,'REGISTRATION_DISABLED');
  registrationEnabled=true;

  r=await invoke({method:'POST',query:{a:'customer_prepare'},body:{channel:'whatsapp',sender:'08222222222',name:'New'}});
  assert.equal(r.status,200); assert.equal(r.body.data.state,'registered');

  calls.length=0;
  r=await invoke({method:'POST',query:{a:'xo_checkout_qris'},body:{channel:'whatsapp',sender:'08222222222',name:'New',code:'CANVA-1Y',quantity:1}});
  assert.equal(r.status,200); assert.equal(r.body.data.transaction.transaction_id,'API-TX1');
  const qris=calls.find(x=>x.path==='/v1/order/qris'); assert.deepEqual(qris.body,{sender:'628222222222',code:'CANVA-1Y',quantity:1});
  const token=r.body.data.status_token;

  r=await invoke({method:'POST',query:{a:'order_status'},body:{transaction_id:'API-TX1',status_token:token}});
  assert.equal(r.status,200); assert.equal(r.body.data.transaction.status,'success');

  r=await invoke({method:'POST',query:{a:'admin_login'},body:{password:'wrong'}}); assert.equal(r.status,401);
  r=await invoke({method:'POST',query:{a:'admin_login'},body:{password:'test-admin'}}); assert.equal(r.status,200); assert.ok(r.body.data.token);
  const adminToken=r.body.data.token;
  r=await invoke({query:{a:'admin_ping'},headers:{authorization:`Bearer ${adminToken}`}}); assert.equal(r.status,200);


  r=await invoke({method:'POST',query:{a:'admin_order_qris'},headers:{authorization:`Bearer ${adminToken}`},body:{channel:'whatsapp',sender:'08111111111',code:'NFLIX-1',quantity:1}});
  assert.equal(r.status,200); assert.equal(r.body.data.data.transaction_id,'API-TX1');

  r=await invoke({method:'POST',query:{a:'checkout_balance'},headers:{authorization:`Bearer ${adminToken}`},body:{sender:'628111111111',code:'NFLIX-1',quantity:1}});
  assert.equal(r.status,200); assert.equal(r.body.data.data.status,'success');

  r=await invoke({method:'POST',query:{a:'admin_deposit'},headers:{authorization:`Bearer ${adminToken}`},body:{channel:'whatsapp',sender:'08111111111',amount:50000}});
  assert.equal(r.status,200); assert.equal(r.body.data.data.transaction_id,'DEP-1');

  r=await invoke({method:'POST',query:{a:'admin_order_status'},headers:{authorization:`Bearer ${adminToken}`},body:{transaction_id:'API-TX1'}});
  assert.equal(r.status,200); assert.equal(r.body.data.data.status,'success');

  r=await invoke({query:{a:'catalog_probe'},headers:{'x-admin-password':'wrong'}}); assert.equal(r.status,401);
  r=await invoke({query:{a:'catalog_probe'},headers:{'x-admin-password':'test-admin'}}); assert.equal(r.status,200); assert.equal(r.body.data.summary.count,2);


  calls.length=0;
  r=await invoke({query:{a:'diag_product'},headers:{'x-admin-password':'test-admin'}});
  assert.equal(r.status,200); assert.equal(r.body.data.request.path,'/v1/product'); assert.equal(r.body.data.normalized_summary.count,2);

  r=await invoke({method:'POST',query:{a:'diag_balance'},headers:{'x-admin-password':'test-admin'},body:{channel:'whatsapp',sender:'08111111111'}});
  assert.equal(r.status,200); assert.equal(r.body.data.request.body.sender,'628111111111'); assert.equal(r.body.data.response.data.sender,'628111111111');

  r=await invoke({method:'POST',query:{a:'diag_qris'},headers:{'x-admin-password':'test-admin'},body:{channel:'whatsapp',sender:'08111111111',code:'NFLIX-1',quantity:1}});
  assert.equal(r.status,200); assert.equal(r.body.data.request.path,'/v1/order/qris'); assert.equal(r.body.data.response.data.transaction_id,'API-TX1');

  r=await invoke({method:'POST',query:{a:'diag_order_status'},headers:{'x-admin-password':'test-admin'},body:{transaction_id:'API-TX1'}});
  assert.equal(r.status,200); assert.equal(r.body.data.response.data.status,'success');

  r=await invoke({query:{a:'pm_products',page:1,limit:999},headers:{'x-admin-password':'test-admin'}}); assert.equal(r.status,200);
  assert.equal(r.body.data.data.products[1].display_price,25000,'variation parent must use forwarded storefront price');
  assert.equal(r.body.data.data.products[1].price_source,'forwarded-catalog');
  const listCall=calls.findLast(x=>x.path==='/v1/products/'&&x.method==='GET'); assert.equal(listCall.query.limit,'20');

  const accounts=Array.from({length:205},(_,i)=>`user${i}|pass${i}`); calls.length=0;
  r=await invoke({method:'POST',query:{a:'pm_stock_add'},headers:{'x-admin-password':'test-admin'},body:{product_id:108,accounts}});
  assert.equal(r.status,201); assert.equal(r.body.data.total_added,205); assert.deepEqual(r.body.data.batch_sizes,[100,100,5]);

  r=await invoke({method:'POST',query:{a:'pm_product_create'},headers:{'x-admin-password':'test-admin'},body:{code:'ABC',title:'X'.repeat(101),price:1000}}); assert.equal(r.status,400);

  console.log('PASS gateway.test.js');
})().catch(e=>{console.error(e);process.exit(1);});
