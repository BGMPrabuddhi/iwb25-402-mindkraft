'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { authAPI } from '@/lib/auth'
import LocationInput from '@/Components/LocationInput'

type SignupFormData = {
  firstName: string
  lastName: string
  contactNumber: string
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
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    contactNumber: '',
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
  const [googleMapsScriptLoaded, setGoogleMapsScriptLoaded] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    if (apiError) {
      setApiError('')
    }
  }

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }))
    
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }))
    }
  }

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setLocationData({
      latitude: location.lat,
      longitude: location.lng,
      address: location.address
    })
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

    if (formData.userRole === 'general') {
      if (!formData.contactNumber.trim()) {
        newErrors.contactNumber = 'Contact number is required'
      } else if (!/^([0-9+\-() ]{7,20})$/.test(formData.contactNumber.trim())) {
        newErrors.contactNumber = 'Invalid contact number format'
      }
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
    } else if (!locationData || locationData.latitude === 0 || locationData.longitude === 0) {
      newErrors.location = 'Please select a location from the suggestions or use GPS to get your current location'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!validateForm()) return

  setIsLoading(true)
  setApiError('')
  
  try {
    if (!locationData) {
      setApiError('Location data is missing. Please select a location from suggestions or use GPS.')
      setIsLoading(false)
      return
    }

    const result = await authAPI.register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactNumber: formData.contactNumber,
      email: formData.email,
      password: formData.password,
      location: formData.location,
      userRole: formData.userRole,
      locationDetails: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address
      }
    })

    if (result.success) {
      // Store email for verification for both RDA and general users
      sessionStorage.setItem('verification_email', formData.email)
      sessionStorage.setItem('user_role', formData.userRole) // Store user role for redirect logic
      
      if (formData.userRole === 'rda') {
        alert('RDA account created successfully! Please check your email to verify your account before accessing the RDA Dashboard.')
      } else {
        alert('Account created successfully! Please check your email to verify your account.')
      }
      
      // Both user types go to email verification first
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&role=${formData.userRole}`)
    } else {
      const errorMessage = result.message || 'Registration failed. Please try again.'
      setApiError(errorMessage)
    }
  } catch (error) {
    console.error('Signup error:', error)
    setApiError('Registration failed. Please check your credentials and try again.')
  } finally {
    setIsLoading(false)
  }
}
  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`}
        onLoad={() => setGoogleMapsScriptLoaded(true)}
        onError={() => console.error('Failed to load Google Maps')}
      />
      
      <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
        {/* Decorative brand blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-600/35 via-brand-500/25 to-brand-400/20 blur-3xl animate-blob" />
          <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/20 to-brand-600/25 blur-3xl animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.18),transparent_65%)]" />
        </div>

        {/* Back to Home */}
        <div className="absolute top-6 left-6 z-20">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-brand-200 hover:text-black/30 transition-all duration-300 transform hover:scale-105"
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
            <div className="text-center transition-all duration-700 delay-200">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-3">
                <span className="bg-clip-text text-transparent bg-green-500 animate-gradient bg-[length:200%_200%]">Create Account</span>
              </h1>
              <p className="text-sm font-medium uppercase tracking-wider text-black/45 mb-2 animate-fade-in-up">Join the SafeRoute Community</p>
              <p className="text-brand-100/80 text-sm animate-fade-in-up text-black/65 animation-delay-300">Report hazards, get alerts & travel smarter.</p>
            </div>
            
            {/* Sign Up Form */}
            <div className="relative bg-white/10 backdrop-blur-xl py-8 px-7 shadow-lg rounded-2xl border border-white/20 ring-1 ring-white/10 hover:ring-brand-400/30 transform transition-all duration-700 delay-400 hover:shadow-3xl hover:scale-[1.02]">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label htmlFor="firstName" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
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
                      errors.firstName ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur hover:bg-white/70 focus:bg-white`}
                    placeholder="First name"
                  />
                    {errors.firstName && (
                      <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div className="group">
                    <label htmlFor="lastName" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
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
                      errors.lastName ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur hover:bg-white/70 focus:bg-white`}
                    placeholder="Last name"
                  />
                    {errors.lastName && (
                      <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                {/* Email Field */}
                <div className="group">
                  <label htmlFor="email" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-500 group-focus-within:text-brand-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      errors.email ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all duration-300 bg-white/60 backdrop-blur hover:bg-white/80 focus:bg-white`}
                    placeholder="Enter your email"
                  />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.email}</p>
                  )}
                </div>


                {/* User Role Selection Field */}
                <div className="group">
                  <label htmlFor="userRole" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                    User Role
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-500 group-focus-within:text-brand-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <select
                      id="userRole"
                      name="userRole"
                      value={formData.userRole}
                      onChange={handleChange}
                      className="appearance-none block w-full pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/70 text-gray-900 hover:bg-white focus:bg-white"
                    >
                      <option value="general">General User</option>
                      <option value="rda">RDA Officer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formData.userRole === 'rda' ? 
                      'RDA Officer registration requires specific credentials. Please ensure you have the correct details.' :
                      'Select your role: General User for reporting hazards or RDA Officer for resolving road issues.'
                    }
                  </p>
                </div>

                {/* Contact Number Field (only for general users) */}
                {formData.userRole === 'general' && (
                  <div className="group">
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                      Contact Number
                    </label>
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      type="text"
                      autoComplete="tel"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-3 border ${errors.contactNumber ? 'border-red-400 shake' : 'border-gray-300'} rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent sm:text-sm transition-all duration-300 bg-white/50 backdrop-blur hover:bg-white/70 focus:bg-white`}
                      placeholder="Enter your contact number"
                      required
                    />
                    {errors.contactNumber && (
                      <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.contactNumber}</p>
                    )}
                  </div>
                )}

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

                {/* Password Field */}
                <div className="group">
                  <label htmlFor="password" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-500 group-focus-within:text-brand-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      errors.password ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all duration-300 bg-white/70 backdrop-blur hover:bg-white focus:bg-white`}
                    placeholder="Create a strong password"
                  />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.password}</p>
                  )}
                  <p className="mt-2 text-xs text-brand-200/70">
                    Must be at least 6 characters
                  </p>
                </div>
                
                {/* Confirm Password Field */}
                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                    Confirm password
                  </label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-500 group-focus-within:text-brand-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      errors.confirmPassword ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all duration-300 bg-white/70 backdrop-blur hover:bg-white focus:bg-white`}
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
                    className="h-4 w-4 text-green-700 focus:ring-brand-400 border-white/30 bg-white/10 rounded transition-all duration-300 hover:scale-110"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-black">
                    I agree to the{' '}
                    <a href="#" className="text-green-700 hover:text-green-500 font-medium transition-colors duration-200 underline-offset-2 hover:underline">
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-green-700 hover:text-green-500 font-medium transition-colors duration-200 underline-offset-2 hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                     className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-lg text-sm font-semibold text-brand-900 transition-all duration-300 transform ${
                    isLoading
                      ? 'bg-brand-500/60 cursor-not-allowed scale-95'
                      : 'bg-gradient-to-r from-brand-500 via-brand-400 to-brand-300 hover:from-brand-400 hover:via-brand-300 hover:to-brand-200 hover:scale-[1.03] hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/40 active:scale-95'
                  }`}
                >
                    {isLoading ? (
                      <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-400/40">
                  <p className="text-sm text-red-300">{apiError}</p>
                  </div>
                )}
              </form>

              {/* Login Link */}
              <div className="mt-7 text-center">
                <p className="text-sm text-brand-200/80">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-green-900 hover:text-brand-200 transition-all duration-300 hover:underline inline-block">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>

            {/* (features row moved below) */}
          </div> {/* end max-w-md wrapper */}
        </div> {/* end centered flex container */}

        {/* Full-width Features Row */}
        <div className="relative z-10 w-full pb-12 sm:pb-14 md:pb-20 px-2 sm:px-6 lg:px-10 xl:px-16 mt-4">
          <div className="w-full">
            <p className="text-center text-[10px] sm:text-xs font-semibold tracking-wider text-brand-200/60 mb-6 sm:mb-8 uppercase">
              Why Choose SafeRoute
            </p>
            <div className="grid grid-cols-3 w-full gap-2 sm:gap-4 md:gap-8">
              {/* Secure */}
              <div className="group relative flex-1 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5 sm:p-4 md:p-6 flex items-start gap-2.5 sm:gap-3 md:gap-4 hover:border-brand-400/40 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex items-center justify-center rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white shadow ring-1 ring-white/20 group-hover:scale-105 transition-transform text-[11px]">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22c6.5-2 8-7 8-11V5l-8-3-8 3v6c0 4 1.5 9 8 11z" />
                  </svg>
                  <span className="absolute -inset-1 rounded-xl bg-brand-400/0 group-hover:bg-brand-400/15 blur-sm transition" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-[11px] md:text-base font-semibold text-brand-100 group-hover:text-black/55 transition-colors leading-snug">Secure</h4>
                  <p className="text-[8px] sm:text-[9px] md:text-xs leading-snug md:leading-relaxed text-brand-200/65 mt-1">Encrypted data & protected accounts.</p>
                </div>
              </div>
              {/* Fast */}
              <div className="group relative flex-1 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5 sm:p-4 md:p-6 flex items-start gap-2.5 sm:gap-3 md:gap-4 hover:border-brand-400/40 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex items-center justify-center rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-brand-500 via-brand-400 to-brand-300 text-brand-900 shadow ring-1 ring-white/20 group-hover:scale-105 transition-transform text-[11px]">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="absolute -inset-1 rounded-xl bg-brand-300/0 group-hover:bg-brand-300/25 blur-sm transition" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-[11px] md:text-base font-semibold text-brand-100 group-hover:text-black/55transition-colors leading-snug">Fast</h4>
                  <p className="text-[8px] sm:text-[9px] md:text-xs leading-snug md:leading-relaxed text-brand-200/65 mt-1">Quick signup & real-time alerts.</p>
                </div>
              </div>
              {/* User Friendly */}
              <div className="group relative flex-1 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5 sm:p-4 md:p-6 flex items-start gap-2.5 sm:gap-3 md:gap-4 hover:border-brand-400/40 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex items-center justify-center rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-300 text-brand-900 shadow ring-1 ring-white/20 group-hover:scale-105 transition-transform text-[11px]">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                  <span className="absolute -inset-1 rounded-xl bg-brand-400/0 group-hover:bg-brand-400/15 blur-sm transition" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-[11px] md:text-base font-semibold text-brand-100 group-hover:text-black/55 transition-colors leading-snug">User Friendly</h4>
                  <p className="text-[8px] sm:text-[9px] md:text-xs leading-snug md:leading-relaxed text-brand-200/65 mt-1">Intuitive & responsive design.</p>
                </div>
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
          
          .animate-blob { animation: blob 8s ease-in-out infinite; }
          .animate-float { animation: float 3.8s ease-in-out infinite; }
          .animate-gradient { animation: gradient 6s ease infinite; }
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
      </div> {/* end min-h-screen */}
    </>  
  )
}