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
// Text nodes are <a:t> elements anywhere inside each slide XML.

async function parsePptx(file: File): Promise<ParseResult> {
  const { default: JSZip } = await import('jszip')

  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  // Collect slide files sorted numerically (slide1.xml, slide2.xml, …)
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10)
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10)
      return numA - numB
    })

  if (slideEntries.length === 0) {
    throw new Error('No slides found in the .pptx file. Make sure the file is a valid PowerPoint presentation.')
  }

  const slideTexts: string[] = []

  for (const [index, entry] of slideEntries.entries()) {
    const xml = await zip.files[entry].async('string')
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // <a:t> holds the actual text runs; join them with spaces,
    // separate paragraphs with newlines.
    const paragraphs = doc.querySelectorAll('sp > txBody, ph ~ txBody, txBody')
    const lines: string[] = []

    if (paragraphs.length > 0) {
      paragraphs.forEach((txBody) => {
        const paraNodes = txBody.querySelectorAll('p')
        paraNodes.forEach((p) => {
          const text = [...p.querySelectorAll('t')].map((t) => t.textContent ?? '').join('')
          const trimmed = text.trim()
          if (trimmed) lines.push(trimmed)
        })
      })
    } else {
      // Fallback: grab all <a:t> nodes directly
      doc.querySelectorAll('t').forEach((t) => {
        const trimmed = (t.textContent ?? '').trim()
        if (trimmed) lines.push(trimmed)
      })
    }

    if (lines.length > 0) {
      slideTexts.push(`[Slide ${index + 1}]\n${lines.join('\n')}`)
    }
  }

  return {
    text: slideTexts.join('\n\n'),
    pageCount: slideEntries.length,
    fileName: file.name,
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────
// Uses pdf.js to extract the text layer from each page.

async function parsePdf(file: File): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist')

  // Point the worker at the bundled file via Vite's ?url import helper.
  // This avoids a cross-origin worker error in the browser.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    if (lines) pageTexts.push(`[Page ${i}]\n${lines}`)
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount: pdf.numPages,
    fileName: file.name,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const SUPPORTED = ['.pptx', '.pdf']

export async function parseSlideFile(file: File): Promise<ParseResult> {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')

  if (!SUPPORTED.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Please upload a .pptx or .pdf file.`,
    )
  }

  if (ext === '.pptx') return parsePptx(file)
  return parsePdf(file)
}

export function fileNameToTopic(fileName: string): string {
  return fileName
    .replace(/\.(pptx?|pdf)$/i, '')  // strip extension
    .replace(/[-_]/g, ' ')            // underscores/dashes → spaces
    .replace(/\s+/g, ' ')
    .trim()
}
