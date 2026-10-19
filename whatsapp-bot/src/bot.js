import { activeProducts, catalogMessages, groupDeliveredMessage,
  paymentMessage, quantityMessage, selectionPrice, selectionStock, variationMessage, variantsOf, warrantyFooter } from './format.js'
import { incomingText, messageBuyer, quotedText } from './message-utils.js'
import { BotMedia } from './media.js'
import QRCode from 'qrcode'
import { paymentLink, parsePaymentLink, receiptMessages } from './delivery.js'

export class VanzShopBot {
  constructor({ api, config, stateStore, logger = console, media }) {
    this.api = api
    this.config = config
    this.stateStore = stateStore
    this.logger = logger
    this.media = media || new BotMedia(config)
    this.socket = null
    this.sessions = new Map()
    this.seenMessages = new Map()
    this.identityKeys = new Map()
    this.messageJobs = new Map()
    this.catalogCache = null
    this.polling = false
    this.orderJobs = new Map()
  }

  attach(socket) { this.socket = socket }

  sendText(jid, text, mentions = []) {
    return this.socket.sendMessage(jid, { text, linkPreview: null, ...(mentions.length ? { mentions } : {}) })
  }

  session(key) {
    const current = this.sessions.get(key)
    if (!current || Date.now() - current.updatedAt > (this.config.sessionTtlMs || 1_800_000)) {
      this.sessions.delete(key)
      return null
    }
    return current
  }

  setSession(key, value) { this.sessions.set(key, { ...value, updatedAt: Date.now() }) }

  rememberMessage(id) {
    if (!id || this.seenMessages.has(id)) return false
    const now = Date.now()
    this.seenMessages.set(id, now)
    if (this.seenMessages.size > 2000) {
      for (const [key, timestamp] of this.seenMessages) if (now - timestamp > 3_600_000) this.seenMessages.delete(key)
    }
    return true
  }

  async catalog(force = false) {
    if (!force && this.catalogCache && Date.now() - this.catalogCache.time < (this.config.catalogCacheMs || 10_000)) return this.catalogCache
    const response = await this.api.init()
    const products = activeProducts(response?.products)
    if (!products.length) throw new Error('Katalog sedang kosong. Coba ketik MENU beberapa saat lagi.')
    this.catalogCache = { time: Date.now(), products, store: response?.store || {} }
    return this.catalogCache
  }

  async sendChoice(context, body, image = null) {
    const text = body
    const mentions = []
    if (image) {
      try {
        await this.socket.sendMessage(context.chatJid, { image, caption: text.length <= 1000 ? text : body.split('\n')[0], mentions })
        if (text.length <= 1000) return
      } catch { this.logger.warn?.('Gambar produk/banner gagal dikirim; pilihan dikirim sebagai teks.') }
    }
    const lines = text.split('\n'); let chunk = ''
    for (const line of lines) {
      if (chunk && chunk.length + line.length + 1 > 3500) { await this.sendText(context.chatJid, chunk, mentions); chunk = '' }
      chunk += `${chunk ? '\n' : ''}${line}`
    }
    if (chunk) await this.sendText(context.chatJid, chunk, mentions)
  }

  async sendCatalog(context, name) {
    const catalog = await this.catalog()
    this.setSession(context.sessionKey, { step: 'product', products: catalog.products, name, context })
    const messages = catalogMessages({ products: catalog.products, timezone: this.config.timezone, maxLength: context.groupJid ? 900 : 1000 })
    const banner = await this.media.banner()
    for (const [index, text] of messages.entries()) await this.sendChoice(context, text, index === 0 ? banner : null)
  }

  async sendVariants(context, product, session) {
    const variants = variantsOf(product).filter(variant => Number(variant?.price || 0) > 0)
    if (!variants.length) return this.askQuantity(context, product, null, session)
    this.setSession(context.sessionKey, { ...session, context, step: 'variant', product, variants })
    await this.sendChoice(context, variationMessage(product, variants), await this.media.product(product))
  }

