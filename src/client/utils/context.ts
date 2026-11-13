export interface LabPageContext {
    page: string
    params: Record<string, string>
    /**
     * Portal only: writes params into the URL through AngularJS `$location`.
     * Published by the shell widget's client script, so it is absent on the
     * standalone `.do` page and dropped by JSON.stringify for `data-holg`.
     */
    setParams?: (patch: Record<string, string | null>, replace: boolean) => void
}

declare global {
    interface Window {
        __X_SNC_HOLG__?: LabPageContext
        g_ck?: string
    }
}

function paramsFromLocation(): Record<string, string> {
    const search = new URLSearchParams(window.location.search)
    const params: Record<string, string> = {}
    search.forEach((value, key) => {
        params[key] = value
    })
    return params
}

/**
 * Resolves the page name and URL parameters for the React app.
 *
 * Service Portal shell widgets publish `window.__X_SNC_HOLG__` (and a
 * `data-holg` JSON attribute on the root node) from their client script.
 * Standalone `.do` pages fall back to the root node's `data-page` attribute
 * plus URLSearchParams, per the UI Page routing guidance.
 */
export function readLabPageContext(root: HTMLElement): LabPageContext {
    const injected = window.__X_SNC_HOLG__
    if (injected && injected.page) {
        return { page: injected.page, params: injected.params || {} }
    }

    const attribute = root.getAttribute('data-holg')
    if (attribute) {
        try {
            const parsed = JSON.parse(attribute) as LabPageContext
            if (parsed && parsed.page) {
                return { page: parsed.page, params: parsed.params || {} }
            }
        } catch (error) {
            // Fall through to URLSearchParams below.
        }
    }

    return { page: root.getAttribute('data-page') || 'Hands-On Lab Guide', params: paramsFromLocation() }
}
