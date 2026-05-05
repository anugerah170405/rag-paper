import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TabsContextType = {
    value: string
    setValue: (v: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

function useTabs() {
    const ctx = useContext(TabsContext)
    if (!ctx) throw new Error('Tabs must be used inside <Tabs>')
    return ctx
}

/* ================= Tabs Root ================= */

export function Tabs({
    defaultValue,
    children,
}: {
    defaultValue: string
    children: ReactNode
}) {
    const [value, setValue] = useState(defaultValue)

    return (
        <TabsContext.Provider value={{ value, setValue }}>
            {children}
        </TabsContext.Provider>
    )
}

/* ================= Tabs List ================= */

export function TabsList({
    className,
    children,
}: {
    className?: string
    children: ReactNode
}) {
    return (
        <div
            className={cn(
                'inline-flex',
                className
            )}
        >
            {children}
        </div>
    )
}

/* ================= Tabs Trigger ================= */

export function TabsTrigger({
    value,
    children,
    leftIcon,
}: {
    value: string
    children: ReactNode
    leftIcon?: ReactNode
}) {
    const { value: active, setValue } = useTabs()
    const isActive = active === value

    return (
        <button
            onClick={() => setValue(value)}
            className={cn(
                'inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg transition-all duration-200 border border-transparent',
                isActive
                    ? 'bg-[var(--bg)] text-[var(--accent)] border-base'
                    : 'hover:opacity-80'
            )}
        >
            {leftIcon && <span className="flex items-center">{leftIcon}</span>}
            {children}
        </button>
    )
}

/* ================= Tabs Content ================= */

export function TabsContent({
    value,
    children,
}: {
    value: string
    children: ReactNode
}) {
    const { value: active } = useTabs()

    if (active !== value) return null

    return <div>{children}</div>
}