import { useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'

export function useItems() {
  const { items, total, isLoading, loadItems } = useAppStore()

  useEffect(() => {
    loadItems()
  }, [])

  const refresh = useCallback(() => loadItems(), [loadItems])

  return { items, total, isLoading, refresh }
}
