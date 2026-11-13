import { useCallback, useEffect, useRef, useState } from 'react'
import { ArtifactEvidence, fetchArtifactEvidence } from '../services/facilitatorApi'
import { toMessage } from '../services/labHttp'

export interface EvidenceState {
    evidence: ArtifactEvidence | null
    error: string
    loading: boolean
    scannedAt: Date | null
    refresh: () => void
}

/**
 * Loads artifact evidence for a plan, on demand.
 *
 * Deliberately NOT on the summary's 30-second timer. The summary reads this
 * app's own tables; a scan reads sys_update_xml for the whole room, which is
 * the expensive half, and nothing in it changes second to second - a
 * participant takes minutes to build an artifact. It loads once when the plan
 * opens and again when the facilitator asks.
 *
 * The same generation guard the summary hook uses: a slow reply for the
 * previous plan is dropped rather than shown against the new one.
 */
export function useArtifactEvidence(planId: string): EvidenceState {
    const [evidence, setEvidence] = useState<ArtifactEvidence | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [scannedAt, setScannedAt] = useState<Date | null>(null)

    const generation = useRef(0)
    const inFlight = useRef(false)

    const load = useCallback((identifier: string) => {
        if (!identifier || inFlight.current) {
            return
        }
        const token = generation.current
        inFlight.current = true
        setLoading(true)

        fetchArtifactEvidence(identifier)
            .then((data) => {
                if (generation.current !== token) {
                    return
                }
                setEvidence(data)
                setError('')
                setScannedAt(new Date())
            })
            .catch((reason: unknown) => {
                if (generation.current !== token) {
                    return
                }
                // The rest of the dashboard is unaffected, so this reports in
                // place rather than replacing the view.
                setError(toMessage(reason))
            })
            .finally(() => {
                inFlight.current = false
                if (generation.current === token) {
                    setLoading(false)
                }
            })
    }, [])

    useEffect(() => {
        generation.current = generation.current + 1
        inFlight.current = false
        setEvidence(null)
        setError('')
        setScannedAt(null)

        if (!planId) {
            setLoading(false)
            return
        }
        load(planId)
    }, [planId, load])

    const refresh = useCallback(() => {
        load(planId)
    }, [load, planId])

    return {
        evidence: evidence,
        error: error,
        loading: loading,
        scannedAt: scannedAt,
        refresh: refresh,
    }
}
