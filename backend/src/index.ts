import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  TURNSTILE_SECRET: string
  ADMIN_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'x-admin-secret'],
  allowMethods: ['POST', 'GET', 'DELETE', 'OPTIONS']
}))

// 全局错误处理
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: err.message || 'Internal Server Error' }, 500)
})

async function verifyTurnstile(token: string, secret: string, ip: string) {
  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  formData.append('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    body: formData,
    method: 'POST'
  })
  const outcome = await res.json() as { success: boolean }
  return outcome.success
}

// 公开 API
app.get('/api/courses', async (c) => {
  try {
    const keyword = c.req.query('q')
    let query = `
      SELECT c.id, c.code, c.name, c.review_avg as rating, c.review_count, t.name as teacher_name
      FROM courses c
      LEFT JOIN teachers t ON c.main_teacher_id = t.id
    `
    let params: string[] = []

    if (keyword) {
      query += ' WHERE c.search_keywords LIKE ? OR c.code LIKE ? OR c.name LIKE ?'
      const likeKey = `%${keyword}%`
      params = [likeKey, likeKey, likeKey]
    }

    query += ' ORDER BY c.review_count DESC LIMIT 50'
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json(results || [])
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/course/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const course = await c.env.DB.prepare(
      `SELECT c.*, t.name as teacher_name FROM courses c
       LEFT JOIN teachers t ON c.main_teacher_id = t.id
       WHERE c.id = ?`
    ).bind(id).first()

    if (!course) return c.json({ error: 'Course not found' }, 404)

    const reviews = await c.env.DB.prepare(
      `SELECT * FROM reviews WHERE course_id = ? AND is_hidden = 0 ORDER BY created_at DESC`
    ).bind(id).all()

    return c.json({ ...course, reviews: reviews.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/api/review', async (c) => {
  const body = await c.req.json()
  const { course_id, rating, comment, semester, turnstile_token } = body

  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1'
  if (!(await verifyTurnstile(turnstile_token, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: 'Invalid captcha' }, 403)
  }

  await c.env.DB.prepare(
    `INSERT INTO reviews (course_id, rating, comment, semester) VALUES (?, ?, ?, ?)`
  ).bind(course_id, rating, comment, semester).run()

  // 更新课程统计
  await c.env.DB.prepare(`
    UPDATE courses SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE course_id = ? AND is_hidden = 0),
      review_avg = (SELECT AVG(rating) FROM reviews WHERE course_id = ? AND is_hidden = 0)
    WHERE id = ?
  `).bind(course_id, course_id, course_id).run()

  return c.json({ success: true })
})

// 管理 API
const admin = new Hono<{ Bindings: Bindings }>()

admin.use('/*', async (c, next) => {
  const input = c.req.header('x-admin-secret')
  if (!input || input !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

admin.get('/reviews', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT r.*, c.name as course_name, c.code
      FROM reviews r
      JOIN courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 100
    `).all()
    return c.json(results || [])
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

admin.post('/review/:id/toggle', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE reviews SET is_hidden = NOT is_hidden WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

admin.delete('/review/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

app.route('/api/admin', admin)

export default app
