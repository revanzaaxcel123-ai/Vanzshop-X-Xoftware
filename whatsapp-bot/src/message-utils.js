function unwrap(content) {
  let current = content
  for (let index = 0; index < 5 && current; index += 1) {
    if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message
    else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message
    else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message
    else break
  }
  return current || {}
}

export function incomingText(message) {
  const content = unwrap(message?.message)
  const interactiveRaw = content?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
  let interactive = ''
  if (interactiveRaw) {
    try {
      const parsed = JSON.parse(interactiveRaw)
      interactive = parsed?.id || parsed?.row_id || parsed?.selected_id || ''
    } catch {}
  }
  return String(
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.buttonsResponseMessage?.selectedButtonId ||
    content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    interactive ||
    ''
  ).trim()
}

export function jidPhone(jid) {
  // A WhatsApp LID is an opaque user ID, never a telephone number.
  return /^\d+(?::\d+)?@s\.whatsapp\.net$/.test(String(jid || ''))
    ? String(jid).split('@')[0].split(':')[0] : ''
}

export function normalizeUserJid(jid) {
  const match = String(jid || '').match(/^([^:@]+)(?::\d+)?@(s\.whatsapp\.net|lid)$/)
  return match ? `${match[1]}@${match[2]}` : ''
}

export async function messageBuyer(message, socket) {
  const chatJid = String(message?.key?.remoteJid || '')
  const groupJid = chatJid.endsWith('@g.us') ? chatJid : ''
  const sender = normalizeUserJid(groupJid ? message.key.participant : chatJid)
  if (!sender) return null
  const alternate = normalizeUserJid(groupJid ? message.key.participantAlt : message.key.remoteJidAlt)
  const aliases = new Set([sender, alternate].filter(Boolean))
  let phoneJid = [...aliases].find(jid => jidPhone(jid)) || ''
  const lid = [...aliases].find(jid => jid.endsWith('@lid'))
  if (!phoneJid && lid) {
    try {
      const mapped = normalizeUserJid(await socket?.signalRepository?.lidMapping?.getPNForLID(lid))
      if (jidPhone(mapped)) { phoneJid = mapped; aliases.add(mapped) }
    } catch { /* Delivery can still use the sender's LID. */ }
  }
  if (phoneJid && !lid) {
    try {
      const mapped = normalizeUserJid(await socket?.signalRepository?.lidMapping?.getLIDForPN(phoneJid))
      if (mapped.endsWith('@lid')) aliases.add(mapped)
    } catch { /* Phone JID remains usable. */ }
  }
  return { chatJid, groupJid, buyerJid: phoneJid || sender, buyerAliases: [...aliases], phone: jidPhone(phoneJid), mentionJid: sender }
}

export function quotedText(message) {
  const content = unwrap(message?.message)
  const context = Object.values(content).find(value => value?.contextInfo?.quotedMessage)?.contextInfo
  return context ? incomingText({ message: context.quotedMessage }) : ''
}