  async askQuantity(context, product, variant, session) {
    const price = selectionPrice(product, variant), stock = selectionStock(product, variant)
    if (!(price > 0)) return this.sendChoice(context, 'Harga paket belum tersedia. Ketik *MENU* untuk memilih produk lain.')
    const minimum = Math.max(1, Math.ceil(1000 / price))
    if (stock !== null && stock <= 0) return this.sendChoice(context, 'Stok paket ini sudah habis, Kak.\nKetik *KEMBALI* untuk memilih paket lain.')
    if (minimum > 20 || (stock !== null && stock < minimum)) return this.sendChoice(context, 'Paket ini belum bisa dibayar karena minimum pembayaran *Rp 1.000* dan stok tidak mencukupi jumlah minimum.\nKetik *KEMBALI* untuk memilih paket lain.')
    this.setSession(context.sessionKey, { ...session, context, step: 'quantity', product, variant })
    await this.sendChoice(context, quantityMessage(product, variant), variant ? null : await this.media.product(product))
  }

  async selectQuantity(context, input, session) {
    const quantity = Number(input), price = selectionPrice(session.product, session.variant)
    const stock = selectionStock(session.product, session.variant)
    const minimum = Math.max(1, Math.ceil(1000 / price))
    if (!/^\d+$/.test(input) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) return this.sendChoice(context, 'Ketik *jumlah yang ingin dibeli* dari 1 sampai 20.\n_Contoh: ketik 2 untuk membeli 2 item._')
    if (quantity < minimum) return this.sendChoice(context, `Minimum pembayaran *Rp 1.000*.\nKetik jumlah minimal *${minimum}* untuk paket ini.`)
    if (stock !== null && quantity > stock) return this.sendChoice(context, `Stok yang tersedia hanya *${stock}*.\nKetik jumlah sesuai stok, atau ketik *KEMBALI* untuk memilih paket lain.`)
    await this.createPayment(context, { ...session, quantity })
  }

