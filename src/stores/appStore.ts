import { create } from 'zustand'
import type { Item, Tag, Collection } from '../types'
import * as api from '../services/api'

interface AppState {
  items: Item[]
  total: number
  selectedItem: Item | null
  selectedIds: Set<string>
  activeCategory: string | null
  activeTagId: number | null
  activeCollectionId: number | null
  activeSearchQuery: string
  isLoading: boolean
  viewMode: 'grid' | 'list'
  sortBy: string
  sortOrder: string
  previewOpen: boolean
  refreshKey: number
  tagRefreshKey: number
  collectionRefreshKey: number
  collections: Collection[]
  draggedItemIds: string[]
  setDraggedItemIds: (ids: string[]) => void
  bumpTagRefresh: () => void
  bumpCollectionRefresh: () => void

  loadItems: (params?: { category?: string; tag_id?: number; collection_id?: number; q?: string; sort_by?: string; sort_order?: string; offset?: number; limit?: number }) => Promise<void>
  loadCollections: () => Promise<void>
  selectItem: (item: Item | null) => void
  setCategory: (category: string | null) => void
  setTagFilter: (tagId: number | null) => void
  setCollectionFilter: (collectionId: number | null) => void
  setActiveSearchQuery: (q: string) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSortBy: (field: string) => void
  setSortOrder: (order: string) => void
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
  activeCategory: null,
  activeTagId: null,
  activeCollectionId: null,
  activeSearchQuery: '',
  isLoading: false,
  viewMode: 'grid',
  sortBy: 'created_at',
  sortOrder: 'desc',
  previewOpen: false,
  refreshKey: 0,
  tagRefreshKey: 0,
  collectionRefreshKey: 0,
  collections: [],
  draggedItemIds: [],
  setDraggedItemIds: (ids) => set({ draggedItemIds: ids }),
  bumpTagRefresh: () => set({ tagRefreshKey: get().tagRefreshKey + 1 }),
  bumpCollectionRefresh: () => set({ collectionRefreshKey: get().collectionRefreshKey + 1 }),

  loadItems: async (params) => {
    set({ isLoading: true })
    try {
      const p = {
        category: params?.category ?? get().activeCategory ?? undefined,
        tag_id: params?.tag_id ?? get().activeTagId ?? undefined,
        collection_id: params?.collection_id ?? get().activeCollectionId ?? undefined,
        q: params?.q ?? (get().activeSearchQuery || undefined),
        sort_by: params?.sort_by ?? get().sortBy,
        sort_order: params?.sort_order ?? get().sortOrder,
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

  loadCollections: async () => {
    try {
      const data = await api.getCollections()
      set({ collections: data, collectionRefreshKey: get().collectionRefreshKey + 1 })
    } catch (err) {
      console.error('Failed to load collections:', err)
    }
  },

  selectItem: (item) => set({ selectedItem: item }),
  setCategory: (category) => {
    set({ activeCategory: category })
    get().loadItems()
  },
  setTagFilter: (tagId) => {
    set({ activeTagId: tagId, activeCollectionId: null })
    get().loadItems()
  },
  setCollectionFilter: (collectionId) => {
    set({ activeCollectionId: collectionId, activeTagId: null })
    get().loadItems()
  },
  setActiveSearchQuery: (q) => set({ activeSearchQuery: q }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (field) => {
    set({ sortBy: field })
    get().loadItems()
  },
  setSortOrder: (order) => {
    set({ sortOrder: order })
    get().loadItems()
  },
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
