import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import api from '../services/api'

export default function Success() {
  const [searchParams] = useSearchParams()
  const [processing, setProcessing] = useState(true)
  const [success, setSuccess] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      handlePaymentSuccess()
    } else {
      setProcessing(false)
    }
  }, [sessionId])

  const handlePaymentSuccess = async () => {
    try {
      await api.post('/payments/success', { session_id: sessionId })
      setSuccess(true)
    } catch (error) {
      console.error('Payment processing error:', error)
    } finally {
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-austin-orange mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Processing your subscription...
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {success ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to the Austin Marketing Family! 🤠
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              Your subscription is now active! Let's generate your first month of 
              Austin-specific marketing content.
            </p>

            <div className="bg-austin-blue bg-opacity-10 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-austin-blue mb-4">
                What's Next?
              </h2>
              <div className="text-left space-y-3 text-austin-blue">
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-3" />
                  <span>Generate 30+ pieces of marketing content</span>
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-3" />
                  <span>Get Austin-specific posts about SXSW, ACL, and local events</span>
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-3" />
                  <span>Copy & paste content to your social media</span>
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-3" />
                  <span>Save 5+ hours every week on marketing</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                to="/dashboard"
                className="w-full austin-button text-lg py-3 block text-center"
              >
                Go to Dashboard & Generate Content
              </Link>
              
              <div className="text-sm text-gray-500">
                <p>Questions? Email us at support@austinmarketing.com</p>
                <p className="mt-2">
                  🎉 <strong>Remember:</strong> Your first month is completely free!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 mb-6">
              <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-8">
              There was an issue processing your payment. Please try again or contact support.
            </p>

            <div className="space-y-4">
              <Link
                to="/pricing"
                className="austin-button text-center block"
              >
                Try Again
              </Link>
              
              <Link
                to="/"
                className="text-austin-orange hover:underline text-sm"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}