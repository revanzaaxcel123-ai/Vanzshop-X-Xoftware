import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const botRoot = fileURLToPath(new URL('../', import.meta.url))
const repoRoot = path.resolve(botRoot, '..')
const files = ['api/xo.js', 'lib/sewapay.js', 'lib/fulfillment.js', 'lib/fulfillment-store.js', 'lib/gemini.js']
// Explicit allowlist: never package .env, auth, pending orders, or node_modules.
for (const relative of files) {
  const destination = path.join(botRoot, 'backend', relative)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.copyFile(path.join(repoRoot, relative), destination)
}
await fs.writeFile(path.join(botRoot, 'backend/package.json'), JSON.stringify({ private: true, type: 'commonjs' }, null, 2))
console.log('Backend direct dibundel dari source website (5 file; tanpa secret atau data pelanggan).')
