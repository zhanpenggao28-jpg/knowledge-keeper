import { useState, useCallback } from 'react'
import * as api from '../services/api'
import type { Item } from '../types'

export function useSearch() {
  const [results, setResults] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (query: string, category?: string, tagId?: number) => {
    if (!query.trim()) {
      setResults([])
      setTotal(0)
      return
    }
    setIsSearching(true)
    try {
      const data = await api.searchItems({ q: query, category, tag_id: tagId, limit: 50 })
      setResults(data.items)
      setTotal(data.total)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { results, total, isSearching, search }
}
