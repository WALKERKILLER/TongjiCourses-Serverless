import { useState, useEffect } from 'react'

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void
  departments: string[]
}

export interface FilterState {
  selectedDepartments: string[]
  onlyWithReviews: boolean
}

export default function FilterPanel({ onFilterChange, departments }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [onlyWithReviews, setOnlyWithReviews] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 按音序排列的开课单位
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b, 'zh-CN'))

  // 搜索过滤
  const filteredDepartments = sortedDepartments.filter(dept =>
    dept.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 切换单位选择
  const toggleDepartment = (dept: string) => {
    const newSelected = selectedDepartments.includes(dept)
      ? selectedDepartments.filter(d => d !== dept)
      : [...selectedDepartments, dept]
    setSelectedDepartments(newSelected)
  }

  // 应用筛选
  useEffect(() => {
    onFilterChange({
      selectedDepartments,
      onlyWithReviews
    })
  }, [selectedDepartments, onlyWithReviews])

  return (
    <>
      {/* 桌面端：悬浮窗格 */}
      <div className="hidden md:block fixed right-6 top-24 z-40">
        <div className={`bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl transition-all duration-300 ${
          isOpen ? 'w-80' : 'w-14'
        }`}>
          {/* 折叠按钮 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-3 flex items-center justify-center hover:bg-slate-50 rounded-t-2xl transition-colors"
            title={isOpen ? '收起筛选' : '展开筛选'}
          >
            <svg className={`w-6 h-6 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* 筛选内容 */}
          {isOpen && (
            <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* 只看有评价的课程 */}
              <div className="pb-4 border-b border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyWithReviews}
                    onChange={(e) => setOnlyWithReviews(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-cyan-600 transition-colors">
                    只看有评价的课程
                  </span>
                </label>
              </div>

              {/* 开课单位筛选 */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">开课单位</h4>

                {/* 搜索框 */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="搜索单位..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* 已选择的单位数量 */}
                {selectedDepartments.length > 0 && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      已选择 {selectedDepartments.length} 个单位
                    </span>
                    <button
                      onClick={() => setSelectedDepartments([])}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
                    >
                      清空
                    </button>
                  </div>
                )}

                {/* 拨号盘式单位选择器 */}
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {filteredDepartments.map((dept) => {
                    const isSelected = selectedDepartments.includes(dept)
                    return (
                      <button
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`p-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'
                        }`}
                        title={dept}
                      >
                        <div className="truncate">{dept}</div>
                      </button>
                    )
                  })}
                </div>

                {filteredDepartments.length === 0 && (
                  <div className="text-center py-4 text-sm text-slate-400">
                    没有找到匹配的单位
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 移动端：悬浮徽章 */}
      <div className="md:hidden fixed right-4 bottom-20 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-700 transition-colors relative"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {(selectedDepartments.length > 0 || onlyWithReviews) && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {selectedDepartments.length || '✓'}
            </span>
          )}
        </button>

        {/* 移动端筛选面板 */}
        {isOpen && (
          <>
            {/* 遮罩层 */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* 筛选面板 */}
            <div className="fixed inset-x-4 bottom-4 bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">筛选课程</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 只看有评价的课程 */}
              <div className="pb-4 border-b border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyWithReviews}
                    onChange={(e) => setOnlyWithReviews(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    只看有评价的课程
                  </span>
                </label>
              </div>

              {/* 开课单位筛选 */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">开课单位</h4>

                {/* 搜索框 */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="搜索单位..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* 已选择的单位数量 */}
                {selectedDepartments.length > 0 && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      已选择 {selectedDepartments.length} 个单位
                    </span>
                    <button
                      onClick={() => setSelectedDepartments([])}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
                    >
                      清空
                    </button>
                  </div>
                )}

                {/* 拨号盘式单位选择器 */}
                <div className="grid grid-cols-2 gap-2">
                  {filteredDepartments.map((dept) => {
                    const isSelected = selectedDepartments.includes(dept)
                    return (
                      <button
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`p-3 text-sm font-semibold rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'
                        }`}
                      >
                        <div className="truncate">{dept}</div>
                      </button>
                    )
                  })}
                </div>

                {filteredDepartments.length === 0 && (
                  <div className="text-center py-4 text-sm text-slate-400">
                    没有找到匹配的单位
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
