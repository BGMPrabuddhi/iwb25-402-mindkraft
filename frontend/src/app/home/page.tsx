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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Hero Section */}
          <section className="text-center mb-10">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome back, <span className="text-blue-600">{user?.firstName || 'User'}</span>!
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Your community-driven platform for road safety reporting and real-time hazard alerts. 
                Together, we can make Sri Lankan roads safer for everyone.
              </p>
              <div className="mt-6 flex justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  Real-time Alerts
                </div>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                  Community Reports
                </div>
              </div>
              {homeData?.message && (
                <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg">
                  {homeData.message}
                </div>
              )}
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
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Report & Monitor</h2>
              <p className="text-gray-600">View existing reports or submit new hazard information</p>
            </div>
            <ActionTabs />
          </section>

          {/* Quick Stats */}
          <section className="mt-12">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
                  <div className="text-sm text-gray-600">Reports Submitted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">45</div>
                  <div className="text-sm text-gray-600">Active Alerts</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">2,156</div>
                  <div className="text-sm text-gray-600">Community Members</div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}