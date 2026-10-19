'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/xshop.js'),'utf8');
function section(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}

(async()=>{
  const stored=new Map();let saved=null,rendered=null,shellText='',failed=false,calls=0;
  const ctx=vm.createContext({URLSearchParams,location:{pathname:'/bayar/tx_test',search:'?token=abc.def',hash:''},history:{replaceState(a,b,url){rendered=url;}},sessionStorage:{setItem(k,v){stored.set(k,v);},getItem(k){return stored.get(k)||null;},removeItem(k){stored.delete(k);}},orders:()=>saved?[saved]:[],saveLocalOrder:o=>{saved=o;},syncSeo(){},shell:s=>{shellText=s;},esc:s=>s,$:()=>({}),renderPayment:id=>id,api:async()=>{calls++;if(failed)throw new Error('temporary offline');return{status:'success',order:{payment_id:'tx_test',reference:'VZ-TEST',product_title:'Product'},payment:{amount:1000},fulfillment:{status:'fulfilled',accounts:[{value:'DELIVERY-DATA'}]}};}});
  vm.runInContext(section('function paymentHandoffKey','function orderState'),ctx);
  await vm.runInContext("acceptPaymentHandoff('tx_test','abc.def')",ctx);
  assert.equal(saved.accounts[0],'DELIVERY-DATA');assert.equal(saved.reference,'VZ-TEST');assert.equal(rendered,'/bayar/tx_test');assert.equal(stored.size,0);
  saved=null;failed=true;
  await vm.runInContext("acceptPaymentHandoff('tx_test','abc.def')",ctx);
  assert.match(shellText,/retryPaymentHandoff/);assert.equal(stored.size,1);assert.equal(ctx.location.hash,'');
  failed=false;
  await vm.runInContext("acceptPaymentHandoff('tx_test','')",ctx);
  assert.equal(saved.accounts[0],'DELIVERY-DATA');assert.equal(stored.size,0);
  ctx.location={pathname:'/',search:'',hash:'#/bayar/tx_test?token=abc.def'};
  vm.runInContext(section('function activeRoute','window.addEventListener'),ctx);
  ctx.timer=null;ctx.ensureInit=()=>{throw new Error('catalog unavailable');};
  await vm.runInContext('renderRoute()',ctx); // payment route must not wait for the catalog
  assert.equal(vm.runInContext('activeRoute()',ctx),'/bayar/tx_test?token=abc.def');
  ctx.location={pathname:'/bayar/tx_test',search:'?token=abc.def',hash:''};
  assert.equal(vm.runInContext('activeRoute()',ctx),'/bayar/tx_test?token=abc.def');
  assert.equal(calls,3);
  console.log('PASS payment-handoff.test.js');
})().catch(e=>{console.error(e);process.exitCode=1;});
