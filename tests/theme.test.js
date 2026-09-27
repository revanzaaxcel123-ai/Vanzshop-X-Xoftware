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
console.log('PASS theme.test.js');
