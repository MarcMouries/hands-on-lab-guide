/**
 * Shared, envelope-tolerant transport for the Lab REST API.
 *
 * The Scripted REST API nests the handler's `response.setBody(obj)` output
 * under `result`, so the real body is `{ "result": { ... } }`. It can also
 * return a platform error envelope with a 2xx status. Every caller goes
 * through here so that handling lives in exactly one place.
 */

export interface LabJsonResult {
    /** The raw parsed response, used for diagnostics. */
    payload: unknown
    /** The unwrapped handler object. */
    body: Record<string, unknown>
}

export interface LabRequestOptions {
    /** Message for a non-2xx response that carried no error envelope. */
    notOkMessage: (status: number) => string
    /** True when the parsed root is already the handler object (not `result`-wrapped). */
    isBareShape: (candidate: Record<string, unknown>) => boolean
    /** Defaults to GET so existing GET callers are unaffected. */
    method?: 'GET' | 'POST' | 'PATCH'
    /** Serialised as JSON when present. Omitted entirely for plain GETs. */
    body?: unknown
}

/** Shortened, safe preview of an unexpected payload for an error message. */
export function describe(payload: unknown): string {
    try {
        if (payload && typeof payload === 'object') {
            const keys = Object.keys(payload as Record<string, unknown>)
            if (keys.length) {
                return ' Received keys: ' + keys.slice(0, 8).join(', ') + '.'
            }
            return ' Received an empty object.'
        }
        return ' Received: ' + String(payload).slice(0, 120) + '.'
    } catch (e) {
        return ''
    }
}

/** Normalises any thrown value into a displayable message. */
export function toMessage(reason: unknown): string {
    if (reason instanceof Error && reason.message) {
        return reason.message
    }
    return 'Something went wrong talking to the lab API.'
}

export async function requestLabJson(path: string, options: LabRequestOptions): Promise<LabJsonResult> {
    const token = window.g_ck
    if (!token) {
        throw new Error('No session token is available. Reload this page while signed in to ServiceNow.')
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-UserToken': token,
    }

    const init: RequestInit = {
        method: options.method || 'GET',
        credentials: 'same-origin',
        headers: headers,
    }

    // Only set a body/Content-Type when there is one, so plain GET requests
    // are byte-for-byte what they were before write support was added.
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(options.body)
    }

    const response = await fetch(path, init)

    const text = await response.text()

    let payload: unknown = null
    try {
        payload = text ? JSON.parse(text) : null
    } catch (e) {
        throw new Error(
            'The lab API did not return JSON (HTTP ' + response.status + '). Received: ' + text.slice(0, 120)
        )
    }

    const envelope = (payload || {}) as Record<string, unknown>

    // A platform error envelope can arrive with a 2xx status.
    const errorEnvelope = envelope.error as { message?: string; detail?: string } | undefined
    if (errorEnvelope && (errorEnvelope.message || errorEnvelope.detail)) {
        throw new Error('The lab API reported an error: ' + (errorEnvelope.message || errorEnvelope.detail))
    }

    if (!response.ok) {
        throw new Error(options.notOkMessage(response.status))
    }

    if (options.isBareShape(envelope)) {
        return { payload: payload, body: envelope }
    }

    const nested = envelope.result
    if (nested && typeof nested === 'object') {
        return { payload: payload, body: nested as Record<string, unknown> }
    }

    return { payload: payload, body: envelope }
}
