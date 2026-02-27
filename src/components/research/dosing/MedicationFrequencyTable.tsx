'use client'

import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface MedicationFrequencyTableProps {
  data: { name: string; count: number }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function MedicationFrequencyTable({ data, loading, error, onRetry }: MedicationFrequencyTableProps) {
  return (
    <ChartContainer
      title="Medication / solution mentions"
      subtitle="Known medications and solutions from schedule fields (min 2 mentions)"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && data.length === 0 && (
        <ResearchEmptyState title="No medication mentions" description="No known medication or solution terms in the selected period." />
      )}
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 pr-2 text-left font-medium text-gray-500">Term</th>
                <th className="pb-2 pr-2 text-right font-medium text-gray-500">Mentions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-b border-gray-100">
                  <td className="py-2 pr-2 font-medium text-gray-900">{row.name}</td>
                  <td className="py-2 pr-2 text-right text-gray-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartContainer>
  )
}
