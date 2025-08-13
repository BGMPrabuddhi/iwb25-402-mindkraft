'use client'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

import { useState, useEffect } from 'react'
import { MapPinIcon, PhotoIcon, FunnelIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

interface ViewFilters {
  hazardType: string
  fromLocation: string
  toLocation: string
}

interface SubmitForm {
  title: string
  description: string
  type: string
  level:string
  location: string
  photo: File | null
}

interface Report {
  id: number
  title: string
  description: string
  type: string
  location: string
  coordinates: { lat: number; lng: number }
  distance: number
  timestamp: Date
  severity: 'high' | 'medium' | 'low'
  status: 'active' | 'resolved'
}

interface NewsContentProps {
  activeTab: 'view' | 'submit'
}

const NewsContent = ({ activeTab }: NewsContentProps) => {
  const [viewStep, setViewStep] = useState<'filter' | 'map' | 'reports'>('filter')
  const [viewFilters, setViewFilters] = useState<ViewFilters>({
    hazardType: '',
    fromLocation: '',
    toLocation: ''
  })

  const [submitForm, setSubmitForm] = useState<SubmitForm>({
    title: '',
    description: '',
    type: 'accident',
    level: " ",
    location: '',
    photo: null
  })

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock reports data
  useEffect(() => {
    const mockReports: Report[] = [
      {
        id: 1,
        title: "Major Pothole",
        description: "Large pothole causing vehicle damage near traffic light intersection",
        type: "pothole",
        location: "Galle Road, Bambalapitiya",
        coordinates: { lat: 6.8649, lng: 79.8997 },
        distance: 1.2,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        severity: "high",
        status: "active"
      },
      {
        id: 2,
        title: "Road Accident",
        description: "Two-vehicle collision blocking left lane",
        type: "accident",
        location: "Kandy Road, Kiribathgoda",
        coordinates: { lat: 6.9804, lng: 79.9290 },
        distance: 8.5,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        severity: "high",
        status: "active"
      },
      {
        id: 3,
        title: "Flooding",
        description: "Road completely flooded after heavy rain",
        type: "Natural disaster",
        location: "Baseline Road, Colombo 09",
        coordinates: { lat: 6.9147, lng: 79.8560 },
        distance: 3.7,
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        severity: "medium",
        status: "active"
      },
      {
        id: 4,
        title: "Construction Work",
        description: "Lane closure due to road maintenance work",
        type: "construction",
        location: "Marine Drive, Colombo 03",
        coordinates: { lat: 6.9271, lng: 79.8612 },
        distance: 2.1,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        severity: "low",
        status: "active"
      }
    ]
    setReports(mockReports)
  }, [])

  const handleFilterSubmit = () => {
    if (!viewFilters.hazardType || !viewFilters.fromLocation || !viewFilters.toLocation) {
      alert('Please fill in all fields')
      return
    }
    
    setIsLoading(true)
    
    // Filter reports based on selected criteria
    setTimeout(() => {
      let filtered = reports
      
      if (viewFilters.hazardType !== 'all') {
        filtered = filtered.filter(report => report.type === viewFilters.hazardType)
      }
      
      setFilteredReports(filtered)
      setViewStep('map')
      setIsLoading(false)
    }, 1000)
  }

  const showReports = () => {
    setViewStep('reports')
  }

  const resetFilter = () => {
    setViewStep('filter')
    setViewFilters({
      hazardType: '',
      fromLocation: '',
      toLocation: ''
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'accident': return 'bg-red-50 text-red-700 border-red-200'
      case 'pothole': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'Natural disaster': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'construction': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
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

  if (activeTab === 'view') {
    // Step 1: Filter Selection
    if (viewStep === 'filter') {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Route & Hazard Filter</h3>
            <p className="text-gray-600">Select your route and hazard type to view relevant reports</p>
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
        onClick={() => setViewFilters({...viewFilters, hazardType: type.value})}
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

              {/* Route Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Location *
                  </label>
                  <div className="relative">
                    <MapPinIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={viewFilters.fromLocation}
                      onChange={(e) => setViewFilters({...viewFilters, fromLocation: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select starting point</option>
                      <option value="colombo-fort">Colombo Fort</option>
                      <option value="bambalapitiya">Bambalapitiya</option>
                      <option value="dehiwala">Dehiwala</option>
                      <option value="mount-lavinia">Mount Lavinia</option>
                      <option value="moratuwa">Moratuwa</option>
                      <option value="panadura">Panadura</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Location *
                  </label>
                  <div className="relative">
                    <MapPinIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={viewFilters.toLocation}
                      onChange={(e) => setViewFilters({...viewFilters, toLocation: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select destination</option>
                      <option value="kandy">Kandy</option>
                      <option value="galle">Galle</option>
                      <option value="negombo">Negombo</option>
                      <option value="kalutara">Kalutara</option>
                      <option value="ratnapura">Ratnapura</option>
                      <option value="kegalle">Kegalle</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Route Direction Indicator */}
              {viewFilters.fromLocation && viewFilters.toLocation && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-4">
                    <span className="font-medium text-blue-600 capitalize">
                      {viewFilters.fromLocation.replace('-', ' ')}
                    </span>
                    <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-blue-600 capitalize">
                      {viewFilters.toLocation.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Showing {viewFilters.hazardType === 'all' ? 'all hazards' : viewFilters.hazardType + 's'} along this route
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleFilterSubmit}
            disabled={!viewFilters.hazardType || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
              !viewFilters.hazardType || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading
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
                Loading Map...
              </span>
            ) : (
              'View Map & Reports'
            )}
          </button>
        </div>
      )
    }

    // Step 2: Map View
    if (viewStep === 'map') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Route Map</h3>
              <p className="text-sm text-gray-600">
                {viewFilters.fromLocation.replace('-', ' ')} → {viewFilters.toLocation.replace('-', ' ')}
              </p>
            </div>
            <button
              onClick={resetFilter}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Change Route
            </button>
          </div>

          {/* Map Placeholder */}
          <div className="bg-gray-100 rounded-lg border border-gray-200 h-96 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100">
              <div className="h-full w-full relative">
                {/* Route Line */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-blue-500 transform -translate-y-1/2 opacity-60"></div>
                
                {/* Map Pins */}
                {filteredReports.map((report, index) => (
                  <div
                    key={report.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${20 + (index * 15)}%`,
                      top: `${40 + (index % 2 === 0 ? 10 : -10)}%`
                    }}
                  >
                    <div className="relative group">
                      <div className={`w-6 h-6 ${getSeverityColor(report.severity)} rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform`}>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Start and End Points */}
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-600 whitespace-nowrap">
                    Start
                  </span>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-red-600 whitespace-nowrap">
                    End
                  </span>
                </div>
              </div>
            </div>

            {/* Map Controls Overlay */}
            <div className="absolute top-4 right-4 space-y-2">
              <button className="bg-white shadow-md p-2 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button className="bg-white shadow-md p-2 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur rounded-lg p-3 text-xs">
              <div className="font-medium mb-2">Hazard Severity</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>High Risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Medium Risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Low Risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{filteredReports.length}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {filteredReports.filter(r => r.severity === 'high').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredReports.filter(r => r.severity === 'medium').length}
                </div>
                <div className="text-sm text-gray-600">Medium Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredReports.filter(r => r.status === 'resolved').length}
                </div>
                <div className="text-sm text-gray-600">Resolved</div>
              </div>
            </div>
          </div>

          <button
            onClick={showReports}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            View Detailed Reports ({filteredReports.length})
          </button>
        </div>
      )
    }

    // Step 3: Reports List
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Hazard Reports</h3>
            <p className="text-sm text-gray-600">
              {filteredReports.length} reports found along your route
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setViewStep('map')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Back to Map
            </button>
            <button
              onClick={resetFilter}
              className="text-gray-600 hover:text-gray-700 text-sm font-medium"
            >
              New Search
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Great News!</h3>
              <p className="text-gray-600">No {viewFilters.hazardType} reports found along this route.</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div 
                key={report.id} 
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold text-gray-900">{report.title}</h4>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(report.type)}`}>
                      {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getSeverityColor(report.severity)}`}>
                      {report.severity.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTimeAgo(report.timestamp)}</span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {report.description}
                </p>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{report.location}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {report.distance.toFixed(1)} km from route
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // Submit Report Tab (unchanged from previous version)
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Report a Road Hazard</h3>
        <p className="text-gray-600">
          Help keep our roads safe by reporting hazards, accidents, or dangerous conditions in your area.
        </p>
      </div>
      
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title 
          </label>
          <input
            type="text"
            required
            value={submitForm.title}
            onChange={(e) => setSubmitForm({...submitForm, title: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief, clear description of the hazard"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description 
          </label>
          <textarea
            required
            value={submitForm.description}
            onChange={(e) => setSubmitForm({...submitForm, description: e.target.value})}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Provide detailed information about the hazard..."
          />
        </div>

        <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Select Level *
  </label>
  <select 
    required
    value={submitForm.level}
    onChange={(e) => setSubmitForm({...submitForm, level: e.target.value})}
    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  >
    <option value="">Select severity level</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
  </select>
</div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hazard Type *
          </label>
          <select 
            required
            value={submitForm.type}
            onChange={(e) => setSubmitForm({...submitForm, type: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="accident">Accident</option>
            <option value="pothole">Road Damage</option>
            <option value="Natural disaster"> Natural Disaster</option>
            <option value="construction">Construction </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={submitForm.location}
              onChange={(e) => setSubmitForm({...submitForm, location: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter location or click to select on map"
            />
            <button 
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
            >
              <MapPinIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo Evidence*
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
           <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
           <div className="mt-4">
             <label className="cursor-pointer">
               <span className="text-blue-600 font-medium hover:text-blue-500">
                 Click to upload a photo
               </span>
               <input
                 type="file"
                 className="hidden"
                 accept="image/*"
                 onChange={(e) => setSubmitForm({...submitForm, photo: e.target.files?.[0] || null})}
               />
             </label>
             <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 10MB</p>
           </div>
           {submitForm.photo && (
             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
               <p className="text-sm text-blue-800">
                 Selected: {submitForm.photo.name}
               </p>
             </div>
           )}
         </div>
       </div>

       <button
         type="submit"
         className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-blue-200"
       >
         Submit Report
       </button>
     </form>
   </div>
 )
}

export default NewsContent