import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

export default function EmailWriterModal({ isOpen, onClose }) {
  const [prompt, setPrompt] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [quota, setQuota] = useState(null)

  useEffect(() => {
    if (isOpen) loadQuota()
  }, [isOpen])

  const loadQuota = async () => {
    try {
      const res = await api.get('/content/email-quota')
      setQuota(res.data)
    } catch {
      setQuota(null)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setSubject('')
    setBody('')
    setGenerated(false)
    onClose()
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Describe what your email is about first')
      return
    }
    if (quota && !quota.can_write) {
      toast.error('Daily limit reached. Come back tomorrow!')
      return
    }
    setGenerating(true)
    try {
      const res = await api.post('/content/write-email', { prompt })
      setSubject(res.data.subject)
      setBody(res.data.body)
      setGenerated(true)
      if (res.data.quota) setQuota(res.data.quota)
      toast.success('Email written!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate email')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyAll = () => {
    const full = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(full)
    toast.success('Copied to clipboard!')
  }

  const handleSendEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-austin-orange" />
            <h2 className="text-lg font-semibold text-gray-900">Help write my email</h2>
          </div>
          <div className="flex items-center gap-3">
            {quota && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                quota.can_write ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {quota.remaining}/{quota.limit} writes today
              </span>
            )}
            <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What's this email about?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Spring sale — 20% off all services this weekend only, want to thank loyal customers and invite them back"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-austin-orange focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || (quota && !quota.can_write)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl transition-colors"
          >
            {generating
              ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Writing your email…</>
              : quota && !quota.can_write
                ? 'Daily limit reached — resets at midnight'
                : <><SparklesIcon className="h-4 w-4" /> {generated ? 'Rewrite' : 'Write my email'}</>
            }
          </button>

          {/* Generated email */}
          {generated && (
            <div className="space-y-4 border-t border-gray-100 pt-5">

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Subject line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-austin-orange"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-austin-orange resize-y"
                />
                <p className="text-xs text-gray-400 mt-1">You can edit the subject and body above before sending.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generated && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition-colors"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copy all
            </button>
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 px-5 py-2.5 rounded-xl transition-colors"
            >
              <EnvelopeIcon className="h-4 w-4" />
              Open in email app
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
