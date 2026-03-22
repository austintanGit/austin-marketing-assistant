import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import SidebarLayout from './components/SidebarLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import ScheduledPosts from './pages/ScheduledPosts'
import Pricing from './pages/Pricing'
import Success from './pages/Success'
import ConnectAccounts from './pages/ConnectAccounts'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Outlet />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public routes — top navbar */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/success" element={<Success />} />
          </Route>

          {/* Protected routes — dark sidebar layout, no top navbar */}
          <Route element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scheduled-posts" element={<ScheduledPosts />} />
            <Route path="/connect-accounts" element={<ConnectAccounts />} />
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