  async createPayment(context, session) {
    this.setSession(context.sessionKey, { ...session, context, step: 'creating-payment' })
    let persisted = false
    try {
      const catalog = await this.catalog(true)
      const product = catalog.products.find(item => session.product.id != null ? String(item.id) === String(session.product.id) : item.code === session.product.code)
      const variant = session.variant ? variantsOf(product).find(item => session.variant.id != null ? String(item.id) === String(session.variant.id) : item.code === session.variant.code) : null
      if (!product || (session.variant && !variant)) throw new Error('Paket ini sudah tidak tersedia. Ketik MENU untuk memilih produk lain.')
      const price = selectionPrice(product, variant), stock = selectionStock(product, variant)
      if (!(price > 0) || price * session.quantity < 1000) throw new Error('Harga terbaru belum memenuhi minimum pembayaran Rp 1.000. Pilih jumlah yang lebih besar.')
      if (stock !== null && stock < session.quantity) throw new Error(`Stok terbaru hanya ${stock}. Pilih jumlah sesuai stok.`)
      if (context.groupJid) {
        try {
          await this.sendText(context.buyerJid, '🛍️ *PESANAN VANZSHOP*\n\nKamu sedang memesan melalui grup.\n_Detail produk akan dikirim ke chat ini setelah pembayaran berhasil._')
        } catch {
          this.setSession(context.sessionKey, { ...session, context, step: 'quantity' })
          return this.sendChoice(context, 'Chat pribadi belum bisa dikirim, Kak.\nKetik *START* di chat pribadi bot sekali, lalu ketik *jumlah pembelian* lagi di grup ini.\n_Pembayaran belum dibuat._')
        }
      }
      await this.sendChoice(context, '⏳ _Sedang menyiapkan QRIS. Tunggu sebentar, ya._')
      const response = await this.api.createPayment({ productId: product.id, variationId: variant?.id ?? null,
        code: String(variant?.code || product.code || ''), quantity: session.quantity,
        buyer: { name: session.name || 'Pembeli WhatsApp', whatsapp: context.phone, email: '' } })
      const payment = response?.payment || {}
      const paymentId = String(payment.id || ''), paymentToken = String(response?.payment_token || '')
      if (!paymentId || !paymentToken) throw new Error('Tagihan belum dapat dibaca. Hubungi admin sebelum mencoba pembayaran baru.')
      const order = {
        jid: context.buyerJid, buyerAliases: context.buyerAliases, groupJid: context.groupJid,
        chatJid: context.chatJid, mentionJid: context.mentionJid, paymentId, paymentToken,
        reference: String(payment.reference || ''), paymentUrl: paymentLink(this.config.baseUrl, paymentId, paymentToken),
        productTitle: String(response?.order?.product_title || product.title || 'Produk digital'),
        variantTitle: String(response?.order?.variant_title || variant?.title || variant?.name || product.title),
        total: Number(payment.total_payment ?? payment.amount ?? price * session.quantity),
        subtotal: Number(response?.order?.unit_price || price) * session.quantity,
        quantity: session.quantity, expiresAt: payment.expires_at, createdAt: new Date().toISOString(), lastStatus: 'pending',
      }
      persisted = true
      this.sessions.delete(context.sessionKey)
      await this.stateStore.put(order)
      const body = paymentMessage({ ...order, isGroup: Boolean(context.groupJid) })
      await this.sendQr(order, payment?.payment_data?.qr_string, body)
    } catch (error) {
      this.logger.error?.({ message: error?.message }, 'Gagal menyiapkan pembayaran WhatsApp')
      if (persisted) return this.sendChoice(context, 'Tagihan sudah tersimpan tetapi QRIS belum terkirim.\nKetik *CEK* untuk memuatnya.\n_Jangan membuat pembayaran baru._')
      this.setSession(context.sessionKey, { ...session, context, step: 'quantity' })
      await this.sendChoice(context, `Pembayaran belum dapat dibuat: ${error?.message || 'Coba beberapa saat lagi.'}\n\nKetik *jumlah pembelian* lagi, atau *MENU* untuk memilih produk lain.`)
    }
  }

  async sendQr(order, qrString, body) {
    const target = order.chatJid || order.groupJid || order.jid
    const text = body
    if (qrString) {
      try {
        const image = await QRCode.toBuffer(String(qrString), { type: 'png', width: 512, margin: 4, errorCorrectionLevel: 'M' })
        await this.socket.sendMessage(target, { image, caption: text })
        return
      } catch { this.logger.warn?.('QRIS gagal dikirim; tagihan tetap disimpan untuk dicoba ulang.') }
    }
    await this.sendText(target, `${text}\n\nQRIS belum terkirim. Ketik *CEK ${order.reference}* untuk memuatnya lagi.`)
  }

  async selectProduct(context, index, session) {
    const product = session.products[index - 1]
    if (!product) return this.sendChoice(context, `Nomor itu belum ada, Kak.\nKetik angka *1–${session.products.length}* untuk memilih produk.`)
    const latest = await this.catalog(true)
    const updated = latest.products.find(item => product.id != null ? String(item.id) === String(product.id) : item.code === product.code)
    if (!updated) return this.sendChoice(context, 'Produk ini sudah tidak tersedia. Ketik *MENU* untuk melihat produk terbaru.')
    await this.sendVariants(context, updated, session)
  }

  async selectVariant(context, selector, session) {
    const variant = /^variant:/i.test(selector)
      ? session.variants.find(item => String(item.id ?? item.code) === selector.slice(selector.indexOf(':') + 1))
      : session.variants[Number(selector) - 1]
    if (!variant) return this.sendChoice(context, `Nomor itu belum ada, Kak.\nKetik angka *1–${session.variants.length}* untuk memilih paket.`)
    await this.askQuantity(context, session.product, variant, session)
  }

