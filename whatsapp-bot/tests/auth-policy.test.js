import assert from 'node:assert/strict'
import test from 'node:test'
import { loginAction, normalizeLoginMethod } from '../src/auth-policy.js'

test('QR menjadi metode login default', () => {
  assert.equal(normalizeLoginMethod(), 'qr')
  assert.equal(loginAction({ registered: false, method: 'qr', hasPhone: true }), 'qr')
})

test('pairing code hanya aktif jika dipilih dan nomor tersedia', () => {
  assert.equal(loginAction({ registered: false, method: 'pairing-code', hasPhone: true }), 'pairing-code')
  assert.equal(loginAction({ registered: false, method: 'pairing-code', hasPhone: false }), 'qr')
})

test('session terdaftar selalu dipakai ulang', () => {
  assert.equal(loginAction({ registered: true, method: 'pairing-code', hasPhone: true }), 'reuse-session')
})
