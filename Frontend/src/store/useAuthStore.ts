import { create } from 'zustand'
import { clearStoredUser, clearToken, getStoredUser, setStoredUser, type AuthUser } from '@/lib/api'

type AuthStore = {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: getStoredUser(),
  setUser: (user) => {
    setStoredUser(user)
    set({ user })
  },
  logout: () => {
    clearToken()
    clearStoredUser()
    set({ user: null })
  },
}))
