import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Turnstile from 'react-turnstile'
import { fetchCourse, submitReview } from '../services/api'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export default function WriteReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<{ name: string; code: string } | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [semester, setSemester] = useState('')
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
        semester,
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

  if (!course) return <p>加载中...</p>

  return (
    <div className="card">
      <h2>点评: {course.code} - {course.name}</h2>

      <div style={{ margin: '16px 0' }}>
        <label>评分</label>
        <select value={rating} onChange={e => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map(n => (
            <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} {n}分</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label>学期 (可选)</label>
        <input placeholder="如: 2024-2025-1" value={semester} onChange={e => setSemester(e.target.value)} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label>点评内容</label>
        <textarea rows={5} placeholder="分享你的课程体验..." value={comment} onChange={e => setComment(e.target.value)} />
      </div>

      {TURNSTILE_SITE_KEY && (
        <Turnstile sitekey={TURNSTILE_SITE_KEY} onVerify={setToken} />
      )}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>
        {loading ? '提交中...' : '提交点评'}
      </button>
    </div>
  )
}
