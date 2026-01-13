import { Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <div className="min-h-screen text-slate-800 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 mt-6 md:mt-8 flex-1 w-full pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Courses />} />
          <Route path="/course/:id" element={<Course />} />
          <Route path="/write-review/:id" element={<WriteReview />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/feedback" element={<Feedback />} />
        </Routes>
      </main>
      <BottomNavigation />
      <Footer />
    </div>
  )
}
