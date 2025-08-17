'use client'

import { useState } from 'react'
import { EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import NewsContent from './NewsContent'

interface Tab {
  id: 'view' | 'submit'
  label: string
  icon: React.ReactNode
  description: string
}

const ActionTabs = () => {
  const [activeTab, setActiveTab] = useState<'view' | 'submit'>('view')

  const tabs: Tab[] = [
    { 
      id: 'view', 
      label: 'View Reports', 
      icon: <EyeIcon className="h-5 w-5" />,
      description: 'Browse hazard reports with map view'
    },
    { 
      id: 'submit', 
      label: 'Submit Report', 
      icon: <PencilSquareIcon className="h-5 w-5" />,
      description: 'Report a new road hazard or incident'
    }
  ]

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Tab Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative px-6 py-4 text-center font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span className="font-semibold">{tab.label}</span>
              </div>
              <p className="text-xs mt-1 opacity-75">{tab.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <NewsContent activeTab={activeTab} />
      </div>
    </div>
  )
}

export default ActionTabs