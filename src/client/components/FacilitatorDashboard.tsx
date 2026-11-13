import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './FacilitatorDashboard.css'
import { useMe } from '../hooks/useMe'
import { usePlans } from '../hooks/usePlans'
import { useFacilitatorSummary } from '../hooks/useFacilitatorSummary'
import { formatClockTime } from '../utils/format'
import { setUrlParams } from '../utils/navigate'
import { planSlug } from '../utils/planSlug'
import { EmptyState, Panel } from './Panel'
import { ParticipantTable } from './ParticipantTable'
import { RecentFeedback } from './RecentFeedback'
import { SectionPassRateChart } from './SectionPassRateChart'
import { SummaryTiles } from './SummaryTiles'
import { TaskResultsChart } from './TaskResultsChart'

interface Props {
    pageName: string
    params: Record<string, string>
}

export default function FacilitatorDashboard({ pageName, params }: Props) {
    const plansState = usePlans()
    const [planId, setPlanId] = useState('')

    /*
     * `/me` only decides whether the admin-only Impersonate control renders.
     * `useMe` shares one request per page load with the impersonation bar, so
     * mounting both does not issue `/me` twice. A failed or pending load
     * leaves `me` null, which means the control simply does not appear.
     */
    const meState = useMe()
    const canImpersonate = !!meState.me && meState.me.isAdmin

    /*
     * Pick the requested plan when it exists, otherwise the first one.
     *
     * Matches a sys_id OR a slug, because that is what the REST layer accepts
     * for {plan_id} and what the participant views link with. Matching only on
     * sys_id made `?id=facilitator&plan_id=Now-Assist-for-Creator` fall back to
     * the first plan without saying why.
     */
    const requested = params.plan_id || ''
    const resolved = useMemo(() => {
        if (!plansState.plans.length) {
            return ''
        }
        const wanted = requested.toLowerCase()
        if (!wanted) {
            return plansState.plans[0].sys_id
        }
        const match = plansState.plans.filter(
            (plan) =>
                plan.sys_id.toLowerCase() === wanted ||
                planSlug(plan.name).toLowerCase() === wanted,
        )
        return match.length ? match[0].sys_id : plansState.plans[0].sys_id
    }, [plansState.plans, requested])

    /** The slug a plan should appear as in the URL, by sys_id. */
    const slugFor = useCallback(
        (sysId: string): string => {
            const match = plansState.plans.filter((plan) => plan.sys_id === sysId)
            return match.length ? planSlug(match[0].name) : ''
        },
        [plansState.plans],
    )

    useEffect(() => {
        if (!resolved || planId) {
            return
        }
        setPlanId(resolved)
        // Make the view linkable straight away, including when it landed here
        // with no plan_id at all and fell back to the first plan. Replaced,
        // not pushed: arriving is not a navigation step worth going Back to.
        const slug = slugFor(resolved)
        if (slug && slug.toLowerCase() !== requested.toLowerCase()) {
            setUrlParams({ plan_id: slug }, true)
        }
    }, [resolved, planId, requested, slugFor])

    const onPlanChange = useCallback(
        (sysId: string) => {
            setPlanId(sysId)
            // Pushed, so Back returns to the plan that was open before.
            setUrlParams({ plan_id: slugFor(sysId) || sysId })
        },
        [slugFor],
    )

    const summaryState = useFacilitatorSummary(planId)
    const summary = summaryState.summary

    return (
        <section className="holg-fac" aria-labelledby="holg-fac-title">
            <header className="holg-fac__header">
                <h1 className="holg-fac__title" id="holg-fac-title">
                    {pageName}
                </h1>
                <div className="holg-toolbar">
                    <div className="holg-field">
                        <label className="holg-field__label" htmlFor="holg-plan">
                            Evaluation plan
                        </label>
                        <select
                            id="holg-plan"
                            className="holg-select"
                            value={planId}
                            disabled={plansState.loading || !plansState.plans.length}
                            onChange={(event) => onPlanChange(event.target.value)}
                        >
                            {plansState.plans.map((plan) => (
                                <option value={plan.sys_id} key={plan.sys_id}>
                                    {plan.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="holg-toolbar__actions">
                        <span className="holg-updated" aria-live="polite">
                            {summaryState.refreshing
                                ? 'Refreshing\u2026'
                                : summaryState.lastUpdated
                                  ? 'Last updated ' + formatClockTime(summaryState.lastUpdated)
                                  : ''}
                        </span>
                        <button
                            type="button"
                            className="holg-button"
                            onClick={summaryState.refresh}
                            disabled={
                                !planId || summaryState.initialLoading || summaryState.refreshing
                            }
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                <p className="holg-fac__note">Refreshes automatically every 30 seconds.</p>
            </header>

            {plansState.error ? (
                <p className="holg-alert" role="alert">
                    {plansState.error}
                </p>
            ) : null}

            {summaryState.error ? (
                <p className="holg-alert" role="alert">
                    {summaryState.error}
                    {summary ? ' Showing the last data that loaded successfully.' : ''}
                </p>
            ) : null}

            {!plansState.loading && !plansState.plans.length && !plansState.error ? (
                <Panel title="No plans available">
                    <EmptyState>
                        There are no published evaluation plans. Publish a plan to see progress
                        here.
                    </EmptyState>
                </Panel>
            ) : null}

            {summaryState.initialLoading && !summary ? (
                <p className="holg-loading" aria-live="polite">
                    {'Loading plan summary\u2026'}
                </p>
            ) : null}

            {summary ? (
                <>
                    <SummaryTiles summary={summary} />

                    <Panel title="Participant progress">
                        <ParticipantTable
                            rows={summary.participants}
                            canImpersonate={canImpersonate}
                            currentUser={
                                meState.me
                                    ? { id: meState.me.sys_id, name: meState.me.name }
                                    : undefined
                            }
                        />
                    </Panel>

                    <Panel title="Results by task">
                        <TaskResultsChart rows={summary.results_by_task} />
                    </Panel>

                    <Panel title="Pass rate by section">
                        <SectionPassRateChart rows={summary.pass_rate_by_section} />
                    </Panel>

                    <Panel title="Recent feedback">
                        <RecentFeedback rows={summary.recent_submitted} />
                    </Panel>
                </>
            ) : null}
        </section>
    )
}
