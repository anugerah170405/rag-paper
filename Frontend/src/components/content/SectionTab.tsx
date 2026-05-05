import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, FileText, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'

type SectionKey = 'abstract' | 'methodology' | 'results' | 'conclusion'

type SectionTabProps = {
  title: string
  sectionKey: SectionKey
}

type TextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

const missingMessage = 'Section ini belum terdeteksi dari PDF. Kamu tetap bisa bertanya lewat Chat Paper.'

function cleanSectionText(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/\u0000/g, ' ')
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function removeRepeatedHeading(value: string, title: string) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value.replace(new RegExp(`^\\s*(?:${escapedTitle})\\s*[:\\-.]?\\s*`, 'i'), '').trim()
}

function isListLine(value: string) {
  return /^([-*]|[0-9]+[.)]|[a-z][.)])\s+/i.test(value.trim())
}

function stripListMarker(value: string) {
  return value.trim().replace(/^([-*]|[0-9]+[.)]|[a-z][.)])\s+/i, '').trim()
}

function looksLikeHeading(value: string) {
  const text = value.trim()
  return (
    text.length <= 80
    && !/[.!?]$/.test(text)
    && (/^#{1,4}\s+/.test(text) || /^[A-Z][A-Za-z0-9\s:/()-]+$/.test(text))
  )
}

function normalizeHeading(value: string) {
  return value.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').trim()
}

function splitLongParagraph(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(sentence => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 1 || text.length < 650) {
    return [text]
  }

  const paragraphs: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length > 520 && current) {
      paragraphs.push(current.trim())
      current = sentence
    } else {
      current = `${current} ${sentence}`.trim()
    }
  }
  if (current) paragraphs.push(current.trim())
  return paragraphs
}

function buildReadableBlocks(rawContent: string, title: string): TextBlock[] {
  const cleaned = removeRepeatedHeading(cleanSectionText(rawContent), title)
  if (!cleaned) return []

  const blocks: TextBlock[] = []
  const groups = cleaned.split(/\n\s*\n/).map(group => group.trim()).filter(Boolean)

  for (const group of groups) {
    const lines = group.split('\n').map(line => line.trim()).filter(Boolean)

    if (lines.length === 1 && looksLikeHeading(lines[0])) {
      blocks.push({ type: 'heading', text: normalizeHeading(lines[0]) })
      continue
    }

    if (lines.length > 1 && lines.every(isListLine)) {
      blocks.push({ type: 'list', items: lines.map(stripListMarker).filter(Boolean) })
      continue
    }

    const listItems = lines.filter(isListLine).map(stripListMarker).filter(Boolean)
    const paragraphLines = lines.filter(line => !isListLine(line))

    if (paragraphLines.length > 0) {
      const paragraph = paragraphLines.join(' ').replace(/\s+/g, ' ').trim()
      for (const item of splitLongParagraph(paragraph)) {
        blocks.push({ type: 'paragraph', text: item })
      }
    }

    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems })
    }
  }

  return blocks
}

function renderBlocks(blocks: TextBlock[]) {
  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      return (
        <h3
          key={`${block.type}-${index}`}
          className="text-sm font-bold m-0 pt-1"
          style={{ color: 'var(--accent)' }}
        >
          {block.text}
        </h3>
      )
    }

    if (block.type === 'paragraph') {
      return (
        <p
          key={`${block.type}-${index}`}
          className="text-sm leading-7 m-0"
          style={{ color: 'var(--text-h)' }}
        >
          {block.text}
        </p>
      )
    }

    return (
      <ul
        key={`${block.type}-${index}`}
        className="m-0 pl-0 flex flex-col gap-2"
        style={{ listStyle: 'none' }}
      >
        {block.items.map((item, itemIndex) => (
          <li
            key={`${item}-${itemIndex}`}
            className="text-sm leading-7 flex gap-2"
            style={{ color: 'var(--text-h)' }}
          >
            <span
              className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  })
}

export default function SectionTab({ title, sectionKey }: SectionTabProps) {
  const [copied, setCopied] = useState(false)
  const [aiClean, setAiClean] = useState('')
  const [aiUsed, setAiUsed] = useState<boolean | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiError, setAiError] = useState('')
  const selectedPaperId = usePaperStore(state => state.selectedPaperId)
  const selectedPaperDetail = usePaperStore(state => state.selectedPaperDetail)
  const rawContent = selectedPaperDetail?.sections?.[sectionKey] || ''
  const hasContent = Boolean(rawContent.trim())
  const localClean = useMemo(
    () => (hasContent ? cleanSectionText(rawContent) : missingMessage),
    [hasContent, rawContent],
  )
  const activeContent = aiClean || localClean
  const blocks = buildReadableBlocks(activeContent, title)

  useEffect(() => {
    setAiClean('')
    setAiUsed(null)
    setAiError('')
  }, [selectedPaperId, sectionKey])

  useEffect(() => {
    if (!selectedPaperId || !hasContent || aiClean) {
      return
    }

    let active = true
    setLoadingAi(true)
    setAiError('')

    api.cleanSection(selectedPaperId, sectionKey)
      .then(result => {
        if (!active) return
        setAiClean(result.cleaned)
        setAiUsed(result.ai_used)
      })
      .catch(err => {
        if (!active) return
        setAiError(err instanceof Error ? err.message : 'Gagal membuat AI Clean')
      })
      .finally(() => {
        if (active) setLoadingAi(false)
      })

    return () => {
      active = false
    }
  }, [aiClean, hasContent, sectionKey, selectedPaperId])

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
          >
            <FileText size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold m-0" style={{ color: 'var(--text-h)' }}>
              {title}
            </p>
            <p className="text-xs m-0 mt-1 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
              <Sparkles size={12} />
              AI Clean
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          title="Copy section"
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 hover:opacity-70 active:scale-95"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {copied ? <Check size={13} style={{ color: 'var(--accent)' }} /> : <Copy size={13} />}
        </button>
      </div>

      {!hasContent ? (
        <div
          className="rounded-2xl px-4 py-5 text-sm leading-relaxed"
          style={{ background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          {missingMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {loadingAi && (
            <div className="text-sm" style={{ color: 'var(--text)' }}>
              Membuat AI Clean berdasarkan isi PDF...
            </div>
          )}

          {aiError && (
            <div className="text-xs" style={{ color: '#b42318' }}>
              {aiError}
            </div>
          )}

          {aiClean && aiUsed === false && (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{ color: 'var(--text)', background: 'var(--bg-alt)', border: '1px solid var(--border)' }}
            >
              Gemini sedang tidak tersedia, jadi section ini dirapikan lokal berdasarkan teks PDF.
            </div>
          )}

          {renderBlocks(blocks)}
        </div>
      )}
    </div>
  )
}
