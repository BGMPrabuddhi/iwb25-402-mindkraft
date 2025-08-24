// components/HazardTypeSelector.tsx
import React from 'react'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

interface HazardTypeSelectorProps {
  selectedType: string
  onSelect: (type: string) => void
}

const HazardTypeSelector: React.FC<HazardTypeSelectorProps> = ({ selectedType, onSelect }) => {
  const hazardTypes = [
    {
      value: 'all',
      label: 'All Types',
      icon: <MagnifyingGlassIcon className="h-6 w-6" />,
      selectedClasses: 'border-brand-500 bg-brand-500/10 text-brand-600'
    },
    {
      value: 'accident',
      label: 'Accidents',
      icon: <TruckIcon className="h-6 w-6" />,
      selectedClasses: 'border-red-500 bg-red-50 text-red-600'
    },
    {
      value: 'pothole',
      label: 'Potholes',
      icon: <ExclamationTriangleIcon className="h-6 w-6" />,
      selectedClasses: 'border-amber-500 bg-amber-50 text-amber-600'
    },
    {
      value: 'Natural disaster',
      label: 'Natural Disaster',
      icon: <CloudIcon className="h-6 w-6" />,
      selectedClasses: 'border-purple-500 bg-purple-50 text-purple-600'
    },
    {
      value: 'construction',
      label: 'Construction',
      icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
      selectedClasses: 'border-orange-500 bg-orange-50 text-orange-600'
    }
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
            className={`p-3 rounded-lg border-2 transition-all text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500/50 ${
              selectedType === type.value
                ? type.selectedClasses + ' shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
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