import React from 'react'
import { TaskResultRow } from '../services/facilitatorApi'
import { EmptyState } from './Panel'

interface Segment {
    key: 'pass' | 'fail' | 'open'
    label: string
    value: number
}

/**
 * Horizontal stacked bar per task: pass / fail / not submitted.
 *
 * Bars are scaled against the largest task total so they are comparable, and
 * every count is also printed as text so the data is never chart-only.
 * Inline SVG only - no chart library, no external script.
 */
export function TaskResultsChart({ rows }: { rows: TaskResultRow[] }) {
    if (!rows.length) {
        return <EmptyState>This plan has no tasks yet.</EmptyState>
    }

    const totals = rows.map((row) => row.pass + row.fail + row.not_started + row.in_progress)
    let max = 0
    for (let i = 0; i < totals.length; i++) {
        if (totals[i] > max) {
            max = totals[i]
        }
    }

    if (max === 0) {
        return (
            <>
                <EmptyState>
                    No task results recorded yet. Tasks appear here once participants begin
                    submitting.
                </EmptyState>
                <ul className="holg-task-roster">
                    {rows.map((row) => (
                        <li key={row.task}>{row.task_title}</li>
                    ))}
                </ul>
            </>
        )
    }

    return (
        <>
            <ul className="holg-legend">
                <li>
                    <span className="holg-swatch holg-swatch--pass" aria-hidden="true" />
                    Pass
                </li>
                <li>
                    <span className="holg-swatch holg-swatch--fail" aria-hidden="true" />
                    Fail
                </li>
                <li>
                    <span className="holg-swatch holg-swatch--open" aria-hidden="true" />
                    Not submitted
                </li>
            </ul>
            <ul className="holg-bars">
                {rows.map((row) => {
                    const open = row.not_started + row.in_progress
                    const segments: Segment[] = [
                        { key: 'pass', label: 'pass', value: row.pass },
                        { key: 'fail', label: 'fail', value: row.fail },
                        { key: 'open', label: 'not submitted', value: open },
                    ]
                    const summary = segments
                        .map((segment) => segment.value + ' ' + segment.label)
                        .join(', ')

                    let offset = 0
                    return (
                        <li className="holg-bars__row" key={row.task}>
                            <span className="holg-bars__label" title={row.task_title}>
                                {row.task_title}
                            </span>
                            <svg
                                className="holg-bars__svg"
                                viewBox="0 0 100 12"
                                preserveAspectRatio="none"
                                role="img"
                                aria-label={row.task_title + ': ' + summary}
                            >
                                <rect x="0" y="0" width="100" height="12" className="holg-bar-track" />
                                {segments.map((segment) => {
                                    if (segment.value <= 0) {
                                        return null
                                    }
                                    const width = (segment.value / max) * 100
                                    const x = offset
                                    offset += width
                                    return (
                                        <rect
                                            key={segment.key}
                                            x={x}
                                            y="0"
                                            width={width}
                                            height="12"
                                            className={'holg-bar holg-bar--' + segment.key}
                                        />
                                    )
                                })}
                            </svg>
                            <span className="holg-bars__counts">{summary}</span>
                        </li>
                    )
                })}
            </ul>
        </>
    )
}
