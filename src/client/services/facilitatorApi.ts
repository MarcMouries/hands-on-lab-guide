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
    /*
     * Filled in by the dashboard from the artifact scan, which is a separate
     * request: the summary refreshes every 30 seconds and a scan does not.
     * Zero totals mean no scan has landed yet, which the table shows as a dash
     * rather than as 0 of 0.
     */
    artifacts_evidenced: number
    artifacts_total: number
    app_name: string
}

/** One participant's artifact evidence, as the tracker reports it. */
export interface ArtifactRow {
    sys_id: string
    user: string
    user_name: string
    participant_number: number
    /** The scope the setup task told them to build in. */
    app_scope: string
    /** The application actually found at that scope, '' when there is none. */
    app_name: string
    app_found: boolean
    tasks_evidenced: number
    tasks_total: number
    /** taskId -> 'found' | 'partial' | 'missing'; only tasks with expectations. */
    by_task: Record<string, string>
}

export interface ArtifactEvidence {
    tasks: { sys_id: string; title: string; expectations: number }[]
    participants: ArtifactRow[]
    scanned_on: string
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
 * GET /facilitator/plans/{plan_id}/artifacts
 *
 * A scan, not a cached figure: it is read when the dashboard opens and again
 * whenever the facilitator asks. Evidence comes from sys_update_xml, so it is
 * current as of the moment it is read.
 * ------------------------------------------------------------------ */

export async function fetchArtifactEvidence(planId: string): Promise<ArtifactEvidence> {
    const received = await requestLabJson(
        BASE + '/facilitator/plans/' + encodeURIComponent(planId) + '/artifacts',
        {
            notOkMessage: (status) =>
                status === 403
                    ? 'You need the x_snc_holg.facilitator role to see artifact evidence.'
                    : 'Could not load artifact evidence (HTTP ' + status + ').',
            isBareShape: (candidate) =>
                Array.isArray(candidate.participants) || Array.isArray(candidate.tasks),
        },
    )

    const body = received.body
    return {
        tasks: list(body.tasks).map((raw) => {
            const task = rec(raw)
            return {
                sys_id: text(task.sys_id),
                title: text(task.title),
                expectations: count(task.expectations),
            }
        }),
        participants: list(body.participants).map((raw) => {
            const row = rec(raw)
            const byTask = rec(row.by_task)
            const verdicts: Record<string, string> = {}
            for (const key in byTask) {
                if (Object.prototype.hasOwnProperty.call(byTask, key)) {
                    verdicts[key] = text(byTask[key])
                }
            }
            return {
                sys_id: text(row.sys_id),
                user: text(row.user),
                user_name: text(row.user_name),
                participant_number: count(row.participant_number),
                app_scope: text(row.app_scope),
                app_name: text(row.app_name),
                app_found: row.app_found === true,
                tasks_evidenced: count(row.tasks_evidenced),
                tasks_total: count(row.tasks_total),
                by_task: verdicts,
            }
        }),
        scanned_on: text(body.scanned_on),
    }
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
                // The summary does not carry evidence; the dashboard merges it
                // in from the scan.
                artifacts_evidenced: 0,
                artifacts_total: 0,
                app_name: '',
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
