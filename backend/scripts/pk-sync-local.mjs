import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq !== -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1)
      continue
    }
    const k = a.slice(2)
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
    out[k] = v
  }
  return out
}

function loadDevVars(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const map = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const l = line.trim()
    if (!l || l.startsWith('#')) continue
    const idx = l.indexOf('=')
    if (idx <= 0) continue
    const k = l.slice(0, idx).trim()
    const v = l.slice(idx + 1)
    map[k] = v
  }
  return map
}

const args = parseArgs(process.argv.slice(2))

function parseNpmForwardedArgs() {
  const s = process.env.npm_config_argv
  if (!s) return {}
  try {
    const j = JSON.parse(s)
    const original = Array.isArray(j?.original) ? j.original : []
    const idx = original.indexOf('--')
    if (idx >= 0) return parseArgs(original.slice(idx + 1))
  } catch {
    // ignore
  }
  return {}
}

const npmArgs = parseNpmForwardedArgs()
const mergedArgs = { ...npmArgs, ...args }

const baseUrl = String(mergedArgs.baseUrl || 'http://127.0.0.1:8787').replace(/\/+$/, '')
const envCalendar =
  process.env.CALENDAR_ID ||
  process.env.CALENDAR ||
  process.env.npm_config_calendarid ||
  process.env.npm_config_calendarId ||
  process.env.npm_config_calendar ||
  ''
const envDepth = process.env.DEPTH || process.env.npm_config_depth || ''

const calendarId = Number(mergedArgs.calendarId || mergedArgs.calendar || envCalendar || '')
const depth = Number(mergedArgs.depth || envDepth || 1)

if (!Number.isFinite(calendarId) || calendarId <= 0) {
  console.error('Missing/invalid --calendarId (e.g. --calendarId=121)')
  console.error('Tip (PowerShell): if npm does not forward args, try:')
  console.error('  node ./scripts/pk-sync-local.mjs --calendarId=121 --depth=1')
  console.error('or:')
  console.error('  npm run pk:sync:local --calendarId=121 --depth=1')
  process.exit(1)
}

const devVarsPath = path.join(process.cwd(), '.dev.vars')
const devVars = loadDevVars(devVarsPath)
const adminSecret = String(args.adminSecret || process.env.ADMIN_SECRET || devVars.ADMIN_SECRET || '')
const onesystemCookie = String(
  mergedArgs.onesystemCookie ||
    mergedArgs.cookie ||
    process.env.ONESYSTEM_COOKIE ||
    devVars.ONESYSTEM_COOKIE ||
    ''
).trim()

if (!adminSecret) {
  console.error('Missing ADMIN_SECRET. Provide --adminSecret=... or set it in .dev.vars')
  process.exit(1)
}

const url = `${baseUrl}/api/admin/pk/sync`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-admin-secret': adminSecret,
  },
  body: JSON.stringify({ calendarId, depth, onesystemCookie: onesystemCookie || undefined }),
})

const text = await res.text()
if (!res.ok) {
  console.error(`Sync failed: HTTP ${res.status}`)
  console.error(text.slice(0, 2000))
  process.exit(1)
}

console.log(text)
