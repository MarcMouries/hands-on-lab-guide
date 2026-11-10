import { LabSection, LabTask, TaskResult } from '../services/participantApi'

export type TaskState = 'not_started' | 'in_progress' | 'passed' | 'failed'

export interface TaskStateMeta {
    state: TaskState
    label: string
    /** Shape glyph, so status is never conveyed by colour alone. */
    glyph: string
}

const META: Record<TaskState, TaskStateMeta> = {
    not_started: { state: 'not_started', label: 'Not started', glyph: '\u25cb' },
    in_progress: { state: 'in_progress', label: 'In progress', glyph: '\u25d0' },
    passed: { state: 'passed', label: 'Passed', glyph: '\u2713' },
    failed: { state: 'failed', label: 'Failed', glyph: '\u2715' },
}

export function taskState(result: TaskResult | null): TaskState {
    if (!result) {
        return 'not_started'
    }
    if (result.status === 'submitted') {
        if (result.result === 'pass') {
            return 'passed'
        }
        if (result.result === 'fail') {
            return 'failed'
        }
        return 'not_started'
    }
    if (result.status === 'in_progress') {
        return 'in_progress'
    }
    return 'not_started'
}

export function taskStateMeta(result: TaskResult | null): TaskStateMeta {
    return META[taskState(result)]
}

export function isSubmitted(result: TaskResult | null): boolean {
    return !!result && result.status === 'submitted'
}

/** Every task across every section, in API order. */
export function flattenTasks(sections: LabSection[]): LabTask[] {
    const all: LabTask[] = []
    for (let s = 0; s < sections.length; s++) {
        const tasks = sections[s].tasks
        for (let t = 0; t < tasks.length; t++) {
            all.push(tasks[t])
        }
    }
    return all
}

/**
 * The first task that has not been submitted, falling back to the first task
 * when the whole plan is already submitted.
 */
export function firstOpenTaskId(sections: LabSection[], resultFor: (task: LabTask) => TaskResult | null): string {
    const all = flattenTasks(sections)
    for (let i = 0; i < all.length; i++) {
        if (!isSubmitted(resultFor(all[i]))) {
            return all[i].sys_id
        }
    }
    return all.length ? all[0].sys_id : ''
}

/** The next not-submitted task after the given one, or '' when none remain. */
export function nextOpenTaskId(
    sections: LabSection[],
    currentTaskId: string,
    resultFor: (task: LabTask) => TaskResult | null
): string {
    const all = flattenTasks(sections)
    let index = -1
    for (let i = 0; i < all.length; i++) {
        if (all[i].sys_id === currentTaskId) {
            index = i
            break
        }
    }
    for (let i = index + 1; i < all.length; i++) {
        if (!isSubmitted(resultFor(all[i]))) {
            return all[i].sys_id
        }
    }
    // Wrap around, so a skipped earlier task is still reachable.
    for (let i = 0; i < all.length && i < index; i++) {
        if (!isSubmitted(resultFor(all[i]))) {
            return all[i].sys_id
        }
    }
    return ''
}
