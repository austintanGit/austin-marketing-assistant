import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

export default function SchedulePostModal({ isOpen, onClose, onScheduled }) {
  const [message, setMessage] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [platform, setPlatform] = useState('facebook')
  const [scheduling, setScheduling] = useState(false)
  const [connections, setConnections] = useState({})

  useEffect(() => {
    if (isOpen) {
      loadConnections()
      // Set default to tomorrow at 9 AM
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setScheduledTime('09:00')
    }
  }, [isOpen])

  const loadConnections = async () => {
    try {
      const response = await api.get('/social/connections')
      setConnections(response.data.connections || {})
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please set a date and time')
      return
    }

    // Combine date and time
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)
    
    // Check if it's in the future
    if (scheduledDateTime <= new Date()) {
      toast.error('Scheduled time must be in the future')
      return
    }

    try {
      setScheduling(true)
      
      await api.post('/social/schedule-post', {
        message: message.trim(),
        scheduled_time: scheduledDateTime.toISOString(),
        platform,
      })

      toast.success('Post scheduled successfully!')
      onScheduled()
      handleClose()
      
    } catch (error) {
      console.error('Failed to schedule post:', error)
      const errorMessage = error.response?.data?.error || 'Failed to schedule post'
      toast.error(errorMessage)
    } finally {
      setScheduling(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setScheduledDate('')
    setScheduledTime('09:00')
    setPlatform('facebook')
    setScheduling(false)
    onClose()
  }

  const facebookConnected = !!connections.facebook

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Schedule Post</h3>
              <p className="text-xs text-gray-500">Schedule a post for later</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Platform Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Platform
            </label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                platform === 'facebook'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="platform"
                  value="facebook"
                  checked={platform === 'facebook'}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={!facebookConnected}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className={`text-sm font-medium ${facebookConnected ? 'text-gray-900' : 'text-gray-400'}`}>
                    Facebook {!facebookConnected && '(Not connected)'}
                  </span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-not-allowed opacity-50">
                <input
                  type="radio"
                  name="platform"
                  value="instagram"
                  disabled
                  className="text-pink-600 focus:ring-pink-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <div className="w-2 h-2 border border-white rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-400">
                    Instagram (Coming Soon)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Post Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to share with your audience?"
              className="austin-input h-32 resize-none"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-400">
                {message.length}/2000 characters
              </p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="austin-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="austin-input"
              />
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quick Times
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '9:00 AM', value: '09:00' },
                { label: '12:00 PM', value: '12:00' },
                { label: '3:00 PM', value: '15:00' },
                { label: '6:00 PM', value: '18:00' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setScheduledTime(preset.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    scheduledTime === preset.value
                      ? 'border-austin-orange bg-orange-50 text-austin-orange font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {scheduledDate && scheduledTime && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>
                  Scheduled for{' '}
                  <span className="font-semibold text-gray-900">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-6 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scheduling || !facebookConnected || !message.trim() || !scheduledDate || !scheduledTime}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl transition-colors"
            >
              {scheduling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarDaysIcon className="h-4 w-4" />
                  Schedule Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}