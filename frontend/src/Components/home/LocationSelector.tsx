// components/LocationSelector.tsx
import React, { useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ViewFilters } from './types'

interface LocationSelectorProps {
  viewFilters: ViewFilters
  setViewFilters: React.Dispatch<React.SetStateAction<ViewFilters>>
  googleMapsScriptLoaded?: boolean // Add this prop
}

declare const google: any

const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  viewFilters, 
  setViewFilters,
  googleMapsScriptLoaded = false 
}) => {
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)
  const autocompleteFromRef = useRef<any>(null)
  const autocompleteToRef = useRef<any>(null)

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (googleMapsScriptLoaded && window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete()
    }
  }, [googleMapsScriptLoaded])

  const initializeAutocomplete = () => {
    if (!fromInputRef.current || !toInputRef.current) return

    try {
      // Initialize FROM autocomplete
      if (!autocompleteFromRef.current) {
        autocompleteFromRef.current = new google.maps.places.Autocomplete(fromInputRef.current, {
          types: ['geocode'],
          componentRestrictions: { country: 'LK' }, // Restrict to Sri Lanka
          fields: ['place_id', 'formatted_address', 'geometry']
        })

        autocompleteFromRef.current.addListener('place_changed', () => {
          const place = autocompleteFromRef.current.getPlace()
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
      }

      // Initialize TO autocomplete
      if (!autocompleteToRef.current) {
        autocompleteToRef.current = new google.maps.places.Autocomplete(toInputRef.current, {
          types: ['geocode'],
          componentRestrictions: { country: 'LK' },
          fields: ['place_id', 'formatted_address', 'geometry']
        })

        autocompleteToRef.current.addListener('place_changed', () => {
          const place = autocompleteToRef.current.getPlace()
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
      }
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
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
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
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

  return (
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
                {viewFilters.fromLocation.address}
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
        
        <div className="mt-2">
          <button
            onClick={() => getCurrentLocation('from')}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Use current location
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
                {viewFilters.toLocation.address}
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
        
        <div className="mt-2">
          <button
            onClick={() => getCurrentLocation('to')}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Use current location
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationSelector