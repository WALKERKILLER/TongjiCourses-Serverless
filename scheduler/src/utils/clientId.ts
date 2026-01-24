const STORAGE_KEY = 'yourtj_client_id'

function randomId() {
  // No crypto requirement here; just a stable per-device id for like/unlike.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return randomId()
  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing && existing.length >= 6) return existing
  const next = randomId()
  window.localStorage.setItem(STORAGE_KEY, next)
  return next
}

