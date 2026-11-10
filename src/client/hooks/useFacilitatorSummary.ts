import { useCallback, useEffect, useRef, useState } from 'react'
import { FacilitatorSummary, fetchFacilitatorSummary } from '../services/facilitatorApi'
import { toMessage } from '../services/labHttp'

export const REFRESH_INTERVAL_MS = 30000

export interface SummaryState {
    summary: FacilitatorSummary | null
    error: string
    /** True only for the very first load of a plan, so data never flashes away. */
    initialLoading: boolean
    /** True for a background or manual refresh while data is already shown. */
    refreshing: boolean
    lastUpdated: Date | null
    refresh: () => void
}

/**
 * Loads the facilitator summary for a plan and refreshes it on an interval.
 *
 * - A generation token discards a late response once the plan has changed, so
 *   a slow reply can never overwrite newer data.
 * - Only one request is in flight at a time.
 * - A failed refresh keeps the last good summary on screen and reports the
 *   error alongside it rather than blanking the dashboard.
 */
export function useFacilitatorSummary(planId: string): SummaryState {
    const [summary, setSummary] = useState<FacilitatorSummary | null>(null)
    const [error, setError] = useState('')
    const [initialLoading, setInitialLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const generation = useRef(0)
    const inFlight = useRef(false)
    const hasData = useRef(false)

    const load = useCallback((identifier: string) => {
        if (!identifier || inFlight.current) {
            return
        }
        const token = generation.current
        inFlight.current = true
        if (hasData.current) {
            setRefreshing(true)
        } else {
            setInitialLoading(true)
        }

        fetchFacilitatorSummary(identifier)
            .then((data) => {
                if (generation.current !== token) {
                    return
                }
                hasData.current = true
                setSummary(data)
                setError('')
                setLastUpdated(new Date())
            })
            .catch((reason: unknown) => {
                if (generation.current !== token) {
                    return
                }
                setError(toMessage(reason))
            })
            .finally(() => {
                inFlight.current = false
                if (generation.current !== token) {
                    return
                }
                setInitialLoading(false)
                setRefreshing(false)
            })
    }, [])

    useEffect(() => {
        // Invalidate anything still in flight for the previous plan.
        generation.current = generation.current + 1
        inFlight.current = false
        hasData.current = false
        setSummary(null)
        setError('')
        setLastUpdated(null)
        setRefreshing(false)

        if (!planId) {
            setInitialLoading(false)
            return
        }

        load(planId)
        const timer = window.setInterval(() => load(planId), REFRESH_INTERVAL_MS)
        return () => {
            window.clearInterval(timer)
        }
    }, [planId, load])

    const refresh = useCallback(() => {
        load(planId)
    }, [load, planId])

    return {
        summary: summary,
        error: error,
        initialLoading: initialLoading,
        refreshing: refreshing,
        lastUpdated: lastUpdated,
        refresh: refresh,
    }
}
