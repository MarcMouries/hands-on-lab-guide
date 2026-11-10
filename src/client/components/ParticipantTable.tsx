import React, { useMemo, useState } from 'react'
import { ParticipantRow } from '../services/facilitatorApi'
import { impersonate } from '../services/impersonationApi'
import { toMessage } from '../services/labHttp'
import {
    EM_DASH,
    clampPercent,
    dateTimeAttribute,
    formatDateTime,
    participantStatusLabel,
} from '../utils/format'
import { goToParticipantPlans } from '../utils/navigate'
import { COLUMNS, SortKey, SortState, sortParticipants } from '../utils/participantSort'
import { EmptyState } from './Panel'

function Cell({ value }: { value: string | null }) {
    if (!value) {
        return <span className="holg-muted">{EM_DASH}</span>
    }
    return <>{value}</>
}

function DateCell({ value }: { value: string | null }) {
    if (!value) {
        return <span className="holg-muted">{EM_DASH}</span>
    }
    const attribute = dateTimeAttribute(value)
    return (
        <time dateTime={attribute} title={value}>
            {formatDateTime(value)}
        </time>
    )
}

function Progress({ percent, user }: { percent: number; user: string }) {
    const value = clampPercent(percent)
    return (
        <div className="holg-progress">
            <div
                className="holg-progress__track"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={'Progress for ' + (user || 'participant')}
            >
                <div className="holg-progress__fill" style={{ width: value + '%' }} />
            </div>
            <span className="holg-progress__value">{value}%</span>
        </div>
    )
}

interface ParticipantTableProps {
    rows: ParticipantRow[]
    /**
     * Admin-only. When false (the default) the Impersonate column is not
     * rendered at all - no hidden or disabled control is emitted.
     */
    canImpersonate?: boolean
    /**
     * The signed-in user, recorded before switching so impersonation can be
     * ended later. The scoped server API cannot report the original user, so
     * the browser has to carry it.
     */
    currentUser?: { id: string; name: string }
}

export function ParticipantTable({ rows, canImpersonate, currentUser }: ParticipantTableProps) {
    const [sort, setSort] = useState<SortState>({ key: 'user', direction: 'asc' })
    const [busyUser, setBusyUser] = useState('')
    const [actionError, setActionError] = useState('')

    const sorted = useMemo(() => sortParticipants(rows, sort), [rows, sort])

    if (!rows.length) {
        return <EmptyState>No participants have started this plan yet.</EmptyState>
    }

    const toggle = (key: SortKey) => {
        setSort((current) =>
            current.key === key
                ? { key: key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                : { key: key, direction: 'asc' },
        )
    }

    const onImpersonate = (row: ParticipantRow) => {
        setActionError('')

        if (!row.user) {
            setActionError(
                'That row has no user reference, so there is nobody to impersonate. Reload the dashboard and try again.',
            )
            return
        }

        if (!currentUser || !currentUser.id) {
            setActionError(
                'Your own account could not be identified, so impersonation cannot be started safely. Reload the dashboard and try again.',
            )
            return
        }

        setBusyUser(row.user)
        impersonate(row.user, currentUser)
            .then(() => {
                // The session identity has changed server-side, so this must
                // be a full page load rather than a React state update.
                goToParticipantPlans()
            })
            .catch((reason: unknown) => {
                // Report in place; the table stays exactly as it was.
                setActionError(toMessage(reason))
                setBusyUser('')
            })
    }

    return (
        <>
            {actionError ? (
                <p className="holg-alert" role="alert">
                    {actionError}
                </p>
            ) : null}

            {canImpersonate ? (
                <p className="holg-table__hint">
                    {
                        'Use Impersonate in the Actions column (far right) to view a participant\u2019s own lab experience, then End impersonation to come back here.'
                    }
                </p>
            ) : null}

            <div className="holg-table-scroll">
                <table className="holg-table">
                    <caption className="holg-sr-only">
                        Participant progress. Select a column header to sort. Empty values sort
                        last.
                    </caption>
                    <thead>
                        <tr>
                            {COLUMNS.map((column) => {
                                const active = sort.key === column.key
                                const ariaSort = active
                                    ? sort.direction === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : 'none'
                                return (
                                    <th key={column.key} scope="col" aria-sort={ariaSort}>
                                        <button
                                            type="button"
                                            className={
                                                'holg-sort' + (active ? ' holg-sort--active' : '')
                                            }
                                            onClick={() => toggle(column.key)}
                                        >
                                            <span>{column.label}</span>
                                            <span
                                                aria-hidden="true"
                                                className="holg-sort__caret"
                                            >
                                                {active
                                                    ? sort.direction === 'asc'
                                                        ? '\u25b2'
                                                        : '\u25bc'
                                                    : '\u2195'}
                                            </span>
                                        </button>
                                    </th>
                                )
                            })}
                            {canImpersonate ? (
                                <th scope="col" className="holg-table__actions">
                                    Actions
                                </th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row) => (
                            <tr key={row.sys_id}>
                                <th scope="row" className="holg-table__user">
                                    <Cell value={row.user_name} />
                                </th>
                                <td>
                                    <span
                                        className={
                                            'holg-status holg-status--' + (row.status || 'unknown')
                                        }
                                    >
                                        {participantStatusLabel(row.status)}
                                    </span>
                                </td>
                                <td>
                                    <Progress percent={row.percent_complete} user={row.user_name} />
                                </td>
                                <td>
                                    <Cell value={row.current_task_title} />
                                </td>
                                <td>
                                    <DateCell value={row.started_on} />
                                </td>
                                <td>
                                    <DateCell value={row.completed_on} />
                                </td>
                                {canImpersonate ? (
                                    <td className="holg-table__actions">
                                        <button
                                            type="button"
                                            className="holg-button holg-button--sm"
                                            onClick={() => onImpersonate(row)}
                                            disabled={busyUser !== ''}
                                            aria-busy={busyUser === row.user}
                                            aria-label={
                                                'Impersonate ' +
                                                (row.user_name || 'this participant')
                                            }
                                        >
                                            {busyUser === row.user
                                                ? 'Switching\u2026'
                                                : 'Impersonate'}
                                        </button>
                                    </td>
                                ) : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
