import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Minus, Plus, Loader2 } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Vite handles the ?url suffix: emits the worker as a separate file and returns its URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface PdfViewerProps {
  filePath: string
}

export function PdfViewer({ filePath }: PdfViewerProps) {
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)
        // Use custom protocol: local-file://  — much faster than base64 IPC
        const fileUrl = `local-file://${filePath}`
        console.log(`[PdfViewer] loading from: ${fileUrl}`)
        if (!cancelled) {
          setPdfData(fileUrl)
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err))
          setLoading(false)
        }
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [filePath])

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages)
    setLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(`PDF 加载失败: ${err.message}`)
    setLoading(false)
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-500">
        {error}
      </div>
    )
  }

  if (loading || !pdfData) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        加载 PDF...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-3 px-4 py-1.5 border-b border-white/10 bg-background/40 backdrop-blur-xl shadow-sm">
        <button
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1}
          className="p-1 rounded hover:bg-accent disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs">
          {pageNumber} / {numPages}
        </span>
        <button
          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
          disabled={pageNumber >= numPages}
          className="p-1 rounded hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-border" />

        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.2))}
          className="p-1 rounded hover:bg-accent"
          title="缩小"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(Math.min(3, scale + 0.2))}
          className="p-1 rounded hover:bg-accent"
          title="放大"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* PDF pages */}
      <div className="flex-1 overflow-auto bg-gray-300 flex flex-col items-center py-4 gap-4">
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center gap-2 text-muted-foreground py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              解析 PDF...
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  )
}
