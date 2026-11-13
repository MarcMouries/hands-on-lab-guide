import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlanDetail } from '../hooks/usePlanDetail'
import { LabSection, LabTask, TaskResult, patchResult } from '../services/participantApi'
import { toMessage } from '../services/labHttp'
import { TASK_PARAM, goToPlans, readUrlParam, setUrlParams } from '../utils/navigate'
import { planSlug } from '../utils/planSlug'
import { promptTokensFor } from '../utils/promptTokens'
import { anyTaskStarted, firstOpenTaskId, flattenTasks, nextOpenTaskId } from '../utils/taskStatus'
import { FeedbackPanel } from './FeedbackPanel'
import { ProgressBar } from './ProgressBar'
import { TaskNav } from './TaskNav'
import { TaskPanel } from './TaskPanel'

/**
 * How a task is named in the URL: the same readable slug `plan` uses, so a
 * shared link reads `?plan=Now-Assist-for-Creator&task=Explain-existing-code`
 * rather than carrying a sys_id nobody can check at a glance.
 *
 * Resolution is purely client-side, against the plan already loaded, so no
 * server round trip and no stored slug column. Where two titles slug to the
 * same thing the sys_id is used for both, because a link that opens the wrong
 * task is worse than an ugly one.
 *
 * Six words rather than the four a plan gets: there is no server rule to match
 * here, and task titles are sentences, so four of them read as a cut-off
 * fragment.
 */
const TASK_SLUG_WORDS = 6

function taskParamFor(sections: LabSection[], sysId: string): string {
    const tasks = flattenTasks(sections)
    const wanted = tasks.filter((task) => task.sys_id === sysId)
    const slug = wanted.length ? planSlug(wanted[0].title, TASK_SLUG_WORDS) : ''
    if (!slug) {
        return sysId
    }
    const sharing = tasks.filter(
        (task) =>
            planSlug(task.title, TASK_SLUG_WORDS).toLowerCase() === slug.toLowerCase(),
    )
    return sharing.length === 1 ? slug : sysId
}

/** The task a `task` names, accepting either the slug or a sys_id. */
function taskIdFor(sections: LabSection[], param: string): string {
    if (!param) {
        return ''
    }
    const needle = param.toLowerCase()
    const tasks = flattenTasks(sections)
    for (const task of tasks) {
        if (task.sys_id.toLowerCase() === needle) {
            return task.sys_id
        }
    }
    for (const task of tasks) {
        if (planSlug(task.title, TASK_SLUG_WORDS).toLowerCase() === needle) {
            return task.sys_id
        }
    }
    return ''
}

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

    /**
     * Whether to open on the welcome page rather than on the first task.
     *
     * Shown on a first visit only: the plan's description explains how the
     * whole thing is meant to be worked through, and dropping somebody
     * straight into task one hides it behind a side nav they have no reason to
     * read. Once any task has been started the plan opens on the work instead,
     * because by then they know what this is.
     */
    const [showWelcome, setShowWelcome] = useState(false)

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

    /** The task in the URL, but only when it names a task in this plan. */
    const taskIdFromUrl = useCallback((sectionList: LabSection[]): string => {
        return taskIdFor(sectionList, readUrlParam(TASK_PARAM))
    }, [])

    // Seed progress and the open task once the plan arrives. A task in the
    // URL wins, so a deep link opens that task instead of the first open one.
    useEffect(() => {
        if (!plan) {
            return
        }
        setPercent(plan.percent_complete)
        setOverrides({})
        opened.current = {}

        // A deep link to a task is a request for that task, not for the
        // welcome page, so it wins.
        setShowWelcome(!anyTaskStarted(plan.sections) && !readUrlParam(TASK_PARAM))

        const deepLinked = taskIdFromUrl(plan.sections)
        const taskId =
            deepLinked || firstOpenTaskId(plan.sections, (task) => task.result)
        setSelectedTaskId(taskId)

        // Reflect the resolved task without adding a Back step for a link that
        // did not name one, drop a task that is not in this plan, and
        // upgrade an older link that still carries a sys_id to the slug.
        const param = taskId ? taskParamFor(plan.sections, taskId) : ''
        if (param !== readUrlParam(TASK_PARAM)) {
            setUrlParams({ [TASK_PARAM]: param || null }, true)
        }
    }, [plan, taskIdFromUrl])

    // Back/forward move between tasks, since selecting one pushes an entry.
    useEffect(() => {
        if (!plan) {
            return
        }
        const onPopState = () => {
            const taskId = taskIdFromUrl(plan.sections)
            if (taskId) {
                setSubmitError('')
                setSelectedTaskId(taskId)
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [plan, taskIdFromUrl])

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

    // Participant number and prefix, for the `{{token}}` placeholders in step
    // content. Enrolment assigns them, so they arrive with the plan.
    const promptTokens = useMemo(
        () => promptTokensFor(plan ? plan.participant : null),
        [plan],
    )

    // Opening a not_started task marks it in progress.
    useEffect(() => {
        if (!selected || !selectedResult) {
            return
        }
        /*
         * Not while the welcome page is up. The task underneath is already
         * selected so that dismissing the welcome is instant, but marking it
         * in progress before they have agreed to begin would both overstate
         * what they have done and hide the welcome page from them for ever.
         */
        if (showWelcome) {
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
    }, [selected, selectedResult, showWelcome])

    const onSelect = useCallback(
        (taskId: string) => {
            setSubmitError('')
            setSelectedTaskId(taskId)
            // Pushed, not replaced, so Back returns to the previous task.
            setUrlParams({
                [TASK_PARAM]: plan ? taskParamFor(plan.sections, taskId) : taskId,
            })
        },
        [plan],
    )

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
                {/* The welcome card carries its own, like the plans list. */}
                {plan && !showWelcome ? (
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

            {plan && sections.length && showWelcome ? (
                <ul className="holg-cards">
                    <li className="holg-card2">
                        {/* No title: the page heading above already names the
                          * plan, and repeating it is the sort of duplication
                          * that reads as a mistake. */}
                        {/*
                          * Split on blank lines rather than dropped into one
                          * paragraph: this description is several paragraphs of
                          * how to work through the plan, and run together it is
                          * a wall nobody reads.
                          */}
                        {plan.description
                            .split(/\n\s*\n/)
                            .map((para) => para.trim())
                            .filter((para) => !!para)
                            .map((para, index) => (
                                <p className="holg-card2__desc" key={index}>
                                    {para}
                                </p>
                            ))}

                        <ProgressBar
                            percent={percent}
                            label={'Your progress through ' + plan.name}
                        />

                        <div className="holg-card2__actions">
                            <button
                                type="button"
                                className="holg-btn holg-btn--primary"
                                onClick={() => setShowWelcome(false)}
                            >
                                Start the lab
                            </button>
                        </div>
                    </li>
                </ul>
            ) : null}

            {plan && sections.length && !showWelcome ? (
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
                                <TaskPanel
                                    section={selected.section}
                                    task={selected.task}
                                    tokens={promptTokens}
                                />
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
