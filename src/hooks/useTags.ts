import { useState, useEffect, useCallback } from 'react'
import * as api from '../services/api'
import type { Tag } from '../types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTags()
      setTags(data)
    } catch (err) {
      console.error('Failed to load tags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  const create = useCallback(async (name: string, color: string) => {
    await api.createTag({ name, color })
    await loadTags()
  }, [loadTags])

  const update = useCallback(async (id: number, body: { name?: string; color?: string }) => {
    await api.updateTag(id, body)
    await loadTags()
  }, [loadTags])

  const remove = useCallback(async (id: number) => {
    await api.deleteTag(id)
    await loadTags()
  }, [loadTags])

  return { tags, loading, loadTags, create, update, remove }
}
