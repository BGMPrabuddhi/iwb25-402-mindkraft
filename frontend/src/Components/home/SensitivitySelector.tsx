// components/SensitivitySelector.tsx
import React from 'react'

interface SensitivitySelectorProps {
  selectedLevel: string
  onSelect: (level: string) => void
}

const SensitivitySelector: React.FC<SensitivitySelectorProps> = ({ selectedLevel, onSelect }) => {
  const sensitivityLevels = [
    { value: 'all', label: 'All Levels', color: 'bg-gray-500', selected: 'border-gray-500 bg-gray-100 text-gray-700' },
    { value: 'high', label: 'High Risk', color: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-600' },
    { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-500', selected: 'border-yellow-500 bg-yellow-50 text-yellow-600' },
    { value: 'low', label: 'Low Risk', color: 'bg-green-500', selected: 'border-green-500 bg-green-50 text-green-600' }
  ]

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Sensitivity Level *
      </label>
      <div className="grid grid-cols-4 gap-2">
        {sensitivityLevels.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className={`p-3 rounded-lg border-2 transition-all text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500/50 ${
              selectedLevel === level.value
                ? level.selected + ' shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-4 h-4 rounded-full ${level.color} mx-auto mb-1`}></div>
            <div className="text-xs font-medium">{level.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SensitivitySelector