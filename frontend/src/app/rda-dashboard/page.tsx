'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth'
import { Snackbar, SnackbarStack } from '@/Components/Snackbar'
import MapPopup from '@/Components/MapPopup'
import ImageGallery from '@/Components/ImageGallery'
import ConfirmationDialog from '@/Components/ConfirmationDialog'
import Header from '@/Components/layout/Header'
import Footer from '@/Components/layout/Footer'

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
  const [snackbar, setSnackbar] = useState<{open:boolean; message:string; type:'success'|'error'|'info'|'warning'}>({open:false,message:'',type:'info'})
  const showSnackbar = (message:string, type:'success'|'error'|'info'|'warning'='info') => {
    setSnackbar({open:true,message,type})
  }
  
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

  // (Global logout handled via Header component)

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

  // (Removed local logout dialog logic)

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
      
      if (profile.success && (profile.userRole === 'rda' || profile.email === 'rdasrilanka0@gmail.com')) {
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
        
        // Updated URL to match the new endpoint
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

    if (response.ok && responseData.success) {
      console.log('FRONTEND: Report status updated successfully');
      loadReports();
      closeConfirmDialog();
      showSnackbar('Report marked as resolved successfully','success');
    } else {
      console.error('FRONTEND: Failed to update report status');
      showSnackbar(`Failed to update report: ${responseData.message || 'Unknown error'}`,'error');
    }
    } catch (error) {
    console.error('FRONTEND: Error updating report status:', error);
    showSnackbar('Error updating report status. Please try again.','error');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-900 via-brand-900 to-brand-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400 mx-auto mb-4"></div>
          <p className="text-brand-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Derived stats
  const submittedCore = reports.filter(r => ['pothole','construction'].includes(r.hazard_type) && ['active','pending','in_progress'].includes(r.status||''))
  const resolvedCore = resolvedReports.filter(r => ['pothole','construction'].includes(r.hazard_type))
  const highSeverity = submittedCore.filter(r => r.severity_level === 'high')
  const mediumSeverity = submittedCore.filter(r => r.severity_level === 'medium')
  const lowSeverity = submittedCore.filter(r => r.severity_level === 'low')

  return (
    <div className="min-h-screen flex flex-col bg-white/40">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
          <div className="mb-10 text-center">
            <p className="text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed">Monitor, triage and resolve critical road infrastructure issues reported by the community. Focus on pothole & construction hazards for actionable maintenance response.</p>
          </div>

          <section className="mb-12" aria-label="Dashboard statistics">
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-brand-600/50 via-brand-500/30 to-brand-300/20 shadow-md shadow-black/20 overflow-hidden">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(10,209,200,0.12),transparent_70%)]" />
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl px-5 sm:px-8 py-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                  <div className="group relative rounded-xl p-4 bg-gradient-to-br from-brand-200 to-brand-300 border border-brand-300/70 hover:shadow-lg transition-all">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-2">Active / Pending</div>
                    <div className="text-3xl font-extrabold tracking-tight text-brand-800 group-hover:text-brand-900">{submittedCore.length}</div>
                    <div className="mt-1 text-[11px] text-brand-800/70">Core hazards</div>
                  </div>
                  <div className="group relative rounded-xl p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200/60 hover:shadow-lg transition-all">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">Resolved</div>
                    <div className="text-3xl font-extrabold tracking-tight text-green-700 group-hover:text-green-800">{resolvedCore.length}</div>
                    <div className="mt-1 text-[11px] text-green-700/70">Closed cases</div>
                  </div>
                  <div className="group relative rounded-xl p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200/70 hover:shadow-lg transition-all">
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">High Severity</div>
                    <div className="text-3xl font-extrabold tracking-tight text-red-600 group-hover:text-red-700">{highSeverity.length}</div>
                    <div className="mt-1 text-[11px] text-red-600/70">Needs priority</div>
                  </div>
                  <div className="group relative rounded-xl p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/70 hover:shadow-lg transition-all">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Medium</div>
                    <div className="text-3xl font-extrabold tracking-tight text-amber-600 group-hover:text-amber-700">{mediumSeverity.length}</div>
                    <div className="mt-1 text-[11px] text-amber-600/70">Scheduled work</div>
                  </div>
                  <div className="group relative rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/70 hover:shadow-lg transition-all">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">Low</div>
                    <div className="text-3xl font-extrabold tracking-tight text-emerald-600 group-hover:text-emerald-700">{lowSeverity.length}</div>
                    <div className="mt-1 text-[11px] text-emerald-600/70">Monitor</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mb-8">
            <div className="inline-flex rounded-xl border border-brand-300/40 bg-white/70 backdrop-blur px-1 py-1 shadow-sm">
              <button
                onClick={() => setActiveTab('submitted')}
                className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${activeTab==='submitted' ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-brand-500/30 shadow-md' : 'text-gray-600 hover:text-brand-600 hover:bg-brand-50'}`}
              >
                Submitted
                <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[11px] font-bold px-2 py-0.5 ${activeTab==='submitted' ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {reports.filter(r => (['active','in_progress','pending'].includes(r.status||'')) && ['pothole','construction'].includes(r.hazard_type)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('resolved')}
                className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${activeTab==='resolved' ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-brand-500/30 shadow-md' : 'text-gray-600 hover:text-brand-600 hover:bg-brand-50'}`}
              >
                Resolved
                <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[11px] font-bold px-2 py-0.5 ${activeTab==='resolved' ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {resolvedReports.filter(r => ['pothole','construction'].includes(r.hazard_type)).length}
                </span>
              </button>
            </div>
          </div>

          <section className="mb-10">
            <div className="relative rounded-2xl border border-brand-200/70 bg-white/70 backdrop-blur p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-5">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All</option>
                    {SRI_LANKA_DISTRICTS.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Severity</label>
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All</option>
                    <option value="pothole">Pothole</option>
                    <option value="construction">Construction</option>
                  </select>
                </div>
                <button
                  onClick={resetFilters}
                  className="ml-auto inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-2 text-sm font-semibold text-white shadow hover:from-brand-400 hover:to-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Reset
                </button>
                <div className="w-full text-sm text-gray-600 flex items-center gap-2 pt-2">
                  <span className="font-semibold text-gray-800">{relevantReports.length}</span>
                  matching of
                  <span className="font-semibold text-gray-800">{filteredReports.filter(r => ['pothole','construction'].includes(r.hazard_type)).length}</span>
                  core reports
                </div>
              </div>
            </div>
          </section>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{activeTab === 'submitted' ? 'Active / Pending Core Issues' : 'Resolved Core Issues'}</h2>
              <p className="text-gray-600 mt-1 text-sm">{activeTab === 'submitted' ? 'Focus on actionable pothole & construction hazards requiring intervention' : 'Historical record of successfully resolved hazards'}</p>
            </div>
            <button
              onClick={loadReports}
              disabled={reportsLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {reportsLoading && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {reportsLoading ? 'Refreshing...' : 'Refresh Reports'}
            </button>
          </div>

        {/* Reports Grid */}
        {reportsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : relevantReports.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-gray-300 rounded-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 border border-brand-200">
              <svg className="h-8 w-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">
              No {activeTab === 'submitted' ? 'active/pending' : 'resolved'} core reports match the selected filters.
            </p>
            <p className="text-sm text-gray-500 mt-2">Adjust filters or refresh to check for new updates.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relevantReports.map((report) => {
              const district = extractDistrict(report.location?.address || '')
              return (
                <div key={report.id} className="group relative rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur p-8 shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 leading-snug pr-2 line-clamp-2">{report.title}</h3>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full shadow-sm ${getSeverityColor(report.severity_level)}`}>{report.severity_level}</span>
                      {activeTab === 'submitted' ? (
                        <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full shadow-sm ${getStatusColor(report.status || '')}`}>{report.status}</span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full shadow-sm bg-green-100 text-green-800">resolved</span>
                      )}
                    </div>
                  </div>
                  {report.images.length > 0 && (
                    <button
                      onClick={() => openImageGallery(report.images, 0, report.title)}
                      className="absolute top-1 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur text-white px-2.5 py-1 text-[11px] font-medium shadow hover:bg-black/70"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8h4l2-3h6l2 3h4v11H3z" /><circle cx="12" cy="13" r="3" /></svg>
                      {report.images.length}
                    </button>
                  )}
                  {report.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{report.description}</p>
                  )}
                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-800">Type:</span><span>{report.hazard_type}</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-800">District:</span><span>{district}</span></div>
                    </div>
                    {activeTab === 'submitted' ? (
                      <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-800">Submitted:</span><span>{new Date(report.created_at).toLocaleString()}</span></div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-800">Submitted:</span><span>{new Date(report.created_at).toLocaleString()}</span></div>
                        <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-800">Resolved:</span><span>{report.resolved_at ? new Date(report.resolved_at).toLocaleString() : 'N/A'}</span></div>
                      </div>
                    )}
                    {report.location?.address && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-semibold text-gray-800">Location:</span>
                        <button onClick={() => openMap(report)} className="text-brand-600 hover:text-brand-500 underline underline-offset-2 text-left">
                          {report.location.address}
                        </button>
                      </div>
                    )}
                  </div>
                  {activeTab === 'submitted' && (
                    <div className="mt-auto">
                      {(report.status === 'pending' || report.status === 'active' || report.status === 'in_progress') && ['pothole','construction'].includes(report.hazard_type) && (
                        <button
                          onClick={() => showConfirmDialog(report.id, 'resolved', report.title)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:from-green-500 hover:to-green-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Mark Resolved
                        </button>
                      )}
                      {(report.status === 'pending' || report.status === 'active' || report.status === 'in_progress') && !['pothole','construction'].includes(report.hazard_type) && (
                        <div className="w-full text-center text-xs text-gray-500 py-2">Auto-deletes after 24h</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>

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
     
    <SnackbarStack>
      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(prev=>({...prev,open:false}))} />
    </SnackbarStack>
    </div>
  )
}