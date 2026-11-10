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

function crossViewUrl(portalPageId: string, standalonePage: string): string {
    const params = new URLSearchParams(window.location.search)

    // A plan from the previous identity must never leak into the new view.
    params.delete('plan_id')

    const path = params.has('id')
        ? (params.set('id', portalPageId), window.location.pathname)
        : swapStandalonePage(standalonePage)

    const query = params.toString()
    return path + (query ? '?' + query : '')
}

/** The participant plans list: `?id=plans` on the portal, the participant `.do` otherwise. */
export function participantPlansUrl(): string {
    return crossViewUrl('plans', PARTICIPANT_PAGE)
}

/** The facilitator dashboard: `?id=facilitator` on the portal, the facilitator `.do` otherwise. */
export function facilitatorUrl(): string {
    return crossViewUrl('facilitator', FACILITATOR_PAGE)
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
