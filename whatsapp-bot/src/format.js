const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function money(value) {
  return rupiah.format(Number(value) || 0).replace(/\s/g, ' ')
}

export function greeting(date = new Date(), timezone = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export function productPrice(product) {
  const direct = Number(product?.price || product?.display_price || product?.storefront_price || 0)
  if (direct > 0) return direct
  const prices = variantsOf(product).map((item) => Number(item?.price || 0)).filter((value) => value > 0)
  return prices.length ? Math.min(...prices) : 0
}

export function productStock(product) {
  const raw = product?.stock ?? product?.stock_count ?? product?.storefront_stock
  if (raw !== undefined && raw !== null && raw !== '') return Math.max(0, Number(raw) || 0)
  const variants = variantsOf(product)
  if (!variants.length) return null
  const known = variants.map((item) => item?.stock ?? item?.stock_count).filter((value) => value !== undefined && value !== null && value !== '')
  return known.length ? known.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) : null
}

export function variantsOf(product) {
  const variants = product?.variations || product?.storefront_variations
  return Array.isArray(variants) ? variants : []
}

export function activeProducts(products) {
  return (Array.isArray(products) ? products : [])
    .filter((product) => product && productPrice(product) > 0)
    .map((product) => ({ ...product, _price: productPrice(product), _stock: productStock(product) }))
    // Sort the actual selection list, not just its caption, so numbers keep the right IDs.
    .sort((a, b) => productName(a).localeCompare(productName(b), 'id-ID', { sensitivity: 'base', numeric: true }))
}

function productName(product) {
  return String(product.title || product.name || product.code || 'Produk digital').trim()
}

export function displayProductName(product) {
  // Display only: never change provider titles, SKU, IDs, prices or account data.
  return productName(product).toLocaleLowerCase('id-ID').replace(/\p{L}[\p{L}\p{M}\p{N}]*/gu, word => word[0].toLocaleUpperCase('id-ID') + word.slice(1))
}

function productLine(product, index) {
  return `${index + 1}. *${displayProductName(product)}*`
}

export const storeFooter = '_Order juga tersedia di_\n🖥️ *Webstore:* Vanzshop.com\n💬 *Telegram:* @VanzShopBot\n\n_Terima kasih atas kepercayaannya._ 🩷'
export const warrantyFooter = '📋 _Ketentuan & garansi ada di website_\n*Vanzshop.com*'

export function localDateTime(date = new Date(), timezone = 'Asia/Jakarta') {
  const day = new Intl.DateTimeFormat('id-ID', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
  const zone = timezone === 'Asia/Jakarta' ? 'WIB' : timezone
  return `${day} • ${time} ${zone}`
}

export function catalogMessages({ products, timezone = 'Asia/Jakarta', date = new Date(), maxLength = 1000 }) {
  const header = `✦ *Vanzshop.com*\n_Pusat Aplikasi Premium Termurah Seantero Raya_\n\n🕒 _${localDateTime(date, timezone)}_\n\nKetik *angka* untuk memilih 🛍️\n\n`
  const footer = `\n\n${storeFooter}`
  const chunks = []
  let current = header
  products.forEach((product, index) => {
    const line = `${productLine(product, index)}\n`
    if (current.length + line.length + footer.length > maxLength && current !== header) {
      chunks.push(current.trim())
      current = `*LANJUTAN DAFTAR PRODUK*\n${line}`
    } else {
      current += line
    }
  })
  current += footer
  chunks.push(current.trim())
  return chunks
}

export function variationMessage(product, variants) {
  const title = String(product?.title || product?.name || 'Produk digital').trim()
  const rows = variants.map((variant, index) => {
    const stockRaw = variant?.stock ?? variant?.stock_count
    const stock = stockRaw === undefined || stockRaw === null ? '_Stok diperiksa sebelum pembayaran._' : Number(stockRaw) > 0 ? `Stok: *${Number(stockRaw)}*` : '*Stok habis*'
    return `${index + 1}. *${String(variant?.title || variant?.name || `Paket ${index + 1}`).trim()}*\n   Harga: ${money(variant?.price)}\n   ${stock}`
  })
  return `✦ *${title.toUpperCase()}*\n\n${rows.join('\n\n')}\n\nKetik *nomor paket* untuk memilih.\nKetik *MENU* untuk melihat produk lain.`
}

export function selectionPrice(product, variant) {
  return variant ? Number(variant.price || 0) : productPrice(product)
}

export function selectionStock(product, variant) {
  const raw = variant ? variant.stock ?? variant.stock_count : productStock(product)
  return raw === null || raw === undefined || raw === '' ? null : Math.max(0, Number(raw) || 0)
}

export function quantityMessage(product, variant) {
  const price = selectionPrice(product, variant), stock = selectionStock(product, variant)
  const minimum = Math.max(1, Math.ceil(1000 / price))
  return `✦ *${variant?.title || variant?.name || product.title}*\n${money(price)} / item${stock === null ? '' : ` • Stok: *${stock}*`}\n\nMau beli berapa? 🛍️\nKetik *jumlah pembelian* (1–20).${minimum > 1 ? `\n\n_Minimum pembelian paket ini: ${minimum} item._` : ''}\n\nKetik *KEMBALI* untuk memilih paket lain.`
}

export function paymentMessage({ productTitle, variantTitle, quantity, subtotal, total, expiresAt, isGroup = false }) {
  const date = new Date(expiresAt)
  const time = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) : ''
  const day = time ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(date) : ''
  const costs = Number.isFinite(subtotal) && total >= subtotal ? `Harga: ${money(subtotal)}\nBiaya pembayaran: ${money(total - subtotal)}\n` : ''
  return `✦ *${variantTitle || productTitle || 'Produk digital'}*\nJumlah: *${quantity} item*\n\n${costs}*Total bayar: ${money(total)}*${time ? `\n\n🕒 _Bayar sebelum ${time} WIB, ${day}_` : ''}\n\n_Detail produk dikirim ke ${isGroup ? 'chat pribadi' : 'chat ini'}\nsetelah pembayaran berhasil_ 💌`
}

export function groupDeliveredMessage(order) {
  return `🎉 *YEAY, PEMBAYARAN BERHASIL!*\n\n@${(order.mentionJid || order.jid).split('@')[0]}, cek *chat pribadi dari bot*, ya!\nDetail produkmu sudah dikirim ke sana 💌\n\n${warrantyFooter}\n\n_Terima kasih atas kepercayaannya._`
}
