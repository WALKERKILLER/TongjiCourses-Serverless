import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchCourse } from '../services/api'

interface Review {
  id: number
  rating: number
  comment: string
  semester: string
  created_at: number
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
  reviews: Review[]
}

export default function Course() {
  const { id } = useParams()
  const [course, setCourse] = useState<CourseData | null>(null)

  useEffect(() => {
    if (id) fetchCourse(id).then(setCourse)
  }, [id])

  if (!course) return <p>加载中...</p>

  return (
    <div>
      <div className="card">
        <h2>{course.code} - {course.name}</h2>
        <p style={{ color: '#666', margin: '8px 0' }}>
          {course.teacher_name || '未知教师'} · {course.credit} 学分 · {course.department}
        </p>
        <p>
          <span className="rating">★ {course.review_avg?.toFixed(1) || '-'}</span>
          <span style={{ marginLeft: '12px', color: '#666' }}>{course.review_count} 条点评</span>
        </p>
        <Link to={`/write-review/${course.id}`} className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-block' }}>
          写点评
        </Link>
      </div>

      <h3 style={{ margin: '20px 0 12px' }}>课程点评</h3>
      {course.reviews?.map(r => (
        <div key={r.id} className="card review-item">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="rating">★ {r.rating}</span>
            <span style={{ fontSize: '12px', color: '#999' }}>{r.semester}</span>
          </div>
          <p style={{ marginTop: '8px' }}>{r.comment}</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            {new Date(r.created_at * 1000).toLocaleString()}
          </p>
        </div>
      ))}

      {(!course.reviews || course.reviews.length === 0) && (
        <p style={{ textAlign: 'center', color: '#999' }}>暂无点评</p>
      )}
    </div>
  )
}
