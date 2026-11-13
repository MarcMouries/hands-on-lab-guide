import React from 'react'
import { AuthorFacilitator, NodeFields, NodeType } from '../services/authoringApi'
import { PromptMarkdown } from './PromptBox'

type FieldKind = 'text' | 'area' | 'markdown' | 'status' | 'facilitator'

interface FieldSpec {
    name: string
    label: string
    kind: FieldKind
    /** Mirrors the column length in src/fluent/table; the server rejects past it. */
    limit: number
    hint?: string
}

/*
 * Mirrors LAB_AUTHOR_TYPES on the server, which is the authority: anything not
 * named there is ignored by a write, so a field added here alone would appear
 * to save and change nothing.
 */
const FIELDS: Record<NodeType, FieldSpec[]> = {
    plan: [
        { name: 'name', label: 'Name', kind: 'text', limit: 120 },
        { name: 'description', label: 'Description', kind: 'area', limit: 4000 },
        {
            name: 'status',
            label: 'Status',
            kind: 'status',
            limit: 40,
            hint: 'Participants only ever see published plans.',
        },
        {
            name: 'facilitator',
            label: 'Facilitator',
            kind: 'facilitator',
            limit: 32,
            hint: 'Who runs this plan. Only users with the facilitator role can be picked.',
        },
    ],
    section: [
        { name: 'title', label: 'Title', kind: 'text', limit: 120 },
        { name: 'overview', label: 'Overview', kind: 'area', limit: 4000 },
    ],
    task: [
        { name: 'title', label: 'Title', kind: 'text', limit: 120 },
        { name: 'description', label: 'Description', kind: 'area', limit: 4000 },
        { name: 'scenario', label: 'Scenario', kind: 'area', limit: 4000 },
        { name: 'how_to_test', label: 'How to test', kind: 'area', limit: 4000 },
        { name: 'dependency_note', label: 'Dependency note', kind: 'area', limit: 4000 },
    ],
    prompt: [
        {
            name: 'label',
            label: 'Label',
            kind: 'text',
            limit: 120,
            hint: 'Shown above the step. Leave empty for "Prompt N".',
        },
        {
            name: 'prompt_text',
            label: 'Step content (Markdown)',
            kind: 'markdown',
            limit: 8000,
            hint:
                'A fenced code block gets its own Copy button. The outermost numbered list becomes the step timeline. ' +
                'Tokens: {{user_name}}, {{participant_number}}, {{prefix}}, {{scope}}, {{app_name}}, {{instance_url}}.',
        },
    ],
    criterion: [{ name: 'criterion', label: 'Criterion', kind: 'area', limit: 4000 }],
}

const TYPE_LABEL: Record<NodeType, string> = {
    plan: 'Plan',
    section: 'Section',
    task: 'Task',
    prompt: 'Prompt',
    criterion: 'Success criterion',
}

export function fieldsFor(type: NodeType): string[] {
    return FIELDS[type].map((field) => field.name)
}

/** A new node's starting values, so a create never posts an empty mandatory. */
export function blankFor(type: NodeType): NodeFields {
    const values: NodeFields = {}
    FIELDS[type].forEach((field) => {
        values[field.name] = ''
    })
    if (type === 'section') {
        values.title = 'New section'
    } else if (type === 'task') {
        values.title = 'New task'
    } else if (type === 'plan') {
        values.name = 'New plan'
        values.status = 'draft'
    }
    return values
}

interface Props {
    type: NodeType
    values: NodeFields
    dirty: boolean
    busy: boolean
    error: string
    saved: boolean
    /** Candidates for the plan's facilitator field; empty until they load. */
    facilitators: AuthorFacilitator[]
    /** The saved facilitator's name, for showing one the list does not hold. */
    facilitatorName: string
    onChange: (field: string, value: string) => void
    onSave: () => void
    onRevert: () => void
}

