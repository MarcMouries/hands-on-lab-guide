import React, { useCallback, useState } from 'react'
import './ImpersonationBar.css'
import { useMe } from '../hooks/useMe'
import { endImpersonation, readRealUser } from '../services/impersonationApi'
import { toMessage } from '../services/labHttp'
import { goToFacilitator } from '../utils/navigate'

/** Warning triangle. SVG rather than a unicode glyph, and inherits text colour. */
function WarningGlyph() {
    return (
        <svg
            className="holg-imp__glyph"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="currentColor"
                d="M12 2.5 23 21.5H1L12 2.5Zm0 4.2L4.5 19.5h15L12 6.7Zm-1 3.8h2v5h-2v-5Zm0 6.5h2v2h-2v-2Z"
            />
        </svg>
    )
}

/**
 * Session impersonation banner, rendered by BOTH entry points so either
 * surface tells the truth on its own.
 *
 * It renders nothing at all unless `/me` reports `isImpersonating`, so the
 * normal (non-impersonated) page is byte-for-byte unaffected.
 */
export function ImpersonationBar() {
    const { me } = useMe()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const onEnd = useCallback(() => {
        if (!me) {
            return
        }
        setError('')

        // The scoped server API cannot tell us who the original user is, so it
        // comes from what the browser recorded when impersonation started.
        // Without it there is nothing to switch back to - the endpoint is
        // addressed BY that sys_id - so say so plainly rather than firing a
        // request that cannot work.
        const real = readRealUser()
        if (!real) {
            setError(
                'The original user for this session could not be identified, so impersonation cannot be ended here. Use the ServiceNow user menu (System Settings) to end impersonation.',
            )
            return
        }

        setBusy(true)
        endImpersonation()
            .then(() => {
                // Identity has changed server-side: full page navigation only.
                goToFacilitator()
            })
            .catch((reason: unknown) => {
                setError(toMessage(reason))
                setBusy(false)
            })
    }, [me])

    if (!me || !me.isImpersonating) {
        return null
    }

    const viewingAs = me.name || 'another user'
    const remembered = readRealUser()

    return (
        <div className="holg-imp" role="status">
            <div className="holg-imp__inner">
                <WarningGlyph />
                <div className="holg-imp__text">
                    <span className="holg-imp__title">
                        <span className="holg-imp__tag">Impersonating</span>
                        {' Viewing as ' + viewingAs}
                    </span>
                    <span className="holg-imp__detail">
                        {remembered && remembered.name
                            ? 'Your real account is ' + remembered.name + '.'
                            : 'Your real account could not be identified.'}
                        {' Everything you do here is recorded against ' + viewingAs + '.'}
                    </span>
                    {error ? (
                        <span className="holg-imp__error" role="alert">
                            {error}
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="holg-imp__btn"
                    onClick={onEnd}
                    disabled={busy}
                    aria-busy={busy}
                >
                    {busy ? 'Ending\u2026' : 'End impersonation'}
                </button>
            </div>
        </div>
    )
}

export default ImpersonationBar
