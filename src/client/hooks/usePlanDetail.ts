import { useCallback, useEffect, useRef, useState } from 'react'
import { PlanDetail, fetchPlanDetail } from '../services/participantApi'
import { toMessage } from '../services/labHttp'

export interface PlanDetailState {
    plan: PlanDetail | null
    error: string
    loading: boolean
    reload: () => void
}

/** Loads one plan with its full section/task tree. */
export function usePlanDetail(planId: string): PlanDetailState {
    const [plan, setPlan] = useState<PlanDetail | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const generation = useRef(0)

    const load = useCallback((identifier: string) => {
        const token = generation.current
        if (!identifier) {
            setLoading(false)
            return
        }
        setLoading(true)
        fetchPlanDetail(identifier)
            .then((data) => {
                if (generation.current !== token) {
                    return
                }
                setPlan(data)
                setError('')
            })
            .catch((reason: unknown) => {
                if (generation.current !== token) {
                    return
                }
                setError(toMessage(reason))
            })
            .finally(() => {
                if (generation.current === token) {
                    setLoading(false)
                }
            })
    }, [])

    useEffect(() => {
        generation.current = generation.current + 1
        setPlan(null)
        setError('')
        load(planId)
    }, [planId, load])

    const reload = useCallback(() => {
        generation.current = generation.current + 1
        load(planId)
    }, [load, planId])

    return { plan: plan, error: error, loading: loading, reload: reload }
}
