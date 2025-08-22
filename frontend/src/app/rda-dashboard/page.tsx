'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'
import MapPopup from '@/Components/MapPopup'
import ImageGallery from '@/Components/ImageGallery'
import ConfirmationDialog from '@/Components/ConfirmationDialog'

interface Report {
  id: number
  title: string
  description?: string
  hazard_type: string
  severity_level: string
  images: string[]
  location?: {
    lat: number
    lng: number
    address?: string
  }
  created_at: string
  status?: string
  resolved_at?: string
  original_report_id?: number
}

type TabType = 'submitted' | 'resolved'

// Sri Lanka's 25 districts
const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
].sort()

export default function RDADashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [resolvedReports, setResolvedReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('submitted')
  
  // Filter states
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Image gallery state
  const [imageGallery, setImageGallery] = useState<{
    isOpen: boolean
    images: string[]
    initialIndex: number
    reportTitle: string
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    reportTitle: ''
  })

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    reportId: number | null
    action: string
    title: string
    message: string
  }>({
    isOpen: false,
    reportId: null,
    action: '',
    title: '',
    message: ''
  })

  // Logout confirmation state
  const [logoutDialog, setLogoutDialog] = useState<{
    isOpen: boolean
  }>({
    isOpen: false
  })

  // Map popup state
  const [mapPopup, setMapPopup] = useState<{
    isOpen: boolean
    latitude?: number
    longitude?: number
    address?: string
    title?: string
  }>({
    isOpen: false
  })

  useEffect(() => {
    checkAccess()
  }, [])

  // Function to extract district from address
  const extractDistrict = (address: string): string => {
    if (!address) return 'Unknown'
    
    const addressLower = address.toLowerCase()
    
    // Check each district name in the address
    for (const district of SRI_LANKA_DISTRICTS) {
      if (addressLower.includes(district.toLowerCase())) {
        return district
      }
    }
    
    return 'Unknown'
  }

  // Image gallery functions
  const openImageGallery = (images: string[], initialIndex: number = 0, reportTitle: string) => {
    setImageGallery({
      isOpen: true,
      images,
      initialIndex,
      reportTitle
    })
  }

  const closeImageGallery = () => {
    setImageGallery({
      isOpen: false,
      images: [],
      initialIndex: 0,
      reportTitle: ''
    })
  }

  // Confirmation dialog functions
  const showConfirmDialog = (reportId: number, action: string, reportTitle: string) => {
    console.log('FRONTEND: showConfirmDialog called', { reportId, action, reportTitle });
    
    let title = ''
    let message = ''

    if (action === 'resolved') {
      title = 'Mark as Resolved'
      message = `Are you sure you want to mark "${reportTitle}" as resolved? This will permanently move the report to the resolved reports table.`
    }

    setConfirmDialog({
      isOpen: true,
      reportId,
      action,
      title,
      message
    })
    
    console.log('FRONTEND: Confirmation dialog state set', {
      isOpen: true,
      reportId,
      action,
      title,
      message
    });
  }

  const handleConfirm = () => {
    console.log('FRONTEND: handleConfirm called');
    console.log('FRONTEND: confirmDialog state:', confirmDialog);
    
    if (confirmDialog.reportId && confirmDialog.action) {
      console.log('FRONTEND: About to call updateReportStatus', {
        reportId: confirmDialog.reportId,
        action: confirmDialog.action
      });
      updateReportStatus(confirmDialog.reportId, confirmDialog.action)
    } else {
      console.error('FRONTEND: Missing reportId or action', confirmDialog);
    }
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      reportId: null,
      action: '',
      title: '',
      message: ''
    })
  }

  // Logout functions
  const handleLogout = () => {
    setLogoutDialog({ isOpen: true })
  }

  const confirmLogout = () => {
    localStorage.removeItem('auth_token')
    setLogoutDialog({ isOpen: false })
    router.push('/login')
  }

  const cancelLogout = () => {
    setLogoutDialog({ isOpen: false })
  }

  // Map functions
  const openMap = (report: Report) => {
    if (report.location) {
      setMapPopup({
        isOpen: true,
        latitude: report.location.lat,
        longitude: report.location.lng,
        address: report.location.address,
        title: report.title
      })
    }
  }

  const closeMap = () => {
    setMapPopup({ isOpen: false })
  }

  const checkAccess = async () => {
    try {
      const profile = await authAPI.getProfile()
      
      if (profile.success && (profile.userRole === 'rda' || profile.email === 'rdasrilanka@gmail.com')) {
        setUser(profile)
        loadReports()
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Updated loadReports function to load both active and resolved reports
  const loadReports = async () => {
    console.log('FRONTEND: loadReports called');
    setReportsLoading(true)
    
    try {
      const token = localStorage.getItem('auth_token');
      console.log('FRONTEND: Loading reports with token:', !!token);
      
      // Load active reports
      console.log('FRONTEND: Fetching active reports...');
      const activeResponse = await fetch('/api/rda/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('FRONTEND: Active reports response status:', activeResponse.status);
      
      const activeData = await activeResponse.json()
      console.log('FRONTEND: Active reports data:', activeData);
      
      // Load resolved reports
      console.log('FRONTEND: Fetching resolved reports...');
      const resolvedResponse = await fetch('/api/rda/resolved-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('FRONTEND: Resolved reports response status:', resolvedResponse.status);
      
      const resolvedData = await resolvedResponse.json()
      console.log('FRONTEND: Resolved reports data:', resolvedData);
      
      if (activeData.success) {
        console.log('FRONTEND: Setting active reports count:', activeData.reports.length);
        setReports(activeData.reports)
      }
      
      if (resolvedData.success) {
        console.log('FRONTEND: Setting resolved reports count:', resolvedData.reports.length);
        setResolvedReports(resolvedData.reports)
      }
    } catch (error) {
      console.error('FRONTEND: Failed to load reports:', error)
    } finally {
      setReportsLoading(false)
    }
  }

  const updateReportStatus = async (reportId: number, newStatus: string) => {
    console.log('FRONTEND: updateReportStatus called', { reportId, newStatus });
    
    try {
      const token = localStorage.getItem('auth_token');
      console.log('FRONTEND: Auth token exists:', !!token);
      
      const url = `/api/rda/reports/${reportId}/status`;
      const payload = { status: newStatus };
      
      console.log('FRONTEND: Making PUT request to:', url);
      console.log('FRONTEND: Request payload:', payload);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      console.log('FRONTEND: Response status:', response.status);
      console.log('FRONTEND: Response ok:', response.ok);
      
      const responseData = await response.json();
      console.log('FRONTEND: Response data:', responseData);

      if (response.ok) {
        console.log('FRONTEND: Report status updated successfully');
        console.log('FRONTEND: About to reload reports');
        loadReports()
        setConfirmDialog({
          isOpen: false,
          reportId: null,
          action: '',
          title: '',
          message: ''
        })
        console.log('FRONTEND: Confirmation dialog closed');
      } else {
        console.error('FRONTEND: Failed to update report status - Response not ok');
        console.error('FRONTEND: Error response:', responseData);
      }
    } catch (error) {
      console.error('FRONTEND: Error updating report status:', error);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Enhanced filtering logic
  const filteredReports = activeTab === 'submitted' 
    ? reports.filter(report => 
        report.status === 'active' || report.status === 'in_progress' || report.status === 'pending'
      )
    : resolvedReports

  const relevantReports = filteredReports
    .filter(report => report.hazard_type === 'pothole' || report.hazard_type === 'construction')
    .filter(report => {
      // District filter
      if (selectedDistrict !== 'all') {
        const reportDistrict = extractDistrict(report.location?.address || '')
        if (reportDistrict !== selectedDistrict) return false
      }
      
      // Severity filter
      if (selectedSeverity !== 'all' && report.severity_level !== selectedSeverity) {
        return false
      }
      
      // Type filter
      if (selectedType !== 'all' && report.hazard_type !== selectedType) {
        return false
      }
      
      return true
    })

  // Reset filters function
  const resetFilters = () => {
    setSelectedDistrict('all')
    setSelectedSeverity('all')
    setSelectedType('all')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">RDA Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('submitted')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'submitted'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Submitted Reports
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {reports.filter(r => (r.status === 'active' || r.status === 'in_progress' || r.status === 'pending') && 
                  (r.hazard_type === 'pothole' || r.hazard_type === 'construction')).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'resolved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resolved Reports
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {resolvedReports.filter(r => r.hazard_type === 'pothole' || r.hazard_type === 'construction').length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            
            {/* District Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">District:</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Districts</option>
                {SRI_LANKA_DISTRICTS.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Severity:</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="pothole">Pothole</option>
                <option value="construction">Construction</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              Reset Filters
            </button>

            {/* Filter Results Count */}
            <div className="text-sm text-gray-600 ml-auto">
              Showing {relevantReports.length} of {filteredReports.filter(r => r.hazard_type === 'pothole' || r.hazard_type === 'construction').length} reports
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {activeTab === 'submitted' ? 'Submitted Road Issues' : 'Resolved Road Issues'}
          </h2>
          <p className="text-gray-600 mb-4">
            Showing {activeTab === 'submitted' ? 'active, in-progress, and pending' : 'resolved'} pothole and construction reports
          </p>
          <button
            onClick={loadReports}
            disabled={reportsLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {reportsLoading ? 'Loading...' : 'Refresh Reports'}
          </button>
        </div>

        {/* Reports Grid */}
        {reportsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : relevantReports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">
              No {activeTab === 'submitted' ? 'submitted' : 'resolved'} reports found matching the selected filters
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relevantReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(report.severity_level)}`}>
                      {report.severity_level}
                    </span>
                    {activeTab === 'submitted' ? (
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(report.status || '')}`}>
                        {report.status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                        resolved
                      </span>
                    )}
                  </div>
                </div>
                
                {report.description && (
                  <p className="text-gray-600 mb-4">{report.description}</p>
                )}
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <p><strong>Type:</strong> {report.hazard_type}</p>
                  <p><strong>District:</strong> {extractDistrict(report.location?.address || '')}</p>
  
                {/* Updated date/time display */}
                {activeTab === 'submitted' ? (
                <p><strong>Submitted:</strong> {new Date(report.created_at).toLocaleString()}</p>
               ) : (
               <>
                <p><strong>Submitted:</strong> {new Date(report.created_at).toLocaleString()}</p>
                <p><strong>Resolved:</strong> {new Date(report.resolved_at).toLocaleString()}</p>
               </>
            )}
  
  {report.location?.address && (
    <p className="cursor-pointer hover:text-blue-600 transition-colors">
      <strong>Location:</strong> 
      <button
        onClick={() => openMap(report)}
        className="ml-1 text-blue-600 hover:text-blue-800 underline"
      >
        {report.location.address}
      </button>
    </p>
  )}
  {report.images.length > 0 && (
    <p>
      <strong>Images:</strong> 
      <button
        onClick={() => openImageGallery(report.images, 0, report.title)}
        className="ml-1 text-blue-600 hover:text-blue-800 underline"
      >
        {report.images.length} attached (View Gallery)
      </button>
    </p>
  )}
</div>

{/* Action Buttons - Only for submitted reports */}
{activeTab === 'submitted' && (
  <div className="flex space-x-2">
    {(report.status === 'pending' || report.status === 'active' || report.status === 'in_progress') && 
     (report.hazard_type === 'pothole' || report.hazard_type === 'construction') && (
      <button
        onClick={() => {
          console.log('FRONTEND: Mark Resolved button clicked for report:', report.id);
          showConfirmDialog(report.id, 'resolved', report.title);
        }}
        className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
      >
        Mark Resolved
      </button>
    )}
    {(report.status === 'pending' || report.status === 'active' || report.status === 'in_progress') && 
     report.hazard_type !== 'pothole' && report.hazard_type !== 'construction' && (
      <div className="w-full text-center text-sm text-gray-500 py-2">
        Auto-deletes after 24 hours
      </div>
    )}
  </div>
)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Popup */}
      {mapPopup.isOpen && mapPopup.latitude && mapPopup.longitude && (
        <MapPopup
          isOpen={mapPopup.isOpen}
          onClose={closeMap}
          latitude={mapPopup.latitude}
          longitude={mapPopup.longitude}
          address={mapPopup.address}
          title={mapPopup.title}
        />
      )}

      {/* Image Gallery */}
      {imageGallery.isOpen && (
        <ImageGallery
          isOpen={imageGallery.isOpen}
          onClose={closeImageGallery}
          images={imageGallery.images}
          initialIndex={imageGallery.initialIndex}
          reportTitle={imageGallery.reportTitle}
        />
      )}

      {/* Resolve Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Yes, Continue"
        cancelText="Cancel"
        type="info"
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={logoutDialog.isOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to login again to access the dashboard."
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  )
}