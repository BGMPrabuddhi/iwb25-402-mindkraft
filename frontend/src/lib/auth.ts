// lib/auth.ts
import axios, { AxiosResponse } from 'axios';

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 seconds timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Types matching your Ballerina backend
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  locationDetails: {
    latitude: number;
    longitude: number;
    address: string;
  };
  userRole: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  message: string;
  errorCode?: string;
}

export interface UserProfile {
  success: boolean;
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  userRole?: string;
  location?: string;
  locationDetails?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  profileImage?: string;
  createdAt?: string;
  message?: string;
  errorCode?: string;
}

// Password Recovery Types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  errorCode?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  errorCode?: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  errorCode?: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  locationDetails: {
    latitude: number;
    longitude: number;
    address: string;
  };
  profileImage?: string; // Base64 encoded image - optional
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  errorCode?: string;
}

export interface HomeResponse {
  success: boolean;
  message?: string;
  user?: string;
  timestamp?: string;
  errorCode?: string;
  // Optional statistics (added for dashboard quick stats)
  totalReports?: number;
  activeAlerts?: number;
  communityMembers?: number;
  resolvedHazards?: number;
}

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const TOKEN_COOKIE_NAME = 'auth_token';
const TOKEN_TYPE_COOKIE_NAME = 'token_type';

