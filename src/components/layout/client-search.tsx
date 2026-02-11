'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { searchClients, type ClientSearchResult } from '@/actions/search-clients.action'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 300

function getDisplayName(row: ClientSearchResult): string {
  if (row.name?.trim()) return row.name
  const first = row.first_name?.trim() ?? ''
  const last = row.last_name?.trim() ?? ''
  return [first, last].filter(Boolean).join(' ') || row.email
}

function getInitials(row: ClientSearchResult): string {
  if (row.first_name && row.last_name) {
    return (row.first_name[0] + row.last_name[0]).toUpperCase()
  }
  const name = getDisplayName(row)
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name[0]?.toUpperCase() || row.email[0]?.toUpperCase() || '?'
}

export function ClientSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      setResults([])
      setIsOpen(trimmed.length > 0)
      return
    }
    setIsLoading(true)
    const res = await searchClients({ query: trimmed })
    setIsLoading(false)
    if (res?.data?.success && res.data.data) {
      setResults(res.data.data)
      setHighlightedIndex(-1)
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      runSearch(query)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i < results.length - 1 ? i + 1 : i))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1))
      return
    }
    if (e.key === 'Enter' && highlightedIndex >= 0 && results[highlightedIndex]) {
      e.preventDefault()
      router.push(`/patient-pipeline/patient-profile/${results[highlightedIndex].id}`)
      setIsOpen(false)
      setQuery('')
      setResults([])
      setHighlightedIndex(-1)
    }
  }

  const handleSelect = (client: ClientSearchResult) => {
    router.push(`/patient-pipeline/patient-profile/${client.id}`)
    setIsOpen(false)
    setQuery('')
    setResults([])
    setHighlightedIndex(-1)
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <Search className="h-4 w-4 md:h-5 md:w-5 text-black shrink-0 pointer-events-none" aria-hidden />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search clients..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-8 w-[140px] md:w-[180px] border-0 bg-transparent shadow-none focus-visible:ring-0 pl-2 pr-2 text-sm placeholder:text-gray-500"
        aria-label="Search clients"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="client-search-results"
        aria-activedescendant={highlightedIndex >= 0 ? `client-result-${highlightedIndex}` : undefined}
      />
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0 absolute right-2 pointer-events-none" aria-hidden />
      )}
      {isOpen && (query.trim().length >= 2 || results.length > 0) && (
        <ul
          id="client-search-results"
          role="listbox"
          className="absolute top-full left-0 mt-1 w-[280px] max-h-[320px] overflow-auto rounded-xl bg-white border border-gray-200 shadow-lg z-[100] py-1"
        >
          {results.length === 0 && !isLoading && (
            <li className="px-4 py-3 text-sm text-gray-500" role="option">
              No clients found
            </li>
          )}
          {results.map((client, index) => (
            <li
              key={client.id}
              id={`client-result-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 cursor-pointer text-left transition-colors',
                index === highlightedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
              onClick={() => handleSelect(client)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={client.avatar_url ?? undefined} alt="" className="object-cover" />
                <AvatarFallback className="bg-[#2D3A1F] text-white text-xs">
                  {getInitials(client)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getDisplayName(client)}
                </p>
                <p className="text-xs text-gray-500 truncate">{client.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
