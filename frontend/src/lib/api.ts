// Fetch any user's profile by user ID (for RDA dashboard)
export interface UserProfileDetails {
  id: number;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  profileImage?: string;
  location?: string;
  locationDetails?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}

export async function fetchUserProfileById(userId: number): Promise<UserProfileDetails> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const response = await fetch(`/api/user/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch user profile');
  return data.user;
}
// lib/api.ts

export interface HazardReportData {
  title: string;
  description?: string;
  hazard_type: 'accident' | 'pothole' | 'construction' | 'flooding' | 'debris' | 'traffic_jam' | 'road_closure' | 'other';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  images?: File[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface ImageMetadata {
  filename: string;
  originalName: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface HazardReport {
  id: number;
  title: string;
  description?: string;
  hazard_type: 'accident' | 'pothole' | 'construction' | 'flooding' | 'debris' | 'traffic_jam' | 'road_closure' | 'other';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'pending' | 'archived';
  created_at: string;
  updated_at: string;
  images?: string[];
  image_metadata?: ImageMetadata[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  user_id?: number;
  distance_km?: number;
  // Newly added reporter meta
  reporter_first_name?: string;
  reporter_last_name?: string;
  reporter_profile_image?: string;
}

export interface ReportComment {
  id: number;
  report_id: number;
  user_id: number;
  comment_text: string;
  created_at: string;
  updated_at: string;
  commenter_first_name: string;
  commenter_last_name: string;
  commenter_profile_image?: string;
}

export interface LikeStats {
  report_id: number;
  total_likes: number;
  total_unlikes: number;
  user_liked: boolean;
  user_unliked: boolean;
}

export interface LikeResponse {
  success: boolean;
  message: string;
  data: LikeStats;
}

export interface ApiResponse {
  message: string;
  data?: HazardReport;
  report_id?: number;
  timestamp?: string;
  images_uploaded?: number;
  image_urls?: string[];
}

export interface HazardReportsListResponse {
  reports: HazardReport[];
  total_count: number;
  page: number;
  page_size: number;
  timestamp?: string;
  filters_applied?: {
    hazard_type?: string;
    severity?: string;
    status?: string;
  };
  pagination?: {
    current_page: number;
    page_size: number;
    has_more: boolean;
  };
}

export interface CommentsResponse {
  success: boolean;
  comments: ReportComment[];
  total_count: number;
  report_id: number;
}

export interface AddCommentResponse {
  success: boolean;
  message: string;
  comment: ReportComment;
}

export interface DeleteCommentResponse {
  success: boolean;
  message: string;
}

export interface ValidationErrorResponse {
  message: string;
  errors: string[];
  timestamp: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  java_version: string;
  timestamp: string;
  database_status: string;
  upload_directory?: string;
  endpoints?: Record<string, string>;
}

class ReportsAPI {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  }

private getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Only check 'auth_token' to match your auth system
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('No auth token found in localStorage');
    return null;
  }
  
  console.log('Token found, length:', token.length);
  return token;
}

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 400) {
        const validationError = data as ValidationErrorResponse;
        throw new Error(`Validation failed: ${validationError.errors.join(', ')}`);
      }
      if (response.status === 401) {
        throw new Error(data.message || 'Authentication required. Please log in.');
      }
      if (response.status === 403) {
        throw new Error(data.message || 'Access denied.');
      }
      if (response.status === 404) {
        throw new Error(data.message || 'Resource not found');
      }
      if (response.status >= 500) {
        throw new Error(data.message || 'Internal server error');
      }
      throw new Error(data.message || `HTTP ${response.status}: Request failed`);
    }
    return data as T;
  }

  // Submit a new hazard report (with optional images and location)
  async submitReport(reportData: HazardReportData): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      // If no images, use JSON
      if (!reportData.images || reportData.images.length === 0) {
        const response = await fetch(`${this.baseUrl}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(reportData),
        });
        return await this.handleResponse<ApiResponse>(response);
      }

      // If images exist, use FormData and send location fields separately
      const formData = new FormData();
      formData.append('title', reportData.title);
      formData.append('hazard_type', reportData.hazard_type);
      formData.append('severity_level', reportData.severity_level);
      if (reportData.description) {
        formData.append('description', reportData.description);
      }
      // Add location fields if present
      if (reportData.location) {
        formData.append('latitude', reportData.location.lat.toString());
        formData.append('longitude', reportData.location.lng.toString());
        if (reportData.location.address) {
          formData.append('address', reportData.location.address);
        }
      }
      // Append all images
      reportData.images.forEach((image) => {
        formData.append('images', image, image.name);
      });

      const response = await fetch(`${this.baseUrl}/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData, // No Content-Type header - browser will set it with boundary
      });

      return await this.handleResponse<ApiResponse>(response);
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  getImageUrl(filename: string): string {
    const url = `${this.baseUrl}/images/${filename}`;
    console.log(`getImageUrl called with filename: "${filename}" -> URL: "${url}"`);
    return url;
  }

  async getProfileImageUrl(profileImage: string | null): Promise<string | null> {
    console.log('🔗 getProfileImageUrl called with:', profileImage);
    
    if (!profileImage) {
      console.log('🔗 profileImage is null/empty, returning null');
      return null;
    }
    
    // If it's already a base64 data URL, return it directly
    if (profileImage.startsWith('data:image')) {
      console.log('🔗 profileImage is base64, returning directly');
      return profileImage;
    }
    
    // If it looks like a filename, use the regular image URL
    if (!profileImage.includes('/') && profileImage.includes('.')) {
      const imageUrl = this.getImageUrl(profileImage);
      console.log('🔗 profileImage looks like filename, using getImageUrl:', imageUrl);
      return imageUrl;
    }
    
    // If it's a user ID or other identifier, we might need to fetch from profile endpoint
    // For now, just return the regular image URL
    const imageUrl = this.getImageUrl(profileImage);
    console.log('🔗 profileImage other format, using getImageUrl:', imageUrl);
    return imageUrl;
  }

  async getReports(filters?: {
    hazard_type?: string;
    severity?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<HazardReportsListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      const url = `${this.baseUrl}/reports${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return await this.handleResponse<HazardReportsListResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  async getReportById(id: number): Promise<HazardReport> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return await this.handleResponse<HazardReport>(response);
    } catch (error) {
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return await this.handleResponse<HealthCheckResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  async updateReport(id: number, updateData: Partial<HazardReportData>): Promise<{
    message: string;
    data: HazardReport;
    timestamp: string;
  }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      return await this.handleResponse<{
        message: string;
        data: HazardReport;
        timestamp: string;
      }>(response);
    } catch (error) {
      throw error;
    }
  }

  async deleteReport(id: number): Promise<{ message: string; timestamp: string }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      // Many backends return 204 No Content for delete. Handle gracefully.
      if (response.status === 204) {
        return { message: 'Report deleted successfully', timestamp: new Date().toISOString() };
      }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await this.handleResponse<{ message: string; timestamp: string }>(response);
      }
      if (response.ok) {
        return { message: 'Report deleted successfully', timestamp: new Date().toISOString() };
      }
      throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
    } catch (error) {
      throw error;
    }
  }

  // Get user's own reports
  async getUserReports(): Promise<HazardReportsListResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/reports/user`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return await this.handleResponse<HazardReportsListResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  // Get nearby reports based on user's location
  async getNearbyReports(radiusKm: number = 20): Promise<{
    success: boolean;
    reports: HazardReport[];
    total_count: number;
    user_location: {
      latitude: number;
      longitude: number;
      city: string;
    };
    radius_km: number;
  }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const params = new URLSearchParams();
      params.append('radius', radiusKm.toString());

      const response = await fetch(`${this.baseUrl}/reports/nearby?${params}`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return await this.handleResponse<{
        success: boolean;
        reports: HazardReport[];
        total_count: number;
        user_location: {
          latitude: number;
          longitude: number;
          city: string;
        };
        radius_km: number;
      }>(response);
    } catch (error) {
      throw error;
    }
  }

  // Get current traffic alerts within 25km and 24 hours
  async getCurrentTrafficAlerts(): Promise<{
    success: boolean;
    alerts: HazardReport[];
    total_count: number;
    user_location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    criteria: {
      radius_km: number;
      time_window_hours: number;
    };
    message: string;
  }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      console.log('Making request to traffic alerts endpoint...');
      
      const response = await fetch(`${this.baseUrl}/reports/traffic-alerts`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Traffic alerts response status:', response.status);
      
      const result = await this.handleResponse<{
        success: boolean;
        alerts: HazardReport[];
        total_count: number;
        user_location: {
          latitude: number;
          longitude: number;
          address: string;
        };
        criteria: {
          radius_km: number;
          time_window_hours: number;
        };
        message: string;
      }>(response);

      console.log('Traffic alerts result:', result);
      return result;
    } catch (error) {
      console.error('Error in getCurrentTrafficAlerts:', error);
      throw error;
    }
  }

  // Resolve a report (RDA only)
  async resolveReport(id: number): Promise<{ 
    success: boolean; 
    message: string; 
    timestamp: string 
  }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'resolved' }),
      });
      
      return await this.handleResponse<{ 
        success: boolean; 
        message: string; 
        timestamp: string 
      }>(response);
    } catch (error) {
      throw error;
    }
  }

  // Get resolved reports
  async getResolvedReports(): Promise<{
    success: boolean;
    reports: HazardReport[];
    total_count: number;
  }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/resolved-reports`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return await this.handleResponse<{
        success: boolean;
        reports: HazardReport[];
        total_count: number;
      }>(response);
    } catch (error) {
      throw error;
    }
  }

  // ============ COMMENT FUNCTIONALITY ============

  // Get comments for a specific report
  async getReportComments(reportId: number): Promise<CommentsResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/reports/${reportId}/comments`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return await this.handleResponse<CommentsResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  // Add a comment to a report
  async addReportComment(reportId: number, commentText: string): Promise<AddCommentResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      if (!commentText.trim()) {
        throw new Error('Comment text cannot be empty');
      }

      if (commentText.length > 500) {
        throw new Error('Comment text too long (max 500 characters)');
      }

      const response = await fetch(`${this.baseUrl}/reports/${reportId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ comment_text: commentText.trim() }),
      });
      
      return await this.handleResponse<AddCommentResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  // Delete a comment (user can only delete their own comments)
  async deleteComment(commentId: number): Promise<DeleteCommentResponse> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${this.baseUrl}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return await this.handleResponse<DeleteCommentResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  // ============ LIKE/UNLIKE FUNCTIONALITY ============

  // Get like stats for a specific report
  // Fix this method in your ReportsAPI class:
