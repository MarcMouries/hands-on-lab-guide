import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Authoring.css'
import {
    AuthorPlanSummary,
    AuthorTree,
    NodeFields,
    NodeType,
    createNode,
    deleteNode,
    fetchAuthorPlans,
    fetchAuthorTree,
    moveNode,
    patchNode,
} from '../services/authoringApi'
import { toMessage } from '../services/labHttp'
import { readUrlParam, setUrlParams } from '../utils/navigate'
import { planSlug } from '../utils/planSlug'
import { AuthoringEditor, blankFor, fieldsFor } from './AuthoringEditor'
import { AuthoringTree, Selection } from './AuthoringTree'

const PLAN_PARAM = 'plan_id'

/**
 * URL param naming the node being edited, so a task (or a prompt, criterion or
 * section) can be linked and shared the way `task_id` works on the participant
 * side. One param is enough because a sys_id identifies the level too, which is
 * one fewer thing that can arrive contradicting itself.
 */
const NODE_PARAM = 'node_id'

/**
 * The record id a selection refers to. The tree selects the plan row with an
 * empty sys_id, since it already knows which plan it is showing; the URL needs
 * the real one.
 */
function idOf(tree: AuthorTree | null, selection: Selection | null): string {
    if (!tree || !selection) {
        return ''
    }
    return selection.type === 'plan' ? tree.plan.sys_id : selection.sys_id
}

/** The selection a sys_id names, or null when the tree does not hold it. */
function findNode(tree: AuthorTree | null, sysId: string): Selection | null {
    if (!tree || !sysId) {
        return null
    }
    if (tree.plan.sys_id === sysId) {
        return { type: 'plan', sys_id: '' }
    }
    for (const section of tree.sections) {
        if (section.sys_id === sysId) {
            return { type: 'section', sys_id: sysId }
        }
        for (const task of section.tasks) {
            if (task.sys_id === sysId) {
                return { type: 'task', sys_id: sysId }
            }
            for (const prompt of task.prompts) {
                if (prompt.sys_id === sysId) {
                    return { type: 'prompt', sys_id: sysId }
                }
            }
            for (const criterion of task.criteria) {
                if (criterion.sys_id === sysId) {
                    return { type: 'criterion', sys_id: sysId }
                }
            }
        }
    }
    return null
}

/** The node's current field values, pulled out of the loaded tree. */
function valuesFor(tree: AuthorTree | null, selection: Selection | null): NodeFields | null {
    if (!tree || !selection) {
        return null
    }

    const keep = (source: Record<string, unknown>, type: NodeType): NodeFields => {
        const values: NodeFields = {}
        fieldsFor(type).forEach((field) => {
            const raw = source[field]
            values[field] = typeof raw === 'string' ? raw : ''
        })
        return values
    }

    if (selection.type === 'plan') {
        return keep(tree.plan as unknown as Record<string, unknown>, 'plan')
    }

    for (const section of tree.sections) {
        if (selection.type === 'section' && section.sys_id === selection.sys_id) {
            return keep(section as unknown as Record<string, unknown>, 'section')
        }
        for (const task of section.tasks) {
            if (selection.type === 'task' && task.sys_id === selection.sys_id) {
                return keep(task as unknown as Record<string, unknown>, 'task')
            }
            for (const prompt of task.prompts) {
                if (selection.type === 'prompt' && prompt.sys_id === selection.sys_id) {
                    return keep(prompt as unknown as Record<string, unknown>, 'prompt')
                }
            }
            for (const criterion of task.criteria) {
                if (selection.type === 'criterion' && criterion.sys_id === selection.sys_id) {
                    return keep(criterion as unknown as Record<string, unknown>, 'criterion')
                }
            }
        }
    }

    return null
}