  ownedOrder(context, reference) {
    return reference ? this.stateStore.findFor(context.buyerJid, reference, context.buyerAliases)
      : this.stateStore.latestFor(context.buyerJid, context.buyerAliases, context.groupJid)
  }

  async trackOrder(context, input) {
    const reference = String(input).toUpperCase().match(/VZ-[A-Z0-9-]{8,190}/)?.[0]
    try {
      const owned = this.ownedOrder(context, reference)
      if (owned) {
        if (owned.completedAt) return this.sendChoice(context, `Pesanan *${owned.reference}* sudah selesai.\nKetik *HASIL ${owned.reference}* untuk menerima detail produk${context.groupJid ? ' di chat pribadi' : ' lagi'}.`)
        return await this.processOrder(owned, true)
      }
      if (!reference) return this.sendChoice(context, 'Belum ada pesananmu yang tersimpan.\nKetik *CEK* diikuti nomor pesanan, contoh: *CEK VZ-XXXX-XXXX*.')
      const order = await this.api.orderLookup(reference)
      const labels = { success: 'Berhasil', completed: 'Berhasil', pending: 'Menunggu pembayaran', fail: 'Gagal', failed: 'Gagal', cancelled: 'Dibatalkan', expired: 'Batas waktu habis', fulfilled: 'Produk sudah siap', processing: 'Sedang disiapkan', retryable_error: 'Pengiriman sedang dicoba ulang' }
      await this.sendChoice(context, `🧾 *STATUS PESANAN*\n\nProduk: ${order.product_title || 'Produk digital'}\nPaket: ${order.variant_title || 'Paket utama'}\nPembayaran: ${labels[String(order.payment_status).toLowerCase()] || 'Belum diketahui'}\nPengiriman: ${labels[String(order.fulfillment_status).toLowerCase()] || 'Sedang diproses'}\nNomor pesanan: *${reference}*`)
    } catch {
      await this.sendChoice(context, 'Pesanan belum dapat diperiksa. Pastikan nomor pesanan benar, lalu ketik *CEK* lagi beberapa saat kemudian.')
    }
  }

  async sendResult(jid, input, actor = null) {
    const context = actor || { chatJid: jid, buyerJid: jid, buyerAliases: [], groupJid: '' }
    const link = !context.groupJid && parsePaymentLink(input, this.config.baseUrl)
    const reference = String(input).toUpperCase().match(/VZ-[A-Z0-9-]{8,190}/)?.[0]
    const owned = link && !reference ? null : this.ownedOrder(context, reference)
    try {
      if (owned?.completedAt && owned.deliveryMessages?.length) {
        for (const text of owned.deliveryMessages) await this.sendText(owned.jid, text)
        if (context.groupJid) await this.sendChoice(context, '💌 Detail produkmu dikirim ulang ke *chat pribadi*. Silakan cek pesan dari bot.')
        return
      }
      if (owned) return await this.processOrder(owned, true)
      if (link) {
        const data = await this.api.fulfillmentStatus(link.paymentToken, link.paymentId)
        if (data.payment_id && data.payment_id !== link.paymentId) throw new Error('Payment ID tidak cocok.')
        const receipt = data?.fulfillment
        if (receipt?.status !== 'fulfilled') return this.sendText(jid, 'Detail belum tersedia. Ketik *CEK* diikuti nomor pesanan untuk melihat status.')
        const order = { ...link, jid: context.buyerJid, buyerAliases: context.buyerAliases, reference: data.reference || receipt.reference,
          productTitle: receipt.product_title, variantTitle: receipt.variant_title, quantity: receipt.quantity }
        const previous = this.stateStore.findFor(context.buyerJid, order.reference, context.buyerAliases)
        if (previous) return this.sendResult(jid, `HASIL ${order.reference}`, context)
        const messages = receiptMessages(order, receipt)
        if (!messages.length) throw new Error('Data pengiriman belum lengkap.')
        await this.stateStore.put({ ...order, deliveryMessages: messages, deliveredParts: 0 })
        return await this.processOrder(this.stateStore.findFor(context.buyerJid, order.reference, context.buyerAliases), true)
      }
      await this.sendChoice(context, context.groupJid ? 'Detail produk hanya dikirim ke pemilik pesanan melalui *chat pribadi*.\nKetik *HASIL* diikuti nomor pesananmu.'
        : 'Detail hanya bisa dibuka oleh pembeli. Untuk pesanan lama, ketik *HASIL* diikuti link pembayaran lengkap dari pesan bot sebelumnya. Nomor pesanan saja hanya menampilkan status jika riwayat pembelian tidak ada di bot ini.')
    } catch {
      await this.sendChoice(context, `Hasil belum bisa dikirim. Ketik *HASIL ${reference || 'nomor-pesananmu'}* untuk mencoba lagi.\n_Jangan membuat pembayaran baru untuk pesanan yang sudah dibayar._\n\n${warrantyFooter}`)
    }
  }

