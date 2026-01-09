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

export async function fetchCourses(keyword?: string) {
  const url = keyword ? `${API_BASE}/api/courses?q=${encodeURIComponent(keyword)}` : `${API_BASE}/api/courses`
  const res = await fetchWithTimeout(url, undefined, 15000)
  if (!res.ok) throw new Error('Failed to fetch courses')
  const data = await res.json()
  return Array.isArray(data) ? data : []
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
}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }, 15000)
  if (!res.ok) throw new Error('Failed to submit review')
  return res.json()
}
