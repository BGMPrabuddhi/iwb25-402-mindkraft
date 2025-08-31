// /src/lib/auth.ts
const API_BASE = '/api/auth';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  location: string;
  userRole: string;
  locationDetails: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserProfile {
  success: boolean;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userRole: string;
  location: string;
  locationDetails: {
    latitude: number;
    longitude: number;
    address: string;
  };
  createdAt?: string;
  profileImage?: string;
}

export interface HomeResponse {
  success: boolean;
  totalReports: number;
  activeAlerts: number;
  resolvedHazards: number;
  communityMembers: number;
}

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  locationDetails: {
    latitude: number;
    longitude: number;
    address: string;
  };
  profileImage?: string;
}

export const authAPI = {
  register: async (data: RegisterData) => {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  login: async (data: LoginData) => {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    // Store token if login successful
    if (result.success && result.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', result.token);
      }
    }
    
    return result;
  },

  getProfile: async (): Promise<UserProfile> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    const response = await fetch('/api/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    return response.json();
  },

  getHome: async (): Promise<HomeResponse> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    const response = await fetch('/api/home', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    return response.json();
  },

  updateProfile: async (data: UpdateProfileData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    const response = await fetch('/api/me', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('auth_token');
    return !!token;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  },

  sendEmailVerification: async (data: { email: string }) => {
    const response = await fetch(`${API_BASE}/send-email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  verifyEmail: async (data: { email: string; otp: string }) => {
    const response = await fetch(`${API_BASE}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  forgotPassword: async (data: { email: string }) => {
    const response = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  resetPassword: async (data: { resetToken: string; newPassword: string; confirmPassword: string }) => {
    const response = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};