'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface NewsItem {
  id: number
  title: string
  content: string
  location: string
  timestamp: Date
  severity: 'high' | 'medium' | 'low'
  type: 'accident' | 'Natural disaster' | 'construction' | 'traffic'
}

interface NewsAlertProps {
  userLocation?: string
}

const NewsAlert = ({ userLocation = 'Colombo' }: NewsAlertProps) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
  const [newsData, setNewsData] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock news data - in real app, fetch from Ballerina backend
  useEffect(() => {
    const fetchNews = async () => {
      // Simulate API call delay
      setTimeout(() => {
        const mockNews: NewsItem[] = [
          {
            id: 1,
            title: "Road Closure: Galle Road",
            content: "Heavy flooding reported on Galle Road near Bambalapitiya. Traffic diverted to alternative routes.",
            location: "Colombo",
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
            severity: "high",
            type: "Natural disaster"
          },
          {
            id: 2,
            title: "Traffic Accident: Kandy Road",
            content: "Minor vehicle collision at Kiribathgoda junction. One lane blocked, traffic moving slowly.",
            location: "Colombo",
            timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            severity: "medium",
            type: "accident"
          },
          {
            id: 3,
            title: "Construction Work: Baseline Road",
            content: "Ongoing road maintenance on Baseline Road from 6 AM to 4 PM. Use Galle Road as alternative.",
            location: "Colombo",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            severity: "low",
            type: "construction"
          }
        ]
        setNewsData(mockNews)
        setIsLoading(false)
      }, 1000)
    }

    fetchNews()
  }, [userLocation])

  const nextNews = () => {
    setCurrentNewsIndex((prev) => 
      prev === newsData.length - 1 ? 0 : prev + 1
    )
  }

  const prevNews = () => {
    setCurrentNewsIndex((prev) => 
      prev === 0 ? newsData.length - 1 : prev - 1
    )
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    
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

  if (newsData.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-800 mb-1">All Clear!</h3>
        <p className="text-green-600">No recent traffic alerts for {userLocation}</p>
      </div>
    )
  }

  const currentNews = newsData[currentNewsIndex]
  
  const severityStyles = {
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

  const typeIcons = {
    accident: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    naturaldisaster: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    construction: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    traffic: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }

  const styles = severityStyles[currentNews.severity]

  return (
    <div className={`rounded-xl p-6 border-2 shadow-sm transition-all duration-300 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          
          <h2 className={`text-lg font-semibold ${styles.text}`}>Traffic Alert</h2>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
            {currentNews.severity.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${styles.text}`}>{userLocation}</p>
          <p className={`text-xs opacity-75 ${styles.text}`}>
            {formatTimeAgo(currentNews.timestamp)}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className={`font-semibold mb-2 ${styles.text}`}>{currentNews.title}</h3>
        <p className={`text-sm leading-relaxed ${styles.text} opacity-90`}>
          {currentNews.content}
        </p>
      </div>

      {newsData.length > 1 && (
        <div className="flex items-center justify-between">
          <button 
            onClick={prevNews}
            className={`p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-all ${styles.text}`}
            aria-label="Previous alert"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <div className="flex space-x-2">
            {newsData.map((_, index) => (
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
    </div>
  )
}

export default NewsAlert