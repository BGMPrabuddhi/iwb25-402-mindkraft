// types.ts
export interface ViewFilters {
  hazardType: string
  sensitivity: string
  fromLocation?: {
    lat: number
    lng: number
    address?: string
  }
  toLocation?: {
    lat: number
    lng: number
    address?: string
  }
}

export interface Report {
  id: number
  title: string
  description?: string
  hazard_type: string
  severity_level: string
  created_at?: string
  updated_at?: string
  images?: string[]
  location?: {
    lat: number
    lng: number
    address?: string
  }
  status?: string
  reporter_first_name?: string
  reporter_last_name?: string
  reporter_profile_image?: string
}