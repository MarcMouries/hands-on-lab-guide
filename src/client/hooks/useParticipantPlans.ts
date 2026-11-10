import { useCallback, useEffect, useRef, useState } from 'react'
import { ParticipantPlan, fetchParticipantPlans } from '../services/participantApi'
import { toMessage } from '../services/labHttp'

export interface ParticipantPlansState {
    plans: ParticipantPlan[]
    error: string
    loading: boolean
    reload: () => void
}

/**
 * Published plans with the caller's own participation, so the view can choose
 * between Start and Continue.
 */
export function useParticipantPlans(): ParticipantPlansState {
    const [plans, setPlans] = useState<ParticipantPlan[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const reload = useCallback(() => {
        setLoading(true)
        fetchParticipantPlans()
            .then((data) => {
                if (!mounted.current) {
                    return
                }
                setPlans(data)
                setError('')
            })
            .catch((reason: unknown) => {
                if (!mounted.current) {
                    return
                }
                setError(toMessage(reason))
            })
            .finally(() => {
                if (mounted.current) {
                    setLoading(false)
                }
            })
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    return { plans: plans, error: error, loading: loading, reload: reload }
}
