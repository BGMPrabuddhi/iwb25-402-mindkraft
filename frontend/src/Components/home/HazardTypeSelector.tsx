// components/HazardTypeSelector.tsx
import React from 'react'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

interface HazardTypeSelectorProps {
  selectedType: string
  onSelect: (type: string) => void
}

const HazardTypeSelector: React.FC<HazardTypeSelectorProps> = ({ selectedType, onSelect }) => {
  const hazardTypes = [
    { value: 'all', label: 'All Types', icon: <MagnifyingGlassIcon className="h-6 w-6" /> },
    { value: 'accident', label: 'Accidents', icon: <TruckIcon className="h-6 w-6" /> },
    { value: 'pothole', label: 'Potholes', icon: <ExclamationTriangleIcon className="h-6 w-6" /> },
    { value: 'Natural disaster', label: 'Natural Disaster', icon: <CloudIcon className="h-6 w-6" /> },
    { value: 'construction', label: 'Construction', icon: <WrenchScrewdriverIcon className="h-6 w-6" /> }
  ]

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Hazard Type *
      </label>
      <div className="grid grid-cols-5 gap-2">
        {hazardTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => onSelect(type.value)}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedType === type.value
                ? 'border-blue-500 bg-blue-100 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="mb-1 flex justify-center">{type.icon}</div>
            <div className="text-xs font-medium">{type.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default HazardTypeSelector