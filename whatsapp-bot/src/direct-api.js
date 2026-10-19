import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { VanzShopApi } from './vanzshop-api.js'

export function missingDirectSettings(env = process.env) {
  const missing = ['XSOFTWARE_API_KEY', 'SEWAPAY_API_KEY', 'SEWAPAY_SECRET_KEY'].filter((key) => !env[key]?.trim())
  if (!(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || env.REDIS_REST_URL)?.trim()) missing.push('UPSTASH_REDIS_REST_URL')
  if (!(env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || env.REDIS_REST_TOKEN)?.trim()) missing.push('UPSTASH_REDIS_REST_TOKEN')
  if (env.WA_SHARED_STORE_CONFIRMED !== 'true') missing.push('WA_SHARED_STORE_CONFIRMED=true (Redis, prefix, dan secret harus sama dengan website)')
  return missing
}

export function loadDirectHandler() {
  const require = createRequire(import.meta.url)
  // Repository development and standalone Pterodactyl ZIP use exactly the same backend source.
  for (const relative of ['../../api/xo.js', '../backend/api/xo.js']) {
    const file = fileURLToPath(new URL(relative, import.meta.url))
    if (existsSync(file)) return require(file)
  }
  throw new Error('Backend direct belum tersedia. Jalankan npm run build:backend dari folder bot dalam repo, lalu gunakan paket lengkap.')
}

export class DirectVanzShopApi extends VanzShopApi {
  constructor(baseUrl, handler = loadDirectHandler()) {
    super(baseUrl)
    this.handler = handler
  }

  async request(action, { method = 'GET', body, query } = {}) {
    if (!['init', 'payment_create', 'payment_status', 'order_lookup', 'fulfillment_status'].includes(action)) throw new Error('Aksi direct bot tidak diizinkan.')
    let status = 200
    let payload
    await this.handler({ method, body, query: { ...query, a: action }, headers: {} }, {
      status(code) { status = code; return this },
      setHeader() {},
      end(raw) { payload = JSON.parse(raw) },
    })
    if (status >= 400 || payload?.ok !== true) throw new Error(payload?.error || `Backend direct gagal (${status}).`)
    return payload.data
  }
}

export async function createBotApi(config) {
  if (config.backendMode === 'website') return new VanzShopApi(config.baseUrl)
  if (config.backendMode !== 'direct') throw new Error('WA_BACKEND_MODE harus website atau direct.')
  const missing = missingDirectSettings()
  if (missing.length) throw new Error(`Mode direct belum siap: ${missing.join(', ')}. Isi di .env bot menggunakan konfigurasi yang sama dengan Vercel.`)
  return new DirectVanzShopApi(config.baseUrl)
}
