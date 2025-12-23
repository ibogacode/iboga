'use client'

const leadSources = [
  { name: 'Google Organic', percentage: '38.6%', color: '#6E7A46' },
  { name: 'Blog Articles', percentage: '22.5%', color: '#869064' },
  { name: 'Instagram', percentage: '30.8%', color: '#A0B082' },
  { name: 'TikTok', percentage: '8.1%', color: '#B8C0A0' },
  { name: 'Referrals / Others', percentage: '8.1%', color: '#D0D8BE' },
]

export function LeadSourcesCard() {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h3 className="text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Lead Sources
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280]" />
        <p className="text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Inquiries by channel — this month
        </p>
      </div>

      {/* Pie Chart and List */}
      <div className="flex items-center gap-8">
        {/* Pie Chart Placeholder */}
        <div className="w-[168px] h-[168px] rounded-full bg-gradient-to-br from-[#6E7A46] via-[#869064] to-[#F5F4F0] flex-shrink-0" />
        
        {/* List */}
        <div className="flex-1 flex flex-col gap-3">
          {leadSources.map((source, index) => (
            <div key={index} className="flex items-center justify-between gap-12">
              <div className="flex items-center gap-3 px-1 py-0.5 rounded-lg">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <span className="text-xs leading-[1.5em] text-[#1C1C1C]">
                  {source.name}
                </span>
              </div>
              <span className="text-xs leading-[1.5em] text-[#1C1C1C]">
                {source.percentage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

