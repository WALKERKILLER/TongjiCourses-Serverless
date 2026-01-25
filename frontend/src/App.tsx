import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNavigation from './components/BottomNavigation'
import Footer from './components/Footer'
import Courses from './pages/Courses'
import Course from './pages/Course'
import WriteReview from './pages/WriteReview'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Schedule from './pages/Schedule'

const Admin = lazy(() => import('./pages/Admin'))
const Feedback = lazy(() => import('./pages/Feedback'))
const CreditWalletPanel = lazy(() => import('./components/CreditWalletPanel'))

export default function App() {
  const location = useLocation()
  const isSchedule = location.pathname.startsWith('/schedule')
  const hideFloatingTools = isSchedule || location.pathname.startsWith('/feedback')
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen text-slate-800 flex flex-col">
      <Navbar />
      <main
        className={`${isSchedule ? 'max-w-none px-4 mt-4' : 'max-w-7xl px-4 mt-6 md:mt-8'} mx-auto flex-1 w-full ${isHome ? 'pb-12' : 'pb-20'} md:pb-0`}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              姝ｅ湪鍔犺浇...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Courses />} />
            <Route path="/course/:id" element={<Course />} />
            <Route path="/write-review/:id" element={<WriteReview />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </Suspense>
      </main>
      {!hideFloatingTools && (
        <Suspense fallback={null}>
          <CreditWalletPanel />
        </Suspense>
      )}
      <BottomNavigation />
      <Footer />
    </div>
  )
}