export function AuthoringEditor({
    type,
    values,
    dirty,
    busy,
    error,
    saved,
    facilitators,
    facilitatorName,
    onChange,
    onSave,
    onRevert,
}: Props) {
    const specs = FIELDS[type]

    return (
        <form
            className="holg-editor"
            onSubmit={(event) => {
                event.preventDefault()
                onSave()
            }}
        >
            <header className="holg-editor__head">
                <h2 className="holg-editor__title">{TYPE_LABEL[type]}</h2>
                <div className="holg-editor__actions">
                    {dirty ? <span className="holg-editor__dirty">Unsaved changes</span> : null}
                    {!dirty && saved ? <span className="holg-editor__saved">Saved</span> : null}
                    <button
                        type="button"
                        className="holg-btn holg-btn--sm"
                        disabled={!dirty || busy}
                        onClick={onRevert}
                    >
                        Revert
                    </button>
                    <button
                        type="submit"
                        className="holg-btn holg-btn--primary holg-btn--sm"
                        disabled={!dirty || busy}
                    >
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </header>

            {error ? (
                <p className="holg-alert" role="alert">
                    {error}
                </p>
            ) : null}

            {specs.map((spec) => {
                const id = 'holg-field-' + type + '-' + spec.name
                const value = values[spec.name] || ''
                const over = value.length > spec.limit

                return (
                    <div className="holg-field2" key={spec.name}>
                        <label className="holg-field2__label" htmlFor={id}>
                            {spec.label}
                        </label>
                        {spec.hint ? <p className="holg-field2__hint">{spec.hint}</p> : null}

                        {spec.kind === 'facilitator' ? (
                            /*
                             * A reference field as a plain select, because the
                             * candidate list is every user holding the
                             * facilitator role - short enough to show whole,
                             * and the server checks the role again on save
                             * rather than trusting whatever arrives.
                             */
                            <select
                                id={id}
                                className="holg-select"
                                value={value}
                                disabled={busy}
                                onChange={(event) => onChange(spec.name, event.target.value)}
                            >
                                <option value="">{'\u2014 nobody yet \u2014'}</option>
                                {/*
                                  * A facilitator who has since lost the role,
                                  * or who the list has not loaded yet, would
                                  * otherwise vanish from the select and be
                                  * cleared by the next save.
                                  */}
                                {value && !facilitators.some((p) => p.sys_id === value) ? (
                                    <option value={value}>
                                        {facilitatorName || 'Currently set'}
                                    </option>
                                ) : null}
                                {facilitators.map((person) => (
                                    <option value={person.sys_id} key={person.sys_id}>
                                        {person.name + ' (' + person.user_name + ')'}
                                    </option>
                                ))}
                            </select>
                        ) : spec.kind === 'status' ? (
                            <select
                                id={id}
                                className="holg-select"
                                value={value}
                                disabled={busy}
                                onChange={(event) => onChange(spec.name, event.target.value)}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="closed">Closed</option>
                            </select>
                        ) : spec.kind === 'text' ? (
                            <input
                                id={id}
                                className="holg-input"
                                type="text"
                                value={value}
                                maxLength={spec.limit}
                                disabled={busy}
                                onChange={(event) => onChange(spec.name, event.target.value)}
                            />
                        ) : spec.kind === 'markdown' ? (
                            <div className="holg-md">
                                <textarea
                                    id={id}
                                    className="holg-textarea holg-textarea--md"
                                    value={value}
                                    disabled={busy}
                                    spellCheck={true}
                                    onChange={(event) => onChange(spec.name, event.target.value)}
                                />
                                <div className="holg-md__preview">
                                    <p className="holg-md__previewLabel">
                                        Preview, as a participant sees it
                                    </p>
                                    {/*
                                      * The participant's own renderer, so the preview cannot
                                      * drift from the page it is previewing. `{{tokens}}` are
                                      * left as written here: an author needs to see the token,
                                      * not one participant's value.
                                      */}
                                    <div className="holg-prompt__text holg-prompt__text--md">
                                        <PromptMarkdown source={value} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <textarea
                                id={id}
                                className="holg-textarea"
                                value={value}
                                disabled={busy}
                                onChange={(event) => onChange(spec.name, event.target.value)}
                            />
                        )}

                        {/*
                          * Only on the fields someone types into. A select
                          * cannot exceed its limit, and a 32-character sys_id
                          * reading "32 / 32" looks like a warning.
                          */}
                        {spec.kind === 'status' || spec.kind === 'facilitator' ? null : (
                            <p
                                className={
                                    'holg-field2__count' +
                                    (over ? ' holg-field2__count--over' : '')
                                }
                            >
                                {value.length + ' / ' + spec.limit}
                            </p>
                        )}
                    </div>
                )
            })}
        </form>
    )
}
