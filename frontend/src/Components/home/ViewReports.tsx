// ViewReports.tsx
'use client'
import React, { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { reportsAPI } from '@/lib/api'
import FilterPanel from './FilterPanel'
import RouteMap from './RouteMap'
import TrafficRouteInfo from './TrafficRouteInfo'
import RouteHazardAlert from './RouteHazardAlert'
import HazardReportsList from './HazardReportsList'
import LoadingState from './LoadingState'
import { ViewFilters, Report } from './types'
import Snackbar from '@/Components/Snackbar'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAz2gtcc8kLOLLa5jbq4V3P7cpsGYlOPjQ'

const ViewReports = () => {
  const [viewFilters, setViewFilters] = useState<ViewFilters>({
    hazardType: '',
    sensitivity: ''
  })
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [googleMapsScriptLoaded, setGoogleMapsScriptLoaded] = useState(false)
  const [routeHazardAlert, setRouteHazardAlert] = useState<any>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'error' as 'success' | 'error' | 'info' | 'warning' })
  
  // New state for traffic-aware routes
  const [calculatedRoutes, setCalculatedRoutes] = useState<any[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        console.log('Fetching reports from backend...')
        const response = await reportsAPI.getReports({
          page: 1,
          page_size: 100
        })
        
        const backendReports = response.reports || []
        const convertedReports: Report[] = backendReports.map((report: any) => ({
          id: report.id,
          title: report.title,
          description: report.description || '',
          hazard_type: report.hazard_type,
          severity_level: report.severity_level,
          created_at: report.created_at,
          images: report.images || [],
          location: report.location ? {
            lat: report.location.lat || report.latitude,
            lng: report.location.lng || report.longitude,
            address: report.location.address || report.address
          } : undefined,
          status: report.status || 'active'
        }))
        
        setReports(convertedReports)
      } catch (error) {
        console.error('Error fetching reports:', error)
        // Don't show error to user, just use empty array
        setReports([])
        // Optional: Set some mock data for testing
        // setReports(mockReports)
      }
    }

    fetchAllReports()
  }, [])
  const handleFilterSubmit = async () => {
    if (!viewFilters.hazardType || !viewFilters.sensitivity) {
      setSnackbar({ open: true, message: 'Please select hazard type and sensitivity level', type: 'error' })
      return
    }
    if (!viewFilters.fromLocation || !viewFilters.toLocation) {
      setSnackbar({ open: true, message: 'Please select both FROM and TO locations', type: 'error' })
      return
    }
    setIsLoading(true)
    setError(null)
    setShowMap(true)
  }

  const resetFilter = () => {
    setViewFilters({
      hazardType: '',
      sensitivity: ''
    })
    setFilteredReports([])
    setSelectedReport(null)
    setError(null)
    setShowMap(false)
    setRouteHazardAlert(null)
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry,routes&v=weekly`}
        onLoad={() => setGoogleMapsScriptLoaded(true)}
        onError={() => setError('Failed to load Google Maps')}
      />

      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Route Hazard Viewer</h3>
          <p className="text-gray-600">Select hazard type, sensitivity, and route to view hazards along your path</p>
        </div>

        <FilterPanel
          viewFilters={viewFilters}
          setViewFilters={setViewFilters}
          onSubmit={handleFilterSubmit}
          onReset={resetFilter}
          isLoading={isLoading}
          error={error}
          showMap={showMap}
          filteredReports={filteredReports}
           googleMapsScriptLoaded={googleMapsScriptLoaded}
           onNotify={(msg, type='error') => setSnackbar({ open: true, message: msg, type })}
        />

        {routeHazardAlert?.show && (
          <RouteHazardAlert
            alert={routeHazardAlert}
            onClose={() => setRouteHazardAlert((prev: any) => prev ? {...prev, show: false} : null)}
          />
        )}

        {showMap && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RouteMap
                viewFilters={viewFilters}
                setViewFilters={setViewFilters}
                reports={reports}
                setFilteredReports={setFilteredReports}
                selectedReport={selectedReport}
                setSelectedReport={setSelectedReport}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
                googleMapsScriptLoaded={googleMapsScriptLoaded}
                setRouteHazardAlert={setRouteHazardAlert}
                onRoutesCalculated={setCalculatedRoutes}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={setSelectedRouteIndex}
              />
            </div>
            
            <div className="space-y-4">
              {calculatedRoutes.length > 0 && (
                <TrafficRouteInfo
                  routes={calculatedRoutes}
                  selectedRouteIndex={selectedRouteIndex}
                  onRouteSelect={setSelectedRouteIndex}
                  hazardCount={filteredReports.length}
                />
              )}
            </div>
          </div>
        )}

        {isLoading && <LoadingState />}

        {filteredReports.length > 0 && (
          <HazardReportsList
            reports={filteredReports}
            selectedReport={selectedReport}
            setSelectedReport={setSelectedReport}
            viewFilters={viewFilters}
          />
        )}

        {showMap && filteredReports.length === 0 && !isLoading && viewFilters.fromLocation && viewFilters.toLocation && (
          <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Route Clear</h3>
            <p className="text-green-700 text-lg">No hazards found on your selected routes!</p>
          </div>
        )}
      </div>

      <Snackbar 
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type as any}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}

export default ViewReports