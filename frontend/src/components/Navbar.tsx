import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // 监听滚动事件，实现自动隐藏
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // 向下滚动且滚动距离超过100px时隐藏
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      }
      // 向上滚动时显示
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // 更新历史导航按钮状态
  useEffect(() => {
    const updateNavigationState = () => {
      // React Router 在 history.state 中维护了一个 idx 字段
      const state = window.history.state

      if (state && typeof state.idx === 'number') {
        // 可以后退：idx > 0
        setCanGoBack(state.idx > 0)

        // 可以前进：需要检测是否在历史栈的末尾
        // 通过尝试访问 history.length 来判断
        // 注意：这个方法不完美，但是最接近的解决方案
        const historyLength = window.history.length
        setCanGoForward(state.idx < historyLength - 1)
      } else {
        // 如果没有 idx，说明是初始状态
        setCanGoBack(false)
        setCanGoForward(false)
      }
    }

    // 初始化时更新一次
    updateNavigationState()

    // 监听 popstate 事件（浏览器前进后退）
    const handlePopState = () => {
      // 延迟更新，确保 state 已经更新
      setTimeout(updateNavigationState, 0)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 监听路由变化
  useEffect(() => {
    // 路由变化时更新导航状态
    const state = window.history.state
    if (state && typeof state.idx === 'number') {
      setCanGoBack(state.idx > 0)
      const historyLength = window.history.length
      setCanGoForward(state.idx < historyLength - 1)
    }
  }, [location])

  const navItems: { path: string; label: string; external?: boolean }[] = [
    { path: '/', label: '课程目录' },
    { path: '/feedback', label: '反馈留言' },
    { path: 'https://umami.yourtj.de/share/Sv78TrEoxVnsshxy', label: '流量监测', external: true },
  ]

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1)
    }
  }

  const handleForward = () => {
    if (canGoForward) {
      navigate(1)
    }
  }

  return (
    <nav
      className={`sticky z-50 px-4 mx-auto max-w-7xl transition-all duration-300 ${
        isVisible ? 'top-4' : '-top-24'
      }`}
    >
      <div className="relative">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-lg shadow-cyan-900/5 rounded-2xl md:rounded-full">
          {/* History Navigation Buttons */}
          <div className="flex items-center gap-1 mr-3">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className={`p-2 rounded-full transition-all ${
                canGoBack
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-cyan-600 active:scale-95'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="后退"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleForward}
              disabled={!canGoForward}
              className={`p-2 rounded-full transition-all ${
                canGoForward
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-cyan-600 active:scale-95'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="前进"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <Logo size={40} className="shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">YOURTJ选课备用站</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">xk.yourtj.de</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">YOURTJ选课</h1>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-full text-sm font-semibold transition-all text-slate-600 hover:text-cyan-600 hover:bg-white/60"
                >
                  {item.label}
                </a>
              ) : (
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
            ))}
          </div>

        </div>
      </div>
    </nav>
  )
}
