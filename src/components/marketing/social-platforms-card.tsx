'use client'

const platforms = [
  { name: 'Instagram', followers: '46.1K', change: '↑ 11%', posts: '24 posts / week' },
  { name: 'Facebook', followers: '46.1K', change: '↑ 11%', posts: '24 posts / week' },
  { name: 'LinkedIn', followers: '46.1K', change: '↑ 11%', posts: '24 posts / week' },
  { name: 'TikTok', followers: '46.1K', change: '↑ 11%', posts: '24 posts / week' },
  { name: 'Youtube', followers: '46.1K', change: '↑ 11%', posts: '24 posts / week' },
]

export function SocialPlatformsCard() {
  return (
    <div className="flex flex-col gap-2.5 p-6 rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h3 className="text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Social Platforms
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280]" />
        <p className="text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Followers • Engagement • Posts
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {platforms.slice(0, 3).map((platform, index) => (
          <div
            key={index}
            className="flex flex-col gap-2.5 p-[17px] rounded-[13px] bg-[#F5F4F0]"
          >
            <h4 className="text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
              {platform.name}
            </h4>
            <p className="text-lg font-bold leading-[1.193em] tracking-[-0.04em] text-[#111827]">
              {platform.followers}
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-0.5 px-2.5 py-1 rounded-[10px] bg-[#DEF8EE]">
                <span className="text-xs leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
                  {platform.change}
                </span>
              </div>
              <p className="text-xs leading-[1.193em] tracking-[-0.04em] text-[#777777]">
                {platform.posts}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {platforms.slice(3).map((platform, index) => (
          <div
            key={index + 3}
            className="flex flex-col gap-2.5 p-[17px] rounded-[13px] bg-[#F5F4F0]"
          >
            <h4 className="text-sm font-medium leading-[1.193em] tracking-[-0.04em] text-black">
              {platform.name}
            </h4>
            <p className="text-lg font-bold leading-[1.193em] tracking-[-0.04em] text-[#111827]">
              {platform.followers}
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-0.5 px-2.5 py-1 rounded-[10px] bg-[#DEF8EE]">
                <span className="text-xs leading-[1.193em] tracking-[-0.04em] text-[#10B981]">
                  {platform.change}
                </span>
              </div>
              <p className="text-xs leading-[1.193em] tracking-[-0.04em] text-[#777777]">
                {platform.posts}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

