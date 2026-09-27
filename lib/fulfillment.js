'use strict';

const crypto=require('crypto');
const Store=require('./fulfillment-store');

const XO_BASE='https://backend-s2.xoftware.id';
const XO_KEY=String(process.env.XSOFTWARE_API_KEY||'').trim();
const XO_TIMEOUT=Math.max(5000,Math.min(60000,Number(process.env.XSOFTWARE_TIMEOUT||25000)));
const HOLD_TTL=Math.max(300,Math.min(7200,Number(process.env.FULFILLMENT_HOLD_TTL_SECONDS||1800)));
const CLAIM_TTL=Math.max(86400,Math.min(365*86400,Number(process.env.FULFILLMENT_STOCK_CLAIM_TTL_DAYS||365)*86400));
const LOCK_TTL=Math.max(45,Math.min(300,Number(process.env.FULFILLMENT_LOCK_TTL_SECONDS||120)));
const EXCLUSIVE_STOCK=!['0','false','off','no'].includes(String(process.env.FULFILLMENT_EXCLUSIVE_STOCK||'true').trim().toLowerCase());

function ready(){return Boolean(XO_KEY&&Store.ready());}
function status(){return {
  ready:ready(),xo_ready:Boolean(XO_KEY),store_ready:Store.ready(),store_url_configured:Boolean(Store.URL),
  hold_ttl_seconds:HOLD_TTL,lock_ttl_seconds:LOCK_TTL,stock_claim_ttl_seconds:CLAIM_TTL,
  strict_uniqueness_scope:EXCLUSIVE_STOCK?'vanzshop-exclusive-stock-source':'shared-stock-source-best-effort',
  exclusive_stock_required_for_strict_uniqueness:true,
};}
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
    if(e?.name==='AbortError') throw err('Request fulfillment ke Xoftware timeout.',504,{code:'XO_TIMEOUT'});
    if(e?.status) throw e;
    throw err('Xoftware tidak dapat dijangkau saat fulfillment.',502,{code:'XO_UNREACHABLE'});
  }finally{clearTimeout(t);}
}

