import assert from 'node:assert/strict'
import test from 'node:test'
import { activeProducts, catalogMessages, displayProductName, greeting, variationMessage } from '../src/format.js'

test('sapaan mengikuti waktu WIB', () => {
  assert.equal(greeting(new Date('2026-10-03T23:00:00.000Z')), 'Selamat pagi')
  assert.equal(greeting(new Date('2026-10-04T05:00:00.000Z')), 'Selamat siang')
  assert.equal(greeting(new Date('2026-10-04T09:00:00.000Z')), 'Selamat sore')
  assert.equal(greeting(new Date('2026-10-04T14:00:00.000Z')), 'Selamat malam')
})

test('katalog menampilkan semua produk dengan nomor stabil', () => {
  const products = activeProducts([
    { id: 1, title: 'ChatGPT', price: 0, stock: 5, variations: [{ id: 11, title: '1 Bulan', price: 6000, stock: 5 }] },
    { id: 2, title: 'Canva', price: 10000, stock: 3, variations: [] },
  ])
  const text = catalogMessages({ products, timezone: 'Asia/Jakarta' }).join('\n')
  assert.match(text, /Termurah Seantero Raya/)
  assert.match(text, /1\. \*Canva\*\n2\. \*Chatgpt\*/)
  assert.doesNotMatch(text, /Mulai Rp/)
  assert.doesNotMatch(text, /Stok 5/)
  assert.match(text, /Order juga tersedia/)
  assert.match(text, /Ketik \*angka\* untuk memilih 🛍️/)
  assert.doesNotMatch(text, /\d+\. ✦/)
  assert.match(text, /🖥️ \*Webstore:\*/)
  assert.match(text, /💬 \*Telegram:\*/)
  assert.match(text, /kepercayaannya\._ 🩷$/)
})

test('alphabetical menu preserves supplier identities and never mutates original catalog', () => {
  const source = [
    { id: 30, title: 'VIDIO PLATINUM', price: 2000 },
    { id: 20, title: 'AI CHATGPT', price: 1000 },
    { id: 10, title: 'ADOBE CREATIVE CLOUD', price: 3000 },
  ]
  const products = activeProducts(source)
  assert.deepEqual(products.map(product => product.id), [10, 20, 30])
  assert.deepEqual(source.map(product => product.id), [30, 20, 10])
  assert.equal(products[1].title, 'AI CHATGPT')
  assert.equal(displayProductName(products[1]), 'Ai Chatgpt')
  assert.match(catalogMessages({ products }).join('\n'), /1\. \*Adobe Creative Cloud\*\n2\. \*Ai Chatgpt\*\n3\. \*Vidio Platinum\*/)
})

test('variasi mempunyai fallback angka', () => {
  const text = variationMessage({ title: 'ChatGPT' }, [
    { id: 1, title: '1 Bulan', price: 6000, stock: 2 },
    { id: 2, title: '2 Bulan', price: 10000, stock: 1 },
  ])
  assert.match(text, /1\. \*1 Bulan\*/)
  assert.match(text, /2\. \*2 Bulan\*/)
  assert.match(text, /Ketik \*nomor paket\*/)
  assert.match(text, /^✦ \*CHATGPT\*/)
  assert.doesNotMatch(text, /💎|Contoh|QRIS|Vanzshop/)
})
