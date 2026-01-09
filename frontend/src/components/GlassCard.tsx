import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export default function GlassCard({ children, className = '', onClick, hover = true }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-white/70 backdrop-blur-xl
        border border-white/60
        shadow-[0_4px_20px_-4px_rgba(6,182,212,0.15)]
        rounded-3xl p-6
        ${hover ? 'hover:scale-[1.02] hover:bg-white/85 hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.3)] cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-cyan-50/30 pointer-events-none" />
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
}
