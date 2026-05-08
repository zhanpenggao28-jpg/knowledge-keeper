import { create } from 'zustand'
import type { Item, Tag } from '../types'
import * as api from '../services/api'

interface AppState {
  items: Item[]
  total: number
  selectedItem: Item | null
  selectedIds: Set<string>
  searchQuery: string
  activeCategory: string | null
  activeTagId: number | null
  isLoading: boolean
  viewMode: 'grid' | 'list'
  previewOpen: boolean
  refreshKey: number

  loadItems: (params?: { category?: string; tag_id?: number; offset?: number; limit?: number }) => Promise<void>
  selectItem: (item: Item | null) => void
  setSearchQuery: (q: string) => void
  setCategory: (category: string | null) => void
  setTagFilter: (tagId: number | null) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setPreviewOpen: (open: boolean) => void
  toggleSelect: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  items: [],
  total: 0,
  selectedItem: null,
  selectedIds: new Set<string>(),
  searchQuery: '',
  activeCategory: null,
  activeTagId: null,
  isLoading: false,
  viewMode: 'grid',
  previewOpen: false,
  refreshKey: 0,

  loadItems: async (params) => {
    set({ isLoading: true })
    try {
      const p = {
        category: params?.category ?? get().activeCategory ?? undefined,
        tag_id: params?.tag_id ?? get().activeTagId ?? undefined,
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 50
      }
      const result = await api.getItems(p)
      set({ items: result.items, total: result.total, refreshKey: get().refreshKey + 1 })
    } catch (err) {
      console.error('Failed to load items:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  selectItem: (item) => set({ selectedItem: item }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategory: (category) => {
    set({ activeCategory: category })
    get().loadItems({ category: category ?? undefined })
  },
  setTagFilter: (tagId) => {
    set({ activeTagId: tagId })
    get().loadItems({ tag_id: tagId ?? undefined })
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setPreviewOpen: (open) => set({ previewOpen: open }),

  toggleSelect: (id) => {
    const next = new Set(get().selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set({ selectedIds: next })
  },
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() })
}))
