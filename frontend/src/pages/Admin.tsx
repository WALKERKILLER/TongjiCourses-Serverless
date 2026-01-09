import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

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
  const [secret, setSecret] = useState(localStorage.getItem('admin_secret') || '')
  const [reviews, setReviews] = useState<Review[]>([])
  const [isAuth, setIsAuth] = useState(false)

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
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <h2>管理员登录</h2>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="输入 Admin Secret"
          style={{ width: '300px', marginTop: '20px' }}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        <br />
        <button className="btn btn-primary" onClick={login} style={{ marginTop: '16px' }}>进入系统</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>评论审核后台</h2>
        <button className="btn btn-primary" onClick={fetchReviews}>刷新列表</button>
      </div>

      {reviews.map(r => (
        <div key={r.id} className={`card ${r.is_hidden ? 'hidden-review' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>{r.code} - {r.course_name}</span>
            <span className="rating">★ {r.rating}</span>
          </div>
          <p style={{ margin: '10px 0', color: '#555' }}>{r.comment}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
            <span>{new Date(r.created_at * 1000).toLocaleString()}</span>
            <div>
              <button className="btn" onClick={() => toggleHide(r.id)} style={{ marginRight: '8px' }}>
                {r.is_hidden ? '显示' : '隐藏'}
              </button>
              <button className="btn btn-danger" onClick={() => deleteReview(r.id)}>删除</button>
            </div>
          </div>
        </div>
      ))}

      {reviews.length === 0 && <p style={{ textAlign: 'center', color: '#999' }}>暂无评论</p>}
    </div>
  )
}
