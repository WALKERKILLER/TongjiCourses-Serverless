type ArrangementInfo = {
  arrangementText: string
  occupyDay: number | null
  occupyTime: number[] | null
  occupyWeek: number[] | null
  occupyRoom: string | null
  teacherAndCode: string | null
}

const DAY_MAP: Record<string, number> = {
  '星期一': 1,
  '星期二': 2,
  '星期三': 3,
  '星期四': 4,
  '星期五': 5,
  '星期六': 6,
  '星期日': 7
}

function timeTextToArray(text: string): number[] {
  const raw = text.endsWith('节') ? text.slice(0, -1) : text
  const [start, end] = raw.split('-').map((v) => parseInt(v, 10))
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return []
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

function weekTextToArray(text: string): number[] {
  // Examples:
  // - "1-16"
  // - "1-15周(单)"
  // - "2-14周(双) 15-16"
  const parts = text.split(' ').map((s) => s.trim()).filter(Boolean)
  const out: number[] = []

  for (const part0 of parts) {
    const part = part0.replace(/周/g, '')
    const parity: 'odd' | 'even' | null =
      part.includes('单') ? 'odd' : part.includes('双') ? 'even' : null

    const cleaned = part.replace(/[()（）]/g, '').replace(/[单双]/g, '').trim()
    if (!cleaned) continue

    if (!cleaned.includes('-')) {
      const n = parseInt(cleaned, 10)
      if (Number.isFinite(n)) out.push(n)
      continue
    }

    const [aRaw, bRaw] = cleaned.split('-')
    const a = parseInt(aRaw, 10)
    const b = parseInt(bRaw, 10)
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b < a) continue

    const step = parity ? 2 : 1
    let start = a
    if (parity === 'odd' && start % 2 === 0) start++
    if (parity === 'even' && start % 2 === 1) start++
    for (let i = start; i <= b; i += step) out.push(i)
  }

  // Dedup + sort for stable UI
  return Array.from(new Set(out)).sort((x, y) => x - y)
}

export function splitEndline(text: string): string[] {
  return (text || '').split('\n').map((s) => s.trim()).filter(Boolean)
}

export function arrangementTextToObj(text: string): ArrangementInfo {
  if (!text || !text.trim()) {
    return {
      arrangementText: '',
      occupyDay: null,
      occupyTime: null,
      occupyWeek: null,
      occupyRoom: null,
      teacherAndCode: null
    }
  }

  const idx = text.indexOf(' 星期')
  const teacherAndCode = idx >= 0 ? text.slice(0, idx).trim() : null
  const rest = idx >= 0 ? text.slice(idx + 1).trim() : text.trim() // remove leading space

  const dayMatch = rest.match(/^(星期[一二三四五六日])/)
  const dayText = dayMatch?.[1] || ''
  const occupyDay = DAY_MAP[dayText] ?? null

  const timeMatch = rest.match(/^星期[一二三四五六日]([0-9]{1,2}-[0-9]{1,2}节)/)
  const occupyTime = timeMatch ? timeTextToArray(timeMatch[1]) : null

  const weekMatch = rest.match(/\[([^\]]+)\]/)
  const occupyWeek = weekMatch ? weekTextToArray(weekMatch[1]) : null

  // room after "] "
  let occupyRoom: string | null = null
  const roomIdx = rest.indexOf('] ')
  if (roomIdx >= 0) occupyRoom = rest.slice(roomIdx + 2).trim() || null

  return {
    arrangementText: rest,
    occupyDay,
    occupyTime,
    occupyWeek,
    occupyRoom,
    teacherAndCode
  }
}

export function parseMajorString(major: string): { grade: number | null; code: string | null; name: string } {
  const name = String(major || '').trim()
  const gradeRaw = name.slice(0, 4)
  const grade = /^[0-9]{4}$/.test(gradeRaw) ? parseInt(gradeRaw, 10) : null

  // Example:
  // - "2025(03074 土木工程(国际班))"
  // - "2025(WF00020204 ... )"
  const m = name.match(/\(([0-9A-Za-z]{3,16})\s/)
  const code = m?.[1] || null

  return { grade, code, name }
}

export function optCourseQueryListGenerator(day: number, section: number): string[] | null {
  // section: 1..6 (pk 的行分组)
  const dayText = Object.keys(DAY_MAP).find((k) => DAY_MAP[k] === day)
  if (!dayText) return null

  if ([1, 2, 3, 4].includes(section)) {
    return [`%${dayText}${2 * section - 1}-${2 * section}%`]
  }
  if (section === 5) {
    return [`%${dayText}9-%`]
  }
  if (section === 6) {
    return [`%${dayText}10-11%`, `%${dayText}10-12%`]
  }
  return null
}
