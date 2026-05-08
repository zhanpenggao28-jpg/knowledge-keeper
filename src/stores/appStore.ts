import { create } from 'zustand'
import type { Item, Tag } from '../types'
import * as api from '../services/api'

interface AppState {
  items: Item[]
  total: number
  selectedItem: Item | null
  searchQuery: string
  activeCategory: string | null
  activeTagId: number | null
  isLoading: boolean
  viewMode: 'grid' | 'list'
  previewOpen: boolean

  loadItems: (params?: { category?: string; tag_id?: number; offset?: number; limit?: number }) => Promise<void>
  selectItem: (item: Item | null) => void
  setSearchQuery: (q: string) => void
  setCategory: (category: string | null) => void
  setTagFilter: (tagId: number | null) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setPreviewOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  items: [],
  total: 0,
  selectedItem: null,
  searchQuery: '',
  activeCategory: null,
  activeTagId: null,
  isLoading: false,
  viewMode: 'grid',
  previewOpen: false,

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
      set({ items: result.items, total: result.total })
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
  setPreviewOpen: (open) => set({ previewOpen: open })
}))
