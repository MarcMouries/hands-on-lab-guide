/**
 * URL helpers that work on both surfaces that serve this bundle:
 *  - the Service Portal pages `?id=plans` and `?id=plan&plan_id=<sys_id>`
 *  - the standalone UI page `x_snc_holg_participant.do`, which has no `id`
 *
 * The `id` parameter is only rewritten when it is already present, so the
 * standalone page keeps its own path and only gains or loses `plan_id`.
 */
export function viewUrl(planId: string | null): string {
    const params = new URLSearchParams(window.location.search)

    if (params.has('id')) {
        params.set('id', planId ? 'plan' : 'plans')
    }

    if (planId) {
        params.set('plan_id', planId)
    } else {
        params.delete('plan_id')
    }

    const query = params.toString()
    return window.location.pathname + (query ? '?' + query : '')
}

/* ------------------------------------------------------------------ *
 * In-page URL state (the selected task)
 *
 * Selecting a task must not reload the document, so this writes the param in
 * place. The two surfaces need different mechanics:
 *  - on the Service Portal AngularJS owns the URL. A bare history.pushState
 *    leaves $location out of sync and the next digest reverts it, so the shell
 *    widget publishes `setParams` on window.__X_SNC_HOLG__ and the update goes
 *    through $location instead.
 *  - on the standalone `.do` page there is no Angular, so History is used
 *    directly.
 * ------------------------------------------------------------------ */

/** Reads a param from the live URL, falling back to the injected context. */
export function readUrlParam(key: string): string {
    const fromUrl = new URLSearchParams(window.location.search).get(key)
    if (fromUrl) {
        return fromUrl
    }
    const injected = window.__X_SNC_HOLG__
    return (injected && injected.params && injected.params[key]) || ''
}

/**
 * Writes params into the current URL without navigating. A null value removes
 * the param. `replace` overwrites the current history entry instead of adding
 * one, so an initial redirect does not leave a dead Back step.
 */
export function setUrlParams(
    patch: Record<string, string | null>,
    replace?: boolean,
): void {
    const injected = window.__X_SNC_HOLG__
    if (injected && typeof injected.setParams === 'function') {
        injected.setParams(patch, !!replace)
        return
    }

    if (!window.history || !window.history.pushState) {
        return
    }

    const params = new URLSearchParams(window.location.search)
    for (const key in patch) {
        const value = patch[key]
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
    }

    const query = params.toString()
    const url = window.location.pathname + (query ? '?' + query : '')
    if (replace) {
        window.history.replaceState(window.history.state, '', url)
    } else {
        window.history.pushState(window.history.state, '', url)
    }
}

export function goToPlan(planId: string): void {
    window.location.assign(viewUrl(planId))
}

export function goToPlans(): void {
    window.location.assign(viewUrl(null))
}

/* ------------------------------------------------------------------ *
 * Cross-view navigation (participant <-> facilitator)
 *
 * `viewUrl` only ever moves between the two PARTICIPANT views, so it cannot
 * carry a session from the facilitator surface to the participant surface or
 * back. Impersonation needs exactly that, on both surfaces:
 *  - on the portal the page is selected by `?id=`, so only that param changes
 *  - on the standalone pages the view IS the path, so the trailing `*.do`
 *    segment is swapped (and left untouched when the path is something else)
 * ------------------------------------------------------------------ */

const PARTICIPANT_PAGE = 'x_snc_holg_participant.do'
const FACILITATOR_PAGE = 'x_snc_holg_facilitator.do'

/** Replaces the trailing `*.do` segment, or returns the path unchanged. */
function swapStandalonePage(page: string): string {
    const path = window.location.pathname
    return /[^/]*\.do$/.test(path) ? path.replace(/[^/]*\.do$/, page) : path
}

/**
 * Builds the destination query as an ALLOWLIST, not by deleting what we do not
 * want.
 *
 * The earlier version deleted `plan_id` and kept everything else, so every
 * param added afterwards rode along into the new view: ending an
 * impersonation from a task landed the facilitator on
 * `?id=facilitator&task=...&task_id=...`, pointing the new view at a task
 * belonging to the identity that just ended. A stray `task` param this app
 * does not even write came along too. Anything not named here is dropped.
 *
 * `keepPlan` carries the plan over, because a facilitator returning from an
 * impersonation wants the dashboard for the plan they were just watching.
 * Going the other way starts at the participant's own plan list instead.
 */
function crossViewUrl(
    portalPageId: string,
    standalonePage: string,
    keepPlan: boolean,
): string {
    const current = new URLSearchParams(window.location.search)
    const onPortal = current.has('id')

    const params = new URLSearchParams()
    if (onPortal) {
        params.set('id', portalPageId)
    }

    // {plan_id} accepts a sys_id or a slug, so whichever form the URL already
    // carries is passed straight through rather than normalised.
    const planId = keepPlan ? current.get('plan_id') : null
    if (planId) {
        params.set('plan_id', planId)
    }

    const path = onPortal ? window.location.pathname : swapStandalonePage(standalonePage)
    const query = params.toString()
    return path + (query ? '?' + query : '')
}

/** The participant plans list: `?id=plans` on the portal, the participant `.do` otherwise. */
export function participantPlansUrl(): string {
    return crossViewUrl('plans', PARTICIPANT_PAGE, false)
}

/** The facilitator dashboard: `?id=facilitator` on the portal, the facilitator `.do` otherwise. */
export function facilitatorUrl(): string {
    return crossViewUrl('facilitator', FACILITATOR_PAGE, true)
}

/**
 * Full page navigation, which is mandatory after an impersonation call: the
 * session identity has already changed server-side and only a fresh document
 * request picks it up.
 */
export function goToParticipantPlans(): void {
    window.location.assign(participantPlansUrl())
}

export function goToFacilitator(): void {
    window.location.assign(facilitatorUrl())
}
