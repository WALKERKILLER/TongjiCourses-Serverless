import { useState, useEffect, useRef } from 'react'
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
  const [showLegacyDocs, setShowLegacyDocs] = useState(() => {
    try {
      return localStorage.getItem('yourtj_show_legacy_docs') === '1'
    } catch {
      return false
    }
  })
  const [legacyLoaded, setLegacyLoaded] = useState(false)
  const [legacyReady, setLegacyReady] = useState(false)
  const [legacyProgress, setLegacyProgress] = useState(0)
  const [legacyIsFirstOpen, setLegacyIsFirstOpen] = useState(() => {
    try {
      return localStorage.getItem('yourtj_wlc_first_ready') !== '1'
    } catch {
      return true
    }
  })
  const legacyIframeRef = useRef<HTMLIFrameElement | null>(null)
  const legacyUrl = '/wlc/'

  const openLegacyDocsInNewWindow = () => {
    window.open(legacyUrl, '_blank', 'noopener,noreferrer')
  }
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpValue, setJumpValue] = useState('')
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
      setJumpOpen(false)
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

  const applyJump = () => {
    const v = Number(jumpValue)
    if (!Number.isFinite(v)) return
    const p = Math.max(1, Math.min(totalPages || 1, Math.trunc(v)))
    if (p !== page) search(undefined, p)
    setJumpOpen(false)
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

  useEffect(() => {
    if (!showLegacyDocs) {
      setLegacyLoaded(false)
      setLegacyReady(false)
      setLegacyProgress(0)
      return
    }
    setLegacyLoaded(false)
    setLegacyReady(false)
    setLegacyProgress(0)
  }, [showLegacyDocs])

  useEffect(() => {
    if (!showLegacyDocs) return
    if (!legacyIsFirstOpen) return

    let p = 0
    setLegacyProgress(0)

    const t = setInterval(() => {
      // ease-in to ~92% while waiting for the actual "ready" signal
      const target = 92
      const step = Math.max(0.6, (target - p) * 0.12)
      p = Math.min(target, p + step)
      setLegacyProgress(p)
    }, 120)

    return () => clearInterval(t)
  }, [showLegacyDocs, legacyIsFirstOpen])

  useEffect(() => {
    if (!showLegacyDocs) return
    if (!legacyLoaded) return

    let tries = 0
    const t = setInterval(() => {
      tries += 1
      const doc = legacyIframeRef.current?.contentDocument
      if (doc?.querySelector('.DocSearch-Button')) {
        clearInterval(t)
        setLegacyReady(true)
        setLegacyProgress(100)
        if (legacyIsFirstOpen) {
          setLegacyIsFirstOpen(false)
          try {
            localStorage.setItem('yourtj_wlc_first_ready', '1')
          } catch {
            // ignore
          }
        }
        return
      }
      if (tries > 160) {
        // give up after ~40s; keep showing loading state
        clearInterval(t)
      }
    }, 250)

    return () => clearInterval(t)
  }, [showLegacyDocs, legacyLoaded, legacyIsFirstOpen])

  // 每次返回首页时刷新数据和开课单位列表
  useEffect(() => {
    if (location.pathname === '/') {
      search()
      loadDepartments()
    }
  }, [location.key])

  const toggleLegacyDocs = () => {
    setShowLegacyDocs((v) => {
      const nv = !v
      try {
        localStorage.setItem('yourtj_show_legacy_docs', nv ? '1' : '0')
      } catch {
        // ignore
      }
      return nv
    })
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

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLegacyDocs}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-50"
            >
              查询旧乌龙茶文档
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16m-1 5H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v4" />
              </svg>
            </button>
          </div>
        </div>
      </GlassCard>

      {showLegacyDocs && (
        <div className="bg-white border border-slate-200 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.12)] rounded-3xl overflow-hidden">
          {legacyIsFirstOpen && !legacyReady && (
            <div className="px-5 pt-5">
              <div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/90">
                <div className="px-4 py-3 text-sm font-semibold text-orange-800">
                  首次加载乌龙茶文档需要一段时间，请耐心等待，当看到“搜索课程或教师”的搜索框时即可正常使用
                </div>
                <div className="relative h-2 bg-orange-100/70">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 wlc-wave"
                    style={{ width: `${Math.max(0, Math.min(100, legacyProgress))}%` }}
                  />
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="md:hidden absolute top-1/2 -translate-y-1/2 w-4 h-4 drop-shadow"
                    style={{ left: `calc(${Math.max(10, Math.min(100, legacyProgress))}% - 10px)` }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="text-sm font-extrabold text-slate-800">旧乌龙茶文档</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openLegacyDocsInNewWindow}
                className="text-xs md:text-sm font-semibold text-cyan-700 hover:text-cyan-800 underline underline-offset-4 whitespace-nowrap"
              >
                新窗口打开
              </button>
              <button
                type="button"
                onClick={toggleLegacyDocs}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-extrabold hover:bg-slate-50"
              >
                收起
              </button>
            </div>
          </div>
          <div className="relative w-full bg-white">
            {!legacyLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                正在加载文档…
              </div>
            )}
            <iframe
              title="乌龙茶课程评价文档"
              src={legacyUrl}
              className="w-full h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] bg-white"
              ref={legacyIframeRef}
              onLoad={() => setLegacyLoaded(true)}
            />
          </div>
          <style>{`
            @keyframes wlcWaveMove {
              0% { background-position: 0 0; }
              100% { background-position: 40px 0; }
            }
            .wlc-wave {
              background-image: repeating-linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.40) 0px,
                rgba(255, 255, 255, 0.40) 10px,
                rgba(255, 255, 255, 0.00) 10px,
                rgba(255, 255, 255, 0.00) 20px
              );
              background-size: 40px 40px;
              animation: wlcWaveMove 1.1s linear infinite;
            }
          `}</style>
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
            <div className="flex justify-center items-center gap-2 pt-2">
              <button
                onClick={() => search(undefined, page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <div className="flex items-center gap-2 text-slate-600">
                {jumpOpen ? (
                  <input
                    value={jumpValue}
                    onChange={(e) => setJumpValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyJump()
                      if (e.key === 'Escape') setJumpOpen(false)
                    }}
                    onBlur={() => setJumpOpen(false)}
                    inputMode="numeric"
                    type="number"
                    min={1}
                    max={totalPages}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-center font-semibold outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={String(page)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setJumpValue(String(page))
                      setJumpOpen(true)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-center font-bold hover:bg-slate-50"
                    title="跳转到指定页码"
                  >
                    {page}
                  </button>
                )}
                <span className="font-semibold">/</span>
                <span className="font-semibold">{totalPages}</span>
              </div>
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
