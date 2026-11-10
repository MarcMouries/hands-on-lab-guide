import React from 'react'
import { FeedbackRow } from '../services/facilitatorApi'
import { EM_DASH, dateTimeAttribute, formatDateTime, resultLabel } from '../utils/format'
import { EmptyState } from './Panel'

/**
 * Recent submissions, newest first.
 *
 * The API already orders `recent_submitted` by `submitted_on` descending and
 * caps it at 25, so the order is preserved rather than re-sorted.
 *
 * Fail rows are marked with a left border, a bold "Fail" chip and a warning
 * glyph, so the distinction survives greyscale and colour-blindness.
 */
export function RecentFeedback({ rows }: { rows: FeedbackRow[] }) {
    if (!rows.length) {
        return <EmptyState>No results have been submitted yet.</EmptyState>
    }

    return (
        <ul className="holg-feedback">
            {rows.map((row) => {
                const failed = row.result === 'fail'
                return (
                    <li
                        className={'holg-feedback__item' + (failed ? ' holg-feedback__item--fail' : '')}
                        key={row.sys_id}
                    >
                        <div className="holg-feedback__head">
                            <span
                                className={
                                    'holg-chip ' + (failed ? 'holg-chip--fail' : 'holg-chip--pass')
                                }
                            >
                                {failed ? '\u26a0 ' : '\u2713 '}
                                {resultLabel(row.result)}
                            </span>
                            <span className="holg-feedback__task">
                                {row.task_title || 'Untitled task'}
                            </span>
                            <span className="holg-feedback__user">{row.user_name || EM_DASH}</span>
                            <time
                                className="holg-feedback__time"
                                dateTime={dateTimeAttribute(row.submitted_on)}
                                title={row.submitted_on || undefined}
                            >
                                {formatDateTime(row.submitted_on)}
                            </time>
                        </div>
                        {row.feedback ? (
                            <p className="holg-feedback__body">{row.feedback}</p>
                        ) : (
                            <p className="holg-feedback__body holg-muted">No feedback provided.</p>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
