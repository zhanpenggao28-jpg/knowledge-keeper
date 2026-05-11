import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../stores/appStore'

const hasFiles = (dt: DataTransfer | null): boolean =>
  dt?.types?.includes('Files') ?? false

export function useDragImport(_onFilesDropped: (filePaths: string[]) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      dragCounter.current++
      if (dragCounter.current === 1) {
        setIsDragging(true)
      }
    }

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }

    const onDrop = () => {
      setIsDragging(false)
      dragCounter.current = 0
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'native-drop-ok') {
        setIsDragging(false)
        dragCounter.current = 0
        const { loadItems } = useAppStore.getState()
        loadItems()
      }
    }

    document.addEventListener('dragenter', onDragEnter, true)
    document.addEventListener('dragleave', onDragLeave, true)
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('drop', onDrop, true)
    window.addEventListener('message', onMessage)

    return () => {
      document.removeEventListener('dragenter', onDragEnter, true)
      document.removeEventListener('dragleave', onDragLeave, true)
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('drop', onDrop, true)
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return isDragging
}
