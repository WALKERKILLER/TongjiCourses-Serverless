import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchCourse, likeReview, unlikeReview } from '../services/api'
import GlassCard from '../components/GlassCard'
import CollapsibleMarkdown from '../components/CollapsibleMarkdown'
import { getOrCreateClientId } from '../utils/clientId'
import { loadCreditWallet } from '../utils/creditWallet'

interface Review {
  id: number
  sqid?: string
  rating: number
  comment: string
  semester: string
  created_at: number
  reviewer_name?: string
  reviewer_avatar?: string
  like_count?: number
  liked?: boolean
  wallet_user_hash?: string | null
}

interface CourseData {
  id: number
  code: string
  name: string
  credit: number
  department: string
  teacher_name: string
  review_avg: number
  review_count: number
  semesters?: string[]
  reviews: Review[]
}

export default function Course() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [displayCount, setDisplayCount] = useState(20) // 初始显示20条评论
  const clientId = useMemo(() => getOrCreateClientId(), [])
  const walletHash = loadCreditWallet()?.userHash || ''

  useEffect(() => {
    if (!id) return
    setCourse(null)
    setLoadError('')
    fetchCourse(id, { clientId })
      .then(setCourse)
      .catch(() => setLoadError('加载失败，请重试'))
  }, [id, clientId])

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 20)
  }

  const toggleLike = async (reviewId: number) => {
    if (!course) return
    const reviews = course.reviews || []
    const target = reviews.find((r) => r.id === reviewId)
    if (!target) return

    const nextLiked = !target.liked

    // optimistic
    setCourse((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, liked: nextLiked, like_count: Math.max(0, Number(r.like_count || 0) + (nextLiked ? 1 : -1)) }
            : r
        )
      }
    })

    try {
      const res = nextLiked ? await likeReview(reviewId, clientId) : await unlikeReview(reviewId, clientId)
      const likeCount = Number(res?.like_count ?? 0)
      setCourse((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          reviews: prev.reviews.map((r) => (r.id === reviewId ? { ...r, liked: nextLiked, like_count: likeCount } : r))
        }
      })
    } catch (_e) {
      // revert
      setCourse((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          reviews: prev.reviews.map((r) => (r.id === reviewId ? { ...r, liked: !nextLiked } : r))
        }
      })
    }
  }

  const startEdit = (review: Review) => {
    if (!id) return
    navigate(`/write-review/${id}?edit=1`, { state: { editReview: review } })
  }

  if (loadError) {
    return (
      <GlassCard hover={false}>
        <div className="text-slate-700 font-bold mb-3">{loadError}</div>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700"
          onClick={() => {
            if (!id) return
            setCourse(null)
            setLoadError('')
            fetchCourse(id, { clientId })
              .then(setCourse)
              .catch(() => setLoadError('加载失败，请重试'))
          }}
        >
          重新加载
        </button>
      </GlassCard>
    )
  }

  if (!course) {
    return (
      <div className="min-h-[100vh] grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        <div className="lg:col-span-4 space-y-4">
          <GlassCard hover={false}>
            <div className="h-6 w-28 rounded-full bg-slate-200 mb-4" />
            <div className="h-8 w-3/4 rounded bg-slate-200 mb-3" />
            <div className="h-4 w-1/2 rounded bg-slate-200 mb-6" />
            <div className="space-y-3">
              <div className="h-14 rounded-xl bg-slate-200/80" />
              <div className="h-14 rounded-xl bg-slate-200/80" />
              <div className="h-14 rounded-xl bg-slate-200/80" />
            </div>
          </GlassCard>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <div className="h-6 w-44 rounded bg-slate-200" />
          <GlassCard hover={false} className="!p-5">
            <div className="h-5 w-1/3 rounded bg-slate-200 mb-3" />
            <div className="h-4 w-full rounded bg-slate-200 mb-2" />
            <div className="h-4 w-11/12 rounded bg-slate-200 mb-2" />
            <div className="h-4 w-10/12 rounded bg-slate-200" />
          </GlassCard>
          <GlassCard hover={false} className="!p-5">
            <div className="h-5 w-1/3 rounded bg-slate-200 mb-3" />
            <div className="h-4 w-full rounded bg-slate-200 mb-2" />
            <div className="h-4 w-11/12 rounded bg-slate-200 mb-2" />
            <div className="h-4 w-10/12 rounded bg-slate-200" />
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Course Info */}
      <div className="lg:col-span-4 space-y-4">
        <GlassCard className="bg-gradient-to-b from-cyan-50/80 to-white" hover={false}>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-bold text-cyan-600 shadow-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            {course.code}
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">{course.name}</h2>
          <p className="text-slate-500 font-medium mb-6">{course.department}</p>
          {Array.isArray(course.semesters) && course.semesters.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {course.semesters.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">授课教师</p>
                <p className="text-sm font-bold text-slate-700">{course.teacher_name || '未知教师'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">综合评分</p>
                <p className="text-sm font-bold text-slate-700">{course.review_avg?.toFixed(1) || '-'} / 5.0</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">课程学分</p>
                <p className="text-sm font-bold text-slate-700">{course.credit} 学分</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-cyan-100/50">
            <Link
              to={`/write-review/${course.id}`}
              className="w-full py-3 bg-slate-800 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              撰写评价
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Right: Reviews */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-slate-800">
            课程评价 <span className="text-slate-400 text-sm font-normal">({course.review_count})</span>
          </h3>
        </div>

        {course.reviews?.length > 0 ? (
          <>
            {course.reviews.slice(0, displayCount).map((review) => (
              <GlassCard key={review.id} hover={false} className="!p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {review.reviewer_avatar ? (
                      <img
                        src={review.reviewer_avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-cyan-700 text-sm font-bold border-2 border-white shadow-sm">
                        匿
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-700">{review.reviewer_name || '匿名用户'}</p>
                      <p className="text-[10px] text-slate-400">{review.semester} · {new Date(review.created_at * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>

                <div className="text-slate-600 text-sm leading-relaxed mb-3">
                  <CollapsibleMarkdown content={review.comment} maxLength={300} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleLike(review.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold transition-colors ${
                      review.liked
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title={review.liked ? '撤销点赞' : '点赞'}
                  >
                    <svg
                      className={`w-4 h-4 ${review.liked ? 'text-orange-600' : 'text-slate-400'}`}
                      viewBox="0 0 24 24"
                      fill={review.liked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11v10H3V11h4z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 11l5-7a2 2 0 013 2l-1 5h5a2 2 0 012 2l-2 7a2 2 0 01-2 2H7"
                      />
                    </svg>
                    <span>{Number(review.like_count || 0)}</span>
                    <span className="text-[10px] font-black opacity-80">点赞</span>
                  </button>

                  {walletHash && String(review.wallet_user_hash || '').trim() === walletHash && (
                    <button
                      type="button"
                      onClick={() => startEdit(review)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                      title="编辑我的评价"
                    >
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z" />
                      </svg>
                      <span className="text-[10px] font-black opacity-80">编辑</span>
                    </button>
                  )}

                  {review.sqid && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span className="font-mono">{review.sqid}</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}

            {/* 加载更多按钮 */}
            {displayCount < course.reviews.length && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-white/70 hover:bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl font-semibold text-slate-700 shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  加载更多 ({course.reviews.length - displayCount} 条)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">暂无评价，快来抢沙发吧！</p>
          </div>
        )}
      </div>
    </div>
  )
}
