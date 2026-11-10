/**
 * Session impersonation against the platform UI endpoint.
 *
 * Both starting and ending impersonation are the SAME call - a POST to
 * `/api/now/ui/impersonate/<sys_id>`. Starting passes the target user;
 * "ending" passes the ORIGINAL user's sys_id, which switches the session back.
 * There is no separate un-impersonate endpoint.
 *
 * This deliberately does NOT go through `requestLabJson`: that helper encodes
 * the `/api/x_snc_holg/lab` envelope rules (the `result` unwrap, the bare-shape
 * probe), none of which apply to a platform endpoint whose response shape is
 * not contractual. So no shape is assumed here - only transport-level failures
 * are reported.
 *
 * The platform itself permits this only for `admin` / `impersonator`; the UI
 * gate in front of it is defence in depth, not the security boundary.
 */

const IMPERSONATE_PATH = '/api/now/ui/impersonate/'

/*
 * Remembering the original user.
 *
 * The scoped server API can report THAT the session is impersonating
 * (ScopedGlideSession.isImpersonating()) but NOT who the original user is -
 * getImpersonatingUserID/Name/DisplayName are not exposed to a scoped app, and
 * gs.getImpersonatingUserName() is fenced. So the browser records the original
 * user at the moment impersonation starts and uses it to switch back.
 *
 * localStorage (not sessionStorage) so the banner still works in a new tab on
 * the same origin. If it is missing - storage cleared, or impersonation was
 * started outside this app - the UI says so and points at the platform user
 * menu rather than guessing.
 */
const REAL_USER_KEY = 'x_snc_holg.impersonation.real_user'

export interface RememberedUser {
    id: string
    name: string
}

export function rememberRealUser(user: RememberedUser): void {
    try {
        if (user && user.id) {
            window.localStorage.setItem(REAL_USER_KEY, JSON.stringify(user))
        }
    } catch (e) {
        // Storage can be unavailable (private mode, blocked cookies). The
        // banner degrades to its "cannot identify the original user" path.
    }
}

export function readRealUser(): RememberedUser | null {
    try {
        const raw = window.localStorage.getItem(REAL_USER_KEY)
        if (!raw) {
            return null
        }
        const parsed = JSON.parse(raw) as Partial<RememberedUser>
        if (parsed && typeof parsed.id === 'string' && parsed.id) {
            return { id: parsed.id, name: typeof parsed.name === 'string' ? parsed.name : '' }
        }
        return null
    } catch (e) {
        return null
    }
}

export function forgetRealUser(): void {
    try {
        window.localStorage.removeItem(REAL_USER_KEY)
    } catch (e) {
        // Nothing useful to do.
    }
}

/** Pulls a message out of an unknown platform error payload, if there is one. */
function envelopeMessage(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
        return ''
    }
    const error = (payload as Record<string, unknown>).error
    if (!error || typeof error !== 'object') {
        return ''
    }
    const detail = error as { message?: unknown; detail?: unknown }
    if (typeof detail.message === 'string' && detail.message) {
        return detail.message
    }
    if (typeof detail.detail === 'string' && detail.detail) {
        return detail.detail
    }
    return ''
}

async function switchUser(userSysId: string, intent: string): Promise<void> {
    const target = (userSysId || '').trim()
    if (!target) {
        throw new Error('Cannot ' + intent + ': no user sys_id was available for this action.')
    }

    const token = window.g_ck
    if (!token) {
        throw new Error(
            'No session token is available, so the user cannot be switched. Reload this page while signed in to ServiceNow.'
        )
    }

    let response: Response
    try {
        response = await fetch(IMPERSONATE_PATH + encodeURIComponent(target), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-UserToken': token,
            },
            body: '{}',
        })
    } catch (reason) {
        throw new Error(
            'Could not reach the impersonation endpoint to ' + intent + '. Check your connection and try again.'
        )
    }

    const text = await response.text()

    let payload: unknown = null
    let parsed = false
    if (text) {
        try {
            payload = JSON.parse(text)
            parsed = true
        } catch (reason) {
            parsed = false
        }
    }

    // A platform error envelope can arrive with a 2xx status.
    const reported = envelopeMessage(payload)
    if (reported) {
        throw new Error('The impersonation endpoint reported an error: ' + reported)
    }

    if (!response.ok) {
        const suffix =
            response.status === 401 || response.status === 403
                ? ' Impersonation requires the admin or impersonator role.'
                : ''
        throw new Error('Could not ' + intent + ' (HTTP ' + response.status + ').' + suffix)
    }

    // 2xx with a body that is not JSON means something other than the API
    // answered (a login redirect, an HTML error page); an EMPTY body is a
    // normal success for this endpoint and is accepted.
    if (text && !parsed) {
        throw new Error(
            'The impersonation endpoint did not return JSON (HTTP ' +
                response.status +
                '). Received: ' +
                text.slice(0, 120)
        )
    }
}

/**
 * Start impersonating `userSysId`, recording `realUser` first so the session
 * can be switched back later.
 *
 * The session identity changes server-side, so the caller MUST follow this
 * with a full page navigation - a React state update would keep rendering
 * under the old identity.
 */
export async function impersonate(userSysId: string, realUser: RememberedUser): Promise<void> {
    // Recorded BEFORE the switch, because afterwards the browser can no longer
    // find out who the original user was.
    rememberRealUser(realUser)
    try {
        await switchUser(userSysId, 'start impersonation')
    } catch (reason) {
        forgetRealUser()
        throw reason
    }
}

/**
 * End impersonation by switching the session back to the remembered original
 * user. Also requires a full page navigation afterwards.
 */
export async function endImpersonation(): Promise<void> {
    const real = readRealUser()
    if (!real) {
        throw new Error(
            'The original user for this session could not be identified, so impersonation cannot be ended here. Use the ServiceNow user menu to end impersonation.'
        )
    }
    await switchUser(real.id, 'end impersonation')
    forgetRealUser()
}
