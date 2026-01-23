import { useEffect, useState } from 'react'
import GlassCard from '../components/GlassCard'

export default function Schedule() {
  const [loaded, setLoaded] = useState(false)
  const [simExists, setSimExists] = useState<boolean | null>(null)
  const simUrl = '/sim/index.html'

  useEffect(() => {
    setLoaded(false)
    fetch(simUrl, { method: 'HEAD' })
      .then((r) => setSimExists(r.ok))
      .catch(() => setSimExists(false))
  }, [simUrl])

  return (
    <div className="w-full">
      {simExists === false && (
        <GlassCard hover={false}>
          <div className="text-sm text-slate-700 font-semibold mb-1">排课模拟器资源未生成</div>
          <div className="text-xs text-slate-500">
            本地开发请先运行 `npm run dev:with-sim`（会自动构建 scheduler 的 /sim 静态文件）
          </div>
        </GlassCard>
      )}
      <div className="flex items-center justify-between gap-3 px-1 mb-3">
        <div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">排课模拟器</h2>
          <p className="text-xs md:text-sm text-slate-500">桌面端右侧弹窗查看评价；移动端右侧滑入扇面卡片</p>
        </div>
        <a
          className="text-xs md:text-sm font-semibold text-cyan-700 hover:text-cyan-800 underline underline-offset-4 whitespace-nowrap"
          href={simUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          新窗口打开
        </a>
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden border border-white/50 bg-white/70 shadow-lg shadow-cyan-900/5">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            正在加载排课模拟器...
          </div>
        )}
        <iframe
          title="Schedule Simulator"
          src={simUrl}
          className="w-full h-[calc(100vh-220px)] md:h-[calc(100vh-220px)] bg-white"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
