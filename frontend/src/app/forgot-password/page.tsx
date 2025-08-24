'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'
import Snackbar from '@/Components/Snackbar'

type ForgotPasswordFormData = {
  email: string
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({})
  const [isVisible, setIsVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' })

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name as keyof ForgotPasswordFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ForgotPasswordFormData> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      console.log('🔄 Submitting forgot password form...');
      
      // Call the forgot password API
      const result = await authAPI.requestPasswordReset({
        email: formData.email
      })

      console.log('📋 Forgot password result:', result);

      if (result.success) {
        setShowSuccess(true)
        // Store email for next step
        sessionStorage.setItem('reset_email', formData.email)
        // Redirect to OTP verification page after 3 seconds
        setTimeout(() => {
          router.push('/verify-otp')
        }, 3000)
      } else {
        const errorMessage = result.message || 'Failed to send reset email. Please try again.';
        console.error('Forgot password failed:', errorMessage);
        setSnackbar({ open: true, message: errorMessage, type: 'error' })
      }
      
    } catch (error) {
      console.error('❌ Forgot password error:', error)
      setSnackbar({ open: true, message: 'Failed to send reset email. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-600/35 via-brand-500/25 to-brand-400/20 blur-3xl animate-blob" />
          <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/20 to-brand-600/25 blur-3xl animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.18),transparent_65%)]" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="inline-block p-4 rounded-full mb-4 bg-gradient-to-br from-brand-500 via-brand-400 to-brand-300 ring-1 ring-white/30 shadow-lg animate-pulse-slow">
              <svg className="w-12 h-12 text-brand-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22c6.5-2 8-7 8-11V5l-8-3-8 3v6c0 4 1.5 9 8 11z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-3">
              <span className="bg-clip-text text-transparent bg-green-500 animate-gradient bg-[length:200%_200%]">Email Sent</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-wider text-black/45 mb-2">Check Your Inbox</p>
            <p className="text-black/65 text-sm">We've sent an OTP to <span className="font-semibold text-green-900">{formData.email}</span></p>
            <p className="text-xs text-brand-200/70">Redirecting to verification...</p>
            <div className="animate-spin mx-auto w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
        <style jsx>{`
          @keyframes blob { 0% {transform:translate(0,0) scale(1);}33%{transform:translate(30px,-50px) scale(1.1);}66%{transform:translate(-20px,20px) scale(.9);}100%{transform:translate(0,0) scale(1);} }
          @keyframes gradient {0%,100%{background-size:200% 200%;background-position:left center;}50%{background-size:200% 200%;background-position:right center;}}
          @keyframes pulse-slow {0%,100%{opacity:1;}50%{opacity:.85;}}
          .animate-blob {animation: blob 8s ease-in-out infinite;}
          .animate-gradient {animation: gradient 6s ease infinite;}
          .animate-pulse-slow {animation: pulse-slow 2.4s ease-in-out infinite;}
          .animation-delay-2000 {animation-delay:2s;}
          .animation-delay-4000 {animation-delay:4s;}
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
      {/* Decorative brand blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-600/35 via-brand-500/25 to-brand-400/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/20 to-brand-600/25 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.18),transparent_65%)]" />
      </div>

      {/* Back to Login */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 text-brand-200 hover:text-black/30 transition-all duration-300 transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back</span>
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-16 px-2 sm:px-6 lg:px-8">
        <div className={`max-w-md w-full space-y-8 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {/* Header */}
          <div className="text-center transition-all duration-700 delay-200">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-3">
              <span className="bg-clip-text text-transparent bg-green-500 animate-gradient bg-[length:200%_200%]">Forgot Password</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-wider text-black/45 mb-2 animate-fade-in-up">Secure Reset Flow</p>
            <p className="text-black/65 text-sm animate-fade-in-up animation-delay-300">Enter your email to receive an OTP.</p>
          </div>

          {/* Forgot Password Form */}
          <div className="relative bg-white/10 backdrop-blur-xl py-8 px-7 shadow-lg rounded-2xl border border-white/20 ring-1 ring-white/10 hover:ring-brand-400/30 transform transition-all duration-700 delay-400 hover:shadow-3xl hover:scale-[1.02]">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />
            <form className="space-y-6" onSubmit={handleSubmit}>
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
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all duration-300 bg-white/10 backdrop-blur hover:bg-white/20 focus:bg-white/30`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in-down">{errors.email}</p>
                )}
              </div>

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
                      <span className="animate-pulse">Sending OTP...</span>
                    </div>
                  ) : (
                    <span className="flex items-center">
                      Send Reset OTP
                      <svg className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        {/* Paper Airplane (send) icon */}
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2m0 0v-8" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-brand-200/80">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-green-900 hover:text-brand-200 transition-all duration-300 hover:underline inline-block">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} />

      <style jsx>{`
        @keyframes blob {0%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-50px) scale(1.1);}66%{transform:translate(-20px,20px) scale(.9);}100%{transform:translate(0,0) scale(1);}}
        @keyframes gradient {0%,100%{background-size:200% 200%;background-position:left center;}50%{background-size:200% 200%;background-position:right center;}}
        @keyframes fade-in-up {0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes fade-in-down {0%{opacity:0;transform:translateY(-10px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes shake {0%,100%{transform:translateX(0);}10%,30%,50%,70%,90%{transform:translateX(-2px);}20%,40%,60%,80%{transform:translateX(2px);}}
        @keyframes pulse-slow {0%,100%{opacity:1;}50%{opacity:.85;}}
        .animate-blob {animation: blob 8s ease-in-out infinite;}
        .animate-gradient {animation: gradient 6s ease infinite;}
        .animate-fade-in-up {animation: fade-in-up .6s ease-out;}
        .animate-fade-in-down {animation: fade-in-down .3s ease-out;}
        .animate-pulse-slow {animation: pulse-slow 2.4s ease-in-out infinite;}
        .shake {animation: shake .5s ease-in-out;}
        .animation-delay-300 {animation-delay:.3s;}
        .animation-delay-2000 {animation-delay:2s;}
        .animation-delay-4000 {animation-delay:4s;}
        .shadow-3xl {box-shadow:0 35px 60px -12px rgba(0,0,0,0.25);}
      `}</style>
    </div>
  )
}
