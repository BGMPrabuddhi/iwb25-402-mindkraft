import Link from 'next/link'
import { PhoneIcon, EnvelopeIcon, MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const Footer = () => {
  return (
    <footer className="mt-auto relative text-gray-800">
      <div className="absolute inset-0 bg-blue-950  backdrop-blur-xl" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(10,209,200,0.15),transparent_60%)]" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-7 relative">
              <div className="absolute -left-6 -top-6 h-24 w-24 bg-brand-400/30 blur-2xl rounded-full" aria-hidden="true" />
              
              <div className="ml-4">
                <h3 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">SafeRoute</h3>
                <p className="text-gray-400 text-sm font-medium">Road Safety Platform</p>
              </div>
            </div>
            <p className="text-gray-400 mb-7 max-w-lg leading-relaxed text-sm md:text-base">
              Making roads safer through community reporting and real-time alerts.
              Join thousands of users helping create safer transportation for everyone in Sri Lanka.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-600 shadow-sm hover:bg-brand-500/15 transition">Safe Travels</span>
              <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-600 shadow-sm hover:bg-brand-500/15 transition">Report Issues</span>
              <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-600 shadow-sm hover:bg-brand-500/15 transition">Community Driven</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative">
            <h4 className="text-lg font-semibold mb-5 text-gray-400">Quick Actions</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/home" className="flex items-center text-gray-400 hover:text-gray-900 transition-colors group">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-brand-500 group-hover:scale-110 transition-transform" />
                  Report Hazard
                </Link>
              </li>
              <li>
                <Link href="/reports-history" className="flex items-center text-gray-400 hover:text-gray-900 transition-colors group">
                  <svg className="h-4 w-4 mr-2 text-brand-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Reports
                </Link>
              </li>
              <li>
                <Link href="/emergency" className="flex items-center text-gray-400 hover:text-gray-900 transition-colors group">
                  <svg className="h-4 w-4 mr-2 text-brand-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Emergency Help
                </Link>
              </li>
              <li>
                <Link href="/about" className="flex items-center text-gray-400 hover:text-gray-900 transition-colors group">
                  <svg className="h-4 w-4 mr-2 text-brand-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="relative">
            <h4 className="text-lg font-semibold mb-5 text-gray-400">Get Help</h4>
            <div className="space-y-4 text-sm">
              <div className="flex items-center text-gray-400">
                <PhoneIcon className="h-4 w-4 mr-3 text-red-600" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Emergency</p>
                  <p className="text-base font-bold text-red-600">119</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-3 text-green-600" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Support</p>
                  <p className="text-base font-bold text-green-600">1919</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-3 text-green-600" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
                  <Link href="mailto:support@saferoute.lk" className="text-green-600 text-sm font-medium">
                    support@saferoute.lk
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-14 relative">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <div className="mt-6 flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="text-gray-400 text-xs md:text-sm text-center tracking-wide">&copy; 2025 SafeRoute. All rights reserved. Built for safer journeys.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer