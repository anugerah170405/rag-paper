import { useState, useRef } from 'react'
import { PlusCircle, Link, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'document' | 'links'>('document')
  const [isDragging, setIsDragging] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [title, setTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const useImportedPaper = usePaperStore(state => state.useImportedPaper)

  const getFileTitle = (file: File) => file.name.replace(/\.pdf$/i, '')
  const getLinkTitle = (link: string) => {
    try {
      const url = new URL(link)
      const filename = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
      return filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim()
    } catch {
      return ''
    }
  }

  const selectFile = (file: File) => {
    setSelectedFile(file)
    if (!title.trim() || title.trim().toLowerCase() === 'materi sql') {
      setTitle(getFileTitle(file))
    }
  }

  const resetForm = () => {
    setActiveTab('document')
    setIsDragging(false)
    setLinkValue('')
    setTitle('')
    setSelectedFile(null)
    setError('')
  }

  const closeModal = () => {
    resetForm()
    onClose()
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) selectFile(files[0])
  }

  const handleImport = async () => {
    setError('')
    const isDocumentImport = activeTab === 'document'
    const cleanLink = linkValue.trim()

    if (isDocumentImport && !selectedFile) {
      setError('Pilih file PDF dulu')
      return
    }

    if (!isDocumentImport && !cleanLink) {
      setError('Masukkan link PDF dulu')
      return
    }

    setLoading(true)
    try {
      const finalTitle = title.trim()
        || (selectedFile ? getFileTitle(selectedFile) : getLinkTitle(cleanLink))
      const result = await api.uploadPaper({
        title: finalTitle,
        documentLink: cleanLink,
        file: isDocumentImport ? selectedFile : null,
      })
      await useImportedPaper(result.paper)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={closeModal} />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl px-8 py-8 animate-fade-in overflow-hidden"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Close Button */}
        {/* <button
          onClick={onClose}
          style={{ color: 'var(--text)' }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
        >
          <X size={14} />
        </button> */}

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-h)' }}>
          Import Paper
        </h2>
        <p className="text-sm text-center mb-7" style={{ color: 'var(--text)' }}>
          Upload *.pdf document or links to continue.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-h)' }}>
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Otomatis mengikuti nama PDF"
            className="w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none transition-all placeholder:opacity-50"
            style={{
              background: 'var(--bg-alt)',
              borderColor: 'var(--border)',
              color: 'var(--text-h)',
            }}
          />
        </div>

        {/* Tab Toggle */}
        <div
          className="flex rounded-full p-1 mb-6"
          style={{ background: 'var(--bg-alt)' }}
        >
          {(['document', 'links'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
              style={{
                background: activeTab === tab ? 'var(--bg)' : 'transparent',
                color: activeTab === tab ? 'var(--text-h)' : 'var(--text)',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab === 'document' ? <PlusCircle size={13} /> : <Link size={13} />}
              {tab === 'document' ? 'Document' : 'Links'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'document' ? (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl p-10 mb-6 cursor-pointer transition-all duration-150"
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                background: isDragging ? 'var(--accent-bg)' : 'transparent',
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center rounded-xl"
                style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
              >
                <Upload size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm font-medium m-0 truncate max-w-[300px]" style={{ color: 'var(--accent)' }}>
                {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) {
                  selectFile(e.target.files[0])
                }
              }}
            />
          </>
        ) : (
          <div className="mb-6">
            <input
              type="url"
              placeholder="https://arxiv.org/abs/..."
              value={linkValue}
              onChange={e => setLinkValue(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none transition-all placeholder:opacity-50"
              style={{
                background: 'var(--bg-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text-h)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={closeModal}
            className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 hover:opacity-70"
            style={{ color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all duration-150 hover:opacity-80"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
        {error && <p className="text-center text-xs font-semibold mt-3" style={{ color: '#b42318' }}>{error}</p>}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.22s ease-out both; }
      `}</style>
    </div>
  )
}
