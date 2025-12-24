/**
 * Utility functions for formatting Facebook metrics data
 */

/**
 * Format number with K/M suffixes
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

/**
 * Extract timeline data points from Metricool API response
 */
export function extractTimelineData(data: any): Array<{ date: string; value: number }> {
  if (!data) return []

  // Try different data structures
  // Structure 1: { data: [{ value: 123, date: '...' }] } or { data: [{ metric: 'pageFollows', values: [...], dates: [...] }] }
  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    // Find item with values array (could be first, last, or any)
    let targetItem = data.data.find((item: any) => item?.values && Array.isArray(item.values) && item.values.length > 0)
    if (!targetItem) {
      targetItem = data.data[0]
    }
    
    // Check if targetItem has 'values' array (Metricool timeline format)
    if (targetItem?.values && Array.isArray(targetItem.values) && targetItem.values.length > 0) {
      const values = targetItem.values
      const dates = targetItem.dates || targetItem.timestamps || []
      
      return values.map((val: any, index: number) => {
        // Handle if value is an object with nested value property
        let numericValue = 0
        if (typeof val === 'number') {
          numericValue = val
        } else if (val && typeof val === 'object') {
          numericValue = val.value ?? val.count ?? val.total ?? val.y ?? 0
        }
        
        // Generate date if not provided
        let dateStr = dates[index] || dates[dates.length - values.length + index]
        if (!dateStr) {
          // Calculate date backwards from today
          const daysAgo = values.length - index - 1
          const date = new Date()
          date.setDate(date.getDate() - daysAgo)
          dateStr = date.toISOString().split('T')[0]
        }
        
        return {
          date: dateStr,
          value: numericValue,
        }
      })
    }
    
    // Standard format: { data: [{ value: 123, date: '...' }] }
    return data.data.map((item: any) => ({
      date: item.date || item.timestamp || item.time || '',
      value: item.value ?? item.count ?? item.total ?? 0,
    }))
  }

  // Structure 2: [{ value: 123, date: '...' }] or [{ metric: '...', values: [...] }] (direct array)
  if (Array.isArray(data) && data.length > 0) {
    // Find item with values array
    let targetItem = data.find((item: any) => item?.values && Array.isArray(item.values) && item.values.length > 0)
    if (!targetItem) {
      targetItem = data[0]
    }
    
    if (targetItem?.values && Array.isArray(targetItem.values) && targetItem.values.length > 0) {
      const values = targetItem.values
      const dates = targetItem.dates || targetItem.timestamps || []
      
      return values.map((val: any, index: number) => {
        let numericValue = 0
        if (typeof val === 'number') {
          numericValue = val
        } else if (val && typeof val === 'object') {
          numericValue = val.value ?? val.count ?? val.total ?? val.y ?? 0
        }
        
        let dateStr = dates[index] || dates[dates.length - values.length + index]
        if (!dateStr) {
          const daysAgo = values.length - index - 1
          const date = new Date()
          date.setDate(date.getDate() - daysAgo)
          dateStr = date.toISOString().split('T')[0]
        }
        
        return {
          date: dateStr,
          value: numericValue,
        }
      })
    }
    
    return data.map((item: any) => ({
      date: item.date || item.timestamp || item.time || '',
      value: item.value ?? item.count ?? item.total ?? 0,
    }))
  }

  // Structure 3: Single object with values array directly
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.values && Array.isArray(data.values) && data.values.length > 0) {
      const values = data.values
      const dates = data.dates || data.timestamps || []
      
      return values.map((val: any, index: number) => {
        let numericValue = 0
        if (typeof val === 'number') {
          numericValue = val
        } else if (val && typeof val === 'object') {
          numericValue = val.value ?? val.count ?? val.total ?? val.y ?? 0
        }
        
        let dateStr = dates[index] || dates[dates.length - values.length + index]
        if (!dateStr) {
          const daysAgo = values.length - index - 1
          const date = new Date()
          date.setDate(date.getDate() - daysAgo)
          dateStr = date.toISOString().split('T')[0]
        }
        
        return {
          date: dateStr,
          value: numericValue,
        }
      })
    }
    
    // Check if it has a data property that's an array
    if (data.data && Array.isArray(data.data)) {
      let targetItem = data.data.find((item: any) => item?.values && Array.isArray(item.values) && item.values.length > 0)
      if (!targetItem) {
        targetItem = data.data[0]
      }
      
      if (targetItem?.values && Array.isArray(targetItem.values) && targetItem.values.length > 0) {
        const values = targetItem.values
        const dates = targetItem.dates || targetItem.timestamps || []
        
        return values.map((val: any, index: number) => {
          let numericValue = 0
          if (typeof val === 'number') {
            numericValue = val
          } else if (val && typeof val === 'object') {
            numericValue = val.value ?? val.count ?? val.total ?? val.y ?? 0
          }
          
          let dateStr = dates[index] || dates[dates.length - values.length + index]
          if (!dateStr) {
            const daysAgo = values.length - index - 1
            const date = new Date()
            date.setDate(date.getDate() - daysAgo)
            dateStr = date.toISOString().split('T')[0]
          }
          
          return {
            date: dateStr,
            value: numericValue,
          }
        })
      }
      
      return data.data.map((item: any) => ({
        date: item.date || item.timestamp || item.time || '',
        value: item.value ?? item.count ?? item.total ?? 0,
      }))
    }
  }

  return []
}

