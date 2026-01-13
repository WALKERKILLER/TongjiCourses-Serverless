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

export async function fetchCourses(
  keyword?: string,
  legacy?: boolean,
  page = 1,
  limit = 20,
  departments?: string[],
  onlyWithReviews?: boolean
) {
  let url = `${API_BASE}/api/courses?page=${page}&limit=${limit}&`
  if (keyword) url += `q=${encodeURIComponent(keyword)}&`
  if (legacy) url += `legacy=true&`
  if (departments && departments.length > 0) {
    url += `departments=${encodeURIComponent(departments.join(','))}&`
  }
  if (onlyWithReviews) url += `onlyWithReviews=true&`
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

export async function fetchCourse(id: string) {
  const res = await fetchWithTimeout(`${API_BASE}/api/course/${id}`, undefined, 15000)
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
}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }, 15000)
  if (!res.ok) throw new Error('Failed to submit review')
  return res.json()
}
