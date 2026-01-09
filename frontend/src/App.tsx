import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Courses from './pages/Courses'
import Course from './pages/Course'
import WriteReview from './pages/WriteReview'
import Admin from './pages/Admin'

export default function App() {
  return (
    <div className="min-h-screen text-slate-800 pb-20">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 mt-6 md:mt-8">
        <Routes>
          <Route path="/" element={<Courses />} />
          <Route path="/course/:id" element={<Course />} />
          <Route path="/write-review/:id" element={<WriteReview />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}
