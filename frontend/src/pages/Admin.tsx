import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import CollapsibleMarkdown from '../components/CollapsibleMarkdown'

const API_BASE = import.meta.env.VITE_API_URL || ''
const ACCESS_KEY = 'secretkey'

interface Review {
  id: number
  course_name: string
  code: string
  rating: number
  comment: string
  created_at: number
  is_hidden: number
}

export default function Admin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [secret, setSecret] = useState(localStorage.getItem('admin_secret') || '')
  const [reviews, setReviews] = useState<Review[]>([])
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    if (searchParams.get('access') !== ACCESS_KEY) {
      navigate('/')
    }
  }, [searchParams, navigate])

  const headers = { 'x-admin-secret': secret, 'Content-Type': 'application/json' }

  const login = () => {
    if (!secret) return
    localStorage.setItem('admin_secret', secret)
    fetchReviews()
  }

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/reviews`, { headers })
      if (res.status === 401) return alert('密钥错误')
      if (!res.ok) throw new Error('Failed to fetch reviews')
      const data = await res.json()
      setReviews(Array.isArray(data) ? data : [])
      setIsAuth(true)
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
      alert('获取评论失败，请检查后端是否正常运行')
    }
  }

  const toggleHide = async (id: number) => {
    await fetch(`${API_BASE}/api/admin/review/${id}/toggle`, { method: 'POST', headers })
    fetchReviews()
  }

  const deleteReview = async (id: number) => {
    if (!confirm('确定删除?')) return
    await fetch(`${API_BASE}/api/admin/review/${id}`, { method: 'DELETE', headers })
    fetchReviews()
  }

  if (!isAuth) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <GlassCard hover={false} className="text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">管理员登录</h2>
          <p className="text-slate-500 text-sm mb-6">请输入管理密钥以访问后台</p>

          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="输入 Admin Secret"
            className="w-full px-4 py-3 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all mb-4"
            onKeyDown={e => e.key === 'Enter' && login()}
          />

          <button
            onClick={login}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all active:scale-[0.98]"
          >
            进入系统
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">评论审核后台</h2>
          <p className="text-slate-500 text-sm">{reviews.length} 条评论待审核</p>
        </div>
        <button
          onClick={fetchReviews}
          className="px-5 py-2.5 bg-white/70 backdrop-blur border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-white hover:border-cyan-300 hover:text-cyan-600 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新列表
        </button>
      </div>

      {/* Reviews List */}
      {reviews.map(r => (
        <GlassCard
          key={r.id}
          hover={false}
          className={`!p-5 ${r.is_hidden ? 'border-l-4 border-l-red-400 bg-red-50/30' : ''}`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100">
                {r.code}
              </span>
              <span className="font-bold text-slate-700">{r.course_name}</span>
              {r.is_hidden ? (
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                  已隐藏
                </span>
              ) : null}
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
          </div>

          <div className="text-slate-600 text-sm leading-relaxed mb-4">
            <CollapsibleMarkdown content={r.comment} maxLength={200} />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {new Date(r.created_at * 1000).toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => toggleHide(r.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  r.is_hidden
                    ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {r.is_hidden ? '显示' : '隐藏'}
              </button>
              <button
                onClick={() => deleteReview(r.id)}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </GlassCard>
      ))}

      {reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">暂无评论</p>
        </div>
      )}
    </div>
  )
}
