import { useUIStore } from '@/store/useUIStore'
import { PaperLogo } from './PaperLogo'
import {
  LogOut,
  MoreHorizontal,
  PlusCircle,
  Search,
  SidebarClose,
  Trash2,
} from 'lucide-react'
import { useEffect } from 'react'
import AuthModal from '../modal/AuthModal'
import SearchModal from '../modal/SearchModal'
import UploadModal from '../modal/UploadModal'
import { api, getPaperDisplayTitle, getToken } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { usePaperStore } from '@/store/usePaperStore'
import Button from '../ui/Buttons'

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUIStore()
  const { togleLogin, isLoginOpen } = useUIStore()
  const { togleSearch, isSearchOpen } = useUIStore()
  const { togleUpload, isUploadOpen } = useUIStore()
  const { papers, selectedPaperId, loading, error, loadPapers, selectPaper, deletePaper, clearPapers } = usePaperStore()
  const user = useAuthStore(state => state.user)
  const setUser = useAuthStore(state => state.setUser)
  const logout = useAuthStore(state => state.logout)
  const isCollapsed = !isSidebarOpen
  const accountName = user?.username || 'User Account'
  const accountInitials = accountName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'PR'

  const handleLogout = () => {
    logout()
    clearPapers()
  }

  const handleDeletePaper = (paperId: number, paperTitle: string) => {
    const confirmed = window.confirm(`Hapus paper "${paperTitle}" dari database dan file upload?`)
    if (confirmed) {
      void deletePaper(paperId)
    }
  }

  useEffect(() => {
    if (getToken()) {
      void loadPapers()
      if (!user) {
        void api.me().then(setUser).catch(() => undefined)
      }
    }
  }, [loadPapers, setUser, user])

  return (
    <>
      <SearchModal isOpen={isSearchOpen} onClose={togleSearch} />
      <AuthModal isOpen={isLoginOpen} onClose={togleLogin} defaultMode="login" />
      <UploadModal isOpen={isUploadOpen} onClose={togleUpload} />

      <aside
        className={`
          h-full border-r border-[var(--border)] bg-[var(--bg-alt)]
          flex flex-col flex-shrink-0 transition-[width] duration-300
          ${isSidebarOpen ? 'w-60' : 'w-16'}
        `}
      >
        {/* TOP */}
        <div className="p-3 flex flex-col gap-3">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={isCollapsed ? toggleSidebar : undefined}
                className="sidebar-icon-btn w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer"
              >
                <PaperLogo />
              </button>
              {isSidebarOpen && (
                <span className="font-semibold text-md text-[var(--text-h)]">Paper</span>
              )}
            </div>
            {isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="sidebar-icon-btn p-1 rounded-md border-none bg-transparent cursor-pointer text-[var(--text)] flex"
              >
                <SidebarClose size={15} />
              </button>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col gap-1">
            <Button
              onClick={togleUpload}
              variant="secondary"
              className={`w-full flex items-center ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
              leftIcon={<PlusCircle size={16} className="flex-shrink-0" />}
            >
              {isSidebarOpen && 'Add new paper'}
            </Button>

            <Button
              onClick={togleSearch}
              variant="ghost"
              className={`w-full flex items-center ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
              leftIcon={<Search size={16} className="flex-shrink-0" />}
            >
              {isSidebarOpen && 'Search Something'}
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 px-2 overflow-y-auto">
          {isSidebarOpen && (
            <>
              <p className="text-sm text-[var(--text)] font-medium px-1.5 mb-1.5 mt-0">
                Your research
              </p>
              <div className="flex flex-col gap-0.5">
                {loading && papers.length === 0 && (
                  <p className="text-[var(--text)] text-sm px-2">Loading...</p>
                )}
                {error && (
                  <p className="text-[#b42318] text-xs px-2">{error}</p>
                )}
                {!loading && papers.length === 0 && !error && (
                  <p className="text-[var(--text)] text-xs px-2"></p>
                )}
                {papers.map(item => {
                  const active = item.id === selectedPaperId
                  const title = getPaperDisplayTitle(item)
                  return (
                    <div
                      key={item.id}
                      className={`sidebar-btn flex items-center gap-1 rounded-lg px-2 py-1.5 ${active ? 'sidebar-btn-active text-[var(--accent)] text-sm' : 'text-[var(--text-h)] text-sm'}`}
                    >
                      <button
                        type="button"
                        onClick={() => void selectPaper(item.id)}
                        title={title}
                        className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-left border-none bg-transparent text-inherit cursor-pointer text-sm"
                      >
                        {title}
                      </button>
                      
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation()
                          handleDeletePaper(item.id, title)
                        }}
                        title="Delete paper"
                        className="w-6 h-6 rounded-[7px] border border-[var(--border)] bg-transparent text-[var(--text)] inline-flex items-center justify-center cursor-pointer flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
            </div>
          )}
        </div>

        {/* BOTTOM */}
        <div className="border-t border-[var(--border)] p-2.5">
          {isSidebarOpen ? (
            <div
              className={`sidebar-btn flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm border-none transition-colors duration-150 bg-transparent text-[var(--text-h)] justify-start ${!user ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={!user ? togleLogin : undefined}
              title={user ? user.email : 'Login'}
            >
              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center flex-shrink-0 bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-bold">
                {accountInitials}
              </span>
              <span className="flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap">
                {accountName}
              </span>
              {user ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    handleLogout()
                  }}
                  title="Logout"
                  className="w-7 h-7 rounded-lg border border-[var(--border)] bg-transparent text-[var(--text)] inline-flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <MoreHorizontal size={14} className="text-[var(--text)] flex-shrink-0" />
              )}
            </div>
          ) : (
            <button
              onClick={!user ? togleLogin : undefined}
              title={user ? user.email : 'Login'}
              className={`sidebar-btn w-9 h-9 rounded-full flex items-center justify-center border-none bg-transparent mx-auto ${!user ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-bold">
                {accountInitials}
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}