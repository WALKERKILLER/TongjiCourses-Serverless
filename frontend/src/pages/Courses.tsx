import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchCourses, fetchDepartments } from '../services/api'
import GlassCard from '../components/GlassCard'
import Logo from '../components/Logo'
import FilterPanel, { FilterState } from '../components/FilterPanel'

interface CourseItem {
  id: number
  code: string
  name: string
  rating: number
  review_count: number
  teacher_name: string
  semesters?: string[]
  department?: string
  credit?: number
  is_legacy?: number
}

export default function Courses() {
  const location = useLocation()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false) // 用于区分用户主动搜索和自动加载
  const [error, setError] = useState('')
  const [showLegacy, setShowLegacy] = useState(() => {
    try {
      return localStorage.getItem('yourtj_show_legacy_docs') === '1'
    } catch {
      return false
    }
  })
  const [docReady, setDocReady] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [departments, setDepartments] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterState>({
    selectedDepartments: [],
    onlyWithReviews: false,
    courseName: '',
    courseCode: '',
    teacherCode: '',
    teacherName: '',
    campus: '',
  })

  const search = async (_legacy?: boolean, p = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCourses(keyword, undefined, p, 20, {
        departments: filters.selectedDepartments,
        onlyWithReviews: filters.onlyWithReviews,
        courseName: filters.courseName,
        courseCode: filters.courseCode,
        teacherCode: filters.teacherCode,
        teacherName: filters.teacherName,
        campus: filters.campus
      })
      setCourses(Array.isArray(data.data) ? data.data : [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setPage(p)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
      setError('加载失败，请重试')
      setCourses([])
    } finally {
      setLoading(false)
      setIsSearching(false) // 重置搜索状态
    }
  }

  // 加载开课单位列表
  const loadDepartments = async (_legacy?: boolean) => {
    try {
      const data = await fetchDepartments(undefined)
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  // 筛选变化时重新搜索
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setPage(1)
  }

  // 监听筛选变化
  useEffect(() => {
    search(undefined, 1)
  }, [filters])

  // 打开开关后一会再加载文档 iframe，避免一闪而过
  useEffect(() => {
    if (!showLegacy) {
      setDocReady(false)
      return
    }
    setDocReady(false)
    const t = setTimeout(() => setDocReady(true), 900)
    return () => clearTimeout(t)
  }, [showLegacy])

  // 每次返回首页时刷新数据和开课单位列表
  useEffect(() => {
    if (location.pathname === '/') {
      search()
      loadDepartments()
    }
  }, [location.key])

  const toggleLegacy = () => {
    const newValue = !showLegacy
    setShowLegacy(newValue)
    try {
      localStorage.setItem('yourtj_show_legacy_docs', newValue ? '1' : '0')
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* 筛选面板 */}
      <FilterPanel
        value={filters}
        departments={departments}
        onFilterChange={handleFilterChange}
      />

      {/* Search Hero Section */}
      <GlassCard className="bg-gradient-to-r from-cyan-50 to-white min-h-[160px] flex flex-col justify-center relative overflow-hidden" hover={false}>
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <svg className="w-32 h-32 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">探索同济大学精彩课程</h2>
          <p className="text-sm md:text-base text-slate-500 mb-5">不记名，自由，简洁，高效的选课社区</p>

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
              onClick={() => {
                setIsSearching(true)
                search()
              }}
              disabled={loading}
              className="bg-slate-800 text-white px-4 md:px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {loading && isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {/* Legacy Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-500">查询旧乌龙茶文档：</span>
            <button
              onClick={toggleLegacy}
              className={`relative w-12 h-6 rounded-full transition-colors ${showLegacy ? 'bg-cyan-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${showLegacy ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-semibold ${showLegacy ? 'text-cyan-600' : 'text-slate-400'}`}>
              {showLegacy ? '是' : '否'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* WLC Doc Embed (avoid backdrop-filter wrapper to keep iframe interactions reliable on mobile) */}
      {showLegacy && (
        <div className="bg-white border border-slate-200 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.12)] rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="text-sm font-extrabold text-slate-800">旧乌龙茶文档</div>
            <button
              type="button"
              onClick={toggleLegacy}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-extrabold hover:bg-slate-50"
            >
              收起
            </button>
          </div>
          <div className="p-3">
            {!docReady ? (
              <div className="h-[70vh] md:h-[78vh] flex items-center justify-center text-slate-500 font-semibold">
                正在加载文档…
              </div>
            ) : (
              <iframe
                title="乌龙茶课程评价文档"
                src="/wlcdoc/"
                className="w-full h-[70vh] md:h-[78vh] rounded-2xl bg-white border border-slate-200"
                style={{ pointerEvents: 'auto' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Logo size={60} animate />
          <p className="mt-4 text-slate-500">加载中...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => search()}
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
            <h3 className="text-xl font-bold text-slate-800">
              课程列表
            </h3>
            <span className="text-sm text-slate-400">共 {total} 门课程</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}>
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 180px' }}
              >
                <GlassCard className="h-[180px] flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md border ${course.is_legacy ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-cyan-600 bg-cyan-50 border-cyan-100'}`}>
                        {course.code}
                      </span>
                      {course.rating > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                          <span className="text-amber-500 font-bold text-sm">{course.rating?.toFixed(1)}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <div key={s} className={`w-1.5 h-1.5 rounded-full mx-[1px] ${s <= Math.round(course.rating || 0) ? 'bg-amber-400' : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">无评分</span>
                      )}
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1 group-hover:text-cyan-700 transition-colors line-clamp-1">
                      {course.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{course.teacher_name || '未知教师'}</p>
                    {Array.isArray(course.semesters) && course.semesters.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {course.semesters.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {s}
                          </span>
                        ))}
                        {course.semesters.length > 4 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                            +{course.semesters.length - 4}
                          </span>
                        )}
                      </div>
                    )}
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
              <p className="text-slate-400">
                没有找到相关课程，换个关键词试试？
              </p>
            </div>
          )}

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                onClick={() => search(undefined, page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => search(undefined, page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
