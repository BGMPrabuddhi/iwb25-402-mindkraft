'use client'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { reportsAPI, type HazardReportData } from '@/lib/api'

interface ViewFilters {
  hazardType: string
}

interface SubmitForm {
  title: string;
  description: string;
  hazard_type: string;
  severity_level: string;
  images: File[]; // Add images array
}

interface Report {
  id: number;
  title: string;
  description?: string;
  hazard_type: string;
  severity_level: string;
  created_at?: string;
  images?: string[]; // Add images to report interface
}

interface NewsContentProps {
  activeTab: 'view' | 'submit'
}

const NewsContent = ({ activeTab }: NewsContentProps) => {
  const [viewFilters, setViewFilters] = useState<ViewFilters>({
    hazardType: ''
  })

  const [submitForm, setSubmitForm] = useState<SubmitForm>({
    title: '',
    description: '',
    hazard_type: '',
    severity_level: '',
    images: [], // Initialize images array
  })

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([]) // For image previews

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

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const fileArray = Array.from(files)
    const maxFiles = 5
    const maxSize = 5 * 1024 * 1024 // 5MB per file

    // Validate files
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      if (submitForm.images.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} images allowed`)
        break
      }

      if (file.size > maxSize) {
        errors.push(`${file.name} is too large. Maximum size is 5MB`)
        continue
      }

      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not a valid image file`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      alert('❌ Image Upload Errors:\n\n' + errors.join('\n'))
    }

    if (validFiles.length > 0) {
      // Update form with new images
      setSubmitForm(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles]
      }))

      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviews(prev => [...prev, e.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }

    // Reset input
    e.target.value = ''
  }, [submitForm.images])

  // Remove image
  const removeImage = useCallback((index: number) => {
    setSubmitForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Test backend connection
  const testConnection = useCallback(async () => {
    try {
      setError(null)
      const health = await reportsAPI.healthCheck()
      
      alert(`✅ Backend Connection Successful!\n\n` +
            `Service: ${health.service}\n` +
            `Version: ${health.version}\n` +
            `Java: ${health.java_version}\n` +
            `Database: ${health.database_status}\n` +
            `Status: ${health.status}`)
            
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      alert(`❌ Backend Connection Failed!\n\n${errorMessage}\n\n` +
            `Please check:\n` +
            `1. Backend server is running (bal run)\n` +
            `2. Server is on port 8080\n` +
            `3. Database is connected`)
    }
  }, [])

  // Submit hazard report
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 Form submitted with data:', submitForm)
    
    // Validation
    const errors: string[] = []
    
    if (!submitForm.title.trim()) {
      errors.push('Please enter a report title')
    }
    if (submitForm.title.trim().length > 255) {
      errors.push('Title must be 255 characters or less')
    }
    if (!submitForm.severity_level || submitForm.severity_level.trim() === '') {
      errors.push('Please select a severity level')
    }
    if (submitForm.description.length > 2000) {
      errors.push('Description must be 2000 characters or less')
    }
    
    if (errors.length > 0) {
      alert('❌ Validation Errors:\n\n' + errors.join('\n'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Map form data to API format
      const reportData: HazardReportData = {
        title: submitForm.title.trim(),
        description: submitForm.description.trim() || undefined,
        hazard_type: submitForm.hazard_type as 'accident' | 'pothole' | 'Natural disaster' | 'construction',
        severity_level: submitForm.severity_level as 'low' | 'medium' | 'high',
        images: submitForm.images.length > 0 ? submitForm.images : undefined,
      }

      console.log('🚀 Sending to API:', reportData)
      console.log('📸 Images to upload:', submitForm.images.length)

      const response = await reportsAPI.submitReport(reportData)
      
      console.log('✅ Success response:', response)
      
      // Show success message
      alert(`🎉 SUCCESS!\n\n${response.message}\n\nReport ID: ${response.report_id}\nImages uploaded: ${submitForm.images.length}\nTimestamp: ${new Date(response.timestamp || '').toLocaleString()}`)
      
      // Reset form on success
      setSubmitForm({
        title: '',
        description: '',
        hazard_type: '',
        severity_level: '',
        images: [],
      })
      setImagePreviews([])
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Submit error:', error)
      setError(errorMessage)
      alert(`❌ Failed to submit report!\n\n${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [submitForm])

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

  if (activeTab === 'view') {
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

  // Submit Report Tab
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Report a Road Hazard</h3>
        <p className="text-gray-600">
          Help keep our roads safe by reporting hazards, accidents, or dangerous conditions.
        </p>
        
        {/* Connection test and status */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={testConnection}
            className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            🔗 Test Backend Connection
          </button>
          
          {error && (
            <div className="flex-1 min-w-full mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      </div>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title *
          </label>
          <input
            type="text"
            required
            value={submitForm.title}
            onChange={(e) => setSubmitForm(prev => ({...prev, title: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief, clear description of the hazard"
            maxLength={255}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">{submitForm.title.length}/255 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description
          </label>
          <textarea
            value={submitForm.description}
            onChange={(e) => setSubmitForm(prev => ({...prev, description: e.target.value}))}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Provide detailed information about the hazard..."
            maxLength={2000}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">{submitForm.description.length}/2000 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hazard Type *
          </label>
          <select 
            required
            value={submitForm.hazard_type}
            onChange={(e) => setSubmitForm(prev => ({...prev, hazard_type: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Select hazard type</option>
            <option value="accident">Traffic Accident</option>
            <option value="pothole">Pothole</option>
            <option value="Natural disaster">Natural Disaster</option>
            <option value="construction">Construction Work</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity Level *
          </label>
          <select 
            required
            value={submitForm.severity_level}
            onChange={(e) => setSubmitForm(prev => ({...prev, severity_level: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Select severity level</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Images (Optional)
          </label>
          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center justify-center w-full">
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <PhotoIcon className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB (Max 5 images)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isLoading || submitForm.images.length >= 5}
                />
              </label>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Selected Images ({submitForm.images.length}/5)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        disabled={isLoading}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {(submitForm.images[index]?.size / 1024 / 1024).toFixed(1)}MB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-blue-200 ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting Report...
            </span>
          ) : (
            `🚀 Submit Hazard Report ${submitForm.images.length > 0 ? `(${submitForm.images.length} image${submitForm.images.length > 1 ? 's' : ''})` : ''}`
          )}
        </button>

        {/* Development debug info */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              🔧 Debug Information (Development Only)
            </summary>
            <div className="mt-2 p-4 bg-gray-100 rounded-lg">
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify({
                  formData: {
                    ...submitForm,
                    images: submitForm.images.map(img => ({
                      name: img.name,
                      size: img.size,
                      type: img.type
                    }))
                  },
                  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
                  isLoading,
                  error
                }, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </form>
    </div>
  )
}

export default NewsContent