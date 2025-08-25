'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/Components/layout/Header'
import Footer from '@/Components/layout/Footer'
import CurrentTrafficAlerts from '@/Components/home/CurrentTrafficAlerts'
import ActionTabs from '@/Components/home/ActionTabs'
import { authAPI, UserProfile, HomeResponse } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [homeData, setHomeData] = useState<HomeResponse | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        if (!authAPI.isAuthenticated()) {
          router.push('/login')
          return
        }

        // Fetch user profile
        const profileResult = await authAPI.getProfile()
        if (!profileResult.success) {
          router.push('/login')
          return
        }

        // Fetch home page data
        const homeResult = await authAPI.getHome()
        
        setUser(profileResult)
        setHomeData(homeResult)
      } catch (error) {
        console.error('Authentication check failed:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-900 via-brand-900 to-brand-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400 mx-auto mb-4"></div>
          <p className="text-brand-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white/40">
      <Header />
      
      <main className="flex-row">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Hero Section */}
          <section className="text-center mb-12">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-green-950 mb-5">
                Welcome back, <span className="text-green-950">{user?.firstName || 'User'}</span>!
              </h1>
              <p className="text-lg md:text-xl text-black leading-relaxed">
                Your community-driven platform for road safety reporting and real-time hazard alerts.
                Together, we can make Sri Lankan roads safer for everyone.
              </p>
              <div className="mt-6 flex justify-center gap-6 text-sm md:text-base text-brand-900">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-red-700 rounded-full mr-2 shadow" />
                  <span>Real-time Alerts</span>
                </div>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-900 rounded-full mr-2 shadow" />
                  <span>Community Reports</span>
                </div>
              </div>
             
            </div>
          </section>

          {/* Current Traffic Alerts Section */}
          <section className="mb-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Current Traffic Alerts</h2>
              <p className="text-gray-600">Live hazard reports within 25km from the last 24 hours</p>
            </div>
            <CurrentTrafficAlerts userLocation={user?.locationDetails?.address || 'your location'} />
          </section>

          {/* Action Tabs Section */}
          <section className="mb-14">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-black/80 mb-2">Report & Monitor</h2>
              <p className="text-black/50">View existing reports or submit new hazard information</p>
            </div>
            <ActionTabs />
          </section>

          {/* Quick Stats */}
          <section className="m-1" aria-label="Platform statistics">
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-brand-600/50 via-brand-500/30 to-brand-300/20 shadow-md shadow-black/30 overflow-hidden">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(10,209,200,0.12),transparent_70%)]" />
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-brand-900/40 px-6 sm:px-10 py-10">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-6 min-w-[620px] md:min-w-0">
                  {/* Stat Card */}
                  <div className="group relative flex flex-col items-center text-center">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-500/10 to-brand-300/5 rounded-2xl" />
                    <div className="relative mb-5">
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-2 ring-brand-400/30 group-hover:scale-105 group-hover:ring-brand-300/50 transition-all">
                        <svg className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z" />
                          <path d="M17 17v-4h3v7h-7v-3h4z" />
                        </svg>
                      </div>
                      <div className="absolute -inset-2 rounded-3xl bg-brand-500/0 blur-xl group-hover:bg-brand-500/20 transition-colors" aria-hidden="true" />
                    </div>
                    <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-black group-hover:text-gray-800 transition-colors">{homeData?.totalReports ?? 1247}</div>
                      <p className="mt-1 md:mt-2 text-xs md:text-sm font-medium tracking-wide text-black/70">Reports Submitted</p>
                  </div>

                  <div className="group relative flex flex-col items-center text-center">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-500/10 to-brand-300/5 rounded-2xl" />
                    <div className="relative mb-5">
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-2 ring-brand-300/40 group-hover:scale-105 group-hover:ring-brand-200/70 transition-all">
                        <svg className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 3v18M3 12h18" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      </div>
                      <div className="absolute -inset-2 rounded-3xl bg-brand-400/0 blur-xl group-hover:bg-brand-400/20 transition-colors" aria-hidden="true" />
                    </div>
                    <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-red-600 group-hover:text-red-500 transition-colors">{homeData?.activeAlerts ?? 45}</div>
                    <p className="mt-1 md:mt-2 text-xs md:text-sm font-medium tracking-wide text-red-600/70">Active Alerts</p>
                  </div>

                  {/* Resolved Hazards */}
                  <div className="group relative flex flex-col items-center text-center">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-500/10 to-brand-300/5 rounded-2xl" />
                    <div className="relative mb-5">
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-2 ring-brand-300/40 group-hover:scale-105 group-hover:ring-brand-200/70 transition-all">
                        <svg className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Z" />
                          <path d="M16 10l-4 4-2-2" />
                        </svg>
                      </div>
                      <div className="absolute -inset-2 rounded-3xl bg-brand-400/0 blur-xl group-hover:bg-brand-400/20 transition-colors" aria-hidden="true" />
                    </div>
                    <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-brand-600 group-hover:text-brand-500 transition-colors">{homeData?.resolvedHazards ?? 0}</div>
                    <p className="mt-1 md:mt-2 text-xs md:text-sm font-medium tracking-wide text-brand-600/70">Resolved Hazards</p>
                  </div>

                  <div className="group relative flex flex-col items-center text-center">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-500/10 to-brand-300/5 rounded-2xl" />
                    <div className="relative mb-5">
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-300 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-2 ring-brand-300/40 group-hover:scale-105 group-hover:ring-brand-200/60 transition-all">
                        <svg className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                          <path d="M6.5 20a5.5 5.5 0 0 1 11 0v.5H6.5z" />
                        </svg>
                      </div>
                      <div className="absolute -inset-2 rounded-3xl bg-brand-300/0 blur-xl group-hover:bg-brand-300/25 transition-colors" aria-hidden="true" />
                    </div>
                    <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-green-600 group-hover:text-green-500 transition-colors">{homeData?.communityMembers ?? 2156}</div>
                    <p className="mt-1 md:mt-2 text-xs md:text-sm font-medium tracking-wide text-green-600/70">Community Members</p>
                  </div>
                  </div>
                </div>

                {/* Decorative bottom border glow */}
                <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" aria-hidden="true" />
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}