/**
 * Calculate percentage change between two values
 */
export function calculateChange(current: number, previous: number): { value: string; isPositive: boolean } {
  // Handle invalid numbers
  if (typeof current !== 'number' || isNaN(current)) current = 0
  if (typeof previous !== 'number' || isNaN(previous)) previous = 0
  
  // If both are 0, no change
  if (current === 0 && previous === 0) {
    return { value: '0%', isPositive: true }
  }
  
  // If previous is 0 but current is not, it's 100% increase (or more)
  if (previous === 0 && current > 0) {
    return { value: '+∞%', isPositive: true }
  }
  
  // If previous is 0 and current is negative (shouldn't happen for metrics, but handle it)
  if (previous === 0 && current < 0) {
    return { value: '-∞%', isPositive: false }
  }
  
  const change = ((current - previous) / previous) * 100
  
  // Handle NaN or Infinity
  if (isNaN(change) || !isFinite(change)) {
    return { value: 'N/A', isPositive: true }
  }
  
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    isPositive: change >= 0,
  }
}

/**
 * Get latest value from timeline data
 * Handles various Metricool API response structures
 */
export function getLatestValue(data: any): number {
  if (!data) {
    console.log('[getLatestValue] No data provided')
    return 0
  }

  // Log the data structure for debugging
  console.log('[getLatestValue] Processing data:', {
    hasData: !!data,
    dataType: typeof data,
    isArray: Array.isArray(data),
    hasNestedData: !!data?.data,
    nestedIsArray: Array.isArray(data?.data),
    dataKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
    nestedDataKeys: data?.data && typeof data.data === 'object' && !Array.isArray(data.data) ? Object.keys(data.data) : [],
    firstItem: Array.isArray(data?.data) && data.data.length > 0 ? data.data[0] : null,
    sample: JSON.stringify(data).substring(0, 300),
  })

  // Structure 1: { data: [{ value: 123, date: '...' }] } or { data: [{ metric: 'pageFollows', values: [1,2,3,...] }] }
  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    // Try to find item with values array (could be first, last, or any item)
    let targetItem = data.data.find((item: any) => item?.values && Array.isArray(item.values) && item.values.length > 0)
    
    // If not found, try first item, then last item
    if (!targetItem) {
      targetItem = data.data[0]
    }
    
    console.log('[getLatestValue] Target item structure:', {
      hasTarget: !!targetItem,
      targetKeys: targetItem && typeof targetItem === 'object' ? Object.keys(targetItem) : [],
      hasValues: !!targetItem?.values,
      valuesIsArray: Array.isArray(targetItem?.values),
      valuesLength: targetItem?.values?.length,
      firstValue: targetItem?.values?.[0],
      lastValue: targetItem?.values?.[targetItem?.values?.length - 1],
      valuesType: typeof targetItem?.values?.[0],
      sampleValues: targetItem?.values?.slice(0, 5), // First 5 values
      sampleLastValues: targetItem?.values?.slice(-5), // Last 5 values
      fullTarget: JSON.stringify(targetItem, null, 2).substring(0, 800),
    })
    
    // Check if targetItem has a 'values' array (Metricool format with metric and values array)
    if (targetItem?.values && Array.isArray(targetItem.values) && targetItem.values.length > 0) {
      const lastIndex = targetItem.values.length - 1
      const value = targetItem.values[lastIndex]
      
      // Check if value is an object (e.g., {value: 123, date: '...'})
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const extractedValue = value.value ?? value.count ?? value.total ?? value.y ?? 0
        console.log('[getLatestValue] Found in nested data array with values array (object format), extracted value:', extractedValue)
        return extractedValue
      }
      
      // Value is a number
      console.log('[getLatestValue] Found in nested data array with values array, latest value:', value, 'at index:', lastIndex, 'of', targetItem.values.length, 'total values')
      return typeof value === 'number' ? value : 0
    }
    
    // Fallback to direct value properties
    const value = targetItem?.value ?? targetItem?.count ?? targetItem?.total ?? targetItem?.y ?? 0
    console.log('[getLatestValue] Found in nested data array, target item:', targetItem, 'value:', value)
    return value
  }

  // Structure 2: [{ value: 123, date: '...' }] or [{ metric: 'pageFollows', values: [1,2,3,...] }] (direct array)
  if (Array.isArray(data) && data.length > 0) {
    const latest = data[data.length - 1]
    
    // Check if latest has a 'values' array
    if (latest?.values && Array.isArray(latest.values) && latest.values.length > 0) {
      const lastIndex = latest.values.length - 1
      const value = latest.values[lastIndex]
      
      // Check if value is an object
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const extractedValue = value.value ?? value.count ?? value.total ?? value.y ?? 0
        console.log('[getLatestValue] Found in direct array with values array (object format), extracted value:', extractedValue)
        return extractedValue
      }
      
      console.log('[getLatestValue] Found in direct array with values array, latest value:', value)
      return typeof value === 'number' ? value : 0
    }
    
    const value = latest?.value ?? latest?.count ?? latest?.total ?? latest?.y ?? 0
    console.log('[getLatestValue] Found in direct array, latest item:', latest, 'value:', value)
    return value
  }

  // Structure 3: { value: 123 } or { metric: 'pageFollows', values: [...] } (single object with direct value or values array)
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Check if data itself has a values array (not nested in data.data)
    if (data.values && Array.isArray(data.values) && data.values.length > 0) {
      const lastIndex = data.values.length - 1
      const value = data.values[lastIndex]
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const extractedValue = value.value ?? value.count ?? value.total ?? value.y ?? 0
        console.log('[getLatestValue] Found values array directly on data object (object format), extracted value:', extractedValue)
        return extractedValue
      }
      
      console.log('[getLatestValue] Found values array directly on data object, latest value:', value)
      return typeof value === 'number' ? value : 0
    }
    
    // Check for direct value properties
    if ('value' in data || 'count' in data || 'total' in data) {
      const value = data.value ?? data.count ?? data.total ?? 0
      console.log('[getLatestValue] Found direct value in object:', value)
      return value
    }

    // Check for nested data property that might be an object
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      const value = data.data.value ?? data.data.count ?? data.data.total ?? 0
      console.log('[getLatestValue] Found value in nested data object:', value)
      return value
    }
  }

  console.warn('[getLatestValue] Could not extract value from data structure')
  return 0
}

