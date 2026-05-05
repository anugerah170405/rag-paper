import { useUIStore } from '@/store/useUIStore'
import { useEffect } from 'react'
import { getToken } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'
// tambah import
import ThemeToggle from '../ThemeToggle'
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/Tabs'
import {
    BarChart3,
    CheckCircle2,
    Eye,
    FileText,
    FlaskConical,
    MessageCircle,
    PlusCircle,
    FileSearch,
} from 'lucide-react'
import Button from '../ui/Buttons'
import OverviewTab from '../content/OverviewTab'
import AbstractTab from '../content/AbstractTab'
import MethodologyTab from '../content/MethodologyTab'
import Results from '../content/Results'
import ConclusionTab from '../content/ConclusionTab'


// ─── Dummy state: ganti ke false buat liat empty state ───
const DUMMY_PAPER = {
    title: 'Deep Learning for Natural Language Processing: A Comprehensive Survey',
    authors: 'Zhang, L., Wang, S., Liu, B.',
    journal: 'Journal of Machine Learning Research (2023)',
    doi: '10.1000/example.2023.001',
    published: 'May 5, 2023',
    pages: 64,
    citations: 124,
    tags: ['NLP', 'Deep Learning', 'Transformers', 'Machine Translation', 'Pre-training', 'BERT', 'GPT'],
    abstract: `Natural Language Processing (NLP) has witnessed remarkable progress with the advent of deep learning techniques. This comprehensive survey examines the evolution of NLP from traditional statistical methods to modern neural network architectures. We analyze key breakthroughs including word embeddings, recurrent neural networks, attention mechanisms, and transformer-based models. The paper discusses applications across machine translation, sentiment analysis, question answering, and text generation. We also address current challenges including data efficiency, multilingual processing, and interpretability. Our findings suggest that while transformer architectures have achieved state-of-the-art results, there remains significant room for improvement in low-resource languages and domain adaptation.`,
    aiSummary: `This comprehensive survey examines deep learning advancements in NLP from 2015–2023. Transformer models significantly outperform earlier architectures across tasks like translation and question answering, but challenges remain in low-resource languages, computational efficiency, and interpretability. Future work should prioritize parameter-efficient designs and cross-lingual capabilities.`,
}

const AI_SUMMARY_MODES = [
    { key: 'tldr', label: 'TL;DR', sub: '3-5 sentences' },
    { key: 'beginners', label: 'For Beginners', sub: 'Easy to understand' },
    { key: 'researchers', label: 'For Researchers', sub: 'Technical summary' },
    { key: 'detailed', label: 'Detailed', sub: 'Section by section' },
]

void DUMMY_PAPER
void AI_SUMMARY_MODES

// ─── Empty State (muncul di semua tab kalau belum ada paper) ───
function EmptyState({ onAddPaper }: { onAddPaper: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-alt)' }}
            >
                <FileSearch size={32} strokeWidth={1} />
            </div>

            <div className="flex flex-col gap-1.5">
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>
                    No paper imported yet
                </p>
                <p style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>
                    Import a PDF or paste a link to get started
                </p>
            </div>

            <Button
                variant='secondary'
                size='sm'
                leftIcon={<PlusCircle size={16} />}
                onClick={onAddPaper}
                className="flex items-center gap-2 font-medium transition-opacity hover:opacity-80 w-auto"

            >
                Add New Paper
            </Button>
        </div>
    )
}


// ─── Main Panel ───
export default function MainPanel() {
    const { isChatOpen, toggleChat, togleUpload } = useUIStore()
    const { papers, selectedPaperDetail, loading, loadPapers } = usePaperStore()
    const hasPaper = Boolean(selectedPaperDetail || papers.length)

    useEffect(() => {
        if (getToken()) {
            void loadPapers()
        }
    }, [loadPapers])

    return (
        <main className="w-full h-full flex-1 overflow-auto flex flex-col">
            <Tabs defaultValue="overview">

                {/* TOP BAR */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid var(--border)',
                    padding: '8px 12px', flexShrink: 0
                }}>
                    <div className="flex-1 min-w-0 flex justify-start">
                        <TabsList className="flex gap-1 w-fit">
                            <TabsTrigger value="overview" leftIcon={<Eye size={14} />}>Overview</TabsTrigger>
                            <TabsTrigger value="abstract" leftIcon={<FileText size={14} />}>Abstract</TabsTrigger>
                            <TabsTrigger value="methodology" leftIcon={<FlaskConical size={14} />}>Methodology</TabsTrigger>
                            <TabsTrigger value="result" leftIcon={<BarChart3 size={14} />}>Results</TabsTrigger>
                            <TabsTrigger value="conclusion" leftIcon={<CheckCircle2 size={14} />}>Conclusion</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* kanan: Chat + ThemeToggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {!isChatOpen && (
                            <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<MessageCircle size={16} />}
                                onClick={toggleChat}
                                className="whitespace-nowrap w-auto"
                            >

                            </Button>
                        )}
                        <ThemeToggle />
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-auto p-4 justify-end">
                    {loading && !selectedPaperDetail ? (
                        <p style={{ color: 'var(--text)', fontSize: 14 }}>Loading paper...</p>
                    ) : !hasPaper ? (
                        // Tampil di semua tab kalau belum ada paper
                        <EmptyState onAddPaper={togleUpload} />
                    ) : (
                        <>
                            <TabsContent value="overview">
                                <OverviewTab />
                            </TabsContent>
                            <TabsContent value="abstract">
                                <AbstractTab />
                            </TabsContent>
                            <TabsContent value="methodology">
                                <MethodologyTab />
                            </TabsContent>
                            <TabsContent value="result">
                                <Results />
                            </TabsContent>
                            <TabsContent value="conclusion">
                                <ConclusionTab />
                            </TabsContent>
                        </>
                    )}
                </div>

            </Tabs>
        </main>
    )
}
