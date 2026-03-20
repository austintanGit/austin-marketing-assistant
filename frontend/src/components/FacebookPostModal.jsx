import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  PhotoIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const IMAGE_MODES = [
  { id: 'none', label: 'No image', description: 'Text-only post' },
  { id: 'upload', label: 'Upload photo', description: 'Use your own photo' },
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

  // AI image state
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [aiImageB64, setAiImageB64] = useState(null)
  const [imageQuota, setImageQuota] = useState(null)
  const [includeLogo, setIncludeLogo] = useState(false)
  const [hasLogo, setHasLogo] = useState(false)

  // Post status
  const [posting, setPosting] = useState(false)

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
      setAiPrompt('')
      setAiImageB64(null)
      setShowAiAssist(false)
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
    setAiImageB64(null)
    try {
      const res = await api.post('/social/facebook/generate-image', { prompt: aiPrompt, include_logo: includeLogo })
      setAiImageB64(res.data.image_b64)
      if (res.data.quota) setImageQuota(res.data.quota)
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
    if (imageMode === 'ai' && !aiImageB64) {
      toast.error('Please generate an image first')
      return
    }

    setPosting(true)
    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('image_source', imageMode)

      if (imageMode === 'upload' && uploadedFile) {
        formData.append('image', uploadedFile)
      } else if (imageMode === 'ai' && aiImageB64) {
        formData.append('image_b64', aiImageB64)
      }

      await api.post('/social/facebook/post', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Posted to Facebook!')
      onPosted?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to post to Facebook'
      toast.error(msg)
    } finally {
      setPosting(false)
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

          {/* AI generate panel */}
          {imageMode === 'ai' && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">

              {/* Credit progress bar */}
              {imageQuota && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Image credits</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${imageQuota.can_generate ? 'text-gray-700' : 'text-red-600'}`}>
                        {imageQuota.total_remaining} remaining
                      </span>
                      <button
                        onClick={handleBuyCredits}
                        className="text-xs font-medium text-white bg-austin-orange hover:bg-orange-600 px-2 py-0.5 rounded-full transition-colors"
                      >
                        + Buy 25 for $2.99
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        imageQuota.can_generate ? 'bg-austin-orange' : 'bg-red-400'
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, (imageQuota.total_remaining / (imageQuota.monthly_limit + imageQuota.extra_credits || imageQuota.monthly_limit)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {imageQuota.used_this_month} used this month
                    </span>
                    {imageQuota.extra_credits > 0 && (
                      <span className="text-xs text-austin-orange font-medium">
                        +{imageQuota.extra_credits} bonus credits
                      </span>
                    )}
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

              {aiImageB64 && (
                <div className="space-y-2">
                  <img
                    src={`data:image/png;base64,${aiImageB64}`}
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
                      Regenerate ({imageQuota.total_remaining} credits left)
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
            className="flex items-center gap-2 text-sm font-semibold text-white bg-[#1877F2] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-colors"
          >
            {posting
              ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Posting…</>
              : <><FacebookIcon className="w-4 h-4" /> Post to Facebook</>
            }
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
