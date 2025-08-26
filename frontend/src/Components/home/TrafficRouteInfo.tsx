'use client'
import React from 'react'
import { ClockIcon, MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { 
  analyzeTrafficCondition, 
  calculateAdjustedTravelTime, 
  formatDuration as formatTrafficDuration,
  generateRouteRecommendations 
} from '@/lib/trafficUtils'

interface TrafficRouteInfoProps {
  routes: any[]
  selectedRouteIndex: number
  onRouteSelect: (index: number) => void
  hazardCount: number
}

const TrafficRouteInfo: React.FC<TrafficRouteInfoProps> = ({
  routes,
  selectedRouteIndex,
  onRouteSelect,
  hazardCount
}) => {
  if (!routes || routes.length === 0) return null

  const formatDuration = (duration: number, durationInTraffic?: number) => {
    const minutes = Math.round(duration / 60)
    const trafficMinutes = durationInTraffic ? Math.round(durationInTraffic / 60) : null
    
    if (trafficMinutes && trafficMinutes > minutes) {
      const delay = trafficMinutes - minutes
      return {
        normal: formatTrafficDuration(duration),
        traffic: formatTrafficDuration(durationInTraffic!),
        delay: `+${Math.round(delay)} min delay`
      }
    }
    
    return {
      normal: formatTrafficDuration(duration),
      traffic: trafficMinutes && durationInTraffic ? formatTrafficDuration(durationInTraffic) : null,
      delay: null
    }
  }

  const formatDistance = (distance: number) => {
    if (distance > 1000) {
      return `${(distance / 1000).toFixed(1)} km`
    }
    return `${Math.round(distance)} m`
  }

  const getTrafficSeverity = (normalDuration: number, trafficDuration: number) => {
    const condition = analyzeTrafficCondition(normalDuration, trafficDuration)
    return condition.level
  }

  const getTrafficColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'text-red-600 bg-red-50 border-red-200'
      case 'heavy': return 'text-red-600 bg-red-50 border-red-200'
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Route Options</h4>
        {hazardCount > 0 && (
          <div className="flex items-center space-x-1 text-amber-600">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{hazardCount} hazards detected</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {routes.map((route, index) => {
          const leg = route.legs[0]
          const duration = formatDuration(
            leg.duration.value,
            leg.duration_in_traffic?.value
          )
          const distance = formatDistance(leg.distance.value)
          const isSelected = index === selectedRouteIndex
          const trafficSeverity = getTrafficSeverity(
            leg.duration.value,
            leg.duration_in_traffic?.value || leg.duration.value
          )
          
          return (
            <button
              key={index}
              onClick={() => onRouteSelect(index)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    index === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index === 0 ? 'Fastest' : `Alt ${index}`}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {duration.traffic || duration.normal}
                    </span>
                    {duration.delay && (
                      <span className={`text-xs px-2 py-1 rounded border ${getTrafficColor(trafficSeverity)}`}>
                        {duration.delay}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{distance}</span>
                  </div>
                </div>
                
                {/* Traffic indicator */}
                <div className={`h-2 w-12 rounded ${
                  trafficSeverity === 'severe' || trafficSeverity === 'heavy' ? 'bg-red-400' :
                  trafficSeverity === 'moderate' ? 'bg-yellow-400' : 'bg-green-400'
                }`} title={`Traffic: ${trafficSeverity}`} />
              </div>
              
              {/* Route summary */}
              <div className="mt-2 text-xs text-gray-500">
                via {route.summary || 'Main roads'}
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Traffic legend */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Traffic conditions:</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded"></div>
              <span>Light</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded"></div>
              <span>Moderate</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-400 rounded"></div>
              <span>Heavy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrafficRouteInfo
