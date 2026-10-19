export class VanzShopApi {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '')
  }

  async request(action, { method = 'GET', body, query } = {}) {
    const url = new URL('/api/xo', this.baseUrl)
    url.searchParams.set('a', action)
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    })
    const response = await fetch(url, {
      method,
      headers: { accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    const raw = await response.text()
    let payload
    try { payload = raw ? JSON.parse(raw) : {} } catch { throw new Error(`VanzShop mengirim respons non-JSON (${response.status}).`) }
    if (!response.ok || payload?.ok === false) throw new Error(String(payload?.error || payload?.message || `VanzShop API gagal (${response.status}).`))
    return payload?.data ?? payload
  }

  init() {
    return this.request('init')
  }

  createPayment({ productId, variationId, code, quantity = 1, buyer }) {
    return this.request('payment_create', {
      method: 'POST',
      body: {
        product_id: productId,
        variation_id: variationId ?? null,
        code,
        quantity,
        method: 'QRIS',
        buyer,
      },
    })
  }

  paymentStatus({ id, reference, paymentToken }) {
    return this.request('payment_status', {
      method: 'POST',
      body: { id, reference, payment_token: paymentToken },
    })
  }

  orderLookup(reference) {
    return this.request('order_lookup', { query: { reference } })
  }

  fulfillmentStatus(paymentToken, paymentId) {
    return this.request('fulfillment_status', { method: 'POST', body: { payment_token: paymentToken, id: paymentId } })
  }
}
