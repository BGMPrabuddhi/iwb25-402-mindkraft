"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/auth';
import { Snackbar, SnackbarStack } from '@/Components/Snackbar';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || (typeof window !== 'undefined' ? sessionStorage.getItem('verification_email') : '') || '';
  const role = searchParams.get('role') || (typeof window !== 'undefined' ? sessionStorage.getItem('user_role') : '') || 'general';

  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; type:'success'|'error'|'info'|'warning'}>({open:false,message:'',type:'info'});
  const showSnackbar = (message:string, type:'success'|'error'|'info'|'warning'='info') => setSnackbar({open:true,message,type});

  useEffect(() => { setIsVisible(true); }, []);

  useEffect(() => {
    if (!email) {
      // No email to verify
      router.push('/');
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await authAPI.verifyEmail({ email, otp });
      if (result.success) {
        sessionStorage.removeItem('verification_email');
        sessionStorage.removeItem('user_role');
        if (result.token) localStorage.setItem('auth_token', result.token);
        if (role === 'rda') {
          showSnackbar('Email verified successfully! Redirecting to RDA Dashboard.', 'success');
          setTimeout(() => router.push('/rda-dashboard'), 800);
        } else {
          showSnackbar('Email verified successfully!', 'success');
          setTimeout(() => router.push('/home'), 800);
        }
      } else {
        setErrorMessage(result.message || 'Invalid verification code. Please try again.');
      }
    } catch (err) {
      console.error('Email verification error:', err);
      setErrorMessage('Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || !email) return;
    setIsLoading(true);
    try {
      const result = await authAPI.sendEmailVerification({ email });
      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        setErrorMessage('');
        showSnackbar('Verification code resent!', 'success');
      } else {
        setErrorMessage(result.message || 'Failed to resend verification code');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setErrorMessage('Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(sanitized);
    if (errorMessage) setErrorMessage('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
      {/* Decorative blobs to match auth pages */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-600/35 via-brand-500/25 to-brand-400/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/20 to-brand-600/25 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.18),transparent_65%)]" />
      </div>

      {/* Back */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href={role === 'rda' ? '/sign-up' : '/'}
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
              <span className="bg-clip-text text-transparent bg-green-500 animate-gradient bg-[length:200%_200%]">Verify Email</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-wider text-black/45 mb-2 animate-fade-in-up">Secure Your Account</p>
            <p className="text-black/65 text-sm animate-fade-in-up animation-delay-300">Enter the 6-digit code we sent to <span className="font-semibold">{email}</span>.</p>
            {role === 'rda' && (
              <p className="mt-2 text-xs text-brand-200/70 animate-fade-in-up animation-delay-300">RDA account verification required for dashboard access.</p>
            )}
          </div>

          {/* Verification Card */}
          <div className="relative bg-white/10 backdrop-blur-xl py-8 px-7 shadow-lg rounded-2xl border border-white/20 ring-1 ring-white/10 hover:ring-brand-400/30 transform transition-all duration-700 delay-400 hover:shadow-3xl hover:scale-[1.02]">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />
            <form className="space-y-6" onSubmit={handleVerify}>
              {/* OTP Input */}
              <div className="group">
                <label htmlFor="otp" className="block text-sm font-medium text-brand-100 mb-2 transition-all duration-300 group-focus-within:text-green-900">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-brand-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 .552-.448 1-1 1s-1-.448-1-1 .448-1 1-1 1 .448 1 1z M19 11c0 .552-.448 1-1 1s-1-.448-1-1 .448-1 1-1 1 .448 1 1z M9 11H5m14 0h-4" />
                    </svg>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    className={`tracking-widest text-center font-mono text-lg appearance-none block w-full pl-10 pr-3 py-3 border ${
                      errorMessage ? 'border-red-400 shake' : 'border-gray-300'
                    } rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-300 bg-white/70 backdrop-blur hover:bg-white focus:bg-white`}
                    placeholder="••••••"
                    maxLength={6}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Enter the 6-digit code (numbers only).</p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-400/40 animate-fade-in-down">
                  <p className="text-sm text-red-300 text-center">{errorMessage}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-lg text-sm font-semibold text-brand-900 transition-all duration-300 transform ${
                    isLoading || otp.length !== 6
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
                      Verify Email
                      <svg className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || isLoading}
                  className={`text-sm font-medium transition-colors duration-300 ${
                    canResend && !isLoading
                      ? 'text-green-700 hover:text-green-500 underline underline-offset-2'
                      : 'text-gray-400'
                  }`}
                >
                  {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="text-xs text-gray-500">
                  Entering the wrong email?{' '}
                  <Link href="/sign-up" className="text-green-700 hover:underline">Register again</Link>
                </p>
              </div>
            </form>

            {/* Back to login */}
            <div className="mt-7 text-center">
              <p className="text-sm text-brand-200/80">
                Remember your credentials?{' '}
                <Link href="/login" className="font-medium text-green-900 hover:text-brand-200 transition-all duration-300 hover:underline inline-block">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        @keyframes gradient { 0%, 100% { background-size: 200% 200%; background-position: left center; } 50% { background-size: 200% 200%; background-position: right center; } }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in-down { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); } 20%, 40%, 60%, 80% { transform: translateX(2px); } }
        .animate-blob { animation: blob 8s ease-in-out infinite; }
        .animate-gradient { animation: gradient 6s ease infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out; }
        .shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .shadow-3xl { box-shadow: 0 35px 60px -12px rgba(0,0,0,0.25); }
      `}</style>

      <SnackbarStack>
        <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev => ({...prev, open:false}))} />
      </SnackbarStack>
    </div>
  );
}