import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Turnstile from 'react-turnstile'
import { fetchCourse, submitReview } from '../services/api'
import GlassCard from '../components/GlassCard'
import MarkdownEditor from '../components/MarkdownEditor'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

const REVIEW_TEMPLATE = `## 考核方式：


## 授课质量与给分：


## 点评人（可选）：


## 上课学期：

`

export default function WriteReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<{ name: string; code: string } | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState(REVIEW_TEMPLATE)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) fetchCourse(id).then(setCourse)
  }, [id])

  const handleSubmit = async () => {
    if (!comment.trim()) return alert('请填写点评内容')
    if (!token) return alert('请完成人机验证')

    setLoading(true)
    try {
      const res = await submitReview({
        course_id: Number(id),
        rating,
        comment,
        semester: '',
        turnstile_token: token
      })
      if (res.success) {
        alert('点评提交成功！')
        navigate(`/course/${id}`)
      } else {
        alert(res.error || '提交失败')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!course) return <div className="text-center py-20 text-slate-500">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <GlassCard hover={false}>
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 rounded-full text-xs font-bold text-cyan-600 border border-cyan-100 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            撰写评价
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{course.code} - {course.name}</h2>
        </div>

        {/* Rating */}
        <div className="mb-6">
          <label className="block mb-3 text-sm font-semibold text-slate-600">评分</label>
          <div className="flex items-center gap-2 p-4 bg-white/60 backdrop-blur rounded-2xl border border-white">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-3xl p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <svg
                  className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
            <span className="ml-3 text-sm font-semibold text-slate-600">{rating} 分</span>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-semibold text-slate-600">
            点评内容 <span className="text-slate-400 font-normal text-xs">(支持 Markdown 格式)</span>
          </label>

          {/* Markdown Tips */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-[11px] text-slate-500">
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">**粗体**</span>
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">*斜体*</span>
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">[链接](url)</span>
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">![图片](url)</span>
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">`代码`</span>
            <span className="px-2 py-1 bg-white rounded-md border border-slate-100 font-mono">## 标题</span>
          </div>

          <MarkdownEditor
            value={comment}
            onChange={setComment}
            placeholder="请按照模板填写课程点评..."
          />
        </div>

        {/* Turnstile */}
        {TURNSTILE_SITE_KEY && (
          <div className="mb-6">
            <Turnstile sitekey={TURNSTILE_SITE_KEY} onVerify={setToken} />
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-slate-800 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              提交中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              提交点评
            </>
          )}
        </button>
      </GlassCard>
    </div>
  )
}
