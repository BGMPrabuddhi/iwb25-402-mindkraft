// components/RouteHazardAlert.tsx
import React from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface RouteHazardAlertProps {
  alert: {
    hazardCount: number
    highRiskCount: number
    mediumRiskCount: number
    lowRiskCount: number
    routeCount: number
  }
  onClose: () => void
}

const RouteHazardAlert: React.FC<RouteHazardAlertProps> = ({ alert, onClose }) => {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Hazards Detected on Your Route
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="mb-2">
              <strong>{alert.hazardCount}</strong> hazard{alert.hazardCount !== 1 ? 's' : ''} found across <strong>{alert.routeCount}</strong> route option{alert.routeCount !== 1 ? 's' : ''}:
            </p>
            <div className="flex flex-wrap gap-4">
              {alert.highRiskCount > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span><strong>{alert.highRiskCount}</strong> High Risk</span>
                </div>
              )}
              {alert.mediumRiskCount > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span><strong>{alert.mediumRiskCount}</strong> Medium Risk</span>
                </div>
              )}
              {alert.lowRiskCount > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span><strong>{alert.lowRiskCount}</strong> Low Risk</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex text-red-400 hover:text-red-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default RouteHazardAlert