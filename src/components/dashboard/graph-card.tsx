'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ProgramByType } from '@/components/dashboard/programs-card'

interface GraphCardProps {
  programs?: ProgramByType[] | null
}

const CHART_COLORS = ['#6E7A46', '#B6BCA2', '#CAE081']

export function GraphCard({ programs = [] }: GraphCardProps) {
  const programList = Array.isArray(programs) ? programs : []
  const chartData = programList.map((p, i) => ({
    name: p.name,
    clients: p.patientCount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))
  const hasData = chartData.some((d) => d.clients > 0)

  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Programs
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          High-level view by diagnosis
        </p>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[120px] sm:h-[168px] text-[#6B7280] text-sm border-b border-[rgba(28,28,28,0.05)]">
          <p>No clients by program yet</p>
          <p className="text-xs mt-1">Data will appear when patients are in the pipeline</p>
        </div>
      ) : (
        <div className="h-[120px] sm:h-[168px] w-full border-b border-[rgba(28,28,28,0.05)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : 0
                  return [`${n} client${n === 1 ? '' : 's'}`, 'Clients']
                }}
                labelStyle={{ color: '#111' }}
              />
              <Bar
                dataKey="clients"
                fill="#6E7A46"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                name="Clients"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {hasData && (
        <div className="flex flex-wrap gap-3 sm:gap-4 pt-1">
          {chartData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                aria-hidden
              />
              <span className="text-[10px] sm:text-xs text-[rgba(28,28,28,0.7)]">
                {d.name}: {d.clients}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
