export type CreditWalletLocal = {
  mnemonic: string
  userHash: string
  userSecret: string
  createdAt?: number
}

const STORAGE_KEY = 'yourtj_credit_wallet'

export function loadCreditWallet(): CreditWalletLocal | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v?.userHash || !v?.userSecret) return null
    return {
      mnemonic: String(v.mnemonic || ''),
      userHash: String(v.userHash),
      userSecret: String(v.userSecret),
      createdAt: typeof v.createdAt === 'number' ? v.createdAt : undefined
    }
  } catch {
    return null
  }
}

export function saveCreditWallet(wallet: CreditWalletLocal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...wallet, createdAt: wallet.createdAt ?? Date.now() }))
}

export function clearCreditWallet() {
  localStorage.removeItem(STORAGE_KEY)
}

