// Extracts readable text from uploaded .pptx or .pdf files.
// Returns a single string of all slide/page text, suitable for injection
// into the AI generation prompt as source material.

export interface ParseResult {
  text: string
  pageCount: number
  fileName: string
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
// A .pptx is a ZIP archive. Slides live at ppt/slides/slide*.xml.
// Text runs are <a:t> inside <a:p> (paragraph) inside <p:txBody>.
// We use getElementsByTagNameNS to avoid CSS-selector namespace issues
// across browsers (Chrome is lenient; Firefox is spec-strict).

const DML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'

async function parsePptx(file: File): Promise<ParseResult> {
  const { default: JSZip } = await import('jszip')

  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // Collect slide files sorted numerically (slide1.xml, slide2.xml, …)
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const num = (s: string) => parseInt(s.match(/\d+/)?.[0] ?? '0', 10)
      return num(a) - num(b)
    })

  if (slideEntries.length === 0) {
    throw new Error('No slides found. Make sure the file is a valid .pptx presentation.')
  }

  const slideTexts: string[] = []
  const parser = new DOMParser()

  for (const [i, entry] of slideEntries.entries()) {
    const xml = await zip.files[entry].async('string')
    const doc = parser.parseFromString(xml, 'text/xml')

    // Walk every <a:p> paragraph; join its <a:t> text runs into one line.
    const lines: string[] = []
    const paragraphs = doc.getElementsByTagNameNS(DML_NS, 'p')
    for (const p of Array.from(paragraphs)) {
      const runs = Array.from(p.getElementsByTagNameNS(DML_NS, 't'))
      const text = runs.map((t) => t.textContent ?? '').join('').trim()
      if (text) lines.push(text)
    }

    if (lines.length > 0) slideTexts.push(`[Slide ${i + 1}]\n${lines.join('\n')}`)
  }

  return { text: slideTexts.join('\n\n'), pageCount: slideEntries.length, fileName: file.name }
}

// ── PDF ───────────────────────────────────────────────────────────────────────
// Uses pdf.js to extract the text layer from each page.

async function parsePdf(file: File): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist')

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).href
  }

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // PDF.js text items already include trailing spaces; join without adding extra.
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) pageTexts.push(`[Page ${i}]\n${text}`)
  }

  return { text: pageTexts.join('\n\n'), pageCount: pdf.numPages, fileName: file.name }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseSlideFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pptx') return parsePptx(file)
  if (ext === 'pdf') return parsePdf(file)
  throw new Error(`Unsupported file type ".${ext}". Please upload a .pptx or .pdf file.`)
}

export function fileNameToTopic(fileName: string): string {
  return fileName
    .replace(/\.(pptx?|pdf)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
