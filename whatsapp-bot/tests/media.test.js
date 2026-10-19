import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { BotMedia, landscapeImage } from '../src/media.js'
import { catalogMessages, localDateTime } from '../src/format.js'
import sharp from 'sharp'

const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#ffffff' } }).png().toBuffer()
async function horizontal(buffer) {
  const dimensions = await sharp(buffer).metadata()
  assert.deepEqual([dimensions.width, dimensions.height, dimensions.format], [960, 540, 'jpeg'])
}

test('square logo fits horizontal canvas intact with its original proportions', async () => {
  const logo = await sharp({ create: { width: 60, height: 60, channels: 3, background: '#663399' } }).png().toBuffer()
  const source = await sharp(png).composite([{ input: logo, top: 20, left: 20 }]).png().toBuffer()
  const output = await landscapeImage(source)
  await horizontal(output)
  const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true })
  const at = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]
  const white = rgb => rgb.every(channel => channel > 240)
  assert.ok(white(at(100, 270)), 'side padding matches original white background')
  assert.ok(white(at(480, 60)), 'top border is not cropped')
  const purple = at(480, 270)
  assert.ok(purple[0] > 90 && purple[0] < 120 && purple[1] < 65 && purple[2] > 135)
  assert.ok(!white(at(330, 270)) && !white(at(480, 120)))
  assert.ok(white(at(300, 270)) && white(at(480, 90)), 'square remains square, not stretched')
})

test('banner reloads after replacement; absent file does not block catalog', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vanz-banner-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'banner.png')
  const media = new BotMedia({ baseUrl: 'https://store.test', bannerFile: file })
  assert.equal(await media.banner(), null)
  await fs.writeFile(file, png)
  assert.deepEqual(await media.banner(), png)
  await fs.writeFile(file, 'not a picture')
  assert.equal(await media.banner(), null)
})

test('webstore upload and relative product image work; bad website image falls back to Xoftware; cache works', async () => {
  const urls = []
  const media = new BotMedia({ baseUrl: 'https://store.test', async fetchImage(url) {
    urls.push(url.href)
    return url.pathname === '/missing.png' ? new Response('', { status: 404 }) : new Response(png, { headers: { 'content-type': 'image/png' } })
  } })
  await horizontal(await media.product({ thumbnail: `data:image/png;base64,${png.toString('base64')}` }))
  assert.equal(urls.length, 0)
  const first = await media.product({ thumbnail: '/pictures/gpt.png' })
  await horizontal(first)
  assert.equal(urls[0], 'https://store.test/pictures/gpt.png')
  assert.equal(await media.product({ thumbnail: '/pictures/gpt.png' }), first)
  assert.equal(urls.length, 1)
  await horizontal(await media.product({ thumbnail: '/missing.png', provider_thumbnail: 'https://xoftware.test/gpt.png' }))
  assert.equal(urls.at(-1), 'https://xoftware.test/gpt.png')
})

test('HTML, SVG, oversized and missing images return text fallback without throwing', async () => {
  const media = new BotMedia({ baseUrl: 'https://store.test', async fetchImage(url) {
    if (url.pathname === '/huge') return new Response('small', { headers: { 'content-length': String(6 * 1024 * 1024) } })
    return new Response('<svg>This is not a raster image</svg>')
  } })
  assert.equal(await media.product({ thumbnail: '/svg' }), null)
  assert.equal(await media.product({ thumbnail: '/huge' }), null)
  assert.equal(await media.product({}), null)
  assert.equal(await media.product({ thumbnail: 'file:///private/data' }), null)
})

test('WIB date uses Jakarta, and all catalog numbers survive automatic message splitting', () => {
  const date = new Date('2026-10-04T17:54:00Z')
  assert.match(localDateTime(date), /Senin.*5 Oktober 2026.*00\.54 WIB/)
  const products = Array.from({ length: 70 }, (_, index) => ({ title: `PRODUK ${index + 1}` }))
  const messages = catalogMessages({ products, date, maxLength: 900 })
  assert.ok(messages.length > 1)
  const combined = messages.join('\n')
  for (const [i] of products.entries()) assert.ok(combined.includes(`${i + 1}. *Produk ${i + 1}*`))
  assert.match(combined, /Telegram:\* @VanzShopBot/)
  assert.doesNotMatch(combined, /Balas|Terpercaya|NEXT/)
})
