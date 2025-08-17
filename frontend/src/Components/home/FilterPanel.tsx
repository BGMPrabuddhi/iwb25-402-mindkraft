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
  googleMapsScriptLoaded // Add this to destructuring
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
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
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              !viewFilters.hazardType || !viewFilters.sensitivity || !viewFilters.fromLocation || !viewFilters.toLocation || isLoading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-4 focus:ring-blue-200'
            }`}
          >
            {isLoading ? 'Calculating Route...' : 'Show Route & Hazards'}
          </button>

          {(showMap || filteredReports.length > 0) && (
            <button
              onClick={onReset}
              className="px-6 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilterPanel