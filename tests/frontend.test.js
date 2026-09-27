'use strict';
const assert = require('assert');
const fs = require('fs');
const js = fs.readFileSync(require('path').join(__dirname,'../assets/xshop.js'),'utf8');
const html = fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const vercel = JSON.parse(fs.readFileSync(require('path').join(__dirname,'../vercel.json'),'utf8'));
assert.match(js,/const BUILD_ID = 'HARDMAX-v15-ANTIDOUBLE'/);
assert.match(js,/function activeRoute\(\)/);
assert.match(js,/p==='\/admin'/);
assert.match(js,/adminEndpointMap/);
assert.match(js,/adminBalanceOrder/);
assert.match(js,/adminVariations/);
assert.match(js,/adminEnvironment/);
assert.match(js,/diag_product/);
assert.match(html,/xshop\.js\?v=25/);
assert.equal(vercel.cleanUrls,true);
assert.ok(fs.existsSync(require('path').join(__dirname,'../admin.html')));
console.log('PASS frontend.test.js');

assert.match(js,/admin_login/);
assert.match(js,/vanz_admin_token/);
assert.match(js,/authorization/);

assert.match(js,/payment_create/);
assert.match(js,/payment_status/);
assert.match(js,/Sewa Pay/);

assert.match(js,/fulfillment_retry/);
assert.match(js,/Akun sudah di-claim/);
