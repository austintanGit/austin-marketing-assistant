import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../services/api'
import { 
  BuildingStorefrontIcon,
  MapPinIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline'

export default function Setup() {
  const [currentStep, setCurrentStep] = useState(1)
  const [businessTypes, setBusinessTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors }, watch } = useForm()

  useEffect(() => {
    // Load business types
    api.get('/business/types')
      .then(response => setBusinessTypes(response.data.business_types))
      .catch(err => console.error('Failed to load business types:', err))
  }, [])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await api.post('/business/profile', data)
      toast.success('Business profile created! Generating your content...')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  const steps = [
    { number: 1, title: 'Business Info', icon: BuildingStorefrontIcon },
    { number: 2, title: 'Location', icon: MapPinIcon },
    { number: 3, title: 'Audience', icon: UserGroupIcon },
    { number: 4, title: 'Voice & Tone', icon: ChatBubbleLeftRightIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Let's Set Up Your Austin Business
          </h1>
          <p className="mt-2 text-gray-600">
            This takes about 5 minutes. We'll use this to create your personalized marketing content.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.number 
                  ? 'bg-austin-orange border-austin-orange text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.number ? 'text-austin-orange' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <ArrowRightIcon className="h-5 w-5 text-gray-400 mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            
            {/* Step 1: Business Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Tell us about your business
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    {...register('business_name', { required: 'Business name is required' })}
                    className="austin-input"
                    placeholder="e.g. Joe's BBQ Pit"
                  />
                  {errors.business_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.business_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    {...register('business_type', { required: 'Please select a business type' })}
                    className="austin-input"
                  >
                    <option value="">Select your business type</option>
                    {businessTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.business_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.business_type.message}</p>
                  )}
                  {watch('business_type') && (
                    <div className="mt-2 p-3 bg-austin-blue bg-opacity-10 rounded-lg">
                      <p className="text-sm text-austin-blue">
                        💡 {businessTypes.find(t => t.value === watch('business_type'))?.austin_note}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your Business *
                  </label>
                  <textarea
                    {...register('description', { 
                      required: 'Business description is required',
                      maxLength: { value: 500, message: 'Description must be under 500 characters' }
                    })}
                    className="austin-input h-24"
                    placeholder="What makes your business special? What do you offer? Keep it under 500 characters."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {watch('description')?.length || 0}/500 characters
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Where are you located in Austin?
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <input
                    {...register('address', { required: 'Address is required' })}
                    className="austin-input"
                    placeholder="123 Main St, Austin, TX 78701"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    This helps us create location-specific content
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (optional)
                  </label>
                  <input
                    {...register('phone')}
                    className="austin-input"
                    placeholder="(512) 555-0123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (optional)
                  </label>
                  <input
                    {...register('website')}
                    type="url"
                    className="austin-input"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Target Audience */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Who are your customers?
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience *
                  </label>
                  <textarea
                    {...register('target_audience', { 
                      required: 'Target audience is required',
                      maxLength: { value: 300, message: 'Must be under 300 characters' }
                    })}
                    className="austin-input h-24"
                    placeholder="e.g. Young professionals in downtown Austin, families in South Austin, college students near UT campus..."
                  />
                  {errors.target_audience && (
                    <p className="text-red-500 text-sm mt-1">{errors.target_audience.message}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {watch('target_audience')?.length || 0}/300 characters
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">💡 Austin Tips:</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Mention specific Austin neighborhoods (East 6th, South Lamar, North Loop)</li>
                    <li>• Think about age groups and lifestyle (UT students, young families, retirees)</li>
                    <li>• Consider local interests (live music, food trucks, outdoor activities)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Voice & Tone */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  What's your brand personality?
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Choose your brand voice *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'friendly', label: 'Friendly & Welcoming', desc: 'Warm, approachable, like talking to neighbors' },
                      { value: 'professional', label: 'Professional & Trustworthy', desc: 'Reliable, expert, builds confidence' },
                      { value: 'casual', label: 'Casual & Laid-back', desc: 'Relaxed Austin vibes, conversational' },
                      { value: 'quirky', label: 'Quirky & Creative', desc: 'Keep Austin Weird energy, unique personality' }
                    ].map(tone => (
                      <label key={tone.value} className="cursor-pointer">
                        <input
                          {...register('tone', { required: 'Please select a tone' })}
                          type="radio"
                          value={tone.value}
                          className="sr-only"
                        />
                        <div className={`border-2 rounded-lg p-4 transition-colors ${
                          watch('tone') === tone.value 
                            ? 'border-austin-orange bg-orange-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <h3 className="font-semibold text-gray-900">{tone.label}</h3>
                          <p className="text-sm text-gray-600 mt-1">{tone.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.tone && (
                    <p className="text-red-500 text-sm mt-2">{errors.tone.message}</p>
                  )}
                </div>

                <div className="bg-austin-blue bg-opacity-10 border border-austin-blue border-opacity-20 rounded-lg p-4">
                  <h3 className="font-semibold text-austin-blue mb-2">🎯 What happens next?</h3>
                  <p className="text-sm text-austin-blue">
                    We'll generate 30+ pieces of marketing content specifically for your Austin business, 
                    including mentions of local events, Austin culture, and your neighborhood!
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="austin-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="austin-button"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="austin-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Profile...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}