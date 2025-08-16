'use client'
import { MagnifyingGlassIcon, TruckIcon, ExclamationTriangleIcon, CloudIcon, WrenchScrewdriverIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { reportsAPI } from '@/lib/api'
import SubmitReport from './SubmitReport'

interface ViewFilters {
  hazardType: string
}

interface Report {
  id: number;
  title: string;
  description?: string;
  hazard_type: string;
  severity_level: string;
  created_at?: string;
  images?: string[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

interface NewsContentProps {
  activeTab: 'view' | 'submit'
}

const NewsContent = ({ activeTab }: NewsContentProps) => {
  // If submit tab is active, render the SubmitReport component
  if (activeTab === 'submit') {
    return <SubmitReport />
  }
  // If view tab is active, render the ViewReports component
  if (activeTab === 'view') {
    const ViewReports = require('./ViewReports').default;
    return <ViewReports />;
  }
}

export default NewsContent