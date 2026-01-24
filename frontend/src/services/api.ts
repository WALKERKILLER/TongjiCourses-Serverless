const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchWithTimeout(url: string, options?: RequestInit, timeout = 15000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

export type CourseAdvancedFilters = {
  departments?: string[]
  onlyWithReviews?: boolean
  courseName?: string
  courseCode?: string
  teacherName?: string
  teacherCode?: string
  campus?: string
  faculty?: string
}

export async function fetchCourses(
  keyword?: string,
  legacy?: boolean,
  page = 1,
  limit = 20,
  filters?: CourseAdvancedFilters
) {
  let url = `${API_BASE}/api/courses?page=${page}&limit=${limit}&`
  if (keyword) url += `q=${encodeURIComponent(keyword)}&`
  if (legacy) url += `legacy=true&`
  if (filters?.departments && filters.departments.length > 0) url += `departments=${encodeURIComponent(filters.departments.join(','))}&`
  if (filters?.onlyWithReviews) url += `onlyWithReviews=true&`
  if (filters?.courseName) url += `courseName=${encodeURIComponent(filters.courseName)}&`
  if (filters?.courseCode) url += `courseCode=${encodeURIComponent(filters.courseCode)}&`
  if (filters?.teacherName) url += `teacherName=${encodeURIComponent(filters.teacherName)}&`
  if (filters?.teacherCode) url += `teacherCode=${encodeURIComponent(filters.teacherCode)}&`
  if (filters?.campus) url += `campus=${encodeURIComponent(filters.campus)}&`
  if (filters?.faculty) url += `faculty=${encodeURIComponent(filters.faculty)}&`
  const res = await fetchWithTimeout(url, undefined, 15000)
  if (!res.ok) throw new Error('Failed to fetch courses')
  return res.json()
}

export async function fetchDepartments(legacy?: boolean) {
  let url = `${API_BASE}/api/departments?`
  if (legacy) url += `legacy=true`
  const res = await fetchWithTimeout(url, undefined, 15000)
  if (!res.ok) throw new Error('Failed to fetch departments')
  return res.json()
}

export async function fetchCourse(id: string, opts?: { clientId?: string }) {
  const q = opts?.clientId ? `?clientId=${encodeURIComponent(opts.clientId)}` : ''
  const res = await fetchWithTimeout(`${API_BASE}/api/course/${id}${q}`, undefined, 15000)
  if (!res.ok) throw new Error('Failed to fetch course')
  return res.json()
}

export async function submitReview(data: {
  course_id: number
  rating: number
  comment: string
  semester: string
  turnstile_token: string
  reviewer_name?: string
  reviewer_avatar?: string
  walletUserHash?: string
}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }, 15000)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    try {
      const json = JSON.parse(text)
      throw new Error(json?.error || json?.message || `提交失败 (HTTP ${res.status})`)
    } catch {
      throw new Error(text || `提交失败 (HTTP ${res.status})`)
    }
  }
  return res.json()
}

export async function likeReview(reviewId: number, clientId: string) {
  const res = await fetchWithTimeout(`${API_BASE}/api/review/${reviewId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId })
  }, 15000)
  if (!res.ok) throw new Error('Failed to like review')
  return res.json()
}

export async function unlikeReview(reviewId: number, clientId: string) {
  const res = await fetchWithTimeout(`${API_BASE}/api/review/${reviewId}/like`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId })
  }, 15000)
  if (!res.ok) throw new Error('Failed to unlike review')
  return res.json()
}
