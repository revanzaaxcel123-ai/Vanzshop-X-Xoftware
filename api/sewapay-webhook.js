'use strict';

const SewaPay = require('../lib/sewapay');

async function readRaw(req){
  if(Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if(typeof req.body === 'string') return req.body;
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  if(chunks.length) return Buffer.concat(chunks).toString('utf8');
  if(req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

function send(res,status,body){
  res.status(status);
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.end(JSON.stringify(body));
}

async function handler(req,res){
  if(String(req.method||'').toUpperCase()!=='POST') return send(res,405,{ok:false,error:'Method tidak diizinkan.'});
  try{
    const raw=await readRaw(req);
    const timestamp=String(req.headers?.['x-pg-timestamp']||'');
    const signature=String(req.headers?.['x-pg-signature']||'');
    const checked=SewaPay.verifyWebhook(raw,timestamp,signature,{maxSkewSeconds:Number(process.env.SEWAPAY_WEBHOOK_MAX_SKEW||900)});
    if(!checked.ok) return send(res,401,{ok:false,error:'Webhook signature tidak valid.',reason:checked.reason});
    let payload;
    try{payload=JSON.parse(raw);}catch{return send(res,400,{ok:false,error:'Webhook body bukan JSON valid.'});}
    const event=String(payload?.event||'');
    if(!['payment.completed','payment.failed','payment.cancelled'].includes(event)) return send(res,400,{ok:false,error:'Webhook event tidak dikenal.'});
    // No database is used in this project. The webhook is verified and acknowledged,
    // but fulfillment is intentionally NOT executed here because there is no persistent
    // idempotency store yet.
    return send(res,200,{ok:true,received:true,event,reference:String(payload?.data?.reference||''),payment_id:String(payload?.data?.id||''),fulfillment:'not-executed-no-idempotency-store'});
  }catch(e){
    return send(res,e?.status||500,{ok:false,error:e?.message||'Webhook gagal diproses.'});
  }
}

module.exports=handler;
module.exports.config={api:{bodyParser:false}};
