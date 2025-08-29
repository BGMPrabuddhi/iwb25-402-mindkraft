// components/HazardReportsList.tsx
import React, { useState } from 'react'
import { MapPinIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '@/lib/api'
import { ViewFilters, Report } from './types'
import ReportComments from './ReportComments'

interface HazardReportsListProps {
  reports: Report[]
  selectedReport: Report | null
  setSelectedReport: React.Dispatch<React.SetStateAction<Report | null>>
  viewFilters: ViewFilters
  currentUserId?: number
}

const HazardReportsList: React.FC<HazardReportsListProps> = ({
  reports,
  selectedReport,
  setSelectedReport,
  viewFilters,
  currentUserId
}) => {
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const toggleComments = (reportId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
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
          // Debug each report's reporter fields once rendered
          console.debug && console.debug('[HazardReportsList] report user meta', {
            id: report.id,
            reporter_first_name: report.reporter_first_name,
            reporter_last_name: report.reporter_last_name,
            reporter_profile_image: report.reporter_profile_image
          }),
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
                {/* Reporter info now at top */}
                <div className="flex items-center mb-3">
                  {report.reporter_profile_image ? (() => {
                    const raw = report.reporter_profile_image.trim();
                    const isData = raw.startsWith('data:');
                    const isHttp = raw.startsWith('http');
                    const base = (isData || isHttp) ? raw : reportsAPI.getImageUrl(raw);
                    const ver = (!isData && !isHttp) ? (report.updated_at || report.created_at || '').replace(/\s+/g,'_') : '';
                    const sep = ver && base.includes('?') ? '&' : '?';
                    const cacheBusted = ver ? `${base}${sep}v=${encodeURIComponent(ver)}` : base;
                    return (
                      <img
                        key={cacheBusted}
                        src={cacheBusted}
                        alt={report.reporter_first_name || 'Reporter'}
                        className="h-8 w-8 rounded-full object-cover border border-gray-200 mr-2"
                        onClick={(e) => e.stopPropagation()}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                      />
                    );
                  })() : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 mr-2">
                      {((report.reporter_first_name?.charAt(0) || '') + (report.reporter_last_name?.charAt(0) || '')).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {[report.reporter_first_name, report.reporter_last_name].filter(Boolean).join(' ') || 'Unknown User'}
                    </span>
                    {report.created_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{report.title}</h4>
                  <span className="px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                    {report.hazard_type}
                  </span>
                  <span className={`w-3 h-3 rounded-full ${getSeverityBgColor(report.severity_level)}`}></span>
                  <span className="text-xs font-medium text-gray-600">{report.severity_level.toUpperCase()}</span>
                </div>
                
                {report.description && (
                  <p className="text-gray-600 mb-3 whitespace-pre-line">{report.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
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
                  <div className="mb-4">
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

                {/* Comments Toggle Button */}
                <div className="border-t border-gray-100 pt-3 mt-4">
                  <button
                    onClick={(e) => toggleComments(report.id, e)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4" />
                    <span>
                      {expandedComments.has(report.id) ? 'Hide Comments' : 'View Comments'}
                    </span>
                  </button>
                  
                  {/* Comments Section */}
                  {expandedComments.has(report.id) && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <ReportComments 
                        reportId={report.id} 
                        currentUserId={currentUserId}
                      />
                    </div>
                  )}
                </div>
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