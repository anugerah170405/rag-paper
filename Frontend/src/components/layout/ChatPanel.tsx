import { useUIStore } from '@/store/useUIStore'
import { SidebarOpen, SendIcon } from 'lucide-react'
import Button from '../ui/Buttons'
import { useState, useRef, useEffect } from 'react'
import { api, getPaperDisplayTitle } from '@/lib/api'
import { usePaperStore } from '@/store/usePaperStore'

type Message = {
  id: number
  role: 'user' | 'ai'
  text: string
}

function createInitialMessages(paperTitle?: string): Message[] {
  return [
    {
      id: 1,
      role: 'ai',
      text: paperTitle
        ? `Tanya apa saja tentang "${paperTitle}". Saya akan menjawab berdasarkan isi PDF ini.`
        : 'Ask something about this paper. Upload a PDF first, then I will answer based on that file.',
    },
  ]
}

function RichTextBubble({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [isClamped, setIsClamped] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setIsClamped(el.scrollHeight > el.clientHeight)
  }, [text])

  return (
    <div className="min-w-0 overflow-hidden">
      <div
        ref={ref}
        className="text-sm text-[var(--text-h)] leading-relaxed whitespace-pre-wrap break-words min-w-0"
        style={
          expanded
            ? undefined
            : {
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }
        }
      >
        {text}
      </div>
      {(isClamped || expanded) && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="mt-1 text-xs text-[var(--accent)] border-none bg-transparent cursor-pointer p-0"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

export default function ChatPanel() {
  const { isChatOpen, toggleChat } = useUIStore()
  const selectedPaperId = usePaperStore(state => state.selectedPaperId)
  const selectedPaperDetail = usePaperStore(state => state.selectedPaperDetail)
  const paperTitle = selectedPaperDetail?.paper ? getPaperDisplayTitle(selectedPaperDetail.paper) : ''
  const [messages, setMessages] = useState<Message[]>(createInitialMessages())
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    setSessionId(null)
    setMessages(createInitialMessages(paperTitle))
  }, [paperTitle, selectedPaperId])

  useEffect(() => {
    const focusChatInput = () => textareaRef.current?.focus()
    window.addEventListener('paper-rag-focus-chat', focusChatInput)
    return () => {
      window.removeEventListener('paper-rag-focus-chat', focusChatInput)
    }
  }, [])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const paperId = selectedPaperId
    const userMsg: Message = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setIsTyping(true)

    if (!paperId) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: 'Upload PDF dulu agar saya punya paper untuk dibaca.' },
      ])
      setIsTyping(false)
      return
    }

    try {
      const result = await api.chat(paperId, trimmed, sessionId)
      setSessionId(result.session_id)
      const answerHasSources = /sumber\s*:/i.test(result.answer)
      const sourceText = result.sources?.length
        ? `\n\nSumber: ${result.sources.slice(0, 3).map(source => `hal. ${source.page_number}`).join(', ')}`
        : ''

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: answerHasSources ? result.answer : `${result.answer}${sourceText}` },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: err instanceof Error ? err.message : 'AI gagal menjawab',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div
      className="h-full flex flex-col flex-shrink-0 bg-[var(--bg-alt)] overflow-hidden transition-[width] duration-300"
      style={{
        width: isChatOpen ? 320 : 0,
        minWidth: isChatOpen ? 320 : 0,
        borderLeft: isChatOpen ? '1px solid var(--border)' : 'none',
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
        <button
          onClick={toggleChat}
          className="sidebar-icon-btn p-1 rounded-md border-none bg-transparent cursor-pointer text-[var(--text)] flex"
        >
          <SidebarOpen size={15} />
        </button>

        <span className="text-sm font-medium text-[var(--text-h)]">Chat Paper</span>

        <div className="w-6" />
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
        {messages.map(msg => (
          msg.role === 'ai' ? (
            <div
              key={msg.id}
              className="text-sm max-w-[85%] self-start bg-[var(--bg)] border border-[var(--border)] rounded-[16px_16px_16px_4px] px-3.5 py-2.5"
            >
              <RichTextBubble text={msg.text} />
            </div>
          ) : (
            <div key={msg.id} className="flex justify-end">
              <div className="text-sm max-w-[85%] bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] rounded-[16px_16px_4px_16px] px-3.5 py-2 leading-relaxed">
                {msg.text}
              </div>
            </div>
          )
        ))}

        {isTyping && (
          <div className="max-w-[85%] self-start bg-[var(--bg)] border border-[var(--border)] rounded-[16px_16px_16px_4px] px-3.5 py-2.5 flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--text)] inline-block"
                style={{
                  animation: 'bounce 1.2s infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="px-3 py-3 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex items-start gap-2 border border-[var(--border)] rounded-2xl px-3 py-2 bg-[var(--bg)]">
          <textarea
            ref={textareaRef}
            placeholder="Ask something about this paper"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 outline-none text-sm bg-transparent resize-none leading-5 text-[var(--text-h)] border-none font-[inherit] p-0"
            style={{ maxHeight: 80 }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 80) + 'px'
            }}
          />
          <Button
            size="sm"
            variant="primary"
            leftIcon={<SendIcon size={16} />}
            onClick={handleSend}
            className="shrink-0"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text)] text-center">
          Enter to send · Shift+Enter new line
        </p>
      </div>
    </div>
  )
}