import { useEffect, useMemo, useState } from 'react'

export interface FilterState {
  selectedDepartments: string[]
  onlyWithReviews: boolean
}

interface FilterPanelProps {
  value: FilterState
  onFilterChange: (filters: FilterState) => void
  departments: string[]
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr))
}

export default function FilterPanel({ value, onFilterChange, departments }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<FilterState>(value)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setDraft(value)
  }, [value.onlyWithReviews, value.selectedDepartments.join('|')])

  const activeCount = (value.onlyWithReviews ? 1 : 0) + value.selectedDepartments.length

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [departments])

  const filteredDepartments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sortedDepartments
    return sortedDepartments.filter((d) => d.toLowerCase().includes(q))
  }, [searchTerm, sortedDepartments])

  const toggleDepartment = (dept: string) => {
    setDraft((prev) => {
      const exists = prev.selectedDepartments.includes(dept)
      const next = exists ? prev.selectedDepartments.filter((d) => d !== dept) : [...prev.selectedDepartments, dept]
      return { ...prev, selectedDepartments: next }
    })
  }

  const removeDepartment = (dept: string) => {
    setDraft((prev) => ({ ...prev, selectedDepartments: prev.selectedDepartments.filter((d) => d !== dept) }))
  }

  const apply = () => {
    onFilterChange({
      selectedDepartments: uniq(draft.selectedDepartments),
      onlyWithReviews: !!draft.onlyWithReviews
    })
    setIsOpen(false)
  }

  const resetAndApply = () => {
    const cleared: FilterState = { selectedDepartments: [], onlyWithReviews: false }
    setDraft(cleared)
    setSearchTerm('')
    onFilterChange(cleared)
    setIsOpen(false)
  }

  const filterIcon = (
    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5h18M6 12h12M10 19h4"
      />
    </svg>
  )

  const content = (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-800">高级筛选</div>
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          onClick={() => setIsOpen(false)}
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">只看有评价的课程</div>
            <div className="text-[11px] text-slate-500 truncate">过滤掉暂无评价的课程条目</div>
          </div>
          <input
            type="checkbox"
            checked={draft.onlyWithReviews}
            onChange={(e) => setDraft((p) => ({ ...p, onlyWithReviews: e.target.checked }))}
            className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-slate-800">开课单位</div>
          {draft.selectedDepartments.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft((p) => ({ ...p, selectedDepartments: [] }))}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800"
            >
              清空
            </button>
          )}
        </div>

        <div className="mt-2">
          <input
            type="text"
            placeholder="搜索单位..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none bg-white"
          />
        </div>

        {draft.selectedDepartments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.selectedDepartments.slice(0, 8).map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => removeDepartment(dept)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-xs font-bold text-cyan-700"
                title="点击移除"
              >
                <span className="max-w-[220px] truncate">{dept}</span>
                <span className="text-cyan-600">×</span>
              </button>
            ))}
            {draft.selectedDepartments.length > 8 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                +{draft.selectedDepartments.length - 8}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {filteredDepartments.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 text-center">没有匹配的单位</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDepartments.map((dept) => {
                const selected = draft.selectedDepartments.includes(dept)
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-semibold text-slate-700 truncate">{dept}</span>
                    <span
                      className={`w-5 h-5 rounded-lg border grid place-items-center text-xs font-black ${
                        selected ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={resetAndApply}
          className="py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
        >
          重置
        </button>
        <button
          type="button"
          onClick={apply}
          className="py-2.5 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700"
        >
          应用
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: right floating panel */}
      <div className="hidden md:block fixed right-6 top-24 z-40">
        <div
          className={`bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl transition-all duration-300 ${
            isOpen ? 'w-[380px]' : 'w-14'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="relative w-full p-3 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-colors"
            title={isOpen ? '收起筛选' : '展开筛选'}
          >
            {filterIcon}
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
          {isOpen && content}
        </div>
      </div>

      {/* Mobile: floating button + bottom sheet */}
      <div className="md:hidden fixed right-4 bottom-24 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          aria-label="打开筛选"
        >
          {filterIcon}
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div className="fixed inset-x-3 bottom-3 max-h-[78vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-white/60">
              {content}
            </div>
          </>
        )}
      </div>
    </>
  )
}

