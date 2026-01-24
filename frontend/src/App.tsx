import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNavigation from './components/BottomNavigation'
import Footer from './components/Footer'
import Courses from './pages/Courses'
import Course from './pages/Course'
import WriteReview from './pages/WriteReview'
import Admin from './pages/Admin'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Feedback from './pages/Feedback'
import Schedule from './pages/Schedule'
import CreditWalletPanel from './components/CreditWalletPanel'

export default function App() {
  const location = useLocation()
  const isSchedule = location.pathname.startsWith('/schedule')

  return (
    <div className="min-h-screen text-slate-800 flex flex-col">
      <Navbar />
      <main
        className={`${isSchedule ? 'max-w-none px-4 mt-4' : 'max-w-7xl px-4 mt-6 md:mt-8'} mx-auto flex-1 w-full pb-20 md:pb-0`}
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
      </main>
      <CreditWalletPanel />
      <BottomNavigation />
      <Footer />
    </div>
  )
}
