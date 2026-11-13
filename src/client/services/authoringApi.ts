import { requestLabJson } from './labHttp'

const BASE = '/api/x_snc_holg/lab/authoring'

/* ------------------------------------------------------------------ *
 * Types
 *
 * One node type per editable level. The server keeps the same five names in
 * LAB_AUTHOR_TYPES, and they appear in every /authoring path, so a typo here
 * is a 400 naming the type rather than a silent write to the wrong table.
 * ------------------------------------------------------------------ */

export type NodeType = 'plan' | 'section' | 'task' | 'prompt' | 'criterion'

export interface AuthorPlanSummary {
    sys_id: string
    name: string
    description: string
    status: string
    slug: string
}

export interface AuthorPrompt {
    sys_id: string
    plan_task: string
    label: string
    prompt_text: string
    order: number
}

export interface AuthorCriterion {
    sys_id: string
    plan_task: string
    criterion: string
    order: number
}

export interface AuthorTask {
    sys_id: string
    plan_section: string
    title: string
    description: string
    scenario: string
    how_to_test: string
    dependency_note: string
    order: number
    prompts: AuthorPrompt[]
    criteria: AuthorCriterion[]
}

export interface AuthorSection {
    sys_id: string
    title: string
    overview: string
    order: number
    tasks: AuthorTask[]
}

export interface AuthorTree {
    plan: AuthorPlanSummary
    sections: AuthorSection[]
}

/** Field values for a create or a patch. Only the level's own fields. */
export type NodeFields = Record<string, string>

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

function asString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0
}

function mapPlanSummary(raw: Record<string, unknown>): AuthorPlanSummary {
    return {
        sys_id: asString(raw.sys_id),
        name: asString(raw.name),
        description: asString(raw.description),
        status: asString(raw.status),
        slug: asString(raw.slug),
    }
}

export async function fetchAuthorPlans(): Promise<AuthorPlanSummary[]> {
    const { body } = await requestLabJson(BASE + '/plans', {
        notOkMessage: (status) =>
            status === 403
                ? 'You need the x_snc_holg.author role to edit plans.'
                : 'Could not load plans (HTTP ' + status + ').',
        isBareShape: (candidate) => Array.isArray(candidate.plans),
    })
    const plans = Array.isArray(body.plans) ? (body.plans as Record<string, unknown>[]) : []
    return plans.map(mapPlanSummary)
}

export async function fetchAuthorTree(planId: string): Promise<AuthorTree> {
    const { body } = await requestLabJson(BASE + '/plans/' + encodeURIComponent(planId), {
        notOkMessage: (status) =>
            status === 403
                ? 'You need the x_snc_holg.author role to edit plans.'
                : 'Could not load this plan (HTTP ' + status + ').',
        isBareShape: (candidate) => !!candidate.plan,
    })

    const rawSections = Array.isArray(body.sections)
        ? (body.sections as Record<string, unknown>[])
        : []

    return {
        plan: mapPlanSummary((body.plan || {}) as Record<string, unknown>),
        sections: rawSections.map((section) => ({
            sys_id: asString(section.sys_id),
            title: asString(section.title),
            overview: asString(section.overview),
            order: asNumber(section.order),
            tasks: (Array.isArray(section.tasks) ? (section.tasks as Record<string, unknown>[]) : []).map(
                (task) => ({
                    sys_id: asString(task.sys_id),
                    plan_section: asString(task.plan_section),
                    title: asString(task.title),
                    description: asString(task.description),
                    scenario: asString(task.scenario),
                    how_to_test: asString(task.how_to_test),
                    dependency_note: asString(task.dependency_note),
                    order: asNumber(task.order),
                    prompts: (Array.isArray(task.prompts)
                        ? (task.prompts as Record<string, unknown>[])
                        : []
                    ).map((prompt) => ({
                        sys_id: asString(prompt.sys_id),
                        plan_task: asString(prompt.plan_task),
                        label: asString(prompt.label),
                        prompt_text: asString(prompt.prompt_text),
                        order: asNumber(prompt.order),
                    })),
                    criteria: (Array.isArray(task.criteria)
                        ? (task.criteria as Record<string, unknown>[])
                        : []
                    ).map((criterion) => ({
                        sys_id: asString(criterion.sys_id),
                        plan_task: asString(criterion.plan_task),
                        criterion: asString(criterion.criterion),
                        order: asNumber(criterion.order),
                    })),
                }),
            ),
        })),
    }
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

export async function createNode(
    type: NodeType,
    parentId: string,
    fields: NodeFields,
): Promise<string> {
    const payload: Record<string, unknown> = { parent_id: parentId }
    for (const key in fields) {
        payload[key] = fields[key]
    }

    const { body } = await requestLabJson(BASE + '/' + type, {
        method: 'POST',
        body: payload,
        notOkMessage: (status) => 'Could not add that ' + type + ' (HTTP ' + status + ').',
        isBareShape: (candidate) => typeof candidate.sys_id === 'string',
    })
    return asString(body.sys_id)
}

export async function patchNode(
    type: NodeType,
    sysId: string,
    fields: NodeFields,
): Promise<void> {
    await requestLabJson(BASE + '/' + type + '/' + encodeURIComponent(sysId), {
        method: 'PATCH',
        body: fields,
        notOkMessage: (status) => 'Could not save that ' + type + ' (HTTP ' + status + ').',
        isBareShape: (candidate) => typeof candidate.sys_id === 'string',
    })
}

export interface DeleteOutcome {
    deleted: boolean
    /** Set when the delete was refused pending confirmation. */
    taskResults: number
}

/**
 * Deletes a node, or reports what it would take with it.
 *
 * Without `confirm`, the server answers 409 for anything whose cascade would
 * reach a participant's Task Results, so the caller can say how many before
 * asking a second time.
 */
export async function deleteNode(
    type: NodeType,
    sysId: string,
    confirm: boolean,
): Promise<DeleteOutcome> {
    const path =
        BASE + '/' + type + '/' + encodeURIComponent(sysId) + (confirm ? '?confirm=true' : '')

    const { body, status } = await requestLabJson(path, {
        method: 'DELETE',
        allowStatuses: [409],
        notOkMessage: (code) => 'Could not delete that ' + type + ' (HTTP ' + code + ').',
        isBareShape: (candidate) =>
            candidate.deleted === true || candidate.requires_confirm === true,
    })

    if (status === 409) {
        return { deleted: false, taskResults: asNumber(body.task_results) }
    }
    return { deleted: true, taskResults: 0 }
}

export async function moveNode(
    type: NodeType,
    sysId: string,
    direction: 'up' | 'down',
): Promise<void> {
    await requestLabJson(BASE + '/' + type + '/' + encodeURIComponent(sysId) + '/move', {
        method: 'POST',
        body: { direction: direction },
        notOkMessage: (status) => 'Could not move that ' + type + ' (HTTP ' + status + ').',
        isBareShape: (candidate) => typeof candidate.sys_id === 'string',
    })
}
