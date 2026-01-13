import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import CollapsibleMarkdown from '../components/CollapsibleMarkdown'
import MarkdownEditor from '../components/MarkdownEditor'

const API_BASE = import.meta.env.VITE_API_URL || ''
const ACCESS_KEY = 'tjcourse2026admin'

interface Review {
  id: number
  course_id: number
  course_name: string
  code: string
  rating: number
  comment: string
  created_at: number
  is_hidden: number
  reviewer_name: string
  reviewer_avatar: string
}

interface Course {
  id: number
  code: string
  name: string
  credit: number
  department: string
  teacher_name: string
  review_count: number
  review_avg: number
  search_keywords: string
  is_legacy: number
}

export default function Admin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [secret, setSecret] = useState(localStorage.getItem('admin_secret') || '')
  const [isAuth, setIsAuth] = useState(false)
  const [activeTab, setActiveTab] = useState<'reviews' | 'courses' | 'settings'>('reviews')

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotalPages, setReviewTotalPages] = useState(1)
  const [reviewKeyword, setReviewKeyword] = useState('')
  const [reviewSearchInput, setReviewSearchInput] = useState('')
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null)
  const [reviewEditForm, setReviewEditForm] = useState({ comment: '', rating: 5, reviewer_name: '', reviewer_avatar: '' })

  // Courses state
  const [courses, setCourses] = useState<Course[]>([])
  const [courseTotal, setCourseTotal] = useState(0)
  const [coursePage, setCoursePage] = useState(1)
  const [courseTotalPages, setCourseTotalPages] = useState(1)
  const [courseKeyword, setCourseKeyword] = useState('')
  const [courseSearchInput, setCourseSearchInput] = useState('')
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null)
  const [courseEditForm, setCourseEditForm] = useState({ code: '', name: '', credit: 0, department: '', teacher_name: '', search_keywords: '' })
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourseForm, setNewCourseForm] = useState({ code: '', name: '', credit: 0, department: '', teacher_name: '', search_keywords: '' })

  // Settings state
  const [showLegacyReviews, setShowLegacyReviews] = useState(false)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('access') !== ACCESS_KEY) {
      navigate('/')
    }
  }, [searchParams, navigate])

  const getHeaders = () => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' })

  const login = () => {
    if (!secret) return
    localStorage.setItem('admin_secret', secret)
    fetchReviews()
  }

  // Reviews API
  const fetchReviews = async (p = reviewPage, q = reviewKeyword) => {
    setLoading(true)
    try {
      let url = `${API_BASE}/api/admin/reviews?page=${p}&limit=20`
      if (q) url += `&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { headers: getHeaders() })
      if (res.status === 401) { setLoading(false); return alert('密钥错误') }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReviews(data.data || [])
      setReviewTotal(data.total || 0)
      setReviewTotalPages(data.totalPages || 1)
      setReviewPage(p)
      setIsAuth(true)
    } catch (err) {
      console.error(err)
      alert('获取评论失败')
    }
    setLoading(false)
  }

  const toggleHide = async (id: number) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_hidden: r.is_hidden ? 0 : 1 } : r))
    try {
      const res = await fetch(`${API_BASE}/api/admin/review/${id}/toggle`, { method: 'POST', headers: getHeaders() })
      if (!res.ok) throw new Error('Failed')
    } catch (e) {
      fetchReviews()
    }
  }

  const deleteReview = async (id: number) => {
    if (!confirm('确定删除?')) return
    const backup = [...reviews]
    setReviews(prev => prev.filter(r => r.id !== id))
    setReviewTotal(prev => prev - 1)
    try {
      const res = await fetch(`${API_BASE}/api/admin/review/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (!res.ok) throw new Error('Failed')
    } catch (e) {
      setReviews(backup)
    }
  }

  const saveReviewEdit = async () => {
    if (editingReviewId === null) return
    const id = editingReviewId
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...reviewEditForm } : r))
    setEditingReviewId(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/review/${id}`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(reviewEditForm)
      })
      if (!res.ok) throw new Error('Failed')
    } catch (e) {
      fetchReviews()
    }
  }

  // Courses API
  const fetchCourses = async (p = coursePage, q = courseKeyword) => {
    setLoading(true)
    try {
      let url = `${API_BASE}/api/admin/courses?page=${p}&limit=20`
      if (q) url += `&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCourses(data.data || [])
      setCourseTotal(data.total || 0)
      setCourseTotalPages(data.totalPages || 1)
      setCoursePage(p)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const saveCourseEdit = async () => {
    if (editingCourseId === null) return
    const id = editingCourseId
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...courseEditForm } : c))
    setEditingCourseId(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/course/${id}`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(courseEditForm)
      })
      if (!res.ok) throw new Error('Failed')
    } catch (e) {
      fetchCourses()
    }
  }

  const deleteCourse = async (id: number) => {
    if (!confirm('确定删除此课程及其所有评论?')) return
    setCourses(prev => prev.filter(c => c.id !== id))
    setCourseTotal(prev => prev - 1)
    try {
      const res = await fetch(`${API_BASE}/api/admin/course/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (!res.ok) throw new Error('Failed')
    } catch (e) {
      fetchCourses()
    }
  }

  const createCourse = async () => {
    if (!newCourseForm.code || !newCourseForm.name) return alert('请填写课程代码和名称')
    try {
      const res = await fetch(`${API_BASE}/api/admin/course`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(newCourseForm)
      })
      if (!res.ok) throw new Error('Failed')
      setShowAddCourse(false)
      setNewCourseForm({ code: '', name: '', credit: 0, department: '', teacher_name: '', search_keywords: '' })
      fetchCourses(1)
    } catch (e) {
      alert('创建失败')
    }
  }

  // Settings API
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, { headers: getHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setShowLegacyReviews(data.show_legacy_reviews === 'true')
    } catch (e) { console.error(e) }
  }

  const updateShowLegacy = async (value: boolean) => {
    setShowLegacyReviews(value)
    try {
      await fetch(`${API_BASE}/api/admin/settings/show_legacy_reviews`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ value: value ? 'true' : 'false' })
      })
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (isAuth && activeTab === 'courses' && courses.length === 0) {
      fetchCourses()
    }
    if (isAuth && activeTab === 'settings') {
      fetchSettings()
    }
  }, [activeTab, isAuth])

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
          <button onClick={login} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all active:scale-[0.98]">
            进入系统
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'reviews' ? 'bg-cyan-500 text-white' : 'bg-white/70 text-slate-600 hover:bg-slate-100'}`}
        >
          评论管理 ({reviewTotal})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'courses' ? 'bg-cyan-500 text-white' : 'bg-white/70 text-slate-600 hover:bg-slate-100'}`}
        >
          课程管理 ({courseTotal})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'settings' ? 'bg-cyan-500 text-white' : 'bg-white/70 text-slate-600 hover:bg-slate-100'}`}
        >
          设置
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">评论审核</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={reviewSearchInput}
                onChange={e => setReviewSearchInput(e.target.value)}
                placeholder="搜索..."
                className="px-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400"
                onKeyDown={e => e.key === 'Enter' && (setReviewKeyword(reviewSearchInput), fetchReviews(1, reviewSearchInput))}
              />
              <button onClick={() => (setReviewKeyword(reviewSearchInput), fetchReviews(1, reviewSearchInput))} className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-semibold">搜索</button>
              <button onClick={() => fetchReviews()} disabled={loading} className="px-4 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm disabled:opacity-50">
                {loading ? '加载中...' : '刷新'}
              </button>
            </div>
          </div>

          {reviews.map(r => (
            <GlassCard key={r.id} hover={false} className={`!p-4 ${r.is_hidden ? 'border-l-4 border-l-red-400 bg-red-50/30' : ''}`}>
              {editingReviewId === r.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-cyan-600">{r.code}</span>
                    <span className="text-slate-600">{r.course_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={reviewEditForm.reviewer_name} onChange={e => setReviewEditForm({ ...reviewEditForm, reviewer_name: e.target.value })} placeholder="昵称" className="px-2 py-1 border rounded text-sm" />
                    <input value={reviewEditForm.reviewer_avatar} onChange={e => setReviewEditForm({ ...reviewEditForm, reviewer_avatar: e.target.value })} placeholder="头像URL" className="px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewEditForm({ ...reviewEditForm, rating: s })}>
                        <svg className={`w-5 h-5 ${s <= reviewEditForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <MarkdownEditor value={reviewEditForm.comment} onChange={v => setReviewEditForm({ ...reviewEditForm, comment: v })} placeholder="评论内容..." />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingReviewId(null)} className="px-3 py-1 text-slate-500 text-sm">取消</button>
                    <button onClick={saveReviewEdit} className="px-3 py-1 bg-cyan-500 text-white rounded text-sm">保存</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {r.reviewer_avatar ? <img src={r.reviewer_avatar} className="w-7 h-7 rounded-full" /> : <div className="w-7 h-7 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 text-xs">匿</div>}
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-cyan-600">{r.code}</span>
                          <span className="text-slate-700">{r.course_name}</span>
                          {r.is_hidden && <span className="text-xs text-red-500 bg-red-50 px-1 rounded">隐藏</span>}
                        </div>
                        <p className="text-xs text-slate-400">{r.reviewer_name || '匿名'} · {new Date(r.created_at * 1000).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <div key={s} className={`w-2 h-2 rounded-full ${s <= r.rating ? 'bg-amber-400' : 'bg-slate-200'}`} />)}</div>
                  </div>
                  <div className="text-sm text-slate-600 mb-2"><CollapsibleMarkdown content={r.comment} maxLength={150} /></div>
                  <div className="flex gap-2 justify-end text-xs">
                    <button onClick={() => (setEditingReviewId(r.id), setReviewEditForm({ comment: r.comment, rating: r.rating, reviewer_name: r.reviewer_name || '', reviewer_avatar: r.reviewer_avatar || '' }))} className="px-2 py-1 bg-slate-100 rounded">编辑</button>
                    <button onClick={() => toggleHide(r.id)} className={`px-2 py-1 rounded ${r.is_hidden ? 'bg-green-100 text-green-600' : 'bg-slate-100'}`}>{r.is_hidden ? '显示' : '隐藏'}</button>
                    <button onClick={() => deleteReview(r.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded">删除</button>
                  </div>
                </>
              )}
            </GlassCard>
          ))}

          {reviewTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => fetchReviews(reviewPage - 1)} disabled={reviewPage <= 1} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm">{reviewPage}/{reviewTotalPages}</span>
              <button onClick={() => fetchReviews(reviewPage + 1)} disabled={reviewPage >= reviewTotalPages} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">课程管理</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={courseSearchInput}
                onChange={e => setCourseSearchInput(e.target.value)}
                placeholder="搜索课程..."
                className="px-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400"
                onKeyDown={e => e.key === 'Enter' && (setCourseKeyword(courseSearchInput), fetchCourses(1, courseSearchInput))}
              />
              <button onClick={() => (setCourseKeyword(courseSearchInput), fetchCourses(1, courseSearchInput))} className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-semibold">搜索</button>
              <button onClick={() => setShowAddCourse(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">+ 添加课程</button>
              <button onClick={() => fetchCourses()} disabled={loading} className="px-4 py-2 bg-white/70 border border-slate-200 rounded-lg text-sm disabled:opacity-50">
                {loading ? '加载中...' : '刷新'}
              </button>
            </div>
          </div>

          {/* 添加课程表单 */}
          {showAddCourse && (
            <GlassCard hover={false} className="!p-4 border-2 border-green-200 bg-green-50/30">
              <h3 className="font-bold text-slate-700 mb-3">添加新课程</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input value={newCourseForm.code} onChange={e => setNewCourseForm({ ...newCourseForm, code: e.target.value })} placeholder="课程代码 *" className="px-2 py-1 border rounded text-sm" />
                <input value={newCourseForm.name} onChange={e => setNewCourseForm({ ...newCourseForm, name: e.target.value })} placeholder="课程名称 *" className="px-2 py-1 border rounded text-sm" />
                <input value={newCourseForm.teacher_name} onChange={e => setNewCourseForm({ ...newCourseForm, teacher_name: e.target.value })} placeholder="教师" className="px-2 py-1 border rounded text-sm" />
                <input type="number" value={newCourseForm.credit} onChange={e => setNewCourseForm({ ...newCourseForm, credit: parseFloat(e.target.value) || 0 })} placeholder="学分" className="px-2 py-1 border rounded text-sm" />
                <input value={newCourseForm.department} onChange={e => setNewCourseForm({ ...newCourseForm, department: e.target.value })} placeholder="院系" className="px-2 py-1 border rounded text-sm" />
                <input value={newCourseForm.search_keywords} onChange={e => setNewCourseForm({ ...newCourseForm, search_keywords: e.target.value })} placeholder="搜索关键词（可选）" className="px-2 py-1 border rounded text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddCourse(false)} className="px-3 py-1 text-slate-500 text-sm">取消</button>
                <button onClick={createCourse} className="px-3 py-1 bg-green-500 text-white rounded text-sm">创建</button>
              </div>
            </GlassCard>
          )}

          {courses.map(c => (
            <GlassCard key={c.id} hover={false} className="!p-4">
              {editingCourseId === c.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={courseEditForm.code} onChange={e => setCourseEditForm({ ...courseEditForm, code: e.target.value })} placeholder="课程代码" className="px-2 py-1 border rounded text-sm" />
                    <input value={courseEditForm.name} onChange={e => setCourseEditForm({ ...courseEditForm, name: e.target.value })} placeholder="课程名称" className="px-2 py-1 border rounded text-sm" />
                    <input value={courseEditForm.teacher_name} onChange={e => setCourseEditForm({ ...courseEditForm, teacher_name: e.target.value })} placeholder="教师" className="px-2 py-1 border rounded text-sm" />
                    <input type="number" value={courseEditForm.credit} onChange={e => setCourseEditForm({ ...courseEditForm, credit: parseFloat(e.target.value) || 0 })} placeholder="学分" className="px-2 py-1 border rounded text-sm" />
                    <input value={courseEditForm.department} onChange={e => setCourseEditForm({ ...courseEditForm, department: e.target.value })} placeholder="院系" className="px-2 py-1 border rounded text-sm" />
                    <input value={courseEditForm.search_keywords} onChange={e => setCourseEditForm({ ...courseEditForm, search_keywords: e.target.value })} placeholder="搜索关键词" className="px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingCourseId(null)} className="px-3 py-1 text-slate-500 text-sm">取消</button>
                    <button onClick={saveCourseEdit} className="px-3 py-1 bg-cyan-500 text-white rounded text-sm">保存</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.is_legacy ? 'bg-amber-100 text-amber-600' : 'bg-cyan-100 text-cyan-600'}`}>{c.code}</span>
                        <span className="font-bold text-slate-800">{c.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{c.teacher_name || '未知教师'} · {c.department || '未知院系'} · {c.credit}学分</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-500">{c.review_avg?.toFixed(1) || '-'}</p>
                      <p className="text-xs text-slate-400">{c.review_count}条评价</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end text-xs">
                    <button onClick={() => (setEditingCourseId(c.id), setCourseEditForm({ code: c.code, name: c.name, credit: c.credit, department: c.department || '', teacher_name: c.teacher_name || '', search_keywords: c.search_keywords || '' }))} className="px-2 py-1 bg-slate-100 rounded">编辑</button>
                    <button onClick={() => deleteCourse(c.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded">删除</button>
                  </div>
                </>
              )}
            </GlassCard>
          ))}

          {courseTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => fetchCourses(coursePage - 1)} disabled={coursePage <= 1} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm">{coursePage}/{courseTotalPages}</span>
              <button onClick={() => fetchCourses(coursePage + 1)} disabled={coursePage >= courseTotalPages} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <GlassCard hover={false} className="!p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">站点设置</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div>
                <h3 className="font-semibold text-slate-800">乌龙茶站点评论显示</h3>
                <p className="text-sm text-slate-500 mt-1">开启后，课程详情页将显示乌龙茶历史评论数据</p>
              </div>
              <button
                onClick={() => updateShowLegacy(!showLegacyReviews)}
                className={`relative w-14 h-7 rounded-full transition-colors ${showLegacyReviews ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${showLegacyReviews ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
