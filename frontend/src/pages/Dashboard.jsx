import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  EnvelopeIcon,
  CheckCircleIcon,
  PlusIcon,
  PhotoIcon,
  XMarkIcon,
  CreditCardIcon,
  ArrowUpCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ClockIcon,
  EyeIcon,
  BoltIcon, // Add for AI Credits
} from '@heroicons/react/24/outline'
import FacebookPostModal from '../components/FacebookPostModal'
import EmailWriterModal from '../components/EmailWriterModal'

const FB_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

export default function Dashboard() {
  const [business, setBusiness] = useState(null)
  const [fbPosts, setFbPosts] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [connections, setConnections] = useState({})
  const [quota, setQuota] = useState(null) // Add quota state
  const [loading, setLoading] = useState(true)
  const [fbModal, setFbModal] = useState({ open: false, initialMessage: '' })
  const [emailModal, setEmailModal] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [hasLogo, setHasLogo] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef(null)

  useEffect(() => {
    loadDashboardData()
    handleCreditPurchaseReturn()
  }, [])

  const handleCreditPurchaseReturn = async () => {
    const sessionId = searchParams.get('credit_session_id')
    if (!sessionId) return
    try {
      const res = await api.post('/social/facebook/verify-credit-purchase', { session_id: sessionId })
      if (res.data.success) toast.success(`${res.data.credits_added} image credits added!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not verify credit purchase')
    } finally {
      setSearchParams({}, { replace: true })
    }
  }

  const loadDashboardData = async () => {
    try {
      const [businessRes, subscriptionRes, connectionsRes, fbPostsRes, quotaRes] = await Promise.all([
        api.get('/business/profile').catch(() => ({ data: { business: null } })),
        api.get('/payments/subscription').catch(() => ({ data: { subscription: null } })),
        api.get('/social/connections').catch(() => ({ data: { connections: {} } })),
        api.get('/social/facebook/posts').catch(() => ({ data: { posts: [] } })),
        api.get('/social/quota').catch(() => ({ data: { quotas: null } })) // Add quota loading
      ])
      const biz = businessRes.data.business
      setBusiness(biz)
      setSubscription(subscriptionRes.data.subscription)
      setConnections(connectionsRes.data.connections || {})
      setFbPosts(fbPostsRes.data.posts || [])
      setQuota(quotaRes.data.quotas) // Set quota data
      if (biz) {
        // Check for logo existence - 404 is expected if no logo
        api.get('/business/logo', { responseType: 'blob' })
          .then(() => {
            console.log('Logo found');
            setHasLogo(true);
          })
          .catch((error) => {
            if (error.response?.status === 404) {
              console.log('No logo uploaded yet');
              setHasLogo(false);
            } else {
              console.error('Logo check failed:', error);
              setHasLogo(false);
            }
          })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoDashboardUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      await api.post('/business/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setHasLogo(true)
      toast.success('Brand logo uploaded!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const startSubscription = async (plan = 'basic', billingCycle = 'monthly') => {
    try {
      const response = await api.post('/payments/create-checkout-session', { 
        plan, 
        billingCycle 
      })
      window.location.href = response.data.checkout_url
    } catch (error) {
      toast.error('Failed to start subscription process')
    }
  }

  const cancelSubscription = async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of the current billing period.')) return
    try {
      const res = await api.post('/payments/cancel-subscription')
      toast.success(res.data.message)
      loadDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription')
    }
  }

  const reactivateSubscription = async () => {
    try {
      const res = await api.post('/payments/reactivate-subscription')
      toast.success(res.data.message)
      loadDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reactivate subscription')
    }
  }

  const upgradeSubscription = async () => {
    if (!window.confirm('Upgrade to the Pro Plan ($79/month)? Prorated charges apply immediately.')) return
    try {
      const res = await api.post('/payments/upgrade-subscription')
      toast.success(res.data.message)
      loadDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upgrade subscription')
    }
  }

  const openPortal = async () => {
    try {
      const res = await api.post('/payments/create-portal-session')
      window.location.href = res.data.portal_url
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open billing portal')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#111827] mx-auto mb-3"></div>
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full mx-4 text-center">
          <SparklesIcon className="h-12 w-12 text-[#111827] mx-auto mb-4 opacity-60" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome to Lume!</h1>
          <p className="text-sm text-gray-500 mb-7">Set up your business profile to start generating content.</p>
          <Link to="/setup" className="austin-button block text-center">Complete Setup</Link>
        </div>
      </div>
    )
  }

  const hasActiveSubscription = subscription?.is_active
  const facebookConnected = !!connections.facebook
  const isTrial = subscription?.plan === 'trial'
  const planLabel = subscription?.plan === 'pro' ? 'Pro' : subscription?.plan === 'trial' ? 'Trial' : hasActiveSubscription ? 'Basic' : 'Free'

  // Helper functions for AI Tools stat
  const getActiveToolsCount = () => {
    const tools = [];
    
    // Email generation (available if user has a subscription)
    if (hasActiveSubscription) {
      tools.push('email');
    }
    
    // Facebook tools (available if Facebook is connected)
    if (facebookConnected) {
      tools.push('facebook_post', 'facebook_caption', 'facebook_image');
    }
    
    // Content generation (available if user has business profile)
    if (business?.id) {
      tools.push('content_generation');
    }
    
    return tools.length > 0 ? `${tools.length} active` : '0 active';
  };

  const getActiveToolsText = () => {
    const activeTools = [];
    
    if (hasActiveSubscription) {
      activeTools.push('Email');
    }
    
    if (facebookConnected) {
      activeTools.push('Facebook');
    }
    
    if (business?.id && !activeTools.includes('Email')) {
      activeTools.push('Content');
    }
    
    if (activeTools.length === 0) {
      return 'Set up your first tool';
    }
    
    return activeTools.join(' · ');
  };

  const getActiveToolsProgress = () => {
    const maxTools = 5; // Email, Facebook (3 features), Content
    let activeCount = 0;
    
    if (hasActiveSubscription) activeCount += 1; // Email
    if (facebookConnected) activeCount += 3; // Facebook tools
    if (business?.id) activeCount += 1; // Content generation
    
    return Math.round((activeCount / maxTools) * 100);
  };

  // Progress bars (visual, not real metrics)
  const postProgress = Math.min(100, Math.round((fbPosts.length / 30) * 100))

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 lg:p-8">

      {/* Page title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alert banners */}
      <div className="space-y-3 mb-8">
        {!hasActiveSubscription && !subscription && (
          <div className="bg-gradient-to-r from-[#111827] to-[#1e3a5f] rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Get started</p>
              <p className="font-bold text-lg">Start your free trial</p>
              <p className="text-sm text-gray-300 mt-0.5">First month free — AI content for your business.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => startSubscription('basic')} className="bg-white text-[#111827] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                Basic — $39/mo
              </button>
              <button onClick={() => startSubscription('pro')} className="bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
                Pro — $79/mo
              </button>
            </div>
          </div>
        )}
        {subscription?.status === 'past_due' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-800">Payment failed — update your billing info to keep access.</p>
            </div>
            <button onClick={openPortal} className="shrink-0 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl transition-colors">
              Fix Billing
            </button>
          </div>
        )}
        {hasLogo === false && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 rounded-xl p-2"><PhotoIcon className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Add your brand logo</p>
                <p className="text-xs text-gray-400">Stamped on AI-generated images for your posts.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                className="text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors">
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              <button onClick={() => setHasLogo(true)} className="text-gray-300 hover:text-gray-500 p-1">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoDashboardUpload} />
          </div>
        )}
      </div>

      {/* ── Stat cards row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Posts Published"
          value={fbPosts.length}
          sub={`of 30 this month`}
          progress={postProgress}
          progressColor="bg-blue-500"
          icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Current Plan"
          value={planLabel}
          sub={hasActiveSubscription ? (subscription?.plan === 'pro' ? '$79/month' : '$39/month') : 'No plan'}
          progress={hasActiveSubscription ? 100 : 0}
          progressColor={subscription?.plan === 'pro' ? 'bg-purple-500' : 'bg-green-500'}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconBg={subscription?.plan === 'pro' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}
        />
        <StatCard
          label="Social Accounts"
          value={facebookConnected ? '1 connected' : '0 connected'}
          sub="Facebook"
          progress={facebookConnected ? 100 : 0}
          progressColor="bg-[#1877F2]"
          icon={FB_ICON}
          iconBg="bg-blue-100 text-[#1877F2]"
        />
        <StatCard
          label="AI Credits"
          value={quota ? `${quota.content_generate.remaining}/${quota.content_generate.limit}` : 'Loading...'}
          sub={quota?.plan === 'trial' ? 'Trial credits' : 'Monthly credits'}
          progress={quota ? Math.round((quota.content_generate.used / quota.content_generate.limit) * 100) : 0}
          progressColor={quota && quota.content_generate.remaining < 5 ? 'bg-red-500' : 'bg-austin-orange'}
          icon={<BoltIcon className="h-5 w-5" />}
          iconBg={quota && quota.content_generate.remaining < 5 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-austin-orange'}
          warning={quota && quota.content_generate.remaining < 5}
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Facebook posts feed */}
        <div className="lg:col-span-2">
          <FbPostsSection
            posts={fbPosts}
            facebookConnected={facebookConnected}
            onOpenFbModal={(msg) => setFbModal({ open: true, initialMessage: msg })}
          />
        </div>

        {/* Subscription card */}
        <div>
          {subscription ? (
            <SubscriptionCard
              subscription={subscription}
              onCancel={cancelSubscription}
              onReactivate={reactivateSubscription}
              onUpgrade={upgradeSubscription}
              onManage={openPortal}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <CreditCardIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">No active plan</p>
              <p className="text-xs text-gray-400 mt-1">Start a free trial to unlock all tools.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Action cards row (matching reference style) ────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <ActionCard
            bg="bg-[#111827]"
            icon={<EnvelopeIcon className="h-6 w-6 text-white" />}
            iconBg="bg-white/10"
            title="Email Writer"
            description="Craft AI-powered email campaigns"
            action="Write an email →"
            onClick={() => setEmailModal(true)}
          />

          <ActionCard
            bg="bg-[#1877F2]"
            icon={<span className="text-white">{FB_ICON}</span>}
            iconBg="bg-white/10"
            title="Facebook Post"
            description={facebookConnected ? 'Create & publish to your Page' : 'Connect Facebook first'}
            action={facebookConnected ? 'New post →' : 'Connect →'}
            onClick={facebookConnected
              ? () => setFbModal({ open: true, initialMessage: '' })
              : null
            }
            href={!facebookConnected ? '/connect-accounts' : null}
          />

          <ActionCard
            bg="bg-gradient-to-br from-austin-orange to-orange-600"
            icon={<CalendarDaysIcon className="h-6 w-6 text-white" />}
            iconBg="bg-white/10"
            title="Scheduled Posts"
            description="Manage your automated posting"
            action="View schedule →"
            href="/scheduled-posts"
          />

        </div>
      </div>

      {/* Modals */}
      <EmailWriterModal isOpen={emailModal} onClose={() => setEmailModal(false)} />
      <FacebookPostModal
        isOpen={fbModal.open}
        initialMessage={fbModal.initialMessage}
        onClose={() => setFbModal({ open: false, initialMessage: '' })}
        onPosted={loadDashboardData}
      />
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, progress, progressColor, icon, iconBg, warning = false }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${warning ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
        {warning && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className={`text-xs mt-1 mb-3 ${warning ? 'text-red-600' : 'text-gray-400'}`}>{sub}</p>
      <div className="space-y-1.5">
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progressColor} transition-all`} style={{ width: `${progress}%` }} />
        </div>
        {warning && (
          <p className="text-xs text-red-600">Low credits remaining</p>
        )}
        <p className="text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  )
}

// ─── Action Card ───────────────────────────────────────────────────────────────

function ActionCard({ bg, icon, iconBg, title, description, action, onClick, href }) {
  const content = (
    <div className={`${bg} rounded-2xl p-5 h-full flex flex-col justify-between gap-6 cursor-pointer group transition-opacity hover:opacity-90`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
      </div>
      <div>
        <p className="text-white font-bold text-base">{title}</p>
        <p className="text-white/60 text-xs mt-0.5">{description}</p>
        <p className="text-white font-semibold text-sm mt-4 group-hover:underline">{action}</p>
      </div>
    </div>
  )

  if (href) return <Link to={href} className="block">{content}</Link>
  return <button onClick={onClick} className="block w-full text-left">{content}</button>
}

// ─── Subscription Card ─────────────────────────────────────────────────────────

function SubscriptionCard({ subscription, onCancel, onReactivate, onUpgrade, onManage }) {
  const isPro = subscription.plan === 'pro'
  const isTrial = subscription.plan === 'trial'
  const isAnnual = subscription.billing_cycle === 'annual'
  const isCancelling = !!subscription.cancel_at_period_end
  const isPastDue = subscription.status === 'past_due'
  const isCancelled = subscription.status === 'cancelled'

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // Calculate pricing based on plan and billing cycle
  let pricing = '$39'
  let pricingSuffix = '/mo'
  
  if (isTrial) {
    pricing = 'FREE'
    pricingSuffix = ' TRIAL'
  } else if (isPro) {
    pricing = isAnnual ? '$53' : '$79'
  } else {
    pricing = isAnnual ? '$26' : '$39'
  }
  
  if (!isTrial && isAnnual) {
    pricingSuffix = '/mo'
  }

  let statusBg = 'bg-green-100 text-green-700'
  let statusLabel = 'Active'
  if (isCancelling) { statusBg = 'bg-yellow-100 text-yellow-700'; statusLabel = 'Cancelling' }
  if (isPastDue)    { statusBg = 'bg-red-100 text-red-600';       statusLabel = 'Past Due' }
  if (isCancelled)  { statusBg = 'bg-gray-100 text-gray-500';     statusLabel = 'Cancelled' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      <div className={`px-5 py-5 ${isTrial ? 'bg-gradient-to-br from-blue-600 to-blue-400' : isPro ? 'bg-gradient-to-br from-purple-600 to-purple-400' : 'bg-gradient-to-br from-[#111827] to-[#1e3a5f]'}`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${isTrial ? 'text-blue-200' : isPro ? 'text-purple-200' : 'text-blue-300'} mb-1`}>
          {isTrial ? 'Free Trial' : 'Subscription'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-xl">
              {isTrial ? '7-Day Trial' : isPro ? 'Pro Plan' : 'Basic Plan'}
            </p>
            {isAnnual && !isTrial && (
              <p className="text-xs text-white opacity-75">
                Annual - Save {isPro ? '33%' : '20%'}!
              </p>
            )}
            {isTrial && (
              <p className="text-xs text-white opacity-75">
                Ends {periodEnd}
              </p>
            )}
          </div>
          <p className="text-white font-bold text-2xl">{pricing}<span className="text-sm font-normal opacity-60">{pricingSuffix}</span></p>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{isCancelling ? 'Access until' : isCancelled ? 'Ended' : 'Renews on'}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBg}`}>{statusLabel}</span>
        </div>

        {periodEnd && (
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            {periodEnd}
          </div>
        )}

        {isCancelling && (
          <p className="text-xs text-yellow-600 bg-yellow-50 rounded-xl px-3 py-2">
            Full access until {periodEnd}.
          </p>
        )}

        <div className="flex flex-col gap-2 mt-auto">
          {!isPastDue && !isCancelled && !isPro && !isCancelling && (
            <button onClick={onUpgrade}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 py-2.5 rounded-xl transition-colors">
              <ArrowUpCircleIcon className="h-4 w-4" />
              Upgrade to Pro
            </button>
          )}
          {isCancelling && (
            <button onClick={onReactivate}
              className="w-full text-sm font-semibold text-white bg-green-600 hover:bg-green-700 py-2.5 rounded-xl transition-colors">
              Reactivate
            </button>
          )}
          <div className="flex gap-2">
            {!isCancelled && (
              <button onClick={onManage}
                className="flex-1 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 py-2.5 rounded-xl transition-colors">
                Manage
              </button>
            )}
            {!isCancelling && !isCancelled && !isPastDue && (
              <button onClick={onCancel}
                className="flex-1 text-sm font-medium text-red-400 hover:text-red-600 border border-gray-200 hover:border-red-200 py-2.5 rounded-xl transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Facebook Posts Feed ───────────────────────────────────────────────────────

function FbPostsSection({ posts, facebookConnected, onOpenFbModal }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Facebook Posts</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {posts.length > 0 ? `${posts.length} post${posts.length !== 1 ? 's' : ''} published` : 'No posts yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {facebookConnected && (
            <button onClick={() => onOpenFbModal('')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1877F2] hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors">
              <PlusIcon className="h-3.5 w-3.5" />
              New Post
            </button>
          )}
          <Link to="/scheduled-posts"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition-colors">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Scheduled Posts
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
              <p className="text-sm text-gray-700 line-clamp-2">
                {post.message || <em className="text-gray-400">Photo post (no caption)</em>}
              </p>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="flex items-center text-green-600 text-xs gap-1 font-medium">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Published
                </span>
                {post.has_image === 1 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">with image</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="bg-gray-100 rounded-2xl p-4 mb-4">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No posts yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {facebookConnected ? 'Create your first post using the button above.' : 'Connect your Facebook Page to start publishing.'}
            </p>
            {!facebookConnected && (
              <Link to="/connect-accounts" className="mt-3 text-xs font-semibold text-[#1877F2] hover:underline">
                Connect Facebook →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
