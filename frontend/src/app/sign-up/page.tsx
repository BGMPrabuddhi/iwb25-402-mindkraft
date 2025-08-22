'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'
import { googleMapsService, type LocationResult } from '@/lib/googleMaps'

type SignupFormData = {
    firstName: string
    lastName: string
    email: string
    password: string
    confirmPassword: string
    location: string
    userRole: string
}

type LocationData = {
  latitude: number
  longitude: number
  address: string
  city: string
  state: string
  country: string
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    userRole: 'general'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<SignupFormData>>({})
  const [apiError, setApiError] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Handle location search suggestions
    if (name === 'location') {
      handleLocationSearch(value)
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getCurrentLocation = async () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      alert('Google Maps API key is not configured. Please add your API key to environment variables.')
      return
    }

    setIsGettingLocation(true)
    setApiError('')
    
    try {
      const result = await googleMapsService.getCurrentLocation()
      
      setLocationData({
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address,
        city: result.city,
        state: result.state,
        country: result.country
      })
      
      const formattedLocation = result.city && result.state && result.country 
        ? `${result.city}, ${result.state}, ${result.country}`
        : result.address
      
      setFormData(prev => ({ ...prev, location: formattedLocation }))
      
      if (errors.location) {
        setErrors(prev => ({ ...prev, location: '' }))
      }
      
      console.log('Location obtained:', result)
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location'
      console.error('Location error:', errorMessage)
      setApiError(`Unable to get your location: ${errorMessage}. Please enter your location manually.`)
      alert(`Unable to get your location: ${errorMessage}. Please enter your location manually.`)
    } finally {
      setIsGettingLocation(false)
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
    setFormData(prev => ({ ...prev, location: suggestion.address }))
    setLocationData({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address,
      city: suggestion.city,
      state: suggestion.state,
      country: suggestion.country
    })
    
    setShowSuggestions(false)
    setLocationSuggestions([])
    
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setApiError('')
    
    try {
      console.log('Submitting registration form...')
      
      let finalLocationDetails = locationData
      
      if (!locationData && formData.location.trim()) {
        try {
          console.log('Attempting to geocode manual location:', formData.location)
          const geocodedResults = await googleMapsService.searchLocation(formData.location)
          if (geocodedResults.length > 0) {
            finalLocationDetails = {
              latitude: geocodedResults[0].latitude,
              longitude: geocodedResults[0].longitude,
              address: geocodedResults[0].address,
              city: geocodedResults[0].city,
              state: geocodedResults[0].state,
              country: geocodedResults[0].country
            }
            console.log('Successfully geocoded location:', finalLocationDetails)
          }
        } catch (geocodeError) {
          console.log('Geocoding failed, using manual parsing:', geocodeError)
        }
      }
      
      const result = await authAPI.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        location: formData.location,
        userRole: formData.userRole,
        locationDetails: finalLocationDetails ? {
          latitude: finalLocationDetails.latitude,
          longitude: finalLocationDetails.longitude,
          city: finalLocationDetails.city,
          state: finalLocationDetails.state,
          country: finalLocationDetails.country,
          fullAddress: finalLocationDetails.address
        } : (() => {
          const locationParts = formData.location.split(',').map(part => part.trim()).filter(part => part.length > 0)
          
          return {
            latitude: 0,
            longitude: 0,
            city: locationParts[0] || 'Unknown City',
            state: locationParts[1] || 'Unknown State',
            country: locationParts[2] || locationParts[locationParts.length - 1] || 'Unknown Country',
            fullAddress: formData.location
          }
        })()
      })

      console.log('Registration result:', result)

      if (result.success) {
        alert('Account created successfully! Please log in with your credentials.')
      // Check if this is RDA registration
      if (formData.email === 'rdasrilanka@gmail.com' || formData.userRole === 'rda') {
        console.log('RDA user registered, redirecting to RDA dashboard')
        router.push('/rda-dashboard')
      } else {
        console.log('Regular user registered, redirecting to login')
        router.push('/login')
      }
    } else {
      const errorMessage = result.message || 'Registration failed. Please try again.'
      console.error('Registration failed:', errorMessage)
      alert(errorMessage)
    }
  } catch (error) {
    console.error('Signup error:', error)
    alert('Signup failed. Please try again.')
  } finally {
    setIsLoading(false)
  }
}

  const formatLocationDisplay = (suggestion: LocationResult) => {
    let displayText = suggestion.address
    
    if (suggestion.country === 'Sri Lanka') {
      const addressParts = suggestion.address.split(',').map(part => part.trim())
      
      const filteredParts = addressParts.filter(part => {
        if (/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(part)) return false
        if (part.toLowerCase().includes('sri lanka')) return false
        if (part.toLowerCase().includes('province')) return false
        if (part.toLowerCase() === 'galle' || part.toLowerCase() === 'colombo' || 
            part.toLowerCase() === 'kandy' || part.toLowerCase() === 'matara') {
          const hasMoreSpecific = addressParts.some(otherPart => 
            otherPart.trim().toLowerCase() !== part.toLowerCase() && 
            !otherPart.toLowerCase().includes('province') &&
            !otherPart.toLowerCase().includes('sri lanka') &&
            !/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(otherPart.trim())
          )
          return !hasMoreSpecific
        }
        if (!part.trim()) return false
        return true
      })
      
      if (filteredParts.length > 0) {
        displayText = `${filteredParts[0]}, Sri Lanka`
      } else {
        displayText = suggestion.city ? `${suggestion.city}, Sri Lanka` : suggestion.address
      }
    } else {
      if (suggestion.city && suggestion.country) {
        displayText = `${suggestion.city}, ${suggestion.country}`
      }
    }
    
    return {
      primary: displayText,
      secondary: suggestion.address !== displayText ? suggestion.address : ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-yellow-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-br from-pink-200 to-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Back to Home */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className={`max-w-md w-full space-y-8 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {/* Header */}
          <div className="text-center transform transition-all duration-700 delay-200">
            <div className="inline-block p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse-slow">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2 animate-gradient">
              SafeRoute
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2 animate-fade-in-up">Join Us Today!</h2>
            <p className="text-gray-600 animate-fade-in-up animation-delay-300">Create your account and start your journey</p>
          </div>
          
          {/* Sign Up Form */}
          <div className="bg-white/80 backdrop-blur-lg py-8 px-6 shadow-2xl rounded-2xl border border-white/20 transform transition-all duration-700 delay-400 hover:shadow-3xl hover:scale-105">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-3 border ${
                      errors.firstName ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="First name"
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.firstName}</p>
                  )}
                </div>
                
                <div className="group">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-3 border ${
                      errors.lastName ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="Last name"
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              {/* Email Field */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.email}</p>
                )}
              </div>

              {/* User Role Selection Field */}
              <div className="group">
                <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  User Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <select
                    id="userRole"
                    name="userRole"
                    value={formData.userRole}
                    onChange={handleChange}
                    className="appearance-none block w-full pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white"
                  >
                    <option value="general">General User</option>
                    <option value="rda">RDA Officer</option>
                    <option value="driver">Bus Driver</option>
                    <option value="transport_officer">Transport Officer</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Select your role: General User for reporting hazards, RDA Officer for resolving road issues, Bus Driver for emergency assistance, or Transport Officer for driver support.
                </p>
              </div>

              {/* Location Field with GPS and Search */}
              <div className="group">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    onFocus={() => setShowSuggestions(locationSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className={`appearance-none block w-full pl-10 pr-12 py-3 border ${
                      errors.location ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="Enter your location or use GPS"
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-blue-600 transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Get current location using GPS"
                  >
                    {isGettingLocation ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Location Suggestions Dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {locationSuggestions.map((suggestion, index) => {
                        const formatted = formatLocationDisplay(suggestion);
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectLocationSuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {formatted.primary}
                                </div>
                                {formatted.secondary && (
                                  <div className="text-xs text-gray-500 truncate mt-1">
                                    {formatted.secondary}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {errors.location && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.location}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  <span className="text-red-500">*</span> Location is required. Click the location icon to auto-detect your current location, type to search for suggestions, or enter manually (format: City, State, Country).
                </p>
              </div>

              {/* Password Field */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                      errors.password ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all} rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="Create a strong password"
                  />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.password}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Must be at least 6 characters
                </p>
              </div>
              
              {/* Confirm Password Field */}
              <div className="group">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                      errors.confirmPassword ? 'border-red-300 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 focus:bg-white`}
                    placeholder="Confirm your password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center group">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-300 hover:scale-110"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 transition-colors duration-300 group-hover:text-blue-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500 transition-all duration-300 hover:underline transform hover:scale-105 inline-block">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500 transition-all duration-300 hover:underline transform hover:scale-105 inline-block">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 transform ${
                    isLoading 
                      ? 'bg-blue-400 cursor-not-allowed scale-95' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="animate-pulse">Creating account...</span>
                    </div>
                  ) : (
                    <span className="flex items-center">
                      Create Account
                      <svg className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>

              {apiError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{apiError}</p>
                </div>
              )}
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-all duration-300 hover:underline transform hover:scale-105 inline-block">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="text-center transform transition-all duration-700 delay-600">
            <p className="text-sm text-gray-500 mb-4 animate-fade-in-up">Join thousands of satisfied users</p>
            <div className="flex justify-center space-x-8 text-sm text-gray-400">
              <span className="flex items-center space-x-2 hover:text-blue-500 transition-colors duration-300 transform hover:scale-110">
                <span className="animate-bounce">🛡️</span>
                <span>Secure</span>
              </span>
              <span className="flex items-center space-x-2 hover:text-purple-500 transition-colors duration-300 transform hover:scale-110">
                <span className="animate-pulse">⚡</span>
                <span>Fast Setup</span>
              </span>
              <span className="flex items-center space-x-2 hover:text-green-500 transition-colors duration-300 transform hover:scale-110">
                <span className="animate-bounce animation-delay-1000">🎯</span>
                <span>Easy to Use</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes gradient {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-gradient { animation: gradient 3s ease infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        .shake { animation: shake 0.5s ease-in-out; }
        
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        .shadow-3xl { box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </div>
  )
}