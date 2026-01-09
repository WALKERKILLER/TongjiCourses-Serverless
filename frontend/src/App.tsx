import { Routes, Route, Link } from 'react-router-dom'
import Courses from './pages/Courses'
import Course from './pages/Course'
import WriteReview from './pages/WriteReview'
import Admin from './pages/Admin'

export default function App() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
          <Link to="/" style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>同济选课社区</Link>
          <nav style={{ display: 'flex', gap: '16px' }}>
            <Link to="/" style={{ color: 'white' }}>课程</Link>
            <Link to="/admin" style={{ color: 'white' }}>管理</Link>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Courses />} />
          <Route path="/course/:id" element={<Course />} />
          <Route path="/write-review/:id" element={<WriteReview />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </>
  )
}
