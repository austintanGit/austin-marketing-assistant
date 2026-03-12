import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid'
import { Link } from 'react-router-dom'

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple Pricing for Austin Small Businesses
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            One plan, everything included. Built specifically for local Austin businesses.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mt-16 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            
            {/* Popular Badge */}
            <div className="bg-austin-orange text-white text-center py-2">
              <p className="text-sm font-semibold">
                🏆 Most Popular for Austin Businesses
              </p>
            </div>

            <div className="px-6 py-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  Austin Local Plan
                </h3>
                <div className="mt-4 flex items-center justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">$39</span>
                  <span className="ml-2 text-xl text-gray-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  First month free • Cancel anytime
                </p>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-4">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>30 Social Media Posts</strong> per month
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>8 Google My Business Posts</strong> for local SEO
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>4 Email Newsletter Templates</strong>
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>Austin Event Integration</strong> (SXSW, ACL, local holidays)
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>Local Landmark References</strong>
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>Keep Austin Weird</strong> brand voice
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>Easy copy & paste</strong> - no complex tools
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span className="text-gray-700">
                    <strong>Email support</strong> from local team
                  </span>
                </li>
              </ul>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="w-full austin-button text-center block text-lg py-3"
                >
                  Start Free Trial
                </Link>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  No setup fees • No contracts • Cancel anytime
                </p>
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
                <li>• Professional marketing content: $39/month</li>
                <li>• All-in-one solution, no multiple tools</li>
                <li>• Austin-specific, locally relevant content</li>
                <li>• Never miss SXSW, ACL, or local events</li>
                <li>• Consistent, high-quality posting</li>
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
            Join the Austin small business community saving time and growing locally.
          </p>
          <Link
            to="/register"
            className="bg-austin-orange hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-200 inline-block"
          >
            Start Your Free Month
          </Link>
        </div>
      </div>
    </div>
  )
}