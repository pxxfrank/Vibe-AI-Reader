import { create } from 'zustand'
import type { DocumentInfo, DocumentDetail, ChapterData } from '@/types/document'

interface DocumentState {
  documents: DocumentInfo[]
  currentDocument: DocumentDetail | null
  loading: boolean
  fetchDocuments: () => Promise<void>
  importDocument: () => Promise<number | null>
  openDocument: (id: number) => Promise<void>
  deleteDocument: (id: number) => Promise<void>
  updateProgress: (docId: number, page: number) => Promise<void>
  getContent: (docId: number) => Promise<ChapterData[]>
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,

  fetchDocuments: async () => {
    set({ loading: true })
    const docs = await window.electronAPI.invoke('documents:list') as DocumentInfo[]
    set({ documents: docs, loading: false })
  },

  importDocument: async () => {
    const result = await window.electronAPI.invoke('documents:import') as {
      success: boolean; documentId?: number; reason?: string; error?: string
    }
    if (result.success && result.documentId) {
      await get().fetchDocuments()
      return result.documentId
    }
    if (!result.success) {
      console.error('[importDocument] failed:', result.reason, result.error)
      alert(`导入失败: ${result.error || result.reason || '未知错误'}`)
    }
    return null
  },

  openDocument: async (id: number) => {
    console.log('[store] openDocument called with id:', id)
    const doc = await window.electronAPI.invoke('documents:get', id) as DocumentDetail | null
    console.log('[store] openDocument result:', doc ? `title="${doc.title}" chapters=${doc.chapters?.length}` : 'NULL')
    if (doc) {
      if (!doc.chapters || doc.chapters.length === 0) {
        console.warn('[store] document has no chapters!')
      }
      set({ currentDocument: doc })
    }
  },

  deleteDocument: async (id: number) => {
    await window.electronAPI.invoke('documents:delete', id)
    await get().fetchDocuments()
  },

  updateProgress: async (docId: number, page: number) => {
    await window.electronAPI.invoke('documents:updateProgress', docId, page)
  },

  getContent: async (docId: number) => {
    return await window.electronAPI.invoke('documents:getContent', docId) as ChapterData[]
  }
}))