async function listStocks(productId,variationId,limit=20,page=1){
  if(!validId(productId)) throw err('product_id fulfillment tidak valid.',400);
  if(variationId!=null&&variationId!==''&&!validId(variationId)) throw err('variation_id fulfillment tidak valid.',400);
  const sp=new URLSearchParams({page:String(Math.max(1,Number(page)||1)),limit:String(Math.max(1,Math.min(100,Number(limit)||20)))});
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
function stockOwnerKey(id){return `stockowner:${id}`;}
function stockMetaKey(id){return `stockmeta:${id}`;}

async function saveOrder(order){
  if(!Store.ready()) throw err('Fulfillment store belum dikonfigurasi.',503);
  const reference=str(order?.reference,200);
  if(!reference) throw err('reference order kosong.',400);
  const record={...order,reference,status:'payment_pending',created_at:order?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  const result=await Store.setJson(orderKey(reference),record,{nx:true});
  if(result!=='OK'){
    const existing=await Store.getJson(orderKey(reference));
    if(existing?.payment_id===record.payment_id) return existing;
    throw err('Reference payment sudah memiliki order record berbeda.',409,{code:'ORDER_REFERENCE_COLLISION'});
  }
  return record;
}
async function getOrder(reference){return Store.getJson(orderKey(str(reference,200)));}
async function getReceipt(reference){return Store.getJson(receiptKey(str(reference,200)));}
async function setReceipt(reference,value){return Store.setJson(receiptKey(str(reference,200)),value);}

async function acquireWithWait(name,ttl=LOCK_TTL,maxWaitMs=12000){
  const token=crypto.randomBytes(16).toString('hex');
  const start=Date.now();
  while(Date.now()-start<maxWaitMs){
    if(await Store.acquireLock(name,token,ttl)) return token;
    await Store.wait(160);
  }
  return null;
}

function stockSnapshot(stock,reference,productId,variationId,phase='held'){
  const recordId=stock?.id??stock?.stock_record_id??stock?.account_id;
  if(!validId(recordId)) throw err('Response stok Xoftware tidak memiliki ID record valid.',502,{stock});
  return {
    record_id:Number(recordId),reference:str(reference,200),product_id:Number(productId),
    stock_id:stock?.stock_id??Number(productId),variation_id:stock?.variation_id??variationId??null,
    value:stock?.value??stock?.account??stock?.data??null,stock_created_at:stock?.createdAt??stock?.created_at??null,
    phase,reserved_at:new Date().toISOString(),updated_at:new Date().toISOString(),
  };
}

async function ownerOf(recordId){return str(await Store.get(stockOwnerKey(recordId)),200);}
async function metaOf(recordId){return Store.getJson(stockMetaKey(recordId));}

async function reserveRecord(stock,{reference,productId,variationId,ttl=HOLD_TTL,phase='held'}={}){
  const snap=stockSnapshot(stock,reference,productId,variationId,phase);
  const ownerKey=stockOwnerKey(snap.record_id);
  let acquired=false;
  try{
    const r=await Store.set(ownerKey,reference,{nx:true,ttl});
    acquired=r==='OK';
    if(!acquired){
      const owner=await ownerOf(snap.record_id);
      if(owner!==String(reference)) return null;
      await Store.expire(ownerKey,ttl).catch(()=>{});
    }
    await Store.setJson(stockMetaKey(snap.record_id),snap,{ttl});
    return snap;
  }catch(e){
    if(acquired) await Store.compareDelete(ownerKey,reference).catch(()=>{});
    throw e;
  }
}

async function releaseReservation(recordId,reference){
  if(!validId(recordId)||!reference) return false;
  const removed=Number(await Store.compareDelete(stockOwnerKey(recordId),String(reference)).catch(()=>0))>0;
  if(removed) await Store.del(stockMetaKey(recordId)).catch(()=>{});
  return removed;
}

async function extendReservation(recordId,reference,ttl=CLAIM_TTL,phase){
  const owner=await ownerOf(recordId);
  if(owner!==String(reference)) return false;
  await Store.expire(stockOwnerKey(recordId),ttl);
  const meta=await metaOf(recordId);
  if(meta){await Store.setJson(stockMetaKey(recordId),{...meta,phase:phase||meta.phase,updated_at:new Date().toISOString()},{ttl});}
  return true;
}

async function reserveCheckoutStock({reference,product_id,variation_id,quantity}){
  if(!ready()) throw err('Auto-fulfillment belum siap.',503,{code:'FULFILLMENT_STORE_MISSING'});
  reference=str(reference,200);
  const qty=Math.max(1,Math.min(20,Number(quantity)||1));
  if(!reference) throw err('Reference reservation kosong.',400);
  if(!validId(product_id)) throw err('product_id reservation tidak valid.',400);
  const lockName=`inventory:${product_id}:${variation_id??0}`;
  const lock=await acquireWithWait(lockName,LOCK_TTL,12000);
  if(!lock) throw err('Inventory sedang diproses transaksi lain. Coba lagi.',409,{code:'INVENTORY_LOCK_BUSY'});
  const reserved=[];
  try{
    let page=1,totalPages=1;
    while(reserved.length<qty && page<=Math.min(totalPages,10)){
      const listed=await listStocks(product_id,variation_id,100,page);
      totalPages=Math.max(1,Number(listed?.pagination?.total_pages)||1);
      for(const stock of listed.stocks){
        if(reserved.length>=qty) break;
        const snap=await reserveRecord(stock,{reference,productId:product_id,variationId:variation_id,ttl:HOLD_TTL,phase:'payment_hold'});
        if(snap) reserved.push(snap);
      }
      page++;
      if(!listed.stocks.length) break;
    }
    if(reserved.length<qty){
      for(const r of reserved) await releaseReservation(r.record_id,reference).catch(()=>{});
      throw err('Stok akun Xoftware yang belum dipegang transaksi lain tidak mencukupi. Payment tidak dibuat.',409,{code:'CLAIMABLE_STOCK_SHORTAGE',requested:qty,reserved:reserved.length});
    }
    return reserved;
  }finally{await Store.releaseLock(lockName,lock).catch(()=>{});}
}

async function releaseOrderReservations(reference){
  const order=await getOrder(reference);
  if(!order) return {released:0,kept:0};
  const receipt=await getReceipt(reference).catch(()=>null);
  const used=new Set((receipt?.accounts||[]).map(x=>Number(x.stock_record_id)));
  const ids=Array.isArray(order.reserved_stock_record_ids)?order.reserved_stock_record_ids:[];
  let released=0,kept=0;
  for(const id of ids){
    if(used.has(Number(id))){kept++;continue;}
    const meta=await metaOf(id).catch(()=>null);
    if(meta?.phase==='fulfilled'){kept++;continue;}
    if(await releaseReservation(id,reference).catch(()=>false)) released++;
  }
  return {released,kept};
}

function validatePaid(order,payment){
  if(String(payment?.status||'').toUpperCase()!=='COMPLETED') throw err('Payment belum COMPLETED.',409,{payment_status:payment?.status||null});
  if(String(payment?.reference||'')!==String(order.reference)) throw err('Reference Sewa Pay tidak cocok dengan order.',409);
  if(order.payment_id && String(payment?.id||'')!==String(order.payment_id)) throw err('Payment ID Sewa Pay tidak cocok dengan order.',409);
  if(Number(payment?.amount)!==Number(order.amount)) throw err('Nominal payment tidak cocok dengan order.',409,{expected:Number(order.amount),received:Number(payment?.amount)});
}

async function chooseCandidate(order,receipt,reference){
  if(receipt?.current_candidate){
    const current=receipt.current_candidate;
    if(await ownerOf(current.record_id)===String(reference)) return current;
    receipt={...receipt,current_candidate:null,last_error:'Reservation kandidat lama tidak lagi dimiliki order ini.',updated_at:new Date().toISOString()};
    await setReceipt(reference,receipt);
  }

  const delivered=new Set((receipt?.accounts||[]).map(x=>Number(x.stock_record_id)));
  const preferred=Array.isArray(order.reserved_stock_record_ids)?order.reserved_stock_record_ids:[];
  for(const id of preferred){
    if(delivered.has(Number(id))) continue;
    const owner=await ownerOf(id);
    if(owner!==String(reference)) continue;
    const meta=await metaOf(id);
    if(!meta) continue;
    await extendReservation(id,reference,CLAIM_TTL,'claiming');
    return {record_id:Number(id),stock_id:meta.stock_id??order.product_id,variation_id:meta.variation_id??order.variation_id??null,value:meta.value,created_at:meta.stock_created_at??null,selected_at:meta.reserved_at||new Date().toISOString(),delete_started_at:null};
  }

  // Payment lama/migrasi atau hold expired: cari stok baru dan reserve atomically untuk reference ini.
  let page=1,totalPages=1;
  while(page<=Math.min(totalPages,10)){
    const listed=await listStocks(order.product_id,order.variation_id,100,page);
    totalPages=Math.max(1,Number(listed?.pagination?.total_pages)||1);
    for(const stock of listed.stocks){
      const recordId=Number(stock?.id??stock?.stock_record_id??stock?.account_id);
      if(delivered.has(recordId)) continue;
      const snap=await reserveRecord(stock,{reference,productId:order.product_id,variationId:order.variation_id,ttl:CLAIM_TTL,phase:'claiming'});
      if(!snap) continue;
      return {record_id:snap.record_id,stock_id:snap.stock_id,variation_id:snap.variation_id,value:snap.value,created_at:snap.stock_created_at,selected_at:snap.reserved_at,delete_started_at:null};
    }
    page++;
    if(!listed.stocks.length) break;
  }
  return null;
}

async function markStockPhase(candidate,reference,phase,extra={}){
  const owner=await ownerOf(candidate.record_id);
  if(owner!==String(reference)) return false;
  const meta=await metaOf(candidate.record_id)||{};
  await Store.setJson(stockMetaKey(candidate.record_id),{...meta,...extra,reference,record_id:candidate.record_id,phase,updated_at:new Date().toISOString()},{ttl:CLAIM_TTL});
  await Store.expire(stockOwnerKey(candidate.record_id),CLAIM_TTL).catch(()=>{});
  return true;
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
  const orderLock=await acquireWithWait(orderLockName,LOCK_TTL,15000);
  if(!orderLock){
    for(let i=0;i<10;i++){await Store.wait(250);receipt=await getReceipt(reference);if(receipt?.status==='fulfilled')return receipt;}
    throw err('Fulfillment sedang diproses request lain. Coba cek status lagi.',409,{code:'FULFILLMENT_IN_PROGRESS'});
  }

  try{
    receipt=await getReceipt(reference);
    if(receipt?.status==='fulfilled') return receipt;
    const quantity=Math.max(1,Math.min(20,Number(order.quantity)||1));
    if(!receipt){
      receipt={v:2,reference,payment_id:order.payment_id,product_id:order.product_id,variation_id:order.variation_id??null,code:order.code,quantity,product_title:order.product_title||'',variant_title:order.variant_title||'',status:'claiming',accounts:[],current_candidate:null,source,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await setReceipt(reference,receipt);
    }

    while((receipt.accounts||[]).length<quantity){
      const stockLockName=`inventory:${order.product_id}:${order.variation_id??0}`;
      const stockLock=await acquireWithWait(stockLockName,LOCK_TTL,15000);
      if(!stockLock) throw err('Stok sedang diklaim transaksi lain. Coba lagi.',409,{code:'STOCK_LOCK_BUSY'});
      try{
        receipt=await getReceipt(reference)||receipt;
        if(receipt.status==='fulfilled') return receipt;
        let candidate=await chooseCandidate(order,receipt,reference);
        if(!candidate){
          receipt={...receipt,status:'waiting_stock',last_error:'Stok akun aktif Xoftware yang belum dimiliki transaksi lain sedang habis.',updated_at:new Date().toISOString()};
          await setReceipt(reference,receipt);
          throw err('Pembayaran sudah sukses, tetapi stok akun aktif Xoftware sedang habis. Fulfillment dapat diretry setelah stok ditambah.',409,{code:'FULFILLMENT_OUT_OF_STOCK'});
        }

        const owner=await ownerOf(candidate.record_id);
        if(owner!==String(reference)){
          receipt={...receipt,current_candidate:null,last_error:'Kandidat stok sudah dimiliki transaksi lain; mencari stok lain.',updated_at:new Date().toISOString()};
          await setReceipt(reference,receipt);
          continue;
        }

        if(!candidate.delete_started_at){
          candidate={...candidate,delete_started_at:new Date().toISOString()};
          receipt={...receipt,status:'claiming',current_candidate:candidate,last_error:null,updated_at:new Date().toISOString()};
          await setReceipt(reference,receipt);
          await markStockPhase(candidate,reference,'deleting',{delete_started_at:candidate.delete_started_at});
        }

        let deleted='confirmed';
        try{
          await deleteStock(candidate.record_id);
        }catch(e){
          if(isNotFound(e)){
            // Safe for VanzShop-owned flow because the same stock record has an exclusive Redis owner.
            // If another external system also consumes the same Xoftware stock without using this Redis,
            // strict uniqueness cannot be proven from Xoftware's DELETE-only API.
            if(await ownerOf(candidate.record_id)!==String(reference)){
              receipt={...receipt,current_candidate:null,last_error:'Record stok hilang dan ownership berubah; tidak dikirim ke buyer.',updated_at:new Date().toISOString()};
              await setReceipt(reference,receipt);
              continue;
            }
            deleted='already_absent_under_owned_claim';
          }else{
            await markStockPhase(candidate,reference,'delete_retry',{last_error:String(e?.message||'DELETE stok gagal')}).catch(()=>{});
            throw e;
          }
        }

        const delivered={stock_record_id:candidate.record_id,stock_id:candidate.stock_id,variation_id:candidate.variation_id,value:candidate.value,stock_created_at:candidate.created_at,claimed_at:new Date().toISOString(),delete_result:deleted};
        const existingIds=new Set((receipt.accounts||[]).map(x=>Number(x.stock_record_id)));
        const accounts=existingIds.has(Number(candidate.record_id))?[...(receipt.accounts||[])]:[...(receipt.accounts||[]),delivered];
        receipt={...receipt,status:accounts.length>=quantity?'fulfilled':'claiming',accounts,current_candidate:null,fulfilled_at:accounts.length>=quantity?new Date().toISOString():null,updated_at:new Date().toISOString()};
        await setReceipt(reference,receipt);
        await markStockPhase(candidate,reference,'fulfilled',{claimed_at:delivered.claimed_at,delete_result:deleted}).catch(()=>{});
      }finally{await Store.releaseLock(stockLockName,stockLock).catch(()=>{});}
    }

    if(receipt.status!=='fulfilled'){
      receipt={...receipt,status:'fulfilled',fulfilled_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await setReceipt(reference,receipt);
    }

    // Kalau ada hold ekstra/stale, lepas supaya payment lain bisa memakainya.
    const used=new Set((receipt.accounts||[]).map(x=>Number(x.stock_record_id)));
    for(const id of Array.isArray(order.reserved_stock_record_ids)?order.reserved_stock_record_ids:[]){
      if(!used.has(Number(id))) await releaseReservation(id,reference).catch(()=>{});
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
    accounts:Array.isArray(receipt.accounts)?receipt.accounts.map(x=>({stock_record_id:x.stock_record_id,value:x.value,claimed_at:x.claimed_at,delete_result:x.delete_result})):[],
  };
}

async function listReceipts(limit=100){
  const rows=await Store.scanJson('fulfillment:*',{limit:Math.max(1,Math.min(500,Number(limit)||100))});
  return rows.map(x=>x.value).filter(Boolean).sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')));
}
async function listOrders(limit=100){
  const rows=await Store.scanJson('order:*',{limit:Math.max(1,Math.min(500,Number(limit)||100))});
  return rows.map(x=>x.value).filter(Boolean).map(order=>({
    reference:order.reference,payment_id:order.payment_id,product_id:order.product_id,variation_id:order.variation_id??null,
    code:order.code,quantity:Number(order.quantity)||0,amount:Number(order.amount)||0,method:order.method||'',
    product_title:order.product_title||'',variant_title:order.variant_title||'',unit_price:Number(order.unit_price)||0,
    status:order.status||'payment_pending',created_at:order.created_at||null,updated_at:order.updated_at||null,
  })).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}
async function fulfillmentStats(limit=500){
  const rows=await listReceipts(limit);
  const stats={total:rows.length,fulfilled:0,claiming:0,waiting_stock:0,retryable_error:0,other:0,accounts_delivered:0};
  for(const r of rows){const k=String(r.status||'other'); if(Object.prototype.hasOwnProperty.call(stats,k))stats[k]++;else stats.other++;stats.accounts_delivered+=Array.isArray(r.accounts)?r.accounts.length:0;}
  return stats;
}
async function stockClaimInfo(recordId){
  if(!validId(recordId)) throw err('stock_record_id tidak valid.',400);
  return {record_id:Number(recordId),owner:await ownerOf(recordId),meta:await metaOf(recordId)};
}

module.exports={
  ready,status,saveOrder,getOrder,getReceipt,claimPaidOrder,publicReceipt,listStocks,deleteStock,
  reserveCheckoutStock,releaseOrderReservations,releaseReservation,listReceipts,listOrders,fulfillmentStats,stockClaimInfo,
};
