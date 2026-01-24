import { useEffect, useMemo, useState } from 'react'
import { createCreditWallet, loadCreditWallet, saveCreditWallet } from '../utils/creditWallet'
import { fetchCreditBalance, fetchCreditSummary, registerCreditWallet } from '../services/credit'

type SummaryData = {
  balance: number
  date: string
  today: {
    reviewReward: number
    likePendingDelta: number
    likePendingPositive: number
    likePendingNegative: number
  }
}

export default function CreditWalletPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [wallet, setWallet] = useState(() => loadCreditWallet())
  const [balance, setBalance] = useState<number | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const onOpen = () => setIsOpen(true)
    window.addEventListener('open-credit-wallet', onOpen as any)
    return () => window.removeEventListener('open-credit-wallet', onOpen as any)
  }, [])

  const refresh = async () => {
    if (!wallet) return
    try {
      setError('')
      const [bal, sum] = await Promise.all([fetchCreditBalance(wallet.userHash), fetchCreditSummary(wallet.userHash)])
      const b = Number(bal?.data?.balance ?? bal?.data?.balance ?? bal?.balance ?? 0)
      const s = sum?.data as SummaryData
      setBalance(Number.isFinite(b) ? b : 0)
      setSummary(s || null)
    } catch (e: any) {
      setError(e?.message || '加载失败')
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (!wallet) return
    refresh()
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, wallet?.userHash])

  const handleBind = async () => {
    setLoading(true)
    setError('')
    try {
      const w = wallet || (await createCreditWallet())
      await registerCreditWallet({ userHash: w.userHash, userSecret: w.userSecret })
      saveCreditWallet(w)
      setWallet(w)
      await refresh()
    } catch (e: any) {
      setError(e?.message || '绑定失败')
    } finally {
      setLoading(false)
    }
  }

  const todayEstimated = useMemo(() => {
    const review = Number(summary?.today?.reviewReward || 0)
    const like = Number(summary?.today?.likePendingDelta || 0)
    return review + like
  }, [summary])

  const icon = (
    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 9V7a5 5 0 00-10 0v2M5 9h14l-1 12H6L5 9z"
      />
    </svg>
  )

  const content = (
    <div className="p-4 space-y-4 max-h-[calc(100vh-190px)] overflow-y-auto">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider">积分钱包</div>
            <div className="text-sm font-extrabold text-slate-800">YOURTJ Credit</div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            onClick={() => setIsOpen(false)}
            aria-label="关闭"
          >
            x
          </button>
        </div>

        {!wallet ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-600 leading-relaxed">
              绑定后可自动领取积分：50 字以上点评 +5；收到点赞每日 0 点结算（可撤销）。
            </div>
            <button
              type="button"
              onClick={handleBind}
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-slate-800 text-white font-extrabold hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? '处理中...' : '一键创建 / 绑定钱包'}
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">当前余额</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{balance ?? '-'}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">今日预计</div>
              <div className="mt-1 text-lg font-extrabold text-amber-900">
                {todayEstimated >= 0 ? `+${todayEstimated}` : todayEstimated}
              </div>
            </div>
          </div>
        )}

        {wallet && summary && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white border border-slate-200 p-2">
              <div className="text-[10px] font-black text-slate-500">点评</div>
              <div className="text-sm font-extrabold text-slate-800">+{summary.today.reviewReward}</div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-2">
              <div className="text-[10px] font-black text-slate-500">点赞</div>
              <div className="text-sm font-extrabold text-slate-800">
                {summary.today.likePendingDelta >= 0 ? `+${summary.today.likePendingDelta}` : summary.today.likePendingDelta}
              </div>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="rounded-xl bg-white border border-slate-200 p-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              刷新
            </button>
          </div>
        )}

        {error && <div className="mt-3 text-sm text-rose-600 font-semibold">{error}</div>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-extrabold text-slate-800">积分规则</div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-sm font-bold text-slate-700">50 字以上点评</div>
              <div className="text-sm font-extrabold text-slate-900">+5（立即）</div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-sm font-bold text-amber-800">收到 1 个点赞</div>
              <div className="text-sm font-extrabold text-amber-900">+1（每日 0 点结算，可撤销）</div>
            </div>
          </div>
          {wallet && (
            <div className="mt-3 text-[11px] text-slate-500 break-all">
              钱包 ID：<span className="font-mono">{wallet.userHash}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: left floating panel */}
      <div className="hidden md:block fixed left-6 top-24 z-40">
        <div
          className={`bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl transition-all duration-300 ${
            isOpen ? 'w-[380px]' : 'w-14'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="relative w-full p-3 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-colors"
            title={isOpen ? '收起钱包' : '打开钱包'}
          >
            {icon}
            {summary && todayEstimated !== 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {todayEstimated > 0 ? `+${todayEstimated}` : todayEstimated}
              </span>
            )}
          </button>
          {isOpen && content}
        </div>
      </div>

      {/* Mobile: floating button + bottom sheet */}
      <div className="md:hidden fixed left-4 bottom-24 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          aria-label="打开积分钱包"
        >
          {icon}
          {summary && todayEstimated !== 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
              {todayEstimated > 0 ? `+${todayEstimated}` : todayEstimated}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div className="fixed inset-x-3 bottom-3 max-h-[78vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-white/60">
              {content}
            </div>
          </>
        )}
      </div>
    </>
  )
}
