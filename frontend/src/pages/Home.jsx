import { Link } from 'react-router-dom'
import { 
  SparklesIcon, 
  ClockIcon, 
  MapPinIcon,
  HeartIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="austin-gradient">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-6">
              AI-Powered Marketing for <span className="text-yellow-300">Austin</span> Small Businesses
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Get 30 days of social media posts, Google My Business updates, and email content 
              specifically crafted for your Austin business. Setup takes just 5 minutes.
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                to="/register" 
                className="bg-austin-orange hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition duration-200"
              >
                Start Free Trial
              </Link>
              <Link 
                to="/pricing" 
                className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-bold py-4 px-8 rounded-lg text-lg transition duration-200"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for Austin Businesses
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="austin-card text-center">
              <SparklesIcon className="h-12 w-12 text-austin-orange mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Austin-Smart AI</h3>
              <p className="text-gray-600">
                Mentions local events like SXSW, ACL, and Keep Austin Weird culture. 
                Your content feels authentically local.
              </p>
            </div>

            <div className="austin-card text-center">
              <ClockIcon className="h-12 w-12 text-austin-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">5-Minute Setup</h3>
              <p className="text-gray-600">
                Tell us about your business and get a month's worth of 
                marketing content instantly. No learning curve.
              </p>
            </div>

            <div className="austin-card text-center">
              <MapPinIcon className="h-12 w-12 text-austin-blue mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Local SEO Focused</h3>
              <p className="text-gray-600">
                Google My Business posts optimized for Austin searches. 
                Help locals find your business.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What You Get Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            What You Get Every Month
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>30 Social Media Posts</strong> for Facebook & Instagram</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>8 Google My Business Posts</strong> for local SEO</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>4 Email Newsletter Templates</strong> for customers</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>Austin Event Integration</strong> (SXSW, ACL, local holidays)</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>Seasonal Content</strong> matching Austin weather & vibes</span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-austin-green mr-3" />
                  <span><strong>Easy Copy & Paste</strong> - no complex scheduling</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-4 text-austin-blue">
                Perfect for Austin:
              </h3>
              <div className="space-y-3 text-gray-700">
                <p>🌮 <strong>Food Trucks</strong> - Mention your next stop and local events</p>
                <p>✂️ <strong>Salons</strong> - Connect with Austin's style scene</p>
                <p>🍕 <strong>Restaurants</strong> - Highlight local ingredients & vibes</p>
                <p>🛍️ <strong>Boutiques</strong> - Capture Keep Austin Weird spirit</p>
                <p>🔧 <strong>Services</strong> - Build trust in local communities</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="austin-gradient">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-white">
            <HeartIcon className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Keep Austin Local
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join Austin small businesses who are saving 5+ hours per week on marketing 
              while growing their local customer base.
            </p>
            <Link 
              to="/register" 
              className="bg-austin-orange hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-200 inline-block"
            >
              Start Your Free Trial
            </Link>
            <p className="text-sm mt-4 opacity-80">
              First month free • No contracts • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}