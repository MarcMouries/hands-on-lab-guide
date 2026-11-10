import { useEffect, useState } from 'react'
import { LabMe, fetchMe } from '../services/labApi'
import { toMessage } from '../services/labHttp'

/**
 * Shared `/me` load.
 *
 * Both the impersonation bar and the facilitator dashboard need the profile
 * (`isImpersonating` / `isAdmin`), and the bar is mounted next to the
 * dashboard. One module-level promise per page load means `GET /me` is issued
 * exactly once no matter how many components ask for it. A failure clears the
 * cache so a later mount can retry.
 */
let shared: Promise<LabMe> | null = null

export function loadMe(): Promise<LabMe> {
    if (!shared) {
        shared = fetchMe().catch((reason: unknown) => {
            shared = null
            throw reason
        })
    }
    return shared
}

export interface MeState {
    me: LabMe | null
    error: string
    loading: boolean
}

export function useMe(): MeState {
    const [me, setMe] = useState<LabMe | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true

        loadMe()
            .then((value) => {
                if (!active) {
                    return
                }
                setMe(value)
                setError('')
                setLoading(false)
            })
            .catch((reason: unknown) => {
                if (!active) {
                    return
                }
                setError(toMessage(reason))
                setLoading(false)
            })

        return () => {
            active = false
        }
    }, [])

    return { me: me, error: error, loading: loading }
}
