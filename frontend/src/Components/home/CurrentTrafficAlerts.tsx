'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { reportsAPI, HazardReport } from '@/lib/api'

interface CurrentTrafficAlertsProps {
  userLocation?: string
}

const CurrentTrafficAlerts = ({ userLocation }: CurrentTrafficAlertsProps) => {
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [trafficAlerts, setTrafficAlerts] = useState<HazardReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocationData, setUserLocationData] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null)

  useEffect(() => {
    const fetchTrafficAlerts = async () => {
       console.log('CurrentTrafficAlerts: Starting fetch...')
      setIsLoading(true)
      setError(null)
      
      try {
        console.log('Fetching traffic alerts...')
        const response = await reportsAPI.getCurrentTrafficAlerts()
        console.log('Traffic alerts response:', response)
        
        // Make sure we're getting the alerts array correctly
        const alertsData = response.alerts || []
        setTrafficAlerts(alertsData)
        setUserLocationData(response.user_location)
        
        console.log(`Loaded ${alertsData.length} traffic alerts`)
      } catch (err: unknown) {
        console.error('Error fetching current traffic alerts:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch current traffic alerts'
        setError(errorMessage)
        setTrafficAlerts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrafficAlerts()
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchTrafficAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const nextAlert = () => {
    setCurrentAlertIndex((prev) => 
      prev === trafficAlerts.length - 1 ? 0 : prev + 1
    )
  }

  const prevAlert = () => {
    setCurrentAlertIndex((prev) => 
      prev === 0 ? trafficAlerts.length - 1 : prev - 1
    )
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days}d ago`
    }
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return ''
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`
    }
    return `${distance.toFixed(1)}km away`
  }

  interface SeverityStyle {
    bg: string;
    border: string;
    text: string;
    badge: string;
    icon: string;
    priority: string;
  }

  const severityStyles: Record<string, SeverityStyle> = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      badge: 'bg-red-200 text-red-900',
      icon: 'text-red-600',
      priority: 'CRITICAL'
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      text: 'text-orange-900',
      badge: 'bg-orange-200 text-orange-900',
      icon: 'text-orange-600',
      priority: 'HIGH'
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300', 
      text: 'text-yellow-900',
      badge: 'bg-yellow-200 text-yellow-900',
      icon: 'text-yellow-600',
      priority: 'MEDIUM'
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      badge: 'bg-blue-200 text-blue-900',
      icon: 'text-blue-600',
      priority: 'LOW'
    }
  }

  const typeIcons: Record<string, JSX.Element> = {
    accident: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    traffic_jam: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    road_closure: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    construction: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    pothole: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    flooding: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    debris: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    other: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-7 bg-gray-200 rounded w-40"></div>
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Traffic Alerts</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <p className="text-red-500 text-xs mt-2">Please check your connection and try again</p>
      </div>
    )
  }

  if (trafficAlerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-green-800 mb-2">All Clear!</h3>
        <p className="text-green-700 mb-1">
          No current traffic alerts within 25km of your location
        </p>
        <p className="text-green-600 text-sm">
          {userLocationData?.address ? userLocationData.address.split(',')[0] : userLocation}
        </p>
        <div className="mt-3 flex items-center justify-center text-xs text-green-600">
          <ClockIcon className="h-4 w-4 mr-1" />
          Last 24 hours • 25km radius
        </div>
      </div>
    )
  }

  const currentAlert = trafficAlerts[currentAlertIndex]
  const styles = severityStyles[currentAlert.severity_level] || severityStyles.low

  return (
    <div className={`rounded-xl border-2 shadow-sm transition-all duration-300 ${styles.bg} ${styles.border}`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-white shadow-sm ${styles.icon}`}>
              {typeIcons[currentAlert.hazard_type] || typeIcons.other}
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h2 className={`text-xl font-bold ${styles.text}`}>Traffic Alert</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                  {styles.priority}
                </span>
              </div>
              <p className={`text-sm opacity-80 ${styles.text}`}>
                {currentAlert.hazard_type.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1 mb-1">
              <ClockIcon className={`h-4 w-4 ${styles.text} opacity-60`} />
              <p className={`text-sm font-medium ${styles.text}`}>
                {formatTimeAgo(currentAlert.created_at)}
              </p>
            </div>
            {currentAlert.distance_km && (
              <div className="flex items-center justify-end space-x-1">
                <MapPinIcon className={`h-4 w-4 ${styles.text} opacity-60`} />
                <p className={`text-xs ${styles.text} opacity-75`}>
                  {formatDistance(currentAlert.distance_km)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        <h3 className={`font-bold text-lg mb-3 ${styles.text}`}>{currentAlert.title}</h3>
        <p className={`text-sm leading-relaxed mb-3 ${styles.text} opacity-90`}>
          {currentAlert.description || `${currentAlert.hazard_type.replace('_', ' ')} reported in the area. Exercise caution when traveling through this location.`}
        </p>
        {currentAlert.location?.address && (
          <div className="flex items-start space-x-2 mb-4">
            <MapPinIcon className={`h-4 w-4 mt-0.5 ${styles.text} opacity-60`} />
            <p className={`text-sm ${styles.text} opacity-75`}>
              {currentAlert.location.address}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {trafficAlerts.length > 1 && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between bg-white bg-opacity-50 rounded-lg p-3">
            <button 
              onClick={prevAlert}
              className={`p-2 rounded-full hover:bg-white hover:bg-opacity-70 transition-all ${styles.text}`}
              aria-label="Previous alert"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${styles.text}`}>
                {currentAlertIndex + 1} of {trafficAlerts.length}
              </span>
              <div className="flex space-x-1">
                {trafficAlerts.map((_, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAlertIndex(index)}
                    className={`h-2 w-6 rounded-full transition-all ${
                      index === currentAlertIndex 
                        ? `bg-white shadow-sm` 
                        : 'bg-white bg-opacity-40 hover:bg-opacity-60'
                    }`}
                    aria-label={`Go to alert ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            
            <button 
              onClick={nextAlert}
              className={`p-2 rounded-full hover:bg-white hover:bg-opacity-70 transition-all ${styles.text}`}
              aria-label="Next alert">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="text-center bg-white bg-opacity-30 rounded-lg p-3">
          <p className={`text-xs ${styles.text} opacity-75 mb-1`}>
            Showing {trafficAlerts.length} current alert{trafficAlerts.length !== 1 ? 's' : ''} • 25km radius • Last 24 hours
          </p>
          <p className={`text-xs ${styles.text} opacity-60`}>
            Stay safe and drive carefully
          </p>
        </div>
      </div>
    </div>
  )
}

export default CurrentTrafficAlerts