// API Client class
export class AuthAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Register new user
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting registration...', { email: data.email });
      
      // Use Next.js API proxy to avoid CORS issues
      const response: AxiosResponse = await axios.post('/api/auth/register', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Registration response:', response.data);
      const result = response.data;
      
      if (result.success && result.token) {
        this.setAuthToken(result.token, result.tokenType, result.expiresIn);
        console.log('🔐 Token saved successfully');
      }

      return result;
    } catch (error: unknown) {
      console.error('❌ Registration error:', error);
      
      if (axios.isAxiosError(error)) {
        console.log('📊 Error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
        
        if (error.response?.data) {
          return error.response.data;
        }
      }
      
      return {
        success: false,
        message: 'Network error occurred during registration. Please try again.',
        errorCode: 'network_error'
      };
    }
  }

  // Login user
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting login...', { email: data.email });
      
      // Use Next.js API proxy to avoid CORS issues
      const response: AxiosResponse = await axios.post('/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Login response:', response.data);
      const result = response.data;
      
      if (result.success && result.token) {
        this.setAuthToken(result.token, result.tokenType, result.expiresIn);
        console.log('🔐 Token saved successfully');
      }

      return result;
    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      
      if (axios.isAxiosError(error)) {
        console.log('📊 Error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
        
        if (error.response?.data) {
          return error.response.data;
        }
      }
      
      return {
        success: false,
        message: 'Network error occurred during login. Please try again.',
        errorCode: 'network_error'
      };
    }
  }

  // Get user profile
  async getProfile(): Promise<UserProfile> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
          errorCode: 'no_token'
        };
      }

      console.log('🔄 Fetching user profile...');

      // Use Next.js API proxy to avoid CORS issues
      const response: AxiosResponse = await axios.get('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('✅ Profile response:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Profile fetch error:', error);
      
      // Handle axios error responses
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Network error occurred while fetching profile',
        errorCode: 'network_error'
      };
    }
  }

  // Update user profile
  async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
          errorCode: 'no_token'
        };
      }

      console.log('🔄 Updating user profile...');

      // Use the same endpoint as getProfile but with PUT method
      const response: AxiosResponse = await axios.put('/api/me', data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Profile update response:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Profile update error:', error);
      
      // Handle axios error responses
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Network error occurred while updating profile',
        errorCode: 'network_error'
      };
    }
  }

  // Get home page data
  async getHome(): Promise<HomeResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
          errorCode: 'no_token'
        };
      }

      console.log('🔄 Fetching home data...');

      // Use Next.js API proxy to avoid CORS issues
      const response: AxiosResponse = await axios.get('/api/home', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('✅ Home response:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Home fetch error:', error);
      
      // Handle axios error responses
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Network error occurred while fetching home data',
        errorCode: 'network_error'
      };
    }
  }

  // Logout user
  logout(): void {
    this.clearAuthToken();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Get stored auth token
  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      // Client-side
      return localStorage.getItem(TOKEN_COOKIE_NAME);
    }
    return null;
  }

  // Password Recovery Methods
  
  // Request password reset OTP
  async requestPasswordReset(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    try {
      console.log('🔄 Requesting password reset...', { email: data.email });
      
      const response: AxiosResponse = await axios.post('/api/auth/forgot-password', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Password reset request response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('❌ Password reset request error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          return axiosError.response.data as ForgotPasswordResponse;
        }
      }
      
      return {
        success: false,
        message: 'Network error occurred during password reset request',
        errorCode: 'network_error'
      };
    }
  }

  // Verify OTP for password reset
  async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    try {
      console.log('🔄 Verifying OTP...', { email: data.email, otp: '***' });
      
      const response: AxiosResponse = await axios.post('/api/auth/verify-otp', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ OTP verification response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('❌ OTP verification error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          return axiosError.response.data as VerifyOtpResponse;
        }
      }
      
      return {
        success: false,
        message: 'Network error occurred during OTP verification',
        errorCode: 'network_error'
      };
    }
  }

  // Reset password with new password
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    try {
      console.log('🔄 Resetting password...');
      
      const response: AxiosResponse = await axios.post('/api/auth/reset-password', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Password reset response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('❌ Password reset error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          return axiosError.response.data as ResetPasswordResponse;
        }
      }
      
      return {
        success: false,
        message: 'Network error occurred during password reset',
        errorCode: 'network_error'
      };
    }
  }

  // Set auth token in storage
  private setAuthToken(token: string, tokenType: string = 'Bearer', expiresIn: number = 3600): void {
    if (typeof window !== 'undefined') {
      // Client-side storage
      localStorage.setItem(TOKEN_COOKIE_NAME, token);
      localStorage.setItem(TOKEN_TYPE_COOKIE_NAME, tokenType);
      
      // Set expiry time for reference
      const expiryDate = new Date(Date.now() + expiresIn * 1000);
      localStorage.setItem(`${TOKEN_COOKIE_NAME}_expiry`, expiryDate.toISOString());
    }
  }

  // Clear auth token from storage
  private clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_COOKIE_NAME);
      localStorage.removeItem(TOKEN_TYPE_COOKIE_NAME);
      localStorage.removeItem(`${TOKEN_COOKIE_NAME}_expiry`);
    }
  }
}

// Default instance
export const authAPI = new AuthAPI();

// Higher-order function for protected API calls
export async function withAuth<T>(
  apiCall: (token: string) => Promise<T>
): Promise<T | { success: false; message: string; errorCode: string }> {
  const token = authAPI.getAuthToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Authentication required',
      errorCode: 'no_token'
    };
  }

  try {
    return await apiCall(token);
  } catch (error: unknown) {
    console.error('Protected API call failed:', error);
    return {
      success: false,
      message: 'Network error occurred',
      errorCode: 'network_error'
    };
  }
}

// Auth context helpers for React components
export const useAuth = () => {
  return {
    isAuthenticated: authAPI.isAuthenticated(),
    login: authAPI.login.bind(authAPI),
    register: authAPI.register.bind(authAPI),
    logout: authAPI.logout.bind(authAPI),
    getProfile: authAPI.getProfile.bind(authAPI),
    getHome: authAPI.getHome.bind(authAPI),
    updateProfile: authAPI.updateProfile.bind(authAPI),
  };
};

// Helper function to check if token is expired
export const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const expiryString = localStorage.getItem(`${TOKEN_COOKIE_NAME}_expiry`);
  if (!expiryString) return true;
  
  const expiry = new Date(expiryString);
  return expiry <= new Date();
};