import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid'
import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  
  const plans = {
    basic: {
      name: 'Basic Plan',
      monthly: { price: 39, yearlyDiscount: 0 },
      annual: { price: 312, yearlyDiscount: 156, effectiveMonthly: 26 },
      features: [
        '200 Credits per month',
        '5 Social post generations per month (10 posts each)',
        '30 Post enhancements per month', 
        '25 AI image generations per month',
        '25 Caption generations per month',
        '25 Email compositions per day',
        'Austin-specific content',
        'Local event integration',
        'Email support'
      ]
    },
    pro: {
      name: 'Pro Plan',
      monthly: { price: 79, yearlyDiscount: 0 },
      annual: { price: 632, yearlyDiscount: 316, effectiveMonthly: 53 },
      features: [
        '500 Credits per month',
        '15 Social post generations per month (10 posts each)',
        '100 Post enhancements per month',
        '75 AI image generations per month', 
        '75 Caption generations per month',
        '75 Email compositions per day',
        'All Basic features',
        'Priority support',
        'Early access to new features'
      ]
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple Pricing for Austin Small Businesses
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start with a free trial, then choose monthly or annual billing
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="relative bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-2 text-sm font-medium rounded-md transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative px-6 py-2 text-sm font-medium rounded-md transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-2 bg-austin-green text-white text-xs px-2 py-1 rounded-full">
                  Save up to 33%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* Free Trial */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  Free Trial
                </h3>
                <div className="mt-4 flex items-center justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">$0</span>
                  <span className="ml-2 text-xl text-gray-500">/7 days</span>
                </div>
                <p className="mt-2 text-sm text-austin-green font-semibold">
                  No credit card required
                </p>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-4">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">20 Credits total</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">2 Social post generations (20 posts total)</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">5 Post enhancements</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">2 AI image generations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">3 Caption generations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">Austin-specific content</span>
                </li>
              </ul>

              <div className="mt-8">
                <Link
                  to="/register"
                  state={{ plan: 'trial' }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white text-center block text-lg py-3 rounded-lg font-semibold transition duration-200"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
          
          {/* Basic Plan */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  {plans.basic.name}
                </h3>
                <div className="mt-4 flex items-center justify-center">
                  {billingCycle === 'annual' ? (
                    <>
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plans.basic.annual.effectiveMonthly}
                      </span>
                      <span className="ml-2 text-xl text-gray-500">/month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plans.basic.monthly.price}
                      </span>
                      <span className="ml-2 text-xl text-gray-500">/month</span>
                    </>
                  )}
                </div>
                {billingCycle === 'annual' && (
                  <p className="mt-2 text-sm text-austin-green font-semibold">
                    Save ${plans.basic.annual.yearlyDiscount}/year • Billed annually at ${plans.basic.annual.price}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Billed immediately • Cancel anytime
                </p>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-4">
                {plans.basic.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  to="/register"
                  state={{ plan: 'basic', billingCycle, requiresPayment: true }}
                  className="w-full austin-button text-center block text-lg py-3"
                >
                  Get Basic Plan Now
                </Link>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-austin-orange">
            
            {/* Popular Badge */}
            <div className="bg-austin-orange text-white text-center py-2">
              <p className="text-sm font-semibold">
                🏆 Most Popular
              </p>
            </div>

            <div className="px-6 py-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  {plans.pro.name}
                </h3>
                <div className="mt-4 flex items-center justify-center">
                  {billingCycle === 'annual' ? (
                    <>
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plans.pro.annual.effectiveMonthly}
                      </span>
                      <span className="ml-2 text-xl text-gray-500">/month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plans.pro.monthly.price}
                      </span>
                      <span className="ml-2 text-xl text-gray-500">/month</span>
                    </>
                  )}
                </div>
                {billingCycle === 'annual' && (
                  <p className="mt-2 text-sm text-austin-green font-semibold">
                    Save ${plans.pro.annual.yearlyDiscount}/year • Billed annually at ${plans.pro.annual.price}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Billed immediately • Cancel anytime
                </p>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-4">
                {plans.pro.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  to="/register"
                  state={{ plan: 'pro', billingCycle, requiresPayment: true }}
                  className="w-full austin-button text-center block text-lg py-3"
                >
                  Get Pro Plan Now
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Value Comparison */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Compare the Value
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 mb-4">
                ❌ Without Austin Marketing Assistant:
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li>• Spend 5+ hours weekly creating posts</li>
                <li>• Hire social media manager: $1,500-3,000/month</li>
                <li>• Use 3+ different tools: $100-200/month</li>
                <li>• Generic content that doesn't feel local</li>
                <li>• Miss local events and opportunities</li>
                <li>• Inconsistent posting schedule</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-austin-green mb-4">
                ✅ With Austin Marketing Assistant:
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li>• 5 minutes setup, content ready instantly</li>
                <li>• Professional marketing content: Starting at ${billingCycle === 'annual' ? '$26' : '$39'}/month</li>
                <li>• All-in-one solution, no multiple tools</li>
                <li>• Austin-specific, locally relevant content</li>
                <li>• Never miss SXSW, ACL, or local events</li>
                <li>• Consistent, high-quality posting</li>
                {billingCycle === 'annual' && (
                  <li>• <strong>Save up to $316/year</strong> with annual billing</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Join Austin Businesses Already Saving Time
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">
                "Finally, marketing that actually sounds like Austin!"
              </p>
              <p className="text-sm font-semibold">- Local Restaurant Owner</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">
                "Saved me 10 hours per week. Best $39 I spend!"
              </p>
              <p className="text-sm font-semibold">- Food Truck Owner</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">
                "Love how it mentions South by and ACL!"
              </p>
              <p className="text-sm font-semibold">- Boutique Owner</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 austin-gradient rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Keep Austin Local?
          </h3>
          <p className="text-lg mb-6">
            Start with a free trial (no credit card needed), then choose the plan that fits your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              state={{ plan: 'trial' }}
              className="bg-white text-austin-blue hover:bg-gray-100 font-bold py-4 px-8 rounded-lg text-xl transition duration-200 inline-block"
            >
              Start Free Trial
              <span className="block text-sm mt-1">No credit card required</span>
            </Link>
            <Link
              to="/register"
              state={{ plan: 'basic', billingCycle, requiresPayment: true }}
              className="bg-austin-orange hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-200 inline-block"
            >
              Get Basic Plan
              {billingCycle === 'annual' && (
                <span className="block text-sm mt-1">Save 20% annually</span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}