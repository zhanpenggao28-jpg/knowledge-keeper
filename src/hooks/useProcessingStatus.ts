import { useState, useEffect, useRef } from 'react'
import * as api from '../services/api'
import type { ProcessingJob } from '../types'

export function useProcessingStatus(itemId: string | null) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [itemStatus, setItemStatus] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!itemId) {
      setJobs([])
      setItemStatus('')
      return
    }

    const poll = async () => {
      try {
        const data = await api.getProcessingStatus(itemId)
        setJobs(data.jobs)
        setItemStatus(data.item_status)
        if (data.item_status === 'done' || data.item_status === 'error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch {
        // ignore
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [itemId])

  return { jobs, itemStatus }
}
