'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

const LOCATIONS = ['Cozumel', 'Baja', 'All'] as const
type Location = typeof LOCATIONS[number]

export default function FacilityManagementPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location>('Cozumel')

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
              fontSize: '44px',
              fontWeight: 400,
              color: 'black',
              wordWrap: 'break-word'
            }}
          >
            Facility Overview
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Beds, occupancy, staff capacity, and revenue projections.
          </p>
        </div>

        {/* Location Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {LOCATIONS.map((location) => (
            <button
              key={location}
              onClick={() => setSelectedLocation(location)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedLocation === location
                  ? 'bg-[#5D7A5F] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {location}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Occupancy (this month)</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">78</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              14%
            </span>
            <span className="text-gray-400 text-sm">in target range</span>
          </div>
        </div>

        {/* Beds Available */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Beds Available (next 30 days)</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">11</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              5%
            </span>
            <span className="text-gray-400 text-sm">empty beds beyond 6 weeks</span>
          </div>
        </div>

        {/* Confirmed Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Confirmed Revenue</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">$142K</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              40%
            </span>
            <span className="text-gray-400 text-sm">Booked for next 60 days</span>
          </div>
        </div>

        {/* Staff Load */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Staff Load</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">86%</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              7%
            </span>
            <span className="text-gray-400 text-sm">High-monitor overtime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
