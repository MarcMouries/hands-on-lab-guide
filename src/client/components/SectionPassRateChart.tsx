import React from 'react'
import { SectionRateRow } from '../services/facilitatorApi'
import { EmptyState } from './Panel'

/**
 * Bar chart of pass rate per section.
 *
 * `pass_rate === null` means nothing in that section has been graded. It is
 * drawn as an empty dashed outline and labelled "Not graded", so it is never
 * confused with a genuine 0% and the distinction does not rely on colour.
 */
export function SectionPassRateChart({ rows }: { rows: SectionRateRow[] }) {
    if (!rows.length) {
        return <EmptyState>This plan has no sections yet.</EmptyState>
    }

    return (
        <ul className="holg-bars">
            {rows.map((row) => {
                const title = row.section_title || 'Untitled section'
                const ungraded = row.pass_rate === null
                const value = ungraded ? 0 : row.pass_rate
                const label = ungraded
                    ? title + ': not graded'
                    : title + ': ' + value + '% pass, ' + row.pass + ' pass, ' + row.fail + ' fail'

                return (
                    <li className="holg-bars__row" key={row.section}>
                        <span className="holg-bars__label" title={title}>
                            {title}
                        </span>
                        <svg
                            className="holg-bars__svg"
                            viewBox="0 0 100 12"
                            preserveAspectRatio="none"
                            role="img"
                            aria-label={label}
                        >
                            {ungraded ? (
                                <rect
                                    x="0.5"
                                    y="0.5"
                                    width="99"
                                    height="11"
                                    className="holg-bar-ungraded"
                                    vectorEffect="non-scaling-stroke"
                                />
                            ) : (
                                <>
                                    <rect
                                        x="0"
                                        y="0"
                                        width="100"
                                        height="12"
                                        className="holg-bar-track"
                                    />
                                    <rect
                                        x="0"
                                        y="0"
                                        width={value}
                                        height="12"
                                        className="holg-bar holg-bar--rate"
                                    />
                                </>
                            )}
                        </svg>
                        <span className="holg-bars__counts">
                            {ungraded ? (
                                <em className="holg-muted">Not graded</em>
                            ) : (
                                value + '% (' + row.pass + '/' + row.graded + ')'
                            )}
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}
