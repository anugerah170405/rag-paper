import { useState } from 'react'
import { api, setToken } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { usePaperStore } from '@/store/usePaperStore'
import { PaperLogo } from '../layout/PaperLogo'

type AuthMode = 'login' | 'signup'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    defaultMode?: AuthMode
}

// ─── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
        <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
)

// ─── Input Field ──────────────────────────────────────────────────────────────
interface InputFieldProps {
    label: string
    type?: string
    placeholder?: string
    value: string
    onChange: (v: string) => void
}

const InputField = ({ label, type = 'text', placeholder, value, onChange }: InputFieldProps) => (
    <div className="mb-4">
        <label style={{ color: 'var(--text-h)' }} className="block text-sm font-semibold mb-1.5">
            {label}
        </label>
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text)' }}>
                {type === 'password' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                )}
            </span>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    background: 'var(--bg-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-h)',
                }}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border text-sm focus:outline-none transition-all placeholder:opacity-50"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
        </div>
    </div>
)

// ─── Login Form ───────────────────────────────────────────────────────────────
interface LoginFormProps {
    onSwitchToSignup: () => void
    onClose: () => void
}

const LoginForm = ({ onSwitchToSignup, onClose }: LoginFormProps) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const loadPapers = usePaperStore(state => state.loadPapers)
    const setUser = useAuthStore(state => state.setUser)

    const handleLogin = async () => {
        setError('')
        setLoading(true)
        try {
            const result = await api.login({ email, password })
            setToken(result.access_token)
            setUser(result.user)
            await loadPapers()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-center mb-5">
                <PaperLogo size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-h)' }}>Login</h2>
            <p className="text-sm text-center mb-7" style={{ color: 'var(--text)' }}>
                Welcome back, please login to continue
            </p>

            <InputField label="Username" type="email" placeholder="example@gmail.com" value={email} onChange={setEmail} />
            <InputField label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />

            <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                className="w-full mt-2 py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all duration-150 hover:opacity-80"
            >
                {loading ? 'Loading...' : 'Login'}
            </button>
            {error && <p className="text-center text-xs font-semibold mt-3" style={{ color: '#b42318' }}>{error}</p>}

            <p className="text-center text-sm font-semibold mt-5" style={{ color: 'var(--text-h)' }}>
                Don't have account yet?{' '}
                <button onClick={onSwitchToSignup} style={{ color: 'var(--accent)' }} className="hover:underline font-bold">
                    Sign UP
                </button>
            </p>

            <button
                type="button"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                className="mt-4 w-full flex items-center justify-center gap-2.5 py-2.5 rounded-2xl border text-sm font-medium active:scale-[0.98] transition-all duration-150 hover:opacity-80"
            >
                <GoogleIcon />
                Login with Google
            </button>
        </>
    )
}

// ─── Sign Up Form ─────────────────────────────────────────────────────────────
interface SignUpFormProps {
    onSwitchToLogin: () => void
    onClose: () => void
}

const SignUpForm = ({ onSwitchToLogin, onClose }: SignUpFormProps) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const loadPapers = usePaperStore(state => state.loadPapers)
    const setUser = useAuthStore(state => state.setUser)

    const handleSignup = async () => {
        setError('')
        if (password !== confirm) {
            setError('Password dan confirm password harus sama')
            return
        }

        setLoading(true)
        try {
            const username = email.includes('@') ? email.split('@')[0] : email
            const result = await api.register({ username, email, password })
            setToken(result.access_token)
            setUser(result.user)
            await loadPapers()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign up gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-center mb-5">
                <PaperLogo size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-h)' }}>Sign Up</h2>
            <p className="text-sm text-center mb-7" style={{ color: 'var(--text)' }}>
                Let's join paper to read research easily
            </p>

            <InputField label="Username" type="email" placeholder="example@gmail.com" value={email} onChange={setEmail} />
            <InputField label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
            <InputField label="Confirm Password" type="password" placeholder="••••••••" value={confirm} onChange={setConfirm} />

            <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                className="w-full mt-2 py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all duration-150 hover:opacity-80"
            >
                {loading ? 'Loading...' : 'Sign Up'}
            </button>
            {error && <p className="text-center text-xs font-semibold mt-3" style={{ color: '#b42318' }}>{error}</p>}

            <p className="text-center text-sm font-semibold mt-5" style={{ color: 'var(--text-h)' }}>
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} style={{ color: 'var(--accent)' }} className="hover:underline font-bold">
                    Login
                </button>
            </p>

            <button
                type="button"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                className="mt-4 w-full flex items-center justify-center gap-2.5 py-2.5 rounded-2xl border text-sm font-medium active:scale-[0.98] transition-all duration-150 hover:opacity-80"
            >
                <GoogleIcon />
                Login with Google
            </button>
        </>
    )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>(defaultMode)

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Card */}
            <div
                className="relative w-full max-w-sm rounded-3xl px-8 py-8 animate-fade-in"
                style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{ color: 'var(--text)' }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 1l12 12M13 1L1 13" />
                    </svg>
                </button>

                {mode === 'login' ? (
                    <LoginForm onSwitchToSignup={() => setMode('signup')} onClose={onClose} />
                ) : (
                    <SignUpForm onSwitchToLogin={() => setMode('login')} onClose={onClose} />
                )}
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