  async processOrder(order, interactive = false) {
    if (this.orderJobs.has(order.paymentId)) return this.orderJobs.get(order.paymentId)
    const work = this.updateOrder(order, interactive)
    this.orderJobs.set(order.paymentId, work)
    try { return await work } finally { this.orderJobs.delete(order.paymentId) }
  }

  async updateOrder(order, interactive) {
    order = this.stateStore.findFor(order.jid, order.reference, order.buyerAliases) || order
    if (order.completedAt) return
    const target = order.chatJid || order.groupJid || order.jid
    const mentions = order.groupJid ? [order.mentionJid || order.jid] : []
    if (!order.deliveryMessages?.length) {
      const response = await this.api.paymentStatus({ id: order.paymentId, reference: order.reference, paymentToken: order.paymentToken })
      const status = String(response?.status || '').toLowerCase()
      if (status === 'success') {
        const messages = receiptMessages(order, response.fulfillment)
        order = { ...order, lastStatus: messages.length ? 'success' : 'paid-processing', ...(messages.length ? { deliveryMessages: messages, deliveredParts: 0 } : {}) }
        await this.stateStore.put(order)
      } else if (['fail', 'cancelled', 'expired'].includes(status)) {
        await this.sendText(target, `Pembayaran *${order.reference}* dibatalkan atau sudah melewati batas waktu.\nKetik *MENU* untuk memilih produk lagi.`, mentions)
        await this.stateStore.remove(order.paymentId)
        return
      } else {
        if (interactive) await this.sendQr(order, response?.payment?.payment_data?.qr_string,
          `Pembayaran *${order.reference}* belum terkonfirmasi.\n_Jika sudah membayar, tunggu sebentar dan jangan bayar ulang._`)
        return
      }
    }
    if (!order.deliveryMessages?.length) {
      if (!order.processingNotified || interactive) {
        await this.sendText(target, `💌 Pembayaran sudah diterima. Produk masih disiapkan, ya.\n_Kamu tidak perlu membayar lagi._`, mentions)
        order = { ...order, processingNotified: true }
        await this.stateStore.put(order)
      }
      return
    }
    if (order.jid.endsWith('@g.us')) throw new Error('Pengiriman detail ditolak: tujuan harus chat pribadi.')
    for (let part = Number(order.deliveredParts || 0); part < order.deliveryMessages.length; part++) {
      await this.sendText(order.jid, order.deliveryMessages[part])
      order = { ...order, deliveredParts: part + 1 }
      await this.stateStore.put(order)
    }
    if (order.groupJid && !order.groupDeliveredNotified) {
      // Private parts are persisted first, so group retries never resend credentials.
      await this.sendText(order.groupJid, groupDeliveredMessage(order), mentions)
      order = { ...order, groupDeliveredNotified: true }
      await this.stateStore.put(order)
    }
    await this.stateStore.complete(order)
    this.catalogCache = null
  }

