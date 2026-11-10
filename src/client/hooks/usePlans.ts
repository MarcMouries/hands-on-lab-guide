import { useCallback, useEffect, useRef, useState } from 'react'
import { LabPlan, fetchPlans } from '../services/facilitatorApi'
import { toMessage } from '../services/labHttp'

export interface PlansState {
    plans: LabPlan[]
    error: string
    loading: boolean
    reload: () => void
}

/** Loads the published plan list once, with a manual reload. */
export function usePlans(): PlansState {
    const [plans, setPlans] = useState<LabPlan[]>([])
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
        fetchPlans()
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
