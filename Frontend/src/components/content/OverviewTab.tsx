import { Book, BookOpen, Cpu, ExternalLink, Eye, FileText, Paperclip } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, getPaperDisplayTitle } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'

const summaryModes = [
  { key: 'tldr', icon: <Paperclip size={18}/>, label: 'TL;DR', sub: '3-5 sentences' },
  { key: 'beginner', icon: <Book size={18}/>, label: 'For Beginners', sub: 'Easy to understand' },
  { key: 'researcher', icon: <Cpu size={18}/>, label: 'For Researchers', sub: 'Technical summary' },
  { key: 'detailed', icon: <BookOpen size={18}/>, label: 'Detailed', sub: 'Section by section' },
] as const

const fallbackSummary = 'Pilih atau upload PDF terlebih dahulu. Setelah paper aktif dipilih, AI Summary akan dibuat berdasarkan isi PDF tersebut.'

function splitAbstractKeys(value?: string | null) {
  return (value || '')
    .replace(/^(keywords?|key words?|index terms?|kata kunci)\s*[:.;-]?\s*/i, '')
    .split(/[,;•\n]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export default function OverviewTab() {
  const selectedPaperDetail = usePaperStore(state => state.selectedPaperDetail)
  const paper = selectedPaperDetail?.paper
  const [activeMode, setActiveMode] = useState<'tldr' | 'beginner' | 'researcher' | 'detailed'>('tldr')
  const [summary, setSummary] = useState(fallbackSummary)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const displayTitle = getPaperDisplayTitle(paper)
  const abstractKeys = splitAbstractKeys(selectedPaperDetail?.sections?.keywords)

  useEffect(() => {
    if (!paper?.id) {
      setSummary(fallbackSummary)
      return
    }

    let active = true
    setLoading(true)
    setError('')
    api.summary(paper.id, activeMode)
      .then(result => {
        if (active) {
          setSummary(result.summary)
        }
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal membuat summary')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [paper?.id, activeMode])

  const handlePreview = async () => {
    if (!paper?.id) {
      setPreviewError('Pilih paper terlebih dahulu')
      return
    }

    setPreviewError('')
    setPreviewLoading(true)
    try {
      await api.openPaperPreview(paper.id)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Gagal membuka preview PDF')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-6"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-2 overflow-auto">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!paper?.id || previewLoading}
            className="group flex-shrink-0 w-28 h-36 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, var(--bg-alt), var(--bg))',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <span
              className="w-12 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              <FileText size={26} />
            </span>
            <span className="font-semibold" style={{ color: 'var(--text-h)' }}>
              {previewLoading ? 'Opening...' : 'Preview PDF'}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text)' }}>
              <Eye size={11} />
              {paper?.page_count ? `${paper.page_count} pages` : 'Open file'}
            </span>
          </button>

          <div className="flex-1 min-w-0">
            
            <div className="flex flex-col gap-1 text-sm mb-3" style={{ color: 'var(--text)' }}>
              <p className="m-0">
                <span className="font-semibold" style={{ color: 'var(--text-h)' }}>Authors</span>{' '}
                {paper?.authors || 'Unknown'}
              </p>
              <p className="m-0">
                <span className="font-semibold" style={{ color: 'var(--text-h)' }}>Journal:</span>{' '}
                {paper?.journal || 'Not available'}
              </p>
              <p className="m-0">
                <span className="font-semibold" style={{ color: 'var(--text-h)' }}>DOI:</span>{' '}
                {paper?.doi || 'Not available'}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm mb-4 flex-wrap" style={{ color: 'var(--text)' }}>
              <span><span className="font-semibold" style={{ color: 'var(--text-h)' }}>Published:</span> {paper?.published_date || 'Not available'}</span>
              <span><span className="font-semibold" style={{ color: 'var(--text-h)' }}>Pages:</span> {paper?.page_count || 0}</span>
              <span><span className="font-semibold" style={{ color: 'var(--text-h)' }}>File:</span> {paper?.original_filename || 'PDF'}</span>
            </div>

            <div className="mb-3">
              <p className="m-0 mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text)' }}>
                Abstract Key
              </p>
              <div className="flex flex-wrap gap-1.5">
                {abstractKeys.length > 0 ? (
                  abstractKeys.map(key => (
                    <span
                      key={key}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                      title={key}
                    >
                      {key.length > 42 ? `${key.slice(0, 42)}...` : key}
                    </span>
                  ))
                ) : (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    Tidak ada abstract key
                  </span>
                )}
              </div>
            </div>

            {previewError && (
              <p className="m-0 mt-3 text-xs font-semibold" style={{ color: '#b42318' }}>
                {previewError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <p className="text-sm font-bold mb-4 m-0 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          ✦ AI Summary
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {summaryModes.map(mode => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 active:scale-[0.98]"
              style={{
                border: `1px solid ${activeMode === mode.key ? 'var(--accent)' : 'var(--border)'}`,
                background: activeMode === mode.key ? 'var(--accent-bg)' : 'transparent',
                color: activeMode === mode.key ? 'var(--accent)' : 'var(--text)',
              }}
            >
              <span className="text-sm mb-0.5">{mode.icon}</span>
              <span className="text-sm font-semibold leading-tight" style={{ color: activeMode === mode.key ? 'var(--accent)' : 'var(--text-h)' }}>
                {mode.label}
              </span>
              <span className="text-xs leading-tight" style={{ color: 'var(--text)' }}>{mode.sub}</span>
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: 'var(--bg-alt)', color: error ? '#b42318' : 'var(--text-h)' }}
        >
          {loading ? 'Generating summary...' : error || summary}
        </div>
      </div>
    </div>
  )
}