  async handle(message) {
    const chatJid = message?.key?.remoteJid
    if (!chatJid || chatJid === 'status@broadcast' || message?.key?.fromMe || chatJid.endsWith('@newsletter')) return
    if (chatJid.endsWith('@g.us') && this.config.groupsEnabled === false) return
    const input = incomingText(message)
    if (!input) return
    const context = await messageBuyer(message, this.socket)
    if (!context || !message?.key?.id || !this.rememberMessage(`${chatJid}|${context.buyerJid}|${message.key.id}`)) return
    const identity = context.buyerAliases.map(id => this.identityKeys.get(id)).find(Boolean) || context.buyerJid
    for (const alias of context.buyerAliases) this.identityKeys.set(alias, identity)
    context.sessionKey = `${chatJid}|${identity}`
    const previous = this.messageJobs.get(context.sessionKey) || Promise.resolve()
    const work = previous.catch(() => {}).then(() => this.handleInput(message, input, context))
    this.messageJobs.set(context.sessionKey, work)
    try { await work } finally { if (this.messageJobs.get(context.sessionKey) === work) this.messageJobs.delete(context.sessionKey) }
  }

  async handleInput(message, input, context) {
    const normalized = input.trim(), upper = normalized.toUpperCase().replace(/^#/, '')
    const name = String(message?.pushName || 'Kak').trim().slice(0, 60) || 'Kak'
    if (/^HASIL(?:\s|$)/.test(upper)) return this.sendResult(context.chatJid, normalized.replace(/^#?HASIL\s*/i, '') || quotedText(message), context)
    if (/^CEK(?:\s|$)/.test(upper)) return this.trackOrder(context, normalized)
    if (['MENU', 'MULAI', 'START'].includes(upper) || (!context.groupJid && ['HALO', 'HAI'].includes(upper))) return this.sendCatalog(context, name)
    if (/^BANTUAN(?:\s|$)/.test(upper)) return this.sendChoice(context, `${warrantyFooter}\n\nButuh bantuan admin?\n${this.config.supportUrl || 'https://wa.me/62895415204928'}`)
    const session = this.session(context.sessionKey)
    if (!session) {
      if (!context.groupJid) await this.sendCatalog(context, name)
      return
    }
    if (upper === 'KEMBALI') {
      if (session.step === 'quantity') return this.sendVariants(context, session.product, session)
      return this.sendCatalog(context, name)
    }
    if (session.step === 'product' && /^\d+$/.test(normalized)) return this.selectProduct(context, Number(normalized), session)
    if (session.step === 'variant' && (/^\d+$/.test(normalized) || /^variant:/i.test(normalized))) return this.selectVariant(context, normalized, session)
    if (session.step === 'quantity' && (!context.groupJid || /^\d+$/.test(normalized))) return this.selectQuantity(context, normalized, session)
    if (!context.groupJid) {
      const instruction = { product: 'Ketik *nomor produk*, contoh: *1*.', variant: 'Ketik *nomor paket*, contoh: *1*.', quantity: 'Ketik *jumlah pembelian* (1–20).' }
      await this.sendChoice(context, instruction[session.step] || 'QRIS sedang dibuat. Tunggu sebentar, ya.')
    }
  }

  async pollPendingPayments() {
    if (this.polling || !this.socket) return
    this.polling = true
    try {
      for (const order of this.stateStore.list()) {
        try { await this.processOrder(order) }
        catch { this.logger.warn?.({ paymentId: order.paymentId }, 'Status/pengiriman belum selesai; pesanan disimpan untuk dicoba ulang.') }
      }
    } finally { this.polling = false }
  }
}
