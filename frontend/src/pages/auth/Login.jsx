import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { User, Key, Eye, EyeOff } from 'lucide-react'
import loginIllustration from '../../assets/Screenshot 2026-03-08 120653.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F4F9] p-4">
      <div className="flex w-full max-w-5xl items-center justify-between gap-10">
        
        {/* Left Side: Illustration */}
        <div className="hidden w-1/2 md:block">
          <img 
            src={loginIllustration}
            alt="Login Illustration"
            className="w-full h-auto"
          />
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md rounded-2xl bg-white p-12 shadow-sm">
          <header className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700">Welcome to</h2>
            <h1 className="text-4xl font-black text-[#5850EC]">EduFlow</h1>
          </header>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/Username Input */}
            <div className="relative rounded-xl bg-[#E8E8E8] px-4 py-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Username
              </label>
              <div className="flex items-center gap-3">
                <User size={18} className="text-black" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                  placeholder="name@school.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative rounded-xl bg-[#E8E8E8] px-4 py-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <div className="flex items-center gap-3">
                <Key size={18} className="text-black" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  placeholder="••••••••••••"
                />
                <button type="button" className="text-gray-600 hover:text-black" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#5850EC] py-4 text-sm font-bold text-white transition-all hover:bg-[#4a41d4] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}