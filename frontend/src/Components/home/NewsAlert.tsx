'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { reportsAPI, HazardReport } from '@/lib/api'

interface NewsAlertProps {
  userLocation?: string
}

const NewsAlert = ({ userLocation }: NewsAlertProps) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
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
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await reportsAPI.getCurrentTrafficAlerts()
        setTrafficAlerts(response.alerts || [])
        setUserLocationData(response.user_location)
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
  }, [])

  const nextNews = () => {
    setCurrentNewsIndex((prev) => 
      prev === trafficAlerts.length - 1 ? 0 : prev + 1
    )
  }

  const prevNews = () => {
    setCurrentNewsIndex((prev) => 
      prev === 0 ? trafficAlerts.length - 1 : prev - 1
    )
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-1">Unable to Load Alerts</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (trafficAlerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-800 mb-1">All Clear!</h3>
        <p className="text-green-600">
          No current traffic alerts within 25km of {userLocationData?.address ? userLocationData.address.split(',')[0] : userLocation || 'your location'}
        </p>
        <p className="text-xs text-green-500 mt-1">
          Showing alerts from the last 24 hours
        </p>
      </div>
    )
  }

  const currentReport = trafficAlerts[currentNewsIndex]
  
  interface SeverityStyle {
    bg: string;
    border: string;
    text: string;
    badge: string;
    icon: string;
  }

  const severityStyles: Record<string, SeverityStyle> = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-600'
    },
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-600'
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200', 
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: 'text-yellow-600'
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-600'
    }
  }

  const typeIcons: Record<string, JSX.Element> = {
    accident: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    pothole: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    flooding: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    debris: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    traffic_jam: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    road_closure: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    construction: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    other: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  }

  const styles = severityStyles[currentReport.severity_level] || severityStyles.low

  return (
    <div className={`rounded-xl p-6 border-2 shadow-sm transition-all duration-300 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={styles.icon}>
            {typeIcons[currentReport.hazard_type] || typeIcons.accident}
          </div>
          <h2 className={`text-lg font-semibold ${styles.text}`}>Traffic Alert</h2>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
            {currentReport.severity_level.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${styles.text}`}>
            {userLocationData?.address ? userLocationData.address.split(',')[0] : userLocation || 'Your Area'}
          </p>
          <p className={`text-xs opacity-75 ${styles.text}`}>
            {formatTimeAgo(currentReport.created_at)}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className={`font-semibold mb-2 ${styles.text}`}>{currentReport.title}</h3>
        <p className={`text-sm leading-relaxed ${styles.text} opacity-90`}>
          {currentReport.description || `${currentReport.hazard_type.replace('_', ' ')} reported in the area.`}
        </p>
        {currentReport.location?.address && (
          <p className={`text-xs mt-2 ${styles.text} opacity-75`}>
            📍 {currentReport.location.address}
          </p>
        )}
      </div>

      {trafficAlerts.length > 1 && (
        <div className="flex items-center justify-between">
          <button 
            onClick={prevNews}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-all ${styles.text}`}
            aria-label="Previous alert"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <div className="flex space-x-2">
            {trafficAlerts.map((_, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentNewsIndex(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentNewsIndex 
                    ? `${styles.text} opacity-100` 
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Go to alert ${index + 1}`}
              />
            ))}
          </div>
          
          <button 
            onClick={nextNews}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-all ${styles.text}`}
            aria-label="Next alert"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className={`text-xs ${styles.text} opacity-75`}>
          Showing {trafficAlerts.length} alert{trafficAlerts.length !== 1 ? 's' : ''} within 25km (last 24 hours)
        </p>
      </div>
    </div>
  )
}

export default NewsAlert