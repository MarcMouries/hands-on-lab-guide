import { requestLabJson } from './labHttp'

const BASE = '/api/x_snc_holg/lab'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface TaskResult {
    sys_id: string
    status: string
    result: string | null
    feedback: string | null
    submitted_on: string | null
}

export interface LabPrompt {
    sys_id: string
    order: number
    label: string
    prompt_text: string
}

export interface LabCriterion {
    sys_id: string
    order: number
    criterion: string
}

export interface LabTask {
    sys_id: string
    title: string
    order: number
    description: string
    scenario: string
    how_to_test: string
    dependency_note: string
    prompts: LabPrompt[]
    success_criteria: LabCriterion[]
    result: TaskResult | null
}

export interface LabSection {
    sys_id: string
    title: string
    order: number
    overview: string
    tasks: LabTask[]
}

export interface PlanParticipant {
    sys_id: string
    status: string
    percent_complete: number
    started_on: string | null
    completed_on: string | null
}

export interface PlanDetail {
    sys_id: string
    name: string
    description: string
    status: string
    percent_complete: number | null
    participant: PlanParticipant | null
    sections: LabSection[]
}

export interface StartPlanResponse {
    created: boolean
    participant: PlanParticipant | null
}

export interface PatchResultResponse {
    result: TaskResult | null
    percent_complete: number | null
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

function readResult(value: unknown): TaskResult | null {
    if (!value || typeof value !== 'object') {
        return null
    }
    const row = rec(value)
    const id = text(row.sys_id)
    if (!id) {
        return null
    }
    return {
        sys_id: id,
        status: text(row.status),
        result: nullableText(row.result),
        feedback: nullableText(row.feedback),
        submitted_on: nullableText(row.submitted_on),
    }
}

function readParticipant(value: unknown): PlanParticipant | null {
    if (!value || typeof value !== 'object') {
        return null
    }
    const row = rec(value)
    const id = text(row.sys_id)
    if (!id) {
        return null
    }
    return {
        sys_id: id,
        status: text(row.status),
        percent_complete: count(row.percent_complete),
        started_on: nullableText(row.started_on),
        completed_on: nullableText(row.completed_on),
    }
}

/* ------------------------------------------------------------------ *
 * GET /plans
 *
 * The facilitator service also reads this endpoint but drops `participant`,
 * which the participant view needs in order to choose Start vs Continue.
 * ------------------------------------------------------------------ */

export interface ParticipantPlan {
    sys_id: string
    name: string
    description: string
    status: string
    participant: PlanParticipant | null
}

export async function fetchParticipantPlans(): Promise<ParticipantPlan[]> {
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
                participant: readParticipant(plan.participant),
            }
        })
        .filter((plan) => plan.sys_id !== '')
}

/* ------------------------------------------------------------------ *
 * GET /plans/{plan_id}
 * ------------------------------------------------------------------ */

export async function fetchPlanDetail(planId: string): Promise<PlanDetail> {
    const received = await requestLabJson(BASE + '/plans/' + encodeURIComponent(planId), {
        notOkMessage: (status) =>
            status === 404
                ? 'That plan could not be found, or you do not have access to it.'
                : 'Could not load the plan (HTTP ' + status + ').',
        isBareShape: (candidate) => Array.isArray(candidate.sections) || typeof candidate.name === 'string',
    })

    const body = received.body

    return {
        sys_id: text(body.sys_id),
        name: text(body.name),
        description: text(body.description),
        status: text(body.status),
        percent_complete: nullableCount(body.percent_complete),
        participant: readParticipant(body.participant),
        sections: list(body.sections).map((rawSection) => {
            const section = rec(rawSection)
            return {
                sys_id: text(section.sys_id),
                title: text(section.title),
                order: count(section.order),
                overview: text(section.overview),
                tasks: list(section.tasks).map((rawTask) => {
                    const task = rec(rawTask)
                    return {
                        sys_id: text(task.sys_id),
                        title: text(task.title),
                        order: count(task.order),
                        description: text(task.description),
                        scenario: text(task.scenario),
                        how_to_test: text(task.how_to_test),
                        dependency_note: text(task.dependency_note),
                        prompts: list(task.prompts).map((rawPrompt) => {
                            const prompt = rec(rawPrompt)
                            return {
                                sys_id: text(prompt.sys_id),
                                order: count(prompt.order),
                                label: text(prompt.label),
                                prompt_text: text(prompt.prompt_text),
                            }
                        }),
                        success_criteria: list(task.success_criteria).map((rawCriterion) => {
                            const criterion = rec(rawCriterion)
                            return {
                                sys_id: text(criterion.sys_id),
                                order: count(criterion.order),
                                criterion: text(criterion.criterion),
                            }
                        }),
                        result: readResult(task.result),
                    }
                }),
            }
        }),
    }
}

/* ------------------------------------------------------------------ *
 * POST /plans/{plan_id}/start
 * ------------------------------------------------------------------ */

export async function startPlan(planId: string): Promise<StartPlanResponse> {
    const received = await requestLabJson(BASE + '/plans/' + encodeURIComponent(planId) + '/start', {
        method: 'POST',
        body: {},
        notOkMessage: (status) =>
            status === 403
                ? 'You are not permitted to start this plan.'
                : status === 404
                  ? 'That plan could not be found, or you do not have access to it.'
                  : 'Could not start the plan (HTTP ' + status + ').',
        isBareShape: (candidate) => typeof candidate.created === 'boolean' || candidate.participant !== undefined,
    })

    return {
        created: received.body.created === true,
        participant: readParticipant(received.body.participant),
    }
}

/* ------------------------------------------------------------------ *
 * PATCH /results/{result_id}
 * ------------------------------------------------------------------ */

export interface PatchResultBody {
    status: 'in_progress' | 'submitted'
    result?: 'pass' | 'fail'
    feedback?: string
}

export async function patchResult(resultId: string, body: PatchResultBody): Promise<PatchResultResponse> {
    if (!resultId) {
        throw new Error('This task has no result record yet, so it cannot be updated.')
    }

    const received = await requestLabJson(BASE + '/results/' + encodeURIComponent(resultId), {
        method: 'PATCH',
        body: body,
        notOkMessage: (status) => {
            if (status === 409) {
                return 'This task has already been submitted, and a submitted result is final. Reload the page to see the recorded result.'
            }
            if (status === 400) {
                return 'The submission was rejected: a result of Pass or Fail is required.'
            }
            if (status === 403) {
                return 'You are not permitted to update this task result.'
            }
            if (status === 404) {
                return 'That task result could not be found, or you do not have access to it.'
            }
            return 'Could not save the task result (HTTP ' + status + ').'
        },
        isBareShape: (candidate) => candidate.result !== undefined || candidate.percent_complete !== undefined,
    })

    return {
        result: readResult(received.body.result),
        percent_complete: nullableCount(received.body.percent_complete),
    }
}
