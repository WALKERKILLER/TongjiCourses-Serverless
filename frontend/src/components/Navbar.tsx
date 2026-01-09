import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: '课程目录' },
  ]

  return (
    <nav className="sticky top-4 z-50 px-4 mx-auto max-w-7xl">
      <div className="relative">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-lg shadow-cyan-900/5 rounded-2xl md:rounded-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <Logo size={40} className="shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">同济选课社区</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">TJ Course Hub</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">同济选课</h1>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  location.pathname === item.path
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-600 hover:text-cyan-600 hover:bg-white/60'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full active:scale-95 transition-transform"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-4 md:hidden flex flex-col gap-2 z-40">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors active:scale-[0.98] ${
                  location.pathname === item.path
                    ? 'bg-cyan-50 text-cyan-600'
                    : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
