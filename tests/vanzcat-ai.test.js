'use strict';

const assert=require('assert');

process.env.XSOFTWARE_API_KEY='xo-test';
process.env.ADMIN_PASSWORD='admin-test';
process.env.GEMINI_API_KEY='gemini-server-secret';
process.env.GEMINI_MODEL='gemini-test-flash';
process.env.GEMINI_RATE_LIMIT_PER_MINUTE='12';

const calls=[];
function reply(status,body){return{ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}
global.fetch=async(url,options={})=>{
  const parsed=new URL(url),body=options.body?JSON.parse(options.body):null;
  calls.push({host:parsed.host,path:parsed.pathname,headers:options.headers||{},body});
  if(parsed.host==='generativelanguage.googleapis.com')return reply(200,{candidates:[{content:{parts:[{text:'ChatGPT Plus tersedia dengan harga Rp70.000. Pilih produk, cek varian, lalu bayar lewat QRIS.'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:80,candidatesTokenCount:22}});
  if(parsed.pathname==='/v1/product')return reply(200,{status:true,data:[{id:1,title:'ChatGPT Plus',code:'CHATGPT',price:70000,stock:12,description:'Akun AI premium',variations:[]}]});
  return reply(200,{status:true,data:{}});
};

const handler=require('../api/xo.js');
function invoke({method='GET',query={},body,headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req={method,query,body,headers:{'x-forwarded-for':'203.0.113.10',...headers}};
    const res={statusCode:200,headers:{},status(code){this.statusCode=code;return this;},setHeader(key,value){this.headers[key.toLowerCase()]=value;return this;},end(payload){try{resolve({status:this.statusCode,body:JSON.parse(payload)});}catch(error){reject(error);}}};
    Promise.resolve(handler(req,res)).catch(reject);
  });
}

(async()=>{
  let response=await invoke({method:'POST',query:{a:'vanzcat_chat'},body:{message:'Ada produk AI apa?',history:[]}});
  assert.equal(response.status,200);
  assert.equal(response.body.data.provider,'gemini');
  assert.equal(response.body.data.model,'gemini-test-flash');
  assert.match(response.body.data.answer,/ChatGPT Plus/);
  assert.ok(!JSON.stringify(response.body).includes(process.env.GEMINI_API_KEY),'public response must not expose Gemini key');
  const geminiCall=calls.find(call=>call.host==='generativelanguage.googleapis.com');
  assert.equal(geminiCall.headers['x-goog-api-key'],process.env.GEMINI_API_KEY);
  assert.match(geminiCall.body.systemInstruction.parts[0].text,/ChatGPT Plus/);

  response=await invoke({method:'POST',query:{a:'admin_login'},body:{password:'admin-test'}});
  const token=response.body.data.token;
  response=await invoke({query:{a:'admin_ai_status'},headers:{authorization:`Bearer ${token}`}});
  assert.equal(response.status,200);
  assert.equal(response.body.data.configured,true);
  assert.equal(response.body.data.key_exposed,false);
  assert.ok(!JSON.stringify(response.body).includes(process.env.GEMINI_API_KEY),'admin status must not expose Gemini key');

  response=await invoke({method:'POST',query:{a:'admin_ai_test'},headers:{authorization:`Bearer ${token}`},body:{message:'Tes singkat'}});
  assert.equal(response.status,200);
  assert.match(response.body.data.answer,/ChatGPT Plus/);
  console.log('PASS vanzcat-ai.test.js');
})().catch(error=>{console.error(error);process.exit(1);});
