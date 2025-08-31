// src/Components/MapPopup.tsx
'use client'
import React, { useEffect, useRef, useState } from 'react'

interface MapPopupProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  address?: string
  title?: string
}

declare global {
  interface Window {
    google: any
  }
}

function MapPopup({ isOpen, onClose, latitude, longitude, address, title }: MapPopupProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && mapRef.current && !mapInstanceRef.current) {
      loadGoogleMaps()
    }
  }, [isOpen, latitude, longitude])

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      initializeMap()
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initializeMap
      script.onerror = () => {
        setIsLoading(false)
      }
      document.head.appendChild(script)
    }
  }

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        draggable: false, // Disable map dragging
        disableDoubleClickZoom: false, // Allow double-click zoom
        scrollwheel: true, // Enable mouse wheel zoom
        gestureHandling: 'auto', // Allow all zoom gestures
      })

      // Add marker
      new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
        title: title || 'Report Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      })

      mapInstanceRef.current = map
      setIsLoading(false)
    } catch (error) {
      console.error('Error initializing map:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      mapInstanceRef.current = null
      setIsLoading(true)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || 'Report Location'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="h-96 w-full rounded-lg overflow-hidden border relative">
            <div 
              ref={mapRef} 
              className="w-full h-full"
              style={{ position: 'relative' }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {address && (
              <div className="text-sm">
                <strong>Address:</strong> {address}
              </div>
            )}
            <div className="text-sm">
              <strong>Coordinates:</strong> {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 bg-blue-50 p-2 rounded">
            <strong>Controls:</strong> Mouse wheel to zoom, double-click to zoom in, use +/- buttons
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapPopup