'use client'

import { useFacebookData } from './facebook-data-provider'
import { formatNumber, getLatestValue } from '@/lib/utils/facebook-metrics'

export function FacebookOverviewCards() {
  const { followers, views, likes, posts, isLoading } = useFacebookData()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  // Log raw data for debugging
  console.log('[FacebookOverviewCards] Raw data received:', {
    followers: followers ? { type: typeof followers, isArray: Array.isArray(followers), keys: Object.keys(followers || {}), sample: JSON.stringify(followers).substring(0, 200) } : null,
    views: views ? { type: typeof views, isArray: Array.isArray(views), keys: Object.keys(views || {}), sample: JSON.stringify(views).substring(0, 200) } : null,
    likes: likes ? { type: typeof likes, isArray: Array.isArray(likes), keys: Object.keys(likes || {}), sample: JSON.stringify(likes).substring(0, 200) } : null,
    posts: posts ? { type: typeof posts, isArray: Array.isArray(posts), keys: Object.keys(posts || {}), sample: JSON.stringify(posts).substring(0, 200) } : null,
  })

  // Use the utility function to extract latest values
  const totalFollowers = getLatestValue(followers)
  const totalViews = getLatestValue(views)
  const totalLikes = getLatestValue(likes)
  const totalPosts = getLatestValue(posts)

  console.log('[FacebookOverviewCards] Extracted values:', {
    totalFollowers,
    totalViews,
    totalLikes,
    totalPosts,
  })

  const cards = [
    {
      title: 'Total Followers',
      value: formatNumber(totalFollowers),
      change: '+0%', // TODO: Calculate from historical data
      icon: '👥',
    },
    {
      title: 'Total Views',
      value: formatNumber(totalViews),
      change: '+0%', // TODO: Calculate from historical data
      icon: '👁️',
    },
    {
      title: 'Total Likes',
      value: formatNumber(totalLikes),
      change: '+0%', // TODO: Calculate from historical data
      icon: '👍',
    },
    {
      title: 'Total Posts',
      value: formatNumber(totalPosts),
      change: '+0%', // TODO: Calculate from historical data
      icon: '📝',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-medium text-gray-600">{card.title}</span>
            <span className="text-xl sm:text-2xl">{card.icon}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {card.value}
            </span>
            <span className="text-sm sm:text-base text-green-600 font-medium">{card.change}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

