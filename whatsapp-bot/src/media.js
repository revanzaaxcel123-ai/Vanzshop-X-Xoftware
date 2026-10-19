import fs from 'node:fs/promises'
import sharp from 'sharp'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function validImage(buffer) {
  if (!buffer?.length || buffer.length > MAX_IMAGE_BYTES) return false
  return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) ||
    (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
}

export function imageCandidates(product) {
  const values = [product?.thumbnail, product?.image, product?.image_url, product?.imageUrl,
    product?.product_image, product?.productImage, product?.photo, product?.picture,
    product?.cover, product?.banner, product?.logo, product?.images?.[0],
    Array.isArray(product?.media) ? product.media[0] : product?.media, product?.provider_thumbnail]
  return [...new Set(values.map(value => typeof value === 'string' ? value : value?.url || value?.src).filter(Boolean))]
}

export async function landscapeImage(buffer) {
  // Contain instead of crop/stretch: every logo remains intact on a 16:9 canvas.
  const options = { limitInputPixels: 25_000_000, animated: false }
  const { dominant } = await sharp(buffer, options).rotate().resize(64, 64, { fit: 'inside' }).stats()
  const background = { r: dominant.r, g: dominant.g, b: dominant.b, alpha: 1 }
  return sharp(buffer, options).rotate().resize(960, 540, { fit: 'contain', background }).flatten({ background }).jpeg({ quality: 86 }).toBuffer()
}

export class BotMedia {
  constructor({ baseUrl, bannerFile, fetchImage = fetch }) {
    this.baseUrl = baseUrl
    this.bannerFile = bannerFile
    this.fetchImage = fetchImage
    this.cache = new Map()
  }

  async banner() {
    if (!this.bannerFile) return null
    try {
      const stat = await fs.stat(this.bannerFile)
      if (stat.size > MAX_IMAGE_BYTES) return null
      const buffer = await fs.readFile(this.bannerFile)
      return validImage(buffer) ? buffer : null
    } catch { return null }
  }

  async load(raw) {
    const saved = this.cache.get(raw)
    if (saved && saved.expires > Date.now()) return saved.buffer
    let buffer
    if (/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(raw)) {
      if (raw.length > MAX_IMAGE_BYTES * 1.4) return null
      buffer = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64')
    } else {
      const url = new URL(raw, this.baseUrl)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
      const response = await this.fetchImage(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok || Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) return null
      // Stream with a byte limit instead of buffering an unbounded supplier response.
      const parts = []; let size = 0
      for await (const chunk of response.body) {
        size += chunk.length
        if (size > MAX_IMAGE_BYTES) return null
        parts.push(Buffer.from(chunk))
      }
      buffer = Buffer.concat(parts)
    }
    if (!validImage(buffer)) return null
    this.cache.delete(raw)
    while (this.cache.size >= 12) this.cache.delete(this.cache.keys().next().value)
    this.cache.set(raw, { buffer, expires: Date.now() + 300_000 })
    return buffer
  }

  async product(product) {
    for (const candidate of imageCandidates(product)) {
      try {
        const buffer = await this.load(candidate)
        if (!buffer) continue
        const cached = this.cache.get(candidate)
        if (cached?.landscape) return cached.landscape
        const landscape = await landscapeImage(buffer)
        if (cached) cached.landscape = landscape
        return landscape
      } catch { /* Try provider image, then send text. */ }
    }
    return null
  }
}
