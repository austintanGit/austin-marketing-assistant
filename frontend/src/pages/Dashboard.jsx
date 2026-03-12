import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { 
  SparklesIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [business, setBusiness] = useState(null)
  const [content, setContent] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [businessRes, contentRes, subscriptionRes] = await Promise.all([
        api.get('/business/profile').catch(() => ({ data: { business: null } })),
        api.get('/content/history').catch(() => ({ data: { content: null } })),
        api.get('/payments/subscription').catch(() => ({ data: { subscription: null } }))
      ])

      setBusiness(businessRes.data.business)
      setContent(contentRes.data.content)
      setSubscription(subscriptionRes.data.subscription)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateContent = async () => {
    setGenerating(true)
    try {
      const response = await api.post('/content/generate')
      setContent(response.data.content)
      toast.success('New content generated successfully! 🎉')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const startSubscription = async () => {
    try {
      const response = await api.post('/payments/create-checkout-session')
      window.location.href = response.data.checkout_url
    } catch (error) {
      toast.error('Failed to start subscription process')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-austin-orange"></div>
      </div>
    )
  }

  // No business profile - redirect to setup
  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Austin Marketing Assistant!
          </h1>
          <p className="text-gray-600 mb-8">
            Let's set up your business profile to start generating amazing content.
          </p>
          <Link to="/setup" className="austin-button text-lg">
            Complete Business Setup
          </Link>
        </div>
      </div>
    )
  }

  const hasActiveSubscription = subscription?.is_active

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {business.business_name}! 🤠
          </h1>
          <p className="text-gray-600 mt-2">
            Your Austin marketing content hub
          </p>
        </div>

        {/* Subscription Status */}
        {!hasActiveSubscription && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  🎉 Start Your Free Trial
                </h3>
                <p className="text-yellow-700 mt-1">
                  Get your first month of AI-generated marketing content free!
                </p>
              </div>
              <button
                onClick={startSubscription}
                className="austin-button"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Marketing Content
              </h2>
              <p className="text-gray-600">
                {content ? 'Latest generated content ready to use' : 'No content generated yet'}
              </p>
            </div>
            <button
              onClick={generateContent}
              disabled={generating || !hasActiveSubscription}
              className="austin-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              {generating ? 'Generating...' : 'Generate New Content'}
            </button>
          </div>
        </div>

        {/* Content Display */}
        {content && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Social Media Posts */}
            <ContentSection
              title="Social Media Posts"
              subtitle={`${content.social_posts?.length || 0} posts for Facebook & Instagram`}
              items={content.social_posts || []}
              copyToClipboard={copyToClipboard}
            />

            {/* Google My Business Posts */}
            <ContentSection
              title="Google My Business"
              subtitle={`${content.gmb_posts?.length || 0} posts for local SEO`}
              items={content.gmb_posts || []}
              copyToClipboard={copyToClipboard}
            />

            {/* Email Templates */}
            <ContentSection
              title="Email Templates"
              subtitle={`${content.email_templates?.length || 0} newsletter templates`}
              items={content.email_templates || []}
              copyToClipboard={copyToClipboard}
            />
          </div>
        )}

        {/* Empty State */}
        {!content && (
          <div className="text-center py-16">
            <SparklesIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to create amazing Austin content?
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Click "Generate New Content" to create 30+ pieces of marketing content 
              tailored specifically for your Austin business.
            </p>
            {hasActiveSubscription && (
              <button
                onClick={generateContent}
                disabled={generating}
                className="austin-button text-lg"
              >
                <SparklesIcon className="h-6 w-6 mr-2 inline" />
                Generate Your First Content
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Content Section Component
function ContentSection({ title, subtitle, items, copyToClipboard }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
      
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {items.length > 0 ? (
          items.slice(0, 5).map((item, index) => (
            <ContentItem
              key={index}
              item={item}
              copyToClipboard={copyToClipboard}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <PlusIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No content generated yet</p>
          </div>
        )}
        
        {items.length > 5 && (
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              +{items.length - 5} more items
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Content Item Component
function ContentItem({ item, copyToClipboard }) {
  return (
    <div className="content-card group">
      {item.title && (
        <h4 className="font-medium text-gray-900 mb-2 text-sm">
          {item.title}
        </h4>
      )}
      <p className="text-sm text-gray-700 line-clamp-3">
        {item.content}
      </p>
      <button
        onClick={() => copyToClipboard(item.content)}
        className="mt-3 flex items-center text-austin-orange hover:text-orange-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
        Copy to clipboard
      </button>
    </div>
  )
}