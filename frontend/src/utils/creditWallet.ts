type CreditWalletLocal = {
  userHash: string
  userSecret: string
}

const STORAGE_KEY = 'yourtj_credit_wallet_v1'

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(input: string) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return toHex(new Uint8Array(buf))
}

export function loadCreditWallet(): CreditWalletLocal | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v?.userHash || !v?.userSecret) return null
    return { userHash: String(v.userHash), userSecret: String(v.userSecret) }
  } catch {
    return null
  }
}

export function saveCreditWallet(wallet: CreditWalletLocal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet))
}

export function clearCreditWallet() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function createCreditWallet(): Promise<CreditWalletLocal> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const userSecret = toHex(bytes)
  const userHash = await sha256Hex(userSecret)
  return { userHash, userSecret }
}

