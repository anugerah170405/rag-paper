import type { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
}

export default function DummyProfile({
}: Props) {
    return (
        <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-[var(--accent-bg)] text-sm font-semibold text-[var(--accent)]">
            PR
        </div>
    )
}