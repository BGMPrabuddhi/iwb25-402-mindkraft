// components/RouteMap.tsx
import React, { useRef, useEffect, useState } from 'react'
import { ViewFilters, Report } from './types'

interface RouteMapProps {
  viewFilters: ViewFilters
  setViewFilters: React.Dispatch<React.SetStateAction<ViewFilters>>
  reports: Report[]
  setFilteredReports: React.Dispatch<React.SetStateAction<Report[]>>
  selectedReport: Report | null
  setSelectedReport: React.Dispatch<React.SetStateAction<Report | null>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  googleMapsScriptLoaded: boolean
  setRouteHazardAlert: React.Dispatch<React.SetStateAction<any>>
  onRoutesCalculated?: (routes: any[]) => void
  selectedRouteIndex?: number
  onRouteSelect?: (index: number) => void
}

declare const google: any

const RouteMap: React.FC<RouteMapProps> = ({
  viewFilters,
  reports,
  setFilteredReports,
  selectedReport,
  setSelectedReport,
  isLoading,
  setIsLoading,
  setError,
  googleMapsScriptLoaded,
  setRouteHazardAlert,
  onRoutesCalculated,
  selectedRouteIndex = 0,
  onRouteSelect
}) => {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [trafficLayerEnabled, setTrafficLayerEnabled] = useState(true)
  const [transitLayerEnabled, setTransitLayerEnabled] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const directionsServiceRef = useRef<any>(null)
  const directionsRendererRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const trafficLayerRef = useRef<any>(null)
  const transitLayerRef = useRef<any>(null)

  // Load Google Maps when needed
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places && typeof window.google.maps.importLibrary === 'function') {
        setMapLoaded(true)
        console.log('Google Maps loaded successfully')
      } else {
        setTimeout(checkGoogleMaps, 100)
      }
    }

    if (googleMapsScriptLoaded && !mapLoaded) {
      checkGoogleMaps()
    }
  }, [googleMapsScriptLoaded, mapLoaded])

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      initializeMap()
    }
  }, [mapLoaded])

  // Calculate route when conditions are met - with debugging
  useEffect(() => {
    console.log('Route calculation useEffect triggered:', {
      mapLoaded,
      fromLocation: viewFilters.fromLocation,
      toLocation: viewFilters.toLocation,
      mapInstance: !!mapInstanceRef.current,
      directionsService: !!directionsServiceRef.current
    })
    
    if (mapLoaded && viewFilters.fromLocation && viewFilters.toLocation && mapInstanceRef.current && directionsServiceRef.current) {
      console.log('All conditions met, calling calculateRouteAndShowHazards')
      calculateRouteAndShowHazards()
    } else {
      console.log('Not all conditions met for route calculation')
    }
  }, [mapLoaded, viewFilters.fromLocation, viewFilters.toLocation, reports])

  // Handle route selection changes
  useEffect(() => {
    if (directionsRendererRef.current.length > 0) {
      directionsRendererRef.current.forEach((renderer, index) => {
        if (renderer) {
          const isSelected = index === selectedRouteIndex
          renderer.setOptions({
            polylineOptions: {
              strokeColor: isSelected ? '#4285F4' : '#9AA0A6',
              strokeWeight: isSelected ? 6 : 4,
              strokeOpacity: isSelected ? 0.8 : 0.6
            }
          })
        }
      })
    }
  }, [selectedRouteIndex])

  // Timeout effect
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false)
          setError('Route calculation timed out. Please try again.')
        }
      }, 30000) // 30 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isLoading])

  const initializeMap = async () => {
    if (!mapRef.current || !window.google) return

    try {
      const { Map } = await window.google.maps.importLibrary("maps") as any
      const { DirectionsService } = await window.google.maps.importLibrary("routes") as any

      const map = new Map(mapRef.current, {
        center: { lat: 7.2083, lng: 79.8358 }, // Negombo center
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map
      directionsServiceRef.current = new DirectionsService()
      
      // Initialize traffic layer
      trafficLayerRef.current = new google.maps.TrafficLayer()
      if (trafficLayerEnabled) {
        trafficLayerRef.current.setMap(map)
      }
      
      // Initialize transit layer
      transitLayerRef.current = new google.maps.TransitLayer()
      if (transitLayerEnabled) {
        transitLayerRef.current.setMap(map)
      }
      
      console.log('Map initialized successfully with traffic layer')
      
      // Trigger route calculation if locations are already set
      if (viewFilters.fromLocation && viewFilters.toLocation) {
        console.log('Locations already set, triggering route calculation')
        setTimeout(() => {
          calculateRouteAndShowHazards()
        }, 100)
      }
    } catch (error) {
      console.error('Map initialization error:', error)
      setError('Failed to initialize map')
    }
  }

  const calculateRouteAndShowHazards = async () => {
    if (!viewFilters.fromLocation || !viewFilters.toLocation || !directionsServiceRef.current) {
      console.error('Missing required data for route calculation:', {
        fromLocation: !!viewFilters.fromLocation,
        toLocation: !!viewFilters.toLocation,
        directionsService: !!directionsServiceRef.current
      })
      setIsLoading(false)
      return
    }

    console.log('Starting route calculation...', {
      from: viewFilters.fromLocation,
      to: viewFilters.toLocation
    })

    setIsLoading(true)

    try {
      const request = {
        origin: new google.maps.LatLng(viewFilters.fromLocation.lat, viewFilters.fromLocation.lng),
        destination: new google.maps.LatLng(viewFilters.toLocation.lat, viewFilters.toLocation.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }

      console.log('Sending directions request...', request)

      directionsServiceRef.current.route(request, async (result: any, status: any) => {
        console.log('Directions response:', { status, result })
        
        if (status === google.maps.DirectionsStatus.OK) {
          console.log('Route calculation successful, routes found:', result.routes.length)
          
          // Clear existing renderers first
          directionsRendererRef.current.forEach(renderer => {
            if (renderer) renderer.setMap(null)
          })
          directionsRendererRef.current = []

          const routes = result.routes
          const { DirectionsRenderer } = await google.maps.importLibrary("routes") as any

          // Pass routes data to parent component
          if (onRoutesCalculated) {
            onRoutesCalculated(routes)
          }

          // Create renderers for each route
          directionsRendererRef.current = routes.map((route: any, index: number) => {
            console.log(`Creating renderer for route ${index}`)
            
            const isSelected = index === selectedRouteIndex
            const renderer = new DirectionsRenderer({
              map: mapInstanceRef.current,
              routeIndex: index,
              polylineOptions: {
                strokeColor: isSelected ? '#4285F4' : '#9AA0A6',
                strokeWeight: isSelected ? 6 : 4,
                strokeOpacity: isSelected ? 0.8 : 0.6
              },
              suppressMarkers: false,
              suppressInfoWindows: false,
              preserveViewport: index > 0
            })

            renderer.setDirections(result)
            console.log(`Renderer ${index} created and directions set`)
            return renderer
          })

          showHazardsOnRoute(routes[0], routes)
        } else {
          console.error('Directions request failed:', status)
          setError(`Could not calculate route: ${status}. Please try different locations.`)
        }
        setIsLoading(false)
      })
    } catch (error) {
      console.error('Error in route calculation:', error)
      setError('Error calculating route. Please try again.')
      setIsLoading(false)
    }
  }

  const showHazardsOnRoute = async (primaryRoute: any, allRoutes: any[] = []) => {
  console.log('showHazardsOnRoute called with:', {
    totalReports: reports.length,
    routeCount: allRoutes.length,
    filters: { hazardType: viewFilters.hazardType, sensitivity: viewFilters.sensitivity }
  })

  // Clear existing markers
  markersRef.current.forEach(marker => marker.setMap(null))
  markersRef.current = []

  if (reports.length === 0) {
    console.log('No reports available in the system')
    setFilteredReports([])
    return
  }

  // Import geometry library
  let spherical
  try {
    const geometryLib = await google.maps.importLibrary("geometry")
    spherical = geometryLib.spherical
    console.log('Geometry library loaded successfully')
  } catch (error) {
    console.error('Failed to load geometry library:', error)
    setError('Failed to load map geometry library')
    return
  }

  // Filter reports by type and severity first
  let typeFilteredReports = reports.filter(report => {
    if (!report.location) return false
    
    if (viewFilters.hazardType && viewFilters.hazardType !== 'all' && report.hazard_type !== viewFilters.hazardType) {
      return false
    }
    
    if (viewFilters.sensitivity && viewFilters.sensitivity !== 'all' && report.severity_level !== viewFilters.sensitivity) {
      return false
    }
    
    return true
  })

  console.log('After type/severity filtering:', typeFilteredReports.length, 'reports')

  // Check hazards that are directly ON the road paths (very precise)
  let routeHazards: Report[] = []
  try {
    routeHazards = typeFilteredReports.filter(report => {
      if (!report.location) return false
      const reportLatLng = new google.maps.LatLng(report.location.lat, report.location.lng)
      
      // Check if hazard is close to ANY of the routes
      return allRoutes.some(route => {
        const path = route.overview_path
        if (!path || path.length === 0) return false
        
        let minDistanceToRoute = Infinity
        
        // Check distance to each segment of this route
        for (let i = 0; i < path.length - 1; i++) {
          try {
            const segmentStart = path[i]
            const segmentEnd = path[i + 1]
            
            // Calculate distances to segment endpoints
            const distanceToStart = spherical.computeDistanceBetween(reportLatLng, segmentStart)
            const distanceToEnd = spherical.computeDistanceBetween(reportLatLng, segmentEnd)
            const segmentLength = spherical.computeDistanceBetween(segmentStart, segmentEnd)
            
            // Calculate perpendicular distance to the line segment
            if (segmentLength > 10) { // Only for segments longer than 10 meters
              // Use the triangle method to find perpendicular distance
              const a = distanceToStart
              const b = distanceToEnd
              const c = segmentLength
              
              // Check if we can form a valid triangle
              if (a + c > b && b + c > a && a + b > c) {
                // Calculate area using Heron's formula
                const s = (a + b + c) / 2
                const area = Math.sqrt(s * (s - a) * (s - b) * (s - c))
                
                // Perpendicular distance = 2 * area / base
                const perpendicularDistance = (2 * area) / c
                
                // Check if the perpendicular point falls within the segment
                const dotProduct = ((reportLatLng.lat() - segmentStart.lat()) * (segmentEnd.lat() - segmentStart.lat()) + 
                                   (reportLatLng.lng() - segmentStart.lng()) * (segmentEnd.lng() - segmentStart.lng())) / 
                                   (segmentLength * segmentLength)
                
                if (dotProduct >= 0 && dotProduct <= 1) {
                  // Point projects onto the segment
                  minDistanceToRoute = Math.min(minDistanceToRoute, perpendicularDistance)
                } else {
                  // Point projects outside segment, use distance to nearest endpoint
                  minDistanceToRoute = Math.min(minDistanceToRoute, Math.min(a, b))
                }
              } else {
                // Cannot form valid triangle, use distance to nearest endpoint
                minDistanceToRoute = Math.min(minDistanceToRoute, Math.min(a, b))
              }
            } else {
              // Short segment, just use distance to endpoints
              minDistanceToRoute = Math.min(minDistanceToRoute, Math.min(distanceToStart, distanceToEnd))
            }
          } catch (error) {
            console.error('Distance calculation error:', error)
          }
        }
        
        // Only include hazards within 25 meters of the actual road path
        const isOnRoute = minDistanceToRoute <= 25
        if (isOnRoute) {
          console.log(`Hazard "${report.title}" is ${minDistanceToRoute.toFixed(1)}m from route`)
        }
        return isOnRoute
      })
    })

    console.log('After precise route proximity filtering:', routeHazards.length, 'hazards')
    setFilteredReports(routeHazards)
  } catch (err) {
    console.error('Error filtering hazards:', err)
    setFilteredReports([])
  }

  // Count hazards by severity
  const severityCounts = {
    high: routeHazards.filter(r => r.severity_level === 'high').length,
    medium: routeHazards.filter(r => r.severity_level === 'medium').length,
    low: routeHazards.filter(r => r.severity_level === 'low').length
  }

  if (routeHazards.length > 0) {
    setRouteHazardAlert({
      show: true,
      hazardCount: routeHazards.length,
      highRiskCount: severityCounts.high,
      mediumRiskCount: severityCounts.medium,
      lowRiskCount: severityCounts.low,
      routeCount: allRoutes.length
    })

    // Add markers for hazards that are actually on the routes
    routeHazards.forEach((report) => {
      if (!report.location) return

      const marker = new google.maps.Marker({
        position: report.location,
        map: mapInstanceRef.current,
        title: report.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getSeverityColor(report.severity_level),
          fillOpacity: 0.8,
          strokeColor: '#fff',
          strokeWeight: 2,
        }
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 220px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${getHazardEmoji(report.hazard_type)} ${report.title}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">${report.hazard_type}</div>
            <div style="font-size: 11px; color: #999;">${report.severity_level.toUpperCase()}</div>
          </div>
        `
      })

      marker.addListener('click', () => {
        markersRef.current.forEach((m: any) => m.infoWindow?.close())
        infoWindow.open(mapInstanceRef.current, marker)
        setSelectedReport(report)
      })

      ;(marker as any).infoWindow = infoWindow
      markersRef.current.push(marker)
    })
  }
}

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getHazardEmoji = (hazardType: string) => {
    switch (hazardType) {
      case 'accident': return '🚗'
      case 'pothole': return '🕳️'
      case 'Natural disaster': return '🌊'
      case 'construction': return '🚧'
      default: return '⚠️'
    }
  }

  // Traffic layer toggle functions
  const toggleTrafficLayer = () => {
    if (!trafficLayerRef.current || !mapInstanceRef.current) return
    
    const newTrafficState = !trafficLayerEnabled
    setTrafficLayerEnabled(newTrafficState)
    
    if (newTrafficState) {
      trafficLayerRef.current.setMap(mapInstanceRef.current)
    } else {
      trafficLayerRef.current.setMap(null)
    }
  }

  const toggleTransitLayer = () => {
    if (!transitLayerRef.current || !mapInstanceRef.current) return
    
    const newTransitState = !transitLayerEnabled
    setTransitLayerEnabled(newTransitState)
    
    if (newTransitState) {
      transitLayerRef.current.setMap(mapInstanceRef.current)
    } else {
      transitLayerRef.current.setMap(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-900">Route Map</h4>
        
        {/* Traffic Layer Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTrafficLayer}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              trafficLayerEnabled
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            title="Toggle real-time traffic layer"
          >
            🚦 Traffic {trafficLayerEnabled ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={toggleTransitLayer}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              transitLayerEnabled
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            title="Toggle public transit layer"
          >
            🚌 Transit {transitLayerEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96"
          style={{ minHeight: '400px' }}
        />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <svg className="animate-spin mx-auto h-8 w-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">
                {!googleMapsScriptLoaded ? 'Loading Google Maps...' : 'Initializing map...'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Map Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Map Legend</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hazard Risk Levels */}
          <div>
            <h6 className="text-xs font-semibold text-gray-600 mb-2">Hazard Risk Levels</h6>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">High Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-600">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Low Risk</span>
              </div>
            </div>
          </div>
          
          {/* Route Types */}
          <div>
            <h6 className="text-xs font-semibold text-gray-600 mb-2">Route Types</h6>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600" style={{height: '2px'}}></div>
                <span className="text-xs text-gray-600">Primary Route</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400" style={{height: '2px'}}></div>
                <span className="text-xs text-gray-600">Alternative Routes</span>
              </div>
            </div>
          </div>
          
          {/* Traffic Information */}
          {trafficLayerEnabled && (
            <div className="md:col-span-2">
              <h6 className="text-xs font-semibold text-gray-600 mb-2">Traffic Information</h6>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-2 bg-red-600"></div>
                  <span className="text-xs text-gray-600">Heavy Traffic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-2 bg-yellow-600"></div>
                  <span className="text-xs text-gray-600">Moderate Traffic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-2 bg-green-600"></div>
                  <span className="text-xs text-gray-600">Light Traffic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 italic">Real-time data from Google Maps</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RouteMap