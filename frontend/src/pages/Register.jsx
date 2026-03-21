import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get plan and billing cycle from pricing page
  const selectedPlan = location.state?.plan || 'basic'
  const selectedBillingCycle = location.state?.billingCycle || 'monthly'
  const requiresPayment = location.state?.requiresPayment || false
  const isTrial = selectedPlan === 'trial'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const result = await register(formData.email, formData.password)
      
      if (result.success) {
        toast.success('Account created successfully!')
        if (isTrial) {
          // For trial users, go directly to setup without payment
          navigate('/setup', { 
            state: { 
              plan: 'trial'
            } 
          })
        } else {
          // For paid plans, go to setup and then redirect to payment
          navigate('/setup', { 
            state: { 
              plan: selectedPlan, 
              billingCycle: selectedBillingCycle,
              requiresPayment: true
            } 
          })
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Get Started Free
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Austin small businesses saving time on marketing
          </p>
          {(selectedPlan && selectedPlan !== 'trial') && (
            <div className="mt-4 p-3 bg-austin-green bg-opacity-10 rounded-lg text-center">
              <p className="text-sm text-austin-green font-semibold">
                Selected: {selectedPlan === 'pro' ? 'Pro' : 'Basic'} Plan 
                {selectedBillingCycle === 'annual' && (
                  <span className="ml-1">
                    (Annual - Save {selectedPlan === 'pro' ? '33%' : '20%'}!)
                  </span>
                )}
              </p>
              {requiresPayment && (
                <p className="text-xs text-gray-600 mt-1">
                  Payment required after account setup
                </p>
              )}
            </div>
          )}
          {isTrial && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-semibold">
                7-Day Free Trial • No Credit Card Required
              </p>
            </div>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="austin-input"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="austin-input"
                placeholder="Password (8+ characters)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="austin-input"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full austin-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-austin-orange hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-6 p-4 bg-austin-blue bg-opacity-10 rounded-lg">
          <p className="text-xs text-center text-gray-600">
            🎉 <strong>First month free</strong> for all Austin businesses<br/>
            No contracts • Cancel anytime • Keep Austin Local
          </p>
        </div>
      </div>
    </div>
  )
}