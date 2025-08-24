// components/FilterPanel.tsx
import React from 'react'
import HazardTypeSelector from './HazardTypeSelector'
import SensitivitySelector from './SensitivitySelector'
import LocationSelector from './LocationSelector'
import { ViewFilters, Report } from './types'

interface FilterPanelProps {
  viewFilters: ViewFilters
  setViewFilters: React.Dispatch<React.SetStateAction<ViewFilters>>
  onSubmit: () => void
  onReset: () => void
  isLoading: boolean
  error: string | null
  showMap: boolean
  filteredReports: Report[]
  googleMapsScriptLoaded: boolean // Add this prop
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  viewFilters,
  setViewFilters,
  onSubmit,
  onReset,
  isLoading,
  error,
  showMap,
  filteredReports,
  googleMapsScriptLoaded, // Add this to destructuring
  onNotify
}) => {
  return (
  <div className="bg-brand-500/5 border border-brand-500/30 rounded-xl p-6 backdrop-blur-sm">
      <div className="space-y-6">
        <HazardTypeSelector
          selectedType={viewFilters.hazardType}
          onSelect={(type) => setViewFilters(prev => ({...prev, hazardType: type}))}
        />

        <SensitivitySelector
          selectedLevel={viewFilters.sensitivity}
          onSelect={(level) => setViewFilters(prev => ({...prev, sensitivity: level}))}
        />

        <LocationSelector
          viewFilters={viewFilters}
          setViewFilters={setViewFilters}
          googleMapsScriptLoaded={googleMapsScriptLoaded} // Now this is defined
          onNotify={onNotify}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={onSubmit}
            disabled={!viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold tracking-wide transition-all shadow-sm relative overflow-hidden
              ${!viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-white hover:from-brand-500 hover:via-brand-500 hover:to-brand-300 focus:ring-4 focus:ring-brand-400/40'}
            `}
          >
            <span className="relative z-10">{isLoading ? 'Calculating Route...' : 'Show Route & Hazards'}</span>
            {!(!viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading) && (
              <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_70%)]" aria-hidden="true" />
            )}
          </button>

          {(showMap || filteredReports.length > 0) && (
            <button
              onClick={onReset}
              className="px-6 py-3 font-semibold rounded-lg border relative overflow-hidden text-brand-600 border-brand-500/70 hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            >
              <span className="relative z-10">Reset</span>
              <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[linear-gradient(135deg,rgba(255,255,255,0.3),transparent)]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilterPanel