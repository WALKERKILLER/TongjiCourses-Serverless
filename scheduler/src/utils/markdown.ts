import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function renderMarkdown(md: string): string {
  const raw = typeof md === 'string' ? md : ''
  const html = marked.parse(raw) as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

