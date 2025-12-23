'use client'

const articles = [
  { title: "Ibogaine for Parkinson's: Early Outcomes", category: "Parkinson's", published: 'Nov 12', views: '420' },
  { title: 'PTSD & Ibogaine: A Family Guide', category: 'Family Guide', published: 'Nov 12', views: '420' },
  { title: 'Addiction Recovery: Ibogaine vs Detox', category: 'Addiction', published: 'Nov 12', views: '420' },
]

export function ContentLibraryTable() {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Content Library (Recent Articles)
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Showing latest posts from theibogainstitute.org
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-0 min-w-[600px] sm:min-w-0">
        {/* Title Column */}
        <div className="flex flex-col w-[200px] sm:w-[277px]">
          <div className="flex flex-col justify-center gap-1 py-2 pr-2 sm:pr-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Title
            </span>
          </div>
          {articles.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 pr-2 sm:pr-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820] break-words">
                {item.title}
              </span>
            </div>
          ))}
        </div>

        {/* Category Column */}
        <div className="flex flex-col w-[100px] sm:w-[121px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Category
            </span>
          </div>
          {articles.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.category}
              </span>
            </div>
          ))}
        </div>

        {/* Published Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Published
            </span>
          </div>
          {articles.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.published}
              </span>
            </div>
          ))}
        </div>

        {/* Views Column */}
        <div className="flex flex-col flex-1 min-w-[80px]">
          <div className="flex flex-col justify-center gap-1 py-2 px-2 sm:px-3 border-b border-[rgba(28,28,28,0.2)] h-9 sm:h-10">
            <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
              Views
            </span>
          </div>
          {articles.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col justify-center py-2 px-2 sm:px-3 ${index === 1 ? 'rounded-lg' : ''}`}
            >
              <span className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#2B2820]">
                {item.views}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

