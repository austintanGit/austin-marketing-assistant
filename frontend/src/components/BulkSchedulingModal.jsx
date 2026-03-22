import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const BUSINESS_CATEGORIES = {
  restaurant: { 
    name: 'Restaurant', 
    description: 'Daily specials, behind-the-scenes, weekend promotions',
    icon: '🍽️',
    color: 'bg-red-100 text-red-700 border-red-200'
  },
  cafe: { 
    name: 'Cafe/Coffee Shop', 
    description: 'Morning coffee, afternoon treats, community events',
    icon: '☕',
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  retail: { 
    name: 'Retail Store', 
    description: 'New arrivals, styling tips, customer spotlights',
    icon: '🛍️',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  salon: { 
    name: 'Hair Salon/Barbershop', 
    description: 'Transformations, care tips, booking promotions',
    icon: '💇',
    color: 'bg-pink-100 text-pink-700 border-pink-200'
  },
  auto_repair: { 
    name: 'Auto Repair', 
    description: 'Maintenance tips, success stories, seasonal reminders',
    icon: '🔧',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  food_truck: { 
    name: 'Food Truck', 
    description: 'Location updates, menu highlights, event participation',
    icon: '🚚',
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  boutique: { 
    name: 'Boutique', 
    description: 'Style inspiration, exclusive previews, local artists',
    icon: '👗',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  service: { 
    name: 'Service Business', 
    description: 'Expert tips, service showcases, community support',
    icon: '🛠️',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  health: { 
    name: 'Health/Wellness', 
    description: 'Wellness tips, motivation, class highlights',
    icon: '🏃',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  other: { 
    name: 'Other Business', 
    description: 'Flexible templates for any business type',
    icon: '🏢',
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  },
}

export default function BulkSchedulingModal({ isOpen, onClose, onScheduled }) {
  const [step, setStep] = useState(1) // 1: configuration, 2: preview, 3: generating
  const [selectedCategory, setSelectedCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [duration, setDuration] = useState(7)
  const [platforms, setPlatforms] = useState(['facebook'])
  const [imageOption, setImageOption] = useState('none') // 'none' | 'pexels'
  const [includeLogo, setIncludeLogo] = useState(false)
  const [previewImages, setPreviewImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [templates, setTemplates] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [subscription, setSubscription] = useState(null)
  const [business, setBusiness] = useState(null)
  const [quota, setQuota] = useState(null) // Add quota state

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      loadSubscription()
      loadBusiness()
      loadQuota() // Add quota loading
      // Set default start date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setStartDate(tomorrow.toISOString().split('T')[0])
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      const response = await api.get('/social/business-templates')
      setTemplates(response.data.templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadSubscription = async () => {
    try {
      const response = await api.get('/payments/subscription')
      setSubscription(response.data.subscription)
    } catch (error) {
      console.error('Failed to load subscription:', error)
    }
  }

  const loadBusiness = async () => {
    try {
      const response = await api.get('/business/profile')
      const businessData = response.data.business
      setBusiness(businessData)

      // Set the category based on business profile
      if (businessData?.business_type) {
        setSelectedCategory(businessData.business_type)
      }
    } catch (error) {
      console.error('Failed to load business profile:', error)
    }
  }

  const loadQuota = async () => {
    try {
      const response = await api.get('/social/quota')
      setQuota(response.data.quotas)
    } catch (error) {
      console.error('Failed to load quota:', error)
    }
  }

  const loadPreviewImages = async () => {
    if (!selectedCategory || imageOption !== 'pexels' || !templates) {
      setPreviewImages([])
      return
    }

    setLoadingImages(true)
    try {
      const templateData = templates[selectedCategory]
      if (!templateData) {
        setPreviewImages([])
        return
      }

      // Create strategy-based search queries
      const strategyQueries = templateData.templates.map(template => {
        const baseCategory = selectedCategory === 'restaurant' ? 'restaurant' : selectedCategory
        
        // Map template types to specific search terms
        const searchMappings = {
          'daily_special': `${baseCategory} food special dish menu`,
          'behind_the_scenes': `${baseCategory} kitchen staff working behind scenes`,
          'weekend_promotion': `${baseCategory} happy crowd weekend celebration`,
          'customer_reviews': `${baseCategory} happy customers dining smiling`,
          'menu_highlight': `${baseCategory} delicious food plate presentation`,
          'community_event': `${baseCategory} community event gathering people`,
          'seasonal_special': `${baseCategory} seasonal food fresh ingredients`,
          'team_spotlight': `${baseCategory} team staff professional portrait`,
          'ambiance': `${baseCategory} interior atmosphere cozy lighting`,
          'new_arrival': `${baseCategory} new product display fresh`,
          'customer_spotlight': `${baseCategory} satisfied customer testimonial`,
          'tip_advice': `${baseCategory} professional advice consultation`,
          'promotional': `${baseCategory} sale promotion marketing display`
        }
        
        return searchMappings[template.id] || `${baseCategory} ${template.content_type} professional`
      })

      // Rotate through queries to get diverse images
      const allImages = []
      const imagesPerQuery = Math.ceil(duration / strategyQueries.length)
      
      for (let i = 0; i < strategyQueries.length && allImages.length < duration; i++) {
        try {
          const response = await api.get(`/social/pexels/search`, {
            params: { 
              q: strategyQueries[i],
              per_page: Math.min(imagesPerQuery, 20), // Get some images from each strategy
              orientation: 'landscape'
            }
          })
          
          if (response.data.photos) {
            allImages.push(...response.data.photos.slice(0, imagesPerQuery))
          }
        } catch (error) {
          console.error(`Failed to load images for query: ${strategyQueries[i]}`, error)
        }
      }

      // Shuffle and limit to duration
      const shuffledImages = allImages.sort(() => Math.random() - 0.5)
      setPreviewImages(shuffledImages.slice(0, duration))
      
    } catch (error) {
      console.error('Failed to load preview images:', error)
      setPreviewImages([])
    } finally {
      setLoadingImages(false)
    }
  }

  // Load preview images when relevant state changes
  useEffect(() => {
    if (imageOption === 'pexels' && selectedCategory && templates) {
      loadPreviewImages()
    } else {
      setPreviewImages([])
    }
  }, [imageOption, selectedCategory, duration, templates])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setStep(3)

      const response = await api.post('/social/schedule-bulk', {
        business_category: selectedCategory,
        start_date: startDate,
        duration_days: duration,
        platforms,
        image_option: imageOption,
        include_logo: includeLogo,
        custom_templates: templates?.[selectedCategory]?.templates // Send the custom templates with modified times
      })

      setGeneratedCount(response.data.scheduled_posts_count)
      toast.success(`Generated ${response.data.scheduled_posts_count} posts!`)

      setTimeout(() => {
        onScheduled()
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('Bulk generation failed:', error)
      const message = error.response?.data?.error || 'Failed to generate posts'
      toast.error(message)
      setStep(2) // Go back to preview
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setStartDate('')
    setDuration(7)
    setPlatforms(['facebook'])
    setImageOption('none')
    setIncludeLogo(false)
    setPreviewImages([])
    setLoadingImages(false)
    setGenerating(false)
    setGeneratedCount(0)
    onClose()
  }

  const selectedCategoryData = BUSINESS_CATEGORIES[selectedCategory]
  const templateData = templates?.[selectedCategory]
  const isTrial = subscription?.plan === 'trial'
  const hasSubscription = subscription?.is_active

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-austin-orange/10 rounded-xl p-2">
              <SparklesIcon className="h-5 w-5 text-austin-orange" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Bulk Content Generation</h3>
              <p className="text-xs text-gray-500">Generate 30 days of posts automatically</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Trial Warning */}
        {isTrial && (
          <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                Bulk scheduling requires Basic or Pro plan
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Configuration */}
        {step === 1 && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Configure Your Schedule</h4>
              <p className="text-sm text-gray-500">
                Generate content for your {selectedCategoryData?.name.toLowerCase() || 'business'}
              </p>
            </div>

            <div className="space-y-6">
              {/* Selected Category Display */}
              {selectedCategoryData && (
                <div className={`rounded-xl border-2 p-4 ${selectedCategoryData?.color}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{selectedCategoryData?.icon}</span>
                    <span className="font-semibold">{selectedCategoryData?.name}</span>
                  </div>
                  <p className="text-sm">{selectedCategoryData?.description}</p>
                </div>
              )}

              {/* No business profile warning */}
              {!business && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 shrink-0" />
                    <p className="text-sm font-medium text-yellow-800">
                      Complete your business profile first to generate category-specific content
                    </p>
                  </div>
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="austin-input"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[2, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDuration(days)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        duration === days
                          ? 'border-austin-orange bg-orange-50 text-austin-orange font-semibold'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Posting Times */}
              {templateData?.templates && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Posting Schedule
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Default posting times are optimized for engagement. You can customize them below.
                  </p>
                  
                  {/* Default Schedule Overview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h6 className="text-sm font-semibold text-blue-900 mb-2">📅 Your Posting Schedule</h6>
                    <div className="space-y-2">
                      {templateData.templates.map((template) => {
                        const time = template.schedule?.times?.[0] || '09:00';
                        const frequency = template.schedule?.frequency;
                        const daysOfWeek = template.schedule?.days_of_week;
                        
                        let scheduleText = '';
                        if (frequency === 'daily') {
                          scheduleText = 'Every day';
                        } else if (frequency === 'weekly' && daysOfWeek) {
                          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const days = daysOfWeek.map(d => dayNames[d]).join(', ');
                          scheduleText = `Every ${days}`;
                        }
                        
                        return (
                          <div key={template.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium text-blue-900">{template.name}</span>
                              <span className="text-blue-700 ml-2">• {scheduleText}</span>
                            </div>
                            <span className="font-mono text-blue-800">
                              {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Time Controls */}
                  <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                    <h6 className="text-sm font-semibold text-gray-700">⏰ Customize Times (Optional)</h6>
                    {templateData.templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500">
                            {template.schedule?.frequency === 'daily' ? 'Daily' : 
                             template.schedule?.frequency === 'weekly' ? 'Weekly' : 'Custom'}
                            {template.schedule?.frequency === 'weekly' && template.schedule?.days_of_week && (
                              <span className="ml-1">
                                ({['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                                  .filter((_, i) => template.schedule.days_of_week.includes(i))
                                  .join(', ')})
                              </span>
                            )}
                          </p>
                        </div>
                        <input
                          type="time"
                          defaultValue={template.schedule?.times?.[0] || '09:00'}
                          onChange={(e) => {
                            // Update the template's time in the templates state
                            setTemplates(prev => ({
                              ...prev,
                              [selectedCategory]: {
                                ...prev[selectedCategory],
                                templates: prev[selectedCategory].templates.map(t => 
                                  t.id === template.id 
                                    ? { ...t, schedule: { ...t.schedule, times: [e.target.value] } }
                                    : t
                                )
                              }
                            }));
                          }}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-austin-orange focus:border-austin-orange"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Platforms
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={platforms.includes('facebook')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPlatforms([...platforms, 'facebook'])
                        } else {
                          setPlatforms(platforms.filter(p => p !== 'facebook'))
                        }
                      }}
                      className="rounded border-gray-300 text-austin-orange focus:ring-austin-orange"
                    />
                    <span className="text-sm text-gray-700">Facebook</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer opacity-50">
                    <input
                      type="checkbox"
                      disabled
                      className="rounded border-gray-300 text-austin-orange focus:ring-austin-orange"
                    />
                    <span className="text-sm text-gray-500">Instagram (Coming Soon)</span>
                  </label>
                </div>
              </div>

              {/* Image Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Images
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="imageOption"
                      value="none"
                      checked={imageOption === 'none'}
                      onChange={(e) => setImageOption(e.target.value)}
                      className="text-austin-orange focus:ring-austin-orange"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Text-only posts</span>
                      <p className="text-xs text-gray-500">No images, just engaging captions</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="imageOption"
                      value="pexels"
                      checked={imageOption === 'pexels'}
                      onChange={(e) => setImageOption(e.target.value)}
                      className="text-austin-orange focus:ring-austin-orange"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Stock photos</span>
                      <p className="text-xs text-gray-500">AI-selected images from Pexels gallery</p>
                    </div>
                  </label>

                  {imageOption === 'pexels' && (
                    <div className="ml-6 pl-3 border-l-2 border-austin-orange/20 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeLogo}
                          onChange={(e) => setIncludeLogo(e.target.checked)}
                          className="rounded border-gray-300 text-austin-orange focus:ring-austin-orange"
                        />
                        <span className="text-sm text-gray-700">Stamp logo on images</span>
                      </label>

                      {/* Image Preview Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            Preview images ({Math.min(previewImages.length, duration)} images for {duration} days)
                          </span>
                          {loadingImages && (
                            <span className="flex items-center gap-1 text-xs text-austin-orange">
                              <ArrowPathIcon className="h-3 w-3 animate-spin" />
                              Loading...
                            </span>
                          )}
                        </div>
                        
                        {previewImages.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                            {previewImages.slice(0, duration).map((photo, index) => {
                              // Determine which strategy this image represents
                              const templateData = templates[selectedCategory]
                              const strategyIndex = index % templateData.templates.length
                              const strategy = templateData.templates[strategyIndex]
                              
                              return (
                                <div key={photo.id} className="relative group">
                                  <img
                                    src={photo.src.small}
                                    alt={photo.alt}
                                    className="w-full h-16 object-cover rounded border border-gray-200"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded transition-all">
                                    <div className="absolute inset-0 p-1 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="text-white text-xs font-medium bg-black bg-opacity-50 rounded px-1 text-center truncate">
                                        {strategy.name}
                                      </div>
                                      <div className="text-white text-xs bg-black bg-opacity-50 rounded px-1 text-center truncate">
                                        {photo.photographer}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            {/* Show message if we need more images than available */}
                            {previewImages.length < duration && (
                              <div className="col-span-4 text-xs text-gray-500 bg-gray-50 rounded p-2 text-center">
                                + Additional images will be selected for remaining {duration - previewImages.length} days
                              </div>
                            )}
                          </div>
                        ) : imageOption === 'pexels' && !loadingImages ? (
                          <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                            Images will be automatically selected based on your business type
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={handleClose}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-6 py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!startDate || !platforms.length || !business}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-austin-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl transition-colors"
              >
                Preview
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Preview Your Schedule</h4>
              <p className="text-sm text-gray-500">
                Review the configuration before generating your posts
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedCategoryData?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {duration} days
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Platforms:</span>
                    <span className="ml-2 font-semibold text-gray-900 capitalize">
                      {platforms.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Images:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {imageOption === 'none' ? 'Text only' : 'Stock photos'}
                      {imageOption === 'pexels' && includeLogo && ' + Logo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Preview */}
              {templateData && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Content Templates</h5>
                  <div className="space-y-2">
                    {templateData.templates.slice(0, 3).map((template, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-austin-orange"></div>
                        <span className="text-gray-700">{template.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 capitalize">{template.content_type}</span>
                        {template.schedule?.times?.[0] && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">
                              {new Date(`2000-01-01T${template.schedule.times[0]}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                    {templateData.templates.length > 3 && (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span>+{templateData.templates.length - 3} more templates</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estimated Posts */}
              <div className="bg-austin-orange/5 border border-austin-orange/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="h-5 w-5 text-austin-orange" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Estimated: {duration} posts
                    </p>
                    <p className="text-sm text-gray-600">
                      AI will generate unique content for each post
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Usage Preview */}
              {quota && (
                <div className={`border rounded-xl p-4 ${
                  (() => {
                    const contentCreditsNeeded = duration;
                    const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                    const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                    const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                    
                    return (contentAffordable && imageAffordable) 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200';
                  })()
                }`}>
                  <div className="flex items-start gap-3">
                    {(() => {
                      const contentCreditsNeeded = duration;
                      const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                      const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                      const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                      
                      return (contentAffordable && imageAffordable) ? (
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                        </div>
                      );
                    })()}
                    
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        (() => {
                          const contentCreditsNeeded = duration;
                          const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                          const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                          const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                          
                          return (contentAffordable && imageAffordable) ? 'text-green-700' : 'text-red-700';
                        })()
                      }`}>
                        Credit Usage Estimate
                      </p>
                      
                      <div className="space-y-2 mt-2">
                        {/* Content Credits */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Content Generation:</span>
                          <span className={`font-medium ${
                            quota.content_generate.remaining >= duration ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {duration} needed ({quota.content_generate.remaining} available)
                          </span>
                        </div>

                        {/* Image Credits */}
                        {imageOption === 'pexels' && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Image Generation:</span>
                            <span className={`font-medium ${
                              quota.image_generate.remaining >= duration ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {duration} needed ({quota.image_generate.remaining} available)
                            </span>
                          </div>
                        )}

                        {/* Warning for insufficient credits */}
                        {(() => {
                          const contentCreditsNeeded = duration;
                          const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                          const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                          const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                          
                          if (!contentAffordable || !imageAffordable) {
                            return (
                              <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
                                ⚠️ Insufficient credits. {quota.plan === 'trial' ? 'Upgrade your plan' : 'Buy more credits'} or reduce the number of days.
                              </p>
                            );
                          }
                          return null;
                        })()}

                        {/* Buy More Credits Button - Always Visible */}
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              window.open('/payments', '_blank');
                            }}
                            className="w-full text-sm font-medium text-austin-orange bg-austin-orange/10 hover:bg-austin-orange/20 border border-austin-orange/30 hover:border-austin-orange/50 px-4 py-2 rounded-lg transition-colors"
                          >
                            💳 {(() => {
                              const contentCreditsNeeded = duration;
                              const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                              const totalCreditsNeeded = contentCreditsNeeded + imageCreditsNeeded;
                              const contentShortfall = Math.max(0, contentCreditsNeeded - quota.content_generate.remaining);
                              const imageShortfall = imageOption === 'pexels' ? Math.max(0, imageCreditsNeeded - quota.image_generate.remaining) : 0;
                              const totalShortfall = contentShortfall + imageShortfall;
                              
                              if (totalShortfall > 0) {
                                return `Buy ${totalShortfall} More Credits`;
                              } else {
                                return 'Buy More Credits';
                              }
                            })()}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-6 py-2.5 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={quota && (() => {
                  const contentCreditsNeeded = duration;
                  const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                  const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                  const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                  
                  return !(contentAffordable && imageAffordable);
                })()}
                className={`flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors ${
                  quota && (() => {
                    const contentCreditsNeeded = duration;
                    const imageCreditsNeeded = imageOption === 'pexels' ? duration : 0;
                    const contentAffordable = quota.content_generate.remaining >= contentCreditsNeeded;
                    const imageAffordable = imageOption === 'none' || quota.image_generate.remaining >= imageCreditsNeeded;
                    
                    return !(contentAffordable && imageAffordable);
                  })()
                    ? 'text-gray-500 bg-gray-300 cursor-not-allowed' 
                    : 'text-white bg-austin-orange hover:bg-orange-600'
                }`}
              >
                <SparklesIcon className="h-4 w-4" />
                Generate Posts
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div className="p-6">
            <div className="text-center py-8">
              <div className="bg-austin-orange/10 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                {generating ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-austin-orange"></div>
                ) : (
                  <CheckCircleIcon className="h-8 w-8 text-austin-orange" />
                )}
              </div>
              
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {generating ? 'Generating Your Posts...' : 'Posts Generated Successfully!'}
              </h4>
              
              <p className="text-gray-600 mb-4">
                {generating 
                  ? 'AI is creating personalized content for your business. This may take a moment.'
                  : `Successfully created ${generatedCount} scheduled posts for your ${selectedCategoryData?.name.toLowerCase()}.`
                }
              </p>

              {!generating && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="font-semibold">Your automated posting is now active!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Posts will be published automatically according to your schedule.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}