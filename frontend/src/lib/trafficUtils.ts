// Traffic utilities for integrating real-time traffic data
export interface TrafficCondition {
  level: 'light' | 'moderate' | 'heavy' | 'severe'
  color: string
  description: string
  speedFactor: number // Factor to multiply normal travel time
}

export interface TrafficSegment {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  condition: TrafficCondition
  length: number // in meters
}

export const TRAFFIC_CONDITIONS: Record<string, TrafficCondition> = {
  light: {
    level: 'light',
    color: '#22c55e', // green-500
    description: 'Light traffic - normal flow',
    speedFactor: 1.0
  },
  moderate: {
    level: 'moderate',
    color: '#eab308', // yellow-500
    description: 'Moderate traffic - some delays',
    speedFactor: 1.3
  },
  heavy: {
    level: 'heavy',
    color: '#f97316', // orange-500
    description: 'Heavy traffic - significant delays',
    speedFactor: 1.8
  },
  severe: {
    level: 'severe',
    color: '#ef4444', // red-500
    description: 'Severe congestion - major delays',
    speedFactor: 2.5
  }
}

// Analyze traffic condition based on normal vs traffic duration
export const analyzeTrafficCondition = (
  normalDuration: number,
  trafficDuration: number
): TrafficCondition => {
  if (!trafficDuration || trafficDuration <= normalDuration) {
    return TRAFFIC_CONDITIONS.light
  }
  
  const delayFactor = trafficDuration / normalDuration
  
  if (delayFactor >= 2.0) return TRAFFIC_CONDITIONS.severe
  if (delayFactor >= 1.5) return TRAFFIC_CONDITIONS.heavy
  if (delayFactor >= 1.2) return TRAFFIC_CONDITIONS.moderate
  
  return TRAFFIC_CONDITIONS.light
}

// Calculate travel time with traffic and hazards
export const calculateAdjustedTravelTime = (
  baseDuration: number,
  trafficDuration: number,
  hazardCount: number,
  hazardSeverities: string[]
): {
  normalTime: number
  trafficTime: number
  hazardDelay: number
  totalTime: number
  confidence: 'high' | 'medium' | 'low'
} => {
  const trafficTime = trafficDuration || baseDuration
  
  // Calculate hazard delay based on severity
  let hazardDelay = 0
  hazardSeverities.forEach(severity => {
    switch (severity) {
      case 'critical':
        hazardDelay += 300 // 5 minutes per critical hazard
        break
      case 'high':
        hazardDelay += 120 // 2 minutes per high hazard
        break
      case 'medium':
        hazardDelay += 60 // 1 minute per medium hazard
        break
      case 'low':
        hazardDelay += 30 // 30 seconds per low hazard
        break
    }
  })
  
  const totalTime = trafficTime + hazardDelay
  
  // Determine confidence based on data availability
  let confidence: 'high' | 'medium' | 'low' = 'high'
  if (!trafficDuration) confidence = 'medium'
  if (hazardCount > 5) confidence = 'low'
  
  return {
    normalTime: baseDuration,
    trafficTime,
    hazardDelay,
    totalTime,
    confidence
  }
}

// Format duration for display
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Get traffic color for route segments
export const getTrafficColorForDelay = (delayPercentage: number): string => {
  if (delayPercentage >= 100) return TRAFFIC_CONDITIONS.severe.color
  if (delayPercentage >= 50) return TRAFFIC_CONDITIONS.heavy.color
  if (delayPercentage >= 25) return TRAFFIC_CONDITIONS.moderate.color
  return TRAFFIC_CONDITIONS.light.color
}

// Generate traffic-aware route recommendations
export const generateRouteRecommendations = (routes: any[]): {
  recommended: number
  fastest: number
  safest: number
  balanced: number
} => {
  if (routes.length === 0) {
    return { recommended: 0, fastest: 0, safest: 0, balanced: 0 }
  }
  
  // Find fastest route (by traffic time)
  const fastest = routes.reduce((fastestIndex, route, index) => {
    const currentFastest = routes[fastestIndex]
    const currentDuration = route.legs[0].duration_in_traffic?.value || route.legs[0].duration.value
    const fastestDuration = currentFastest.legs[0].duration_in_traffic?.value || currentFastest.legs[0].duration.value
    
    return currentDuration < fastestDuration ? index : fastestIndex
  }, 0)
  
  // For now, use fastest as recommended and balanced
  // In future, we can add more sophisticated logic considering hazards
  return {
    recommended: fastest,
    fastest: fastest,
    safest: fastest, // Would need hazard analysis
    balanced: fastest
  }
}

// Check if traffic layer should be automatically enabled
export const shouldEnableTrafficLayer = (timeOfDay: number): boolean => {
  // Enable traffic layer during rush hours (7-9 AM, 5-7 PM)
  return (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19)
}

export default {
  TRAFFIC_CONDITIONS,
  analyzeTrafficCondition,
  calculateAdjustedTravelTime,
  formatDuration,
  getTrafficColorForDelay,
  generateRouteRecommendations,
  shouldEnableTrafficLayer
}
