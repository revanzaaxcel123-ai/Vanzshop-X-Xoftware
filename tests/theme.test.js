'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets', 'xshop.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'xo.js'), 'utf8');

for (const theme of ['gold','pearl','aurora','galaxy','ocean','sunset','synth','neon','forest','ruby','matrix','mono','sakura','arctic','mint','candy','lavender','desert','paper']) {
  assert.match(js, new RegExp(`\\b${theme}:\\{label:`), `missing storefront theme ${theme}`);
}
for (const theme of ['gold','latte','ocean','emerald','nebula','sunset','neon','graphite','ruby','sakura','arctic','mint','lavender','sand']) {
  assert.ok(js.includes(`${theme}:{label:`), `missing admin theme ${theme}`);
}
for (const scene of ['orbs','aurora','waves','mesh','bubbles','petals','retro','dots']) {
  assert.ok(css.includes(`[data-scene=${scene}]`), `missing background scene ${scene}`);
}
assert.match(js, /function themePicker\(/);
assert.match(js, /STORE_SITE_THEME=/);
assert.match(js, /STORE_ADMIN_THEME=/);
assert.match(api, /STORE_SITE_THEME/);
assert.match(api, /STORE_ADMIN_THEME/);
for (let i = 1; i <= 5; i += 1) {
  const banner = path.join(root, 'assets', 'banner', `banner${i}.jpg`);
  assert.ok(fs.existsSync(banner), `missing campaign banner ${i}`);
  assert.ok(fs.statSync(banner).size < 160000, `campaign banner ${i} is not optimized`);
}
assert.match(js, /campaign-slider-track/);
assert.match(js, /function storefrontSections\(/);
assert.match(js, /id="kenapa-vanzshop"/);
assert.match(js, /id="cara-belanja"/);
assert.match(js, /id="faq"/);
const adminNavigation = js.slice(js.indexOf('function adminTabs'), js.indexOf('async function renderAdmin'));
assert.ok(!adminNavigation.includes('Endpoint Lab'), 'technical API lab should not appear in admin navigation');
assert.ok(!adminNavigation.includes('Order API'), 'order API group should not appear in admin navigation');
assert.match(adminNavigation, /Stok Masuk & Aktif/);
assert.match(adminNavigation, /Stok Keluar/);
console.log('PASS theme.test.js');
