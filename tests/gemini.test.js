'use strict';

const assert=require('assert');

process.env.GEMINI_API_KEY='gemini-test-secret-never-return';
process.env.GEMINI_MODEL='gemini-test-model';
process.env.GEMINI_TIMEOUT='5000';
process.env.GEMINI_MAX_OUTPUT_TOKENS='300';

const calls=[];
global.fetch=async(url,options={})=>{
  calls.push({url:String(url),options,body:JSON.parse(options.body||'{}')});
  return {
    ok:true,
    status:200,
    async text(){return JSON.stringify({candidates:[{content:{parts:[{text:'Canva Pro tersedia. Pilih varian lalu bayar lewat QRIS.'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:40,candidatesTokenCount:14}});},
  };
};

const Gemini=require('../lib/gemini');

(async()=>{
  const info=Gemini.status();
  assert.equal(info.configured,true);
  assert.equal(info.model,'gemini-test-model');
  assert.ok(!JSON.stringify(info).includes(process.env.GEMINI_API_KEY),'status must never expose the key');

  const result=await Gemini.generate({
    message:'Ada Canva?',
    history:[{role:'user',text:'Halo'},{role:'model',text:'Hai!'}],
    products:[{title:'Canva Pro',code:'CANVA',price:25000,stock:8,description:'Desain premium',variations:[]}],
    storeName:'VanzShop Test',
  });
  assert.equal(result.text,'Canva Pro tersedia. Pilih varian lalu bayar lewat QRIS.');
  assert.equal(result.model,'gemini-test-model');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-test-model:generateContent/);
  assert.equal(calls[0].options.headers['x-goog-api-key'],process.env.GEMINI_API_KEY);
  assert.match(calls[0].body.systemInstruction.parts[0].text,/Jangan pernah meminta atau menampilkan API key/);
  assert.match(calls[0].body.systemInstruction.parts[0].text,/Canva Pro/);
  assert.equal(calls[0].body.generationConfig.maxOutputTokens,300);
  assert.equal(calls[0].body.contents.at(-1).parts[0].text,'Ada Canva?');
  console.log('PASS gemini.test.js');
})().catch(error=>{console.error(error);process.exit(1);});
