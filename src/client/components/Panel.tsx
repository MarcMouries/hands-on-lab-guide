import React from 'react'

interface PanelProps {
    title: string
    /** Optional right-aligned content in the panel header. */
    aside?: React.ReactNode
    /**
     * Optional so the local JSX typing does not demand it as an explicit
     * prop; React still supplies nested children at runtime.
     */
    children?: React.ReactNode
}

export function Panel({ title, aside, children }: PanelProps) {
    return (
        <section className="holg-panel">
            <div className="holg-panel__head">
                <h2 className="holg-panel__title">{title}</h2>
                {aside ? <div className="holg-panel__aside">{aside}</div> : null}
            </div>
            {children}
        </section>
    )
}

export function EmptyState({ children }: { children?: React.ReactNode }) {
    return <p className="holg-empty">{children}</p>
}
