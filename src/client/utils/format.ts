export const EM_DASH = '\u2014'

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    complete: 'Complete',
}

const RESULT_LABELS: Record<string, string> = {
    pass: 'Pass',
    fail: 'Fail',
}

/** Stored choice value -> human label. Never show the stored value. */
export function participantStatusLabel(value: string): string {
    if (!value) {
        return EM_DASH
    }
    return PARTICIPANT_STATUS_LABELS[value] || value
}

export function resultLabel(value: string | null): string {
    if (!value) {
        return EM_DASH
    }
    return RESULT_LABELS[value] || value
}

/**
 * API datetimes are instance-local strings like "2026-01-05 09:00:00".
 * They are NOT ISO 8601 and are not reliably parseable by `new Date()`
 * across browsers, so they are reformatted textually and never parsed.
 */
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/

export function formatDateTime(value: string | null): string {
    if (!value) {
        return EM_DASH
    }
    const matched = DATE_TIME.exec(value.trim())
    return matched ? matched[1] + ' ' + matched[2] : value
}

/** A valid local date-time for the <time datetime> attribute, or undefined. */
export function dateTimeAttribute(value: string | null): string | undefined {
    if (!value) {
        return undefined
    }
    const matched = DATE_TIME.exec(value.trim())
    return matched ? matched[1] + 'T' + matched[2] + ':00' : undefined
}

/**
 * Sort key for the fixed-width datetime format. Lexicographic comparison is
 * chronologically correct for "YYYY-MM-DD HH:MM:SS".
 */
export function dateTimeSortKey(value: string | null): string | null {
    if (!value) {
        return null
    }
    const trimmed = value.trim().replace('T', ' ')
    return trimmed === '' ? null : trimmed
}

export function clampPercent(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0
    }
    return value > 100 ? 100 : Math.round(value)
}

/** null renders as an em dash, so an absent value never becomes "NaN%". */
export function percentLabel(value: number | null): string {
    return value === null ? EM_DASH : clampPercent(value) + '%'
}

export function averagePercent(values: number[]): number | null {
    if (!values.length) {
        return null
    }
    let total = 0
    for (let i = 0; i < values.length; i++) {
        total += values[i]
    }
    return clampPercent(total / values.length)
}

/** Returns null when nothing has been graded, rather than dividing by zero. */
export function ratePercent(pass: number, fail: number): number | null {
    const graded = pass + fail
    if (graded <= 0) {
        return null
    }
    return clampPercent((pass / graded) * 100)
}

export function formatClockTime(date: Date): string {
    try {
        return date.toLocaleTimeString()
    } catch (e) {
        return ''
    }
}
