import React, { useCallback, useState } from 'react'
import { useParticipantPlans } from '../hooks/useParticipantPlans'
import { startPlan } from '../services/participantApi'
import { toMessage } from '../services/labHttp'
import { goToPlan } from '../utils/navigate'
import { planSlug } from '../utils/planSlug'
import { ProgressBar } from './ProgressBar'

export function PlansView() {
    const { plans, error, loading } = useParticipantPlans()
    const [busyPlanId, setBusyPlanId] = useState('')
    const [actionError, setActionError] = useState('')

    // Takes the sys_id for the busy flag and the slug for the URL: the busy
    // state is keyed by sys_id, but links should read as the plan's name.
    const onStart = useCallback((planId: string, slug: string) => {
        setActionError('')
        setBusyPlanId(planId)
        startPlan(planId)
            .then(() => {
                // Navigating away, so no need to clear the busy flag.
                goToPlan(slug || planId)
            })
            .catch((reason: unknown) => {
                setActionError(toMessage(reason))
                setBusyPlanId('')
            })
    }, [])

    return (
        <section className="holg-lab" aria-labelledby="holg-plans-title">
            <header className="holg-lab__header">
                <h1 className="holg-lab__title" id="holg-plans-title">
                    Evaluation plans
                </h1>
                <p className="holg-lab__lede">
                    Work through a published plan task by task, then record a Pass or Fail with
                    your feedback.
                </p>
            </header>

            {error ? (
                <p className="holg-alert" role="alert">
                    {error}
                </p>
            ) : null}

            {actionError ? (
                <p className="holg-alert" role="alert">
                    {actionError}
                </p>
            ) : null}

            {loading && !plans.length ? (
                <p className="holg-loading" aria-live="polite">
                    {'Loading plans\u2026'}
                </p>
            ) : null}

            {!loading && !plans.length && !error ? (
                <p className="holg-empty">
                    There are no published evaluation plans available to you yet.
                </p>
            ) : null}

            <ul className="holg-cards">
                {plans.map((plan) => {
                    const participant = plan.participant
                    const started = !!participant
                    const percent = participant ? participant.percent_complete : null
                    const busy = busyPlanId === plan.sys_id

                    return (
                        <li className="holg-card2" key={plan.sys_id}>
                            <h2 className="holg-card2__title">{plan.name}</h2>
                            {plan.description ? (
                                <p className="holg-card2__desc">{plan.description}</p>
                            ) : null}

                            <ProgressBar
                                percent={percent}
                                label={'Progress for ' + plan.name}
                            />

                            <div className="holg-card2__actions">
                                {started ? (
                                    <button
                                        type="button"
                                        className="holg-btn holg-btn--primary"
                                        onClick={() => goToPlan(planSlug(plan.name) || plan.sys_id)}
                                    >
                                        Continue
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="holg-btn holg-btn--primary"
                                        disabled={busy}
                                        onClick={() => onStart(plan.sys_id, planSlug(plan.name))}
                                    >
                                        {busy ? 'Starting\u2026' : 'Start'}
                                    </button>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
