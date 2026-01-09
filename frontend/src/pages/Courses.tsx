import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses } from '../services/api'
import GlassCard from '../components/GlassCard'

interface CourseItem {
  id: number
  code: string
  name: string
  rating: number
  review_count: number
  teacher_name: string
  department?: string
  credit?: number
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
    <div className="space-y-6">
      {/* Search Hero Section */}
      <GlassCard className="bg-gradient-to-r from-cyan-50 to-white min-h-[160px] flex flex-col justify-center relative overflow-hidden" hover={false}>
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <svg className="w-32 h-32 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">探索同济大学精彩课程</h2>
          <p className="text-sm md:text-base text-slate-500 mb-5">发现好课、避雷水课，查阅真实评价</p>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-cyan-100 focus-within:ring-2 focus-within:ring-cyan-400 transition-shadow">
            <svg className="text-slate-400 ml-2 shrink-0 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索课程名、代码或教师..."
              className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 h-10 min-w-0"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
            <button
              onClick={search}
              disabled={loading}
              className="bg-slate-800 text-white px-4 md:px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10 text-slate-500">加载中...</div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={search}
            className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      )}

      {/* Course List */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">课程列表</h3>
            <span className="text-sm text-slate-400">{courses.length} 门课程</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/course/${course.id}`}>
                <GlassCard className="min-h-[160px] flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100">
                        {course.code}
                      </span>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                        <span className="text-amber-500 font-bold text-sm">{course.rating?.toFixed(1) || '-'}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <div key={s} className={`w-1.5 h-1.5 rounded-full mx-[1px] ${s <= Math.round(course.rating || 0) ? 'bg-amber-400' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1 group-hover:text-cyan-700 transition-colors line-clamp-1">
                      {course.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{course.teacher_name || '未知教师'}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400">{course.review_count} 条评价</span>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-cyan-600 transition-colors flex items-center">
                      详细信息
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>

          {courses.length === 0 && (
            <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-400">没有找到相关课程，换个关键词试试？</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
