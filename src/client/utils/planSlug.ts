/**
 * Readable plan identifier, mirroring LabApi._slug on the server.
 *
 * The REST layer accepts `{plan_id}` as either a sys_id or this slug, so any
 * view that resolves a plan from the URL has to recognise both - otherwise a
 * perfectly valid link like `?id=facilitator&plan_id=Now-Assist-for-Creator`
 * silently falls back to the first plan in the list.
 *
 * Kept in step with the server deliberately: non-alphanumerics become
 * separators, these four stop words are dropped (`for` is kept on purpose),
 * and the first four remaining words are joined with `-`.
 *
 * `maxWords` exists for `task_id`, which is resolved client-side against the
 * loaded plan and so has no server rule to match. Four words leaves a task
 * title looking cut off - "Set up your lab workspace" becomes
 * `Set-up-your-lab` - and the point of the slug is to be readable.
 */
const STOP_WORDS = ['a', 'the', 'with', 'and']
const MAX_WORDS = 4

export function planSlug(name: string, maxWords?: number): string {
    if (!name) {
        return ''
    }

    const words = name
        .replace(/[^A-Za-z0-9]/g, ' ')
        .split(' ')
        .filter((word) => !!word)

    if (!words.length) {
        return ''
    }

    const kept = words.filter((word) => STOP_WORDS.indexOf(word.toLowerCase()) < 0)
    const use = kept.length ? kept : words
    return use.slice(0, maxWords || MAX_WORDS).join('-')
}
