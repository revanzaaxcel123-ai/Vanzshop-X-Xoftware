import fs from 'node:fs/promises'
import path from 'node:path'

export class StateStore {
  constructor(file) {
    this.file = file
    this.pending = new Map()
    this.completed = new Map()
    this.writeQueue = Promise.resolve()
  }

  async load() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'))
      for (const item of Array.isArray(parsed?.pending) ? parsed.pending : []) {
        if (item?.jid && item?.paymentToken && item?.paymentId) this.pending.set(item.paymentId, item)
      }
      for (const item of Array.isArray(parsed?.completed) ? parsed.completed : []) {
        if (item?.jid && item?.paymentId && Date.parse(item.completedAt) > Date.now() - 30 * 86400_000) this.completed.set(item.paymentId, item)
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error('File pesanan tidak dapat dibaca. Bot dihentikan agar riwayat tidak tertimpa.')
    }
  }

  list() {
    return [...this.pending.values()]
  }

  async put(order) {
    this.pending.set(order.paymentId, order)
    await this.save()
  }

  async remove(paymentId) {
    this.pending.delete(paymentId)
    await this.save()
  }

  ownedBy(item, jid, aliases = []) {
    const identities = new Set([jid, ...aliases])
    return [item.jid, ...(item.buyerAliases || [])].some(id => identities.has(id))
  }

  findFor(jid, reference, aliases = []) {
    return [...this.pending.values(), ...this.completed.values()].find((item) => this.ownedBy(item, jid, aliases) && item.reference === reference)
  }

  latestFor(jid, aliases = [], groupJid = '') {
    return [...this.pending.values(), ...this.completed.values()]
      .filter(item => this.ownedBy(item, jid, aliases) && (!groupJid || item.groupJid === groupJid))
      .sort((a, b) => String(b.createdAt || b.completedAt || '').localeCompare(String(a.createdAt || a.completedAt || '')))[0]
  }

  async complete(order) {
    const pending = this.pending.get(order.paymentId)
    const previous = this.completed.get(order.paymentId)
    this.completed.set(order.paymentId, { ...order, completedAt: new Date().toISOString() })
    this.pending.delete(order.paymentId)
    try { await this.save() } catch (error) {
      if (pending) this.pending.set(order.paymentId, pending)
      if (previous) this.completed.set(order.paymentId, previous)
      else this.completed.delete(order.paymentId)
      throw error
    }
  }

  async save() {
    for (const [id, order] of this.completed) if (Date.parse(order.completedAt) < Date.now() - 30 * 86400_000) this.completed.delete(id)
    const payload = JSON.stringify({ version: 2, pending: this.list(), completed: [...this.completed.values()] }, null, 2)
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true })
      const temporary = `${this.file}.tmp`
      await fs.writeFile(temporary, payload, { encoding: 'utf8', mode: 0o600 })
      await fs.rename(temporary, this.file)
    })
    return this.writeQueue
  }
}