export default function AuthoringApp() {
    const [plans, setPlans] = useState<AuthorPlanSummary[]>([])
    const [planId, setPlanId] = useState('')
    const [tree, setTree] = useState<AuthorTree | null>(null)
    const [selected, setSelected] = useState<Selection | null>(null)
    const [draft, setDraft] = useState<NodeFields | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [editorError, setEditorError] = useState('')
    const [saved, setSaved] = useState(false)

    /** Guards against a slow reload landing after a newer one. */
    const loadToken = useRef(0)

    /**
     * What this app last set `node_id` to.
     *
     * On the portal the write goes through an Angular digest, so reading the
     * param back immediately afterwards still returns the previous value. The
     * first version compared against that stale read, decided the URL was out
     * of date and wrote it a second time - two digests, and two visible
     * re-renders, for every click on a task. Comparing against what we asked
     * for instead keeps it to one.
     */
    const urlNode = useRef(readUrlParam(NODE_PARAM))

    /** The one place `node_id` is written, so the ref cannot drift from it. */
    const writeNode = useCallback((sysId: string, replace?: boolean) => {
        if (urlNode.current === sysId) {
            return
        }
        urlNode.current = sysId
        setUrlParams({ [NODE_PARAM]: sysId || null }, replace)
    }, [])

    const savedValues = useMemo(() => valuesFor(tree, selected), [tree, selected])

    const dirty = useMemo(() => {
        if (!draft || !savedValues) {
            return false
        }
        for (const key in draft) {
            if (draft[key] !== (savedValues[key] || '')) {
                return true
            }
        }
        return false
    }, [draft, savedValues])

    // Load the plan list once, and open whichever plan the URL names.
    useEffect(() => {
        let live = true
        fetchAuthorPlans()
            .then((list) => {
                if (!live) {
                    return
                }
                setPlans(list)
                const wanted = readUrlParam(PLAN_PARAM).toLowerCase()
                const match = list.filter(
                    (plan) =>
                        plan.sys_id.toLowerCase() === wanted ||
                        plan.slug.toLowerCase() === wanted,
                )
                const open = match.length ? match[0] : list.length ? list[0] : null
                if (open) {
                    setPlanId(open.sys_id)
                    if (open.slug.toLowerCase() !== wanted) {
                        setUrlParams({ [PLAN_PARAM]: open.slug || open.sys_id }, true)
                    }
                } else {
                    setLoading(false)
                }
            })
            .catch((reason: unknown) => {
                if (live) {
                    setError(toMessage(reason))
                    setLoading(false)
                }
            })
        return () => {
            live = false
        }
    }, [])

    const reload = useCallback(
        (id: string) => {
            const token = ++loadToken.current
            setLoading(true)
            return fetchAuthorTree(id)
                .then((fresh) => {
                    if (token !== loadToken.current) {
                        return
                    }
                    setTree(fresh)
                    setError('')
                })
                .catch((reason: unknown) => {
                    if (token === loadToken.current) {
                        setError(toMessage(reason))
                    }
                })
                .finally(() => {
                    if (token === loadToken.current) {
                        setLoading(false)
                    }
                })
        },
        [],
    )

    useEffect(() => {
        if (planId) {
            reload(planId)
        }
    }, [planId, reload])

    // A fresh selection starts from the saved values, discarding any draft.
    useEffect(() => {
        setDraft(savedValues ? { ...savedValues } : null)
        setEditorError('')
        setSaved(false)
    }, [savedValues])

    // Keep the URL and the open node in step, in both directions.
    //
    // A selection already on screen wins, so reloading the tree after a save,
    // move or add does not reopen whatever the URL happened to name; otherwise
    // the URL decides, which is what makes a shared link open its node. A
    // `node_id` the tree does not hold - a deleted node, or one from another
    // plan - is dropped rather than left pointing at nothing.
    useEffect(() => {
        if (!tree) {
            return
        }

        if (selected) {
            const id = idOf(tree, selected)
            if (findNode(tree, id)) {
                // Already written by onSelect in the usual case, so this is a
                // no-op; it only writes for a selection made in code, such as
                // the node a create just added.
                writeNode(id, true)
                return
            }
        }

        const found = findNode(tree, urlNode.current)
        setSelected(found)
        if (!found) {
            writeNode('', true)
        }
    }, [tree, selected, writeNode])

    // Back and forward move between nodes, since selecting one pushes an entry.
    useEffect(() => {
        if (!tree) {
            return
        }
        const onPopState = () => {
            urlNode.current = readUrlParam(NODE_PARAM)
            const found = findNode(tree, urlNode.current)
            if (dirty && !window.confirm('Discard the unsaved changes?')) {
                // The URL has already moved, so put it back on the node that is
                // actually open rather than leaving the two disagreeing.
                writeNode(idOf(tree, selected), true)
                return
            }
            setEditorError('')
            setSelected(found)
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [tree, dirty, selected, writeNode])

    const onSelect = useCallback(
        (selection: Selection) => {
            if (dirty && !window.confirm('Discard the unsaved changes?')) {
                return
            }
            setSelected(selection)
            // Pushed, not replaced, so Back returns to the previous node.
            writeNode(idOf(tree, selection))
        },
        [dirty, tree, writeNode],
    )

    const onPlanChange = useCallback(
        (nextId: string) => {
            if (dirty && !window.confirm('Discard the unsaved changes?')) {
                return
            }
            const match = plans.filter((plan) => plan.sys_id === nextId)
            setSelected(null)
            setTree(null)
            setPlanId(nextId)
            // One write, so the plan and the cleared node cost a single digest.
            urlNode.current = ''
            setUrlParams({
                [PLAN_PARAM]: (match.length && match[0].slug) || nextId,
                [NODE_PARAM]: null,
            })
        },
        [dirty, plans],
    )

    const onSave = useCallback(() => {
        if (!draft || !selected || !tree) {
            return
        }
        const sysId = selected.type === 'plan' ? tree.plan.sys_id : selected.sys_id
        setBusy(true)
        setEditorError('')
        patchNode(selected.type, sysId, draft)
            .then(() => reload(planId))
            .then(() => {
                setSaved(true)
                // The plan list carries the name, so a renamed plan has to
                // refresh it or the picker keeps showing the old one.
                if (selected.type === 'plan') {
                    return fetchAuthorPlans().then(setPlans)
                }
                return undefined
            })
            .catch((reason: unknown) => setEditorError(toMessage(reason)))
            .finally(() => setBusy(false))
    }, [draft, selected, tree, planId, reload])

    const onAdd = useCallback(
        (type: NodeType, parentId: string) => {
            if (!tree) {
                return
            }
            setBusy(true)
            setError('')
            createNode(type, parentId || tree.plan.sys_id, blankFor(type))
                .then((sysId) => {
                    return reload(planId).then(() => {
                        // Open what was just added, which is what an author
                        // wants next in every case.
                        setSelected({ type: type, sys_id: sysId })
                    })
                })
                .catch((reason: unknown) => setError(toMessage(reason)))
                .finally(() => setBusy(false))
        },
        [tree, planId, reload],
    )

    const onMove = useCallback(
        (type: NodeType, sysId: string, direction: 'up' | 'down') => {
            setBusy(true)
            setError('')
            moveNode(type, sysId, direction)
                .then(() => reload(planId))
                .catch((reason: unknown) => setError(toMessage(reason)))
                .finally(() => setBusy(false))
        },
        [planId, reload],
    )

    const onDelete = useCallback(
        (type: NodeType, sysId: string, label: string) => {
            if (!tree) {
                return
            }
            const id = type === 'plan' ? tree.plan.sys_id : sysId
            const what = type === 'plan' ? 'the plan "' + label + '"' : '"' + label + '"'

            if (!window.confirm('Delete ' + what + ', and everything inside it?')) {
                return
            }

            setBusy(true)
            setError('')

            // First pass without confirm: the server refuses anything whose
            // cascade would reach participant progress and says how much.
            deleteNode(type, id, false)
                .then((outcome) => {
                    if (outcome.deleted) {
                        return true
                    }
                    const ok = window.confirm(
                        'This also deletes ' +
                            outcome.taskResults +
                            ' task result(s) of participant progress. Delete anyway?',
                    )
                    if (!ok) {
                        return false
                    }
                    return deleteNode(type, id, true).then((second) => second.deleted)
                })
                .then((gone) => {
                    if (!gone) {
                        return undefined
                    }
                    setSelected(null)
                    if (type === 'plan') {
                        setTree(null)
                        setPlanId('')
                        return fetchAuthorPlans().then((list) => {
                            setPlans(list)
                            if (list.length) {
                                setPlanId(list[0].sys_id)
                                urlNode.current = ''
                                setUrlParams(
                                    {
                                        [PLAN_PARAM]: list[0].slug || list[0].sys_id,
                                        [NODE_PARAM]: null,
                                    },
                                    true,
                                )
                            }
                        })
                    }
                    return reload(planId)
                })
                .catch((reason: unknown) => setError(toMessage(reason)))
                .finally(() => setBusy(false))
        },
        [tree, planId, reload],
    )

    const onNewPlan = useCallback(() => {
        setBusy(true)
        setError('')
        createNode('plan', '', blankFor('plan'))
            .then((sysId) =>
                fetchAuthorPlans().then((list) => {
                    setPlans(list)
                    setSelected({ type: 'plan', sys_id: sysId })
                    setPlanId(sysId)
                    const match = list.filter((plan) => plan.sys_id === sysId)
                    urlNode.current = ''
                    setUrlParams(
                        {
                            [PLAN_PARAM]: (match.length && match[0].slug) || sysId,
                            [NODE_PARAM]: null,
                        },
                        true,
                    )
                }),
            )
            .catch((reason: unknown) => setError(toMessage(reason)))
            .finally(() => setBusy(false))
    }, [])

    return (
        <section className="holg-author" aria-labelledby="holg-author-title">
            <header className="holg-author__header">
                <h1 className="holg-author__title" id="holg-author-title">
                    Plan authoring
                </h1>
                <div className="holg-toolbar">
                    <div className="holg-field">
                        <label className="holg-field__label" htmlFor="holg-author-plan">
                            Evaluation plan
                        </label>
                        <select
                            id="holg-author-plan"
                            className="holg-select"
                            value={planId}
                            disabled={busy || !plans.length}
                            onChange={(event) => onPlanChange(event.target.value)}
                        >
                            {plans.map((plan) => (
                                <option value={plan.sys_id} key={plan.sys_id}>
                                    {plan.name +
                                        (plan.status && plan.status !== 'published'
                                            ? ' — ' + plan.status
                                            : '')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="holg-toolbar__actions">
                        <button
                            type="button"
                            className="holg-btn"
                            disabled={busy}
                            onClick={onNewPlan}
                        >
                            New plan
                        </button>
                    </div>
                </div>
            </header>

            {error ? (
                <p className="holg-alert" role="alert">
                    {error}
                </p>
            ) : null}

            {loading && !tree ? (
                <p className="holg-loading" aria-live="polite">
                    {'Loading…'}
                </p>
            ) : null}

            {!loading && !plans.length && !error ? (
                <p className="holg-empty">
                    There are no evaluation plans yet. Use New plan to start one.
                </p>
            ) : null}

            {tree ? (
                <div className="holg-author__split">
                    <AuthoringTree
                        planName={tree.plan.name}
                        planStatus={tree.plan.status}
                        sections={tree.sections}
                        selected={selected}
                        busy={busy}
                        onSelect={onSelect}
                        onAdd={onAdd}
                        onMove={onMove}
                        onDelete={onDelete}
                    />

                    <div className="holg-author__main">
                        {selected && draft ? (
                            <AuthoringEditor
                                type={selected.type}
                                values={draft}
                                dirty={dirty}
                                busy={busy}
                                error={editorError}
                                saved={saved}
                                onChange={(field, value) =>
                                    setDraft((current) =>
                                        current ? { ...current, [field]: value } : current,
                                    )
                                }
                                onSave={onSave}
                                onRevert={() => setDraft(savedValues ? { ...savedValues } : null)}
                            />
                        ) : (
                            <p className="holg-empty">
                                Pick a section, task, prompt or criterion on the left to edit it.
                            </p>
                        )}
                    </div>
                </div>
            ) : null}
        </section>
    )
}
