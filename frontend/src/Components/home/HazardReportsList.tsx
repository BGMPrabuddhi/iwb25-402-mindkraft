// components/HazardReportsList.tsx
import React from 'react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '@/lib/api'
import { ViewFilters, Report } from './types'

interface HazardReportsListProps {
  reports: Report[]
  selectedReport: Report | null
  setSelectedReport: React.Dispatch<React.SetStateAction<Report | null>>
  viewFilters: ViewFilters
}

const HazardReportsList: React.FC<HazardReportsListProps> = ({
  reports,
  selectedReport,
  setSelectedReport,
  viewFilters
}) => {
  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Hazards on Your Route ({reports.length})
        </h3>
        <div className="text-sm text-gray-600">
          Route from {viewFilters.fromLocation?.address} to {viewFilters.toLocation?.address}
        </div>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <div 
            key={report.id} 
            id={`report-${report.id}`}
            className={`bg-white border rounded-lg p-6 shadow-sm transition-all cursor-pointer ${
              selectedReport?.id === report.id ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedReport(report)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{report.title}</h4>
                 
                  <span className="px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                    {report.hazard_type}
                  </span>
                  <span className={`w-3 h-3 rounded-full ${getSeverityBgColor(report.severity_level)}`}></span>
                  <span className="text-xs font-medium text-gray-600">{report.severity_level.toUpperCase()}</span>
                </div>
                
                {report.description && (
                  <p className="text-gray-600 mb-3">{report.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {report.created_at && (
                    <span>
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  )}
                  {report.location && (
                    <span className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {report.location.address || `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                    </span>
                  )}
                  <span>ID: #{report.id}</span>
                </div>
                
                {/* Images */}
                {report.images && report.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Images ({report.images.length})
                    </p>
                    <div className="flex space-x-2 overflow-x-auto">
                      {report.images.slice(0, 4).map((image, index) => (
                        <img
                          key={index}
                          src={reportsAPI.getImageUrl(image)}
                          alt={`Report ${report.id} image ${index + 1}`}
                          className="h-16 w-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 hover:h-20 hover:w-20 transition-all cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(reportsAPI.getImageUrl(image), '_blank')
                          }}
                        />
                      ))}
                      {report.images.length > 4 && (
                        <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                          +{report.images.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedReport?.id === report.id && (
                <div className="ml-4 space-y-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Selected
                  </span>
                  {report.created_at && (
                    <span className="block text-xs text-gray-500 mt-1">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HazardReportsList