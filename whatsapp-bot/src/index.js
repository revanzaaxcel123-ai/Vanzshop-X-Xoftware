import fs from 'node:fs/promises'
import process from 'node:process'
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState } from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { loginAction } from './auth-policy.js'
import { VanzShopBot } from './bot.js'
import { assertRuntimeConfig, config } from './config.js'
import { StateStore } from './state-store.js'
import { createBotApi } from './direct-api.js'

assertRuntimeConfig()
await fs.mkdir(config.authDir, { recursive: true })
const logger = pino({ level: config.logLevel })
const api = await createBotApi(config)
console.log(`[BACKEND] ${config.backendMode === 'direct' ? 'Xoftware + SewaPay langsung dari Node.js; order/lock memakai Redis bersama.' : `API website ${config.baseUrl}; stok dari Xoftware.`}`)
console.log(`[FLOW v3] Produk → paket → jumlah → QRIS. Grup ${config.groupsEnabled ? 'aktif' : 'nonaktif'}; detail produk ke chat pribadi. Banner: ${config.bannerFile}`)
const stateStore = new StateStore(config.stateFile)
await stateStore.load()
const bot = new VanzShopBot({ api, config, stateStore, logger })

let socket
let reconnectTimer
let pairingRequestedFor = 0
let connectionGeneration = 0
let connecting = false
let stopping = false

function disconnectCode(error) {
  return Number(error?.output?.statusCode || error?.statusCode || error?.data?.statusCode || 0)
}

function scheduleReconnect(generation) {
  if (stopping || generation !== connectionGeneration || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect().catch((error) => {
      logger.error({ error }, 'Reconnect gagal')
      scheduleReconnect(connectionGeneration)
    })
  }, config.reconnectDelayMs)
}

async function connect() {
  if (stopping || connecting) return
  connecting = true
  clearTimeout(reconnectTimer)
  reconnectTimer = undefined
  const generation = ++connectionGeneration
  try {
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
    const authAction = loginAction({ registered: state.creds.registered, method: config.loginMethod, hasPhone: Boolean(config.phoneNumber) })
    console.log(`[AUTH] ${state.creds.registered ? 'Session tersimpan ditemukan; mencoba menghubungkan ulang.' : `Login diperlukan melalui ${authAction === 'pairing-code' ? 'pairing code' : 'QR'}.`}`)
    if (!state.creds.registered && authAction === 'qr' && state.creds.pairingCode) {
      state.creds.pairingCode = undefined
      await saveCreds()
    }
    const { version } = await fetchLatestBaileysVersion()
    const currentSocket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      browser: ['VanzShop', 'Chrome', '1.0.0'],
    })
    socket = currentSocket
    bot.attach(currentSocket)
    let credentialWrite = Promise.resolve()
    currentSocket.ev.on('creds.update', () => {
      credentialWrite = credentialWrite.then(saveCreds).catch((error) => logger.error({ error }, 'Gagal menyimpan session WhatsApp'))
    })
    currentSocket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (generation !== connectionGeneration || currentSocket !== socket) return
    if (!['notify', 'append'].includes(type)) return
    for (const message of messages || []) {
      try { await bot.handle(message) } catch (error) { logger.error({ error }, 'Message handler gagal') }
    }
  })
    currentSocket.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (generation !== connectionGeneration || currentSocket !== socket || stopping) return
      if (qr && authAction === 'qr') {
        console.log('\n[LOGIN] Scan QR berikut dari WhatsApp → Perangkat tertaut:\n')
        qrcode.generate(qr, { small: true })
      }
      if (qr && authAction === 'pairing-code' && pairingRequestedFor !== generation) {
        pairingRequestedFor = generation
        try {
          const code = await currentSocket.requestPairingCode(config.phoneNumber)
          console.log(`\n[LOGIN] Kode pairing VanzShop: ${code?.match(/.{1,4}/g)?.join('-') || code}\n`)
        } catch (error) {
          logger.warn({ error }, 'Pairing code gagal. Ubah WA_LOGIN_METHOD=qr lalu restart untuk memakai QR.')
        }
      }
      if (connection === 'open') {
        console.log(`[ONLINE] Bot WhatsApp VanzShop terhubung ke ${config.baseUrl}. Session akan dipakai ulang saat restart.`)
      }
      if (connection === 'close') {
        const code = disconnectCode(lastDisconnect?.error)
        const loggedOut = code === DisconnectReason.loggedOut
        console.error(`[OFFLINE] Koneksi tertutup (${code || 'unknown'}).${loggedOut ? ' Session dicabut WhatsApp; pairing ulang diperlukan.' : ' Mencoba reconnect tanpa menghapus auth.'}`)
        if (!loggedOut) scheduleReconnect(generation)
      }
    })
  } finally {
    connecting = false
  }
}

setInterval(() => bot.pollPendingPayments().catch((error) => logger.warn({ error }, 'Payment poll gagal')), config.paymentPollMs).unref()

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (stopping) return
    stopping = true
    clearTimeout(reconnectTimer)
    console.log(`[SHUTDOWN] Menerima ${signal}`)
    try { socket?.end?.(new Error('Container dihentikan')) } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
    process.exit(0)
  })
}

connect().catch((error) => {
  logger.fatal({ error }, 'Bot gagal dijalankan')
  process.exit(1)
})
