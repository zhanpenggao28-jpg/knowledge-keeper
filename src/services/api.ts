import axios from 'axios'
import type { Item, Tag, ProcessingJob } from '../types'

let baseURL = 'http://127.0.0.1:8000'

export function getBaseURL(): string {
  return baseURL
}

export function getFileURL(filePath: string): string {
  return `${baseURL}/files/${filePath}`
}

export function getThumbURL(filePath: string, thumbnail: string | null): string | null {
  if (thumbnail) return `${baseURL}/files/${thumbnail}`
  // For images, the file itself can serve as thumbnail
  return null
}

export function getPreviewURL(filePath: string, preview: string | null, category: string): string | null {
  if (preview) return `${baseURL}/files/${preview}`
  // For images without a preview yet, fall back to the original file
  if (category === 'image') return `${baseURL}/files/${filePath}`
  return null
}

export async function initApi(): Promise<void> {
  if (window.electronAPI) {
    const port = await window.electronAPI.getSidecarPort()
    if (port) {
      baseURL = `http://127.0.0.1:${port}`
    }
  }
}

export function setApiPort(port: number): void {
  baseURL = `http://127.0.0.1:${port}`
}

const api = axios.create({
  timeout: 30000
})

api.interceptors.request.use((config) => {
  config.baseURL = baseURL
  return config
})

export async function getItems(params?: {
  category?: string
  status?: string
  tag_id?: number
  collection_id?: number
  q?: string
  sort_by?: string
  sort_order?: string
  offset?: number
  limit?: number
}): Promise<{ items: Item[]; total: number }> {
  const { data } = await api.get('/items', { params })
  return data
}

export async function getDuplicates(): Promise<{ groups: { hash: string; count: number; items: Item[] }[] }> {
  const { data } = await api.get('/duplicates')
  return data
}

// --- Collections ---

export async function getCollections(): Promise<import('../types').Collection[]> {
  const { data } = await api.get('/collections')
  return data
}

export async function createCollection(body: { name: string; description?: string; color?: string }): Promise<import('../types').Collection> {
  const { data } = await api.post('/collections', body)
  return data
}

export async function updateCollection(id: number, body: { name?: string; description?: string; color?: string }): Promise<void> {
  await api.put(`/collections/${id}`, body)
}

export async function deleteCollection(id: number): Promise<void> {
  await api.delete(`/collections/${id}`)
}

export async function addItemsToCollection(collectionId: number, itemIds: string[]): Promise<void> {
  await api.post(`/collections/${collectionId}/items`, { item_ids: itemIds })
}

export async function addItemsToTag(tagId: number, itemIds: string[]): Promise<void> {
  await api.post(`/tags/${tagId}/items`, { item_ids: itemIds })
}

export async function removeItemsFromCollection(collectionId: number, itemIds: string[]): Promise<void> {
  await api.delete(`/collections/${collectionId}/items`, { data: { item_ids: itemIds } })
}

// --- Chat ---

export async function sendChatMessage(
  message: string,
  history?: { role: string; text: string; action?: string; result?: any }[],
  selectedIds?: string[]
): Promise<{ message: string; action: string; result: any; results?: { action: string; result: any }[] }> {
  const { data } = await api.post('/chat', { message, history: history || [], selected_ids: selectedIds || [] })
  return data
}

export async function getItem(id: string): Promise<Item> {
  const { data } = await api.get(`/items/${id}`)
  return data
}

export async function createItem(body: {
  title: string
  originalName: string
  fileType: string
  category: string
  filePath: string
  fileSize: number
  fileHash: string
}): Promise<{ id: string }> {
  const { data } = await api.post('/items', body)
  return data
}

export async function updateItem(
  id: string,
  body: { title?: string; tag_ids?: number[]; originalName?: string }
): Promise<void> {
  await api.put(`/items/${id}`, body)
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`)
}

export async function getItemText(
  id: string
): Promise<{ id: string; title: string; extracted_text: string; summary: string }> {
  const { data } = await api.get(`/items/${id}/text`)
  return data
}

export async function reprocessItem(id: string): Promise<void> {
  await api.post(`/items/${id}/reprocess`)
}

export async function searchItems(params: {
  q: string
  category?: string
  tag_id?: number
  limit?: number
}): Promise<{ items: Item[]; total: number }> {
  const { data } = await api.get('/search', { params })
  return data
}

export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags')
  return data
}

export async function createTag(body: { name: string; color: string }): Promise<Tag> {
  const { data } = await api.post('/tags', body)
  return data
}

export async function updateTag(id: number, body: { name?: string; color?: string }): Promise<void> {
  await api.put(`/tags/${id}`, body)
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`)
}

export async function getProcessingStatus(
  itemId: string
): Promise<{ item_status: string; jobs: ProcessingJob[] }> {
  const { data } = await api.get(`/processing/status/${itemId}`)
  return data
}
