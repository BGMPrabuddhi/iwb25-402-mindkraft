import { Loader } from '@googlemaps/js-api-loader'

/// <reference types="google.maps" />

interface LocationResult {
  latitude: number
  longitude: number
  address: string
}

interface GeolocationError {
  code: number
  message: string
}

class GoogleMapsService {
  private loader: Loader
  private isLoaded: boolean = false

  constructor() {
    this.loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places', 'geometry']
    })
  }

  async initializeGoogleMaps(): Promise<void> {
    if (this.isLoaded) return
    
    try {
      await this.loader.load()
      this.isLoaded = true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error('Failed to load Google Maps API: ' + errorMessage)
    }
  }

  async getCurrentLocation(): Promise<LocationResult> {
    // First, ensure Google Maps is loaded
    await this.initializeGoogleMaps()

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            const locationDetails = await this.getLocationDetails(latitude, longitude)
            resolve(locationDetails)
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            reject(new Error('Failed to get location details: ' + errorMessage))
          }
        },
        (error: GeolocationPositionError) => {
          let errorMessage = 'Location access denied'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          
          reject(new Error(errorMessage))
        },
        options
      )
    })
  }

  async getLocationDetails(latitude: number, longitude: number): Promise<LocationResult> {
    await this.initializeGoogleMaps()

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder()
      const latlng = { lat: latitude, lng: longitude }

      geocoder.geocode({ location: latlng }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0]

          const locationResult: LocationResult = {
            latitude,
            longitude,
            address: result.formatted_address || ''
          }

          resolve(locationResult)
        } else {
          reject(new Error('Failed to get location details from coordinates'))
        }
      })
    })
  }

  async searchLocation(query: string): Promise<LocationResult[]> {
    await this.initializeGoogleMaps()

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(document.createElement('div'))
      
      const request: google.maps.places.TextSearchRequest = {
        query: query
      }

      service.textSearch(request, async (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const locations: LocationResult[] = []
          
          for (const result of results.slice(0, 5)) { // Limit to 5 results
            if (result.geometry?.location) {
              const lat = result.geometry.location.lat()
              const lng = result.geometry.location.lng()
              
              try {
                const locationDetails = await this.getLocationDetails(lat, lng)
                locations.push(locationDetails)
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.error('Error getting details for location:', errorMessage)
              }
            }
          }
          
          resolve(locations)
        } else {
          reject(new Error('No locations found'))
        }
      })
    })
  }
}

export const googleMapsService = new GoogleMapsService()
export type { LocationResult, GeolocationError }
