import fs from 'fs'
import pdfParse from 'pdf-parse'
import type { ParseResult, ChapterData } from './txt-parser'

export async function parsePdf(filePath: string): Promise<ParseResult> {
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdfParse(dataBuffer)

  const title = data.info?.Title || filePath.split(/[/\\]/).pop()?.replace(/\.pdf$/i, '') || '未命名文档'
  const author = data.info?.Author || ''

  const text: string = data.text
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
      title: title,
      content: text
    })
  }

  return {
    title,
    author,
    chapters
  }
}
