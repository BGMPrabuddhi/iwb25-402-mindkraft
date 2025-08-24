'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  UserCircleIcon, 
  CameraIcon, 
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { authAPI, UserProfile } from '@/lib/auth'
import { googleMapsService, type LocationResult } from '@/lib/googleMaps'

const ProfileEditPage = () => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null) // For new uploaded image
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(null) // For existing image
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    location: ''
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authAPI.isAuthenticated()) {
        router.push('/login')
        return
      }

      try {
        const profile = await authAPI.getProfile()
        if (profile.success) {
          setUser(profile)
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            location: profile.location || '' // Show existing location
          })
          // Set existing profile image if available
          if (profile.profileImage) {
            setCurrentProfileImage(profile.profileImage)
          }
        } else {
          setMessage({ type: 'error', text: 'Failed to load profile' })
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        setMessage({ type: 'error', text: 'Failed to load profile' })
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [router])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Handle location search suggestions
    if (name === 'location') {
      handleLocationSearch(value)
    }
  }

  const getCurrentLocation = async () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setMessage({ type: 'error', text: 'Google Maps API key is not configured. Please add your API key to environment variables.' })
      return
    }

    setIsGettingLocation(true)
    setMessage(null)
    
    try {
      const result = await googleMapsService.getCurrentLocation()
      
      // Update form data with formatted address
      const formattedLocation = result.city && result.state && result.country 
        ? `${result.city}, ${result.state}, ${result.country}`
        : result.address
      
      setFormData(prev => ({ ...prev, location: formattedLocation }))
      
      console.log('✅ Location obtained:', result)
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location'
      console.error('❌ Location error:', errorMessage)
      setMessage({ type: 'error', text: `Unable to get your location: ${errorMessage}. Please enter your location manually.` })
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
    // Use the full address from Google Maps
    setFormData(prev => ({ ...prev, location: suggestion.address }))
    
    setShowSuggestions(false)
    setLocationSuggestions([])
  }

  const formatLocationDisplay = (suggestion: LocationResult) => {
    // Clean up location suggestions to show in user-friendly format
    let displayText = suggestion.address
    
    // For Sri Lankan locations, extract the most relevant part
    if (suggestion.country === 'Sri Lanka') {
      const addressParts = suggestion.address.split(',').map(part => part.trim())
      
      // Filter out unwanted parts
      const filteredParts = addressParts.filter(part => {
        // Remove Plus Codes (like "54VV+VP6", "75Q5+5RX", etc.)
        if (/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(part)) return false
        // Remove "Sri Lanka" country name
        if (part.toLowerCase().includes('sri lanka')) return false
        // Remove provinces (like "Southern Province", "Western Province", etc.)
        if (part.toLowerCase().includes('province')) return false
        // Remove districts that are too general (like just "Galle" for Ampegama)
        if (part.toLowerCase() === 'galle' || part.toLowerCase() === 'colombo' || 
            part.toLowerCase() === 'kandy' || part.toLowerCase() === 'matara') {
          // Only remove if there's a more specific location available
          const hasMoreSpecific = addressParts.some(otherPart => 
            otherPart.trim().toLowerCase() !== part.toLowerCase() && 
            !otherPart.toLowerCase().includes('province') &&
            !otherPart.toLowerCase().includes('sri lanka') &&
            !/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(otherPart.trim())
          )
          return !hasMoreSpecific
        }
        // Remove empty parts
        if (!part.trim()) return false
        return true
      })
      
      // Use the most specific location (usually the first filtered part)
      if (filteredParts.length > 0) {
        displayText = `${filteredParts[0]}, Sri Lanka`
      } else {
        // Fallback: use city name if available
        displayText = suggestion.city ? `${suggestion.city}, Sri Lanka` : suggestion.address
      }
    } else {
      // For non-Sri Lankan locations, show City, Country format if possible
      if (suggestion.city && suggestion.country) {
        displayText = `${suggestion.city}, ${suggestion.country}`
      }
    }
    
    return {
      primary: displayText,
      secondary: suggestion.address !== displayText ? suggestion.address : ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Validate required fields
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.location.trim()) {
        setMessage({ type: 'error', text: 'First name, last name, and location are required' })
        return
      }

      // Prepare the update data
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        location: formData.location.trim(),
        ...(profileImage && { profileImage }) // Only include if new image was uploaded
      }

      // Call the API to update profile
      const result = await authAPI.updateProfile(updateData)
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        
        // Dispatch custom event to notify Header component to refresh profile data
        window.dispatchEvent(new CustomEvent('profileUpdated'))
        
        // Navigate to home page after successful update
        setTimeout(() => {
          router.push('/home')
        }, 1500)
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to update profile. Please try again.' 
        })
      }
      
    } catch (error) {
      console.error('Failed to update profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white py-14 px-4">
      {/* Subtle decorative brand accents */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-[28rem] bg-gradient-to-r from-brand-300/10 via-brand-200/10 to-brand-100/5 blur-3xl" />

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-200 shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-300/40"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back
            </button>
            {message && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 shadow-sm ${
                message.type === 'success' ? 'bg-green-50 ring-green-300 text-green-700' : 'bg-red-50 ring-red-300 text-red-700'
              }`}>
                {message.type === 'success' ? (<CheckIcon className="h-4 w-4" />) : (<XMarkIcon className="h-4 w-4" />)}
                <span>{message.text}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-800">Edit Profile</h1>
            <p className="text-brand-600 mt-2 text-sm md:text-base font-medium">Update your personal information and preferences</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="relative rounded-2xl border border-brand-200/70 shadow-lg shadow-brand-900/5 bg-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_70%)]" aria-hidden="true" />
          <form onSubmit={handleSubmit} className="relative z-10 p-8 md:p-10 space-y-8 rounded-2xl bg-white/80 backdrop-blur-sm">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-5">
              <div className="relative group">
                <div className="h-36 w-36 rounded-full overflow-hidden bg-brand-50 border-4 border-brand-100 shadow ring-2 ring-brand-200 flex items-center justify-center">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="New profile picture"
                      width={144}
                      height={144}
                      className="h-full w-full object-cover scale-105 group-hover:scale-[1.08] transition-transform duration-300"
                    />
                  ) : currentProfileImage ? (
                    <Image
                      src={currentProfileImage}
                      alt="Current profile picture"
                      width={144}
                      height={144}
                      className="h-full w-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                    />
                  ) : (
                    <UserCircleIcon className="h-full w-full text-brand-300" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile picture"
                  aria-label="Change profile picture"
                  className="absolute bottom-2 right-2 h-11 w-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 hover:from-brand-500 hover:via-brand-500 hover:to-brand-300 shadow ring-2 ring-brand-200 focus:outline-none focus:ring-4 focus:ring-brand-400/40 transition-all"
                >
                  <CameraIcon className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  aria-label="Upload profile picture"
                  title="Upload profile picture"
                />
              </div>
              <p className="text-xs md:text-sm text-brand-600 text-center font-medium leading-relaxed">
                Click the camera icon to {currentProfileImage ? 'change' : 'upload'} your profile picture<br />
                <span className="text-[11px] tracking-wide uppercase text-brand-500">Max size 5MB</span>
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold tracking-wide text-brand-800 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder-brand-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                  placeholder="Enter your first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold tracking-wide text-brand-800 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder-brand-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold tracking-wide text-brand-800 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 cursor-not-allowed"
                placeholder="Email not available"
              />
              <p className="text-[11px] text-brand-500 mt-2 font-medium tracking-wide">Email address cannot be changed. Contact support if you need to update your email.</p>
            </div>

            {/* Location with Google Maps */}
            <div>
              <label htmlFor="location" className="block text-sm font-semibold tracking-wide text-brand-800 mb-2">
                Location *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPinIcon className="h-5 w-5 text-brand-500" />
                </div>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(locationSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder-brand-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                  placeholder="Enter your location or use GPS"
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-500 hover:text-brand-700 transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-brand-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {locationSuggestions.map((suggestion, index) => {
                      const formatted = formatLocationDisplay(suggestion);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectLocationSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-brand-50 focus:bg-brand-50 focus:outline-none transition-colors duration-200 border-b border-brand-100 last:border-b-0 text-brand-800"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-brand-800 truncate">
                                {formatted.primary}
                              </div>
                              {formatted.secondary && (
                                <div className="text-[11px] text-brand-500 truncate mt-1">
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
              <p className="text-[11px] text-brand-500 mt-2 font-medium tracking-wide">Your location helps us provide location-based features. Use GPS or type to search.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-8 border-t border-brand-200">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3 rounded-xl font-semibold tracking-wide bg-brand-50 text-brand-700 hover:text-brand-800 hover:bg-brand-100 border border-brand-200 transition-all focus:outline-none focus:ring-2 focus:ring-brand-300/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl font-semibold tracking-wide flex items-center justify-center gap-2 text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 hover:from-brand-500 hover:via-brand-500 hover:to-brand-300 disabled:from-brand-600/50 disabled:via-brand-500/50 disabled:to-brand-400/50 disabled:cursor-not-allowed shadow-md ring-1 ring-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-xs md:text-sm font-medium tracking-wide text-brand-600">Your profile information is secure and only used to improve your experience.</p>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPage
