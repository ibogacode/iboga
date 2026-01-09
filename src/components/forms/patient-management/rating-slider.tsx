'use client'

import { Label } from '@/components/ui/label'

interface RatingSliderProps {
  id: string
  label: string
  value: number | null | undefined
  onChange: (value: number) => void
  required?: boolean
  error?: string
}

export function RatingSlider({ id, label, value, onChange, required, error }: RatingSliderProps) {
  const sliderValue = value ?? 5 // Default to middle value if not set

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <input
          type="range"
          id={id}
          min={1}
          max={10}
          step={1}
          value={sliderValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((sliderValue - 1) / 9) * 100}%, #e5e7eb ${((sliderValue - 1) / 9) * 100}%, #e5e7eb 100%)`
          }}
        />
        {/* Slider labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600 relative">
          <span>1</span>
          <span className="absolute left-[30%]">4</span>
          <span className="absolute left-[63%]">7</span>
          <span>10</span>
        </div>
        {/* Current value indicator */}
        <div className="flex justify-center mt-1">
          <span className="text-sm font-semibold text-gray-900">{sliderValue}</span>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}
