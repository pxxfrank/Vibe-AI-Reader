import fs from 'fs'

export interface ParseResult {
  title: string
  author: string
  chapters: ChapterData[]
}

export interface ChapterData {
  index: number
  title: string
  content: string
}

export function parseTxt(filePath: string): ParseResult {
  const text = fs.readFileSync(filePath, 'utf-8')
  const fileName = filePath.split(/[/\\]/).pop()?.replace(/\.txt$/i, '') || '未命名文档'

  const chapterPattern = /(?:第\s*([一二三四五六七八九十百千\d]+)\s*[章节回篇])\s*[^\n]*/g
  const matches = [...text.matchAll(chapterPattern)]

  const chapters: ChapterData[] = []

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]
      const startIndex = currentMatch.index!
      const endIndex = nextMatch ? nextMatch.index! : text.length

      chapters.push({
        index: i,
        title: currentMatch[0].trim(),
        content: text.slice(startIndex, endIndex).trim()
      })
    }
  } else {
    chapters.push({
      index: 0,
      title: fileName,
      content: text
    })
  }

  return {
    title: fileName,
    author: '',
    chapters
  }
}
