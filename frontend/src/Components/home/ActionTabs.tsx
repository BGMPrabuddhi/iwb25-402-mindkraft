'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  const tabsRef = useRef<HTMLButtonElement[]>([])

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

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (currentIndex + 1) % tabs.length
      setActiveTab(tabs[next].id)
      tabsRef.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (currentIndex - 1 + tabs.length) % tabs.length
      setActiveTab(tabs[prev].id)
      tabsRef.current[prev]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault(); setActiveTab(tabs[0].id); tabsRef.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault(); setActiveTab(tabs[tabs.length - 1].id); tabsRef.current[tabs.length - 1]?.focus()
    }
  }, [activeTab, tabs])

  // Smooth focus ring visibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('focus-visible:outline-none')
    }
  }, [])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      {/* Ambient / glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-brand-500/10 to-brand-300/10" aria-hidden="true" />
      <div className="relative ring-1 ring-white/40 backdrop-blur-xl bg-white/60 rounded-2xl shadow-xl shadow-brand-900/10 overflow-hidden">
        {/* Tabs header */}
        <div className="relative">
          <div className="flex relative" role="tablist" aria-label="Report actions">
            {/* Active indicator */}
            <div
              className="absolute bottom-0 h-[3px] bg-gradient-to-r from-green-900 via-green-800 to-green-700 transition-all duration-500"
              style={{
                width: `${100 / tabs.length}%`,
                transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`
              }}
            />
            {tabs.map((tab, i) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  ref={el => { if (el) tabsRef.current[i] = el }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={onKeyDown}
                  className={`relative flex-1 px-6 py-4 text-center outline-none transition-colors duration-300 font-medium select-none group
                    ${isActive ? 'text-green-900' : 'text-black/60 hover:text-green-800'}
                  `}
                >
                  <span className="absolute inset-0 rounded-t-2xl bg-gradient-to-b from-white/70 to-white/20 backdrop-blur-md opacity-0 group-[aria-selected='true']:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                  <span className="relative flex flex-col items-center">
                    <span className={`mb-1 inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${isActive ? 'text-green-900' : 'text-black/40 group-hover:text-green-800'}`}>{tab.icon}</span>
                    <span className="text-sm font-semibold tracking-wide">{tab.label}</span>
                    <span className="mt-1 text-[11px] leading-tight font-normal opacity-70">{tab.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" aria-hidden="true" />
        </div>

        {/* Content */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="relative p-6 md:p-7"
        >
          <div className="absolute -top-20 -right-14 h-52 w-52 bg-brand-500/20 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 bg-brand-300/30 rounded-full blur-3xl" aria-hidden="true" />
          <div className="relative">
            <NewsContent activeTab={activeTab} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActionTabs