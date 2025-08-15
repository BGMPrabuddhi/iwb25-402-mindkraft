'use client'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { reportsAPI } from '@/lib/api'
import SubmitReport from './SubmitReport'

interface ViewFilters {
  hazardType: string
}

interface Report {
  id: number;
  title: string;
  description?: string;
  hazard_type: string;
  severity_level: string;
  created_at?: string;
  images?: string[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

interface NewsContentProps {
  activeTab: 'view' | 'submit'
}

const NewsContent = ({ activeTab }: NewsContentProps) => {
  const [viewFilters, setViewFilters] = useState<ViewFilters>({
    hazardType: ''
  })

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock reports data
  useEffect(() => {
    const mockReports: Report[] = [
      {
        id: 1,
        title: "Major Pothole",
        description: "Large pothole causing vehicle damage near traffic light intersection",
        hazard_type: "pothole",
        severity_level: "high",
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        location: { lat: 7.2083, lng: 79.8358, address: "Negombo, Western Province, Sri Lanka" }
      },
      {
        id: 2,
        title: "Road Accident",
        description: "Two-vehicle collision blocking left lane",
        hazard_type: "accident",
        severity_level: "high",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 3,
        title: "Flooding",
        description: "Road completely flooded after heavy rain",
        hazard_type: "Natural disaster",
        severity_level: "medium",
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: 4,
        title: "Construction Work",
        description: "Lane closure due to road maintenance work",
        hazard_type: "construction",
        severity_level: "low",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      }
    ]
    setReports(mockReports)
  }, [])

  // Enhanced filter submit handler
  const handleFilterSubmit = useCallback(async () => {
    if (!viewFilters.hazardType) {
      alert('Please select a hazard type')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch real data from backend
      const filters = {
        hazard_type: viewFilters.hazardType !== 'all' ? viewFilters.hazardType : undefined,
        page: 1,
        page_size: 20
      }

      console.log('🔍 Fetching filtered reports:', filters)
      const response = await reportsAPI.getReports(filters)
      
      // Convert backend data to frontend format
      const backendReports = response.reports || []
      const convertedReports: Report[] = backendReports.map((report: any) => ({
        id: report.id,
        title: report.title,
        description: report.description || '',
        hazard_type: report.hazard_type,
        severity_level: report.severity_level,
        created_at: report.created_at,
        location: report.location ? {
          lat: report.location.lat || report.latitude,
          lng: report.location.lng || report.longitude,
          address: report.location.address || report.address
        } : undefined
      }))

      setFilteredReports(convertedReports)
      
      console.log('📊 Converted reports:', convertedReports)
      
    } catch (error) {
      console.error('❌ Filter error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      alert(`⚠️ Failed to fetch reports from backend.\nUsing sample data instead.\n\nError: ${errorMessage}`)
      
      // Fallback to existing logic
      let filtered = reports
      if (viewFilters.hazardType !== 'all') {
        filtered = filtered.filter(report => report.hazard_type === viewFilters.hazardType)
      }
      setFilteredReports(filtered)
    } finally {
      setIsLoading(false)
    }
  }, [viewFilters, reports])

  const resetFilter = () => {
    setViewFilters({
      hazardType: ''
    })
    setFilteredReports([])
    setError(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  // If submit tab is active, render the SubmitReport component
  if (activeTab === 'submit') {
    return <SubmitReport />
  }

  // View tab content
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Hazard Reports Filter</h3>
        <p className="text-gray-600">Select hazard type to view relevant reports</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="space-y-6">
          {/* Hazard Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Hazard Type *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 'all', label: 'All Types', icon: <MagnifyingGlassIcon className="h-6 w-6" /> },
                { value: 'accident', label: 'Accidents', icon: <TruckIcon className="h-6 w-6" /> },
                { value: 'pothole', label: 'Potholes', icon: <ExclamationTriangleIcon className="h-6 w-6" /> },
                { value: 'Natural disaster', label: 'Natural Disaster', icon: <CloudIcon className="h-6 w-6" /> },
                { value: 'construction', label: 'Construction', icon: <WrenchScrewdriverIcon className="h-6 w-6" /> }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setViewFilters({hazardType: type.value})}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    viewFilters.hazardType === type.value
                      ? 'border-blue-500 bg-blue-100 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1 flex justify-center">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleFilterSubmit}
        disabled={!viewFilters.hazardType || isLoading}
        className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
          !viewFilters.hazardType || isLoading
            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
            : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-4 focus:ring-blue-200'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading Reports...
          </span>
        ) : (
          '🔍 View Reports'
        )}
      </button>

      {/* Reports Display */}
      {filteredReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Hazard Reports</h3>
            <button
              onClick={resetFilter}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              🔄 Reset Filter
            </button>
          </div>

          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{report.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-200`}>
                      {report.hazard_type}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${getSeverityColor(report.severity_level)}`}></span>
                  </div>
                  <p className="text-gray-600 mb-3">{report.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {report.created_at && <span>🕒 {new Date(report.created_at).toLocaleString()}</span>}
                    {report.location && (
                      <span className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {report.location.address || `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">📭 No reports found for your selected filters</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria or check back later</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NewsContent