async getReportLikeStats(reportId: number): Promise<{
  success: boolean;
  report_id: number;
  total_likes: number;
  total_unlikes: number;
  user_liked: boolean;
  user_unliked: boolean;
}> {
  try {
    const token = this.getAuthToken();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Change from /likes to /like (singular)
    const response = await fetch(`${this.baseUrl}/reports/${reportId}/like`, {
      method: 'GET',
      headers,
    });
    
    console.debug('[ReportsAPI] GET like URL:', `${this.baseUrl}/reports/${reportId}/like`, 'headers:', headers);
    console.debug('[ReportsAPI] GET like response status:', response.status, response.statusText);
    let resultBody: any = null;
    try {
      resultBody = await response.clone().json();
      console.debug('[ReportsAPI] GET like response body:', resultBody);
    } catch (e) {
      console.debug('[ReportsAPI] GET like response not JSON or empty');
    }

    const result = await this.handleResponse<any>(response);

    // Normalize shape: endpoint may return either top-level fields or { data: { ... } }
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        return {
          success: !!result.success,
          report_id: result.data.report_id,
          total_likes: result.data.total_likes || 0,
          total_unlikes: result.data.total_unlikes || 0,
          user_liked: !!result.data.user_liked,
          user_unliked: !!result.data.user_unliked
        };
      }

      // Already top-level
      return {
        success: !!result.success,
        report_id: result.report_id,
        total_likes: result.total_likes || 0,
        total_unlikes: result.total_unlikes || 0,
        user_liked: !!result.user_liked,
        user_unliked: !!result.user_unliked
      };
    }

    throw new Error('Unexpected response format from getReportLikeStats');
  } catch (error) {
    throw error;
  }
}

// Fix these methods in your ReportsAPI class:

async toggleReportLike(reportId: number, isLike: boolean, options?: { headers?: Record<string, string> }): Promise<LikeResponse> {
  try {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options && options.headers) {
      headers = { ...headers, ...options.headers };
    }

    const response = await fetch(`${this.baseUrl}/reports/${reportId}/like`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ is_like: isLike }),
    });
    console.debug('[ReportsAPI] POST like URL:', `${this.baseUrl}/reports/${reportId}/like`, 'body:', { is_like: isLike });
    console.debug('[ReportsAPI] POST like request headers:', headers);
    console.debug('[ReportsAPI] POST like response status:', response.status, response.statusText);
    try {
      const body = await response.clone().json();
      console.debug('[ReportsAPI] POST like response body:', body);
    } catch (e) {
      console.debug('[ReportsAPI] POST like response not JSON or empty');
    }

    return await this.handleResponse<LikeResponse>(response);
  } catch (error) {
    throw error;
  }
}
}

export const reportsAPI = new ReportsAPI();