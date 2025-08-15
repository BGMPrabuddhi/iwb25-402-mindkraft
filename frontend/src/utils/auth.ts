import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

// Type definitions
interface UserData {
  email: string;
  password: string;
  name?: string;
}

interface Credentials {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

// API base URL
const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth functions
export const auth = {
  // User registration
  register: async (userData: UserData) => {
    try {
      const response = await api.post<AuthResponse>('/signup', userData);
      const { accessToken, user } = response.data;
      
      // Store token and user data
      setToken(accessToken);
      setUser(user);
      
      return { success: true, data: response.data };
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Registration failed' 
        };
      }
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  },

  // User login
  login: async (credentials: Credentials) => {
    try {
      const response = await api.post<AuthResponse>('/login', credentials);
      const { accessToken, user } = response.data;
      
      // Store token and user data
      setToken(accessToken);
      setUser(user);
      
      return { success: true, data: response.data };
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Login failed' 
        };
      }
      return {
        success: false,
        error: 'Login failed'
      };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get<User>('/profile');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Failed to fetch profile' 
        };
      }
      return {
        success: false,
        error: 'Failed to fetch profile'
      };
    }
  },

  // Validate token
  validateToken: async () => {
    try {
      const response = await api.post('/validate-token');
      return { success: true, data: response.data };
    } catch {
      return { success: false, error: 'Token validation failed' };
    }
  },

  // Logout
  logout: () => {
    logout();
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getToken();
  },

  // Get current user
  getCurrentUser: () => {
    return getUser();
  }
};

// Token management
const TOKEN_KEY = 'saferoute_token';
const USER_KEY = 'saferoute_user';

function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 1 }); // 1 day
}

function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser(): User | null {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

function logout(): void {
  Cookies.remove(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export default api;