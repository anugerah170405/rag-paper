import { create } from 'zustand'
import { api, clearActivePaperId, getActivePaperId, setActivePaperId, type Paper, type PaperDetail } from '@/lib/api'

type PaperStore = {
  papers: Paper[]
  selectedPaperId: number | null
  selectedPaperDetail: PaperDetail | null
  loading: boolean
  error: string
  loadPapers: () => Promise<void>
  selectPaper: (paperId: number) => Promise<void>
  useImportedPaper: (paper: Paper) => Promise<void>
  deletePaper: (paperId: number) => Promise<void>
  clearPapers: () => void
}

export const usePaperStore = create<PaperStore>((set, get) => ({
  papers: [],
  selectedPaperId: getActivePaperId(),
  selectedPaperDetail: null,
  loading: false,
  error: '',

  loadPapers: async () => {
    set({ loading: true, error: '' })
    try {
      const papers = await api.listPapers()
      const savedPaperId = getActivePaperId()
      const firstPaperId = papers[0]?.id ?? null
      const selectedPaperId = savedPaperId && papers.some(paper => paper.id === savedPaperId)
        ? savedPaperId
        : firstPaperId

      set({ papers, selectedPaperId })

      if (selectedPaperId) {
        await get().selectPaper(selectedPaperId)
      } else {
        set({ selectedPaperDetail: null })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load papers' })
    } finally {
      set({ loading: false })
    }
  },

  selectPaper: async (paperId: number) => {
    setActivePaperId(paperId)
    set({ selectedPaperId: paperId, loading: true, error: '' })
    try {
      const selectedPaperDetail = await api.getPaper(paperId)
      set({ selectedPaperDetail })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load selected paper' })
    } finally {
      set({ loading: false })
    }
  },

  useImportedPaper: async (paper: Paper) => {
    setActivePaperId(paper.id)
    set(state => ({
      papers: [paper, ...state.papers.filter(item => item.id !== paper.id)],
      selectedPaperId: paper.id,
    }))
    await get().selectPaper(paper.id)
  },

  deletePaper: async (paperId: number) => {
    set({ loading: true, error: '' })
    try {
      await api.deletePaper(paperId)
      const remaining = get().papers.filter(paper => paper.id !== paperId)
      const nextPaperId = get().selectedPaperId === paperId ? remaining[0]?.id ?? null : get().selectedPaperId

      set({
        papers: remaining,
        selectedPaperId: nextPaperId,
        selectedPaperDetail: get().selectedPaperId === paperId ? null : get().selectedPaperDetail,
      })

      if (nextPaperId) {
        await get().selectPaper(nextPaperId)
      } else {
        clearActivePaperId()
        set({ selectedPaperDetail: null })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete paper' })
    } finally {
      set({ loading: false })
    }
  },

  clearPapers: () => {
    clearActivePaperId()
    set({
      papers: [],
      selectedPaperId: null,
      selectedPaperDetail: null,
      loading: false,
      error: '',
    })
  },
}))
