import path from 'node:path'
import { normalizeLoginMethod } from './auth-policy.js'

function clean(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function normalizeBaseUrl(value) {
  const result = clean(value, 'https://store.vanzshop.com').replace(/\/+$/, '')
  if (!/^https:\/\//i.test(result)) throw new Error('VANZSHOP_BASE_URL wajib memakai HTTPS.')
  return result
}

function normalizePhone(value) {
  return clean(value).replace(/\D/g, '')
}

const cwd = process.cwd()

export const config = Object.freeze({
  baseUrl: normalizeBaseUrl(process.env.VANZSHOP_BASE_URL),
  backendMode: clean(process.env.WA_BACKEND_MODE, 'website'),
  webPaymentLinks: clean(process.env.WA_WEB_PAYMENT_LINKS, 'false') === 'true',
  groupsEnabled: clean(process.env.WA_GROUPS_ENABLED, 'true') === 'true',
  bannerFile: path.resolve(cwd, clean(process.env.WA_BANNER_FILE, './banner.png')),
  loginMethod: normalizeLoginMethod(process.env.WA_LOGIN_METHOD),
  phoneNumber: normalizePhone(process.env.WA_PHONE_NUMBER),
  adminNumber: normalizePhone(process.env.WA_ADMIN_NUMBER || '62895415204928'),
  supportUrl: clean(process.env.WA_SUPPORT_URL, 'https://wa.me/62895415204928'),
  warrantyUrl: clean(process.env.WA_WARRANTY_URL, 'https://ketentuan-garansi.vanzshop.com'),
  timezone: clean(process.env.WA_TIMEZONE, 'Asia/Jakarta'),
  authDir: path.resolve(cwd, clean(process.env.WA_AUTH_DIR, './data/auth')),
  stateFile: path.resolve(cwd, clean(process.env.WA_STATE_FILE, './data/pending-orders.json')),
  sessionTtlMs: integer(process.env.WA_SESSION_TTL_MINUTES, 30, 5, 180) * 60_000,
  catalogCacheMs: integer(process.env.WA_CATALOG_CACHE_SECONDS, 10, 5, 600) * 1_000,
  paymentPollMs: integer(process.env.WA_PAYMENT_POLL_SECONDS, 10, 10, 300) * 1_000,
  reconnectDelayMs: integer(process.env.WA_RECONNECT_DELAY_MS, 3000, 1000, 60_000),
  logLevel: clean(process.env.WA_LOG_LEVEL, 'info'),
})

export function assertRuntimeConfig() {
  if (config.loginMethod === 'pairing-code' && !config.phoneNumber) {
    console.warn('[CONFIG] WA_LOGIN_METHOD=pairing-code tetapi WA_PHONE_NUMBER kosong. Login akan memakai QR.')
  }
}
