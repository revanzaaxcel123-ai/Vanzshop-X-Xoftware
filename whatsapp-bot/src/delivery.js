import { warrantyFooter } from './format.js'

// Receipt values are opaque supplier data. Preserve labels and instructions as supplied.
export function receiptMessages(order, fulfillment) {
  const accounts = Array.isArray(fulfillment?.accounts) ? fulfillment.accounts : []
  const expected = Math.max(1, Number(fulfillment?.quantity || order.quantity || 1))
  if (fulfillment?.status !== 'fulfilled' || accounts.length < expected) return []
  const values = accounts.map((account) => {
    const value = account && typeof account === 'object' && 'value' in account ? account.value : account
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim() ? value : ''
    return typeof value === 'object' && Object.keys(value).length ? JSON.stringify(value, null, 2) : ''
  })
  if (values.some((value) => !value)) return []
  const header = `✦ *${order.variantTitle || fulfillment.variant_title || order.productTitle || 'Produk digital'}*\nJumlah: *${expected} item*\n🧾 Nomor pesanan: *${order.reference}*\n\n📦 *Produk kamu*`
  const footer = `${warrantyFooter}\n\nKetik *MENU* untuk belanja lagi.\nHubungi admin jika ada kendala.\n\n_Terima kasih atas kepercayaannya._ 🩷`
  const body = values.map((value, index) => `${values.length > 1 ? `*Produk ${index + 1}*\n` : ''}${value}`).join('\n\n')
  const complete = `${header}\n${body}\n\n${footer}`
  if (complete.length <= 3500) return [complete]
  const messages = [header]
  for (const [index, value] of values.entries()) {
    // Split only for transport; never truncate account credentials or supplier instructions.
    for (let offset = 0; offset < value.length; offset += 3000) {
      messages.push(`📦 *PRODUK ${index + 1}${value.length > 3000 ? ` · BAGIAN ${Math.floor(offset / 3000) + 1}` : ''}*\n${value.slice(offset, offset + 3000)}`)
    }
  }
  messages.push(footer)
  return messages
}

export function paymentLink(baseUrl, id, token) {
  // Fragment keeps the bearer token out of HTTP access logs and referrers.
  return `${baseUrl}/#/bayar/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`
}

export function parsePaymentLink(input, baseUrl) {
  const raw = String(input).match(/https:\/\/[^\s]+/)?.[0]
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.origin !== new URL(baseUrl).origin) return null
    const route = url.hash.startsWith('#/bayar/') ? url.hash.slice(1) : `${url.pathname}${url.search}`
    const match = route.match(/^\/bayar\/(tx_[A-Za-z0-9_-]+)\?(.+)$/)
    if (!match) return null
    const token = new URLSearchParams(match[2]).get('token')
    return token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) && token.length <= 5000 ? { paymentId: match[1], paymentToken: token } : null
  } catch { return null }
}
