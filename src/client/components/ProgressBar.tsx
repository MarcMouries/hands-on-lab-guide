import React from 'react'
import { EM_DASH, clampPercent } from '../utils/format'

interface Props {
    /** null means "no participant record yet", rendered as an em dash. */
    percent: number | null
    label: string
    size?: 'sm' | 'md'
}

export function ProgressBar({ percent, label, size }: Props) {
    const known = percent !== null
    const value = known ? clampPercent(percent) : 0

    return (
        <div className={'holg-pb' + (size === 'md' ? ' holg-pb--md' : '')}>
            <div
                className="holg-pb__track"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
            >
                <div className="holg-pb__fill" style={{ width: value + '%' }} />
            </div>
            <span className="holg-pb__value">{known ? value + '%' : EM_DASH}</span>
        </div>
    )
}
