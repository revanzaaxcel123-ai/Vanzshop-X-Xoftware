'use strict';

const crypto=require('crypto');
const Store=require('./fulfillment-store');

const XO_BASE='https://backend-s2.xoftware.id';
const XO_KEY=String(process.env.XSOFTWARE_API_KEY||'').trim();
const XO_TIMEOUT=Math.max(5000,Math.min(60000,Number(process.env.XSOFTWARE_TIMEOUT||25000)));

function ready(){return Boolean(XO_KEY&&Store.ready());}
function status(){return {ready:ready(),xo_ready:Boolean(XO_KEY),store_ready:Store.ready(),store_url_configured:Boolean(Store.URL)};}
function err(message,statusCode=500,extra){const e=new Error(message);e.status=statusCode;if(extra!==undefined)e.details=extra;return e;}
function str(v,max=500){return String(v??'').trim().slice(0,max);}
function validId(v){return /^\d+$/.test(String(v??'').trim());}
function isNotFound(e){return Number(e?.status)===404 || /not found|tidak ditemukan/i.test(String(e?.message||''));}

async function xo(path,{method='GET',body}={}){
  if(!XO_KEY) throw err('XSOFTWARE_API_KEY belum dikonfigurasi.',500);
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),XO_TIMEOUT);
  try{
    const r=await fetch(`${XO_BASE}${path}`,{method,headers:{accept:'application/json','x-api-key':XO_KEY,...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:c.signal});
    const raw=await r.text(); let j={};
    try{j=raw?JSON.parse(raw):{};}catch{throw err(`Xoftware mengirim response non-JSON (${r.status}).`,502);}
    const code=Number(j?.code); const apiFail=j?.status===false||(Number.isFinite(code)&&code>=400);
    if(!r.ok||apiFail){const e=err(String(j?.message||j?.error||`Xoftware request gagal (${r.status}).`),!r.ok?r.status:(code>=400?code:400));e.upstream=j;throw e;}
    return j;
  }catch(e){
    if(e?.name==='AbortError') throw err('Request fulfillment ke Xoftware timeout.',504);
    if(e?.status) throw e;
    throw err('Xoftware tidak dapat dijangkau saat fulfillment.',502);
  }finally{clearTimeout(t);}
}

async function listStocks(productId,variationId,limit=1){
  if(!validId(productId)) throw err('product_id fulfillment tidak valid.',400);
  if(variationId!=null&&variationId!==''&&!validId(variationId)) throw err('variation_id fulfillment tidak valid.',400);
  const sp=new URLSearchParams({page:'1',limit:String(Math.max(1,Math.min(100,Number(limit)||1)))});
  if(variationId!=null&&variationId!=='') sp.set('variation_id',String(variationId));
  const r=await xo(`/v1/products/${Number(productId)}/stocks?${sp.toString()}`);
  const stocks=Array.isArray(r?.data?.stocks)?r.data.stocks:[];
  return {stocks,pagination:r?.data?.pagination||null,raw:r};
}
async function deleteStock(stockRecordId){
  if(!validId(stockRecordId)) throw err('ID record stok tidak valid.',400);
  return xo(`/v1/products/stocks/${Number(stockRecordId)}`,{method:'DELETE'});
}

