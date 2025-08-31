import React, { useRef, useEffect, useState, useCallback } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { googleMapsService, type LocationResult } from '@/lib/googleMaps'

interface LocationInputProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  required?: boolean
  error?: string
  className?: string
  googleMapsScriptLoaded?: boolean
}

interface GoogleMapsAutocomplete {
  addListener: (event: string, callback: () => void) => void
  getPlace: () => {
    geometry?: {
      location?: {
        lat: () => number
        lng: () => number
      }
    }
    formatted_address?: string
    name?: string
  }
}

declare const google: {
  maps: {
    places: {
      Autocomplete: new (input: HTMLInputElement, options?: unknown) => GoogleMapsAutocomplete
    }
    Geocoder: new () => {
      geocode: (request: { location: { lat: number; lng: number } }, callback: (results: unknown[], status: string) => void) => void
    }
  }
}

const LocationInput: React.FC<LocationInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onLocationSelect,
  required = false,
  error,
  className = '',
  googleMapsScriptLoaded = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<GoogleMapsAutocomplete | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([])

  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'LK' }, // Restrict to Sri Lanka
        fields: ['place_id', 'formatted_address', 'geometry']
      })

      autocompleteRef.current.addListener('place_changed', () => {
        if (!autocompleteRef.current) return
        
        const place = autocompleteRef.current.getPlace()
        if (place.geometry && place.geometry.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || place.name || ''
          }
          
          setSelectedLocation(location)
          onChange(location.address)
          
          if (onLocationSelect) {
            onLocationSelect(location)
          }
        }
      })
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
    }
  }, [onChange, onLocationSelect])

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (googleMapsScriptLoaded && window.google && window.google.maps && window.google.maps.places && inputRef.current) {
      initializeAutocomplete()
    }
  }, [googleMapsScriptLoaded, initializeAutocomplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)
    
    // Handle location search suggestions for fallback
    if (!googleMapsScriptLoaded || !window.google) {
      handleLocationSearch(inputValue)
    }
  }

  const handleLocationSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const results = await googleMapsService.searchLocation(query.trim())
      setLocationSuggestions(results)
      setShowSuggestions(results.length > 0)
    } catch (error: unknown) {
      console.error('Location search error:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectLocationSuggestion = (suggestion: LocationResult) => {
    const location = {
      lat: suggestion.latitude,
      lng: suggestion.longitude,
      address: suggestion.address
    }
    
    setSelectedLocation(location)
    onChange(suggestion.address)
    setShowSuggestions(false)
    setLocationSuggestions([])
    
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setIsGettingLocation(true)
    
    try {
      if (googleMapsScriptLoaded && window.google && window.google.maps) {
        // Use Google Maps geocoding
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ location: { lat, lng } }, (results: unknown[], status: string) => {
              if (status === 'OK' && results && results[0]) {
                const firstResult = results[0] as { formatted_address?: string }
                const location = {
                  lat,
                  lng,
                  address: firstResult.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                }
                
                setSelectedLocation(location)
                onChange(location.address)
                
                if (inputRef.current) {
                  inputRef.current.value = location.address
                }
                
                if (onLocationSelect) {
                  onLocationSelect(location)
                }
              } else {
                // Fallback to coordinates
                const location = {
                  lat,
                  lng,
                  address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                }
                
                setSelectedLocation(location)
                onChange(location.address)
                
                if (onLocationSelect) {
                  onLocationSelect(location)
                }
              }
              setIsGettingLocation(false)
            })
          },
          (error) => {
            console.error('Error getting location:', error)
            alert('Could not get your current location. Please ensure location services are enabled.')
            setIsGettingLocation(false)
          }
        )
      } else {
        // Use our service as fallback
        const result = await googleMapsService.getCurrentLocation()
        const location = {
          lat: result.latitude,
          lng: result.longitude,
          address: result.address
        }
        
        setSelectedLocation(location)
        onChange(location.address)
        
        if (onLocationSelect) {
          onLocationSelect(location)
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location'
      console.error('❌ Location error:', errorMessage)
      alert(`Unable to get your location: ${errorMessage}. Please enter your location manually.`)
    } finally {
      setIsGettingLocation(false)
    }
  }

  const clearLocation = () => {
    setSelectedLocation(null)
    onChange('')
    setShowSuggestions(false)
    setLocationSuggestions([])
    
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(locationSuggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          required={required}
          className={`w-full pl-10 pr-12 py-3 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          placeholder={placeholder}
        />
        
        <div className="absolute right-3 top-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        {/* Location Suggestions Dropdown */}
        {showSuggestions && locationSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {locationSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectLocationSuggestion(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-200 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {suggestion.address}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-800">
              {selectedLocation.address}
            </div>
            <button
              type="button"
              onClick={clearLocation}
              className="text-red-600 hover:text-red-800"
              title="Clear location"
              aria-label="Clear location"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Current Location Button */}
      <div className="mt-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGettingLocation ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Getting location...
            </span>
          ) : (
            'Use current location'
          )}
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default LocationInput
