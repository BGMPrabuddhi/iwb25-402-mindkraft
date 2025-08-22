// src/app/rda-dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'

interface Report {
  id: number
  title: string
  description?: string
  hazard_type: string
  severity_level: string
  images: string[]
  location?: {
    lat: number
    lng: number
    address?: string
  }
  created_at: string
  status: string
}

export default function RDADashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const profile = await authAPI.getProfile()
      
      if (profile.success && profile.userRole === 'rda') {
        setUser(profile)
        loadReports()
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const response = await fetch('/api/rda/reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setReports(data.reports)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setReportsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">RDA Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Road Hazard Reports</h2>
          <button
            onClick={loadReports}
            disabled={reportsLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {reportsLoading ? 'Loading...' : 'Refresh Reports'}
          </button>
        </div>

        {/* Reports Grid */}
        {reportsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(report.severity_level)}`}>
                    {report.severity_level}
                  </span>
                </div>
                
                {report.description && (
                  <p className="text-gray-600 mb-4">{report.description}</p>
                )}
                
                <div className="space-y-2 text-sm text-gray-500">
                  <p><strong>Type:</strong> {report.hazard_type}</p>
                  <p><strong>Status:</strong> {report.status}</p>
                  <p><strong>Reported:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                  {report.location?.address && (
                    <p><strong>Location:</strong> {report.location.address}</p>
                  )}
                  {report.images.length > 0 && (
                    <p><strong>Images:</strong> {report.images.length} attached</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}