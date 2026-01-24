const CREDIT_BASE = (import.meta.env.VITE_CREDIT_API_BASE || 'https://credit.yourtj.de').replace(/\/$/, '')

async function fetchWithTimeout(url: string, options?: RequestInit, timeout = 15000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function registerCreditWallet(params: { userHash: string; userSecret: string }) {
  const res = await fetchWithTimeout(`${CREDIT_BASE}/api/wallet/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash: params.userHash, userSecret: params.userSecret })
  })
  if (!res.ok) throw new Error(await res.text().catch(() => 'register failed'))
  return res.json()
}

export async function fetchCreditBalance(userHash: string) {
  const res = await fetchWithTimeout(`${CREDIT_BASE}/api/wallet/${encodeURIComponent(userHash)}/balance`)
  if (!res.ok) throw new Error(await res.text().catch(() => 'balance failed'))
  return res.json()
}

export async function fetchCreditSummary(userHash: string, date?: string) {
  const q = new URLSearchParams({ userHash })
  if (date) q.set('date', date)
  const res = await fetchWithTimeout(`${CREDIT_BASE}/api/integration/jcourse/summary?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text().catch(() => 'summary failed'))
  return res.json()
}
