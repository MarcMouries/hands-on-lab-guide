import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlanDetail } from '../hooks/usePlanDetail'
import { LabSection, LabTask, TaskResult, patchResult } from '../services/participantApi'
import { toMessage } from '../services/labHttp'
import { goToPlans } from '../utils/navigate'
import { firstOpenTaskId, nextOpenTaskId } from '../utils/taskStatus'
import { FeedbackPanel } from './FeedbackPanel'
import { ProgressBar } from './ProgressBar'
import { TaskNav } from './TaskNav'
import { TaskPanel } from './TaskPanel'

export function PlanView({ planId }: { planId: string }) {
    const { plan, error, loading } = usePlanDetail(planId)

    /**
     * Task results updated locally after a PATCH, keyed by task sys_id. This is
     * what lets the nav icon and progress bar update without refetching.
     */
    const [overrides, setOverrides] = useState<Record<string, TaskResult>>({})
    const [percent, setPercent] = useState<number | null>(null)
    const [selectedTaskId, setSelectedTaskId] = useState('')
    const [submitBusy, setSubmitBusy] = useState(false)
    const [submitError, setSubmitError] = useState('')

    /** Tasks already sent an in_progress PATCH, so it fires at most once each. */
    const opened = useRef<Record<string, boolean>>({})

    const sections: LabSection[] = plan ? plan.sections : []

    const resultFor = useCallback(
        (task: LabTask): TaskResult | null => {
            const override = overrides[task.sys_id]
            return override ? override : task.result
        },
        [overrides],
    )

    // Seed progress and the default open task once the plan arrives.
    useEffect(() => {
        if (!plan) {
            return
        }
        setPercent(plan.percent_complete)
        setOverrides({})
        opened.current = {}
        setSelectedTaskId(firstOpenTaskId(plan.sections, (task) => task.result))
    }, [plan])

    const selected = useMemo(() => {
        for (let s = 0; s < sections.length; s++) {
            const tasks = sections[s].tasks
            for (let t = 0; t < tasks.length; t++) {
                if (tasks[t].sys_id === selectedTaskId) {
                    return { section: sections[s], task: tasks[t] }
                }
            }
        }
        return null
    }, [sections, selectedTaskId])

    const selectedResult = selected ? resultFor(selected.task) : null

    // Opening a not_started task marks it in progress.
    useEffect(() => {
        if (!selected || !selectedResult) {
            return
        }
        const taskId = selected.task.sys_id
        if (selectedResult.status !== 'not_started' || opened.current[taskId]) {
            return
        }
        opened.current[taskId] = true
        patchResult(selectedResult.sys_id, { status: 'in_progress' })
            .then((response) => {
                if (response.result) {
                    const fresh = response.result
                    setOverrides((current) => {
                        const next: Record<string, TaskResult> = {}
                        for (const key in current) {
                            next[key] = current[key]
                        }
                        next[taskId] = fresh
                        return next
                    })
                }
                if (response.percent_complete !== null) {
                    setPercent(response.percent_complete)
                }
            })
            .catch(() => {
                // Non-fatal: the task is still fully readable and submittable.
                opened.current[taskId] = false
            })
    }, [selected, selectedResult])

    const onSelect = useCallback((taskId: string) => {
        setSubmitError('')
        setSelectedTaskId(taskId)
    }, [])

    const onSubmit = useCallback(
        (verdict: 'pass' | 'fail', feedback: string) => {
            if (!selected || !selectedResult) {
                return
            }
            const taskId = selected.task.sys_id
            setSubmitBusy(true)
            setSubmitError('')
            patchResult(selectedResult.sys_id, {
                status: 'submitted',
                result: verdict,
                feedback: feedback,
            })
                .then((response) => {
                    if (response.result) {
                        const fresh = response.result
                        setOverrides((current) => {
                            const next: Record<string, TaskResult> = {}
                            for (const key in current) {
                                next[key] = current[key]
                            }
                            next[taskId] = fresh
                            return next
                        })
                    }
                    if (response.percent_complete !== null) {
                        setPercent(response.percent_complete)
                    }
                })
                .catch((reason: unknown) => {
                    setSubmitError(toMessage(reason))
                })
                .finally(() => {
                    setSubmitBusy(false)
                })
        },
        [selected, selectedResult],
    )

    const nextTaskId = useMemo(() => {
        if (!selected) {
            return ''
        }
        return nextOpenTaskId(sections, selected.task.sys_id, resultFor)
    }, [sections, selected, resultFor])

    const onNext = useCallback(() => {
        if (nextTaskId) {
            onSelect(nextTaskId)
        }
    }, [nextTaskId, onSelect])

    return (
        <section className="holg-lab" aria-labelledby="holg-plan-title">
            <header className="holg-lab__header">
                <button type="button" className="holg-link" onClick={goToPlans}>
                    {'\u2190 All plans'}
                </button>
                <h1 className="holg-lab__title" id="holg-plan-title">
                    {plan ? plan.name : 'Evaluation plan'}
                </h1>
                {plan ? (
                    <ProgressBar
                        percent={percent}
                        label={'Your progress through ' + plan.name}
                        size="md"
                    />
                ) : null}
            </header>

            {error ? (
                <p className="holg-alert" role="alert">
                    {error}
                </p>
            ) : null}

            {loading && !plan ? (
                <p className="holg-loading" aria-live="polite">
                    {'Loading plan\u2026'}
                </p>
            ) : null}

            {plan && !sections.length ? (
                <p className="holg-empty">This plan has no sections yet.</p>
            ) : null}

            {plan && sections.length ? (
                <div className="holg-split">
                    <TaskNav
                        sections={sections}
                        selectedTaskId={selectedTaskId}
                        resultFor={resultFor}
                        onSelect={onSelect}
                    />

                    <div className="holg-main">
                        {selected ? (
                            <>
                                <TaskPanel section={selected.section} task={selected.task} />
                                <FeedbackPanel
                                    taskId={selected.task.sys_id}
                                    result={selectedResult}
                                    busy={submitBusy}
                                    error={submitError}
                                    hasNext={!!nextTaskId}
                                    onSubmit={onSubmit}
                                    onNext={onNext}
                                />
                            </>
                        ) : (
                            <p className="holg-empty">Select a task to begin.</p>
                        )}
                    </div>
                </div>
            ) : null}
        </section>
    )
}
