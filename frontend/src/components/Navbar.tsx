import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'

type NavItem = { path: string; label: string; external?: boolean }

export default function Navbar() {
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/', label: '课程目录' },
    { path: '/schedule', label: '排课模拟' },
    { path: '/feedback', label: '反馈留言' },
    { path: 'https://umami.yourtj.de/share/Sv78TrEoxVnsshxy', label: '流量监测', external: true },
  ]

  return (
    <nav className="sticky top-4 z-50 px-4 mx-auto max-w-7xl">
      <div className="relative">
        <div className="flex items-center justify-start md:justify-between px-4 md:px-6 py-3 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-lg shadow-cyan-900/5 rounded-2xl md:rounded-full">
          <Link to="/" className="flex items-center gap-3 min-w-0 flex-1">
            <Logo size={40} className="shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">YOURTJ选课社区</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">xk.yourtj.de</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-[17px] font-bold text-slate-800 tracking-tight whitespace-nowrap">YOURTJ选课社区</h1>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full">
            {navItems.map((item) => {
              if (item.external) {
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all text-slate-600 hover:text-cyan-600 hover:bg-white/60"
                  >
                    {item.label}
                  </a>
                )
              }

              return (
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
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
