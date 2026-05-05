import { useState, useEffect, useRef } from 'react'
import { Clock3, FileText, Loader2, Search } from 'lucide-react'
import { api, getPaperDisplayTitle, getToken, type Paper } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'

interface SearchModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Paper[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const { papers, loadPapers, selectPaper } = usePaperStore()
    const visibleResults = query.trim() ? results : papers
    const hasToken = Boolean(getToken())

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50)
            if (getToken()) {
                void loadPapers()
            }
        } else {
            setQuery('')
            setResults([])
            setError('')
        }
    }, [isOpen, loadPapers])

    useEffect(() => {
        if (!isOpen) return

        const cleanQuery = query.trim()
        if (!cleanQuery) {
            setResults([])
            setLoading(false)
            setError('')
            return
        }

        const timer = window.setTimeout(() => {
            setLoading(true)
            setError('')
            api.searchPapers(cleanQuery)
                .then(setResults)
                .catch(err => setError(err instanceof Error ? err.message : 'Search gagal'))
                .finally(() => setLoading(false))
        }, 250)

        return () => window.clearTimeout(timer)
    }, [isOpen, query])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const handleSelectPaper = async (paperId: number) => {
        await selectPaper(paperId)
        onClose()
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && visibleResults[0]) {
            e.preventDefault()
            void handleSelectPaper(visibleResults[0].id)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
        >
            <div className="absolute inset-0" onClick={onClose} />

            <div
                className="relative w-full max-w-xl rounded-3xl overflow-hidden animate-fade-in"
                style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <div className="flex items-center gap-3 px-5 py-4">
                    <div
                        className="flex items-center gap-2 flex-1"
                        style={{
                            color: 'var(--text)',
                            background: 'var(--bg-alt)',
                            border: '1px solid var(--border)',
                            borderRadius: '999px',
                            padding: '10px 16px',
                        }}
                    >
                        <Search size={16} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Search Paper..."
                            className="flex-1 bg-transparent text-base outline-none placeholder:opacity-50"
                            style={{ color: 'var(--text-h)' }}
                        />
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border)' }} />

                <div className="px-5 py-5">
                    <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                        {query.trim() ? 'Search results' : 'Your papers'}
                    </p>

                    {!hasToken ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text)' }}>
                            Login dulu untuk mencari paper.
                        </p>
                    ) : loading ? (
                        <div className="flex items-center justify-center gap-2 py-5 text-sm" style={{ color: 'var(--text)' }}>
                            <Loader2 size={16} className="animate-spin" />
                            Searching...
                        </div>
                    ) : error ? (
                        <p className="text-sm text-center py-4" style={{ color: '#b42318' }}>
                            {error}
                        </p>
                    ) : visibleResults.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text)' }}>
                            Paper tidak ditemukan.
                        </p>
                    ) : (
                        <ul className="max-h-80 overflow-y-auto">
                            {visibleResults.map((paper, index) => (
                                <li key={paper.id}>
                                    <button
                                        className="w-full text-left px-3 py-3 rounded-xl text-sm transition-all hover:opacity-80"
                                        style={{ color: 'var(--text-h)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-alt)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => void handleSelectPaper(paper.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {query.trim() ? (
                                                <FileText size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                                            ) : (
                                                <Clock3 size={15} style={{ color: 'var(--text)', flexShrink: 0, marginTop: 2 }} />
                                            )}
                                            <div className="min-w-0">
                                                <p className="m-0 font-semibold truncate">
                                                    {getPaperDisplayTitle(paper)}
                                                </p>
                                                <p className="m-0 mt-1 text-xs truncate" style={{ color: 'var(--text)' }}>
                                                    {paper.original_filename || `${paper.page_count} pages`}
                                                    {index === 0 && query.trim() ? ' - press Enter to open' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.97) translateY(-8px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out both; }
            `}</style>
        </div>
    )
}
