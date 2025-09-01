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
        async
        defer
        onLoad={() => setGoogleMapsScriptLoaded(true)}
        onError={() => console.error('Failed to load Google Maps')}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <p className="text-brand-800 mt-2 text-sm md:text-base font-medium">Update your personal information and preferences</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="relative rounded-2xl border border-brand-200/70 shadow-lg shadow-brand-900/5 bg-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_70%)]" aria-hidden="true" />
          <form onSubmit={handleSubmit} className="relative z-10 p-8 md:p-10 space-y-8 rounded-2xl bg-white">
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
              <p className="text-xs md:text-sm text-brand-800 text-center font-medium leading-relaxed">
                Click the camera icon to {currentProfileImage ? 'change' : 'upload'} your profile picture<br />
                <span className="text-[11px] tracking-wide uppercase text-brand-800">Max size 5MB</span>
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
              <p className="text-[11px] text-brand-800 mt-2 font-medium tracking-wide">Email address cannot be changed. Contact support if you need to update your email.</p>
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
                className="flex-1 px-6 py-3 rounded-xl font-semibold tracking-wide flex items-center justify-center gap-2 text-black bg-green-500 hover:bg-green-600 disabled:cursor-not-allowed shadow-md ring-1 ring-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400/60"
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
          <p className="text-xs md:text-sm font-medium tracking-wide text-brand-800">Your profile information is secure and only used to improve your experience.</p>
        </div>
      </div>
    </div>
    </>
  )
}

export default ProfileEditPage
