// lib/api.ts

// Hazard report data for submission
export interface HazardReportData {
  title: string;
  description?: string;
  hazard_type: 'accident' | 'pothole' | 'Natural disaster' | 'construction';
  severity_level: 'low' | 'medium' | 'high';
  images?: File[]; // Add images support
}

// Image metadata interface
export interface ImageMetadata {
  filename: string;
  originalName: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

// Hazard report returned from backend
export interface HazardReport {
  id: number;
  title: string;
  description?: string;
  hazard_type: 'accident' | 'pothole' | 'Natural disaster' | 'construction';
  severity_level: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved' | 'in_progress';
  created_at: string;
  updated_at: string;
  images?: string[]; // Array of image URLs
  image_metadata?: ImageMetadata[];
}

// API response for single report
export interface ApiResponse {
  message: string;
  data?: HazardReport;
  report_id?: number;
  timestamp?: string;
  images_uploaded?: number;
  image_urls?: string[];
}

// Rest of your existing interfaces...
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

// Singleton API class
class ReportsAPI {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  }

  // Handle fetch responses
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

  // Submit a new hazard report (with optional images)
  async submitReport(reportData: HazardReportData): Promise<ApiResponse> {
    try {
      // If no images, use JSON
      if (!reportData.images || reportData.images.length === 0) {
        const response = await fetch(`${this.baseUrl}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            title: reportData.title,
            description: reportData.description,
            hazard_type: reportData.hazard_type,
            severity_level: reportData.severity_level
          }),
        });
        return await this.handleResponse<ApiResponse>(response);
      }

      // If images exist, use FormData
      const formData = new FormData();
      formData.append('title', reportData.title);
      formData.append('hazard_type', reportData.hazard_type);
      formData.append('severity_level', reportData.severity_level);
      
      if (reportData.description) {
        formData.append('description', reportData.description);
      }

      // Append all images
      reportData.images.forEach((image) => {
        formData.append('images', image, image.name);
      });

      const response = await fetch(`${this.baseUrl}/reports`, {
        method: 'POST',
        body: formData, // No Content-Type header - browser will set it with boundary
      });
      
      return await this.handleResponse<ApiResponse>(response);
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Get image URL
  getImageUrl(filename: string): string {
    return `${this.baseUrl}/images/${filename}`;
  }

  // Get list of hazard reports
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

  // Get a single report by ID
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

  // Health check endpoint
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

  // Update a report
  async updateReport(id: number, updateData: Partial<HazardReportData>): Promise<{
    message: string;
    data: HazardReport;
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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

  // Delete a report
  async deleteReport(id: number): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });
      return await this.handleResponse<{ message: string; timestamp: string }>(response);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const reportsAPI = new ReportsAPI();