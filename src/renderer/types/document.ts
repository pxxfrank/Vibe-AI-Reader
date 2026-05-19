export interface DocumentInfo {
  id: number
  title: string
  author: string
  file_path: string
  file_type: string
  file_size: number
  total_pages: number
  current_page: number
  added_at: string
  last_read_at: string | null
}

export interface ChapterData {
  chapter_index: number
  chapter_title: string
  content: string
}

export interface DocumentDetail extends DocumentInfo {
  chapters: ChapterData[]
}
