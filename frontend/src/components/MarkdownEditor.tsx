interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  // 完整的 markdown 渲染函数
  const renderMarkdown = (text: string) => {
    return text
      // 图片
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />')
      // 标题
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 1em; font-weight: 600; margin: 12px 0 6px; color: var(--sea-salt-700);">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.1em; font-weight: 600; margin: 14px 0 6px; color: var(--sea-salt-700);">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.2em; font-weight: 600; margin: 16px 0 8px; color: var(--sea-salt-700);">$1</h1>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: var(--primary); text-decoration: underline;">$1</a>')
      // 粗体和斜体
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 代码块
      .replace(/`([^`]+)`/g, '<code style="background: rgba(168, 218, 220, 0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
      // 换行
      .replace(/\n\n/g, '</p><p style="margin: 6px 0; font-size: 0.95em; line-height: 1.6;">')
      .replace(/\n/g, '<br />')
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1px',
      border: '1.5px solid var(--card-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--card-border)',
      minHeight: '400px'
    }}>
      {/* 左侧编辑区 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--card-border)',
          background: 'rgba(255, 255, 255, 0.4)',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--sea-salt-600)'
        }}>
          编辑
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            width: '100%',
            padding: '16px',
            border: 'none',
            background: 'transparent',
            resize: 'none',
            fontFamily: 'Manrope, monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--foreground)',
            outline: 'none'
          }}
        />
      </div>

      {/* 右侧预览区 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--card-border)',
          background: 'rgba(255, 255, 255, 0.4)',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--sea-salt-600)'
        }}>
          预览
        </div>
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--foreground)'
          }}
          dangerouslySetInnerHTML={{ __html: '<p style="margin: 6px 0; font-size: 0.95em; line-height: 1.6;">' + renderMarkdown(value) + '</p>' }}
        />
      </div>
    </div>
  )
}
