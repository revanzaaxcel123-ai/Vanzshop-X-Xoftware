export function normalizeLoginMethod(value) {
  const method = String(value || 'qr').trim().toLowerCase().replaceAll('_', '-')
  return ['pairing', 'pairing-code', 'code'].includes(method) ? 'pairing-code' : 'qr'
}

export function loginAction({ registered, method, hasPhone }) {
  if (registered) return 'reuse-session'
  if (normalizeLoginMethod(method) === 'pairing-code' && hasPhone) return 'pairing-code'
  return 'qr'
}
