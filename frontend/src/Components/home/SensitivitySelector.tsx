// components/SensitivitySelector.tsx
import React from 'react'

interface SensitivitySelectorProps {
  selectedLevel: string
  onSelect: (level: string) => void
}

const SensitivitySelector: React.FC<SensitivitySelectorProps> = ({ selectedLevel, onSelect }) => {
  const sensitivityLevels = [
    { value: 'all', label: 'All Levels', color: 'bg-gray-500' },
    { value: 'high', label: 'High Risk', color: 'bg-red-500' },
    { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low Risk', color: 'bg-blue-500' }
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
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedLevel === level.value
                ? 'border-blue-500 bg-blue-100 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
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