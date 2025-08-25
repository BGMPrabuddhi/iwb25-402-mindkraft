'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'
import Snackbar from '@/Components/Snackbar'

export default function VerifyOtpPage() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' })
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setIsVisible(true)
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('reset_email')
    if (!storedEmail) {
      router.push('/forgot-password')
      return
    }
    setEmail(storedEmail)

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    const newOtp = pastedData.split('').map((char, index) => 
      index < 6 ? char : ''
    )
    while (newOtp.length < 6) {
      newOtp.push('')
    }
    setOtp(newOtp)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      console.log('🔄 Submitting OTP verification...');
      
      // Call the verify OTP API
      const result = await authAPI.verifyOtp({
        email: email,
        otp: otpString
      })

      console.log('📋 OTP verification result:', result);

      if (result.success && result.resetToken) {
        // Store reset token for next step
        sessionStorage.setItem('reset_token', result.resetToken)
        setSnackbar({ open: true, message: 'OTP verified successfully!', type: 'success' })
        setTimeout(() => router.push('/reset-password'), 1000)
      } else {
        const errorMessage = result.message || 'Invalid OTP. Please try again.';
        console.error('OTP verification failed:', errorMessage);
        setError(errorMessage);
      }
      
    } catch (error) {
      console.error('❌ OTP verification error:', error)
      setError('Failed to verify OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setResendLoading(true)
    setError('')
    
    try {
      const result = await authAPI.requestPasswordReset({ email })
      
      if (result.success) {
        setSnackbar({ open: true, message: 'New OTP sent to your email!', type: 'success' })
        setOtp(['', '', '', '', '', ''])
        setCountdown(60)
        setCanResend(false)
        
        // Restart countdown
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setCanResend(true)
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(result.message || 'Failed to resend OTP')
      }
    } catch (error) {
      console.error('❌ Resend OTP error:', error)
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
      {/* Decorative brand blobs (consistent with auth pages) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-600/35 via-brand-500/25 to-brand-400/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/20 to-brand-600/25 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.18),transparent_65%)]" />
      </div>

      {/* Back to Forgot Password */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/forgot-password"
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
              <span className="bg-clip-text text-transparent bg-green-500 animate-gradient bg-[length:200%_200%]">Verify OTP</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-wider text-black/45 mb-2 animate-fade-in-up">Secure Verification</p>
            <p className="text-black/65 text-sm animate-fade-in-up animation-delay-300">
              Enter the 6-digit code sent to <span className="font-semibold text-green-900">{email}</span>
            </p>
          </div>

          {/* OTP Verification Form */}
          <div className="relative bg-white/10 backdrop-blur-xl py-8 px-7 shadow-lg rounded-2xl border border-white/20 ring-1 ring-white/10 hover:ring-brand-400/30 transform transition-all duration-700 delay-400 hover:shadow-3xl hover:scale-[1.02]">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* OTP Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-brand-100 text-center">
                  Enter OTP Code
                </label>
                <div className="flex justify-center space-x-3" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-12 h-12 text-center text-lg font-semibold rounded-xl border transition-all duration-300 ${
                        error
                          ? 'border-red-400 shake bg-red-500/10'
                          : 'border-gray-300 bg-white/10 backdrop-blur hover:bg-white/20 focus:bg-white/30 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40'
                      } text-white placeholder-white/40`}
                    />
                  ))}
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-500 text-center animate-fade-in-down">{error}</p>
                )}
              </div>

              {/* Countdown and Resend */}
              <div className="text-center">
                {!canResend ? (
                  <p className="text-sm text-brand-200/80">
                    Resend OTP in <span className="font-semibold text-green-900">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-sm font-medium text-green-900 hover:text-brand-200 transition-all duration-300 hover:underline inline-block disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-lg text-sm font-semibold text-brand-900 transition-all duration-300 transform ${
                    isLoading || otp.join('').length !== 6
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
                      <span className="animate-pulse">Verifying...</span>
                    </div>
                  ) : (
                    <span className="flex items-center">
                      Verify OTP
                      <svg className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-brand-200/80">
                Didn't receive the code? Check your spam folder or try resending.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} />

      <style jsx>{`
        @keyframes blob { 0% {transform:translate(0,0) scale(1);}33%{transform:translate(30px,-50px) scale(1.1);}66%{transform:translate(-20px,20px) scale(.9);}100%{transform:translate(0,0) scale(1);} }
        @keyframes gradient {0%,100%{background-size:200% 200%;background-position:left center;}50%{background-size:200% 200%;background-position:right center;}}
        @keyframes fade-in-up {0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes fade-in-down {0%{opacity:0;transform:translateY(-10px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes shake {0%,100%{transform:translateX(0);}10%,30%,50%,70%,90%{transform:translateX(-2px);}20%,40%,60%,80%{transform:translateX(2px);} }
        @keyframes pulse-slow {0%,100%{opacity:1;}50%{opacity:.85;}}
        .animate-blob {animation: blob 8s ease-in-out infinite;}
        .animate-gradient {animation: gradient 6s ease infinite;}
        .animate-fade-in-up {animation: fade-in-up .6s ease-out;}
        .animate-fade-in-down {animation: fade-in-down .3s ease-out;}
        .shake {animation: shake .5s ease-in-out;}
        .animation-delay-300 {animation-delay:.3s;}
        .animation-delay-2000 {animation-delay:2s;}
        .animation-delay-4000 {animation-delay:4s;}
        .shadow-3xl { box-shadow: 0 35px 60px -12px rgba(0,0,0,0.25); }
      `}</style>
    </div>
  )
}
