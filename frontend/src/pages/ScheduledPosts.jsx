import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import BulkSchedulingModal from '../components/BulkSchedulingModal'

const StatusBadge = ({ status }) => {
  const configs = {
    pending: { bg: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
    posted: { bg: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Posted' },
    failed: { bg: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Failed' },
  }
  
  const config = configs[status] || configs.pending
  const Icon = config.icon
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

const PlatformBadge = ({ platform }) => {
  const configs = {
    facebook: { bg: 'bg-blue-100 text-blue-700', label: 'Facebook' },
    instagram: { bg: 'bg-pink-100 text-pink-700', label: 'Instagram' },
  }
  
  const config = configs[platform] || { bg: 'bg-gray-100 text-gray-700', label: platform }
  
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${config.bg}`}>
      {config.label}
    </span>
  )
}

const ContentTypeBadge = ({ contentType, templateId }) => {
  const typeConfigs = {
    promotional: { bg: 'bg-orange-100 text-orange-700', label: 'Promo' },
    engagement: { bg: 'bg-blue-100 text-blue-700', label: 'Engage' },
    educational: { bg: 'bg-green-100 text-green-700', label: 'Educational' },
    social_proof: { bg: 'bg-purple-100 text-purple-700', label: 'Social Proof' },
    seasonal: { bg: 'bg-cyan-100 text-cyan-700', label: 'Seasonal' },
    lifestyle: { bg: 'bg-pink-100 text-pink-700', label: 'Lifestyle' },
  }
  
  if (!contentType) return null
  
  const config = typeConfigs[contentType] || { bg: 'bg-gray-100 text-gray-700', label: contentType }
  
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${config.bg}`}>
      {config.label}
    </span>
  )
}

export default function ScheduledPosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'posted' | 'failed'
  const [connections, setConnections] = useState({})

  useEffect(() => {
    loadScheduledPosts()
    loadConnections()
  }, [])

  const loadScheduledPosts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/social/scheduled-posts')
      setPosts(response.data.posts || [])
    } catch (error) {
      console.error('Failed to load scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setLoading(false)
    }
  }

  const loadConnections = async () => {
    try {
      const response = await api.get('/social/connections')
      setConnections(response.data.connections || {})
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this scheduled post?')) return
    
    try {
      await api.delete(`/social/scheduled-posts/${postId}`)
      setPosts(posts.filter(p => p.post_id !== postId))
      toast.success('Scheduled post deleted')
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Failed to delete post')
    }
  }

  const deleteAllPosts = async () => {
    if (!window.confirm('Are you sure you want to delete ALL scheduled posts? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete('/social/scheduled-posts')
      toast.success('All scheduled posts deleted successfully')
      setPosts([])
    } catch (error) {
      console.error('Delete all posts error:', error)
      toast.error('Failed to delete posts')
    }
  }

  const filteredPosts = posts.filter(post => {
    if (filterStatus === 'all') return true
    return post.status === filterStatus
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => 
    new Date(a.scheduled_time) - new Date(b.scheduled_time)
  )

  const groupedByDate = sortedPosts.reduce((groups, post) => {
    const date = new Date(post.scheduled_time).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(post)
    return groups
  }, {})

  const statusCounts = {
    total: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    posted: posts.filter(p => p.status === 'posted').length,
    failed: posts.filter(p => p.status === 'failed').length,
  }

  const facebookConnected = !!connections.facebook

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#111827] mx-auto mb-3"></div>
          <p className="text-sm text-gray-400">Loading scheduled posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage your automated social media posting
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 px-4 py-2.5 rounded-xl transition-colors"
          >
            <SparklesIcon className="h-4 w-4" />
            Bulk Generate
          </button>

          {posts.length > 0 && (
            <button
              onClick={deleteAllPosts}
              className="flex items-center gap-2 text-sm font-semibold text-red-600 border border-red-200 hover:border-red-300 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Connection warning */}
      {!facebookConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 shrink-0" />
            <p className="text-sm font-medium text-yellow-800">
              Connect your Facebook page to start scheduling posts
            </p>
          </div>
          <Link 
            to="/connect-accounts"
            className="shrink-0 text-sm font-semibold text-white bg-[#1877F2] hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors"
          >
            Connect Facebook
          </Link>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Posts"
          value={statusCounts.total}
          progress={Math.min(100, (statusCounts.total / 30) * 100)}
          progressColor="bg-blue-500"
          onClick={() => setFilterStatus('all')}
          active={filterStatus === 'all'}
        />
        <StatCard
          label="Pending"
          value={statusCounts.pending}
          progress={statusCounts.total ? (statusCounts.pending / statusCounts.total) * 100 : 0}
          progressColor="bg-yellow-500"
          onClick={() => setFilterStatus('pending')}
          active={filterStatus === 'pending'}
        />
        <StatCard
          label="Posted"
          value={statusCounts.posted}
          progress={statusCounts.total ? (statusCounts.posted / statusCounts.total) * 100 : 0}
          progressColor="bg-green-500"
          onClick={() => setFilterStatus('posted')}
          active={filterStatus === 'posted'}
        />
        <StatCard
          label="Failed"
          value={statusCounts.failed}
          progress={statusCounts.total ? (statusCounts.failed / statusCounts.total) * 100 : 0}
          progressColor="bg-red-500"
          onClick={() => setFilterStatus('failed')}
          active={filterStatus === 'failed'}
        />
      </div>

      {/* Posts List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              {filterStatus === 'all' ? 'All Posts' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Posts`}
            </h3>
            <p className="text-xs text-gray-400">
              {sortedPosts.length} post{sortedPosts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {sortedPosts.length > 0 ? (
            Object.entries(groupedByDate).map(([date, datePosts]) => (
              <div key={date} className="border-b border-gray-50 last:border-0">
                <div className="px-6 py-3 bg-gray-50/50">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h4>
                </div>
                
                {datePosts.map((post) => (
                  <PostRow
                    key={post.post_id}
                    post={post}
                    onDelete={() => deletePost(post.post_id)}
                    onView={() => {
                      console.log('Eye icon clicked, post data:', post);
                      setSelectedPost(post);
                    }}
                  />
                ))}
              </div>
            ))
          ) : (
            <EmptyState
              facebookConnected={facebookConnected}
              onOpenBulk={() => setBulkModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <BulkSchedulingModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onScheduled={loadScheduledPosts}
      />
      
      {/* Post Preview Modal */}
      {selectedPost && (
        <PostPreviewModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  )
}

// Helper Components
function StatCard({ label, value, progress, progressColor, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-5 text-left transition-all hover:shadow-md ${
        active ? 'border-austin-orange ring-2 ring-austin-orange/20' : 'border-gray-100'
      }`}
    >
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-1 mb-3">{label}</p>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${progressColor} transition-all`} style={{ width: `${progress}%` }} />
      </div>
    </button>
  )
}

function PostRow({ post, onDelete, onView }) {
  const scheduledDate = new Date(post.scheduled_time)
  const isOverdue = post.status === 'pending' && scheduledDate < new Date()
  
  return (
    <div className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={post.status} />
            <PlatformBadge platform={post.platform} />
            {post.content_type && <ContentTypeBadge contentType={post.content_type} />}
            {isOverdue && (
              <span className="text-xs font-medium text-red-600">Overdue</span>
            )}
          </div>
          
          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
            {post.content?.message || <em className="text-gray-400">No message</em>}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {scheduledDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </span>
            
            {post.template_id && (
              <span className="capitalize">{post.template_id.replace('_', ' ')}</span>
            )}
            
            {post.error_message && (
              <span className="text-red-600">Error: {post.error_message}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onView}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          
          {post.status === 'pending' && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ facebookConnected, onOpenBulk }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="bg-gray-100 rounded-2xl p-6 mb-6">
        <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled posts yet</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        {facebookConnected 
          ? "Create posts from the Dashboard or generate multiple days of content automatically."
          : "Connect your Facebook page first, then start scheduling posts."
        }
      </p>
      
      <div className="flex items-center gap-3">
        {facebookConnected ? (
          <>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold text-white bg-[#1877F2] hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Create Post
            </Link>
            
            <button
              onClick={onOpenBulk}
              className="flex items-center gap-2 text-sm font-semibold text-austin-orange bg-white border border-austin-orange hover:bg-orange-50 px-4 py-2.5 rounded-xl transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              Bulk Generate
            </button>
          </>
        ) : (
          <Link 
            to="/connect-accounts"
            className="flex items-center gap-2 text-sm font-semibold text-white bg-[#1877F2] hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-colors"
          >
            Connect Facebook
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  )
}

function PostPreviewModal({ post, onClose }) {
  // Add error boundary and validation
  if (!post) {
    console.error('PostPreviewModal: No post data provided');
    return null;
  }

  console.log('PostPreviewModal rendering with post:', post);

  let scheduledDate;
  try {
    scheduledDate = new Date(post.scheduled_time);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    console.error('PostPreviewModal: Invalid scheduled_time:', post.scheduled_time);
    scheduledDate = new Date(); // fallback
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Post Preview</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={post.status} />
            <PlatformBadge platform={post.platform} />
            {post.content_type && <ContentTypeBadge contentType={post.content_type} />}
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Message</label>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {(post.content?.message || post.message) || <em className="text-gray-400">No message</em>}
            </p>
          </div>

          {/* Image Preview */}
          {(post.content?.image_url || post.image_url) && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Image</label>
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={post.content?.image_url || post.image_url}
                  alt="Post image"
                  className="w-full h-48 object-cover"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Source: {post.content?.image_source || 'uploaded'}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled For</label>
              <p className="mt-1 text-sm text-gray-700">
                {scheduledDate.toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</label>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
          
          {post.template_id && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Template</label>
              <p className="mt-1 text-sm text-gray-700 capitalize">
                {post.template_id.replace('_', ' ')}
              </p>
            </div>
          )}
          
          {post.error_message && (
            <div>
              <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">Error</label>
              <p className="mt-1 text-sm text-red-600">{post.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}