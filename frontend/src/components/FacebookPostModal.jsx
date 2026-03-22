import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { searchPexelsPhotos, selectPexelsPhoto, aiSelectPexelsPhotos } from '../services/api'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  PhotoIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

const IMAGE_MODES = [
  { id: 'none', label: 'No image', description: 'Text-only post' },
  { id: 'upload', label: 'Upload photo', description: 'Use your own photo' },
  { id: 'pexels', label: 'Stock photos', description: 'Browse Pexels gallery' },
  { id: 'ai', label: 'AI generate', description: 'Create image with AI' },
]

export default function FacebookPostModal({ isOpen, onClose, initialMessage = '', onPosted }) {
  const [message, setMessage] = useState(initialMessage)
  const [imageMode, setImageMode] = useState('none')

  // Upload photo state
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [imageDescription, setImageDescription] = useState('')
  const [generatingCaption, setGeneratingCaption] = useState(false)

  // Pexels photo state
  const [pexelsQuery, setPexelsQuery] = useState('')
  const [pexelsResults, setPexelsResults] = useState([])
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] = useState(null)
  const [pexelsLoading, setPexelsLoading] = useState(false)
  const [downloadingPexels, setDownloadingPexels] = useState(false)
  const [pexelsImageUrl, setPexelsImageUrl] = useState(null)

  // AI image state
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState(null)
  const [imageQuota, setImageQuota] = useState(null)
  const [includeLogo, setIncludeLogo] = useState(false)
  const [hasLogo, setHasLogo] = useState(false)

  // Post status
  const [posting, setPosting] = useState(false)
  const [postMode, setPostMode] = useState('now') // 'now' | 'schedule'
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // AI assist for message
  const [showAiAssist, setShowAiAssist] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceRemaining, setEnhanceRemaining] = useState(null)
  const aiAssistTimer = useRef(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setMessage(initialMessage)
      setImageMode('none')
      setUploadedFile(null)
      setUploadPreview(null)
      setImageDescription('')
      setPexelsQuery('')
      setPexelsResults([])
      setSelectedPexelsPhoto(null)
      setPexelsImageUrl(null)
      setAiPrompt('')
      setAiImageUrl(null)
      setShowAiAssist(false)
      setPostMode('now')
      setScheduledDate('')
      setScheduledTime('')
      
      // Set default to tomorrow at 9 AM for scheduling
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setScheduledTime('09:00')
      
      loadImageQuota()
    }
  }, [isOpen, initialMessage])

  const handleMessageChange = (e) => {
    const val = e.target.value
    setMessage(val)
    setShowAiAssist(false)
    clearTimeout(aiAssistTimer.current)
    if (val.trim().length > 10) {
      aiAssistTimer.current = setTimeout(() => setShowAiAssist(true), 1000)
    }
  }

  const handleEnhanceMessage = async () => {
    if (!message.trim()) return
    setEnhancing(true)
    setShowAiAssist(false)
    try {
      const res = await api.post('/social/facebook/enhance-post', { message })
      setMessage(res.data.enhanced)
      setEnhanceRemaining(res.data.remaining)
      toast.success('Post enhanced!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enhance post')
      setShowAiAssist(true)
    } finally {
      setEnhancing(false)
    }
  }

  const loadImageQuota = async () => {
    try {
      const [quotaRes] = await Promise.all([
        api.get('/social/facebook/image-quota'),
        api.get('/business/logo', { responseType: 'blob' })
          .then(() => setHasLogo(true))
          .catch(() => setHasLogo(false)),
      ])
      setImageQuota(quotaRes.data)
    } catch {
      setImageQuota(null)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setUploadPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleGenerateCaption = async () => {
    if (!imageDescription.trim()) {
      toast.error('Enter a description of your image first')
      return
    }
    setGeneratingCaption(true)
    try {
      const res = await api.post('/social/facebook/generate-caption', {
        image_description: imageDescription,
      })
      setMessage(res.data.caption)
      toast.success('Caption generated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate caption')
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Enter a prompt to generate an image')
      return
    }
    if (imageQuota && !imageQuota.can_generate) {
      toast.error('No image credits remaining. Buy a top-up pack to continue.')
      return
    }
    setGeneratingImage(true)
    setAiImageUrl(null)
    try {
      const res = await api.post('/social/facebook/generate-image', { prompt: aiPrompt, include_logo: includeLogo })
      setAiImageUrl(res.data.image_url)
      
      // Update the image quota with the new data from the response
      if (res.data.quota) {
        setImageQuota({
          plan: imageQuota?.plan || 'basic',
          quota: res.data.quota,
          can_generate: res.data.quota.remaining > 0
        })
      }
      
      toast.success('Image generated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate image')
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleBuyCredits = async () => {
    try {
      const res = await api.post('/social/facebook/buy-image-credits')
      window.location.href = res.data.checkout_url
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout')
    }
  }

  const handlePost = async () => {
    if (!message.trim() && imageMode === 'none') {
      toast.error('Enter a message for your post')
      return
    }
    if (imageMode === 'upload' && !uploadedFile) {
      toast.error('Please select a photo to upload')
      return
    }
    if (imageMode === 'pexels' && !pexelsImageUrl) {
      toast.error('Please select a photo from Pexels')
      return
    }
    if (imageMode === 'ai' && !aiImageUrl) {
      toast.error('Please generate an image first')
      return
    }

    // Validate scheduling
    if (postMode === 'schedule') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please set a date and time for scheduling')
        return
      }
      
      if (imageMode === 'upload') {
        toast.error('File uploads are not supported for scheduled posts. Use stock photos or AI generation instead.')
        return
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    setPosting(true)
    try {
      if (postMode === 'now') {
        // Post immediately
        const formData = new FormData()
        formData.append('message', message)
        formData.append('image_source', imageMode)

        if (imageMode === 'upload' && uploadedFile) {
          formData.append('image', uploadedFile)
        } else if (imageMode === 'pexels' && pexelsImageUrl) {
          formData.append('image_url', pexelsImageUrl)
        } else if (imageMode === 'ai' && aiImageUrl) {
          formData.append('image_url', aiImageUrl)
        }

        await api.post('/social/facebook/post', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        toast.success('Posted to Facebook!')
      } else {
        // Schedule post
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)
        
        const scheduleData = {
          message: message.trim(),
          scheduled_time: scheduledDateTime.toISOString(),
          platform: 'facebook',
          image_source: imageMode
        }

        // Handle image URL for scheduled posts
        if (imageMode === 'pexels' && pexelsImageUrl) {
          scheduleData.image_url = pexelsImageUrl
        } else if (imageMode === 'ai' && aiImageUrl) {
          scheduleData.image_url = aiImageUrl
        }
        // Note: File uploads for scheduled posts would need additional handling

        await api.post('/social/schedule-post', scheduleData)
        
        toast.success(`Post scheduled for ${scheduledDateTime.toLocaleString()}!`)
      }

      onPosted?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to ${postMode === 'now' ? 'post' : 'schedule'} Facebook post`
      toast.error(msg)
    } finally {
      setPosting(false)
    }
  }

  // Pexels handlers
  const handleSearchPexels = async () => {
    if (!pexelsQuery.trim()) {
      toast.error('Enter a search term')
      return
    }
    
    setPexelsLoading(true)
    setPexelsResults([])
    setSelectedPexelsPhoto(null)
    
    try {
      const results = await searchPexelsPhotos(pexelsQuery, 1, 20)
      setPexelsResults(results.photos || [])
      if (results.photos.length === 0) {
        toast.info('No photos found for this search. Try different keywords.')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to search photos')
    } finally {
      setPexelsLoading(false)
    }
  }

  const handleAiSelectPexels = async () => {
    if (!message.trim()) {
      toast.error('Write your post message first so AI can choose relevant photos')
      return
    }
    
    setPexelsLoading(true)
    setPexelsResults([])
    setSelectedPexelsPhoto(null)
    
    try {
      const results = await aiSelectPexelsPhotos(message, 9)
      setPexelsResults(results.selectedPhotos || [])
      if (results.selectedPhotos.length === 0) {
        toast.info('No photos found for your post content. Try manual search with specific keywords.')
      } else {
        toast.success(`AI selected ${results.selectedPhotos.length} photos that match your post!`)
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to get AI photo selection')
    } finally {
      setPexelsLoading(false)
    }
  }

  const handleSelectPexelsPhoto = async () => {
    if (!selectedPexelsPhoto) return
    
    setDownloadingPexels(true)
    try {
      const result = await selectPexelsPhoto(selectedPexelsPhoto.id, 'large')
      setPexelsImageUrl(result.image.cdnUrl)
      toast.success(`Photo by ${result.image.photographer} is ready to use!`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to download photo')
    } finally {
      setDownloadingPexels(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FacebookIcon className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-gray-900">Post to Facebook</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Post message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Post message</label>
            <textarea
              value={message}
              onChange={handleMessageChange}
              rows={4}
              placeholder="What would you like to share with your audience?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-austin-orange focus:border-transparent resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between min-h-[24px]">
              {/* AI assist button — appears after user pauses typing */}
              {enhancing ? (
                <span className="flex items-center gap-1.5 text-xs text-austin-orange">
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  Enhancing…
                </span>
              ) : showAiAssist && enhanceRemaining !== 0 ? (
                <button
                  onClick={handleEnhanceMessage}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-austin-orange hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-all animate-pulse-once"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  ✨ Need AI help?
                  {enhanceRemaining !== null && (
                    <span className="ml-1 opacity-75">({enhanceRemaining} left today)</span>
                  )}
                </button>
              ) : showAiAssist && enhanceRemaining === 0 ? (
                <span className="text-xs text-gray-400">Daily AI assist limit reached</span>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{message.length} / 63,206</span>
            </div>
          </div>

          {/* Post timing mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">When to post</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPostMode('now')}
                className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  postMode === 'now'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <SparklesIcon className="h-4 w-4" />
                Post Now
              </button>
              
              <button
                onClick={() => setPostMode('schedule')}
                className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  postMode === 'schedule'
                    ? 'border-austin-orange bg-orange-50 text-austin-orange'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <ClockIcon className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>

          {/* Scheduling options */}
          {postMode === 'schedule' && (
            <div className="space-y-4 bg-orange-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-austin-orange"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-austin-orange"
                  />
                </div>
              </div>
              
              {/* Quick time presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick times</label>
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
                          ? 'border-austin-orange bg-austin-orange text-white font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-austin-orange hover:text-austin-orange'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview scheduled time */}
              {scheduledDate && scheduledTime && (
                <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 rounded-lg p-2">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>
                    Will post on{' '}
                    <strong>
                      {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Image mode selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setImageMode(mode.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-center transition-all ${
                    imageMode === mode.id
                      ? 'border-austin-orange bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {mode.id === 'none' && <PhotoIcon className="h-5 w-5 text-gray-400" />}
                  {mode.id === 'upload' && <ArrowUpTrayIcon className="h-5 w-5 text-gray-600" />}
                  {mode.id === 'ai' && <SparklesIcon className="h-5 w-5 text-austin-orange" />}
                  <span className={`text-xs font-medium ${imageMode === mode.id ? 'text-austin-orange' : 'text-gray-700'}`}>
                    {mode.label}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:block">{mode.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload photo panel */}
          {imageMode === 'upload' && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              {/* File drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-austin-orange rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div>
                    <PhotoIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to select a photo</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF up to 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Description for AI caption */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Describe your photo <span className="text-gray-400">(optional — AI will write the caption)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                    placeholder="e.g. team photo at our new location on South Congress"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-austin-orange"
                  />
                  <button
                    onClick={handleGenerateCaption}
                    disabled={generatingCaption}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {generatingCaption
                      ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      : <SparklesIcon className="h-4 w-4" />
                    }
                    {generatingCaption ? 'Writing…' : 'Write caption'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pexels stock photos panel */}
          {imageMode === 'pexels' && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              {/* Search bar */}
              <div className="flex items-center space-x-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search stock photos (e.g., coffee shop, team meeting)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-austin-orange"
                  value={pexelsQuery}
                  onChange={(e) => setPexelsQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchPexels()}
                />
                <button
                  onClick={handleSearchPexels}
                  className="px-4 py-2 bg-austin-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  disabled={pexelsLoading}
                >
                  {pexelsLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* AI Quick Select */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Let AI choose photos based on your post:</span>
                <button
                  onClick={handleAiSelectPexels}
                  disabled={pexelsLoading || !message.trim()}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <SparklesIcon className="h-3 w-3" />
                  AI Pick 9
                </button>
              </div>

              {/* Photo grid */}
              {pexelsResults.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {pexelsResults.map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPexelsPhoto?.id === photo.id ? 'border-austin-orange ring-2 ring-austin-orange/20' : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPexelsPhoto(photo)}
                    >
                      <img
                        src={photo.src.medium}
                        alt={photo.alt}
                        className="w-full h-20 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                        {photo.photographer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected photo preview and download */}
              {selectedPexelsPhoto && (
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start space-x-3">
                    <img
                      src={selectedPexelsPhoto.src.small}
                      alt={selectedPexelsPhoto.alt}
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedPexelsPhoto.alt || 'Selected photo'}
                      </p>
                      <p className="text-xs text-gray-500">
                        By {selectedPexelsPhoto.photographer}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleSelectPexelsPhoto}
                          disabled={downloadingPexels}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-austin-orange text-white text-sm font-medium rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                          {downloadingPexels ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              Use This Photo
                            </>
                          )}
                        </button>
                        <a
                          href={selectedPexelsPhoto.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          View on Pexels
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current selected image preview */}
              {pexelsImageUrl && (
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Selected Photo</span>
                    <button
                      onClick={() => {
                        setPexelsImageUrl(null)
                        setSelectedPexelsPhoto(null)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <img src={pexelsImageUrl} alt="Selected" className="max-h-48 mx-auto rounded-lg object-contain" />
                </div>
              )}
            </div>
          )}

          {/* AI generate panel */}
          {imageMode === 'ai' && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">

              {/* Credit progress bar */}
              {imageQuota ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Image credits</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${imageQuota.can_generate ? 'text-gray-700' : 'text-red-600'}`}>
                        {imageQuota.quota?.remaining || 0} remaining
                      </span>
                      {(!imageQuota.can_generate || (imageQuota.quota?.remaining || 0) < 5) && (
                        <button
                          onClick={handleBuyCredits}
                          className="text-xs font-medium text-white bg-austin-orange hover:bg-orange-600 px-2 py-0.5 rounded-full transition-colors"
                        >
                          + Buy 25 for $2.99
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (imageQuota.quota?.remaining || 0) > 5 ? 'bg-green-500' : 
                        (imageQuota.quota?.remaining || 0) > 0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.max(5, Math.min(100, ((imageQuota.quota?.remaining || 0) / (imageQuota.quota?.limit || 1)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {imageQuota.quota?.used || 0}/{imageQuota.quota?.limit || 0} used this month
                    </span>
                    {(imageQuota.quota?.extra_credits || 0) > 0 && (
                      <span className="text-xs text-austin-orange font-medium">
                        +{imageQuota.quota.extra_credits} bonus credits
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Image credits</span>
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-300 rounded-full animate-pulse w-1/2" />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">
                    Describe the image you want AI to create
                  </label>
                  {message.trim().length > 10 && (
                    <button
                      onClick={() => setAiPrompt(message.trim())}
                      className="flex items-center gap-1 text-xs font-semibold text-austin-orange hover:text-orange-600 transition-colors"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      Use my post
                    </button>
                  )}
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Showcase our product on a clean background',
                    'Warm, welcoming interior of our shop',
                    'Happy customer receiving our service',
                    'Behind the scenes at work',
                    'Special sale or promotion banner',
                    'Friendly team photo at our business',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setAiPrompt(suggestion)}
                      disabled={imageQuota && !imageQuota.can_generate}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        aiPrompt === suggestion
                          ? 'bg-orange-50 border-austin-orange text-austin-orange font-medium'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-austin-orange hover:text-austin-orange'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Or describe your own image…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-austin-orange"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                    disabled={imageQuota && !imageQuota.can_generate}
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || (imageQuota && !imageQuota.can_generate)}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {generatingImage
                      ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      : <SparklesIcon className="h-4 w-4" />
                    }
                    {generatingImage ? 'Creating…' : 'Generate'}
                  </button>
                </div>
                {imageQuota && !imageQuota.can_generate ? (
                  <p className="text-xs text-red-500 mt-1">No credits left — buy a top-up pack to continue.</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Uses AWS Bedrock Nova Canvas</p>
                )}

                {/* Include logo toggle */}
                {hasLogo && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="w-4 h-4 accent-austin-orange rounded"
                    />
                    <span className="text-xs text-gray-600 font-medium">Stamp my brand logo on the image</span>
                  </label>
                )}
                {!hasLogo && (
                  <p className="text-xs text-gray-400 mt-2">
                    <Link to="/dashboard" className="underline hover:text-austin-orange">Upload your logo</Link> to stamp it on generated images.
                  </p>
                )}
              </div>

              {generatingImage && (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Generating your image…
                </div>
              )}

              {aiImageUrl && (
                <div className="space-y-2">
                  <img
                    src={aiImageUrl}
                    alt="AI generated"
                    className="w-full rounded-xl object-contain max-h-64"
                  />
                  {imageQuota?.can_generate && (
                    <button
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-austin-orange disabled:opacity-50 transition-colors"
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                      Regenerate ({imageQuota.quota?.remaining || 0} credits left)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={posting}
            className={`flex items-center gap-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-colors ${
              postMode === 'now' 
                ? 'bg-[#1877F2] hover:bg-blue-700' 
                : 'bg-austin-orange hover:bg-orange-600'
            }`}
          >
            {posting ? (
              <><ArrowPathIcon className="h-4 w-4 animate-spin" /> 
                {postMode === 'now' ? 'Posting…' : 'Scheduling…'}
              </>
            ) : (
              <>
                {postMode === 'now' ? (
                  <><FacebookIcon className="w-4 h-4" /> Post to Facebook</>
                ) : (
                  <><ClockIcon className="h-4 w-4" /> Schedule Post</>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
