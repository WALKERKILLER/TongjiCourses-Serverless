import { useState, useRef, useEffect, useMemo } from 'react'
import SegmentedControl from './SegmentedControl'
import { TemplateHints } from './TemplateSelector'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onInsertText?: (before: string, after?: string) => void
  hints?: TemplateHints // 模板提示信息
}

type ViewMode = 'edit' | 'preview' | 'help'

export default function MarkdownEditor({ value, onChange, placeholder, onInsertText, hints }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 同步滚动
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.currentTarget.scrollTop
      overlayRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // 生成带提示的 overlay 内容
  const generateOverlayContent = useMemo(() => {
    if (!hints || Object.keys(hints).length === 0) return null

    const lines = value.split('\n')
    const result: React.ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // 检查是否是标题行
      let matchedHint: string | null = null
      for (const [header, hint] of Object.entries(hints)) {
        if (trimmedLine === header || trimmedLine.startsWith(header)) {
          // 检查下一行是否为空或只有空白
          const nextLine = lines[i + 1]
          if (nextLine === undefined || nextLine.trim() === '' || nextLine.trim() === '-') {
            matchedHint = hint
          }
          break
        }
      }

      if (matchedHint && i + 1 < lines.length) {
        // 当前行是标题，显示原文
        result.push(<div key={i} className="whitespace-pre">{line || '\u00A0'}</div>)
        // 下一行显示提示
        i++
        result.push(
          <div key={i} className="whitespace-pre text-slate-400 italic">
            {matchedHint}
          </div>
        )
      } else {
        // 普通行，显示透明占位
        result.push(<div key={i} className="whitespace-pre text-transparent">{line || '\u00A0'}</div>)
      }
    }

    return result
  }, [value, hints])

  // 完整的 markdown 渲染函数
  const renderMarkdown = (text: string) => {
    return text
      // 图片
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />')
      // 标题
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 1em; font-weight: 600; margin: 12px 0 6px; color: #334155;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.1em; font-weight: 600; margin: 14px 0 6px; color: #334155;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.2em; font-weight: 600; margin: 16px 0 8px; color: #334155;">$1</h1>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #0891b2; text-decoration: underline;">$1</a>')
      // 粗体和斜体
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 代码块
      .replace(/`([^`]+)`/g, '<code style="background: rgba(168, 218, 220, 0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
      // 列表
      .replace(/^- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
      // 换行
      .replace(/\n\n/g, '</p><p style="margin: 6px 0; font-size: 0.95em; line-height: 1.6;">')
      .replace(/\n/g, '<br />')
  }

  // 暴露插入方法给父组件
  useEffect(() => {
    if (onInsertText) {
      // 这里可以通过 ref 或其他方式暴露方法
    }
  }, [onInsertText])

  const viewModeOptions = [
    {
      value: 'edit',
      label: '编辑',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      value: 'preview',
      label: '预览',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      value: 'help',
      label: '帮助',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="space-y-3">
      {/* 移动端：三态切换 | 桌面端：隐藏 */}
      <div className="md:hidden flex justify-center">
        <SegmentedControl
          options={viewModeOptions}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
        />
      </div>

      {/* 编辑器容器 */}
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* 桌面端：分屏模式 */}
        <div className="hidden md:grid md:grid-cols-2 gap-px bg-slate-200">
          {/* 左侧编辑区 */}
          <div className="bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-600">编辑</span>
            </div>
            <div className="relative flex-1">
              {/* 提示层 overlay */}
              {generateOverlayContent && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 p-4 pointer-events-none overflow-hidden font-mono text-sm leading-relaxed"
                >
                  {generateOverlayContent}
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                className="relative z-10 w-full h-full p-4 border-none bg-transparent resize-none font-mono text-sm leading-relaxed text-slate-700 outline-none min-h-[400px]"
              />
            </div>
          </div>

          {/* 右侧预览区 */}
          <div className="bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-600">预览</span>
            </div>
            <div
              className="flex-1 p-4 overflow-y-auto text-sm leading-relaxed text-slate-700 min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: '<p style="margin: 6px 0; font-size: 0.95em; line-height: 1.6;">' + renderMarkdown(value) + '</p>' }}
            />
          </div>
        </div>

        {/* 移动端：单屏模式 */}
        <div className="md:hidden">
          {/* 编辑模式 */}
          {viewMode === 'edit' && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-600">编辑评论</span>
              </div>
              <div className="relative">
                {/* 提示层 overlay */}
                {generateOverlayContent && (
                  <div
                    className="absolute inset-0 p-4 pointer-events-none overflow-hidden font-mono text-sm leading-relaxed"
                  >
                    {generateOverlayContent}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onScroll={handleScroll}
                  placeholder={placeholder}
                  className="relative z-10 w-full p-4 border-none bg-transparent resize-none font-mono text-sm leading-relaxed text-slate-700 outline-none min-h-[300px]"
                />
              </div>
            </div>
          )}

          {/* 预览模式 */}
          {viewMode === 'preview' && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-600">预览效果</span>
              </div>
              <div
                className="p-4 overflow-y-auto text-sm leading-relaxed text-slate-700 min-h-[300px]"
                dangerouslySetInnerHTML={{ __html: '<p style="margin: 6px 0; font-size: 0.95em; line-height: 1.6;">' + renderMarkdown(value) + '</p>' }}
              />
            </div>
          )}

          {/* 帮助模式 */}
          {viewMode === 'help' && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-600">Markdown 语法帮助</span>
              </div>
              <div className="p-4 text-sm text-slate-600 space-y-3 min-h-[300px]">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">📝 基础语法</h4>
                  <ul className="space-y-1 text-xs">
                    <li><code className="bg-slate-100 px-1 rounded">**粗体**</code> → <strong>粗体</strong></li>
                    <li><code className="bg-slate-100 px-1 rounded">*斜体*</code> → <em>斜体</em></li>
                    <li><code className="bg-slate-100 px-1 rounded">`代码`</code> → <code className="bg-slate-100 px-1 rounded">代码</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">🔗 链接与图片</h4>
                  <ul className="space-y-1 text-xs">
                    <li><code className="bg-slate-100 px-1 rounded">[链接文字](网址)</code></li>
                    <li><code className="bg-slate-100 px-1 rounded">![图片描述](图片网址)</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">📋 标题与列表</h4>
                  <ul className="space-y-1 text-xs">
                    <li><code className="bg-slate-100 px-1 rounded"># 一级标题</code></li>
                    <li><code className="bg-slate-100 px-1 rounded">## 二级标题</code></li>
                    <li><code className="bg-slate-100 px-1 rounded">- 列表项</code></li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">💡 提示：点击底部工具栏按钮可快速插入格式</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 导出插入文本的辅助函数供外部使用
export function useMarkdownInsert(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (value: string) => void
) {
  return (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)

    onChange(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }
}
