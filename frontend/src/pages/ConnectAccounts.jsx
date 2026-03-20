import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    description: 'Publish posts to your Facebook Business Page with one click.',
    icon: FacebookIcon,
    color: 'bg-indigo-50 border-indigo-200',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    canPost: true,
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    description: 'Auto-detected when you connect Facebook. Text posts require an image via the API.',
    icon: InstagramIcon,
    color: 'bg-pink-50 border-pink-200',
    badgeColor: 'bg-pink-100 text-pink-800',
    canPost: false,
    note: 'Connected automatically with Facebook. Instagram API requires an image for posting — use Copy instead.',
  },
]

export default function ConnectAccounts() {
  const [connections, setConnections] = useState({})
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState({})
  const [disconnecting, setDisconnecting] = useState({})
  const [searchParams] = useSearchParams()

  useEffect(() => {
    loadConnections()
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`Facebook connected successfully!`)
      loadConnections()
    }

    if (error) {
      const messages = {
        facebook_denied: 'Facebook sign-in was cancelled.',
        facebook_failed: 'Failed to connect Facebook. Please try again.',
        invalid_state: 'Security check failed. Please try connecting again.',
      }
      toast.error(messages[error] || 'Connection failed. Please try again.')
    }
  }, [searchParams])

  const loadConnections = async () => {
    try {
      const res = await api.get('/social/connections')
      setConnections(res.data.connections || {})
    } catch (err) {
      console.error('Failed to load connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platformId) => {
    setConnecting(prev => ({ ...prev, [platformId]: true }))
    try {
      const res = await api.get(`/social/${platformId}/auth`)
      window.location.href = res.data.url
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to start ${platformId} connection`
      toast.error(msg)
      setConnecting(prev => ({ ...prev, [platformId]: false }))
    }
  }

  const handleDisconnect = async (platformId) => {
    if (!window.confirm(`Disconnect ${platformId}? You won't be able to post to it until you reconnect.`)) return

    setDisconnecting(prev => ({ ...prev, [platformId]: true }))
    try {
      await api.delete(`/social/connections/${platformId}`)
      setConnections(prev => {
        const next = { ...prev }
        delete next[platformId]
        return next
      })
      toast.success(`${platformId} disconnected.`)
    } catch (err) {
      toast.error(`Failed to disconnect ${platformId}`)
    } finally {
      setDisconnecting(prev => ({ ...prev, [platformId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-austin-orange" />
      </div>
    )
  }

  const connectedCount = Object.keys(connections).length

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Connect Social Accounts</h1>
          <p className="text-gray-600 mt-2">
            Connect your business accounts so you can publish AI-generated content directly from the Dashboard — no copy/paste needed.
          </p>
        </div>

        {/* Status banner */}
        {connectedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4 mb-8 flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600 shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              {connectedCount} platform{connectedCount > 1 ? 's' : ''} connected.{' '}
              <Link to="/dashboard" className="underline hover:text-green-900">Go to Dashboard</Link> to publish content.
            </p>
          </div>
        )}

        {/* Platform cards */}
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const conn = connections[platform.id]
            const isConnected = !!conn
            const isConnecting = connecting[platform.id]
            const isDisconnecting = disconnecting[platform.id]

            return (
              <div
                key={platform.id}
                className={`border rounded-xl p-6 ${platform.color} transition-shadow hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <platform.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                        {isConnected && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platform.badgeColor}`}>
                            Connected
                          </span>
                        )}
                        {!platform.canPost && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Copy only
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
                      {isConnected && conn.page_name && (
                        <p className="text-sm font-medium text-gray-700 mt-2 flex items-center gap-1">
                          <LinkIcon className="h-4 w-4 text-gray-400" />
                          {conn.page_name}
                        </p>
                      )}
                      {platform.note && (
                        <p className="text-xs text-gray-500 mt-2 italic">{platform.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    {platform.id === 'instagram' ? (
                      <span className="text-sm text-gray-400 italic">Auto-linked</span>
                    ) : isConnected ? (
                      <button
                        onClick={() => handleDisconnect(platform.id)}
                        disabled={isDisconnecting}
                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                      >
                        {isDisconnecting ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircleIcon className="h-4 w-4" />
                        )}
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={isConnecting}
                        className="flex items-center gap-1.5 text-sm text-white bg-austin-orange hover:bg-orange-600 rounded-lg px-4 py-2 transition-colors disabled:opacity-50 font-medium"
                      >
                        {isConnecting ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <LinkIcon className="h-4 w-4" />
                        )}
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Help text */}
        <p className="mt-8 text-center text-sm text-gray-400">
          We use secure OAuth — we never store your Facebook password.
          You can disconnect at any time.
        </p>
      </div>
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}
