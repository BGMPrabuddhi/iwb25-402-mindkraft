"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/auth';
import Button from '@/Components/button';
import InputField from '@/Components/input_feild';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || sessionStorage.getItem('verification_email') || '';
  
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Check if we have the email in sessionStorage
    if (!email && typeof window !== 'undefined') {
      const storedEmail = sessionStorage.getItem('verification_email');
      if (!storedEmail) {
        // No email to verify, redirect to home
        router.push('/home');
      }
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleVerify = async () => {
    if (!otp) {
      setErrorMessage("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await authAPI.verifyEmail({
        email,
        otp
      });
      
      if (result.success) {
        // Clear the email from session storage
        sessionStorage.removeItem('verification_email');
        
        // Redirect to login page with verified parameter
        router.push('/login?verified=true');
      } else {
        setErrorMessage(result.message || "Invalid verification code. Please try again.");
      }
    } catch (error) {
      setErrorMessage("Failed to verify email. Please try again.");
      console.error("Email verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      const result = await authAPI.sendEmailVerification({
        email
      });
      
      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        setErrorMessage('');
      } else {
        setErrorMessage(result.message || "Failed to resend verification code");
      }
    } catch (error) {
      setErrorMessage("Failed to resend verification code");
      console.error("Resend OTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Verify Your Email</h1>
        <p className="text-gray-600 text-center mb-6">
          We've sent a verification code to <strong>{email}</strong>
        </p>

        <div className="mb-6">
          <InputField
            label="Verification Code"
            name="otp"
            placeholder="Enter verification code"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>

        {errorMessage && (
          <div className="mb-4 text-red-500 text-sm text-center">{errorMessage}</div>
        )}

        <Button
          onClick={handleVerify}
          disabled={isLoading}
          className="w-full mb-4"
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResendOtp}
            disabled={!canResend || isLoading}
            className={`text-sm ${canResend ? 'text-blue-600 hover:underline' : 'text-gray-400'}`}
          >
            {canResend ? 'Resend Code' : `Resend code in ${countdown}s`}
          </button>
        </div>
      </div>
    </div>
  );
}
