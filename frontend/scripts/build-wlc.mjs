import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')
const repoDir = path.resolve(frontendDir, '..')
const wlcDir = path.join(repoDir, 'wlc')
const wlcDistDir = path.join(wlcDir, '.vitepress', 'dist')
const destDir = path.join(frontendDir, 'public', 'wlc')

const npmCmd = 'npm'

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true })
  if (res.error) throw res.error
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${res.status}`)
}

if (!fs.existsSync(wlcDir)) {
  console.error(`[build:wlc] Missing docs source dir: ${wlcDir}`)
  process.exit(1)
}

run(npmCmd, ['install'], wlcDir)
run(npmCmd, ['run', 'build'], wlcDir)

if (!fs.existsSync(wlcDistDir)) {
  console.error(`[build:wlc] Missing build output dir: ${wlcDistDir}`)
  process.exit(1)
}

fs.rmSync(destDir, { recursive: true, force: true })
fs.mkdirSync(destDir, { recursive: true })
fs.cpSync(wlcDistDir, destDir, { recursive: true })

console.log(`[build:wlc] Copied ${wlcDistDir} -> ${destDir}`)
