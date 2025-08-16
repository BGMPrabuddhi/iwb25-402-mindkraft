'use client'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useRef } from 'react'
import { reportsAPI } from '@/lib/api'
import Script from 'next/script'

interface ViewFilters {
  hazardType: string
  sensitivity: string
  fromLocation?: {
    lat: number
    lng: number
    address?: string
  }
  toLocation?: {
    lat: number
    lng: number
    address?: string
  }
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
  status?: string;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ'

const ViewReports = () => {
  const [viewFilters, setViewFilters] = useState<ViewFilters>({
    hazardType: '',
    sensitivity: ''
  })

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Map-related state
  const [showMap, setShowMap] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [googleMapsScriptLoaded, setGoogleMapsScriptLoaded] = useState(false)
  const [activeLocationSelector, setActiveLocationSelector] = useState<'from' | 'to' | null>(null)
  
  // Autocomplete state
  const [autocompleteFrom, setAutocompleteFrom] = useState<any>(null)
  const [autocompleteTo, setAutocompleteTo] = useState<any>(null)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const directionsServiceRef = useRef<any>(null)
  const directionsRendererRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Picking location state
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  // Fetch all reports from backend
  // Replace your existing fetchAllReports useEffect with this:
useEffect(() => {
  const fetchAllReports = async () => {
    try {
      console.log('Fetching reports from backend...');
      const response = await reportsAPI.getReports({
        page: 1,
        page_size: 100
      });
      
      console.log('Raw backend response:', response);
      
      const backendReports = response.reports || [];
      console.log('Backend reports count:', backendReports.length);
      
      const convertedReports: Report[] = backendReports.map((report: any) => {
        const converted = {
          id: report.id,
          title: report.title,
          description: report.description || '',
          hazard_type: report.hazard_type,
          severity_level: report.severity_level,
          created_at: report.created_at,
          images: report.images || [],
          location: report.location ? {
            lat: report.location.lat || report.latitude,
            lng: report.location.lng || report.longitude,
            address: report.location.address || report.address
          } : undefined,
          status: report.status || 'active'
        };
        console.log('Converted report:', converted);
        return converted;
      });
      
      setReports(convertedReports);
      console.log('Successfully loaded reports:', convertedReports.length);
    } catch (error) {
      console.error('Error fetching reports:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reports';
      setError(errorMessage);
      alert('Failed to fetch reports: ' + errorMessage);
    }
  };

  fetchAllReports();
}, []);
  // Load Google Maps when needed
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places && window.google.maps.importLibrary) {
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

  // Initialize map when modal opens
  useEffect(() => {
    if (showMap && mapLoaded && mapRef.current && !mapInstanceRef.current) {
      try {
        initializeMap();
        setIsPickingLocation(true);
        setMapInitError(null);
      } catch (err) {
        setMapInitError('❌ Map not properly initialized. Please try again.');
      }
    }
  }, [showMap, mapLoaded])

  // Initialize autocomplete when map is loaded
  useEffect(() => {
    if (mapLoaded && !autocompleteFrom && !autocompleteTo) {
      setTimeout(() => {
        initializeAutocomplete()
      }, 500)
    }
  }, [mapLoaded, autocompleteFrom, autocompleteTo])

  // Debug geometry library
  useEffect(() => {
    if (mapLoaded) {
      setTimeout(async () => {
        try {
          const geometryLib = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
          console.log('Geometry library loaded:', !!geometryLib.spherical);
        } catch (error) {
          console.error('Geometry library failed to load:', error);
        }
      }, 1000);
    }
  }, [mapLoaded])

  const initializeMap = async () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      setMapInitError('❌ Map not properly initialized. Please try again.');
      return;
    }
    try {
      const { Map } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary
      const { DirectionsService, DirectionsRenderer } = await window.google.maps.importLibrary("routes") as google.maps.RoutesLibrary

      const map = new Map(mapRef.current, {
        center: { lat: 7.2083, lng: 79.8358 }, // Negombo center
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map
      directionsServiceRef.current = new DirectionsService()
      directionsRendererRef.current = new DirectionsRenderer({
        draggable: true,
        map: map
      })

      // Add click listener for location selection
      map.addListener('click', (event: any) => {
        if (activeLocationSelector && event.latLng) {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          handleLocationSelect(lat, lng)
        }
      })

      // Initialize autocomplete
      initializeAutocomplete()

      setMapInitError(null);
    } catch (error) {
      setMapInitError('❌ Map not properly initialized. Please try again.');
    }
  }

  const initializeAutocomplete = () => {
    if (!window.google || !window.google.maps.places) {
      console.log('Google Places not available yet')
      return
    }

    try {
      // Initialize FROM autocomplete
      if (fromInputRef.current && !autocompleteFrom) {
        const fromAutocomplete = new google.maps.places.Autocomplete(fromInputRef.current, {
          types: ['geocode'],
          componentRestrictions: { country: 'LK' }, // Restrict to Sri Lanka
          fields: ['place_id', 'formatted_address', 'geometry']
        })

        fromAutocomplete.addListener('place_changed', () => {
          const place = fromAutocomplete.getPlace()
          if (place.geometry && place.geometry.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || place.name || ''
            }
            setViewFilters(prev => ({
              ...prev,
              fromLocation: location
            }))
            console.log('From location selected:', location)
          }
        })

        setAutocompleteFrom(fromAutocomplete)
        console.log('From autocomplete initialized')
      }

      // Initialize TO autocomplete
      if (toInputRef.current && !autocompleteTo) {
        const toAutocomplete = new google.maps.places.Autocomplete(toInputRef.current, {
          types: ['geocode'],
          componentRestrictions: { country: 'LK' },
          fields: ['place_id', 'formatted_address', 'geometry']
        })

        toAutocomplete.addListener('place_changed', () => {
          const place = toAutocomplete.getPlace()
          if (place.geometry && place.geometry.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || place.name || ''
            }
            setViewFilters(prev => ({
              ...prev,
              toLocation: location
            }))
            console.log('To location selected:', location)
          }
        })

        setAutocompleteTo(toAutocomplete)
        console.log('To autocomplete initialized')
      }
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
    }
  }

