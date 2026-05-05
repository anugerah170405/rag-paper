const API_BASE_URL = 'http://127.0.0.1:8001'
const TOKEN_KEY = 'paper_rag_token'
const ACTIVE_PAPER_KEY = 'paper_rag_active_paper_id'
const USER_KEY = 'paper_rag_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export type AuthUser = {
  id: number
  username: string
  email: string
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
}

export function getActivePaperId() {
  const value = localStorage.getItem(ACTIVE_PAPER_KEY)
  return value ? Number(value) : null
}

export function setActivePaperId(id: number) {
  localStorage.setItem(ACTIVE_PAPER_KEY, String(id))
}

export function clearActivePaperId() {
  localStorage.removeItem(ACTIVE_PAPER_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    // FastAPI 422 - validation error (array of field errors)
    if (Array.isArray(error.detail)) {
      const messages = error.detail.map((e: any) => {
        const field = e.loc?.slice(-1)[0] ?? 'input'
        const msg = e.msg ?? 'tidak valid'
        return `${field}: ${msg}`
      }).join(', ')
      throw new Error(messages)
    }

    // FastAPI string error (401, 409, 400, dst)
    if (typeof error.detail === 'string') {
      throw new Error(error.detail)
    }

    // Fallback berdasarkan status code
    const fallbackMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Incorrect email or password.',
      403: 'Access denied.',
      404: 'Data not found.',
      409: 'Email is already registered.',
      413: 'File is too large (maximum 50 MB).',
      422: 'Invalid data format.',
      500: 'Server error. Please try again later.',
    }
    throw new Error(fallbackMessages[response.status] ?? `Terjadi kesalahan (${response.status}).`)
  }

  return response.json() as Promise<T>
}

export type AuthResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

export type Paper = {
  id: number
  title: string
  authors?: string | null
  journal?: string | null
  doi?: string | null
  published_date?: string | null
  page_count: number
  original_filename?: string | null
  file_size: number
  document_link?: string | null
  created_at?: string | null
}

export type PaperDetail = {
  paper: Paper
  sections: Record<string, string | null>
}

export type ImportResponse = {
  paper: Paper
  sections_created: number
  chunks_created: number
  embeddings_created?: number
  message: string
}

export type SummaryResponse = {
  paper_id: number
  mode: string
  summary: string
}

export type SectionCleanResponse = {
  paper_id: number
  section_type: string
  cleaned: string
  ai_used: boolean
}

export type ChatResponse = {
  session_id: number
  answer: string
  sources: Array<{
    chunk_id: number
    page_number: number
    retrieval?: string | null
    preview: string
  }>
}

function filenameWithoutExtension(filename?: string | null) {
  return filename ? filename.replace(/\.pdf$/i, '') : ''
}

function isPlaceholderTitle(title?: string | null) {
  const value = title?.trim().toLowerCase() || ''
  return (
    !value
    || value.includes('insert lesson')
    || value.includes('module or course title')
    || ['unknown', 'untitled', 'none', 'null', 'not available'].includes(value)
  )
}

export function getPaperDisplayTitle(paper?: Paper | null) {
  if (!paper) return 'No paper selected'

  const title = paper.title?.trim()
  const filenameTitle = filenameWithoutExtension(paper.original_filename)

  if (isPlaceholderTitle(title)) return filenameTitle || 'Untitled paper'
  if (title.toLowerCase() === 'materi sql' && filenameTitle) return filenameTitle

  return title
}

export const api = {
  health() {
    return request('/health')
  },

  register(data: { username: string; email: string; password: string }) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  login(data: { email: string; password: string }) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  me() {
    return request<AuthUser>('/auth/me')
  },

  listPapers() {
    return request<Paper[]>('/papers/')
  },

  searchPapers(query: string) {
    return request<Paper[]>(`/papers/search?query=${encodeURIComponent(query)}`)
  },

  getPaper(paperId: number) {
    return request<PaperDetail>(`/papers/${paperId}`)
  },

  deletePaper(paperId: number) {
    return request<{ status: string; paper_id: number }>(`/papers/${paperId}`, {
      method: 'DELETE',
    })
  },

  uploadPaper(data: { title: string; documentLink?: string; file?: File | null }) {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('document_link', data.documentLink || '')
    if (data.file) {
      formData.append('file', data.file)
    }

    return request<ImportResponse>('/papers/import', {
      method: 'POST',
      body: formData,
    })
  },

  summary(paperId: number, mode = 'tldr') {
    return request<SummaryResponse>(`/papers/${paperId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
  },

  cleanSection(paperId: number, sectionType: 'abstract' | 'methodology' | 'results' | 'conclusion') {
    return request<SectionCleanResponse>(`/papers/${paperId}/sections/${sectionType}/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  },

  chat(paperId: number, message: string, sessionId?: number | null) {
    return request<ChatResponse>(`/papers/${paperId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId || null,
        top_k: 10,
      }),
    })
  },

  async openPaperPreview(paperId: number) {
    const previewWindow = window.open('about:blank', '_blank')
    const token = getToken()
    const headers = new Headers()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (previewWindow) {
      previewWindow.document.title = 'Loading PDF preview'
      previewWindow.document.body.innerHTML = '<p style="font-family: sans-serif; padding: 24px;">Loading PDF preview...</p>'
    }

    try {
      const response = await fetch(`${API_BASE_URL}/papers/${paperId}/file`, { headers })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Preview failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (previewWindow) {
        previewWindow.location.replace(url)
      } else {
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      previewWindow?.close()
      throw error
    }
  },
}
