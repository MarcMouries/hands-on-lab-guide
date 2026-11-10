import { requestLabJson } from './labHttp'

const BASE = '/api/x_snc_holg/lab'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface LabPlan {
    sys_id: string
    name: string
    description: string
    status: string
}

export interface ParticipantRow {
    sys_id: string
    user: string
    user_name: string
    status: string
    percent_complete: number
    started_on: string | null
    completed_on: string | null
    current_task_title: string | null
}

export interface TaskResultRow {
    task: string
    task_title: string
    section: string
    section_title: string | null
    not_started: number
    in_progress: number
    submitted: number
    pass: number
    fail: number
}

export interface SectionRateRow {
    section: string
    section_title: string | null
    pass: number
    fail: number
    graded: number
    pass_rate: number | null
}

export interface FeedbackRow {
    sys_id: string
    submitted_on: string | null
    user: string
    user_name: string
    task_title: string | null
    result: string | null
    feedback: string | null
}

export interface FacilitatorSummary {
    plan: { sys_id: string; name: string; status: string }
    participants: ParticipantRow[]
    results_by_task: TaskResultRow[]
    pass_rate_by_section: SectionRateRow[]
    recent_submitted: FeedbackRow[]
}

/* ------------------------------------------------------------------ *
 * Defensive readers - the payload is untrusted JSON
 * ------------------------------------------------------------------ */

function rec(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function list(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function text(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null
}

function count(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
    }
    const parsed = parseInt(String(value === null || value === undefined ? '' : value), 10)
    return Number.isFinite(parsed) ? parsed : 0
}

function nullableCount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }
    const parsed = parseInt(String(value), 10)
    return Number.isFinite(parsed) ? parsed : null
}

/* ------------------------------------------------------------------ *
 * GET /plans
 * ------------------------------------------------------------------ */

export async function fetchPlans(): Promise<LabPlan[]> {
    const received = await requestLabJson(BASE + '/plans', {
        notOkMessage: (status) => 'Could not load the plan list (HTTP ' + status + ').',
        isBareShape: (candidate) => Array.isArray(candidate.plans),
    })

    return list(received.body.plans)
        .map((raw) => {
            const plan = rec(raw)
            return {
                sys_id: text(plan.sys_id),
                name: text(plan.name),
                description: text(plan.description),
                status: text(plan.status),
            }
        })
        .filter((plan) => plan.sys_id !== '')
}

/* ------------------------------------------------------------------ *
 * GET /facilitator/plans/{plan_id}/summary
 * ------------------------------------------------------------------ */

export async function fetchFacilitatorSummary(planId: string): Promise<FacilitatorSummary> {
    const received = await requestLabJson(BASE + '/facilitator/plans/' + encodeURIComponent(planId) + '/summary', {
        notOkMessage: (status) =>
            status === 403
                ? 'You need the x_snc_holg.facilitator role to view this dashboard.'
                : 'Could not load the plan summary (HTTP ' + status + ').',
        isBareShape: (candidate) =>
            Array.isArray(candidate.participants) ||
            Array.isArray(candidate.results_by_task) ||
            Array.isArray(candidate.pass_rate_by_section) ||
            Array.isArray(candidate.recent_submitted) ||
            (!!candidate.plan && typeof candidate.plan === 'object'),
    })

    const body = received.body
    const plan = rec(body.plan)

    return {
        plan: {
            sys_id: text(plan.sys_id),
            name: text(plan.name),
            status: text(plan.status),
        },
        participants: list(body.participants).map((raw) => {
            const row = rec(raw)
            return {
                sys_id: text(row.sys_id),
                user: text(row.user),
                user_name: text(row.user_name),
                status: text(row.status),
                percent_complete: count(row.percent_complete),
                started_on: nullableText(row.started_on),
                completed_on: nullableText(row.completed_on),
                current_task_title: nullableText(row.current_task_title),
            }
        }),
        results_by_task: list(body.results_by_task).map((raw) => {
            const row = rec(raw)
            const byStatus = rec(row.by_status)
            const byResult = rec(row.by_result)
            return {
                task: text(row.task),
                task_title: text(row.task_title),
                section: text(row.section),
                section_title: nullableText(row.section_title),
                not_started: count(byStatus.not_started),
                in_progress: count(byStatus.in_progress),
                submitted: count(byStatus.submitted),
                pass: count(byResult.pass),
                fail: count(byResult.fail),
            }
        }),
        pass_rate_by_section: list(body.pass_rate_by_section).map((raw) => {
            const row = rec(raw)
            return {
                section: text(row.section),
                section_title: nullableText(row.section_title),
                pass: count(row.pass),
                fail: count(row.fail),
                graded: count(row.graded),
                pass_rate: nullableCount(row.pass_rate),
            }
        }),
        recent_submitted: list(body.recent_submitted).map((raw) => {
            const row = rec(raw)
            return {
                sys_id: text(row.sys_id),
                submitted_on: nullableText(row.submitted_on),
                user: text(row.user),
                user_name: text(row.user_name),
                task_title: nullableText(row.task_title),
                result: nullableText(row.result),
                feedback: nullableText(row.feedback),
            }
        }),
    }
}