function orderKey(reference){return `order:${reference}`;}
function receiptKey(reference){return `fulfillment:${reference}`;}
async function saveOrder(order){
  if(!Store.ready()) throw err('Fulfillment store belum dikonfigurasi.',503);
  const reference=str(order?.reference,200);
  if(!reference) throw err('reference order kosong.',400);
  const record={...order,reference,status:'payment_pending',created_at:order?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  const result=await Store.setJson(orderKey(reference),record,{nx:true});
  if(result!=='OK'){
    const existing=await Store.getJson(orderKey(reference));
    if(existing?.payment_id===record.payment_id) return existing;
    throw err('Reference payment sudah memiliki order record berbeda.',409);
  }
  return record;
}
async function getOrder(reference){return Store.getJson(orderKey(str(reference,200)));}
async function getReceipt(reference){return Store.getJson(receiptKey(str(reference,200)));}
async function setReceipt(reference,value){return Store.setJson(receiptKey(str(reference,200)),value);}

async function acquireWithWait(name,ttl=45,maxWaitMs=10000){
  const token=crypto.randomBytes(16).toString('hex');
  const start=Date.now();
  while(Date.now()-start<maxWaitMs){
    if(await Store.acquireLock(name,token,ttl)) return token;
    await Store.wait(180);
  }
  return null;
}

function validatePaid(order,payment){
  if(String(payment?.status||'').toUpperCase()!=='COMPLETED') throw err('Payment belum COMPLETED.',409,{payment_status:payment?.status||null});
  if(String(payment?.reference||'')!==String(order.reference)) throw err('Reference Sewa Pay tidak cocok dengan order.',409);
  if(order.payment_id && String(payment?.id||'')!==String(order.payment_id)) throw err('Payment ID Sewa Pay tidak cocok dengan order.',409);
  if(Number(payment?.amount)!==Number(order.amount)) throw err('Nominal payment tidak cocok dengan order.',409,{expected:Number(order.amount),received:Number(payment?.amount)});
}

async function claimPaidOrder({reference,payment,source='poll'}){
  if(!ready()) throw err('Auto-fulfillment belum siap: Redis idempotency store belum dikonfigurasi.',503,{code:'FULFILLMENT_STORE_MISSING'});
  reference=str(reference||payment?.reference,200);
  if(!reference) throw err('Reference fulfillment wajib ada.',400);
  const order=await getOrder(reference);
  if(!order) throw err('Order record tidak ditemukan di fulfillment store.',404,{reference});
  validatePaid(order,payment);

  let receipt=await getReceipt(reference);
  if(receipt?.status==='fulfilled') return receipt;

  const orderLockName=`fulfill:${reference}`;
  const orderLock=await acquireWithWait(orderLockName,60,12000);
  if(!orderLock){
    for(let i=0;i<8;i++){await Store.wait(250);receipt=await getReceipt(reference);if(receipt?.status==='fulfilled')return receipt;}
    throw err('Fulfillment sedang diproses request lain. Coba cek status lagi.',409,{code:'FULFILLMENT_IN_PROGRESS'});
  }

  try{
    receipt=await getReceipt(reference);
    if(receipt?.status==='fulfilled') return receipt;
    const quantity=Math.max(1,Math.min(20,Number(order.quantity)||1));
    if(!receipt){
      receipt={v:1,reference,payment_id:order.payment_id,product_id:order.product_id,variation_id:order.variation_id??null,code:order.code,quantity,product_title:order.product_title||'',variant_title:order.variant_title||'',status:'claiming',accounts:[],current_candidate:null,source,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await setReceipt(reference,receipt);
    }

    while((receipt.accounts||[]).length<quantity){
      const stockLockName=`stock:${order.product_id}:${order.variation_id??0}`;
      const stockLock=await acquireWithWait(stockLockName,30,12000);
      if(!stockLock) throw err('Stok sedang diklaim transaksi lain. Coba lagi.',409,{code:'STOCK_LOCK_BUSY'});
      try{
        receipt=await getReceipt(reference)||receipt;
        if(receipt.status==='fulfilled') return receipt;
        let candidate=receipt.current_candidate;
        if(!candidate){
          const listed=await listStocks(order.product_id,order.variation_id,1);
          const stock=listed.stocks[0];
          if(!stock) {
            receipt={...receipt,status:'waiting_stock',last_error:'Stok akun aktif Xoftware habis.',updated_at:new Date().toISOString()};
            await setReceipt(reference,receipt);
            throw err('Pembayaran sudah sukses, tetapi stok akun aktif Xoftware sedang habis. Fulfillment dapat diretry setelah stok ditambah.',409,{code:'FULFILLMENT_OUT_OF_STOCK'});
          }
          const recordId=stock.id??stock.stock_record_id??stock.account_id;
          if(!validId(recordId)) throw err('Response stok Xoftware tidak memiliki ID record yang dapat dihapus.',502,{stock});
          candidate={record_id:Number(recordId),stock_id:stock.stock_id??order.product_id,variation_id:stock.variation_id??order.variation_id??null,value:stock.value??stock.account??stock.data??null,created_at:stock.createdAt??stock.created_at??null,selected_at:new Date().toISOString(),delete_started_at:null};
          receipt={...receipt,status:'claiming',current_candidate:candidate,last_error:null,updated_at:new Date().toISOString()};
          await setReceipt(reference,receipt);
        }

        if(!candidate.delete_started_at){
          candidate={...candidate,delete_started_at:new Date().toISOString()};
          receipt={...receipt,current_candidate:candidate,updated_at:new Date().toISOString()};
          await setReceipt(reference,receipt);
        }

        let deleted='confirmed';
        try{await deleteStock(candidate.record_id);}catch(e){
          if(isNotFound(e)) deleted='already_missing_after_started_delete';
          else throw e;
        }

        const delivered={stock_record_id:candidate.record_id,stock_id:candidate.stock_id,variation_id:candidate.variation_id,value:candidate.value,stock_created_at:candidate.created_at,claimed_at:new Date().toISOString(),delete_result:deleted};
        const accounts=[...(Array.isArray(receipt.accounts)?receipt.accounts:[]),delivered];
        receipt={...receipt,status:accounts.length>=quantity?'fulfilled':'claiming',accounts,current_candidate:null,fulfilled_at:accounts.length>=quantity?new Date().toISOString():null,updated_at:new Date().toISOString()};
        await setReceipt(reference,receipt);
      }finally{await Store.releaseLock(stockLockName,stockLock).catch(()=>{});}
    }

    if(receipt.status!=='fulfilled'){
      receipt={...receipt,status:'fulfilled',fulfilled_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await setReceipt(reference,receipt);
    }
    return receipt;
  }catch(e){
    const cur=await getReceipt(reference).catch(()=>null);
    if(cur && cur.status!=='fulfilled' && e?.details?.code!=='FULFILLMENT_OUT_OF_STOCK'){
      await setReceipt(reference,{...cur,status:'retryable_error',last_error:String(e?.message||'Fulfillment gagal.'),updated_at:new Date().toISOString()}).catch(()=>{});
    }
    throw e;
  }finally{await Store.releaseLock(orderLockName,orderLock).catch(()=>{});}
}

function publicReceipt(receipt){
  if(!receipt) return null;
  return {
    reference:receipt.reference,status:receipt.status,product_id:receipt.product_id,variation_id:receipt.variation_id,code:receipt.code,quantity:receipt.quantity,
    product_title:receipt.product_title,variant_title:receipt.variant_title,fulfilled_at:receipt.fulfilled_at||null,last_error:receipt.last_error||null,
    accounts:Array.isArray(receipt.accounts)?receipt.accounts.map(x=>({stock_record_id:x.stock_record_id,value:x.value,claimed_at:x.claimed_at})):[],
  };
}

module.exports={ready,status,saveOrder,getOrder,getReceipt,claimPaidOrder,publicReceipt,listStocks,deleteStock};
