import React, { useCallback, useEffect, useState } from 'react'
import { TaskResult } from '../services/participantApi'
import { formatDateTime, resultLabel } from '../utils/format'
import { isSubmitted } from '../utils/taskStatus'

interface Props {
    /** null when no Task Result row exists for this task. */
    result: TaskResult | null
    busy: boolean
    error: string
    hasNext: boolean
    onSubmit: (verdict: 'pass' | 'fail', feedback: string) => void
    onNext: () => void
    /** Changes whenever the open task changes, so local form state resets. */
    taskId: string
}

export function FeedbackPanel({
    result,
    busy,
    error,
    hasNext,
    onSubmit,
    onNext,
    taskId,
}: Props) {
    const [verdict, setVerdict] = useState<'pass' | 'fail' | ''>('')
    const [feedback, setFeedback] = useState('')

    // Reset the form when switching tasks.
    useEffect(() => {
        setVerdict('')
        setFeedback('')
    }, [taskId])

    const submit = useCallback(() => {
        if (verdict === 'pass' || verdict === 'fail') {
            onSubmit(verdict, feedback)
        }
    }, [verdict, feedback, onSubmit])

    /* ---- No result record: explain rather than offer a dead form ---- */
    if (!result) {
        return (
            <section className="holg-feedbackPanel" aria-labelledby="holg-fb-title">
                <h3 className="holg-feedbackPanel__title" id="holg-fb-title">
                    Your result
                </h3>
                <p className="holg-note">
                    There is no result record for this task yet, so it cannot be submitted.
                    Task results are created for you when the plan is set up; ask your
                    facilitator to generate them for this plan.
                </p>
            </section>
        )
    }

    /* ---- Already submitted: read-only ---- */
    if (isSubmitted(result)) {
        const failed = result.result === 'fail'
        return (
            <section className="holg-feedbackPanel" aria-labelledby="holg-fb-title">
                <h3 className="holg-feedbackPanel__title" id="holg-fb-title">
                    Your result
                </h3>
                <p className="holg-submitted">
                    <span
                        className={
                            'holg-chip2 ' + (failed ? 'holg-chip2--fail' : 'holg-chip2--pass')
                        }
                    >
                        {(failed ? '\u2715 ' : '\u2713 ') + resultLabel(result.result)}
                    </span>
                    {result.submitted_on ? (
                        <span className="holg-submitted__when">
                            {'Submitted ' + formatDateTime(result.submitted_on)}
                        </span>
                    ) : null}
                </p>

                <h4 className="holg-feedbackPanel__sub">Your feedback</h4>
                <p className="holg-submitted__feedback">
                    {result.feedback ? result.feedback : 'No feedback was provided.'}
                </p>

                <p className="holg-note">A submitted result is final and cannot be changed.</p>

                {hasNext ? (
                    <button
                        type="button"
                        className="holg-btn holg-btn--primary"
                        onClick={onNext}
                    >
                        Next task
                    </button>
                ) : (
                    <p className="holg-note">
                        Every task in this plan has been submitted. Nice work.
                    </p>
                )}
            </section>
        )
    }

    /* ---- Editable form ---- */
    return (
        <section className="holg-feedbackPanel" aria-labelledby="holg-fb-title">
            <h3 className="holg-feedbackPanel__title" id="holg-fb-title">
                Your result
            </h3>

            {error ? (
                <p className="holg-alert" role="alert">
                    {error}
                </p>
            ) : null}

            <div className="holg-verdict" role="group" aria-label="Result">
                <button
                    type="button"
                    className={
                        'holg-btn holg-btn--toggle' +
                        (verdict === 'pass' ? ' holg-btn--pass-on' : '')
                    }
                    aria-pressed={verdict === 'pass'}
                    disabled={busy}
                    onClick={() => setVerdict('pass')}
                >
                    {'\u2713 Pass'}
                </button>
                <button
                    type="button"
                    className={
                        'holg-btn holg-btn--toggle' +
                        (verdict === 'fail' ? ' holg-btn--fail-on' : '')
                    }
                    aria-pressed={verdict === 'fail'}
                    disabled={busy}
                    onClick={() => setVerdict('fail')}
                >
                    {'\u2715 Fail'}
                </button>
            </div>

            <div className="holg-field">
                <label className="holg-field__label" htmlFor="holg-feedback">
                    Feedback
                </label>
                <textarea
                    id="holg-feedback"
                    className="holg-textarea"
                    rows={4}
                    value={feedback}
                    disabled={busy}
                    placeholder="What happened? What would you change?"
                    onChange={(event) => setFeedback(event.target.value)}
                />
            </div>

            <button
                type="button"
                className="holg-btn holg-btn--primary"
                disabled={busy || (verdict !== 'pass' && verdict !== 'fail')}
                onClick={submit}
            >
                {busy ? 'Submitting\u2026' : 'Submit'}
            </button>
            {verdict !== 'pass' && verdict !== 'fail' ? (
                <p className="holg-note">Choose Pass or Fail to enable Submit.</p>
            ) : null}
        </section>
    )
}
