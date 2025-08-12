import Link from 'next/link'
import { PhoneIcon, EnvelopeIcon, MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div className="ml-3">
                <h3 className="text-xl font-bold">SafeRoute</h3>
                <p className="text-gray-400 text-sm">Road Safety Platform</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              Making roads safer through community reporting and real-time alerts. 
              Join thousands of users helping create safer transportation for everyone in Sri Lanka.
            </p>
            <div className="flex flex-wrap gap-4">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Safe Travels
              </span>
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Report Issues
              </span>
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Community Driven
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-blue-400">Quick Actions</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/report" className="flex items-center text-gray-300 hover:text-white transition-colors group">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Report Hazard
                </Link>
              </li>
              <li>
                <Link href="/reports" className="flex items-center text-gray-300 hover:text-white transition-colors group">
                  <svg className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Reports
                </Link>
              </li>
              <li>
                <Link href="/emergency" className="flex items-center text-gray-300 hover:text-white transition-colors group">
                  <svg className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Emergency Help
                </Link>
              </li>
              <li>
                <Link href="/about" className="flex items-center text-gray-300 hover:text-white transition-colors group">
                  <svg className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-blue-400">Get Help</h4>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <PhoneIcon className="h-4 w-4 mr-2 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Emergency</p>
                  <p className="text-red-400 font-bold">119</p>
                </div>
              </div>
              <div className="flex items-center text-gray-300">
                <PhoneIcon className="h-4 w-4 mr-2 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Support</p>
                  <p className="text-blue-400 font-bold">1919</p>
                </div>
              </div>
              <div className="flex items-center text-gray-300">
                <EnvelopeIcon className="h-4 w-4 mr-2 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <Link href="mailto:support@saferoute.lk" className="text-green-400 hover:text-green-300 text-sm">
                    support@saferoute.lk
                  </Link>
                </div>
              </div>
              <div className="flex items-center text-gray-300">

               
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
       <div className="border-t border-gray-700 mt-8 pt-8">
  <div className="flex flex-col md:flex-row justify-center items-center">
    <p className="text-gray-400 text-sm text-center">
              &copy; 2025 SafeRoute. All rights reserved. Made with care for safer roads.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer