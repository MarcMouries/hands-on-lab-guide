import { ParticipantRow } from '../services/facilitatorApi'
import { dateTimeSortKey } from './format'

export type SortKey =
    | 'user'
    | 'status'
    | 'progress'
    | 'artifacts'
    | 'current'
    | 'started'
    | 'completed'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
    key: SortKey
    direction: SortDirection
}

export interface ColumnDef {
    key: SortKey
    label: string
    numeric: boolean
}

export const COLUMNS: ColumnDef[] = [
    { key: 'user', label: 'User', numeric: false },
    { key: 'status', label: 'Status', numeric: false },
    { key: 'progress', label: 'Progress', numeric: true },
    { key: 'artifacts', label: 'Artifacts', numeric: true },
    { key: 'current', label: 'Current task', numeric: false },
    { key: 'started', label: 'Started on', numeric: false },
    { key: 'completed', label: 'Completed on', numeric: false },
]

/** Workflow order, so sorting by status is meaningful rather than alphabetical. */
const STATUS_ORDER: Record<string, number> = {
    not_started: 0,
    in_progress: 1,
    complete: 2,
}

function sortValue(row: ParticipantRow, key: SortKey): string | number | null {
    switch (key) {
        case 'user':
            return row.user_name ? row.user_name.toLowerCase() : null
        case 'status': {
            if (!row.status) {
                return null
            }
            const order = STATUS_ORDER[row.status]
            return order === undefined ? 99 : order
        }
        case 'progress':
            return row.percent_complete
        case 'artifacts':
            /*
             * Sorted on the share evidenced, not the count, so a participant
             * on a plan with three expected tasks is comparable with one on a
             * plan with nine. No evidence loaded yet sorts last, like any
             * other empty value.
             */
            return row.artifacts_total ? row.artifacts_evidenced / row.artifacts_total : null
        case 'current':
            return row.current_task_title ? row.current_task_title.toLowerCase() : null
        case 'started':
            return dateTimeSortKey(row.started_on)
        case 'completed':
            return dateTimeSortKey(row.completed_on)
        default:
            return null
    }
}

/**
 * Stable sort with nulls always last.
 *
 * Nulls last in BOTH directions: toggling direction should never bury the
 * populated rows under a block of em dashes. Stability means a background
 * refresh cannot reshuffle rows that compare equal.
 */
export function sortParticipants(rows: ParticipantRow[], sort: SortState): ParticipantRow[] {
    const factor = sort.direction === 'asc' ? 1 : -1
    const indexed = rows.map((row, index) => ({ row: row, index: index }))

    indexed.sort((left, right) => {
        const a = sortValue(left.row, sort.key)
        const b = sortValue(right.row, sort.key)

        if (a === null && b === null) {
            return left.index - right.index
        }
        if (a === null) {
            return 1
        }
        if (b === null) {
            return -1
        }

        if (typeof a === 'number' && typeof b === 'number') {
            if (a !== b) {
                return (a - b) * factor
            }
            return left.index - right.index
        }

        const as = String(a)
        const bs = String(b)
        if (as < bs) {
            return -factor
        }
        if (as > bs) {
            return factor
        }
        return left.index - right.index
    })

    return indexed.map((entry) => entry.row)
}
