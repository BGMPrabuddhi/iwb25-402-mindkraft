'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'
import { 
  UserCircleIcon, 
  CameraIcon, 
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { authAPI, UserProfile } from '@/lib/auth'
import LocationInput from '@/Components/LocationInput'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ'

type LocationData = {
  latitude: number
  longitude: number
  address: string
}

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [googleMapsScriptLoaded, setGoogleMapsScriptLoaded] = useState(false)

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
          
          // Set existing location coordinates if available
          if (profile.locationDetails && 
              profile.locationDetails.latitude !== 0 && 
              profile.locationDetails.longitude !== 0) {
            setLocationData({
              latitude: profile.locationDetails.latitude,
              longitude: profile.locationDetails.longitude,
              address: profile.locationDetails.address
            })
          }
          
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
  }

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }))
    setErrors(prev => ({ ...prev, location: '' }))
  }

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setLocationData({
      latitude: location.lat,
      longitude: location.lng,
      address: location.address
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setErrors({})

    try {
      // Validate required fields
      const newErrors: { [key: string]: string } = {}
      
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required'
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required'
      }
      if (!formData.location.trim()) {
        newErrors.location = 'Location is required'
      }
      // Require valid coordinates (from GPS or Google Places selection)
      if (!locationData || locationData.latitude === 0 || locationData.longitude === 0) {
        newErrors.location = 'Please select a location from the suggestions or use GPS to get your current location'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setMessage({ type: 'error', text: 'Please fill in all required fields correctly' })
        return
      }

      // Prepare the update data (we know locationData is valid at this point)
      if (!locationData) {
        setMessage({ type: 'error', text: 'Location data is missing' })
        return
      }

      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        locationDetails: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address
        },
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
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`}
        onLoad={() => setGoogleMapsScriptLoaded(true)}
        onError={() => console.error('Failed to load Google Maps')}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Update your personal information and preferences</p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XMarkIcon className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </span>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="New profile picture"
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  ) : currentProfileImage ? (
                    <Image
                      src={currentProfileImage}
                      alt="Current profile picture"
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-full w-full text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile picture"
                  aria-label="Change profile picture"
                  className="absolute bottom-0 right-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
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
              <p className="text-sm text-gray-500 text-center">
                Click the camera icon to {currentProfileImage ? 'change' : 'upload'} your profile picture
                <br />
                <span className="text-xs">Maximum file size: 5MB</span>
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Email not available"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address cannot be changed. Contact support if you need to update your email.
              </p>
            </div>

            {/* Location Field */}
            <LocationInput
              label="Location"
              placeholder="Enter your location or use GPS"
              value={formData.location}
              onChange={handleLocationChange}
              onLocationSelect={handleLocationSelect}
              required={true}
              error={errors.location}
              googleMapsScriptLoaded={googleMapsScriptLoaded}
              className="group"
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
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
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your profile information is secure and will only be used to improve your experience.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

export default ProfileEditPage