  const handleLocationSelect = async (lat: number, lng: number) => {
    if (!activeLocationSelector) return

    const geocoder = new google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      const address = response.results[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      
      const location = { lat, lng, address }
      
      setViewFilters(prev => ({
        ...prev,
        [activeLocationSelector === 'from' ? 'fromLocation' : 'toLocation']: location
      }))
      
      // Update input field
      const inputRef = activeLocationSelector === 'from' ? fromInputRef : toInputRef
      if (inputRef.current) {
        inputRef.current.value = address
      }
      
      setActiveLocationSelector(null)
    } catch (error) {
      console.error('Geocoding error:', error)
      const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
      
      setViewFilters(prev => ({
        ...prev,
        [activeLocationSelector === 'from' ? 'fromLocation' : 'toLocation']: location
      }))
      
      const inputRef = activeLocationSelector === 'from' ? fromInputRef : toInputRef
      if (inputRef.current) {
        inputRef.current.value = location.address
      }
      
      setActiveLocationSelector(null)
    }
  }

  const getCurrentLocation = (locationType: 'from' | 'to') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Reverse geocode to get address
        if (window.google && window.google.maps) {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const location = {
                lat,
                lng,
                address: results[0].formatted_address
              }
              
              setViewFilters(prev => ({
                ...prev,
                [locationType === 'from' ? 'fromLocation' : 'toLocation']: location
              }))
              
              // Update input field
              const inputRef = locationType === 'from' ? fromInputRef : toInputRef
              if (inputRef.current) {
                inputRef.current.value = results[0].formatted_address
              }
            } else {
              // Fallback to coordinates
              const location = {
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              }
              
              setViewFilters(prev => ({
                ...prev,
                [locationType === 'from' ? 'fromLocation' : 'toLocation']: location
              }))
              
              const inputRef = locationType === 'from' ? fromInputRef : toInputRef
              if (inputRef.current) {
                inputRef.current.value = location.address
              }
            }
          })
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Could not get your current location. Please ensure location services are enabled.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const clearLocation = (locationType: 'from' | 'to') => {
    setViewFilters(prev => ({
      ...prev,
      [locationType === 'from' ? 'fromLocation' : 'toLocation']: undefined
    }))
    
    const inputRef = locationType === 'from' ? fromInputRef : toInputRef
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const showHazardsOnRoute = async (route: any) => {
  console.log('Starting hazard detection along route...');
  console.log('Available reports:', reports.length);
  console.log('Route data:', route);

  // Clear existing markers
  markersRef.current.forEach(marker => marker.setMap(null))
  markersRef.current = []

  // Import the geometry library
  let spherical;
  try {
    const geometryLib = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
    spherical = geometryLib.spherical;
    console.log('Geometry library loaded successfully');
  } catch (error) {
    console.error('Failed to load geometry library:', error);
    setError('Failed to load map geometry library. Please refresh and try again.');
    return;
  }

  // First, filter reports by type and severity
  let typeFilteredReports = reports.filter(report => {
    if (!report.location) {
      console.log(`Report ${report.id} has no location, skipping`);
      return false;
    }
    
    // Filter by hazard type
    if (viewFilters.hazardType && viewFilters.hazardType !== 'all' && report.hazard_type !== viewFilters.hazardType) {
      console.log(`Report ${report.id} filtered out by hazard type: ${report.hazard_type} vs ${viewFilters.hazardType}`);
      return false;
    }
    
    // Filter by sensitivity
    if (viewFilters.sensitivity && viewFilters.sensitivity !== 'all' && report.severity_level !== viewFilters.sensitivity) {
      console.log(`Report ${report.id} filtered out by severity: ${report.severity_level} vs ${viewFilters.sensitivity}`);
      return false;
    }
    
    return true;
  });

  console.log(`After type/severity filtering: ${typeFilteredReports.length} reports`);

  // Then filter by route proximity
  let routeHazards = typeFilteredReports.filter(report => {
    if (!report.location) return false;
    
    // Get route path
    const path = route.overview_path;
    if (!path || path.length === 0) {
      console.log('No route path available');
      return false;
    }

    // Check if hazard is near any point along the route
    const reportLatLng = new google.maps.LatLng(report.location.lat, report.location.lng);
    let minDistance = Infinity;
    
    for (let i = 0; i < path.length; i++) {
      try {
        const distance = spherical.computeDistanceBetween(reportLatLng, path[i]);
        if (distance < minDistance) {
          minDistance = distance;
        }
      } catch (error) {
        console.error('Distance calculation error for point', i, error);
      }
    }
    
    const isNearRoute = minDistance <= 2000; // Increased to 2km radius for testing
    console.log(`Report ${report.id} (${report.title}): min distance = ${minDistance.toFixed(0)}m, near route: ${isNearRoute}`);
    
    return isNearRoute;
  });

  console.log(`Final filtered hazards: ${routeHazards.length}`);
  
  setFilteredReports(routeHazards);

  // Add markers for hazards
  routeHazards.forEach((report, index) => {
    if (!report.location) return;

    console.log(`Adding marker for report ${report.id}: ${report.title}`);

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
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${getHazardEmoji(report.hazard_type)} ${report.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 2px;">${report.hazard_type}</div>
          <div style="font-size: 11px; color: #999;">${report.severity_level.toUpperCase()}</div>
        </div>
      `
    });

    marker.addListener('click', () => {
      markersRef.current.forEach((m: any) => m.infoWindow?.close());
      
      infoWindow.open(mapInstanceRef.current, marker);
      setSelectedReport(report);
      
      const reportElement = document.getElementById(`report-${report.id}`);
      if (reportElement) {
        reportElement.scrollIntoView({ behavior: 'smooth' });
      }
    });

    (marker as any).infoWindow = infoWindow;
    markersRef.current.push(marker);
  });

  console.log(`Added ${markersRef.current.length} markers to map`);
}
  const calculateRouteAndShowHazards = useCallback(async () => {
    if (!viewFilters.fromLocation || !viewFilters.toLocation || !mapInstanceRef.current) {
      console.error('Missing required data for route calculation')
      setError('Missing location data or map not initialized')
      return
    }

    if (!directionsServiceRef.current) {
      console.error('Directions service not initialized')
      setError('Map directions service not ready')
      return
    }

    try {
      const request = {
        origin: new google.maps.LatLng(viewFilters.fromLocation.lat, viewFilters.fromLocation.lng),
        destination: new google.maps.LatLng(viewFilters.toLocation.lat, viewFilters.toLocation.lng),
        travelMode: google.maps.TravelMode.DRIVING,
      }

      directionsServiceRef.current.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result)
          
          // Filter and show hazards along the route
          showHazardsOnRoute(result.routes[0])
        } else {
          console.error('Directions request failed:', status)
          setError(`Could not calculate route: ${status}. Please try different locations.`)
        }
      })
    } catch (error) {
      console.error('Error calculating route:', error)
      setError('Error calculating route. Please try again.')
    }
  }, [viewFilters.fromLocation, viewFilters.toLocation, reports])

  const getHazardEmoji = (hazardType: string) => {
    switch (hazardType) {
      case 'accident': return '🚗'
      case 'pothole': return '🕳️'
      case 'Natural disaster': return '🌊'
      case 'construction': return '🚧'
      default: return '⚠️'
    }
  }

  const handleFilterSubmit = useCallback(async () => {
    if (!viewFilters.hazardType || !viewFilters.sensitivity) {
      alert('Please select hazard type and sensitivity level')
      return
    }

    if (!viewFilters.fromLocation || !viewFilters.toLocation) {
      alert('Please select both FROM and TO locations')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Show the map first
      setShowMap(true)
      
      // Wait for map to be ready, then calculate route
      if (mapInstanceRef.current && directionsServiceRef.current) {
        await calculateRouteAndShowHazards()
        setIsLoading(false)
      } else {
        // Wait for map initialization
        setTimeout(async () => {
          if (mapInstanceRef.current && directionsServiceRef.current) {
            await calculateRouteAndShowHazards()
          } else {
            setError('Map not properly initialized. Please try again.')
          }
          setIsLoading(false)
        }, 2000)
        return
      }
      
    } catch (error) {
      console.error('Filter error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
    }
  }, [viewFilters, calculateRouteAndShowHazards])

  const resetFilter = () => {
    setViewFilters({
      hazardType: '',
      sensitivity: ''
    })
    setFilteredReports([])
    setSelectedReport(null)
    setError(null)
    setShowMap(false)
    setActiveLocationSelector(null)
    
    // Clear input fields
    if (fromInputRef.current) fromInputRef.current.value = ''
    if (toInputRef.current) toInputRef.current.value = ''
    
    // Clear map
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] })
    }
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444' // red
      case 'medium': return '#f59e0b' // yellow
      case 'low': return '#3b82f6' // blue
      default: return '#6b7280' // gray
    }
  }

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <>
      {/* Load Google Maps script with geometry library */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry,routes&v=weekly`}
        onLoad={() => {
          console.log('Google Maps script loaded with geometry library')
          setGoogleMapsScriptLoaded(true)
        }}
        onError={() => {
          console.error('Failed to load Google Maps script')
          setError('Failed to load Google Maps. Please check your API key and internet connection.')
        }}
      />

      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Route Hazard Viewer</h3>
          <p className="text-gray-600">Select hazard type, sensitivity, and route to view hazards along your path</p>
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
                    onClick={() => setViewFilters(prev => ({...prev, hazardType: type.value}))}
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

            {/* Sensitivity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Sensitivity Level *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All Levels', color: 'bg-gray-500' },
                  { value: 'high', label: 'High Risk', color: 'bg-red-500' },
                  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-500' },
                  { value: 'low', label: 'Low Risk', color: 'bg-blue-500' }
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setViewFilters(prev => ({...prev, sensitivity: level.value}))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      viewFilters.sensitivity === level.value
                        ? 'border-blue-500 bg-blue-100 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${level.color} mx-auto mb-1`}></div>
                    <div className="text-xs font-medium">{level.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Selection with Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Location *
                </label>
                <div className="relative">
                  <input
                    ref={fromInputRef}
                    type="text"
                    placeholder="Search starting location..."
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute right-3 top-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                {viewFilters.fromLocation && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-800">
                        📍 {viewFilters.fromLocation.address}
                      </div>
                      <button
                        onClick={() => clearLocation('from')}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 flex flex-col space-y-1">
                  <button
                    onClick={() => getCurrentLocation('from')}
                    className="text-sm text-green-600 hover:text-green-800 text-left"
                  >
                    📍 Use current location
                  </button>
                  <button
                    onClick={() => {
                      setShowMap(true)
                      setActiveLocationSelector('from')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 text-left"
                  >
                    🗺️ Select on map
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Location *
                </label>
                <div className="relative">
                  <input
                    ref={toInputRef}
                    type="text"
                    placeholder="Search destination..."
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute right-3 top-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                {viewFilters.toLocation && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-800">
                        📍 {viewFilters.toLocation.address}
                      </div>
                      <button
                        onClick={() => clearLocation('to')}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 flex flex-col space-y-1">
                  <button
                    onClick={() => getCurrentLocation('to')}
                    className="text-sm text-green-600 hover:text-green-800 text-left"
                  >
                    📍 Use current location
                  </button>
                  <button
                    onClick={() => {
                      setShowMap(true)
                      setActiveLocationSelector('to')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 text-left"
                  >
                    🗺️ Select on map
                  </button>
                </div>
              </div>
            </div>

            {activeLocationSelector && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  📍 Click on the map below to select your <strong>{activeLocationSelector === 'from' ? 'starting point' : 'destination'}</strong>
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">❌ {error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleFilterSubmit}
            disabled={!viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              !viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading
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
                Calculating Route...
              </span>
            ) : (
              'Show Route & Hazards'
            )}
          </button>

          {(showMap || filteredReports.length > 0) && (
            <button
              onClick={resetFilter}
              className="px-6 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Reset
            </button>
          )}
        </div>

        {/* Map Display */}
        {showMap && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
           <div className="p-4 border-b border-gray-200">
             <div className="flex items-center justify-between">
               <h4 className="text-lg font-medium text-gray-900">Route Map</h4>
               <div className="flex items-center space-x-2">
                 {activeLocationSelector && (
                   <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                     Click to select {activeLocationSelector} location
                   </span>
                 )}
                 <button
                   onClick={() => setActiveLocationSelector(null)}
                   className="text-sm text-gray-600 hover:text-gray-800"
                 >
                   Cancel Selection
                 </button>
               </div>
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
           {filteredReports.length > 0 && (
             <div className="p-4 bg-gray-50 border-t border-gray-200">
               <h5 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h5>
               <div className="flex flex-wrap gap-4">
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
           )}
         </div>
       )}

       {/* Hazard Reports Display */}
       {filteredReports.length > 0 && (
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-xl font-semibold text-gray-900">
               Hazards on Your Route ({filteredReports.length})
             </h3>
             <div className="text-sm text-gray-600">
               Route from {viewFilters.fromLocation?.address} to {viewFilters.toLocation?.address}
             </div>
           </div>

           <div className="grid gap-4">
             {filteredReports.map((report) => (
               <div 
                 key={report.id} 
                 id={`report-${report.id}`}
                 className={`bg-white border rounded-lg p-6 shadow-sm transition-all cursor-pointer ${
                   selectedReport?.id === report.id ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                 }`}
                 onClick={() => {
                   setSelectedReport(report)
                   if (mapInstanceRef.current && report.location) {
                     mapInstanceRef.current.setCenter(report.location)
                     mapInstanceRef.current.setZoom(16)
                   }
                 }}
               >
                 <div className="flex items-start justify-between">
                   <div className="flex-1">
                     <div className="flex items-center space-x-3 mb-2">
                       <h4 className="text-lg font-semibold text-gray-900">{report.title}</h4>
                       <span className="text-2xl">{getHazardEmoji(report.hazard_type)}</span>
                       <span className={`px-2 py-1 text-xs rounded-full border bg-gray-50 text-gray-700 border-gray-200`}>
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
                         <span className="flex items-center">
                           {new Date(report.created_at).toLocaleDateString()}
                         </span>
                       )}
                       {report.location && (
                         <span className="flex items-center">
                           <MapPinIcon className="h-4 w-4 mr-1" />
                           {report.location.address || `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                         </span>
                       )}
                       <span className="flex items-center">
                         ID: #{report.id}
                       </span>
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
                     <div className="ml-4">
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                         Selected
                       </span>
                     </div>
                   )}
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* No Hazards Message */}
       {showMap && filteredReports.length === 0 && !isLoading && viewFilters.fromLocation && viewFilters.toLocation && (
         <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
           <div className="text-4xl mb-4">🎉</div>
           <h3 className="text-lg font-semibold text-green-800 mb-2">Great News!</h3>
           <p className="text-green-700 text-lg">No hazards found on your selected route!</p>
           <p className="text-green-600 text-sm mt-2">
             Your route from <strong>{viewFilters.fromLocation.address}</strong> to <strong>{viewFilters.toLocation.address}</strong> looks safe based on current reports.
           </p>
           <div className="mt-4 text-xs text-green-600">
             Filtered by: {viewFilters.hazardType === 'all' ? 'All hazard types' : viewFilters.hazardType} • {viewFilters.sensitivity === 'all' ? 'All risk levels' : `${viewFilters.sensitivity} risk`}
           </div>
         </div>
       )}

       {/* Loading State */}
       {isLoading && (
         <div className="text-center py-12">
           <svg className="animate-spin mx-auto h-12 w-12 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           <p className="text-gray-600 text-lg">Calculating your route and scanning for hazards...</p>
           <p className="text-gray-500 text-sm mt-1">This may take a few moments</p>
         </div>
       )}

       {/* Instructions */}
       {!showMap && filteredReports.length === 0 && (
         <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
           <h4 className="text-lg font-semibold text-gray-900 mb-3">How to Use Route Hazard Viewer</h4>
           <div className="space-y-2 text-sm text-gray-600">
             <div className="flex items-start space-x-2">
               <span className="text-blue-600">1.</span>
               <span>Select the type of hazards you want to see (accidents, potholes, etc.)</span>
             </div>
             <div className="flex items-start space-x-2">
               <span className="text-blue-600">2.</span>
               <span>Choose the risk sensitivity level (high, medium, low, or all)</span>
             </div>
             <div className="flex items-start space-x-2">
               <span className="text-blue-600">3.</span>
               <span>Enter your starting point and destination by:</span>
             </div>
             <div className="ml-6 space-y-1">
               <div className="flex items-center space-x-2">
                 <span className="text-green-600">•</span>
                 <span>Typing in the search boxes (with autocomplete)</span>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="text-green-600">•</span>
                 <span>Using your current location</span>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="text-green-600">•</span>
                 <span>Clicking on the map</span>
               </div>
             </div>
             <div className="flex items-start space-x-2">
               <span className="text-blue-600">4.</span>
               <span>Click "Show Route & Hazards" to see your route and any hazards along the way</span>
             </div>
           </div>
         </div>
       )}

       {/* Location Selection Map Modal */}
       {showMap && activeLocationSelector && isPickingLocation && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Search & Select {activeLocationSelector === 'from' ? 'Starting Point' : 'Destination'}
        </h3>
        <button
          onClick={() => {
            setShowMap(false);
            setActiveLocationSelector(null);
            setIsPickingLocation(false);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="flex-1 p-4">
        {mapInitError && (
          <div className="mb-4 text-red-600 text-sm font-semibold">{mapInitError}</div>
        )}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location..."
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
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
    </div>
  </div>
)}
     </div>
   </>
 )
}

export default ViewReports