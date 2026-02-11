'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronUp, ChevronDown, Trash2, Mail } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

export interface Prospect {
  id: string
  name: string
  email: string
  phone: string
  dateContacted: string
  dateContactedIso?: string | null
  source: string
  status: string
}

type SortField = 'name' | 'dateContacted' | 'source' | 'status'
type SortDirection = 'asc' | 'desc'

interface ProspectsTableProps {
  prospects?: Prospect[]
  isLoading?: boolean
}

export function ProspectsTable({ prospects = [], isLoading = false }: ProspectsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedProspects = useMemo(() => {
    let result = [...prospects]

    if (searchTerm) {
      result = result.filter(
        (prospect) =>
          prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prospect.phone.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (sourceFilter !== 'all') {
      result = result.filter((prospect) => prospect.source === sourceFilter)
    }

    if (sortField) {
      result.sort((a, b) => {
        let aVal: string, bVal: string
        if (sortField === 'dateContacted') {
          aVal = (a.dateContactedIso || a.dateContacted || '').toString()
          bVal = (b.dateContactedIso || b.dateContacted || '').toString()
        } else {
          aVal = a[sortField]
          bVal = b[sortField]
        }
        if (sortDirection === 'asc') return aVal > bVal ? 1 : -1
        return aVal < bVal ? 1 : -1
      })
    }

    return result
  }, [prospects, searchTerm, sortField, sortDirection, sourceFilter])

  const paginatedProspects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedProspects.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedProspects, currentPage])

  const totalPages = Math.ceil(filteredAndSortedProspects.length / itemsPerPage)

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(new Set(paginatedProspects.map((p) => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedIds)
    if (checked === true) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const isAllSelected =
    paginatedProspects.length > 0 && selectedIds.size === paginatedProspects.length

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-50" />
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const uniqueSources = Array.from(new Set(prospects.map((p) => p.source)))

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-6">
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          Loading prospects…
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Prospects</h2>
          <span className="px-2 py-0.5 bg-[#d1e7dd] text-[#0f5132] rounded-full text-xs font-medium">
            {prospects.length}
          </span>
        </div>
      </div>

      {/* Search, Filter and Bulk Actions */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E7A46] focus:border-transparent"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E7A46] focus:border-transparent bg-white"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
              <Button size="sm" className="bg-[#6E7A46] hover:bg-[#5d6639] gap-1">
                <Mail className="w-3 h-3" />
                Email
              </Button>
              <Button size="sm" variant="destructive" className="gap-1">
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-[#6E7A46] data-[state=checked]:border-[#6E7A46]"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                onClick={() => handleSort('dateContacted')}
              >
                <div className="flex items-center gap-1">
                  Date Contacted
                  <SortIcon field="dateContacted" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                onClick={() => handleSort('source')}
              >
                <div className="flex items-center gap-1">
                  Source
                  <SortIcon field="source" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProspects.map((prospect) => (
              <tr key={prospect.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Checkbox
                    checked={selectedIds.has(prospect.id)}
                    onCheckedChange={(checked) => handleSelectOne(prospect.id, checked as boolean)}
                    className="data-[state=checked]:bg-[#6E7A46] data-[state=checked]:border-[#6E7A46]"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{prospect.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{prospect.email}</div>
                  <div className="text-xs text-gray-500">{prospect.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{prospect.dateContacted}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{prospect.source}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-1 text-xs font-medium">
                    Prospect
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Button
                    size="sm"
                    className="bg-[#6E7A46] hover:bg-[#5d6639] rounded-full text-xs"
                    onClick={() => router.push(`/patient-pipeline/patient-profile/${prospect.id}`)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredAndSortedProspects.length === 0 && (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No prospects yet.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedProspects.length)} of{' '}
            {filteredAndSortedProspects.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'bg-[#6E7A46] hover:bg-[#5d6639]' : ''}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
