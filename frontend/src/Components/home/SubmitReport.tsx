'use client'
import { PhotoIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useRef } from 'react'
import { reportsAPI, type HazardReportData } from '@/lib/api'
import Script from 'next/script'
import Snackbar from '@/Components/Snackbar'

interface SubmitForm {
  title: string;
  description: string;
  hazard_type: string;
  severity_level: string;
  images: File[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

declare global {
  interface Window {
    google: typeof google;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ'

const SubmitReport = () => {
  const [submitForm, setSubmitForm] = useState<SubmitForm>({
    title: '',
    description: '',
    hazard_type: '',
    severity_level: '',
    images: [],
    location: undefined,
  })
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info'}>({ open: false, message: '', type: 'info' })

  const [isLoading, setIsLoading] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  // Map-related state
  const [showMap, setShowMap] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [googleMapsScriptLoaded, setGoogleMapsScriptLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Use browser geolocation as default if available
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation(null);
        }
      );
    }
  }, []);

  const defaultLocation = userLocation || { lat: 7.2083, lng: 79.8358 };
  const initialLocation = submitForm.location || defaultLocation;

  // Load Google Maps when script is loaded and map modal is shown
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setMapLoaded(true)
        console.log('Google Maps loaded successfully')
      } else {
        setTimeout(checkGoogleMaps, 100)
      }
    }

    if (showMap && googleMapsScriptLoaded && !mapLoaded) {
      checkGoogleMaps()
    }
  }, [showMap, googleMapsScriptLoaded, mapLoaded])

  // Initialize map when modal opens
  useEffect(() => {
    if (showMap && mapLoaded && mapRef.current && !mapInstanceRef.current) {
      initializeMap()
    }
  }, [showMap, mapLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    console.log('Initializing map...')

    const map = new google.maps.Map(mapRef.current, {
      center: initialLocation,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map
    console.log('Map created successfully')

    const marker = new google.maps.Marker({
      position: initialLocation,
      map: map,
      draggable: true,
      title: 'Hazard Location'
    })

    markerRef.current = marker

    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        updateLocation(lat, lng, map, marker)
      }
    })

    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      if (position) {
        const lat = position.lat()
        const lng = position.lng()
        updateLocation(lat, lng, map, marker)
      }
    })

    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['place_id', 'geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'lk' },
      })

      autocomplete.bindTo('bounds', map)
      autocompleteRef.current = autocomplete

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const address = place.formatted_address || place.name || ''
          
          map.setCenter({ lat, lng })
          map.setZoom(15)
          marker.setPosition({ lat, lng })
          
          setSubmitForm(prev => ({
            ...prev,
            location: { lat, lng, address }
          }))
        }
      })
    }

    if (submitForm.location) {
      marker.setPosition(submitForm.location)
      map.setCenter(submitForm.location)
    }
  }

  const updateLocation = async (lat: number, lng: number, map: google.maps.Map, marker: google.maps.Marker) => {
    marker.setPosition({ lat, lng })
    map.panTo({ lat, lng })

    const geocoder = new google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      const address = response.results[0]?.formatted_address || ''
      
      setSubmitForm(prev => ({
        ...prev,
        location: { lat, lng, address }
      }))
    } catch (error) {
      console.error('Geocoding error:', error)
      setSubmitForm(prev => ({
        ...prev,
        location: { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
      }))
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSnackbar({ open: true, message: 'Geolocation is not supported by this browser.', type: 'error' })
      return
    }

    setIsLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        if (mapInstanceRef.current && markerRef.current) {
          updateLocation(lat, lng, mapInstanceRef.current, markerRef.current)
          mapInstanceRef.current.setZoom(15)
        } else {
          setSubmitForm(prev => ({
            ...prev,
            location: { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
          }))
        }
        setIsLoadingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setSnackbar({ open: true, message: 'Unable to retrieve your location. Please set it manually on the map.', type: 'error' })
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const openMapModal = () => setShowMap(true)
  
  const closeMapModal = () => {
    setShowMap(false)
    // Clean up map instances when closing
    mapInstanceRef.current = null
    markerRef.current = null
    autocompleteRef.current = null
    setMapLoaded(false)
  }
  
  const confirmLocation = () => setShowMap(false)

  // Handle form submissions
  // Edit and Remove Location functionality
  const handleEditLocation = () => {
    console.log('Edit Location clicked');
    setShowMap(true);
  };

  const handleRemoveLocation = () => {
    setSubmitForm(prev => ({
      ...prev,
      location: undefined
    }));
  };

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const fileArray = Array.from(files)
    const maxFiles = 5
    const maxSize = 5 * 1024 * 1024

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      if (submitForm.images.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} images allowed`)
        break
      }

      if (file.size > maxSize) {
        errors.push(`${file.name} is too large. Maximum size is 5MB`)
        continue
      }

      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not a valid image file`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      setSnackbar({ open: true, message: 'Image Upload Errors: ' + errors.join(' | '), type: 'error' })
    }

    if (validFiles.length > 0) {
      setSubmitForm(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles]
      }))

      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviews(prev => [...prev, e.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }

    e.target.value = ''
  }, [submitForm.images])

  const removeImage = useCallback((index: number) => {
    setSubmitForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }, [])


  // Submit hazard report
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submitted with data:', submitForm)
    
    const errors: string[] = []
    
    if (!submitForm.title.trim()) {
      errors.push('Please enter a report title')
    }
    if (submitForm.title.trim().length > 255) {
      errors.push('Title must be 255 characters or less')
    }
    if (!submitForm.hazard_type || submitForm.hazard_type.trim() === '') {
      errors.push('Please select a hazard type')
    }
    if (!submitForm.severity_level || submitForm.severity_level.trim() === '') {
      errors.push('Please select a severity level')
    }
    if (submitForm.description.length > 2000) {
      errors.push('Description must be 2000 characters or less')
    }
    if (!submitForm.location) {
      errors.push('Please set a location for the hazard')
    }
    if (submitForm.images.length === 0) {
      errors.push('Please add at least one photo of the hazard')
    }
    
    if (errors.length > 0) {
      setSnackbar({ open: true, message: 'Validation Errors: ' + errors.join(' | '), type: 'error' })
      return
    }

    setIsLoading(true)

    try {
      const reportData: HazardReportData = {
        title: submitForm.title.trim(),
        description: submitForm.description.trim() || undefined,
        hazard_type: submitForm.hazard_type as 'accident' | 'pothole' | 'Natural disaster' | 'construction',
        severity_level: submitForm.severity_level as 'low' | 'medium' | 'high',
        images: submitForm.images,
        location: submitForm.location,
      }

      console.log('Sending to API:', reportData)
      console.log('Images to upload:', submitForm.images.length)
      console.log('Location:', submitForm.location)

      const response = await reportsAPI.submitReport(reportData)
      
      console.log('Success response:', response)
      
      const timestamp = response.timestamp || new Date().toISOString()
      const formattedDate = new Date(timestamp).toLocaleString()

      const locationText = submitForm.location ? `\nLocation: ${submitForm.location.address || `${submitForm.location.lat.toFixed(6)}, ${submitForm.location.lng.toFixed(6)}`}` : ''
      setSnackbar({ open: true, message: response.message || 'Report submitted successfully', type: 'success' })
      
      setSubmitForm({
        title: '',
        description: '',
        hazard_type: '',
        severity_level: '',
        images: [],
        location: undefined,
      })
      setImagePreviews([])
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSnackbar({ open: true, message: 'Failed to submit report: ' + errorMessage, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [submitForm])

  return (
    <>
      {/* Load Google Maps script only when map modal is shown */}
      {showMap && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`}
          onLoad={() => {
            console.log('Google Maps script loaded')
            setGoogleMapsScriptLoaded(true)
          }}
          onError={() => {
            console.error('Failed to load Google Maps script')
            setSnackbar({ open: true, message: 'Failed to load Google Maps. Please check your API key and internet connection.', type: 'error' })
          }}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Report a Road Hazard</h3>
          <p className="text-gray-600">
            Help keep our roads safe by reporting hazards, accidents, or dangerous conditions.
          </p>
          
          
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title *
            </label>
            <input
              type="text"
              required
              value={submitForm.title}
              onChange={(e) => setSubmitForm(prev => ({...prev, title: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief, clear description of the hazard"
              maxLength={255}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">{submitForm.title.length}/255 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description
            </label>
            <textarea
              value={submitForm.description}
              onChange={(e) => setSubmitForm(prev => ({...prev, description: e.target.value}))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide detailed information about the hazard..."
              maxLength={2000}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">{submitForm.description.length}/2000 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hazard Type *
            </label>
            <select 
              required
              aria-label="Hazard Type"
              title="Select hazard type"
              value={submitForm.hazard_type}
              onChange={(e) => setSubmitForm(prev => ({...prev, hazard_type: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select hazard type</option>
              <option value="accident">Traffic Accident</option>
              <option value="pothole">Pothole</option>
              <option value="Natural disaster">Natural Disaster</option>
              <option value="construction">Construction Work</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity Level *
            </label>
            <select 
              required
              aria-label="Severity Level"
              title="Select severity level"
              value={submitForm.severity_level}
              onChange={(e) => setSubmitForm(prev => ({...prev, severity_level: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select severity level</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (Optional)
            </label>
            <div className="space-y-3">
              {!submitForm.location ? (
                <button
                  type="button"
                  onClick={openMapModal}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  disabled={isLoading}
                >
                  <MapPinIcon className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-gray-600"> Set Location on Map</span>
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <MapPinIcon className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">Location Set</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {submitForm.location.address || `${submitForm.location.lat.toFixed(6)}, ${submitForm.location.lng.toFixed(6)}`}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleEditLocation}
                        className="text-green-600 hover:text-green-800 text-sm underline"
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLocation}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Images (Optional)
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB (Max 5 images)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isLoading || submitForm.images.length >= 5}
                  />
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Images ({submitForm.images.length}/5)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          title="Remove image"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          disabled={isLoading}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {(submitForm.images[index]?.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-blue-200 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Report...
              </span>
            ) : (
              `🚀 Submit Hazard Report ${submitForm.images.length > 0 ? `(${submitForm.images.length} image${submitForm.images.length > 1 ? 's' : ''})` : ''}`
            )}
          </button>

          
        </form>

        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Set Hazard Location</h3>
                <button
                  type="button"
                  title="Close map"
                  aria-label="Close location selector"
                  onClick={closeMapModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search for a location..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!mapLoaded}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation || !mapLoaded}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isLoadingLocation || !mapLoaded
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isLoadingLocation ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Getting...
                      </span>
                    ) : (
                      '📍 Current Location'
                    )}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Click on the map or drag the marker to set the exact location of the hazard. You can also search for a specific address above.
                  </p>
                </div>

                <div className="relative">
                  <div
                    ref={mapRef}
                    className="w-full h-96 rounded-lg border border-gray-300"
                    style={{ minHeight: '400px' }}
                  />
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <svg className="animate-spin mx-auto h-8 w-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       <p className="text-gray-600">
                         {!googleMapsScriptLoaded ? 'Loading Google Maps script...' : 'Initializing map...'}
                       </p>
                      <div className="mb-2 text-xs text-blue-700 flex items-center gap-2">
                        <span>🔎 After searching, <b>click on the map</b> or <b>drag the marker</b> to set the exact location.</span>
                      </div>
                     </div>
                   </div>
                 )}
               </div>

               {submitForm.location && (
                 <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                   <div className="flex items-center mb-1">
                     <MapPinIcon className="h-4 w-4 text-green-600 mr-2" />
                     <span className="text-sm font-medium text-green-800">Selected Location:</span>
                   </div>
                   <p className="text-sm text-green-700">
                     {submitForm.location.address || `${submitForm.location.lat.toFixed(6)}, ${submitForm.location.lng.toFixed(6)}`}
                   </p>
                 </div>
               )}
             </div>

             <div className="flex items-center justify-end space-x-3 p-6 border-t">
               <button
                 type="button"
                 onClick={closeMapModal}
                 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={confirmLocation}
                 disabled={!submitForm.location}
                 className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                   submitForm.location
                     ? 'bg-blue-600 hover:bg-blue-700 text-white'
                     : 'bg-gray-300 cursor-not-allowed text-gray-500'
                 }`}
               >
                 Confirm Location
               </button>
             </div>
           </div>
         </div>
       )}
       <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} />
     </div>
   </>
 )
}

export default SubmitReport