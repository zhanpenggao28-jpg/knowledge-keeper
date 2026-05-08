export interface Item {
  id: string
  title: string
  file_type: string
  category: 'document' | 'image' | 'video' | 'other'
  file_path: string
  original_name: string
  file_size: number
  file_hash: string
  thumbnail: string | null
  preview: string | null
  extracted_text: string
  summary: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error_msg: string | null
  duration: number | null
  page_count: number | null
  created_at: string
  updated_at: string
  tags: Tag[]
  snippet?: string
}

export interface Tag {
  id: number
  name: string
  color: string
  is_ai_generated: number
  item_count?: number
}

export interface ProcessingJob {
  id: number
  item_id: string
  task_type: string
  priority: number
  status: string
  error_msg: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface SearchResult {
  items: Item[]
  total: number
}