/**
 * Get previous period value for comparison
 */
export function getPreviousValue(data: any, daysBack: number = 30): number {
  if (!data) return 0
  
  // Try to extract timeline data first (handles all structures)
  const timelineData = extractTimelineData(data)
  
  if (timelineData.length > 0) {
    // Calculate target index based on daysBack
    // Assuming data points are roughly daily, find the point approximately daysBack ago
    const targetIndex = Math.max(0, timelineData.length - Math.floor(daysBack) - 1)
    return timelineData[targetIndex]?.value ?? 0
  }
  
  // Fallback: try to find values array directly
  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    let targetItem = data.data.find((item: any) => item?.values && Array.isArray(item.values) && item.values.length > 0)
    if (!targetItem) {
      targetItem = data.data[0]
    }
    
    if (targetItem?.values && Array.isArray(targetItem.values)) {
      const values = targetItem.values
      const targetIndex = Math.max(0, values.length - Math.floor(daysBack) - 1)
      const val = values[targetIndex]
      
      // Handle if value is an object
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val.value ?? val.count ?? val.total ?? val.y ?? 0
      }
      
      return typeof val === 'number' ? val : 0
    }
  }
  
  // Fallback: find value from date
  if (data?.data && Array.isArray(data.data)) {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - daysBack)
  
  let closest = data.data[0]
  let minDiff = Infinity
  
  data.data.forEach((item: any) => {
    const itemDate = new Date(item.date || item.timestamp)
      if (!isNaN(itemDate.getTime())) {
    const diff = Math.abs(itemDate.getTime() - targetDate.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = item
        }
    }
  })
  
  return closest?.value || closest?.count || 0
  }
  
  return 0
}

