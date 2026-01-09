import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses } from '../services/api'

interface CourseItem {
  id: number
  code: string
  name: string
  rating: number
  review_count: number
  teacher_name: string
}

export default function Courses() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCourses(keyword)
      setCourses(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch courses:', err)
      setError('加载失败，请重试')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [])

  return (
    <div>
      <div className="search-box">
        <input
          placeholder="搜索课程名、课号或教师..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button className="btn btn-primary" onClick={search} disabled={loading}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#666' }}>加载中...</p>}

      {error && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#d32f2f', marginBottom: '10px' }}>{error}</p>
          <button className="btn btn-primary" onClick={search}>重新加载</button>
        </div>
      )}

      {!loading && !error && courses.map(c => (
        <div key={c.id} className="card course-item">
          <div>
            <Link to={`/course/${c.id}`} style={{ fontWeight: 'bold' }}>{c.code} - {c.name}</Link>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              {c.teacher_name || '未知教师'} · {c.review_count} 条点评
            </div>
          </div>
          <span className="rating">★ {c.rating?.toFixed(1) || '-'}</span>
        </div>
      ))}

      {!loading && !error && courses.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999' }}>暂无课程数据</p>
      )}
    </div>
  )
}
