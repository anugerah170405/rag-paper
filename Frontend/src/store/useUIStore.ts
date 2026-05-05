import { create } from 'zustand'

type UIStore = {
  isSidebarOpen: boolean
  isChatOpen: boolean
  isLoginOpen: boolean
  isSearchOpen: boolean
  isUploadOpen: boolean
  toggleSidebar: () => void
  toggleChat: () => void
  togleLogin: () => void
  togleSearch: () => void
  togleUpload: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  isChatOpen: true,
  isLoginOpen: false,
  isSearchOpen: false,
  isUploadOpen: false,

  toggleSidebar: () =>
    set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  toggleChat: () =>
    set((s) => ({ isChatOpen: !s.isChatOpen })),

  togleLogin: () =>
    set((s) => ({ isLoginOpen: !s.isLoginOpen })),

  togleSearch: () =>
    set((s) => ({ isSearchOpen: !s.isSearchOpen })),

  togleUpload: () =>
    set((s) => ({ isUploadOpen: !s.isUploadOpen })),
}))