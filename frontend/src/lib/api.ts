// lib/api.ts

// Hazard report data for submission
export interface HazardReportData {
  title: string;
  description?: string;
  hazard_type: 'accident' | 'pothole' | 'Natural disaster' | 'construction';
  severity_level: 'low' | 'medium' | 'high';

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
}

// API response for single report
export interface ApiResponse {
  message: string;
  data?: HazardReport;
  report_id?: number;
  timestamp?: string;
}

// API response for list of reports
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

// Validation error response
export interface ValidationErrorResponse {
  message: string;
  errors: string[];
  timestamp: string;
}

// Health check response
export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  java_version: string;
  timestamp: string;
  database_status: string;
  endpoints: Record<string, string>;
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

  // Submit a new hazard report
  async submitReport(reportData: HazardReportData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(reportData),
      });
      return await this.handleResponse<ApiResponse>(response);
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
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